// ==========================================================================
// CONFIGURACIÓN GLOBAL Y TIEMPOS
// ==========================================================================
const TRANSITION_DURATION = 200;

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
}

function openCart() {
    const drawer = document.getElementById("cart-drawer");
    const overlay = document.getElementById("cart-overlay");
    if (drawer) drawer.classList.add("active");
    if (overlay) overlay.classList.add("active");
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
    }
}