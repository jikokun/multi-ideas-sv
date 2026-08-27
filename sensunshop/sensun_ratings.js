// ==========================================================================
// SISTEMA DE CALIFICACIÓN POR ESTRELLAS - SENSUN SHOP
// ==========================================================================
import { 
    auth, 
    rtdb, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile,
    GoogleAuthProvider,
    signInWithPopup,
    signInWithRedirect,
    getRedirectResult,
    getAdditionalUserInfo,
    signOut
} from "../firebase-config.js";
import { ref, set, get, onValue, push, remove, update } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// Estilos dinámicos para las estrellas y el modal
const styles = `
    .star-rating-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 8px;
        padding: 20px;
        background: #121724;
        border: 1px solid rgba(255, 255, 255, 0.05);
        border-radius: 16px;
        width: 100%;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
    }
    .stars-row {
        display: flex;
        gap: 6px;
    }
    .star-btn {
        background: none;
        border: none;
        cursor: pointer;
        padding: 0;
        color: #4a5568;
        transition: transform 0.2s ease, color 0.2s ease;
    }
    .star-btn.interactive:hover {
        transform: scale(1.15);
    }
    .star-btn.filled {
        color: #ffb703;
        filter: drop-shadow(0 0 5px rgba(255, 183, 3, 0.4));
    }
    .star-btn.user-filled {
        color: #f39c12;
        filter: drop-shadow(0 0 5px rgba(243, 156, 18, 0.4));
    }
    .rating-text {
        font-size: 0.9rem;
        color: #a0aec0;
        font-weight: 500;
    }
    .rating-helper {
        font-size: 0.78rem;
        color: #718096;
    }
    .rating-helper a {
        color: #f39c12;
        text-decoration: underline;
        cursor: pointer;
    }

    /* Modal de Login de Respaldo */
    .rating-auth-modal {
        position: fixed;
        inset: 0;
        z-index: 25000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 13, 20, 0.85);
        backdrop-filter: blur(10px);
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s ease;
    }
    .rating-auth-modal.open {
        opacity: 1;
        pointer-events: auto;
    }
    .rating-auth-card {
        background: #121724;
        border: 1px solid rgba(255, 255, 255, 0.08);
        border-radius: 20px;
        padding: 30px;
        max-width: 400px;
        width: 100%;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
        position: relative;
        color: #fff;
    }
    .rating-auth-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        color: #a0aec0;
        font-size: 1.5rem;
        cursor: pointer;
    }
    @media (max-width: 480px) {
        .rating-auth-card {
            padding: 20px 15px;
            border-radius: 14px;
        }
    }

    /* Adaptación a Modo Claro */
    body.light-theme .star-rating-container:not(.compact),
    .light-theme .star-rating-container:not(.compact) {
        background: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        color: #1a202c !important;
    }
    body.light-theme .star-rating-container.compact,
    .light-theme .star-rating-container.compact {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
    }
    body.light-theme .rating-text,
    .light-theme .rating-text {
        color: #4a5568 !important;
    }
    body.light-theme .rating-auth-card,
    .light-theme .rating-auth-card {
        background: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.1) !important;
        color: #1a202c !important;
    }
    body.light-theme .rating-auth-card h3,
    .light-theme .rating-auth-card h3 {
        color: #f39c12 !important;
    }
    body.light-theme .rating-auth-card p,
    body.light-theme .rating-auth-card label,
    .light-theme .rating-auth-card p,
    .light-theme .rating-auth-card label {
        color: #4a5568 !important;
    }
    body.light-theme .rating-auth-card input,
    .light-theme .rating-auth-card input {
        background: #f7fafc !important;
        border: 1px solid #cbd5e0 !important;
        color: #1a202c !important;
    }
    body.light-theme .rating-auth-card button[type="submit"],
    .light-theme .rating-auth-card button[type="submit"] {
        background: #f39c12 !important;
        color: #ffffff !important;
    }
    body.light-theme .rating-auth-close,
    .light-theme .rating-auth-close {
        color: #4a5568 !important;
    }

    /* Estilos del botón de favoritos flotante */
    .favorite-toggle-btn {
        position: absolute;
        top: 12px;
        right: 12px;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(10, 13, 20, 0.75);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.1);
        color: rgba(255, 255, 255, 0.55);
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
        z-index: 10;
        padding: 0;
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.3);
    }
    .favorite-toggle-btn:hover {
        transform: scale(1.1);
        background: rgba(10, 13, 20, 0.9);
        border-color: rgba(255, 183, 3, 0.6);
        color: rgba(255, 255, 255, 0.9);
    }
    .favorite-toggle-btn.is-favorite {
        color: #ffb703 !important;
        filter: drop-shadow(0 0 6px rgba(255, 183, 3, 0.6));
        border-color: rgba(255, 183, 3, 0.8);
    }
    .favorite-toggle-btn svg {
        transition: transform 0.2s ease;
        pointer-events: none;
    }
    .favorite-toggle-btn:active svg {
        transform: scale(0.85);
    }

    /* Contenedor compacto de favoritos */
    .favoritos-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)) !important;
        gap: 20px !important;
        width: 100% !important;
        margin-top: 20px !important;
    }
    .favorito-compact-card {
        background: rgba(18, 22, 32, 0.6);
        backdrop-filter: blur(15px);
        -webkit-backdrop-filter: blur(15px);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 16px;
        padding: 20px 15px;
        display: flex;
        flex-direction: column;
        align-items: center;
        text-align: center;
        justify-content: space-between;
        gap: 12px;
        position: relative;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2);
        transition: border-color 0.3s ease, transform 0.3s ease, box-shadow 0.3s ease;
        height: 100%;
        min-height: 190px;
        width: 100% !important;
        max-width: 175px !important;
        justify-self: center;
    }
    .favorito-compact-card:hover {
        transform: translateY(-3px);
        border-color: var(--ss-orange, #f39c12);
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3), 0 0 15px rgba(232, 98, 26, 0.1);
    }
    .favorito-compact-logo {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        background: rgba(0, 0, 0, 0.25);
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: hidden;
        flex-shrink: 0;
        border: 1px solid rgba(255, 255, 255, 0.05);
    }
    .favorito-compact-logo img {
        width: 100%;
        height: 100%;
        object-fit: contain;
        max-height: 90%;
        max-width: 90%;
    }
    .favorito-compact-info {
        width: 100%;
        min-width: 0;
        display: flex;
        flex-direction: column;
        align-items: center;
    }
    .favorito-compact-info h4 {
        font-size: 0.95rem;
        font-weight: 600;
        color: #ffffff;
        margin: 0 0 4px 0;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
    }
    .favorito-compact-info span.category {
        font-size: 0.72rem;
        color: var(--text-gray, #a0aec0);
        text-transform: uppercase;
        letter-spacing: 0.5px;
        font-weight: 500;
        display: block;
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        width: 100%;
    }
    .favorito-compact-actions {
        display: flex;
        gap: 8px;
        margin-top: 5px;
        justify-content: center;
        width: 100%;
    }
    .btn-compact-action {
        width: 34px;
        height: 34px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #ffffff;
        cursor: pointer;
        transition: all 0.2s ease;
        border: none;
    }
    .btn-compact-action.wsp {
        background: #25d366;
    }
    .btn-compact-action.wsp:hover {
        background: #20ba5a;
        box-shadow: 0 0 10px rgba(37, 211, 102, 0.4);
    }
    .btn-compact-action.loc {
        background: #ea4335;
    }
    .btn-compact-action.loc:hover {
        background: #d63022;
        box-shadow: 0 0 10px rgba(234, 67, 53, 0.4);
    }
    .btn-compact-remove {
        position: absolute;
        top: 10px;
        right: 10px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.3);
        cursor: pointer;
        font-size: 1.1rem;
        display: flex;
        align-items: center;
        justify-content: center;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        transition: all 0.2s ease;
    }
    .btn-compact-remove:hover {
        color: #ea4335;
        background: rgba(234, 67, 53, 0.1);
    }

    /* Adaptabilidad de favoritos en móvil (2 columnas) */
    @media (max-width: 768px) {
        .favoritos-grid {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 12px !important;
        }
        .favorito-compact-card {
            padding: 15px 10px !important;
            min-height: 160px !important;
            gap: 8px !important;
            max-width: 100% !important;
        }
        .favorito-compact-logo {
            width: 48px !important;
            height: 48px !important;
        }
        .favorito-compact-info h4 {
            font-size: 0.85rem !important;
        }
        .favorito-compact-info span.category {
            font-size: 0.65rem !important;
        }
        .btn-compact-action {
            width: 30px !important;
            height: 30px !important;
        }
        .btn-compact-remove {
            top: 6px !important;
            right: 6px !important;
        }
    }
    
    /* Adaptaciones de Favoritos a Modo Claro */
    body.light-theme .favorito-compact-card {
        background: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.05) !important;
    }
    body.light-theme .favorito-compact-info h4 {
        color: #1a202c !important;
    }
    body.light-theme .favorito-compact-card:hover {
        border-color: var(--ss-orange, #f39c12) !important;
    }
    body.light-theme .favorite-toggle-btn {
        background: rgba(255, 255, 255, 0.9);
        border: 1px solid rgba(0, 0, 0, 0.08);
        color: rgba(0, 0, 0, 0.4);
        box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    }
    body.light-theme .favorite-toggle-btn:hover {
        background: #ffffff;
        color: rgba(0, 0, 0, 0.8);
    }

    /* Estilos del popup de Favoritos en tiras verticales */
    .favorito-list-item {
        transition: all 0.25s ease;
    }
    .favorito-list-item:hover {
        background: rgba(255, 255, 255, 0.06) !important;
        border-color: rgba(255, 183, 3, 0.2) !important;
    }
    .btn-list-remove:hover {
        color: #e74c3c !important;
    }
    body.light-theme .favorito-list-item {
        background: rgba(0, 0, 0, 0.02) !important;
        border-color: rgba(0, 0, 0, 0.06) !important;
    }
    body.light-theme .favorito-list-item h4 {
        color: #1a202c !important;
    }

    /* Estilos del Widget de Calificación y Botón Circular de Comentarios Parallel */
    .sensun-rating-widget {
        width: 100% !important;
        margin: 6px 0 10px 0 !important;
        display: block !important;
    }
    .star-rating-container.compact {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        justify-content: space-between !important;
        width: 100% !important;
        background: transparent !important;
        border: none !important;
        padding: 0 !important;
        box-shadow: none !important;
        gap: 8px !important;
    }
    .stars-rating-left-group {
        display: flex !important;
        flex-direction: row !important;
        align-items: center !important;
        gap: 6px !important;
        flex-wrap: nowrap !important;
        min-width: 0 !important;
    }
    .star-rating-container.compact .stars-row {
        display: flex !important;
        gap: 3px !important;
        align-items: center !important;
    }
    .star-rating-container.compact .rating-text {
        font-size: 0.78rem !important;
        color: #a0aec0 !important;
        font-weight: 600 !important;
        white-space: nowrap !important;
        margin: 0 !important;
    }
    .compact-comment-circle-btn {
        position: relative !important;
        width: 32px !important;
        height: 32px !important;
        border-radius: 50% !important;
        background: rgba(243, 156, 18, 0.12) !important;
        border: 1px solid rgba(243, 156, 18, 0.3) !important;
        color: #f39c12 !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        cursor: pointer !important;
        transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1) !important;
        padding: 0 !important;
        flex-shrink: 0 !important;
        outline: none !important;
        margin-left: auto !important;
    }
    .compact-comment-circle-btn:hover {
        transform: scale(1.12) !important;
        background: rgba(243, 156, 18, 0.25) !important;
        border-color: rgba(243, 156, 18, 0.6) !important;
        box-shadow: 0 0 12px rgba(243, 156, 18, 0.35) !important;
    }
    .comment-micro-badge {
        position: absolute !important;
        top: -4px !important;
        right: -4px !important;
        background: #f39c12 !important;
        color: #0a0d14 !important;
        font-size: 0.65rem !important;
        font-weight: 800 !important;
        min-width: 16px !important;
        height: 16px !important;
        border-radius: 8px !important;
        display: flex !important;
        align-items: center !important;
        justify-content: center !important;
        padding: 0 4px !important;
        box-shadow: 0 2px 5px rgba(0, 0, 0, 0.4) !important;
        border: 1px solid #121724 !important;
        line-height: 1 !important;
    }
    body.light-theme .compact-comment-circle-btn {
        background: #fffaf0 !important;
        border-color: #fbd38d !important;
        color: #dd6b20 !important;
    }
    body.light-theme .compact-comment-circle-btn:hover {
        background: #feebc8 !important;
        border-color: #f6ad55 !important;
    }
    body.light-theme .comment-micro-badge {
        background: #dd6b20 !important;
        color: #ffffff !important;
        border-color: #ffffff !important;
    }

    .hidden-filter {
        display: none !important;
    }
    .negocios-grid .negocio-card:not(.hidden-filter), 
    .productos-grid .producto-card:not(.hidden-filter), 
    .catalogo-grid .producto-card:not(.hidden-filter),
    .catalogo-grid .negocio-card:not(.hidden-filter) {
        box-sizing: border-box !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
    }
    .productos-grid, .negocios-grid, .catalogo-grid {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        max-width: 1200px !important;
        gap: 24px !important;
        align-items: stretch !important;
        margin: 0 auto !important;
    }
    @media (max-width: 1024px) {
        .productos-grid, .negocios-grid, .catalogo-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
            gap: 20px !important;
        }
    }
    @media (max-width: 650px) {
        .productos-grid, .negocios-grid, .catalogo-grid {
            grid-template-columns: 1fr !important;
            gap: 16px !important;
        }
    }
    /* Normalización de Contenedor de Etiquetas (1 sola fila limpia tipo carrusel automático si son 4+ etiquetas) */
    .negocio-tags, .producto-tags {
        display: flex !important;
        flex-wrap: nowrap !important;
        overflow: hidden !important;
        gap: 6px !important;
        height: 30px !important;
        min-height: 30px !important;
        max-height: 30px !important;
        align-items: center !important;
        margin-bottom: 12px !important;
        position: relative !important;
        width: 100% !important;
    }
    .negocio-tags.has-carousel-tags, .producto-tags.has-carousel-tags {
        mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
        -webkit-mask-image: linear-gradient(to right, transparent 0%, black 6%, black 94%, transparent 100%);
    }
    .tags-track {
        display: flex !important;
        gap: 6px !important;
        width: max-content !important;
        align-items: center !important;
        will-change: transform;
    }
    .has-carousel-tags .tags-track {
        animation: tagsCarouselSlide 10s ease-in-out infinite alternate !important;
    }
    .has-carousel-tags:hover .tags-track {
        animation-play-state: paused !important;
    }
    @keyframes tagsCarouselSlide {
        0%, 25% {
            transform: translateX(0);
        }
        75%, 100% {
            transform: translateX(var(--tags-slide-dist, -60px));
        }
    }
    .negocio-tags .tag, .producto-tags .tag {
        white-space: nowrap !important;
        flex-shrink: 0 !important;
        cursor: pointer !important;
        transition: all 0.2s ease !important;
    }
    .negocio-tags .tag:hover, .producto-tags .tag:hover {
        background: rgba(243, 156, 18, 0.25) !important;
        border-color: rgba(243, 156, 18, 0.6) !important;
        color: #f39c12 !important;
        transform: translateY(-1px) !important;
    }
    /* Normalización de Descripciones (Exactamente 2 líneas para alinear títulos, estrellas y botones) */
    .negocio-card p, .producto-card p {
        display: -webkit-box !important;
        -webkit-line-clamp: 2 !important;
        -webkit-box-orient: vertical !important;
        overflow: hidden !important;
        min-height: 2.7em !important;
        margin-bottom: 15px !important;
    }

    /* Puntero interactivo para ampliar Ficha en la cartelera principal */
    #negocios-container .producto-card .producto-info h3,
    #negocios-container .producto-card .producto-info p {
        cursor: pointer !important;
        transition: color 0.2s ease, opacity 0.2s ease !important;
    }
    #negocios-container .producto-card .producto-info h3:hover {
        color: var(--ss-orange, #f39c12) !important;
    }
    #negocios-container .producto-card .producto-info p:hover {
        opacity: 0.88 !important;
    }

    /* Modal de Ficha Ampliada (Zoom / Vista Extendida) */
    .card-expand-modal-overlay {
        position: fixed;
        inset: 0;
        z-index: 10000;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(8, 10, 15, 0.85);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-expand-modal-overlay.active {
        display: flex !important;
        opacity: 1 !important;
        pointer-events: auto !important;
    }
    .card-expand-modal-card {
        background: #121724;
        border: 1px solid rgba(243, 156, 18, 0.35);
        border-radius: 20px;
        max-width: 520px;
        width: 100%;
        max-height: 90vh;
        overflow-y: auto;
        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.75), 0 0 30px rgba(243, 156, 18, 0.2);
        position: relative;
        padding: 24px;
        color: #fff;
        transform: scale(0.92) translateY(15px);
        transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .card-expand-modal-overlay.active .card-expand-modal-card {
        transform: scale(1) translateY(0);
    }
    .card-expand-close-btn {
        position: absolute;
        top: 14px;
        left: 14px;
        right: auto;
        width: 36px;
        height: 36px;
        border-radius: 50%;
        background: rgba(10, 13, 20, 0.85);
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: rgba(255, 255, 255, 0.9);
        font-size: 1.4rem;
        line-height: 1;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 9999 !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
        pointer-events: auto !important;
    }
    .card-expand-close-btn:hover {
        background: rgba(234, 67, 53, 0.95);
        color: #ffffff;
        border-color: rgba(234, 67, 53, 1);
        transform: scale(1.1);
    }
    .card-expand-modal-card .producto-card,
    .card-expand-modal-card .negocio-card {
        background: transparent !important;
        border: none !important;
        box-shadow: none !important;
        padding: 0 !important;
        margin: 0 !important;
    }
    .card-expand-modal-card p {
        display: block !important;
        -webkit-line-clamp: unset !important;
        line-clamp: unset !important;
        overflow: visible !important;
        white-space: normal !important;
        font-size: 0.96rem !important;
        line-height: 1.65 !important;
        color: #cbd5e0 !important;
        margin-bottom: 20px !important;
        min-height: auto !important;
    }
    .card-expand-modal-card h3 {
        font-size: 1.4rem !important;
        font-weight: 700 !important;
        margin-bottom: 12px !important;
        color: #ffffff !important;
        white-space: normal !important;
    }
    body.light-theme .card-expand-modal-card {
        background: #ffffff !important;
        border-color: rgba(0, 0, 0, 0.12) !important;
        color: #1a202c !important;
    }
    body.light-theme .card-expand-modal-card h3 {
        color: #1a202c !important;
    }
    body.light-theme .card-expand-modal-card p {
        color: #4a5568 !important;
    }

    @media (max-width: 600px) {
        .card-expand-modal-overlay {
            padding: 12px !important;
        }
        .card-expand-modal-card {
            padding: 16px !important;
            border-radius: 16px !important;
            max-height: 92vh !important;
            -webkit-overflow-scrolling: touch !important;
        }
        .card-expand-close-btn {
            top: 10px !important;
            left: 10px !important;
            width: 32px !important;
            height: 32px !important;
            font-size: 1.2rem !important;
        }
        .card-expand-modal-card h3 {
            font-size: 1.22rem !important;
            margin-top: 8px !important;
        }
        .card-expand-modal-card p {
            font-size: 0.88rem !important;
            line-height: 1.5 !important;
        }
    }

    /* Puntero e interacción en Fotos / Logos para Ampliación en el catálogo */
    .producto-img img, .producto-foto {
        cursor: pointer !important;
        transition: transform 0.25s ease, opacity 0.25s ease !important;
    }
    .producto-img:hover img {
        transform: scale(1.03);
    }
    /* En el mostrador de Novedades / Recién Llegados la foto NO es expandible */
    .slider-card-img img, .slider-card-img {
        cursor: default !important;
        pointer-events: none !important;
    }
    /* El nombre en novedades es interactivo y lleva al negocio */
    .slider-card-content h3, .slider-card h3 {
        cursor: pointer !important;
        transition: color 0.2s ease, text-shadow 0.2s ease !important;
    }
    .slider-card-content h3:hover, .slider-card h3:hover {
        color: var(--ss-orange, #f39c12) !important;
    }

    /* Modal de Visualización de Imagen Ampliada (Lightbox) */
    .image-lightbox-modal {
        position: fixed;
        inset: 0;
        z-index: 20000;
        display: none;
        align-items: center;
        justify-content: center;
        background: rgba(5, 7, 12, 0.92);
        backdrop-filter: blur(16px);
        -webkit-backdrop-filter: blur(16px);
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .image-lightbox-modal.active {
        display: flex !important;
        opacity: 1 !important;
        pointer-events: auto !important;
    }
    .image-lightbox-container {
        position: relative;
        max-width: 95vw;
        max-height: 90vh;
        display: flex;
        align-items: center;
        justify-content: center;
        transform: scale(0.9) translateY(10px);
        transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .image-lightbox-modal.active .image-lightbox-container {
        transform: scale(1) translateY(0);
    }
    .image-lightbox-img {
        max-width: 90vw;
        max-height: 85vh;
        object-fit: contain;
        border-radius: 14px;
        box-shadow: 0 25px 60px rgba(0, 0, 0, 0.85), 0 0 40px rgba(243, 156, 18, 0.25);
        border: 1px solid rgba(255, 255, 255, 0.12);
        background: rgba(18, 22, 32, 0.85);
    }
    .image-lightbox-close {
        position: absolute;
        top: -16px;
        right: -16px;
        width: 40px;
        height: 40px;
        border-radius: 50%;
        background: rgba(18, 22, 32, 0.95);
        border: 1px solid rgba(255, 255, 255, 0.25);
        color: #ffffff;
        font-size: 1.4rem;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s ease;
        z-index: 10;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.5);
    }
    .image-lightbox-close:hover {
        background: #ea4335;
        border-color: #ea4335;
        transform: scale(1.1);
    }
    @media (max-width: 600px) {
        .image-lightbox-close {
            top: -12px;
            right: -10px;
            width: 36px;
            height: 36px;
            font-size: 1.2rem;
        }
    }

    /* Modal de Comentarios Anónimos */
    .comments-modal {
        position: fixed;
        inset: 0;
        z-index: 15000;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(10, 13, 20, 0.82);
        backdrop-filter: blur(12px);
        -webkit-backdrop-filter: blur(12px);
        padding: 20px;
        opacity: 0;
        pointer-events: none;
        transition: opacity 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .comments-modal.active {
        opacity: 1;
        pointer-events: auto;
    }
    .comments-modal-card {
        background: #121724;
        border: 1px solid rgba(243, 156, 18, 0.25);
        border-radius: 20px;
        width: 100%;
        max-width: 520px;
        max-height: 85vh;
        display: flex;
        flex-direction: column;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(243, 156, 18, 0.15);
        position: relative;
        overflow: hidden;
        animation: commentsModalSlideUp 0.3s ease-out forwards;
    }
    @keyframes commentsModalSlideUp {
        from { transform: translateY(20px) scale(0.97); }
        to { transform: translateY(0) scale(1); }
    }
    .comments-modal-close {
        position: absolute;
        top: 16px;
        right: 16px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 50%;
        width: 32px;
        height: 32px;
        color: #a0aec0;
        font-size: 1.3rem;
        display: flex;
        align-items: center;
        justify-content: center;
        cursor: pointer;
        transition: all 0.2s;
        z-index: 5;
    }
    .comments-modal-close:hover {
        background: rgba(234, 67, 53, 0.2);
        color: #ea4335;
        border-color: rgba(234, 67, 53, 0.4);
    }
    .comments-modal-header {
        padding: 20px 24px 16px;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        display: flex;
        align-items: center;
        gap: 14px;
    }
    .comments-header-icon {
        width: 44px;
        height: 44px;
        border-radius: 12px;
        background: rgba(243, 156, 18, 0.15);
        border: 1px solid rgba(243, 156, 18, 0.3);
        color: #f39c12;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.3rem;
        flex-shrink: 0;
    }
    .comments-modal-header h3 {
        font-size: 1.15rem;
        font-weight: 700;
        color: #ffffff;
        margin: 0;
        line-height: 1.3;
    }
    .comments-modal-header p {
        font-size: 0.78rem;
        color: #a0aec0;
        margin: 3px 0 0;
    }
    .comments-list-container {
        padding: 16px 24px;
        overflow-y: auto;
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 12px;
        min-height: 150px;
        max-height: 420px;
    }
    .comments-list-container::-webkit-scrollbar {
        width: 6px;
    }
    .comments-list-container::-webkit-scrollbar-thumb {
        background: rgba(243, 156, 18, 0.3);
        border-radius: 10px;
    }
    .comment-item {
        background: rgba(255, 255, 255, 0.03);
        border: 1px solid rgba(255, 255, 255, 0.06);
        border-radius: 14px;
        padding: 14px 16px;
        display: flex;
        flex-direction: column;
        gap: 8px;
        position: relative;
        transition: all 0.2s ease;
    }
    .comment-item.own-comment {
        background: rgba(243, 156, 18, 0.05);
        border-color: rgba(243, 156, 18, 0.2);
    }
    .comment-item-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .comment-author-info {
        display: flex;
        align-items: center;
        gap: 8px;
    }
    .comment-avatar {
        width: 28px;
        height: 28px;
        border-radius: 50%;
        background: linear-gradient(135deg, #4a5568, #2d3748);
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.85rem;
        color: #e2e8f0;
    }
    .comment-author-name {
        font-size: 0.85rem;
        font-weight: 600;
        color: #e2e8f0;
    }
    .own-badge {
        font-size: 0.68rem;
        background: rgba(243, 156, 18, 0.2);
        color: #f39c12;
        padding: 2px 6px;
        border-radius: 6px;
        border: 1px solid rgba(243, 156, 18, 0.3);
        font-weight: 600;
    }
    .comment-time {
        font-size: 0.72rem;
        color: #718096;
    }
    .comment-text {
        font-size: 0.88rem;
        color: #cbd5e0;
        line-height: 1.45;
        white-space: pre-wrap;
        word-break: break-word;
    }
    .comment-actions {
        display: flex;
        gap: 8px;
        margin-top: 4px;
        align-self: flex-end;
    }
    .btn-comment-action {
        background: none;
        border: none;
        font-size: 0.75rem;
        font-weight: 500;
        cursor: pointer;
        padding: 3px 8px;
        border-radius: 6px;
        transition: all 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 4px;
    }
    .btn-comment-action.edit {
        color: #f39c12;
        background: rgba(243, 156, 18, 0.1);
    }
    .btn-comment-action.edit:hover {
        background: rgba(243, 156, 18, 0.25);
    }
    .btn-comment-action.delete {
        color: #e74c3c;
        background: rgba(231, 76, 60, 0.1);
    }
    .btn-comment-action.delete:hover {
        background: rgba(231, 76, 60, 0.25);
    }
    .comments-form-container {
        padding: 16px 24px 20px;
        border-top: 1px solid rgba(255, 255, 255, 0.08);
        background: rgba(0, 0, 0, 0.15);
    }
    .comments-form {
        display: flex;
        flex-direction: column;
        gap: 10px;
    }
    .comment-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }
    .comment-textarea {
        width: 100%;
        min-height: 48px;
        max-height: 100px;
        background: rgba(255, 255, 255, 0.05);
        border: 1px solid rgba(255, 255, 255, 0.12);
        border-radius: 12px;
        padding: 10px 14px;
        color: #ffffff;
        font-size: 0.88rem;
        font-family: inherit;
        resize: none;
        outline: none;
        transition: border-color 0.2s, box-shadow 0.2s;
    }
    .comment-textarea:focus {
        border-color: #f39c12;
        box-shadow: 0 0 10px rgba(243, 156, 18, 0.25);
    }
    .editing-banner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        background: rgba(243, 156, 18, 0.15);
        border: 1px solid rgba(243, 156, 18, 0.3);
        border-radius: 8px;
        padding: 6px 12px;
        font-size: 0.78rem;
        color: #f39c12;
    }
    .btn-cancel-edit {
        background: none;
        border: none;
        color: #a0aec0;
        cursor: pointer;
        font-size: 0.75rem;
        text-decoration: underline;
    }
    .comments-form-bottom {
        display: flex;
        align-items: center;
        justify-content: space-between;
    }
    .anon-notice {
        font-size: 0.73rem;
        color: #718096;
        display: flex;
        align-items: center;
        gap: 4px;
    }
    .btn-send-comment {
        background: linear-gradient(135deg, #f39c12, #d35400);
        color: #ffffff;
        border: none;
        border-radius: 10px;
        padding: 8px 18px;
        font-size: 0.85rem;
        font-weight: 600;
        cursor: pointer;
        transition: transform 0.2s, box-shadow 0.2s;
        display: inline-flex;
        align-items: center;
        gap: 6px;
    }
    .btn-send-comment:hover {
        transform: translateY(-1px);
        box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
    }
    .comment-login-prompt {
        text-align: center;
        padding: 12px;
        background: rgba(255, 255, 255, 0.03);
        border: 1px dashed rgba(255, 255, 255, 0.15);
        border-radius: 12px;
        color: #a0aec0;
        font-size: 0.85rem;
    }
    .comment-login-prompt button {
        background: #f39c12;
        color: #fff;
        border: none;
        border-radius: 8px;
        padding: 6px 14px;
        font-weight: 600;
        margin-left: 8px;
        cursor: pointer;
        transition: background 0.2s;
    }
    .comment-login-prompt button:hover {
        background: #e67e22;
    }

    /* Adaptación a Modo Claro para Modal de Comentarios */
    body.light-theme .comments-modal-card {
        background: #ffffff !important;
        border-color: rgba(0, 0, 0, 0.1) !important;
        box-shadow: 0 20px 50px rgba(0, 0, 0, 0.15) !important;
    }
    body.light-theme .comments-modal-close {
        background: rgba(0, 0, 0, 0.05) !important;
        color: #4a5568 !important;
        border-color: rgba(0, 0, 0, 0.08) !important;
    }
    body.light-theme .comments-modal-header {
        border-bottom-color: rgba(0, 0, 0, 0.08) !important;
    }
    body.light-theme .comments-modal-header h3 {
        color: #1a202c !important;
    }
    body.light-theme .comments-modal-header p {
        color: #718096 !important;
    }
    body.light-theme .comment-item {
        background: #f8fafc !important;
        border-color: #e2e8f0 !important;
    }
    body.light-theme .comment-item.own-comment {
        background: #fffaf0 !important;
        border-color: #feebc8 !important;
    }
    body.light-theme .comment-author-name {
        color: #2d3748 !important;
    }
    body.light-theme .comment-text {
        color: #4a5568 !important;
    }
    body.light-theme .comments-form-container {
        background: #f7fafc !important;
        border-top-color: #e2e8f0 !important;
    }
    body.light-theme .comment-textarea {
        background: #ffffff !important;
        border-color: #cbd5e0 !important;
        color: #1a202c !important;
    }
    body.light-theme .comment-login-prompt {
        background: #ffffff !important;
        border-color: #cbd5e0 !important;
        color: #4a5568 !important;
    }

    /* Estilos Premium de Ofertas y Promociones en Tiempo Real */
    .producto-card.has-active-offer,
    .negocio-card.has-active-offer,
    .slider-card.has-active-offer {
        border-color: rgba(243, 156, 18, 0.65) !important;
        box-shadow: 0 8px 25px rgba(243, 156, 18, 0.22), 0 0 15px rgba(232, 98, 26, 0.15) !important;
        position: relative;
    }
    .negocio-offer-badge {
        position: absolute;
        top: 12px;
        left: 12px;
        z-index: 10;
        display: inline-flex;
        align-items: center;
        gap: 5px;
        background: linear-gradient(135deg, #e8621a, #f39c12);
        color: #ffffff;
        font-size: 0.72rem;
        font-weight: 800;
        text-transform: uppercase;
        letter-spacing: 0.5px;
        padding: 4px 10px;
        border-radius: 20px;
        box-shadow: 0 4px 12px rgba(232, 98, 26, 0.45);
        animation: pulseOfferBadge 2.5s infinite ease-in-out;
        pointer-events: none;
    }
    @keyframes pulseOfferBadge {
        0%, 100% {
            transform: scale(1);
            box-shadow: 0 4px 12px rgba(232, 98, 26, 0.45);
        }
        50% {
            transform: scale(1.05);
            box-shadow: 0 6px 18px rgba(243, 156, 18, 0.7);
        }
    }
    .negocio-offer-banner {
        display: flex;
        align-items: center;
        gap: 8px;
        background: linear-gradient(90deg, rgba(232, 98, 26, 0.18), rgba(243, 156, 18, 0.1));
        border-left: 3px solid #f39c12;
        border-radius: 8px;
        padding: 8px 12px;
        margin: 10px 0 12px 0;
        color: #ffb703;
        font-size: 0.84rem;
        font-weight: 600;
        line-height: 1.35;
    }
    .negocio-offer-banner .offer-icon {
        font-size: 1rem;
        flex-shrink: 0;
    }
    .negocio-offer-banner .offer-text {
        flex: 1;
        color: #ffd166;
    }
    body.light-theme .negocio-offer-banner {
        background: linear-gradient(90deg, rgba(232, 98, 26, 0.12), rgba(243, 156, 18, 0.08));
        border-left-color: #d35400;
        color: #d35400;
    }
    body.light-theme .negocio-offer-banner .offer-text {
        color: #b7410e;
        font-weight: 700;
    }
`;

// Inyectar estilos en el documento
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

let currentUser = null;
let userFavorites = {};
let favoritesListener = null;

// Sincronizar UI de Favoritos (estrellas)
function syncFavoritesUI() {
    document.querySelectorAll(".favorite-toggle-btn").forEach(btn => {
        const businessId = btn.dataset.businessId;
        if (businessId && userFavorites[businessId]) {
            btn.classList.add("is-favorite");
        } else {
            btn.classList.remove("is-favorite");
        }
    });
}

// Inyectar botones de favoritos en las tarjetas estáticas
function injectFavoriteButtons() {
    const negocioCards = document.querySelectorAll(".negocio-card");
    negocioCards.forEach(card => {
        if (card.classList.contains("disponible")) return;
        if (card.querySelector(".favorite-toggle-btn")) return;

        const ratingWidget = card.querySelector(".sensun-rating-widget");
        const businessId = ratingWidget ? ratingWidget.dataset.businessId : card.id.toLowerCase();
        if (!businessId) return;

        const favBtn = document.createElement("button");
        favBtn.className = "favorite-toggle-btn";
        favBtn.dataset.businessId = businessId;
        favBtn.innerHTML = `
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
            </svg>
        `;
        
        // Asegurar que la tarjeta permita posicionamiento absoluto
        if (getComputedStyle(card).position === "static") {
            card.style.position = "relative";
        }

        favBtn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            toggleFavorite(businessId);
        });

        card.appendChild(favBtn);
    });
    syncFavoritesUI();
}

// Alternar favorito del usuario
async function toggleFavorite(businessId) {
    if (!currentUser) {
        openAuthModal();
        return;
    }

    const isFav = !!userFavorites[businessId];
    try {
        const favRef = ref(rtdb, `users/${currentUser.uid}/sensunshop_favorites/${businessId}`);
        await set(favRef, isFav ? null : true);
        console.log(`Favorito actualizado para ${businessId}: ${!isFav}`);
    } catch (error) {
        console.error("Error al guardar favorito:", error);
    }
}

// Configurar sincronización de favoritos
function setupFavoritesSync(user) {
    if (favoritesListener) {
        favoritesListener();
        favoritesListener = null;
    }

    userFavorites = {};
    window.userFavorites = userFavorites;

    if (user) {
        const favsRef = ref(rtdb, `users/${user.uid}/sensunshop_favorites`);
        favoritesListener = onValue(favsRef, (snapshot) => {
            userFavorites = snapshot.val() || {};
            window.userFavorites = userFavorites;
            syncFavoritesUI();

            if (typeof window.renderFavoritesView === "function") {
                window.renderFavoritesView(userFavorites);
            }
        });
    } else {
        syncFavoritesUI();
        if (typeof window.renderFavoritesView === "function") {
            window.renderFavoritesView({});
        }
    }
}

// Escuchar el estado de autenticación de Firebase
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    // Sincronizar favoritos del usuario
    setupFavoritesSync(user);

    // Inyectar botones de favoritos en la página actual
    injectFavoriteButtons();

    // Inyectar botones de comentarios en las tarjetas de la cartelera
    injectCommentButtons();

    // Inicializar carrusel automático para contenedores con 4+ etiquetas
    initTagsCarousel();

    // Actualizar formulario de comentarios si el modal está abierto
    renderCommentsForm();

    // Reinicializar todos los widgets de calificación que estén en la página (por ID o por clase)
    document.querySelectorAll("[id='sensun-rating-widget'], .sensun-rating-widget").forEach(widget => {
        initRatingWidget(widget);
    });
});

// Exponer funciones globales a window
window.toggleFavorite = toggleFavorite;
window.syncFavoritesUI = syncFavoritesUI;
window.injectFavoriteButtons = injectFavoriteButtons;
window.userFavorites = userFavorites;
window.injectCommentButtons = injectCommentButtons;
window.openCommentsModal = openCommentsModal;
window.closeCommentsModal = closeCommentsModal;

// Inicializar un widget de votación
function initRatingWidget(container) {
    const businessId = container.dataset.businessId;
    if (!businessId) return;

    const isCompact = container.dataset.compact === "true";

    // Crear estructura interna básica del widget
    if (isCompact) {
        container.innerHTML = `
            <div class="star-rating-container compact" style="background: transparent; border: none; padding: 4px 0; box-shadow: none; display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 10px;">
                <div class="stars-rating-left-group" style="display: flex; align-items: center; gap: 6px; flex-wrap: nowrap; min-width: 0;">
                    <div class="stars-row" style="display: flex; gap: 3px; align-items: center;">
                        <!-- Estrellas inyectadas por JS -->
                    </div>
                    <div class="rating-text" style="font-size: 0.75rem; color: #a0aec0; font-weight: 600; white-space: nowrap;">Cargando...</div>
                </div>
                <button type="button" class="compact-comment-circle-btn" data-business-id="${businessId}" title="Ver comentarios comunitarios">
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                    </svg>
                    <span class="comment-micro-badge">0</span>
                </button>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="star-rating-container" style="display: flex; flex-direction: column; gap: 8px; position: relative;">
                <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 2px;">Calificación del Negocio</h4>
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <div class="stars-row">
                        <!-- Estrellas inyectadas por JS -->
                    </div>
                    <button type="button" class="compact-comment-circle-btn" data-business-id="${businessId}" title="Ver comentarios comunitarios">
                        <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                            <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
                        </svg>
                        <span class="comment-micro-badge">0</span>
                    </button>
                </div>
                <div class="rating-text">Cargando calificación...</div>
                <div class="rating-helper"></div>
            </div>
        `;
    }

    // Configurar listener para el botón circular de comentarios
    const commentBtn = container.querySelector('.compact-comment-circle-btn');
    if (commentBtn) {
        const card = container.closest('.negocio-card, .slider-card') || container.parentElement;
        const titleEl = card ? card.querySelector('h3') : null;
        const titleText = titleEl ? titleEl.textContent.trim() : '';

        commentBtn.onclick = (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCommentsModal(businessId, titleText);
        };

        const countBadge = commentBtn.querySelector('.comment-micro-badge');
        const commentsRefNode = ref(rtdb, `comments/${businessId}`);
        onValue(commentsRefNode, (snapshot) => {
            const val = snapshot.val() || {};
            const count = Object.keys(val).length;
            if (countBadge) countBadge.textContent = count;
        });
    }

    const starsRow = container.querySelector(`.stars-row`);
    const ratingText = container.querySelector(`.rating-text`);
    const ratingHelper = container.querySelector(`.rating-helper`);

    // Cargar calificaciones en tiempo real desde Firebase RTDB
    const ratingsRef = ref(rtdb, `sensunshop/ratings/${businessId}`);
    onValue(ratingsRef, (snapshot) => {
        const ratingsData = snapshot.val() || {};
        const voters = Object.keys(ratingsData);
        const votesCount = voters.length;
        
        let sum = 0;
        let userVote = null;

        voters.forEach(uid => {
            const val = ratingsData[uid];
            sum += val;
            if (currentUser && uid === currentUser.uid) {
                userVote = val;
            }
        });

        const average = votesCount > 0 ? (sum / votesCount) : 0;

        // Renderizar las 5 estrellas
        starsRow.innerHTML = '';
        for (let i = 1; i <= 5; i++) {
            const isFilled = userVote ? (i <= userVote) : (i <= Math.round(average));
            const btnClass = `star-btn ${currentUser ? 'interactive' : ''} ${isFilled ? (userVote ? 'user-filled' : 'filled') : ''}`;
            
            const btn = document.createElement("button");
            btn.className = btnClass;
            btn.dataset.value = i;
            btn.innerHTML = `
                <svg width="${isCompact ? '18' : '28'}" height="${isCompact ? '18' : '28'}" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 .587l3.668 7.431 8.2 1.192-5.934 5.787 1.4 8.168L12 18.896l-7.334 3.857 1.4-8.168L.132 9.21l8.2-1.192L12 .587z"/>
                </svg>
            `;

            if (currentUser) {
                // Eventos de interactividad para usuarios logueados
                btn.addEventListener('click', () => submitVote(businessId, i));
                
                // Efecto hover para iluminar estrellas anteriores
                btn.addEventListener('mouseover', () => highlightStarsOnHover(starsRow, i));
                btn.addEventListener('mouseout', () => resetStarsHighlight(starsRow, userVote || Math.round(average), !!userVote));
            } else {
                // Si no está logueado, al dar clic abre el modal de login
                btn.addEventListener('click', () => openAuthModal());
            }

            starsRow.appendChild(btn);
        }

        // Actualizar textos
        if (votesCount > 0) {
            if (isCompact) {
                ratingText.textContent = `${average.toFixed(1)} ★ (${votesCount})`;
            } else {
                ratingText.textContent = `${average.toFixed(1)} de 5 estrellas (${votesCount} ${votesCount === 1 ? 'voto' : 'votos'})`;
            }
        } else {
            ratingText.textContent = isCompact ? `Sin votos` : `Sin calificaciones aún`;
        }

        if (!isCompact) {
            if (currentUser) {
                if (userVote) {
                    ratingHelper.innerHTML = `Tu calificación: <span style="color: #f39c12; font-weight: 600;">${userVote} estrellas</span> (puedes cambiarla)`;
                } else {
                    ratingHelper.textContent = "Haz clic en una estrella para votar";
                }
            } else {
                ratingHelper.innerHTML = `Debes <a onclick="openAuthModal()">iniciar sesión</a> para calificar.`;
            }
        }
    });
}

// Guardar voto
async function submitVote(businessId, value) {
    if (!currentUser) return;
    try {
        // 1. Guardar en el nodo del negocio
        await set(ref(rtdb, `sensunshop/ratings/${businessId}/${currentUser.uid}`), value);
        // 2. Guardar en el nodo del usuario (su registro de actividad)
        await set(ref(rtdb, `users/${currentUser.uid}/sensunshop_ratings/${businessId}`), {
            rating: value,
            timestamp: Date.now()
        });
        console.log(`Voto de ${value} estrellas registrado para ${businessId}`);
    } catch (error) {
        console.error("Error al registrar calificación:", error);
    }
}

// Efectos visuales de hover
function highlightStarsOnHover(starsRow, hoverValue) {
    const buttons = starsRow.querySelectorAll('.star-btn');
    buttons.forEach((btn, idx) => {
        if (idx < hoverValue) {
            btn.classList.add('user-filled');
        } else {
            btn.classList.remove('user-filled', 'filled');
        }
    });
}

function resetStarsHighlight(starsRow, activeValue, hasUserVoted) {
    const buttons = starsRow.querySelectorAll('.star-btn');
    buttons.forEach((btn, idx) => {
        btn.classList.remove('user-filled', 'filled');
        if (idx < activeValue) {
            if (hasUserVoted) {
                btn.classList.add('user-filled');
            } else {
                btn.classList.add('filled');
            }
        }
    });
}

// Modal de login dinámico
function createAuthModal() {
    if (document.getElementById('rating-auth-modal')) return;

    const modal = document.createElement("div");
    modal.id = "rating-auth-modal";
    modal.className = "rating-auth-modal";
    modal.innerHTML = `
        <div class="rating-auth-card">
            <button class="rating-auth-close" onclick="closeAuthModal()">&times;</button>
            <div style="text-align: center; margin-bottom: 25px;">
                <h3 style="color: #f39c12; font-size: 1.5rem; font-weight: 700; margin-bottom: 5px;">Sensun Shop</h3>
                <p style="color: #a0aec0; font-size: 0.88rem;">Inicia sesión para poder calificar este negocio</p>
            </div>

            <!-- Formulario de Login -->
            <form id="rating-login-form" style="display: flex; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; font-size: 0.85rem; color: #a0aec0; margin-bottom: 5px;">Correo Electrónico</label>
                    <input type="email" id="rating-login-email" required style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; outline: none;" placeholder="correo@ejemplo.com">
                </div>
                <div>
                    <label style="display: block; font-size: 0.85rem; color: #a0aec0; margin-bottom: 5px;">Contraseña</label>
                    <input type="password" id="rating-login-password" required style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; outline: none;" placeholder="••••••••">
                </div>
                <button type="submit" style="background: #f39c12; color: #0a0d14; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                    Iniciar Sesión
                </button>
                <div style="display: flex; align-items: center; text-align: center; margin: 5px 0; color: #a0aec0; font-size: 0.85rem;">
                    <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.08); margin-right: .8em;"></span>
                    <span>o</span>
                    <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.08); margin-left: .8em;"></span>
                </div>
                <button type="button" id="rating-google-login-btn" class="auth-google-btn">
                    <span class="g-ring"></span>
                    <i class="g-confetti" style="--gc:#4285F4; --gx:-60px; --gy:-40px; --gd:0s;"></i>
                    <i class="g-confetti" style="--gc:#EA4335; --gx:60px; --gy:-45px; --gd:0.04s;"></i>
                    <i class="g-confetti" style="--gc:#FBBC05; --gx:-70px; --gy:20px; --gd:0.08s;"></i>
                    <i class="g-confetti" style="--gc:#34A853; --gx:65px; --gy:25px; --gd:0.12s;"></i>
                    <svg class="google-g-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span class="google-spinner"></span>
                    <span class="google-check">
                        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="google-btn-text">Iniciar con Google</span>
                </button>
                <p style="font-size: 0.85rem; color: #718096; text-align: center; margin-top: 10px;">
                    ¿No tienes cuenta? <a href="#" id="rating-go-register" style="color: #f39c12; text-decoration: underline;">Regístrate aquí</a>
                </p>
            </form>

            <!-- Formulario de Registro -->
            <form id="rating-register-form" style="display: none; flex-direction: column; gap: 15px;">
                <div>
                    <label style="display: block; font-size: 0.85rem; color: #a0aec0; margin-bottom: 5px;">Nombre Completo</label>
                    <input type="text" id="rating-register-name" required style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; outline: none;" placeholder="Tu Nombre">
                </div>
                <div>
                    <label style="display: block; font-size: 0.85rem; color: #a0aec0; margin-bottom: 5px;">Correo Electrónico</label>
                    <input type="email" id="rating-register-email" required style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; outline: none;" placeholder="correo@ejemplo.com">
                </div>
                <div>
                    <label style="display: block; font-size: 0.85rem; color: #a0aec0; margin-bottom: 5px;">Contraseña</label>
                    <input type="password" id="rating-register-password" required style="width: 100%; padding: 10px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; outline: none;" placeholder="••••••••">
                </div>
                <button type="submit" style="background: #f39c12; color: #0a0d14; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                    Crear Cuenta
                </button>
                <div style="display: flex; align-items: center; text-align: center; margin: 5px 0; color: #a0aec0; font-size: 0.85rem;">
                    <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.08); margin-right: .8em;"></span>
                    <span>o</span>
                    <span style="flex: 1; border-bottom: 1px solid rgba(255,255,255,0.08); margin-left: .8em;"></span>
                </div>
                <button type="button" id="rating-google-register-btn" class="auth-google-btn">
                    <span class="g-ring"></span>
                    <i class="g-confetti" style="--gc:#4285F4; --gx:-60px; --gy:-40px; --gd:0s;"></i>
                    <i class="g-confetti" style="--gc:#EA4335; --gx:60px; --gy:-45px; --gd:0.04s;"></i>
                    <i class="g-confetti" style="--gc:#FBBC05; --gx:-70px; --gy:20px; --gd:0.08s;"></i>
                    <i class="g-confetti" style="--gc:#34A853; --gx:65px; --gy:25px; --gd:0.12s;"></i>
                    <svg class="google-g-icon" viewBox="0 0 24 24" width="20" height="20">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
                    </svg>
                    <span class="google-spinner"></span>
                    <span class="google-check">
                        <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
                    </span>
                    <span class="google-btn-text">Registrarse con Google</span>
                </button>
                <p style="font-size: 0.85rem; color: #718096; text-align: center; margin-top: 10px;">
                    ¿Ya tienes una cuenta? <a href="#" id="rating-go-login" style="color: #f39c12; text-decoration: underline;">Inicia sesión</a>
                </p>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const loginForm = document.getElementById('rating-login-form');
    const registerForm = document.getElementById('rating-register-form');
    const goRegister = document.getElementById('rating-go-register');
    const goLogin = document.getElementById('rating-go-login');
    const googleLoginBtn = document.getElementById('rating-google-login-btn');
    const googleRegisterBtn = document.getElementById('rating-google-register-btn');

    goRegister.addEventListener('click', (e) => {
        e.preventDefault();
        loginForm.style.display = 'none';
        registerForm.style.display = 'flex';
    });

    goLogin.addEventListener('click', (e) => {
        e.preventDefault();
        registerForm.style.display = 'none';
        loginForm.style.display = 'flex';
    });

    const handleGoogleAuth = async (isLogin, targetBtn) => {
        const btn = targetBtn || (isLogin ? googleLoginBtn : googleRegisterBtn);
        const textSpan = btn ? btn.querySelector('.google-btn-text') : null;
        const originalText = textSpan ? textSpan.textContent : '';

        if (btn) {
            btn.classList.remove('is-error', 'is-success');
            btn.classList.add('is-loading');
            if (textSpan) textSpan.textContent = 'Conectando con Google…';
        }

        const provider = new GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });

        try {
            // Usar signInWithPopup para mantener la página activa sin perder el estado en móviles y desktop
            const result = await signInWithPopup(auth, provider);
            const additionalUserInfo = getAdditionalUserInfo(result);
            
            if (isLogin) {
                if (additionalUserInfo && additionalUserInfo.isNewUser) {
                    const user = result.user;
                    await user.delete();
                    await signOut(auth);
                    if (btn) {
                        btn.classList.remove('is-loading');
                        btn.classList.add('is-error');
                        if (textSpan) textSpan.textContent = originalText;
                    }
                    alert("Tu cuenta de Google no está registrada. Por favor regístrate primero usando el botón de Google en la pestaña de registro.");
                    // Cambiar a registro
                    loginForm.style.display = 'none';
                    registerForm.style.display = 'flex';
                } else {
                    // Éxito
                    if (btn) {
                        btn.classList.remove('is-loading');
                        btn.classList.add('is-success');
                        if (textSpan) textSpan.textContent = '¡Sesión iniciada! 🎉';
                    }
                    await new Promise(r => setTimeout(r, 850));
                    closeAuthModal();
                }
            } else {
                // Registro Éxito
                if (btn) {
                    btn.classList.remove('is-loading');
                    btn.classList.add('is-success');
                    if (textSpan) textSpan.textContent = '¡Registrado con éxito! 🎉';
                }
                await new Promise(r => setTimeout(r, 850));
                closeAuthModal();
            }
        } catch (error) {
            console.error("Error en autenticación Google (popup):", error);
            
            // Si el navegador bloqueó la ventana emergente, intentar fallback con redirect
            if (error.code === 'auth/popup-blocked') {
                try {
                    localStorage.setItem('google_auth_mode', isLogin ? 'login' : 'register');
                    await signInWithRedirect(auth, provider);
                    return;
                } catch (redirectErr) {
                    console.error("Error en fallback de redirect:", redirectErr);
                }
            }

            if (btn) {
                btn.classList.remove('is-loading');
                btn.classList.add('is-error');
                setTimeout(() => {
                    btn.classList.remove('is-error');
                    if (textSpan) textSpan.textContent = originalText;
                }, 1400);
            }
            if (error.code !== 'auth/popup-closed-by-user' && error.code !== 'auth/cancelled-popup-request') {
                alert("Error al conectar con Google: " + translateAuthError(error.code));
            }
        }
    };

    // Procesar cualquier redirect previo si existió
    getRedirectResult(auth).then(async (result) => {
        if (result) {
            const additionalUserInfo = getAdditionalUserInfo(result);
            const savedMode = localStorage.getItem('google_auth_mode') || 'login';
            localStorage.removeItem('google_auth_mode');

            if (savedMode === 'login' && additionalUserInfo && additionalUserInfo.isNewUser) {
                const user = result.user;
                await user.delete();
                await signOut(auth);
                alert("Tu cuenta de Google no está registrada. Por favor regístrate primero usando el botón de Google en la pestaña de registro.");
                openAuthModal();
                loginForm.style.display = 'none';
                registerForm.style.display = 'flex';
            } else {
                closeAuthModal();
            }
        }
    }).catch((err) => {
        console.warn("getRedirectResult en sensun_ratings:", err);
    });

    if (googleLoginBtn) {
        googleLoginBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleAuth(true);
        });
    }

    if (googleRegisterBtn) {
        googleRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            handleGoogleAuth(false);
        });
    }

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('rating-login-email').value;
        const password = document.getElementById('rating-login-password').value;

        try {
            await signInWithEmailAndPassword(auth, email, password);
            closeAuthModal();
        } catch (error) {
            console.error("Error al iniciar sesión:", error);
            alert("Error al iniciar sesión: " + translateAuthError(error.code));
        }
    });

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('rating-register-name').value;
        const email = document.getElementById('rating-register-email').value;
        const password = document.getElementById('rating-register-password').value;

        try {
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await updateProfile(userCredential.user, { displayName: name });
            closeAuthModal();
        } catch (error) {
            console.error("Error al registrarse:", error);
            alert("Error al registrarse: " + translateAuthError(error.code));
        }
    });
}

function translateAuthError(code) {
    switch (code) {
        case 'auth/invalid-credential':
        case 'auth/wrong-password':
        case 'auth/user-not-found':
            return 'Credenciales inválidas. Verifica tu correo o contraseña.';
        case 'auth/email-already-in-use':
            return 'El correo electrónico ya está registrado con otra cuenta.';
        case 'auth/weak-password':
            return 'La contraseña debe tener al menos 6 caracteres.';
        case 'auth/invalid-email':
            return 'El correo electrónico no es válido.';
        default:
            return code;
    }
}

function openAuthModal() {
    createAuthModal();
    const modal = document.getElementById('rating-auth-modal');
    if (modal) {
        modal.classList.add('open');
        if (typeof window.updateBodyScroll === 'function') {
            window.updateBodyScroll();
        }
    }
}

function closeAuthModal() {
    const modal = document.getElementById('rating-auth-modal');
    if (modal) {
        modal.classList.remove('open');
        if (typeof window.updateBodyScroll === 'function') {
            window.updateBodyScroll();
        }
    }
}

// Exponer funciones necesarias para eventos onclick en HTML inyectado
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;

// ==========================================================================
// SINCRONIZACIÓN EN TIEMPO REAL CON FIREBASE RTDB (NEGOCIOS, NOTICIAS Y OFERTAS)
// ==========================================================================
let cachedParsedBusinesses = null;
let businessesRtdbListener = null;
let cachedNewsList = [];
let newsRtdbListener = null;

// Helper para crear tarjetas de negocio en el DOM de forma dinámica
function createBusinessDOMCard(business) {
    const card = document.createElement("div");
    card.className = "producto-card negocio-card" + (business.hasOffer ? " has-active-offer" : "");
    if (business.code) card.id = business.code;
    card.dataset.businessId = business.id;
    card.dataset.category = business.category || "comercio";
    if (business.tags && business.tags.length > 0) {
        card.dataset.tags = business.tags.join(",");
    }

    const tagsHtml = (business.tags || []).map(t => `<span class="tag">${t}</span>`).join("");
    
    let wspHref = "#";
    if (business.whatsapp) {
        if (business.whatsapp.startsWith("http")) {
            wspHref = business.whatsapp;
        } else {
            const cleanPhone = business.whatsapp.replace(/\D/g, "");
            const msg = encodeURIComponent(business.whatsappMsg || `Hola ${business.title}, vengo desde Sensun Shop`);
            wspHref = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
        }
    }
    const locHref = business.locationUrl || "#";

    card.innerHTML = `
        <div class="producto-img" style="display: flex; align-items: center; justify-content: center; height: 210px; padding: 12px; border-radius: 8px; position: relative;">
            ${business.hasOffer ? `
                <div class="negocio-offer-badge">
                    <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                    </svg>
                    <span>¡OFERTA ACTIVA!</span>
                </div>
            ` : ''}
            <img src="${business.imgSrc || 'imagenes/logos/icono-sensun-shop.webp'}" alt="${business.title}" style="object-fit: contain; max-height: 90%; max-width: 90%; border-radius: 8px;" loading="lazy">
        </div>
        <div class="producto-info">
            <div class="negocio-tags">${tagsHtml}</div>
            <h3>${business.title}</h3>
            <div class="sensun-rating-widget" data-business-id="${business.id}" data-compact="true"></div>
            <p>${business.description}</p>
            ${business.hasOffer ? `
                <div class="negocio-offer-banner">
                    <span class="offer-icon">🏷️</span>
                    <span class="offer-text">${business.offerMsg || '¡Aprovecha nuestras promociones especiales!'}</span>
                </div>
            ` : ''}
            <div class="negocio-links">
                ${business.whatsapp ? `<a href="${wspHref}" class="btn-negocio btn-wsp" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:currentColor;margin-right:4px;"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.73.44 3.35 1.21 4.78L2 22l5.37-1.41C8.75 21.31 10.33 21.6 12 21.6c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.4 12.6c-.23.63-.87 1.16-1.5 1.39-.63.23-1.45.32-2.32-.05-.87-.36-3.74-1.6-5.17-3.03-1.43-1.43-2.67-4.3-3.03-5.17-.37-.87-.28-1.69-.05-2.32.23-.63.76-1.24 1.39-1.47.63-.23 1.33-.23 1.96.05.63.27.63.76.36 1.39L8.47 8.65c-.27.63-.76.63-1.39.36l.18.32c.36.87 1.6 3.74 3.03 5.17 1.43 1.43 4.3 2.67 5.17 3.03l.32.18c-.63-.27-1.12-.27-1.39-.05l1.65-1.96c.27-.27.76-.27 1.39 0s2.99 1.47 3.26 1.74c.27.27.27.84.05 1.47z"/></svg> WhatsApp</a>` : ''}
                ${business.locationUrl ? `<a href="${locHref}" class="btn-negocio btn-loc" target="_blank" rel="noopener noreferrer"><svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:currentColor;margin-right:4px;"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg> Ubicación</a>` : ''}
                ${business.websiteUrl ? `<a href="${business.websiteUrl.replace(/multi-ideas-sv\.com/gi, 'multiideassv.com')}" class="btn-negocio btn-det" target="_blank" rel="noopener noreferrer" style="border-color: rgba(232, 98, 26, 0.4); color: var(--ss-orange);"><svg viewBox="0 0 24 24" style="width:13px;height:13px;fill:none;stroke:currentColor;stroke-width:2;margin-right:4px;"><circle cx="12" cy="12" r="10"></circle><line x1="2" y1="12" x2="22" y2="12"></line><path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1 4-10z"></path></svg> Sitio Web</a>` : ''}
            </div>
        </div>
    `;
    return card;
}

// Sincronización continua de tarjetas en el DOM cuando cambian en Firebase RTDB
function syncBusinessesToDOM(businessesList) {
    if (!businessesList || businessesList.length === 0) return;

    const allCards = document.querySelectorAll("#negocios-container .producto-card, #negocios-container .negocio-card, .catalogo-grid .negocio-card, .productos-grid .producto-card");

    businessesList.forEach(business => {
        let targetCard = null;
        const bizId = (business.id || "").toLowerCase();
        const bizCode = (business.code || "").toUpperCase();

        allCards.forEach(card => {
            const widget = card.querySelector(".sensun-rating-widget, [id='sensun-rating-widget']");
            const bId = (card.dataset.businessId || (widget ? widget.dataset.businessId : "") || card.id).toLowerCase();
            const cardCode = (card.id || "").toUpperCase();

            if (bId === bizId || (bizCode && cardCode === bizCode) || (bizId && card.id.toLowerCase() === bizId)) {
                targetCard = card;
            }
        });

        if (targetCard) {
            // Manejar estado activo/inactivo
            if (!business.isActive) {
                targetCard.style.display = "none";
                targetCard.classList.add("business-inactive");
                return;
            } else {
                if (targetCard.classList.contains("business-inactive")) {
                    targetCard.style.display = "";
                    targetCard.classList.remove("business-inactive");
                }
            }

            // Actualizar título
            const titleEl = targetCard.querySelector("h3");
            if (titleEl && business.title && titleEl.textContent.trim() !== business.title) {
                titleEl.textContent = business.title;
            }

            // Actualizar imagen principal si cambió
            const imgEl = targetCard.querySelector(".producto-img img, .slider-card-img img");
            if (imgEl && business.imgSrc && imgEl.src !== business.imgSrc) {
                imgEl.src = business.imgSrc;
                imgEl.alt = business.title || "Negocio";
            }

            // Actualizar descripción
            const descEl = targetCard.querySelector(".producto-info p");
            if (descEl && business.description) {
                if (descEl.innerHTML.includes("<strong") || descEl.innerHTML.includes("<br>")) {
                    const firstBreak = descEl.innerHTML.indexOf("<br>");
                    if (firstBreak !== -1) {
                        const rest = descEl.innerHTML.substring(firstBreak);
                        descEl.innerHTML = `<strong>${business.title}:</strong> ${business.description}` + rest;
                    } else {
                        descEl.textContent = business.description;
                    }
                } else {
                    descEl.textContent = business.description;
                }
            }

            // Actualizar enlace WhatsApp
            const wspBtn = targetCard.querySelector(".btn-wsp");
            if (wspBtn && business.whatsapp) {
                let wspHref = "#";
                if (business.whatsapp.startsWith("http")) {
                    wspHref = business.whatsapp;
                } else {
                    const cleanPhone = business.whatsapp.replace(/\D/g, "");
                    const msg = encodeURIComponent(business.whatsappMsg || `Hola ${business.title}, vengo desde Sensun Shop`);
                    wspHref = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
                }
                wspBtn.href = wspHref;
            }

            // Actualizar enlace Ubicación
            const locBtn = targetCard.querySelector(".btn-loc");
            if (locBtn && business.locationUrl) {
                locBtn.href = business.locationUrl;
            }

            // Actualizar enlace Sitio Web
            const webBtn = targetCard.querySelector(".btn-det");
            if (webBtn) {
                if (business.websiteUrl) {
                    const cleanUrl = business.websiteUrl.replace(/multi-ideas-sv\.com/gi, "multiideassv.com");
                    webBtn.href = cleanUrl;
                    webBtn.target = "_blank";
                    webBtn.rel = "noopener noreferrer";
                    webBtn.style.display = "";
                }
            }

            // Actualizar badges/banners de OFERTAS (hasOffer & offerMsg)
            let offerBadge = targetCard.querySelector(".negocio-offer-badge");
            let offerBanner = targetCard.querySelector(".negocio-offer-banner");

            if (business.hasOffer) {
                targetCard.classList.add("has-active-offer");

                // Crear badge si no existe
                if (!offerBadge) {
                    offerBadge = document.createElement("div");
                    offerBadge.className = "negocio-offer-badge";
                    offerBadge.innerHTML = `
                        <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                        </svg>
                        <span>¡OFERTA ACTIVA!</span>
                    `;
                    const imgContainer = targetCard.querySelector(".producto-img") || targetCard;
                    imgContainer.style.position = "relative";
                    imgContainer.appendChild(offerBadge);
                }

                // Crear o actualizar banner de oferta
                const infoContainer = targetCard.querySelector(".producto-info");
                if (infoContainer) {
                    const msgText = business.offerMsg ? business.offerMsg : "¡Aprovecha nuestras promociones especiales por tiempo limitado!";
                    if (!offerBanner) {
                        offerBanner = document.createElement("div");
                        offerBanner.className = "negocio-offer-banner";
                        offerBanner.innerHTML = `
                            <span class="offer-icon">🏷️</span>
                            <span class="offer-text">${msgText}</span>
                        `;
                        const pEl = infoContainer.querySelector("p");
                        if (pEl) {
                            infoContainer.insertBefore(offerBanner, pEl.nextSibling);
                        } else {
                            infoContainer.appendChild(offerBanner);
                        }
                    } else {
                        const textSpan = offerBanner.querySelector(".offer-text");
                        if (textSpan) textSpan.textContent = msgText;
                    }
                }
            } else {
                targetCard.classList.remove("has-active-offer");
                if (offerBadge) offerBadge.remove();
                if (offerBanner) offerBanner.remove();
            }
        }
    });

    // Soporte para añadir tarjetas de nuevos negocios creados desde la App Móvil
    const container = document.getElementById("negocios-container");
    if (container) {
        const pathname = window.location.pathname.toLowerCase();
        let pageType = "";
        if (pathname.includes("negocioslocales")) pageType = "negocioslocales";
        else if (pathname.includes("emprendedores")) pageType = "emprendedores";
        else if (pathname.includes("profesionales")) pageType = "profesionales";
        else if (pathname.includes("oficios")) pageType = "oficios";

        businessesList.forEach(business => {
            if (!business.isActive) return;
            if (pageType && business.type && business.type !== pageType) return;

            const existing = container.querySelector(`[data-business-id="${business.id}"], #${business.code || "NO_CODE"}, #${business.id}`);
            if (!existing) {
                const newCard = createBusinessDOMCard(business);
                const disponibleSlot = container.querySelector(".negocio-card.disponible");
                if (disponibleSlot) {
                    container.insertBefore(newCard, disponibleSlot);
                } else {
                    container.appendChild(newCard);
                }
                const widget = newCard.querySelector(".sensun-rating-widget");
                if (widget) initRatingWidget(widget);
                injectFavoriteButtons();
                injectCommentButtons();
                injectShareButtons();
            }
        });
    }
}

// Tabla calibrada de coordenadas geográficas de Sensuntepeque, Cabañas
const SENSUN_KNOWN_COORDS_MAP = {
    "arphotostudio": { lat: 13.873011, lng: -88.620773 },
    "lasterrazas": { lat: 13.869501, lng: -88.619366 },
    "neg-006": { lat: 13.878103, lng: -88.630060 },
    "neg-005": { lat: 13.874233, lng: -88.628282 },
    "neg-004": { lat: 13.873753, lng: -88.628258 },
    "neg-003": { lat: 13.876198, lng: -88.621559 },
    "disenograficopatrick": { lat: 13.878031, lng: -88.628745 },
    "emp-001": { lat: 13.875139, lng: -88.626428 },
    "emp-002": { lat: 13.876704, lng: -88.629354 },
    "drjuliocesarvelasco": { lat: 13.876388, lng: -88.630002 },
    "drhenrymartinez": { lat: 13.875842, lng: -88.628102 }
};

function isValidElSalvadorLatLong(lat, lng) {
    return !isNaN(lat) && !isNaN(lng) && lat >= 13.0 && lat <= 14.6 && lng >= -90.5 && lng <= -87.5;
}

// Helper para extraer coordenadas geográficas desde Google Maps / Waze URLs
function extractCoordinates(url, id = "") {
    if (url && typeof url === "string") {
        const cleanUrl = url.trim();

        // Formato 1: !3d13.864123!4d-88.625412 (Google Maps Embed / Place URL)
        const match3d4d = cleanUrl.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
        if (match3d4d) {
            const lat = parseFloat(match3d4d[1]), lng = parseFloat(match3d4d[2]);
            if (isValidElSalvadorLatLong(lat, lng)) return { lat, lng };
        }

        // Formato 2: @13.864123,-88.625412
        const matchAt = cleanUrl.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
        if (matchAt) {
            const lat = parseFloat(matchAt[1]), lng = parseFloat(matchAt[2]);
            if (isValidElSalvadorLatLong(lat, lng)) return { lat, lng };
        }

        // Formato 3: q=13.864123,-88.625412 o ll=13.864123,-88.625412
        const matchQuery = cleanUrl.match(/[?&](?:q|query|ll|sll|center|loc)=(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/);
        if (matchQuery) {
            const lat = parseFloat(matchQuery[1]), lng = parseFloat(matchQuery[2]);
            if (isValidElSalvadorLatLong(lat, lng)) return { lat, lng };
        }

        // Formato 4: /search/13.878103,+-88.630060 o /place/...
        const matchPath = cleanUrl.match(/(?:place|dir|search)\/[^/]*\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/) || cleanUrl.match(/\/search\/(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)/);
        if (matchPath) {
            const lat = parseFloat(matchPath[1]), lng = parseFloat(matchPath[2]);
            if (isValidElSalvadorLatLong(lat, lng)) return { lat, lng };
        }

        // Formato 5: Coordenadas directas en texto "13.864123, -88.625412"
        const matchDirect = cleanUrl.match(/^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$/);
        if (matchDirect) {
            const lat = parseFloat(matchDirect[1]), lng = parseFloat(matchDirect[2]);
            if (isValidElSalvadorLatLong(lat, lng)) return { lat, lng };
        }
    }

    const cleanId = (id || "").toLowerCase().trim();
    if (SENSUN_KNOWN_COORDS_MAP[cleanId]) {
        return SENSUN_KNOWN_COORDS_MAP[cleanId];
    }

    for (const [knownKey, coords] of Object.entries(SENSUN_KNOWN_COORDS_MAP)) {
        if (cleanId.includes(knownKey) || knownKey.includes(cleanId)) {
            return coords;
        }
    }

    return null;
}
window.extractCoordinatesFromUrl = extractCoordinates;

// Configurar sincronización en tiempo real de sensunshop/businesses
function setupBusinessesRealtimeSync() {
    try {
        const businessesRef = ref(rtdb, "sensunshop/businesses");
        if (businessesRtdbListener) return;

        businessesRtdbListener = onValue(businessesRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list = Object.keys(data).map(key => {
                const item = data[key];
                const coords = extractCoordinates(item.locationUrl, item.id || key);
                return {
                    id: item.id || key,
                    code: item.code || "",
                    title: item.title || "Negocio",
                    type: item.type || "negocioslocales",
                    category: item.category || "comercio",
                    badge: item.badge || "",
                    description: item.description || "",
                    imgSrc: item.imgSrc || "",
                    gallery: Array.isArray(item.gallery) ? item.gallery : [],
                    whatsapp: item.whatsapp || "",
                    whatsappMsg: item.whatsappMsg || `Hola ${item.title || ''}, vengo desde Sensun Shop`,
                    locationUrl: item.locationUrl || "",
                    coords: coords,
                    lat: coords ? coords.lat : null,
                    lng: coords ? coords.lng : null,
                    websiteUrl: (item.websiteUrl || "").replace(/multi-ideas-sv\.com/gi, "multiideassv.com"),
                    hasOffer: Boolean(item.hasOffer === true || item.hasOffer === "true" || item.hasOffer === 1),
                    offerMsg: item.offerMsg || "",
                    accentColor: item.accentColor || "#e8621a",
                    tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === "string" ? item.tags.split(",").map(t => t.trim()) : []),
                    isActive: item.isActive !== false
                };
            }).filter(b => b.isActive);

            if (list.length > 0) {
                cachedParsedBusinesses = list;
                window.sensunBusinessesCache = list;

                // Sincronizar cambios en el DOM inmediatamente sin recargar
                syncBusinessesToDOM(list);

                // Si el modal de favoritos está visible, refrescarlo
                if (window.userFavorites && typeof window.renderFavoritesView === 'function') {
                    window.renderFavoritesView(window.userFavorites);
                }

                // Notificar a cualquier componente activo
                document.dispatchEvent(new CustomEvent("sensun-businesses-updated", { detail: { businesses: list } }));
            }
        });
    } catch (err) {
        console.warn("Aviso: No se pudo conectar a sensunshop/businesses en Firebase RTDB:", err);
    }
}

// Cache global de fuentes de datos Firebase
let cachedBulletinsList = [];
let cachedOffersList = [];
let autoNovedadesSliderInterval = null;

// Mapa de Colores para las 4 Categorías Normalizadas de Publicaciones
const SENSUN_NEWS_CATEGORIES = {
    "noticias": {
        badge: "NOTICIA",
        icon: "📰",
        color: "#ff6b35",
        bg: "rgba(255, 107, 53, 0.15)",
        border: "rgba(255, 107, 53, 0.4)",
        textColor: "#ff8c42"
    },
    "boletines": {
        badge: "BOLETÍN",
        icon: "📢",
        color: "#7b68ee",
        bg: "rgba(123, 104, 238, 0.15)",
        border: "rgba(123, 104, 238, 0.4)",
        textColor: "#a78bfa"
    },
    "informativos": {
        badge: "INFORMATIVO",
        icon: "💡",
        color: "#10b981",
        bg: "rgba(16, 185, 129, 0.15)",
        border: "rgba(16, 185, 129, 0.4)",
        textColor: "#34d399"
    },
    "anuncios": {
        badge: "ANUNCIO",
        icon: "📣",
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.15)",
        border: "rgba(239, 68, 68, 0.4)",
        textColor: "#f87171"
    }
};

function resolveNewsBadge(rawBadge) {
    const key = (rawBadge || "").toLowerCase().trim();
    if (key.includes("boletin") || key.includes("boletines")) return SENSUN_NEWS_CATEGORIES.boletines;
    if (key.includes("informativ")) return SENSUN_NEWS_CATEGORIES.informativos;
    if (key.includes("anuncio") || key.includes("promo") || key.includes("oferta")) return SENSUN_NEWS_CATEGORIES.anuncios;
    return SENSUN_NEWS_CATEGORIES.noticias;
}

// Parsear elementos genéricos de boletines / ofertas / noticias
function parseFeedItems(data, defaultBadge = "noticias") {
    if (!data || typeof data !== "object") return [];
    return Object.keys(data).map(key => {
        const item = data[key];
        const rawBadge = (item.badge || item.category || item.tag || defaultBadge).toString().toLowerCase().trim();
        const catInfo = resolveNewsBadge(rawBadge);

        const contactWhatsapp = item.contactWhatsapp || item.whatsapp || item.telefono || "";
        const imageUrl = item.imageUrl || item.imgSrc || item.imagen || "";
        const locationUrl = item.locationUrl || item.mapsUrl || "";
        const moreUrl = (item.moreUrl || item.link || item.url || item.websiteUrl || "").replace(/multi-ideas-sv\.com/gi, "multiideassv.com");

        return {
            id: item.id || key,
            title: item.title || item.titulo || item.name || "Publicación",
            description: item.description || item.descripcion || item.content || item.contenido || "",
            imageUrl: imageUrl,
            imgSrc: imageUrl,
            badge: rawBadge,
            badgeLabel: catInfo.badge,
            contactWhatsapp: contactWhatsapp,
            whatsapp: contactWhatsapp,
            whatsappMsg: item.whatsappMsg || "",
            locationUrl: locationUrl,
            moreUrl: moreUrl,
            link: moreUrl,
            hasOffer: Boolean(item.hasOffer === true || item.hasOffer === "true" || item.hasOffer === 1 || rawBadge.includes("oferta") || rawBadge.includes("anuncio")),
            offerMsg: item.offerMsg || item.oferta || item.descuento || "",
            type: item.type || item.section || item.seccion || "negocioslocales",
            category: item.category || "comercio",
            date: item.date || item.fecha || "",
            timestamp: item.timestamp || 0,
            accentColor: item.accentColor || catInfo.color,
            badgeBg: catInfo.bg,
            badgeBorder: catInfo.border,
            badgeTextColor: catInfo.textColor,
            isActive: item.isActive !== false
        };
    }).filter(n => n.isActive).sort((a, b) => (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
}

// Configurar sincronización en tiempo real de Noticias, Boletines y Ofertas desde Firebase RTDB
function setupNewsSync() {
    if (newsRtdbListener) return;
    newsRtdbListener = true;

    try {
        // 1. Escuchar sensunshop/news (Noticias generales)
        const newsRef = ref(rtdb, "sensunshop/news");
        onValue(newsRef, (snapshot) => {
            const data = snapshot.val() || {};
            cachedNewsList = parseFeedItems(data, "noticias");
            rebuildUnifiedFeeds();
        });

        // 2. Escuchar sensunshop/bulletins y sensunshop/boletines (Boletines de la app)
        const bulletinsRef = ref(rtdb, "sensunshop/bulletins");
        onValue(bulletinsRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list1 = parseFeedItems(data, "boletines");
            // También escuchar nodo alterno sensunshop/boletines
            get(ref(rtdb, "sensunshop/boletines")).then(snap => {
                const data2 = snap.val() || {};
                const list2 = parseFeedItems(data2, "boletines");
                const merged = [...list1, ...list2];
                const seen = new Set();
                cachedBulletinsList = merged.filter(b => {
                    if (seen.has(b.id)) return false;
                    seen.add(b.id);
                    return true;
                });
                rebuildUnifiedFeeds();
            }).catch(() => {
                cachedBulletinsList = list1;
                rebuildUnifiedFeeds();
            });
        });

        // 3. Escuchar sensunshop/offers y sensunshop/ofertas (Ofertas de la app)
        const offersRef = ref(rtdb, "sensunshop/offers");
        onValue(offersRef, (snapshot) => {
            const data = snapshot.val() || {};
            const list1 = parseFeedItems(data, "anuncios");
            get(ref(rtdb, "sensunshop/ofertas")).then(snap => {
                const data2 = snap.val() || {};
                const list2 = parseFeedItems(data2, "anuncios");
                const merged = [...list1, ...list2];
                const seen = new Set();
                cachedOffersList = merged.filter(o => {
                    if (seen.has(o.id)) return false;
                    seen.add(o.id);
                    return true;
                });
                rebuildUnifiedFeeds();
            }).catch(() => {
                cachedOffersList = list1;
                rebuildUnifiedFeeds();
            });
        });
    } catch (err) {
        console.warn("Aviso: No se pudo conectar a los nodos de novedades/ofertas en Firebase RTDB:", err);
    }
}

// Reconstruir carrusel de novedades y actualizar campana flotante
function rebuildUnifiedFeeds() {
    renderUnifiedNovedadesSlider();
    if (typeof updateBellAndPopupFeed === "function") {
        updateBellAndPopupFeed();
    }
}

// Renderizar carrusel unificado de Novedades (3 negocios recientes + boletines + ofertas principales)
function renderUnifiedNovedadesSlider() {
    const sliderContainer = document.getElementById("sensun-slider");
    if (!sliderContainer) return;

    const allItems = [];

    // 1. Obtener los 3 negocios más recientes
    const recentBiz = (cachedParsedBusinesses || []).slice(0, 3).map(b => ({
        id: b.id,
        title: b.title,
        description: b.description || "Comercio registrado en Sensun Shop",
        imgSrc: b.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
        badge: "✨ " + (b.badge || "RECIÉN AGREGADO"),
        badgeType: "recent",
        whatsapp: b.whatsapp,
        whatsappMsg: b.whatsappMsg,
        locationUrl: b.locationUrl,
        link: b.websiteUrl || "",
        hasOffer: b.hasOffer,
        offerMsg: b.offerMsg,
        accentColor: "#ff6b35",
        badgeBg: "rgba(255, 107, 53, 0.15)",
        badgeBorder: "rgba(255, 107, 53, 0.4)",
        badgeTextColor: "#ff8c42"
    }));

    // 2. Obtener Ofertas Principales (de sensunshop/offers o comercios con hasOffer)
    const activeBizOffers = (cachedParsedBusinesses || []).filter(b => b.hasOffer).map(b => ({
        id: b.id,
        title: b.title,
        description: b.description,
        imgSrc: b.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
        badge: "🔥 OFERTA DESTACADA",
        badgeType: "offer",
        whatsapp: b.whatsapp,
        whatsappMsg: `Hola ${b.title}, vi su oferta "${b.offerMsg || ''}" en Sensun Shop`,
        locationUrl: b.locationUrl,
        link: b.websiteUrl || "",
        hasOffer: true,
        offerMsg: b.offerMsg || "¡Promoción especial por tiempo limitado!",
        accentColor: "#ea580c",
        badgeBg: "rgba(234, 88, 12, 0.2)",
        badgeBorder: "rgba(234, 88, 12, 0.5)",
        badgeTextColor: "#ff8c42"
    }));

    const directOffers = (cachedOffersList || []).map(o => ({
        id: o.id,
        title: o.title,
        description: o.description,
        imgSrc: o.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
        badge: "🔥 " + (o.badgeLabel || "OFERTA EXCLUSIVA"),
        badgeType: "offer",
        whatsapp: o.whatsapp,
        whatsappMsg: o.whatsappMsg || `Hola, me interesa la oferta "${o.title}" en Sensun Shop`,
        locationUrl: o.locationUrl,
        link: o.link || "",
        hasOffer: true,
        offerMsg: o.offerMsg || o.description,
        accentColor: "#ea580c",
        badgeBg: "rgba(234, 88, 12, 0.2)",
        badgeBorder: "rgba(234, 88, 12, 0.5)",
        badgeTextColor: "#ff8c42"
    }));

    // 3. Obtener Boletines, Noticias, Informativos y Anuncios
    const bulletins = (cachedBulletinsList || []).map(b => {
        const cat = resolveNewsBadge(b.badge || "boletines");
        return {
            id: b.id,
            title: b.title,
            description: b.description,
            imgSrc: b.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: `${cat.icon} ${cat.badge}`,
            badgeType: "bulletin",
            whatsapp: b.whatsapp,
            whatsappMsg: b.whatsappMsg,
            locationUrl: b.locationUrl,
            link: b.link || "",
            hasOffer: false,
            offerMsg: "",
            accentColor: cat.color,
            badgeBg: cat.bg,
            badgeBorder: cat.border,
            badgeTextColor: cat.textColor
        };
    });

    const newsItems = (cachedNewsList || []).map(n => {
        const cat = resolveNewsBadge(n.badge || "noticias");
        return {
            id: n.id,
            title: n.title,
            description: n.description,
            imgSrc: n.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: n.hasOffer ? "🔥 OFERTA" : `${cat.icon} ${cat.badge}`,
            badgeType: n.hasOffer ? "offer" : "news",
            whatsapp: n.whatsapp,
            whatsappMsg: n.whatsappMsg,
            locationUrl: n.locationUrl,
            link: n.link || "",
            hasOffer: n.hasOffer,
            offerMsg: n.offerMsg,
            accentColor: n.hasOffer ? "#ea580c" : cat.color,
            badgeBg: n.hasOffer ? "rgba(234, 88, 12, 0.2)" : cat.bg,
            badgeBorder: n.hasOffer ? "rgba(234, 88, 12, 0.5)" : cat.border,
            badgeTextColor: n.hasOffer ? "#ff8c42" : cat.textColor
        };
    });

    // Mezcla equilibrada: primero ofertas activas, luego negocios recientes, luego boletines/noticias
    const combinedOffers = [...activeBizOffers, ...directOffers];
    const seen = new Set();

    combinedOffers.slice(0, 3).forEach(item => {
        if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
    });

    recentBiz.forEach(item => {
        if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
    });

    [...bulletins, ...newsItems].forEach(item => {
        if (!seen.has(item.id)) { seen.add(item.id); allItems.push(item); }
    });

    if (allItems.length === 0) return;

    let slidesHtml = "";
    allItems.forEach((item, index) => {
        let wspHref = "#";
        if (item.whatsapp) {
            if (item.whatsapp.startsWith("http")) {
                wspHref = item.whatsapp;
            } else {
                const cleanPhone = item.whatsapp.replace(/\D/g, "");
                const msg = encodeURIComponent(item.whatsappMsg || `Hola ${item.title}, vengo desde Sensun Shop`);
                wspHref = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
            }
        }

        const borderLeft = item.accentColor || "var(--ss-orange)";
        const badgeBg = item.badgeBg || "rgba(232, 98, 26, 0.15)";
        const badgeColor = item.badgeTextColor || "var(--ss-orange)";
        const badgeBorder = item.badgeBorder || "rgba(232, 98, 26, 0.3)";

        slidesHtml += `
            <div class="slider-card ${item.hasOffer ? 'has-active-offer' : ''}" style="border-left-color: ${borderLeft}; position: relative;">
                ${item.hasOffer ? `
                    <div class="negocio-offer-badge" style="top: 10px; left: 10px; z-index: 5;">
                        <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>
                        <span>¡OFERTA DESTACADA!</span>
                    </div>
                ` : ''}
                <div class="slider-card-img" style="display: flex; align-items: center; justify-content: center; padding: 6px;">
                    <img src="${item.imgSrc}" alt="${item.title}" style="object-fit: contain; width: 100%; height: 100%;" onerror="this.src='imagenes/logos/icono-sensun-shop.webp'" loading="lazy">
                </div>
                <div class="slider-card-content">
                    <span class="badge" style="background: ${badgeBg}; color: ${badgeColor}; border: 1px solid ${badgeBorder};">${item.badge.toUpperCase()}</span>
                    <h3>${item.title}</h3>
                    ${item.hasOffer && item.offerMsg ? `
                        <div class="negocio-offer-banner" style="margin: 6px 0 8px 0; padding: 6px 12px; font-size: 0.82rem; font-weight: 700; color: #ffbe76;">
                            <span class="offer-icon">🏷️</span>
                            <span class="offer-text">${item.offerMsg}</span>
                        </div>
                    ` : ''}
                    <p>${item.description}</p>
                    <div class="negocio-links">
                        ${item.whatsapp ? `<a href="${wspHref}" class="btn-negocio btn-wsp" target="_blank" rel="noopener noreferrer">WhatsApp</a>` : ''}
                        ${item.locationUrl ? `<a href="${item.locationUrl}" class="btn-negocio btn-loc" target="_blank" rel="noopener noreferrer">Ubicación</a>` : ''}
                        ${item.link ? `<a href="${item.link}" class="btn-negocio btn-det" target="_blank" rel="noopener noreferrer">Ver Más</a>` : ''}
                    </div>
                </div>
            </div>
        `;
    });

    sliderContainer.innerHTML = slidesHtml;
    if (typeof window.injectShareButtons === "function") window.injectShareButtons();
    initNovedadesAutoRotation();
}

// Inicializar auto-rotación del slider de Novedades
function initNovedadesAutoRotation() {
    const slider = document.getElementById("sensun-slider");
    const prevBtn = document.getElementById("slide-prev");
    const nextBtn = document.getElementById("slide-next");
    if (!slider) return;

    const cards = slider.querySelectorAll(".slider-card");
    if (cards.length <= 1) return;

    let currentIndex = 0;
    function showSlide(idx) {
        if (idx >= cards.length) currentIndex = 0;
        else if (idx < 0) currentIndex = cards.length - 1;
        else currentIndex = idx;

        slider.scrollTo({
            left: slider.clientWidth * currentIndex,
            behavior: "smooth"
        });
    }

    if (autoNovedadesSliderInterval) clearInterval(autoNovedadesSliderInterval);
    autoNovedadesSliderInterval = setInterval(() => {
        showSlide(currentIndex + 1);
    }, 5500);

    if (prevBtn) {
        prevBtn.onclick = () => {
            clearInterval(autoNovedadesSliderInterval);
            showSlide(currentIndex - 1);
        };
    }

    if (nextBtn) {
        nextBtn.onclick = () => {
            clearInterval(autoNovedadesSliderInterval);
            showSlide(currentIndex + 1);
        };
    }

    slider.onmouseenter = () => clearInterval(autoNovedadesSliderInterval);
    slider.onmouseleave = () => {
        clearInterval(autoNovedadesSliderInterval);
        autoNovedadesSliderInterval = setInterval(() => {
            showSlide(currentIndex + 1);
        }, 5500);
    };

    window.addEventListener("resize", () => {
        showSlide(currentIndex);
    });
}


// Función principal para obtener negocios con soporte de tiempo real
async function getBusinessesList() {
    setupBusinessesRealtimeSync();

    if (cachedParsedBusinesses && cachedParsedBusinesses.length > 0) {
        return cachedParsedBusinesses;
    }

    try {
        const businessesRef = ref(rtdb, "sensunshop/businesses");
        const snapshot = await get(businessesRef);
        const data = snapshot.val();

        if (data && Object.keys(data).length > 0) {
            const list = Object.keys(data).map(key => {
                const item = data[key];
                const coords = extractCoordinates(item.locationUrl, item.id || key);
                return {
                    id: item.id || key,
                    code: item.code || "",
                    title: item.title || "Negocio",
                    type: item.type || "negocioslocales",
                    category: item.category || "comercio",
                    badge: item.badge || "",
                    description: item.description || "",
                    imgSrc: item.imgSrc || "",
                    gallery: Array.isArray(item.gallery) ? item.gallery : [],
                    whatsapp: item.whatsapp || "",
                    whatsappMsg: item.whatsappMsg || `Hola ${item.title || ''}, vengo desde Sensun Shop`,
                    locationUrl: item.locationUrl || "",
                    coords: coords,
                    lat: coords ? coords.lat : null,
                    lng: coords ? coords.lng : null,
                    websiteUrl: (item.websiteUrl || "").replace(/multi-ideas-sv\.com/gi, "multiideassv.com"),
                    hasOffer: Boolean(item.hasOffer === true || item.hasOffer === "true" || item.hasOffer === 1),
                    offerMsg: item.offerMsg || "",
                    accentColor: item.accentColor || "#e8621a",
                    tags: Array.isArray(item.tags) ? item.tags : (typeof item.tags === "string" ? item.tags.split(",").map(t => t.trim()) : []),
                    isActive: item.isActive !== false
                };
            }).filter(b => b.isActive);

            cachedParsedBusinesses = list;
            window.sensunBusinessesCache = list;
            return cachedParsedBusinesses;
        }
    } catch (firebaseErr) {
        console.warn("Aviso: No se pudo conectar a sensunshop/businesses en Firebase RTDB, usando respaldo DOM:", firebaseErr);
    }

    // Respaldo secundario local: Leer tarjetas del DOM actual
    const currentDOMCards = document.querySelectorAll('#negocios-container .negocio-card');
    if (currentDOMCards.length > 0) {
        cachedParsedBusinesses = parseCards(currentDOMCards, false);
        return cachedParsedBusinesses;
    }

    return [];
}

function parseCards(cards, isRoot) {
    return Array.from(cards)
        .filter(card => !card.classList.contains('disponible'))
        .map(card => {
            const imgEl = card.querySelector('.producto-img img, .slider-card-img img');
            const ratingWidget = card.querySelector('.sensun-rating-widget');
            const businessId = ratingWidget ? ratingWidget.dataset.businessId : card.id.toLowerCase();
            const wspBtn = card.querySelector('.btn-wsp');
            const locBtn = card.querySelector('.btn-loc');
            
            return {
                id: businessId,
                title: card.querySelector('h3') ? card.querySelector('h3').textContent.trim() : '',
                imgSrc: imgEl ? imgEl.getAttribute('src') : '',
                whatsapp: wspBtn ? (wspBtn.getAttribute('href') || '') : '',
                locationUrl: locBtn ? (locBtn.getAttribute('href') || '') : '',
                hasOffer: card.classList.contains('has-active-offer'),
                offerMsg: card.querySelector('.negocio-offer-banner .offer-text') ? card.querySelector('.negocio-offer-banner .offer-text').textContent.trim() : ''
            };
        });
}

// Exponer helpers globales
window.getSensunBusinesses = getBusinessesList;
window.getSensunNews = () => cachedNewsList;
window.setupBusinessesRealtimeSync = setupBusinessesRealtimeSync;
window.setupNewsSync = setupNewsSync;

// Renderizar favoritos en tiras verticales
window.renderFavoritesView = function(favs) {
    const listContainer = document.getElementById('favorites-modal-list');
    if (!listContainer) return;

    getBusinessesList().then(allBusinesses => {
        const favIds = Object.keys(favs).filter(id => favs[id] === true);
        
        if (favIds.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-gray);">
                    <p style="margin: 0; font-size: 0.9rem;">Aún no tienes favoritos agregados.</p>
                </div>
            `;
            return;
        }

        const favBusinesses = allBusinesses.filter(b => favIds.includes(b.id));

        if (favBusinesses.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 20px; color: var(--text-gray);">
                    <p style="margin: 0; font-size: 0.9rem;">Aún no tienes favoritos agregados.</p>
                </div>
            `;
            return;
        }

        let html = '';
        favBusinesses.forEach(b => {
            let wspHref = '#';
            if (b.whatsapp) {
                if (b.whatsapp.startsWith('http')) {
                    wspHref = b.whatsapp;
                } else {
                    const cleanPhone = b.whatsapp.replace(/\D/g, '');
                    const msg = encodeURIComponent(b.whatsappMsg || `Hola ${b.title}, vengo desde Sensun Shop`);
                    wspHref = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
                }
            }

            const locHref = b.locationUrl || '#';
            
            let imgSrc = b.imgSrc || '';
            if (imgSrc && !imgSrc.startsWith('http') && !imgSrc.startsWith('../') && window.location.pathname.includes('/sensunshop/')) {
                imgSrc = '../' + imgSrc;
            }

            html += `
                <div class="favorito-list-item" style="display: flex; align-items: center; gap: 15px; padding: 12px; background: rgba(255, 255, 255, 0.03); border: 1px solid rgba(255, 255, 255, 0.05); border-radius: 12px; position: relative; width: 100%; box-sizing: border-box;">
                    <button class="btn-list-remove" onclick="window.toggleFavorite('${b.id}')" title="Quitar de favoritos" style="position: absolute; top: 8px; right: 8px; background: none; border: none; color: rgba(255,255,255,0.3); cursor: pointer; font-size: 1.1rem; line-height: 1; transition: color 0.2s; padding: 0;">&times;</button>
                    <div class="favorito-list-logo" style="width: 50px; height: 50px; border-radius: 8px; overflow: hidden; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
                        <img src="${imgSrc}" alt="${b.title}" style="width: 100%; height: 100%; object-fit: contain; max-height: 90%; max-width: 90%;">
                    </div>
                    <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; align-items: flex-start; text-align: left;">
                        <h4 style="font-size: 0.95rem; font-weight: 600; color: #fff; margin: 0 0 6px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; width: 90%;">${b.title}</h4>
                        <div style="display: flex; gap: 8px;">
                            ${b.whatsapp ? `
                                <a href="${wspHref}" class="btn-compact-action wsp" target="_blank" rel="noopener noreferrer" style="width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #25d366; color: #fff;" title="WhatsApp">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.73.44 3.35 1.21 4.78L2 22l5.37-1.41C8.75 21.31 10.33 21.6 12 21.6c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.4 12.6c-.23.63-.87 1.16-1.5 1.39-.63.23-1.45.32-2.32-.05-.87-.36-3.74-1.6-5.17-3.03-1.43-1.43-2.67-4.3-3.03-5.17-.37-.87-.28-1.69-.05-2.32.23-.63.76-1.24 1.39-1.47.63-.23 1.33-.23 1.96.05.63.27.63.76.36 1.39L8.47 8.65c-.27.63-.76.63-1.39.36l.18.32c.36.87 1.6 3.74 3.03 5.17 1.43 1.43 4.3 2.67 5.17 3.03l.32.18c-.63-.27-1.12-.27-1.39-.05l1.65-1.96c.27-.27.76-.27 1.39 0s2.99 1.47 3.26 1.74c.27.27.27.84.05 1.47z"/></svg>
                                </a>
                            ` : ''}
                            ${b.locationUrl ? `
                                <a href="${locHref}" class="btn-compact-action loc" target="_blank" rel="noopener noreferrer" style="width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #ea4335; color: #fff;" title="Ubicación">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                                </a>
                            ` : ''}
                        </div>
                    </div>
                </div>
            `;
        });
        listContainer.innerHTML = html;
    });
};

// Delegador global de clics para abrir y cerrar el modal de favoritos
document.addEventListener('click', (e) => {
    // 1. Abrir Modal de Favoritos desde el perfil
    if (e.target.closest('#profile-favorites-btn')) {
        e.preventDefault();
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.remove('active'); // Cerrar perfil

        const favModal = document.getElementById('user-favorites-modal');
        if (favModal) {
            favModal.classList.add('active');
            // Forzar renderizado
            if (typeof window.renderFavoritesView === 'function') {
                window.renderFavoritesView(window.userFavorites || {});
            }
        }
    }
    
    // 2. Cerrar Modal de Favoritos
    if (e.target.closest('#favorites-modal-close')) {
        e.preventDefault();
        const favModal = document.getElementById('user-favorites-modal');
        if (favModal) favModal.classList.remove('active');
        
        // Reabrir perfil para navegación fluida
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.add('active');
    }
    
    // 3. Cerrar haciendo click fuera de la tarjeta
    const favModal = document.getElementById('user-favorites-modal');
    if (favModal && e.target === favModal) {
        favModal.classList.remove('active');
        const profileModal = document.getElementById('profile-modal');
        if (profileModal) profileModal.classList.add('active');
    }
});

// ==========================================================================
// SISTEMA DE COMENTARIOS ANÓNIMOS EN TIEMPO REAL - SENSUN SHOP
// ==========================================================================
let activeCommentsListener = null;
let activeCommentsBusinessId = null;
let editingCommentId = null;
let currentBusinessCommentsList = [];

// Modal dinámico de comentarios
function ensureCommentsModal() {
    if (document.getElementById("sensun-comments-modal")) return;

    const modalDiv = document.createElement("div");
    modalDiv.id = "sensun-comments-modal";
    modalDiv.className = "comments-modal";
    modalDiv.innerHTML = `
        <div class="comments-modal-card">
            <button type="button" class="comments-modal-close" id="comments-modal-close-btn">&times;</button>
            <div class="comments-modal-header">
                <div class="comments-header-icon">💬</div>
                <div>
                    <h3 id="comments-modal-title">Comentarios del Negocio</h3>
                    <p id="comments-modal-subtitle">Opiniones y consultas comunitarias (Anónimo)</p>
                </div>
            </div>
            
            <div id="comments-list-container" class="comments-list-container">
                <div style="text-align: center; padding: 20px; color: #a0aec0;">Cargando comentarios...</div>
            </div>
            
            <div id="comments-form-container" class="comments-form-container">
                <!-- Se actualiza con el estado de autenticación y control anti-spam -->
            </div>
        </div>
    `;

    document.body.appendChild(modalDiv);

    // Cerrar al hacer clic en el botón de cerrar
    document.getElementById("comments-modal-close-btn").addEventListener("click", closeCommentsModal);

    // Cerrar al hacer clic fuera de la tarjeta
    modalDiv.addEventListener("click", (e) => {
        if (e.target === modalDiv) closeCommentsModal();
    });
}

function closeCommentsModal() {
    const modal = document.getElementById("sensun-comments-modal");
    if (modal) modal.classList.remove("active");
    if (activeCommentsListener) {
        activeCommentsListener();
        activeCommentsListener = null;
    }
    activeCommentsBusinessId = null;
    editingCommentId = null;
    currentBusinessCommentsList = [];
}

function openCommentsModal(businessId, businessTitle) {
    ensureCommentsModal();
    const modal = document.getElementById("sensun-comments-modal");
    const titleEl = document.getElementById("comments-modal-title");
    if (titleEl) titleEl.textContent = businessTitle ? `Comentarios: ${businessTitle}` : "Comentarios de la Cartelera";

    activeCommentsBusinessId = businessId;
    editingCommentId = null;
    currentBusinessCommentsList = [];
    modal.classList.add("active");

    renderCommentsForm();
    listenToComments(businessId);
}

function renderCommentsForm() {
    const container = document.getElementById("comments-form-container");
    if (!container) return;

    if (!currentUser) {
        container.innerHTML = `
            <div class="comment-login-prompt">
                <span>Inicia sesión para publicar un comentario anónimo.</span>
                <button type="button" id="btn-open-auth-for-comments">Iniciar Sesión</button>
            </div>
        `;
        const authBtn = container.querySelector("#btn-open-auth-for-comments");
        if (authBtn) {
            authBtn.addEventListener("click", () => {
                closeCommentsModal();
                openAuthModal();
            });
        }
        return;
    }

    // REG DE CONTROL ANTI-SPAM: Verificar si el usuario ya tiene un comentario en este negocio
    const userExistingComment = currentBusinessCommentsList.find(c => c.uid === currentUser.uid);

    if (userExistingComment && !editingCommentId) {
        container.innerHTML = `
            <div class="user-comment-limit-notice" style="padding: 12px 16px; background: rgba(243, 156, 18, 0.12); border: 1px solid rgba(243, 156, 18, 0.3); border-radius: 12px; color: #f39c12; font-size: 0.88rem; text-align: center;">
                <span>✅ Ya has publicado tu comentario en este negocio. Puedes editarlo o eliminarlo en la lista.</span>
            </div>
        `;
        return;
    }

    container.innerHTML = `
        <form id="sensun-comment-form" class="comments-form">
            ${editingCommentId ? `
                <div class="editing-banner">
                    <span>✏️ Editando tu comentario</span>
                    <button type="button" class="btn-cancel-edit" id="btn-cancel-edit-comment">Cancelar</button>
                </div>
            ` : ''}
            <div class="comment-input-wrapper">
                <textarea id="comment-textarea-input" class="comment-textarea" placeholder="Escribe un comentario anónimo..." rows="2" required></textarea>
            </div>
            <div class="comments-form-bottom">
                <span class="anon-notice">🔒 Tu identidad es anónima al público</span>
                <button type="submit" class="btn-send-comment">
                    <span>${editingCommentId ? "Guardar" : "Publicar"}</span>
                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                </button>
            </div>
        </form>
    `;

    const form = container.querySelector("#sensun-comment-form");
    const cancelEditBtn = container.querySelector("#btn-cancel-edit-comment");

    if (cancelEditBtn) {
        cancelEditBtn.addEventListener("click", () => {
            editingCommentId = null;
            renderCommentsForm();
        });
    }

    if (form) {
        form.addEventListener("submit", async (e) => {
            e.preventDefault();
            const textarea = container.querySelector("#comment-textarea-input");
            const text = textarea ? textarea.value.trim() : "";
            if (!text || !activeCommentsBusinessId || !currentUser) return;

            // Verificación redundante Anti-Spam
            if (!editingCommentId && currentBusinessCommentsList.some(c => c.uid === currentUser.uid)) {
                alert("Solo puedes publicar un comentario por negocio. Puedes editar tu comentario existente.");
                renderCommentsForm();
                return;
            }

            try {
                if (editingCommentId) {
                    const commentRef = ref(rtdb, `comments/${activeCommentsBusinessId}/${editingCommentId}`);
                    await update(commentRef, {
                        text: text,
                        editedAt: Date.now()
                    });
                    editingCommentId = null;
                } else {
                    const commentsListRef = ref(rtdb, `comments/${activeCommentsBusinessId}`);
                    const newCommentRef = push(commentsListRef);
                    await set(newCommentRef, {
                        text: text,
                        timestamp: Date.now(),
                        uid: currentUser.uid
                    });
                }
                renderCommentsForm();
            } catch (err) {
                console.error("Error al guardar comentario:", err);
            }
        });
    }
}

function listenToComments(businessId) {
    const listContainer = document.getElementById("comments-list-container");
    if (!listContainer) return;

    if (activeCommentsListener) {
        activeCommentsListener();
        activeCommentsListener = null;
    }

    const commentsRef = ref(rtdb, `comments/${businessId}`);
    activeCommentsListener = onValue(commentsRef, (snapshot) => {
        const commentsData = snapshot.val() || {};
        const commentKeys = Object.keys(commentsData);

        // Ordenar por fecha (más antiguos a más recientes)
        const sortedComments = commentKeys.map(key => ({
            id: key,
            ...commentsData[key]
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

        currentBusinessCommentsList = sortedComments;

        if (commentKeys.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 30px 15px; color: #a0aec0; font-size: 0.9rem;">
                    <p style="margin:0 0 6px 0;">💬 Aún no hay comentarios.</p>
                    <small style="color: #718096;">¡Sé el primero en compartir tu opinión de forma anónima!</small>
                </div>
            `;
            renderCommentsForm();
            return;
        }

        let html = '';
        sortedComments.forEach(c => {
            const isOwn = currentUser && c.uid === currentUser.uid;
            const dateStr = formatCommentDate(c.timestamp);
            const sanitizedText = escapeHtml(c.text || '');

            html += `
                <div class="comment-item ${isOwn ? 'own-comment' : ''}" data-comment-id="${c.id}">
                    <div class="comment-item-header">
                        <div class="comment-author-info">
                            <div class="comment-avatar">👤</div>
                            <span class="comment-author-name">Usuario Anónimo</span>
                            ${isOwn ? `<span class="own-badge">Tu comentario</span>` : ''}
                        </div>
                        <span class="comment-time">${dateStr}</span>
                    </div>
                    <div class="comment-text">${sanitizedText}</div>
                    ${isOwn ? `
                        <div class="comment-actions">
                            <button type="button" class="btn-comment-action edit" data-action="edit" data-id="${c.id}" data-text="${escapeHtml(c.text)}">
                                ✏️ Editar
                            </button>
                            <button type="button" class="btn-comment-action delete" data-action="delete" data-id="${c.id}">
                                🗑️ Eliminar
                            </button>
                        </div>
                    ` : ''}
                </div>
            `;
        });

        listContainer.innerHTML = html;

        // Auto-scroll al final para ver nuevos comentarios
        listContainer.scrollTop = listContainer.scrollHeight;

        // Actualizar el formulario según si el usuario ya comentó o no
        renderCommentsForm();

        // Delegar eventos de editar/eliminar
        listContainer.querySelectorAll(".btn-comment-action").forEach(btn => {
            btn.addEventListener("click", (e) => {
                const action = btn.dataset.action;
                const commentId = btn.dataset.id;
                if (action === "edit") {
                    editingCommentId = commentId;
                    renderCommentsForm();
                    const textarea = document.getElementById("comment-textarea-input");
                    if (textarea) {
                        textarea.value = btn.dataset.text || "";
                        textarea.focus();
                    }
                } else if (action === "delete") {
                    if (confirm("¿Estás seguro de que deseas eliminar este comentario?")) {
                        deleteComment(businessId, commentId);
                    }
                }
            });
        });
    });
}

async function deleteComment(businessId, commentId) {
    try {
        const commentRef = ref(rtdb, `comments/${businessId}/${commentId}`);
        await remove(commentRef);
        if (editingCommentId === commentId) {
            editingCommentId = null;
            renderCommentsForm();
        }
    } catch (err) {
        console.error("Error al eliminar comentario:", err);
    }
}

function formatCommentDate(ts) {
    if (!ts) return '';
    const date = new Date(ts);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Justo ahora';
    if (diffMins < 60) return `Hace ${diffMins} min`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Hace ${diffHours} h`;
    
    return date.toLocaleDateString('es-SV', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Inyección de botones de comentarios en las tarjetas de carteleras (Formato Circular Compacto en Línea de Estrellas)
function injectCommentButtons() {
    // Eliminar botones erroneamente inyectados en tarjetas informativas del slider de novedades sin widget de estrellas
    document.querySelectorAll(".novedades-section .slider-card, .novedades-slider .slider-card").forEach(slide => {
        if (!slide.querySelector(".sensun-rating-widget")) {
            const btn = slide.querySelector(".compact-comment-circle-btn");
            if (btn) btn.remove();
        }
    });

    const cards = document.querySelectorAll(".negocio-card, .producto-card");
    cards.forEach(card => {
        if (card.classList.contains("disponible")) return;

        // Ignorar tarjetas puramente informativas del slider sin widget de calificación
        if (card.closest(".novedades-section, .novedades-slider") && !card.querySelector(".sensun-rating-widget")) return;
        
        // Limpiar botones antiguos en .negocio-links si existieran
        const oldLinkBtn = card.querySelector(".negocio-links .btn-comment");
        if (oldLinkBtn) oldLinkBtn.remove();

        const ratingWidget = card.querySelector(".sensun-rating-widget");
        let businessId = card.dataset.businessId || (ratingWidget ? ratingWidget.dataset.businessId : null) || (card.id ? card.id.toLowerCase() : null);

        const titleEl = card.querySelector("h3");
        const titleText = titleEl ? titleEl.textContent.trim() : "";

        if (!businessId && titleText) {
            businessId = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        }
        if (!businessId) return;

        // Evitar duplicados
        if (card.querySelector(".compact-comment-circle-btn")) return;

        // Crear el botón circular compacto
        const btn = document.createElement("button");
        btn.type = "button";
        btn.className = "compact-comment-circle-btn";
        btn.dataset.businessId = businessId;
        btn.title = "Ver comentarios comunitarios";
        btn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 9h12v2H6V9zm8 5H6v-2h8v2zm4-6H6V6h12v2z"/>
            </svg>
            <span class="comment-micro-badge">0</span>
        `;

        btn.addEventListener("click", (e) => {
            e.preventDefault();
            e.stopPropagation();
            openCommentsModal(businessId, titleText);
        });

        // Insertar en la sección de estrellas del widget
        if (ratingWidget) {
            let container = ratingWidget.querySelector(".star-rating-container");
            if (!container) {
                ratingWidget.style.display = "flex";
                ratingWidget.style.alignItems = "center";
                ratingWidget.style.justifyContent = "space-between";
                ratingWidget.style.width = "100%";
                ratingWidget.appendChild(btn);
            } else {
                container.style.display = "flex";
                container.style.alignItems = "center";
                container.style.justifyContent = "space-between";
                container.style.width = "100%";
                container.appendChild(btn);
            }
        } else {
            // Fallback solo para tarjetas de negocio reales con .negocio-info
            const content = card.querySelector(".negocio-info");
            if (content) {
                const targetRow = content.querySelector(".stars-row, h3") || content;
                targetRow.appendChild(btn);
            }
        }

        // Escuchar número de comentarios en tiempo real
        const countBadge = btn.querySelector(".comment-micro-badge");
        const commentsRef = ref(rtdb, `comments/${businessId}`);
        onValue(commentsRef, (snapshot) => {
            const val = snapshot.val() || {};
            const count = Object.keys(val).length;
            if (countBadge) countBadge.textContent = count;
        });
    });
}

// Inicializar carrusel automático para contenedores de etiquetas con 4+ etiquetas o desbordamiento
function initTagsCarousel() {
    const containers = document.querySelectorAll(".negocio-tags, .producto-tags");
    containers.forEach(container => {
        const tags = container.querySelectorAll(".tag");
        if (tags.length >= 4 || container.scrollWidth > container.clientWidth) {
            container.classList.add("has-carousel-tags");
            if (!container.querySelector(".tags-track")) {
                const track = document.createElement("div");
                track.className = "tags-track";
                while (container.firstChild) {
                    track.appendChild(container.firstChild);
                }
                container.appendChild(track);
            }
            
            const track = container.querySelector(".tags-track");
            if (track) {
                const maxSlide = Math.max(0, track.scrollWidth - container.clientWidth + 14);
                track.style.setProperty("--tags-slide-dist", `-${maxSlide}px`);
            }
        }
    });
}

// Inicializar Modal de Ficha Ampliada (Perfil de negocio flotante al tocar Imagen, Título o Descripción en la cartelera)
function initCardExpandModal() {
    let modal = document.getElementById("card-expand-modal");
    if (!modal) {
        modal = document.createElement("div");
        modal.id = "card-expand-modal";
        modal.className = "card-expand-modal-overlay";
        modal.innerHTML = `
            <div class="card-expand-modal-card">
                <div class="card-expand-modal-body"></div>
                <button type="button" class="card-expand-close-btn" id="card-expand-close-btn-el" aria-label="Cerrar">&times;</button>
            </div>
        `;
        document.body.appendChild(modal);

        const closeCardExpandModal = () => {
            modal.classList.remove("active");
            setTimeout(() => {
                if (!modal.classList.contains("active")) {
                    modal.style.display = "none";
                }
            }, 250);
        };

        modal.addEventListener("click", (e) => {
            // 1. Cerrar al tocar backdrop o botón X (circulo)
            const closeBtn = e.target.closest(".card-expand-close-btn, #card-expand-close-btn-el");
            if (e.target === modal || closeBtn) {
                e.preventDefault();
                e.stopPropagation();
                closeCardExpandModal();
                return;
            }

            // 2. Tocar Botón de Comentarios (💬) dentro del perfil flotante -> Abrir modal de comentarios
            const commentBtn = e.target.closest(".compact-comment-circle-btn, .btn-comment, .comment-trigger-btn");
            if (commentBtn) {
                e.preventDefault();
                e.stopPropagation();
                const clonedCard = modal.querySelector(".producto-card, .negocio-card");
                const ratingWidget = clonedCard ? clonedCard.querySelector(".sensun-rating-widget") : null;
                let businessId = commentBtn.dataset.businessId || (clonedCard ? clonedCard.dataset.businessId : null) || (ratingWidget ? ratingWidget.dataset.businessId : null);
                const titleEl = clonedCard ? clonedCard.querySelector("h3") : null;
                const titleText = titleEl ? titleEl.textContent.trim() : "";
                
                if (!businessId && titleText) {
                    businessId = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
                }
                if (businessId) {
                    openCommentsModal(businessId, titleText);
                }
                return;
            }

            // 3. Tocar Botón de Favorito (★) dentro del perfil flotante -> Alternar favorito
            const favBtn = e.target.closest(".favorite-toggle-btn, .btn-favorite");
            if (favBtn) {
                e.preventDefault();
                e.stopPropagation();
                const clonedCard = modal.querySelector(".producto-card, .negocio-card");
                const ratingWidget = clonedCard ? clonedCard.querySelector(".sensun-rating-widget") : null;
                let businessId = favBtn.dataset.businessId || (clonedCard ? clonedCard.dataset.businessId : null) || (ratingWidget ? ratingWidget.dataset.businessId : null);
                if (!businessId && clonedCard && clonedCard.id) {
                    businessId = clonedCard.id.toLowerCase();
                }
                if (businessId) {
                    toggleFavorite(businessId);
                }
                return;
            }

            // 4. Tocar FOTO dentro del perfil flotante -> Ampliar foto en Lightbox (Ignorar si se tocó un botón de control o flechas del carrusel)
            const isControlBtn = e.target.closest("button, a, .favorite-toggle-btn, .btn-favorite, .compact-comment-circle-btn, .share-card-btn, .card-car-btn, .card-car-dots, .card-dot, .btn-negocio");
            if (isControlBtn) return;

            const img = e.target.closest("img");
            if (img) {
                e.preventDefault();
                e.stopPropagation();
                const lightbox = document.getElementById("sensun-image-lightbox");
                const src = img.getAttribute("src");
                if (src && lightbox) {
                    openImageLightbox(src, img.getAttribute("alt") || "Imagen ampliada del negocio", lightbox);
                }
                return;
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && modal.classList.contains("active")) {
                closeCardExpandModal();
            }
        });
    }

    // Delegación de eventos en las tarjetas de la cartelera del catálogo
    document.addEventListener("click", (e) => {
        // Ignorar si el clic ocurrió DENTRO de un modal flotante abierto
        if (e.target.closest("#card-expand-modal, #sensun-comments-modal, #sensun-image-lightbox")) return;

        const card = e.target.closest(".producto-card, .negocio-card");
        if (!card) return;

        // Comprobar si el clic fue en un elemento interactivo directo
        const isInteractive = e.target.closest("a, button, .favorite-toggle-btn, .btn-favorite, .compact-comment-circle-btn, .share-card-btn");
        if (isInteractive) return;

        // Abrir el perfil flotante / Ficha Ampliada al tocar la imagen, el título, la descripción o la tarjeta
        openCardExpandModal(card, modal);
    });

    // Delegación de clic en el TÍTULO / NOMBRE de las tarjetas de novedades (Recién Llegados / Novedades)
    document.addEventListener("click", (e) => {
        const sliderTitle = e.target.closest(".slider-card-content h3, .slider-card h3");
        if (!sliderTitle) return;

        if (e.target.closest(".share-card-btn")) return;

        const sliderCard = sliderTitle.closest(".slider-card");
        if (!sliderCard) return;

        const widget = sliderCard.querySelector(".sensun-rating-widget");
        const titleText = sliderTitle.textContent.replace("✓", "").trim();
        const bizId = sliderCard.id || sliderCard.dataset.businessId || (widget ? widget.dataset.businessId : "") || titleText;

        // Buscar la tarjeta real en el catálogo de la página
        let targetCard = null;
        if (bizId) {
            const cleanSlug = bizId.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            const foundEl = document.getElementById(bizId) || document.getElementById(cleanSlug) || document.querySelector(`[data-business-id="${bizId}"], [data-business-id="${cleanSlug}"]`);
            if (foundEl) {
                targetCard = foundEl.closest("#negocios-container .producto-card, .productos-grid .producto-card, .negocio-card") || foundEl;
            }
        }
        if (!targetCard && titleText) {
            const cleanTitle = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            const allCards = document.querySelectorAll("#negocios-container .producto-card, .productos-grid .producto-card, .negocio-card");
            for (const c of allCards) {
                if (c.closest(".novedades-slider, .slider-wrapper, .novedades-section")) continue;
                const h3 = c.querySelector("h3");
                const tSlug = h3 ? h3.textContent.replace("✓", "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "";
                if (tSlug === cleanTitle || (c.id && c.id.toLowerCase() === cleanTitle)) {
                    targetCard = c;
                    break;
                }
            }
        }

        if (targetCard) {
            e.preventDefault();
            e.stopPropagation();

            // Si la tarjeta está oculta por un filtro activo, restablecer a 'Todos'
            if (targetCard.classList.contains("hidden-filter") || targetCard.style.display === "none") {
                const allFilterBtn = document.querySelector('.filter-btn[data-filter="all"], #category-filter-container .filter-btn[data-filter="all"]');
                if (allFilterBtn) {
                    allFilterBtn.click();
                }
            }

            const modalEl = modal || document.getElementById("card-expand-modal");
            setTimeout(() => {
                targetCard.scrollIntoView({ behavior: "smooth", block: "center" });
                targetCard.classList.add("card-anchor-highlight");
                setTimeout(() => targetCard.classList.remove("card-anchor-highlight"), 3500);

                if (modalEl && typeof openCardExpandModal === "function") {
                    openCardExpandModal(targetCard, modalEl);
                }
            }, 100);
        } else {
            // Si la tarjeta está en otra página (ej. estamos en sensunshop.html), redirigir a la categoría
            const cleanSlug = (bizId || titleText).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
            const isLocalBiz = cleanSlug.startsWith("neg") || cleanSlug.includes("arphoto") || cleanSlug.includes("terrazas") || cleanSlug.includes("gloria") || cleanSlug.includes("taco") || cleanSlug.includes("bicicleta") || cleanSlug.includes("patrick");
            const basePath = window.location.pathname.includes("/sensunshop/") ? "" : "sensunshop/";
            if (isLocalBiz) {
                window.location.href = `${basePath}negocioslocales.html?biz=${cleanSlug}#${cleanSlug}`;
            }
        }
    });
}

// Inyección y Lógica para Botones de Compartir (Anclas de Objetos)
function injectShareButtons() {
    const cards = document.querySelectorAll(".producto-card, .negocio-card, .slider-card");
    cards.forEach((card) => {
        const h3 = card.querySelector(".producto-info h3, .slider-card-content h3, h3");
        if (!h3 || h3.querySelector(".share-card-btn")) return;

        const ratingWidget = card.querySelector(".sensun-rating-widget");
        const titleText = h3.textContent.replace("✓", "").trim();
        let bizId = card.id || card.dataset.businessId || (ratingWidget ? ratingWidget.dataset.businessId : null);
        if (!bizId && titleText) {
            bizId = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
        }

        if (!card.id && bizId) {
            card.id = bizId;
        }

        const shareBtn = document.createElement("button");
        shareBtn.type = "button";
        shareBtn.className = "share-card-btn";
        shareBtn.title = "Compartir este negocio";
        shareBtn.dataset.bizId = bizId || "";
        shareBtn.innerHTML = `
            <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92c0-1.61-1.31-2.92-2.92-2.92z"/>
            </svg>
        `;
        h3.appendChild(shareBtn);
    });
}

// Escuchador global para copiar enlace o compartir vía Web Share API
document.addEventListener("click", async (e) => {
    const shareBtn = e.target.closest(".share-card-btn");
    if (!shareBtn) return;
    e.preventDefault();
    e.stopPropagation();

    const card = shareBtn.closest(".producto-card, .negocio-card, .slider-card");
    const ratingWidget = card ? card.querySelector(".sensun-rating-widget") : null;
    const titleEl = card ? card.querySelector("h3") : null;
    let titleText = titleEl ? titleEl.textContent.replace("✓", "").trim() : "Negocio";

    let bizId = shareBtn.dataset.bizId || (card ? card.id : null) || (card ? card.dataset.businessId : null) || (ratingWidget ? ratingWidget.dataset.businessId : null);
    if (!bizId && titleText) {
        bizId = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    }

    const url = new URL(window.location.href);
    url.searchParams.set("biz", bizId);
    url.hash = bizId;
    const shareUrl = url.toString();

    if (navigator.share && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)) {
        try {
            await navigator.share({
                title: titleText,
                text: `Mira la ficha de ${titleText} en Sensun Shop:`,
                url: shareUrl
            });
            return;
        } catch (err) {
            // Respaldar a copiar
        }
    }

    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            await navigator.clipboard.writeText(shareUrl);
        } else {
            const textArea = document.createElement("textarea");
            textArea.value = shareUrl;
            document.body.appendChild(textArea);
            textArea.select();
            document.execCommand("copy");
            document.body.removeChild(textArea);
        }

        shareBtn.classList.add("copied");
        const originalTitle = shareBtn.title;
        shareBtn.title = "¡Enlace copiado!";

        if (typeof window.showNotification === "function") {
            window.showNotification("¡Enlace Copiado!", `Se copió el enlace directo de ${titleText} al portapapeles.`, "success");
        } else if (typeof window.showToast === "function") {
            window.showToast("¡Enlace copiado al portapapeles!");
        } else {
            alert(`¡Enlace copiado al portapapeles!\n${shareUrl}`);
        }

        setTimeout(() => {
            shareBtn.classList.remove("copied");
            shareBtn.title = originalTitle;
        }, 2500);
    } catch (err) {
        console.error("Error al copiar enlace:", err);
    }
});

// Manejo de Ancla Directa al Cargar la Página (Lleva directamente a la ficha y ABRIR la ventana flotante)
function handleDirectBusinessAnchor() {
    const urlParams = new URLSearchParams(window.location.search);
    const bizParam = urlParams.get("biz") || window.location.hash.replace("#", "");
    if (!bizParam) return;

    const cleanSlug = bizParam.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    if (!cleanSlug) return;

    const findTargetCard = () => {
        let targetCard = document.getElementById(bizParam) || document.getElementById(cleanSlug);
        if (!targetCard) {
            targetCard = document.querySelector(`[data-business-id="${bizParam}"], [data-business-id="${cleanSlug}"]`);
        }
        if (!targetCard) {
            const allCards = document.querySelectorAll(".producto-card, .negocio-card");
            for (const c of allCards) {
                const h3 = c.querySelector("h3");
                const widget = c.querySelector(".sensun-rating-widget");
                const wId = widget ? widget.dataset.businessId : null;
                const tSlug = h3 ? h3.textContent.trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "") : "";
                if ((c.id && c.id.toLowerCase() === cleanSlug) || wId === cleanSlug || tSlug === cleanSlug) {
                    targetCard = c;
                    break;
                }
            }
        }
        return targetCard;
    };

    setTimeout(() => {
        const targetCard = findTargetCard();
        if (targetCard) {
            targetCard.scrollIntoView({ behavior: "smooth", block: "center" });

            targetCard.classList.add("card-anchor-highlight");
            setTimeout(() => targetCard.classList.remove("card-anchor-highlight"), 3500);

            const modal = document.getElementById("card-expand-modal");
            if (modal && typeof openCardExpandModal === "function") {
                openCardExpandModal(targetCard, modal);
            }
        }
    }, 500);
}

function openCardExpandModal(card, modal) {
    const modalBody = modal.querySelector(".card-expand-modal-body");
    if (!modalBody) return;

    const clonedCard = card.cloneNode(true);
    const originalId = card.id ? card.id.toLowerCase() : "";
    clonedCard.removeAttribute("id");

    const ratingWidget = clonedCard.querySelector(".sensun-rating-widget");
    let businessId = card.dataset.businessId || clonedCard.dataset.businessId || (ratingWidget ? ratingWidget.dataset.businessId : null) || originalId;
    const titleEl = clonedCard.querySelector("h3");
    const titleText = titleEl ? titleEl.textContent.replace("✓", "").trim() : "";

    if (!businessId && titleText) {
        businessId = titleText.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
    }

    if (businessId) {
        clonedCard.dataset.businessId = businessId;
    }

    // Asegurar que el párrafo de descripción muestre el texto completo
    const clonedP = clonedCard.querySelector("p");
    if (clonedP) {
        clonedP.style.webkitLineClamp = "unset";
        clonedP.style.lineClamp = "unset";
        clonedP.style.display = "block";
        clonedP.style.overflow = "visible";
    }

    // Configurar carrusel con flechas activas dentro del modal ampliado
    const container = clonedCard.querySelector(".producto-img");
    if (container) {
        const track = container.querySelector(".card-carousel-track");
        const slides = track ? track.querySelectorAll("img") : [];
        if (slides.length > 1) {
            container.querySelectorAll(".card-car-btn").forEach(b => b.remove());

            const prevBtn = document.createElement("button");
            prevBtn.type = "button";
            prevBtn.className = "card-car-btn prev";
            prevBtn.setAttribute("aria-label", "Foto anterior");
            prevBtn.innerHTML = "&lsaquo;";

            const nextBtn = document.createElement("button");
            nextBtn.type = "button";
            nextBtn.className = "card-car-btn next";
            nextBtn.setAttribute("aria-label", "Foto siguiente");
            nextBtn.innerHTML = "&rsaquo;";

            container.appendChild(prevBtn);
            container.appendChild(nextBtn);

            let currentIndex = parseInt(container.dataset.currentIndex || "0");
            const updateSlide = (newIndex) => {
                currentIndex = (newIndex + slides.length) % slides.length;
                container.dataset.currentIndex = currentIndex;
                track.style.transform = `translateX(-${currentIndex * 100}%)`;

                const dots = container.querySelectorAll(".card-dot");
                dots.forEach((dot, idx) => {
                    if (idx === currentIndex) {
                        dot.style.background = "#f39c12";
                        dot.style.width = "16px";
                        dot.style.borderRadius = "4px";
                    } else {
                        dot.style.background = "rgba(255,255,255,0.6)";
                        dot.style.width = "7px";
                        dot.style.borderRadius = "50%";
                    }
                });
            };

            prevBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateSlide(currentIndex - 1);
            });

            nextBtn.addEventListener("click", (e) => {
                e.preventDefault();
                e.stopPropagation();
                updateSlide(currentIndex + 1);
            });
        }
    }

    // Mantener la sincronización en tiempo real del contador de comentarios en el modal
    const commentBtn = clonedCard.querySelector(".compact-comment-circle-btn");
    if (commentBtn && businessId) {
        commentBtn.dataset.businessId = businessId;
        const countBadge = commentBtn.querySelector(".comment-micro-badge");
        if (countBadge) {
            const commentsRef = ref(rtdb, `comments/${businessId}`);
            onValue(commentsRef, (snapshot) => {
                const val = snapshot.val() || {};
                const count = Object.keys(val).length;
                if (countBadge) countBadge.textContent = count;
            });
        }
    }

    // Mantener sincronizado el botón de favorito en el modal
    const favBtn = clonedCard.querySelector(".favorite-toggle-btn");
    if (favBtn && businessId) {
        favBtn.dataset.businessId = businessId;
    }

    modalBody.innerHTML = "";
    modalBody.appendChild(clonedCard);
    modal.style.display = "flex";
    modal.offsetHeight;
    modal.classList.add("active");
    syncFavoritesUI();
}

window.initCardExpandModal = initCardExpandModal;
window.injectShareButtons = injectShareButtons;
window.handleDirectBusinessAnchor = handleDirectBusinessAnchor;

// Inicializar Modal de Imagen Ampliada (Lightbox)
function initImageLightboxModal() {
    let lightbox = document.getElementById("sensun-image-lightbox");
    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.id = "sensun-image-lightbox";
        lightbox.className = "image-lightbox-modal";
        lightbox.innerHTML = `
            <div class="image-lightbox-container">
                <button type="button" class="image-lightbox-close" id="image-lightbox-close-btn" aria-label="Cerrar imagen">&times;</button>
                <img src="" alt="Imagen Ampliada" class="image-lightbox-img" id="image-lightbox-img-el">
            </div>
        `;
        document.body.appendChild(lightbox);

        const closeLightbox = () => {
            lightbox.classList.remove("active");
            setTimeout(() => {
                if (!lightbox.classList.contains("active")) {
                    lightbox.style.display = "none";
                }
            }, 250);
        };

        lightbox.addEventListener("click", (e) => {
            const isImg = e.target.closest(".image-lightbox-img, #image-lightbox-img-el");
            if (!isImg || e.target.closest("#image-lightbox-close-btn")) {
                e.preventDefault();
                e.stopPropagation();
                closeLightbox();
            }
        });

        document.addEventListener("keydown", (e) => {
            if (e.key === "Escape" && lightbox.classList.contains("active")) {
                closeLightbox();
            }
        });
    }

    // Escuchar clics en imágenes fuera del perfil flotante
    document.addEventListener("click", (e) => {
        const isInteractive = e.target.closest("button, a, .favorite-toggle-btn, .btn-favorite, .share-card-btn, .card-car-btn, .card-car-dots, .card-dot, .btn-negocio");
        if (isInteractive) return;

        // Excluir cualquier imagen dentro de la sección o mostrador de novedades / recién llegados
        if (e.target.closest(".novedades-section, .novedades-slider, .slider-wrapper, .slider-card, .slider-card-img")) {
            return;
        }

        const img = e.target.closest(".producto-img img, .producto-foto");
        if (!img) return;

        const inExpandModal = e.target.closest("#card-expand-modal");
        const inGridCard = e.target.closest(".producto-card, .negocio-card");

        if (inGridCard && !inExpandModal) {
            return;
        }

        const src = img.getAttribute("src");
        if (!src) return;

        openImageLightbox(src, img.getAttribute("alt") || "Imagen del negocio", lightbox);
    });
}

function openImageLightbox(src, alt, lightbox) {
    const lb = lightbox || document.getElementById("sensun-image-lightbox");
    if (!lb) return;
    const imgEl = lb.querySelector("#image-lightbox-img-el");
    if (!imgEl) return;

    imgEl.src = src;
    imgEl.alt = alt || "Imagen ampliada del negocio";
    lb.style.display = "flex";
    lb.offsetHeight;
    lb.classList.add("active");
}

window.initImageLightboxModal = initImageLightboxModal;

// Efecto de despegue de avioncito para botones de WhatsApp
function initWhatsAppPlaneEffect() {
    document.addEventListener("click", function(e) {
        const btn = e.target.closest("a.btn-wsp, .btn-negocio.btn-wsp, .js-wsp-plane");
        if (!btn) return;

        const href = btn.getAttribute("href");
        if (!href || href === "#" || href.startsWith("javascript:")) return;

        if (btn.classList.contains("is-flying")) {
            e.preventDefault();
            return;
        }

        e.preventDefault();
        btn.classList.add("is-flying");

        // Inyectar el SVG del avioncito si no existe
        let planeSvg = btn.querySelector(".wsp-plane-anim");
        if (!planeSvg) {
            planeSvg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
            planeSvg.setAttribute("class", "wsp-plane-anim");
            planeSvg.setAttribute("viewBox", "0 0 24 24");
            planeSvg.innerHTML = '<path d="M22 2L11 13"/><path d="M22 2L15 22L11 13L2 9L22 2Z"/>';
            btn.appendChild(planeSvg);
        }

        // Guardar texto para efecto visual
        const textNode = Array.from(btn.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.textContent.trim().length > 0);
        const originalText = textNode ? textNode.textContent : null;
        if (textNode) {
            textNode.textContent = " ¡Volando…!";
        }

        setTimeout(() => {
            window.open(href, "_blank", "noopener,noreferrer");
            setTimeout(() => {
                btn.classList.remove("is-flying");
                if (textNode && originalText !== null) {
                    textNode.textContent = originalText;
                }
            }, 1000);
        }, 450);
    }, false);
}

window.initWhatsAppPlaneEffect = initWhatsAppPlaneEffect;

// ==========================================================
// SISTEMA DE CAMPANA FLOTANTE (FAB) Y POPUP CON EFECTO DE ENCOGIMIENTO
// ==========================================================
let currentActiveFeedItems = [];
let activePopupItem = null;

function initSensunBellAndPopupSystem() {
    // 1. Inyectar botón de Campana Flotante (FAB) si no existe
    let bellFab = document.getElementById("sensunBellFab");
    if (!bellFab) {
        bellFab = document.createElement("button");
        bellFab.id = "sensunBellFab";
        bellFab.className = "sensun-bell-fab";
        bellFab.setAttribute("aria-label", "Ver Boletines y Ofertas");
        bellFab.setAttribute("title", "Boletines y Ofertas de Sensuntepeque");
        bellFab.innerHTML = `
            <div class="sensun-bell-icon-wrap">
                <svg viewBox="0 0 24 24">
                    <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2zm-2 1H8v-6c0-2.48 1.51-4.5 4-4.5s4 2.02 4 4.5v6z"/>
                </svg>
                <span class="sensun-bell-badge" id="sensunBellBadge" style="display: none;">0</span>
            </div>
        `;
        document.body.appendChild(bellFab);

        bellFab.addEventListener("click", () => {
            toggleSensunBellHub();
        });
    }

    // 2. Inyectar Popup Modal si no existe
    let popupBackdrop = document.getElementById("sensunPopupBackdrop");
    if (!popupBackdrop) {
        popupBackdrop = document.createElement("div");
        popupBackdrop.id = "sensunPopupBackdrop";
        popupBackdrop.className = "sensun-popup-backdrop";
        popupBackdrop.innerHTML = `
            <div class="sensun-popup-modal" id="sensunPopupModal">
                <button type="button" class="sensun-popup-close-btn" id="sensunPopupCloseBtn" aria-label="Cerrar y encoger a campana">✕</button>
                <div class="sensun-popup-img-container" id="sensunPopupImgWrap">
                    <img id="sensunPopupImg" src="" alt="Boletín / Oferta">
                </div>
                <div class="sensun-popup-body">
                    <div class="sensun-popup-header-row">
                        <span class="sensun-popup-badge" id="sensunPopupBadge">BOLETÍN</span>
                        <span class="sensun-popup-date" id="sensunPopupDate">Sensun Shop</span>
                    </div>
                    <h2 class="sensun-popup-title" id="sensunPopupTitle">Título</h2>
                    <div class="sensun-popup-offer-banner" id="sensunPopupOfferBanner" style="display: none;">
                        <span>🏷️</span>
                        <span id="sensunPopupOfferText">¡Oferta disponible!</span>
                    </div>
                    <p class="sensun-popup-desc" id="sensunPopupDesc">Descripción</p>
                    <div class="sensun-popup-actions" id="sensunPopupActions">
                        <a href="#" class="sensun-popup-btn-wsp" id="sensunPopupBtnWsp" target="_blank" rel="noopener noreferrer">
                            <span>📲 Contactar por WhatsApp</span>
                        </a>
                        <a href="#" class="sensun-popup-btn-loc" id="sensunPopupBtnLoc" target="_blank" rel="noopener noreferrer" style="display: none;">
                            <span>📍 Ubicación</span>
                        </a>
                    </div>
                    <div class="sensun-popup-minimize-hint">
                        <span>🔔 Al cerrar, se guardará en la campana para cuando quieras volver a verlo.</span>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(popupBackdrop);

        // Eventos para cerrar y encoger hacia la campana
        document.getElementById("sensunPopupCloseBtn").addEventListener("click", () => {
            closeSensunPopupWithShrinkAnimation();
        });

        popupBackdrop.addEventListener("click", (e) => {
            if (e.target === popupBackdrop) {
                closeSensunPopupWithShrinkAnimation();
            }
        });
    }

    // 3. Inyectar Drawer / Hub de la Campana
    let bellHub = document.getElementById("sensunBellHub");
    if (!bellHub) {
        bellHub = document.createElement("div");
        bellHub.id = "sensunBellHub";
        bellHub.className = "sensun-bell-hub-drawer";
        bellHub.innerHTML = `
            <div class="sensun-hub-header">
                <div class="sensun-hub-title">
                    <span>🔔</span>
                    <span>Boletines & Ofertas Activas</span>
                </div>
                <button type="button" class="sensun-hub-close" id="sensunHubCloseBtn">✕</button>
            </div>
            <div class="sensun-hub-list" id="sensunHubList">
                <!-- Se llena con las publicaciones en tiempo real -->
            </div>
        `;
        document.body.appendChild(bellHub);

        document.getElementById("sensunHubCloseBtn").addEventListener("click", () => {
            bellHub.classList.remove("open");
        });

        document.addEventListener("click", (e) => {
            if (!bellHub.contains(e.target) && !bellFab.contains(e.target) && bellHub.classList.contains("open")) {
                bellHub.classList.remove("open");
            }
        });
    }

    updateBellAndPopupFeed();
}

// Actualizar contenido de la campana y disparar popup de entrada
function updateBellAndPopupFeed() {
    const items = [];

    // 1. Boletines
    (cachedBulletinsList || []).forEach(b => {
        const cat = resolveNewsBadge(b.badge || "boletines");
        items.push({
            id: b.id,
            title: b.title,
            description: b.description,
            imgSrc: b.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: cat.badge,
            badgeBg: cat.bg,
            badgeColor: cat.textColor,
            badgeBorder: cat.border,
            whatsapp: b.whatsapp,
            locationUrl: b.locationUrl,
            hasOffer: false,
            offerMsg: ""
        });
    });

    // 2. Ofertas de comercios o sensunshop/offers
    (cachedOffersList || []).forEach(o => {
        const cat = resolveNewsBadge("anuncios");
        items.push({
            id: o.id,
            title: o.title,
            description: o.description,
            imgSrc: o.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: "OFERTA",
            badgeBg: "rgba(234, 88, 12, 0.2)",
            badgeColor: "#ff8c42",
            badgeBorder: "rgba(234, 88, 12, 0.5)",
            whatsapp: o.whatsapp,
            locationUrl: o.locationUrl,
            hasOffer: true,
            offerMsg: o.offerMsg || o.description
        });
    });

    (cachedParsedBusinesses || []).filter(b => b.hasOffer).forEach(b => {
        items.push({
            id: b.id,
            title: b.title,
            description: b.description,
            imgSrc: b.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: "PROMO EXCLUSIVA",
            badgeBg: "rgba(234, 88, 12, 0.2)",
            badgeColor: "#ff8c42",
            badgeBorder: "rgba(234, 88, 12, 0.5)",
            whatsapp: b.whatsapp,
            locationUrl: b.locationUrl,
            hasOffer: true,
            offerMsg: b.offerMsg || "¡Pregunta por promociones exclusivas en Sensun Shop!"
        });
    });

    // 3. Noticias
    (cachedNewsList || []).forEach(n => {
        const cat = resolveNewsBadge(n.badge || "noticias");
        items.push({
            id: n.id,
            title: n.title,
            description: n.description,
            imgSrc: n.imgSrc || "imagenes/logos/icono-sensun-shop.webp",
            badge: cat.badge,
            badgeBg: cat.bg,
            badgeColor: cat.textColor,
            badgeBorder: cat.border,
            whatsapp: n.whatsapp,
            locationUrl: n.locationUrl,
            hasOffer: n.hasOffer,
            offerMsg: n.offerMsg
        });
    });

    const seen = new Set();
    const uniqueItems = items.filter(item => {
        if (seen.has(item.id)) return false;
        seen.add(item.id);
        return true;
    });

    currentActiveFeedItems = uniqueItems;

    // Actualizar badge de la campana
    const badgeEl = document.getElementById("sensunBellBadge");
    const bellFab = document.getElementById("sensunBellFab");

    if (badgeEl && bellFab) {
        if (uniqueItems.length > 0) {
            badgeEl.textContent = uniqueItems.length;
            badgeEl.style.display = "flex";
            bellFab.classList.add("has-unread");
        } else {
            badgeEl.style.display = "none";
            bellFab.classList.remove("has-unread");
        }
    }

    // Actualizar Hub List
    const hubList = document.getElementById("sensunHubList");
    if (hubList) {
        if (uniqueItems.length === 0) {
            hubList.innerHTML = `<div style="text-align:center; padding: 20px; color:#94a3b8; font-size:13px;">No hay publicaciones nuevas por ahora</div>`;
        } else {
            hubList.innerHTML = uniqueItems.map((item, i) => `
                <div class="sensun-hub-item" onclick="window.showSensunPopupForItemIndex(${i})">
                    <img src="${item.imgSrc}" alt="${item.title}" class="sensun-hub-item-img" onerror="this.src='imagenes/logos/icono-sensun-shop.webp'">
                    <div class="sensun-hub-item-content">
                        <span class="sensun-hub-item-badge" style="color: ${item.badgeColor};">${item.badge}</span>
                        <div class="sensun-hub-item-title">${item.title}</div>
                        <div class="sensun-hub-item-desc">${item.hasOffer ? '🏷️ ' + item.offerMsg : item.description}</div>
                    </div>
                </div>
            `).join('');
        }
    }

    // Disparar popup emergente en la primera carga si hay items disponibles
    if (uniqueItems.length > 0 && !sessionStorage.getItem("sensun_popup_seen")) {
        setTimeout(() => {
            showSensunPopup(uniqueItems[0]);
        }, 1200);
    }
}

function showSensunPopup(item) {
    if (!item) return;
    activePopupItem = item;

    const backdrop = document.getElementById("sensunPopupBackdrop");
    const modal = document.getElementById("sensunPopupModal");
    const img = document.getElementById("sensunPopupImg");
    const badge = document.getElementById("sensunPopupBadge");
    const title = document.getElementById("sensunPopupTitle");
    const desc = document.getElementById("sensunPopupDesc");
    const offerBanner = document.getElementById("sensunPopupOfferBanner");
    const offerText = document.getElementById("sensunPopupOfferText");
    const btnWsp = document.getElementById("sensunPopupBtnWsp");
    const btnLoc = document.getElementById("sensunPopupBtnLoc");

    if (!backdrop || !modal) return;

    modal.classList.remove("shrinking-to-bell");

    img.src = item.imgSrc || "imagenes/logos/icono-sensun-shop.webp";
    badge.textContent = item.badge;
    badge.style.background = item.badgeBg || "rgba(232, 98, 26, 0.15)";
    badge.style.color = item.badgeColor || "var(--ss-orange)";
    badge.style.border = `1px solid ${item.badgeBorder || "rgba(232, 98, 26, 0.3)"}`;

    title.textContent = item.title;
    desc.textContent = item.description;

    if (item.hasOffer && item.offerMsg) {
        offerBanner.style.display = "flex";
        offerText.textContent = item.offerMsg;
    } else {
        offerBanner.style.display = "none";
    }

    if (item.whatsapp) {
        btnWsp.style.display = "inline-flex";
        const cleanPhone = item.whatsapp.replace(/\D/g, "");
        const msg = encodeURIComponent(`Hola ${item.title}, vi su publicación en Sensun Shop y me gustaría obtener más información.`);
        btnWsp.href = `https://api.whatsapp.com/send?phone=${cleanPhone}&text=${msg}`;
    } else {
        btnWsp.style.display = "none";
    }

    if (item.locationUrl) {
        btnLoc.style.display = "inline-flex";
        btnLoc.href = item.locationUrl;
    } else {
        btnLoc.style.display = "none";
    }

    backdrop.classList.add("active");
}

function closeSensunPopupWithShrinkAnimation() {
    const backdrop = document.getElementById("sensunPopupBackdrop");
    const modal = document.getElementById("sensunPopupModal");
    const bellFab = document.getElementById("sensunBellFab");

    if (!backdrop || !modal) return;

    modal.classList.add("shrinking-to-bell");
    sessionStorage.setItem("sensun_popup_seen", "true");

    setTimeout(() => {
        backdrop.classList.remove("active");
        modal.classList.remove("shrinking-to-bell");

        // Efecto de campana al recibir el encogimiento
        if (bellFab) {
            bellFab.style.transform = "scale(1.3) translateY(-5px)";
            bellFab.style.borderColor = "#ff9f43";
            setTimeout(() => {
                bellFab.style.transform = "";
                bellFab.style.borderColor = "";
            }, 450);
        }
    }, 420);
}

function toggleSensunBellHub() {
    const hub = document.getElementById("sensunBellHub");
    if (!hub) return;

    if (currentActiveFeedItems.length === 1) {
        showSensunPopup(currentActiveFeedItems[0]);
    } else {
        hub.classList.toggle("open");
    }
}

window.showSensunPopupForItemIndex = function(index) {
    const item = currentActiveFeedItems[index];
    if (item) {
        const hub = document.getElementById("sensunBellHub");
        if (hub) hub.classList.remove("open");
        showSensunPopup(item);
    }
};

window.initSensunBellAndPopupSystem = initSensunBellAndPopupSystem;

// Ejecutar inyección y sincronización en tiempo real cuando el DOM esté listo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        setupBusinessesRealtimeSync();
        setupNewsSync();
        initSensunBellAndPopupSystem();
        injectCommentButtons();
        injectShareButtons();
        initTagsCarousel();
        initCardExpandModal();
        initImageLightboxModal();
        handleDirectBusinessAnchor();
        initWhatsAppPlaneEffect();
    });
} else {
    setupBusinessesRealtimeSync();
    setupNewsSync();
    initSensunBellAndPopupSystem();
    injectCommentButtons();
    injectShareButtons();
    initTagsCarousel();
    initCardExpandModal();
    initImageLightboxModal();
    handleDirectBusinessAnchor();
    initWhatsAppPlaneEffect();
}




