# Documentación Técnica: Sistema de Modales y Seguridad en VentasPro (Laboratorio)

Este documento detalla la arquitectura, el diseño y las soluciones de implementación aplicadas a las ventanas emergentes (modales) de confirmación, alertas de eliminación y el ciclo de vida de autenticación en la aplicación de Control de Ventas. Sirve como referencia para futuros desarrollos y mantenimiento del sistema.

---

## 1. El Problema con los Diálogos Nativos (`confirm` y `alert`)
En entornos embebidos, WebViews, o navegadores específicos, el uso de funciones nativas como `window.confirm()` and `window.alert()` presenta varios problemas graves:
- **Bloqueo del Hilo Principal**: Detienen la ejecución de JavaScript de forma síncrona.
- **Pérdida de Foco y Recargas**: Provocan que algunos previsualizadores web del IDE o servidores de desarrollo recarguen la página automáticamente al cerrar la alerta.
- **Pérdida de Estado**: El usuario permanece logueado o las acciones se interrumpen abruptamente debido al reinicio involuntario.

**Solución aplicada**: Creación de modales personalizados 100% integrados en el árbol del DOM (HTML) y controlados mediante CSS y JavaScript.

---

## 2. Modal de Cierre de Sesión

### Estructura HTML (`appventas.html`)
Ubicado al final del `body`, usa clases de Tailwind CSS para su diseño oscuro premium y `glass` (blur) para el fondo:
```html
<div id="logout-confirm-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 glass">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden text-center fade-in">
        <!-- Resplandor de acento rojo -->
        <div class="absolute -top-16 -left-16 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
        
        <!-- Icono de Advertencia SVG -->
        <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
        </div>
        
        <h3 class="text-xl font-bold text-zinc-100 mb-2">Cerrar Sesión</h3>
        <p class="text-zinc-400 text-sm mb-6">¿Estás seguro de que deseas salir del Sistema de Control de Ventas?</p>
        
        <div class="flex gap-3 justify-center">
            <button onclick="closeLogoutModal()" class="...">Cancelar</button>
            <button onclick="confirmLogout()" class="bg-red-650 ...">Aceptar</button>
        </div>
    </div>
</div>
```

### Comportamiento JS (`script_appventas.js`)
Dado que el script se carga como **ES Module** (`type="module"`), las funciones locales no son globales de forma nativa. Por lo tanto, se exportan explícitamente al objeto `window`:
```javascript
// 1. Abrir Modal
function logout(e) {
    if (e && typeof e.preventDefault === 'function') e.preventDefault();
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.remove('hidden');
        modal.classList.add('flex');
    }
}

// 2. Cerrar Modal
function closeLogoutModal() {
    const modal = document.getElementById('logout-confirm-modal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
}

// 3. Confirmar Cierre (Firebase signOut)
async function confirmLogout() {
    closeLogoutModal();
    document.getElementById('loading-overlay').classList.remove('hidden');
    document.getElementById('app-layout').classList.add('hidden');
    try {
        await signOut(auth);
    } catch (error) {
        alert("Error al cerrar sesión: " + error.message);
        document.getElementById('loading-overlay').classList.add('hidden');
        document.getElementById('app-layout').classList.remove('hidden');
    }
}

// Exportación
window.logout = logout;
window.closeLogoutModal = closeLogoutModal;
window.confirmLogout = confirmLogout;
```

---

## 3. Modal de Eliminación Reutilizable

Para evitar duplicar código HTML para borrar clientes, productos, proveedores, materias primas, etc., se implementó un **único modal reutilizable** que recibe un callback de confirmación dinámico.

### Estructura HTML (`appventas.html`)
```html
<div id="delete-confirm-modal" class="fixed inset-0 z-50 hidden items-center justify-center bg-black/60 glass">
    <div class="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl relative overflow-hidden text-center fade-in">
        <div class="absolute -top-16 -left-16 w-32 h-32 bg-red-500/10 rounded-full blur-2xl"></div>
        <div class="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-4 border border-red-500/20">
            <svg class="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">...</svg>
        </div>
        <h3 class="text-xl font-bold text-zinc-100 mb-2">¿Eliminar registro?</h3>
        <p class="text-zinc-400 text-sm mb-6">Esta acción es permanente. El elemento se eliminará del sistema y no se podrá recuperar de ninguna manera.</p>
        <div class="flex gap-3 justify-center">
            <button onclick="closeDeleteModal()" class="...">Cancelar</button>
            <button onclick="confirmDeleteAction()" class="bg-red-650 ...">Eliminar</button>
        </div>
    </div>
</div>
```

### Controlador Dinámico JS (`script_appventas.js`)
```javascript
let pendingDeleteAction = null; // Almacena el callback de borrado temporalmente

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
            pendingDeleteAction(); // Ejecuta la función de borrado específica
        } catch (error) {
            console.error("Error al ejecutar eliminación:", error);
        }
    }
    closeDeleteModal();
}

window.openDeleteModal = openDeleteModal;
window.closeDeleteModal = closeDeleteModal;
window.confirmDeleteAction = confirmDeleteAction;
```

### Ejemplo de Uso al borrar un Cliente
En lugar de `confirm()`, ahora pasamos una función anónima al modal de borrado:
```javascript
function deleteCliente(index) {
    openDeleteModal(() => {
        store.clientes.splice(index, 1);
        saveData();
        navigateTo('clientes');
    });
}
```

---

## 4. Redundancia de Vinculación de Eventos
Dado que los módulos de ES6 corren en diferido (`deferred`), las directivas `onclick="..."` del HTML pueden fallar si el usuario da clic antes de que el script se registre.
**Medida de seguridad aplicada**: El script vincula los eventos por partida doble al iniciarse:
```javascript
if (logoutBtn) {
    logoutBtn.onclick = logout; // Sobrescribe onclick
    logoutBtn.addEventListener('click', logout); // Registra listener alternativo
}
```

---

## 5. Aislamiento y Limpieza de Memoria
Para garantizar que al alternar cuentas (o al desconectarse) no quede información residual del usuario previo cargada en pantalla:
1. `onAuthStateChanged` captura el cierre de sesión (`user = null`).
2. Dispara la función `resetStore()` que reestablece la variable central `store` a su estado base vacío.
3. Se actualizan las vistas del dashboard para que el navegador quede completamente limpio, evitando la fuga de información entre perfiles.
