const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { withDeadline } = require("./deadline");

const WOLF_PROJECT = "com-example-jikopuntos-f9ff5";
const WOLF_DATABASE = "https://com-example-jikopuntos-f9ff5-default-rtdb.firebaseio.com";
const allowedFields = new Set(["id", "code", "title", "type", "category", "badge", "description", "imgSrc", "imageUrl", "whatsapp", "whatsappMsg", "accentColor", "phone", "websiteUrl", "facebookUrl", "locationUrl", "lat", "lng", "tags", "hasOffer", "offerMsg", "offerCode", "offerStyle", "offerExpiry", "isActive"]);
const normalizeEmail = value => typeof value === "string" ? value.trim().toLowerCase() : "";

function createHandler({ verifyToken, getWolfUser, getWolfRecord, saveBusiness }) {
    return async (req, res) => {
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "POST, OPTIONS");
        res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
        if (req.method === "OPTIONS") return res.status(204).send("");
        if (req.method !== "POST") return res.status(405).json({ error: "Método no permitido." });
        try {
            const match = /^Bearer (\S+)$/.exec(req.headers.authorization || "");
            let claims;
            try { claims = match && await verifyToken(match[1]); } catch (_) { claims = null; }
            if (!claims || claims.admin !== true) return res.status(403).json({ error: "Se requiere una cuenta administradora autorizada." });
            const { businessId, business, catalog, createOnly = false } = req.body || {};
            if (typeof businessId !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(businessId) || !business || typeof business !== "object" || Array.isArray(business) || !catalog || typeof catalog.enabled !== "boolean" || typeof createOnly !== "boolean") {
                return res.status(400).json({ error: "Datos del negocio o catálogo inválidos." });
            }
            const cleanBusiness = {};
            for (const [key, value] of Object.entries(business)) {
                if (!allowedFields.has(key)) return res.status(400).json({ error: "Campo de negocio no permitido." });
                cleanBusiness[key] = value;
            }
            cleanBusiness.id = businessId;
            let linkage;
            const email = normalizeEmail(catalog.email);
            const code = typeof catalog.code === "string" ? catalog.code.trim() : "";
            if (catalog.enabled && (email || code)) {
                const codeMatch = /^WT-([A-Za-z0-9_-]{1,128})$/.exec(code);
                if (!email || !codeMatch) return res.status(400).json({ error: "Ingresa el correo y un código válido con formato WT-UID." });
                const uid = codeMatch[1];
                let account, record;
                const checked = (name, operation) => withDeadline(operation).catch(error => {
                    console.error(`WolfTrack ${name} validation failed`, { code: error.code || error.message });
                    throw error;
                });
                try { [account, record] = await Promise.all([checked("authentication", getWolfUser(uid)), checked("catalog record", getWolfRecord(uid))]); }
                catch (error) {
                    if (error.code === "auth/user-not-found") return res.status(400).json({ error: "El código o correo no coincide con una cuenta verificada de WolfTrack." });
                    throw error;
                }
                if (!record || record.catalogCode !== code || normalizeEmail(record.catalogEmail) !== email || normalizeEmail(account.email) !== email || account.emailVerified !== true) {
                    return res.status(400).json({ error: "El código o correo no coincide con una cuenta verificada de WolfTrack." });
                }
                linkage = { hasCatalog: true, catalogUid: uid, catalogUrl: `https://multiideassv.com/wolftrack.html?businessId=${encodeURIComponent(businessId)}` };
            } else if (catalog.enabled) {
                // Cat?logo habilitado pendiente de vincular; el endpoint p?blico seguir? devolviendo 404 sin UID v?lido.
                linkage = { hasCatalog: true };
            } else if (!catalog.enabled) {
                // Deshabilitar desde el panel también elimina la asociación: el catálogo
                // público deja de resolver el UID y la próxima carga devuelve 404.
                linkage = { hasCatalog: false, catalogUid: null, catalogUrl: null };
            }
            const saved = await saveBusiness(businessId, cleanBusiness, linkage, createOnly);
            if (saved.conflict) return res.status(409).json({ error: "Ya existe un negocio con ese identificador." });
            if (!saved.committed) return res.status(400).json({ error: "Ingresa el correo y el código para vincular el catálogo." });
            return res.status(200).json({ success: true });
        } catch (error) {
            console.error("Error al guardar negocio o validar WolfTrack", error);
            return res.status(500).json({ error: "No se pudo validar o guardar. Revisa la configuración de acceso entre proyectos." });
        }
    };
}

function mergeBusiness(current, business, linkage, createOnly = false) {
    if (createOnly && current !== null) return;
    if (!linkage && (!current || current.hasCatalog !== true || typeof current.catalogUid !== "string" || !/^[A-Za-z0-9_-]{1,128}$/.test(current.catalogUid))) return;
    return { ...(current || {}), ...business, ...(linkage || {}) };
}

function wolfApp() {
    return admin.apps.find(app => app.name === "wolftrack-validation") || admin.initializeApp({ credential: admin.credential.applicationDefault(), projectId: WOLF_PROJECT, databaseURL: WOLF_DATABASE }, "wolftrack-validation");
}
const handler = createHandler({
    verifyToken: token => admin.auth().verifyIdToken(token, true),
    getWolfUser: uid => admin.auth(wolfApp()).getUser(uid),
    getWolfRecord: async uid => {
        const userRef = admin.database(wolfApp()).ref(`wolftrack/users/${uid}`);
        const [code, email] = await Promise.all([
            userRef.child("catalogCode").once("value"),
            userRef.child("catalogEmail").once("value")
        ]);
        return { catalogCode: code.val(), catalogEmail: email.val() };
    },
    saveBusiness: async (id, business, linkage, createOnly) => {
        const result = await admin.database().ref(`sensunshop/businesses/${id}`).transaction(current => mergeBusiness(current, business, linkage, createOnly));
        return { committed: result.committed, conflict: !result.committed && createOnly && result.snapshot.exists() };
    }
});
exports.saveBusinessCatalog = functions.https.onRequest(handler);
exports.createHandler = createHandler;
exports.mergeBusiness = mergeBusiness;
exports.wolfApp = wolfApp;
