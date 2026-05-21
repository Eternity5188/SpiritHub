import { Server as SocketServer } from 'socket.io';

let _io: SocketServer;

export function setIo(server: SocketServer) {
  _io = server;
}

export function getIo(): SocketServer {
  return _io;
}
