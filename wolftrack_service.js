// ==============================================================================
// WOLFTRACK SERVICE - SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE RTDB
// ==============================================================================
// Especificación Oficial: wolftrack/materials/{USER_ID}/{ITEM_ID}
// ==============================================================================

import { 
    wolfRtdb, 
    wolfAuth, 
    googleProvider,
    ref, 
    set, 
    get, 
    push, 
    update, 
    remove, 
    onValue, 
    signInWithPopup, 
    signOut, 
    onAuthStateChanged 
} from "./wolftrack-firebase-config.js";

/**
 * @typedef {Object} Variant
 * @property {string} name - Nombre de la variante (ej: "Talla L", "100 unidades")
 * @property {number} price - Precio específico de la variante
 */

/**
 * @typedef {Object} Extra
 * @property {string} name - Nombre del complemento (ej: "Acabado Mate", "Entrega Express")
 * @property {number} price - Precio adicional
 */

/**
 * @typedef {Object} MaterialItem
 * @property {string} id - ID único del registro en Firebase
 * @property {string} name - Nombre del producto o servicio
 * @property {'Producto' | 'Servicio' | 'Material'} type - Clasificación del ítem
 * @property {string} [description] - Descripción detallada
 * @property {number} quantity - Stock actual disponible
 * @property {number} purchasePrice - Precio de costo o compra
 * @property {number} sellingPrice - Precio base de venta al público
 * @property {boolean} trackStock - Si descuenta inventario automáticamente
 * @property {string} [imageUrl] - URL pública de la imagen
 * @property {string} [barcode] - Código de barras o SKU
 * @property {Variant[]} [variants] - Lista opcional de variantes
 * @property {Extra[]} [extras] - Lista opcional de agregados
 * @property {number} [updatedAt] - Marca de tiempo de última sincronización
 */

export class WolfTrackService {
    /**
     * Escucha en tiempo real todos los materiales de un usuario/negocio
     * @param {string} userId - UID del usuario en Firebase
     * @param {function({productos: MaterialItem[], servicios: MaterialItem[], materiales: MaterialItem[], raw: Object}): void} onDataCallback
     * @param {function(Error): void} [onErrorCallback]
     * @returns {function(): void} Función para desuscribirse
     */
    static subscribeMaterials(userId, onDataCallback, onErrorCallback) {
        if (!userId) {
            throw new Error("[WolfTrack] Se requiere un userId válido para suscribirse.");
        }

        const materialsRef = ref(wolfRtdb, `wolftrack/materials/${userId}`);

        return onValue(materialsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const items = Object.entries(data).map(([key, val]) => ({
                id: key,
                ...val
            }));

            // Separación y clasificación de acuerdo a la especificación
            const productos = items.filter(item => item.type === 'Producto');
            const servicios = items.filter(item => item.type === 'Servicio');
            const materiales = items.filter(item => item.type === 'Material');

            onDataCallback({
                productos,
                servicios,
                materiales,
                totalItems: items.length,
                raw: data
            });
        }, (err) => {
            console.error("[WolfTrack RTDB Error]:", err);
            if (onErrorCallback) onErrorCallback(err);
        });
    }

    /**
     * Guarda o actualiza un producto/servicio en Firebase RTDB
     * @param {string} userId 
     * @param {MaterialItem} itemData 
     * @returns {Promise<string>} ID del ítem guardado
     */
    static async saveMaterial(userId, itemData) {
        if (!userId) throw new Error("userId requerido para guardar.");
        
        let itemId = itemData.id;
        let itemRef;

        if (itemId) {
            itemRef = ref(wolfRtdb, `wolftrack/materials/${userId}/${itemId}`);
        } else {
            const listRef = ref(wolfRtdb, `wolftrack/materials/${userId}`);
            itemRef = push(listRef);
            itemId = itemRef.key;
        }

        const payload = {
            id: itemId,
            name: itemData.name || "Sin nombre",
            type: itemData.type || "Producto",
            description: itemData.description || "",
            quantity: parseInt(itemData.quantity, 10) || 0,
            purchasePrice: parseFloat(itemData.purchasePrice) || 0.0,
            sellingPrice: parseFloat(itemData.sellingPrice) || 0.0,
            trackStock: Boolean(itemData.trackStock),
            imageUrl: itemData.imageUrl || "",
            barcode: itemData.barcode || "",
            variants: Array.isArray(itemData.variants) ? itemData.variants : [],
            extras: Array.isArray(itemData.extras) ? itemData.extras : [],
            updatedAt: Date.now()
        };

        await set(itemRef, payload);
        return itemId;
    }

    /**
     * Elimina un ítem del inventario
     * @param {string} userId 
     * @param {string} itemId 
     */
    static async deleteMaterial(userId, itemId) {
        if (!userId || !itemId) throw new Error("userId e itemId son requeridos.");
        const itemRef = ref(wolfRtdb, `wolftrack/materials/${userId}/${itemId}`);
        await remove(itemRef);
    }

    /**
     * Ajuste rápido de stock en tiempo real
     * @param {string} userId 
     * @param {string} itemId 
     * @param {number} newQuantity 
     */
    static async updateStock(userId, itemId, newQuantity) {
        if (!userId || !itemId) throw new Error("userId e itemId requeridos.");
        const stockRef = ref(wolfRtdb, `wolftrack/materials/${userId}/${itemId}`);
        await update(stockRef, {
            quantity: Math.max(0, parseInt(newQuantity, 10) || 0),
            updatedAt: Date.now()
        });
    }

    /**
     * Semilla de prueba piloto con ítems de muestra para Isaí Claros / Multi Ideas SV
     * @param {string} userId 
     */
    static async seedPilotDemoData(userId) {
        if (!userId) return;

        const demoItems = [
            {
                name: "Tarjetas de Presentación Matte Premium",
                type: "Producto",
                description: "Impresión full color en cartulina sulfatada 300g con laminado mate tacto suave y esquinas redondeadas.",
                quantity: 1500,
                purchasePrice: 12.00,
                sellingPrice: 25.00,
                trackStock: true,
                imageUrl: "https://res.cloudinary.com/dn6fmqae9/image/upload/v1786296781/759102047_1047202647699642_1174909865636125048_n_neoyql.webp",
                barcode: "WOLF-TARJ-001",
                variants: [
                    { name: "Caja de 500 unidades", price: 25.00 },
                    { name: "Caja de 1000 unidades", price: 42.00 }
                ],
                extras: [
                    { name: "Barniz UV a Registro", price: 8.00 },
                    { name: "Esquinas boleadas de lujo", price: 3.50 }
                ]
            },
            {
                name: "Stickers Troquelados Vinil Resistente",
                type: "Producto",
                description: "Pegatinas troqueladas con corte a la forma, resistentes al agua y a la intemperie.",
                quantity: 350,
                purchasePrice: 8.00,
                sellingPrice: 18.00,
                trackStock: true,
                imageUrl: "https://res.cloudinary.com/dn6fmqae9/image/upload/v1786823215/Logo_A_R_Dorado_zfajdw.webp",
                barcode: "WOLF-STICK-002",
                variants: [
                    { name: "Pack de 50 piezas (5x5 cm)", price: 18.00 },
                    { name: "Pack de 100 piezas (5x5 cm)", price: 30.00 }
                ],
                extras: [
                    { name: "Acabado Holográfico", price: 6.00 }
                ]
            },
            {
                name: "Tazas Personalizadas con Sublimación HD",
                type: "Producto",
                description: "Taza de cerámica blanca calidad AAA de 11 oz con diseño permanente de alto brillo.",
                quantity: 0, // Probando estado AGOTADO
                purchasePrice: 2.50,
                sellingPrice: 6.50,
                trackStock: true,
                imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=500&auto=format&fit=crop&q=80",
                barcode: "WOLF-TAZA-003",
                variants: [
                    { name: "Taza Clásica 11oz", price: 6.50 },
                    { name: "Taza Mágica Térmica", price: 9.50 }
                ],
                extras: [
                    { name: "Cajita de regalo personalizada", price: 1.50 }
                ]
            },
            {
                name: "Diseño de Identidad Visual & Logotipo",
                type: "Servicio",
                description: "Creación de logotipo vectorial, paleta cromática, tipografías y manual de marca digital.",
                quantity: 0, // Ignorado para servicios
                purchasePrice: 0.00,
                sellingPrice: 75.00,
                trackStock: false,
                imageUrl: "https://images.unsplash.com/photo-1626785774573-4b799315345d?w=500&auto=format&fit=crop&q=80",
                barcode: "WOLF-SERV-LOGO",
                variants: [
                    { name: "Plan Básico (2 propuestas)", price: 75.00 },
                    { name: "Plan Corporativo Completo", price: 140.00 }
                ],
                extras: [
                    { name: "Diseño de papelería membretada", price: 25.00 }
                ]
            },
            {
                name: "Desarrollo de Landing Page / Catálogo Web",
                type: "Servicio",
                description: "Página web responsiva conectada a WhatsApp y optimizada para ventas locales y SEO.",
                quantity: 0,
                purchasePrice: 0.00,
                sellingPrice: 120.00,
                trackStock: false,
                imageUrl: "https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=500&auto=format&fit=crop&q=80",
                barcode: "WOLF-SERV-WEB",
                variants: [
                    { name: "Landing Page One-Page", price: 120.00 },
                    { name: "Catálogo Interactivo Completo", price: 220.00 }
                ],
                extras: [
                    { name: "Dominio .com + Hosting Anual", price: 35.00 }
                ]
            },
            {
                name: "Resma de Papel Couché 150g (Insumo Interno)",
                type: "Material", // Oculto en la tienda pública
                description: "Papel couché brillante tamaño tabloide para impresiones de folletos.",
                quantity: 12,
                purchasePrice: 18.50,
                sellingPrice: 24.00,
                trackStock: true,
                imageUrl: "",
                barcode: "INSUMO-PAPEL-150"
            }
        ];

        for (const item of demoItems) {
            await this.saveMaterial(userId, item);
        }
    }

    /**
     * Construye un enlace directo a WhatsApp para ordenar un ítem con sus variantes y extras seleccionados
     * @param {Object} params
     * @param {string} params.phone - Número de WhatsApp (ej: 50372300000)
     * @param {MaterialItem} params.item - Ítem que se desea comprar
     * @param {string} [params.businessName] - Nombre del negocio
     * @param {Variant} [params.variant] - Variante seleccionada
     * @param {Extra[]} [params.extras] - Extras elegidos
     * @param {number} [params.quantity] - Cantidad solicitada
     * @param {number} params.total - Precio total calculado
     * @returns {string} Enlace encodeado a WhatsApp
     */
    static buildWhatsAppOrderLink({ phone, businessName = "Multi Ideas SV", item, variant, extras = [], quantity = 1, total }) {
        const cleanPhone = (phone || "50372359113").replace(/[^0-9]/g, "");
        
        let msg = `Hola *${businessName}*, vi su catálogo en Sensun Shop 🧡\n\n`;
        msg += `🛒 *Pedido:* ${item.name}\n`;
        
        if (variant) {
            msg += `🔹 *Opción seleccionada:* ${variant.name} ($${variant.price.toFixed(2)})\n`;
        } else if (item.sellingPrice !== undefined) {
            msg += `🔹 *Precio unitario:* $${item.sellingPrice.toFixed(2)}\n`;
        }

        if (extras && extras.length > 0) {
            msg += `➕ *Agregados/Extras:*\n`;
            extras.forEach(e => {
                msg += `   • ${e.name} (+${e.price ? `$${e.price.toFixed(2)}` : '$0.00'})\n`;
            });
        }

        msg += `📦 *Cantidad:* ${quantity}\n`;
        msg += `💰 *Total estimado:* $${total.toFixed(2)}\n\n`;
        msg += `¿Me podrían brindar más información para completar el pedido?`;

        return `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
    }
}
