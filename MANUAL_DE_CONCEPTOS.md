# Manual de Conceptos y Guía de Estándares (Glosario)

## 📌 Introducción
Este documento sirve como manual oficial de conceptos, estándares de diseño UI y glosario de componentes para la plataforma **Multi Ideas Sv** y sus módulos como **SensunShop**. Su propósito es asegurar la coherencia técnica, estructural y visual en futuros desarrollos, actualizaciones y registro de nuevos clientes.

---

## 🎴 1. Ficha o Cartelera de Clientes (`.negocio-card` / `.producto-card`)

### 1.1 Definición y Alcance
La **Ficha o Cartelera de Cliente** es la unidad visual estandarizada que representa a cualquier cliente, negocio o profesional registrado en SensunShop. Aplica indistintamente para todas las categorías del directorio:
- **Emprendedores**
- **Negocios Locales**
- **Oficios y Servicios**
- **Servicios Profesionales**

Todas las fichas deben mantener la misma estructura HTML/CSS responsiva, garantizando su perfecta visualización y adaptabilidad tanto en dispositivos móviles como en pantallas de escritorio.

---

### 1.2 Anatomía y Desglose de Elementos

```
┌─────────────────────────────────────────────────────────────┐
│                       [ FAVORITO ★ ]                        │
│                   FOTO / IMAGEN NEGOCIO                     │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│  [Tag 1]  [Tag 2]  [Tag 3]              (Etiquetas)         │
│                                                             │
│  TÍTULO DEL NEGOCIO / PROFESIONAL                           │
│  ★★★★★ 4.5 ★ (2)                       [ 💬 0 ]             │
│                                                             │
│  Breve información o descripción de los servicios ofrecidos │
│  en el establecimiento o consulta.                          │
│                                                             │
│  [ 🟢 WhatsApp ]  [ 📍 Ubicación ]  [ ℹ️ Detalles ]          │
└─────────────────────────────────────────────────────────────┘
```

#### Componentes Desglosados:

1. **Adaptabilidad Responsiva (Web y Móvil)**:
   - Layout fluido basado en rejilla flexible (`grid-template-columns: repeat(auto-fill, minmax(280px, 1fr))`).
   - Se reajusta de forma orgánica en dispositivos móviles, tabletas y computadoras.

2. **Imagen / Portada Rotativa (Soporte Multi-Imagen hasta 4 fotos)**:
   - **Origen**: Enlaces Web brindados en el documento de almacenamiento de datos de cada categoría (Cloudinary / CDN oficial).
   - **Soporte Multi-Imagen**: El contenedor `.producto-img` deja un espacio preparado en el código HTML/JS para recibir hasta **máximo 4 enlaces de imágenes rotativas** (`data-gallery="url1,url2,url3,url4"` o estructura de slider interno).
   - **Comportamiento**:
     - *Si tiene 1 imagen*: Se muestra la foto principal de forma estática.
     - *Si tiene de 2 a 4 imágenes*: Se habilita la rotación de imágenes (automática o mediante interacción/deslizamiento) para mostrar productos destacados o vistas generales del local/servicio.
   - **Formato y Calidad**: Formato optimizado `.webp` cargado con carga diferida (`loading="lazy"`).
   - **Ajuste visual**: `object-fit: cover` (para retratos de profesionales y locales) u `object-fit: contain` (para logotipos corporativos).

3. **Botón de Añadir a Favoritos (★)**:
   - Botón interactivo ubicado en la esquina superior derecha superpuesto a la imagen de portada.
   - Permite al usuario guardar el negocio en su lista personal de favoritos (almacenado localmente o mediante estado de sesión).

4. **Etiquetas (Badges / Tags)**:
   - Etiquetas de subcategoría o especialidad (ej. `Salud`, `Odontología`, `Ortodoncia`).
   - Facilitan la clasificación e integración con los filtros de búsqueda rápida.

5. **Título / Nombre del Cliente**:
   - Nombre comercial del negocio o nombre del profesional destacado en tipografía de mayor jerarquía (`<h3>`).

6. **Rating de Estrellas (Sistema de Puntuación)**:
   - Controlado mediante el módulo `sensun-rating-widget` (`sensun_ratings.js`).
   - Muestra las estrellas de valoración, el promedio decimal (ej: `4.5 ★`) y la cantidad de votos recibidos entre paréntesis `(2)`.

7. **Botón de Comentarios / Reseñas**:
   - Botón interactivo con icono de globo de texto y un contador flotante con la cantidad de opiniones dejadas por los usuarios (ej: `💬 0`).

8. **Breve Información / Descripción**:
   - Resumen o extracto corto que describe los servicios, productos o especialidad del cliente.

9. **Botones Interactivos de Acción (Enlaces Directos)**:
   - *Regla de inclusión dinámica*: Solo se muestran los botones que apliquen según la información disponible del cliente (si solo posee WhatsApp y Ubicación, únicamente se renderizan esos 2).
     - 🟢 **WhatsApp** (`btn-wsp`): Abre un chat directo en `api.whatsapp.com` con mensaje prediseñado (*"Hola [Nombre], vengo desde Sensun Shop"*).
     - 🔴 **Ubicación** (`btn-loc`): Redirige a Google Maps (`maps.app.goo.gl`) a la posición exacta o dirección del negocio.
     - 🟡 **Detalles** (`btn-det`): Enlace a un espacio o página web dedicada dentro del proyecto (ej: `drhenrymartinez.html`).

---

### 1.3 Plantilla HTML Estandarizada para Futuros Cambios

```html
<!-- FICHA O CARTELERA DE CLIENTE ESTÁNDAR -->
<div class="producto-card negocio-card" id="ID-CLIENTE" data-category="CATEGORIA" data-tags="tag1,tag2">
    <!-- Imagen de Portada con Soporte Multi-Imagen (Máximo 4 imágenes rotativas) -->
    <div class="producto-img card-gallery-container" 
         data-gallery='["URL_IMAGEN_1", "URL_IMAGEN_2", "URL_IMAGEN_3", "URL_IMAGEN_4"]'>
        <button class="btn-favorite" aria-label="Añadir a favoritos">★</button>
        
        <!-- Imagen Principal / Portada -->
        <img src="URL_IMAGEN_1" alt="Nombre del Negocio" class="main-card-img" loading="lazy">
        
        <!-- Espacio preparado para imágenes secundarias rotativas (opcionales, máx 4) -->
        <!-- URL_IMAGEN_2 (opcional) -->
        <!-- URL_IMAGEN_3 (opcional) -->
        <!-- URL_IMAGEN_4 (opcional) -->
    </div>

    <!-- Información del Cliente -->
    <div class="producto-info">
        <!-- Etiquetas -->
        <div class="negocio-tags">
            <span class="tag">Categoría</span>
            <span class="tag">Subcategoría</span>
        </div>

        <!-- Título -->
        <h3>Nombre del Negocio o Profesional</h3>

        <!-- Rating de Estrellas y Comentarios -->
        <div class="sensun-rating-widget" data-business-id="id-negocio" data-compact="true"></div>

        <!-- Breve Información -->
        <p>Descripción breve de los servicios ofrecidos o especialidad.</p>

        <!-- Botones Interactivos -->
        <div class="negocio-links">
            <!-- WhatsApp (si cuenta con él) -->
            <a href="https://api.whatsapp.com/send/?phone=503XXXXXXXX&text=Hola..." class="btn-negocio btn-wsp" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24">...</svg> WhatsApp
            </a>

            <!-- Ubicación (si cuenta con ella) -->
            <a href="https://maps.app.goo.gl/..." class="btn-negocio btn-loc" target="_blank" rel="noopener noreferrer">
                <svg viewBox="0 0 24 24">...</svg> Ubicación
            </a>

            <!-- Detalles (espacio extra opcional) -->
            <a href="ruta/a/detalles.html" class="btn-negocio btn-det">
                <svg viewBox="0 0 24 24">...</svg> Detalles
            </a>
        </div>
    </div>
</div>
```

---

## 📝 2. Glosario de Términos y Componentes Adicionales

* **Ficha / Cartelera de Cliente**: Tarjeta individual responsiva que consolida la información comercial de un miembro en SensunShop.
* **Rating Widget**: Elemento dinámico en JavaScript que calcula y proyecta el promedio de estrellas y reseñas de cada cliente.
* **Documento de Almacenamiento**: Registro base con las URLs de imágenes en Cloudinary y datos de contacto de cada categoría.

---

## 🚀 3. Protocolo de Alta y Registro de Nuevos Clientes

Cada vez que el usuario solicite agregar un nuevo cliente indicando su categoría (**Emprendedores**, **Negocios Locales**, **Servicios Profesionales** u **Oficios**), se debe aplicar estrictamente el siguiente procedimiento automático:

### 3.1 Pasos del Flujo de Inserción:
1. **Creación de la Ficha en el Catálogo Principal**:
   - Insertar la tarjeta con la estructura estándar (`producto-card negocio-card`) dentro de la sección `#negocios-container` de la página correspondiente.
   - Asignar un ID secuencial único (ej. `PRO-003`, `NEG-006`, `EMP-004`, `OFI-002`).
   - Configurar los atributos `data-category` y `data-tags` para el correcto filtrado por etiquetas.

2. **Inclusión Automática en "Recién Llegados" (Novedades)**:
   - Insertar automáticamente una versión en formato slide (`slider-card`) del nuevo cliente en el contenedor `#slider` de la sección **Novedades / Recién Llegados**.
   - Colocar el slide al inicio del carrusel para que destaque como la última adición.

3. **Integración con la Búsqueda Global y Local**:
   - Registrar el ID del cliente en los widgets de valoración (`data-business-id`) para que el script `sensun_ratings.js` lo incluya en el cálculo de puntuaciones y modal de reseñas.
   - Verificar que los datos del cliente se indexen en las sugerencias del buscador global de SensunShop y en los filtros dinámicos por etiqueta.

4. **Manejo de Imágenes y Galería Rotativa**:
   - Se configurará el espacio de imágenes admitiendo desde 1 foto principal hasta un máximo de **4 enlaces de imágenes rotativas** (`data-gallery`).
   - Si se proporcionan múltiples fotos (2, 3 o 4), el sistema habilitará la rotación visual de productos/galería en la ficha.
   - Aplicar el atributo `loading="lazy"` a cada imagen optimizada en CDN WebP.

---

## 🔍 4. Modal de Ficha Ampliada (Zoom / Vista Extendida)

### 4.1 Objetivo y Comportamiento
Dado que en las carteleras principales del catálogo las descripciones cortas están acotadas a 2 líneas (`-webkit-line-clamp: 2`) para mantener una alineación estética pareja, se ha implementado el **Modal de Ficha Ampliada**.

### 4.2 Reglas de Activación y Disparadores:
* **Disparadores Válidos**:
  - Clic / Tap sobre el **Título / Nombre del Cliente** (`<h3>`).
  - Clic / Tap sobre la **Breve Información / Descripción** (`<p>`).
* **Ámbito Estricto de Aplicación**:
  - **Solo aplica** en las carteleras/cuadrículas principales del catálogo (`#negocios-container` / `.negocios-grid-section`) en todas las categorías (Emprendedores, Negocios Locales, Servicios Profesionales y Oficios).
  - **NO aplica** en subsecciones como "Recién Llegados" (sliders/novedades) ni en boletines informativos.
* **Exclusión de Elementos Interactivos**:
  - Los clics sobre los botones de **WhatsApp**, **Ubicación**, **Detalles**, **Favoritos (★)**, **Ratings/Comentarios** o **Etiquetas** NO abren el modal de zoom, sino que ejecutan su acción directa correspondiente.

### 4.3 Características Visuales y Funcionales del Modal Ampliado:
* **Fondo Glassmorphism**: Capa oscura traslúcida con desenfoque (`backdrop-filter: blur(16px); background: rgba(8, 10, 15, 0.85);`).
* **Ficha Completa sin Recortes**:
  - Muestra la foto o galería rotativa de imágenes completa.
  - Despliega el **texto descriptivo íntegro sin límite de líneas ni elipses** (`line-clamp: unset`), facilitando la lectura completa en cualquier pantalla.
  - Mantiene los botones interactivos (WhatsApp, Ubicación, Detalles) funcionales.
* **Cierre**:
  - Botón flotante de cierre (`✕`) en la esquina superior derecha.
  - Al hacer clic fuera de la tarjeta emergente (backdrop).
  - Mediante la tecla `Escape`.
* **Adaptabilidad**: Totalmente auto-ajustable a pantallas móviles (`max-height: 90vh; overflow-y: auto`) y web.



