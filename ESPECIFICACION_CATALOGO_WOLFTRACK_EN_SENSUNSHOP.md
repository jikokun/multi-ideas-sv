# 🐺 ESPECIFICACIÓN TÉCNICA: Integración Triangular del Catálogo WolfTrack en Sensun Shop
## Sincronización en Tiempo Real: App WolfTrack ➔ Web Multi Ideas SV ➔ App Sensun Shop

> **Documento Oficial de Integración de Ecosistemas**  
> **Versión:** 1.0 (Prueba Piloto de Sincronía Triangular Multi-Plataforma)  
> **Fecha:** Octubre 2026  
> **Autor:** Multi Ideas SV / Sensun Shop Architecture

---

## 🎯 1. Propósito y Visión General

El objetivo de esta integración es conectar de forma fluida **dos aplicaciones móviles Android independientes y una plataforma web central** para que el inventario administrado por el comerciante se refleje de manera instantánea ante los clientes:

```text
┌─────────────────────────────────┐
│   1. App Android WolfTrack      │  Administrador (Ing. Isaí Claros)
│   (Control de Stock & Ventas)   │  Modifica productos, precios o existencias
└────────────────┬────────────────┘
                 │
                 ▼  Guarda en Firebase RTDB (JikoPuntos): wolftrack/materials/{UID}
┌─────────────────────────────────┐
│  2. Web Hub (multiideassv.com)  │  Renderiza catálogo web dinámico y
│  - wolftrack.html               │  conecta el perfil de Multi Ideas SV (EMP-002)
│  - sensunshop/emprendedores     │  dentro del ecosistema Sensun Shop
└────────────────┬────────────────┘
                 │
                 ▼  Sincronización de Catálogo en Vivo
┌─────────────────────────────────┐
│  3. App Android Sensun Shop     │  Cliente Final / Usuarios Locales
│  (Directorio Comercial Local)   │  Abre el perfil de Multi Ideas SV y visualiza
│                                 │  el Catálogo Interactivo con botón WhatsApp
└─────────────────────────────────┘
```

---

## 🔑 2. Credenciales y Nodos del Ecosistema

| Componente | Proyecto Firebase | Nodo RTDB Principal | Clave Identificadora |
| :--- | :--- | :--- | :--- |
| **App WolfTrack** | `JikoPuntos` (`com-example-jikopuntos-f9ff5`) | `wolftrack/materials/{USER_ID}` | UID: `PyVEtkbRXJgHyW3hEfjmMxS9e682` |
| **App Sensun Shop** | `sensunshopweb` (`sensunshopweb`) | `sensunshop/businesses/{businessId}` | ID: `emp-002` (Código: `EMP-002`) |
| **Web Multi Ideas SV**| Conector Dual (Multi-App) | `wolftrack.html?uid={UID}` | URL pública de catálogo interactivo |

---

## 🏗️ 3. Fase 1: Actualización del Modelo de Negocio en Sensun Shop

Para habilitar que cualquier negocio registrado en Sensun Shop (comenzando por la prueba piloto con **Multi Ideas SV**) pueda vincular su catálogo de WolfTrack, se amplía el nodo `sensunshop/businesses/<businessId>` en Firebase Realtime Database con los siguientes 3 campos:

### 3.1 Nuevos Campos en Firebase RTDB (`sensunshop/businesses/emp-002`)

```json
{
  "hasCatalog": true,
  "catalogUid": "PyVEtkbRXJgHyW3hEfjmMxS9e682",
  "catalogUrl": "https://multiideassv.com/wolftrack.html?uid=PyVEtkbRXJgHyW3hEfjmMxS9e682"
}
```

* `hasCatalog` (`Boolean`): `true` indica a la App y a la Web que este negocio dispone de catálogo en vivo.
* `catalogUid` (`String`): UID del propietario en WolfTrack para consultas nativas directas.
* `catalogUrl` (`String`): Enlace directo de la tienda web optimizado para móviles con WhatsApp.

---

## 📱 4. Fase 2: Lineamientos para la IA de Desarrollo de la App Sensun Shop

Copia y entrega las siguientes directrices al equipo / IA de desarrollo de la **App Android de Sensun Shop**:

### 4.1 Actualización del Modelo de Datos en Kotlin (`Business.kt`)
Agrega los nuevos campos opcionales a la Data Class de Negocio:

```kotlin
package com.sensunshop.models

import com.google.firebase.database.IgnoreExtraProperties

@IgnoreExtraProperties
data class Business(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val type: String = "emprendedores",
    val category: String = "servicios",
    val badge: String = "",
    val description: String = "",
    val imgSrc: String = "",
    val whatsapp: String = "",
    val phone: String = "",
    val locationUrl: String = "",
    val websiteUrl: String = "",
    val facebookUrl: String = "",
    val isActive: Boolean = true,
    
    // ⭐ NUEVA INTEGRACIÓN WOLFTRACK CATALOG:
    val hasCatalog: Boolean = false,
    val catalogUid: String = "",
    val catalogUrl: String = ""
)
```

### 4.2 Lógica de Interfaz en la App Sensun Shop
En la vista de tarjeta o en la pantalla de detalle del negocio (`BusinessDetailActivity` o `BusinessViewHolder`):

1. **Visibilidad del Botón de Catálogo:**
   Si `business.hasCatalog == true` (o `business.id == "emp-002"`), mostrar un botón destacado con estética distintiva (color ámbar o esmeralda con ícono de bolsa de compra):
   * **Texto del botón:** `"🛍️ Ver Catálogo en Vivo"`
   * **Subtítulo o badge:** `"WolfTrack Sync"`

2. **Acción al presionar el botón (Recomendación Oficial: Custom Tabs):**
   Para asegurar que el usuario disfrute del carrito interactivo, cálculo de variantes y extras, y conexión directa a WhatsApp con el formato óptimo, abre el catálogo utilizando **Chrome Custom Tabs** (in-app browser de alto rendimiento) con animación suave:

```kotlin
fun openWolfTrackCatalog(context: Context, catalogUrl: String?, catalogUid: String?) {
    val finalUrl = when {
        !catalogUrl.isNullOrBlank() -> catalogUrl
        !catalogUid.isNullOrBlank() -> "https://multiideassv.com/wolftrack.html?uid=$catalogUid"
        else -> "https://multiideassv.com/wolftrack.html?uid=PyVEtkbRXJgHyW3hEfjmMxS9e682"
    }

    try {
        val customTabsIntent = androidx.browser.customtabs.CustomTabsIntent.Builder()
            .setShowTitle(true)
            .setDefaultColorSchemeParams(
                androidx.browser.customtabs.CustomTabColorSchemeParams.Builder()
                    .setToolbarColor(android.graphics.Color.parseColor("#080a0f"))
                    .setNavigationBarColor(android.graphics.Color.parseColor("#080a0f"))
                    .build()
            )
            .build()
            
        customTabsIntent.launchUrl(context, android.net.Uri.parse(finalUrl))
    } catch (e: Exception) {
        // Fallback a navegador estándar si no hay soporte de Custom Tabs
        val browserIntent = android.content.Intent(android.content.Intent.ACTION_VIEW, android.net.Uri.parse(finalUrl))
        context.startActivity(browserIntent)
    }
}
```

3. **(Opcional - Fase Nativa Completa):**
   Si se desea una pantalla 100% nativa con `RecyclerView`, la app Sensun Shop puede conectarse como cliente de lectura secundaria al nodo `wolftrack/materials/{catalogUid}` de Firebase RTDB usando las reglas públicas ya configuradas (`.read: true`).

---

## 💻 5. Fase 3: Integración en Sensun Shop Web (`multiideassv.com`)

En la plataforma web, el perfil de Multi Ideas SV (`emp-002`) en [sensunshop/emprendedores.html](file:///e:/Proyectos%20Web/multi-ideas-sv/sensunshop/emprendedores.html) y en [sensunshop.html](file:///e:/Proyectos%20Web/multi-ideas-sv/sensunshop.html) se actualiza de la siguiente forma:

1. **Botón de Catálogo en la Tarjeta:**
   Se añade junto a *WhatsApp*, *Ubicación* y *Sitio Web* el nuevo botón interactivo:
   ```html
   <a href="wolftrack.html?uid=PyVEtkbRXJgHyW3hEfjmMxS9e682" 
      class="btn-negocio btn-cat a1-business-btn-cat" 
      target="_blank" 
      rel="noopener noreferrer"
      style="border-color: rgba(245, 158, 11, 0.4); color: var(--wolf-amber, #f59e0b);">
       🛍️ Catálogo en Vivo
   </a>
   ```

2. **Badge Destacado:**
   Píldora interactiva en la cabecera de la tarjeta: `"CATÁLOGO DIGITAL ACTIVO"`.

3. **Incrustación Modal Rápida (Pop-up View):**
   Opción para abrir un visor instantáneo sin salir de la página de Sensun Shop.

---

## 🧪 6. Protocolo de Validación de la Prueba Piloto

Para certificar que la sincronía triangular funciona a la perfección:

1. **Paso 1 (Edición en WolfTrack):**  
   Desde la app móvil WolfTrack, cambiar el precio de *"Tarjetas de presentación"* de `$10.00` a `$12.00` o agregar 5 unidades de stock.
2. **Paso 2 (Verificación Web):**  
   Abrir `https://multiideassv.com/wolftrack.html?uid=PyVEtkbRXJgHyW3hEfjmMxS9e682` y comprobar que el precio subió a `$12.00` automáticamente.
3. **Paso 3 (Verificación Sensun Shop App & Web):**  
   Abrir la App Android de Sensun Shop, entrar a *Emprendedores*, presionar *"Ver Catálogo en Vivo"* en la tarjeta de **Multi Ideas SV** y constatar que muestra exactamente el mismo inventario actualizado.
