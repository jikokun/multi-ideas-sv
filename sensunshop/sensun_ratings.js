// ==========================================================================
// SISTEMA DE CALIFICACIÓN POR ESTRELLAS - SENSUN SHOP
// ==========================================================================
import { 
    auth, 
    rtdb, 
    onAuthStateChanged,
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    updateProfile
} from "../firebase-config.js";
import { ref, set, get, onValue } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

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
        color: #00b4d8;
        filter: drop-shadow(0 0 5px rgba(0, 180, 216, 0.4));
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
        color: #00b4d8;
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

// Inicializar un widget de votación
function initRatingWidget(container) {
    const businessId = container.dataset.businessId;
    if (!businessId) return;

    const isCompact = container.dataset.compact === "true";

    // Crear estructura interna básica del widget
    if (isCompact) {
        container.innerHTML = `
            <div class="star-rating-container compact" style="background: transparent; border: none; padding: 4px 0; box-shadow: none; align-items: flex-start; gap: 4px;">
                <div class="stars-row">
                    <!-- Estrellas inyectadas por JS -->
                </div>
                <div class="rating-text" style="font-size: 0.75rem; color: #a0aec0;">Cargando...</div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="star-rating-container">
                <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 2px;">Calificación del Negocio</h4>
                <div class="stars-row">
                    <!-- Estrellas inyectadas por JS -->
                </div>
                <div class="rating-text">Cargando calificación...</div>
                <div class="rating-helper"></div>
            </div>
        `;
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
                    ratingHelper.innerHTML = `Tu calificación: <span style="color: #00b4d8; font-weight: 600;">${userVote} estrellas</span> (puedes cambiarla)`;
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
                <h3 style="color: #00b4d8; font-size: 1.5rem; font-weight: 700; margin-bottom: 5px;">Sensun Shop</h3>
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
                <button type="submit" style="background: #00b4d8; color: #0a0d14; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                    Iniciar Sesión
                </button>
                <p style="font-size: 0.85rem; color: #718096; text-align: center; margin-top: 10px;">
                    ¿No tienes cuenta? <a href="#" id="rating-go-register" style="color: #00b4d8; text-decoration: underline;">Regístrate aquí</a>
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
                <button type="submit" style="background: #00b4d8; color: #0a0d14; font-weight: 700; padding: 12px; border: none; border-radius: 8px; cursor: pointer; transition: background 0.2s;">
                    Crear Cuenta
                </button>
                <p style="font-size: 0.85rem; color: #718096; text-align: center; margin-top: 10px;">
                    ¿Ya tienes una cuenta? <a href="#" id="rating-go-login" style="color: #00b4d8; text-decoration: underline;">Inicia sesión</a>
                </p>
            </form>
        </div>
    `;

    document.body.appendChild(modal);

    const loginForm = document.getElementById('rating-login-form');
    const registerForm = document.getElementById('rating-register-form');
    const goRegister = document.getElementById('rating-go-register');
    const goLogin = document.getElementById('rating-go-login');

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
    }
}

function closeAuthModal() {
    const modal = document.getElementById('rating-auth-modal');
    if (modal) {
        modal.classList.remove('open');
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

    // Intentar buscar tarjetas en el DOM actual primero (ej: negocioslocales.html)
    let cards = document.querySelectorAll('#negocios-container .negocio-card');
    if (cards.length > 0) {
        cachedParsedBusinesses = parseCards(cards, false);
        return cachedParsedBusinesses;
    }

    // Si no están en el DOM, hacer fetch a negocioslocales.html (ej: desde la home)
    try {
        const isRoot = !window.location.pathname.includes('/sensunshop/');
        const fetchPath = isRoot ? 'sensunshop/negocioslocales.html' : 'negocioslocales.html';
        const response = await fetch(fetchPath);
        if (!response.ok) throw new Error("No se pudo obtener el catálogo.");
        const html = await response.text();
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const docCards = doc.querySelectorAll('#negocios-container .negocio-card');
        cachedParsedBusinesses = parseCards(docCards, isRoot);
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
