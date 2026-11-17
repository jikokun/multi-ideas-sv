/* Motor original del marco: controles, formato, Tuna y Streamer.bot.
 * Full HD y modo limpio por defecto para esta escena navideña. */

    document.addEventListener('DOMContentLoaded', () => {
      // -------------------------------------------------------------
      // 1. LECTURA DE PARÁMETROS URL Y CONFIGURACIÓN INICIAL
      // -------------------------------------------------------------
      const urlParams = new URLSearchParams(window.location.search);
      
      const config = {
        aspect: urlParams.get('aspect') || urlParams.get('ratio') || '16:9',
        tag: urlParams.get('tag') || urlParams.get('name') || urlParams.get('title') || 'JIKOKUN',
        icon: urlParams.get('icon') || '⚡',
        tunaPort: parseInt(urlParams.get('tunaport') || urlParams.get('tuna') || '1608', 10),
        sbPort: parseInt(urlParams.get('port') || urlParams.get('sbport') || '4445', 10),
        fullscreen: true,
        clean: true,
        showTag: urlParams.get('tag') !== 'none' && urlParams.get('notag') !== '1'
      };

      // Aplicar colores personalizados si vienen por URL
      const paramColor = urlParams.get('color') || urlParams.get('maincolor');
      const paramSecColor = urlParams.get('seccolor') || urlParams.get('flowcolor');
      const paramGlow = urlParams.get('glow') || urlParams.get('glowcolor');
      if (paramColor || paramSecColor || paramGlow) {
        applyPaletteColors(paramColor || '#00f5d4', paramSecColor || '#00bbf9', paramGlow || (paramColor || '#00f5d4'));
      }

      // Si se define modo limpio para OBS, ocultar el botón de ajustes
      if (config.clean) {
        document.body.classList.add('clean-mode');
      }

      // Elementos Principales del DOM
      const overlayStage = document.getElementById('overlay-stage');
      const camFrame = document.getElementById('camFrame');
      const camSvg = document.getElementById('camSvg');
      const camBgPoly = document.getElementById('camBgPoly');
      const camStreamMain = document.getElementById('camStreamMain');
      const camStreamSweep = document.getElementById('camStreamSweep');
      const tagContainer = document.getElementById('tagContainer');
      const tagIcon = document.getElementById('tagIcon');
      const tagName = document.getElementById('tagName');
      const camTag = document.getElementById('camTag');

      // Elementos del HUD
      const hudToggleBtn = document.getElementById('hudToggleBtn');
      const hudModal = document.getElementById('hudModal');
      const hudCloseBtn = document.getElementById('hudCloseBtn');
      const btnAspect169 = document.getElementById('btnAspect169');
      const btnAspect11 = document.getElementById('btnAspect11');
      const inputTagIcon = document.getElementById('inputTagIcon');
      const inputTagName = document.getElementById('inputTagName');
      const inputTunaPort = document.getElementById('inputTunaPort');
      const inputSbPort = document.getElementById('inputSbPort');
      const tunaStatusDot = document.getElementById('tunaStatusDot');
      const tunaStatusText = document.getElementById('tunaStatusText');
      const sbStatusDot = document.getElementById('sbStatusDot');
      const sbStatusText = document.getElementById('sbStatusText');
      const trackBanner = document.getElementById('trackBanner');
      const bpmDisplay = document.getElementById('bpmDisplay');
      const btnToggleTag = document.getElementById('btnToggleTag');
      const toastMsg = document.getElementById('toastMsg');

      // Asignar valores a inputs del HUD
      inputTagIcon.value = config.icon;
      inputTagName.value = config.tag;
      if (inputTunaPort) inputTunaPort.value = config.tunaPort;
      if (inputSbPort) inputSbPort.value = config.sbPort;

      // -------------------------------------------------------------
      // 2. MODO FULLSCREEN (Auto-Escalado 1920x1080 opcional)
      // -------------------------------------------------------------
      if (config.fullscreen) {
        overlayStage.classList.add('fullscreen-mode');
        function resizeStage() {
          const scaleX = window.innerWidth / 1920;
          const scaleY = window.innerHeight / 1080;
          const scale = Math.min(scaleX, scaleY);
          overlayStage.style.transform = `scale(${scale})`;
        }
        window.addEventListener('resize', resizeStage);
        resizeStage();
      }

      // -------------------------------------------------------------
      // 3. CAMBIO DE FORMATO (16:9 vs 1:1)
      // -------------------------------------------------------------
      window.setAspectRatio = function(ratio) {
        const isSquare = ratio === '1:1' || ratio === '11' || ratio === 'square';
        config.aspect = isSquare ? '1:1' : '16:9';

        if (isSquare) {
          camFrame.classList.remove('ratio-16-9');
          camFrame.classList.add('ratio-1-1');
          camSvg.setAttribute('viewBox', '0 0 350 350');
          const pts = '25,2 348,2 348,325 325,348 2,348 2,25';
          camBgPoly.setAttribute('points', pts);
          camStreamMain.setAttribute('points', pts);
          camStreamSweep.setAttribute('points', pts);

          btnAspect169.classList.remove('active');
          btnAspect11.classList.add('active');
        } else {
          camFrame.classList.remove('ratio-1-1');
          camFrame.classList.add('ratio-16-9');
          camSvg.setAttribute('viewBox', '0 0 460 259');
          const pts = '25,2 458,2 458,234 435,257 2,257 2,25';
          camBgPoly.setAttribute('points', pts);
          camStreamMain.setAttribute('points', pts);
          camStreamSweep.setAttribute('points', pts);

          btnAspect11.classList.remove('active');
          btnAspect169.classList.add('active');
        }
      };

      // Inicializar el formato
      setAspectRatio(config.aspect);

      // -------------------------------------------------------------
      // 4. EDICIÓN DEL TEXTO E ÍCONO DE LA ETIQUETA (CAM TAG)
      // -------------------------------------------------------------
      function updateCamTag(name, icon) {
        if (typeof name !== 'undefined') {
          config.tag = name;
          tagName.textContent = name;
          inputTagName.value = name;
        }
        if (typeof icon !== 'undefined') {
          config.icon = icon;
          tagIcon.textContent = icon;
          inputTagIcon.value = icon;
        }
      }

      updateCamTag(config.tag, config.icon);

      inputTagName.addEventListener('input', (e) => {
        updateCamTag(e.target.value, undefined);
      });

      inputTagIcon.addEventListener('input', (e) => {
        updateCamTag(undefined, e.target.value);
      });

      window.toggleTagVisibility = function() {
        config.showTag = !config.showTag;
        tagContainer.classList.toggle('hidden', !config.showTag);
        btnToggleTag.textContent = config.showTag ? '👁️ Ocultar Tag' : '👁️ Mostrar Tag';
      };

      if (!config.showTag) {
        tagContainer.classList.add('hidden');
        btnToggleTag.textContent = '👁️ Mostrar Tag';
      }

      // Clic en la etiqueta abre el panel HUD
      camTag.addEventListener('click', () => {
        toggleHudModal(true);
      });

      // -------------------------------------------------------------
      // 5. MOTOR DE COLOR DINÁMICO (Vibrant.js)
      // -------------------------------------------------------------
      function hexToRgb(hex) {
        const r = parseInt(hex.slice(1, 3), 16) || 0;
        const g = parseInt(hex.slice(3, 5), 16) || 245;
        const b = parseInt(hex.slice(5, 7), 16) || 212;
        return `${r}, ${g}, ${b}`;
      }

      function applyPaletteColors(mainHex, secHex, glowHex) {
        if (mainHex) {
          document.documentElement.style.setProperty('--dynamic-color', mainHex);
          document.documentElement.style.setProperty('--dynamic-rgb', hexToRgb(mainHex));
        }
        if (secHex) {
          document.documentElement.style.setProperty('--dynamic-color-sec', secHex);
          document.documentElement.style.setProperty('--dynamic-rgb-sec', hexToRgb(secHex));
        }
        const glowTarget = glowHex || mainHex;
        if (glowTarget) {
          document.documentElement.style.setProperty('--dynamic-glow-color', glowTarget);
          document.documentElement.style.setProperty('--dynamic-glow-rgb', hexToRgb(glowTarget));
        }
      }
      window.applyPaletteColors = applyPaletteColors;

      // Receptor de configuración en vivo para previsualización instantánea
      window.addEventListener('message', (event) => {
        if (!event.data) return;
        if (event.data.type === 'SET_CAMFRAME_CONFIG') {
          const d = event.data;
          if (d.aspect && typeof window.setAspectRatio === 'function') {
            window.setAspectRatio(d.aspect);
          }
          if (typeof d.tag !== 'undefined' && typeof updateCamTag === 'function') {
            updateCamTag(d.tag, d.icon);
          }
          if (d.color || d.seccolor || d.glow) {
            applyPaletteColors(d.color || '#00f5d4', d.seccolor || '#00bbf9', d.glow || (d.color || '#00f5d4'));
          }
        }
      });

      window.applyCoverColors = function(imageUrl) {
        if (typeof Vibrant === 'undefined' || !imageUrl) return;
        try {
          const img = new Image();
          img.crossOrigin = 'Anonymous';
          img.src = imageUrl;
          img.onload = () => {
            Vibrant.from(img).getPalette().then(palette => {
              processPalette(palette);
            }).catch(() => {
              Vibrant.from(imageUrl).getPalette().then(processPalette).catch(() => {});
            });
          };
          img.onerror = () => {
            Vibrant.from(imageUrl).getPalette().then(processPalette).catch(() => {});
          };
        } catch (e) {
          Vibrant.from(imageUrl).getPalette().then(processPalette).catch(() => {});
        }
      };

      function processPalette(palette) {
        if (!palette) return;
        const mainColor = palette.Vibrant ? palette.Vibrant.getHex() : (palette.LightVibrant ? palette.LightVibrant.getHex() : '#00f5d4');
        const secColor = (palette.LightVibrant && palette.LightVibrant.getHex() !== mainColor)
          ? palette.LightVibrant.getHex()
          : (palette.Muted ? palette.Muted.getHex() : (palette.DarkVibrant ? palette.DarkVibrant.getHex() : '#00bbf9'));
        applyPaletteColors(mainColor, secColor);
      }

      // -------------------------------------------------------------
      // 6. MOTOR DE RITMO (BPM & PULSO VISUAL)
      // -------------------------------------------------------------
      let currentBpm = 120;

      window.setBpm = function(bpm) {
        if (!bpm || bpm <= 0) return;
        currentBpm = Math.round(bpm);
        bpmDisplay.textContent = `${currentBpm} BPM`;

        const beatSeconds = 60 / currentBpm;
        let pulseMultiplier = 1.0;
        if (currentBpm >= 155) {
          pulseMultiplier = 0.5; // Doble tempo si es demasiado rápido
        }
        const beatDuration = (beatSeconds * pulseMultiplier).toFixed(3);
        document.documentElement.style.setProperty('--beat-duration', `${beatDuration}s`);
      };

      // Disparador de Beat Único (Flash Neón)
      window.triggerSingleBeatPulse = function() {
        camFrame.classList.add('beat-flash');
        setTimeout(() => {
          camFrame.classList.remove('beat-flash');
        }, 120);
      };

      window.triggerTestBeat = function() {
        triggerSingleBeatPulse();
        showToast('⚡ Beat disparado');
      };

      function estimarBPMAcustico(songName, artistName) {
        const text = `${songName} ${artistName}`.toLowerCase();
        if (/(ballad|balada|slow|lenta|acoustic|acustico|chill|lofi|lo-fi|piano|sad|triste|love|soft|unplugged|quiet|sleep|ambient|night)/i.test(text)) {
          return 74;
        }
        if (/(metal|power|speed|thrash|dnb|drum|hard|fast|rapido|solo|heavy|rock|electro|edm|remix|dance|punk|fire|lightning|storm)/i.test(text)) {
          return 172;
        }
        let hash = 0;
        for (let i = 0; i < text.length; i++) hash = text.charCodeAt(i) + ((hash << 5) - hash);
        return 82 + (Math.abs(hash) % 65);
      }

      function handlePause() {
        if (tunaStatusDot && tunaConnected) {
          tunaStatusDot.className = 'status-dot';
          tunaStatusText.textContent = 'Pausado (Tuna)';
        }
        document.documentElement.style.setProperty('--beat-duration', '1.6s');
      }

      function handlePlay() {
        if (tunaStatusDot && tunaConnected) {
          tunaStatusDot.className = 'status-dot online';
          tunaStatusText.textContent = `En Línea (${config.tunaPort || 1608})`;
        }
      }

      // -------------------------------------------------------------
      // 7. INTEGRACIÓN CON STREAMER.BOT (WebSocket ws://127.0.0.1:PORT/)
      // -------------------------------------------------------------
      let sbSocket = null;
      let sbConnected = false;
      let sbReconnectTimer = null;

      function connectStreamerBot() {
        if (sbSocket && (sbSocket.readyState === WebSocket.OPEN || sbSocket.readyState === WebSocket.CONNECTING)) {
          return;
        }

        const port = parseInt(inputSbPort.value || config.sbPort || '4445', 10);
        const wsUrl = `ws://${urlParams.get('ip') || '127.0.0.1'}:${port}/`;

        sbStatusDot.className = 'status-dot';
        sbStatusText.textContent = `Conectando (${port})...`;

        try {
          sbSocket = new WebSocket(wsUrl);

          sbSocket.onopen = () => {
            sbConnected = true;
            sbStatusDot.className = 'status-dot online';
            sbStatusText.textContent = `Conectado (${port})`;
            console.log(`[Streamer.bot] 🟢 Conectado exitosamente en ${wsUrl}`);

            // Suscribirse a eventos de Spotify y Eventos Personalizados de Streamer.bot
            sbSocket.send(JSON.stringify({
              request: "Subscribe",
              id: "cam-frame-spotify-rhythm",
              events: {
                Kick: ["ChatMessage", "Message"],
                General: ["Custom"],
                Spotify: ["TrackChange", "PlaybackSync", "PlaybackStarted", "PlaybackPaused", "*"],
                StreamerBot: ["Custom", "*"]
              }
            }));
          };

          sbSocket.onmessage = (event) => {
            try {
              const msg = JSON.parse(event.data);
              handleStreamerBotEvent(msg);
            } catch (err) {
              console.warn('[Streamer.bot] Error procesando paquete:', err);
            }
          };

          sbSocket.onerror = () => {
            sbConnected = false;
          };

          sbSocket.onclose = () => {
            sbConnected = false;
            sbStatusDot.className = 'status-dot offline';
            sbStatusText.textContent = 'Desconectado';
            
            // Reintentar reconexión automática en 4 segundos
            clearTimeout(sbReconnectTimer);
            sbReconnectTimer = setTimeout(connectStreamerBot, 4000);
          };
        } catch (e) {
          sbConnected = false;
          sbStatusDot.className = 'status-dot offline';
          sbStatusText.textContent = 'Error puerto';
          clearTimeout(sbReconnectTimer);
          sbReconnectTimer = setTimeout(connectStreamerBot, 4000);
        }
      }

      function handleStreamerBotEvent(msg) {
        window.navidadOverlay?.onChatEvent?.(msg);
        window.NavidadMusic?.ingest(msg);
        if (!msg) return;

        const eventSource = (msg.event && msg.event.source) ? msg.event.source : '';
        const eventType = (msg.event && msg.event.type) ? msg.event.type : '';
        const data = msg.data || {};

        // A. Eventos de Spotify emitidos por Streamer.bot
        if (eventSource === 'Spotify' || eventType.toLowerCase().includes('spotify') || data.track) {
          if (eventType === 'PlaybackPaused') {
            handlePause();
            return;
          }
          if (eventType === 'PlaybackStarted') {
            handlePlay();
          }

          const track = data.track || data;
          if (track) {
            handlePlay();
            const songName = track.name || track.title || 'Desconocido';
            const artistName = track.artists 
              ? (Array.isArray(track.artists) ? track.artists.map(a => a.name || a).join(', ') : track.artists) 
              : (track.artist || 'Artista');
            const albumCover = (track.album && track.album.images && track.album.images[0]) 
              ? track.album.images[0].url 
              : (track.coverUrl || track.album_art || '');
            const tempo = track.tempo || track.bpm;
            const songId = track.id || (track.uri ? track.uri.replace('spotify:track:', '') : '');

            trackBanner.textContent = `🎵 ${songName} — ${artistName}`;

            if (albumCover) {
              window.applyCoverColors(albumCover);
            }
            if (tempo && tempo > 0) {
              setBpm(tempo);
            } else {
              setBpm(estimarBPMAcustico(songName, artistName));
            }
            triggerSingleBeatPulse();
          }
        }

        // B. Eventos Personalizados de Streamer.bot (BPM, Beat Pulse, etc.)
        if (eventSource === 'StreamerBot' || (eventSource === 'General' && eventType === 'Custom') || data.custom || msg.custom) {
          const payload = data.custom || data;
          if (payload.bpm) setBpm(payload.bpm);
          if (payload.beat || payload.pulse) triggerSingleBeatPulse();
          if (payload.tag || payload.name) updateCamTag(payload.tag || payload.name);
          if (payload.icon) updateCamTag(undefined, payload.icon);
          if (payload.aspect) setAspectRatio(payload.aspect);
          if (payload.color) applyPaletteColors(payload.color, payload.secColor || '#00bbf9');
        }
      }

      inputSbPort.addEventListener('change', () => {
        if (sbSocket) sbSocket.close();
        connectStreamerBot();
      });

      // Iniciar conexión con Streamer.bot
      connectStreamerBot();

      // -------------------------------------------------------------
      // 8. MOTOR LOCAL: TUNA OBS PLUGIN (http://127.0.0.1:1608/)
      // -------------------------------------------------------------
      let tunaConnected = false;
      let lastTunaSongKey = "";

      async function checkTunaPlayer() {
        const port = parseInt(inputTunaPort ? inputTunaPort.value : config.tunaPort || '1608', 10);
        const tunaUrl = `http://${urlParams.get('ip') || '127.0.0.1'}:${port}/`;

        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 1200);

          const res = await fetch(tunaUrl, { 
            signal: controller.signal,
            cache: 'no-store'
          });
          clearTimeout(timeoutId);

          if (!res.ok) {
            markTunaOffline(port);
            return;
          }

          const data = await res.json();
          window.NavidadMusic?.tuna(data);
          tunaConnected = true;
          if (tunaStatusDot) tunaStatusDot.className = 'status-dot online';
          if (tunaStatusText) tunaStatusText.textContent = `En Línea (${port})`;

          // Estado de reproducción Tuna ('playing', 'paused', 'stopped')
          const status = (data.status || '').toLowerCase();
          const hasTrack = !!(data.title || data.song);
          const isPlaying = status === 'playing' || status === 'play' || (status !== 'paused' && status !== 'stopped' && hasTrack);

          if (!isPlaying && hasTrack) {
            handlePause();
            return;
          }

          if (hasTrack) {
            handlePlay();
            const songName = data.title || data.song || 'Canción Desconocida';
            let artistName = 'Artista';
            if (Array.isArray(data.artists) && data.artists.length > 0) {
              artistName = data.artists.join(', ');
            } else if (typeof data.artists === 'string' && data.artists.trim()) {
              artistName = data.artists;
            } else if (data.artist) {
              artistName = data.artist;
            }

            const songKey = `${songName}:::${artistName}`;
            if (songKey !== lastTunaSongKey) {
              lastTunaSongKey = songKey;
              trackBanner.textContent = `🎵 ${songName} — ${artistName}`;

              // Portada de Tuna (puede ser cover_url, cover o endpoint /cover)
              let coverUrl = data.cover_url || data.cover || '';
              if (!coverUrl && (data.has_cover || data.cover_path)) {
                coverUrl = `http://127.0.0.1:${port}/cover?t=${Date.now()}`;
              }

              if (coverUrl) {
                window.applyCoverColors(coverUrl);
              }

              // Estimar ritmo acústico y disparar pulso
              const bpm = estimarBPMAcustico(songName, artistName);
              setBpm(bpm);
              triggerSingleBeatPulse();
            }
          }
        } catch (err) {
          markTunaOffline(port);
        }
      }

      function markTunaOffline(port) {
        tunaConnected = false;
        if (tunaStatusDot) tunaStatusDot.className = 'status-dot offline';
        if (tunaStatusText) tunaStatusText.textContent = `Sin señal (${port || 1608})`;
      }

      // Intervalo de consulta a Tuna cada 1.5s
      setInterval(checkTunaPlayer, 1500);
      checkTunaPlayer();

      if (inputTunaPort) {
        inputTunaPort.addEventListener('change', () => {
          config.tunaPort = parseInt(inputTunaPort.value || '1608', 10);
          checkTunaPlayer();
        });
      }

      // Receptor de eventos alternos (BroadcastChannel)
      try {
        const channel = new BroadcastChannel('spotify_overlay_channel');
        channel.onmessage = (e) => {
          if (e.data) {
            if (e.data.coverUrl) window.applyCoverColors(e.data.coverUrl);
            if (e.data.bpm) setBpm(e.data.bpm);
            if (e.data.trackName) trackBanner.textContent = `🎵 ${e.data.trackName}`;
          }
        };
      } catch(err) {}

      // -------------------------------------------------------------
      // 9. GESTIÓN DEL PANEL HUD & ATAJOS DE TECLADO
      // -------------------------------------------------------------
      function toggleHudModal(forceState) {
        const isActive = typeof forceState === 'boolean' ? forceState : !hudModal.classList.contains('active');
        hudModal.classList.toggle('active', isActive);
      }

      hudToggleBtn.addEventListener('click', () => toggleHudModal());
      hudCloseBtn.addEventListener('click', () => toggleHudModal(false));

      // Atajos de teclado:
      // [C] -> Abrir/Cerrar Configuración
      // [T] -> Cambiar entre 16:9 y 1:1
      // [B] -> Disparar Beat de prueba
      document.addEventListener('keydown', (e) => {
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        if (e.key === 'c' || e.key === 'C') {
          toggleHudModal();
        } else if (e.key === 't' || e.key === 'T') {
          const nextAspect = config.aspect === '16:9' ? '1:1' : '16:9';
          setAspectRatio(nextAspect);
          showToast(`📐 Formato cambiado a ${nextAspect}`);
        } else if (e.key === 'b' || e.key === 'B') {
          triggerSingleBeatPulse();
        }
      });

      // -------------------------------------------------------------
      // 10. GENERACIÓN Y COPIADO DE ENLACE OBS
      // -------------------------------------------------------------
      window.copyObsUrl = function() {
        const origin = window.location.origin;
        const pathname = window.location.pathname;
        const params = new URLSearchParams();

        params.set('aspect', config.aspect);
        params.set('tag', inputTagName.value || config.tag);
        params.set('icon', inputTagIcon.value || config.icon);
        const currentTunaPort = inputTunaPort ? inputTunaPort.value : config.tunaPort;
        if (currentTunaPort && currentTunaPort.toString() !== '1608') {
          params.set('tunaport', currentTunaPort);
        }
        const currentSbPort = inputSbPort ? inputSbPort.value : config.sbPort;
        if (currentSbPort && currentSbPort.toString() !== '4445') {
          params.set('port', currentSbPort);
        }
        params.set('obs', 'true'); // Oculta el botón de ajustes en OBS

        if (!config.showTag) params.set('tag', 'none');

        const finalUrl = `${origin}${pathname}?${params.toString()}`;
        navigator.clipboard.writeText(finalUrl).then(() => {
          showToast('📋 ¡Enlace OBS copiado con éxito!');
        }).catch(() => {
          prompt('Copia este enlace para OBS Studio:', finalUrl);
        });
      };

      function showToast(msg) {
        toastMsg.textContent = msg;
        toastMsg.classList.add('show');
        setTimeout(() => {
          toastMsg.classList.remove('show');
        }, 2500);
      }
    });
  
