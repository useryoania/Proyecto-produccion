/**
 * Recarga la página vaciando primero el Cache Storage del Service Worker,
 * para no arrastrar chunks viejos tras un deploy. Es lo más parecido a un
 * hard refresh (Ctrl+Shift+R) que se puede disparar desde JavaScript:
 * no existe API para forzar un hard refresh real, pero limpiar el caché del
 * SW —que es quien sirve contenido stale— logra el mismo efecto.
 */
export async function recargarLimpio() {
    try {
        if (window.caches) {
            const keys = await caches.keys();
            await Promise.all(keys.map(k => caches.delete(k)));
        }
    } catch (e) {
        /* si la limpieza falla, igual recargamos */
    }
    window.location.reload();
}
