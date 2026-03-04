// src/utils/socket.js
import { io } from "socket.io-client";

let socket;

export const initializeSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_BACKEND_SOCKET_URL, {
      transports: ["websocket"], // Usar solo WebSocket
    });

    socket.on("connect", () => {
      console.log("Conectado a Socket.io:", socket.id);
    });

    socket.on("disconnect", () => {
      console.log("Desconectado de Socket.io");
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    throw new Error("Socket.io no ha sido inicializado");
  }
  return socket;
};
