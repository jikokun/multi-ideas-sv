# Sobres Jikokun: compra y administración

## Preparar OBS

1. Mantén activa la fuente de navegador de **Tiendita**.
2. En el laboratorio, busca **Sobres Jikokun** y copia su enlace para OBS.
3. Añade ese enlace como una segunda fuente de navegador de **1920 × 1080**. Ambas fuentes deben poder conectarse a Firebase. Usa el enlace HTTPS del sitio publicado; abrir archivos mediante `file://` puede impedir cargar módulos de JavaScript.
4. Deja la fuente de sobres visible en la escena. No tiene fondo ni rótulos y permanece vacía mientras espera.

Las dos fuentes tienen tareas diferentes: la tiendita muestra al mesero y entrega el sobre sobre la mesa; el tarjetero abre ese mismo premio después de terminar la entrega. No hace falta activar la apertura con un segundo comando.

Antes de habilitar las ventas por primera vez, publica los archivos nuevos del sitio y comprueba que ambas fuentes están cargando la versión actualizada. Después activa **Sobre disponible en la tiendita** en el panel de tarjetas. El producto preparado inicialmente en Firebase queda desactivado hasta completar ese paso, para impedir compras desde una versión antigua de la tienda que todavía no entrega cartas.

## Comprar un sobre

1. El usuario escribe `!tienda`.
2. Selecciona el producto escribiendo `!sobre`, o haciendo clic en el producto.
3. Escribe `!comprar` para confirmar la orden.
4. Firebase comprueba el precio vigente y el saldo. Si la compra se confirma, descuenta los puntos y guarda las cartas en el perfil en una misma transacción.
5. La entrega se coloca en la cola. Primero aparece la animación del mesero. Cuando el mesero y la mesa han desaparecido, comienza la apertura del sobre.

El precio inicial es **1500 Jikopuntos**. Se pueden seleccionar hasta **tres sobres por orden** de forma predeterminada. Una orden mixta con otros productos usa la misma entrega; los productos deben tener stock ilimitado para este tipo de orden. No se cobra una compra rechazada por saldo, producto desactivado, límite de sobres o cola llena.

Las vistas previas del laboratorio no realizan compras reales ni otorgan cartas. Los botones de rareza fuerzan un resultado únicamente para revisar el efecto.

## Probabilidades

Cada sobre contiene tres cartas. Se sortea la rareza de cada una por separado.

| Rareza | Probabilidad por carta en el catálogo actual |
| --- | ---: |
| Común | 96.05% |
| Especial | 3% |
| Rara | 0.9% |
| Legendaria | 0.05% |
| Épica | 0%, porque esta colección no contiene épicas |
| Mítica | 0%, porque esta colección no contiene míticas |

Existe un peso reservado de 0.05% para épicas cuando haya cartas de esa rareza en el catálogo. Mientras no existan, ese peso se añade a común. No se aumenta la probabilidad legendaria. Un sobre tiene aproximadamente **0.15%** de contener al menos una legendaria. No hay premios de rareza alta garantizados por cantidad de compras.

Las comunes pueden repetirse dentro del mismo sobre. Una carta especial o superior conserva el doble énfasis al revelarse. El brillo del sobre corresponde a la mayor rareza que realmente contiene.

## Cartas repetidas y experiencia

Cada ejemplar se acumula. Una carta se considera repetida cuando el usuario ya posee al menos una copia, incluso si la primera copia salió unos instantes antes en ese mismo sobre.

El bono inicial por cada repetida es **1% del precio de un sobre**, reducido por el factor de XP del nivel del usuario. Con un precio de 1500 y factor 1, cada repetida otorga **15 XP**. Un sobre con tres copias de una carta nueva produce una nueva y dos repetidas: **30 XP**. Si el usuario ya tenía esa carta, las tres son repetidas: **45 XP**.

El sobre no otorga además el bono normal de XP por gasto de la tiendita. Los productos que lo acompañan sí conservan su XP normal. En el nivel máximo se respeta el factor de XP igual a cero.

Los perfiles muestran cartas únicas, total de ejemplares, repetidas y acumulados por rareza. El incremento de experiencia utiliza el mismo sistema de niveles que los demás productos.

## Administrar el producto

Abre `laboratorio/admintarjetas.html`, sección **SOBRES · TIENDITA Y COLECCIONES**. Allí puedes cambiar el nombre, precio, disponibilidad, imágenes, XP por repetida, límite por compra, duración de las animaciones y capacidad de la cola. Los cooldowns no pueden bajar de 20 segundos.

Pulsa **Guardar producto y ajustes en Firebase**. El precio y la disponibilidad se actualizan en la tiendita mediante su catálogo en tiempo real. Los cambios no alteran recibos ya pagados.

Para cambiar el catálogo de cartas, prepara las 100 cartas de la colección principal en el administrador y pulsa **Publicar colección 001–100 en Firebase**. Las compras nuevas usarán el catálogo publicado. Los números 001–100 son identificadores estables: no deben reutilizarse para representar cartas diferentes.

Las imágenes deben poder abrirse sin una sesión de Google. El respaldo gráfico evita detener una animación si Drive no entrega una imagen.
