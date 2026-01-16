import { io } from "socket.io-client";

// URL del backend (ajustar si es producción)
const SOCKET_URL = "http://localhost:5000";

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
});
