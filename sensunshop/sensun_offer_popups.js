/**
 * Sensun Shop — Módulo Universal de Ventanas Emergentes de Ofertas (4 Estilos)
 * Soporta:
 * - Estilo 1 · Cupón (Borde troquelado durazno, tijeras, código copiable)
 * - Estilo 2 · Festivo (Fondo degradado morado festivo, texto gigante, contador regresivo dinámico)
 * - Estilo 3 · Minimal (Avatar sobresaliente superior -30px, píldora flotante, detalle extendido)
 * - Estilo 4 · Banner (Corte diagonal naranja fuego, insignia ¡HOY!, tarjeta flotante, código, favoritos)
 */

(function () {
    // 1. Inyectar SVG Symbols requeridos si no existen
    function injectSvgSymbols() {
        if (document.getElementById('sensun-offer-svg-symbols')) return;

        const svgDiv = document.createElement('div');
        svgDiv.id = 'sensun-offer-svg-symbols';
        svgDiv.style.display = 'none';
        svgDiv.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg">
          <symbol id="so-star" viewBox="0 0 24 24"><path d="m12 2.5 2.9 6.2 6.6.9-4.9 4.6 1.3 6.6L12 17.6l-5.9 3.2 1.3-6.6-4.9-4.6 6.6-.9Z"/></symbol>
          <symbol id="so-heart" viewBox="0 0 24 24"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.29 1.51 4.04 3 5.5l7 7Z"/></symbol>
          <symbol id="so-x" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></symbol>
          <symbol id="so-copy" viewBox="0 0 24 24"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h10"/></symbol>
          <symbol id="so-scissors" viewBox="0 0 24 24"><circle cx="6" cy="6" r="2.6"/><circle cx="6" cy="18" r="2.6"/><path d="M20 4 8.2 15.8"/><path d="M14.8 14.8 20 20"/><path d="M8.2 8.2 12 12"/></symbol>
          <symbol id="so-chev-r" viewBox="0 0 24 24"><path d="m9 18 6-6-6-6"/></symbol>
        </svg>
        `;
        document.body.appendChild(svgDiv);
    }

    // 2. Inyectar Estilos CSS Globales del Módulo de Popups
    function injectPopupStyles() {
        if (document.getElementById('sensun-offer-styles')) return;

        const style = document.createElement('style');
        style.id = 'sensun-offer-styles';
        style.textContent = `
        :root {
            --so-orange: #C2410C;
            --so-orange-2: #EA580C;
            --so-purple: #6D28D9;
            --so-purple-d: #5B21B6;
            --so-ink: #242B36;
            --so-body: #67717E;
            --so-muted: #94A3B8;
            --so-cream: #FFFAF5;
            --so-line: #E9E2DA;
            --so-soft: #FFF3E8;
            --so-star: #F59E0B;
        }

        /* Contenedor Overlay Modal Global */
        .sensun-offer-overlay {
            position: fixed;
            inset: 0;
            z-index: 999999;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 16px;
            background: rgba(36, 43, 54, 0);
            pointer-events: none;
            backdrop-filter: blur(0px);
            -webkit-backdrop-filter: blur(0px);
            transition: background 0.24s ease, backdrop-filter 0.24s ease, -webkit-backdrop-filter 0.24s ease;
            font-family: system-ui, -apple-system, sans-serif;
        }

        .sensun-offer-overlay.open {
            background: rgba(36, 43, 54, 0.65);
            pointer-events: auto;
            backdrop-filter: blur(6px);
            -webkit-backdrop-filter: blur(6px);
        }

        .sensun-offer-modal-box {
            width: 100%;
            max-width: 480px;
            position: relative;
            transform: scale(0.94) translateY(16px);
            opacity: 0;
            transition: all 0.24s cubic-bezier(0.18, 0.9, 0.3, 1.18);
            font-family: system-ui, -apple-system, sans-serif;
            color: var(--so-ink);
            background: #ffffff;
            border-radius: 22px;
            box-shadow: 0 20px 48px rgba(36, 43, 54, 0.18);
            border: 1px solid var(--so-line);
            box-sizing: border-box;
            overflow: hidden;
            max-height: calc(100vh - 32px);
            overflow-y: auto;
        }

        @media (max-width: 720px) {
            .sensun-offer-modal-box {
                border-radius: 19px;
            }
        }

        .sensun-offer-overlay.open .sensun-offer-modal-box {
            transform: scale(1) translateY(0);
            opacity: 1;
        }

        .so-ic {
            fill: none;
            stroke: currentColor;
            stroke-width: 2;
            stroke-linecap: round;
            stroke-linejoin: round;
            display: inline-block;
            vertical-align: middle;
        }

        .so-ic.fill {
            fill: currentColor;
            stroke: currentColor;
            stroke-width: 1;
        }

        .so-close {
            position: absolute;
            top: 14px;
            right: 14px;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            border: 1px solid var(--so-line);
            background: #ffffff;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10;
            color: var(--so-body);
            transition: transform 0.16s ease, background 0.16s, color 0.16s;
        }

        .so-close:hover {
            background: var(--so-soft);
            color: var(--so-orange);
        }

        .so-close:active {
            transform: scale(0.92);
        }

        .so-close svg {
            width: 16px;
            height: 16px;
        }

        .so-close-soft {
            background: #F3EEE8;
            color: #8A939C;
        }

        .so-close-soft:hover {
            background: #e8e2db;
            color: #333;
        }

        .so-close-light {
            background: rgba(255, 255, 255, 0.3);
            color: #fff;
        }

        .so-close-light:hover {
            background: rgba(255, 255, 255, 0.5);
        }

        .so-cta-fill {
            width: 100%;
            border: none;
            border-radius: 14px;
            padding: 13px;
            background: linear-gradient(135deg, var(--so-orange-2), var(--so-orange));
            color: #fff;
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 12.5px;
            cursor: pointer;
            box-shadow: 0 8px 20px rgba(255, 107, 0, 0.32);
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            text-decoration: none;
            transition: transform 0.15s ease, box-shadow 0.2s;
        }

        .so-cta-fill:active {
            transform: scale(0.97);
        }

        .so-cta-fill svg {
            width: 14px;
            height: 14px;
        }

        /* ===== ESTILO 1 · CUPÓN ===== */
        .so-m1 {
            background: #ffffff;
            border-radius: 26px;
            padding: 18px 16px 16px;
            box-shadow: 0 25px 55px rgba(20, 14, 24, 0.38);
            position: relative;
        }

        .so-m1-head {
            display: flex;
            gap: 12px;
            align-items: center;
            padding-right: 28px;
        }

        .so-m1-thumb {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            object-fit: cover;
            border: 1px solid var(--so-line);
            flex-shrink: 0;
            background: #fff;
        }

        .so-m1-name {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 12.5px;
            line-height: 1.3;
            color: var(--so-ink);
        }

        .so-m1-cat {
            font-size: 9.5px;
            color: var(--so-muted);
            margin-top: 3px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .so-m1-cat svg {
            width: 10px;
            height: 10px;
            color: var(--so-star);
        }

        .so-m1-coupon {
            margin-top: 14px;
            border: 2px dashed #F6C9A8;
            background: #FFF6EE;
            border-radius: 18px;
            padding: 16px 14px 14px;
            text-align: center;
            position: relative;
        }

        .so-m1-scissors {
            position: absolute;
            top: -10px;
            left: 50%;
            transform: translateX(-50%);
            background: #FFF6EE;
            padding: 0 6px;
            color: #E09A5F;
        }

        .so-m1-scissors svg {
            width: 15px;
            height: 15px;
        }

        .so-m1-pct {
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 32px;
            color: var(--so-orange);
            line-height: 1;
        }

        .so-m1-lbl {
            font-size: 8.8px;
            letter-spacing: 2px;
            font-weight: 700;
            color: #B4571A;
            margin-top: 5px;
            text-transform: uppercase;
        }

        .so-m1-code {
            margin: 11px auto 0;
            display: flex;
            align-items: center;
            gap: 7px;
            background: #fff;
            border: 1.5px dashed #F0B27F;
            border-radius: 999px;
            padding: 7px 14px;
            font-size: 11px;
            font-weight: 700;
            color: #B4571A;
            width: max-content;
            cursor: pointer;
            transition: all 0.2s;
        }

        .so-m1-code:hover {
            background: #fffdfb;
            border-color: var(--so-orange);
        }

        .so-m1-code svg {
            width: 12px;
            height: 12px;
        }

        .so-m1-valid {
            margin-top: 11px;
            font-size: 9px;
            color: var(--so-muted);
            text-align: center;
        }

        .so-m1 .so-cta-fill {
            margin-top: 12px;
        }

        /* ===== ESTILO 2 · FESTIVO ===== */
        .so-m2 {
            background: radial-gradient(rgba(255, 255, 255, 0.22) 1.5px, transparent 1.6px),
                        radial-gradient(rgba(255, 255, 255, 0.15) 1.2px, transparent 1.4px),
                        linear-gradient(160deg, #A66BC0, #7D3FA8);
            background-size: 28px 28px, 38px 38px;
            background-position: 0 0, 14px 10px;
            border-radius: 28px;
            padding: 18px 16px;
            color: #fff;
            box-shadow: 0 25px 55px rgba(80, 40, 110, 0.48);
            overflow: hidden;
            text-align: center;
            position: relative;
        }

        .so-m2::before {
            content: "";
            position: absolute;
            width: 140px;
            height: 140px;
            border-radius: 50%;
            background: rgba(255, 255, 255, 0.10);
            top: -48px;
            right: -48px;
            pointer-events: none;
        }

        .so-m2-top {
            display: flex;
            align-items: center;
            gap: 10px;
            text-align: left;
            padding-right: 28px;
            position: relative;
            z-index: 2;
        }

        .so-m2-thumb {
            width: 42px;
            height: 42px;
            border-radius: 50%;
            object-fit: cover;
            border: 2.5px solid rgba(255, 255, 255, 0.88);
            flex-shrink: 0;
            background: #fff;
        }

        .so-m2-name {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 12px;
        }

        .so-m2-rate {
            font-size: 9.5px;
            opacity: 0.92;
            margin-top: 2px;
            display: flex;
            gap: 4px;
            align-items: center;
        }

        .so-m2-rate svg {
            width: 10px;
            height: 10px;
            color: #FFD46A;
        }

        .so-m2-big {
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 46px;
            line-height: 1;
            margin-top: 14px;
            position: relative;
            z-index: 2;
            text-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
        }

        .so-m2-big span {
            font-size: 24px;
            vertical-align: top;
        }

        .so-m2-pill {
            margin: 9px auto 0;
            width: max-content;
            background: rgba(255, 255, 255, 0.18);
            border: 1px solid rgba(255, 255, 255, 0.35);
            padding: 5px 14px;
            border-radius: 999px;
            font-size: 8.5px;
            font-weight: 700;
            letter-spacing: 2px;
            position: relative;
            z-index: 2;
        }

        .so-m2-count {
            display: flex;
            justify-content: center;
            gap: 9px;
            margin-top: 14px;
            position: relative;
            z-index: 2;
        }

        .so-cd-box {
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.3);
            border-radius: 13px;
            padding: 7px 10px;
            min-width: 48px;
        }

        .so-cd-num {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 16px;
        }

        .so-cd-lb {
            font-size: 7.5px;
            letter-spacing: 1.5px;
            opacity: 0.85;
        }

        .so-cta-white {
            margin-top: 15px;
            width: 100%;
            border: none;
            border-radius: 14px;
            padding: 13px;
            background: #ffffff;
            color: var(--so-purple-d);
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 12.5px;
            cursor: pointer;
            position: relative;
            z-index: 2;
            box-shadow: 0 10px 22px rgba(0, 0, 0, 0.22);
            text-decoration: none;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            transition: transform 0.15s ease;
        }

        .so-cta-white:active {
            transform: scale(0.96);
        }

        /* ===== ESTILO 3 · MINIMAL ===== */
        .so-m3 {
            background: #ffffff;
            border-radius: 28px;
            padding: 44px 18px 16px;
            text-align: center;
            box-shadow: 0 25px 55px rgba(20, 14, 24, 0.38);
            position: relative;
        }

        .so-m3-ava {
            position: absolute;
            top: -30px;
            left: 50%;
            transform: translateX(-50%);
            width: 64px;
            height: 64px;
            border-radius: 50%;
            object-fit: cover;
            border: 4px solid #ffffff;
            box-shadow: 0 10px 22px rgba(40, 45, 51, 0.18);
            background: #fff;
        }

        .so-m3-badge {
            margin: 4px auto 0;
            width: max-content;
            background: linear-gradient(135deg, var(--so-orange-2), var(--so-orange));
            color: #fff;
            font-size: 8.6px;
            font-weight: 700;
            letter-spacing: 1.5px;
            padding: 5px 14px;
            border-radius: 999px;
            box-shadow: 0 6px 14px rgba(255, 107, 0, 0.35);
        }

        .so-m3-name {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 14.5px;
            margin-top: 10px;
            color: var(--so-ink);
        }

        .so-m3-cat {
            font-size: 9.5px;
            color: var(--so-muted);
            margin-top: 3px;
        }

        .so-m3-stars {
            display: flex;
            justify-content: center;
            gap: 3px;
            margin-top: 8px;
            color: var(--so-star);
        }

        .so-m3-stars svg {
            width: 13px;
            height: 13px;
        }

        .so-m3-offer {
            margin-top: 10px;
            font-size: 11.5px;
            line-height: 1.55;
            color: var(--so-body);
        }

        .so-m3-offer b {
            color: var(--so-orange);
        }

        .so-m3-dots {
            display: flex;
            gap: 4px;
            justify-content: center;
            margin-top: 11px;
        }

        .so-m3-dots span {
            width: 4px;
            height: 4px;
            border-radius: 50%;
            background: #E4D8CC;
        }

        .so-cta-soft {
            margin-top: 12px;
            width: 100%;
            border: none;
            border-radius: 14px;
            padding: 13px;
            background: #FFF0E5;
            color: var(--so-orange);
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 12.5px;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 7px;
            text-decoration: none;
            transition: transform 0.15s ease, background 0.2s;
        }

        .so-cta-soft:hover {
            background: #ffe8d6;
        }

        .so-cta-soft:active {
            transform: scale(0.96);
        }

        .so-cta-soft svg {
            width: 14px;
            height: 14px;
        }

        .so-m3-later {
            margin-top: 8px;
            width: 100%;
            background: none;
            border: none;
            color: var(--so-purple);
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 10.5px;
            cursor: pointer;
            padding: 4px;
            transition: opacity 0.2s;
        }

        .so-m3-later:hover {
            opacity: 0.8;
        }

        /* ===== ESTILO 4 · BANNER ===== */
        .so-m4 {
            background: #ffffff;
            border-radius: 26px;
            overflow: hidden;
            box-shadow: 0 25px 55px rgba(20, 14, 24, 0.38);
            padding-bottom: 16px;
            position: relative;
        }

        .so-m4-banner {
            position: relative;
            height: 104px;
            background: radial-gradient(rgba(255, 255, 255, 0.2) 1.4px, transparent 1.5px),
                        linear-gradient(135deg, var(--so-orange-2), #F25C05);
            background-size: 22px 22px;
            clip-path: polygon(0 0, 100% 0, 100% 72%, 0 100%);
        }

        .so-m4-pct {
            position: absolute;
            left: 16px;
            top: 16px;
            color: #fff;
            font-family: 'Poppins', sans-serif;
            font-weight: 800;
            font-size: 28px;
            line-height: 1;
            text-shadow: 0 4px 12px rgba(0, 0, 0, 0.18);
        }

        .so-m4-blbl {
            font-size: 7.8px;
            letter-spacing: 2px;
            font-weight: 700;
            margin-top: 3px;
        }

        .so-m4-hoy {
            position: absolute;
            right: 14px;
            top: 16px;
            background: #ffffff;
            color: #F25C05;
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 9.5px;
            padding: 5px 12px;
            border-radius: 999px;
            transform: rotate(6deg);
            box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
        }

        .so-m4-biz {
            margin: -28px 16px 0;
            position: relative;
            z-index: 3;
            background: #ffffff;
            border: 1px solid var(--so-line);
            border-radius: 16px;
            box-shadow: 0 8px 18px rgba(40, 45, 51, 0.10);
            padding: 9px 12px;
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .so-m4-thumb {
            width: 40px;
            height: 40px;
            border-radius: 12px;
            object-fit: cover;
            flex-shrink: 0;
            background: #fff;
        }

        .so-m4-name {
            font-family: 'Poppins', sans-serif;
            font-weight: 600;
            font-size: 11.5px;
            color: var(--so-ink);
        }

        .so-m4-rate {
            font-size: 9px;
            color: var(--so-muted);
            margin-top: 2px;
            display: flex;
            gap: 3px;
            align-items: center;
        }

        .so-m4-rate svg {
            width: 9px;
            height: 9px;
            color: var(--so-star);
        }

        .so-m4-body {
            padding: 12px 18px 0;
        }

        .so-m4-title {
            font-family: 'Poppins', sans-serif;
            font-weight: 700;
            font-size: 14px;
            color: var(--so-ink);
        }

        .so-m4-txt {
            font-size: 10px;
            color: var(--so-body);
            margin-top: 4px;
            line-height: 1.5;
        }

        .so-m4-code {
            margin-top: 10px;
            display: flex;
            align-items: center;
            gap: 7px;
            width: max-content;
            background: #F6EEFA;
            border: 1.5px dashed #E7D3F2;
            color: var(--so-purple-d);
            border-radius: 999px;
            padding: 6px 14px;
            font-size: 11px;
            font-weight: 700;
            cursor: pointer;
            transition: all 0.2s;
        }

        .so-m4-code:hover {
            background: #efe4f5;
            border-color: var(--so-purple);
        }

        .so-m4-code svg {
            width: 12px;
            height: 12px;
        }

        .so-m4-cta {
            display: flex;
            gap: 9px;
            margin: 14px 18px 0;
        }

        .so-m4-cta .so-cta-fill {
            flex: 1;
        }

        .so-m4-heart {
            width: 44px;
            height: 44px;
            border-radius: 14px;
            border: 1.5px solid var(--so-line);
            background: #ffffff;
            color: #C7CED6;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            flex-shrink: 0;
            transition: all 0.2s ease;
        }

        .so-m4-heart:hover {
            border-color: #fca5a5;
            color: #ef4444;
        }

        .so-m4-heart.on {
            background: var(--so-orange);
            border-color: var(--so-orange);
            color: #ffffff;
        }

        .so-m4-heart.on svg {
            fill: #ffffff;
        }

        /* ===== ESTILO CANÓNICO A1 · W18 (Manual A1 · Modal único de ofertas) ===== */
        .so-w18 {
            background: #ffffff;
            padding: 24px;
            position: relative;
            display: flex;
            flex-direction: column;
            gap: 14px;
            box-sizing: border-box;
        }

        .so-w18-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            padding-right: 44px;
        }

        .so-w18-badge {
            display: inline-flex;
            align-items: center;
            gap: 5px;
            background: var(--so-soft);
            color: var(--so-orange);
            border: 1px solid var(--so-line);
            border-radius: 999px;
            padding: 4px 12px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }

        .so-w18-benefit {
            font-size: 22px;
            font-weight: 800;
            color: var(--so-orange);
            line-height: 1.25;
            letter-spacing: -0.02em;
        }

        .so-w18-biz {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 10px 14px;
            background: var(--so-cream);
            border: 1px solid var(--so-line);
            border-radius: 14px;
        }

        .so-w18-thumb {
            width: 52px;
            height: 52px;
            border-radius: 12px;
            object-fit: contain;
            background: #ffffff;
            border: 1px solid var(--so-line);
            flex-shrink: 0;
        }

        .so-w18-biz-name {
            font-size: 15px;
            font-weight: 700;
            color: var(--so-ink);
        }

        .so-w18-biz-sub {
            font-size: 12px;
            color: var(--so-body);
            margin-top: 2px;
            display: flex;
            align-items: center;
            gap: 4px;
        }

        .so-w18-coupon {
            border: 2px dashed var(--so-orange);
            background: var(--so-soft);
            border-radius: 12px;
            padding: 12px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 10px;
        }

        .so-w18-coupon-label {
            font-size: 10.5px;
            font-weight: 700;
            letter-spacing: 0.8px;
            color: #9A3412;
            text-transform: uppercase;
        }

        .so-w18-code {
            font-family: monospace, system-ui;
            font-size: 16px;
            font-weight: 800;
            color: var(--so-orange);
            letter-spacing: 1.5px;
        }

        .so-w18-copy-btn {
            min-height: 36px;
            padding: 0 14px;
            border-radius: 8px;
            background: var(--so-orange);
            color: #ffffff;
            font-size: 12px;
            font-weight: 700;
            border: none;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 6px;
            transition: background 0.16s ease, transform 0.1s ease;
        }

        .so-w18-copy-btn:hover {
            background: #9A3412;
        }

        .so-w18-copy-btn:active {
            transform: scale(0.96);
        }

        .so-w18-conditions {
            background: #FAFAF9;
            border: 1px solid var(--so-line);
            border-radius: 12px;
            padding: 12px 14px;
            font-size: 12px;
            line-height: 1.55;
            color: var(--so-body);
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .so-w18-cond-item {
            display: flex;
            gap: 8px;
            align-items: flex-start;
        }

        .so-w18-check {
            color: #166534;
            font-weight: 700;
            flex-shrink: 0;
        }

        .so-w18-cta {
            display: flex;
            gap: 10px;
            margin-top: 4px;
        }

        .so-w18-cta .so-cta-fill {
            flex: 1;
        }

        /* Toast de confirmación de copiado */
        .sensun-offer-toast {
            position: fixed;
            left: 50%;
            bottom: 35px;
            transform: translateX(-50%) translateY(20px);
            background: #1e2229;
            color: #ffffff;
            font-size: 11.5px;
            font-weight: 600;
            padding: 9px 18px;
            border-radius: 999px;
            opacity: 0;
            pointer-events: none;
            transition: all 0.3s cubic-bezier(0.18, 0.9, 0.3, 1.18);
            z-index: 1000000;
            white-space: nowrap;
            box-shadow: 0 10px 25px rgba(0, 0, 0, 0.35);
        }

        .sensun-offer-toast.show {
            opacity: 1;
            transform: translateX(-50%) translateY(0);
        }
        `;
        document.head.appendChild(style);
    }

    // Fallback oficial optimizado
    const FALLBACK_POPUP_THUMB = 'https://res.cloudinary.com/dn6fmqae9/image/upload/f_auto,q_auto,w_200/v1788626857/logo_comandos_hivma7.webp';

    function optimizeSensunThumb(url, width = 240) {
        if (!url || typeof url !== 'string') return FALLBACK_POPUP_THUMB;
        if (url.includes('res.cloudinary.com') && url.includes('/upload/')) {
            if (!url.includes('/f_auto') && !url.includes('/w_')) {
                return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width}/`);
            }
        }
        return url;
    }

    // 3. Generar HTML Canónico W18 (Manual A1 · Única propuesta seleccionada)
    function generatePopupHTML(biz, isPreview) {
        const rawThumb = biz.imgSrc || biz.imageUrl || FALLBACK_POPUP_THUMB;
        const thumb = optimizeSensunThumb(rawThumb, 240);
        const title = biz.title || 'Comercio Sensun Shop';
        const category = biz.category || biz.badge || 'Comercio Local';
        const stars = biz.rating || '4.8';
        const discount = biz.offerDiscount || '';
        const msg = biz.offerMsg || 'Beneficio para nuestra comunidad';
        const code = biz.offerCode || '';
        const expiry = biz.offerExpiry || 'Válido por tiempo limitado';
        const detail = biz.offerDetail || 'Consulta condiciones y disponibilidad directamente con el negocio.';
        const distance = biz.offerDistance || 'Sensuntepeque';
        const hasCountdown = parseInt(biz.offerStyle, 10) === 2 || !!biz.offerDurationHours;

        const phoneClean = (biz.whatsapp || '').replace(/\D/g, '');
        const targetUrl = biz.whatsapp ? `https://api.whatsapp.com/send?phone=${phoneClean}&text=${encodeURIComponent('Hola ' + title + ', vi su oferta "' + msg + '" en Sensun Shop')}` : (biz.website || '#');

        const closeBtn = isPreview ? '' : `<button type="button" class="so-close so-close-soft" data-so-close aria-label="Cerrar"><svg class="so-ic"><use href="#so-x"/></svg></button>`;

        return `
        <div class="so-w18" id="so-popup-w18">
            ${closeBtn}
            <div class="so-w18-header">
                <span class="so-w18-badge">${category}</span>
                ${distance ? `<span style="font-size: 11.5px; color: var(--so-muted);">${distance}</span>` : ''}
            </div>

            <div class="so-w18-benefit">
                ${discount ? `<span style="display:inline-block; margin-right:6px; color:#C2410C;">${discount}</span> ` : ''}${msg}
            </div>

            <div class="so-w18-biz">
                <img class="so-w18-thumb" src="${thumb}" alt="${title}" loading="lazy" decoding="async" onerror="this.src='${FALLBACK_POPUP_THUMB}'">
                <div style="flex: 1; min-width: 0;">
                    <div class="so-w18-biz-name">${title}</div>
                    <div class="so-w18-biz-sub"><svg class="so-ic fill" style="color:var(--so-star); width:13px; height:13px;"><use href="#so-star"/></svg> ${stars} · ${category}</div>
                </div>
            </div>

            ${code ? `
            <div class="so-w18-coupon">
                <div>
                    <div class="so-w18-coupon-label">Código de cupón</div>
                    <div class="so-w18-code">${code}</div>
                </div>
                <button type="button" class="so-w18-copy-btn" data-copy-code="${code}" aria-label="Copiar código ${code}">
                    <svg class="so-ic"><use href="#so-copy"/></svg> Copiar código
                </button>
            </div>` : ''}

            ${hasCountdown ? `
            <div class="so-m2-count" data-countdown-box style="margin-top: 6px;">
                <div class="so-cd-box"><div class="so-cd-num so-cd-hh">05</div><div class="so-cd-lb">HRS</div></div>
                <div class="so-cd-box"><div class="so-cd-num so-cd-mm">59</div><div class="so-cd-lb">MIN</div></div>
                <div class="so-cd-box"><div class="so-cd-num so-cd-ss">59</div><div class="so-cd-lb">SEG</div></div>
            </div>` : ''}

            <div class="so-w18-conditions">
                <div class="so-w18-cond-item">
                    <span class="so-w18-check">✓</span>
                    <span><strong>Vigencia:</strong> ${expiry}</span>
                </div>
                <div class="so-w18-cond-item">
                    <span class="so-w18-check">✓</span>
                    <span><strong>Condiciones:</strong> ${detail}</span>
                </div>
                <div class="so-w18-cond-item">
                    <span class="so-w18-check">✓</span>
                    <span>Confirmar la promoción directamente con el negocio.</span>
                </div>
            </div>

            <div class="so-w18-cta">
                <a href="${targetUrl}" class="so-cta-fill" ${biz.whatsapp ? 'target="_blank" rel="noopener noreferrer"' : ''}>
                    Ver Negocio <svg class="so-ic"><use href="#so-chev-r"/></svg>
                </a>
                <button type="button" class="so-m4-heart" data-so-heart aria-label="Guardar en favoritos"><svg class="so-ic"><use href="#so-heart"/></svg></button>
            </div>
        </div>
        `;
    }

    // 4. Controlador del Reloj Regresivo (Estilo 2)
    let countdownInterval = null;
    function startCountdown(container, durationHours) {
        if (countdownInterval) clearInterval(countdownInterval);
        const hours = parseFloat(durationHours) || 6;
        let remainingSeconds = Math.round(hours * 3600);

        function tick() {
            const hhNode = container.querySelector('.so-cd-hh');
            const mmNode = container.querySelector('.so-cd-mm');
            const ssNode = container.querySelector('.so-cd-ss');
            if (!hhNode || !mmNode || !ssNode) return;

            const hh = Math.floor(remainingSeconds / 3600);
            const mm = Math.floor((remainingSeconds % 3600) / 60);
            const ss = remainingSeconds % 60;

            hhNode.textContent = String(hh).padStart(2, '0');
            mmNode.textContent = String(mm).padStart(2, '0');
            ssNode.textContent = String(ss).padStart(2, '0');

            if (remainingSeconds > 0) {
                remainingSeconds--;
            }
        }

        tick();
        countdownInterval = setInterval(tick, 1000);
    }

    // 5. Toast Global para confirmación
    let toastTimer = null;
    function showToast(msg) {
        let toast = document.getElementById('sensun-offer-toast');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'sensun-offer-toast';
            toast.className = 'sensun-offer-toast';
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.classList.add('show');
        if (toastTimer) clearTimeout(toastTimer);
        toastTimer = setTimeout(() => {
            toast.classList.remove('show');
        }, 2200);
    }

    // 6. Apertura del Popup Modal Global
    function openSensunOfferModal(businessData) {
        injectSvgSymbols();
        injectPopupStyles();

        let overlay = document.getElementById('sensun-offer-overlay');
        if (!overlay) {
            overlay = document.createElement('div');
            overlay.id = 'sensun-offer-overlay';
            overlay.className = 'sensun-offer-overlay';
            overlay.innerHTML = `<div class="sensun-offer-modal-box" id="sensun-offer-modal-box"></div>`;
            document.body.appendChild(overlay);

            // Cierre al hacer clic fuera
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) {
                    closeSensunOfferModal();
                }
            });
        }

        const modalBox = document.getElementById('sensun-offer-modal-box');
        modalBox.innerHTML = generatePopupHTML(businessData, false);

        // Eventos internos
        // Botones de cierre
        modalBox.querySelectorAll('[data-so-close]').forEach(btn => {
            btn.addEventListener('click', closeSensunOfferModal);
        });

        // Botón copiar código
        modalBox.querySelectorAll('[data-copy-code]').forEach(btn => {
            btn.addEventListener('click', function () {
                const code = this.getAttribute('data-copy-code') || '';
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(() => {
                        showToast(`¡Código ${code} copiado al portapapeles! ✂️`);
                    }).catch(() => {
                        showToast(`Código: ${code}`);
                    });
                } else {
                    showToast(`Código: ${code}`);
                }
            });
        });

        // Botón corazón favorito (Estilo 4)
        const heartBtn = modalBox.querySelector('[data-so-heart]');
        if (heartBtn) {
            heartBtn.addEventListener('click', function () {
                this.classList.toggle('on');
                showToast(this.classList.contains('on') ? '❤️ Guardado en tus favoritos' : 'Eliminado de favoritos');
            });
        }

        // Reloj si existe caja de cuenta regresiva
        if (modalBox.querySelector('[data-countdown-box]')) {
            startCountdown(modalBox, businessData.offerDurationHours || 6);
        }

        // Abrir con animación
        requestAnimationFrame(() => {
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        });

        // Escuchar tecla Escape
        const onEscClose = (e) => {
            if (e.key === 'Escape') {
                closeSensunOfferModal();
                document.removeEventListener('keydown', onEscClose);
            }
        };
        document.addEventListener('keydown', onEscClose);
    }

    function closeSensunOfferModal() {
        const overlay = document.getElementById('sensun-offer-overlay');
        if (overlay) {
            overlay.classList.remove('open');
            document.body.style.overflow = '';
            if (countdownInterval) {
                clearInterval(countdownInterval);
                countdownInterval = null;
            }
        }
    }

    // Exportar al ámbito global
    window.openSensunOfferModal = openSensunOfferModal;
    window.closeSensunOfferModal = closeSensunOfferModal;
    window.renderSensunOfferHTML = generatePopupHTML;
    window.startSensunOfferCountdown = startCountdown;
    window.injectSensunOfferAssets = function () {
        injectSvgSymbols();
        injectPopupStyles();
    };

    // Auto inicializar al cargar DOM
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            injectSvgSymbols();
            injectPopupStyles();
        });
    } else {
        injectSvgSymbols();
        injectPopupStyles();
    }
})();
