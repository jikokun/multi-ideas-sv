# Manual de Integración y Sincronización: Sensun Shop (Web <-> Android App)

Este documento contiene la **especificación técnica completa de la arquitectura de datos**, modelos, flujos de autenticación y lógica en tiempo real compartida entre el sitio web **Sensun Shop (Multi Ideas Sv)** y la **App Nativa en Android Studio**.

---

## 1. Configuración de Firebase Compartida

Tanto la plataforma Web como la App Android utilizan el mismo proyecto en la consola de Firebase:

- **Proyecto Firebase**: `sensunshopweb`
- **ID de Proyecto**: `sensunshopweb`
- **URL de Base de Datos**: `https://sensunshopweb-default-rtdb.firebaseio.com`
- **Storage Bucket**: `sensunshopweb.firebasestorage.app`
- **Auth Domain**: `sensunshopweb.firebaseapp.com`
- **Base de Datos**: Firebase Realtime Database (RTDB)

> **En Android Studio:**
> Asegúrate de colocar el archivo oficial `google-services.json` correspondiente al proyecto `sensunshopweb` dentro de la carpeta `/app` de tu proyecto Android.

---

## 2. Mapa Completo del Árbol JSON en Realtime Database

```
root/
├── sensunshop/
│   ├── businesses/                  <-- Catálogo unificado de Negocios
│   │   └── <businessId>/
│   │       ├── id: String           (ej: "arphotostudio", "neg-005")
│   │       ├── code: String         (ej: "NEG-008", "NEG-005", "EMP-001")
│   │       ├── title: String        (ej: "Mr. Taco")
│   │       ├── type: String         ("negocioslocales" | "emprendedores" | "profesionales")
│   │       ├── category: String     ("comida" | "servicios" | "comercio" | "graduados" | "artesanias")
│   │       ├── badge: String        (ej: "RESTAURANTE & TAQUERÍA")
│   │       ├── description: String
│   │       ├── imgSrc: String       (URL Cloudinary o WebP)
│   │       ├── gallery: List<String>
│   │       ├── whatsapp: String     (ej: "50379130700")
│   │       ├── whatsappMsg: String  (Mensaje predeterminado de saludo)
│   │       ├── locationUrl: String  (Enlace de Google Maps)
│   │       ├── websiteUrl: String   (Enlace web opcional o vacío)
│   │       ├── hasOffer: Boolean    (true / false)
│   │       ├── offerMsg: String     (ej: "2x1 en tacos todos los martes")
│   │       ├── accentColor: String  (ej: "#e74c3c", "#f39c12", "#00adb5")
│   │       ├── tags: List<String>   (Lista de etiquetas para búsqueda y filtro)
│   │       └── isActive: Boolean    (true/false)
│   │
│   ├── news/                        <-- Noticias, promociones y boletines
│   │   └── <newsId>/
│   │       ├── id: String
│   │       ├── title: String
│   │       ├── description: String
│   │       ├── imageUrl: String     (URL de la imagen)
│   │       ├── badge: String        ('noticias' | 'boletines' | 'informativos' | 'anuncios')
│   │       ├── badgeLabel: String   (Opcional, etiqueta para visualización)
│   │       ├── accentColor: String  (Color hexadecimal según badge)
│   │       ├── contactWhatsapp: String
│   │       ├── locationUrl: String
│   │       ├── moreUrl: String
│   │       ├── timestamp: Long
│   │       └── isActive: Boolean
│   │
│   └── ratings/                     <-- Votos globales de cada negocio
│       └── <businessId>/
│           └── <uid_usuario>: Int   (Valor del 1 al 5)
│
├── comments/                        <-- Comentarios comunitarios anónimos
│   └── <businessId>/
│       └── <commentPushId>/
│           ├── text: String         (Contenido del comentario)
│           ├── timestamp: Long      (Milisegundos Unix)
│           ├── uid: String          (UID del autor en Firebase Auth)
│           └── editedAt: Long?      (Opcional, milisegundos de edición)
│
└── users/                           <-- Datos privados y actividad del usuario
    └── <uid>/
        ├── sensunshop_favorites/    <-- Lista de favoritos del usuario
        │   └── <businessId>: true   (Se crea con true, se borra al desmarcar)
        │
        └── sensunshop_ratings/      <-- Historial de votos del usuario
            └── <businessId>/
                ├── rating: Int      (1 al 5)
                └── timestamp: Long  (Milisegundos)
```

---

## 3. Modelos de Datos en Kotlin (Data Classes)

Copia estas clases en tu paquete de modelos en Android (`com.sensunshop.app.models` o similar):

```kotlin
package com.sensunshop.models

import com.google.firebase.database.IgnoreExtraProperties

/**
 * 1. Modelo de Negocio / Emprendimiento / Profesional
 */
@IgnoreExtraProperties
data class Business(
    val id: String = "",
    val code: String = "",
    val title: String = "",
    val type: String = "negocioslocales", // negocioslocales | emprendedores | profesionales
    val category: String = "comida",
    val badge: String = "",
    val description: String = "",
    val imgSrc: String = "",
    val gallery: List<String> = emptyList(),
    val whatsapp: String = "",
    val whatsappMsg: String = "",
    val locationUrl: String = "",
    val websiteUrl: String = "",
    val hasOffer: Boolean = false,
    val offerMsg: String = "",
    val accentColor: String = "#f39c12",
    val tags: List<String> = emptyList(),
    val isActive: Boolean = true
)

/**
 * 2. Modelo de Noticia / Boletín / Promoción
 */
@IgnoreExtraProperties
data class NewsItem(
    var id: String = "",
    val title: String = "",
    val description: String = "",
    val imageUrl: String = "",
    val badge: String = "noticias", // 'noticias' | 'boletines' | 'informativos' | 'anuncios'
    val badgeLabel: String = "",
    val accentColor: String = "",
    val contactWhatsapp: String = "",
    val locationUrl: String = "",
    val moreUrl: String = "",
    val hasOffer: Boolean = false,
    val offerMsg: String = "",
    val date: String = "",
    val timestamp: Long = 0L,
    val isActive: Boolean = true
)

/**
 * 3. Modelo de Comentario Comunitario
 */
@IgnoreExtraProperties
data class BusinessComment(
    var id: String = "",
    val text: String = "",
    val timestamp: Long = 0L,
    val uid: String = "",
    val editedAt: Long? = null
)

/**
 * 4. Modelo de Calificación registrada por usuario
 */
@IgnoreExtraProperties
data class UserRatingHistory(
    val rating: Int = 0,
    val timestamp: Long = 0L
)

/**
 * 5. Resumen calculado de Calificaciones para la UI
 */
data class RatingSummary(
    val average: Float = 0f,
    val votesCount: Int = 0,
    val userVote: Int? = null
)
```

---

## 4. Repositorio Firebase en Android (Kotlin)

Implementa este repositorio centralizado para gestionar las consultas y sincronización en tiempo real:

```kotlin
package com.sensunshop.repository

import com.google.firebase.auth.FirebaseAuth
import com.google.firebase.database.*
import com.sensunshop.models.Business
import com.sensunshop.models.NewsItem
import com.sensunshop.models.BusinessComment
import com.sensunshop.models.RatingSummary
import com.sensunshop.models.UserRatingHistory
import kotlinx.coroutines.channels.awaitClose
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.callbackFlow
import kotlinx.coroutines.tasks.await

class SensunShopRepository {

    private val db: DatabaseReference = FirebaseDatabase.getInstance().reference
    private val auth: FirebaseAuth = FirebaseAuth.getInstance()

    val currentUserId: String?
        get() = auth.currentUser?.uid

    // =========================================================================
    // 1. CATÁLOGO DE NEGOCIOS (Tiempo Real con Flow)
    // =========================================================================
    fun getBusinessesFlow(): Flow<List<Business>> = callbackFlow {
        val ref = db.child("sensunshop/businesses")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<Business>()
                for (child in snapshot.children) {
                    val business = child.getValue(Business::class.java)
                    if (business != null && business.isActive) {
                        list.add(business)
                    }
                }
                trySend(list)
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    // =========================================================================
    // 2. NOTICIAS Y BOLETINES (Tiempo Real con Flow)
    // =========================================================================
    fun getNewsFlow(): Flow<List<NewsItem>> = callbackFlow {
        val ref = db.child("sensunshop/news")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<NewsItem>()
                for (child in snapshot.children) {
                    val news = child.getValue(NewsItem::class.java)
                    if (news != null && news.isActive) {
                        news.id = child.key ?: ""
                        list.add(news)
                    }
                }
                list.sortByDescending { it.timestamp }
                trySend(list)
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        ref.addValueEventListener(listener)
        awaitClose { ref.removeEventListener(listener) }
    }

    // =========================================================================
    // 2. CALIFICACIONES POR NEGOCIO (Estrellas en Tiempo Real)
    // =========================================================================
    fun getRatingSummaryFlow(businessId: String): Flow<RatingSummary> = callbackFlow {
        val ratingsRef = db.child("sensunshop/ratings").child(businessId)
        val currentUid = currentUserId

        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                var sum = 0
                var count = 0
                var userVote: Int? = null

                for (child in snapshot.children) {
                    val vote = child.getValue(Int::class.java) ?: 0
                    sum += vote
                    count++
                    if (child.key == currentUid) {
                        userVote = vote
                    }
                }

                val average = if (count > 0) sum.toFloat() / count else 0f
                trySend(RatingSummary(average = average, votesCount = count, userVote = userVote))
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        ratingsRef.addValueEventListener(listener)
        awaitClose { ratingsRef.removeEventListener(listener) }
    }

    // Emitir o cambiar voto (Sincroniza el negocio y el registro del usuario)
    suspend fun submitRating(businessId: String, stars: Int) {
        val uid = currentUserId ?: throw IllegalStateException("Usuario no autenticado")
        
        // 1. Guardar en el nodo del negocio
        db.child("sensunshop/ratings").child(businessId).child(uid).setValue(stars).await()

        // 2. Guardar en el historial del usuario
        val history = UserRatingHistory(rating = stars, timestamp = System.currentTimeMillis())
        db.child("users").child(uid).child("sensunshop_ratings").child(businessId).setValue(history).await()
    }

    // =========================================================================
    // 3. COMENTARIOS COMUNITARIOS (Tiempo Real)
    // =========================================================================
    fun getCommentsFlow(businessId: String): Flow<List<BusinessComment>> = callbackFlow {
        val commentsRef = db.child("comments").child(businessId)
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val list = mutableListOf<BusinessComment>()
                for (child in snapshot.children) {
                    val comment = child.getValue(BusinessComment::class.java)
                    if (comment != null) {
                        comment.id = child.key ?: ""
                        list.add(comment)
                    }
                }
                list.sortBy { it.timestamp }
                trySend(list)
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        commentsRef.addValueEventListener(listener)
        awaitClose { commentsRef.removeEventListener(listener) }
    }

    // Publicar comentario (Control Anti-Spam: 1 comentario por usuario)
    suspend fun postComment(businessId: String, text: String) {
        val uid = currentUserId ?: throw IllegalStateException("Usuario no autenticado")
        val commentsRef = db.child("comments").child(businessId)

        // Verificar si ya existe comentario del usuario
        val snapshot = commentsRef.get().await()
        for (child in snapshot.children) {
            val authorUid = child.child("uid").getValue(String::class.java)
            if (authorUid == uid) {
                // Modo actualización si ya existe
                child.ref.updateChildren(mapOf(
                    "text" to text,
                    "editedAt" to System.currentTimeMillis()
                )).await()
                return
            }
        }

        // Crear nuevo comentario
        val newCommentRef = commentsRef.push()
        val newComment = BusinessComment(
            text = text,
            timestamp = System.currentTimeMillis(),
            uid = uid
        )
        newCommentRef.setValue(newComment).await()
    }

    // Eliminar comentario
    suspend fun deleteComment(businessId: String, commentId: String) {
        db.child("comments").child(businessId).child(commentId).removeValue().await()
    }

    // =========================================================================
    // 4. FAVORITOS DEL USUARIO
    // =========================================================================
    fun getFavoritesFlow(): Flow<Set<String>> = callbackFlow {
        val uid = currentUserId
        if (uid == null) {
            trySend(emptySet())
            close()
            return@callbackFlow
        }

        val favRef = db.child("users").child(uid).child("sensunshop_favorites")
        val listener = object : ValueEventListener {
            override fun onDataChange(snapshot: DataSnapshot) {
                val favSet = mutableSetOf<String>()
                for (child in snapshot.children) {
                    if (child.getValue(Boolean::class.java) == true) {
                        child.key?.let { favSet.add(it) }
                    }
                }
                trySend(favSet)
            }

            override fun onCancelled(error: DatabaseError) {
                close(error.toException())
            }
        }
        favRef.addValueEventListener(listener)
        awaitClose { favRef.removeEventListener(listener) }
    }

    suspend fun toggleFavorite(businessId: String, isCurrentlyFav: Boolean) {
        val uid = currentUserId ?: throw IllegalStateException("Usuario no autenticado")
        val favRef = db.child("users").child(uid).child("sensunshop_favorites").child(businessId)
        if (isCurrentlyFav) {
            favRef.removeValue().await()
        } else {
            favRef.setValue(true).await()
        }
    }
}
```

---

## 5. Manejo de Fotos y Avatares de Perfil

El campo `photoURL` de Firebase Auth puede venir en dos formatos:

1. **URL Directa HTTPS** (Google Drive o Cloudinary):
   - Ejemplo: `https://res.cloudinary.com/dn6fmqae9/...`
   - **En Android**: Cárgala directamente con **Glide** o **Coil**.
   ```kotlin
   Glide.with(context)
       .load(photoUrl)
       .circleCrop()
       .placeholder(R.drawable.ic_default_avatar)
       .into(avatarImageView)
   ```

2. **Avatar Prediseñado** (`clave|colorHex`):
   - Ejemplo: `"male1|#3498db"`, `"female2|#8e44ad"`
   - **En Android**: Separa el string por `|` para asignar el vector drawable y el color de fondo:
   ```kotlin
   fun applyCustomAvatar(photoUrl: String?, imageView: ImageView) {
       if (photoUrl.isNullOrEmpty()) {
           imageView.setImageResource(R.drawable.ic_default_avatar)
           return
       }

       if (photoUrl.startsWith("http://") || photoUrl.startsWith("https://")) {
           Glide.with(imageView).load(photoUrl).circleCrop().into(imageView)
       } else if (photoUrl.contains("|")) {
           val parts = photoUrl.split("|")
           val avatarKey = parts[0] // "male1", "male2", "female1", "female2"
           val colorHex = parts.getOrNull(1) ?: "#f39c12"

           val resId = when(avatarKey) {
               "male1" -> R.drawable.ic_avatar_male1
               "male2" -> R.drawable.ic_avatar_male2
               "female1" -> R.drawable.ic_avatar_female1
               "female2" -> R.drawable.ic_avatar_female2
               else -> R.drawable.ic_default_avatar
           }
           imageView.setImageResource(resId)
           imageView.backgroundTintList = ColorStateList.valueOf(Color.parseColor(colorHex))
       }
   }
   ```

---

## 6. Enlaces Externos (WhatsApp y Ubicación Maps)

Para abrir WhatsApp y Google Maps desde la App exactamente como en la Web:

```kotlin
// Abrir WhatsApp con mensaje precargado
fun openWhatsApp(context: Context, phone: String, message: String) {
    val cleanPhone = phone.replace("+", "").replace(" ", "").trim()
    val encodedMsg = java.net.URLEncoder.encode(message, "UTF-8")
    val url = "https://api.whatsapp.com/send?phone=$cleanPhone&text=$encodedMsg"
    val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
    context.startActivity(intent)
}

// Abrir Ubicación en Google Maps
fun openGoogleMaps(context: Context, locationUrl: String) {
    if (locationUrl.isNotEmpty()) {
        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(locationUrl))
        context.startActivity(intent)
    }
}
```

---

## 7. Persistencia Offline en Android

En tu clase `Application` de Android, habilita la persistencia local de Firebase para que el catálogo de Sensun Shop funcione incluso sin conexión a internet:

```kotlin
class SensunShopApp : Application() {
    override fun onCreate() {
        super.onCreate()
        // Habilitar caché local offline en Android
        FirebaseDatabase.getInstance().setPersistenceEnabled(true)
    }
}
```

---

## 8. Archivo Semilla (Seed) de la Base de Datos

En el directorio raíz del proyecto web se ha generado el archivo [`sensunshop_database_seed.json`](file:///e:/Proyectos%20Web/multi-ideas-sv/sensunshop_database_seed.json).

### Cómo importarlo a Firebase:
1. Entra a la [Consola de Firebase](https://console.firebase.google.com/).
2. Selecciona el proyecto **sensunshopweb**.
3. Ve a **Realtime Database**.
4. Haz clic en los tres puntos verticales **⋮** (esquina superior derecha) y selecciona **Importar JSON**.
5. Selecciona el archivo `sensunshop_database_seed.json` para poblar el catálogo de negocios.

---

## 9. Sistema de Notificaciones Push Automáticas (Firebase Cloud Functions + FCM v1)

Para despertar los dispositivos Android cuando se publica una noticia u oferta en la web sin exponer claves privadas en el frontend, se ha implementado un motor serverless con **Firebase Cloud Functions**.

### 📡 Arquitectura de Notificación
1. **Trigger de Base de Datos**: Cada vez que se crea un nodo en `/sensunshop/news/{newsId}` o `/sensunshop/offers/{offerId}`, Firebase dispara la función `sendNewsNotificationOnCreate` o `sendOfferNotificationOnCreate`.
2. **Protocolo Oficial**: Utiliza **FCM HTTP v1** autenticado de manera segura a nivel de servidor con `firebase-admin`.
3. **Tópico Compartido**: Envía el mensaje al tópico `news` con `priority: "high"` y canal `sensun_news_channel`.

### 📦 Estructura del Payload Recibido en Android

```json
{
  "notification": {
    "title": "¡Nueva Noticia en Sensun Shop! 📢",
    "body": "Acabamos de publicar: [Título de la Noticia]",
    "imageUrl": "https://..."
  },
  "data": {
    "title": "¡Nueva Noticia en Sensun Shop!",
    "message": "Acabamos de publicar: [Título de la Noticia]",
    "type": "news",
    "newsId": "-Nz123456",
    "badge": "PROMO",
    "badgeLabel": "Promoción",
    "imgSrc": "https://...",
    "description": "Detalle...",
    "whatsapp": "50379130700",
    "locationUrl": "https://maps.google.com/...",
    "timestamp": "1724350000000"
  },
  "android": {
    "priority": "high",
    "notification": {
      "channelId": "sensun_news_channel",
      "sound": "default"
    }
  }
}
```

### 🚀 Comandos para Desplegar las Funciones

Desde la terminal en el directorio raíz del proyecto web:

```powershell
# 1. Iniciar sesión en Firebase (si no lo has hecho)
npx firebase-tools login

# 2. Desplegar únicamente las Cloud Functions
npx firebase-tools deploy --only functions
```

### 🧪 Endpoint de Prueba Directo

Puedes disparar una notificación de prueba instantánea abriendo en tu navegador:
`https://us-central1-sensunshopweb.cloudfunctions.net/sendTestPushNotification?title=Prueba%20Sensun&message=Mensaje%20de%20prueba`

---

## 10. Sistema de Carga de Imágenes (Google Drive Script)

Para mantener paridad total entre la aplicación Android y el panel web administrativo, las imágenes se procesan a través del Web App Script de Google Drive:

- **Endpoint (POST)**: `https://script.google.com/macros/s/AKfycbzbs8jxFRoaPHOIX_5uuEUm2BEwq9RsYUj3tCZYY9d4fJ59ns1gFrm_cIrOyHnDxYi0/exec`
- **Payload (JSON)**:
  ```json
  {
    "base64": "datos_en_base64_sin_prefijo",
    "userName": "Web_Admin_Panel",
    "filename": "nombre_archivo.jpg",
    "mimeType": "image/jpeg"
  }
  ```
- **Respuesta JSON**:
  ```json
  {
    "status": "success",
    "fileUrl": "https://lh3.googleusercontent.com/d/...",
    "fileId": "..."
  }
  ```
- **Persistencia en Firebase RTDB**:
  - `sensunshop/businesses/<bizId>/imgSrc`: Enlace devuelto en `fileUrl`.
  - `sensunshop/news/<newsId>/imageUrl`: Enlace devuelto en `fileUrl`.


