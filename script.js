// ==========================================================================
// CONFIGURACIÓN GLOBAL Y TIEMPOS
// ==========================================================================
const TRANSITION_DURATION = 200;

document.addEventListener('DOMContentLoaded', () => {
    // 1. Efecto de entrada (Fade-in) al cargar el documento
    document.body.classList.add('page-loaded');

    // 2. Inicializar la carga del menú global centralizado
    cargarMenuGlobal();
});

// ==========================================================================
// SISTEMA DE CARGA DINÁMICA DEL MENÚ GLOBAL
// ==========================================================================
function cargarMenuGlobal() {
    const headerContainer = document.getElementById("global-header");

    if (headerContainer) {
        // Detectar si el archivo actual está en sensunshop (subcarpeta o archivo principal)
        const pathname = window.location.pathname;
        const isInSubfolder = pathname.includes("/sensunshop/");
        const isSensunshopMain = pathname.endsWith("/sensunshop.html");
        const isSensunshop = isInSubfolder || isSensunshopMain;
        // Usar un menú específico para sensunshop (página principal o subcarpeta)
        let menuPath;
        if (isSensunshop) {
            // Si estamos en sensunshop.html (raíz), la ruta es relativa a la raíz
            // Si estamos en /sensunshop/*.html, necesitamos la ruta relativa correcta
            menuPath = isInSubfolder ? "menu-sensunshop.html" : "sensunshop/menu-sensunshop.html";
        } else {
            menuPath = "menu.html";
        }

        fetch(menuPath)
            .then(response => {
                if (!response.ok) throw new Error("No se pudo obtener el archivo menu.html");
                return response.text();
            })
            .then(html => {
                // Inyectar el menú dentro de la etiqueta <header>
                headerContainer.innerHTML = html;
                
                // Activar eventos de interacción móvil y resaltar la página actual
                initMobileMenu();
                highlightCurrentPage();

                // Asociar efectos de salida (Fade-out) a los enlaces recién cargados
                initPageTransitions();
            })
            .catch(error => console.error("Error al construir el menú adaptativo:", error));
    } else {
        // Si por alguna razón la página no usa el header dinámico, inicializar transiciones por defecto
        initPageTransitions();
    }
}

// ==========================================================================
// CONTROL DE NAVEGACIÓN MÓVIL Y MENÚ DESPLEGABLE TÁCTIL
// ==========================================================================
function initMobileMenu() {
    const menuToggle = document.querySelector(".menu-toggle");
    const navContainer = document.querySelector(".nav-container");
    const dropdown = document.querySelector(".dropdown");
    const dropbtn = document.querySelector(".dropbtn");

    if (menuToggle && navContainer) {
        // Evento para abrir y cerrar el cajón lateral del menú hamburguesa
        menuToggle.addEventListener("click", (e) => {
            e.stopPropagation();
            menuToggle.classList.toggle("active");
            navContainer.classList.toggle("active");
        });

        // Evento interactivo por Click/Toque para el submenú en móviles
        if (dropbtn) {
            dropbtn.addEventListener("click", (e) => {
                if (window.innerWidth <= 768) {
                    e.preventDefault(); // Evita que salte directo a proyectos.html al primer toque
                    e.stopPropagation();
                    dropdown.classList.toggle("active");
                }
            });
        }

        // Cierra todo automáticamente si el usuario toca fuera del menú
        document.addEventListener("click", (e) => {
            if (!navContainer.contains(e.target) && !menuToggle.contains(e.target)) {
                menuToggle.classList.remove("active");
                navContainer.classList.remove("active");
                if (dropdown) dropdown.classList.remove("active");
            }
        });
    }
}

// ==========================================================================
// COMPORTAMIENTO DE EFECTOS DE NAVEGACIÓN (FADE-OUT)
// ==========================================================================
function initPageTransitions() {
    // Selecciona enlaces estáticos y los enlaces dinámicos inyectados en el nav
    const links = document.querySelectorAll('nav a, .hero-buttons a, .btn-card, .btn-secundario, footer a');
    
    links.forEach(link => {
        // Evitamos duplicar listeners si la función se llama más de una vez
        link.removeEventListener('click', handleLinkClick);
        link.addEventListener('click', handleLinkClick);
    });
}

function handleLinkClick(e) {
    const link = e.currentTarget;
    const destination = link.getAttribute('href');
    
    // Aplicar solo a enlaces internos que no abran en pestaña nueva
    if (destination && !destination.startsWith('http') && destination !== '#' && !link.target) {
        e.preventDefault();
        
        // Comprobar si es la misma página resolviendo la URL completa
        const targetURL = new URL(destination, window.location.href);
        if (window.location.pathname === targetURL.pathname) return;

        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = destination;
        }, TRANSITION_DURATION);
    }
}

// ==========================================================================
// RESALTADO AUTOMÁTICO DE LA PÁGINA ACTUAL
// ==========================================================================
function highlightCurrentPage() {
    const path = window.location.pathname.split("/").pop() || "index.html";
    
    // Limpiar clases activas previas
    document.querySelectorAll("header nav a").forEach(a => a.classList.remove("active"));
    // Si estamos en la subcarpeta SensunShop o en sensunshop.html, resaltar su propio menú
    const inSensun = window.location.pathname.includes('/sensunshop/') || window.location.pathname.endsWith('/sensunshop.html');
    if (inSensun) {
        if (path === "negocioslocales.html") document.getElementById("nav-negocios")?.classList.add("active");
        if (path === "emprendedores.html") document.getElementById("nav-emprendedores")?.classList.add("active");
        if (path === "comida.html") document.getElementById("nav-comida")?.classList.add("active");
        if (path === "oficios.html") document.getElementById("nav-oficios")?.classList.add("active");
        if (path === "profesionales.html") document.getElementById("nav-profesionales")?.classList.add("active");
        return;
    }

    // Mapeo automatizado de IDs asignados en tu menu.html
    if (path === "index.html") document.getElementById("nav-index")?.classList.add("active");
    if (path === "productos.html") document.getElementById("nav-productos")?.classList.add("active");
    if (path === "servicios.html") document.getElementById("nav-servicios")?.classList.add("active");
    if (path === "proyectos.html") document.getElementById("nav-proyectos")?.classList.add("active");
    if (path === "nosotros.html") document.getElementById("nav-nosotros")?.classList.add("active");
    if (path === "contacto.html") document.getElementById("nav-contacto")?.classList.add("active");
}

// ==========================================================================
// MANEJO DE BFCACHE (Evita congelamiento visual al usar flechas atrás/adelante)
// ==========================================================================
window.addEventListener('pageshow', (event) => {
    if (event.persisted) {
        window.location.reload();
    }
});

// ==========================================================================
// SEGURIDAD Y DISUASIÓN DE CÓDIGO FUENTE
// ==========================================================================
document.addEventListener('contextmenu', e => e.preventDefault());

document.addEventListener('keydown', (e) => {
    if (
        e.key === 'F12' || 
        (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'i')) || 
        (e.ctrlKey && (e.key === 'U' || e.key === 'u'))
    ) {
        alert("Acceso al código fuente restringido por seguridad.");
        e.preventDefault();
    }
});

console.log("%c¡Alto! %cEsta zona es para desarrolladores.", "color: red; font-size: 30px; font-weight: bold;", "font-size: 18px;");