import { io } from "socket.io-client";

// Connect to current host or proxy in dev
const URL = window.location.hostname === "localhost" && window.location.port === "5173"
  ? "http://localhost:3001"
  : window.location.origin;

export const socket = io(URL, {
  autoConnect: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000
});
