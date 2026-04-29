import { Server as HttpServer } from "http";
import { Server } from "socket.io";
import {
  ServerToClientEvents,
  ClientToServerEvents,
  CallStatusUpdate,
} from "../types";

type IoServer = Server<ClientToServerEvents, ServerToClientEvents>;

let io: IoServer;

export function createSocketServer(httpServer: HttpServer): IoServer {
  io = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer, {
    cors: { origin: "*" },
  });

  io.on("connection", (socket) => {
    socket.on("subscribe_call", (callId) => {
      socket.join(callId);
    });

    socket.on("unsubscribe_call", (callId) => {
      socket.leave(callId);
    });
  });

  return io;
}

export function broadcastStatusUpdate(update: CallStatusUpdate): void {
  if (!io) return;
  io.to(update.callId).emit("call_status_update", update);
}
