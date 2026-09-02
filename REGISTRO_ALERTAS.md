# REGISTRO TÉCNICO Y GUÍA DE RECREACIÓN: ALERTAS.HTML (JHONAXM)
> **Archivo analizado:** `jhonaxm/alertas.html`  
> **Propósito:** Overlay de alertas en vivo para OBS Studio con temática Samurai Eléctrico.  
> **Autoría / Contexto:** Subproyecto JhonaX22 (`jhonaxm`), conectado en tiempo real a Streamer.bot (Kick, Twitch, YouTube).

---

## 1. RESUMEN EJECUTIVO Y FILOSOFÍA DE DISEÑO

`alertas.html` es un widget **Single-File Autónomo** (todo el HTML, CSS y JavaScript están contenidos en un solo archivo, sin dependencias locales de CSS o JS). Está optimizado para ser insertado como **Navegador (Browser Source)** en OBS Studio (resolución nativa recomendada: 500x450 px o pantalla completa 1920x1080 con fondo transparente).

### Características Clave:
1. **Autonomía Total**: No requiere archivos MP3/WAV locales ni librerías pesadas (como jQuery o React). El audio se genera en tiempo real mediante la **Web Audio API**.
2. **Efectos Procedurales**: Los rayos eléctricos que bordean la tarjeta no son GIFs ni videos; son trazados generados proceduralmente en **SVG mediante JavaScript** a 90 ms por fotograma.
3. **Gestión de Colas (FIFO)**: Si ocurren múltiples eventos simultáneos (ej: 5 subs seguidos), el widget no se traba ni superpone las alertas; las encola y reproduce una tras otra de forma ordenada.
4. **Multi-Plataforma con Tolerancia a Fallos**: Se conecta por WebSocket a Streamer.bot suscribiéndose a eventos de Kick, Twitch y YouTube, con reconexión automática y prueba de puertos (`4445`, `8080`, `1234`).
5. **Entorno de Pruebas Integrado**: Posee una botonera interactiva oculta que aparece al hacer clic en cualquier parte de la pantalla, permitiendo simular alertas al instante.

---

## 2. ESTRUCTURA Y MAQUETACIÓN DOM (HTML)

El árbol DOM está diseñado en capas concéntricas con profundidad 3D (`perspective: 1000px`):

```
body (fondo transparente, cursor interactivo)
 └── #alert-stage (Contenedor principal con transiciones cubic-bezier de entrada/salida)
      ├── #ambient-glow (Aura esférica difusa con gradiente radial y animación de pulso)
      └── #alert-card.card (Tarjeta física de vidrio oscuro / glassmorphism)
           ├── #alert-badge.badge (Pastilla superior flotante con icono y nombre del evento)
           ├── .electric-container > svg#electric-svg (Lienzo SVG con filtro feGaussianBlur)
           │    └── g#electric-group (Donde el script inyecta los rayos dinámicos)
           ├── .alert-emblem-box > img.alert-emblem-img (Slot genérico para Emblema, Avatar o Logo del Streamer - 55x55px)
           ├── #alert-heading.heading (Ej: "Nuevo Seguidor", "¡Resuscripción!")
           ├── #alert-detail.detail-text (Subtítulo explicativo o conteo de meses)
           ├── #alert-username.user-name-text (Nombre del usuario con tipografía Gamer)
           ├── #alert-user-message.user-message-box (Caja de texto para mensajes de donación/sub)
           └── .card-corner (4 esquinas decorativas estilo corte angular: tl, tr, bl, br)

 #test-controls.hidden (Botonera flotante para pruebas rápidas con indicador de estado WS)
```

---

## 3. SISTEMA DE DISEÑO VISUAL Y ESTILOS (CSS)

### 3.1. Tipografías (Google Fonts)
- **Tipografía Oriental / Distintiva (`Shojumaru`)**: Usada en la insignia (`.badge`) y en el titular (`.heading`). Establece la identidad temática.
- **Tipografía Gamer / Tech (`Orbitron`)**: Usada en el nombre de usuario (`.user-name-text`) para un look moderno de esports.
- **Tipografía Secundaria / Subtítulos (`Rajdhani`)**: Limpia, compacta y legible para detalles, mensajes y botones (`.detail-text`, `.test-btn`).

### 3.2. Variables de Color y Tokens Semánticos Base
Para permitir que cualquier IA o desarrollador adapte el widget a cualquier canal o streamer sin atarse a una marca específica, los estilos base se articulan mediante tokens semánticos genéricos:

```css
:root {
  /* 1. Colores de Acento e Identidad (Por defecto: Gama Carmesí Eléctrico) */
  --color-accent-primary: #ff1a40;      /* Acento primario, resplandor e iluminación principal */
  --color-accent-secondary: #d90429;    /* Tono intermedio para degradados y transiciones */
  --color-accent-deep: #800020;         /* Sombra tonal profunda para dar volumen */

  /* 2. Tonos Atmosféricos y Fondos Oscuros */
  --color-bg-ambient: #4a0033;          /* Halo de difusión ambiental difusa */
  --color-bg-surface-dark: #210026;     /* Profundidad oscura de las tarjetas */
  --color-bg-surface-midnight: #0c0012; /* Fondo base casi negro para máximo contraste */

  /* 3. Textos y Borde Metálico */
  --color-text-main: #ffffff;           /* Blanco puro de alto contraste para titulares y bordes */
  --color-text-sub: #e8ecf8;            /* Blanco hielo para textos secundarios y detalles */
  
  /* Fuentes */
  --font-heading: 'Shojumaru', cursive, sans-serif;
  --font-tech: 'Orbitron', 'Rajdhani', sans-serif;
  --font-body: 'Rajdhani', sans-serif;
}
```

> **Nota de Reutilización:** Cambiando simplemente `--color-accent-primary`, `--color-accent-secondary` y `--color-accent-deep` (por ejemplo, a tonos celestes `#00d2ff`, morados `#9b51e0` o dorados `#ffb703`), toda la alerta base se adapta inmediatamente a la identidad visual de cualquier creador de contenido.

### 3.3. Slot para Logo, Avatar o Emblema (`.alert-emblem-box`)
El diseño cuenta con un espacio reservado agnóstico a marcas para ubicar la imagen del canal:
- **Dimensiones del Contenedor:** `width: 70px; height: 70px;` con `border-radius: 12px;` y fondo oscuro translúcido `rgba(22, 14, 41, 0.9)`.
- **Efecto de Borde Dinámico:** `border: 1.5px solid var(--accent-color);` y `box-shadow: 0 0 15px var(--accent-color);`.
- **Animación de Levitación (`emblemFloat`):** Flota suavemente arriba y abajo (`transform: translateY(-4px) scale(1.04);`) en ciclos alternados de 3.5 segundos.
- **Imagen Interna (`.alert-emblem-img`):** `width: 55px; height: 55px; object-fit: contain;`. Puede recibir:
  1. Un logotipo PNG/WebP transparente del streamer.
  2. La foto de perfil o avatar del canal.
  3. Un icono SVG temático (ej: espada, corona, dragón, casco cyber).
  4. Un placeholder genérico en caso de no tener logotipo definido.

### 3.4. Sistema de Temas Dinámicos por Evento
El color de la tarjeta, el resplandor ambiental y los rayos SVG mutan dinámicamente mediante clases CSS aplicadas a `#alert-card`:

| Tipo de Alerta | Clase CSS | Colores Principales (CSS & Rayos) | Icono | Estética Visual |
|---|---|---|---|---|
| **Seguidor** | `.theme-seguidor` | Carmesí neón (`#ff1a40`) + Blanco | ⚔️ | Clan / Armas / Inicio |
| **Suscriptor** | `.theme-suscriptor` | Oro imperial (`#ffd700`) + Naranja fuego (`#ff8c00`) | ⭐ | Oro Legendario / Élite |
| **Kicks / Donación** | `.theme-kicks` | Verde neón Kick (`#53fc18`) + Verde puro (`#00ff00`) | 💚 | Energía Eléctrica Kick |
| **Host / Raid** | `.theme-host` | Magenta eléctrico (`#e056fd`) + Púrpura cósmico (`#a55eea`) | 🚀 | Invasión Dimensional |

Cada clase inyecta dos variables dinámicas al vuelo:
```css
.theme-[tipo] {
  --glow-color: rgba(...);   /* Afecta al resplandor atmosférico de fondo */
  --accent-color: #...;      /* Afecta a textos destacados, bordes e insignias */
}
```

### 3.5. Efectos Visuales Clave
1. **Glassmorphism Oscuro**: `.card` utiliza `background: rgba(14, 8, 26, 0.88)` y `backdrop-filter: blur(14px)` con bordes sutiles semitransparentes (`1.5px solid rgba(255,255,255,0.12)`).
2. **Esquinas Angulares / Decorativas**: Elementos `.card-corner` posicionados en las 4 esquinas con bordes ortogonales de 2px en blanco brillante para dar acabado sci-fi/esports.
3. **Animación de Entrada con Rebote (Overshoot)**:
   ```css
   #alert-stage {
     transform: scale(0.65) translateY(40px);
     transition: all 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
   }
   #alert-stage.active {
     transform: scale(1) translateY(0);
   }
   ```
4. **Animación de Salida**:
   ```css
   #alert-stage.exiting {
     transform: scale(1.08) translateY(-30px);
     transition: all 0.4s ease-in;
   }
   ```

---

## 4. LÓGICA Y ARQUITECTURA DE JAVASCRIPT

El script está dividido en 7 módulos funcionales bien delimitados:

### Módulo 1: Motor Procedural de Rayos Eléctricos SVG (`initLightningEngine`)
- **Cómo funciona**: Traza un camino alrededor del perímetro rectangular de la tarjeta (4 lados: superior, derecho, inferior, izquierdo con un margen de 18 px).
- **Algoritmo de Trazado (`createLightningPath`)**:
  - Divide cada lado en 16 segmentos.
  - En cada nodo, añade un desplazamiento estocástico o ruido aleatorio:  
    `offsetX = (Math.random() - 0.5) * 16`  
    `offsetY = (Math.random() - 0.5) * 16`
- **Renderizado Multicapa**: Dibuja 3 capas de `<path>` en el grupo SVG con diferentes grosores (`3.2px` y `2px`), alternando los colores del tema actual y aplicando un filtro SVG `feGaussianBlur` (`stdDeviation="4"`).
- **Frecuencia**: Se regenera mediante `setInterval(updateLightning, 90)` (aproximadamente 11 cuadros por segundo de rayos caóticos).

### Módulo 2: Sintetizador de Audio Nativo (`playSynthesizedSound`)
- **Sin archivos de audio externos**: Utiliza `AudioContext` de la API de Audio Web.
- **Estructura del sintetizador**:
  - Genera un `masterGain` con envolvente de caída exponencial (`exponentialRampToValueAtTime`).
  - Para cada tipo de alerta ejecuta un arpegio melódico de 4 frecuencias en onda senoidal (`sine`):
    - **Follow (Do Mayor)**: 523.25 Hz, 659.25 Hz, 783.99 Hz, 1046.50 Hz (C5, E5, G5, C6).
    - **Sub (La Mayor)**: 440 Hz, 554.37 Hz, 659.25 Hz, 880 Hz (A4, C#5, E5, A5).
    - **Kicks (Mi Mayor brillante)**: 659.25 Hz, 830.61 Hz, 987.77 Hz, 1318.51 Hz (E5, G#5, B5, E6).
    - **Host (Sol Mayor)**: 392 Hz, 523.25 Hz, 659.25 Hz, 783.99 Hz (G4, C5, E5, G5).
  - Cada nota entra con un retardo escalonado de 80 ms (`now + idx * 0.08`), creando un efecto de campanilla mágica/electrónica muy limpio.

### Módulo 3: Cola de Alertas FIFO (`queueAlert`, `processAlertQueue`, `displayAlert`)
- Las alertas entrantes se almacenan en un arreglo `alertQueue`.
- La bandera booleana `isAlertPlaying` impide que una alerta interrumpa a otra.
- `displayAlert()`:
  1. Configura textos, colores e iconos según el tema.
  2. Activa el sonido sintetizado.
  3. Añade la clase `.active` a `#alert-stage`.
  4. Espera el tiempo de duración configurado (`alertDuration`, por defecto 6000 ms).
  5. Cambia a la clase `.exiting` (durante 420 ms de animación).
  6. Restablece el escenario y ejecuta `processAlertQueue()` para procesar la siguiente alerta pendiente.

### Módulo 4: Conexión WebSocket a Streamer.bot (`connectStreamerBot`)
- Soporta configuración por parámetro URL: `?port=4445` o `?sbport=4445`.
- **Estrategia de conexión resiliente**:
  - Prueba una lista de puertos conocidos: `[port, '4445', '8080', '1234']`.
  - Si el puerto falla o se cierra, intenta secuencialmente el siguiente tras 1.5s; si todos fallan, reintenta indefinidamente cada 5s.
- **Protocolo de Suscripción**:
  Envía un JSON con:
  ```json
  {
    "request": "Subscribe",
    "id": "jhonaxm-alerts-overlay",
    "events": {
      "Kick": ["Follow", "Subscription", "SubBomb", "GiftSubscription", "Raid"],
      "Twitch": ["Follow", "Sub", "ReSub", "GiftSub", "GiftBomb", "Raid", "Cheer"],
      "YouTube": ["Subscribe", "SuperChat", "SuperSticker", "MembershipGift"],
      "StreamerBot": ["Custom"]
    }
  }
  ```
- **Indicador Visual**: Actualiza un círculo de estado en pantalla (`#sb-status-dot` verde = conectado, rojo = desconectado).

### Módulo 5: Normalizador de Eventos (`parseStreamerBotEvent`)
Extrae el nombre de usuario y datos sin importar la variación de propiedades que envíe Streamer.bot:
```javascript
const user = payload.user || payload.sender || payload.recipient || {};
const username = user.name || user.username || payload.user_name || payload.userName || payload.displayName || 'Usuario';
```
Clasifica los eventos en los 4 tipos base usando coincidencias de texto (`eventType.includes(...)`):
- Seguidor (`follow`, `subscribe`)
- Suscriptor (`sub`)
- Donaciones / Kicks / Bits (`gift`, `bomb`, `cheer`, `super`, `tip`)
- Raid / Host (`raid`, `host`)

### Módulo 6: Panel de Pruebas y Parámetros URL
- **Parámetros URL reconocidos**:
  - `?port=4445` -> Cambia el puerto WebSocket de Streamer.bot.
  - `?duration=8000` -> Modifica la duración visible de la alerta en milisegundos.
  - `?preview=true` o `?testmode=true` -> Muestra la barra de pruebas al iniciar y lanza una alerta de prueba automática tras 700 ms.
- **Interacción en pantalla**: Un evento `click` en el `document` alterna la visibilidad de `#test-controls` (con `e.stopPropagation()` dentro de la barra para permitir cliquear los botones sin cerrarla).
- **Consola de desarrollo**: Expone la función global `window.testAlert('seguidor'|'suscriptor'|'kicks'|'host')`.

---

## 5. GUÍA MAESTRA: CÓMO RECREAR ESTE WIDGET CON OTRA IA

Si deseas recrear este widget desde cero (o crear una versión para otro streamer con una temática distinta como Cyberpunk, Vikingos, Anime o Minimalista) usando otra IA (Claude, ChatGPT, Cursor, DeepSeek, etc.), utiliza el siguiente **Prompt de Arquitectura y Especificación**:

```markdown
### PROMPT DE SISTEMA / ESPECIFICACIÓN PARA IA DE DESARROLLO

Actúa como un Desarrollador Frontend Senior y Diseñador de Overlays para OBS Studio.
Crea un archivo HTML único y autosuficiente (Single-File Component con HTML, <style> y <script> internos) para un WIDGET DE ALERTAS DE STREAMING optimizado para OBS Studio Browser Source.

#### REQUISITOS TÉCNICOS OBLIGATORIOS:
1. **Fondo Transparente**: El <body> y <html> deben tener `background: transparent !important; overflow: hidden;`.
2. **Cero Dependencias de Archivos Locales**:
   - No enlaces archivos .css ni .js locales externos.
   - Las fuentes deben provenir de Google Fonts vía <link>.
   - El audio debe ser sintetizado en tiempo real usando la Web Audio API nativa (sin archivos .mp3/.wav externos). Diseña un sintetizador que toque arpegios de 4 notas con oscilador sine y caída exponencial para cada tipo de evento.
3. **Variables CSS Semánticas y Genéricas**:
   - Define en `:root` tokens semánticos (ej: `--color-accent-primary`, `--color-accent-secondary`, `--color-bg-surface-dark`, `--color-text-main`). No utilices nombres de marcas o streamers en las variables CSS.
   - Establece colores por defecto (ej. carmesí/rojo neón) que luego sean sobreescritos por las clases temáticas `.theme-[evento]` mediante `--accent-color` y `--glow-color`.
4. **Slot Genérico para Emblema / Avatar / Logotipo**:
   - Inserta una caja contenedora de 70x70px (`.alert-emblem-box`) con imagen de 55x55px (`.alert-emblem-img`) y animación flotante (`emblemFloat`).
   - El slot debe ser agnóstico: preparado para recibir cualquier avatar de usuario, logotipo en PNG/WebP transparente o icono temático representativo.
5. **Efecto de Rayos Eléctricos SVG Procedurales**:
   - Inserta un elemento <svg> superpuesto a la tarjeta.
   - En JavaScript, crea una función que dibuje rayos alrededor del perímetro rectangular (calculando 4 lados divididos en 16 segmentos con offsets aleatorios (Math.random() - 0.5) * 16).
   - Genera 3 capas de trazados con grosores alternos y un filtro SVG de desenfoque/resplandor (feGaussianBlur).
   - Actualiza el trazo cada 90ms usando setInterval para lograr animación eléctrica caótica.
6. **Temas Visuales Dinámicos por Evento (Clases CSS)**:
   - Seguidor: Acento carmesí (`#ff1a40` / icono ⚔️).
   - Suscriptor: Oro imperial (`#ffd700` / icono ⭐).
   - Donación / Moneda del canal / Kicks: Verde neón (`#53fc18` / icono 💚).
   - Raid / Host: Magenta eléctrico (`#e056fd` / icono 🚀).
   - Cada tema conmuta el color de los rayos SVG, la pastilla superior (.badge), el color de acento del texto y el resplandor ambiental de fondo.
7. **Sistema de Colas FIFO (First-In, First-Out)**:
   - Implementa un array `alertQueue = []` y una bandera `isAlertPlaying`.
   - Si entran eventos mientras una alerta está activa, se deben encolar y mostrar secuencialmente sin sobreponerse.
   - La transición de entrada debe usar `cubic-bezier(0.175, 0.885, 0.32, 1.275)` (rebote overshoot) y la salida `ease-in` con desvanecimiento y traslación.
8. **Integración WebSocket con Streamer.bot**:
   - Conexión a `ws://127.0.0.1:4445/` (con lectura dinámica de puerto desde parámetro URL `?port=XXXX` y fallback automático a 4445, 8080, 1234).
   - Suscripción a eventos de Kick, Twitch y YouTube mediante mensaje JSON `{"request": "Subscribe", ...}`.
   - Normalizador de eventos que acepte formatos dispares de usuario (`payload.user.name`, `payload.user_name`, `displayName`).
   - Reintento de reconexión automático si el WebSocket se cierra.
9. **Panel de Pruebas Oculto**:
   - Un contenedor `#test-controls` flotante centrado abajo con botones para simular: Seguidor, Sub, Kicks/Donación, Host/Raid.
   - El panel debe estar oculto por defecto y alternar su visibilidad (.hidden) al hacer clic en cualquier lugar de la pantalla.
   - Si la URL tiene `?preview=true`, debe arrancar visible y disparar una alerta automática de demostración.
   - Un punto indicador de estado de conexión WebSocket (verde conectado, rojo desconectado).

#### DISEÑO ESTÉTICO REQUERIDO:
- Estilo: "Cyber / Esports / Dark Fantasy con Borde Eléctrico".
- Fondo de tarjeta: Glassmorphism oscuro `rgba(14, 8, 26, 0.88)` con `backdrop-filter: blur(14px)`.
- Muescas de esquina angulares decorativas en las 4 esquinas de la tarjeta.
- Tipografías Google Fonts: 'Shojumaru' (titulares y badges ceremoniales), 'Orbitron' (nombre de usuario gamer), 'Rajdhani' (subtítulos y cuerpo).

Entrega el código completo sin placeholders vacíos ni comentarios del tipo "// código aquí", listo para guardar como archivo .html y probar en el navegador.
```

---

## 6. CHECKLIST DE VERIFICACIÓN PARA LA IA

Cuando otra IA genere el código, verifica que cumpla con los siguientes puntos críticos antes de usarlo en producción:

- [ ] **¿El fondo es 100% transparente?** (Si tiene fondo negro o blanco, tapará el juego o la cámara en OBS).
- [ ] **¿Las variables de color son semánticas y modulares?** (Permiten cambiar la identidad visual del creador ajustando 2 o 3 valores en `:root`).
- [ ] **¿El slot de emblema/avatar es agnóstico?** (Acepta cualquier imagen 55x55 px sin romper la simetría de la tarjeta).
- [ ] **¿El audio funciona sin interacción previa si el navegador lo bloquea?** (El código debe incluir `if (audioCtx.state === 'suspended') audioCtx.resume();` activado con el primer clic o llamada).
- [ ] **¿El SVG no genera barras de desplazamiento?** (`overflow: visible` en el SVG y `overflow: hidden` en el `body`).
- [ ] **¿El panel de pruebas no se cierra solo al hacer clic en sus botones?** (Debe tener `e.stopPropagation()` en el listener de `#test-controls`).
- [ ] **¿Las alertas no se solapan?** (Prueba pulsar 3 botones de test seguidos; deben verse uno después del otro, respetando la duración).
- [ ] **¿Se limpia el intervalo de rayos?** (`if (lightningInterval) clearInterval(lightningInterval)` antes de asignar uno nuevo).

---

## 7. MAPA DE RECURSOS Y REFERENCIAS

- **Archivo Original de Referencia:** `jhonaxm/alertas.html`
- **Slot de Emblema (Ejemplo de Implementación):** En el archivo de muestra se utiliza una imagen remota (`https://res.cloudinary.com/...`), pero en una nueva implementación puede sustituirse por cualquier URL, archivo local WebP/PNG transparente de 55x55px o un SVG de icono.
- **Fuentes Utilizadas:** Shojumaru, Orbitron, Rajdhani (importadas mediante Google Fonts).
- **Audio:** 100% Sintetizado in-memory con Web Audio API (cero dependencias de archivos de sonido).
