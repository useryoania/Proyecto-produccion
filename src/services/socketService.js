import { io } from "socket.io-client";
import { SOCKET_URL } from "./apiClient";

export const socket = io(SOCKET_URL, {
    autoConnect: true,
    reconnection: true,
});

// ─── Forzar hard-reload cuando el servidor es reiniciado (pm2 restart) ───────
// El backend emite 'server:started' con un timestamp único de cada arranque.
// Si el cliente ya conocía un timestamp distinto → el servidor fue reiniciado → recargamos.
let _knownServerStart = null;

socket.on('server:started', ({ startTime }) => {
    if (_knownServerStart === null) {
        // Primera vez que nos conectamos: sólo guardamos el timestamp, no recargamos.
        _knownServerStart = startTime;
    } else if (_knownServerStart !== startTime) {
        // El servidor arrancó con otro timestamp → fue reiniciado.
        // Esperamos 1.5s para que el servidor termine de inicializarse antes de recargar.
        console.info('[socketService] Server restarted — reloading in 1.5s...');
        setTimeout(() => window.location.reload(), 1500);
    }
});
