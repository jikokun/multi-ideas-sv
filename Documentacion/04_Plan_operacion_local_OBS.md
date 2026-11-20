# Plan de operación local en OBS y sincronización con Firebase

## Usar el modo híbrido en OBS

El modo implementado sirve el contenido visual desde la PC de OBS y mantiene los saldos, los usuarios, las compras y las cartas sincronizados en Firebase durante el directo.

1. Ejecutar `npm run obs:prepare` para guardar en disco las fuentes, bibliotecas y recursos estáticos externos. Repetirlo al actualizar esos recursos.
2. Ejecutar `npm run obs:local`. El servidor escucha en `127.0.0.1:8765` y su página inicial lista las fuentes disponibles.
3. En OBS, abrir las fuentes por URL. Usar el mismo origen `http://127.0.0.1:8765` para la Tiendita, el Tarjetero, JikoBank, Casino y las escenas. Así pueden compartir el estado visual a través de BroadcastChannel y localStorage.

El servidor reconoce los nombres originales de las carpetas de Drive en `imagenes/`. Los dos directorios y la caché `.obs-local/` están excluidos de Git. Las escenas mantienen sus integraciones en directo, como Kick, Streamer.bot, Botrix y Spotify, según la configuración de cada fuente.

El tarjetero recupera reservas mediante el ID de su recibo. Las compras consultan los productos solicitados y reutilizan el catálogo de cartas que ya están observando. Los saldos y avatares de los widgets consultan campos concretos. Las transacciones que modifican varios datos de un perfil conservan su comprobación atómica en Firebase.

La asistencia automática y la permanencia se guardan en el almacenamiento persistente del navegador de OBS. Las fuentes locales comparten el tiempo de actividad para evitar acreditar los mismos minutos dos veces. Los eventos se agrupan por usuario y se sincronizan cada dos minutos, al recuperar conexión o al detectar el cierre del directo. Si se cierra OBS con eventos pendientes, se recuperan al volver a abrir una fuente local que use StreamDB, como la Tiendita o el widget de perfil. Los puntos quedan disponibles en el saldo al confirmarse en Firebase. La lista de asistencia muestra los registros pendientes durante esa espera.

La fuente de celebración de subs está en `http://127.0.0.1:8765/laboratorio/widget_celebracion_subs.html`. Lee el donante del evento de Streamer.bot y muestra «Regalada por» o «Regaladas por» debajo de SUB o SUBS. Un envío personalizado puede incluir `userName` y la cantidad en `count` o `gifts`. [Evento de regalos de Kick en Streamer.bot](https://docs.streamer.bot/api/websocket/events/kick/mass-gift-subscription)

## Diseño previo con SQLite y sincronización al cierre

La PC de OBS cargaría los overlays, las imágenes, los sonidos y los efectos desde su propio disco. Durante el directo, esa misma PC procesaría los Jikopuntos, las compras, los sobres, el casino y JikoBank. Firebase recibiría los cambios al finalizar la transmisión y enviaría las novedades antes de la siguiente. En la auditoría, una sola escucha de sobres pendientes llegó a solicitar **1,10 MB** de perfiles. La propuesta elimina esa lectura desde OBS y evita que cada apuesta o recompensa dependa de consultar un perfil en la nube. [Flujo actual de sobres y recuperación](03_Firebase_y_recuperacion.md)

## Cómo abrir los overlays desde la PC de OBS

Un servicio Node.js en la PC serviría las páginas y los archivos desde `http://127.0.0.1:8765`. En OBS se configuraría cada **Fuente de navegador** con su URL local, por ejemplo `http://127.0.0.1:8765/mini_widgets/tiendita.html?overlay=true` para la tienda o `http://127.0.0.1:8765/laboratorio/tarjetero.html?obs=true` para las cartas. El mismo servidor ofrecería una API local para consultar el estado y recibir avisos. Cuando OBS vuelva a abrir una fuente, esta recuperaría el estado del servidor local. [Fuentes de navegador de OBS](https://obsproject.com/kb/browser-source)

- **ModoChat, Modo Mimir, Escena Inicial y Modo Juegos.** Empaquetar el HTML, CSS, JavaScript, fondos, fuentes, alertas, sonidos y efectos usados. Alimentar el chat y las alertas con Streamer.bot o un único conector de Kick. Las etiquetas que hoy usan Botrix se podrían dibujar localmente a partir de eventos. Kick sigue necesitando internet para entregar el chat y los eventos del directo. Spotify seguiría dependiendo de su servicio cuando se use para reproducción o metadatos.
- **Tiendita, tarjetero y perfil.** Guardar en disco las fotos de los productos, el mesero, el arte de los sobres, las portadas y reversos de las 100 cartas y los fondos de perfil. Cada producto o carta tendría un ID asociado a una ruta local en el catálogo. Los avatares dinámicos usarían una copia local preparada antes del directo o una imagen incluida en el paquete.
- **Casino, JikoBank y estadísticas.** Las páginas leerían del mismo servidor local los saldos, las apuestas, los préstamos, la asistencia y el estado del directo. En el modo OBS, los paneles también consultarían ese servidor.

Preparar un paquete versionado con una lista de archivos y sus hashes. Los recursos que hoy estén en Drive o en un CDN se descargarían al instalar o actualizar el paquete, antes de emitir. Una comprobación previa marcaría los archivos faltantes. Durante el directo, una imagen faltante usaría un recurso de reserva incluido en el paquete, con un aviso para corregirla después.

## Datos que se guardan y se sincronizan

**SQLite** sería la base local. El servicio de la PC de OBS sería el único que modifica los saldos, inventarios y colas de esa sesión. Las fuentes le enviarían comandos y recibirían avisos breves, como «pedido listo» o «mostrar cartas». La base y sus copias se guardarían fuera de la carpeta de archivos que sirve el navegador. [Transacciones y concurrencia en SQLite](https://www.sqlite.org/wal.html)

| Área | Información que se enviaría a Firebase |
| --- | --- |
| Usuarios y Jikopuntos | ID, datos de perfil que cambiaron, saldo, XP, y movimientos confirmados con su ID y motivo. |
| Tienda y asistencia | ID del pedido, usuario, IDs y cantidades de productos, costo, cambios de stock limitado y asistencias confirmadas. |
| Sobres y colección | ID de la compra, usuario, cantidad de sobres y cartas por ID, rareza y cantidad. También se guardan la XP, la confirmación de entrega y los datos de adquisición recientes que usa `!mostrarcartas`. |
| Casino y JikoBank | Apuestas, premios, devoluciones, transferencias y préstamos confirmados. Cada registro incluye el ID de operación y los importes para conciliar los saldos. |
| Transmisión | ID del directo, inicio, cierre y totales de actividad necesarios para el historial. |

Los archivos multimedia y la cola de animaciones permanecerían en disco. En Firebase, los saldos y resúmenes por usuario tendrían rutas pequeñas. Los recibos quedarían accesibles por su ID en rutas separadas del perfil, para poder consultar un saldo con una lectura pequeña. La tienda y el tarjetero compartirían el mismo recibo local. Al comprar se guardarían en una sola transacción el cobro, el resultado del sorteo, el inventario y el evento pendiente de sincronizar. Si OBS se recarga en mitad de la presentación, el servicio recuperaría el mismo premio y el último sobre confirmado. [Entrega, apertura y recuperación actual](03_Firebase_y_recuperacion.md)

## Cuándo se sincroniza

| Momento | Operación |
| --- | --- |
| **Primera instalación** | Crear una copia verificable de los datos actuales. Importar los usuarios, saldos, inventarios, préstamos, stock y entregas pendientes a SQLite. Comparar los totales con Firebase antes de habilitar el cobro local. |
| **Antes del directo** | Completar el envío pendiente de la sesión anterior. Descargar los cambios desde la última versión confirmada y validar el paquete de recursos. Después, abrir la sesión y asignar a la PC de OBS el control de los puntos y las colecciones. |
| **Durante el directo** | Resolver comandos, partidas, compras, sorteos, estadísticas y animaciones en la PC de OBS. SQLite guarda cada operación aceptada y la añade a una cola persistente. La sincronización automática espera al cierre. |
| **Al finalizar** | Cerrar la recepción de comandos, consolidar los datos y enviar los cambios en lotes. Firebase confirma cada lote con su identificador y la revisión aplicada. La computadora conserva los lotes pendientes hasta recibir el acuse. El panel muestra la última revisión confirmada y la cantidad de cambios pendientes. |

Una web o app Android podría mostrar el último saldo publicado con su fecha de actualización. Si se mantiene la opción de comprar o modificar saldos desde fuera de OBS, esos cambios entrarían como solicitudes para que la PC que tiene el control los procese. Cuando esa sesión esté cerrada y confirmada, se podría devolver el control a la nube. Esto evita que ambas partes puedan gastar el mismo saldo.

## Recuperación y consistencia

- **Reintentos.** Cada evento tiene un ID estable y cada lote tiene un orden dentro de la sesión. El publicador autenticado valida la revisión esperada y registra el acuse junto con los cambios. Si se pierde la respuesta y se repite el lote, devuelve el acuse existente. Esto protege las compras, los premios y las operaciones entre dos usuarios. [Actualizaciones atómicas en Firebase](https://firebase.google.com/docs/database/web/read-and-write#update_specific_fields)
- **Interrupciones.** Si se reinicia OBS, se recupera el estado del servicio. Si se reinicia la PC, se reabre SQLite y se retoma la cola. Si se corta internet, el estado local sigue disponible y el servicio reintenta el envío pendiente después del cierre cuando regrese la conexión. Antes de abrir una nueva sesión de cobros, se comprueba que la anterior tenga un cierre confirmado o se recupera explícitamente esa misma sesión.
- **Copias.** Generar una copia consistente de SQLite al cierre y conservarla en un segundo disco si está disponible. La recuperación ante pérdida del disco depende de la última copia recuperable o del último lote confirmado en Firebase. El acceso de sincronización vive en el servicio local, fuera de los HTML y JavaScript que carga OBS. [Copias de seguridad de SQLite](https://www.sqlite.org/backup.html)

## Orden propuesto para la implementación

1. **Validar un paquete local.** Probar una colección de escenas de OBS con recursos en disco, incluidos el arte de los 100 naipes, los productos y las dependencias visuales. Verificar que se abran las escenas y corran los efectos con el acceso a servicios externos bloqueado durante la prueba.
2. **Probar tiendita y tarjetero con puntos de ensayo.** Encadenar un pedido, la animación del mesero y la apertura de sobres. Probar que al recargar OBS se mantiene la compra, se revela el mismo premio y se confirma una sola vez.
3. **Añadir Jikopuntos, casino, JikoBank y estadísticas.** Procesar los comandos de chat desde una sola entrada para los cambios de saldo. Probar premios, asistencia, regalos, stock limitado, devoluciones y préstamos, incluido el reenvío de un comando.
4. **Ensayar la sincronización con una base de pruebas.** Comparar inventarios y saldos antes y después. Cortar la red antes y después de que Firebase acepte un lote, volver a enviarlo y verificar que cada cambio se aplique una vez. Probar también la recuperación desde una copia.
5. **Hacer un directo piloto.** Mantener una colección de escenas para regresar a la configuración anterior. Si se necesita volver, cerrar primero el cobro local y conciliar los movimientos y las entregas pendientes con los IDs originales antes de habilitar el cobro en la nube.

## Cómo comprobar el ahorro

- **Fuentes de OBS.** Durante el piloto, registrar el tráfico de las fuentes locales y comprobar **cero consultas directas de OBS a Realtime Database** y **cero solicitudes externas para los recursos visuales y sonoros incluidos en el paquete**.
- **Sincronización.** Medir los bytes de la preparación y el cierre, además del tamaño de los lotes. Una recarga de escena y una jugada deben aparecer en el servidor local. Las compras, los saldos y las cantidades de cartas deben coincidir tras el cierre.
- **Proyecto Firebase.** Comparar `network/sent_bytes_count` antes y después en dos directos de duración y actividad parecidas, incluyendo las ventanas de sincronización. Revisar también el total diario frente a **360 MB**, porque otras aplicaciones del mismo proyecto pueden aportar tráfico. [Métricas de Firebase](https://firebase.google.com/docs/database/usage/monitor-usage) · [Tarifas de Firebase](https://firebase.google.com/pricing)

## Decisiones para revisar

- **Horario.** La versión inicial sincronizaría antes y después del directo. Un envío manual durante un directo largo quedaría como opción si se prefiere reducir la cantidad de cambios que dependen de una sola copia local.
- **Web y Android.** Definir si durante el directo mostrarán el último estado publicado o también admitirán solicitudes que procesará la PC de OBS.
- **Alertas y música.** Elegir qué integraciones externas conservar durante el directo y cuáles pasar a eventos y recursos locales.
