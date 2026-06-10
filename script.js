document.addEventListener('DOMContentLoaded', () => {
    // Configuración de tiempos
    const TRANSITION_DURATION = 200;

    // 1. Efecto de entrada (Fade-in)
    document.body.classList.add('page-loaded');

    // 2. Efecto de salida (Fade-out) al navegar
    const links = document.querySelectorAll('nav a, .hero-buttons a, .btn-card, .btn-secundario, footer a');
    links.forEach(link => {
        link.addEventListener('click', e => {
            const destination = link.getAttribute('href');
            
            // Aplicar solo a enlaces internos que no abran en pestaña nueva
            if (destination && !destination.startsWith('http') && destination !== '#' && !link.target) {
                e.preventDefault();
                
                // Comprobar si es la misma página resolviendo la URL completa
                const targetURL = new URL(destination, window.location.href);
                if (window.location.pathname === targetURL.pathname) return;

                document.body.style.opacity = '0';
                setTimeout(() => {
                    const isLocal = window.location.protocol === 'file:' ||
                                    window.location.hostname === 'localhost' || 
                                    window.location.hostname === '127.0.0.1';

                    let finalDestination = destination;

                    // Si estamos en local y el enlace no tiene extensión, se la agregamos
                    if (isLocal && finalDestination && !finalDestination.includes('.') && 
                        finalDestination !== '/' && !finalDestination.startsWith('#')) {
                        finalDestination += '.html';
                    }

                    // Navegación directa. El navegador resuelve la ruta relativa correctamente.
                    window.location.href = finalDestination;
                }, TRANSITION_DURATION); // Sincronizado con el CSS para máxima fluidez
            }
        });
    });
});

// 3. "Seguridad" y Disuasión
// Deshabilitar clic derecho
document.addEventListener('contextmenu', e => e.preventDefault());

// Bloquear atajos de teclado (F12, Ctrl+Shift+I, Ctrl+U)
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