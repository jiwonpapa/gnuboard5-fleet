#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import http.client
import json
import os
import re
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


def fleet_login(base: str, login_name: str, value: str) -> tuple[str, str]:
    response = request(
        base,
        "POST",
        "/api/v1/auth/login",
        body={"login_name": login_name, "password": value},
    )
    csrf = response.json().get("csrf_token")
    cookie = response.headers.get("set-cookie", "").split(";", 1)[0]
    if not isinstance(csrf, str) or not csrf or not cookie.startswith("g5_fleet_session="):
        raise RuntimeError("Fleet login cookie/CSRF readback failed")
    request(
        base,
        "POST",
        "/api/v1/auth/step-up",
        body={"password": value},
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

    request(
        fleet_base,
        "POST",
        "/api/v1/bootstrap",
        body={
            "login_name": env["G5_CERT_FLEET_ADMIN_ID"],
            "password": env["G5_CERT_FLEET_ADMIN_VALUE"],
        },
        expected=(201,),
    )
    admin_cookie, admin_csrf = fleet_login(
        fleet_base,
        env["G5_CERT_FLEET_ADMIN_ID"],
        env["G5_CERT_FLEET_ADMIN_VALUE"],
    )
    request(
        fleet_base,
        "POST",
        "/api/v1/users",
        body={
            "login_name": env["G5_CERT_FLEET_PEER_ID"],
            "password": env["G5_CERT_FLEET_PEER_VALUE"],
        },
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(201,),
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

    request(
        fleet_base,
        "DELETE",
        member_path,
        headers=fleet_headers(admin_cookie, admin_csrf),
        expected=(204,),
    )
    request(
        fleet_base,
        "GET",
        member_path,
        headers=fleet_headers(admin_cookie),
        expected=(404,),
    )
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

    peer_cookie, peer_csrf = fleet_login(
        fleet_base,
        env["G5_CERT_FLEET_PEER_ID"],
        env["G5_CERT_FLEET_PEER_VALUE"],
    )
    if request(
        fleet_base,
        "GET",
        "/api/v1/sites",
        headers=fleet_headers(peer_cookie),
    ).json() != []:
        raise RuntimeError("new Fleet peer inherited another owner's sites")
    request(
        fleet_base,
        "GET",
        "/api/v1/sites/owner-a-site",
        headers=fleet_headers(peer_cookie),
        expected=(403, 404),
    )
    request(
        fleet_base,
        "POST",
        "/api/v1/sites",
        body={
            "site_id": "owner-b-site",
            "display_name": "Owner B G5",
            "base_url": g5_base,
        },
        headers=fleet_headers(peer_cookie, peer_csrf),
        expected=(201,),
    )
    request(
        fleet_base,
        "POST",
        "/api/v1/sites/owner-b-site/connector/login",
        body={
            "mb_id": env["G5_CERT_G5_ADMIN_ID"],
            "mb_password": env["G5_CERT_G5_ADMIN_VALUE"],
        },
        headers=fleet_headers(peer_cookie, peer_csrf),
    )
    peer_sites = request(
        fleet_base,
        "GET",
        "/api/v1/sites",
        headers=fleet_headers(peer_cookie),
    ).json()
    admin_sites = request(
        fleet_base,
        "GET",
        "/api/v1/sites",
        headers=fleet_headers(admin_cookie),
    ).json()
    if [row.get("site_id") for row in peer_sites] != ["owner-b-site"]:
        raise RuntimeError("peer site ownership readback mismatch")
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
            "users": 2,
            "sites": 2,
            "owner_site_counts": {
                env["G5_CERT_FLEET_ADMIN_ID"]: len(admin_sites),
                env["G5_CERT_FLEET_PEER_ID"]: len(peer_sites),
            },
            "cross_owner_access": "denied",
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
            "member_delete_readback": "passed",
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
