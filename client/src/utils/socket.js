import { io } from "socket.io-client";

// Connect via environment variable, dev proxy, or current origin
const SOCKET_SERVER_URL = 
  import.meta.env.VITE_SOCKET_URL ||
  (window.location.hostname === "localhost" && window.location.port === "5173"
    ? "http://localhost:3001"
    : window.location.origin);

export const socket = io(SOCKET_SERVER_URL, {
  autoConnect: true,
  reconnectionAttempts: 15,
  reconnectionDelay: 1000,
  transports: ["websocket", "polling"]
});
