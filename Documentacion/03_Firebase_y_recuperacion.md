# Firebase, recuperación y validación

## Rutas de datos

| Ruta | Contenido |
| --- | --- |
| `stream/tienda/items/sobre` | Producto canónico: nombre, precio, disponibilidad e imágenes. |
| `stream/widgets/tcg/config` | XP por repetida, cooldowns, duraciones y límites. |
| `stream/widgets/tcg/catalog` | Las 100 cartas publicadas para los sorteos. |
| `stream/widgets/tcg/control/jobs/{id}` | Cola persistente de compras y colecciones. |
| `stream/widgets/tcg/control/active` | Propietario, token y vencimiento del turno visual. |
| `stream/widgets/tcg/control/cooldowns/{usuario}` | Última solicitud admitida del usuario. |
| `stream/widgets/tcg/control/nextStartAt` | Momento mínimo para iniciar la siguiente solicitud. |
| `stream/usuarios/{usuario}/tarjetas` | Inventario y estadísticas personales. |
| `stream/usuarios/{usuario}/tarjetas/compras/{id}` | Recibo con las cartas, gasto y XP confirmados. |
| `stream/usuarios/{usuario}/tarjetas/entregasPendientes` | Recibos que todavía deben completar su animación. |
| `stream/tienda/transacciones/{id}` | Entrada de la compra en el historial de la tiendita. |

El inventario contiene `inventario/{numero}/cantidad`, `porRareza`, `unicasPorRareza`, `totalCartas`, `cartasUnicas`, `repetidas`, `sobresComprados`, `xpRepetidas`, `ultimas` y `ultimasPorRareza`. Se guardan cinco adquisiciones recientes por cada rareza, además de las cinco generales; una rara antigua no desaparece del filtro por comprar muchas comunes después.

## Confirmación de una compra

1. Se reserva espacio en la cola mediante una transacción compartida.
2. Se leen el catálogo, producto y configuración vigentes en Firebase.
3. Se sortean una sola vez las tres cartas de cada sobre, fuera del callback que Firebase puede reintentar.
4. Una transacción sobre el perfil descuenta puntos, incrementa el inventario, calcula repetidas y XP, actualiza el nivel y guarda el recibo y su entrega pendiente.
5. El recibo se publica en la cola con el mismo identificador. Un fallo en este paso se recupera desde la entrega pendiente del perfil.

Reintentar un recibo no vuelve a descontar puntos ni a otorgar cartas. Las animaciones solo reciben los números de las cartas del recibo y nunca vuelven a sortear el premio.

El estado de conexión se obtiene con el observador de `.info/connected`. No se consulta ese dato local mediante `get()`: con el SDK 10.8.0, esa consulta al servidor puede devolver `Invalid token in path` e impedir el pago. La transacción también mantiene un observador del dato mientras se confirma, para que el primer callback disponga del perfil en caché. Firebase [documenta que el callback puede recibir inicialmente `null`](https://firebase.google.com/docs/database/web/read-and-write#save_data_as_transactions) aunque el perfil exista en el servidor.

## Entrega y apertura

Los estados son `reserved` → `ready` → `delivering` → `awaiting_open` → `opening` → `done`. Las colecciones usan `ready` → `showing` → `done`.

La fuente Tiendita es la única que toma el turno de entrega. La fuente Tarjetero toma el de apertura después de que el mesero se haya retirado por completo. Cada turno tiene un token y un vencimiento de 30 segundos, renovado cada cinco segundos mientras se reproduce. Una segunda fuente no puede confirmar el trabajo de la primera con otro token.

Durante `delivering`, el tarjetero prepara la pila de sobres en su zona compacta y confirma `presentationReadyAt` en ese mismo trabajo de Firebase. La tiendita espera brevemente esa confirmación antes de mostrar al mesero; si llega, oculta sus propias imágenes de sobres y deja que el tarjetero las conserve durante la retirada de la mesa. Si no llega, muestra la entrega habitual. La apertura sigue necesitando el turno exclusivo `awaiting_open` → `opening`; preparar imágenes no concede cartas ni vuelve a sortear el premio.

Si una fuente se cierra, el turno vence y otra puede recuperar la solicitud. Las aperturas ya terminadas de una compra múltiple tienen un punto de control. Una interrupción justo antes de guardar ese punto puede repetir la animación del mismo premio; no repite el cobro, las cartas ni la XP.

Para compras de más de cinco sobres se guarda `packIndex` después de cada diapositiva. Al recuperar el turno, se reconstruye la pila de cartas ya mostradas y se continúa desde el siguiente trío. Al terminar, todas las cartas salen juntas y se confirma el recibo una sola vez.

Los recibos pagados no caducan por estar en espera. Si no hay una fuente de tarjetero activa, permanecen esperando apertura. Las reservas que nunca llegaron a pagarse se cancelan después de dos minutos, tras comprobar que no existe un recibo.

## Puesta en marcha y límites de confianza

El sitio debe servir los archivos nuevos de `mini_widgets/js/` y `laboratorio/`. Los estilos, el carrusel, las animaciones y el consumidor de la cola están dentro de `laboratorio/tarjetero.html`; el motor de sorteos y el servicio de compras siguen compartidos con la tiendita. La versión modular anterior se conserva sin ejecutar en `laboratorio/tarjetero_modular_respaldo.txt`. La inicialización crea los nodos de configuración, catálogo y producto solo si no existen; no sobrescribe ajustes ya guardados.

El archivo `database.rules.json` añade el índice `tarjetas/pendiente` a los usuarios para recuperar entregas sin consultar todos los perfiles. Publicar ese índice mejora la consulta. La integración conserva el modelo de permisos de la instalación actual; no añade autenticación de compras a nivel de servidor ni cambia las reglas generales del resto de widgets. Los administradores deben mantener controlado quién puede escribir en los nodos de economía.

La configuración, saldo, inventario, recibos, cooldowns y cola del sistema nuevo se consultan en Firebase. No se usa `localStorage` ni BroadcastChannel como fuente de verdad. El puente visual con los otros widgets existentes puede usar su coordinador anterior para respetar los turnos de tienda, banco y perfil.

## Pruebas

Ejecutar desde la raíz del proyecto:

```text
node --test laboratorio/tests/tarjetero_sobres.test.cjs laboratorio/tests/tcg_comercio.test.cjs laboratorio/tests/tcg_firebase_adapter.test.cjs
```

Las pruebas cubren probabilidades, repetidas, XP, cobro idempotente, compras de seis sobres, dos clientes simultáneos, saldo insuficiente, recuperación tras interrupción, turnos exclusivos, cooldowns compartidos, filtros, capacidad de la cola y la comprobación de conexión del adaptador Firebase. Las pruebas de navegador usan perfiles y una base de pruebas aislada: no descuentan puntos a usuarios reales.
