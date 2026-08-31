"""Select an available loopback port, optionally retaining an approved UI origin."""

from __future__ import annotations

import os
import re
import socket


def select_port(requested: str | None = None) -> int:
    value = requested if requested is not None else "0"
    if not re.fullmatch(r"[0-9]{1,5}", value) or not 0 <= int(value) <= 65535:
        raise ValueError("certification port must be an integer from 0 to 65535")
    with socket.socket() as probe:
        # Match the server listener: recently closed connections may remain in
        # TIME_WAIT, but a live listener must still fail (no SO_REUSEPORT).
        probe.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        probe.bind(("127.0.0.1", int(value)))
        return probe.getsockname()[1]


if __name__ == "__main__":
    print(select_port(os.environ.get("G5_CERT_FLEET_PORT")))
