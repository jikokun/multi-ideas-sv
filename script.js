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
        const pathname = window.location.pathname;
        
        // Determinar niveles de subcarpeta
        let depth = 0;
        let isSensunshop = false;
        
        if (pathname.includes("/sensunshop/negocioslocales/")) {
            depth = 2;
            isSensunshop = true;
        } else if (pathname.includes("/sensunshop/") && !pathname.endsWith("/sensunshop.html")) {
            depth = 1;
            isSensunshop = true;
        } else if (pathname.endsWith("/sensunshop.html")) {
            depth = 0;
            isSensunshop = true;
        }
        
        let menuPath;
        if (isSensunshop) {
            if (depth === 2) {
                menuPath = "../menu-sensunshop.html";
            } else if (depth === 1) {
                menuPath = "menu-sensunshop.html";
            } else {
                menuPath = "sensunshop/menu-sensunshop.html";
            }
        } else {
            menuPath = "menu.html";
        }

        fetch(menuPath)
            .then(response => {
                if (!response.ok) throw new Error("No se pudo obtener el archivo menu.html");
                return response.text();
            })
            .then(html => {
                headerContainer.innerHTML = html;

                adjustMenuPaths(headerContainer, depth, isSensunshop);
                
                initMobileMenu();
                highlightCurrentPage();
                initPageTransitions();
            })
            .catch(error => console.error("Error al construir el menú adaptativo:", error));
    } else {
        initPageTransitions();
    }
}

// ==========================================================================
// AJUSTE DINÁMICO DE RUTAS DEL MENÚ SEGÚN LA PROFUNDIDAD DEL DIRECTORIO
// ==========================================================================
function adjustMenuPaths(headerContainer, depth, isSensunshop) {
    const links = headerContainer.querySelectorAll("a");
    const images = headerContainer.querySelectorAll("img");

    links.forEach(a => {
        let href = a.getAttribute("href");
        if (!href || href.startsWith("http") || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:")) {
            return;
        }

        if (isSensunshop) {
            if (depth === 2) {
                if (href.startsWith("sensunshop/")) {
                    a.setAttribute("href", "../" + href.substring(11));
                } else if (!href.startsWith("../")) {
                    a.setAttribute("href", "../../" + href);
                }
            } else if (depth === 1) {
                if (href.startsWith("sensunshop/")) {
                    a.setAttribute("href", href.substring(11));
                } else if (!href.startsWith("../")) {
                    a.setAttribute("href", "../" + href);
                }
            } else {
                if (href.startsWith("../")) {
                    a.setAttribute("href", href.substring(3));
                }
            }
        }
    });

    images.forEach(img => {
        let src = img.getAttribute("src");
        if (!src || src.startsWith("http") || src.startsWith("data:")) {
            return;
        }

        if (isSensunshop) {
            if (depth === 2) {
                if (!src.startsWith("../") && !src.startsWith("sensunshop/")) {
                    img.setAttribute("src", "../../" + src);
                } else if (src.startsWith("../")) {
                    img.setAttribute("src", "../" + src);
                }
            } else if (depth === 1) {
                if (!src.startsWith("../") && !src.startsWith("sensunshop/")) {
                    img.setAttribute("src", "../" + src);
                }
            } else {
                if (src.startsWith("../")) {
                    img.setAttribute("src", src.substring(3));
                }
            }
        }
    });
}

// ==========================================================================
// CONTROL DE NAVEGACIÓN MÓVIL Y MENÚ DESPLEGABLE TÁCTIL
// ==========================================================================
function initMobileMenu() {
    const menuToggle = document.querySelector(".menu-toggle");
    const navContainer = document.querySelector(".nav-container");

    if (menuToggle && navContainer) {
        const dropdown = navContainer.querySelector(".dropdown");
        const dropbtn = dropdown ? dropdown.querySelector(".dropbtn") : null;
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
                    if (!dropdown.classList.contains("active")) {
                        e.preventDefault(); // Evita que salte directo al primer toque
                        e.stopImmediatePropagation();
                        dropdown.classList.add("active");
                    }
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
    // Selecciona enlaces estáticos y los enlaces dinámicos inyectados en el nav, incluyendo el logo
    const links = document.querySelectorAll('nav a, .logo-container, .hero-buttons a, .btn-card, .btn-secundario, footer a');
    
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