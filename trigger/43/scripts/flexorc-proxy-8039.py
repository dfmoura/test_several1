#!/usr/bin/env python3
"""Encaminha o tunnel flexorc (porta 8039) para esta instalação (8043).

O cloudflared ainda aponta para 8039. O ajuste definitivo é
scripts/fix-cloudflared-flexorc-8043.sh, com sudo.
"""

import socket
import threading

LISTEN = ("127.0.0.1", 8039)
TARGET = ("127.0.0.1", 8043)


def pipe(src: socket.socket, dst: socket.socket) -> None:
    try:
        while True:
            data = src.recv(65536)
            if not data:
                break
            dst.sendall(data)
    except OSError:
        pass
    finally:
        for sock, how in ((src, socket.SHUT_RD), (dst, socket.SHUT_WR)):
            try:
                sock.shutdown(how)
            except OSError:
                pass


def handle(client: socket.socket) -> None:
    try:
        remote = socket.create_connection(TARGET, 10)
    except OSError:
        client.close()
        return
    left = threading.Thread(target=pipe, args=(client, remote), daemon=True)
    right = threading.Thread(target=pipe, args=(remote, client), daemon=True)
    left.start()
    right.start()
    left.join()
    right.join()
    client.close()
    remote.close()


def main() -> None:
    server = socket.socket()
    server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
    server.bind(LISTEN)
    server.listen(64)
    while True:
        client, _addr = server.accept()
        threading.Thread(target=handle, args=(client,), daemon=True).start()


if __name__ == "__main__":
    main()
