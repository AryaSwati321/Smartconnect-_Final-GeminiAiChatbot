// src/lib/socket.js
import { io } from "socket.io-client";

let socket = null;
export function createSocket(token) {
  if (socket) return socket;
  const url = import.meta.env.VITE_API_URL || "http://localhost:5000";
  socket = io(url, { auth: { token } });
  return socket;
}
export function disconnectSocket() {
  if (socket) { socket.disconnect(); socket = null; }
}
