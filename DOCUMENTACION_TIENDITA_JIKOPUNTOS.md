# 🏪 DOCUMENTACIÓN TÉCNICA Y LÓGICA DEL SISTEMA: TIENDITA DE JIKO & JIKOPUNTOS

> **Archivo del Widget:** [tiendita.html](file:///e:/Proyectos%20Web/multi-ideas-sv/mini_widgets/tiendita.html)  
> **Panel de Pruebas & Control:** [prueba.html](file:///e:/Proyectos%20Web/multi-ideas-sv/prueba.html)  
> **Última Actualización:** Octubre 2026  
> **Versión:** 2.0 (Sistema de Turnos, Platos en Mesa, Asistencia Lobito & Carrusel Vertical)

---

## 📌 1. RESUMEN EJECUTIVO Y PROPÓSITO
La **Tiendita de Jiko** es un widget interactivo para streaming (OBS Studio / Kick / Streamer.bot) que recrea un puesto de comida rápida tradicional y sci-fi con temática verde neón de Kick y madera rústica. Permite a los espectadores canjear productos con su saldo de **Jikopuntos**, gestionar turnos en vivo, armar pedidos múltiples (hasta 10 platos), ver a un mesero animado servir la comida sobre la mesa, y registrar la asistencia de la transmisión con premios automáticos.

---

## 🎨 2. IDENTIDAD VISUAL Y ESTILOS (DESIGN SYSTEM)

### Variables CSS y Colores
- `--kick: #53fc18`: Verde neón característico de Kick.
- `--kick-soft: #b4ff8a`: Verde suave para resaltados e iluminación secundaria.
- `--kick-dim: rgba(83,252,24,.16)`: Resplandor sutil de fondo.
- `--oro: #ffd35c`: Dorado brillante para precios, monedas y rangos VIP.
- `--rojo: #ff5c6c`: Rojo advertencia para cancelaciones o errores.
- `--tinta: #eaffea`: Tipografía clara de alto contraste.
- `--apagado: #8fa88f`: Textos secundarios y metadatos.
- `--madera-1..3: #7a5230, #5a3a1e, #3c2611`: Gradientes oscuros estilo mostrador rústico.
- **Tipografías:**
  - Display: `'Unbounded'` (Google Fonts) para títulos de neón y badges.
  - Cuerpo: `'Chakra Petch'` (Google Fonts) para comandos, botones y saldo.

### Componentes de Interfaz
1. **Toldo a rayas (`.awning` & `.scallops`)**: Toldo superior rayado en verde neón y verde oscuro con festones curvos.
2. **Cuerpo del mostrador (`.shop-body`)**: Madera sci-fi con borde de 3px y resplandor neón exterior.
3. **Letrero Colgante ABIERTO (`.open-sign`)**: Animación de balanceo continuo mediante péndulo CSS.
4. **Alerta de Turno (`#turn-alert`)**: "Espera tu turno @usuario", aparece arriba del mostrador con sacudida si otro usuario intenta operar.
5. **Barra de Cuenta Regresiva (`#cd-bar`)**: Indicador de tiempo restante de la sesión activa del usuario.

---

## 💰 3. ECONOMÍA Y CATÁLOGO DE PRODUCTOS (44 ÍTEMS)

### Regla Económica de Precios
- **Piso Mínimo:** Ningún producto cuesta menos de **120 Jikopuntos** (para balancear espectadores con más de 5,000 a 10,000 puntos).
- **Rango de Precios:**
  - **120 – 140 pts:** Bebidas básicas y acompañamientos (Vaso de Agua: 120, Galleta: 130).
  - **145 – 165 pts:** Cafés, sodas, tés, jugos y postres (Café: 145, Horchata: 150, Coca-Cola: 150, Matcha: 155, Papitas: 160).
  - **170 – 185 pts:** Comida típica callejera (Pastelitos: 170, Tamal: 180, Yuca Frita: 180, Arepita: 180, Tequeyoyo: 185).
  - **190 – 230 pts:** Bebidas alcohólicas y platillos fuertes (Hot Dog: 190, Cerveza: 190, Pupusas: 200, Guarito: 210, Salchipapa: 210, Burrito: 220, Vinito: 230).
  - **240 – 280 pts:** Hamburguesa (250), Sopita (240), Pollo Frito (280).
  - **320 pts:** Platillo insignia premium (Pabellón Criollo).

### Soporte de Aliases en Comandos
Cada ítem cuenta con sinónimos normalizados para que el chat pueda ordenarlo de forma natural (ejemplo: `!arepa`, `!arepas`, `!tequeño`, `!empanada`, `!matchalatte`, `!cerveza`).

---

## 🛒 4. FLUJO DE ATENCIÓN Y SISTEMA DE TURNOS

```mermaid
stateDiagram-v2
    [*] --> Cerrada: Estado Inicial / Espera
    Cerrada --> Abierta: Comando !tienda / !tiendita / !menu
    Cerrada --> CooldownRechazo: Intento durante Cooldown Global (Bloqueado)
    
    state Abierta {
        [*] --> EsperandoAccion: Inicializa Temporizador (40s)
        EsperandoAccion --> RotandoCatalogo: Comando !rotar / flechas (+5 platillos, renueva tiempo)
        EsperandoAccion --> ItemAgregado: Comando de producto (ej. !pupusas 2)
        ItemAgregado --> EsperandoAccion: Agrupa en bandeja (hasta 10 platos)
        EsperandoAccion --> OrdenCancelada: Comando !cancelar
        EsperandoAccion --> Pagando: Comando !comprar / !pagar
    }

    Abierta --> Cerrada: Se agota el tiempo (Auto-cierre) o !cancelar con orden vacía
    Abierta --> TurnoBloqueado: Otro usuario intenta comprar (Alerta "Espera tu turno")
    TurnoBloqueado --> Abierta: Se mantiene la sesión del usuario actual

    Pagando --> MeseroSirviendo: Saldo suficiente (Deducción de puntos)
    Pagando --> EsperandoAccion: Saldo insuficiente (Alerta de error)
    
    MeseroSirviendo --> CooldownGlobal: Tras 9s de exhibición de platos
    CooldownGlobal --> Cerrada: Listo para el siguiente espectador
```

### Reglas de Turno
1. **Regla de Exclusividad:** Solo **1 usuario a la vez** puede tener el mostrador abierto. Si otro usuario envía comandos, se dispara la alerta `#turn-alert` indicando quién tiene la tienda ocupada.
2. **Regla de Tienda Cerrada:** Si la tienda está cerrada, no se pueden comprar productos directamente; el usuario debe escribir obligatoriamente `!tienda` o `!tiendita` primero para acercarse al mostrador.
3. **Renovación de Tiempo:** Cada vez que el usuario activo agrega un plato o usa `!rotar`, su tiempo en la tienda se renueva automáticamente.
4. **Cooldown Global (`COOLDOWN_GLOBAL_MS`):** Tras cerrarse o entregarse una orden, se activa un tiempo de recarga para evitar saturación de pantalla.

---

## 🍽️ 5. ARQUITECTURA DE LA BANDEJA Y ESCENA DEL MESERO

### Bandeja de Pedidos (`#order-tray` & `#confirm-box`)
- Permite almacenar hasta **20 platos** en la misma mesa (`MAX_ORDEN_ITEMS = 20`).
- Agrupa productos idénticos en fichas con contador (`x2`, `x3`, ..., `x20`), precio acumulado y botón de eliminar (`✕`).
- Admite cantidades por comando de chat: `!pupusas 3`, `!tamal x5`, `!comprar cafe 2`.
- El total se actualiza en vivo y valida si el saldo del usuario alcanza antes de permitir el cobro.

### Escena de Entrega del Mesero (`mostrarMeseroEntrega`)
- Se activa al pagar exitosamente (`!comprar` o botón "Pagar Todo").
- Suena la campana de servicio (`playSfx('serve')`).
- La tienda se oculta y entra la escena limpia del mesero (`mesero.png`) con la mesa servida.
- **Escalado Proporcional y Adaptativo (1 a 20 Platillos):**
  - **1 solo ítem (`.modo-solo`):** Ocupa una posición central imponente y apetitosa (hasta 245px de alto y 370px de ancho con sombra 3D profunda), evitando que quede pequeño o perdido en la mesa.
  - **2 ítems (`.modo-duo`):** Distribución amplia en primer plano (hasta 210px de alto y 295px de ancho).
  - **3 ítems (`.modo-trio`):** Trío armónico que llena la superficie de la mesa (hasta 190px de alto y 250px de ancho).
  - **4 ítems (`.modo-cuarteto`):** Cuarteto equilibrado en fila delantera (hasta 170px de alto y 205px de ancho).
  - **5 a 20 ítems (`.modo-banquete`):** Se distribuyen equitativamente en **2 filas** (fila trasera con perspectiva lejana escalada y fila delantera en primer plano), reduciendo el tamaño de forma gradual desde 175px hasta 82px según la densidad de platos para encajar perfectamente sin desbordar la mesa de madera.
- Tras **9 segundos**, el mesero se retira suavemente (`.saliendo`) y activa el cooldown global.

---

## 🐺 6. SISTEMA DE BIENVENIDA (+500 PTS) Y LISTA DE ASISTENCIA (`!pasarlista`)

### Bienvenida Automática de Lobito Mensajero
- **Detección en tiempo real:** Intercepta en el chat el mensaje generado por el bot:
  ```text
  Gracias por estar aquí $(name)!
  ```
- **Filtro inteligente:** Se ejecuta **antes** del filtro de bots para no descartar el mensaje del bot y extraer correctamente al espectador recibido.
- **Bonificación:** Otorga automáticamente **+500 Jikopuntos** al espectador recién llegado.
- **Prevención de duplicados:** Cada usuario solo recibe la bonificación de asistencia **1 vez por transmisión**.
- **Persistencia:** Almacena los registros en `localStorage` con la clave `tiendita_asistencia_stream_v1` durante **18 horas** (para sobrevivir a recargas de fuente en OBS).
- **Sincronización con Streamer.bot:** Envía una acción `DoAction` con nombre `Tiendita_AsistenciaRegistrada`.

### Tarjeta de Asistencia (`!pasarlista`)
- **Comando:** `!pasarlista` (Único y exclusivo para `@Jikokun` o `broadcaster`; `!lista` se mantiene independiente para OBS/música).
- **Duración:** Permanece visible en pantalla durante exactamente **1 minuto (60 segundos)** con barra de progreso regresiva (`#pl-timer-bar`).
- **Límite Visual:** Diseñado para mostrar un **máximo de 3 usuarios visibles a la vez** (`height: 156px`). La alerta completa mide solo ~285px de altura total y ocupa menos del **6% del área de pantalla en 1080p** (cumpliendo con la regla de no ocupar más de un cuarto de pantalla).
- **Carrusel Vertical Infinito:** Si hay **más de 3 asistentes**, se activa automáticamente el carrusel vertical continuo (`.is-carousel` y `.pl-carousel-group.animating`), rotando a todos los espectadores de forma suave con máscara de difuminado superior e inferior y pausa al pasar el cursor.
- **Comandos de Administración:**
  - `!cerrarlista` / `!ocultarlista`: Cierra la tarjeta inmediatamente.
  - `!limpiarasistencia` / `!resetasistencia`: Reinicia el registro de asistentes de la sesión.
- **Detección de Transmisión:** Al recibir los eventos `StreamStarted` o `StreamOnline` desde Streamer.bot, la asistencia se reinicia automáticamente para el nuevo directo.

---

## ⭐ 7. CONSULTA DE SALDO FLOTANTE (`!jikopuntos`)
- **Comandos:** `!jikopuntos`, `!puntos`, `!saldo`, `!points`, `!misjikopuntos`.
- **Comportamiento:** Muestra una tarjeta compacta con avatar del usuario, saludo y su saldo actual durante 5.5 segundos.
- **Anti-solapamiento:** Si la tienda está abierta en la parte inferior, la tarjeta de jikopuntos sube automáticamente (`.card-jikopuntos.arriba`) para no tapar los productos.

---

## 🔊 8. EFECTOS DE SONIDO WEB AUDIO (SFX)
Generados mediante osciladores matemáticos nativos (sin archivos externos pesados):
- `'open'`: Tono ascendente senoidal para aperturas de tarjetas.
- `'select'`: Chime agudo senoidal para añadir ítems o rotar vitrina.
- `'buy'`: Arpegio en triángulo (F#5 a A5) para cobro de compras.
- `'serve'`: Campana doble de restaurante (C6, E6, C7) con caída suave al servir platos.
- `'error'`: Tono grave en diente de sierra (180Hz a 120Hz) para turnos ocupados o saldo insuficiente.

---

## 🔌 9. PROTOCOLO WEBSOCKET & STREAMER.BOT

### Conexión
- URL por defecto: `ws://127.0.0.1:4445/` (configurable con parámetro `?port=XXXX`).
- Suscripción automática a eventos de Kick y Twitch (`ChatMessage`).

### Acciones Enviadas a Streamer.bot (`DoAction`)
1. `Tiendita_ConfirmarCompra`: Envía comprador, lista de platos, claves, costo total y nuevo saldo.
2. `Tiendita_AsistenciaRegistrada`: Envía usuario saludado por Lobito, puntos ganados (+500), nuevo saldo y total de asistentes.
3. `Tiendita_RegalarPuntos`: Envía administrador, receptor, cantidad otorgada y nuevo saldo.

### Acciones Recibidas desde Streamer.bot
- `PasarLista` / `!pasarlista`: Despliega la tarjeta de asistencia de 60s.
- `IniciarTransmision`: Reinicia el registro de asistencia.
- Eventos de actualización de puntos en vivo.

---

## 🪟 10. PARÁMETROS URL PARA OBS STUDIO

| Parámetro | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `?overlay=true` | `false` | **Modo OBS Limpio:** Oculta barra flotante de pruebas y botones inferiores. |
| `?duration=XX` | `40` | Segundos antes de que el mostrador se cierre automáticamente si el usuario no interactúa. |
| `?port=XXXX` | `4445` | Puerto del WebSocket de Streamer.bot. |
| `?mute=true` | `false` | Silencia todos los efectos de sonido Web Audio. |
| `?preview=true` | `false` | Modo de previsualización en pestañas externas. |

---

## 🧪 11. COMANDOS EXTERNOS VÍA POSTMESSAGE (`prueba.html`)
El panel de pruebas [prueba.html](file:///e:/Proyectos%20Web/multi-ideas-sv/prueba.html) se comunica con el widget incrustado mediante `postMessage`:
- `BUY_ITEM`: Fuerza el pago de la orden actual.
- `CANCEL_ITEM`: Cancela o vacía la orden activa.
- `SELECT_ITEM`: Añade un ítem específico por clave (ej. `pupusas`, `pabellon`, `vasoagua`).
- `FEAST_10`: Simula una orden masiva de 10 platillos (prueba de 2 filas).
- `TRIPLE_ORDER`: Simula una orden triple de comida rápida.
- `TEST_OTHER_USER`: Simula intento de otro espectador para comprobar la alerta de turno.
- `RESET_COOLDOWN`: Restablece el cooldown a 0 segundos.
- `GIFT_POINTS`: Otorga +500 Jikopuntos de prueba.
- `PASAR_LISTA`: Abre la tarjeta de asistencia por 1 minuto.
- `CLOSE_PASAR_LISTA`: Cierra la tarjeta de asistencia.
- `SIMULATE_BOT_GREETING`: Simula el saludo de Lobito Mensajero para 1 espectador aleatorio (+500 pts).
- `SIMULATE_MANY_ATTENDEES`: Simula la llegada de 9 espectadores en cascada para probar el carrusel vertical.
- `RESET_ASISTENCIA`: Vacía la lista de asistencia del stream actual.
