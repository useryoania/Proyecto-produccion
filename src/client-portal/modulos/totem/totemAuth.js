// Token de dispositivo del TÓTEM.
//
// El local no tiene IP fija, así que el tótem ya no se autoriza por IP sino por un secreto
// guardado en ESTE equipo. Se activa una sola vez abriendo:  /totem?activar=EL_TOKEN
// (después la clave se borra de la URL para que no quede a la vista ni en el historial).
//
// El token viaja en el header X-Totem-Token en cada llamada al backend.

const KEY = 'totemToken';

export const getTotemToken = () => {
    try { return localStorage.getItem(KEY) || ''; } catch { return ''; }
};

export const setTotemToken = (token) => {
    try { localStorage.setItem(KEY, String(token || '').trim()); } catch { /* modo privado / storage bloqueado */ }
};

/**
 * Si la URL trae ?activar=TOKEN, lo guarda y limpia la query.
 * Devuelve true si en esta carga se activó el equipo.
 */
export const activarDesdeURL = () => {
    try {
        const params = new URLSearchParams(window.location.search);
        const token = (params.get('activar') || '').trim();
        if (!token) return false;
        setTotemToken(token);
        params.delete('activar');
        const q = params.toString();
        window.history.replaceState({}, '', window.location.pathname + (q ? `?${q}` : ''));
        return true;
    } catch { return false; }
};

/** Headers con el token (si hay), preservando los que ya se pasen. */
export const totemHeaders = (extra = {}) => {
    const token = getTotemToken();
    return token ? { ...extra, 'X-Totem-Token': token } : { ...extra };
};
