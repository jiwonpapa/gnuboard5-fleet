use crate::core::ports::{AuthLoginRecord, MemberProfileRecord, TokenPairRecord};
use g5_admin_models::models::auth::{AuthLoginInput, TokenPair};
use g5_admin_models::models::member::MemberProfile;

pub(crate) fn login_record_from_model(input: &AuthLoginInput) -> AuthLoginRecord {
    AuthLoginRecord {
        mb_id: input.mb_id.clone(),
        mb_password: input.mb_password.clone(),
    }
}

pub(crate) fn model_token_pair_from_record(tokens: TokenPairRecord) -> TokenPair {
    TokenPair {
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        expires_in: tokens.expires_in,
    }
}

pub(crate) fn model_member_profile_from_record(profile: MemberProfileRecord) -> MemberProfile {
    MemberProfile {
        mb_id: profile.mb_id,
        mb_name: profile.mb_name,
        mb_nick: profile.mb_nick,
        mb_email: profile.mb_email,
        mb_level: profile.mb_level,
        mb_point: profile.mb_point,
    }
}
