const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { wolfApp } = require("./catalog");
const { withDeadline } = require("./deadline");

const validKey = value => typeof value === "string" && /^[A-Za-z0-9_-]{1,128}$/.test(value);
const text = value => typeof value === "string" ? value : "";
const price = value => {
    if ((typeof value !== "number" && typeof value !== "string") || String(value).trim() === "") return 0;
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : 0;
};
function options(value) {
    const entries = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
    return entries.filter(entry => entry && typeof entry === "object" && typeof entry.name === "string")
        .map(entry => ({ name: entry.name, price: price(entry.price) }));
}
function projectItems(materials) {
    if (!materials || typeof materials !== "object") return [];
    return Object.entries(materials).filter(([, item]) => item && (item.type === "Producto" || item.type === "Servicio"))
        .map(([id, item]) => {
            const rawQuantity = item.quantity;
            const quantity = (typeof rawQuantity === "number" || (typeof rawQuantity === "string" && rawQuantity.trim() !== "")) ? Number(rawQuantity) : NaN;
            return {
                id, name: text(item.name), type: item.type, description: text(item.description),
                sellingPrice: price(item.sellingPrice), imageUrl: text(item.imageUrl),
                variants: options(item.variants), extras: options(item.extras),
                available: item.type === "Servicio" || item.trackStock !== true || (Number.isFinite(quantity) && quantity > 0)
            };
        });
}
function createPublicCatalogHandler({ getBusiness, getMaterials, timeoutMs = 10000 }) {
    return async (req, res) => {
        res.set("Cache-Control", "no-store, max-age=0");
        res.set("Access-Control-Allow-Origin", "*");
        res.set("Access-Control-Allow-Methods", "GET, OPTIONS");
        if (req.method === "OPTIONS") return res.status(204).send("");
        if (req.method !== "GET") return res.status(405).json({ error: "Método no permitido." });
        const businessId = req.query.businessId;
        if (!validKey(businessId)) return res.status(400).json({ error: "Identificador de negocio inválido." });
        try {
            const business = await withDeadline(getBusiness(businessId), timeoutMs);
            if (!business || business.hasCatalog !== true || !validKey(business.catalogUid)) return res.status(404).json({ error: "Catálogo no disponible." });
            const uid = business.catalogUid;
            const materials = await withDeadline(getMaterials(uid), timeoutMs);
            const latest = await withDeadline(getBusiness(businessId), timeoutMs);
            if (!latest || latest.hasCatalog !== true || latest.catalogUid !== uid) return res.status(404).json({ error: "Catálogo no disponible." });
            return res.status(200).json({ businessId, items: projectItems(materials) });
        } catch (error) {
            console.error("Error al consultar catálogo público", error);
            return res.status(500).json({ error: "No se pudo consultar el catálogo." });
        }
    };
}
const handler = createPublicCatalogHandler({
    getBusiness: async id => (await admin.database().ref(`sensunshop/businesses/${id}`).once("value")).val(),
    getMaterials: async uid => (await admin.database(wolfApp()).ref(`wolftrack/materials/${uid}`).once("value")).val()
});
exports.getBusinessCatalog = functions.https.onRequest(handler);
exports.createPublicCatalogHandler = createPublicCatalogHandler;
exports.projectItems = projectItems;
