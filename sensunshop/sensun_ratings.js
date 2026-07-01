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
    body.light-theme .star-rating-container,
    .light-theme .star-rating-container {
        background: #ffffff !important;
        border: 1px solid rgba(0, 0, 0, 0.08) !important;
        color: #1a202c !important;
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
`;

// Inyectar estilos en el documento
const styleSheet = document.createElement("style");
styleSheet.innerText = styles;
document.head.appendChild(styleSheet);

let currentUser = null;

// Escuchar el estado de autenticación de Firebase
onAuthStateChanged(auth, (user) => {
    currentUser = user;
    // Reinicializar todos los widgets de calificación que estén en la página (por ID o por clase)
    document.querySelectorAll("[id='sensun-rating-widget'], .sensun-rating-widget").forEach(widget => {
        initRatingWidget(widget);
    });
});

// Inicializar un widget de votación
function initRatingWidget(container) {
    const businessId = container.dataset.businessId;
    if (!businessId) return;

    const isCompact = container.dataset.compact === "true";

    // Crear estructura interna básica del widget
    if (isCompact) {
        container.innerHTML = `
            <div class="star-rating-container compact" style="background: transparent; border: none; padding: 4px 0; box-shadow: none; align-items: flex-start; gap: 4px;">
                <div class="stars-row" id="stars-row-${businessId}">
                    <!-- Estrellas inyectadas por JS -->
                </div>
                <div class="rating-text" id="rating-text-${businessId}" style="font-size: 0.75rem; color: #a0aec0;">Cargando...</div>
            </div>
        `;
    } else {
        container.innerHTML = `
            <div class="star-rating-container">
                <h4 style="font-size: 1rem; font-weight: 700; color: #fff; margin-bottom: 2px;">Calificación del Negocio</h4>
                <div class="stars-row" id="stars-row-${businessId}">
                    <!-- Estrellas inyectadas por JS -->
                </div>
                <div class="rating-text" id="rating-text-${businessId}">Cargando calificación...</div>
                <div class="rating-helper" id="rating-helper-${businessId}"></div>
            </div>
        `;
    }

    const starsRow = document.getElementById(`stars-row-${businessId}`);
    const ratingText = document.getElementById(`rating-text-${businessId}`);
    const ratingHelper = document.getElementById(`rating-helper-${businessId}`);

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
