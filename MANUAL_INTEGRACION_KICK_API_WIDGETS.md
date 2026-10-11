# 📖 Manual Técnico de Integración con la API de Kick para Widgets Públicos

Este manual documenta en profundidad cómo interactúa el sistema con la infraestructura oficial de **Kick**, cómo resolver dinámicamente cualquier canal con solo ingresar un **nombre de usuario** y el catálogo completo de funcionalidades y eventos que se pueden absorber en tiempo real.

---

## 📑 Tabla de Contenidos
1. [Arquitectura General (El Modelo Dual de Kick)](#1-arquitectura-general-el-modelo-dual-de-kick)
2. [Resolución Dinámica por Nombre de Usuario](#2-resolución-dinámica-por-nombre-de-usuario)
3. [API REST de Kick: Endpoints y Metadatos](#3-api-rest-de-kick-endpoints-y-metadatos)
4. [Pusher WebSocket en Tiempo Real: Conexión y Claves](#4-pusher-websocket-en-tiempo-real-conexión-y-claves)
5. [Catálogo de Eventos Interceptables](#5-catálogo-de-eventos-interceptables)
6. [Manejo de CORS y Entornos de Producción](#6-manejo-de-cors-y-entornos-de-producción)
7. [Plantilla Base Reutilizable para Widgets Públicos](#7-plantilla-base-reutilizable-para-widgets-públicos)

---

## 1. Arquitectura General (El Modelo Dual de Kick)

Kick utiliza una arquitectura dividida en dos capas complementarias:

```mermaid
flowchart TD
    Usuario([👤 Espectador ingresa nombre de usuario]) --> Resolver[🔍 Resolver Canal en API REST]
    
    subgraph REST_API ["Capa 1: Kick REST API (Metadatos Estáticos y Estado)"]
        Resolver -->|GET /api/v2/channels/{username}| KickREST["Servidores Kick REST"]
        KickREST --> Extraccion["Extraer channel_id, chatroom_id, avatar, bio, livestream"]
    end
    
    subgraph WS_PUSHER ["Capa 2: Kick Pusher Cloud (Eventos en Tiempo Real)"]
        Extraccion --> Suscribir["Conectar a Pusher WebSocket"]
        Suscribir -->|channel.{channel_id}| CanalStatus["StreamerIsLive / StopBroadcast / Subs / Raids"]
        Suscribir -->|chatrooms.{chatroom_id}.v2| CanalChat["ChatMessageEvent / Moderación / Encuestas"]
    end

    CanalStatus --> Widget[🖥️ Tu Widget Público / Overlay / Dashboard]
    CanalChat --> Widget
```

1. **Capa REST (HTTP):** Para obtener la "foto actual": ¿está prendido el stream?, ¿cuántos viewers tiene?, ¿cuál es el avatar?, ¿cuál es el ID del canal y de la sala de chat?
2. **Capa WebSocket (Pusher Cloud):** Para el flujo en vivo continuo (0 latencia): cada mensaje escrito, cada nuevo sub, alertas, raids y cambio de estado del directo.

---

## 2. Resolución Dinámica por Nombre de Usuario

Para que un widget funcione con **cualquier streamer** simplemente escribiendo su nombre (ej. `sensun`, `xqc`, `westcol`, etc.), el flujo consta de 2 pasos automáticos:

### Paso 1: Descubrimiento de Identificadores
Kick no usa el nombre del streamer para sus WebSockets; usa dos números internos:
* **`channel_id`**: Identifica al canal (ej. alertas de live, subs, follows).
* **`chatroom_id`**: Identifica la sala de chat.

```javascript
/**
 * Resuelve los metadatos de cualquier streamer en Kick
 * @param {string} username - Nombre del canal (slug)
 */
async function resolverCanalKick(username) {
  const cleanUser = username.trim().toLowerCase();
  
  // Endpoint oficial de Kick
  const url = `https://kick.com/api/v2/channels/${cleanUser}`;
  
  // Usamos proxy para evitar bloqueos de CORS en el navegador
  const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
  
  const response = await fetch(proxyUrl);
  if (!response.ok) {
    throw new Error(`Canal de Kick no encontrado: @${cleanUser}`);
  }
  
  const data = await response.json();
  
  return {
    channelId: data.id,                     // ID numérico del canal
    chatroomId: data.chatroom?.id || data.id, // ID de la sala de chat
    username: data.slug,
    displayName: data.user?.username || data.slug,
    avatar: data.user?.profile_pic || '',
    bio: data.user?.bio || '',
    seguidores: data.followers_count || 0,
    isLive: data.livestream !== null,
    livestream: data.livestream ? {
      id: data.livestream.id,
      titulo: data.livestream.session_title,
      viewers: data.livestream.viewer_count,
      iniciadoEn: data.livestream.created_at,
      categoria: data.livestream.categories?.[0]?.name || 'Variedad'
    } : null
  };
}
```

---

## 3. API REST de Kick: Endpoints y Metadatos

| Endpoint | Utilidad en Widgets |
| :--- | :--- |
| `GET https://kick.com/api/v2/channels/{username}` | **El endpoint maestro.** Devuelve información completa del canal, chatroom, streamer y livestream activo. |
| `GET https://kick.com/api/v1/channels/{username}` | Versión ligera anterior. Útil como fallback para perfiles y avatares. |
| `GET https://kick.com/api/v1/users/{username}` | Metadatos directos del usuario (bio, enlaces a redes sociales, avatar oficial). |

### Estructura clave de la respuesta `/api/v2/channels/{username}`:
```json
{
  "id": 1866891,
  "user_id": 1926986,
  "slug": "sensun",
  "playback_url": "https://.../master.m3u8",
  "chatroom": {
    "id": 1866891,
    "slow_mode": false,
    "subscribers_only": false
  },
  "livestream": {
    "id": 131797381,
    "session_title": "DOmingo de todo un poco...",
    "viewer_count": 8,
    "created_at": "2026-10-11 18:11:53"
  },
  "user": {
    "username": "sensun",
    "profile_pic": "https://files.kick.com/images/.../conversion/...webp"
  }
}
```

---

## 4. Pusher WebSocket en Tiempo Real: Conexión y Claves

Kick aloja su cluster de WebSocket en Pusher con credenciales públicas universales que utiliza la propia web oficial de Kick:

* **Pusher App Key:** `32cbd69e4b950bf97679`
* **Cluster:** `us2`
* **Protocolo:** `7`
* **URL de Conexión Nativa:**  
  `wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.6.0&flash=false`

### Suscripción a Canales
Una vez abierto el WebSocket, se envían las tramas de suscripción en formato JSON:

```javascript
// 1. Suscripción a eventos de canal (inicios de stream, subs, raids)
ws.send(JSON.stringify({
  event: 'pusher:subscribe',
  data: { channel: `channel.${channelId}` }
}));

// 2. Suscripción al chat en vivo
ws.send(JSON.stringify({
  event: 'pusher:subscribe',
  data: { channel: `chatrooms.${chatroomId}.v2` }
}));
```

---

## 5. Catálogo de Eventos Interceptables

Kick emite eventos en tiempo real con prefijos de namespace `App\Events\...`:

### A. Eventos de Chat (`chatrooms.{chatroomId}.v2`)

| Evento | Descripción | Campos Destacados |
| :--- | :--- | :--- |
| `App\Events\ChatMessageEvent` | Mensaje enviado por cualquier usuario en el chat. | `content`, `sender.username`, `sender.identity.badges`, `sender.identity.color`, `created_at` |
| `App\Events\MessageDeletedEvent` | Un moderador borró un mensaje específico. | `message.id` |
| `App\Events\UserBannedEvent` | Un usuario fue baneado o silenciado (timeout). | `user.id`, `user.username`, `expires_at` |
| `App\Events\UserUnbannedEvent` | Un usuario fue desbaneado. | `user.id`, `user.username` |
| `App\Events\PollUpdateEvent` | Se creó o actualizó una encuesta en el canal. | `poll.title`, `poll.options`, `poll.remaining` |
| `App\Events\PollDeleteEvent` | La encuesta fue finalizada o eliminada. | `poll.id` |

#### Anatomía de un mensaje de chat (`ChatMessageEvent`):
```json
{
  "id": "b3e9f821-4f01-49b0-9b62-10642faec739",
  "chatroom_id": 1866891,
  "content": "¡Hola a todos en el stream!",
  "type": "message",
  "created_at": "2026-10-11T18:45:10Z",
  "sender": {
    "id": 1058291,
    "username": "usuario_ejemplo",
    "slug": "usuario_ejemplo",
    "identity": {
      "color": "#53fc18",
      "badges": [
        { "type": "broadcaster", "text": "Broadcaster" },
        { "type": "moderator", "text": "Moderator" },
        { "type": "vip", "text": "VIP" },
        { "type": "subscriber", "text": "Subscriber", "count": 6 }
      ]
    }
  }
}
```

### B. Eventos de Transmisión y Alertas (`channel.{channelId}`)

| Evento | Descripción | Aplicación en Widgets |
| :--- | :--- | :--- |
| `App\Events\StreamerIsLive` | El streamer inició directo. | Despertar widgets, cambiar estado visual a 🔴 EN VIVO, iniciar cronómetros. |
| `App\Events\StopStreamBroadcast` | El stream finalizó. | Cerrar sesiones, consolidar puntos, mostrar pantalla OFFLINE. |
| `App\Events\FollowersUpdated` | Contador de seguidores actualizado / Nuevo seguidor. | Alertas de "Nuevo Follower", objetivos de seguidores. |
| `App\Events\SubscriptionEvent` | Nueva suscripción o renovación. | Alertas sonoras de Sub en pantalla, otorgar bonos de lealtad. |
| `App\Events\GiftedSubscriptionsEvent` | Suscripciones regaladas a la comunidad. | Reconocimiento a mecenas / top regaladores. |
| `App\Events\StreamHostEvent` | Raid o Host recibido de otro canal. | Alertas de Raid con nombre del streamer anfitrión y viewers entrantes. |

---

## 6. Manejo de CORS y Entornos de Producción

Los navegadores web bloquean solicitudes directas `fetch('https://kick.com/api/v2/...')` cuando se ejecutan desde dominios externos debido a las políticas CORS de Cloudflare en Kick.

### Soluciones recomendadas:
1. **Para pruebas y desarrollo rápido en navegador:**  
   Usar un reverse proxy público confiable:
   * `https://api.allorigins.win/raw?url=`
   * `https://corsproxy.io/?`
2. **Para widgets públicos en producción (Recomendado):**  
   Crear un **Cloudflare Worker gratuito** (50 líneas de código) en tu propio dominio:
   ```javascript
   // Cloudflare Worker: kick-proxy.tu-dominio.com
   export default {
     async fetch(request) {
       const url = new URL(request.url);
       const target = "https://kick.com/api/v2" + url.pathname;
       const response = await fetch(target, {
         headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" }
       });
       const newResponse = new Response(response.body, response);
       newResponse.headers.set("Access-Control-Allow-Origin", "*");
       return newResponse;
     }
   };
   ```
3. **El WebSocket Pusher NO tiene bloqueo CORS:**  
   Los WebSockets `wss://` no están sujetos a la política de Same-Origin de los navegadores, por lo que **todo el chat y los eventos en vivo funcionan directamente desde el navegador de cualquier usuario sin necesidad de servidores intermedios**.

---

## 7. Plantilla Base Reutilizable para Widgets Públicos

Esta es una clase lista para copiar y pegar en cualquier widget (HTML/JS puro) que permite conectar con cualquier canal de Kick simplemente pasando el nombre de usuario:

```html
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>Widget Kick Universal</title>
  <style>
    body { background: #0b0e14; color: #fff; font-family: sans-serif; padding: 20px; }
    .chat-box { height: 350px; overflow-y: auto; background: #131722; padding: 12px; border-radius: 10px; }
    .msg { margin-bottom: 8px; font-size: 0.9rem; }
    .user { font-weight: bold; color: #53fc18; }
  </style>
</head>
<body>

  <!-- Selector Dinámico de Canal -->
  <div style="margin-bottom: 15px; display: flex; gap: 8px;">
    <input type="text" id="input-canal" placeholder="Nombre de usuario (ej. sensun)" value="sensun" style="padding: 8px; border-radius: 6px;">
    <button onclick="conectarCanalDesdeInput()" style="padding: 8px 16px; background: #53fc18; border: none; font-weight: bold; border-radius: 6px; cursor: pointer;">
      Conectar Canal
    </button>
  </div>

  <div id="status">Conectando...</div>
  <div class="chat-box" id="chat"></div>

  <script>
    class KickWidgetClient {
      constructor() {
        this.ws = null;
        this.channelData = null;
      }

      async conectar(username) {
        if (this.ws) {
          this.ws.close();
          this.ws = null;
        }

        document.getElementById('status').textContent = `🔍 Buscando canal @${username}...`;

        // 1. Obtener Channel ID y Chatroom ID de la API REST
        const proxy = `https://api.allorigins.win/raw?url=${encodeURIComponent('https://kick.com/api/v2/channels/' + username.toLowerCase().trim())}`;
        const res = await fetch(proxy);
        if (!res.ok) throw new Error('No se pudo encontrar el canal en Kick');
        
        this.channelData = await res.json();
        const channelId = this.channelData.id;
        const chatroomId = this.channelData.chatroom?.id || channelId;

        document.getElementById('status').textContent = `🟢 Conectado a @${this.channelData.slug} (Chatroom ID: ${chatroomId})`;

        // 2. Conectar a Pusher WebSocket oficial
        const wsUrl = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=7.6.0&flash=false';
        this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
          // Suscribirse a chat y canal
          this.ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `channel.${channelId}` } }));
          this.ws.send(JSON.stringify({ event: 'pusher:subscribe', data: { channel: `chatrooms.${chatroomId}.v2` } }));
        };

        this.ws.onmessage = (event) => {
          try {
            const data = JSON.parse(event.data);
            this.procesarEvento(data);
          } catch(e) {}
        };
      }

      procesarEvento(ev) {
        if (ev.event === 'App\\Events\\ChatMessageEvent') {
          const raw = typeof ev.data === 'string' ? JSON.parse(ev.data) : ev.data;
          this.onMensaje(raw);
        } else if (ev.event === 'App\\Events\\StreamerIsLive') {
          console.log('🔴 ¡El streamer ha iniciado transmisión!');
        } else if (ev.event === 'App\\Events\\StopStreamBroadcast') {
          console.log('⚪ El stream ha terminado.');
        }
      }

      onMensaje(msg) {
        const chatBox = document.getElementById('chat');
        const div = document.createElement('div');
        div.className = 'msg';
        div.innerHTML = `<span class="user" style="color: ${msg.sender?.identity?.color || '#53fc18'}">@${msg.sender?.username}:</span> ${msg.content}`;
        chatBox.appendChild(div);
        chatBox.scrollTop = chatBox.scrollHeight;
      }
    }

    const clienteKick = new KickWidgetClient();

    function conectarCanalDesdeInput() {
      const nombre = document.getElementById('input-canal').value;
      if (nombre) clienteKick.conectar(nombre);
    }

    // Conexión inicial al cargar
    conectarCanalDesdeInput();
  </script>
</body>
</html>
```

---

## 8. Casos de Uso Futuros para Widgets Públicos

Con esta misma base arquitectónica se pueden construir:
1. **Widgets de Metas de Chat:** Barras de progreso de mensajes para desbloquear premios o dinámicas en el stream.
2. **Generador de Combustible Dinámico:** Asignación de puntos y recompensas en vivo para cualquier streamer que use tu plataforma.
3. **Overlays de Chat Estilizados para OBS:** Chats con estilo visual cyberpunk, anime o personalizado con emotes y colores reales de Kick.
4. **Alertas de Eventos:** Banners emergentes en pantalla para suscripciones, raids y follows.
5. **Detector de Participación / Sorteos:** Filtro en vivo de palabras clave o comandos (`!participar`) directo desde Kick Cloud.
