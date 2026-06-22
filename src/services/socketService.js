import { io } from "socket.io-client";
import { SOCKET_URL } from "./apiClient";
import { recargarLimpio } from "../utils/hardReload";

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
        // El servidor fue reiniciado. Recargamos con jitter (2–10s) para no golpear
        // todos a la vez al server recién arrancado (evita la ráfaga que tiraba algunos
        // chunks), y con recarga limpia para no arrastrar chunks viejos del Service Worker.
        const delay = 2000 + Math.random() * 8000;
        console.info(`[socketService] Server restarted — reloading in ${Math.round(delay)}ms...`);
        setTimeout(recargarLimpio, delay);
    }
});
