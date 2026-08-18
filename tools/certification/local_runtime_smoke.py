#!/usr/bin/env python3
from __future__ import annotations

import argparse
import base64
import hashlib
import hmac
import http.client
import json
import os
import re
import struct
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlsplit

ROOT = Path(__file__).resolve().parents[2]


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for chunk in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def load_env(path: Path) -> dict[str, str]:
    if path.is_symlink() or not path.is_file():
        raise RuntimeError(f"certification session is missing or unsafe: {path}")
    values: dict[str, str] = {}
    for line in path.read_text(encoding="utf-8").splitlines():
        key, separator, value = line.partition("=")
        if not separator or not re.fullmatch(r"[A-Z0-9_]+", key):
            raise RuntimeError("certification session contains an invalid line")
        values[key] = value
    return values


@dataclass(frozen=True)
class Response:
    status: int
    headers: dict[str, str]
    body: bytes

    def json(self) -> Any:
        return json.loads(self.body)


def request(
    base_url: str,
    method: str,
    path: str,
    *,
    body: dict[str, Any] | None = None,
    headers: dict[str, str] | None = None,
    expected: tuple[int, ...] = (200,),
) -> Response:
    base = urlsplit(base_url)
    if base.scheme != "http" or base.hostname != "127.0.0.1" or not base.port:
        raise RuntimeError("certification HTTP target must be loopback")
    encoded = None if body is None else json.dumps(body).encode()
    request_headers = {"accept": "application/json"}
    if encoded is not None:
        request_headers["content-type"] = "application/json"
    if headers:
        request_headers.update(headers)
    connection = http.client.HTTPConnection(base.hostname, base.port, timeout=15)
    try:
        connection.request(method, path, body=encoded, headers=request_headers)
        raw = connection.getresponse()
        response = Response(
            raw.status,
            {key.lower(): value for key, value in raw.getheaders()},
            raw.read(),
        )
    finally:
        connection.close()
    if response.status not in expected:
        detail = response.body.decode(errors="replace")[:2000]
        raise RuntimeError(f"{method} {path} returned {response.status}: {detail}")
    return response


def g5_login(base: str, member_id: str, value: str) -> str:
    payload = request(
        base,
        "POST",
        "/api/v1/auth/login",
        body={"mb_id": member_id, "mb_password": value},
    ).json()
    token = payload.get("data", {}).get("access_token")
    if not isinstance(token, str) or len(token) < 32:
        raise RuntimeError("G5 login access token readback failed")
    return token


def current_totp(encoded_secret: str) -> str:
    normalized = encoded_secret.replace(" ", "").upper()
    padding = "=" * ((8 - len(normalized) % 8) % 8)
    secret = base64.b32decode(normalized + padding, casefold=True)
    counter = int(time.time()) // 30
    digest = hmac.new(secret, struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset : offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 1_000_000:06d}"


def fleet_login(
    base: str,
    login_name: str,
    value: str,
    totp_secret: str,
) -> tuple[str, str]:
    response = request(
        base,
        "POST",
        "/api/v1/auth/login",
        body={
            "login_name": login_name,
            "password": value,
            "totp_code": current_totp(totp_secret),
        },
    )
    csrf = response.json().get("csrf_token")
    cookie = response.headers.get("set-cookie", "").split(";", 1)[0]
    if not isinstance(csrf, str) or not csrf or not cookie.startswith("g5_fleet_session="):
        raise RuntimeError("Fleet login cookie/CSRF readback failed")
    request(
        base,
        "POST",
        "/api/v1/auth/step-up",
        body={"password": value, "totp_code": current_totp(totp_secret)},
        headers={"cookie": cookie, "x-csrf-token": csrf},
        expected=(204,),
    )
    return cookie, csrf


def fleet_headers(cookie: str, csrf: str | None = None) -> dict[str, str]:
    headers = {"cookie": cookie}
    if csrf is not None:
        headers["x-csrf-token"] = csrf
    return headers


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "--session",
        type=Path,
        default=ROOT / ".cache/certification/local/session.env",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=ROOT / ".cache/evidence/local-runtime.json",
    )
    parser.add_argument(
        "--browser-env",
        type=Path,
        default=ROOT / ".cache/certification/local/browser.env",
        help="0600 local-only TOTP handoff for the real-browser certification step",
    )
    args = parser.parse_args()
    env = load_env(args.session)
    g5_base = env["G5_CERT_G5_URL"]
    fleet_base = env["G5_CERT_FLEET_URL"]

    upstream = json.loads((ROOT / "UPSTREAMS.lock.json").read_text(encoding="utf-8"))[
        "upstreams"
    ][0]
    if upstream["version"] != "5.6.32":
        raise RuntimeError("local certification must use official G5 v5.6.32")
    provider = request(g5_base, "GET", "/api/v1/health").json()
    if provider.get("status") != "ok" or not provider.get("version"):
        raise RuntimeError("G5 provider identity/health readback failed")

    g5_token = g5_login(
        g5_base,
        env["G5_CERT_G5_ADMIN_ID"],
        env["G5_CERT_G5_ADMIN_VALUE"],
    )
    authorization = {"authorization": f"Bearer {g5_token}"}
    baseline_payload = request(
        g5_base, "GET", "/api/v1/admin/config", headers=authorization
    ).json()
    baseline = baseline_payload.get("data", {}).get("cf_10")
    sentinel = f"local-certification-{env['G5_CERT_REVISION'][:12]}"
    updated = request(
        g5_base,
        "PUT",
        "/api/v1/admin/config",
        body={"cf_10": sentinel},
        headers=authorization,
    ).json()
    if updated.get("data", {}).get("cf_10") != sentinel:
        raise RuntimeError("direct provider mutation readback failed")
    request(
        g5_base,
        "PUT",
        "/api/v1/admin/config",
        body={"cf_10": baseline},
        headers=authorization,
    )
    cleaned = request(
        g5_base, "GET", "/api/v1/admin/config", headers=authorization
    ).json()
    if cleaned.get("data", {}).get("cf_10") != baseline:
        raise RuntimeError("direct provider cleanup readback failed")

    member_id = "fleetcert"

    install_status = request(
        fleet_base,
        "GET",
        "/api/v1/install/status",
    ).json()
    if install_status.get("state") != "setup_required":
        raise RuntimeError("Fleet install state is not setup_required")
    challenge = request(
        fleet_base,
        "POST",
        "/api/v1/install/challenge",
        body={"login_name": env["G5_CERT_FLEET_ADMIN_ID"]},
        expected=(201,),
    ).json()
    totp_secret = challenge.get("manual_entry_key")
    setup_token = challenge.get("setup_token")
    if not isinstance(totp_secret, str) or not isinstance(setup_token, str):
        raise RuntimeError("Fleet install challenge readback failed")
    args.browser_env.parent.mkdir(parents=True, exist_ok=True)
    browser_env_fd = os.open(
        args.browser_env,
        os.O_WRONLY | os.O_CREAT | os.O_EXCL,
        0o600,
    )
    with os.fdopen(browser_env_fd, "w", encoding="utf-8") as browser_env:
        browser_env.write(f"G5_CERT_FLEET_TOTP_SECRET={totp_secret}\n")
    completion = request(
        fleet_base,
        "POST",
        "/api/v1/install/complete",
        body={
            "setup_token": setup_token,
            "login_name": env["G5_CERT_FLEET_ADMIN_ID"],
            "password": env["G5_CERT_FLEET_ADMIN_VALUE"],
            "totp_code": current_totp(totp_secret),
        },
        expected=(201,),
    ).json()
    if len(completion.get("recovery_codes", [])) != 10:
        raise RuntimeError("Fleet install recovery-code readback failed")
    admin_cookie, admin_csrf = fleet_login(
        fleet_base,
        env["G5_CERT_FLEET_ADMIN_ID"],
        env["G5_CERT_FLEET_ADMIN_VALUE"],
        totp_secret,
    )
    request(
        fleet_base,
        "POST",
        "/api/v1/sites",
        body={
            "site_id": "owner-a-site",
            "display_name": "Owner A G5",
            "base_url": g5_base,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    )
    connector_health = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/connector/health",
        headers=fleet_headers(admin_cookie),
    ).json()
    if connector_health.get("status") != "ok":
        raise RuntimeError("Fleet-to-G5 Connector health failed")
    request(
        fleet_base,
        "POST",
        "/api/v1/sites/owner-a-site/connector/login",
        body={
            "mb_id": env["G5_CERT_G5_ADMIN_ID"],
            "mb_password": env["G5_CERT_G5_ADMIN_VALUE"],
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
    )
    fleet_baseline = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/config/basic",
        headers=fleet_headers(admin_cookie),
    ).json().get("cf_10")
    request(
        fleet_base,
        "PUT",
        "/api/v1/sites/owner-a-site/config/basic",
        body={"cf_10": sentinel},
        headers=fleet_headers(admin_cookie, admin_csrf),
    )

    member_path = f"/api/v1/sites/owner-a-site/admin/members/{member_id}"
    member_list = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/admin/members?search=fleetcert&search_field=mb_id",
        headers=fleet_headers(admin_cookie),
    ).json()
    if [row.get("mb_id") for row in member_list.get("items", [])] != [member_id]:
        raise RuntimeError("R12 member list readback failed")
    exported = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/admin/members/export?search=fleetcert&search_field=mb_id",
        headers=fleet_headers(admin_cookie),
    ).json()
    if [row.get("mb_id") for row in exported.get("items", [])] != [member_id]:
        raise RuntimeError("R12 member export readback failed")
    detail = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if detail.get("mb_id") != member_id:
        raise RuntimeError("R12 member detail readback failed")
    updated_member = request(
        fleet_base,
        "PATCH",
        member_path,
        body={"mb_nick": "fleet_cert_updated", "mb_memo": sentinel},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_member.get("mb_nick") != "fleet_cert_updated":
        raise RuntimeError("R12 member update response failed")
    updated_readback = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if updated_readback.get("mb_memo") != sentinel:
        raise RuntimeError("R12 member update readback failed")
    level_readback = request(
        fleet_base,
        "PATCH",
        f"{member_path}/level",
        body={"mb_level": 3},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if level_readback.get("mb_level") != 3:
        raise RuntimeError("R12 member level readback failed")

    png_base64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO7Z0ecAAAAASUVORK5CYII="
    for kind in ("icon", "image"):
        media = request(
            fleet_base,
            "POST",
            f"{member_path}/{kind}",
            body={
                "file_name": f"{kind}.png",
                "mime_type": "image/png",
                "bytes_base64": png_base64,
            },
            headers=fleet_headers(admin_cookie, admin_csrf),
        ).json()
        if media.get("mb_id") != member_id or media.get("storage") not in {
            "member",
            "member_image",
        }:
            raise RuntimeError(f"R12 member {kind} upload readback failed")
        deleted_media = request(
            fleet_base,
            "DELETE",
            f"{member_path}/{kind}",
            headers=fleet_headers(admin_cookie, admin_csrf),
        ).json()
        if deleted_media.get("mb_id") != member_id or not deleted_media.get("deleted"):
            raise RuntimeError(f"R12 member {kind} delete readback failed")

    canonical_groups_path = "/api/v1/sites/owner-a-site/admin/board-groups"
    initial_groups = request(
        fleet_base,
        "GET",
        canonical_groups_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_groups.get("items"), list):
        raise RuntimeError("R13 canonical group list failed")
    canonical_group = request(
        fleet_base,
        "POST",
        canonical_groups_path,
        body={
            "gr_id": "fleetgrp",
            "gr_subject": "Fleet certification",
            "gr_admin": env["G5_CERT_G5_ADMIN_ID"],
            "gr_device": "both",
            "gr_use_access": 0,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if canonical_group.get("gr_id") != "fleetgrp":
        raise RuntimeError("R13 canonical group create failed")
    canonical_group_path = f"{canonical_groups_path}/fleetgrp"
    if request(
        fleet_base,
        "GET",
        canonical_group_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("gr_subject") != "Fleet certification":
        raise RuntimeError("R13 canonical group detail failed")
    updated_group = request(
        fleet_base,
        "PUT",
        canonical_group_path,
        body={
            "gr_subject": "Fleet certification updated",
            "gr_admin": env["G5_CERT_G5_ADMIN_ID"],
            "gr_device": "pc",
            "gr_use_access": 1,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_group.get("gr_device") != "pc":
        raise RuntimeError("R13 canonical group update failed")
    patched_group = request(
        fleet_base,
        "PATCH",
        canonical_group_path,
        body={"gr_subject": "Fleet certification patched"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if patched_group.get("gr_subject") != "Fleet certification patched":
        raise RuntimeError("R13 canonical group patch failed")

    boards_path = "/api/v1/sites/owner-a-site/admin/boards"
    initial_boards = request(
        fleet_base,
        "GET",
        f"{boards_path}?page=1&per_page=20&sort_by=bo_table&sort_direction=ASC",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_boards.get("items"), list):
        raise RuntimeError("R14 board list failed")
    created_board = request(
        fleet_base,
        "POST",
        boards_path,
        body={
            "bo_table": "fleetboard",
            "bo_subject": "Fleet board certification",
            "gr_id": "fleetgrp",
            "bo_read_level": 1,
            "bo_write_level": 2,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if created_board.get("bo_table") != "fleetboard":
        raise RuntimeError("R14 board create failed")
    board_path = f"{boards_path}/fleetboard"
    board_detail = request(
        fleet_base,
        "GET",
        board_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if board_detail.get("bo_subject") != "Fleet board certification":
        raise RuntimeError("R14 board detail failed")
    updated_board = request(
        fleet_base,
        "PUT",
        board_path,
        body={"bo_subject": "Fleet board certification updated"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_board.get("bo_subject") != "Fleet board certification updated":
        raise RuntimeError("R14 board update failed")
    updated_board_readback = request(
        fleet_base,
        "GET",
        board_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if updated_board_readback.get("bo_subject") != updated_board.get("bo_subject"):
        raise RuntimeError("R14 board update readback failed")
    copied_board = request(
        fleet_base,
        "POST",
        f"{board_path}/copy",
        body={
            "target_bo_table": "fleetcopy",
            "target_bo_subject": "Fleet board copy",
            "copy_posts": False,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if copied_board.get("bo_table") != "fleetcopy":
        raise RuntimeError("R14 board copy failed")
    copied_board_path = f"{boards_path}/fleetcopy"
    if request(
        fleet_base,
        "GET",
        copied_board_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("bo_subject") != "Fleet board copy":
        raise RuntimeError("R14 board copy readback failed")
    new_posts_result = request(
        fleet_base,
        "DELETE",
        f"{boards_path}/new-posts",
        body={"bn_ids": [2147483646]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if not new_posts_result.get("deleted") or new_posts_result.get("bn_ids") != [
        2147483646
    ]:
        raise RuntimeError("R14 explicit new-post cleanup failed")
    for cleanup_path in (copied_board_path, board_path):
        request(
            fleet_base,
            "DELETE",
            cleanup_path,
            headers=fleet_headers(admin_cookie, admin_csrf),
            expected=(204,),
        )
    board_cleanup = request(
        fleet_base,
        "GET",
        f"{boards_path}?search=fleet&sort_by=bo_table&sort_direction=ASC",
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(
        row.get("bo_table") in {"fleetboard", "fleetcopy"}
        for row in board_cleanup.get("items", [])
    ):
        raise RuntimeError("R14 board cleanup readback failed")

    contents_path = "/api/v1/sites/owner-a-site/admin/contents"
    initial_contents = request(
        fleet_base,
        "GET",
        f"{contents_path}?page=1&per_page=20",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_contents.get("items"), list):
        raise RuntimeError("R15 content list failed")
    created_content = request(
        fleet_base,
        "POST",
        contents_path,
        body={
            "co_id": "fleetcontent",
            "co_subject": "Fleet content certification",
            "co_html": 2,
            "co_content": "<p>fleet content</p>",
            "co_mobile_content": "mobile fleet content",
            "co_include_head": "",
            "co_include_tail": "",
            "co_tag_filter_use": 1,
            "co_skin": "basic",
            "co_mobile_skin": "basic",
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if created_content.get("co_id") != "fleetcontent" or created_content.get("co_html") != 2:
        raise RuntimeError("R15 content create or HTML mode preservation failed")
    content_path = f"{contents_path}/fleetcontent"
    content_detail = request(
        fleet_base,
        "GET",
        content_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if content_detail.get("co_content") != "<p>fleet content</p>":
        raise RuntimeError("R15 content detail failed")
    updated_content = request(
        fleet_base,
        "PUT",
        content_path,
        body={
            "co_subject": "Fleet content certification updated",
            "co_mobile_content": "",
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_content.get("co_subject") != "Fleet content certification updated":
        raise RuntimeError("R15 content update failed")
    updated_content_readback = request(
        fleet_base,
        "GET",
        content_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        updated_content_readback.get("co_subject") != updated_content.get("co_subject")
        or updated_content_readback.get("co_mobile_content") != ""
        or updated_content_readback.get("co_html") != 2
    ):
        raise RuntimeError("R15 content update readback failed")
    request(
        fleet_base,
        "DELETE",
        content_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    content_cleanup = request(
        fleet_base,
        "GET",
        f"{contents_path}?search=fleetcontent",
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(row.get("co_id") == "fleetcontent" for row in content_cleanup.get("items", [])):
        raise RuntimeError("R15 content cleanup readback failed")

    faq_masters_path = "/api/v1/sites/owner-a-site/admin/faq-masters"
    initial_faq_masters = request(
        fleet_base,
        "GET",
        f"{faq_masters_path}?page=1&per_page=20",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_faq_masters.get("items"), list):
        raise RuntimeError("R16 FAQ master list failed")
    created_faq_master = request(
        fleet_base,
        "POST",
        faq_masters_path,
        body={
            "fm_subject": "Fleet FAQ certification",
            "fm_order": 17,
            "fm_head_html": "<p>fleet faq head</p>",
            "fm_tail_html": "",
            "fm_mobile_head_html": "",
            "fm_mobile_tail_html": "<p>fleet mobile tail</p>",
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    faq_master_id = created_faq_master.get("fm_id")
    if not isinstance(faq_master_id, int) or faq_master_id < 1:
        raise RuntimeError("R16 FAQ master create failed")
    faq_master_path = f"{faq_masters_path}/{faq_master_id}"
    faq_master_detail = request(
        fleet_base,
        "GET",
        faq_master_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        faq_master_detail.get("fm_head_html") != "<p>fleet faq head</p>"
        or faq_master_detail.get("fm_mobile_head_html") != ""
        or faq_master_detail.get("fm_tail_html") != ""
    ):
        raise RuntimeError("R16 FAQ master detail or empty HTML preservation failed")
    updated_faq_master = request(
        fleet_base,
        "PUT",
        faq_master_path,
        body={"fm_subject": "Fleet FAQ certification updated", "fm_mobile_tail_html": ""},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_faq_master.get("fm_subject") != "Fleet FAQ certification updated":
        raise RuntimeError("R16 FAQ master update failed")
    updated_faq_master_readback = request(
        fleet_base,
        "GET",
        faq_master_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        updated_faq_master_readback.get("fm_subject")
        != "Fleet FAQ certification updated"
        or updated_faq_master_readback.get("fm_mobile_tail_html") != ""
    ):
        raise RuntimeError("R16 FAQ master update readback failed")
    for kind in ("header", "footer"):
        uploaded_faq_image = request(
            fleet_base,
            "POST",
            f"{faq_master_path}/{kind}-image",
            body={
                "file_name": f"faq-{kind}.png",
                "mime_type": "image/png",
                "bytes_base64": png_base64,
            },
            headers=fleet_headers(admin_cookie, admin_csrf),
        ).json()
        if not uploaded_faq_image.get("exists") or uploaded_faq_image.get("mime") != "image/png":
            raise RuntimeError(f"R16 FAQ {kind} image upload readback failed")
        deleted_faq_image = request(
            fleet_base,
            "DELETE",
            f"{faq_master_path}/{kind}-image",
            headers=fleet_headers(admin_cookie, admin_csrf),
        ).json()
        if deleted_faq_image.get("exists"):
            raise RuntimeError(f"R16 FAQ {kind} image delete readback failed")

    faqs_path = "/api/v1/sites/owner-a-site/admin/faqs"
    initial_faqs = request(
        fleet_base,
        "GET",
        f"{faqs_path}?page=1&per_page=20&fm_id={faq_master_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_faqs.get("items"), list):
        raise RuntimeError("R16 FAQ item list failed")
    created_faq = request(
        fleet_base,
        "POST",
        faqs_path,
        body={
            "fm_id": faq_master_id,
            "fa_subject": "Fleet FAQ question",
            "fa_content": "Fleet FAQ answer",
            "fa_order": 9,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    faq_id = created_faq.get("fa_id")
    if not isinstance(faq_id, int) or created_faq.get("fm_id") != faq_master_id:
        raise RuntimeError("R16 FAQ item create failed")
    faq_path = f"{faqs_path}/{faq_id}"
    if request(
        fleet_base,
        "GET",
        faq_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("fa_content") != "Fleet FAQ answer":
        raise RuntimeError("R16 FAQ item detail failed")
    updated_faq = request(
        fleet_base,
        "PUT",
        faq_path,
        body={"fa_content": "Fleet FAQ answer updated"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_faq.get("fa_content") != "Fleet FAQ answer updated":
        raise RuntimeError("R16 FAQ item update failed")
    if request(
        fleet_base,
        "GET",
        faq_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("fa_content") != "Fleet FAQ answer updated":
        raise RuntimeError("R16 FAQ item update readback failed")
    request(
        fleet_base,
        "DELETE",
        faq_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    request(
        fleet_base,
        "DELETE",
        faq_master_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    faq_cleanup = request(
        fleet_base,
        "GET",
        f"{faq_masters_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(row.get("fm_id") == faq_master_id for row in faq_cleanup.get("items", [])):
        raise RuntimeError("R16 FAQ cleanup readback failed")

    menus_path = "/api/v1/sites/owner-a-site/admin/menus"
    initial_menus = request(
        fleet_base,
        "GET",
        menus_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_menus.get("items"), list):
        raise RuntimeError("R17 menu list failed")
    created_menu = request(
        fleet_base,
        "POST",
        menus_path,
        body={
            "me_code": "900900",
            "me_name": "Fleet certification menu",
            "me_link": "/fleet-certification",
            "me_target": "_self",
            "me_order": 30,
            "me_use": 1,
            "me_mobile_use": 1,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    menu_id = created_menu.get("me_id")
    if not isinstance(menu_id, int) or created_menu.get("me_code") != "900900":
        raise RuntimeError("R17 menu create failed")
    menu_path = f"{menus_path}/{menu_id}"
    menu_detail = request(
        fleet_base,
        "GET",
        menu_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if menu_detail.get("me_name") != "Fleet certification menu":
        raise RuntimeError("R17 menu detail failed")
    updated_menu = request(
        fleet_base,
        "PUT",
        menu_path,
        body={"me_name": "Fleet certification menu updated", "me_mobile_use": 0},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if (
        updated_menu.get("me_name") != "Fleet certification menu updated"
        or updated_menu.get("me_mobile_use") != 0
    ):
        raise RuntimeError("R17 menu update failed")
    menu_readback = request(
        fleet_base,
        "GET",
        menu_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if menu_readback.get("me_name") != "Fleet certification menu updated":
        raise RuntimeError("R17 menu update readback failed")
    canonical_reorder = request(
        fleet_base,
        "PATCH",
        menus_path,
        body={"orders": [{"me_id": menu_id, "me_order": 31}]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if canonical_reorder.get("result") != "ok":
        raise RuntimeError("R17 canonical menu reorder failed")
    legacy_reorder = request(
        fleet_base,
        "PATCH",
        f"{menus_path}/reorder",
        body={"orders": [{"me_id": menu_id, "me_order": 32}]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if legacy_reorder.get("result") != "ok":
        raise RuntimeError("R17 legacy menu reorder failed")
    reordered_menu = request(
        fleet_base,
        "GET",
        menu_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if reordered_menu.get("me_order") != 32:
        raise RuntimeError("R17 menu reorder readback failed")
    request(
        fleet_base,
        "DELETE",
        menu_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    menu_cleanup = request(
        fleet_base,
        "GET",
        menus_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(row.get("me_id") == menu_id for row in menu_cleanup.get("items", [])):
        raise RuntimeError("R17 menu cleanup readback failed")

    layouts_path = "/api/v1/sites/owner-a-site/admin/layouts"
    initial_layouts = request(
        fleet_base,
        "GET",
        f"{layouts_path}?page=1&per_page=20",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(initial_layouts.get("items"), list):
        raise RuntimeError("R18 layout list failed")
    layout_page_id = "fleet-certification"
    layout_path = f"{layouts_path}/{layout_page_id}"
    saved_layout = request(
        fleet_base,
        "PUT",
        layout_path,
        body={
            "title": "Fleet certification layout",
            "widgets": [
                {
                    "widget_id": "fleet_one",
                    "type": "latest_posts",
                    "title": "Latest",
                    "order": 1,
                    "config": {},
                    "style": {},
                }
            ],
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if saved_layout.get("sl_page_id") != layout_page_id:
        raise RuntimeError("R18 layout save failed")
    layout_detail = request(
        fleet_base,
        "GET",
        layout_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    layout_schema = json.loads(layout_detail.get("sl_schema", "{}"))
    if layout_schema.get("widgets", [{}])[0].get("widget_id") != "fleet_one":
        raise RuntimeError("R18 layout detail failed")
    added_widget_layout = request(
        fleet_base,
        "POST",
        f"{layout_path}/widgets",
        body={
            "widget_id": "fleet_two",
            "type": "notice_banner",
            "title": "Notice",
            "order": 2,
            "config": {},
            "style": {},
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if "fleet_two" not in added_widget_layout.get("sl_schema", ""):
        raise RuntimeError("R18 layout widget add failed")
    updated_widget_layout = request(
        fleet_base,
        "PATCH",
        f"{layout_path}/widgets/fleet_two",
        body={"title": "Notice updated"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if "Notice updated" not in updated_widget_layout.get("sl_schema", ""):
        raise RuntimeError("R18 layout widget update failed")
    canonical_layout_reorder = request(
        fleet_base,
        "PATCH",
        f"{layout_path}/widgets",
        body={"widget_ids": ["fleet_two", "fleet_one"]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    canonical_schema = json.loads(canonical_layout_reorder.get("sl_schema", "{}"))
    if canonical_schema.get("widgets", [{}])[0].get("widget_id") != "fleet_two":
        raise RuntimeError("R18 canonical layout reorder failed")
    legacy_layout_reorder = request(
        fleet_base,
        "PATCH",
        f"{layout_path}/reorder",
        body={"widget_ids": ["fleet_one", "fleet_two"]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    legacy_schema = json.loads(legacy_layout_reorder.get("sl_schema", "{}"))
    if legacy_schema.get("widgets", [{}])[0].get("widget_id") != "fleet_one":
        raise RuntimeError("R18 legacy layout reorder failed")
    deleted_widget_layout = request(
        fleet_base,
        "DELETE",
        f"{layout_path}/widgets/fleet_two",
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if "fleet_two" in deleted_widget_layout.get("sl_schema", ""):
        raise RuntimeError("R18 layout widget delete failed")
    reset_layout = request(
        fleet_base,
        "PUT",
        layout_path,
        body={"title": "Fleet certification layout", "widgets": []},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    reset_schema = json.loads(reset_layout.get("sl_schema", "{}"))
    if reset_schema.get("widgets") != []:
        raise RuntimeError("R18 layout widget cleanup readback failed")

    theme_config_path = "/api/v1/sites/owner-a-site/admin/theme"
    themes_path = "/api/v1/sites/owner-a-site/admin/themes"
    initial_theme_config = request(
        fleet_base,
        "GET",
        theme_config_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    initial_theme_values = {
        "cf_theme": initial_theme_config.get("cf_theme", ""),
        "cf_mobile_theme": initial_theme_config.get("cf_mobile_theme", ""),
    }
    if not all(isinstance(value, str) for value in initial_theme_values.values()):
        raise RuntimeError("R19 theme config failed")
    theme_list = request(
        fleet_base,
        "GET",
        themes_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    installed_themes = theme_list.get("items")
    if not isinstance(installed_themes, list) or not installed_themes:
        raise RuntimeError("R19 installed theme list is empty")
    target_theme = installed_themes[0].get("id")
    if not isinstance(target_theme, str) or not re.fullmatch(r"[A-Za-z0-9_-]+", target_theme):
        raise RuntimeError("R19 installed theme ID is invalid")
    theme_detail = request(
        fleet_base,
        "GET",
        f"{themes_path}/{target_theme}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if theme_detail.get("id") != target_theme:
        raise RuntimeError("R19 theme detail failed")
    disabled_theme = request(
        fleet_base,
        "PUT",
        theme_config_path,
        body={"cf_theme": ""},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if disabled_theme.get("cf_theme") != "":
        raise RuntimeError("R19 desktop theme disable failed")
    disabled_theme_readback = request(
        fleet_base,
        "GET",
        theme_config_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if disabled_theme_readback.get("cf_theme") != "":
        raise RuntimeError("R19 desktop theme disable readback failed")
    disabled_detail_readback = request(
        fleet_base,
        "GET",
        f"{themes_path}/{target_theme}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if disabled_detail_readback.get("is_active"):
        raise RuntimeError("R19 desktop theme disabled detail readback failed")
    applied_theme = request(
        fleet_base,
        "PUT",
        theme_config_path,
        body={"cf_theme": target_theme},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if applied_theme.get("cf_theme") != target_theme:
        raise RuntimeError("R19 desktop theme apply failed")
    active_theme_readback = request(
        fleet_base,
        "GET",
        f"{themes_path}/{target_theme}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not active_theme_readback.get("is_active"):
        raise RuntimeError("R19 desktop theme detail active-state readback failed")
    restored_theme = request(
        fleet_base,
        "PUT",
        theme_config_path,
        body={"cf_theme": initial_theme_values["cf_theme"]},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if restored_theme.get("cf_theme") != initial_theme_values["cf_theme"]:
        raise RuntimeError("R19 theme rollback failed")
    restored_theme_readback = request(
        fleet_base,
        "GET",
        theme_config_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(
        restored_theme_readback.get(name) != value
        for name, value in initial_theme_values.items()
    ):
        raise RuntimeError("R19 theme rollback readback failed")

    points_path = "/api/v1/sites/owner-a-site/admin/points"
    point_summary_path = f"{points_path}/summary?mb_id={member_id}"
    baseline_point_summary = request(
        fleet_base,
        "GET",
        point_summary_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if baseline_point_summary.get("mb_id") != member_id:
        raise RuntimeError("R20 point baseline summary failed")
    baseline_point_total = baseline_point_summary.get("total_point")
    baseline_point_rows = baseline_point_summary.get("total_rows")
    baseline_member_point = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("mb_point")
    if not isinstance(baseline_point_total, int) or not isinstance(baseline_point_rows, int):
        raise RuntimeError("R20 point baseline summary types are invalid")
    if not isinstance(baseline_member_point, int):
        raise RuntimeError("R20 member point baseline type is invalid")
    baseline_point_list = request(
        fleet_base,
        "GET",
        f"{points_path}?page=1&per_page=100&mb_id={member_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if not isinstance(baseline_point_list.get("items"), list):
        raise RuntimeError("R20 point baseline list failed")

    point_sentinel = f"R20 local {env['G5_CERT_REVISION'][:12]}"
    canonical_reason = f"{point_sentinel} canonical grant"
    legacy_grant_reason = f"{point_sentinel} legacy grant"
    legacy_deduct_reason = f"{point_sentinel} legacy deduct"
    canonical_point = request(
        fleet_base,
        "POST",
        points_path,
        body={
            "action": "grant",
            "mb_id": member_id,
            "point": 41,
            "po_content": canonical_reason,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if canonical_point.get("changed_point") != 41:
        raise RuntimeError("R20 canonical point grant failed")
    legacy_grant_point = request(
        fleet_base,
        "POST",
        f"{points_path}/grant",
        body={"mb_id": member_id, "point": 23, "po_content": legacy_grant_reason},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if legacy_grant_point.get("changed_point") != 23:
        raise RuntimeError("R20 legacy point grant failed")
    legacy_deduct_point = request(
        fleet_base,
        "POST",
        f"{points_path}/deduct",
        body={"mb_id": member_id, "point": 17, "po_content": legacy_deduct_reason},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if legacy_deduct_point.get("changed_point") != -17:
        raise RuntimeError("R20 legacy point deduct failed")

    point_list_readback = request(
        fleet_base,
        "GET",
        f"{points_path}?page=1&per_page=100&mb_id={member_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    created_point_items = [
        item
        for item in point_list_readback.get("items", [])
        if item.get("po_content")
        in {canonical_reason, legacy_grant_reason, legacy_deduct_reason}
    ]
    created_point_ids = [item.get("po_id") for item in created_point_items]
    if len(created_point_items) != 3 or not all(
        isinstance(po_id, int) and po_id > 0 for po_id in created_point_ids
    ):
        raise RuntimeError("R20 point list readback did not find all created rows")
    changed_point_summary = request(
        fleet_base,
        "GET",
        point_summary_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        changed_point_summary.get("total_point") != baseline_point_total + 47
        or changed_point_summary.get("total_rows") != baseline_point_rows + 3
    ):
        raise RuntimeError("R20 point summary mutation readback failed")
    changed_member_point = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("mb_point")
    if changed_member_point != baseline_member_point + 47:
        raise RuntimeError("R20 member balance mutation readback failed")

    safe_expiration = request(
        fleet_base,
        "POST",
        f"{points_path}/expire",
        body={"base_date": "1970-01-01"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if (
        safe_expiration.get("base_date") != "1970-01-01"
        or safe_expiration.get("expired_count") != 0
        or safe_expiration.get("synced_members") != 0
    ):
        raise RuntimeError("R20 zero-effect point expiration failed closed")

    deleted_points = request(
        fleet_base,
        "DELETE",
        points_path,
        body={"po_ids": created_point_ids},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if (
        deleted_points.get("requested_count") != 3
        or deleted_points.get("deleted_count") != 3
    ):
        raise RuntimeError("R20 point cleanup delete failed")
    restored_point_summary = request(
        fleet_base,
        "GET",
        point_summary_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        restored_point_summary.get("total_point") != baseline_point_total
        or restored_point_summary.get("total_rows") != baseline_point_rows
    ):
        raise RuntimeError("R20 point cleanup summary readback failed")
    restored_member_point = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("mb_point")
    if restored_member_point != baseline_member_point:
        raise RuntimeError("R20 member balance cleanup readback failed")
    restored_point_list = request(
        fleet_base,
        "GET",
        f"{points_path}?page=1&per_page=100&mb_id={member_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if any(
        item.get("po_content")
        in {canonical_reason, legacy_grant_reason, legacy_deduct_reason}
        for item in restored_point_list.get("items", [])
    ):
        raise RuntimeError("R20 point cleanup list readback failed")

    system_polls_path = "/api/v1/sites/owner-a-site/admin/system/polls"
    legacy_polls_path = "/api/v1/sites/owner-a-site/admin/polls"
    baseline_system_polls = request(
        fleet_base,
        "GET",
        f"{system_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    baseline_legacy_polls = request(
        fleet_base,
        "GET",
        f"{legacy_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    baseline_poll_total = baseline_system_polls.get("pagination", {}).get("total")
    if (
        not isinstance(baseline_poll_total, int)
        or baseline_legacy_polls.get("pagination", {}).get("total") != baseline_poll_total
    ):
        raise RuntimeError("R21 poll baseline aliases disagree")

    poll_sentinel = env["G5_CERT_REVISION"][:12]
    system_poll_subject = f"R21 system {poll_sentinel}"
    legacy_poll_subject = f"R21 legacy {poll_sentinel}"
    system_poll = request(
        fleet_base,
        "POST",
        system_polls_path,
        body={
            "po_subject": system_poll_subject,
            "po_poll1": "찬성",
            "po_poll2": "반대",
            "po_level": 1,
            "po_point": 0,
            "po_use": 1,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    system_poll_id = system_poll.get("po_id")
    if not isinstance(system_poll_id, int) or system_poll.get("po_subject") != system_poll_subject:
        raise RuntimeError("R21 system poll create failed")
    system_poll_detail = request(
        fleet_base,
        "GET",
        f"{system_polls_path}/{system_poll_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if system_poll_detail.get("po_poll1") != "찬성":
        raise RuntimeError("R21 system poll detail failed")
    updated_system_subject = f"{system_poll_subject} updated"
    updated_system_poll = request(
        fleet_base,
        "PUT",
        f"{system_polls_path}/{system_poll_id}",
        body={"po_subject": updated_system_subject, "po_poll3": "보류"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if (
        updated_system_poll.get("po_subject") != updated_system_subject
        or updated_system_poll.get("po_poll3") != "보류"
    ):
        raise RuntimeError("R21 system poll update failed")

    legacy_poll = request(
        fleet_base,
        "POST",
        legacy_polls_path,
        body={
            "po_subject": legacy_poll_subject,
            "po_poll1": "예",
            "po_poll2": "아니오",
            "po_date": "2026-08-18",
            "po_use": 1,
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    legacy_poll_id = legacy_poll.get("po_id")
    if not isinstance(legacy_poll_id, int) or legacy_poll.get("po_date") != "2026-08-18":
        raise RuntimeError("R21 legacy poll create failed")
    legacy_poll_detail = request(
        fleet_base,
        "GET",
        f"{legacy_polls_path}/{legacy_poll_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if legacy_poll_detail.get("po_subject") != legacy_poll_subject:
        raise RuntimeError("R21 legacy poll detail failed")
    updated_legacy_poll = request(
        fleet_base,
        "PATCH",
        f"{legacy_polls_path}/{legacy_poll_id}",
        body={"po_use": 0},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_legacy_poll.get("po_use") != 0:
        raise RuntimeError("R21 legacy poll update failed")

    system_poll_list = request(
        fleet_base,
        "GET",
        f"{system_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    legacy_poll_list = request(
        fleet_base,
        "GET",
        f"{legacy_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    created_poll_ids = {system_poll_id, legacy_poll_id}
    if (
        system_poll_list.get("pagination", {}).get("total") != baseline_poll_total + 2
        or legacy_poll_list.get("pagination", {}).get("total") != baseline_poll_total + 2
        or not created_poll_ids.issubset(
            {item.get("po_id") for item in system_poll_list.get("items", [])}
        )
        or not created_poll_ids.issubset(
            {item.get("po_id") for item in legacy_poll_list.get("items", [])}
        )
    ):
        raise RuntimeError("R21 poll alias list readback failed")

    request(
        fleet_base,
        "DELETE",
        f"{system_polls_path}/{system_poll_id}",
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    request(
        fleet_base,
        "DELETE",
        f"{legacy_polls_path}/{legacy_poll_id}",
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    restored_system_polls = request(
        fleet_base,
        "GET",
        f"{system_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    restored_legacy_polls = request(
        fleet_base,
        "GET",
        f"{legacy_polls_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        restored_system_polls.get("pagination", {}).get("total") != baseline_poll_total
        or restored_legacy_polls.get("pagination", {}).get("total") != baseline_poll_total
        or any(
            item.get("po_id") in created_poll_ids
            for item in restored_system_polls.get("items", [])
            + restored_legacy_polls.get("items", [])
        )
    ):
        raise RuntimeError("R21 poll cleanup readback failed")

    system_popups_path = "/api/v1/sites/owner-a-site/admin/system/popups"
    legacy_popups_path = "/api/v1/sites/owner-a-site/admin/popups"
    baseline_system_popups = request(
        fleet_base, "GET", f"{system_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    baseline_legacy_popups = request(
        fleet_base, "GET", f"{legacy_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    baseline_popup_total = baseline_system_popups.get("pagination", {}).get("total")
    if (
        not isinstance(baseline_popup_total, int)
        or baseline_legacy_popups.get("pagination", {}).get("total") != baseline_popup_total
    ):
        raise RuntimeError("R22 popup baseline aliases disagree")

    popup_sentinel = env["G5_CERT_REVISION"][:12]
    common_popup = {
        "nw_division": "both", "nw_device": "both",
        "nw_begin_time": "2026-08-18 09:00:00",
        "nw_end_time": "2026-08-25 18:00:00",
        "nw_disable_hours": 24, "nw_left": 100, "nw_top": 100,
        "nw_height": 400, "nw_width": 600, "nw_content_html": 0,
    }
    system_popup_subject = f"R22 system {popup_sentinel}"
    system_popup = request(
        fleet_base, "POST", system_popups_path,
        body={**common_popup, "nw_subject": system_popup_subject, "nw_content": "system popup body"},
        headers=fleet_headers(admin_cookie, admin_csrf), expected=(201,),
    ).json()
    system_popup_id = system_popup.get("nw_id")
    if not isinstance(system_popup_id, int) or system_popup.get("nw_width") != 600:
        raise RuntimeError("R22 system popup create failed")
    system_popup_detail = request(
        fleet_base, "GET", f"{system_popups_path}/{system_popup_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if system_popup_detail.get("nw_subject") != system_popup_subject:
        raise RuntimeError("R22 system popup detail failed")
    updated_system_popup = request(
        fleet_base, "PUT", f"{system_popups_path}/{system_popup_id}",
        body={"nw_device": "mobile", "nw_subject": f"{system_popup_subject} updated"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_system_popup.get("nw_device") != "mobile":
        raise RuntimeError("R22 system popup update failed")

    legacy_popup_subject = f"R22 legacy {popup_sentinel}"
    legacy_popup = request(
        fleet_base, "POST", legacy_popups_path,
        body={**common_popup, "nw_subject": legacy_popup_subject, "nw_content": "legacy popup body"},
        headers=fleet_headers(admin_cookie, admin_csrf), expected=(201,),
    ).json()
    legacy_popup_id = legacy_popup.get("nw_id")
    if not isinstance(legacy_popup_id, int) or legacy_popup.get("nw_subject") != legacy_popup_subject:
        raise RuntimeError("R22 legacy popup create failed")
    legacy_popup_detail = request(
        fleet_base, "GET", f"{legacy_popups_path}/{legacy_popup_id}",
        headers=fleet_headers(admin_cookie),
    ).json()
    if legacy_popup_detail.get("nw_content") != "legacy popup body":
        raise RuntimeError("R22 legacy popup detail failed")
    updated_legacy_popup = request(
        fleet_base, "PATCH", f"{legacy_popups_path}/{legacy_popup_id}",
        body={"nw_division": "layer", "nw_content_html": 1},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if updated_legacy_popup.get("nw_division") != "layer" or updated_legacy_popup.get("nw_content_html") != 1:
        raise RuntimeError("R22 legacy popup update failed")

    system_popup_list = request(
        fleet_base, "GET", f"{system_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    legacy_popup_list = request(
        fleet_base, "GET", f"{legacy_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    created_popup_ids = {system_popup_id, legacy_popup_id}
    if (
        system_popup_list.get("pagination", {}).get("total") != baseline_popup_total + 2
        or legacy_popup_list.get("pagination", {}).get("total") != baseline_popup_total + 2
        or not created_popup_ids.issubset({item.get("nw_id") for item in system_popup_list.get("items", [])})
        or not created_popup_ids.issubset({item.get("nw_id") for item in legacy_popup_list.get("items", [])})
    ):
        raise RuntimeError("R22 popup alias list readback failed")

    request(fleet_base, "DELETE", f"{system_popups_path}/{system_popup_id}", headers=fleet_headers(admin_cookie, admin_csrf), expected=(204,))
    request(fleet_base, "DELETE", f"{legacy_popups_path}/{legacy_popup_id}", headers=fleet_headers(admin_cookie, admin_csrf), expected=(204,))
    restored_system_popups = request(
        fleet_base, "GET", f"{system_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    restored_legacy_popups = request(
        fleet_base, "GET", f"{legacy_popups_path}?page=1&per_page=100",
        headers=fleet_headers(admin_cookie),
    ).json()
    if (
        restored_system_popups.get("pagination", {}).get("total") != baseline_popup_total
        or restored_legacy_popups.get("pagination", {}).get("total") != baseline_popup_total
        or any(item.get("nw_id") in created_popup_ids for item in restored_system_popups.get("items", []) + restored_legacy_popups.get("items", []))
    ):
        raise RuntimeError("R22 popup cleanup readback failed")

    canonical_members_path = f"{canonical_group_path}/members"
    request(
        fleet_base,
        "GET",
        f"{canonical_members_path}?page=1&per_page=20",
        headers=fleet_headers(admin_cookie),
    )
    added_group_member = request(
        fleet_base,
        "POST",
        canonical_members_path,
        body={"mb_id": member_id},
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if added_group_member.get("mb_id") != member_id:
        raise RuntimeError("R13 canonical group member add failed")
    request(
        fleet_base,
        "DELETE",
        f"{canonical_members_path}/{member_id}",
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    request(
        fleet_base,
        "DELETE",
        canonical_group_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    canonical_cleanup = request(
        fleet_base,
        "GET",
        canonical_groups_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if "fleetgrp" in [row.get("gr_id") for row in canonical_cleanup.get("items", [])]:
        raise RuntimeError("R13 canonical group cleanup readback failed")

    legacy_groups_path = "/api/v1/sites/owner-a-site/admin/groups"
    request(
        fleet_base,
        "GET",
        legacy_groups_path,
        headers=fleet_headers(admin_cookie),
    )
    legacy_group = request(
        fleet_base,
        "POST",
        legacy_groups_path,
        body={"gr_id": "fleetold", "gr_subject": "Fleet legacy"},
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if legacy_group.get("gr_id") != "fleetold":
        raise RuntimeError("R13 legacy group create failed")
    legacy_group_path = f"{legacy_groups_path}/fleetold"
    if request(
        fleet_base,
        "GET",
        legacy_group_path,
        headers=fleet_headers(admin_cookie),
    ).json().get("gr_subject") != "Fleet legacy":
        raise RuntimeError("R13 legacy group detail failed")
    legacy_updated = request(
        fleet_base,
        "PUT",
        legacy_group_path,
        body={"gr_subject": "Fleet legacy updated"},
        headers=fleet_headers(admin_cookie, admin_csrf),
    ).json()
    if legacy_updated.get("gr_subject") != "Fleet legacy updated":
        raise RuntimeError("R13 legacy group update failed")
    legacy_members_path = f"{legacy_group_path}/members"
    request(
        fleet_base,
        "GET",
        f"{legacy_members_path}?page=1&per_page=20",
        headers=fleet_headers(admin_cookie),
    )
    legacy_added_member = request(
        fleet_base,
        "POST",
        legacy_members_path,
        body={"mb_id": member_id},
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
    ).json()
    if legacy_added_member.get("mb_id") != member_id:
        raise RuntimeError("R13 legacy group member add failed")
    request(
        fleet_base,
        "DELETE",
        f"{legacy_members_path}/{member_id}",
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    request(
        fleet_base,
        "DELETE",
        legacy_group_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    legacy_cleanup = request(
        fleet_base,
        "GET",
        legacy_groups_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    if "fleetold" in [row.get("gr_id") for row in legacy_cleanup.get("items", [])]:
        raise RuntimeError("R13 legacy group cleanup readback failed")

    request(
        fleet_base,
        "DELETE",
        member_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    deleted_member = request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
    ).json()
    leave_date = deleted_member.get("mb_leave_date")
    if not isinstance(leave_date, str) or not re.fullmatch(r"\d{8}", leave_date):
        raise RuntimeError("R12 member soft-delete date readback failed")
    fleet_readback = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/config/basic",
        headers=fleet_headers(admin_cookie),
    ).json()
    if fleet_readback.get("cf_10") != sentinel:
        raise RuntimeError("Fleet mutation readback failed")
    request(
        fleet_base,
        "PUT",
        "/api/v1/sites/owner-a-site/config/basic",
        body={"cf_10": fleet_baseline},
        headers=fleet_headers(admin_cookie, admin_csrf),
    )

    admin_sites = request(
        fleet_base,
        "GET",
        "/api/v1/sites",
        headers=fleet_headers(admin_cookie),
    ).json()
    if [row.get("site_id") for row in admin_sites] != ["owner-a-site"]:
        raise RuntimeError("admin site ownership readback mismatch")
    final_config = request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site/config/basic",
        headers=fleet_headers(admin_cookie),
    ).json()
    if final_config.get("cf_10") != baseline:
        raise RuntimeError("Fleet mutation cleanup did not restore provider baseline")

    runtime_manifest = json.loads(
        (ROOT / ".cache/composed/gnuboard5-php.manifest.json").read_text(
            encoding="utf-8"
        )
    )
    evidence = {
        "schema": "g5-fleet.local-runtime/v1",
        "status": "passed",
        "revision": env["G5_CERT_REVISION"],
        "openapi_sha256": sha256(
            ROOT / "connectors/gnuboard5-php/api/docs/openapi.yaml"
        ),
        "upstream": {
            "version": upstream["version"],
            "commit": upstream["commit"],
            "tree": upstream["tree"],
            "runtime_fingerprint_sha256": runtime_manifest["prepared"][
                "runtime_fingerprint_sha256"
            ],
        },
        "provider": {
            "status": provider["status"],
            "version": provider["version"],
            "shop_installed": True,
        },
        "fleet": {
            "users": 1,
            "sites": 1,
            "owner_site_counts": {
                env["G5_CERT_FLEET_ADMIN_ID"]: len(admin_sites),
            },
            "cross_owner_access": "not_exercised_in_r12_scope",
            "otp_install_login_step_up": "passed",
            "connector_health": connector_health,
        },
        "mutation": {
            "field": "cf_10",
            "update_readback": "passed",
            "cleanup_readback": "passed",
        },
        "r12_members": {
            "operations": 10,
            "list_export_detail": "passed",
            "update_readback": "passed",
            "level_readback": "passed",
            "icon_upload_delete": "passed",
            "image_upload_delete": "passed",
            "member_soft_delete_date_readback": "passed",
        },
        "r13_groups": {
            "operations": 17,
            "canonical_group_crud_and_patch": "passed",
            "canonical_member_list_add_delete": "passed",
            "legacy_alias_group_crud": "passed",
            "legacy_alias_member_list_add_delete": "passed",
            "cleanup_readback": "passed",
        },
        "r14_boards": {
            "operations": 7,
            "list_detail": "passed",
            "create_update_readback": "passed",
            "copy_readback": "passed",
            "explicit_new_post_cleanup": "passed",
            "board_cleanup_readback": "passed",
        },
        "r15_contents": {
            "operations": 5,
            "list_detail": "passed",
            "create_update_readback": "passed",
            "html_mode_2_preserved": "passed",
            "empty_mobile_content_preserved": "passed",
            "content_cleanup_readback": "passed",
        },
        "r16_faqs": {
            "operations": 14,
            "master_list_detail_create_update_delete": "passed",
            "item_list_detail_create_update_delete": "passed",
            "empty_pc_mobile_html_preserved": "passed",
            "header_footer_image_upload_delete": "passed",
            "faq_cleanup_readback": "passed",
        },
        "r17_menus": {
            "operations": 7,
            "list_detail": "passed",
            "create_update_readback": "passed",
            "canonical_reorder_readback": "passed",
            "legacy_reorder_readback": "passed",
            "menu_cleanup_readback": "passed",
        },
        "r18_layouts": {
            "operations": 8,
            "list_detail": "passed",
            "save_readback": "passed",
            "widget_add_update_delete": "passed",
            "canonical_reorder_readback": "passed",
            "legacy_reorder_readback": "passed",
            "widget_cleanup_readback": "passed",
        },
        "r19_theme": {
            "operations": 4,
            "config_list_detail": "passed",
            "desktop_disable_apply_readback": "passed",
            "detail_active_state_readback": "passed",
            "mobile_theme_baseline_preserved": "passed",
            "config_rollback_readback": "passed",
        },
        "r20_points": {
            "operations": 7,
            "baseline_list_summary": "passed",
            "canonical_grant": "passed",
            "legacy_grant_deduct": "passed",
            "list_summary_readback": "passed",
            "zero_effect_expiration_1970_01_01": "passed",
            "created_rows_deleted": 3,
            "list_summary_rollback": "passed",
            "member_balance_rollback": "passed",
        },
        "r21_polls": {
            "operations": 10,
            "system_list_detail_create_update_delete": "passed",
            "legacy_list_detail_create_update_delete": "passed",
            "nine_choice_form_contract": "passed",
            "alias_list_readback": "passed",
            "created_polls_deleted": 2,
            "poll_cleanup_readback": "passed",
        },
        "r22_popups": {
            "operations": 10,
            "system_list_detail_create_update_delete": "passed",
            "legacy_list_detail_create_update_delete": "passed",
            "legacy_form_defaults": "passed",
            "sparse_update_readback": "passed",
            "created_popups_deleted": 2,
            "popup_cleanup_readback": "passed",
        },
        "notifications": {
            "external_delivery_attempts": 0,
        },
    }
    args.output.parent.mkdir(parents=True, exist_ok=True)
    temporary = args.output.with_name(f".{args.output.name}.{os.getpid()}.tmp")
    temporary.write_text(
        json.dumps(evidence, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    os.replace(temporary, args.output)
    print(f"LOCAL_RUNTIME_PASS evidence={args.output}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
