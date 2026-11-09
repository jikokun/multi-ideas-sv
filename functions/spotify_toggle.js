const { randomUUID } = require("node:crypto");

// Reserva compartida entre instancias de Cloud Functions: un doble Fetch no
// debe pausar y volver a reproducir inmediatamente la misma canción.
async function toggleSpotifyPlayback({ user, db, spotifyApiFetch, getFallbackDeviceId, now = Date.now }) {
    const lockRef = db.ref(`stream/spotify_live/cooldowns/${user}/toggle`);
    const owner = randomUUID();
    const startedAt = now();
    const reservation = await lockRef.transaction(current => {
        if (Number(current && current.until) > startedAt) return;
        return { owner, until: startedAt + 120000 };
    });
    if (!reservation.committed) {
        return { status: 200, success: true, suppressed: true, message: "Solicitud repetida ignorada. Espera unos segundos antes de alternar otra vez." };
    }

    try {
        const { res: playerRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player", {
            headers: { "Cache-Control": "no-cache" },
            signal: AbortSignal.timeout(10000)
        });
        if (playerRes.status !== 200 && playerRes.status !== 204) {
            return { status: playerRes.status, success: false, message: "No se pudo consultar el estado de Spotify. No se cambió la reproducción." };
        }
        const playback = playerRes.status === 200 ? await playerRes.json() : null;
        if (playerRes.status === 200 && typeof playback?.is_playing !== "boolean") {
            return { status: 502, success: false, message: "Spotify devolvió un estado de reproducción inválido." };
        }
        const action = playback?.is_playing === true ? "pause" : "play";
        let deviceId = playback?.device?.id || "";
        if (!deviceId && playerRes.status === 204) {
            deviceId = await getFallbackDeviceId(user);
            if (!deviceId) {
                return { status: 409, success: false, message: "Abre Spotify y reproduce una canción para activar un dispositivo." };
            }
        }
        const deviceQuery = deviceId ? `?device_id=${encodeURIComponent(deviceId)}` : "";
        const { res: controlRes } = await spotifyApiFetch(user, `https://api.spotify.com/v1/me/player/${action}${deviceQuery}`, {
            method: "PUT",
            signal: AbortSignal.timeout(10000)
        });
        // Un 403 es un error de permisos/restricciones, no una confirmación.
        if (controlRes.status !== 200 && controlRes.status !== 204) {
            return { status: controlRes.status, success: false, message: "Spotify no pudo " + (action === "pause" ? "pausar" : "reanudar") + " la reproducción." };
        }
        await db.ref("stream/spotify_live/last_action").set({ action, user, timestamp: now() })
            .catch(error => console.warn("[Spotify toggle] No se pudo publicar la alerta:", error.message));
        return { status: 200, success: true, action, is_playing: action === "play", message: action === "pause" ? "Música pausada." : "Música reanudada." };
    } finally {
        // Mantener un pequeño margen incluso ante errores de red: Spotify puede
        // haber aplicado el cambio aunque su respuesta no llegue al servidor.
        await lockRef.transaction(current => {
            if (!current || current.owner !== owner) return;
            return { owner, until: now() + 2500 };
        }).catch(error => console.warn("[Spotify toggle] No se pudo liberar la reserva:", error.message));
    }
}

module.exports = { toggleSpotifyPlayback };
