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
        case 'catalogo': renderCatalogo(); break;
        case 'proveedores': renderProveedores(); break;
        case 'clientes': renderClientes(); break;
    }

    // Cerrar sidebar y overlay en móvil al navegar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) sidebar.classList.remove('active');
    if (overlay) overlay.classList.add('hidden');
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
    const nameDisplay = document.getElementById('company-name-display');
    const rubroDisplay = document.getElementById('company-rubro-display');
    if (nameDisplay) {
        nameDisplay.textContent = (store.empresa && store.empresa.nombre) ? store.empresa.nombre : 'Mi Empresa';
    }
    if (rubroDisplay) {
        const rubro = (store.empresa && store.empresa.rubro) ? store.empresa.rubro : 'Comercio';
        const tipo = (store.empresa && store.empresa.tipo) ? store.empresa.tipo : 'Pequeña';
        rubroDisplay.textContent = rubro + ' - ' + tipo;
    }
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
let isEmpresaEditing = false;

function renderEmpresa() {
    const disabledAttr = !isEmpresaEditing ? 'disabled' : '';
    const selectDisabledClass = !isEmpresaEditing ? 'opacity-70 cursor-not-allowed' : 'cursor-pointer';
    const inputDisabledClass = !isEmpresaEditing ? 'opacity-70 cursor-not-allowed' : '';

    const preestablishedRubros = ['Comercio', 'Servicios', 'Manufactura', 'Tecnología', 'Alimentos', 'Salud', 'Educación'];
    const isCustomRubro = store.empresa.rubro && !preestablishedRubros.includes(store.empresa.rubro);
    const rubroVal = isCustomRubro ? 'Personalizado' : (store.empresa.rubro || 'Servicios');
    const tipoVal = store.empresa.tipo || 'Pequeña';

    document.getElementById('content-area').innerHTML = `
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl p-6">
            <h3 class="text-lg font-semibold mb-6 text-cyan-400">Información de la Empresa</h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                    <label class="block text-sm font-medium mb-2">Nombre de la Empresa</label>
                    <input type="text" id="emp-nombre" value="${store.empresa.nombre}" ${disabledAttr} class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors ${inputDisabledClass}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Rubro</label>
                    <div class="relative custom-dropdown" id="emp-rubro" data-value="${rubroVal}">
                        <button type="button" onclick="toggleCustomDropdown('emp-rubro')" ${disabledAttr} class="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 ${selectDisabledClass}">
                            <span class="selected-value">${rubroVal}</span>
                            <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                            ${['Comercio', 'Servicios', 'Manufactura', 'Tecnología', 'Alimentos', 'Salud', 'Educación', 'Personalizado'].map(opt => `
                                <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('emp-rubro', '${opt}')">${opt}</div>
                            `).join('')}
                        </div>
                    </div>
                    <div id="custom-rubro-container" class="mt-3 ${rubroVal === 'Personalizado' ? '' : 'hidden'}">
                        <label class="block text-xs font-medium mb-1 text-zinc-400">Especificar Rubro Personalizado</label>
                        <input type="text" id="emp-rubro-personalizado" value="${isCustomRubro ? store.empresa.rubro : ''}" ${disabledAttr} class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors ${inputDisabledClass}" placeholder="Ej. Imprenta y Diseño">
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Tipo de Empresa</label>
                    <div class="relative custom-dropdown" id="emp-tipo" data-value="${tipoVal}">
                        <button type="button" onclick="toggleCustomDropdown('emp-tipo')" ${disabledAttr} class="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 ${selectDisabledClass}">
                            <span class="selected-value">${tipoVal}</span>
                            <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                            ${['Micro', 'Pequeña', 'Mediana', 'Grande'].map(opt => `
                                <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('emp-tipo', '${opt}')">${opt}</div>
                            `).join('')}
                        </div>
                    </div>
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Dirección</label>
                    <input type="text" id="emp-direccion" value="${store.empresa.direccion}" ${disabledAttr} class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors ${inputDisabledClass}">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Teléfono</label>
                    <input type="text" id="emp-telefono" value="${store.empresa.telefono}" ${disabledAttr} class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors ${inputDisabledClass}">
                </div>
                <div class="md:col-span-2">
                    <label class="block text-sm font-medium mb-2">Email</label>
                    <input type="email" id="emp-email" value="${store.empresa.email}" ${disabledAttr} class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors ${inputDisabledClass}">
                </div>
            </div>
            <div class="mt-6 flex gap-3">
                ${!isEmpresaEditing 
                    ? `<button onclick="enableEmpresaEditing()" class="btn-primary">Editar Info</button>` 
                    : `<button onclick="saveEmpresa()" class="btn-primary">Guardar Cambios</button>
                       <button onclick="cancelEmpresaEditing()" class="btn-secondary">Cancelar</button>`
                }
            </div>
        </div>
    `;
}

function enableEmpresaEditing() {
    isEmpresaEditing = true;
    renderEmpresa();
}

function cancelEmpresaEditing() {
    isEmpresaEditing = false;
    renderEmpresa();
}

function saveEmpresa() {
    let finalRubro = document.getElementById('emp-rubro').dataset.value || 'Servicios';
    if (finalRubro === 'Personalizado') {
        const customInput = document.getElementById('emp-rubro-personalizado');
        finalRubro = customInput ? customInput.value.trim() : 'Personalizado';
        if (!finalRubro) finalRubro = 'Personalizado';
    }

    store.empresa = {
        nombre: document.getElementById('emp-nombre').value,
        rubro: finalRubro,
        tipo: document.getElementById('emp-tipo').dataset.value || 'Pequeña',
        rfc: store.empresa.rfc || '',
        direccion: document.getElementById('emp-direccion').value,
        telefono: document.getElementById('emp-telefono').value,
        email: document.getElementById('emp-email').value
    };
    saveData();
    updateCompanyDisplay();
    isEmpresaEditing = false;
    renderEmpresa();
}

// CONTROLADORES DE DROPDOWNS PERSONALIZADOS
function toggleCustomDropdown(dropdownId) {
    if ((dropdownId === 'emp-rubro' || dropdownId === 'emp-tipo') && !isEmpresaEditing) return;
    
    // Cerrar otros dropdowns abiertos
    document.querySelectorAll('.custom-dropdown-options').forEach(options => {
        if (options.parentNode.id !== dropdownId) {
            options.classList.add('hidden');
            options.parentNode.querySelector('.dropdown-arrow')?.classList.remove('rotate-180');
        }
    });

    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    const options = dropdown.querySelector('.custom-dropdown-options');
    const arrow = dropdown.querySelector('.dropdown-arrow');
    
    if (options) options.classList.toggle('hidden');
    if (arrow) arrow.classList.toggle('rotate-180');
}

function selectCustomDropdownOption(dropdownId, value, dataValue) {
    const dropdown = document.getElementById(dropdownId);
    if (!dropdown) return;
    
    dropdown.querySelector('.selected-value').textContent = value;
    dropdown.dataset.value = (dataValue !== undefined && dataValue !== null) ? dataValue : value;
    
    dropdown.querySelector('.custom-dropdown-options').classList.add('hidden');
    const arrow = dropdown.querySelector('.dropdown-arrow');
    if (arrow) arrow.classList.remove('rotate-180');

    // Manejar opción de Rubro Personalizado
    if (dropdownId === 'emp-rubro') {
        const customContainer = document.getElementById('custom-rubro-container');
        if (customContainer) {
            if (value === 'Personalizado') {
                customContainer.classList.remove('hidden');
            } else {
                customContainer.classList.add('hidden');
            }
        }
    }

    // Manejar categoría de Inventario (Producto vs Servicio)
    if (dropdownId === 'inv-categoria') {
        handleInventarioCategoryChange((dataValue !== undefined && dataValue !== null) ? dataValue : value);
    }
}

// Cerrar dropdowns si se hace clic fuera de ellos
document.addEventListener('click', (e) => {
    if (!e.target.closest('.custom-dropdown') && !e.target.closest('#inv-material-proveedor')) {
        document.querySelectorAll('.custom-dropdown-options').forEach(options => {
            options.classList.add('hidden');
        });
        document.querySelectorAll('.dropdown-arrow').forEach(arrow => {
            arrow.classList.remove('rotate-180');
        });
        const provOptions = document.getElementById('inv-material-proveedor-options');
        if (provOptions) provOptions.classList.add('hidden');
    }
});

window.enableEmpresaEditing = enableEmpresaEditing;
window.cancelEmpresaEditing = cancelEmpresaEditing;
window.saveEmpresa = saveEmpresa;
window.toggleCustomDropdown = toggleCustomDropdown;
window.selectCustomDropdownOption = selectCustomDropdownOption;

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
            <div class="overflow-x-auto">
                <table class="w-full">
                    <thead class="bg-zinc-800">
                        <tr>
                            <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Fecha</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Cliente / Notas</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Productos vendidos</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Total</th>
                            <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                        </tr>
                    </thead>
                    <tbody class="divide-y divide-zinc-800">
                        ${store.ventas.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay ventas registradas</td></tr>' :
                        store.ventas.map((v, i) => `
                            <tr class="hover:bg-zinc-800/50">
                                <td class="px-6 py-4 text-sm text-zinc-300">${v.fecha}</td>
                                <td class="px-6 py-4">
                                    <div class="font-medium text-sm text-zinc-100">${v.cliente}</div>
                                    ${v.detalle ? `<div class="text-xs text-zinc-500 max-w-[200px] truncate" title="${v.detalle}">${v.detalle}</div>` : ''}
                                </td>
                                <td class="px-6 py-4 text-sm text-zinc-400">
                                    <div class="max-w-[250px] truncate" title="${v.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ')}">
                                        ${v.items.map(item => `${item.cantidad}x ${item.nombre}`).join(', ')}
                                    </div>
                                </td>
                                <td class="px-6 py-4">
                                    <div class="text-cyan-400 font-semibold">$${v.total.toLocaleString()}</div>
                                    ${v.envio ? `<div class="text-[10px] text-zinc-500">Envío: +$${v.envio}</div>` : ''}
                                </td>
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
        </div>
    `;
}

function openVentaModal() {
    openModal('Nueva Venta', `
        <div class="space-y-4">
            <!-- Selector de Fecha -->
            <div>
                <label class="block text-sm font-medium mb-1.5">Fecha</label>
                <input type="date" id="venta-fecha" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg text-zinc-100 focus:border-cyan-500">
            </div>

            <!-- Switch de Venta Rápida -->
            <div class="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                <div class="flex flex-col">
                    <span class="text-sm font-medium">Venta Rápida</span>
                    <span class="text-xs text-zinc-500">Registrar monto directo sin inventario</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="venta-switch-rapida" onchange="toggleVentaRapidaMode()" class="sr-only peer">
                    <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
            </div>

            <!-- Campos Venta Normal -->
            <div id="venta-normal-cliente-container">
                <label class="block text-sm font-medium mb-2">Cliente</label>
                <div class="relative custom-dropdown" id="venta-cliente" data-value="">
                    <button type="button" onclick="toggleCustomDropdown('venta-cliente')" class="w-full flex items-center justify-between px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                        <span class="selected-value">Seleccionar cliente</span>
                        <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('venta-cliente', 'Seleccionar cliente', '')">Seleccionar cliente</div>
                        ${store.clientes.map(c => `
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('venta-cliente', '${c.nombre}', '${c.nombre}')">${c.nombre}</div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div id="venta-normal-producto-container">
                <label class="block text-sm font-medium mb-2">Agregar Producto</label>
                <div class="flex gap-2">
                    <div class="flex-1 relative custom-dropdown" id="venta-producto" data-value="">
                        <button type="button" onclick="toggleCustomDropdown('venta-producto')" class="w-full flex items-center justify-between px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                            <span class="selected-value">Seleccionar producto</span>
                            <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('venta-producto', 'Seleccionar producto', '')">Seleccionar producto</div>
                            ${store.inventario.map(p => `
                                <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('venta-producto', '${p.nombre} - $${p.precio}', '${p.id}')">${p.nombre} - $${p.precio}</div>
                            `).join('')}
                        </div>
                    </div>
                    <input type="number" id="venta-cantidad" placeholder="Cant." class="w-16 px-2 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100 text-center" min="1" value="1">
                    <button onclick="addVentaItem()" class="w-10 h-10 rounded-full bg-cyan-600 hover:bg-cyan-500 flex items-center justify-center text-white font-bold transition-all focus:outline-none flex-shrink-0" title="Agregar Producto">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                    </button>
                </div>
            </div>

            <div id="venta-normal-items-container" class="space-y-2">
                <label class="block text-sm font-medium">Resumen de Productos</label>
                <div id="venta-items" class="space-y-2">
                    <p class="text-zinc-500 text-sm">Agrega productos a la venta</p>
                </div>
            </div>

            <!-- Campo Venta Rápida -->
            <div id="venta-monto-rapida-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Monto de la Venta ($)</label>
                <input type="number" id="venta-monto-rapida" oninput="updateVentaTotalDisplay()" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100 font-bold text-lg" min="0.01" step="0.01" placeholder="0.00">
            </div>

            <!-- Switch de Envío -->
            <div class="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                <div class="flex flex-col">
                    <span class="text-sm font-medium">Servicio a Domicilio (Envío)</span>
                    <span class="text-xs text-zinc-500">Añade cargo de entrega al total</span>
                </div>
                <label class="relative inline-flex items-center cursor-pointer">
                    <input type="checkbox" id="venta-switch-envio" onchange="toggleVentaEnvio()" class="sr-only peer">
                    <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
            </div>

            <!-- Campo Monto de Envío -->
            <div id="venta-envio-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Costo de Envío ($)</label>
                <input type="number" id="venta-envio-monto" oninput="updateVentaTotalDisplay()" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100" min="0" step="0.01" value="0">
            </div>

            <!-- Detalles de la Venta -->
            <div>
                <label class="block text-sm font-medium mb-2">Detalles / Notas de la Venta</label>
                <textarea id="venta-detalle" rows="2" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100 text-sm" placeholder="Ej. Pago por transferencia, entrega por la tarde..."></textarea>
            </div>

            <!-- Footer con Total -->
            <div class="border-t border-zinc-700 pt-4">
                <div class="flex justify-between items-center">
                    <span class="text-lg font-semibold text-zinc-200">Total a Pagar:</span>
                    <span id="venta-total" class="text-2xl font-bold text-cyan-400">$0</span>
                </div>
            </div>
            <button onclick="saveVenta()" class="w-full btn-primary mt-2">Guardar Venta</button>
        </div>
    `);
    
    // Configurar fecha del día actual por defecto
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('venta-fecha').value = today;

    window.ventaItems = [];
}

function toggleVentaRapidaMode() {
    const isRapida = document.getElementById('venta-switch-rapida').checked;
    const normalCliente = document.getElementById('venta-normal-cliente-container');
    const normalProducto = document.getElementById('venta-normal-producto-container');
    const normalItems = document.getElementById('venta-normal-items-container');
    const rapidaMonto = document.getElementById('venta-monto-rapida-container');
    
    if (isRapida) {
        normalCliente.classList.add('hidden');
        normalProducto.classList.add('hidden');
        normalItems.classList.add('hidden');
        rapidaMonto.classList.remove('hidden');
    } else {
        normalCliente.classList.remove('hidden');
        normalProducto.classList.remove('hidden');
        normalItems.classList.remove('hidden');
        rapidaMonto.classList.add('hidden');
    }
    updateVentaTotalDisplay();
}

function toggleVentaEnvio() {
    const hasEnvio = document.getElementById('venta-switch-envio').checked;
    const envioMonto = document.getElementById('venta-envio-container');
    if (hasEnvio) {
        envioMonto.classList.remove('hidden');
    } else {
        envioMonto.classList.add('hidden');
        const inputEnvio = document.getElementById('venta-envio-monto');
        if (inputEnvio) inputEnvio.value = 0;
    }
    updateVentaTotalDisplay();
}

function updateVentaTotalDisplay() {
    let subtotal = 0;
    const isRapida = document.getElementById('venta-switch-rapida')?.checked;
    
    if (isRapida) {
        const montoVal = parseFloat(document.getElementById('venta-monto-rapida').value);
        subtotal = isNaN(montoVal) ? 0 : montoVal;
    } else {
        subtotal = window.ventaItems.reduce((sum, item) => sum + item.subtotal, 0);
    }
    
    let shipping = 0;
    const hasEnvio = document.getElementById('venta-switch-envio')?.checked;
    if (hasEnvio) {
        const shippingVal = parseFloat(document.getElementById('venta-envio-monto').value);
        shipping = isNaN(shippingVal) ? 0 : shippingVal;
    }
    
    const total = subtotal + shipping;
    document.getElementById('venta-total').textContent = '$' + total.toLocaleString();
}

function addVentaItem() {
    const productoSelect = document.getElementById('venta-producto');
    const cantidad = parseInt(document.getElementById('venta-cantidad').value);
    const productoId = productoSelect ? productoSelect.dataset.value : '';

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
    updateVentaTotalDisplay();
}

function renderVentaItems() {
    const container = document.getElementById('venta-items');
    if (window.ventaItems.length === 0) {
        container.innerHTML = '<p class="text-zinc-500 text-sm">Agrega productos a la venta</p>';
    } else {
        container.innerHTML = window.ventaItems.map((item, i) => `
            <div class="flex items-center justify-between p-2.5 bg-zinc-800/40 rounded-lg border border-zinc-800/80">
                <div>
                    <p class="font-medium text-sm">${item.nombre}</p>
                    <p class="text-xs text-zinc-500">${item.cantidad} x $${item.precio}</p>
                </div>
                <div class="flex items-center gap-3">
                    <span class="text-cyan-400 font-semibold text-sm">$${item.subtotal}</span>
                    <button onclick="removeVentaItem(${i})" class="text-red-400 hover:text-red-300">
                        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
                    </button>
                </div>
            </div>
        `).join('');
    }
}

function removeVentaItem(index) {
    window.ventaItems.splice(index, 1);
    renderVentaItems();
    updateVentaTotalDisplay();
}

function saveVenta() {
    const isRapida = document.getElementById('venta-switch-rapida').checked;
    const hasEnvio = document.getElementById('venta-switch-envio').checked;
    const fechaVal = document.getElementById('venta-fecha').value || new Date().toISOString().split('T')[0];
    const detalle = document.getElementById('venta-detalle').value;
    
    // Formatear fecha
    const [year, month, day] = fechaVal.split('-');
    const fechaFormateada = `${day}/${month}/${year}`;

    let cliente = '';
    let items = [];
    let subtotal = 0;
    
    if (isRapida) {
        cliente = 'Venta Rápida';
        const montoVal = parseFloat(document.getElementById('venta-monto-rapida').value);
        if (isNaN(montoVal) || montoVal <= 0) {
            alert('Digita un monto válido para la venta rápida');
            return;
        }
        subtotal = montoVal;
        items = [{
            id: 'rapida',
            nombre: 'Venta Directa',
            precio: montoVal,
            cantidad: 1,
            subtotal: montoVal
        }];
    } else {
        const clienteDropdown = document.getElementById('venta-cliente');
        cliente = clienteDropdown ? (clienteDropdown.dataset.value || '') : '';
        if (!cliente || window.ventaItems.length === 0) {
            alert('Selecciona un cliente y agrega al menos un producto');
            return;
        }
        subtotal = window.ventaItems.reduce((sum, item) => sum + item.subtotal, 0);
        items = window.ventaItems;
    }

    let envio = 0;
    if (hasEnvio) {
        const envioVal = parseFloat(document.getElementById('venta-envio-monto').value);
        envio = isNaN(envioVal) ? 0 : envioVal;
    }

    const total = subtotal + envio;

    store.ventas.push({
        id: Date.now(),
        fecha: fechaFormateada,
        cliente: cliente,
        items: items,
        envio: envio,
        detalle: detalle,
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
            <h3 class="text-lg font-semibold text-cyan-400">Control de Productos / Servicios / Materiales</h3>
            <button onclick="openInventarioModal()" class="btn-primary flex items-center gap-2">
                <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v16m8-8H4"/></svg>
                Agregar
            </button>
        </div>
        <div class="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
            <table class="w-full">
                <thead class="bg-zinc-800">
                    <tr>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Nombre</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Categoría</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Stock</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Precio</th>
                        <th class="px-6 py-3 text-left text-xs font-medium text-zinc-400 uppercase">Acciones</th>
                    </tr>
                </thead>
                <tbody class="divide-y divide-zinc-800">
                    ${store.inventario.length === 0 ? '<tr><td colspan="5" class="px-6 py-8 text-center text-zinc-500">No hay registros guardados</td></tr>' :
                    store.inventario.map((p, i) => `
                        <tr class="hover:bg-zinc-800/50">
                            <td class="px-6 py-4">
                                <div class="font-medium text-zinc-100">${p.nombre}</div>
                                ${p.materialTipo ? `<div class="text-xs text-zinc-500">Tipo: ${p.materialTipo}</div>` : ''}
                                ${p.proveedor ? `<div class="text-[10px] text-cyan-500/80">Prov: ${p.proveedor}</div>` : ''}
                            </td>
                            <td class="px-6 py-4">
                                <span class="px-2 py-0.5 text-xs font-semibold rounded ${
                                    p.categoria === 'Servicio' 
                                        ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' 
                                        : (p.categoria === 'Material' 
                                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' 
                                            : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20')
                                }">
                                    ${p.categoria}
                                </span>
                            </td>
                            <td class="px-6 py-4">
                                ${p.categoria === 'Servicio' 
                                    ? '<span class="text-zinc-500 font-medium">N/A (Servicio)</span>' 
                                    : `<span class="${p.stock < 10 ? 'text-red-400' : 'text-cyan-400'} font-semibold">${p.stock}</span>`
                                }
                            </td>
                            <td class="px-6 py-4 text-cyan-400 font-medium">
                                $${p.precio.toLocaleString()}
                                ${p.categoria === 'Material' ? `<span class="text-zinc-500 text-xs">${p.materialPrecioTipo === 'Paquete' ? '/ paq.' : '/ ud.'}</span>` : ''}
                            </td>
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
    openModal('Agregar Producto / Servicio / Material', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre</label>
                <input type="text" id="inv-nombre" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <div class="relative custom-dropdown" id="inv-categoria" data-value="Producto">
                    <button type="button" onclick="toggleCustomDropdown('inv-categoria')" class="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                        <span class="selected-value">Producto</span>
                        <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('inv-categoria', 'Producto')">Producto</div>
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('inv-categoria', 'Servicio')">Servicio</div>
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('inv-categoria', 'Material')">Material</div>
                    </div>
                </div>
            </div>
            
            <!-- Campo Tipo (Material) -->
            <div id="inv-material-tipo-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Tipo de Material</label>
                <input type="text" id="inv-material-tipo" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100" placeholder="Ej. Madera, Metal, Plástico...">
            </div>
            
            <!-- Switch Tipo Precio (Material) -->
            <div id="inv-material-preciotipo-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Tipo de Precio</label>
                <div class="flex items-center justify-between p-3 bg-zinc-800/30 rounded-lg border border-zinc-800">
                    <div class="flex flex-col">
                        <span class="text-sm font-medium id-mprecio-text text-zinc-200">Precio Unitario</span>
                        <span class="text-xs text-zinc-500">¿El precio ingresado es por unidad o paquete?</span>
                    </div>
                    <label class="relative inline-flex items-center cursor-pointer">
                        <input type="checkbox" id="inv-material-switch-preciotipo" onchange="toggleMaterialPrecioTipo()" class="sr-only peer">
                        <div class="w-11 h-6 bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                    </label>
                </div>
            </div>
            
            <!-- Detalle (Material) -->
            <div id="inv-material-detalle-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Detalle / Notas del Material</label>
                <textarea id="inv-material-detalle" rows="2" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100 text-sm" placeholder="Especificaciones, dimensiones, etc."></textarea>
            </div>
            
            <!-- Proveedor (Material) -->
            <div id="inv-material-proveedor-container" class="hidden">
                <label class="block text-sm font-medium mb-2">Proveedor</label>
                <div class="relative" id="inv-material-proveedor">
                    <input type="text" id="inv-material-proveedor-input" onfocus="showMaterialProveedorDropdown()" oninput="filterMaterialProveedorDropdown()" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100 text-sm" placeholder="Selecciona o escribe un proveedor...">
                    <div id="inv-material-proveedor-options" class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden max-h-40 overflow-y-auto scrollbar-thin">
                        ${store.proveedores.map(prov => `
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectMaterialProveedorOption('${prov.empresa}')">${prov.empresa}</div>
                        `).join('')}
                    </div>
                </div>
            </div>

            <div class="grid grid-cols-2 gap-4">
                <div id="inv-stock-container">
                    <label class="block text-sm font-medium mb-2">Stock</label>
                    <input type="number" id="inv-stock" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100" min="0" value="1">
                </div>
                <div>
                    <label class="block text-sm font-medium mb-2">Precio</label>
                    <input type="number" id="inv-precio" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 text-zinc-100" min="0">
                </div>
            </div>
            <button onclick="saveInventario()" class="w-full btn-primary">Guardar</button>
        </div>
    `);
}

function saveInventario() {
    const nombre = document.getElementById('inv-nombre').value.trim();
    const categoria = document.getElementById('inv-categoria').dataset.value || 'Producto';
    
    let stock = parseInt(document.getElementById('inv-stock').value);
    if (categoria === 'Servicio') {
        stock = 0;
    }
    const precio = parseFloat(document.getElementById('inv-precio').value);

    if (!nombre || !categoria || (categoria !== 'Servicio' && isNaN(stock)) || isNaN(precio)) {
        alert('Completa todos los campos');
        return;
    }

    const item = {
        id: Date.now(),
        nombre,
        categoria,
        stock,
        precio
    };

    if (categoria === 'Material') {
        const materialTipo = document.getElementById('inv-material-tipo').value.trim();
        const materialSwitch = document.getElementById('inv-material-switch-preciotipo').checked;
        const materialPrecioTipo = materialSwitch ? 'Paquete' : 'Unitario';
        const materialDetalle = document.getElementById('inv-material-detalle').value.trim();
        const provName = document.getElementById('inv-material-proveedor-input').value.trim();

        item.materialTipo = materialTipo;
        item.materialPrecioTipo = materialPrecioTipo;
        item.materialDetalle = materialDetalle;
        item.proveedor = provName;

        // Auto-add provider if new
        if (provName && !store.proveedores.some(p => p.empresa.toLowerCase() === provName.toLowerCase())) {
            store.proveedores.push({
                empresa: provName,
                contacto: 'Contacto Rápido',
                telefono: '-',
                email: '-',
                productos: nombre
            });
        }
    }

    store.inventario.push(item);
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
                    <div class="relative custom-dropdown" id="cat-disponible" data-value="true">
                        <button type="button" onclick="toggleCustomDropdown('cat-disponible')" class="w-full flex items-center justify-between px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                            <span class="selected-value">Sí</span>
                            <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('cat-disponible', 'Sí', 'true')">Sí</div>
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('cat-disponible', 'No', 'false')">No</div>
                        </div>
                    </div>
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
    const disponibleDropdown = document.getElementById('cat-disponible');
    const disponible = disponibleDropdown ? (disponibleDropdown.dataset.value === 'true') : true;

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
    const isServicio = p.categoria === 'Servicio';
    openModal('Editar Producto / Servicio', `
        <div class="space-y-4">
            <div>
                <label class="block text-sm font-medium mb-2">Nombre del Producto / Servicio</label>
                <input type="text" id="inv-nombre" value="${p.nombre}" class="w-full px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg">
            </div>
            <div>
                <label class="block text-sm font-medium mb-2">Categoría</label>
                <div class="relative custom-dropdown" id="inv-categoria" data-value="${p.categoria}">
                    <button type="button" onclick="toggleCustomDropdown('inv-categoria')" class="w-full flex items-center justify-between px-4 py-2.5 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                        <span class="selected-value">${p.categoria}</span>
                        <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                    </button>
                    <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('inv-categoria', 'Producto')">Producto</div>
                        <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('inv-categoria', 'Servicio')">Servicio</div>
                    </div>
                </div>
            </div>
            <div class="grid grid-cols-2 gap-4">
                <div id="inv-stock-container" class="${isServicio ? 'hidden' : ''}">
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
    const categoria = document.getElementById('inv-categoria').dataset.value || 'Producto';
    
    let stock = parseInt(document.getElementById('inv-stock').value);
    if (categoria === 'Servicio') {
        stock = 0;
    }
    const precio = parseFloat(document.getElementById('inv-precio').value);

    if (!nombre || !categoria || (categoria === 'Producto' && isNaN(stock)) || isNaN(precio)) {
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
                    <div class="relative custom-dropdown" id="cat-disponible" data-value="${p.disponible ? 'true' : 'false'}">
                        <button type="button" onclick="toggleCustomDropdown('cat-disponible')" class="w-full flex items-center justify-between px-4 py-2 bg-zinc-800 border border-zinc-700 rounded-lg focus:border-cyan-500 transition-colors text-zinc-100 cursor-pointer">
                            <span class="selected-value">${p.disponible ? 'Sí' : 'No'}</span>
                            <svg class="w-5 h-5 text-zinc-400 dropdown-arrow transition-transform duration-200" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7"/></svg>
                        </button>
                        <div class="absolute left-0 right-0 mt-1 bg-zinc-900 border border-zinc-800 rounded-lg shadow-xl z-20 hidden custom-dropdown-options max-h-60 overflow-y-auto scrollbar-thin">
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('cat-disponible', 'Sí', 'true')">Sí</div>
                            <div class="px-4 py-2.5 hover:bg-cyan-500/10 hover:text-cyan-400 cursor-pointer text-sm transition-colors text-zinc-200" onclick="selectCustomDropdownOption('cat-disponible', 'No', 'false')">No</div>
                        </div>
                    </div>
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
    const disponibleDropdown = document.getElementById('cat-disponible');
    const disponible = disponibleDropdown ? (disponibleDropdown.dataset.value === 'true') : true;

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
window.openEditCatalogoModal = openEditCatalogoModal;
window.saveEditCatalogo = saveEditCatalogo;
window.openEditProveedorModal = openEditProveedorModal;
window.saveEditProveedor = saveEditProveedor;
window.toggleVentaRapidaMode = toggleVentaRapidaMode;
window.toggleVentaEnvio = toggleVentaEnvio;
window.updateVentaTotalDisplay = updateVentaTotalDisplay;
window.showMaterialProveedorDropdown = showMaterialProveedorDropdown;
window.filterMaterialProveedorDropdown = filterMaterialProveedorDropdown;
window.selectMaterialProveedorOption = selectMaterialProveedorOption;
window.toggleMaterialPrecioTipo = toggleMaterialPrecioTipo;

function handleInventarioCategoryChange(value) {
    const stockContainer = document.getElementById('inv-stock-container');
    const tipoContainer = document.getElementById('inv-material-tipo-container');
    const precioTipoContainer = document.getElementById('inv-material-preciotipo-container');
    const detalleContainer = document.getElementById('inv-material-detalle-container');
    const proveedorContainer = document.getElementById('inv-material-proveedor-container');

    if (value === 'Servicio') {
        if (stockContainer) stockContainer.classList.add('hidden');
        if (tipoContainer) tipoContainer.classList.add('hidden');
        if (precioTipoContainer) precioTipoContainer.classList.add('hidden');
        if (detalleContainer) detalleContainer.classList.add('hidden');
        if (proveedorContainer) proveedorContainer.classList.add('hidden');
        
        const stockInput = document.getElementById('inv-stock');
        if (stockInput) stockInput.value = 0;
    } else if (value === 'Material') {
        if (stockContainer) stockContainer.classList.remove('hidden');
        if (tipoContainer) tipoContainer.classList.remove('hidden');
        if (precioTipoContainer) precioTipoContainer.classList.remove('hidden');
        if (detalleContainer) detalleContainer.classList.remove('hidden');
        if (proveedorContainer) proveedorContainer.classList.remove('hidden');
    } else {
        // Producto
        if (stockContainer) stockContainer.classList.remove('hidden');
        if (tipoContainer) tipoContainer.classList.add('hidden');
        if (precioTipoContainer) precioTipoContainer.classList.add('hidden');
        if (detalleContainer) detalleContainer.classList.add('hidden');
        if (proveedorContainer) proveedorContainer.classList.add('hidden');
    }
}
window.handleInventarioCategoryChange = handleInventarioCategoryChange;

function showMaterialProveedorDropdown() {
    const options = document.getElementById('inv-material-proveedor-options');
    if (options) options.classList.remove('hidden');
}

function filterMaterialProveedorDropdown() {
    const inputVal = document.getElementById('inv-material-proveedor-input').value.toLowerCase();
    const options = document.getElementById('inv-material-proveedor-options');
    if (!options) return;
    options.classList.remove('hidden');
    
    // Filtrar elementos de la lista
    const items = options.querySelectorAll('div');
    items.forEach(item => {
        const text = item.textContent.toLowerCase();
        if (text.includes(inputVal)) {
            item.classList.remove('hidden');
        } else {
            item.classList.add('hidden');
        }
    });
}

function selectMaterialProveedorOption(val) {
    const input = document.getElementById('inv-material-proveedor-input');
    if (input) input.value = val;
    const options = document.getElementById('inv-material-proveedor-options');
    if (options) options.classList.add('hidden');
}

function toggleMaterialPrecioTipo() {
    const switchVal = document.getElementById('inv-material-switch-preciotipo').checked;
    const textLabel = document.querySelector('.id-mprecio-text');
    if (textLabel) {
        textLabel.textContent = switchVal ? 'Precio por Paquete' : 'Precio Unitario';
    }
}

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

// CONTROLADOR DE MENÚ DE NAVEGACIÓN EN MÓVIL
function toggleSidebar() {
    console.log("toggleSidebar llamada");
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebar-overlay');
    if (sidebar) {
        sidebar.classList.toggle('active');
        console.log("Sidebar active:", sidebar.classList.contains('active'));
    } else {
        console.error("No se encontró el elemento sidebar");
    }
    if (overlay) {
        overlay.classList.toggle('hidden');
        console.log("Overlay hidden:", overlay.classList.contains('hidden'));
    } else {
        console.error("No se encontró el elemento sidebar-overlay");
    }
}
window.toggleSidebar = toggleSidebar;