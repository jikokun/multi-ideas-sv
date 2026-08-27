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
