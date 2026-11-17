# Navidad con la manada

Abrir `/laboratorio/` → **Overlays navideños** → **Abrir laboratorio navideño**,
o directamente `/overley_navideños/`. El panel no inicia conexiones hasta cargar
una vista previa; mantiene una sola escena activa. **Pausar vista previa** descarga
la escena y libera sus conexiones y animaciones.

## Escenas para OBS

Crear una fuente **Navegador** de **1920 × 1080** para cada URL copiada desde el panel:

- `escena_inicial_integrada.html`: cuenta regresiva, chat Kick, reloj y visualizador
  Spotify con los comandos y la moderación de la escena inicial actual.
- `modochat_integrado.html`: cámara 16:9, chat, isla Spotify, alertas y cuatro etiquetas
  Botrix con sus direcciones originales.
- `modojuego_integrado.html`: usa como base `mini_widgets/marcocamara1.html`, con el
  mismo marco de **460 × 259**, situado a **50 px del borde superior y derecho**
  del lienzo Full HD, y su nombre montado en el borde inferior. Conserva los controles
  de formato y etiqueta del marco original (tecla C); se abre en modo limpio.
  El marco incluye bolitas estáticas con reflejos, un pinito pequeño en la esquina,
  nieve sobre el nombre, pequeñas acumulaciones estáticas en las dos esquinas
  inferiores del lienzo y luces superiores con opacidad al 100 % y halos leves. La estrella del pino se
  ilumina durante 1,1 segundos al recibir chat de Kick por el WebSocket existente;
  no se crean burbujas ni mensajes ocultos. Ignora bots y eventos duplicados.
  La tira inferior gira con las cuatro fuentes Botrix originales: seguidor, sub,
  sub regalada y kicks. Aparece **60 segundos**, se oculta **900 segundos** y repite
  ese ciclo de 16 minutos. Comienza visible al cargar la fuente y se recalcula con
  reloj real al reactivar OBS. No incluye chat, alertas ni reproductor visible.
  La cuadrícula del panel representa la transparencia y no forma parte de la fuente.
- `modomimir_integrado.html`: cierre con logo, chat y reloj de El Salvador. La esfera
  dorada y el árbol sustituyen visualmente el ambiente nocturno.

En inicio, chat y mimir, el árbol reacciona a mensajes y avisos visibles. Añade hasta 24 adornos y
enciende tres regalos al alcanzar 4, 8 y 12 adornos; después sigue iluminando la
estrella sin acumular nodos. Cada carga comienza un árbol nuevo. Un clic sobre el
árbol alterna sus luces; el panel permite probar la reacción y reiniciar los adornos.
Las pruebas sólo afectan a la vista previa y no envían mensajes al chat real.
En juego, sólo reacciona la estrella: el cuerpo del pino y las bolitas permanecen
quietos. El panel permite probarla con **Probar estrella con chat** y mostrar u
ocultar el pinito. El conector filtra comandos por defecto, igual que inicio;
`filterCommands=false` también permite que los comandos iluminen la estrella.

## Nieve y luces musicales

Inicio, chat y mimir tienen nieve acumulada en la base y pequeñas ventiscas.
La nieve compactada usa un contorno irregular, sombras frías, pequeños pliegues y
grano fino. `nieve.js` la pinta una sola vez en un lienzo local; no genera textura
en cada fotograma ni carga imágenes externas.
El viento y la velocidad de caída varían con suavidad según BPM, energía y pulsos
musicales. La cantidad de copos no aumenta con la música; los cambios de velocidad
y brillo están limitados para evitar saturación. Juego conserva la nieve en
el nombre y en las esquinas inferiores; no hay nieve en movimiento sobre la partida.

`musica.js` lee BPM, posición y eventos de beat de **Tuna OBS**, **Streamer.bot** y
el canal existente `spotify_overlay_channel`. Chat y mimir también comparten los
resultados de sus consultas Spotify actuales; inicio y juego pueden completar la
señal con consultas Spotify de sólo lectura. Se prioriza la reproducción local.
Cuando Spotify permite Audio Features, se usa su tempo y energía; las estimaciones
por nombre de canción del marco antiguo no se presentan como mediciones.
Las guías alternan cuatro secuencias suaves: turnos de color, barridos hacia ambos
lados, rebote y respiración de brillo. `luces.js` mezcla sus transiciones y adapta
la velocidad de todos los dibujos a los BPM y pulsos de la música que suena.
Su reloj integra la velocidad con suavidad: no salta de posición al cambiar de
canción o pausar. Sin reproducción, regresa a la velocidad automática normal.
El modo juego conserva esas secuencias con menos brillo y contraste.
Sin BPM ni pulsos disponibles, las secuencias continúan a su velocidad normal.
Al pausar o perder la señal desaparece el refuerzo musical. Luz fija, apagado y movimiento
reducido conservan sus comportamientos estables. No se capturan micrófono ni audio.

Chat y mimir añaden esferas rojas, verdes y doradas con volumen, reflejos de ventana,
sombras y microtextura. Se sitúan en cabeceras, márgenes y junto a la nieve,
detrás del contenido. No capturan clics ni modifican las zonas de cámara o chat.

El panel incluye **Ritmo suave**, **Ritmo movido** y, en juego, **Probar tira · 1 min**.
Las pruebas de ritmo duran 12 segundos y después recuperan la señal del directo.

## Parámetros

Se conservan los parámetros de las escenas base, incluyendo `ip`, `port`, `channel`,
`user`, `token`, `refresh`, `minutes` y `filterCommands` donde cada conector los admite.
Las cuatro variantes admiten `ip` y `port`, con los valores predeterminados
`127.0.0.1:4445`. `tunaport` indica el puerto del servidor Tuna (1608 por defecto).
Juego conserva además `aspect` / `ratio`, `tag` / `name`, `icon` y `notag` del marco.

Parámetros de presentación de las cuatro escenas:

| Parámetro | Valores | Predeterminado |
| --- | --- | --- |
| `snow` | `normal`, `light`, `off` | `normal` |
| `lights` | `twinkle`, `steady`, `off` | `twinkle` |
| `tree` | `on`, `off` | `on` |
| `treeLights` | `on`, `off` | `on` |
| `motion` | `on`, `off` | `on` |

Ejemplo: `modojuego_integrado.html?ip=127.0.0.1&port=4445&snow=light&lights=steady`.
Se respeta la preferencia del sistema de reducir movimiento. Las animaciones de
nieve se pausan cuando se oculta la página. Los ajustes del panel sólo se incorporan
a sus enlaces y a la vista previa; no sobrescriben preferencias de los otros overlays.

## Mantenimiento

Las escenas originales de `laboratorio/` y `mini_widgets/` permanecen intactas.
Inicio reutiliza sus CSS y JavaScript actuales. Chat usa `base_modochat.css/js`,
mimir usa `base_modomimir.css/js` y juego usa `base_camara.css/js`, extraídos de sus
bases originales. Se conservan
sus identificadores, conectores, reintentos, fuentes y comportamiento musical; los
efectos antiguos de partículas y rayos se sustituyen por `navidad.css/js`.
Los tokens fijos antiguos no se replican: las variantes usan URL, almacenamiento
local existente y el mismo servicio de renovación de Spotify.

El modo mimir conserva su alcance original (chat y reloj); no se han añadido
controles musicales visibles al cierre. La conectividad real requiere los servicios
habituales del directo disponibles. No hay datos simulados automáticos.

Los archivos web están incluidos en la lista pública de `scripts/build-cloudflare.mjs`.
Este README no se publica. Validación de rutas: `npm run test:cloudflare`.
Regresión de ritmo, prioridades y calendario de la tira: `npm run test:navidad`.
