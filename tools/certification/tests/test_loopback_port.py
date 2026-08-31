import socket
import unittest

from tools.certification.loopback_port import select_port


class LoopbackPortTests(unittest.TestCase):
    def test_available_port_can_be_selected_and_reused(self) -> None:
        port = select_port()
        self.assertGreater(port, 0)
        self.assertEqual(port, select_port(str(port)))

    def test_busy_port_is_not_replaced_with_another_origin(self) -> None:
        with socket.socket() as listener:
            listener.bind(("127.0.0.1", 0))
            with self.assertRaises(OSError):
                select_port(str(listener.getsockname()[1]))

    def test_malformed_or_out_of_range_port_is_rejected(self) -> None:
        for value in ("", "-1", "65536", "1;echo x", "127.0.0.1:8000"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                select_port(value)
