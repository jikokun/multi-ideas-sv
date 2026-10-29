/**
 * Sensun Shop 🧡 WolfTrack Live Catalog & Shopping Cart
 * ==============================================================================
 * - Cuadrícula de productos y servicios con TAMAÑO UNIFORME y consistente
 * - Botón "🛒 Añadir al Carrito" en cada tarjeta
 * - Modal Configurador de Opciones (Variantes y Extras) al hacer clic en Añadir
 * - Sistema de Carrito de Compras integrado en Sensun Shop
 * - Envío consolidado del pedido completo a WhatsApp con la plantilla oficial
 * ==============================================================================
 */

(function () {
    if (window.sensunCatalogModalLoaded) return;
    window.sensunCatalogModalLoaded = true;

    const WOLFTRACK_RTDB_BASE = "https://com-example-jikopuntos-f9ff5-default-rtdb.firebaseio.com";
    let activeCatalogUid = null;
    let activeBusinessData = null;
    let cachedMaterials = [];
    let currentFilter = "all"; // 'all', 'Producto', 'Servicio'
    let currentSearch = "";

    // Estado del Carrito y Configurador
    let cart = [];
    let currentConfigItem = null;
    let configVariantIndex = 0;
    let configExtrasSelected = new Set();
    let configQuantity = 1;

    // Helper: Transformar enlaces de Google Drive a CDN de alto rendimiento
    function optimizeGoogleDriveUrl(url) {
        if (!url || typeof url !== 'string') return '';
        const trimmed = url.trim();
        const driveMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/) ||
            trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/) ||
            trimmed.match(/drive\.google\.com\/uc\?id=([a-zA-Z0-9_-]+)/);

        if (driveMatch && driveMatch[1]) {
            return `https://lh3.googleusercontent.com/d/${driveMatch[1]}`;
        }
        return trimmed;
    }

    // Inyectar Estilos CSS Globales del Catálogo y Carrito
    function injectCatalogStyles() {
        if (document.getElementById('sensun-catalog-modal-styles')) return;

        const style = document.createElement('style');
        style.id = 'sensun-catalog-modal-styles';
        style.textContent = `
        /* Overlay Principal del Catálogo */
        .ss-cat-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 9999999 !important;
            background: rgba(15, 17, 26, 0.82);
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
            opacity: 0;
            transition: opacity 0.25s ease;
        }

        .ss-cat-modal-overlay.active {
            display: flex !important;
            opacity: 1 !important;
            visibility: visible !important;
        }

        .ss-cat-modal-container {
            background: #ffffff;
            width: 100%;
            max-width: 960px;
            max-height: 90vh;
            border-radius: 24px;
            box-shadow: 0 25px 60px -15px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 107, 53, 0.2);
            display: flex;
            flex-direction: column;
            overflow: hidden;
            position: relative;
            transform: scale(0.96) translateY(10px);
            transition: all 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .ss-cat-modal-overlay.active .ss-cat-modal-container {
            transform: scale(1) translateY(0);
        }

        /* Cabecera del Catálogo */
        .ss-cat-header {
            background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
            color: #ffffff;
            padding: 18px 24px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 16px;
            border-bottom: 2px solid #ff6b35;
            position: relative;
        }

        .ss-cat-header-brand {
            display: flex;
            align-items: center;
            gap: 14px;
        }

        .ss-cat-header-avatar {
            width: 46px;
            height: 46px;
            border-radius: 12px;
            background: #ffffff;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            overflow: hidden;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            flex-shrink: 0;
        }

        .ss-cat-header-avatar img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }

        .ss-cat-header-info h2 {
            font-size: 1.2rem;
            font-weight: 800;
            margin: 0;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
            flex-wrap: wrap;
        }

        .ss-cat-live-pill {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(16, 185, 129, 0.2);
            color: #10b981;
            border: 1px solid rgba(16, 185, 129, 0.4);
            padding: 2px 7px;
            border-radius: 10px;
            font-size: 0.7rem;
            font-weight: 700;
            letter-spacing: 0.5px;
            text-transform: uppercase;
        }

        .ss-cat-live-dot {
            width: 7px;
            height: 7px;
            border-radius: 50%;
            background: #10b981;
            box-shadow: 0 0 8px #10b981;
            animation: ssCatPulse 1.8s infinite;
        }

        @keyframes ssCatPulse {
            0% { transform: scale(0.9); opacity: 0.8; }
            50% { transform: scale(1.3); opacity: 1; }
            100% { transform: scale(0.9); opacity: 0.8; }
        }

        .ss-cat-header-info p {
            font-size: 0.8rem;
            color: #94a3b8;
            margin: 3px 0 0 0;
            display: flex;
            align-items: center;
            gap: 6px;
        }

        .ss-cat-header-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        /* Botón de Carrito en Cabecera */
        .ss-cat-btn-cart {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, #ff6b35, #ea580c);
            color: #ffffff;
            border: none;
            padding: 8px 14px;
            border-radius: 12px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.35);
            transition: all 0.2s ease;
            position: relative;
        }

        .ss-cat-btn-cart:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(255, 107, 53, 0.45);
        }

        .ss-cat-cart-badge {
            background: #ffffff;
            color: #ea580c;
            border-radius: 10px;
            padding: 1px 7px;
            font-size: 0.75rem;
            font-weight: 800;
            min-width: 18px;
            text-align: center;
        }

        .ss-cat-btn-fullscreen {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            background: rgba(255, 255, 255, 0.12);
            color: #ffffff;
            border: 1px solid rgba(255, 255, 255, 0.2);
            padding: 7px 12px;
            border-radius: 10px;
            font-size: 0.78rem;
            font-weight: 600;
            text-decoration: none;
            transition: all 0.2s ease;
        }

        .ss-cat-btn-fullscreen:hover {
            background: rgba(255, 255, 255, 0.25);
            color: #ffffff;
        }

        .ss-cat-btn-close {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: #ffffff;
            font-size: 18px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            transition: all 0.2s ease;
        }

        .ss-cat-btn-close:hover {
            background: #ef4444;
            transform: scale(1.08);
        }

        /* Barra de Filtros y Búsqueda */
        .ss-cat-toolbar {
            padding: 12px 24px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .ss-cat-filter-tabs {
            display: flex;
            gap: 6px;
            background: #e2e8f0;
            padding: 3px;
            border-radius: 10px;
        }

        .ss-cat-tab-btn {
            background: transparent;
            border: none;
            padding: 6px 12px;
            border-radius: 8px;
            font-size: 0.8rem;
            font-weight: 600;
            color: #64748b;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ss-cat-tab-btn.active {
            background: #ffffff;
            color: #ff6b35;
            box-shadow: 0 2px 4px rgba(0,0,0,0.06);
        }

        .ss-cat-search-box {
            position: relative;
            flex: 1;
            max-width: 280px;
            min-width: 180px;
        }

        .ss-cat-search-input {
            width: 100%;
            padding: 7px 12px 7px 32px;
            border-radius: 10px;
            border: 1.5px solid #cbd5e1;
            font-size: 0.82rem;
            outline: none;
            transition: border-color 0.2s;
            background: #ffffff;
        }

        .ss-cat-search-input:focus {
            border-color: #ff6b35;
        }

        .ss-cat-search-icon {
            position: absolute;
            left: 10px;
            top: 50%;
            transform: translateY(-50%);
            color: #94a3b8;
            font-size: 13px;
            pointer-events: none;
        }

        /* Cuerpo / Grid de Productos con TAMAÑO UNIFORME */
        .ss-cat-body {
            padding: 20px 24px 70px 24px;
            overflow-y: auto;
            flex: 1;
            min-height: 320px;
            background: #f8fafc;
            position: relative;
        }

        .ss-cat-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
            gap: 20px;
            align-items: stretch;
        }

        /* Tarjeta de Producto / Servicio UNIFORME */
        .ss-cat-card {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 18px;
            overflow: hidden;
            display: flex;
            flex-direction: column;
            height: 100%;
            transition: transform 0.22s ease, box-shadow 0.22s ease, border-color 0.22s ease;
            position: relative;
            box-shadow: 0 2px 8px rgba(0,0,0,0.04);
        }

        .ss-cat-card:hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 28px rgba(0,0,0,0.09);
            border-color: rgba(255, 107, 53, 0.4);
        }

        .ss-cat-card.agotado {
            opacity: 0.72;
            background: #f8fafc;
            border-style: dashed;
        }

        .ss-cat-card-img-wrap {
            height: 165px;
            min-height: 165px;
            max-height: 165px;
            background: #edf2f7;
            position: relative;
            display: flex;
            align-items: center;
            justify-content: center;
            overflow: hidden;
        }

        .ss-cat-card-img-wrap img {
            width: 100%;
            height: 100%;
            object-fit: cover;
            transition: transform 0.3s ease;
        }

        .ss-cat-card:hover .ss-cat-card-img-wrap img {
            transform: scale(1.05);
        }

        .ss-cat-card-placeholder {
            font-size: 40px;
            color: #94a3b8;
        }

        .ss-cat-badge-type {
            position: absolute;
            top: 10px;
            left: 10px;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 0.68rem;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            backdrop-filter: blur(4px);
        }

        .ss-cat-badge-type.producto {
            background: rgba(255, 107, 53, 0.92);
            color: #ffffff;
        }

        .ss-cat-badge-type.servicio {
            background: rgba(123, 104, 238, 0.92);
            color: #ffffff;
        }

        .ss-cat-badge-stock {
            position: absolute;
            top: 10px;
            right: 10px;
            padding: 4px 8px;
            border-radius: 8px;
            font-size: 0.68rem;
            font-weight: 700;
            backdrop-filter: blur(4px);
        }

        .ss-cat-badge-stock.in-stock {
            background: rgba(16, 185, 129, 0.92);
            color: #ffffff;
        }

        .ss-cat-badge-stock.out-stock {
            background: rgba(239, 68, 68, 0.92);
            color: #ffffff;
        }

        /* Contenido con Alturas Fijas para Alineación Uniforme */
        .ss-cat-card-content {
            padding: 14px 16px 16px 16px;
            display: flex;
            flex-direction: column;
            flex: 1;
        }

        .ss-cat-card-title {
            font-size: 0.98rem;
            font-weight: 700;
            color: #1e293b;
            margin: 0;
            line-height: 1.3;
            min-height: 2.6em;
            max-height: 2.6em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        .ss-cat-card-desc {
            font-size: 0.78rem;
            color: #64748b;
            margin: 6px 0 10px 0;
            line-height: 1.35;
            min-height: 2.7em;
            max-height: 2.7em;
            overflow: hidden;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
        }

        /* Indicador de Opciones / Extras Disponibles */
        .ss-cat-card-opts-hint {
            min-height: 22px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
        }

        .ss-cat-opts-pill {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            font-size: 0.7rem;
            font-weight: 600;
            color: #ff6b35;
            background: rgba(255, 107, 53, 0.08);
            border: 1px solid rgba(255, 107, 53, 0.2);
            padding: 2px 7px;
            border-radius: 6px;
        }

        /* Fila de Precios */
        .ss-cat-card-pricing {
            margin-top: auto;
            padding-top: 10px;
            border-top: 1px dashed #e2e8f0;
            display: flex;
            align-items: baseline;
            justify-content: space-between;
            margin-bottom: 12px;
        }

        .ss-cat-price-label {
            font-size: 0.7rem;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
        }

        .ss-cat-price-val {
            font-size: 1.15rem;
            font-weight: 800;
            color: #0f172a;
        }

        /* Botón Añadir al Carrito en Tarjeta */
        .ss-cat-btn-add {
            width: 100%;
            background: linear-gradient(135deg, #ff6b35, #ea580c);
            color: #ffffff;
            border: none;
            padding: 10px 14px;
            border-radius: 12px;
            font-size: 0.84rem;
            font-weight: 700;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            cursor: pointer;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.25);
        }

        .ss-cat-btn-add:hover {
            background: linear-gradient(135deg, #ea580c, #c2410c);
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(255, 107, 53, 0.35);
        }

        .ss-cat-btn-add.disabled {
            background: #cbd5e1;
            color: #64748b;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
            pointer-events: none;
        }

        /* Barra Flotante de Carrito en la parte inferior del Modal */
        .ss-floating-cart-bar {
            position: absolute;
            bottom: 16px;
            left: 24px;
            right: 24px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: #ffffff;
            padding: 12px 20px;
            border-radius: 16px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255, 107, 53, 0.3);
            display: none;
            align-items: center;
            justify-content: space-between;
            z-index: 10;
            animation: ssSlideUp 0.3s ease;
        }

        .ss-floating-cart-bar.active {
            display: flex;
        }

        @keyframes ssSlideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
        }

        .ss-floating-cart-info {
            display: flex;
            align-items: center;
            gap: 12px;
        }

        .ss-floating-cart-icon {
            width: 38px;
            height: 38px;
            border-radius: 10px;
            background: rgba(255, 107, 53, 0.2);
            color: #ff6b35;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 18px;
        }

        .ss-floating-cart-text h4 {
            margin: 0;
            font-size: 0.88rem;
            font-weight: 700;
            color: #ffffff;
        }

        .ss-floating-cart-text p {
            margin: 2px 0 0 0;
            font-size: 0.76rem;
            color: #94a3b8;
        }

        .ss-floating-cart-btn {
            background: linear-gradient(135deg, #ff6b35, #ea580c);
            color: #ffffff;
            border: none;
            padding: 8px 16px;
            border-radius: 10px;
            font-size: 0.82rem;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }

        .ss-floating-cart-btn:hover {
            transform: scale(1.03);
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
        }

        /* ==========================================================
           MODAL CONFIGURADOR DE OPCIONES (VARIANTES & EXTRAS)
        ========================================================== */
        .ss-config-modal-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000005 !important;
            background: rgba(15, 17, 26, 0.75);
            backdrop-filter: blur(6px);
            display: none;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }

        .ss-config-modal-overlay.active {
            display: flex;
            animation: ssFadeIn 0.2s ease;
        }

        .ss-config-container {
            background: #ffffff;
            width: 100%;
            max-width: 480px;
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 20px 50px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            animation: ssZoomIn 0.22s ease;
        }

        @keyframes ssZoomIn {
            from { transform: scale(0.92); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
        }

        .ss-config-header {
            padding: 16px 20px;
            background: #f8fafc;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
        }

        .ss-config-header h3 {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 800;
            color: #0f172a;
        }

        .ss-config-body {
            padding: 20px;
            max-height: 60vh;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 16px;
        }

        .ss-config-item-preview {
            display: flex;
            gap: 14px;
            align-items: center;
            background: #f1f5f9;
            padding: 12px;
            border-radius: 12px;
        }

        .ss-config-preview-img {
            width: 56px;
            height: 56px;
            border-radius: 10px;
            object-fit: cover;
            background: #ffffff;
            flex-shrink: 0;
        }

        .ss-config-preview-info h4 {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 700;
            color: #1e293b;
        }

        .ss-config-preview-info p {
            margin: 3px 0 0 0;
            font-size: 0.78rem;
            color: #64748b;
        }

        .ss-config-section {
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .ss-config-section-title {
            font-size: 0.75rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .ss-config-option-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            padding: 10px 14px;
            border-radius: 10px;
            cursor: pointer;
            font-size: 0.85rem;
            color: #1e293b;
            transition: all 0.15s;
        }

        .ss-config-option-row:hover {
            border-color: #ff6b35;
            background: rgba(255, 107, 53, 0.02);
        }

        .ss-config-option-row.selected {
            border-color: #ff6b35;
            background: rgba(255, 107, 53, 0.06);
            font-weight: 600;
        }

        .ss-config-option-row input {
            accent-color: #ff6b35;
            margin-right: 8px;
            cursor: pointer;
        }

        /* Selector de Cantidad en Configurador */
        .ss-config-qty-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 10px;
            border-top: 1px dashed #e2e8f0;
        }

        .ss-config-qty-ctrl {
            display: inline-flex;
            align-items: center;
            border: 1.5px solid #cbd5e1;
            border-radius: 10px;
            overflow: hidden;
            background: #ffffff;
        }

        .ss-config-qty-btn {
            background: #f1f5f9;
            border: none;
            width: 32px;
            height: 32px;
            font-size: 1rem;
            font-weight: 700;
            cursor: pointer;
            color: #1e293b;
            transition: background 0.15s;
        }

        .ss-config-qty-btn:hover {
            background: #e2e8f0;
        }

        .ss-config-qty-val {
            width: 36px;
            text-align: center;
            font-weight: 700;
            font-size: 0.9rem;
            color: #0f172a;
        }

        .ss-config-footer {
            padding: 16px 20px;
            background: #f8fafc;
            border-top: 1px solid #e2e8f0;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
        }

        .ss-config-btn-submit {
            flex: 1;
            background: linear-gradient(135deg, #ff6b35, #ea580c);
            color: #ffffff;
            border: none;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 0.9rem;
            font-weight: 700;
            cursor: pointer;
            box-shadow: 0 4px 12px rgba(255, 107, 53, 0.3);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            transition: all 0.2s;
        }

        .ss-config-btn-submit:hover {
            transform: translateY(-1px);
            box-shadow: 0 6px 16px rgba(255, 107, 53, 0.4);
        }

        /* ==========================================================
           DRAWER / MODAL DEL CARRITO DE COMPRAS
        ========================================================== */
        .ss-cart-drawer-overlay {
            position: fixed;
            inset: 0;
            z-index: 10000010 !important;
            background: rgba(15, 17, 26, 0.8);
            backdrop-filter: blur(8px);
            display: none;
            align-items: center;
            justify-content: flex-end;
        }

        .ss-cart-drawer-overlay.active {
            display: flex;
            animation: ssFadeIn 0.2s ease;
        }

        .ss-cart-drawer {
            background: #ffffff;
            width: 100%;
            max-width: 440px;
            height: 100%;
            box-shadow: -10px 0 30px rgba(0,0,0,0.3);
            display: flex;
            flex-direction: column;
            animation: ssSlideLeft 0.28s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes ssSlideLeft {
            from { transform: translateX(100%); }
            to { transform: translateX(0); }
        }

        .ss-cart-drawer-header {
            padding: 18px 20px;
            background: linear-gradient(135deg, #1e293b, #0f172a);
            color: #ffffff;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 2px solid #ff6b35;
        }

        .ss-cart-drawer-header h3 {
            margin: 0;
            font-size: 1.1rem;
            font-weight: 800;
            color: #ffffff;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .ss-cart-drawer-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ss-cart-btn-clear {
            background: transparent;
            border: none;
            color: #94a3b8;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 6px;
            transition: all 0.2s;
        }

        .ss-cart-btn-clear:hover {
            color: #ef4444;
            background: rgba(239, 68, 68, 0.1);
        }

        .ss-cart-drawer-body {
            padding: 20px;
            flex: 1;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
            background: #f8fafc;
        }

        .ss-cart-empty {
            text-align: center;
            padding: 60px 20px;
            color: #64748b;
        }

        .ss-cart-item-card {
            background: #ffffff;
            border: 1.5px solid #e2e8f0;
            border-radius: 14px;
            padding: 12px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            box-shadow: 0 2px 6px rgba(0,0,0,0.03);
            position: relative;
        }

        .ss-cart-item-header {
            display: flex;
            gap: 10px;
            align-items: flex-start;
        }

        .ss-cart-item-thumb {
            width: 48px;
            height: 48px;
            border-radius: 8px;
            object-fit: cover;
            background: #f1f5f9;
            flex-shrink: 0;
        }

        .ss-cart-item-details {
            flex: 1;
        }

        .ss-cart-item-details h4 {
            margin: 0;
            font-size: 0.88rem;
            font-weight: 700;
            color: #1e293b;
            line-height: 1.3;
        }

        .ss-cart-item-pill {
            display: inline-block;
            font-size: 0.72rem;
            color: #64748b;
            margin-top: 2px;
        }

        .ss-cart-item-footer {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px dashed #e2e8f0;
            margin-top: 2px;
        }

        .ss-cart-item-price {
            font-size: 0.95rem;
            font-weight: 800;
            color: #0f172a;
        }

        .ss-cart-item-actions {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .ss-cart-btn-trash {
            background: none;
            border: none;
            color: #94a3b8;
            cursor: pointer;
            font-size: 14px;
            padding: 4px;
            transition: color 0.15s;
        }

        .ss-cart-btn-trash:hover {
            color: #ef4444;
        }

        /* Formulario del Pedido / Checkout */
        .ss-cart-checkout-box {
            padding: 18px 20px;
            background: #ffffff;
            border-top: 1.5px solid #e2e8f0;
            display: flex;
            flex-direction: column;
            gap: 12px;
            box-shadow: 0 -4px 16px rgba(0,0,0,0.05);
        }

        .ss-cart-input-group {
            display: flex;
            flex-direction: column;
            gap: 4px;
        }

        .ss-cart-input-label {
            font-size: 0.72rem;
            font-weight: 700;
            color: #475569;
            text-transform: uppercase;
        }

        .ss-cart-input {
            width: 100%;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1.5px solid #cbd5e1;
            font-size: 0.82rem;
            outline: none;
            transition: border-color 0.2s;
        }

        .ss-cart-input:focus {
            border-color: #ff6b35;
        }

        .ss-cart-total-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-top: 8px;
            border-top: 1px dashed #cbd5e1;
        }

        .ss-cart-total-label {
            font-size: 0.85rem;
            font-weight: 700;
            color: #475569;
        }

        .ss-cart-total-amount {
            font-size: 1.35rem;
            font-weight: 900;
            color: #0f172a;
        }

        /* Botón de Pedido por WhatsApp */
        .ss-cart-btn-wsp {
            width: 100%;
            background: #25d366;
            color: #ffffff;
            border: none;
            padding: 12px 18px;
            border-radius: 12px;
            font-size: 0.95rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            cursor: pointer;
            box-shadow: 0 4px 14px rgba(37, 211, 102, 0.35);
            transition: all 0.2s ease;
            text-decoration: none;
        }

        .ss-cart-btn-wsp:hover {
            background: #1eb954;
            transform: translateY(-1px);
            box-shadow: 0 6px 18px rgba(37, 211, 102, 0.45);
        }

        /* Toast flotante de confirmación */
        .ss-cat-toast {
            position: fixed;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%) translateY(30px);
            background: #1e293b;
            color: #ffffff;
            padding: 10px 20px;
            border-radius: 30px;
            font-size: 0.84rem;
            font-weight: 700;
            box-shadow: 0 10px 25px rgba(0,0,0,0.3);
            display: flex;
            align-items: center;
            gap: 8px;
            z-index: 10000020;
            opacity: 0;
            pointer-events: none;
            transition: all 0.25s ease;
        }

        .ss-cat-toast.active {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }

        @media (max-width: 640px) {
            .ss-cat-header {
                padding: 14px 16px;
            }
            .ss-cat-header-info h2 {
                font-size: 1.05rem;
            }
            .ss-cat-btn-fullscreen span {
                display: none;
            }
            .ss-cat-toolbar {
                padding: 12px 16px;
            }
            .ss-cat-body {
                padding: 16px 16px 70px 16px;
            }
            .ss-cat-grid {
                grid-template-columns: 1fr;
            }
            .ss-cart-drawer {
                max-width: 100%;
            }
        }
        `;
        document.head.appendChild(style);
    }

    // Mostrar Notificación Toast
    function showToast(msg) {
        let toast = document.getElementById('ssCatToast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'ssCatToast';
            toast.className = 'ss-cat-toast';
            document.body.appendChild(toast);
        }
        toast.innerHTML = msg;
        toast.classList.add('active');
        setTimeout(() => toast.classList.remove('active'), 2400);
    }

    // Cargar / Guardar Carrito en LocalStorage por Negocio
    function getStorageKey() {
        const id = (activeBusinessData && (activeBusinessData.businessId || activeBusinessData.id)) || "general";
        return `sensun_cart_${id}`;
    }

    function loadCart() {
        try {
            const raw = localStorage.getItem(getStorageKey());
            cart = raw ? JSON.parse(raw) : [];
        } catch (e) {
            cart = [];
        }
        updateCartBadges();
    }

    function saveCart() {
        try {
            localStorage.setItem(getStorageKey(), JSON.stringify(cart));
        } catch (e) {}
        updateCartBadges();
        updateFloatingCartBar();
    }

    // Actualizar Contador de Carrito en Cabecera
    function updateCartBadges() {
        const totalItemsCount = cart.reduce((acc, it) => acc + (it.quantity || 1), 0);
        const headerBadge = document.getElementById('ssHeaderCartCount');
        if (headerBadge) {
            headerBadge.textContent = totalItemsCount;
        }
    }

    // Actualizar Barra Flotante Inferior de Carrito
    function updateFloatingCartBar() {
        const bar = document.getElementById('ssFloatingCartBar');
        if (!bar) return;

        const totalItemsCount = cart.reduce((acc, it) => acc + (it.quantity || 1), 0);
        const totalPrice = cart.reduce((acc, it) => acc + (it.itemTotal || 0), 0);

        if (totalItemsCount > 0) {
            bar.classList.add('active');
            const countText = document.getElementById('ssFloatingCartCount');
            const totalText = document.getElementById('ssFloatingCartTotal');
            if (countText) countText.textContent = `${totalItemsCount} ${totalItemsCount === 1 ? 'artículo' : 'artículos'}`;
            if (totalText) totalText.textContent = `Total: $${totalPrice.toFixed(2)}`;
        } else {
            bar.classList.remove('active');
        }
    }

    // Construir e Inyectar todos los contenedores DOM requeridos
    function ensureModalDOM() {
        injectCatalogStyles();

        let overlay = document.getElementById('sensunCatalogModalOverlay');
        if (overlay) return overlay;

        overlay = document.createElement('div');
        overlay.id = 'sensunCatalogModalOverlay';
        overlay.className = 'ss-cat-modal-overlay';
        overlay.onclick = function (e) {
            if (e.target === overlay) {
                window.closeSensunCatalogModal();
            }
        };

        overlay.innerHTML = `
            <div class="ss-cat-modal-container" onclick="event.stopPropagation()">
                <!-- Cabecera -->
                <div class="ss-cat-header">
                    <div class="ss-cat-header-brand">
                        <div class="ss-cat-header-avatar" id="ssCatModalAvatar">🐺</div>
                        <div class="ss-cat-header-info">
                            <h2>
                                <span id="ssCatModalTitle">Catálogo Digital</span>
                                <span class="ss-cat-live-pill"><span class="ss-cat-live-dot"></span> En Vivo</span>
                            </h2>
                            <p>
                                <span>⚡ Sincronizado en tiempo real con WolfTrack</span>
                            </p>
                        </div>
                    </div>
                    <div class="ss-cat-header-actions">
                        <button type="button" class="ss-cat-btn-cart" onclick="window.openSensunCart()" title="Ver carrito de compras">
                            <span>🛒 Carrito</span>
                            <span class="ss-cat-cart-badge" id="ssHeaderCartCount">0</span>
                        </button>
                        <a href="#" id="ssCatModalDirectLink" class="ss-cat-btn-fullscreen" target="_blank" rel="noopener noreferrer" title="Abrir catálogo web en pantalla completa">
                            <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
                            <span>Pantalla Completa</span>
                        </a>
                        <button type="button" class="ss-cat-btn-close" onclick="window.closeSensunCatalogModal()" title="Cerrar catálogo">✕</button>
                    </div>
                </div>

                <!-- Barra de Filtros -->
                <div class="ss-cat-toolbar">
                    <div class="ss-cat-filter-tabs">
                        <button type="button" class="ss-cat-tab-btn active" data-filter="all" onclick="window.setSensunCatalogFilter('all')">Todos (<span id="ssCatCountAll">0</span>)</button>
                        <button type="button" class="ss-cat-tab-btn" data-filter="Producto" onclick="window.setSensunCatalogFilter('Producto')">🛍️ Productos (<span id="ssCatCountProd">0</span>)</button>
                        <button type="button" class="ss-cat-tab-btn" data-filter="Servicio" onclick="window.setSensunCatalogFilter('Servicio')">⚡ Servicios (<span id="ssCatCountServ">0</span>)</button>
                    </div>
                    <div class="ss-cat-search-box">
                        <span class="ss-cat-search-icon">🔍</span>
                        <input type="text" class="ss-cat-search-input" id="ssCatSearchInput" placeholder="Buscar producto o servicio..." oninput="window.handleSensunCatalogSearch(this.value)">
                    </div>
                </div>

                <!-- Cuerpo / Grid de Productos -->
                <div class="ss-cat-body" id="ssCatBody">
                    <div class="ss-cat-loading-state">
                        <div class="ss-cat-spinner"></div>
                        <p>Conectando al inventario en vivo de WolfTrack...</p>
                    </div>
                </div>

                <!-- Barra Flotante de Carrito en la parte inferior del modal -->
                <div class="ss-floating-cart-bar" id="ssFloatingCartBar">
                    <div class="ss-floating-cart-info">
                        <div class="ss-floating-cart-icon">🛒</div>
                        <div class="ss-floating-cart-text">
                            <h4 id="ssFloatingCartCount">0 artículos</h4>
                            <p id="ssFloatingCartTotal">Total: $0.00</p>
                        </div>
                    </div>
                    <button type="button" class="ss-floating-cart-btn" onclick="window.openSensunCart()">
                        Ver Carrito y Pedir ➔
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        // Inyectar el Modal del Configurador de Opciones
        ensureConfiguratorDOM();

        // Inyectar el Drawer del Carrito
        ensureCartDrawerDOM();

        // Atajo teclado Escape para cerrar
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const configOverlay = document.getElementById('ssConfigModalOverlay');
                const cartOverlay = document.getElementById('ssCartDrawerOverlay');
                if (configOverlay && configOverlay.classList.contains('active')) {
                    window.closeItemConfigurator();
                } else if (cartOverlay && cartOverlay.classList.contains('active')) {
                    window.closeSensunCart();
                } else if (overlay.classList.contains('active')) {
                    window.closeSensunCatalogModal();
                }
            }
        });

        return overlay;
    }

    // Modal Configurador de Variantes y Extras
    function ensureConfiguratorDOM() {
        if (document.getElementById('ssConfigModalOverlay')) return;

        const configOverlay = document.createElement('div');
        configOverlay.id = 'ssConfigModalOverlay';
        configOverlay.className = 'ss-config-modal-overlay';
        configOverlay.onclick = function (e) {
            if (e.target === configOverlay) window.closeItemConfigurator();
        };

        configOverlay.innerHTML = `
            <div class="ss-config-container" onclick="event.stopPropagation()">
                <div class="ss-config-header">
                    <h3>Personalizar Ítem</h3>
                    <button type="button" class="ss-cat-btn-close" style="width: 30px; height: 30px; color: #64748b; background: #f1f5f9;" onclick="window.closeItemConfigurator()">✕</button>
                </div>
                <div class="ss-config-body" id="ssConfigBody">
                    <!-- Contenido dinámico inyectado en openItemConfigurator -->
                </div>
                <div class="ss-config-footer">
                    <button type="button" class="ss-config-btn-submit" onclick="window.confirmAddToCart()">
                        <span>🛒 Agregar al Carrito</span>
                        <strong id="ssConfigFooterPrice">$0.00</strong>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(configOverlay);
    }

    // Drawer del Carrito de Compras
    function ensureCartDrawerDOM() {
        if (document.getElementById('ssCartDrawerOverlay')) return;

        const cartOverlay = document.createElement('div');
        cartOverlay.id = 'ssCartDrawerOverlay';
        cartOverlay.className = 'ss-cart-drawer-overlay';
        cartOverlay.onclick = function (e) {
            if (e.target === cartOverlay) window.closeSensunCart();
        };

        cartOverlay.innerHTML = `
            <div class="ss-cart-drawer" onclick="event.stopPropagation()">
                <div class="ss-cart-drawer-header">
                    <div>
                        <h3>🛒 Carrito de Compras</h3>
                        <small style="color: #94a3b8;" id="ssCartBizName">Multi Ideas SV</small>
                    </div>
                    <div class="ss-cart-drawer-actions">
                        <button type="button" class="ss-cart-btn-clear" onclick="window.clearSensunCart()">🗑️ Vaciar</button>
                        <button type="button" class="ss-cat-btn-close" onclick="window.closeSensunCart()">✕</button>
                    </div>
                </div>

                <div class="ss-cart-drawer-body" id="ssCartDrawerBody">
                    <!-- Ítems del carrito renderizados dinámicamente -->
                </div>

                <div class="ss-cart-checkout-box" id="ssCartCheckoutBox">
                    <div class="ss-cart-input-group">
                        <label class="ss-cart-input-label">Tu Nombre (Opcional):</label>
                        <input type="text" class="ss-cart-input" id="ssCartCustomerName" placeholder="Ej: Carlos Menjívar">
                    </div>
                    <div class="ss-cart-input-group">
                        <label class="ss-cart-input-label">Indicaciones o Notas (Opcional):</label>
                        <input type="text" class="ss-cart-input" id="ssCartCustomerNotes" placeholder="Ej: Entregar por la tarde por favor">
                    </div>

                    <div class="ss-cart-total-row">
                        <span class="ss-cart-total-label">Total Estimado a Pagar:</span>
                        <span class="ss-cart-total-amount" id="ssCartTotalAmount">$0.00</span>
                    </div>

                    <button type="button" class="ss-cart-btn-wsp" onclick="window.sendWhatsAppCartOrder()">
                        <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.73.44 3.35 1.21 4.78L2 22l5.37-1.41C8.75 21.31 10.33 21.6 12 21.6c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.4 12.6c-.23.63-.87 1.16-1.5 1.39-.63.23-1.45.32-2.32-.05-.87-.36-3.74-1.6-5.17-3.03-1.43-1.43-2.67-4.3-3.03-5.17-.37-.87-.28-1.69-.05-2.32.23-.63.76-1.24 1.39-1.47.63-.23 1.33-.23 1.96.05.63.27.63.76.36 1.39L8.47 8.65c-.27.63-.76.63-1.39.36l.18.32c.36.87 1.6 3.74 3.03 5.17 1.43 1.43 4.3 2.67 5.17 3.03l.32.18c-.63-.27-1.12-.27-1.39-.05l1.65-1.96c.27-.27.76-.27 1.39 0s2.99 1.47 3.26 1.74c.27.27.27.84.05 1.47z"/></svg>
                        <span>Enviar Pedido por WhatsApp</span>
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(cartOverlay);
    }

    // Conectar a Firebase RTDB para obtener los ítems en vivo
    async function fetchWolfTrackMaterials(catalogUid) {
        if (!catalogUid) return [];
        try {
            const url = `${WOLFTRACK_RTDB_BASE}/wolftrack/materials/${catalogUid}.json`;
            const resp = await fetch(url);
            if (!resp.ok) {
                console.warn(`[WolfTrack RTDB] HTTP Error: ${resp.status}`);
                return [];
            }
            const data = await resp.json() || {};
            
            // Regla de Filtrado: Solo "Producto" y "Servicio". Se excluye "Material".
            const validItems = Object.entries(data)
                .map(([key, val]) => ({ id: key, ...val }))
                .filter(item => item.type === "Producto" || item.type === "Servicio");

            return validItems;
        } catch (err) {
            console.error("[WolfTrack RTDB Fetch Error]:", err);
            return [];
        }
    }

    // Renderizar Cuadrícula con TAMAÑO UNIFORME
    function renderCatalogGrid() {
        const bodyEl = document.getElementById('ssCatBody');
        if (!bodyEl) return;

        const countAllEl = document.getElementById('ssCatCountAll');
        const countProdEl = document.getElementById('ssCatCountProd');
        const countServEl = document.getElementById('ssCatCountServ');

        const prodCount = cachedMaterials.filter(x => x.type === 'Producto').length;
        const servCount = cachedMaterials.filter(x => x.type === 'Servicio').length;

        if (countAllEl) countAllEl.textContent = cachedMaterials.length;
        if (countProdEl) countProdEl.textContent = prodCount;
        if (countServEl) countServEl.textContent = servCount;

        // Filtrado por Pestaña y Búsqueda
        let filtered = cachedMaterials;
        if (currentFilter !== 'all') {
            filtered = filtered.filter(x => x.type === currentFilter);
        }

        if (currentSearch.trim()) {
            const q = currentSearch.toLowerCase().trim();
            filtered = filtered.filter(x => 
                (x.name && x.name.toLowerCase().includes(q)) ||
                (x.description && x.description.toLowerCase().includes(q)) ||
                (x.barcode && x.barcode.toLowerCase().includes(q))
            );
        }

        if (filtered.length === 0) {
            bodyEl.innerHTML = `
                <div class="ss-cat-empty-state">
                    <div style="font-size: 44px; margin-bottom: 8px;">🛍️</div>
                    <h3 style="font-size: 1.1rem; color: #1e293b; margin-bottom: 4px;">No hay ítems disponibles</h3>
                    <p style="font-size: 0.85rem; color: #64748b;">No se encontraron productos o servicios que coincidan con la búsqueda.</p>
                </div>
            `;
            return;
        }

        let html = `<div class="ss-cat-grid">`;

        filtered.forEach(item => {
            const isProducto = item.type === 'Producto';
            const isAgotado = isProducto && Boolean(item.trackStock) && (parseInt(item.quantity, 10) <= 0);
            const displayImgUrl = optimizeGoogleDriveUrl(item.imageUrl);

            const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
            const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;

            // Calcular precio base o rango "Desde"
            let priceDisplay = `$${(parseFloat(item.sellingPrice) || 0).toFixed(2)}`;
            let priceLabel = "Precio";
            if (hasVariants) {
                const minPrice = Math.min(...item.variants.map(v => parseFloat(v.price) || 0));
                priceDisplay = `$${minPrice.toFixed(2)}`;
                priceLabel = "Desde";
            }

            // Píldora indicativa si tiene opciones
            let optsHintHtml = '';
            if (hasVariants || hasExtras) {
                let parts = [];
                if (hasVariants) parts.push(`${item.variants.length} opciones`);
                if (hasExtras) parts.push(`${item.extras.length} extras`);
                optsHintHtml = `<div class="ss-cat-card-opts-hint"><span class="ss-cat-opts-pill">⚙️ ${parts.join(' · ')}</span></div>`;
            } else {
                optsHintHtml = `<div class="ss-cat-card-opts-hint"></div>`;
            }

            html += `
                <div class="ss-cat-card ${isAgotado ? 'agotado' : ''}" id="cat-card-${item.id}">
                    <div class="ss-cat-card-img-wrap">
                        ${displayImgUrl ? `
                            <img src="${displayImgUrl}" alt="${item.name}" loading="lazy" decoding="async" onerror="this.style.display='none'; this.nextElementSibling.style.display='block';">
                            <div class="ss-cat-card-placeholder" style="display: none;">${isProducto ? '📦' : '⚡'}</div>
                        ` : `
                            <div class="ss-cat-card-placeholder">${isProducto ? '📦' : '⚡'}</div>
                        `}
                        
                        <span class="ss-cat-badge-type ${isProducto ? 'producto' : 'servicio'}">${item.type}</span>
                        
                        ${isProducto ? `
                            ${isAgotado ? `
                                <span class="ss-cat-badge-stock out-stock">Agotado 🚫</span>
                            ` : `
                                <span class="ss-cat-badge-stock in-stock">
                                    ${item.trackStock ? `Stock: ${item.quantity}` : `Disponible ✅`}
                                </span>
                            `}
                        ` : `
                            <span class="ss-cat-badge-stock in-stock">Disponible ✨</span>
                        `}
                    </div>

                    <div class="ss-cat-card-content">
                        <h4 class="ss-cat-card-title" title="${item.name}">${item.name}</h4>
                        <p class="ss-cat-card-desc" title="${item.description || ''}">${item.description || 'Sin descripción disponible'}</p>
                        
                        ${optsHintHtml}

                        <div class="ss-cat-card-pricing">
                            <span class="ss-cat-price-label">${priceLabel}</span>
                            <span class="ss-cat-price-val">${priceDisplay}</span>
                        </div>

                        ${isAgotado ? `
                            <button type="button" class="ss-cat-btn-add disabled" disabled>
                                <span>Agotado 🚫</span>
                            </button>
                        ` : `
                            <button type="button" class="ss-cat-btn-add" onclick="window.handleAddToCartClick('${item.id}')">
                                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                                <span>Añadir al Carrito</span>
                            </button>
                        `}
                    </div>
                </div>
            `;
        });

        html += `</div>`;
        bodyEl.innerHTML = html;
        updateFloatingCartBar();
    }

    // Manejar Clic en "Añadir al Carrito"
    window.handleAddToCartClick = function(itemId) {
        const item = cachedMaterials.find(x => x.id === itemId);
        if (!item) return;

        const hasVariants = Array.isArray(item.variants) && item.variants.length > 0;
        const hasExtras = Array.isArray(item.extras) && item.extras.length > 0;

        // Si tiene variantes o extras, abrir modal configurador
        if (hasVariants || hasExtras) {
            window.openItemConfigurator(item);
        } else {
            // Si no tiene variantes ni extras, agregar directamente 1 unidad
            const unitPrice = parseFloat(item.sellingPrice) || 0;
            const cartItem = {
                cartItemId: `${item.id}_direct_${Date.now()}`,
                id: item.id,
                name: item.name,
                type: item.type,
                imageUrl: optimizeGoogleDriveUrl(item.imageUrl),
                unitPrice: unitPrice,
                variant: null,
                extras: [],
                quantity: 1,
                itemTotal: unitPrice
            };
            addToCartList(cartItem);
            showToast(`✅ <b>${item.name}</b> añadido al carrito`);
        }
    };

    // Abrir Modal Configurador de Opciones
    window.openItemConfigurator = function(item) {
        currentConfigItem = item;
        configVariantIndex = (Array.isArray(item.variants) && item.variants.length > 0) ? 0 : -1;
        configExtrasSelected = new Set();
        configQuantity = 1;

        const modal = document.getElementById('ssConfigModalOverlay');
        const body = document.getElementById('ssConfigBody');
        if (!modal || !body) return;

        const displayImg = optimizeGoogleDriveUrl(item.imageUrl);

        let html = `
            <div class="ss-config-item-preview">
                ${displayImg ? `<img src="${displayImg}" class="ss-config-preview-img" alt="${item.name}">` : `<div class="ss-config-preview-img" style="display:flex;align-items:center;justify-content:center;font-size:24px;">📦</div>`}
                <div class="ss-config-preview-info">
                    <h4>${item.name}</h4>
                    <p>${item.description || item.type}</p>
                </div>
            </div>
        `;

        // Sección de Variantes (RadioButtons - Selección Única)
        if (Array.isArray(item.variants) && item.variants.length > 0) {
            html += `
                <div class="ss-config-section">
                    <span class="ss-config-section-title">Elige una Opción:</span>
                    ${item.variants.map((v, idx) => `
                        <label class="ss-config-option-row ${idx === 0 ? 'selected' : ''}" id="cfg-var-row-${idx}" onclick="window.selectConfigVariant(${idx})">
                            <div style="display:flex; align-items:center;">
                                <input type="radio" name="cfg_variant" value="${idx}" ${idx === 0 ? 'checked' : ''}>
                                <span>${v.name}</span>
                            </div>
                            <strong style="color: #0f172a;">$${parseFloat(v.price).toFixed(2)}</strong>
                        </label>
                    `).join('')}
                </div>
            `;
        }

        // Sección de Extras (CheckBoxes - Selección Múltiple)
        if (Array.isArray(item.extras) && item.extras.length > 0) {
            html += `
                <div class="ss-config-section">
                    <span class="ss-config-section-title">Agregados / Extras Opcionales:</span>
                    ${item.extras.map((ex, idx) => `
                        <label class="ss-config-option-row" id="cfg-extra-row-${idx}">
                            <div style="display:flex; align-items:center;">
                                <input type="checkbox" value="${idx}" onchange="window.toggleConfigExtra(${idx}, this.checked)">
                                <span>${ex.name}</span>
                            </div>
                            <strong style="color: #ff6b35;">+$${parseFloat(ex.price).toFixed(2)}</strong>
                        </label>
                    `).join('')}
                </div>
            `;
        }

        // Selector de Cantidad
        html += `
            <div class="ss-config-qty-row">
                <span class="ss-config-section-title" style="margin: 0;">Cantidad a Pedir:</span>
                <div class="ss-config-qty-ctrl">
                    <button type="button" class="ss-config-qty-btn" onclick="window.updateConfigQty(-1)">-</button>
                    <span class="ss-config-qty-val" id="ssConfigQtyVal">1</span>
                    <button type="button" class="ss-config-qty-btn" onclick="window.updateConfigQty(1)">+</button>
                </div>
            </div>
        `;

        body.innerHTML = html;
        updateConfigPrice();
        modal.classList.add('active');
    };

    window.closeItemConfigurator = function() {
        const modal = document.getElementById('ssConfigModalOverlay');
        if (modal) modal.classList.remove('active');
        currentConfigItem = null;
    };

    window.selectConfigVariant = function(idx) {
        configVariantIndex = idx;
        document.querySelectorAll('.ss-config-option-row[id^="cfg-var-row-"]').forEach((el, i) => {
            if (i === idx) {
                el.classList.add('selected');
                const radio = el.querySelector('input[type="radio"]');
                if (radio) radio.checked = true;
            } else {
                el.classList.remove('selected');
            }
        });
        updateConfigPrice();
    };

    window.toggleConfigExtra = function(idx, isChecked) {
        if (isChecked) {
            configExtrasSelected.add(idx);
        } else {
            configExtrasSelected.delete(idx);
        }
        const row = document.getElementById(`cfg-extra-row-${idx}`);
        if (row) {
            if (isChecked) row.classList.add('selected');
            else row.classList.remove('selected');
        }
        updateConfigPrice();
    };

    window.updateConfigQty = function(delta) {
        if (!currentConfigItem) return;
        let maxQty = 999;
        if (currentConfigItem.trackStock && currentConfigItem.quantity) {
            maxQty = parseInt(currentConfigItem.quantity, 10);
        }
        configQuantity = Math.max(1, Math.min(maxQty, configQuantity + delta));
        const valEl = document.getElementById('ssConfigQtyVal');
        if (valEl) valEl.textContent = configQuantity;
        updateConfigPrice();
    };

    function calculateConfigTotal() {
        if (!currentConfigItem) return 0;
        let unit = parseFloat(currentConfigItem.sellingPrice) || 0;
        if (configVariantIndex >= 0 && Array.isArray(currentConfigItem.variants) && currentConfigItem.variants[configVariantIndex]) {
            unit = parseFloat(currentConfigItem.variants[configVariantIndex].price) || unit;
        }

        let extrasTotal = 0;
        if (Array.isArray(currentConfigItem.extras)) {
            configExtrasSelected.forEach(idx => {
                if (currentConfigItem.extras[idx]) {
                    extrasTotal += parseFloat(currentConfigItem.extras[idx].price) || 0;
                }
            });
        }

        return (unit + extrasTotal) * configQuantity;
    }

    function updateConfigPrice() {
        const total = calculateConfigTotal();
        const priceEl = document.getElementById('ssConfigFooterPrice');
        if (priceEl) priceEl.textContent = `$${total.toFixed(2)}`;
    }

    // Confirmar y Añadir el Ítem Configurado al Carrito
    window.confirmAddToCart = function() {
        if (!currentConfigItem) return;

        let selectedVariantObj = null;
        let unitPrice = parseFloat(currentConfigItem.sellingPrice) || 0;
        if (configVariantIndex >= 0 && Array.isArray(currentConfigItem.variants) && currentConfigItem.variants[configVariantIndex]) {
            selectedVariantObj = currentConfigItem.variants[configVariantIndex];
            unitPrice = parseFloat(selectedVariantObj.price) || unitPrice;
        }

        let selectedExtrasList = [];
        let extrasTotal = 0;
        if (Array.isArray(currentConfigItem.extras)) {
            configExtrasSelected.forEach(idx => {
                const ex = currentConfigItem.extras[idx];
                if (ex) {
                    selectedExtrasList.push(ex);
                    extrasTotal += parseFloat(ex.price) || 0;
                }
            });
        }

        const itemTotal = (unitPrice + extrasTotal) * configQuantity;

        const cartItem = {
            cartItemId: `${currentConfigItem.id}_${configVariantIndex}_${Array.from(configExtrasSelected).sort().join('-')}_${Date.now()}`,
            id: currentConfigItem.id,
            name: currentConfigItem.name,
            type: currentConfigItem.type,
            imageUrl: optimizeGoogleDriveUrl(currentConfigItem.imageUrl),
            unitPrice: unitPrice,
            variant: selectedVariantObj,
            extras: selectedExtrasList,
            quantity: configQuantity,
            itemTotal: itemTotal
        };

        addToCartList(cartItem);
        window.closeItemConfigurator();
        showToast(`✅ <b>${cartItem.name}</b> añadido al carrito`);
    };

    // Lógica para Insertar o Combinar Ítem en la Lista del Carrito
    function addToCartList(newItem) {
        // Buscar si ya existe exactamente el mismo ítem (mismo producto, misma variante, mismos extras)
        const matchIdx = cart.findIndex(c => {
            const sameId = c.id === newItem.id;
            const sameVar = (c.variant && newItem.variant) ? c.variant.name === newItem.variant.name : (!c.variant && !newItem.variant);
            const cExtras = (c.extras || []).map(e => e.name).sort().join(',');
            const nExtras = (newItem.extras || []).map(e => e.name).sort().join(',');
            return sameId && sameVar && (cExtras === nExtras);
        });

        if (matchIdx >= 0) {
            cart[matchIdx].quantity += newItem.quantity;
            const unitWithExtras = (cart[matchIdx].unitPrice || 0) + (cart[matchIdx].extras || []).reduce((a, b) => a + (parseFloat(b.price) || 0), 0);
            cart[matchIdx].itemTotal = unitWithExtras * cart[matchIdx].quantity;
        } else {
            cart.push(newItem);
        }

        saveCart();
    }

    // Abrir y Renderizar el Drawer del Carrito
    window.openSensunCart = function() {
        ensureCartDrawerDOM();
        const drawer = document.getElementById('ssCartDrawerOverlay');
        if (!drawer) return;

        const bizNameEl = document.getElementById('ssCartBizName');
        if (bizNameEl && activeBusinessData) {
            bizNameEl.textContent = activeBusinessData.businessName || "Multi Ideas SV";
        }

        renderCartDrawerItems();
        drawer.classList.add('active');
    };

    window.closeSensunCart = function() {
        const drawer = document.getElementById('ssCartDrawerOverlay');
        if (drawer) drawer.classList.remove('active');
    };

    function renderCartDrawerItems() {
        const body = document.getElementById('ssCartDrawerBody');
        const checkoutBox = document.getElementById('ssCartCheckoutBox');
        const totalAmountEl = document.getElementById('ssCartTotalAmount');
        if (!body) return;

        if (cart.length === 0) {
            body.innerHTML = `
                <div class="ss-cart-empty">
                    <div style="font-size: 48px; margin-bottom: 12px;">🛒</div>
                    <h4 style="margin: 0; color: #1e293b; font-size: 1.05rem;">Tu carrito está vacío</h4>
                    <p style="margin: 6px 0 0 0; font-size: 0.82rem; color: #64748b;">Explora el catálogo y añade los productos o servicios que necesites.</p>
                </div>
            `;
            if (checkoutBox) checkoutBox.style.display = "none";
            return;
        }

        if (checkoutBox) checkoutBox.style.display = "flex";

        let totalGeneral = 0;
        let html = '';

        cart.forEach((it, idx) => {
            totalGeneral += (it.itemTotal || 0);

            let optionsHtml = '';
            if (it.variant) {
                optionsHtml += `<div class="ss-cart-item-pill">🔹 <b>Opción:</b> ${it.variant.name} ($${parseFloat(it.variant.price).toFixed(2)})</div>`;
            }
            if (Array.isArray(it.extras) && it.extras.length > 0) {
                it.extras.forEach(ex => {
                    optionsHtml += `<div class="ss-cart-item-pill">➕ <b>Extra:</b> ${ex.name} (+$${parseFloat(ex.price).toFixed(2)})</div>`;
                });
            }

            html += `
                <div class="ss-cart-item-card">
                    <div class="ss-cart-item-header">
                        ${it.imageUrl ? `<img src="${it.imageUrl}" class="ss-cart-item-thumb" alt="${it.name}">` : `<div class="ss-cart-item-thumb" style="display:flex;align-items:center;justify-content:center;font-size:20px;">📦</div>`}
                        <div class="ss-cart-item-details">
                            <h4>${it.name}</h4>
                            ${optionsHtml}
                        </div>
                        <button type="button" class="ss-cart-btn-trash" onclick="window.removeCartItemAt(${idx})" title="Eliminar ítem">🗑️</button>
                    </div>

                    <div class="ss-cart-item-footer">
                        <span class="ss-cart-item-price">$${(it.itemTotal || 0).toFixed(2)}</span>
                        <div class="ss-config-qty-ctrl">
                            <button type="button" class="ss-config-qty-btn" style="width:26px;height:26px;" onclick="window.changeCartItemQty(${idx}, -1)">-</button>
                            <span class="ss-config-qty-val" style="width:28px;font-size:0.82rem;">${it.quantity}</span>
                            <button type="button" class="ss-config-qty-btn" style="width:26px;height:26px;" onclick="window.changeCartItemQty(${idx}, 1)">+</button>
                        </div>
                    </div>
                </div>
            `;
        });

        body.innerHTML = html;
        if (totalAmountEl) totalAmountEl.textContent = `$${totalGeneral.toFixed(2)}`;
    }

    window.changeCartItemQty = function(idx, delta) {
        if (!cart[idx]) return;
        const newQty = (cart[idx].quantity || 1) + delta;
        if (newQty <= 0) {
            cart.splice(idx, 1);
        } else {
            cart[idx].quantity = newQty;
            const unitWithExtras = (cart[idx].unitPrice || 0) + (cart[idx].extras || []).reduce((a, b) => a + (parseFloat(b.price) || 0), 0);
            cart[idx].itemTotal = unitWithExtras * newQty;
        }
        saveCart();
        renderCartDrawerItems();
    };

    window.removeCartItemAt = function(idx) {
        if (!cart[idx]) return;
        cart.splice(idx, 1);
        saveCart();
        renderCartDrawerItems();
        showToast("🗑️ Ítem eliminado del carrito");
    };

    window.clearSensunCart = function() {
        if (cart.length === 0) return;
        if (confirm("¿Deseas vaciar todos los productos del carrito?")) {
            cart = [];
            saveCart();
            renderCartDrawerItems();
            showToast("🛒 Carrito vaciado");
        }
    };

    // Compilar y Enviar Pedido a WhatsApp con la Plantilla Oficial
    window.sendWhatsAppCartOrder = function() {
        if (cart.length === 0) return;

        const bizName = (activeBusinessData && activeBusinessData.businessName) || "Multi Ideas SV";
        const phone = (activeBusinessData && (activeBusinessData.businessPhone || activeBusinessData.whatsapp)) || "50372359113";
        const cleanPhone = phone.replace(/[^0-9]/g, "");

        const custName = (document.getElementById('ssCartCustomerName') ? document.getElementById('ssCartCustomerName').value.trim() : "");
        const custNotes = (document.getElementById('ssCartCustomerNotes') ? document.getElementById('ssCartCustomerNotes').value.trim() : "");

        const totalItemsCount = cart.reduce((acc, it) => acc + (it.quantity || 1), 0);
        const totalPrice = cart.reduce((acc, it) => acc + (it.itemTotal || 0), 0);

        // Estructura oficial requerida de WhatsApp
        let msg = `Hola *${bizName}*, vi su catálogo en Sensun Shop 🧡\n\n`;
        msg += `🛒 *RESUMEN DE MI PEDIDO (${totalItemsCount} artículos):*\n`;
        msg += `─────────────────────────\n`;

        cart.forEach((it, idx) => {
            msg += `${idx + 1}️⃣ *${it.name}* (x${it.quantity})\n`;
            if (it.variant) {
                msg += `   🔹 *Opción:* ${it.variant.name} ($${parseFloat(it.variant.price).toFixed(2)})\n`;
            }
            if (Array.isArray(it.extras) && it.extras.length > 0) {
                it.extras.forEach(ex => {
                    msg += `   ➕ *Extra:* ${ex.name} (+${parseFloat(ex.price).toFixed(2)})\n`;
                });
            }
            msg += `   💵 *Subtotal:* $${(it.itemTotal || 0).toFixed(2)}\n\n`;
        });

        msg += `─────────────────────────\n`;
        msg += `📦 *Cantidad total:* ${totalItemsCount} ${totalItemsCount === 1 ? 'artículo' : 'artículos'}\n`;
        msg += `💰 *Total estimado:* $${totalPrice.toFixed(2)}\n\n`;

        if (custName) {
            msg += `👤 *Cliente:* ${custName}\n`;
        }
        if (custNotes) {
            msg += `📝 *Notas:* ${custNotes}\n\n`;
        }

        msg += `¿Me podrían brindar más información para completar el pedido?`;

        const wspUrl = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${encodeURIComponent(msg)}`;
        window.open(wspUrl, '_blank');
    };

    // Handlers Globales de Pestañas y Búsqueda
    window.setSensunCatalogFilter = function(filter) {
        currentFilter = filter;
        document.querySelectorAll('.ss-cat-tab-btn').forEach(btn => {
            if (btn.getAttribute('data-filter') === filter) {
                btn.classList.add('active');
            } else {
                btn.classList.remove('active');
            }
        });
        renderCatalogGrid();
    };

    window.handleSensunCatalogSearch = function(query) {
        currentSearch = query || "";
        renderCatalogGrid();
    };

    // Método principal: Abre el catálogo para un negocio específico
    window.openSensunCatalogModal = async function(bizData) {
        if (!bizData) return;
        const overlay = ensureModalDOM();
        
        activeBusinessData = bizData;
        const catalogUid = bizData.catalogUid || (bizData.businessId === 'emp-002' ? 'PyVEtkbRXJgHyW3hEfjmMxS9e682' : '');
        activeCatalogUid = catalogUid;

        // Cargar Carrito guardado
        loadCart();

        // Actualizar textos de cabecera
        const titleEl = document.getElementById('ssCatModalTitle');
        const avatarEl = document.getElementById('ssCatModalAvatar');
        const linkEl = document.getElementById('ssCatModalDirectLink');

        if (titleEl) titleEl.textContent = `${bizData.businessName || 'Negocio'} — Catálogo en Vivo`;
        
        if (avatarEl) {
            if (bizData.businessImg) {
                avatarEl.innerHTML = `<img src="${bizData.businessImg}" alt="${bizData.businessName}">`;
            } else {
                avatarEl.innerHTML = `🛍️`;
            }
        }

        // URL directa a pantalla completa
        const directUrl = bizData.catalogUrl || (catalogUid ? `https://multiideassv.com/wolftrack.html?uid=${catalogUid}` : '#');
        if (linkEl) linkEl.href = directUrl;

        // Mostrar Modal
        overlay.classList.add('active');
        document.body.style.overflow = 'hidden';

        // Mostrar estado de carga
        const bodyEl = document.getElementById('ssCatBody');
        if (bodyEl) {
            bodyEl.innerHTML = `
                <div class="ss-cat-loading-state">
                    <div class="ss-cat-spinner"></div>
                    <p style="font-weight: 600; color: #1e293b;">Sincronizando inventario en tiempo real con WolfTrack...</p>
                    <small style="color: #94a3b8; font-size: 0.78rem;">Consultando nodo: wolftrack/materials/${catalogUid}</small>
                </div>
            `;
        }

        // Obtener ítems en vivo
        currentFilter = "all";
        currentSearch = "";
        
        cachedMaterials = await fetchWolfTrackMaterials(catalogUid);
        renderCatalogGrid();
    };

    // Cierra el catálogo
    window.closeSensunCatalogModal = function() {
        const overlay = document.getElementById('sensunCatalogModalOverlay');
        if (overlay) {
            overlay.classList.remove('active');
            document.body.style.overflow = '';
        }
    };
})();
