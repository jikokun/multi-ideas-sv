# Comandos y turnos de las cartas

| Comando | Función |
| --- | --- |
| `!tienda` o `!tiendita` | Abrir la tiendita y obtener el turno de compra. |
| `!sobre` | Añadir un sobre a la orden del usuario que tiene abierta la tienda. |
| `!sobre 2` | Añadir dos sobres, sujeto al límite configurado por compra. |
| `!sobre 6` | Añadir seis sobres. Al pagar, utiliza la presentación por diapositivas después de la entrega. |
| `!comprar`, `comprar`, `!pagar`, `pagar` o `!listo` | Pagar la orden. La entrega y la apertura quedan enlazadas automáticamente. |
| `!mostrarcartas` | Mostrar en el tarjetero, abajo a la izquierda, un carrusel pequeño con las últimas cinco cartas obtenidas por el emisor. |
| `!mostrarcarta` | Alias de `!mostrarcartas`; también acepta una rareza, por ejemplo `!mostrarcarta raro`. |
| `!mostrarcartas comun` | Mostrar sus últimas cinco comunes. También acepta `comunes`. |
| `!mostrarcartas especial` | Mostrar sus últimas cinco especiales. También acepta `especiales`. |
| `!mostrarcartas raro` | Mostrar sus últimas cinco raras. Acepta `rara`, `raras` y `raros`. |
| `!mostrarcartas epica` | Filtrar épicas. Si el usuario no posee ninguna, informa sin encolar una animación. |
| `!mostrarcartas legendaria` | Mostrar sus últimas cinco legendarias. Acepta variantes masculina y plural. |
| `!mostrarcartas mitica` | Filtrar míticas cuando existan cartas obtenidas de esa rareza. |

Los filtros aceptan mayúsculas y acentos. El usuario solo solicita sus propias cartas; el argumento del comando es una rareza, no el nombre de otro usuario.

## Control de uso

- Como máximo una colección pendiente por usuario. Se puede colocar detrás de su propia compra de sobres sin rechazar el comando.
- Cooldown mínimo de **20 segundos por usuario**, compartido entre todos los filtros. Un carrusel solicitado después de comprar espera ese plazo en la cola. Cambiar `comun` por `legendaria` no permite añadir otro carrusel pendiente.
- Separación global mínima de **20 segundos entre el inicio de dos solicitudes**.
- Cola FIFO compartida en Firebase, con capacidad inicial de **20 solicitudes**.
- Las compras no se descartan al quedar en espera. Si la cola está llena antes de confirmar una compra, no se cobran los puntos.
- Un carrusel dura inicialmente 12 segundos. Los siguientes esperan su turno, sin reemplazar el carrusel actual.
- Una compra con varios sobres termina su presentación antes de comenzar la siguiente solicitud. Hasta cinco usa aperturas completas; desde seis muestra tríos sucesivos y una única salida de todas las cartas.

La tiendita recibe el chat mediante sus conexiones actuales de Kick y Streamer.bot. Su filtro admite expresamente `!mostrarcarta`, `!mostrarcartas` y sus variantes por rareza, incluso con la tienda cerrada. El comando se transforma en una solicitud en Firebase y el carrusel se reproduce dentro de `tarjetero.html`; no hace falta otra fuente de navegador para mostrar colecciones.

## Controles de operador

`tarjetero.html?controls=true` abre un panel local de prueba visual, incluido **Probar carrusel inferior (5 cartas)**. Las pruebas no cobran puntos, no añaden cartas a perfiles y no consumen compras reales de la cola. `tarjetero.html` y `tarjetero.html?obs=true` funcionan como fuente en vivo cuando se abren directamente. Las vistas previas incrustadas y `?controls=true` quedan fuera de la cola real.

Los comandos antiguos del mostrador (`!tarjetasjikokun`, `!rotar`, `!carta`, entre otros) permanecen en el respaldo y no se utilizan para las colecciones personales nuevas.
