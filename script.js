// ==========================================================================
// CONFIGURACIÓN GLOBAL Y TIEMPOS
// ==========================================================================
const TRANSITION_DURATION = 200;

// Inicialización inmediata del tema claro/oscuro para evitar parpadeos
(function() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
    } else {
        document.body.classList.remove('light-theme');
    }
})();

document.addEventListener('DOMContentLoaded', () => {
    // 1. Efecto de entrada (Fade-in) al cargar el documento
    document.body.classList.add('page-loaded');

    // 2. Inicializar la carga del menú global centralizado
    cargarMenuGlobal();

    // 3. Inicializar el carrito de compras
    initCart();

    // 4. Inicializar filtros de productos (si aplica en productos.html)
    initProductsFilter();

    // 5. Inicializar popup promocional de Sensun Shop (si aplica en index.html)
    initPromoPopup();

    // 6. Verificar si hay un negocio para resaltar desde la URL
    checkHighlightHash();
});

// Helper global para evitar fugas de scroll al abrir overlays
window.updateBodyScroll = function() {
    const isCartActive = document.getElementById("cart-drawer")?.classList.contains("active");
    const isSearchActive = document.getElementById("search-modal-overlay")?.classList.contains("active");
    const isNavActive = document.querySelector(".nav-container")?.classList.contains("active");
    const isAuthActive = document.getElementById("auth-modal")?.classList.contains("active") || document.querySelector(".rating-auth-modal")?.classList.contains("open");
    
    if (isCartActive || isSearchActive || isNavActive || isAuthActive) {
        document.body.classList.add("no-scroll");
    } else {
        document.body.classList.remove("no-scroll");
    }
};

// ==========================================================================
// SISTEMA DE CARGA DINÁMICA DEL MENÚ GLOBAL
// ==========================================================================
function cargarMenuGlobal() {
    const headerContainer = document.getElementById("global-header");

    if (headerContainer) {
        const pathname = window.location.pathname.toLowerCase();
        
        // Determinar niveles de subcarpeta
        let depth = 0;
        let isSensunshop = false;
        
        if (pathname.includes("/sensunshop/negocioslocales/")) {
            depth = 2;
            isSensunshop = true;
        } else if (pathname.includes("/sensunshop/") && !pathname.endsWith("/sensunshop.html")) {
            depth = 1;
            isSensunshop = true;
        } else if (pathname.endsWith("/sensunshop.html") || pathname.endsWith("/sensunshop")) {
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

        const isLocalFile = window.location.protocol === 'file:';
        // Add a timestamp cache-buster to force browser/server to bypass cache and load the latest file
        const fetchUrl = isLocalFile ? menuPath : (menuPath + "?v=" + Date.now());

        fetch(fetchUrl)
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

                 // Inicializar buscador si estamos en sector sensunshop
                initSensunSearch(isSensunshop, depth);

                // Inicializar interruptor de tema claro/oscuro
                initThemeToggle();

                // Inicializar sistema de autenticación
                initAuthentication(depth);
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
            window.updateBodyScroll();
        });

        // Gesto swipe a la derecha para cerrar el menú en móviles
        enableSwipeToClose(navContainer, () => {
            menuToggle.classList.remove("active");
            navContainer.classList.remove("active");
            if (dropdown) dropdown.classList.remove("active");
            window.updateBodyScroll();
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
                window.updateBodyScroll();
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
    
    // Si no hay destino, o es una sección/ancla interna (empieza con #), o se abre en otra pestaña, no interferimos
    if (!destination || destination.startsWith('http') || destination.startsWith('#') || link.target) {
        return;
    }
    
    try {
        const targetURL = new URL(destination, window.location.href);
        const currentURL = new URL(window.location.href);
        
        // Comprobar si apunta al mismo documento/ruta
        const isSamePage = currentURL.pathname === targetURL.pathname || 
                           (currentURL.pathname.endsWith('/') && targetURL.pathname.endsWith('/index.html')) ||
                           (currentURL.pathname.endsWith('/index.html') && targetURL.pathname.endsWith('/'));

        if (isSamePage) {
            // Si tiene hash (ej. #productos), permitimos el scroll nativo
            if (targetURL.hash) {
                return;
            }
            // Si es exactamente la misma URL sin hash, prevenimos recarga redundante
            e.preventDefault();
            return;
        }

        // Si es una página interna distinta, aplicamos transición
        e.preventDefault();
        document.body.style.opacity = '0';
        setTimeout(() => {
            window.location.href = destination;
        }, TRANSITION_DURATION);
    } catch (err) {
        // En caso de error de análisis de URL, dejar comportamiento por defecto
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
// SEGURIDAD Y DISUASIÓN DE CÓDIGO FUENTE (Suavizada para evitar bloqueo táctil)
// ==========================================================================
// Nota: Bloquear contextmenu directamente interfiere con la usabilidad móvil y selección de texto.
// Se ha removido el preventDefault del contextmenu para garantizar una experiencia táctil fluida.

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

// ==========================================================================
// SISTEMA DE CARRITO DE COMPRAS INTEGRADO (ENVÍO POR WHATSAPP)
// ==========================================================================
let cart = [];

function initCart() {
    const path = window.location.pathname.toLowerCase();
    
    // El carrito solo debe cargarse en:
    // - index.html / la raíz
    // - productos.html / /productos
    // - servicios.html / /servicios
    const isMainPage = path === '/' || path.endsWith('/index.html') || path.endsWith('/');
    const isProductos = path.endsWith('/productos.html') || path.endsWith('/productos');
    const isServicios = path.endsWith('/servicios.html') || path.endsWith('/servicios');
    
    if (!isMainPage && !isProductos && !isServicios) {
        return;
    }

    // 1. Inyectar estructura HTML del carrito si no existe
    if (!document.getElementById("cart-floating-btn")) {
        const cartHTML = `
            <!-- Botón flotante -->
            <div id="cart-floating-btn" title="Ver Carrito">
                <svg viewBox="0 0 24 24">
                    <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
                </svg>
                <div id="cart-badge" style="display: none;">0</div>
            </div>

            <!-- Overlay de fondo -->
            <div id="cart-overlay"></div>

            <!-- Drawer del Carrito -->
            <div id="cart-drawer">
                <div class="cart-header">
                    <h2>Tu <span class="gradient-text">Carrito</span></h2>
                    <button class="cart-close-btn" id="cart-close-btn">&times;</button>
                </div>
                <div class="cart-body" id="cart-body-content">
                    <!-- Dinámico -->
                </div>
                <div class="cart-footer">
                    <div class="cart-total-container">
                        <span>Total Estimado:</span>
                        <span class="cart-total-price" id="cart-total-val">$0.00</span>
                    </div>
                    <div class="cart-form">
                        <div class="cart-input-group">
                            <label for="cart-client-name">TU NOMBRE</label>
                            <input type="text" id="cart-client-name" class="cart-input" placeholder="Ingresa tu nombre..." required>
                        </div>
                        <div class="cart-input-group">
                            <label for="cart-client-notes">ESPECIFICACIONES / DETALLES</label>
                            <textarea id="cart-client-notes" class="cart-textarea" placeholder="Colores, medidas, logo o detalles personalizados..."></textarea>
                        </div>
                    </div>
                    <button class="cart-checkout-btn" id="cart-checkout-btn">
                        <svg viewBox="0 0 24 24">
                            <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
                        </svg>
                        Enviar Pedido por WhatsApp
                    </button>
                </div>
            </div>

            <!-- Toast de confirmación -->
            <div id="cart-toast" class="cart-toast">
                <svg viewBox="0 0 24 24">
                    <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
                </svg>
                <span>¡Producto añadido al carrito!</span>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", cartHTML);
    }

    // 2. Cargar carrito desde LocalStorage
    cart = JSON.parse(localStorage.getItem("multi_ideas_cart")) || [];
    renderCart();

    // 3. Registrar Listeners del panel
    const floatingBtn = document.getElementById("cart-floating-btn");
    const closeBtn = document.getElementById("cart-close-btn");
    const overlay = document.getElementById("cart-overlay");
    const drawer = document.getElementById("cart-drawer");
    const checkoutBtn = document.getElementById("cart-checkout-btn");

    if (floatingBtn) {
        floatingBtn.addEventListener("click", () => {
            drawer.classList.toggle("active");
            overlay.classList.toggle("active");
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener("click", closeCart);
    }

    if (overlay) {
        overlay.addEventListener("click", closeCart);
    }

    if (drawer) {
        // Gesto swipe a la derecha para cerrar el carrito en móviles
        enableSwipeToClose(drawer, closeCart);
    }

    // 4. Delegación de eventos para agregar productos
    document.body.addEventListener("click", (e) => {
        const addBtn = e.target.closest(".btn-add-to-cart");
        if (addBtn) {
            e.preventDefault();
            const id = addBtn.getAttribute("data-id");
            const name = addBtn.getAttribute("data-name");
            const subtitle = addBtn.getAttribute("data-subtitle") || "";
            const price = parseFloat(addBtn.getAttribute("data-price") || "0");
            const image = addBtn.getAttribute("data-image") || "";

            addToCart(id, name, subtitle, price, image);
        }
    });

    // 5. Enviar pedido por WhatsApp
    if (checkoutBtn) {
        checkoutBtn.addEventListener("click", sendWhatsAppOrder);
    }
}

function closeCart() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-overlay");
    if (drawer) drawer.classList.remove("active");
    if (overlay) overlay.classList.remove("active");
    window.updateBodyScroll();
}

function openCart() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-overlay");
    if (drawer) drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");
    window.updateBodyScroll();
}

function addToCart(id, name, subtitle, price, image) {
    const existingItem = cart.find(item => item.id === id);
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        cart.push({ id, name, subtitle, price, image, quantity: 1 });
    }
    saveCart();
    showToast(`¡Añadido: ${name}!`);
    setTimeout(openCart, 400); // Abre el carrito después de la alerta
}

function changeQty(id, delta) {
    const item = cart.find(item => item.id === id);
    if (item) {
        item.quantity += delta;
        if (item.quantity <= 0) {
            cart = cart.filter(i => i.id !== id);
        }
        saveCart();
    }
}

function deleteItem(id) {
    cart = cart.filter(item => item.id !== id);
    saveCart();
}

function saveCart() {
    localStorage.setItem("multi_ideas_cart", JSON.stringify(cart));
    renderCart();
}

function renderCart() {
    const badge = document.getElementById("cart-badge");
    const container = document.getElementById("cart-body-content");
    const totalVal = document.getElementById("cart-total-val");

    if (!container) return;

    // Calcular rutas relativas según el directorio actual
    let prefix = "";
    const pathname = window.location.pathname;
    if (pathname.includes("/sensunshop/negocioslocales/")) {
        prefix = "../../";
    } else if (pathname.includes("/sensunshop/") && !pathname.endsWith("/sensunshop.html")) {
        prefix = "../";
    }

    // Calcular total de productos en badge
    const totalCount = cart.reduce((sum, item) => sum + item.quantity, 0);
    if (badge) {
        badge.innerText = totalCount;
        badge.style.display = totalCount > 0 ? "flex" : "none";
    }

    if (cart.length === 0) {
        container.innerHTML = `
            <div class="cart-empty-message">
                <svg viewBox="0 0 24 24" style="width: 50px; height: 50px; fill: rgba(255,255,255,0.1); margin-bottom: 10px;">
                    <path d="M17.21 9l-4.38-6.56c-.19-.28-.51-.42-.83-.42-.32 0-.64.14-.83.43L6.79 9H2c-.55 0-1 .45-1 1 0 .09.01.18.04.27l2.54 9.27c.23.84 1 1.46 1.88 1.46h13.08c.88 0 1.65-.62 1.88-1.46l2.54-9.27c.03-.09.04-.18.04-.27 0-.55-.45-1-1-1h-4.79zM9 9l3-4.5L15 9H9zm3 8c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z"/>
                </svg>
                <p>Tu carrito está vacío.</p>
                <p style="font-size: 0.8rem; margin-top: 5px;">¡Agrega nuestros productos físicos más solicitados!</p>
            </div>
        `;
        if (totalVal) totalVal.innerText = "$0.00";
        return;
    }

    let itemsHTML = "";
    let grandTotal = 0;

    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;

        // Ajustar la ruta de la imagen si es local
        let imgUrl = item.image;
        if (imgUrl && !imgUrl.startsWith("http") && !imgUrl.startsWith("/")) {
            imgUrl = prefix + imgUrl;
        }

        itemsHTML += `
            <div class="cart-item">
                <img src="${imgUrl}" alt="${item.name}" class="cart-item-img">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-subtitle">${item.subtitle}</div>
                    <div class="cart-item-price">$${item.price.toFixed(2)} c/u</div>
                </div>
                <div class="cart-item-actions">
                    <div class="cart-qty-control">
                        <button class="cart-qty-btn" onclick="changeQty('${item.id}', -1)">-</button>
                        <span class="cart-qty-val">${item.quantity}</span>
                        <button class="cart-qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
                    </div>
                    <button class="cart-item-delete" onclick="deleteItem('${item.id}')">Eliminar</button>
                </div>
            </div>
        `;
    });

    container.innerHTML = itemsHTML;
    if (totalVal) totalVal.innerText = `$${grandTotal.toFixed(2)}`;
}

function showToast(message) {
    const toast = document.getElementById("cart-toast");
    if (toast) {
        toast.querySelector("span").innerText = message;
        toast.classList.add("active");
        setTimeout(() => {
            toast.classList.remove("active");
        }, 3000);
    }
}

function sendWhatsAppOrder() {
    if (cart.length === 0) {
        alert("El carrito está vacío.");
        return;
    }

    const clientNameInput = document.getElementById("cart-client-name");
    const clientNotesInput = document.getElementById("cart-client-notes");

    const clientName = clientNameInput ? clientNameInput.value.trim() : "";
    const clientNotes = clientNotesInput ? clientNotesInput.value.trim() : "";

    if (!clientName) {
        alert("Por favor, ingresa tu nombre para continuar.");
        if (clientNameInput) clientNameInput.focus();
        return;
    }

    // Construir mensaje para WhatsApp
    let message = `*🛍️ NUEVO PEDIDO - MULTI IDEAS SV*\n`;
    message += `===============================\n\n`;
    message += `👤 *Cliente:* ${clientName}\n\n`;
    message += `📋 *Detalle del Pedido:*\n`;

    let grandTotal = 0;
    cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        grandTotal += subtotal;
        message += `${index + 1}. *${item.name}* (${item.subtitle})\n`;
        message += `   Cant: ${item.quantity}x  |  Precio: $${item.price.toFixed(2)} c/u\n`;
        message += `   Subtotal: *$${subtotal.toFixed(2)}*\n\n`;
    });

    message += `===============================\n`;
    message += `💰 *Total Estimado:* *$${grandTotal.toFixed(2)}*\n\n`;

    if (clientNotes) {
        message += `📝 *Especificaciones / Notas:*\n`;
        message += `_"${clientNotes}"_\n\n`;
    }

    message += `_Este pedido fue generado automáticamente desde multiideassv.com_`;

    // Enlace de WhatsApp
    const waNumber = "50372359113";
    const waUrl = `https://wa.me/${waNumber}?text=${encodeURIComponent(message)}`;

    // Abrir enlace en pestaña nueva
    window.open(waUrl, "_blank");

    // Vaciar el carrito y guardarlo en localStorage
    cart = [];
    saveCart();

    // Limpiar campos del formulario
    if (clientNameInput) clientNameInput.value = "";
    if (clientNotesInput) clientNotesInput.value = "";

    // Cerrar el drawer del carrito
    closeCart();
}

// Hacer las funciones accesibles globalmente para los controladores inline onclick
window.changeQty = changeQty;
window.deleteItem = deleteItem;

// ==========================================================================
// FILTRO DE CATEGORÍAS EN LA PÁGINA DE PRODUCTOS (productos.html)
// ==========================================================================
function initProductsFilter() {
    const filterBtns = document.querySelectorAll(".filter-btn");
    const productCards = document.querySelectorAll("#productos-fisicos-grid .producto-card");

    if (filterBtns.length > 0 && productCards.length > 0) {
        filterBtns.forEach(btn => {
            btn.addEventListener("click", () => {
                // Quitar clase activa de todos los botones
                filterBtns.forEach(b => b.classList.remove("active"));
                btn.classList.add("active");

                const filterValue = btn.getAttribute("data-filter");

                productCards.forEach(card => {
                    const category = card.getAttribute("data-category");
                    if (filterValue === "all" || category === filterValue) {
                        card.style.display = "flex";
                        // Animación suave de entrada
                        card.style.opacity = "0";
                        card.style.transform = "scale(0.96)";
                        setTimeout(() => {
                            card.style.transition = "all 0.25s ease-in-out";
                            card.style.opacity = "1";
                            card.style.transform = "scale(1)";
                        }, 50);
                    } else {
                        card.style.display = "none";
                    }
                });
            });
        });
    }
}

// ==========================================================================
// POPUP PROMOCIONAL DE SENSUN SHOP (index.html)
// ==========================================================================
function initPromoPopup() {
    const pathname = window.location.pathname;
    const isHomepage = pathname.endsWith("index.html") || pathname.endsWith("/") || pathname === "";

    if (!isHomepage) return;

    // Verificar si el usuario ya cerró el popup en esta sesión
    if (sessionStorage.getItem("sensun_promo_closed") === "true") return;

    // Inyectar HTML del popup
    const popupHTML = `
        <div id="promo-popup">
            <div class="promo-header">
                <span class="promo-badge">SENSUN SHOP</span>
                <button class="promo-close" id="promo-close-btn">&times;</button>
            </div>
            <div class="promo-content-wrapper" style="display: flex; gap: 15px; align-items: flex-start; margin-bottom: 15px;">
                <img src="imagenes/logos/seunsunshop_1.webp" alt="Sensun Shop Logo" style="width: 60px; height: auto; border-radius: 8px; flex-shrink: 0; filter: drop-shadow(0 0 5px rgba(255, 110, 0, 0.3));">
                <div class="promo-body" style="flex-grow: 1;">
                    <h3 style="margin-top: 0; margin-bottom: 8px;">¿Eres emprendedor o tienes un negocio en Sensuntepeque?</h3>
                    <p style="margin-bottom: 0;">Promueve tu marca, conecta con clientes locales y expande tus ventas en nuestra vitrina digital oficial.</p>
                </div>
            </div>
            <a href="sensunshop.html" class="promo-btn">
                Visitar Sensun Shop
            </a>
        </div>
    `;

    document.body.insertAdjacentHTML("beforeend", popupHTML);

    const popup = document.getElementById("promo-popup");
    const closeBtn = document.getElementById("promo-close-btn");

    if (popup && closeBtn) {
        // Mostrar el popup con un retraso de 3 segundos
        setTimeout(() => {
            popup.classList.add("active");
        }, 3000);

        // Evento para cerrar el popup
        closeBtn.addEventListener("click", () => {
            popup.classList.remove("active");
            sessionStorage.setItem("sensun_promo_closed", "true");
        });

        // Gesto swipe a la izquierda para cerrar el popup flotante en móviles
        let touchstartX = 0;
        let touchendX = 0;
        popup.addEventListener('touchstart', e => { 
            touchstartX = e.changedTouches[0].screenX; 
        }, { passive: true });
        
        popup.addEventListener('touchend', e => {
            touchendX = e.changedTouches[0].screenX;
            if (touchendX < touchstartX - 50) { // Deslizar hacia la izquierda
                popup.classList.remove("active");
                sessionStorage.setItem("sensun_promo_closed", "true");
            }
        }, { passive: true });
    }
}

// ==========================================================================
// ASISTENTE DE DETECCIÓN DE GESTOS SWIPE (UX MÓVIL)
// ==========================================================================
function enableSwipeToClose(element, callback) {
    let touchstartX = 0;
    let touchstartY = 0;
    let touchendX = 0;
    let touchendY = 0;

    element.addEventListener('touchstart', e => {
        touchstartX = e.changedTouches[0].screenX;
        touchstartY = e.changedTouches[0].screenY;
    }, { passive: true });

    element.addEventListener('touchend', e => {
        touchendX = e.changedTouches[0].screenX;
        touchendY = e.changedTouches[0].screenY;
        handleGesture();
    }, { passive: true });

    function handleGesture() {
        const diffX = touchendX - touchstartX;
        const diffY = touchendY - touchstartY;

        // Deslizar horizontal a la derecha con un umbral de 60px
        if (diffX > 60 && Math.abs(diffX) > Math.abs(diffY)) {
            callback();
        }
    }
}

// ==========================================================================
// SISTEMA DE BÚSQUEDA GLOBAL DE SENSUN SHOP
// ==========================================================================
function initSensunSearch(isSensunshop, depth) {
    if (!isSensunshop) return;

    // 1. Inyectar el marcado del modal de búsqueda si no existe
    if (!document.getElementById("search-modal-overlay")) {
        const modalHtml = `
            <div id="search-modal-overlay" class="search-modal-overlay">
                <div class="search-modal-box">
                    <div class="search-modal-header">
                        <div class="search-modal-icon">
                            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="11" cy="11" r="8"></circle>
                                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                            </svg>
                        </div>
                        <input type="text" id="search-modal-input" class="search-modal-input" placeholder="Buscar negocios, tags, comida, profesionales..." autocomplete="off">
                        <button id="search-modal-close" class="search-modal-close" aria-label="Cerrar">&times;</button>
                    </div>
                    <div id="search-modal-results" class="search-modal-results">
                        <div class="dynamic-status-message">Escribe algo para empezar a buscar...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML("beforeend", modalHtml);
    }

    const overlay = document.getElementById("search-modal-overlay");
    const input = document.getElementById("search-modal-input");
    const closeBtn = document.getElementById("search-modal-close");
    const resultsContainer = document.getElementById("search-modal-results");
    const btnDesktop = document.getElementById("search-btn-desktop");
    const btnMobile = document.getElementById("search-btn-mobile");

    let businessesData = null;

    // Páginas a indexar en Sensun Shop
    const targetPages = [
        "negocioslocales.html",
        "emprendedores.html",
        "comida.html",
        "oficios.html",
        "profesionales.html"
    ];

    // Cargar y parsear las páginas en paralelo
    async function loadBusinesses() {
        if (businessesData) return businessesData;
        try {
            const results = await Promise.all(targetPages.map(async (pageName) => {
                let fetchPath = "";
                let redirectPath = "";
                if (depth === 2) {
                    fetchPath = "../" + pageName;
                    redirectPath = "../" + pageName;
                } else if (depth === 1) {
                    fetchPath = pageName;
                    redirectPath = pageName;
                } else {
                    fetchPath = "sensunshop/" + pageName;
                    redirectPath = "sensunshop/" + pageName;
                }

                try {
                    const response = await fetch(fetchPath);
                    if (!response.ok) return []; // Si falla alguna página temporalmente o no existe, continuamos con las demás
                    const html = await response.text();
                    const parser = new DOMParser();
                    const doc = parser.parseFromString(html, "text/html");
                    const cards = doc.querySelectorAll(".negocio-card");
                    
                    return Array.from(cards)
                        .filter(card => !card.classList.contains("disponible"))
                        .map(card => {
                            const title = card.querySelector("h3") ? card.querySelector("h3").textContent.trim() : "";
                            const description = card.querySelector("p") ? card.querySelector("p").textContent.trim() : "";
                            const tags = Array.from(card.querySelectorAll(".negocio-tags .tag, .producto-info .tag")).map(t => t.textContent.trim());
                            const category = card.getAttribute("data-category") || "";
                            const id = card.id || "";
                            
                            const imgEl = card.querySelector(".producto-img img, .slider-card-img img");
                            const imgSrc = imgEl ? imgEl.getAttribute("src") : "";
                            
                            return { id, title, description, tags, category, imgSrc, redirectPath };
                        });
                } catch (err) {
                    console.warn(`Error al indexar la página ${pageName}:`, err);
                    return [];
                }
            }));
            
            // Unificar todos los arreglos
            businessesData = results.flat();
            return businessesData;
        } catch (error) {
            console.error("Error al indexar negocios para búsqueda:", error);
            return [];
        }
    }

    // Abrir modal
    async function openModal() {
        overlay.classList.add("active");
        window.updateBodyScroll();
        input.value = "";
        resultsContainer.innerHTML = '<div class="dynamic-status-message">Cargando catálogo...</div>';
        
        // Carga en segundo plano al abrir
        await loadBusinesses();
        resultsContainer.innerHTML = '<div class="dynamic-status-message">Escribe algo para empezar a buscar...</div>';
        
        setTimeout(() => {
            input.focus();
        }, 100);
    }

    // Cerrar modal
    function closeModal() {
        overlay.classList.remove("active");
        window.updateBodyScroll();
        input.blur();
    }

    // Eventos de botones abrir/cerrar
    if (btnDesktop) btnDesktop.addEventListener("click", openModal);
    if (btnMobile) btnMobile.addEventListener("click", openModal);
    if (closeBtn) closeBtn.addEventListener("click", closeModal);
    overlay.addEventListener("click", (e) => {
        if (e.target === overlay) closeModal();
    });

    // Soporte teclado Escape
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && overlay.classList.contains("active")) {
            closeModal();
        }
    });

    // Soporte gestos swipe para móvil (deslizar a la derecha)
    if (typeof enableSwipeToClose === "function") {
        enableSwipeToClose(overlay, closeModal);
    }

    const cleanString = (str) => {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    };

    // Escuchar cambios en la búsqueda
    input.addEventListener("input", () => {
        const query = cleanString(input.value);
        if (!query) {
            resultsContainer.innerHTML = '<div class="dynamic-status-message">Escribe algo para empezar a buscar...</div>';
            return;
        }

        if (!businessesData) return;

        const filtered = businessesData.filter(item => {
            const title = cleanString(item.title);
            const desc = cleanString(item.description);
            const cat = cleanString(item.category);
            const tags = item.tags.map(t => cleanString(t));
            
            return title.includes(query) || desc.includes(query) || cat.includes(query) || tags.some(t => t.includes(query));
        });

        if (filtered.length === 0) {
            resultsContainer.innerHTML = '<div class="dynamic-status-message">No se encontraron resultados para "' + input.value + '"</div>';
            return;
        }

        let html = "";
        filtered.forEach(item => {
            let itemImg = item.imgSrc;
            // Ajustar rutas relativas de imagen si es necesario
            if (itemImg && !itemImg.startsWith("http") && !itemImg.startsWith("/")) {
                let cleanImgPath = itemImg.replace(/^(\.\.\/)+/, '').replace(/^(sensunshop\/)+/, '');
                if (depth === 2) {
                    itemImg = "../../" + cleanImgPath;
                } else if (depth === 1) {
                    itemImg = "../" + cleanImgPath;
                } else {
                    itemImg = cleanImgPath;
                }
            }

            const itemLink = `${item.redirectPath}#${item.id}`;
            const badgeClass = item.category;

            html += `
                <a href="${itemLink}" class="search-result-item" data-id="${item.id}" data-href="${itemLink}">
                    ${itemImg ? `<img src="${itemImg}" alt="${item.title}" class="search-result-img" loading="lazy">` : ""}
                    <div class="search-result-info">
                        <div class="search-result-title">${item.title}</div>
                        <div class="search-result-desc">${item.description}</div>
                        <div class="search-result-meta">
                            <span class="search-result-badge ${badgeClass}">${item.category}</span>
                            ${item.tags.slice(0, 2).map(t => `<span class="tag">${t}</span>`).join("")}
                        </div>
                    </div>
                </a>
            `;
        });

        resultsContainer.innerHTML = html;

        // Añadir comportamiento de click en los resultados
        const resultElements = resultsContainer.querySelectorAll(".search-result-item");
        resultElements.forEach(el => {
            el.addEventListener("click", (e) => {
                const id = el.getAttribute("data-id");
                const href = el.getAttribute("data-href");
                const targetPageName = href.split('#')[0].split('/').pop();
                const currentPageName = window.location.pathname.split('/').pop() || "sensunshop.html";

                closeModal();

                // Si ya estamos en la página destino, manejamos el scroll y resaltado localmente
                if (currentPageName === targetPageName) {
                    e.preventDefault();
                    history.pushState(null, null, `#${id}`);
                    highlightBusinessCard(id);
                }
            });
        });
    });
}

// Resaltar y desplazar hacia la tarjeta correspondiente
function highlightBusinessCard(id) {
    const targetEl = document.getElementById(id);
    if (targetEl) {
        // Si hay filtros locales en negocioslocales.html, restablecer filtros para mostrar todas las tarjetas
        const filterBtns = document.querySelectorAll('#category-filter-container > .filter-btn');
        if (filterBtns.length > 0) {
            const allBtn = Array.from(filterBtns).find(btn => btn.getAttribute('data-category') === 'all' || btn.textContent.toLowerCase().includes('todos'));
            if (allBtn) {
                // Hacer clic en 'Todos' para restablecer
                allBtn.click();
            }
        }
        
        setTimeout(() => {
            targetEl.scrollIntoView({ behavior: "smooth", block: "center" });
            targetEl.classList.add("highlight-card");
            setTimeout(() => {
                targetEl.classList.remove("highlight-card");
            }, 4500);
        }, 100);
    }
}

// Detectar si venimos con un hash para resaltar en la carga inicial de la página
function checkHighlightHash() {
    if (window.location.hash) {
        const id = window.location.hash.substring(1);
        if (id) {
            // Esperar a que rendericen los elementos
            setTimeout(() => {
                highlightBusinessCard(id);
            }, 600);
        }
    }
}

// Función para aplicar/remover la hoja de estilos clara con precarga
function toggleLightStylesheet(isLight, callback) {
    const link = document.querySelector('link[href*="estilos.css"]') || 
                 document.querySelector('link[href*="estilo_claro.css"]') ||
                 document.querySelector('link[href*="estilo_claro_multi.css"]');
    if (!link) {
        if (callback) callback();
        return;
    }

    const pathname = window.location.pathname.toLowerCase();
    const isSensun = pathname.includes("sensunshop");
    
    let depth = 0;
    if (pathname.includes("/sensunshop/negocioslocales/")) {
        depth = 2;
    } else if (pathname.includes("/sensunshop/") && !pathname.endsWith("/sensunshop.html")) {
        depth = 1;
    }
    
    let pathPrefix = "";
    if (depth === 2) {
        pathPrefix = "../../";
    } else if (depth === 1) {
        pathPrefix = "../";
    }

    let newHref = "";
    if (isLight) {
        if (isSensun) {
            newHref = pathPrefix + "estilo_claro.css?v=3";
        } else {
            newHref = pathPrefix + "estilo_claro_multi.css?v=3";
        }
    } else {
        newHref = pathPrefix + "estilos.css?v=3";
    }

    // Usar callback cuando el navegador termine de cargar la nueva hoja de estilos
    let called = false;
    const handleLoad = () => {
        if (!called) {
            called = true;
            if (callback) callback();
        }
    };

    link.onload = handleLoad;
    
    // Timeout de respaldo por si el evento onload no se dispara
    setTimeout(handleLoad, 400);

    link.href = newHref;
}

// Inicializar interruptores de tema claro/oscuro
function initThemeToggle() {
    const toggleButtons = document.querySelectorAll('.theme-toggle-btn');
    if (toggleButtons.length === 0) return;

    toggleButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            
            // 1. Agregar clase de transición para desvanecer el contenido de forma fluida
            document.body.classList.add('theme-transitioning');
            
            // 2. Dar tiempo para el fade-out (200ms)
            setTimeout(() => {
                const isLight = !document.body.classList.contains('light-theme');
                
                // 3. Intercambiar la hoja de estilos y esperar a que se precargue
                toggleLightStylesheet(isLight, () => {
                    // 4. Cambiar clases del body una vez cargada la hoja
                    if (isLight) {
                        document.body.classList.add('light-theme');
                        localStorage.setItem('theme', 'light');
                    } else {
                        document.body.classList.remove('light-theme');
                        localStorage.setItem('theme', 'dark');
                    }
                    
                    // 5. Retirar la clase de transición para hacer un fade-in suave con los nuevos estilos ya aplicados
                    setTimeout(() => {
                        document.body.classList.remove('theme-transitioning');
                    }, 50);
                });
            }, 200);
        });
    });
}

// ==========================================================================
// SISTEMA DE AUTENTICACIÓN (LOGIN, LOGOUT, REGISTRO CON FIREBASE)
// ==========================================================================
function initAuthentication(depth) {
    const prefix = depth === 2 ? '../../' : depth === 1 ? '../' : './';
    const authModalPath = prefix + 'partials/auth-modal.html';
    const profileModalPath = prefix + 'partials/profile-modal.html';
    // Agregar cache-buster para evitar que el navegador use una versión vieja en cache
    const configPath = prefix + 'firebase-config.js?v=' + Date.now();

    console.log("[Auth Debug] initAuthentication started. configPath:", configPath);

    // Cargar los modales de autenticación y perfil dinámicamente de forma concurrente
    Promise.all([
        fetch(authModalPath).then(res => {
            if (!res.ok) throw new Error("No se pudo cargar el modal de autenticación");
            return res.text();
        }),
        fetch(profileModalPath).then(res => {
            if (!res.ok) throw new Error("No se pudo cargar el modal de perfil");
            return res.text();
        })
    ])
    .then(async ([authHtml, profileHtml]) => {
        console.log("[Auth Debug] Modales cargados exitosamente.");

        // Inyectar modal de Auth
        const authWrapper = document.createElement('div');
        authWrapper.innerHTML = authHtml;
        const authModal = authWrapper.querySelector('#auth-modal');
        if (authModal) {
            document.body.appendChild(authModal);
        }

        // Inyectar modal de Perfil y confirmación de eliminación/cierre de sesión
        const profileWrapper = document.createElement('div');
        profileWrapper.innerHTML = profileHtml;
        const profileModal = profileWrapper.querySelector('#profile-modal');
        const confirmDeleteModal = profileWrapper.querySelector('#confirm-delete-modal');
        const reauthModal = profileWrapper.querySelector('#reauth-modal');
        const confirmLogoutModal = profileWrapper.querySelector('#confirm-logout-modal');
        const userFavoritesModal = profileWrapper.querySelector('#user-favorites-modal');
        
        if (profileModal) document.body.appendChild(profileModal);
        if (confirmDeleteModal) document.body.appendChild(confirmDeleteModal);
        if (reauthModal) document.body.appendChild(reauthModal);
        if (confirmLogoutModal) document.body.appendChild(confirmLogoutModal);
        if (userFavoritesModal) document.body.appendChild(userFavoritesModal);

        // Inicializar interfaces de usuario de inmediato (síncronas)
        const authUI = setupAuthUI(authModal);
        const profileUI = setupProfileUI(profileModal, confirmDeleteModal, reauthModal, confirmLogoutModal);

        // Importar dinámicamente la configuración de Firebase
        try {
            const fb = await import(configPath);
            console.log("[Auth Debug] Firebase config loaded. Exported keys:", Object.keys(fb));
            connectFirebaseToAuth(authUI, fb);
            connectFirebaseToProfile(profileUI, fb);
        } catch (err) {
            console.error("[Auth Debug] Error al importar Firebase en el cliente:", err);
        }
    })
    .catch(err => console.error("[Auth Debug] Error al inicializar el sistema de autenticación/perfil:", err));
}

function setupAuthUI(authModal) {
    const authForm = authModal.querySelector('#auth-form');
    const authTitle = authModal.querySelector('#auth-title');
    const authSubtitle = authModal.querySelector('#auth-subtitle');
    const groupName = authModal.querySelector('#group-name');
    const inputName = authModal.querySelector('#auth-name');
    const inputEmail = authModal.querySelector('#auth-email');
    const inputPassword = authModal.querySelector('#auth-password');
    const errorMsg = authModal.querySelector('#auth-error-msg');
    const submitBtn = authModal.querySelector('#auth-submit-btn');
    const tabLogin = authModal.querySelector('#tab-login');
    const tabRegister = authModal.querySelector('#tab-register');
    const closeBtn = authModal.querySelector('#auth-modal-close');

    let currentMode = 'login'; // 'login' o 'register'

    // Control del modal
    function openModal() {
        if (errorMsg) {
            errorMsg.style.display = 'none';
            errorMsg.textContent = '';
        }
        if (authForm) authForm.reset();
        switchMode('login');
        authModal.removeAttribute('style');
        authModal.classList.add('active');
        window.updateBodyScroll();
    }

    function closeModal() {
        authModal.classList.remove('active');
        window.updateBodyScroll();
    }

    // Cambiar entre Login y Registro
    function switchMode(mode) {
        currentMode = mode;
        if (errorMsg) errorMsg.style.display = 'none';
        
        if (mode === 'login') {
            if (tabLogin) tabLogin.classList.add('active');
            if (tabRegister) tabRegister.classList.remove('active');
            if (authTitle) authTitle.textContent = 'Ingresa a tu cuenta';
            if (authSubtitle) authSubtitle.textContent = 'Accede a todas las funciones de Multi Ideas Sv';
            if (groupName) groupName.style.display = 'none';
            if (inputName) inputName.removeAttribute('required');
            if (submitBtn) submitBtn.textContent = 'Ingresar';
        } else {
            if (tabLogin) tabLogin.classList.remove('active');
            if (tabRegister) tabRegister.classList.add('active');
            if (authTitle) authTitle.textContent = 'Crea tu cuenta';
            if (authSubtitle) authSubtitle.textContent = 'Regístrate gratis para personalizar tu experiencia';
            if (groupName) groupName.style.display = 'flex';
            if (inputName) inputName.setAttribute('required', 'true');
            if (submitBtn) submitBtn.textContent = 'Registrarse';
        }
    }

    // Listeners del modal
    if (tabLogin) tabLogin.addEventListener('click', () => switchMode('login'));
    if (tabRegister) tabRegister.addEventListener('click', () => switchMode('register'));
    if (closeBtn) closeBtn.addEventListener('click', closeModal);
    authModal.addEventListener('click', (e) => {
        if (e.target === authModal) closeModal();
    });

    // Exportar openModal globalmente de inmediato
    console.log("[Auth Debug] setupAuthUI initialized. Exporting openModal to window.openAuthModal.");
    window.openAuthModal = openModal;

    return {
        authForm,
        inputEmail,
        inputPassword,
        inputName,
        errorMsg,
        submitBtn,
        closeModal,
        getCurrentMode: () => currentMode
    };
}

function connectFirebaseToAuth(authUI, fb) {
    const { 
        auth, 
        signInWithEmailAndPassword, 
        createUserWithEmailAndPassword, 
        signOut, 
        updateProfile,
        onAuthStateChanged 
    } = fb;

    const { authForm, inputEmail, inputPassword, inputName, errorMsg, submitBtn, closeModal, getCurrentMode } = authUI;

    // Mapeo de errores de Firebase Auth a español amigable
    function getFriendlyErrorMessage(code) {
        switch (code) {
            case 'auth/invalid-credential':
            case 'auth/wrong-password':
            case 'auth/user-not-found':
                return 'Credenciales incorrectas. Verifica tu correo y contraseña.';
            case 'auth/email-already-in-use':
                return 'Este correo electrónico ya está registrado por otro usuario.';
            case 'auth/weak-password':
                return 'La contraseña es demasiado débil. Debe tener al menos 6 caracteres.';
            case 'auth/invalid-email':
                return 'El formato del correo electrónico no es válido.';
            case 'auth/missing-password':
                return 'Por favor ingresa tu contraseña.';
            case 'auth/missing-email':
                return 'Por favor ingresa tu dirección de correo electrónico.';
            default:
                return 'Ocurrió un error inesperado al procesar la solicitud. Por favor intenta de nuevo.';
        }
    }

    // Formulario de login/registro
    if (authForm) {
        authForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (errorMsg) {
                errorMsg.style.display = 'none';
                errorMsg.textContent = '';
            }
            if (submitBtn) submitBtn.disabled = true;
            
            const email = inputEmail ? inputEmail.value.trim() : '';
            const password = inputPassword ? inputPassword.value : '';
            const displayName = inputName ? inputName.value.trim() : '';
            const currentMode = getCurrentMode();

            try {
                if (currentMode === 'login') {
                    await signInWithEmailAndPassword(auth, email, password);
                    showNotification('Sesión Iniciada', '¡Bienvenido de nuevo a Multi Ideas Sv!', 'success');
                } else {
                    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                    if (displayName) {
                        await updateProfile(userCredential.user, { displayName });
                    }
                    showNotification('Registro Completado', '¡Tu cuenta ha sido creada con éxito!', 'success');
                }
                closeModal();
            } catch (error) {
                console.error("Error de autenticación:", error);
                if (errorMsg) {
                    errorMsg.textContent = getFriendlyErrorMessage(error.code);
                    errorMsg.style.display = 'block';
                }
                showNotification('Error de Autenticación', getFriendlyErrorMessage(error.code), 'error');
            } finally {
                if (submitBtn) submitBtn.disabled = false;
            }
        });
    }

    window.firebaseSignOut = signOut;
    window.firebaseAuth = auth;

    // Escuchar cambios de estado en la sesión
    onAuthStateChanged(auth, (user) => {
        window.firebaseUserInstance = user;
        updateHeaderUI(user, window.openAuthModal, signOut, auth);
    });
}

// Escuchador global de clics para abrir la ventana emergente de autenticación, perfil o cerrar sesión
document.addEventListener('click', (e) => {
    console.log("[Auth Debug] Click detectado en:", e.target);
    
    // 1. Trigger de Autenticación (Iniciar Sesión)
    const trigger = e.target.closest('.btn-login-trigger') || e.target.closest('.btn-auth-trigger');
    if (trigger) {
        console.log("[Auth Debug] Click en trigger de auth.");
        e.preventDefault();
        if (typeof window.openAuthModal === 'function') {
            window.openAuthModal();
        } else {
            console.warn("[Auth Debug] window.openAuthModal no es una función!");
        }
        return;
    }

    // 2. Trigger para Cerrar Sesión (Cualquiera de los botones)
    const logoutBtn = e.target.closest('#btn-logout-desktop') || 
                      e.target.closest('#btn-logout-mobile') || 
                      e.target.closest('#profile-logout-btn') ||
                      e.target.closest('.btn-logout-round') ||
                      e.target.closest('.btn-logout');
                      
    if (logoutBtn) {
        console.log("[Auth Debug] Click en botón de cerrar sesión detectado:", logoutBtn);
        e.preventDefault();
        
        // Cerrar modal de perfil si estuviera abierto para evitar superposición
        const profileModal = document.querySelector('#profile-modal');
        if (profileModal) profileModal.classList.remove('active');
        
        // Abrir modal personalizado de confirmación de cierre de sesión
        if (typeof window.openConfirmLogoutModal === 'function') {
            window.openConfirmLogoutModal();
        } else {
            console.warn("[Auth Debug] window.openConfirmLogoutModal no está disponible.");
        }
        return;
    }

    // 3. Trigger para abrir el perfil del usuario al hacer clic en su insignia, nombre o info (excluyendo el botón de logout)
    const profileTrigger = e.target.closest('.user-profile-info') || 
                           e.target.closest('.user-profile-badge') || 
                           e.target.closest('.user-profile-email');
    if (profileTrigger) {
        console.log("[Auth Debug] Click en badge o email del perfil.");
        if (e.target.closest('#btn-logout-desktop') || e.target.closest('#btn-logout-mobile')) {
            return;
        }
        if (typeof window.openProfileModal === 'function') {
            e.preventDefault();
            const user = window.firebaseUserInstance;
            if (user) {
                const inputName = document.querySelector('#profile-name-input');
                const labelEmail = document.querySelector('#profile-user-email');
                const labelAvatar = document.querySelector('#profile-avatar-char');
                
                if (inputName) inputName.value = user.displayName || user.email.split('@')[0];
                if (labelEmail) labelEmail.textContent = user.email;
                if (labelAvatar) labelAvatar.textContent = (user.displayName || user.email).charAt(0).toUpperCase();
            }
            window.openProfileModal();
        }
    }
});

function updateHeaderUI(user, openModalFn, signOutFn, auth) {
    const containers = document.querySelectorAll('.nav-auth-container');
    const text = window.location.pathname.includes('sensunshop') ? 'Acceder' : 'Iniciar Sesión';

    containers.forEach(container => {
        if (user) {
            const initials = (user.displayName || user.email).charAt(0).toUpperCase();
            const displayName = user.displayName || user.email.split('@')[0];

            container.innerHTML = `
                <div class="user-profile-menu" style="display: flex; align-items: center; justify-content: space-between; width: 100%; gap: 15px;">
                    <div class="user-profile-info" style="display: flex; align-items: center; gap: 10px; cursor: pointer;">
                        <div class="user-profile-badge" title="${user.email}">${initials}</div>
                        <span class="user-profile-email" title="${user.email}">${displayName}</span>
                    </div>
                    <button class="btn-logout-round" title="Cerrar Sesión">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"></path><line x1="12" y1="2" x2="12" y2="12"></line></svg>
                    </button>
                </div>
            `;
            
            // Aplicar avatar e iniciales si tiene un avatar guardado en Firebase photoURL
            const badge = container.querySelector('.user-profile-badge');
            if (badge) {
                applyAvatarToElement(badge, user.photoURL, initials);
            }
        } else {
            container.innerHTML = `<button class="btn-auth-trigger btn-login-trigger">${text}</button>`;
            const btn = container.querySelector('.btn-login-trigger');
            if (btn) btn.addEventListener('click', openModalFn);
        }
    });
}

// Helpers para renderizado y aplicación del avatar dinámico
function getAvatarSvg(avatarKey, strokeColor = '#ffffff') {
    switch (avatarKey) {
        case 'male1':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;"><circle cx="12" cy="10" r="4.5"></circle><path d="M8.5 7.5c1-1.5 2.5-2 3.5-2s2.5.5 3.5 2M8 9.5c0-1.5 1.5-2.5 4-2.5s4 1 4 2.5" stroke-width="2.2"></path><path d="M5 20a7 7 0 0 1 14 0"></path><path d="M10 14.5v2l2 2 2-2v-2"></path></svg>`;
        case 'male2':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;"><path d="M8.5 9a3.5 3.5 0 0 1 7 0v2a3.5 3.5 0 0 1-7 0V9z"></path><path d="M8 7.5c.5-2 2-3 4-3s3.5 1 4 3" stroke-width="2.2"></path><path d="M8.5 11c0 2 1.5 3.5 3.5 3.5s3.5-1.5 3.5-3.5" stroke-width="2.2"></path><path d="M5 20.5a7 7 0 0 1 14 0"></path></svg>`;
        case 'female1':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;"><circle cx="12" cy="10" r="4"></circle><path d="M7.5 9c0-3.5 2.5-4.5 4.5-4.5s4.5 1 4.5 4.5v5.5c0 .5-.5 1.5-1 1.5s-1-1-1-1.5V11" stroke-width="2.2"></path><path d="M7.5 9v5.5c0 .5.5 1.5 1 1.5s1-1 1-1.5V11" stroke-width="2.2"></path><path d="M5 20a7 7 0 0 1 14 0"></path></svg>`;
        case 'female2':
            return `<svg viewBox="0 0 24 24" fill="none" stroke="${strokeColor}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" style="width: 100%; height: 100%; display: block;"><circle cx="12" cy="4.5" r="2" stroke-width="2.2"></circle><circle cx="12" cy="11" r="4"></circle><path d="M8 9.5c1-1 2-1.5 4-1.5s3 .5 4 1.5" stroke-width="2.2"></path><circle cx="7.5" cy="12" r="0.8" fill="currentColor"></circle><circle cx="16.5" cy="12" r="0.8" fill="currentColor"></circle><path d="M5 20.5a7 7 0 0 1 14 0"></path><path d="M10 16.5a2 2 0 0 0 4 0"></path></svg>`;
        default:
            return '';
    }
}

function applyAvatarToElement(element, photoURL, initials = 'U') {
    if (!element) return;
    
    let avatarKey = '';
    let bgColor = '';
    
    if (photoURL && photoURL.includes('|')) {
        const parts = photoURL.split('|');
        avatarKey = parts[0];
        bgColor = parts[1];
    }
    
    if (avatarKey && bgColor) {
        element.style.backgroundColor = bgColor;
        element.style.color = '#ffffff';
        element.innerHTML = getAvatarSvg(avatarKey, '#ffffff');
        // Quitar estilos de texto
        element.style.fontSize = '0';
        element.style.lineHeight = '0';
        element.style.padding = '5px'; // Dar espacio interno para que el SVG no toque los bordes
        element.style.boxSizing = 'border-box';
    } else {
        // Restaurar valores por defecto (Inicial)
        element.style.backgroundColor = '';
        element.style.color = '';
        element.style.fontSize = '';
        element.style.lineHeight = '';
        element.style.padding = '';
        element.style.boxSizing = '';
        element.textContent = initials;
    }
}

// Función del Sistema de Notificaciones (Toasts) generales - PREMIUM GLASS
function showNotification(title, message, type = 'success') {
    let container = document.querySelector('.toast-container');
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'toast-notification';
    
    // Configurar icono SVG e indicador de borde según el tipo
    let iconSvg = '';
    let iconColor = 'var(--cyan)'; // Por defecto hereda el color de marca (Cian en Multi, Naranja en Sensun)
    
    if (type === 'success') {
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" style="color: var(--cyan);"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
    } else if (type === 'error') {
        iconColor = '#e74c3c';
        toast.style.borderLeftColor = iconColor;
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    } else if (type === 'warning') {
        iconColor = '#f39c12';
        toast.style.borderLeftColor = iconColor;
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
    } else if (type === 'info') {
        iconColor = '#3498db';
        toast.style.borderLeftColor = iconColor;
        iconSvg = `<svg viewBox="0 0 24 24" fill="none" stroke="${iconColor}" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`;
    }

    toast.innerHTML = `
        <div class="toast-icon-wrapper">
            ${iconSvg}
        </div>
        <div class="toast-content">
            <div class="toast-title">${title}</div>
            <div class="toast-message">${message}</div>
        </div>
    `;

    container.appendChild(toast);

    // Provocar reflujo para disparar transición CSS
    toast.offsetHeight;
    toast.classList.add('show');

    // Retirar la notificación automáticamente tras 4 segundos
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toast.remove();
        }, 400);
    }, 4000);
}

// ==========================================================================
// SISTEMA DE PERFIL DE USUARIO Y ELIMINACIÓN DE CUENTA (FIREBASE)
// ==========================================================================
function setupProfileUI(profileModal, confirmDeleteModal, reauthModal, confirmLogoutModal) {
    // If profileModal is not found, return a fallback object to prevent crashing
    if (!profileModal) {
        console.warn("[Profile UI] profileModal is missing");
        return {
            setSelectedAvatarUI: () => {},
            getSelectedAvatar: () => '',
            getSelectedColor: () => ''
        };
    }

    const inputName = profileModal.querySelector('#profile-name-input');
    const saveNameBtn = profileModal.querySelector('#profile-save-name-btn');
    const labelEmail = profileModal.querySelector('#profile-user-email');
    const labelAvatar = profileModal.querySelector('#profile-avatar-char');
    const closeBtn = profileModal.querySelector('#profile-modal-close');
    const logoutBtn = profileModal.querySelector('#profile-logout-btn');
    const deleteBtn = profileModal.querySelector('#profile-delete-btn');

    const confirmCloseBtn = confirmDeleteModal ? confirmDeleteModal.querySelector('#confirm-delete-close') : null;
    const confirmCancelBtn = confirmDeleteModal ? confirmDeleteModal.querySelector('#confirm-delete-no') : null;
    const confirmYesBtn = confirmDeleteModal ? confirmDeleteModal.querySelector('#confirm-delete-yes') : null;

    const reauthForm = reauthModal ? reauthModal.querySelector('#reauth-form') : null;
    const reauthPassword = reauthModal ? reauthModal.querySelector('#reauth-password-input') : null;
    const reauthError = reauthModal ? reauthModal.querySelector('#reauth-error-msg') : null;
    const reauthClose = reauthModal ? reauthModal.querySelector('#reauth-modal-close') : null;

    const logoutCloseBtn = confirmLogoutModal ? confirmLogoutModal.querySelector('#confirm-logout-close') : null;
    const logoutCancelBtn = confirmLogoutModal ? confirmLogoutModal.querySelector('#confirm-logout-no') : null;
    const logoutYesBtn = confirmLogoutModal ? confirmLogoutModal.querySelector('#confirm-logout-yes') : null;

    // Avatar Customizer Elements
    const saveAvatarBtn = profileModal.querySelector('#profile-save-avatar-btn');
    const avatarOptionBtns = profileModal.querySelectorAll('.avatar-option-btn');
    const colorOptionBtns = profileModal.querySelectorAll('.color-option-btn');

    // Ocultar botón de favoritos si no estamos en sensunshop
    const favoritesBtn = profileModal.querySelector('#profile-favorites-btn');
    if (favoritesBtn) {
        const isSensunshop = window.location.pathname.toLowerCase().includes('sensunshop');
        const parentDiv = favoritesBtn.parentElement;
        if (parentDiv) {
            parentDiv.style.display = isSensunshop ? 'flex' : 'none';
        } else {
            favoritesBtn.style.display = isSensunshop ? 'block' : 'none';
        }
    }

    let selectedAvatar = '';
    let selectedColor = '';

    avatarOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            avatarOptionBtns.forEach(b => {
                b.style.borderColor = 'rgba(255,255,255,0.1)';
                b.style.background = 'rgba(255,255,255,0.05)';
            });
            btn.style.borderColor = 'var(--cyan)';
            btn.style.background = 'rgba(var(--cyan-rgb, 0, 173, 181), 0.1)';
            selectedAvatar = btn.getAttribute('data-avatar');
        });
    });

    colorOptionBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            colorOptionBtns.forEach(b => {
                b.style.transform = 'scale(1)';
                b.style.borderColor = 'transparent';
            });
            btn.style.transform = 'scale(1.2)';
            btn.style.borderColor = '#ffffff';
            selectedColor = btn.getAttribute('data-color');
        });
    });

    function setSelectedAvatarUI(photoURL) {
        let currentAvatar = '';
        let currentColor = '';
        if (photoURL && photoURL.includes('|')) {
            const parts = photoURL.split('|');
            currentAvatar = parts[0];
            currentColor = parts[1];
        }
        
        avatarOptionBtns.forEach(b => {
            if (b.getAttribute('data-avatar') === currentAvatar) {
                b.style.borderColor = 'var(--cyan)';
                b.style.background = 'rgba(var(--cyan-rgb, 0, 173, 181), 0.1)';
                selectedAvatar = currentAvatar;
            } else {
                b.style.borderColor = 'rgba(255,255,255,0.1)';
                b.style.background = 'rgba(255,255,255,0.05)';
            }
        });

        colorOptionBtns.forEach(b => {
            if (b.getAttribute('data-color') === currentColor) {
                b.style.transform = 'scale(1.2)';
                b.style.borderColor = '#ffffff';
                selectedColor = currentColor;
            } else {
                b.style.transform = 'scale(1)';
                b.style.borderColor = 'transparent';
            }
        });
    }

    const btnEditMode = profileModal.querySelector('#profile-btn-edit-mode');
    const btnCancelEdit = profileModal.querySelector('#profile-btn-cancel-edit');
    let originalName = '';

    if (btnEditMode) {
        btnEditMode.addEventListener('click', (e) => {
            e.preventDefault();
            if (inputName) {
                originalName = inputName.value;
                inputName.removeAttribute('readonly');
                inputName.style.pointerEvents = 'auto';
                inputName.style.background = 'rgba(255,255,255,0.06)';
                inputName.style.borderColor = 'rgba(255,255,255,0.15)';
                inputName.focus();
                inputName.select();
            }
            
            btnEditMode.style.display = 'none';
            if (saveNameBtn) saveNameBtn.style.display = 'flex';
            if (btnCancelEdit) btnCancelEdit.style.display = 'flex';
        });
    }

    function resetEditState() {
        if (inputName) {
            inputName.setAttribute('readonly', 'true');
            inputName.style.pointerEvents = 'none';
            inputName.style.background = 'rgba(255,255,255,0.02)';
            inputName.style.borderColor = 'rgba(255,255,255,0.05)';
        }
        if (btnEditMode) btnEditMode.style.display = 'flex';
        if (saveNameBtn) saveNameBtn.style.display = 'none';
        if (btnCancelEdit) btnCancelEdit.style.display = 'none';
    }

    if (btnCancelEdit) {
        btnCancelEdit.addEventListener('click', (e) => {
            e.preventDefault();
            if (inputName) inputName.value = originalName;
            resetEditState();
        });
    }

    // Funciones del modal de Perfil
    function openProfile() {
        resetEditState();
        profileModal.classList.add('active');
        window.updateBodyScroll();
    }

    function closeProfile() {
        profileModal.classList.remove('active');
        window.updateBodyScroll();
    }

    if (closeBtn) closeBtn.addEventListener('click', closeProfile);
    profileModal.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfile();
    });

    // Modal de Confirmación de Eliminación
    function openConfirm() {
        if (confirmDeleteModal) confirmDeleteModal.classList.add('active');
        window.updateBodyScroll();
    }

    function closeConfirm() {
        if (confirmDeleteModal) confirmDeleteModal.classList.remove('active');
        window.updateBodyScroll();
    }

    if (deleteBtn) {
        deleteBtn.addEventListener('click', () => {
            closeProfile();
            openConfirm();
        });
    }

    if (confirmCloseBtn) confirmCloseBtn.addEventListener('click', closeConfirm);
    if (confirmCancelBtn) confirmCancelBtn.addEventListener('click', closeConfirm);
    if (confirmDeleteModal) {
        confirmDeleteModal.addEventListener('click', (e) => {
            if (e.target === confirmDeleteModal) closeConfirm();
        });
    }

    // Modal de Reautenticación
    function openReauth() {
        if (reauthError) {
            reauthError.style.display = 'none';
            reauthError.textContent = '';
        }
        if (reauthForm) reauthForm.reset();
        if (reauthModal) reauthModal.classList.add('active');
        window.updateBodyScroll();
    }

    function closeModalReauth() {
        if (reauthModal) reauthModal.classList.remove('active');
        window.updateBodyScroll();
    }

    if (reauthClose) reauthClose.addEventListener('click', closeModalReauth);
    if (reauthModal) {
        reauthModal.addEventListener('click', (e) => {
            if (e.target === reauthModal) closeModalReauth();
        });
    }

    // Modal de Confirmación de Cierre de Sesión
    function openConfirmLogout() {
        if (confirmLogoutModal) confirmLogoutModal.classList.add('active');
        window.updateBodyScroll();
    }

    function closeConfirmLogoutModal() {
        if (confirmLogoutModal) confirmLogoutModal.classList.remove('active');
        window.updateBodyScroll();
    }

    if (logoutCloseBtn) logoutCloseBtn.addEventListener('click', closeConfirmLogoutModal);
    if (logoutCancelBtn) logoutCancelBtn.addEventListener('click', closeConfirmLogoutModal);
    if (confirmLogoutModal) {
        confirmLogoutModal.addEventListener('click', (e) => {
            if (e.target === confirmLogoutModal) closeConfirmLogoutModal();
        });
    }

    window.openProfileModal = openProfile;
    window.openConfirmLogoutModal = openConfirmLogout;
    window.setSelectedAvatarUI = setSelectedAvatarUI;

    return {
        inputName,
        saveNameBtn,
        labelEmail,
        labelAvatar,
        logoutBtn,
        confirmYesBtn,
        reauthForm,
        reauthPassword,
        reauthError,
        closeConfirm,
        closeReauth: closeModalReauth,
        openReauth,
        closeProfile,
        logoutYesBtn,
        closeConfirmLogout: closeConfirmLogoutModal,
        saveAvatarBtn,
        getSelectedAvatar: () => selectedAvatar,
        getSelectedColor: () => selectedColor,
        setSelectedAvatarUI,
        btnEditMode,
        btnCancelEdit
    };
}

function connectFirebaseToProfile(profileUI, fb) {
    const { 
        auth, 
        updateProfile, 
        deleteUser, 
        EmailAuthProvider, 
        reauthenticateWithCredential,
        signOut
    } = fb;

    const { 
        inputName, 
        saveNameBtn, 
        labelEmail, 
        labelAvatar, 
        logoutBtn, 
        confirmYesBtn, 
        reauthForm, 
        reauthPassword, 
        reauthError, 
        closeConfirm, 
        closeReauth, 
        openReauth, 
        closeProfile,
        logoutYesBtn,
        closeConfirmLogout,
        saveAvatarBtn,
        getSelectedAvatar,
        getSelectedColor,
        setSelectedAvatarUI,
        btnEditMode,
        btnCancelEdit
    } = profileUI;

    // Vinculación de botón de salir desde modal de perfil - Manejado por delegador global

    // Al guardar nombre
    if (saveNameBtn) {
        saveNameBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;
            
            const newName = inputName.value.trim();
            if (!newName) {
                showNotification('Error', 'El nombre no puede estar vacío.', 'error');
                return;
            }

            saveNameBtn.disabled = true;
            try {
                await updateProfile(user, { displayName: newName });
                showNotification('Nombre Actualizado', 'Tu perfil ha sido modificado con éxito.', 'success');
                
                // Forzar actualización inmediata del encabezado e interfaz
                const initials = newName.charAt(0).toUpperCase();
                if (labelAvatar) labelAvatar.textContent = initials;
                
                // Actualizar la instancia local
                window.firebaseUserInstance = auth.currentUser;
                
                // Buscar y actualizar elementos de perfil en el encabezado
                const desktopEmail = document.querySelector('#auth-container-desktop .user-profile-email');
                const mobileEmail = document.querySelector('#auth-container-mobile .user-profile-email');
                const desktopBadge = document.querySelector('#auth-container-desktop .user-profile-badge');
                const mobileBadge = document.querySelector('#auth-container-mobile .user-profile-badge');
                
                if (desktopEmail) desktopEmail.textContent = newName;
                if (mobileEmail) mobileEmail.textContent = newName;
                if (desktopBadge) desktopBadge.textContent = initials;
                if (mobileBadge) mobileBadge.textContent = initials;

                // Retornar el input de nombre al estado de sólo lectura
                inputName.setAttribute('readonly', 'true');
                inputName.style.pointerEvents = 'none';
                inputName.style.background = 'rgba(255,255,255,0.02)';
                inputName.style.borderColor = 'rgba(255,255,255,0.05)';
                
                if (btnEditMode) btnEditMode.style.display = 'flex';
                if (saveNameBtn) saveNameBtn.style.display = 'none';
                if (btnCancelEdit) btnCancelEdit.style.display = 'none';

            } catch (err) {
                console.error("Error al actualizar perfil:", err);
                showNotification('Error', 'No se pudo guardar el nombre.', 'error');
            } finally {
                saveNameBtn.disabled = false;
            }
        });
    }

    // Al guardar avatar personalizado
    if (saveAvatarBtn) {
        saveAvatarBtn.addEventListener('click', async () => {
            const user = auth.currentUser;
            if (!user) return;

            const avatar = getSelectedAvatar();
            const color = getSelectedColor();

            if (!avatar || !color) {
                showNotification('Personaliza tu Avatar', 'Por favor elige un avatar y un color de fondo.', 'warning');
                return;
            }

            saveAvatarBtn.disabled = true;
            try {
                const newPhotoURL = `${avatar}|${color}`;
                await updateProfile(user, { photoURL: newPhotoURL });
                showNotification('Avatar Actualizado', 'Tu avatar personalizado ha sido guardado con éxito.', 'success');

                // Actualizar la instancia local
                window.firebaseUserInstance = auth.currentUser;

                // Forzar actualización inmediata del avatar en el modal de perfil
                const initials = (user.displayName || user.email).charAt(0).toUpperCase();
                if (labelAvatar) {
                    applyAvatarToElement(labelAvatar, newPhotoURL, initials);
                }

                // Forzar actualización inmediata en todos los encabezados del DOM
                const headerBadges = document.querySelectorAll('.user-profile-badge');
                headerBadges.forEach(badge => {
                    applyAvatarToElement(badge, newPhotoURL, initials);
                });

            } catch (err) {
                console.error("Error al guardar avatar:", err);
                showNotification('Error', 'No se pudo guardar el avatar personalizado.', 'error');
            } finally {
                saveAvatarBtn.disabled = false;
            }
        });
    }

    // Al confirmar salida en modal de cierre de sesión
    if (logoutYesBtn) {
        logoutYesBtn.addEventListener('click', () => {
            if (typeof closeConfirmLogout === 'function') closeConfirmLogout();
            signOut(auth)
                .then(() => {
                    showNotification('Sesión Cerrada', 'Has cerrado tu sesión correctamente.', 'info');
                })
                .catch(err => {
                    console.error("Error al cerrar sesión:", err);
                    showNotification('Error', 'No se pudo cerrar la sesión.', 'error');
                });
        });
    }

    // Al hacer clic en confirmar eliminación
    if (confirmYesBtn) {
        confirmYesBtn.addEventListener('click', () => {
            closeConfirm();
            openReauth();
        });
    }

    // Formulario de reautenticación para eliminar cuenta
    if (reauthForm) {
        reauthForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const user = auth.currentUser;
            if (!user) return;

            const password = reauthPassword.value;
            if (reauthError) {
                reauthError.style.display = 'none';
                reauthError.textContent = '';
            }

            try {
                // Reautenticar
                const credential = EmailAuthProvider.credential(user.email, password);
                await reauthenticateWithCredential(user, credential);
                
                // Eliminar usuario
                await deleteUser(user);
                
                closeReauth();
                showNotification('Cuenta Eliminada', 'Tu cuenta ha sido dada de baja de forma definitiva.', 'info');
            } catch (err) {
                console.error("Error de eliminación:", err);
                if (reauthError) {
                    let msg = 'Contraseña incorrecta. Verifica tus datos.';
                    if (err.code === 'auth/wrong-password') {
                        msg = 'Contraseña incorrecta. Verifica tus datos.';
                    } else if (err.code === 'auth/user-mismatch') {
                        msg = 'El usuario no coincide.';
                    } else {
                        msg = 'Ocurrió un error inesperado al validar la identidad.';
                    }
                    reauthError.textContent = msg;
                    reauthError.style.display = 'block';
                }
                showNotification('Error', 'No se pudo eliminar la cuenta.', 'error');
            }
        });
    }
}