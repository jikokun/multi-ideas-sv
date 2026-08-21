# 🎨 Registro y Catálogo de Botones con Micro-Animaciones

Este documento reúne las especificaciones técnicas, estilos CSS, marcado HTML, lógica JavaScript y variables de personalización de los **10 componentes y botones interactivos**. Diseñados con físicas de animación tipo resorte (*spring physics*), estados de retroalimentación visual inmediata y alta fidelidad estética.

---

## 📑 Índice Rápido

1. [Tokens Globales y Físicas de Animación](#-tokens-globales-y-físicas-de-animación)
2. [Estructura Base: El Botón Estándar (`.sbtn`)](#-estructura-base-el-botón-estándar-sbtn)
3. [Catálogo de Componentes](#-catálogo-de-componentes)
   - [01. Carteles Seleccionables con Chispas](#01-carteles-seleccionables-con-chispas-plan)
   - [02. Cuadrícula a Modal Emergente desde el Origen](#02-cuadrícula-a-modal-emergente-gal)
   - [03. Botón Aceptar con Confeti y Anillo Expansivo](#03-botón-aceptar-con-confeti-y-anillo-b-accept)
   - [04. Botón Entendido con Asentimiento y Bombilla](#04-botón-entendido-con-asentimiento-y-bombilla-b-got)
   - [05. Botón Siguiente con Pasos e Icono Deslizante](#05-botón-siguiente-con-pasos-e-icono-deslizante-b-next)
   - [06. Botón Rechazar con Temblor (Shake) y Sello X](#06-botón-rechazar-con-temblor-shake-y-sello-x-b-no)
   - [07. Interruptor Día / Noche con Nubes y Estrellas](#07-interruptor-día--noche-switch)
   - [08. Botón Me Gusta con Partículas y Contador Giratorio](#08-botón-me-gusta-con-partículas-y-contador-b-like)
   - [09. Botón Copiar con Hoja Voladora y Trazo SVG](#09-botón-copiar-con-hoja-voladora-y-trazo-svg-b-copy)
   - [10. Botón Mantener Presionado para Confirmar](#10-botón-mantener-presionado-para-confirmar-b-hold)
4. [Guía de Personalización Rápida de Colores y Tiempos](#-guía-de-personalización-rápida)

---

## ⚡ Tokens Globales y Físicas de Animación

Para que las animaciones tengan ese rebote suave y elástico característico, incluye estas variables en tu `:root` o archivo CSS principal:

```css
:root {
  /* Curvas de aceleración tipo resorte (Spring Physics) */
  --spring: cubic-bezier(.34, 1.56, .64, 1);
  --soft: cubic-bezier(.3, 1.2, .4, 1);
  
  /* Fuentes recomendadas */
  --ui: "Space Grotesk", system-ui, -apple-system, sans-serif;
  --mono: "JetBrains Mono", monospace;
}
```

---

## 🔘 Estructura Base: El Botón Estándar (`.sbtn`)

Casi todos los botones independientes heredan la clase base `.sbtn`, la cual provee la cápsula redondeada, sombras internas de bisel, gradientes y animaciones al presionar (*active state*).

```css
.sbtn {
  position: relative;
  border: none;
  border-radius: 999px;
  height: 58px;
  padding: 0 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  font-family: var(--ui);
  font-weight: 700;
  font-size: 16px;
  letter-spacing: .3px;
  color: #fff;
  background: linear-gradient(180deg, var(--c1), var(--c2));
  box-shadow: 0 14px 28px -12px var(--sh), 
              inset 0 2px 0 rgba(255, 255, 255, .35), 
              inset 0 -3px 0 rgba(0, 0, 0, .12);
  transition: transform .4s var(--spring), opacity .25s, box-shadow .25s;
  cursor: pointer;
  overflow: visible;
  -webkit-tap-highlight-color: transparent;
}

.sbtn:hover {
  transform: translateY(-2px);
}

.sbtn:active {
  transform: scale(.96);
}

.sbtn svg {
  width: 20px;
  height: 20px;
  flex: none;
}

.sbtn .lbl {
  position: relative;
  transition: transform .28s ease, opacity .2s ease;
}
```

---

## 📦 Catálogo de Componentes

---

### 01. Carteles Seleccionables con Chispas (`.plan`)
> **Uso recomendado**: Selección de planes de suscripción, opciones de precios, métodos de entrega o filtros mutuamente excluyentes.

#### 🧱 HTML
```html
<div class="planes" id="fxPlanes">
  <button class="plan" type="button">
    <span class="plan__emoji">🌱</span>
    <span class="plan__name">Básico</span>
    <span class="plan__price">0 €</span>
    <span class="plan__check">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5"/>
      </svg>
    </span>
    <!-- Partículas de chispa configurables -->
    <i class="spark" style="--sc:#ff6a3d;--dx:-26px;--dy:-24px;--sd:0s"></i>
    <i class="spark" style="--sc:#ffb26b;--dx:24px;--dy:-28px;--sd:.06s"></i>
    <i class="spark" style="--sc:#3ecf6d;--dx:0px;--dy:-36px;--sd:.12s"></i>
  </button>

  <button class="plan" type="button">
    <span class="plan__emoji">🚀</span>
    <span class="plan__name">Pro</span>
    <span class="plan__price">9 €</span>
    <span class="plan__check">
      <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round">
        <path d="M5 12.5l4.5 4.5L19 7.5"/>
      </svg>
    </span>
    <i class="spark" style="--sc:#ff6a3d;--dx:-26px;--dy:-24px;--sd:0s"></i>
    <i class="spark" style="--sc:#ffb26b;--dx:24px;--dy:-28px;--sd:.06s"></i>
    <i class="spark" style="--sc:#3ecf6d;--dx:0px;--dy:-36px;--sd:.12s"></i>
  </button>
</div>
```

#### 🎨 CSS
```css
.planes { display: flex; gap: 12px; }

.plan {
  position: relative;
  width: 96px;
  padding: 14px 8px 12px;
  border-radius: 16px;
  background: #fff;
  border: 2px solid #e7ddd2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  cursor: pointer;
  transition: transform .4s var(--spring), border-color .25s, box-shadow .3s;
}

.plan:hover { transform: translateY(-3px); }
.plan__emoji { font-size: 26px; transition: transform .4s var(--spring); }
.plan__name { font-weight: 700; font-size: 13px; color: #241d18; }
.plan__price { font-family: var(--mono); font-size: 11px; color: #a08d80; }

.plan__check {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: linear-gradient(180deg, #3ecf6d, #18a353);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transform: scale(0);
  transition: transform .45s var(--spring);
  box-shadow: 0 6px 14px -6px rgba(24, 163, 83, .7);
}
.plan__check svg { width: 14px; height: 14px; }

/* Estado Activo / Seleccionado */
.plan.is-selected {
  border-color: #ff6a3d;
  transform: translateY(-7px);
  box-shadow: 0 18px 30px -16px rgba(240, 79, 28, .5);
}
.plan.is-selected .plan__emoji { transform: scale(1.2) rotate(-6deg); }
.plan.is-selected .plan__check { transform: scale(1); }

/* Efecto de Onda y Chispas */
.plan .spark {
  position: absolute;
  left: 50%; top: 0;
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--sc);
  opacity: 0;
  pointer-events: none;
}
.plan.is-selected .spark {
  animation: sparkA .6s ease-out var(--sd) forwards;
}
@keyframes sparkA {
  0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), var(--dy)) scale(.3); }
}

.plan.is-selected::after {
  content: "";
  position: absolute;
  inset: -2px;
  border-radius: 16px;
  border: 3px solid rgba(255, 106, 61, .6);
  animation: rippleA .55s ease-out forwards;
}
@keyframes rippleA {
  0% { opacity: .9; transform: scale(.9); }
  100% { opacity: 0; transform: scale(1.25); }
}
```

#### ⚙️ JavaScript
```javascript
const planes = document.querySelectorAll('#fxPlanes .plan');
planes.forEach(plan => {
  plan.addEventListener('click', () => {
    const yaSeleccionado = plan.classList.contains('is-selected');
    planes.forEach(p => p.classList.remove('is-selected'));
    if (!yaSeleccionado) {
      void plan.offsetWidth; // Forzar reflow para reiniciar animación de chispas
      plan.classList.add('is-selected');
    }
  });
});
```

---

### 02. Cuadrícula a Modal Emergente (`.gal`)
> **Uso recomendado**: Galerías de iconos, catálogos de productos rápidos, tarjetas de detalles o menús de emojis interactivos que emergen desde la posición exacta del botón presionado.

#### 🧱 HTML
```html
<div class="gal" id="fxGal">
  <div class="gal__grid">
    <button class="tile" type="button" data-emoji="🚀" data-title="Cohete" data-desc="Despega tus proyectos con velocidad supersónica.">🚀</button>
    <button class="tile" type="button" data-emoji="🎨" data-title="Arte" data-desc="Paletas vibrantes para interfaces con personalidad.">🎨</button>
    <button class="tile" type="button" data-emoji="🎧" data-title="Música" data-desc="Bandas sonoras para cada animación que construyes.">🎧</button>
  </div>
  <div class="gal__overlay"></div>
  <div class="gal__dialog">
    <span class="gal__emoji">🚀</span>
    <h3>Título</h3>
    <p>Descripción</p>
    <button class="gal__close" type="button">Cerrar</button>
  </div>
</div>
```

#### 🎨 CSS
```css
.gal { position: relative; width: 100%; height: 100%; min-height: 220px; }
.gal__grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 10px;
  padding: 16px;
}
.tile {
  border: none;
  border-radius: 14px;
  background: #fff;
  border: 2px solid #eadfd3;
  font-size: 26px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .35s var(--spring), opacity .3s, box-shadow .3s;
  box-shadow: 0 4px 10px -6px rgba(60, 40, 30, .25);
}
.tile:hover {
  transform: translateY(-3px) scale(1.04);
  box-shadow: 0 12px 20px -10px rgba(60, 40, 30, .4);
}

.gal__overlay {
  position: absolute;
  inset: 0;
  background: rgba(24, 17, 13, .38);
  backdrop-filter: blur(2px);
  opacity: 0;
  pointer-events: none;
  transition: opacity .35s;
}
.gal__overlay.is-open { opacity: 1; pointer-events: auto; }

.gal__dialog {
  position: absolute;
  left: 50%; top: 50%;
  width: 78%; max-width: 270px;
  transform: translate(-50%, -50%);
  background: #fff;
  border-radius: 20px;
  padding: 20px 18px 16px;
  text-align: center;
  box-shadow: 0 30px 60px -20px rgba(20, 10, 5, .5);
  opacity: 0;
  pointer-events: none;
  transition: transform .45s var(--soft), opacity .3s ease;
  z-index: 10;
}
.gal__dialog.is-open { pointer-events: auto; }
.gal__emoji { font-size: 40px; display: inline-block; }
.gal__dialog.is-open .gal__emoji { animation: emojiPop .5s var(--spring) .25s backwards; }

@keyframes emojiPop {
  0% { transform: scale(0) rotate(-30deg); }
  100% { transform: scale(1) rotate(0); }
}

.gal__dialog h3 { font-size: 17px; margin: 6px 0 4px; color: #241d18; }
.gal__dialog p { font-size: 12.5px; color: #7d6c5f; line-height: 1.45; margin-bottom: 12px; }
.gal__close {
  border: none;
  border-radius: 999px;
  padding: 8px 20px;
  font-weight: 700;
  font-size: 13px;
  color: #fff;
  background: linear-gradient(180deg, #ff8a50, #f04f1c);
  cursor: pointer;
  transition: transform .3s var(--spring);
}
.gal__close:hover { transform: scale(1.06); }
.gal__close:active { transform: scale(.94); }
```

#### ⚙️ JavaScript
```javascript
const gal = document.getElementById('fxGal');
const tiles = gal.querySelectorAll('.tile');
const dlg = gal.querySelector('.gal__dialog');
const ov = gal.querySelector('.gal__overlay');
let tileAbierto = null;

function datosDe(tile) {
  const sr = gal.getBoundingClientRect(), tr = tile.getBoundingClientRect();
  const dx = (tr.left + tr.width / 2) - (sr.left + sr.width / 2);
  const dy = (tr.top + tr.height / 2) - (sr.top + sr.height / 2);
  const s = (tr.width / dlg.offsetWidth) * .9;
  return { dx, dy, s };
}

tiles.forEach(t => t.addEventListener('click', () => {
  if (tileAbierto) return;
  tileAbierto = t;
  dlg.querySelector('.gal__emoji').textContent = t.dataset.emoji;
  dlg.querySelector('h3').textContent = t.dataset.title;
  dlg.querySelector('p').textContent = t.dataset.desc;
  const { dx, dy, s } = datosDe(t);
  
  dlg.style.transition = 'none';
  dlg.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${s})`;
  dlg.style.opacity = '0';
  dlg.classList.add('is-open');
  ov.classList.add('is-open');
  
  requestAnimationFrame(() => requestAnimationFrame(() => {
    dlg.style.transition = '';
    dlg.style.transform = 'translate(-50%,-50%) scale(1)';
    dlg.style.opacity = '1';
    t.style.opacity = '0';
  }));
}));

function cerrarDlg() {
  if (!tileAbierto) return;
  const t = tileAbierto, { dx, dy, s } = datosDe(t);
  dlg.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(${s})`;
  dlg.style.opacity = '0';
  ov.classList.remove('is-open');
  setTimeout(() => {
    dlg.classList.remove('is-open');
    t.style.opacity = '';
    tileAbierto = null;
  }, 380);
}

gal.querySelector('.gal__close').addEventListener('click', cerrarDlg);
ov.addEventListener('click', cerrarDlg);
```

---

### 03. Botón Aceptar con Confeti y Anillo (`.b-accept`)
> **Uso recomendado**: Confirmaciones de compra, finalización de procesos, envío exitoso de formularios y aprobación de acciones.

#### 🧱 HTML
```html
<button class="sbtn b-accept fx-accept" id="bAccept" type="button">
  <span class="ring"></span>
  <!-- Partículas de confeti con ángulos y desplazamientos variables -->
  <i class="confetti" style="--cc:#18a353;--dx:-56px;--dy:-46px"></i>
  <i class="confetti" style="--cc:#f59e0b;--dx:52px;--dy:-52px"></i>
  <i class="confetti" style="--cc:#2563eb;--dx:-64px;--dy:18px"></i>
  <i class="confetti" style="--cc:#ef4444;--dx:60px;--dy:22px"></i>
  <i class="confetti" style="--cc:#a78bfa;--dx:8px;--dy:-64px"></i>
  <i class="confetti" style="--cc:#3ecf6d;--dx:-10px;--dy:56px"></i>
  
  <span class="lbl">Aceptar</span>
  <span class="lbl-ok">
    <svg class="chk" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12.5l4.5 4.5L19 7.5"/>
    </svg>
    ¡Aceptado!
  </span>
</button>
```

#### 🎨 CSS
```css
.fx-accept {
  --c1: #3ecf6d;
  --c2: #18a353;
  --sh: rgba(24, 163, 83, .55);
}

.b-accept::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(180deg, #2fbf63, #0f8f43);
  transform: scale(0);
  transition: transform .45s var(--soft);
  z-index: 0;
}
.b-accept.is-done::before { transform: scale(1); }
.b-accept > * { position: relative; z-index: 1; }

.b-accept .chk {
  width: 20px;
  height: 20px;
  stroke-dasharray: 24;
  stroke-dashoffset: 24;
  transition: stroke-dashoffset .4s ease .25s;
}
.b-accept.is-done .chk { stroke-dashoffset: 0; }

.b-accept .lbl-ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: scale(.7);
  transition: opacity .25s, transform .4s var(--spring);
}
.b-accept.is-done .lbl { opacity: 0; }
.b-accept.is-done .lbl-ok { opacity: 1; transform: scale(1); transition-delay: .15s; }

/* Animación de Burst / Explosión */
.b-accept.is-burst { animation: pressA .5s var(--spring); }
@keyframes pressA {
  0% { transform: scale(1); }
  35% { transform: scale(.86); }
  70% { transform: scale(1.06); }
  100% { transform: scale(1); }
}

.ring {
  position: absolute;
  inset: -4px;
  border-radius: 999px;
  border: 3px solid #18a353;
  opacity: 0;
  pointer-events: none;
}
.is-burst .ring { animation: ringA .6s ease-out forwards; }
@keyframes ringA {
  0% { opacity: .9; transform: scale(.7); }
  100% { opacity: 0; transform: scale(1.7); }
}

.confetti {
  position: absolute;
  left: 50%; top: 50%;
  width: 8px; height: 8px;
  border-radius: 2px;
  background: var(--cc);
  opacity: 0;
  pointer-events: none;
}
.is-burst .confetti { animation: confA .7s cubic-bezier(.2, .7, .4, 1) forwards; }
@keyframes confA {
  0% { opacity: 1; transform: translate(-50%, -50%) rotate(0); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(240deg) scale(.5); }
}
```

#### ⚙️ JavaScript
```javascript
const bAccept = document.getElementById('bAccept');
let ocupadoA = false;

bAccept.addEventListener('click', () => {
  if (ocupadoA) return;
  ocupadoA = true;
  
  bAccept.classList.add('is-burst');
  setTimeout(() => bAccept.classList.add('is-done'), 260);
  setTimeout(() => bAccept.classList.add('is-reset'), 1800);
  setTimeout(() => {
    bAccept.className = 'sbtn b-accept fx-accept';
    ocupadoA = false;
  }, 2350);
});
```

---

### 04. Botón Entendido con Asentimiento y Bombilla (`.b-got`)
> **Uso recomendado**: Cierre de avisos informativos, tutoriales paso a paso, diálogos de ayuda ("¡Lo tengo! / Entendido").

#### 🧱 HTML
```html
<button class="sbtn b-got fx-got" id="bGot" type="button">
  <span class="bulb">
    <svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M9 18h6M10 21h4M12 3a6 6 0 0 1 6 6c0 2.2-1.2 3.6-2.3 4.8-.7.8-1.2 1.5-1.4 2.2h-4.6c-.2-.7-.7-1.4-1.4-2.2C7.2 12.6 6 11.2 6 9a6 6 0 0 1 6-6z"/>
    </svg>
    <svg class="rays" viewBox="0 0 40 40" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round">
      <path d="M20 2v5M20 33v5M2 20h5M33 20h5M7 7l3.5 3.5M33 7l-3.5 3.5M7 33l3.5-3.5M33 33l-3.5-3.5"/>
    </svg>
  </span>
  <span class="lbl">Entiendo</span>
  <span class="lbl-ok">¡Entendido!</span>
</button>
```

#### 🎨 CSS
```css
.fx-got {
  --c1: #fcd34d;
  --c2: #f59e0b;
  --sh: rgba(245, 158, 11, .55);
}

.b-got.is-nod { animation: nodA .6s ease; }
@keyframes nodA {
  0%, 100% { transform: translateY(0); }
  25% { transform: translateY(6px) rotate(2deg); }
  50% { transform: translateY(0); }
  75% { transform: translateY(4px) rotate(-1.5deg); }
}

.bulb { position: relative; display: inline-flex; align-items: center; justify-content: center; }
.bulb .rays {
  position: absolute;
  inset: -9px;
  opacity: 0;
  transform: scale(.4);
  transition: opacity .3s, transform .4s var(--spring);
}
.b-got.is-got .bulb .rays { opacity: 1; transform: scale(1); }
.b-got.is-got .bulb svg { filter: drop-shadow(0 0 6px rgba(255, 240, 150, .95)); }

/* Destello de luz (Shine) cruzando el botón */
.b-got::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(115deg, transparent 30%, rgba(255, 255, 255, .8) 50%, transparent 70%);
  transform: translateX(-120%);
  pointer-events: none;
}
.b-got.is-got::after { animation: shineA .7s ease .1s forwards; }
@keyframes shineA { to { transform: translateX(120%); } }

.b-got .lbl-ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(.7);
  transition: opacity .25s, transform .4s var(--spring);
}
.b-got.is-got .lbl { opacity: 0; }
.b-got.is-got .lbl-ok { opacity: 1; transform: scale(1); transition-delay: .2s; }
```

#### ⚙️ JavaScript
```javascript
const bGot = document.getElementById('bGot');
let ocupadoG = false;

bGot.addEventListener('click', () => {
  if (ocupadoG) return;
  ocupadoG = true;
  
  bGot.classList.add('is-nod');
  setTimeout(() => bGot.classList.add('is-got'), 420);
  setTimeout(() => {
    bGot.className = 'sbtn b-got fx-got';
    ocupadoG = false;
  }, 2200);
});
```

---

### 05. Botón Siguiente con Pasos (`.b-next`)
> **Uso recomendado**: Wizards multi-paso, formularios divididos, onboardings y carruseles guiados.

#### 🧱 HTML
```html
<div class="fx-next" id="fxNext">
  <div class="steps">
    <span class="stepdot is-active"></span>
    <span class="stepdot"></span>
    <span class="stepdot"></span>
  </div>
  <button class="sbtn b-next" id="bNext" type="button">
    <span class="lbl">Siguiente</span>
    <svg class="arr" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6"/>
    </svg>
  </button>
</div>
```

#### 🎨 CSS
```css
.fx-next {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  --c1: #60a5fa;
  --c2: #2563eb;
  --sh: rgba(37, 99, 235, .55);
}

.steps { display: flex; gap: 8px; }
.stepdot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #dcd0c3;
  transition: background .3s, transform .3s;
}
.stepdot.is-active {
  background: #2563eb;
  animation: dotPop .45s var(--spring);
}
@keyframes dotPop {
  0% { transform: scale(.4); }
  60% { transform: scale(1.5); }
  100% { transform: scale(1); }
}

.b-next .arr { transition: transform .3s, opacity .3s; }
.b-next.is-swapping .arr { animation: arrFly .5s ease; }
@keyframes arrFly {
  0% { transform: none; opacity: 1; }
  45% { transform: translateX(28px); opacity: 0; }
  55% { transform: translateX(-28px); opacity: 0; }
  100% { transform: none; opacity: 1; }
}

.b-next.is-swapping .lbl { transform: translateX(26px); opacity: 0; }
.b-next.is-pre .lbl { transition: none; transform: translateX(-26px); opacity: 0; }
.b-next.is-finish {
  --c1: #3ecf6d;
  --c2: #18a353;
  --sh: rgba(24, 163, 83, .55);
}
```

#### ⚙️ JavaScript
```javascript
const bNext = document.getElementById('bNext');
const stepdots = document.querySelectorAll('#fxNext .stepdot');
const lblNext = bNext.querySelector('.lbl');
let paso = 1, swap = false;

bNext.addEventListener('click', () => {
  if (swap) return;
  swap = true;
  
  bNext.classList.add('is-swapping');
  setTimeout(() => {
    paso = (paso % 3) + 1; // Cicla entre 1, 2 y 3
    stepdots.forEach((d, i) => d.classList.toggle('is-active', i === paso - 1));
    
    if (paso === 1) {
      bNext.classList.add('is-finish');
      lblNext.textContent = '¡Listo!';
    } else {
      lblNext.textContent = 'Siguiente';
    }
    bNext.classList.add('is-pre');
  }, 200);
  
  setTimeout(() => {
    bNext.classList.remove('is-swapping', 'is-pre');
  }, 240);
  
  setTimeout(() => {
    if (paso === 1) {
      setTimeout(() => bNext.classList.remove('is-finish'), 700);
    }
    swap = false;
  }, 500);
});
```

---

### 06. Botón Rechazar con Temblor (Shake) y Sello X (`.b-no`)
> **Uso recomendado**: Cancelaciones, descartar ofertas, declinar permisos o respuestas negativas en encuestas.

#### 🧱 HTML
```html
<button class="sbtn b-no fx-no" id="bNo" type="button">
  <span class="lbl">No, gracias</span>
  <span class="stampX">
    <i></i><i></i>
  </span>
  <span class="lbl-ok">Rechazado</span>
</button>
```

#### 🎨 CSS
```css
.fx-no {
  --c1: #ffffff;
  --c2: #f4efea;
  --sh: rgba(120, 90, 70, .35);
}

.b-no {
  color: #c2410c;
  box-shadow: 0 12px 24px -14px rgba(120, 90, 70, .5), inset 0 0 0 2px #e8d9cb;
}
.b-no.is-shake { animation: shakeA .5s ease; }
@keyframes shakeA {
  0%, 100% { transform: translateX(0); }
  20% { transform: translateX(-8px); }
  40% { transform: translateX(8px); }
  60% { transform: translateX(-5px); }
  80% { transform: translateX(5px); }
}

.stampX {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
}
.stampX i {
  position: absolute;
  width: 44px;
  height: 7px;
  border-radius: 4px;
  background: #dc2626;
  transform: scale(0);
}
.stampX i:first-child { --rot: 45deg; }
.stampX i:last-child { --rot: -45deg; }

.b-no.is-stamped .stampX { opacity: 1; }
.b-no.is-stamped .stampX i:first-child { animation: xA .3s var(--spring) forwards; }
.b-no.is-stamped .stampX i:last-child { animation: xA .3s var(--spring) .12s forwards; }

@keyframes xA {
  0% { transform: rotate(var(--rot)) scale(0); }
  100% { transform: rotate(var(--rot)) scale(1); }
}

.b-no .lbl-ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #dc2626;
  font-weight: 700;
  opacity: 0;
  transform: scale(.8);
  transition: opacity .25s, transform .35s var(--spring);
}
.b-no.is-stamped .lbl { opacity: 0; }
.b-no.is-stamped .lbl-ok { opacity: 1; transform: scale(1); transition-delay: .25s; }
```

#### ⚙️ JavaScript
```javascript
const bNo = document.getElementById('bNo');
let ocupadoN = false;

bNo.addEventListener('click', () => {
  if (ocupadoN) return;
  ocupadoN = true;
  
  bNo.classList.add('is-shake');
  setTimeout(() => bNo.classList.add('is-stamped'), 350);
  setTimeout(() => {
    bNo.className = 'sbtn b-no fx-no';
    ocupadoN = false;
  }, 2100);
});
```

---

### 07. Interruptor Día / Noche (`.switch`)
> **Uso recomendado**: Selector de Tema Claro / Oscuro en headers, dashboards o paneles de configuración.

#### 🧱 HTML
```html
<button class="switch" id="bSwitch" type="button" aria-label="Cambiar tema">
  <!-- Elementos de Día -->
  <span class="cloud cloud--1"></span>
  <span class="cloud cloud--2"></span>
  <!-- Elementos de Noche -->
  <span class="star star--1"></span>
  <span class="star star--2"></span>
  <span class="star star--3"></span>
  <!-- Knob deslizante -->
  <span class="knob">
    <span class="knob__face">☀️</span>
  </span>
</button>
```

#### 🎨 CSS
```css
.switch {
  position: relative;
  width: 110px;
  height: 56px;
  border-radius: 999px;
  border: none;
  background: linear-gradient(180deg, #7cc7ff, #aee0ff);
  box-shadow: inset 0 3px 8px rgba(0, 40, 80, .25), 0 10px 20px -10px rgba(60, 140, 220, .6);
  transition: background .5s, box-shadow .5s;
  overflow: hidden;
  cursor: pointer;
}

.switch .knob {
  position: absolute;
  left: 5px; top: 5px;
  width: 46px; height: 46px;
  border-radius: 50%;
  background: linear-gradient(180deg, #fff, #ffe9c9);
  box-shadow: 0 4px 10px rgba(0, 30, 60, .35), inset 0 -4px 0 rgba(0, 0, 0, .08);
  transition: transform .55s var(--spring), background .5s;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  z-index: 2;
}

.switch .cloud {
  position: absolute;
  background: #fff;
  border-radius: 999px;
  opacity: .9;
  transition: opacity .4s, transform .5s;
}
.cloud--1 { width: 34px; height: 12px; right: 12px; top: 12px; animation: drift 3s ease-in-out infinite; }
.cloud--2 { width: 24px; height: 9px; right: 34px; top: 32px; animation: drift 3.6s ease-in-out .5s infinite; }
@keyframes drift { 50% { transform: translateX(-6px); } }

.switch .star {
  position: absolute;
  width: 4px; height: 4px;
  border-radius: 50%;
  background: #fff;
  opacity: 0;
  transition: opacity .4s;
}
.star--1 { left: 16px; top: 14px; }
.star--2 { left: 34px; top: 30px; }
.star--3 { left: 22px; top: 38px; }

/* Estado Nocturno */
.switch.is-night {
  background: linear-gradient(180deg, #232b52, #141a35);
  box-shadow: inset 0 3px 8px rgba(0, 0, 20, .5), 0 10px 20px -10px rgba(20, 25, 70, .7);
}
.switch.is-night .knob {
  transform: translateX(54px);
  background: linear-gradient(180deg, #f6f1e7, #cfd6e6);
}
.switch.is-night .cloud { opacity: 0; transform: translateX(20px); }
.switch.is-night .star { opacity: 1; animation: twinkle 1.6s ease-in-out infinite; }
.switch.is-night .star--2 { animation-delay: .4s; }
.switch.is-night .star--3 { animation-delay: .8s; }
@keyframes twinkle { 50% { opacity: .25; transform: scale(.7); } }
```

#### ⚙️ JavaScript
```javascript
const bSwitch = document.getElementById('bSwitch');
const face = bSwitch.querySelector('.knob__face');

bSwitch.addEventListener('click', () => {
  const esNoche = bSwitch.classList.toggle('is-night');
  face.textContent = esNoche ? '🌙' : '☀️';
});
```

---

### 08. Botón Me Gusta con Partículas y Contador (`.b-like`)
> **Uso recomendado**: Redes sociales, catálogo de favoritos, blogs, reviews y valoraciones.

#### 🧱 HTML
```html
<div class="like-wrap">
  <button class="b-like" id="bLike" type="button" aria-label="Me gusta">
    <svg viewBox="0 0 24 24">
      <path d="M12 21s-7.5-4.9-10-9.3C.4 8.6 2.3 5 5.7 5c2 0 3.4 1.1 4.3 2.6h4c.9-1.5 2.3-2.6 4.3-2.6 3.4 0 5.3 3.6 3.7 6.7C19.5 16.1 12 21 12 21z" transform="scale(.92) translate(1 .5)"/>
    </svg>
    <!-- Partículas radiales a 360 grados -->
    <i class="p" style="--pc:#e0557d;--a:0deg;--pd:0s"></i>
    <i class="p" style="--pc:#f59e0b;--a:45deg;--pd:.03s"></i>
    <i class="p" style="--pc:#a78bfa;--a:90deg;--pd:.06s"></i>
    <i class="p" style="--pc:#3ecf6d;--a:135deg;--pd:.09s"></i>
    <i class="p" style="--pc:#60a5fa;--a:180deg;--pd:.12s"></i>
    <i class="p" style="--pc:#ff6a3d;--a:225deg;--pd:.15s"></i>
    <i class="p" style="--pc:#fcd34d;--a:270deg;--pd:.18s"></i>
    <i class="p" style="--pc:#e0557d;--a:315deg;--pd:.21s"></i>
  </button>
  <span class="like-count">
    <span class="num" id="likeNum">128</span>
  </span>
</div>
```

#### 🎨 CSS
```css
.like-wrap { display: flex; align-items: center; gap: 14px; }

.b-like {
  position: relative;
  width: 64px;
  height: 64px;
  border-radius: 50%;
  border: none;
  background: #fff;
  box-shadow: 0 12px 24px -12px rgba(190, 40, 80, .5), inset 0 0 0 2px #f3d9e0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform .3s var(--spring);
}
.b-like:hover { transform: scale(1.07); }

.b-like svg {
  width: 30px;
  height: 30px;
  fill: none;
  stroke: #e0557d;
  stroke-width: 2.4;
  transition: fill .3s, stroke .3s, transform .3s var(--spring);
}
.b-like.is-liked svg {
  fill: #e0557d;
  stroke: #e0557d;
  animation: heartPop .5s var(--spring);
}
@keyframes heartPop {
  0% { transform: scale(.4); }
  60% { transform: scale(1.35); }
  100% { transform: scale(1); }
}

/* Partículas en anillo */
.b-like .p {
  position: absolute;
  left: 50%; top: 50%;
  width: 7px; height: 7px;
  border-radius: 50%;
  background: var(--pc);
  opacity: 0;
  pointer-events: none;
}
.b-like.is-liked .p {
  animation: likeP .6s ease-out var(--pd) forwards;
}
@keyframes likeP {
  0% { opacity: 1; transform: rotate(var(--a)) translateY(-14px) scale(1); }
  100% { opacity: 0; transform: rotate(var(--a)) translateY(-40px) scale(.3); }
}

/* Animación de Contador Rodante */
.like-count {
  font-weight: 700;
  font-size: 22px;
  color: #8b6b74;
  overflow: hidden;
  height: 30px;
}
.like-count .num { display: inline-block; }
.like-count .num.roll { animation: numA .4s ease; }
@keyframes numA {
  0% { transform: translateY(0); opacity: 1; }
  45% { transform: translateY(-16px); opacity: 0; }
  55% { transform: translateY(16px); opacity: 0; }
  100% { transform: translateY(0); opacity: 1; }
}
```

#### ⚙️ JavaScript
```javascript
const bLike = document.getElementById('bLike');
const num = document.getElementById('likeNum');
let liked = false, likes = 128;

bLike.addEventListener('click', () => {
  liked = !liked;
  bLike.classList.toggle('is-liked', liked);
  num.classList.add('roll');
  
  setTimeout(() => {
    likes += liked ? 1 : -1;
    num.textContent = likes;
  }, 170);
  
  setTimeout(() => num.classList.remove('roll'), 420);
});
```

---

### 09. Botón Copiar con Hoja Voladora (`.b-copy`)
> **Uso recomendado**: Copiar enlaces de referidos, fragmentos de código, números de teléfono, direcciones o claves cripto.

#### 🧱 HTML
```html
<button class="sbtn b-copy fx-copy" id="bCopy" type="button">
  <span class="ico">
    <i class="r1"></i>
    <i class="r2"></i>
    <svg class="chk" viewBox="0 0 24 24">
      <path d="M4 13l5 5L20 7" stroke-linecap="round" stroke-linejoin="round"/>
    </svg>
  </span>
  <span class="lbl">Copiar</span>
  <span class="lbl-ok">¡Copiado!</span>
</button>
```

#### 🎨 CSS
```css
.fx-copy {
  --c1: #a78bfa;
  --c2: #7c3aed;
  --sh: rgba(124, 58, 237, .55);
}

.b-copy .ico { position: relative; width: 20px; height: 20px; }
.b-copy .ico .r1, .b-copy .ico .r2 {
  position: absolute;
  width: 13px;
  height: 15px;
  border: 2.4px solid #fff;
  border-radius: 3px;
  transition: transform .45s var(--spring), opacity .3s;
}
.b-copy .ico .r1 { left: 0; top: 3px; }
.b-copy .ico .r2 { right: 0; top: 0; background: rgba(255, 255, 255, .15); }

/* Vuelo de la hoja copiada */
.b-copy.is-copying .ico .r2 { animation: flyCopy .5s var(--spring) forwards; }
@keyframes flyCopy {
  0% { transform: none; opacity: 1; }
  100% { transform: translate(26px, -26px) rotate(20deg); opacity: 0; }
}
.b-copy.is-copying .ico .r1 { transform: translate(3px, -3px); }

.b-copy .chk {
  position: absolute;
  left: 2px; top: 5px;
  width: 14px; height: 14px;
  stroke: #fff;
  stroke-width: 3;
  fill: none;
  stroke-dasharray: 20;
  stroke-dashoffset: 20;
  transition: stroke-dashoffset .35s ease .3s;
}
.b-copy.is-copying .chk { stroke-dashoffset: 0; }

.b-copy.is-done {
  --c1: #3ecf6d;
  --c2: #18a353;
  --sh: rgba(24, 163, 83, .55);
}
.b-copy .lbl-ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(.7);
  transition: opacity .25s, transform .4s var(--spring);
}
.b-copy.is-done .lbl { opacity: 0; }
.b-copy.is-done .lbl-ok { opacity: 1; transform: scale(1); transition-delay: .15s; }
```

#### ⚙️ JavaScript
```javascript
const bCopy = document.getElementById('bCopy');
let ocupadoC = false;

bCopy.addEventListener('click', async () => {
  if (ocupadoC) return;
  ocupadoC = true;
  
  // Opcional: Copiar al portapapeles nativo
  // navigator.clipboard.writeText('Texto a copiar');
  
  bCopy.classList.add('is-copying');
  setTimeout(() => bCopy.classList.add('is-done'), 350);
  setTimeout(() => {
    bCopy.className = 'sbtn b-copy fx-copy';
    ocupadoC = false;
  }, 2100);
});
```

---

### 10. Botón Mantener Presionado para Confirmar (`.b-hold`)
> **Uso recomendado**: Acciones irreversibles o críticas: eliminar cuenta, borrar base de datos, transferir fondos, desbloquear funciones.

#### 🧱 HTML
```html
<button class="sbtn b-hold fx-hold" id="bHold" type="button">
  <span class="fill"></span>
  <span class="ring"></span>
  <span class="lbl">Mantener para confirmar</span>
  <span class="lbl-ok">✓ Confirmado</span>
</button>
```

#### 🎨 CSS
```css
.fx-hold {
  --c1: #ff8a50;
  --c2: #f04f1c;
  --sh: rgba(240, 79, 28, .55);
}

.b-hold {
  overflow: hidden;
  user-select: none;
  touch-action: none;
}

.b-hold .fill {
  position: absolute;
  inset: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg, #2fbf63, #0f8f43);
  transform: scaleX(0);
  transform-origin: left center;
  transition: transform .35s var(--soft);
}

/* Progreso al mantener pulsado */
.b-hold.is-holding .fill {
  transform: scaleX(1);
  transition: transform .9s linear;
}

.b-hold > * { position: relative; z-index: 1; }

.b-hold .lbl-ok {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  opacity: 0;
  transform: scale(.7);
  transition: opacity .25s, transform .4s var(--spring);
}
.b-hold.is-confirmed .lbl { opacity: 0; }
.b-hold.is-confirmed .lbl-ok { opacity: 1; transform: scale(1); transition-delay: .1s; }
.b-hold.is-confirmed { animation: pressA .5s var(--spring); }
.b-hold .ring { border-color: #f04f1c; }
.b-hold.is-confirmed .ring { animation: ringA .6s ease-out forwards; }
```

#### ⚙️ JavaScript
```javascript
const bHold = document.getElementById('bHold');
let holdT = null;
let confirmado = false;

function soltar() {
  if (confirmado) return;
  clearTimeout(holdT);
  bHold.classList.remove('is-holding');
}

bHold.addEventListener('pointerdown', () => {
  if (confirmado) return;
  bHold.classList.add('is-holding');
  
  holdT = setTimeout(() => {
    confirmado = true;
    bHold.classList.remove('is-holding');
    bHold.classList.add('is-confirmed');
    
    // Aquí puedes disparar la acción real (ej. eliminar, enviar, etc.)
    console.log('¡Acción confirmada tras mantener presionado!');
    
    setTimeout(() => {
      bHold.classList.remove('is-confirmed');
      confirmado = false;
    }, 1600);
  }, 920); // Tiempo requerido de pulsación (0.92 segundos)
});

['pointerup', 'pointerleave', 'pointercancel'].forEach(ev => {
  bHold.addEventListener(ev, soltar);
});
```

---

### 11. Botón WhatsApp con Avioncito de Envío Volador (`.btn-wsp-fly`)
> **Uso recomendado**: Botones de contacto por WhatsApp en tarjetas de negocios, tiendas online y catálogos. Al hacer clic, lanza un avión de papel SVG en diagonal con resorte elástico antes de redirigir al chat.

#### 🧱 HTML
```html
<a href="https://api.whatsapp.com/send?phone=50372300795&text=Hola%20vengo%20desde%20la%20web" 
   class="btn-wsp-fly js-wsp-plane" 
   target="_blank" 
   rel="noopener noreferrer">
  
  <!-- Icono WhatsApp Normal -->
  <svg class="ico-wsp" viewBox="0 0 24 24">
    <path d="M12 2C6.48 2 2 6.48 2 12c0 1.73.44 3.35 1.21 4.78L2 22l5.37-1.41C8.75 21.31 10.33 21.6 12 21.6c5.52 0 10-4.48 10-10S17.52 2 12 2zm4.4 12.6c-.23.63-.87 1.16-1.5 1.39-.63.23-1.45.32-2.32-.05-.87-.36-3.74-1.6-5.17-3.03-1.43-1.43-2.67-4.3-3.03-5.17-.37-.87-.28-1.69-.05-2.32.23-.63.76-1.24 1.39-1.47.63-.23 1.33-.23 1.96.05.63.27.63.76.36 1.39L8.47 8.65c-.27.63-.76.63-1.39.36l.18.32c.36.87 1.6 3.74 3.03 5.17 1.43 1.43 4.3 2.67 5.17 3.03l.32.18c-.63-.27-1.12-.27-1.39-.05l1.65-1.96c.27-.27.76-.27 1.39 0s2.99 1.47 3.26 1.74c.27.27.27.84.05 1.47z"/>
  </svg>

  <!-- Icono Avioncito que vuela -->
  <svg class="ico-plane wsp-plane-anim" viewBox="0 0 24 24">
    <path d="M22 2L11 13"/>
    <path d="M22 2L15 22L11 13L2 9L22 2Z"/>
  </svg>

  <span class="btn-text">WhatsApp</span>
</a>
```

#### 🎨 CSS
```css
.btn-wsp-fly {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 12px;
  font-size: 13px;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  background: rgba(37, 211, 102, 0.1);
  border: 1.5px solid rgba(37, 211, 102, 0.4);
  color: #25D366;
  box-shadow: 0 4px 12px rgba(37, 211, 102, 0.15);
  transition: transform .3s var(--spring), background .25s, border-color .25s, box-shadow .25s;
  overflow: visible;
}
.btn-wsp-fly:hover {
  background: rgba(37, 211, 102, 0.2);
  border-color: #25D366;
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(37, 211, 102, 0.35);
}
.btn-wsp-fly:active { transform: scale(0.95); }

.btn-wsp-fly .ico-wsp {
  width: 16px; height: 16px;
  fill: currentColor;
  transition: transform .4s var(--spring), opacity .25s;
}

.btn-wsp-fly .ico-plane {
  position: absolute;
  left: 18px;
  width: 18px; height: 18px;
  stroke: currentColor; fill: none; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round;
  opacity: 0; transform: scale(0);
  pointer-events: none;
}

/* Estado de Vuelo al hacer Clic */
.btn-wsp-fly.is-flying {
  border-color: #25D366;
  background: rgba(37, 211, 102, 0.25);
  box-shadow: 0 0 25px rgba(37, 211, 102, 0.5);
  pointer-events: none;
}
.btn-wsp-fly.is-flying .ico-wsp { opacity: 0; transform: scale(0); }
.btn-wsp-fly.is-flying .ico-plane { animation: flyPlane 0.65s var(--spring) forwards; }

@keyframes flyPlane {
  0% { opacity: 1; transform: scale(0.8) translate(0, 0) rotate(0deg); }
  30% { opacity: 1; transform: scale(1.3) translate(6px, -4px) rotate(15deg); }
  100% { opacity: 0; transform: scale(0.4) translate(70px, -60px) rotate(45deg); }
}
```

#### ⚙️ JavaScript
```javascript
document.addEventListener("click", function(e) {
  const btn = e.target.closest("a.btn-wsp-fly, a.btn-wsp");
  if (!btn) return;

  const href = btn.getAttribute("href");
  if (!href || href === "#") return;

  if (btn.classList.contains("is-flying")) {
    e.preventDefault();
    return;
  }

  e.preventDefault();
  btn.classList.add("is-flying");

  const textNode = btn.querySelector(".btn-text") || btn;
  const originalText = textNode.textContent;
  textNode.textContent = " ¡Volando…!";

  setTimeout(() => {
    window.open(href, "_blank", "noopener,noreferrer");
    setTimeout(() => {
      btn.classList.remove("is-flying");
      textNode.textContent = originalText;
    }, 1000);
  }, 450);
});
```

---

### 12. Botón de Iniciar Sesión con Google con Micro-animación de Éxito (`.auth-google-btn`)
> **Uso recomendado**: Modales de inicio de sesión y registro con Google (OAuth). Al hacer clic muestra un spinner multicolor de Google y al completar el acceso exitosamente dispara una celebración con confetis en los 4 colores de Google, anillo expansivo verde y visto bueno animado antes de cerrar el modal.

#### 🧱 HTML
```html
<button type="button" id="auth-google-btn" class="auth-google-btn">
  <!-- Anillo Expansivo de Éxito -->
  <span class="g-ring"></span>

  <!-- Confetis de colores de Google -->
  <i class="g-confetti" style="--gc:#4285F4; --gx:-60px; --gy:-40px; --gd:0s;"></i>
  <i class="g-confetti" style="--gc:#EA4335; --gx:60px; --gy:-45px; --gd:0.04s;"></i>
  <i class="g-confetti" style="--gc:#FBBC05; --gx:-70px; --gy:20px; --gd:0.08s;"></i>
  <i class="g-confetti" style="--gc:#34A853; --gx:65px; --gy:25px; --gd:0.12s;"></i>
  <i class="g-confetti" style="--gc:#4285F4; --gx:10px; --gy:-60px; --gd:0.06s;"></i>
  <i class="g-confetti" style="--gc:#34A853; --gx:-15px; --gy:55px; --gd:0.1s;"></i>

  <!-- Icono Oficial Multicolor -->
  <svg class="google-g-icon" viewBox="0 0 24 24" width="20" height="20" style="margin-right: 8px;">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"/>
  </svg>

  <!-- Spinner de Carga -->
  <span class="google-spinner"></span>

  <!-- Visto Bueno de Éxito -->
  <span class="google-check">
    <svg viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round"/></svg>
  </span>

  <span id="auth-google-text" class="google-btn-text">Iniciar con Google</span>
</button>
```

#### 🎨 CSS
```css
.auth-google-btn {
  position: relative;
  width: 100%;
  height: 48px;
  background-color: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  color: var(--text-white, #fff);
  padding: 10px 16px;
  font-size: 0.95rem;
  font-weight: 700;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  transition: background-color 0.25s, border-color 0.25s, transform 0.3s var(--spring), box-shadow 0.25s;
  overflow: visible;
}

.auth-google-btn:hover {
  background-color: rgba(255, 255, 255, 0.08);
  border-color: rgba(66, 133, 244, 0.6);
  box-shadow: 0 4px 18px rgba(66, 133, 244, 0.25);
  transform: translateY(-2px);
}

.auth-google-btn:active { transform: scale(0.97); }

/* Icono G Oficial */
.auth-google-btn .google-g-icon {
  width: 20px; height: 20px;
  flex-shrink: 0;
  transition: transform .4s var(--spring), opacity .25s;
}

/* Spinner Multicolor Google */
.auth-google-btn .google-spinner {
  position: absolute;
  width: 22px; height: 22px;
  border-radius: 50%;
  border: 3px solid transparent;
  border-top-color: #4285F4;
  border-right-color: #EA4335;
  border-bottom-color: #FBBC05;
  border-left-color: #34A853;
  animation: gBtnSpin 0.85s linear infinite;
  opacity: 0; transform: scale(0);
  transition: opacity .25s, transform .3s var(--spring);
  pointer-events: none;
}
@keyframes gBtnSpin { to { transform: rotate(360deg); } }

/* Checkmark de Éxito */
.auth-google-btn .google-check {
  position: absolute;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: linear-gradient(135deg, #34A853, #16a34a);
  display: flex; align-items: center; justify-content: center;
  color: #fff;
  opacity: 0; transform: scale(0);
  transition: opacity .25s, transform .45s var(--spring);
  box-shadow: 0 4px 14px rgba(52, 168, 83, 0.5);
  pointer-events: none;
}
.auth-google-btn .google-check svg {
  width: 14px; height: 14px;
  stroke: #fff; stroke-width: 3.2; fill: none;
  stroke-dasharray: 20; stroke-dashoffset: 20;
  transition: stroke-dashoffset .4s ease 0.15s;
}

/* Estados */
.auth-google-btn.is-loading {
  border-color: #4285F4 !important;
  background: rgba(66, 133, 244, 0.1) !important;
  pointer-events: none;
  box-shadow: 0 0 20px rgba(66, 133, 244, 0.3) !important;
}
.auth-google-btn.is-loading .google-g-icon { opacity: 0; transform: scale(0); }
.auth-google-btn.is-loading .google-spinner { opacity: 1; transform: scale(1); left: 18px; }

.auth-google-btn.is-success {
  border-color: #34A853 !important;
  background: rgba(52, 168, 83, 0.15) !important;
  color: #4ade80 !important;
  box-shadow: 0 8px 24px rgba(52, 168, 83, 0.4) !important;
  animation: gSuccessPulse 0.5s var(--spring);
  pointer-events: none;
}
.auth-google-btn.is-success .google-g-icon,
.auth-google-btn.is-success .google-spinner { opacity: 0; transform: scale(0); }
.auth-google-btn.is-success .google-check { opacity: 1; transform: scale(1); left: 18px; }
.auth-google-btn.is-success .google-check svg { stroke-dashoffset: 0; }

.auth-google-btn.is-success .g-confetti {
  animation: gConfFall 0.7s cubic-bezier(.2, .7, .4, 1) var(--gd, 0s) forwards;
}
@keyframes gConfFall {
  0% { opacity: 1; transform: translate(-50%, -50%) scale(1) rotate(0deg); }
  100% { opacity: 0; transform: translate(calc(-50% + var(--gx)), calc(-50% + var(--gy))) scale(0.3) rotate(220deg); }
}

.auth-google-btn.is-success .g-ring {
  animation: gRingExpand 0.6s ease-out forwards;
}
@keyframes gRingExpand {
  0% { opacity: 0.9; transform: scale(0.8); }
  100% { opacity: 0; transform: scale(1.35); }
}
```

#### ⚙️ JavaScript
```javascript
async function onGoogleLoginSuccess(googleBtn, googleText) {
  googleBtn.classList.remove('is-loading');
  googleBtn.classList.add('is-success');
  if (googleText) googleText.textContent = '¡Sesión iniciada con éxito! 🎉';
  
  // Pausa para disfrutar la animación de confetis y check
  await new Promise(r => setTimeout(r, 850));
  
  closeAuthModal();
}
```

---

## 🎨 Guía de Personalización Rápida

### 1. Paletas de Color para Botones (`.sbtn`)
Puedes crear nuevos estilos de botones cambiando únicamente 3 variables CSS:

| Tema | `--c1` (Gradiente Superior) | `--c2` (Gradiente Inferior) | `--sh` (Color de Sombra) |
| :--- | :--- | :--- | :--- |
| **Esmeralda / Éxito** | `#3ecf6d` | `#18a353` | `rgba(24, 163, 83, .55)` |
| **Zafiro / Acción** | `#60a5fa` | `#2563eb` | `rgba(37, 99, 235, .55)` |
| **Ámbar / Alerta** | `#fcd34d` | `#f59e0b` | `rgba(245, 158, 11, .55)` |
| **Coral / Peligro** | `#ff8a50` | `#f04f1c` | `rgba(240, 79, 28, .55)` |
| **Violeta / Especial**| `#a78bfa` | `#7c3aed` | `rgba(124, 58, 237, .55)` |
| **Rosa / Amor** | `#f472b6` | `#db2777` | `rgba(219, 39, 119, .55)` |
| **Obsidiana / Dark** | `#374151` | `#111827` | `rgba(17, 24, 39, .6)` |

#### Ejemplo de uso:
```html
<button class="sbtn" style="--c1:#f472b6; --c2:#db2777; --sh:rgba(219,39,119,.55);">
  <span class="lbl">Botón Rosa Personalizado</span>
</button>
```

### 2. Modificar la Sensación de Rebote
- **Más elástico / juguetón**: `cubic-bezier(.34, 1.8, .64, 1)`
- **Más sobrio / empresarial**: `cubic-bezier(.16, 1, .3, 1)`
- **Extra suave**: `cubic-bezier(.25, .8, .25, 1)`


