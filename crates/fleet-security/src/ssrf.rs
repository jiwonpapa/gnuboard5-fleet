use std::{
    collections::BTreeSet,
    net::{IpAddr, SocketAddr},
};

use async_trait::async_trait;
use url::{Host, Url};

#[derive(Debug, thiserror::Error, PartialEq, Eq)]
pub enum SsrfError {
    #[error("invalid connector URL")]
    InvalidUrl,
    #[error("connector URL credentials and fragments are forbidden")]
    UserInfoOrFragment,
    #[error("connector URL resolves to a non-public address: {0}")]
    NonPublicAddress(IpAddr),
    #[error("connector hostname did not resolve")]
    ResolutionEmpty,
    #[error("connector hostname resolution changed")]
    DnsRebinding,
    #[error("connector redirects are disabled")]
    RedirectForbidden,
    #[error("DNS resolution failed")]
    ResolutionFailed,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct OutboundTarget {
    pub url: Url,
    pub host: String,
    pub port: u16,
    pub pinned_addresses: BTreeSet<IpAddr>,
}

#[async_trait]
pub trait Resolver: Send + Sync {
    async fn resolve(&self, host: &str, port: u16) -> Result<Vec<IpAddr>, SsrfError>;
}

#[derive(Clone, Debug, Default)]
pub struct SystemResolver;

#[async_trait]
impl Resolver for SystemResolver {
    async fn resolve(&self, host: &str, port: u16) -> Result<Vec<IpAddr>, SsrfError> {
        tokio::net::lookup_host((host, port))
            .await
            .map_err(|_| SsrfError::ResolutionFailed)
            .map(|rows| rows.map(|socket: SocketAddr| socket.ip()).collect())
    }
}

#[derive(Clone, Debug)]
pub struct UrlGuard<R> {
    resolver: R,
    allow_private_for_local_certification: bool,
}

impl<R: Resolver> UrlGuard<R> {
    pub fn new(resolver: R) -> Self {
        Self {
            resolver,
            allow_private_for_local_certification: false,
        }
    }

    #[cfg(feature = "local-certification")]
    pub fn local_certification(resolver: R) -> Self {
        Self {
            resolver,
            allow_private_for_local_certification: true,
        }
    }

    pub async fn resolve_initial(&self, raw: &str) -> Result<OutboundTarget, SsrfError> {
        let url = parse_url(raw)?;
        let host = url
            .host_str()
            .ok_or(SsrfError::InvalidUrl)?
            .trim_end_matches('.')
            .to_ascii_lowercase();
        let port = url.port_or_known_default().ok_or(SsrfError::InvalidUrl)?;
        let addresses = match url.host().ok_or(SsrfError::InvalidUrl)? {
            Host::Ipv4(address) => vec![IpAddr::V4(address)],
            Host::Ipv6(address) => vec![IpAddr::V6(address)],
            Host::Domain(_) => self.resolver.resolve(&host, port).await?,
        };
        let pinned_addresses =
            validate_addresses(addresses, self.allow_private_for_local_certification)?;
        Ok(OutboundTarget {
            url,
            host,
            port,
            pinned_addresses,
        })
    }

    pub async fn resolve_host_port(
        &self,
        host: &str,
        port: u16,
    ) -> Result<OutboundTarget, SsrfError> {
        let ipv6 = host.parse::<std::net::Ipv6Addr>().is_ok();
        if host.is_empty()
            || host.len() > 253
            || port == 0
            || host.chars().any(|character| {
                character.is_ascii_control()
                    || matches!(character, '/' | '\\' | '@' | '#' | '?')
                    || (character == ':' && !ipv6)
            })
        {
            return Err(SsrfError::InvalidUrl);
        }
        let raw = if ipv6 {
            format!("https://[{host}]:{port}/")
        } else {
            format!("https://{host}:{port}/")
        };
        self.resolve_initial(&raw).await
    }

    pub async fn revalidate_before_connect(
        &self,
        target: &OutboundTarget,
    ) -> Result<(), SsrfError> {
        let current = match target.url.host().ok_or(SsrfError::InvalidUrl)? {
            Host::Ipv4(address) => vec![IpAddr::V4(address)],
            Host::Ipv6(address) => vec![IpAddr::V6(address)],
            Host::Domain(_) => self.resolver.resolve(&target.host, target.port).await?,
        };
        if validate_addresses(current, self.allow_private_for_local_certification)?
            != target.pinned_addresses
        {
            return Err(SsrfError::DnsRebinding);
        }
        Ok(())
    }

    pub fn reject_redirect(&self, _location: &str) -> Result<(), SsrfError> {
        Err(SsrfError::RedirectForbidden)
    }
}

fn parse_url(raw: &str) -> Result<Url, SsrfError> {
    let url = Url::parse(raw).map_err(|_| SsrfError::InvalidUrl)?;
    if !matches!(url.scheme(), "http" | "https") || url.host().is_none() {
        return Err(SsrfError::InvalidUrl);
    }
    if !url.username().is_empty() || url.password().is_some() || url.fragment().is_some() {
        return Err(SsrfError::UserInfoOrFragment);
    }
    Ok(url)
}

fn validate_addresses(
    addresses: Vec<IpAddr>,
    allow_private_for_local_certification: bool,
) -> Result<BTreeSet<IpAddr>, SsrfError> {
    if addresses.is_empty() {
        return Err(SsrfError::ResolutionEmpty);
    }
    let mut validated = BTreeSet::new();
    for address in addresses {
        if !allow_private_for_local_certification {
            validate_public_ip(address)?;
        }
        validated.insert(address);
    }
    Ok(validated)
}

pub fn validate_public_ip(address: IpAddr) -> Result<(), SsrfError> {
    let blocked = match address {
        IpAddr::V4(value) => {
            value.is_private()
                || value.is_loopback()
                || value.is_link_local()
                || value.is_broadcast()
                || value.is_documentation()
                || value.is_unspecified()
                || value.is_multicast()
                || value.octets()[0] == 0
        }
        IpAddr::V6(value) => {
            value.is_loopback()
                || value.is_unspecified()
                || value.is_multicast()
                || value.is_unique_local()
                || value.is_unicast_link_local()
                || value.to_ipv4_mapped().is_some()
        }
    };
    if blocked {
        Err(SsrfError::NonPublicAddress(address))
    } else {
        Ok(())
    }
}
