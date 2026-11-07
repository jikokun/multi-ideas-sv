# Widget de sobres Jikokun

El sistema de compra, inventario y comandos en Firebase está documentado en [Documentacion](../Documentacion/README.md). Este archivo describe la animación y sus controles de prueba.

Abrir `tarjetero.html` en el navegador o como fuente de navegador de OBS a **1920 × 1080**. El lienzo conserva esas dimensiones y ajusta su escala en ventanas de vista previa.

- Widget transparente, sin textos, rótulos ni controles: `tarjetero.html` o `tarjetero.html?obs=true`.
- En la fuente OBS en vivo, la compra de la tiendita activa la apertura después de que el mesero se retire. El widget reproduce las cartas del recibo guardado en Firebase; no se sortean de nuevo. `!mostrarcartas [rareza]` utiliza la misma cola para mostrar las cartas ganadas.
- El enlace para copiar a OBS está en `laboratorio/index.html`, en la tarjeta **Sobres Jikokun · Apertura de cartas**. Sus botones actúan sobre la vista previa del laboratorio.
- Panel de operador opcional: `tarjetero.html?controls=true`. Solo en esta URL se muestra el menú; **H** permite abrirlo y cerrarlo. `obs=true` impide mostrar controles incluso si se combina con `controls=true`.
- **Lanzar suerte** en el panel de operador o tecla **N**: generar un sobre de tres cartas. Las comunes pueden repetirse, incluso dentro del mismo sobre.
- Las cartas aparecen por el reverso, se extienden y se revelan de menor a mayor rareza. Al terminar, un clic en una carta permite consultar su reverso.
- Cada carta especial o superior recibe dos pulsos de luz, dos ampliaciones y dos ráfagas de partículas. Se completa el doble énfasis antes de revelar la siguiente carta de rareza alta.
- Las cartas se reúnen y salen automáticamente tras ocho segundos de exhibición, dejando nuevamente el lienzo vacío. El panel de operador permite cambiar el tiempo o activar **Conservar las cartas en pantalla**.
- **Forzar efecto** fuerza la rareza indicada en la carta central y deja dos comunes. No representa las probabilidades del sorteo ni cuenta en las estadísticas. El menú solo permite rarezas presentes en esta colección.
- **Limpiar lienzo** cancela la secuencia, sus temporizadores, audio y partículas. No borra las estadísticas de la sesión.

## Catálogo y probabilidades

El catálogo inicial procede de `DEFAULT_JIKOKUN_COLLECTIONS['Coleccion_Jikokun_001-100']` de `../data/tarjetas_default_data.js`. Se publica una sola vez si aún no existe en `stream/widgets/tcg/catalog`. Las compras y la fuente en vivo usan después el catálogo de Firebase, con 100 numeraciones únicas. No se importan archivos por posición ni se mezclan otras carpetas de Drive.

| Rareza | Cartas disponibles | Probabilidad por carta |
| --- | ---: | ---: |
| Común | 45 | 96.05% |
| Especial | 28 | 3% |
| Raro | 20 | 0.9% |
| Legendario | 7 | 0.05% |
| Épico | 0 | 0% (0.05% cuando existan cartas) |
| Mítico | 0 | 0% |

Cada carta tiene un sorteo independiente de rareza. Las comunes se eligen con reposición; las de mayor rareza excluyen las que ya están en el mismo sobre. Una legendaria puede salir en cualquier posición. La probabilidad de obtener al menos una en tres cartas es `1 − 0.9995³ = 0.1499250125%`, aproximadamente 0.15% por sobre. La probabilidad de que las tres cartas sean comunes es aproximadamente 88.61%. No hay rarezas garantizadas por número de intentos.

Los pesos base son 96% común, 3% especial, 0.9% raro, 0.05% épico y 0.05% legendario. El peso de cualquier rareza sin cartas se añade exclusivamente a común: la ausencia de épicas no aumenta la probabilidad legendaria. Se usan 10,000 unidades enteras para conservar los umbrales exactos de 0.05%.

Los controles de prueba no cobran puntos ni otorgan cartas. Las compras reales se confirman en la tiendita mediante una transacción de Firebase que guarda cobro, inventario, experiencia y recibo. Las estadísticas locales del panel de pruebas se mantienen separadas del inventario real.

Los colores, hologramas y reversos siguen las seis rarezas del mostrador anterior. El aura del sobre depende de la carta de mayor rareza que realmente contiene.

Las portadas y los reversos rellenan el marco completo con `object-fit: fill`: las imágenes cuya proporción difiere se estiran suavemente para evitar franjas, sin recortar el arte. El sobre conserva su ajuste original.

## Imágenes de Drive

- Frente del sobre: `1YqH7yeTZkVAtZUSnbB-YzqV2Xffcm55K`.
- Parte trasera del sobre: `10QlcwL_GMvoghpRbZIcs20PJfBd76bEz`.
- Carpeta de sobres: `1ZVUPDHXdrWtieT8vaC1K8Z8SfjZVV97z`.
- Los seis reversos conservan sus IDs oficiales en `tarjetero_sobres_core.js`.

Se solicitan las portadas y los reversos del sobre actual, sin precargar las 100 imágenes. Las imágenes deben poder abrirse sin iniciar sesión en Google para funcionar en OBS. Si una falla, el widget muestra un respaldo gráfico sin rótulos; el panel de operador informa del fallo. El número y la rareza permanecen disponibles en la API local y en las etiquetas de accesibilidad. No reemplaza esa carta por otra ni vuelve a sortearla.

## Respaldo y restauración del mostrador

`tarjetero_mostrador_legacy.html.txt` es una copia exacta del `tarjetero.html` anterior. Contiene todo el carrusel, sus comandos, Firebase y Streamer.bot, sin ejecutar desde el nuevo widget. Para restaurarlo, copiar su contenido a `laboratorio/tarjetero.html` en esta misma carpeta. Sus rutas relativas permanecen válidas. Los archivos nuevos del simulador pueden quedarse guardados.

## Código y validación

- `tarjetero.html`: estructura del widget y menú.
- `tarjetero_sobres.css`: sobre 3D, rasgado, abanico, hologramas y salida.
- `tarjetero_sobres_core.js`: catálogo, probabilidades y sorteo sin dependencias del DOM.
- `tarjetero_sobres.js`: secuencia visual, controles, audio y partículas.
- Pruebas: `node --test laboratorio/tests/tarjetero_sobres.test.cjs`.

La animación combina las fases de invocación, giro, carga y rasgado del prototipo adjunto con la flotación, hologramas, paleta de rarezas y salida épica del mostrador anterior. El catálogo ficticio y la garantía cada diez intentos del prototipo no se utilizan.
