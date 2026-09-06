# Especificación Técnica de Formularios y Sincronización Firebase (Web <-> App Android)
## Sensun Shop · Directorio Geográfico, Novedades y Ofertas Especiales

> **Documento Oficial para el Equipo de Desarrollo Android y Web**  
> Este documento unifica todos los campos, tipos de datos, nodos en Firebase Realtime Database (RTDB), validaciones y lógica requerida para que los formularios de la **App Android** y del **Panel Web** sincronicen de forma idéntica y en tiempo real.

---

## 0. Resumen de Nodos en Firebase Realtime Database

Todos los clientes (Web y App) **deben conectarse exactamente a los mismos nodos de Firebase**:

| Módulo / Formulario | Nodo en Firebase RTDB | Clave del Objeto (`Key`) |
| :--- | :--- | :--- |
| **1. Negocios y Comercios** | `sensunshop/businesses/<id>` | Slug del negocio (ej: `pupuserialosalmendros`, `neg-009`) |
| **2. Novedades, Alertas y Boletines** | `sensunshop/news/<id>` | Slug de la noticia (ej: `gran-feria-2026`) |
| **3. Ofertas Especiales** | `sensunshop/businesses/<id>` | **Mismo nodo del negocio** (campos `hasOffer`, `offerStyle`, etc.) |
| *(Opcional - Espejo de Anuncios)* | `sensunshop/offers/<id>` | Copia automática de publicaciones de tipo `anuncios` |
| *(Opcional - Espejo de Boletines)* | `sensunshop/bulletins/<id>` | Copia automática de publicaciones de tipo `boletines` |

---

## 1. Formulario 1: Crear / Editar Negocio (Catálogo y Mapa)

**Nodo Firebase:** `sensunshop/businesses/<id>`

Este formulario registra negocios locales, emprendimientos, profesionales, oficios y entidades de emergencia.  
> ⚠️ **IMPORTANTE (MAPA Y LLAMADAS):**  
> 1. Para que el negocio aparezca en el mapa interactivo, la app **debe guardar obligatoriamente `lat` y `lng` como números (`Double`)**, no solo el texto del enlace de Google Maps.  
> 2. Se deben incluir **dos campos de contacto separados**: `whatsapp` (solo para mensajes) y `phone` (para llamadas directas al marcador telefónico nativo).

### 1.1 Tabla Maestra de Campos del Negocio

| Campo (Key en Firebase) | Tipo de Dato | UI Label en Formulario | Requerido | Valor por Defecto / Ejemplo | Explicación y Lógica |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | `String` | **ID Único (Slug)** | **SÍ** | `"pupuserialosalmendros"`, `"neg-009"` | Clave primaria en Firebase. Se autogenera a partir del título (minúsculas, sin tildes ni caracteres especiales). |
| `code` | `String` | **Código Oficial** | **SÍ** | `"NEG-009"`, `"EMP-003"`, `"EME-002"` | Prefijo según sección (`NEG-`, `EMP-`, `PRO-`, `OFI-`, `EME-`) + correlativo de 3 dígitos. Se autogenera. |
| `title` | `String` | **Título del Negocio** | **SÍ** | `"Pupusería Los Almendros"` | Nombre oficial del comercio. |
| `type` | `String` | **Sección** | **SÍ** | `"negocioslocales"` | Opciones del desplegable: `"negocioslocales"`, `"emprendedores"`, `"profesionales"`, `"oficios"`, `"emergencias"`. |
| `category` | `String` | **Categoría** | **SÍ** | `"comida"` | Subcategoría de filtro: `"comida"`, `"comercio"`, `"salud"`, `"artesanias"`, `"emergencias"`, `"servicios"`, `"fotografia"`, `"tecnologia"`, `"diseno"`, `"mascotas"`, `"belleza"`. |
| `badge` | `String` | **Etiqueta Superior (Badge)** | No | `"GASTRONOMÍA TÍPICA"` | Texto corto en mayúsculas mostrado en la cabecera de la tarjeta. |
| `description` | `String` | **Descripción Detallada** | No | `"Especialistas en pupusas de arroz y maíz..."` | Párrafo descriptivo del negocio, menú o servicios. |
| `imgSrc` | `String` | **Logo / Imagen Principal** | No | `"https://..."` | URL pública de la imagen o logo (Drive, Cloudinary, etc.). |
| `imageUrl` | `String` | *(Espejo de imgSrc)* | No | `"https://..."` | Para retrocompatibilidad con componentes antiguos. Mismo valor que `imgSrc`. |
| `gallery` | `List<String>` | **Galería de Fotos** | No | `[]` | Lista de URLs secundarias con fotografías del comercio. |
| `whatsapp` | `String` | **WhatsApp (Solo dígitos)** | No | `"50372300000"` | Solo números con código de país (503). Dispara chat con API de WhatsApp. |
| `whatsappMsg` | `String` | **Mensaje predeterminado WhatsApp** | No | `"Hola Pupusería Los Almendros, vengo desde Sensun Shop"` | Mensaje pre-cargado que acompaña el inicio de conversación. |
| `phone` | `String` | **Teléfono Llamada Directa** | No | `"23823328"` | **Llamada telefónica estándar**. Al tocarlo dispara `Intent(Intent.ACTION_DIAL, Uri.parse("tel:$phone"))`. Vital para emergencias y teléfonos fijos. |
| `websiteUrl` | `String` | **Sitio Web / Enlace** | No | `"https://losalmendros.com"` | Enlace opcional a página web o menú digital. |
| `facebookUrl` | `String` | **Facebook Oficial** | No | `"https://facebook.com/losalmendros"` | Enlace directo a la fanpage de Facebook. |
| `locationUrl` | `String` | **URL de Google Maps / Coordenadas** | No | `"https://maps.app.goo.gl/..."` o `"https://maps.google.com/?q=13.8767,-88.6319"` | Enlace web hacia Google Maps para abrir en navegador o app de mapas externa. |
| `lat` | `Double` | **Latitud Geográfica** | **SÍ (Mapa)** | `13.8767` | Coordenada decimal para ubicar el marcador en el mapa. |
| `lng` | `Double` | **Longitud Geográfica** | **SÍ (Mapa)** | `-88.6319` | Coordenada decimal para ubicar el marcador en el mapa. |
| `tags` | `List<String>` | **Palabras Clave (Tags)** | No | `["pupusas", "comida", "delivery"]` | Lista de términos separados por coma para el buscador global. |
| `hasOffer` | `Boolean` | **¿Tiene Oferta Activa?** | **SÍ** | `false` | `true` activa el banner, píldora y botón de popup de oferta. |
| `offerMsg` | `String` | **Mensaje de Oferta** | Si hasOffer | `"-25% Descuento Especial"` | Texto destacado de la promoción. |
| `offerCode` | `String` | **Código Cupón** | No | `"GLORIA25"` | Código opcional que el usuario puede copiar. |
| `offerStyle` | `Int` | **Estilo Visual de Popup (1-4)** | Si hasOffer | `1` | `1` (Cupón), `2` (Festivo), `3` (Minimal), `4` (Banner). |
| `offerDiscount` | `String` | **Descuento Destacado** | No | `"-25%"`, `"2x1"` | Texto del descuento grande. |
| `offerDetail` | `String` | **Detalle Extendido de Oferta** | No | `"En todas las pupusas revueltas de 4 a 7 PM"` | Descripción de condiciones de la oferta. |
| `offerBadge` | `String` | **Insignia de Oferta** | No | `"-25% DESCUENTO"`, `"¡HOY!"` | Insignia superior del popup. |
| `offerDurationHours` | `Int` | **Horas Contador Regresivo** | No | `6` | Horas para el temporizador en tiempo real (Estilo 2). |
| `offerDistance` | `String` | **Distancia o Referencia** | No | `"A 2 cuadras del parque central"` | Texto de proximidad (Estilo 4). |
| `offerExpiry` | `String` | **Vigencia / Expiración** | No | `"Válido hasta el 31 de Diciembre"` | Fecha o leyenda de vencimiento. |
| `accentColor` | `String` | **Color de Acento** | No | `"#e8621a"` | Color hexadecimal del tema de la tarjeta. |
| `isActive` | `Boolean` | **Negocio Activo** | **SÍ** | `true` | Si es `false`, se oculta de la app y del mapa sin borrarse. |

---

## 2. Formulario 2: Crear / Editar Novedades, Alertas y Boletines

**Nodo Firebase:** `sensunshop/news/<id>`

Este formulario alimenta el carrusel de novedades de la pantalla de inicio, los boletines oficiales y las alertas de notificación push.

### 2.1 Tabla Maestra de Campos de Noticias

| Campo (Key en Firebase) | Tipo de Dato | UI Label en Formulario | Requerido | Valor por Defecto / Ejemplo | Explicación y Lógica |
| :--- | :--- | :--- | :---: | :--- | :--- |
| `id` | `String` | **ID de Noticia** | **SÍ** | `"feria-empresarial-2026"` | Clave primaria en Firebase. Slug único en minúsculas. |
| `title` | `String` | **Título de la Noticia** | **SÍ** | `"¡Gran Feria Emprendedora!"` | Encabezado principal del boletín. |
| `badge` | `String` | **Tipo de Publicación (Insignia)** | **SÍ** | `"noticias"` | Valores normalizados: `"noticias"` (Naranja), `"boletines"` (Morado), `"informativos"` (Menta), `"anuncios"` (Rojo). |
| `badgeLabel` | `String` | **Texto de la Insignia** | No | `"NOTICIA"`, `"BOLETÍN"` | Etiqueta en mayúsculas mostrada en la píldora. |
| `accentColor` | `String` | **Color de Insignia** | No | `"#ff6b35"` | Color hex según el tipo (`#ff6b35` noticias, `#7b68ee` boletines, `#00b894` informativos, `#ff4757` anuncios). |
| `description` | `String` | **Descripción / Contenido** | No | `"Te invitamos este fin de semana en el parque central..."` | Cuerpo completo del comunicado. |
| `imageUrl` | `String` | **Imagen de la Publicación** | No | `"https://..."` | URL del póster, banner o fotografía del evento. |
| `imgSrc` | `String` | *(Espejo de imageUrl)* | No | `"https://..."` | Retrocompatibilidad web. Mismo valor que `imageUrl`. |
| `contactWhatsapp` | `String` | **WhatsApp de Contacto** | No | `"50372300000"` | Teléfono directo para solicitar más información de la publicación. |
| `whatsapp` | `String` | *(Espejo de contactWhatsapp)* | No | `"50372300000"` | Retrocompatibilidad. Mismo valor que `contactWhatsapp`. |
| `locationUrl` | `String` | **Enlace de Ubicación Maps** | No | `"https://maps.app.goo.gl/..."` | Enlace para dirigir a los asistentes al lugar del evento. |
| `moreText` | `String` | **Texto del Botón de Acción** | No | `"Ver más"`, `"Descargar"`, `"Registrarme"` | Texto personalizado del botón CTA. Si viene vacío, mostrar por defecto `"Ver más"`. |
| `moreUrl` | `String` | **Enlace Web / URL de Acción** | No | `"https://multiideassv.com/registro"` | URL de destino que se abre al tocar el botón de acción. Si está vacío, se oculta el botón. |
| `link` | `String` | *(Espejo de moreUrl)* | No | `"https://..."` | Retrocompatibilidad. Mismo valor que `moreUrl`. |
| `timestamp` | `Long` | **Fecha / Marca de Tiempo** | **SÍ** | `System.currentTimeMillis()` | Milisegundos Unix para ordenar cronológicamente (más recientes primero). |
| `isActive` | `Boolean` | **Publicación Activa** | **SÍ** | `true` | Si es `false`, se retira del carrusel público. |

---

## 3. Formulario 3: Crear / Editar Ofertas Especiales (4 Estilos de Popups)

**Nodo Firebase:** `sensunshop/businesses/<businessId>`  
> Las ofertas están **enlazadas directamente al negocio** modificando su nodo en `sensunshop/businesses/<businessId>`. Al guardar la oferta, se actualiza el objeto del negocio con `hasOffer = true` y sus campos complementarios.

### 3.1 Selector de Negocio
- Campo UI: **Dropdown de Negocios Registrados (`businessId`)**.
- Los datos como logo (`imgSrc`), WhatsApp (`whatsapp`), título (`title`), distancia y calificación se heredan automáticamente del negocio seleccionado.

### 3.2 Campos Dinámicos según el Estilo de Oferta

| Campo Firebase | Tipo | Estilo 1 · Cupón | Estilo 2 · Festivo | Estilo 3 · Minimal | Estilo 4 · Banner | Descripción |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `hasOffer` | `Boolean` | `true` | `true` | `true` | `true` | Interruptor que activa la promoción |
| `offerStyle` | `Int` | `1` | `2` | `3` | `4` | Número del diseño visual del popup |
| `offerDiscount` | `String` | **SÍ** (ej: `"-25%"`) | **SÍ** (ej: `"-25%"`) | Opcional | **SÍ** (ej: `"-25%"`) | Porcentaje o monto de descuento |
| `offerMsg` | `String` | **SÍ** (Título) | **SÍ** (Píldora) | **SÍ** (Título) | **SÍ** (Título) | Mensaje principal o nombre de la promo |
| `offerDetail` | `String` | Oculto | Oculto | **SÍ** (Detalle) | **SÍ** (Detalle) | Explicación extensa de lo que incluye |
| `offerCode` | `String` | **SÍ** (Copiable) | Oculto | Oculto | **SÍ** (Píldora) | Código del cupón (ej: `PUPUSAS25`) |
| `offerBadge` | `String` | Oculto | Oculto | **SÍ** (Insignia) | **SÍ** (`"¡HOY!"`) | Insignia superior destacada |
| `offerDurationHours` | `Int` | Oculto | **SÍ** (ej: `6`) | Oculto | Oculto | Horas para cuenta regresiva (HRS:MIN:SEG) |
| `offerDistance` | `String` | Oculto | Oculto | Oculto | **SÍ** (ej: `"A 1.2 km"`) | Referencia corta de ubicación |
| `offerExpiry` | `String` | Opcional | Opcional | Opcional | Opcional | Texto descriptivo de vigencia |

---

## 4. Modelos de Datos Actualizados en Kotlin (Android Studio)

Copia y reemplaza estas Data Classes en tu proyecto Android para que tengan paridad al 100% con la Web:

```kotlin
package com.sensunshop.models

import com.google.firebase.database.IgnoreExtraProperties

/**
 * 1. Modelo de Negocio / Comercio / Emergencias
 * Sincronizado con nodo: sensunshop/businesses/<id>
 */
@IgnoreExtraProperties
data class Business(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val type: String = "negocioslocales", // negocioslocales | emprendedores | profesionales | oficios | emergencias
    val category: String = "comercio",
    val badge: String = "",
    val description: String = "",
    val imgSrc: String = "",
    val imageUrl: String = "", // Espejo de imgSrc
    val gallery: List<String> = emptyList(),
    val whatsapp: String = "",
    val whatsappMsg: String = "",
    val phone: String = "", // Llamada directa telefónica estándar (ej: "23823328")
    val websiteUrl: String = "",
    val facebookUrl: String = "",
    val locationUrl: String = "",
    val lat: Double = 13.8767, // Coordenada Latitud (Sensuntepeque por defecto)
    val lng: Double = -88.6319, // Coordenada Longitud (Sensuntepeque por defecto)
    val tags: List<String> = emptyList(),
    
    // Configuración de Oferta Especial
    val hasOffer: Boolean = false,
    val offerMsg: String = "",
    val offerCode: String = "",
    val offerStyle: Int = 1, // 1: Cupón, 2: Festivo, 3: Minimal, 4: Banner
    val offerDiscount: String = "",
    val offerDetail: String = "",
    val offerBadge: String = "",
    val offerDurationHours: Int = 6,
    val offerDistance: String = "",
    val offerExpiry: String = "",
    val accentColor: String = "#e8621a",
    val isActive: Boolean = true
)

/**
 * 2. Modelo de Novedad / Alerta / Boletín
 * Sincronizado con nodo: sensunshop/news/<id>
 */
@IgnoreExtraProperties
data class NewsItem(
    var id: String = "",
    val title: String = "",
    val description: String = "",
    val badge: String = "noticias", // noticias | boletines | informativos | anuncios
    val badgeLabel: String = "NOTICIA",
    val accentColor: String = "#ff6b35",
    val contactWhatsapp: String = "",
    val whatsapp: String = "", // Espejo de contactWhatsapp
    val imageUrl: String = "",
    val imgSrc: String = "", // Espejo de imageUrl
    val locationUrl: String = "",
    val moreText: String = "Ver más", // Texto del botón de acción
    val moreUrl: String = "",
    val link: String = "", // Espejo de moreUrl
    val timestamp: Long = System.currentTimeMillis(),
    val isActive: Boolean = true
)
```

---

## 5. Lógica Crítica de Sincronización en la App Android

### 5.1 Extracción Automática de Coordenadas para el Mapa
Cuando el usuario pegue cualquier enlace de Google Maps en el campo `locationUrl` del formulario, la app debe extraer automáticamente la `lat` y `lng` numéricas antes de guardar en Firebase:

```kotlin
data class GeoPoint(val lat: Double, val lng: Double)

fun extractCoordsFromUrl(url: String): GeoPoint {
    val cleanUrl = url.trim()
    val defaultSensun = GeoPoint(13.8767, -88.6319)

    // 1. Formato Protobuf: !3d13.8768!4d-88.6312
    val regex3d4d = Regex("""!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)""")
    regex3d4d.find(cleanUrl)?.let { match ->
        val lat = match.groupValues[1].toDoubleOrNull()
        val lng = match.groupValues[2].toDoubleOrNull()
        if (lat != null && lng != null) return GeoPoint(lat, lng)
    }

    // 2. Formato @lat,lng: @13.8768,-88.6312
    val regexAt = Regex("""@(-?\d+\.\d+),(-?\d+\.\d+)""")
    regexAt.find(cleanUrl)?.let { match ->
        val lat = match.groupValues[1].toDoubleOrNull()
        val lng = match.groupValues[2].toDoubleOrNull()
        if (lat != null && lng != null) return GeoPoint(lat, lng)
    }

    // 3. Formato Query: ?q=13.8768,-88.6312 o ?center=
    val regexQuery = Regex("""[?&](?:q|query|ll|center|loc)=(-?\d+\.\d+),\s*\+?(-?\d+\.\d+)""")
    regexQuery.find(cleanUrl)?.let { match ->
        val lat = match.groupValues[1].toDoubleOrNull()
        val lng = match.groupValues[2].toDoubleOrNull()
        if (lat != null && lng != null) return GeoPoint(lat, lng)
    }

    // 4. Formato directo: "13.8767, -88.6319"
    val regexDirect = Regex("""^(-?\d{1,2}\.\d+)\s*,\s*(-?\d{1,3}\.\d+)$""")
    regexDirect.find(cleanUrl)?.let { match ->
        val lat = match.groupValues[1].toDoubleOrNull()
        val lng = match.groupValues[2].toDoubleOrNull()
        if (lat != null && lng != null) return GeoPoint(lat, lng)
    }

    return defaultSensun
}
```

### 5.2 Llamadas Telefónicas Directas vs. WhatsApp
La app debe implementar ambos Intents:

```kotlin
// 1. Para llamar directo por teléfono convencional (campo 'phone'):
fun makePhoneCall(context: Context, phoneNumber: String) {
    if (phoneNumber.isNotBlank()) {
        val cleanPhone = phoneNumber.replace(Regex("[^0-9+]"), "")
        val dialIntent = Intent(Intent.ACTION_DIAL, Uri.parse("tel:$cleanPhone"))
        context.startActivity(dialIntent)
    }
}

// 2. Para chatear por WhatsApp (campo 'whatsapp'):
fun openWhatsApp(context: Context, whatsappNumber: String, defaultMsg: String = "") {
    if (whatsappNumber.isNotBlank()) {
        val cleanPhone = whatsappNumber.replace(Regex("[^0-9]"), "")
        val url = "https://api.whatsapp.com/send?phone=$cleanPhone&text=${Uri.encode(defaultMsg)}"
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
        context.startActivity(intent)
    }
}
```

### 5.3 Guardado de Ofertas Especiales en Firebase
Al configurar una oferta especial desde la app para un negocio existente:

```kotlin
suspend fun saveSpecialOffer(
    db: DatabaseReference,
    businessId: String,
    style: Int,
    discount: String,
    msg: String,
    detail: String,
    code: String,
    badge: String,
    durationHours: Int,
    distance: String,
    expiry: String
) {
    val bizRef = db.child("sensunshop/businesses").child(businessId)
    
    val offerUpdates = mapOf<String, Any>(
        "hasOffer" to true,
        "offerStyle" to style,
        "offerDiscount" to discount,
        "offerMsg" to msg,
        "offerDetail" to detail,
        "offerCode" to code.uppercase(),
        "offerBadge" to badge,
        "offerDurationHours" to durationHours,
        "offerDistance" to distance,
        "offerExpiry" to expiry
    )

    bizRef.updateChildren(offerUpdates).await()
}
```
