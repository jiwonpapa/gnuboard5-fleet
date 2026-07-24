# syntax=docker/dockerfile:1.7

FROM oven/bun:1.3.10-alpine AS web-builder
WORKDIR /source/apps/admin-web
COPY apps/admin-web/package.json apps/admin-web/bun.lock ./
RUN bun install --frozen-lockfile --ignore-scripts
COPY apps/admin-web/index.html apps/admin-web/tsconfig.json apps/admin-web/vite.config.ts ./
COPY apps/admin-web/public ./public
COPY apps/admin-web/src ./src
RUN bun run build

FROM rust:1.88-bookworm AS rust-builder
WORKDIR /source
COPY Cargo.toml Cargo.lock ./
COPY contracts ./contracts
COPY crates ./crates
COPY apps/admin-server ./apps/admin-server
RUN cargo build --release --locked -p g5-fleet-admin-server

FROM debian:bookworm-slim AS runtime
ARG G5_FLEET_VERSION=development
ARG G5_FLEET_REVISION=unknown
LABEL org.opencontainers.image.title="G5 Fleet"
LABEL org.opencontainers.image.version="${G5_FLEET_VERSION}"
LABEL org.opencontainers.image.revision="${G5_FLEET_REVISION}"
LABEL org.opencontainers.image.licenses="Apache-2.0"
LABEL org.opencontainers.image.source="https://github.com/jiwonpapa/gnuboard5-fleet"

RUN apt-get update \
    && apt-get install --no-install-recommends -y ca-certificates openssh-client \
    && rm -rf /var/lib/apt/lists/* \
    && groupadd --gid 10001 fleet \
    && useradd --uid 10001 --gid 10001 --no-create-home --home-dir /nonexistent --shell /usr/sbin/nologin fleet \
    && install -d -o fleet -g fleet -m 0700 /var/lib/g5-fleet /var/backups/g5-fleet \
    && install -d -o fleet -g fleet -m 0755 /opt/g5-fleet/web

COPY --from=rust-builder /source/target/release/g5-fleet-admin-server /usr/local/bin/g5-fleet-admin-server
COPY --from=web-builder --chown=fleet:fleet /source/apps/admin-web/dist /opt/g5-fleet/web
COPY --chmod=0755 deploy/container/entrypoint.sh /usr/local/bin/g5-fleet-entrypoint
COPY LICENSE NOTICE /usr/share/doc/g5-fleet/

ENV G5_FLEET_BIND=0.0.0.0:8080
ENV G5_FLEET_DATA_DIR=/var/lib/g5-fleet
ENV G5_FLEET_WEB_DIR=/opt/g5-fleet/web
ENV G5_FLEET_IMAGE_VERSION=${G5_FLEET_VERSION}
ENV G5_FLEET_BUILD_REVISION=${G5_FLEET_REVISION}
EXPOSE 8080
VOLUME ["/var/lib/g5-fleet", "/var/backups/g5-fleet"]
USER 10001:10001
ENTRYPOINT ["/usr/local/bin/g5-fleet-entrypoint"]
CMD ["serve"]
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=6 \
  CMD ["/usr/local/bin/g5-fleet-admin-server", "healthcheck"]
