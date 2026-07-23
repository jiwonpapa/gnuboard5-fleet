from __future__ import annotations

import os
import re
from typing import Any

import schemathesis


def _env_str(name: str) -> str | None:
    value = os.getenv(name, "").strip()
    return value or None


def _env_int(name: str) -> int | None:
    value = _env_str(name)
    if value is None:
        return None
    try:
        return int(value)
    except ValueError:
        return None


def _operation_path(context: schemathesis.HookContext) -> str:
    operation = getattr(context, "operation", None)
    path = getattr(operation, "path", None)
    if isinstance(path, str):
        return path
    return ""


def _to_int_or_default(value: Any, default: int) -> int:
    try:
        return int(value)
    except (TypeError, ValueError):
        return default


def _sanitize_string(value: str) -> str:
    sanitized = re.sub(r"[\x00-\x1F\x7F]", "", value)
    sanitized = re.sub(r"[\U00010000-\U0010FFFF]", "", sanitized)
    return sanitized


@schemathesis.hook
def map_query(context: schemathesis.HookContext, query: Any) -> Any:
    if not isinstance(query, dict):
        return query

    mapped = dict(query)
    if "page" in mapped:
        page = _to_int_or_default(mapped.get("page"), 1)
        mapped["page"] = 1 if page < 1 else min(page, 100000)

    if "per_page" in mapped:
        per_page = _to_int_or_default(mapped.get("per_page"), 20)
        per_page = 1 if per_page < 1 else per_page
        mapped["per_page"] = 100 if per_page > 100 else per_page

    if "search" in mapped and mapped.get("search") is not None:
        cleaned = _sanitize_string(str(mapped.get("search")))
        mapped["search"] = cleaned

    for key, value in list(mapped.items()):
        if isinstance(value, str):
            cleaned = _sanitize_string(value).strip()
            if cleaned == "":
                mapped.pop(key, None)
            else:
                mapped[key] = cleaned

    return mapped


@schemathesis.hook
def map_headers(context: schemathesis.HookContext, headers: Any) -> Any:
    if not isinstance(headers, dict):
        return headers

    mapped = dict(headers)
    bearer_token = _env_str("SCHEMATHESIS_BEARER_TOKEN")
    if bearer_token is None:
        mapped.pop("Authorization", None)
    else:
        mapped["Authorization"] = f"Bearer {bearer_token}"

    for key, value in list(mapped.items()):
        if isinstance(value, str):
            cleaned = _sanitize_string(value).strip()
            if cleaned == "":
                mapped.pop(key, None)
            else:
                mapped[key] = cleaned

    return mapped


@schemathesis.hook
def map_path_parameters(context: schemathesis.HookContext, path_parameters: Any) -> Any:
    if not isinstance(path_parameters, dict):
        return path_parameters

    mapped = dict(path_parameters)
    operation_path = _operation_path(context)

    fixture_str = {
        "bo_table": _env_str("SCHEMATHESIS_FIXTURE_BO_TABLE"),
        "mb_id": _env_str("SCHEMATHESIS_FIXTURE_MB_ID"),
        "page_id": _env_str("SCHEMATHESIS_FIXTURE_PAGE_ID"),
        "widget_id": _env_str("SCHEMATHESIS_FIXTURE_WIDGET_ID"),
        "gr_id": _env_str("SCHEMATHESIS_FIXTURE_GR_ID"),
        "theme": _env_str("SCHEMATHESIS_FIXTURE_THEME"),
    }
    fixture_int = {
        "wr_id": _env_int("SCHEMATHESIS_FIXTURE_WR_ID"),
        "bf_no": _env_int("SCHEMATHESIS_FIXTURE_BF_NO"),
        "link_no": _env_int("SCHEMATHESIS_FIXTURE_LINK_NO"),
        "me_id": _env_int("SCHEMATHESIS_FIXTURE_ME_ID"),
        "po_id": _env_int("SCHEMATHESIS_FIXTURE_PO_ID"),
        "fa_id": _env_int("SCHEMATHESIS_FIXTURE_FA_ID"),
        "bk_no": _env_int("SCHEMATHESIS_FIXTURE_BK_NO"),
        "wr_no": _env_int("SCHEMATHESIS_FIXTURE_WR_NO"),
        "fg_no": _env_int("SCHEMATHESIS_FIXTURE_FG_NO"),
        "fo_no": _env_int("SCHEMATHESIS_FIXTURE_FO_NO"),
        "qa_id": _env_int("SCHEMATHESIS_FIXTURE_QA_ID"),
        "no": _env_int("SCHEMATHESIS_FIXTURE_QA_FILE_NO"),
        "ma_id": _env_int("SCHEMATHESIS_FIXTURE_MA_ID"),
        "report_id": _env_int("SCHEMATHESIS_FIXTURE_REPORT_ID"),
    }

    for key, value in fixture_str.items():
        if value is not None and key in mapped:
            mapped[key] = value

    for key, value in fixture_int.items():
        if value is not None and key in mapped:
            mapped[key] = value

    if operation_path in {
        "/boards/{bo_table}/posts/{wr_id}/files/{bf_no}/download",
        "/files/{bo_table}/{wr_id}/{bf_no}",
    }:
        file_bo_table = _env_str("SCHEMATHESIS_FIXTURE_FILE_BO_TABLE")
        file_wr_id = _env_int("SCHEMATHESIS_FIXTURE_FILE_WR_ID")
        file_bf_no = _env_int("SCHEMATHESIS_FIXTURE_BF_NO")
        if file_bo_table is not None and "bo_table" in mapped:
            mapped["bo_table"] = file_bo_table
        if file_wr_id is not None and "wr_id" in mapped:
            mapped["wr_id"] = file_wr_id
        if file_bf_no is not None and "bf_no" in mapped:
            mapped["bf_no"] = file_bf_no

    if operation_path == "/boards/{bo_table}/posts/{wr_id}/link/{link_no}":
        link_bo_table = _env_str("SCHEMATHESIS_FIXTURE_LINK_BO_TABLE")
        link_wr_id = _env_int("SCHEMATHESIS_FIXTURE_LINK_WR_ID")
        link_no = _env_int("SCHEMATHESIS_FIXTURE_LINK_NO")
        if link_bo_table is not None and "bo_table" in mapped:
            mapped["bo_table"] = link_bo_table
        if link_wr_id is not None and "wr_id" in mapped:
            mapped["wr_id"] = link_wr_id
        if link_no is not None and "link_no" in mapped:
            mapped["link_no"] = link_no

    if operation_path == "/qa/{qa_id}/files/{no}/download":
        qa_file_id = _env_int("SCHEMATHESIS_FIXTURE_QA_FILE_ID")
        qa_file_no = _env_int("SCHEMATHESIS_FIXTURE_QA_FILE_NO")
        if qa_file_id is not None and "qa_id" in mapped:
            mapped["qa_id"] = qa_file_id
        if qa_file_no is not None and "no" in mapped:
            mapped["no"] = qa_file_no

    return mapped


@schemathesis.deserializer("text/html")
def deserialize_text_html(context: schemathesis.DeserializationContext, response: Any) -> str:
    text = getattr(response, "text", None)
    if isinstance(text, str):
        return text

    content = getattr(response, "content", b"")
    if isinstance(content, bytes):
        return content.decode("utf-8", errors="replace")

    return str(content)
