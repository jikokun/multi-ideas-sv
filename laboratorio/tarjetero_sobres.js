(function () {
    'use strict';
    const Core = window.JikoBoosterCore;
    const $ = id => document.getElementById(id);
    const canvas = $('obs-canvas');
    const panel = $('sim-config-panel');
    const wrapper = $('pack-wrapper');
    const cardsStage = $('cards-stage');
    const aura = $('stage-aura');
    const rays = $('god-rays');
    const caption = $('opening-caption');
    const summary = $('result-summary');
    const fx = $('fx-canvas');
    const ctx = fx.getContext('2d');
    const params = new URLSearchParams(location.search);
    const obsMode = params.get('obs') === 'true';
    const controlsEnabled = params.get('controls') === 'true' && !obsMode;
    const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.body.classList.toggle('obs-mode', obsMode);
    document.body.classList.toggle('operator-controls', controlsEnabled);

    function fitCanvas() {
        document.documentElement.style.setProperty('--canvas-fit', Math.min(innerWidth / 1920, innerHeight / 1080).toString());
    }
    addEventListener('resize', fitCanvas);
    fitCanvas();

    let catalog;
    try {
        if (!Core) throw new Error('No se pudo cargar el motor de sobres.');
        catalog = Core.createCatalog(window.DEFAULT_JIKOKUN_COLLECTIONS?.['Coleccion_Jikokun_001-100']?.cards);
    } catch (error) {
        $('fatal-error').textContent = error.message;
        $('fatal-error').hidden = false;
        console.error('[Jiko sobres]', error.message);
        $('btn-open-pack').disabled = true;
        return;
    }

    const state = { phase: 'idle', generation: 0, pack: null, packs: 0, cards: 0, legendary: 0 };
    const timers = new Set();
    const failedAssets = new Set();
    const loadedAssets = new Set();
    let slots = [];
    let particles = [];
    let frameId = null;
    let previousFrame = null;
    let audioContext = null;
    let autoExitTimer = null;
    let cloudPlayback = null;
    let queueLocked = false;
    const audioNodes = new Set();

    function later(callback, delay) {
        const generation = state.generation;
        const id = setTimeout(() => {
            timers.delete(id);
            if (generation === state.generation) callback();
        }, delay);
        timers.add(id);
        return id;
    }

    function setPhase(phase) {
        state.phase = phase;
        canvas.dataset.phase = phase;
        const busy = phase !== 'idle' && phase !== 'revealed';
        $('btn-open-pack').disabled = busy;
        $('btn-test-effect').disabled = busy;
        $('btn-open-pack').setAttribute('aria-busy', String(busy));
    }

    function showPanel(show = true) {
        const visible = controlsEnabled && show;
        panel.hidden = !visible;
        $('reopen-panel').setAttribute('aria-expanded', String(visible));
        if (visible) $('btn-open-pack').focus({ preventScroll: true });
    }

    function palette(target, rarity) {
        const config = Core.RARITIES[rarity];
        target.style.setProperty('--primary', config.color);
        target.style.setProperty('--secondary', config.secondary);
        const hex = config.color.slice(1);
        target.style.setProperty('--glow-rgb', [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16)).join(', '));
    }

    function updateAssetStatus() {
        const status = $('asset-status');
        status.classList.toggle('warning', failedAssets.size > 0);
        status.textContent = failedAssets.size
            ? failedAssets.size + ' imágenes no pudieron cargarse. Comprueba que sus enlaces de Drive sean accesibles sin iniciar sesión. Las cartas sorteadas conservan su número y rareza.'
            : loadedAssets.size + ' imágenes cargadas. Solo se solicitan el sobre y las cartas del sorteo actual.';
    }

    // Fallback local legible: conserva la identidad de la carta sin sustituirla
    // por otra imagen. No usa placehold.co ni reintentos infinitos.
    function loadArtwork(image, url) {
        image.decoding = 'async';
        image.referrerPolicy = 'no-referrer';
        image.onload = () => {
            image.classList.add('loaded');
            loadedAssets.add(url);
            failedAssets.delete(url);
            updateAssetStatus();
        };
        image.onerror = () => {
            image.classList.remove('loaded');
            failedAssets.add(url);
            updateAssetStatus();
        };
        image.src = url;
        if (image.complete && image.naturalWidth > 0) image.onload();
    }

    function element(tag, className, text) {
        const node = document.createElement(tag);
        if (className) node.className = className;
        if (text !== undefined) node.textContent = text;
        return node;
    }

    function makeFace(card, front) {
        const face = element('span', 'card-face ' + (front ? 'card-front' : 'card-back'));
        const artwork = element('span', 'card-artwork');
        const fallback = element('span', 'card-placeholder');
        fallback.append(
            element('span', 'emblem', front ? '✦' : '◇'),
            element('span', 'fallback-title', front ? card.title : 'JIKOKUN'),
            element('span', 'fallback-number', front ? '#' + card.num + ' / 100' : Core.RARITIES[card.rarity].label),
            element('span', 'fallback-caption', front ? 'Portada no disponible' : 'Reverso no disponible')
        );
        const image = element('img', 'drive-art');
        image.alt = front ? '#' + card.num + ' — ' + card.title : 'Reverso oficial ' + Core.RARITIES[card.rarity].label;
        loadArtwork(image, front ? card.frontImage : card.backImage);
        artwork.append(fallback, image, element('span', 'holo-sheen'));
        face.append(artwork);
        return face;
    }

    function renderCards(pack, append = false) {
        if (!append) cardsStage.replaceChildren();
        cardsStage.setAttribute('aria-hidden', 'true');
        slots = pack.cards.map((card, index) => {
            const slot = element('button', 'tcg-card-slot slot-' + index + ' ' + card.rarity);
            slot.type = 'button';
            slot.tabIndex = -1;
            slot.dataset.rarity = card.rarity;
            slot.dataset.cardId = String(card.id);
            slot.style.setProperty('--slot-index', String(index));
            slot.setAttribute('aria-label', 'Carta ' + (index + 1) + ' sin revelar');
            palette(slot, card.rarity);
            const motion = element('span', 'card-motion');
            const accent = element('span', 'card-accent');
            const rotator = element('span', 'card-rotator');
            rotator.append(makeFace(card, false), makeFace(card, true));
            accent.append(rotator);
            motion.append(accent);
            slot.append(motion, element('span', 'reveal-ring ring-first'), element('span', 'reveal-ring ring-second'));
            slot.addEventListener('click', event => {
                event.stopPropagation();
                if (state.phase !== 'revealed') return;
                const front = slot.classList.toggle('flipped');
                slot.setAttribute('aria-pressed', String(front));
                slot.setAttribute('aria-label', '#' + card.num + ' ' + card.title + '. Mostrar ' + (front ? 'reverso' : 'frente'));
            });
            cardsStage.append(slot);
            return slot;
        });
    }

    // Web Audio del prototipo: invocación, giro, rasgado y acorde de revelación.
    function playSound(kind) {
        if (!$('sound-enabled').checked) return;
        try {
            const AudioClass = window.AudioContext || window.webkitAudioContext;
            if (!AudioClass) return;
            if (!audioContext) audioContext = new AudioClass();
            if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
            const now = audioContext.currentTime;
            const playTone = (frequency, endFrequency, duration, offset = 0, type = 'sine') => {
                const oscillator = audioContext.createOscillator();
                const gain = audioContext.createGain();
                oscillator.type = type;
                oscillator.frequency.setValueAtTime(frequency, now + offset);
                oscillator.frequency.exponentialRampToValueAtTime(endFrequency, now + offset + duration);
                gain.gain.setValueAtTime(.001, now + offset);
                gain.gain.exponentialRampToValueAtTime(.06, now + offset + .03);
                gain.gain.exponentialRampToValueAtTime(.001, now + offset + duration);
                oscillator.connect(gain);
                gain.connect(audioContext.destination);
                oscillator.onended = () => { audioNodes.delete(oscillator); oscillator.disconnect(); gain.disconnect(); };
                audioNodes.add(oscillator);
                oscillator.start(now + offset);
                oscillator.stop(now + offset + duration + .02);
            };
            if (kind === 'appear') playTone(110, 440, .65, 0, 'triangle');
            else if (kind === 'spin') playTone(240, 980, .5);
            else if (kind === 'exit') playTone(680, 140, .45);
            else if (kind === 'legendary') [440, 554.37, 659.25, 880, 1108.73, 1318.5].forEach((note, i) => playTone(note, note * 1.01, 1, i * .07, 'triangle'));
            else if (kind === 'reveal') [523.25, 659.25, 783.99].forEach((note, i) => playTone(note, note, .65, i * .06, 'triangle'));
            else if (kind === 'rip') {
                const buffer = audioContext.createBuffer(1, Math.floor(audioContext.sampleRate * .3), audioContext.sampleRate);
                const samples = buffer.getChannelData(0);
                for (let i = 0; i < samples.length; i++) samples[i] = (Math.random() * 2 - 1) * Math.exp(-i / (audioContext.sampleRate * .07));
                const source = audioContext.createBufferSource();
                const gain = audioContext.createGain();
                source.buffer = buffer;
                gain.gain.value = .14;
                source.connect(gain);
                gain.connect(audioContext.destination);
                source.onended = () => { audioNodes.delete(source); source.disconnect(); gain.disconnect(); };
                audioNodes.add(source);
                source.start();
                source.stop(now + .31);
            }
        } catch (error) { console.warn('[Jiko sobres] Audio no disponible:', error.message); }
    }

    function burst(x, y, count, rarity) {
        if (!ctx) return;
        const colors = [Core.RARITIES[rarity].color, Core.RARITIES[rarity].secondary, '#ffffff'];
        const limit = reducedMotion ? Math.min(count, 12) : count;
        for (let i = 0; i < limit && particles.length < 240; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 2.5 + Math.random() * 12;
            particles.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 1.5, size: 2 + Math.random() * 5, alpha: 1, decay: .014 + Math.random() * .018, color: colors[i % colors.length], rotation: Math.random() * Math.PI });
        }
        if (frameId === null) { previousFrame = null; frameId = requestAnimationFrame(animateParticles); }
    }

    function animateParticles(time) {
        const step = previousFrame === null ? 1 : Math.min(2.5, (time - previousFrame) / (1000 / 60));
        previousFrame = time;
        ctx.clearRect(0, 0, 1920, 1080);
        particles = particles.filter(p => {
            p.x += p.vx * step; p.y += p.vy * step; p.vy += .14 * step;
            p.vx *= Math.pow(.985, step); p.alpha -= p.decay * step; p.rotation += .04 * step;
            if (p.alpha <= 0) return false;
            ctx.save(); ctx.globalAlpha = p.alpha; ctx.translate(p.x, p.y); ctx.rotate(p.rotation);
            ctx.fillStyle = p.color; ctx.shadowColor = p.color; ctx.shadowBlur = 12;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore();
            return true;
        });
        if (particles.length) frameId = requestAnimationFrame(animateParticles);
        else { frameId = null; previousFrame = null; ctx.clearRect(0, 0, 1920, 1080); }
    }

    function pulse(id, className) {
        const node = $(id);
        node.classList.remove(className);
        void node.offsetWidth;
        node.classList.add(className);
    }

    function resetStage(reason = 'cleared') {
        state.generation++;
        timers.forEach(clearTimeout);
        timers.clear();
        autoExitTimer = null;
        if (frameId !== null) cancelAnimationFrame(frameId);
        frameId = null; particles = []; previousFrame = null;
        if (ctx) ctx.clearRect(0, 0, 1920, 1080);
        audioNodes.forEach(node => { try { node.stop(); } catch (_) {} });
        audioNodes.clear();
        wrapper.className = '';
        wrapper.querySelector('.pack-top-seal').classList.remove('ready');
        aura.className = 'stage-aura'; rays.className = 'god-rays';
        $('epic-shockwave').className = ''; $('center-flash-burst').className = '';
        cardsStage.replaceChildren(); cardsStage.classList.remove('owned-carousel', 'batch-slides', 'batch-gathered', 'batch-departing'); cardsStage.setAttribute('aria-hidden', 'true'); slots = [];
        delete canvas.dataset.batchIndex;
        delete canvas.dataset.batchCount;
        summary.hidden = true; caption.textContent = '';
        state.pack = null;
        delete canvas.dataset.highestRarity;
        delete canvas.dataset.mode;
        setPhase('idle');
        if (cloudPlayback) {
            const playback = cloudPlayback;
            cloudPlayback = null;
            playback.cleanup();
            if (reason === 'completed') playback.resolve();
            else playback.reject(new Error('La reproducción fue interrumpida.'));
        }
    }

    function updateStats() {
        $('stat-packs').textContent = state.packs;
        $('stat-cards').textContent = state.cards;
        $('stat-legendary').textContent = state.legendary;
    }

    function revealCard(index) {
        const card = state.pack.cards[index];
        const slot = slots[index];
        slot.classList.add('flipped', 'state-revealed');
        if (card.rarity !== 'common') slot.classList.add('high-rarity');
        const rarity = Core.RARITIES[card.rarity];
        caption.textContent = '#' + card.num + ' · ' + card.title + ' · ' + rarity.label;
        burst(960 + (index - 1) * 365, 470, card.rarity === 'legendary' ? 65 : 26, card.rarity);
        playSound(card.rarity === 'legendary' ? 'legendary' : 'reveal');
        if (Core.RARITIES[card.rarity].rank >= Core.RARITIES.special.rank) {
            later(() => {
                slot.classList.add('double-emphasis');
                slot.dataset.emphasisPulses = '1';
                burst(960 + (index - 1) * 365, 470, 45, card.rarity);
            }, 600);
            later(() => {
                slot.dataset.emphasisPulses = '2';
                burst(960 + (index - 1) * 365, 455, card.rarity === 'legendary' ? 75 : 50, card.rarity);
                playSound('reveal');
            }, 1120);
            later(() => slot.classList.remove('double-emphasis'), 1750);
        }
    }

    function finishReveal() {
        const pack = state.pack;
        setPhase('revealed');
        cardsStage.setAttribute('aria-hidden', 'false');
        slots.forEach((slot, index) => {
            slot.tabIndex = 0;
            slot.setAttribute('aria-pressed', 'true');
            slot.setAttribute('aria-label', '#' + pack.cards[index].num + ' ' + pack.cards[index].title + '. Mostrar reverso');
        });
        caption.textContent = pack.mode === 'preview' ? 'VISTA DE PRUEBA · Rareza forzada. Este sobre no cuenta en las estadísticas.' : 'Tres nuevas cartas. Haz clic en cada una para ver su reverso.';
        summary.replaceChildren(element('span', '', pack.mode === 'preview' ? 'PRUEBA VISUAL' : 'SOBRE AL AZAR'), element('span', '', ' / '), element('strong', '', Core.RARITIES[pack.highestRarity].label));
        summary.hidden = false;
        updateAutoExit();
    }

    function updateAutoExit() {
        if (autoExitTimer !== null) {
            clearTimeout(autoExitTimer);
            timers.delete(autoExitTimer);
            autoExitTimer = null;
        }
        if (state.phase === 'revealed' && (cloudPlayback || !$('hold-cards').checked)) {
            const duration = cloudPlayback?.duration || Number($('display-time').value) * 1000;
            autoExitTimer = later(() => { autoExitTimer = null; gatherCards(); }, duration);
        }
    }

    function gatherCards() {
        if (state.phase !== 'revealed') return;
        setPhase('exiting');
        summary.hidden = true;
        caption.textContent = 'Hasta el próximo hallazgo.';
        slots.forEach(slot => {
            slot.tabIndex = -1;
            slot.classList.remove('state-spread', 'state-revealed');
            slot.classList.add('state-gather');
        });
        playSound('exit');
        later(() => {
            pulse('epic-shockwave', 'wave-active');
            burst(960, 470, 75, state.pack.highestRarity);
            slots.forEach(slot => { slot.classList.remove('state-gather'); slot.classList.add('state-vanish'); });
            aura.classList.remove('active'); rays.classList.remove('active');
        }, 600);
        later(() => resetStage('completed'), 1800);
    }

    function openPack(options = {}) {
        if (cloudPlayback) return false;
        if (obsMode && parent === window && !params.has('preview') && !options.awardedCards) return false;
        if (queueLocked && !options.awardedCards) return false;
        if (state.phase !== 'idle' && state.phase !== 'revealed') return false;
        let pack;
        try {
            if (options.awardedCards) {
                if (!Array.isArray(options.awardedCards) || options.awardedCards.length !== 3) throw new Error('El recibo debe contener tres cartas.');
                const cards = options.awardedCards.map(id => catalog.find(card => card.id === Number(id)));
                if (cards.some(card => !card)) throw new Error('Una carta del recibo no está en el catálogo de Firebase.');
                pack = Object.freeze({ mode: 'award', cards: Object.freeze(cards), highestRarity: Core.highestRarity(cards) });
            } else pack = Core.drawPack(catalog, options);
        }
        catch (error) { caption.textContent = error.message; showPanel(); return false; }
        resetStage();
        state.pack = pack;
        setPhase('entering');
        showPanel(false);
        palette(canvas, 'common');
        canvas.dataset.highestRarity = pack.highestRarity;
        canvas.dataset.mode = pack.mode;
        if (pack.mode === 'random') {
            state.packs++; state.cards += 3;
            state.legendary += pack.cards.filter(card => card.rarity === 'legendary').length;
            updateStats();
        }
        renderCards(pack);
        caption.textContent = pack.mode === 'preview' ? 'VISTA DE PRUEBA · Invocando sobre…' : 'La suerte ya está dentro. Invocando sobre…';
        wrapper.className = 'phase-enter';
        aura.classList.add('active'); rays.classList.add('active');
        pulse('epic-shockwave', 'wave-active');
        burst(960, 475, 35, 'common');
        playSound('appear');
        const high = pack.highestRarity !== 'common';
        if (high) {
            later(() => {
                setPhase('transforming');
                wrapper.className = 'phase-transform-spin';
                playSound('spin');
            }, 1100);
            later(() => {
                palette(canvas, pack.highestRarity);
                wrapper.classList.add('high-rarity'); aura.classList.add('high-rarity');
                pulse('epic-shockwave', 'wave-active');
                burst(960, 475, 50, pack.highestRarity);
                caption.textContent = 'El sobre resplandece: ' + Core.RARITIES[pack.highestRarity].label + '.';
            }, 1460);
        }
        const chargeAt = high ? 2050 : 1150;
        const ripAt = chargeAt + 650;
        later(() => {
            setPhase('charging');
            wrapper.className = 'phase-charge' + (high ? ' high-rarity' : '');
            wrapper.querySelector('.pack-top-seal').classList.add('ready');
        }, chargeAt);
        later(() => {
            setPhase('opening');
            wrapper.className = 'phase-enter ripping' + (high ? ' high-rarity' : '');
            pulse('center-flash-burst', 'burst-active'); pulse('epic-shockwave', 'wave-active');
            playSound('rip'); burst(960, 430, 65, pack.highestRarity);
            caption.textContent = 'Tres cartas. Tres posibilidades.';
        }, ripAt);
        later(() => slots.forEach(slot => slot.classList.add('state-emerge')), ripAt + 160);
        later(() => {
            setPhase('spreading');
            wrapper.classList.add('phase-ripped');
            slots.forEach(slot => { slot.classList.remove('state-emerge'); slot.classList.add('state-spread'); });
        }, ripAt + 650);
        const revealAt = ripAt + 1550;
        const order = pack.cards.map((card, index) => ({ index, rank: Core.RARITIES[card.rarity].rank })).sort((a, b) => a.rank - b.rank);
        let revealOffset = 0;
        order.forEach(item => {
            later(() => { setPhase('revealing'); revealCard(item.index); }, revealAt + revealOffset);
            revealOffset += item.rank >= Core.RARITIES.special.rank ? 1900 : 500;
        });
        later(finishReveal, revealAt + revealOffset + 450);
        return true;
    }

    Core.distribution(catalog).filter(item => item.probability > 0).forEach(item => {
        const cell = element('div', 'odds-item');
        palette(cell, item.rarity);
        const percent = Number((item.probability * 100).toFixed(2));
        cell.append(element('span', '', Core.RARITIES[item.rarity].label), element('strong', '', percent + '%'), element('small', '', item.count + ' cartas'));
        $('odds-grid').append(cell);
    });
    function attachPlayback(signal, duration, start) {
        if (cloudPlayback || state.phase !== 'idle') return Promise.reject(new Error('El escenario está ocupado.'));
        if (signal?.aborted) return Promise.reject(new Error('El turno fue cancelado.'));
        if (!start()) return Promise.reject(new Error('No se pudo iniciar la animación.'));
        return new Promise((resolve, reject) => {
            const cancel = () => resetStage('aborted');
            cloudPlayback = { resolve, reject, duration, cleanup: () => signal?.removeEventListener('abort', cancel) };
            signal?.addEventListener('abort', cancel, { once: true });
        });
    }
    function showOwnedCards(ids, options = {}) {
        const cards = ids.slice(0, 5).map(id => catalog.find(card => card.id === Number(id)));
        if (!cards.length || cards.some(card => !card)) return Promise.reject(new Error('No se encontraron las cartas ganadas.'));
        return attachPlayback(options.signal, options.duration || 12000, () => {
            resetStage();
            state.pack = { mode: 'collection', cards, highestRarity: Core.highestRarity(cards) };
            renderCards(state.pack);
            cardsStage.classList.add('owned-carousel');
            setPhase('collection');
            let current = 0;
            const position = () => slots.forEach((slot, index) => {
                let offset = (index - current + cards.length) % cards.length;
                if (offset > cards.length / 2) offset -= cards.length;
                const distance = Math.abs(offset);
                slot.style.transform = `translate3d(${offset * 235}px, 0, ${-distance * 85}px) rotateY(${-offset * 16}deg) scale(${1 - distance * .12})`;
                slot.style.opacity = String(1 - distance * .14);
                slot.style.zIndex = String(10 - distance);
            });
            slots.forEach(slot => { slot.classList.add('flipped', 'state-revealed', 'collection-card'); slot.tabIndex = -1; });
            position();
            const duration = options.duration || 12000;
            for (let at = 2200; at < duration; at += 2200) later(() => { current = (current + 1) % cards.length; position(); }, at);
            later(() => { slots.forEach(slot => { slot.style.opacity = '0'; slot.style.transform = 'translate3d(0, 60px, -250px) scale(.2)'; }); }, duration);
            later(() => resetStage('completed'), duration + 900);
            return true;
        });
    }

    // Una diapositiva por sobre pagado, sin invocar ni rasgar otro envoltorio.
    // Todas las cartas se conservan en la pila hasta su única salida conjunta.
    function playBatch(packs, options = {}) {
        if (!Array.isArray(packs) || packs.length < 6 || packs.length > 20 || packs.some(pack => !Array.isArray(pack) || pack.length !== 3)) return Promise.reject(new Error('La presentación requiere entre 6 y 20 sobres de tres cartas.'));
        const awarded = packs.map(pack => pack.map(id => catalog.find(card => card.id === Number(id))));
        if (awarded.some(pack => pack.some(card => !card))) return Promise.reject(new Error('Una carta del recibo no está en el catálogo.'));
        const startIndex = Math.max(0, Math.min(awarded.length, Math.floor(Number(options.startIndex) || 0)));
        return attachPlayback(options.signal, 0, () => {
            resetStage();
            const generation = state.generation;
            cardsStage.classList.add('batch-slides');
            canvas.dataset.batchCount = String(awarded.length);
            const makeSlide = index => {
                state.pack = { mode: 'batch', cards: awarded[index], highestRarity: Core.highestRarity(awarded[index]) };
                canvas.dataset.mode = 'batch';
                canvas.dataset.batchIndex = String(index);
                canvas.dataset.highestRarity = state.pack.highestRarity;
                palette(canvas, state.pack.highestRarity);
                renderCards(state.pack, true);
                cardsStage.setAttribute('aria-hidden', 'false');
                slots.forEach((slot, offset) => {
                    slot.dataset.packIndex = String(index);
                    slot.style.setProperty('--pile-x', (index * 3 + offset) * .7 + 'px');
                    slot.style.setProperty('--pile-y', (index * 3 + offset) * -.45 + 'px');
                    slot.classList.add('batch-slide', 'flipped');
                    slot.setAttribute('aria-label', '#' + awarded[index][offset].num + ' ' + awarded[index][offset].title);
                });
            };
            const stackSlide = () => slots.forEach(slot => {
                slot.classList.remove('state-spread', 'state-revealed', 'double-emphasis');
                slot.classList.add('batch-stacked');
                slot.setAttribute('aria-hidden', 'true');
            });
            const finishBatch = () => {
                setPhase('batch-gathering');
                cardsStage.classList.add('batch-gathered');
                aura.classList.remove('active'); rays.classList.remove('active');
                playSound('exit');
                later(() => cardsStage.classList.add('batch-departing'), 800);
                later(() => resetStage('completed'), 1800);
            };
            const nextSlide = index => {
                if (generation !== state.generation || options.signal?.aborted) return;
                if (index >= awarded.length) { finishBatch(); return; }
                makeSlide(index);
                setPhase('batch');
                const high = state.pack.highestRarity !== 'common';
                aura.classList.toggle('active', high);
                rays.classList.toggle('active', high);
                later(() => slots.forEach((slot, offset) => {
                    slot.classList.add('state-spread');
                    if (awarded[index][offset].rarity !== 'common') revealCard(offset);
                    else slot.classList.add('state-revealed');
                }), 40);
                later(async () => {
                    stackSlide();
                    aura.classList.remove('active'); rays.classList.remove('active');
                    try {
                        await options.onCheckpoint?.(index + 1);
                        if (generation !== state.generation || options.signal?.aborted) return;
                        later(() => nextSlide(index + 1), 450);
                    } catch (error) {
                        console.warn('[TCG diapositivas]', error.message);
                        if (generation === state.generation) resetStage('failed');
                    }
                }, high ? 3200 : 2400);
            };
            // Al recuperar un turno, reconstruir la pila ya mostrada sin repetir diapositivas.
            for (let index = 0; index < startIndex; index++) { makeSlide(index); stackSlide(); }
            nextSlide(startIndex);
            return true;
        });
    }
    const legendProbability = Core.distribution(catalog).find(item => item.rarity === 'legendary').probability;
    $('legendary-pack-chance').textContent = (Core.chanceInPack(legendProbability) * 100).toFixed(2) + '%';

    $('btn-open-pack').addEventListener('click', () => openPack());
    $('btn-test-effect').addEventListener('click', () => openPack({ mode: 'preview', rarity: $('test-rarity').value }));
    $('btn-reset').addEventListener('click', () => { resetStage(); showPanel(); });
    $('close-panel').addEventListener('click', () => { showPanel(false); $('reopen-panel').focus({ preventScroll: true }); });
    $('reopen-panel').addEventListener('click', () => showPanel(panel.hidden));
    $('display-time').addEventListener('input', event => { $('display-time-label').textContent = event.target.value + ' s'; updateAutoExit(); });
    $('hold-cards').addEventListener('change', updateAutoExit);
    $('sound-enabled').addEventListener('change', event => {
        if (!event.target.checked) { audioNodes.forEach(node => { try { node.stop(); } catch (_) {} }); audioNodes.clear(); }
    });
    canvas.addEventListener('click', event => {
        if (cloudPlayback) return;
        if (event.target.closest('button, input, select, summary, #sim-config-panel')) return;
        if (controlsEnabled) showPanel();
        else openPack();
    });
    addEventListener('keydown', event => {
        if (cloudPlayback) return;
        if (event.key === 'Escape') {
            if (controlsEnabled && !panel.hidden) { showPanel(false); $('reopen-panel').focus({ preventScroll: true }); }
            else resetStage();
            return;
        }
        if (event.target.closest('input, select, textarea, [contenteditable="true"]')) return;
        if (event.key.toLowerCase() === 'h' && controlsEnabled) { event.preventDefault(); showPanel(panel.hidden); }
        if (event.key.toLowerCase() === 'n') { event.preventDefault(); openPack(); }
    });
    addEventListener('pagehide', resetStage);

    loadArtwork($('pack-front-art'), Core.PACK_ART.front);
    loadArtwork($('pack-back-art'), Core.PACK_ART.back);
    loadArtwork($('pack-seal-art'), Core.PACK_ART.front);
    palette(canvas, 'common');
    setPhase('idle');
    if (controlsEnabled) showPanel();
    // API local de simulación para pruebas. No escucha los comandos del mostrador.
    window.JikoBooster = Object.freeze({
        open: openPack,
        clear: resetStage,
        gather: gatherCards,
        showPanel,
        playAwarded: (ids, options = {}) => attachPlayback(options.signal, options.duration || 8000, () => openPack({ awardedCards: ids })),
        playBatch,
        showOwned: showOwnedCards,
        setCloudCatalog: cards => { if (state.phase !== 'idle') return false; catalog = Core.createCatalog(cards); return true; },
        setCloudProduct: product => { if (product?.img && $('pack-front-art').getAttribute('src') !== product.img) { loadArtwork($('pack-front-art'), product.img); loadArtwork($('pack-seal-art'), product.img); } if (product?.packBack && $('pack-back-art').getAttribute('src') !== product.packBack) loadArtwork($('pack-back-art'), product.packBack); },
        setQueueLocked: locked => { queueLocked = !!locked; },
        snapshot: () => ({ phase: state.phase, mode: state.pack?.mode || null, highestRarity: state.pack?.highestRarity || null, cards: state.pack?.cards.map(card => ({ id: card.id, num: card.num, rarity: card.rarity, frontImage: card.frontImage, backImage: card.backImage })) || [], stats: { packs: state.packs, cards: state.cards, legendary: state.legendary }, pendingTimers: timers.size, particles: particles.length, controlsEnabled, panelOpen: !panel.hidden, failedImages: failedAssets.size, loadedImages: loadedAssets.size })
    });
    import('./tarjetero_cloud.js').catch(error => console.warn('[TCG nube]', error.message));
})();
