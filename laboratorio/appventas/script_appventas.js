import { 
    auth, 
    rtdb, 
    signInWithEmailAndPassword, 
    createUserWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    updateProfile
} from "../../firebase-config.js";
import { ref, set, get } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js";

// ============================================
// ALMACENAMIENTO DE DATOS
// ============================================
let store = {
    empresa: {
        nombre: 'Mi Empresa',
        rubro: 'Comercio',
        tipo: 'Pequeña',
        direccion: '',
        telefono: '',
        email: '',
        rfc: '',
        logo: ''
    },
    ventas: [],
    inventario: [],
    materiaPrima: [],
    catalogo: [],
    proveedores: [],
    clientes: []
};

let currentSection = 'dashboard';

let currentUser = null;

// ============================================
// PERSISTENCIA DE DATOS (Firebase RTDB + localStorage)
// ============================================
async function loadData() {
    if (currentUser) {
        try {
            const dbRef = ref(rtdb, `laboratorio_ventas/users/${currentUser.uid}`);
            const snapshot = await get(dbRef);
            if (snapshot.exists()) {
                store = snapshot.val();
                // Asegurar que existan todos los campos y arrays obligatorios
                store.ventas = store.ventas || [];
                store.inventario = store.inventario || [];
                store.materiaPrima = store.materiaPrima || [];
                store.catalogo = store.catalogo || [];
                store.proveedores = store.proveedores || [];
                store.clientes = store.clientes || [];
                store.empresa = store.empresa || {
                    nombre: 'Mi Empresa',
                    rubro: 'Comercio',
                    tipo: 'Pequeña',
                    direccion: '',
                    telefono: '',
                    email: '',
                    rfc: '',
                    logo: ''
                };
            } else {
                // Si no hay datos en la nube, migrar los de localStorage o dejar valores por defecto
                const saved = localStorage.getItem('ventasProData');
                if (saved) {
                    store = JSON.parse(saved);
                    await saveData();
                }
            }
        } catch (error) {
            console.error("Error al cargar datos de Firebase:", error);
            const saved = localStorage.getItem('ventasProData');
            if (saved) store = JSON.parse(saved);
        }
    }
}

async function saveData() {
    if (currentUser) {
        try {
            await set(ref(rtdb, `laboratorio_ventas/users/${currentUser.uid}`), store);
        } catch (error) {
            console.error("Error al guardar datos en Firebase:", error);
        }
    }
    localStorage.setItem('ventasProData', JSON.stringify(store));
}

// ============================================
// NAVEGACIÓN
// ============================================
function navigateTo(section) {
    currentSection = section;

    // Actualizar botones de navegación
    document.querySelectorAll('.nav-btn').forEach(btn => {
        btn.classList.remove('bg-cyan-600/20', 'text-cyan-400', 'border-l-4', 'border-cyan-400');
        if (btn.dataset.section === section) {
            btn.classList.add('bg-cyan-600/20', 'text-cyan-400');
        }
    });

    // Actualizar títulos de página
    const titles = {
        'dashboard': ['Dashboard', 'Resumen general del sistema'],
        'empresa': ['Empresa', 'Configuración de la empresa'],
        'ventas': ['Ventas', 'Control de ventas realizadas'],
        'inventario': ['Inventario', 'Gestión de stock'],
        'materia-prima': ['Materia Prima', 'Control de materias primas'],
        'catalogo': ['Catálogo', 'Catálogo de productos'],
        'proveedores': ['Proveedores', 'Gestión de proveedores'],
        'clientes': ['Clientes', 'Base de datos de clientes']
    };

    document.getElementById('page-title').textContent = titles[section][0];
    document.getElementById('page-subtitle').textContent = titles[section][1];

    // Cargar contenido
    const contentArea = document.getElementById('content-area');
    contentArea.innerHTML = '';
    contentArea.classList.remove('fade-in');
    void contentArea.offsetWidth;
    contentArea.classList.add('fade-in');

    switch(section) {
        case 'dashboard': renderDashboard(); break;
        case 'empresa': renderEmpresa(); break;
        case 'ventas': renderVentas(); break;
        case 'inventario': renderInventario(); break;
        case 'materia-prima': renderMateriaPrima(); break;
        case 'catalogo': renderCatalogo(); break;
        case 'proveedores': renderProveedores(); break;
        case 'clientes': renderClientes(); break;
    }
}

// ============================================
// TEMA CLARO / OSCURO
// ============================================
function toggleTheme() {
    const html = document.documentElement;
    const isDark = html.classList.contains('dark');

    if (isDark) {
        html.classList.remove('dark');
        document.body.classList.remove('bg-zinc-950', 'text-zinc-100');
        document.body.classList.add('bg-slate-50', 'text-zinc-900');
        document.getElementById('theme-text').textContent = 'Modo Oscuro';
        document.getElementById('theme-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/>';
    } else {
        html.classList.add('dark');
        document.body.classList.remove('bg-slate-50', 'text-zinc-900');
        document.body.classList.add('bg-zinc-950', 'text-zinc-100');
        document.getElementById('theme-text').textContent = 'Modo Claro';
        document.getElementById('theme-icon').innerHTML = '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/>';
    }

    localStorage.setItem('theme', isDark ? 'light' : 'dark');
}

// Cargar preferencia de tema
const savedTheme = localStorage.getItem('theme');
if (savedTheme === 'light') {
    toggleTheme();
}

// ============================================
// ACTUALIZAR DISPLAY DE EMPRESA
// ============================================
function updateCompanyDisplay() {
    document.getElementById('company-name-display').textContent = store.empresa.nombre;
    document.getElementById('company-rubro-display').textContent = store.empresa.rubro + ' - ' + store.empresa.tipo;
}

// ============================================
// MODAL
// ============================================
function openModal(title, content) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-content').innerHTML = content;
    document.getElementById('modal').classList.remove('hidden');
    document.getElementById('modal').classList.add('flex');
}

function closeModal() {
    document.getElementById('modal').classList.add('hidden');
    document.getElementById('modal').classList.remove('flex');
}

// ============================================
// DASHBOARD
// ============================================
function renderDashboard() {
    const totalVentas = store.ventas.reduce((sum, v) => sum + v.total, 0);
    const totalProductos = store.inventario.length;
    const totalClientes = store.clientes.length;
    const totalProveedores = store.proveedores.length;

    document.getElementById('content-area').innerHTML = `
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                    </div>
                </div>
                <h3 class="text-zinc-500 text-sm mb-1">Total Ventas</h3>
                <p class="text-3xl font-bold text-cyan-400">$${totalVentas.toLocaleString()}</p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"/></svg>
                    </div>
                </div>
                <h3 class="text-zinc-500 text-sm mb-1">Productos en Inventario</h3>
                <p class="text-3xl font-bold text-cyan-400">${totalProductos}</p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                    </div>
                </div>
                <h3 class="text-zinc-500 text-sm mb-1">Clientes</h3>
                <p class="text-3xl font-bold text-cyan-400">${totalClientes}</p>
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <div class="flex items-center justify-between mb-4">
                    <div class="w-12 h-12 rounded-lg bg-cyan-600/20 flex items-center justify-center">
                        <svg class="w-6 h-6 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"/></svg>
                    </div>
                </div>
                <h3 class="text-zinc-500 text-sm mb-1">Proveedores</h3>
                <p class="text-3xl font-bold text-cyan-400">${totalProveedores}</p>
            </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 class="text-lg font-semibold mb-4 text-cyan-400">Últimas Ventas</h3>
                ${store.ventas.length === 0 ? '<p class="text-zinc-500">No hay ventas registradas</p>' :
                '<div class="space-y-3">' + store.ventas.slice(-5).reverse().map(v => `
                    <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                            <p class="font-medium">${v.cliente}</p>
                            <p class="text-sm text-zinc-500">${v.fecha}</p>
                        </div>
                        <p class="text-cyan-400 font-semibold">$${v.total.toLocaleString()}</p>
                    </div>
                `).join('') + '</div>'}
            </div>
            <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
                <h3 class="text-lg font-semibold mb-4 text-cyan-400">Productos con Bajo Stock</h3>
                ${store.inventario.filter(i => i.stock < 10).length === 0 ? '<p class="text-zinc-500">Todos los productos tienen stock suficiente</p>' :
                '<div class="space-y-3">' + store.inventario.filter(i => i.stock < 10).map(i => `
                    <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                        <div>
                            <p class="font-medium">${i.nombre}</p>
                            <p class="text-sm text-zinc-500">Stock: ${i.stock}</p>
                        </div>
                        <span class="px-3 py-1 rounded-full bg-red-600/20 text-red-400 text-sm">Bajo</span>
                    </div>
                `).join('') + '</div>'}
            </div>
        </div>
    `;
}

// ============================================
// EMPRESA
// ============================================
function renderEmpresa() {
    document.getElementById('content-area').innerHTML = `
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-6 text-cyan-400">Información de la Empresa</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Nombre de la Empresa</label>
                    <input type="text" id="emp-nombre" value="${store.empresa.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Rubro</label>
                    <select id="emp-rubro" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                        <option value="Comercio" ${store.empresa.rubro === 'Comercio' ? 'selected' : ''}>Comercio</option>
                        <option value="Servicios" ${store.empresa.rubro === 'Servicios' ? 'selected' : ''}>Servicios</option>
                        <option value="Manufactura" ${store.empresa.rubro === 'Manufactura' ? 'selected' : ''}>Manufactura</option>
                        <option value="Tecnología" ${store.empresa.rubro === 'Tecnología' ? 'selected' : ''}>Tecnología</option>
                        <option value="Alimentos" ${store.empresa.rubro === 'Alimentos' ? 'selected' : ''}>Alimentos</option>
                        <option value="Salud" ${store.empresa.rubro === 'Salud' ? 'selected' : ''}>Salud</option>
                        <option value="Educación" ${store.empresa.rubro === 'Educación' ? 'selected' : ''}>Educación</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Tipo de Empresa</label>
                    <select id="emp-tipo" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                        <option value="Micro" ${store.empresa.tipo === 'Micro' ? 'selected' : ''}>Micro</option>
                        <option value="Pequeña" ${store.empresa.tipo === 'Pequeña' ? 'selected' : ''}>Pequeña</option>
                        <option value="Mediana" ${store.empresa.tipo === 'Mediana' ? 'selected' : ''}>Mediana</option>
                        <option value="Grande" ${store.empresa.tipo === 'Grande' ? 'selected' : ''}>Grande</option>
                    </select>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">RFC</label>
                    <input type="text" id="emp-rfc" value="${store.empresa.rfc}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Dirección</label>
                    <input type="text" id="emp-direccion" value="${store.empresa.direccion}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Teléfono</label>
                    <input type="text" id="emp-telefono" value="${store.empresa.telefono}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-2">Email</label>
                    <input type="email" id="emp-email" value="${store.empresa.email}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors">
                </div>
            </div>
            <button onclick="saveEmpresa()" class="mt-6 btn-primary">Guardar Cambios</button>
        </div>
    `;
}

function saveEmpresa() {
    store.empresa = {
        nombre: document.getElementById('emp-nombre').value,
        rubro: document.getElementById('emp-rubro').value,
        tipo: document.getElementById('emp-tipo').value,
        rfc: document.getElementById('emp-rfc').value,
        direccion: document.getElementById('emp-direccion').value,
        telefono: document.getElementById('emp-telefono').value,
        email: document.getElementById('emp-email').value
    };
    saveData();
    updateCompanyDisplay();
    alert('Información de la empresa actualizada');
}

// ============================================
// VENTAS
// ============================================
function renderVentas() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Registro de Ventas</h3>
            <button onclick="openVentaModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Nueva Venta
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Fecha</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cliente</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Productos</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Total</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.ventas.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay ventas registradas</td></tr>' :
                    store.ventas.map((v, i) => `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4">${v.fecha}</td>
                            <td class="px-6 py-4 font-medium">${v.cliente}</td>
                            <td class="px-6 py-4">${v.items.length} productos</td>
                            <td class="px-6 py-4 text-cyan-400 font-semibold">$${v.total.toLocaleString()}</td>
                            <td class="px-6 py-4">
                                <button onclick="deleteVenta(${i})" class="text-red-400 hover:text-red-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openVentaModal() {
    const clientesOptions = store.clientes.map(c => `<option value="${c.nombre}">${c.nombre}</option>`).join('');
    const productosOptions = store.inventario.map(p => `<option value="${p.id}" data-precio="${p.precio}">${p.nombre} - $${p.precio}</option>`).join('');

    openModal('Nueva Venta', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Cliente</label>
                <select id="venta-cliente" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                    <option value="">Seleccionar cliente</option>
                    ${clientesOptions}
                </select>
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Agregar Producto</label>
                <div class="flex gap-2">
                    <select id="venta-producto" class="flex-1 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <option value="">Seleccionar producto</option>
                        ${productosOptions}
                    </select>
                    <input type="number" id="venta-cantidad" placeholder="Cantidad" class="w-32 px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="1" value="1">
                    <button onclick="addVentaItem()" class="btn-primary">Agregar</button>
                </div>
            </div>
            <div id="venta-items" class="space-y-2">
                <p class="text-zinc-500 text-sm">Agrega productos a la venta</p>
            </div>
            <div class="border-t border-zinc-700 pt-4">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold">Total:</span>
                    <span id="venta-total" class="text-2xl font-bold text-cyan-400">$0</span>
                </div>
            </div>
            <button onclick="saveVenta()" class="w-full btn-primary">Guardar Venta</button>
        </div>
    `);
    window.ventaItems = [];
}

function addVentaItem() {
    const productoSelect = document.getElementById('venta-producto');
    const cantidad = parseInt(document.getElementById('venta-cantidad').value);
    const productoId = productoSelect.value;

    if (!productoId || !cantidad) return;

    const producto = store.inventario.find(p => p.id === productoId);
    if (!producto) return;

    window.ventaItems.push({
        id: producto.id,
        nombre: producto.nombre,
        precio: producto.precio,
        cantidad: cantidad,
        subtotal: producto.precio * cantidad
    });

    renderVentaItems();
}

function renderVentaItems() {
    const container = document.getElementById('venta-items');
    if (window.ventaItems.length === 0) {
        container.innerHTML = '<p class="text-zinc-500 text-sm">Agrega productos a la venta</p>';
    } else {
        container.innerHTML = window.ventaItems.map((item, i) => `
            <div class="flex items-center justify-between p-3 bg-zinc-800 rounded-lg">
                <div>
                    <p class="font-medium">${item.nombre}</p>
                    <p class="text-sm text-zinc-500">${item.cantidad} x $${item.precio}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-cyan-400 font-semibold">$${item.subtotal}</span>
                    <button onclick="removeVentaItem(${i})" class="text-red-400 hover:text-red-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }

    const total = window.ventaItems.reduce((sum, item) => sum + item.subtotal, 0);
    document.getElementById('venta-total').textContent = '$' + total.toLocaleString();
}

function removeVentaItem(index) {
    window.ventaItems.splice(index, 1);
    renderVentaItems();
}

function saveVenta() {
    const cliente = document.getElementById('venta-cliente').value;
    if (!cliente || window.ventaItems.length === 0) {
        alert('Selecciona un cliente y agrega al menos un producto');
        return;
    }

    const total = window.ventaItems.reduce((sum, item) => sum + item.subtotal, 0);

    store.ventas.push({
        id: Date.now(),
        fecha: new Date().toLocaleDateString('es-MX'),
        cliente: cliente,
        items: window.ventaItems,
        total: total
    });

    saveData();
    closeModal();
    navigateTo('ventas');
}

function deleteVenta(index) {
    openDeleteModal(() => {
        store.ventas.splice(index, 1);
        saveData();
        navigateTo('ventas');
    });
}

// ============================================
// INVENTARIO
// ============================================
function renderInventario() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Control de Inventario</h3>
            <button onclick="openInventarioModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar Producto
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Producto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Categoría</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Stock</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Precio</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.inventario.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay productos en inventario</td></tr>' :
                    store.inventario.map((p, i) => `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4 font-medium">${p.nombre}</td>
                            <td class="px-6 py-4">${p.categoria}</td>
                            <td class="px-6 py-4">
                                <span class="${p.stock < 10 ? 'text-red-400' : 'text-cyan-400'} font-semibold">${p.stock}</span>
                            </td>
                            <td class="px-6 py-4 text-cyan-400">$${p.precio.toLocaleString()}</td>
                            <td class="px-6 py-4 flex gap-3">
                                <button onclick="openEditInventarioModal(${i})" class="text-cyan-400 hover:text-cyan-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onclick="deleteInventario(${i})" class="text-red-400 hover:text-red-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openInventarioModal() {
    openModal('Agregar Producto al Inventario', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Producto</label>
                <input type="text" id="inv-nombre" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <input type="text" id="inv-categoria" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Stock</label>
                    <input type="number" id="inv-stock" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Precio</label>
                    <input type="number" id="inv-precio" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
            </div>
            <button onclick="saveInventario()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveInventario() {
    const nombre = document.getElementById('inv-nombre').value;
    const categoria = document.getElementById('inv-categoria').value;
    const stock = parseInt(document.getElementById('inv-stock').value);
    const precio = parseFloat(document.getElementById('inv-precio').value);

    if (!nombre || !categoria || isNaN(stock) || isNaN(precio)) {
        alert('Completa todos los campos');
        return;
    }

    store.inventario.push({
        id: Date.now(),
        nombre,
        categoria,
        stock,
        precio
    });

    saveData();
    closeModal();
    navigateTo('inventario');
}

function deleteInventario(index) {
    openDeleteModal(() => {
        store.inventario.splice(index, 1);
        saveData();
        navigateTo('inventario');
    });
}

// ============================================
// MATERIA PRIMA
// ============================================
function renderMateriaPrima() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Control de Materia Prima</h3>
            <button onclick="openMateriaPrimaModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar Materia Prima
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Material</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Unidad</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cantidad</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Costo Unit.</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.materiaPrima.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay materia prima registrada</td></tr>' :
                    store.materiaPrima.map((m, i) => `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4 font-medium">${m.nombre}</td>
                            <td class="px-6 py-4">${m.unidad}</td>
                            <td class="px-6 py-4 text-cyan-400 font-semibold">${m.cantidad}</td>
                            <td class="px-6 py-4">$${m.costo.toLocaleString()}</td>
                            <td class="px-6 py-4 flex gap-3">
                                <button onclick="openEditMateriaPrimaModal(${i})" class="text-cyan-400 hover:text-cyan-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onclick="deleteMateriaPrima(${i})" class="text-red-400 hover:text-red-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openMateriaPrimaModal() {
    openModal('Agregar Materia Prima', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Material</label>
                <input type="text" id="mp-nombre" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Unidad de Medida</label>
                <input type="text" id="mp-unidad" placeholder="kg, litros, piezas, etc." class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Cantidad</label>
                    <input type="number" id="mp-cantidad" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Costo Unitario</label>
                    <input type="number" id="mp-costo" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
            </div>
            <button onclick="saveMateriaPrima()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveMateriaPrima() {
    const nombre = document.getElementById('mp-nombre').value;
    const unidad = document.getElementById('mp-unidad').value;
    const cantidad = parseFloat(document.getElementById('mp-cantidad').value);
    const costo = parseFloat(document.getElementById('mp-costo').value);

    if (!nombre || !unidad || isNaN(cantidad) || isNaN(costo)) {
        alert('Completa todos los campos');
        return;
    }

    store.materiaPrima.push({
        id: Date.now(),
        nombre,
        unidad,
        cantidad,
        costo
    });

    saveData();
    closeModal();
    navigateTo('materia-prima');
}

function deleteMateriaPrima(index) {
    openDeleteModal(() => {
        store.materiaPrima.splice(index, 1);
        saveData();
        navigateTo('materia-prima');
    });
}

// ============================================
// CATÁLOGO
// ============================================
function renderCatalogo() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Catálogo de Productos</h3>
            <button onclick="openCatalogoModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar al Catálogo
            </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            ${store.catalogo.length === 0 ? '<div class="col-span-full text-center py-12 text-zinc-500">No hay productos en el catálogo</div>' :
            store.catalogo.map((p, i) => `
                <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6 hover:border-cyan-600 transition-colors">
                    <div class="flex items-start justify-between mb-4">
                        <h4 class="font-semibold text-lg">${p.nombre}</h4>
                        <div class="flex gap-2">
                            <button onclick="openEditCatalogoModal(${i})" class="text-cyan-400 hover:text-cyan-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                            </button>
                            <button onclick="deleteCatalogo(${i})" class="text-red-400 hover:text-red-300">
                                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                            </button>
                        </div>
                    </div>
                    <p class="text-sm text-zinc-500 mb-3">${p.categoria}</p>
                    <p class="text-sm text-zinc-400 mb-4">${p.descripcion}</p>
                    <div class="flex items-center justify-between">
                        <span class="text-2xl font-bold text-cyan-400">$${p.precio.toLocaleString()}</span>
                        <span class="px-3 py-1 rounded-full bg-cyan-600/20 text-cyan-400 text-sm">${p.disponible ? 'Disponible' : 'No disponible'}</span>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function openCatalogoModal() {
    openModal('Agregar Producto al Catálogo', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Producto</label>
                <input type="text" id="cat-nombre" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <input type="text" id="cat-categoria" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Descripción</label>
                <textarea id="cat-descripcion" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"></textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Precio</label>
                    <input type="number" id="cat-precio" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Disponible</label>
                    <select id="cat-disponible" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <option value="true">Sí</option>
                        <option value="false">No</option>
                    </select>
                </div>
            </div>
            <button onclick="saveCatalogo()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveCatalogo() {
    const nombre = document.getElementById('cat-nombre').value;
    const categoria = document.getElementById('cat-categoria').value;
    const descripcion = document.getElementById('cat-descripcion').value;
    const precio = parseFloat(document.getElementById('cat-precio').value);
    const disponible = document.getElementById('cat-disponible').value === 'true';

    if (!nombre || !categoria || isNaN(precio)) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.catalogo.push({
        id: Date.now(),
        nombre,
        categoria,
        descripcion,
        precio,
        disponible
    });

    saveData();
    closeModal();
    navigateTo('catalogo');
}

function deleteCatalogo(index) {
    openDeleteModal(() => {
        store.catalogo.splice(index, 1);
        saveData();
        navigateTo('catalogo');
    });
}

// ============================================
// PROVEEDORES
// ============================================
function renderProveedores() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Gestión de Proveedores</h3>
            <button onclick="openProveedorModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar Proveedor
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Empresa</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Contacto</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Teléfono</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.proveedores.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay proveedores registrados</td></tr>' :
                    store.proveedores.map((p, i) => `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4 font-medium">${p.empresa}</td>
                            <td class="px-6 py-4">${p.contacto}</td>
                            <td class="px-6 py-4">${p.telefono}</td>
                            <td class="px-6 py-4 text-cyan-400">${p.email}</td>
                            <td class="px-6 py-4 flex gap-3">
                                <button onclick="openEditProveedorModal(${i})" class="text-cyan-400 hover:text-cyan-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onclick="deleteProveedor(${i})" class="text-red-400 hover:text-red-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openProveedorModal() {
    openModal('Agregar Proveedor', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre de la Empresa</label>
                <input type="text" id="prov-empresa" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Persona de Contacto</label>
                <input type="text" id="prov-contacto" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Teléfono</label>
                <input type="text" id="prov-telefono" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" id="prov-email" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Productos/Servicios</label>
                <textarea id="prov-productos" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"></textarea>
            </div>
            <button onclick="saveProveedor()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveProveedor() {
    const empresa = document.getElementById('prov-empresa').value;
    const contacto = document.getElementById('prov-contacto').value;
    const telefono = document.getElementById('prov-telefono').value;
    const email = document.getElementById('prov-email').value;
    const productos = document.getElementById('prov-productos').value;

    if (!empresa || !contacto) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.proveedores.push({
        id: Date.now(),
        empresa,
        contacto,
        telefono,
        email,
        productos
    });

    saveData();
    closeModal();
    navigateTo('proveedores');
}

function deleteProveedor(index) {
    openDeleteModal(() => {
        store.proveedores.splice(index, 1);
        saveData();
        navigateTo('proveedores');
    });
}

// ============================================
// CLIENTES
// ============================================
function renderClientes() {
    document.getElementById('content-area').innerHTML = `
        <div class="flex justify-between items-center mb-6">
            <h3 class="text-lg font-semibold text-cyan-400">Base de Datos de Clientes</h3>
            <button onclick="openClienteModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar Cliente
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Nombre</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Email</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Teléfono</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Compras</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.clientes.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay clientes registrados</td></tr>' :
                    store.clientes.map((c, i) => {
                        const compras = store.ventas.filter(v => v.cliente === c.nombre).length;
                        return `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4 font-medium">${c.nombre}</td>
                            <td class="px-6 py-4 text-cyan-400">${c.email}</td>
                            <td class="px-6 py-4">${c.telefono}</td>
                            <td class="px-6 py-4">${compras}</td>
                            <td class="px-6 py-4 flex gap-3">
                                <button onclick="openEditClienteModal(${i})" class="text-cyan-400 hover:text-cyan-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
                                </button>
                                <button onclick="deleteCliente(${i})" class="text-red-400 hover:text-red-300">
                                    <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"/></svg>
                                </button>
                            </td>
                        </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
        </div>
    `;
}

function openClienteModal() {
    openModal('Agregar Cliente', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre Completo</label>
                <input type="text" id="cli-nombre" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" id="cli-email" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Teléfono</label>
                <input type="text" id="cli-telefono" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Dirección</label>
                <textarea id="cli-direccion" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg"></textarea>
            </div>
            <button onclick="saveCliente()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveCliente() {
    const nombre = document.getElementById('cli-nombre').value;
    const email = document.getElementById('cli-email').value;
    const telefono = document.getElementById('cli-telefono').value;
    const direccion = document.getElementById('cli-direccion').value;

    if (!nombre || !email) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.clientes.push({
        id: Date.now(),
        nombre,
        email,
        telefono,
        direccion
    });

    saveData();
    closeModal();
    navigateTo('clientes');
}

function deleteCliente(index) {
    openDeleteModal(() => {
        store.clientes.splice(index, 1);
        saveData();
        navigateTo('clientes');
    });
}

function resetStore() {
    store = {
        empresa: {
            nombre: 'Mi Empresa',
            rubro: 'Comercio',
            tipo: 'Pequeña',
            direccion: '',
            telefono: '',
            email: '',
            rfc: '',
            logo: ''
        },
        ventas: [],
        inventario: [],
        materiaPrima: [],
        catalogo: [],
        proveedores: [],
        clientes: []
    };
}

onAuthStateChanged(auth, async (user) => {
    const appLayout = document.getElementById('app-layout');
    const authContainer = document.getElementById('auth-container');
    const loadingOverlay = document.getElementById('loading-overlay');

    if (user) {
        currentUser = user;
        console.log("Usuario autenticado:", user.email);
        
        // Cargar datos del usuario
        await loadData();
        
        // UI
        authContainer.classList.add('hidden');
        loadingOverlay.classList.add('hidden');
        appLayout.classList.remove('hidden');
        
        updateCompanyDisplay();
        navigateTo('dashboard');
    } else {
        currentUser = null;
        console.log("Sin usuario autenticado");
        resetStore();
        
        appLayout.classList.add('hidden');
        loadingOverlay.classList.add('hidden');
        authContainer.classList.remove('hidden');
    }
});

// Listener de Formularios de Login/Registro
function setupAuthListeners() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    const showRegisterLink = document.getElementById('show-register');
    const showLoginLink = document.getElementById('show-login');
    const logoutBtn = document.getElementById('btn-logout');

    if (showRegisterLink) {
        showRegisterLink.addEventListener('click', (e) => {
            e.preventDefault();
            loginForm.classList.add('hidden');
            registerForm.classList.remove('hidden');
        });
    }

    if (showLoginLink) {
        showLoginLink.addEventListener('click', (e) => {
            e.preventDefault();
            registerForm.classList.add('hidden');
            loginForm.classList.remove('hidden');
        });
    }

    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;

            document.getElementById('loading-overlay').classList.remove('hidden');
            document.getElementById('auth-container').classList.add('hidden');

            try {
                await signInWithEmailAndPassword(auth, email, password);
            } catch (error) {
                console.error("Error al iniciar sesión:", error);
                alert("Error al iniciar sesión: " + translateAuthError(error.code));
                document.getElementById('loading-overlay').classList.add('hidden');
                document.getElementById('auth-container').classList.remove('hidden');
            }
        });
    }

    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const name = document.getElementById('register-name').value;
            const email = document.getElementById('register-email').value;
            const password = document.getElementById('register-password').value;

            document.getElementById('loading-overlay').classList.remove('hidden');
            document.getElementById('auth-container').classList.add('hidden');

            try {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                await updateProfile(userCredential.user, { displayName: name });
            } catch (error) {
                console.error("Error al registrarse:", error);
                alert("Error al registrarse: " + translateAuthError(error.code));
                document.getElementById('loading-overlay').classList.add('hidden');
                document.getElementById('auth-container').classList.remove('hidden');
            }
        });
    }

    if (logoutBtn) {
        // Doble vinculación por seguridad (onclick handler y event listener)
        logoutBtn.onclick = logout;
        logoutBtn.addEventListener('click', logout);
    }
}

function logout(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    console.log("[Logout Debug] Abriendo modal personalizado de confirmación.");
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeLogoutModal() {
    console.log("[Logout Debug] Cerrando modal de confirmación.");
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

async function confirmLogout() {
    console.log("[Logout Debug] Cierre de sesión confirmado por el usuario.");
    closeLogoutModal();
    
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    
    try {
        if (!auth) {
            throw new Error("La instancia 'auth' de Firebase no está definida.");
        }
        if (typeof signOut !== 'function') {
            throw new Error("La función 'signOut' de Firebase no es una función válida.");
        }
        
        console.log("[Logout Debug] Llamando a signOut(auth)...");
        await signOut(auth);
        console.log("[Logout Debug] signOut(auth) ejecutado con éxito.");
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
        console.error("[Logout Debug] Excepción capturada durante signOut:", error);
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
    }
}

window.logout = logout;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;

// Ejecutar vinculación de listeners de inmediato
setupAuthListeners();

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

// ============================================
// EXPORTACIÓN A WINDOW PARA CALLBACKS HTML
// ============================================
window.navigateTo = navigateTo;
window.toggleTheme = toggleTheme;
window.closeModal = closeModal;
window.saveEmpresa = saveEmpresa;
window.openVentaModal = openVentaModal;
window.addVentaItem = addVentaItem;
window.removeVentaItem = removeVentaItem;
window.saveVenta = saveVenta;
window.deleteVenta = deleteVenta;
window.openInventarioModal = openInventarioModal;
window.saveInventario = saveInventario;
window.deleteInventario = deleteInventario;
window.openMateriaPrimaModal = openMateriaPrimaModal;
window.saveMateriaPrima = saveMateriaPrima;
window.deleteMateriaPrima = deleteMateriaPrima;
window.openCatalogoModal = openCatalogoModal;
window.saveCatalogo = saveCatalogo;
window.deleteCatalogo = deleteCatalogo;
window.openProveedorModal = openProveedorModal;
window.saveProveedor = saveProveedor;
window.deleteProveedor = deleteProveedor;
window.openClienteModal = openClienteModal;
window.saveCliente = saveCliente;
window.deleteCliente = deleteCliente;

// NUEVAS FUNCIONES DE EDICIÓN
function openEditClienteModal(index) {
    const c = store.clientes[index];
    openModal('Editar Cliente', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre Completo</label>
                <input type="text" id="cli-nombre" value="${c.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" id="cli-email" value="${c.email}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Teléfono</label>
                <input type="text" id="cli-telefono" value="${c.telefono || ''}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Dirección</label>
                <textarea id="cli-direccion" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">${c.direccion || ''}</textarea>
            </div>
            <button onclick="saveEditCliente(${index})" class="w-full btn-primary">Guardar Cambios</button>
        </div>
    `);
}

function saveEditCliente(index) {
    const nombre = document.getElementById('cli-nombre').value;
    const email = document.getElementById('cli-email').value;
    const telefono = document.getElementById('cli-telefono').value;
    const direccion = document.getElementById('cli-direccion').value;

    if (!nombre || !email) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.clientes[index] = {
        ...store.clientes[index],
        nombre,
        email,
        telefono,
        direccion
    };

    saveData();
    closeModal();
    navigateTo('clientes');
}

function openEditInventarioModal(index) {
    const p = store.inventario[index];
    openModal('Editar Producto', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Producto</label>
                <input type="text" id="inv-nombre" value="${p.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <input type="text" id="inv-categoria" value="${p.categoria}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Stock</label>
                    <input type="number" id="inv-stock" value="${p.stock}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Precio</label>
                    <input type="number" id="inv-precio" value="${p.precio}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
            </div>
            <button onclick="saveEditInventario(${index})" class="w-full btn-primary">Guardar Cambios</button>
        </div>
    `);
}

function saveEditInventario(index) {
    const nombre = document.getElementById('inv-nombre').value;
    const categoria = document.getElementById('inv-categoria').value;
    const stock = parseInt(document.getElementById('inv-stock').value);
    const precio = parseFloat(document.getElementById('inv-precio').value);

    if (!nombre || !categoria || isNaN(stock) || isNaN(precio)) {
        alert('Completa todos los campos');
        return;
    }

    store.inventario[index] = {
        ...store.inventario[index],
        nombre,
        categoria,
        stock,
        precio
    };

    saveData();
    closeModal();
    navigateTo('inventario');
}

function openEditMateriaPrimaModal(index) {
    const m = store.materiaPrima[index];
    openModal('Editar Materia Prima', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Material</label>
                <input type="text" id="mp-nombre" value="${m.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Unidad de Medida</label>
                <input type="text" id="mp-unidad" value="${m.unidad}" placeholder="kg, litros, piezas, etc." class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Cantidad</label>
                    <input type="number" id="mp-cantidad" value="${m.cantidad}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Costo Unitario</label>
                    <input type="number" id="mp-costo" value="${m.costo}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
            </div>
            <button onclick="saveEditMateriaPrima(${index})" class="w-full btn-primary">Guardar Cambios</button>
        </div>
    `);
}

function saveEditMateriaPrima(index) {
    const nombre = document.getElementById('mp-nombre').value;
    const unidad = document.getElementById('mp-unidad').value;
    const cantidad = parseFloat(document.getElementById('mp-cantidad').value);
    const costo = parseFloat(document.getElementById('mp-costo').value);

    if (!nombre || !unidad || isNaN(cantidad) || isNaN(costo)) {
        alert('Completa todos los campos');
        return;
    }

    store.materiaPrima[index] = {
        ...store.materiaPrima[index],
        nombre,
        unidad,
        cantidad,
        costo
    };

    saveData();
    closeModal();
    navigateTo('materia-prima');
}

function openEditCatalogoModal(index) {
    const p = store.catalogo[index];
    openModal('Editar Producto en Catálogo', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Producto</label>
                <input type="text" id="cat-nombre" value="${p.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <input type="text" id="cat-categoria" value="${p.categoria}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Descripción</label>
                <textarea id="cat-descripcion" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">${p.descripcion}</textarea>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div>
                    <label class="block text-sm font-medium mb-2">Precio</label>
                    <input type="number" id="cat-precio" value="${p.precio}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg" min="0">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Disponible</label>
                    <select id="cat-disponible" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
                        <option value="true" ${p.disponible ? 'selected' : ''}>Sí</option>
                        <option value="false" ${!p.disponible ? 'selected' : ''}>No</option>
                    </select>
                </div>
            </div>
            <button onclick="saveEditCatalogo(${index})" class="w-full btn-primary">Guardar Cambios</button>
        </div>
    `);
}

function saveEditCatalogo(index) {
    const nombre = document.getElementById('cat-nombre').value;
    const categoria = document.getElementById('cat-categoria').value;
    const description = document.getElementById('cat-descripcion').value;
    const precio = parseFloat(document.getElementById('cat-precio').value);
    const disponible = document.getElementById('cat-disponible').value === 'true';

    if (!nombre || !categoria || isNaN(precio)) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.catalogo[index] = {
        ...store.catalogo[index],
        nombre,
        categoria,
        descripcion: description,
        precio,
        disponible
    };

    saveData();
    closeModal();
    navigateTo('catalogo');
}

function openEditProveedorModal(index) {
    const p = store.proveedores[index];
    openModal('Editar Proveedor', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre de la Empresa</label>
                <input type="text" id="prov-empresa" value="${p.empresa}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Persona de Contacto</label>
                <input type="text" id="prov-contacto" value="${p.contacto}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Teléfono</label>
                <input type="text" id="prov-telefono" value="${p.telefono || ''}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Email</label>
                <input type="email" id="prov-email" value="${p.email || ''}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Productos/Servicios</label>
                <textarea id="prov-productos" rows="3" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">${p.productos || ''}</textarea>
            </div>
            <button onclick="saveEditProveedor(${index})" class="w-full btn-primary">Guardar Cambios</button>
        </div>
    `);
}

function saveEditProveedor(index) {
    const empresa = document.getElementById('prov-empresa').value;
    const contacto = document.getElementById('prov-contacto').value;
    const telefono = document.getElementById('prov-telefono').value;
    const email = document.getElementById('prov-email').value;
    const productos = document.getElementById('prov-productos').value;

    if (!empresa || !contacto) {
        alert('Completa los campos obligatorios');
        return;
    }

    store.proveedores[index] = {
        ...store.proveedores[index],
        empresa,
        contacto,
        telefono,
        email,
        productos
    };

    saveData();
    closeModal();
    navigateTo('proveedores');
}

// Exportar nuevas funciones globales
window.openEditClienteModal = openEditClienteModal;
window.saveEditCliente = saveEditCliente;
window.openEditInventarioModal = openEditInventarioModal;
window.saveEditInventario = saveEditInventario;
window.openEditMateriaPrimaModal = openEditMateriaPrimaModal;
window.saveEditMateriaPrima = saveEditMateriaPrima;
window.openEditCatalogoModal = openEditCatalogoModal;
window.saveEditCatalogo = saveEditCatalogo;
window.openEditProveedorModal = openEditProveedorModal;
window.saveEditProveedor = saveEditProveedor;

// CONTROLADOR DE MODAL DE ELIMINACIÓN PERSONALIZADO
let pendingDeleteAction = null;

function openDeleteModal(confirmCallback) {
    pendingDeleteAction = confirmCallback;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

function closeDeleteModal() {
    pendingDeleteAction = null;
    const modal = document.getElementById('delete-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

function confirmDeleteAction() {
    if (pendingDeleteAction) {
        try {
            pendingDeleteAction();
        } catch (error) {
            console.error("Error al ejecutar eliminación:", error);
        }
    }
    closeDeleteModal();
}

window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteAction = confirmDeleteAction;