import { io } from "socket.io-client";
import { SOCKET_URL } from "./apiClient";

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
});
