# Spotify: enlaces para Streamer.bot y auditoría

Revisión del 9 de noviembre de 2026. Streamer.bot ejecuta las acciones; los overlays muestran la reproducción y las alertas.

## Fetch URL listo para copiar

Añadir una canción (`!addsong` o canje con texto):

```text
https://sensunshopweb.web.app/spotify/add_to_queue?user=jikokun2&song_name=%rawInputUrlEncoded%&format=name
```

Saltar (`!skipsong`, permisos configurados en Streamer.bot):

```text
https://sensunshopweb.web.app/spotify/skip?user=jikokun2
```

Saber qué canción suena (`!song` o `!cancion`, respuesta con título, artista y enlace):

```text
https://sensunshopweb.web.app/spotify/song?user=jikokun2
```

Reanudar y pausar:

```text
https://sensunshopweb.web.app/spotify/play?user=jikokun2
https://sensunshopweb.web.app/spotify/pause?user=jikokun2
```

Alternar pausa/reproducción con un solo enlace (`!playpause`):

```text
https://sensunshopweb.web.app/spotify/toggle?user=jikokun2
```

Consulta el estado real: si está reproduciendo, pausa; si está pausado, reanuda. Devuelve `Música pausada.` o `Música reanudada.`. Usa `format=json` para recibir también `action` e `is_playing`. Admite el alias `playpause` y la terminación `.php`. Ignora llamadas simultáneas y repeticiones durante 2.5 segundos después de cada intento para evitar que un doble Fetch revierta el cambio. Si Spotify no tiene sesión activa, intenta reanudar en un dispositivo disponible; si no hay ninguno, devuelve un mensaje para abrir Spotify. El endpoint nuevo requiere publicar la función `spotifyControl`.

Para estas respuestas de texto, usa `respuestaSpotify` como Variable Name y deja desmarcado Parse Results as JSON. Puedes enviar `%respuestaSpotify%` al chat. La variable `rawInputUrlEncoded` debe contener el texto solicitado codificado para URL; si tu acción aún no la genera, créala a partir de la entrada del comando o canje antes del Fetch.

El panel Spotify de `laboratorio/index.html#card-spotify-widget` conserva los enlaces con botones Copiar y las pruebas Fetch manuales. Las rutas con `.php` también son compatibles: Firebase las redirige a la misma función, no son un controlador adicional. Para obtener JSON al consultar o añadir, usa `format=json`.

Configura una sola acción Fetch por solicitud. Evita que el mismo comando o canje dispare dos acciones, o que otro bot ejecute también la petición. Los botones Probar Fetch del panel sí modifican la reproducción cuando los pulsas; el simulador de chat solo muestra alertas.

## Resultado de la revisión local

| Archivo | Comportamiento encontrado | Resultado |
| --- | --- | --- |
| `mini_widgets/widget_spotify.html` | Ejecutaba añadir, saltar, reproducir y pausar al recibir chat. Modo `hybrid` predeterminado y respaldo directo a Spotify. El simulador forzaba la ejecución incluso en modo `streamerbot`. Sus botones también controlaban Spotify. | Eliminadas todas las llamadas de control. Conserva consultas de reproducción, renovación de token, alertas y audio local/demo. Los modos antiguos no pueden reactivar el control. |
| `laboratorio/escena_inicial_integrada.html` + `escena_inicial.js` | Cargaba el widget compartido en un iframe y propagaba los modos de control. Podía ejecutar la misma petición que Streamer.bot u otra instancia del widget. | Carga el visualizador corregido y fija `control_mode=streamerbot`. |
| `laboratorio/index.html` | El simulador enviaba comandos al widget; también ofrece controles y pruebas Fetch manuales. | Simulador solo visual, selector fijado a Streamer.bot y enlaces conservados para copiar. Los controles manuales siguen disponibles. |
| `laboratorio/radioshow_integrado.html` | Consulta reproducción y cola; los comandos activan animaciones de la mascota. | Sin llamadas para añadir o saltar. Se conserva. |
| `laboratorio/modochat.html`, `modochat_integrado.html`, `modomimir_integrado.html` | Consultan reproducción y renuevan tokens. | Sin control de cola o salto. Se conservan. |
| `laboratorio/spotify_isla_widget.html` | Consulta reproducción y escucha `!karaoke`. | Karaoke visual, sin añadir ni saltar. Se conserva. |
| `laboratorio/widget spotify mio.html` | Consulta la canción actual y renueva tokens. | Sin añadir ni saltar. Se conserva. |
| `laboratorio/lista_reproductor_spotify.html` | Lee la cola con GET y usa consultas de respaldo. | No añade canciones. Se conserva. |
| `laboratorio/spotify_callback.html` | Intercambia y guarda tokens de inicio de sesión. | No añade ni salta canciones. Se conserva. |
| `laboratorio/tarjetero.html` y demás widgets de laboratorio | No se encontraron llamadas de control de Spotify. | Sin cambios. |

La duplicación encontrada es posible cuando Streamer.bot y una o varias instancias del widget reciben la misma solicitud. El respaldo directo del widget también podía repetir una acción si el servidor la ejecutaba pero su respuesta fallaba. Se retiraron ambas rutas de ejecución.

La revisión cubre el código local. No verifica qué fuentes están abiertas en OBS, las acciones configuradas en Streamer.bot ni la versión publicada. Después de publicar estos archivos, recarga las fuentes de navegador de OBS para que reciban la corrección.
