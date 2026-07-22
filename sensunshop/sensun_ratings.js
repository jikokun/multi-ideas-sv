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
        z-index: 100;
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

    /* Reglas de Uniformidad estrictas y Simetría Perfecta para Tarjetas del Catálogo */
    .negocios-grid .negocio-card, 
    .productos-grid .producto-card, 
    .catalogo-grid .producto-card,
    .catalogo-grid .negocio-card {
        box-sizing: border-box !important;
        width: 100% !important;
        height: 100% !important;
        display: flex !important;
        flex-direction: column !important;
        justify-content: space-between !important;
    }
    .productos-grid, .negocios-grid, .catalogo-grid {
        display: grid !important;
        grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)) !important;
        gap: 24px !important;
        align-items: stretch !important;
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

    /* Modal de Comentarios Anónimos */
    .comments-modal {
        position: fixed;
        inset: 0;
        z-index: 999;
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
                <button type="button" id="rating-google-login-btn" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; gap: 10px; border-color: rgba(255, 255, 255, 0.1);">
                    <svg viewBox="0 0 24 24" width="18" height="18" style="fill: currentColor;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.727 5.727 0 0 1 8.24 12.8a5.727 5.727 0 0 1 5.751-5.714c1.554 0 2.966.574 4.053 1.516l3.18-3.18C19.294 3.525 16.74 2.286 13.99 2.286 8.167 2.286 3.42 7.034 3.42 12.86c0 5.823 4.747 10.57 10.57 10.57 6.077 0 10.1-4.27 10.1-10.286 0-.693-.06-1.356-.174-1.858H12.24Z"/></svg>
                    <span>Iniciar con Google</span>
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
                <button type="button" id="rating-google-register-btn" style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: #fff; padding: 12px; font-weight: 600; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: all 0.2s; gap: 10px; border-color: rgba(255, 255, 255, 0.1);">
                    <svg viewBox="0 0 24 24" width="18" height="18" style="fill: currentColor;"><path d="M12.24 10.285V14.4h6.887c-.648 2.41-2.519 4.114-5.136 4.114A5.727 5.727 0 0 1 8.24 12.8a5.727 5.727 0 0 1 5.751-5.714c1.554 0 2.966.574 4.053 1.516l3.18-3.18C19.294 3.525 16.74 2.286 13.99 2.286 8.167 2.286 3.42 7.034 3.42 12.86c0 5.823 4.747 10.57 10.57 10.57 6.077 0 10.1-4.27 10.1-10.286 0-.693-.06-1.356-.174-1.858H12.24Z"/></svg>
                    <span>Registrarse con Google</span>
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

    const handleGoogleAuth = async (isLogin) => {
        const provider = new GoogleAuthProvider();
        const isMobile = window.innerWidth <= 768 || /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);

        if (isMobile) {
            localStorage.setItem('google_auth_mode', isLogin ? 'login' : 'register');
            try {
                await signInWithRedirect(auth, provider);
            } catch (error) {
                console.error("Error en redirect de Google (ratings):", error);
                alert("No se pudo iniciar la redirección de Google.");
            }
        } else {
            try {
                const result = await signInWithPopup(auth, provider);
                const additionalUserInfo = getAdditionalUserInfo(result);
                
                if (isLogin) {
                    if (additionalUserInfo && additionalUserInfo.isNewUser) {
                        const user = result.user;
                        await user.delete();
                        await signOut(auth);
                        alert("Tu cuenta de Google no está registrada. Por favor regístrate primero usando el botón de Google en la pestaña de registro.");
                        // Cambiar a registro
                        loginForm.style.display = 'none';
                        registerForm.style.display = 'flex';
                    } else {
                        closeAuthModal();
                    }
                } else {
                    closeAuthModal();
                }
            } catch (error) {
                console.error("Error en autenticación Google:", error);
                if (error.code !== 'auth/popup-closed-by-user') {
                    alert("Error al conectar con Google: " + translateAuthError(error.code));
                }
            }
        }
    };

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
// NUEVO SISTEMA DE FAVORITOS EN VENTANA EMERGENTE (POPUP DESDE EL PERFIL)
// ==========================================================================
let cachedParsedBusinesses = null;

async function getBusinessesList() {
    if (cachedParsedBusinesses) return cachedParsedBusinesses;

    const pathname = window.location.pathname.toLowerCase();
    let prefix = 'sensunshop/';
    let isRoot = true;

    if (pathname.includes("/sensunshop/negocioslocales/") || pathname.includes("/sensunshop/profesionales/")) {
        prefix = '../';
        isRoot = false;
    } else if (pathname.includes("/sensunshop/") && !pathname.endsWith("/sensunshop.html")) {
        prefix = './';
        isRoot = false;
    }

    const targets = [
        prefix + 'negocioslocales.html',
        prefix + 'emprendedores.html'
    ];

    try {
        const fetchPromises = targets.map(async (url) => {
            try {
                const res = await fetch(url);
                if (!res.ok) return '';
                return await res.text();
            } catch (e) {
                console.error(`Error al cargar ${url}:`, e);
                return '';
            }
        });

        const htmls = await Promise.all(fetchPromises);
        const parser = new DOMParser();
        let allCards = [];

        // Si hay tarjetas en el DOM actual, agregarlas primero
        const currentDOMCards = document.querySelectorAll('#negocios-container .negocio-card');
        if (currentDOMCards.length > 0) {
            allCards.push(...parseCards(currentDOMCards, false));
        }

        htmls.forEach(html => {
            if (!html) return;
            const doc = parser.parseFromString(html, 'text/html');
            const docCards = doc.querySelectorAll('#negocios-container .negocio-card');
            allCards.push(...parseCards(docCards, isRoot));
        });

        // Eliminar duplicados por ID
        const uniqueBusinesses = [];
        const seenIds = new Set();
        allCards.forEach(b => {
            if (!seenIds.has(b.id)) {
                seenIds.add(b.id);
                uniqueBusinesses.push(b);
            }
        });

        cachedParsedBusinesses = uniqueBusinesses;
        return cachedParsedBusinesses;
    } catch (error) {
        console.error("Error al cargar negocios para favoritos:", error);
        return [];
    }
}

function parseCards(cards, isRoot) {
    return Array.from(cards)
        .filter(card => !card.classList.contains('disponible'))
        .map(card => {
            const imgEl = card.querySelector('.producto-img img');
            const ratingWidget = card.querySelector('.sensun-rating-widget');
            const businessId = ratingWidget ? ratingWidget.dataset.businessId : card.id.toLowerCase();
            
            let linksHtml = card.querySelector('.negocio-links').innerHTML;
            if (isRoot) {
                linksHtml = linksHtml.replace(/href="negocioslocales\//g, 'href="sensunshop/negocioslocales/');
                linksHtml = linksHtml.replace(/href="\.\.\//g, 'href="');
            }
            
            return {
                id: businessId,
                title: card.querySelector('h3').textContent.trim(),
                imgSrc: imgEl ? imgEl.getAttribute('src') : '',
                linksHtml: linksHtml
            };
        });
}

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
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = b.linksHtml;
            const wspBtn = tempDiv.querySelector('.btn-wsp');
            const locBtn = tempDiv.querySelector('.btn-loc');

            const wspHref = wspBtn ? wspBtn.getAttribute('href') : '#';
            const locHref = locBtn ? locBtn.getAttribute('href') : '#';
            
            let imgSrc = b.imgSrc;
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
                            ${wspBtn ? `
                                <a href="${wspHref}" class="btn-compact-action wsp" target="_blank" rel="noopener noreferrer" style="width: 28px; height: 28px; border-radius: 6px; display: flex; align-items: center; justify-content: center; background: #25d366; color: #fff;" title="WhatsApp">
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12c0 1.73.44 3.35 1.21 4.78L2 22l5.37-1.41C8.75 21.31 10.33 21.6 12 21.6c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.4 12.6c-.23.63-.87 1.16-1.5 1.39-.63.23-1.45.32-2.32-.05-.87-.36-3.74-1.6-5.17-3.03-1.43-1.43-2.67-4.3-3.03-5.17-.37-.87-.28-1.69-.05-2.32.23-.63.76-1.24 1.39-1.47.63-.23 1.33-.23 1.96.05.63.27.63.76.36 1.39L8.47 8.65c-.27.63-.76.63-1.39.36l.18.32c.36.87 1.6 3.74 3.03 5.17 1.43 1.43 4.3 2.67 5.17 3.03l.32.18c-.63-.27-1.12-.27-1.39-.05l1.65-1.96c.27-.27.76-.27 1.39 0s2.99 1.47 3.26 1.74c.27.27.27.84.05 1.47z"/></svg>
                                </a>
                            ` : ''}
                            ${locBtn ? `
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
                <!-- Se actualiza con el estado de autenticación -->
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
}

function openCommentsModal(businessId, businessTitle) {
    ensureCommentsModal();
    const modal = document.getElementById("sensun-comments-modal");
    const titleEl = document.getElementById("comments-modal-title");
    if (titleEl) titleEl.textContent = businessTitle ? `Comentarios: ${businessTitle}` : "Comentarios de la Cartelera";

    activeCommentsBusinessId = businessId;
    editingCommentId = null;
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

        if (commentKeys.length === 0) {
            listContainer.innerHTML = `
                <div style="text-align: center; padding: 30px 15px; color: #a0aec0; font-size: 0.9rem;">
                    <p style="margin:0 0 6px 0;">💬 Aún no hay comentarios.</p>
                    <small style="color: #718096;">¡Sé el primero en compartir tu opinión de forma anónima!</small>
                </div>
            `;
            return;
        }

        // Ordenar por fecha (más antiguos a más recientes)
        const sortedComments = commentKeys.map(key => ({
            id: key,
            ...commentsData[key]
        })).sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));

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
    const cards = document.querySelectorAll(".negocio-card, .slider-card");
    cards.forEach(card => {
        if (card.classList.contains("disponible")) return;
        
        // Limpiar botones antiguos en .negocio-links si existieran
        const oldLinkBtn = card.querySelector(".negocio-links .btn-comment");
        if (oldLinkBtn) oldLinkBtn.remove();

        let businessId = card.dataset.businessId;
        const ratingWidget = card.querySelector(".sensun-rating-widget");
        if (!businessId && ratingWidget) {
            businessId = ratingWidget.dataset.businessId;
        }
        if (!businessId && card.id) businessId = card.id.toLowerCase();
        if (!businessId) return;

        // Evitar duplicados
        if (card.querySelector(".compact-comment-circle-btn")) return;

        const titleEl = card.querySelector("h3");
        const titleText = titleEl ? titleEl.textContent.trim() : "";

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
            // Fallback si no hay widget de estrellas
            const content = card.querySelector(".slider-card-content, .negocio-info") || card;
            const targetRow = content.querySelector(".stars-row, h3") || content;
            targetRow.appendChild(btn);
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

window.initTagsCarousel = initTagsCarousel;

// Ejecutar inyección cuando el DOM esté listo
if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", () => {
        injectCommentButtons();
        initTagsCarousel();
    });
} else {
    injectCommentButtons();
    initTagsCarousel();
}
