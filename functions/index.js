/**
 * ==============================================================================
 * FIREBASE CLOUD FUNCTIONS - SENSUN SHOP (FCM v1 Push Notification Engine)
 * ==============================================================================
 * Proyecto: sensunshopweb
 * Base de Datos: Firebase Realtime Database
 * Modo de Envío: Data-Only Messages (Alta Prioridad / Silent Push)
 * Tópico FCM Android: /topics/news (o "news")
 * Canal Android: sensun_news_channel
 */

const functions = require("firebase-functions");
const admin = require("firebase-admin");

// Inicializar SDK de Administración de Firebase con credenciales nativas del servidor
admin.initializeApp();

/**
 * ------------------------------------------------------------------------------
 * 1. TRIGGER AUTOMÁTICO AL CREAR UNA NOTICIA O BOLETÍN (DATA-ONLY PUSH)
 * Ruta RTDB: /sensunshop/news/{newsId}
 * ------------------------------------------------------------------------------
 */
exports.sendNewsNotificationOnCreate = functions.database
    .ref("/sensunshop/news/{newsId}")
    .onCreate(async (snapshot, context) => {
        const newsId = context.params.newsId;
        const newsData = snapshot.val();

        if (!newsData) {
            console.log(`[FCM Engine] No se encontraron datos para la noticia ${newsId}`);
            return null;
        }

        // Si la noticia está inactiva o borrador, no enviar push
        if (newsData.isActive === false) {
            console.log(`[FCM Engine] Noticia ${newsId} está inactiva. Notificación omitida.`);
            return null;
        }

        const titleText = newsData.title || "¡Nueva Noticia en Sensun Shop!";
        const imageSrc = newsData.imageUrl || newsData.imgSrc || "https://sensunshopweb.firebaseapp.com/imagenes/logos/icono-sensun-shop.webp";
        const contactWhatsapp = newsData.contactWhatsapp || newsData.whatsapp || "";
        const moreUrl = newsData.moreUrl || newsData.link || "";
        const moreText = newsData.moreText || "";

        // Estructura Data-Only FCM v1 (Permite a la app Android control visual 100% nativo y único)
        const message = {
            topic: "news",
            data: {
                title: "¡Nueva Noticia en Sensun Shop!",
                message: `Acabamos de publicar: ${titleText}`,
                type: "news",
                newsId: String(newsId),
                badge: String((newsData.badge || "noticias").toLowerCase()),
                badgeLabel: String(newsData.badgeLabel || "Noticia"),
                imageUrl: String(imageSrc),
                imgSrc: String(imageSrc),
                description: String(newsData.description || ""),
                contactWhatsapp: String(contactWhatsapp),
                whatsapp: String(contactWhatsapp),
                locationUrl: String(newsData.locationUrl || ""),
                moreUrl: String(moreUrl),
                moreText: String(moreText),
                link: String(moreUrl),
                timestamp: String(newsData.timestamp || Date.now()),
                channelId: "sensun_news_channel"
            },
            android: {
                priority: "high" // Alta prioridad para despertar el dispositivo en Doze Mode
            }
        };

        try {
            console.log(`[FCM Engine] Enviando Data-Only push para noticia ID: ${newsId} al tópico 'news'...`);
            const response = await admin.messaging().send(message);
            console.log(`[FCM Engine] ✅ Push enviado exitosamente. FCM Message ID: ${response}`);
            return { success: true, messageId: response };
        } catch (error) {
            console.error(`[FCM Engine] ❌ Error enviando push para noticia ${newsId}:`, error);
            return { success: false, error: error.message };
        }
    });

/**
 * ------------------------------------------------------------------------------
 * 2. TRIGGER AUTOMÁTICO AL CREAR UNA OFERTA DESTACADA (DATA-ONLY PUSH)
 * Ruta RTDB: /sensunshop/offers/{offerId}
 * ------------------------------------------------------------------------------
 */
exports.sendOfferNotificationOnCreate = functions.database
    .ref("/sensunshop/offers/{offerId}")
    .onCreate(async (snapshot, context) => {
        const offerId = context.params.offerId;
        const offerData = snapshot.val();

        if (!offerData || offerData.isActive === false) return null;

        const titleText = offerData.title || "¡Nueva Oferta Exclusiva!";
        const offerDesc = offerData.offerMsg || offerData.description || "¡Aprovecha descuentos y promociones en Sensuntepeque!";
        const imageSrc = offerData.imgSrc || "https://sensunshopweb.firebaseapp.com/imagenes/logos/icono-sensun-shop.webp";

        const message = {
            topic: "news",
            data: {
                title: "¡Nueva Oferta en Sensun Shop!",
                message: `${titleText}: ${offerDesc}`,
                type: "offer",
                newsId: String(offerId),
                imgSrc: String(imageSrc),
                offerMsg: String(offerDesc),
                whatsapp: String(offerData.whatsapp || ""),
                timestamp: String(Date.now()),
                channelId: "sensun_news_channel"
            },
            android: {
                priority: "high"
            }
        };

        try {
            const response = await admin.messaging().send(message);
            console.log(`[FCM Engine] ✅ Oferta notificada con éxito: ${response}`);
            return { success: true, messageId: response };
        } catch (error) {
            console.error(`[FCM Engine] ❌ Error en notificación de oferta:`, error);
            return null;
        }
    });

/**
 * ------------------------------------------------------------------------------
 * 3. ENDPOINT HTTP PARA PRUEBAS RÁPIDAS (DATA-ONLY PUSH)
 * URL: https://us-central1-sensunshopweb.cloudfunctions.net/sendTestPushNotification
 * ------------------------------------------------------------------------------
 */
exports.sendTestPushNotification = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    const title = req.query.title || req.body.title || "¡Notificación de Prueba Sensun Shop!";
    const messageText = req.query.message || req.body.message || "Prueba exitosa de integración FCM v1 Data-Only con la App Android.";
    const topicTarget = req.query.topic || req.body.topic || "news";

    const payload = {
        topic: topicTarget,
        data: {
            title: title,
            message: messageText,
            type: "test",
            newsId: "test-" + Date.now(),
            timestamp: String(Date.now()),
            channelId: "sensun_news_channel"
        },
        android: {
            priority: "high"
        }
    };

    try {
        const response = await admin.messaging().send(payload);
        return res.status(200).json({
            success: true,
            mode: "data-only",
            status: "Push enviado correctamente al tópico: " + topicTarget,
            messageId: response,
            payload: payload
        });
    } catch (error) {
        console.error("[FCM Engine Test] Error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ------------------------------------------------------------------------------
 * 4. OBTENER LISTADO COMPLETO DE USUARIOS DE FIREBASE AUTHENTICATION (ENDPOINT HTTP)
 * URL: https://us-central1-sensunshopweb.cloudfunctions.net/getAuthUsers
 * ------------------------------------------------------------------------------
 */
exports.getAuthUsers = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    try {
        let allUsers = [];
        let nextPageToken;

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach((userRecord) => {
                const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com") ||
                                 Boolean(userRecord.email && userRecord.email.toLowerCase().endsWith("@gmail.com"));
                const mainProvider = (userRecord.providerData && userRecord.providerData[0]) ? userRecord.providerData[0].providerId : (isGoogle ? "google.com" : "password");

                allUsers.push({
                    uid: userRecord.uid,
                    displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split("@")[0] : "Usuario"),
                    email: userRecord.email || "",
                    photoURL: userRecord.photoURL || "",
                    phoneNumber: userRecord.phoneNumber || "",
                    disabled: userRecord.disabled,
                    provider: mainProvider,
                    isGoogle: isGoogle,
                    createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime).getTime() : Date.now(),
                    lastLoginAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).getTime() : Date.now(),
                    platform: "web"
                });
            });
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        return res.status(200).json({
            success: true,
            total: allUsers.length,
            users: allUsers
        });
    } catch (error) {
        console.error("[getAuthUsers] Error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ------------------------------------------------------------------------------
 * 5. SINCRONIZAR AUTOMÁTICAMENTE TODOS LOS USUARIOS DE FIREBASE AUTH A REALTIME DATABASE
 * URL: https://us-central1-sensunshopweb.cloudfunctions.net/syncAuthUsersToDatabase
 * ------------------------------------------------------------------------------
 */
exports.syncAuthUsersToDatabase = functions.https.onRequest(async (req, res) => {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    try {
        let syncedCount = 0;
        let nextPageToken;
        const db = admin.database();

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            const updates = {};

            listUsersResult.users.forEach((userRecord) => {
                const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com") ||
                                 Boolean(userRecord.email && userRecord.email.toLowerCase().endsWith("@gmail.com"));
                const mainProvider = (userRecord.providerData && userRecord.providerData[0]) ? userRecord.providerData[0].providerId : (isGoogle ? "google.com" : "password");

                const userObj = {
                    uid: userRecord.uid,
                    displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split("@")[0] : "Usuario"),
                    email: userRecord.email || "",
                    photoURL: userRecord.photoURL || "",
                    provider: mainProvider,
                    isGoogle: isGoogle,
                    createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime).getTime() : Date.now(),
                    lastLoginAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).getTime() : Date.now(),
                    lastActiveAt: Date.now(),
                    platform: "web"
                };

                updates[`sensunshop/users/${userRecord.uid}`] = userObj;
                syncedCount++;
            });

            if (Object.keys(updates).length > 0) {
                await db.ref().update(updates);
            }
            nextPageToken = listUsersResult.pageToken;
        } while (nextPageToken);

        return res.status(200).json({
            success: true,
            syncedCount: syncedCount,
            message: `Sincronizados exitosamente ${syncedCount} usuarios a sensunshop/users en RTDB`
        });
    } catch (error) {
        console.error("[syncAuthUsersToDatabase] Error:", error);
        return res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

/**
 * ------------------------------------------------------------------------------
 * 6. TRIGGER AUTOMÁTICO EN TIEMPO REAL: NUEVO USUARIO REGISTRADO EN FIREBASE AUTH
 * Guarda inmediatamente el perfil en sensunshop/users al registrarse por Android o Web
 * ------------------------------------------------------------------------------
 */
exports.onUserCreated = functions.auth.user().onCreate(async (userRecord) => {
    try {
        const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com") ||
                         Boolean(userRecord.email && userRecord.email.toLowerCase().endsWith("@gmail.com"));
        const mainProvider = (userRecord.providerData && userRecord.providerData[0]) ? userRecord.providerData[0].providerId : (isGoogle ? "google.com" : "password");

        const userObj = {
            uid: userRecord.uid,
            displayName: userRecord.displayName || (userRecord.email ? userRecord.email.split("@")[0] : "Usuario"),
            email: userRecord.email || "",
            photoURL: userRecord.photoURL || "",
            provider: mainProvider,
            isGoogle: isGoogle,
            createdAt: userRecord.metadata.creationTime ? new Date(userRecord.metadata.creationTime).getTime() : Date.now(),
            lastLoginAt: userRecord.metadata.lastSignInTime ? new Date(userRecord.metadata.lastSignInTime).getTime() : Date.now(),
            lastActiveAt: Date.now(),
            platform: "web"
        };

        const db = admin.database();
        await db.ref(`sensunshop/users/${userRecord.uid}`).set(userObj);
        console.log(`[onUserCreated] ✅ Usuario ${userRecord.uid} sincronizado en sensunshop/users`);
        return null;
    } catch (error) {
        console.error("[onUserCreated] ❌ Error sincronizando usuario:", error);
        return null;
    }
});

/**
 * ------------------------------------------------------------------------------
 * 7. TRIGGER AUTOMÁTICO: USUARIO ELIMINADO EN FIREBASE AUTH
 * ------------------------------------------------------------------------------
 */
exports.onUserDeleted = functions.auth.user().onDelete(async (userRecord) => {
});

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 8. MULTI IDEAS SV - SPOTIFY DEVELOPER API & DIRECT ACTIVATION ENDPOINTS
 * ══════════════════════════════════════════════════════════════════════════════
 * Reemplazo 100% nativo de MrBoost usando nuestra propia App de Spotify Developer.
 * Compatible con llamadas GET simples (Fetch URL) desde Streamer.bot, Botrix, etc.
 * 
 * Endpoints:
 *  - /api/spotify/add_to_queue?user=jikokun2&song_name=...
 *  - /api/spotify/skip?user=jikokun2
 *  - /api/spotify/play?user=jikokun2
 *  - /api/spotify/pause?user=jikokun2
 *  - /api/spotify/status?user=jikokun2
 *  - /api/spotify/refresh_token?user=jikokun2
 *  - /api/spotify/save_token?user=jikokun2&refresh_token=...
 * ══════════════════════════════════════════════════════════════════════════════
 */

const SPOTIFY_CLIENT_ID = process.env.SPOTIFY_CLIENT_ID || "86895cd4fce24473b50586a16122bd22";
const SPOTIFY_CLIENT_SECRET = process.env.SPOTIFY_CLIENT_SECRET || "98f13b050abb432482d9c3b80c6babff";

async function getValidSpotifyToken(userId) {
    const db = admin.database();
    const user = (userId || "jikokun2").toLowerCase().trim();
    const snap = await db.ref(`stream/spotify_auth/${user}`).once("value");
    let authData = snap.val() || {};

    let accessToken = authData.access_token;
    let refreshToken = authData.refresh_token;
    const expiresAt = Number(authData.token_expires) || 0;

    // Si aún no hay refresh_token en RTDB, intentar semilla conocida de jikokun2
    if (!refreshToken && user === "jikokun2") {
        refreshToken = "AQBnM-Gd69K9yF7n7Ba5yZ-eSHYY2P_g6sxuMwnjpqVkPnzJqsF5BtrgdK4cSda-09WEFMJErc86DTZ2Q4v5XL3-Yxqyaf2Vu9L-HWcVFrwgQ6kX1aRY--KLX7OwZTO7TlM";
    }

    // Si el token aún es válido por más de 90 segundos, reutilizar
    if (accessToken && Date.now() < (expiresAt - 90000)) {
        return { accessToken, refreshToken, user };
    }

    if (!refreshToken) {
        throw new Error(`No se encontró refresh_token para el usuario '${user}'. Inicia sesión desde el Laboratorio.`);
    }

    // Renovar token server-side con Basic Auth (Client Secret seguro sin bloqueo de CORS)
    const bodyParams = new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken
    });

    const basicAuth = Buffer.from(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`).toString("base64");
    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
        method: "POST",
        headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            "Authorization": `Basic ${basicAuth}`
        },
        body: bodyParams.toString()
    });

    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || "Fallo al renovar token de Spotify");
    }

    accessToken = tokenData.access_token;
    const newExpires = Date.now() + (tokenData.expires_in * 1000);
    if (tokenData.refresh_token) {
        refreshToken = tokenData.refresh_token;
    }

    // Guardar token renovado en Firebase Realtime Database
    await db.ref(`stream/spotify_auth/${user}`).update({
        access_token: accessToken,
        refresh_token: refreshToken,
        token_expires: newExpires,
        last_refreshed: Date.now()
    });

    return { accessToken, refreshToken, user };
}

exports.spotifyControl = functions.https.onRequest(async (req, res) => {
    // Cabeceras CORS universales para Fetch silencioso desde cualquier bot o cliente
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    // Extraer usuario y acción ya sea de la ruta (URL path) o de la query string
    const user = (req.query.user || req.query.user_id || req.query.username || req.body.user || "jikokun2").toLowerCase().trim();
    const pathParts = req.path.split("/").filter(Boolean);
    const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1].toLowerCase() : "";

    let action = (req.query.action || req.query.cmd || (lastPart && !["spotify", "spotifycontrol", "api"].includes(lastPart) ? lastPart : "") || "").toLowerCase();
    if (action.endsWith(".php")) action = action.replace(".php", "");

    const songQuery = req.query.song_name || req.query.song || req.query.q || req.query.songname || req.body.song_name || req.body.song || "";

    const db = admin.database();
    const cooldownRef = db.ref(`stream/spotify_live/cooldowns/${user}`);

    try {
        // ── 0. Guardar o vincular tokens directamente ──────────────────────────
        if (action === "save_token" || action === "set_token") {
            const rToken = req.query.refresh_token || req.body.refresh_token;
            const aToken = req.query.access_token || req.body.access_token;
            if (!rToken && !aToken) {
                return res.status(400).send("Faltan parámetros refresh_token o access_token");
            }
            const updateObj = { last_updated: Date.now() };
            if (rToken) updateObj.refresh_token = rToken;
            if (aToken) {
                updateObj.access_token = aToken;
                updateObj.token_expires = Date.now() + 3600000;
            }
            await db.ref(`stream/spotify_auth/${user}`).update(updateObj);
            return res.status(200).send(`Tokens actualizados exitosamente para el usuario ${user}`);
        }

        // Obtener datos de cooldown atómico para prevenir duplicados rápidos de Streamer.bot / Botrix
        const cooldownSnap = await cooldownRef.once("value");
        const cooldowns = cooldownSnap.val() || {};

        // Obtener token de acceso activo y válido (renovado en servidor si expiró)
        const { accessToken } = await getValidSpotifyToken(user);

        // ── 1. Acción: SALTAR CANCIÓN (Skip / Next) ─────────────────────────────
        if (action === "skip" || action === "next" || action === "skipsong") {
            const now = Date.now();
            const lastSkip = Number(cooldowns.last_skip_time) || 0;
            // 🛡️ REGLA ANTI-DOBLE SALTO EN SERVIDOR: Bloquear ejecuciones duplicadas en menos de 2.5 segundos
            if (now - lastSkip < 2500) {
                console.log(`[spotifyControl] 🛡️ Anti-doble salto activado para '${user}' (${now - lastSkip}ms transcurridos). Omitiendo petición repetida.`);
                return res.status(200).send("Song Skipped! (Anti-duplicate suppressed)");
            }

            await cooldownRef.update({ last_skip_time: now });

            const apiRes = await fetch("https://api.spotify.com/v1/me/player/next", {
                method: "POST",
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (apiRes.status === 204 || apiRes.status === 200) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "skip",
                    user: user,
                    timestamp: now
                }).catch(() => {});

                return res.status(200).send("Song Skipped!");
            }

            const errText = await apiRes.text();
            return res.status(apiRes.status).send(`Spotify API Error: ${errText || "No active device"}`);
        }

        // ── 2. Acción: REANUDAR MÚSICA (Play / Resume) ─────────────────────────
        if (action === "play" || action === "resume" || action === "reanudar") {
            const apiRes = await fetch("https://api.spotify.com/v1/me/player/play", {
                method: "PUT",
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (apiRes.status === 204 || apiRes.status === 200) {
                return res.status(200).send("Spotify playback resumed.");
            }
            return res.status(apiRes.status).send("Failed to resume Spotify playback.");
        }

        // ── 3. Acción: PAUSAR MÚSICA (Pause) ───────────────────────────────────
        if (action === "pause" || action === "pausa") {
            const apiRes = await fetch("https://api.spotify.com/v1/me/player/pause", {
                method: "PUT",
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (apiRes.status === 204 || apiRes.status === 200) {
                return res.status(200).send("Spotify playback paused.");
            }
            return res.status(apiRes.status).send("Failed to pause Spotify playback.");
        }

        // ── 4. Acción: AÑADIR A LA COLA (Add to Queue) ─────────────────────────
        if (action === "add" || action === "add_to_queue" || action === "addsong" || action === "pedir") {
            if (!songQuery || songQuery.trim() === "") {
                return res.status(400).send("Song name is missing");
            }

            // Normalizar formato "Song by Artist"
            let searchQ = songQuery.trim();
            const byMatch = searchQ.match(/(.+?)\s+(?:by|de|-)\s+(.+)/i);
            if (byMatch) {
                searchQ = `track:${byMatch[1].trim()} artist:${byMatch[2].trim()}`;
            }

            // Buscar en Spotify API
            let searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(searchQ)}&type=track&limit=10`, {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });
            let searchData = await searchRes.json();

            // Fallback a búsqueda simple si la estructurada no dio resultados
            if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                searchRes = await fetch(`https://api.spotify.com/v1/search?q=${encodeURIComponent(songQuery)}&type=track&limit=10`, {
                    headers: { "Authorization": `Bearer ${accessToken}` }
                });
                searchData = await searchRes.json();
            }

            if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                return res.status(404).send(`No song found for "${songQuery}"`);
            }

            // Priorizar por popularidad
            const tracks = searchData.tracks.items;
            tracks.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
            const selectedTrack = tracks[0];
            const artistName = selectedTrack.artists ? selectedTrack.artists[0].name : "Artista";

            // 🛡️ REGLA ANTI-DUPLICADO DE COLA: Evitar encolar 2 veces la misma canción si Streamer.bot envía doble disparo
            const now = Date.now();
            if (cooldowns.last_added_uri === selectedTrack.uri && (now - Number(cooldowns.last_added_time || 0) < 4000)) {
                console.log(`[spotifyControl] 🛡️ Canción duplicada encolada ignorada por anti-spam: ${selectedTrack.name}`);
                return res.status(200).send(`Added to queue: "${selectedTrack.name}" (${artistName})`);
            }
            await cooldownRef.update({
                last_added_uri: selectedTrack.uri,
                last_added_time: now
            });

            // Encolar canción en Spotify
            const queueRes = await fetch(`https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(selectedTrack.uri)}`, {
                method: "POST",
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (queueRes.status === 204 || queueRes.status === 200) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "add",
                    song: selectedTrack.name,
                    artist: artistName,
                    user: user,
                    timestamp: now
                }).catch(() => {});

                return res.status(200).send(`Added to queue: "${selectedTrack.name}" (${artistName})`);
            }

            const queueErr = await queueRes.text();
            return res.status(queueRes.status).send(`Failed to add song to queue: ${queueErr || "Device inactive"}`);
        }

        // ── 5. Acción: PROXY DE RENOVACIÓN DE TOKEN (Para Widgets en OBS) ──────
        if (action === "refresh_token") {
            const passedRefreshToken = req.query.refresh_token || req.body.refresh_token;
            if (passedRefreshToken) {
                await db.ref(`stream/spotify_auth/${user}`).update({
                    refresh_token: passedRefreshToken,
                    last_updated: Date.now()
                });
            }
            return res.status(200).send(accessToken);
        }

        // ── 6. Acción: ESTADO EN VIVO Y COLA ──────────────────────────────────
        if (action === "status" || action === "display_queue" || action === "displayqueue") {
            const playerRes = await fetch("https://api.spotify.com/v1/me/player", {
                headers: { "Authorization": `Bearer ${accessToken}` }
            });

            if (playerRes.status === 204) {
                return res.status(200).json({ is_playing: false, tracks: [] });
            }

            if (playerRes.ok) {
                const playerData = await playerRes.json();
                return res.status(200).json(playerData);
            }

            return res.status(playerRes.status).json({ error: "Could not fetch playback state" });
        }

        // Si la acción no coincide con ninguna
        return res.status(400).send(`Comando desconocido: '${action}'. Acciones válidas: add_to_queue, skip, play, pause, status, refresh_token.`);

    } catch (err) {
        console.error(`[spotifyControl] ❌ Error ejecutando acción '${action}':`, err);
        return res.status(500).send(`Error en servidor: ${err.message}`);
    }
});

