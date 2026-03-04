// socket.js
const { Server } = require('socket.io');

let io;

const init = (server) => {
  if (io) return;  // Prevent initializing multiple times

  io = new Server(server, {
    cors: {
      origin: '*', // Ajusta el origen según sea necesario
    },
  });

  io.on('connection', (socket) => {
    console.log('Cliente conectado:', socket.id);
    console.log('Número total de conexiones activas:', io.sockets.sockets.size);
  
    socket.on('disconnect', () => {
      console.log('Cliente desconectado:', socket.id);
    });
  });
};

const getIO = () => {
  if (!io) {
    throw new Error('Socket.io no ha sido inicializado');
  }
  return io;
};

module.exports = { init, getIO };
