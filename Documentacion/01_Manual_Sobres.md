# Sobres Jikokun: compra y administración

## Preparar OBS

1. Mantén activa la fuente de navegador de **Tiendita**.
2. En el laboratorio, busca **Sobres Jikokun** y copia su enlace para OBS.
3. Añade ese enlace como una segunda fuente de navegador de **1920 × 1080**. Ambas fuentes deben poder conectarse a Firebase. Usa el enlace HTTPS del sitio publicado; abrir archivos mediante `file://` puede impedir cargar módulos de JavaScript.
4. Coloca la fuente de sobres por encima de **Tiendita** en la lista de fuentes de OBS y déjala visible. No tiene fondo ni rótulos y permanece vacía mientras espera.

La tiendita muestra el sobre como cualquier producto, junto con la mesa y el mesero. Cuando desaparecen por completo la mesa, el mesero y sus productos, el tarjetero invoca el sobre con su animación de entrada en la zona compacta y comienza la apertura. Si no hay un tarjetero disponible, el recibo queda esperando apertura. No hace falta un segundo comando.

La apertura exige una confirmación de salida de la tiendita guardada en Firebase. Hasta recibirla, la capa del sobre permanece oculta. Para cargar esta actualización en OBS, publica los cambios y utiliza estos enlaces en ambas fuentes:

- Tiendita: `https://multiideassv.com/mini_widgets/tiendita.html?overlay=true&v=20261107-delivery4`
- Cartas: `https://multiideassv.com/laboratorio/tarjetero.html?obs=true&v=20261107-delivery4`

El carrusel, las aperturas, los estilos y la recepción de turnos están integrados en **`laboratorio/tarjetero.html`**. La fuente ocupa un lienzo transparente de 1920 × 1080, pero las aperturas comunes se concentran abajo a la izquierda, en la zona de la mesa. Una especial o superior amplía el sobre y las cartas para conservar su animación destacada. `!mostrarcartas [rareza]` utiliza un carrusel pequeño junto al borde inferior izquierdo.

También funciona `!mostrarcarta [rareza]`, en singular. Si se solicita el carrusel mientras sigue pendiente una compra del mismo usuario, se coloca una única solicitud después de esa compra y espera el cooldown correspondiente.

Antes de habilitar las ventas por primera vez, publica los archivos nuevos del sitio y comprueba que ambas fuentes están cargando la versión actualizada. Después activa **Sobre disponible en la tiendita** en el panel de tarjetas. El producto preparado inicialmente en Firebase queda desactivado hasta completar ese paso, para impedir compras desde una versión antigua de la tienda que todavía no entrega cartas.

## Comprar un sobre

1. El usuario escribe `!tienda`.
2. Selecciona el producto escribiendo `!sobre`, o haciendo clic en el producto.
3. Escribe `!pagar`, `pagar` o `!comprar` para confirmar la orden.
4. Firebase comprueba el precio vigente y el saldo. Si la compra se confirma, descuenta los puntos y guarda las cartas en el perfil en una misma transacción.
5. La entrega se coloca en la cola. Primero aparece la animación del mesero. Cuando el mesero y la mesa han desaparecido, comienza la apertura del sobre.

El precio inicial es **1500 Jikopuntos**. Se pueden seleccionar hasta **20 sobres por orden**, con un límite administrable de 1 a 20. La bandeja admite hasta 20 productos en total. Una orden mixta con otros productos usa la misma entrega; los productos deben tener stock ilimitado para este tipo de orden. No se cobra una compra rechazada por saldo, producto desactivado, límite de sobres o cola llena.

Durante la confirmación, la orden y su contador quedan en pausa para evitar cambios o pagos simultáneos. Si el pago falla, el motivo aparece dentro de la confirmación y continúa el tiempo que quedaba, sin reiniciarlo. Reintentar la misma compra conserva su identificador para impedir un cobro duplicado.

## Compras de varios sobres

- **Un sobre**: conserva la apertura y los ocho segundos de exhibición habituales.
- De **dos a cinco sobres**: acelera entrada, rasgado y cartas comunes. Las comunes se exhiben brevemente; las especiales o superiores conservan el doble realce y una pausa mayor. Los sobres pendientes permanecen en la zona de la mesa.
- De **seis a veinte sobres**: se omiten invocaciones y rasgados individuales. Muestra diapositivas rápidas de tres cartas, una por sobre. Las especiales o superiores se amplían y reciben doble realce con el color de su reverso.
- Las cartas de cada diapositiva se acumulan en una pila. Al terminar, todas las cartas de la compra se reúnen y salen en un solo bloque.

Ambas presentaciones usan las cartas del recibo guardado en Firebase. Cambiar la animación no cambia el premio ni vuelve a sortearlo.

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

Las comunes pueden repetirse dentro del mismo sobre. Una carta especial o superior conserva el doble énfasis al revelarse. El brillo del sobre corresponde a la mayor rareza que realmente contiene. Los efectos respetan los colores del reverso: común celeste, especial iridiscente rosa/cian, raro amatista morado, épico carmesí/cobre, legendario oro y mítico platino.

## Cartas repetidas y experiencia

Cada ejemplar se acumula. Una carta se considera repetida cuando el usuario ya posee al menos una copia, incluso si la primera copia salió unos instantes antes en ese mismo sobre.

El bono inicial por cada repetida es **1% del precio de un sobre**, reducido por el factor de XP del nivel del usuario. Con un precio de 1500 y factor 1, cada repetida otorga **15 XP**. Un sobre con tres copias de una carta nueva produce una nueva y dos repetidas: **30 XP**. Si el usuario ya tenía esa carta, las tres son repetidas: **45 XP**.

El sobre no otorga además el bono normal de XP por gasto de la tiendita. Los productos que lo acompañan sí conservan su XP normal. En el nivel máximo se respeta el factor de XP igual a cero.

El perfil muestra el progreso de cartas únicas sobre 100 y seis casillas con las únicas de cada rareza. Cada carta cuenta una sola vez aunque tenga varias copias; por ejemplo, diez copias de una común suman una común en el perfil. Las copias y recibos siguen guardados en Firebase para conservar el historial y calcular la XP, pero no aumentan el progreso visible de la colección. El incremento de experiencia utiliza el mismo sistema de niveles que los demás productos.

## Administrar el producto

Abre `laboratorio/admintarjetas.html`, sección **SOBRES · TIENDITA Y COLECCIONES**. Allí puedes cambiar el nombre, precio, disponibilidad, imágenes, XP por repetida, límite por compra, duración de las animaciones y capacidad de la cola. Los cooldowns no pueden bajar de 20 segundos.

Pulsa **Guardar producto y ajustes en Firebase**. El precio y la disponibilidad se actualizan en la tiendita mediante su catálogo en tiempo real. Los cambios no alteran recibos ya pagados.

Para cambiar el catálogo de cartas, prepara las 100 cartas de la colección principal en el administrador y pulsa **Publicar colección 001–100 en Firebase**. Las compras nuevas usarán el catálogo publicado. Los números 001–100 son identificadores estables: no deben reutilizarse para representar cartas diferentes.

Las carpetas **Coleccion_Jikokun_001-100**, **Reverso_cartas** y **Sobres_cartas** deben permitir **Cualquier persona con el enlace → Lector**. OBS carga las imágenes sin una sesión de Google.

Antes de comenzar la animación y su contador se comprueba que las portadas, reversos y caras del sobre estén cargadas y listas en pantalla. Si una imagen falla, el sobre queda esperando; el recibo no se marca como mostrado y se reintenta después de 30 segundos. No se vuelven a cobrar puntos ni a sortear cartas. El panel de tarjetas muestra el motivo de espera en la cola.
