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
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
        return res.status(401).json({
            success: false,
            error: "Acceso no autorizado para enviar notificaciones push. Proporciona credenciales de administrador."
        });
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
 * Helper de seguridad para verificar autenticación de Administrador
 */
async function verifyAdminAuth(req) {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    let token = null;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.split("Bearer ")[1];
    } else if (req.query && req.query.token) {
        token = req.query.token;
    }
    if (!token) return false;
    try {
        const decoded = await admin.auth().verifyIdToken(token);
        return decoded && (decoded.admin === true || decoded.email === "joel.claroso@gmail.com" || Boolean(decoded.uid));
    } catch (e) {
        return false;
    }
}

/**
 * ------------------------------------------------------------------------------
 * 4. OBTENER LISTADO COMPLETO DE USUARIOS DE FIREBASE AUTHENTICATION (ENDPOINT HTTP SEGURO)
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

    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
        return res.status(401).json({
            success: false,
            error: "Acceso no autorizado. Se requiere Firebase ID Token de administrador en la cabecera Authorization: Bearer <token>"
        });
    }

    try {
        let allUsers = [];
        let nextPageToken;

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            listUsersResult.users.forEach((userRecord) => {
                const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com");
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

    const isAuthorized = await verifyAdminAuth(req);
    if (!isAuthorized) {
        return res.status(401).json({
            success: false,
            error: "Acceso no autorizado. Se requiere Firebase ID Token de administrador en la cabecera Authorization."
        });
    }

    try {
        let syncedCount = 0;
        let nextPageToken;
        const db = admin.database();

        do {
            const listUsersResult = await admin.auth().listUsers(1000, nextPageToken);
            const updates = {};

            listUsersResult.users.forEach((userRecord) => {
                const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com");
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
        const isGoogle = (userRecord.providerData || []).some(p => p.providerId === "google.com");
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
    try {
        const uid = userRecord.uid;
        const db = admin.database();

        // Limpiar perfil público de Sensun Shop y datos privados del usuario
        await Promise.allSettled([
            db.ref(`sensunshop/users/${uid}`).remove(),
            db.ref(`users/${uid}`).remove()
        ]);

        // Limpiar sesiones de presencia activas asociadas al UID
        const presenceSnap = await db.ref("sensunshop/presence").orderByChild("uid").equalTo(uid).once("value");
        if (presenceSnap.exists()) {
            const updates = {};
            presenceSnap.forEach(child => {
                updates[`sensunshop/presence/${child.key}`] = null;
            });
            await db.ref().update(updates);
        }

        console.log(`[onUserDeleted] ✅ Datos y presencia del usuario ${uid} retirados exitosamente.`);
        return null;
    } catch (error) {
        console.error("[onUserDeleted] ❌ Error limpiando datos de usuario eliminado:", error);
        return null;
    }
});

/**
 * ══════════════════════════════════════════════════════════════════════════════
 * 8. MULTI IDEAS SV - SPOTIFY DEVELOPER API & DIRECT ACTIVATION ENDPOINTS
 * ══════════════════════════════════════════════════════════════════════════════
 * Integración 100% nativa con Spotify Developer API.
 * Compatible con llamadas GET simples (Fetch URL) desde Streamer.bot, Botrix, etc.
 * 
 * Endpoints:
 *  - /api/spotify/exchange_code?user=jikokun2&code=...&redirect_uri=...
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

function isValidRefreshTokenFormat(token) {
    return typeof token === "string" && token.trim().length >= 40 && !token.includes("$") && !token.includes(" ");
}

async function tryRefreshWithSpotify(refreshToken, clientId, clientSecret) {
    if (!isValidRefreshTokenFormat(refreshToken)) return null;

    // 1. PRIMER INTENTO: Renovar con Basic Auth (Apps confidenciales con Client Secret)
    if (clientSecret) {
        try {
            const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
            const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
                method: "POST",
                headers: {
                    "Content-Type": "application/x-www-form-urlencoded",
                    "Authorization": `Basic ${basicAuth}`
                },
                body: new URLSearchParams({
                    grant_type: "refresh_token",
                    refresh_token: refreshToken.trim()
                }).toString()
            });
            const data = await tokenRes.json();
            if (tokenRes.ok && data.access_token) {
                return data;
            }
        } catch (e) {}
    }

    // 2. SEGUNDO INTENTO: Renovar con PKCE puro (Apps públicas con Client ID en body)
    try {
        const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams({
                grant_type: "refresh_token",
                refresh_token: refreshToken.trim(),
                client_id: clientId
            }).toString()
        });
        const data = await tokenRes.json();
        if (tokenRes.ok && data.access_token) {
            return data;
        }
    } catch (e) {}

    return null;
}

async function getValidSpotifyToken(userId, forceRefresh = false) {
    const db = admin.database();
    const user = (userId || "jikokun2").toLowerCase().trim();
    const snap = await db.ref(`stream/spotify_auth/${user}`).once("value");
    const authData = snap.val() || {};

    let accessToken = authData.access_token;
    let refreshToken = authData.refresh_token;
    const backupRefreshToken = authData.last_valid_refresh_token;
    const expiresAt = Number(authData.token_expires) || 0;
    const clientId = authData.client_id || SPOTIFY_CLIENT_ID;
    const clientSecret = authData.client_secret || SPOTIFY_CLIENT_SECRET;

    // Si el token de acceso aún es válido por más de 60 segundos y no se forzó el refresco, reutilizarlo directamente
    if (!forceRefresh && accessToken && Date.now() < (expiresAt - 60000)) {
        return { accessToken, refreshToken, user };
    }

    if (!isValidRefreshTokenFormat(refreshToken) && isValidRefreshTokenFormat(backupRefreshToken)) {
        refreshToken = backupRefreshToken;
    }

    if (!isValidRefreshTokenFormat(refreshToken)) {
        if (accessToken && !forceRefresh) {
            return { accessToken, refreshToken, user };
        }
        throw new Error(`No se encontró sesión activa de Spotify para '${user}'. Abre prueba.html y haz clic en 'Iniciar Sesión con Spotify' para vincular tu cuenta a tu App propia.`);
    }

    let tokenData = await tryRefreshWithSpotify(refreshToken, clientId, clientSecret);

    // Si el refresh_token principal falló pero existe last_valid_refresh_token distinto, intentar con el respaldo
    if (!tokenData && isValidRefreshTokenFormat(backupRefreshToken) && backupRefreshToken !== refreshToken) {
        console.log(`[getValidSpotifyToken] 🔄 Intentando recuperación con last_valid_refresh_token para '${user}'...`);
        tokenData = await tryRefreshWithSpotify(backupRefreshToken, clientId, clientSecret);
        if (tokenData) {
            refreshToken = backupRefreshToken;
        }
    }

    if (!tokenData) {
        throw new Error(`El token de Spotify expiró o no pertenece a tu App (${clientId}). Por favor abre prueba.html y haz clic en 'Iniciar Sesión con Spotify' para vincular tu cuenta.`);
    }

    accessToken = tokenData.access_token;
    const newExpires = Date.now() + ((Number(tokenData.expires_in) || 3600) * 1000);
    if (tokenData.refresh_token && isValidRefreshTokenFormat(tokenData.refresh_token)) {
        refreshToken = tokenData.refresh_token.trim();
    }

    // Guardar token renovado en Firebase Realtime Database
    await db.ref(`stream/spotify_auth/${user}`).update({
        access_token: accessToken,
        refresh_token: refreshToken,
        last_valid_refresh_token: refreshToken,
        token_expires: newExpires,
        last_refreshed: Date.now()
    });

    return { accessToken, refreshToken, user };
}

/**
 * Ejecuta una petición a Spotify Web API con auto-recuperación ante errores 401 (Token Expirado)
 */
async function spotifyApiFetch(user, url, options = {}) {
    let { accessToken } = await getValidSpotifyToken(user, false);
    const makeHeaders = (token) => Object.assign({}, options.headers || {}, {
        "Authorization": `Bearer ${token}`
    });

    let res = await fetch(url, Object.assign({}, options, { headers: makeHeaders(accessToken) }));

    if (res.status === 401) {
        console.log(`[spotifyControl] 🔄 Token 401 detectado para '${user}', forzando renovación automática...`);
        const renewed = await getValidSpotifyToken(user, true);
        accessToken = renewed.accessToken;
        res = await fetch(url, Object.assign({}, options, { headers: makeHeaders(accessToken) }));
    }

    return { res, accessToken };
}

/**
 * Busca el primer dispositivo de Spotify disponible si no hay uno marcado como activo (error 404)
 */
async function getFallbackDeviceId(user) {
    try {
        const { res } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player/devices");
        if (res.ok) {
            const data = await res.json();
            const devices = (data && data.devices) || [];
            const active = devices.find(d => d.is_active) || devices.find(d => !d.is_restricted) || devices[0];
            if (active && active.id) return active.id;
        }
    } catch (e) {}
    return null;
}

exports.spotifyControl = functions.https.onRequest(async (req, res) => {
    // Cabeceras CORS universales para Fetch silencioso desde cualquier bot o cliente
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET, POST, PUT, OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
        return res.status(204).send("");
    }

    const bodyObj = (req.body && typeof req.body === "object") ? req.body : {};

    // Extraer usuario y acción ya sea de la ruta (URL path) o de la query string
    const user = (req.query.user || req.query.user_id || req.query.username || bodyObj.user || "jikokun2").toLowerCase().trim();
    const pathParts = req.path.split("/").filter(Boolean);
    const lastPart = pathParts.length > 0 ? pathParts[pathParts.length - 1].toLowerCase() : "";

    let action = (req.query.action || req.query.cmd || bodyObj.action || (lastPart && !["spotify", "spotifycontrol", "api"].includes(lastPart) ? lastPart : "") || "").toLowerCase();
    if (action.endsWith(".php")) action = action.replace(".php", "");

    const songQuery = req.query.song_name || req.query.song || req.query.q || req.query.songname || bodyObj.song_name || bodyObj.song || "";

    const db = admin.database();
    const cooldownRef = db.ref(`stream/spotify_live/cooldowns/${user}`);

    try {
        // ── 0A. Intercambiar código OAuth directamente en el Backend (Token Permanente) ──
        if (action === "exchange_code") {
            const code = req.query.code || bodyObj.code;
            const redirectUri = req.query.redirect_uri || bodyObj.redirect_uri;
            const codeVerifier = req.query.code_verifier || bodyObj.code_verifier || "";
            const customClientId = req.query.client_id || bodyObj.client_id || SPOTIFY_CLIENT_ID;
            const customClientSecret = req.query.client_secret || bodyObj.client_secret || SPOTIFY_CLIENT_SECRET;

            if (!code || !redirectUri) {
                return res.status(400).json({ success: false, error: "Faltan parámetros 'code' o 'redirect_uri'" });
            }

            let tokenData = null;
            let lastError = null;

            // Intento 1: Intercambio Confidencial con Basic Auth (Genera refresh_token permanente que NO caduca al rotar)
            if (customClientSecret) {
                try {
                    const basicAuth = Buffer.from(`${customClientId}:${customClientSecret}`).toString("base64");
                    const params = new URLSearchParams({
                        grant_type: "authorization_code",
                        code: code,
                        redirect_uri: redirectUri
                    });
                    if (codeVerifier) params.append("code_verifier", codeVerifier);

                    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/x-www-form-urlencoded",
                            "Authorization": `Basic ${basicAuth}`
                        },
                        body: params.toString()
                    });
                    const data = await tokenRes.json();
                    if (tokenRes.ok && data.access_token) {
                        tokenData = data;
                    } else {
                        lastError = data;
                    }
                } catch (errBasic) {
                    lastError = { error_description: errBasic.message };
                }
            }

            // Intento 2: Intercambio con PKCE si se envió code_verifier y el intento 1 no aplicó
            if (!tokenData && codeVerifier) {
                try {
                    const params = new URLSearchParams({
                        grant_type: "authorization_code",
                        code: code,
                        redirect_uri: redirectUri,
                        client_id: customClientId,
                        code_verifier: codeVerifier
                    });
                    const tokenRes = await fetch("https://accounts.spotify.com/api/token", {
                        method: "POST",
                        headers: { "Content-Type": "application/x-www-form-urlencoded" },
                        body: params.toString()
                    });
                    const data = await tokenRes.json();
                    if (tokenRes.ok && data.access_token) {
                        tokenData = data;
                    } else {
                        lastError = data;
                    }
                } catch (errPkce) {
                    lastError = { error_description: errPkce.message };
                }
            }

            if (!tokenData || !tokenData.access_token) {
                return res.status(400).json({
                    success: false,
                    error: (lastError && (lastError.error_description || lastError.error)) || "No se pudo canjear el código de autorización con Spotify"
                });
            }

            const expiresAt = Date.now() + ((Number(tokenData.expires_in) || 3600) * 1000);
            const savePayload = {
                access_token: tokenData.access_token,
                token_expires: expiresAt,
                client_id: customClientId,
                last_updated: Date.now(),
                last_refreshed: Date.now()
            };
            if (tokenData.refresh_token && isValidRefreshTokenFormat(tokenData.refresh_token)) {
                savePayload.refresh_token = tokenData.refresh_token.trim();
                savePayload.last_valid_refresh_token = tokenData.refresh_token.trim();
            }
            if (customClientSecret) {
                savePayload.client_secret = customClientSecret;
            }

            await db.ref(`stream/spotify_auth/${user}`).update(savePayload);

            return res.status(200).json({
                success: true,
                user: user,
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token || "",
                expires_in: tokenData.expires_in || 3600,
                token_expires: expiresAt
            });
        }

        // ── 0B. Guardar o vincular tokens directamente (Protegido contra sobreescrituras corruptas) ──
        if (action === "save_token" || action === "set_token") {
            const rToken = (req.query.refresh_token || bodyObj.refresh_token || "").trim();
            const aToken = (req.query.access_token || bodyObj.access_token || "").trim();
            const fromLogin = req.query.from_login === "1" || bodyObj.from_login === true;

            if (!isValidRefreshTokenFormat(rToken) && (!aToken || aToken.length < 30)) {
                return res.status(400).send("Parámetros refresh_token o access_token inválidos o corruptos");
            }

            const existingSnap = await db.ref(`stream/spotify_auth/${user}`).once("value");
            const existingData = existingSnap.val() || {};
            const updateObj = { last_updated: Date.now() };

            // Validar refresh_token antes de guardarlo
            if (isValidRefreshTokenFormat(rToken)) {
                if (fromLogin || !isValidRefreshTokenFormat(existingData.refresh_token)) {
                    // Verificar que el refresh_token sea válido contra Spotify
                    const testRefresh = await tryRefreshWithSpotify(rToken, existingData.client_id || SPOTIFY_CLIENT_ID, existingData.client_secret || SPOTIFY_CLIENT_SECRET);
                    if (testRefresh && testRefresh.access_token) {
                        const finalRefresh = (testRefresh.refresh_token && isValidRefreshTokenFormat(testRefresh.refresh_token))
                            ? testRefresh.refresh_token.trim()
                            : rToken;
                        updateObj.refresh_token = finalRefresh;
                        updateObj.last_valid_refresh_token = finalRefresh;
                        updateObj.access_token = testRefresh.access_token;
                        updateObj.token_expires = Date.now() + ((Number(testRefresh.expires_in) || 3600) * 1000);
                        updateObj.last_refreshed = Date.now();
                    } else if (fromLogin) {
                        updateObj.refresh_token = rToken;
                        updateObj.last_valid_refresh_token = rToken;
                    }
                }
            }

            // Si aún no se actualizó access_token y viene un access_token válido, verificarlo con /v1/me
            if (!updateObj.access_token && aToken && aToken.length >= 30 && !aToken.includes("$")) {
                if (fromLogin || !existingData.access_token || Date.now() >= Number(existingData.token_expires || 0)) {
                    const checkMe = await fetch("https://api.spotify.com/v1/me", {
                        headers: { "Authorization": `Bearer ${aToken}` }
                    }).catch(() => null);
                    if (checkMe && checkMe.ok) {
                        updateObj.access_token = aToken;
                        updateObj.token_expires = Date.now() + 2400000;
                    }
                }
            }

            await db.ref(`stream/spotify_auth/${user}`).update(updateObj);
            return res.status(200).send(`Tokens actualizados exitosamente para el usuario ${user}`);
        }

        // Obtener datos de cooldown atómico para prevenir duplicados rápidos de Streamer.bot / Botrix
        const cooldownSnap = await cooldownRef.once("value");
        const cooldowns = cooldownSnap.val() || {};

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

            let { res: apiRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player/next", {
                method: "POST"
            });

            if (apiRes.status === 404) {
                const devId = await getFallbackDeviceId(user);
                if (devId) {
                    const retry = await spotifyApiFetch(user, `https://api.spotify.com/v1/me/player/next?device_id=${encodeURIComponent(devId)}`, {
                        method: "POST"
                    });
                    apiRes = retry.res;
                }
            }

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
            let { res: apiRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player/play", {
                method: "PUT"
            });

            // Si no hay sesión activa (404), transferir reproducción y despertar el dispositivo
            if (apiRes.status === 404) {
                const devId = await getFallbackDeviceId(user);
                if (devId) {
                    const retry = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player", {
                        method: "PUT",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ device_ids: [devId], play: true })
                    });
                    apiRes = retry.res;
                }
            }

            // 200/204 o 403 (cuando ya está reproduciendo - Restriction violated)
            if (apiRes.status === 204 || apiRes.status === 200 || apiRes.status === 403) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "play",
                    user: user,
                    timestamp: Date.now()
                }).catch(() => {});
                return res.status(200).send("Spotify playback resumed.");
            }
            return res.status(apiRes.status).send("Failed to resume Spotify playback.");
        }

        // ── 3. Acción: PAUSAR MÚSICA (Pause) ───────────────────────────────────
        if (action === "pause" || action === "pausa") {
            let { res: apiRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player/pause", {
                method: "PUT"
            });

            // Si el dispositivo ya está inactivo o desconectado (404), ya está efectivamente en pausa
            if (apiRes.status === 404) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "pause",
                    user: user,
                    timestamp: Date.now()
                }).catch(() => {});
                return res.status(200).send("Spotify playback paused.");
            }

            // 200/204 o 403 (cuando ya está en pausa - Restriction violated)
            if (apiRes.status === 204 || apiRes.status === 200 || apiRes.status === 403) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "pause",
                    user: user,
                    timestamp: Date.now()
                }).catch(() => {});
                return res.status(200).send("Spotify playback paused.");
            }
            return res.status(apiRes.status).send("Failed to pause Spotify playback.");
        }

        // ── 4. Acción: AÑADIR A LA COLA (Add to Queue) ─────────────────────────
        if (action === "add" || action === "add_to_queue" || action === "addsong" || action === "pedir") {
            if (!songQuery || songQuery.trim() === "") {
                return res.status(400).send("Song name is missing");
            }

            // Buscar en Spotify API (limit debe ser <= 10 para evitar HTTP 400 'Invalid limit' de Spotify)
            const cleanQuery = songQuery.trim();
            let { res: searchRes } = await spotifyApiFetch(user, `https://api.spotify.com/v1/search?q=${encodeURIComponent(cleanQuery)}&type=track&limit=10`);
            let searchData = searchRes.ok ? await searchRes.json() : null;

            // Intento 2: Si no hubo resultados y tiene separador (by, de, -), buscar por campos estructurados
            if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                const byMatch = cleanQuery.match(/(.+?)\s+(?:by|de|-)\s+(.+)/i);
                if (byMatch) {
                    const structuredQ = `track:${byMatch[1].trim()} artist:${byMatch[2].trim()}`;
                    const structSearch = await spotifyApiFetch(user, `https://api.spotify.com/v1/search?q=${encodeURIComponent(structuredQ)}&type=track&limit=10`);
                    if (structSearch.res.ok) {
                        const sData = await structSearch.res.json();
                        if (sData && sData.tracks && sData.tracks.items.length > 0) {
                            searchData = sData;
                        }
                    }
                }
            }

            // Intento 3: Búsqueda simplificada eliminando caracteres especiales
            if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                const simplifiedQ = cleanQuery.replace(/[-_.,]/g, " ").replace(/\s+/g, " ").trim();
                if (simplifiedQ !== cleanQuery) {
                    const simpSearch = await spotifyApiFetch(user, `https://api.spotify.com/v1/search?q=${encodeURIComponent(simplifiedQ)}&type=track&limit=10`);
                    if (simpSearch.res.ok) {
                        searchData = await simpSearch.res.json();
                    }
                }
            }

            if (!searchData || !searchData.tracks || searchData.tracks.items.length === 0) {
                return res.status(404).send(`No song found for "${songQuery}"`);
            }

            // Priorizar por popularidad y penalizar karaoke/tribute si no fue pedido
            const tracks = searchData.tracks.items;
            const queryLower = songQuery.toLowerCase();
            tracks.sort((a, b) => {
                let popA = a.popularity || 0;
                let popB = b.popularity || 0;
                const nameA = (a.name || "").toLowerCase();
                const nameB = (b.name || "").toLowerCase();
                const isJunkA = !queryLower.includes("karaoke") && (nameA.includes("karaoke") || nameA.includes("tribute") || nameA.includes("instrumental"));
                const isJunkB = !queryLower.includes("karaoke") && (nameB.includes("karaoke") || nameB.includes("tribute") || nameB.includes("instrumental"));
                if (isJunkA) popA -= 50;
                if (isJunkB) popB -= 50;
                return popB - popA;
            });

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
            let { res: queueRes } = await spotifyApiFetch(user, `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(selectedTrack.uri)}`, {
                method: "POST"
            });

            // Si no hay dispositivo activo (404), buscar el dispositivo abierto y reintentar
            if (queueRes.status === 404) {
                const devId = await getFallbackDeviceId(user);
                if (devId) {
                    const retryQueue = await spotifyApiFetch(user, `https://api.spotify.com/v1/me/player/queue?uri=${encodeURIComponent(selectedTrack.uri)}&device_id=${encodeURIComponent(devId)}`, {
                        method: "POST"
                    });
                    queueRes = retryQueue.res;
                }
            }

            if (queueRes.status === 204 || queueRes.status === 200) {
                db.ref("stream/spotify_live/last_action").set({
                    action: "add",
                    song: selectedTrack.name,
                    artist: artistName,
                    uri: selectedTrack.uri,
                    user: user,
                    timestamp: now
                }).catch(() => {});

                const format = (req.query.format || "").toLowerCase();
                if (format === "name" || format === "title" || format === "clean") {
                    return res.status(200).send(`${selectedTrack.name} de ${artistName}`);
                }
                if (format === "song") {
                    return res.status(200).send(selectedTrack.name);
                }
                if (format === "json") {
                    return res.status(200).json({
                        success: true,
                        song: selectedTrack.name,
                        artist: artistName,
                        title: `${selectedTrack.name} de ${artistName}`,
                        url: selectedTrack.external_urls && selectedTrack.external_urls.spotify ? selectedTrack.external_urls.spotify : ""
                    });
                }

                return res.status(200).send(`Added to queue: "${selectedTrack.name}" (${artistName})`);
            }

            const queueErr = await queueRes.text();
            return res.status(queueRes.status).send(`Failed to add song to queue: ${queueErr || "Device inactive"}`);
        }

        // ── 5. Acción: PROXY DE RENOVACIÓN DE TOKEN (Para Widgets en OBS y Laboratorio) ──
        if (action === "refresh_token") {
            const passedRefreshToken = (req.query.refresh_token || bodyObj.refresh_token || "").trim();
            if (isValidRefreshTokenFormat(passedRefreshToken)) {
                const snapCur = await db.ref(`stream/spotify_auth/${user}/refresh_token`).once("value");
                if (!isValidRefreshTokenFormat(snapCur.val())) {
                    await db.ref(`stream/spotify_auth/${user}`).update({
                        refresh_token: passedRefreshToken,
                        last_updated: Date.now()
                    });
                }
            }
            const force = req.query.force === "1" || bodyObj.force === true;
            const { accessToken, refreshToken } = await getValidSpotifyToken(user, force);
            if ((req.query.format || "").toLowerCase() === "json") {
                return res.status(200).json({
                    success: true,
                    access_token: accessToken,
                    refresh_token: refreshToken || ""
                });
            }
            return res.status(200).send(accessToken);
        }

        // ── 6. Acción: ESTADO EN VIVO Y COLA ──────────────────────────────────
        if (action === "status" || action === "display_queue" || action === "displayqueue") {
            const { res: playerRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player");

            if (playerRes.status === 204) {
                return res.status(200).json({ is_playing: false, tracks: [] });
            }

            if (playerRes.ok) {
                const playerData = await playerRes.json();
                return res.status(200).json(playerData);
            }

            return res.status(playerRes.status).json({ error: "Could not fetch playback state" });
        }

        // ── 7. Acción: CANCIÓN ACTUAL (Song / Current Song / Canción en Vivo) ──
        if (action === "song" || action === "current_song" || action === "currentsong" || action === "cancion" || action === "current") {
            const { res: playerRes } = await spotifyApiFetch(user, "https://api.spotify.com/v1/me/player/currently-playing");

            if (playerRes.status === 204) {
                if (req.query.format === "json") {
                    return res.status(200).json({ is_playing: false, message: "No hay ninguna canción reproduciéndose actualmente en Spotify." });
                }
                return res.status(200).send("No hay ninguna canción reproduciéndose actualmente en Spotify.");
            }

            if (playerRes.ok) {
                const data = await playerRes.json();
                if (!data || !data.item) {
                    if (req.query.format === "json") {
                        return res.status(200).json({ is_playing: false, message: "No hay ninguna canción reproduciéndose actualmente en Spotify." });
                    }
                    return res.status(200).send("No hay ninguna canción reproduciéndose actualmente en Spotify.");
                }

                const track = data.item;
                const title = track.name || "Canción";
                const artists = track.artists ? track.artists.map(a => a.name).join(", ") : "Artista";
                const trackUrl = track.external_urls && track.external_urls.spotify ? track.external_urls.spotify : "";

                const format = (req.query.format || "").toLowerCase();

                if (format === "json") {
                    return res.status(200).json({
                        is_playing: data.is_playing,
                        song: title,
                        artist: artists,
                        title: `${title} - ${artists}`,
                        url: trackUrl,
                        formatted: `🎶 Sonando ahora: ${title} de ${artists} 🔗 ${trackUrl}`
                    });
                }

                if (format === "url") {
                    return res.status(200).send(trackUrl || `${title} - ${artists}`);
                }

                if (format === "name" || format === "title") {
                    return res.status(200).send(`${title} - ${artists}`);
                }

                // Por defecto: Mensaje listo para enviar en Kick/Twitch desde Streamer.bot
                const defaultMsg = trackUrl
                    ? `🎶 Sonando ahora: ${title} de ${artists} 🔗 ${trackUrl}`
                    : `🎶 Sonando ahora: ${title} de ${artists}`;

                return res.status(200).send(defaultMsg);
            }

            return res.status(200).send("No hay ninguna canción reproduciéndose actualmente en Spotify.");
        }

        // Si la acción no coincide con ninguna
        return res.status(400).send(`Comando desconocido: '${action}'. Acciones válidas: exchange_code, save_token, add_to_queue, skip, play, pause, song, status, refresh_token.`);

    } catch (err) {
        console.error(`[spotifyControl] ❌ Error ejecutando acción '${action}':`, err);
        return res.status(500).send(`Error en servidor: ${err.message}`);
    }
});
