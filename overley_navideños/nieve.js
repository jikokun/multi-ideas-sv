/* Nieve compactada: relieve irregular y textura fija, pintados una sola vez. */
(() => {
  'use strict';
  function render(canvas) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width = 1920;
    const height = canvas.height = 112;
    let seed = 192016;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    function noise(spacing) {
      const samples = Array.from({ length: Math.ceil(width / spacing) + 3 }, () => random() * 2 - 1);
      return x => {
        const cell = x / spacing;
        const index = Math.floor(cell);
        const fraction = cell - index;
        const smooth = fraction * fraction * (3 - 2 * fraction);
        return samples[index] * (1 - smooth) + samples[index + 1] * smooth;
      };
    }
    const broad = noise(280), medium = noise(62), fine = noise(8), grains = noise(2);
    const mound = (x, center, spread, depth) => Math.exp(-(((x - center) / spread) ** 2)) * depth;
    const surface = x => {
      const depth = 22 + mound(x, 105, 150, 8) + mound(x, 590, 180, 6)
        + mound(x, 1170, 245, 14) + mound(x, 1790, 210, 10)
        + broad(x) * 4.1 + medium(x) * 1.5 + fine(x) * .55 + grains(x) * .16;
      return height - Math.min(47, Math.max(18, depth));
    };
    const outline = new Path2D();
    outline.moveTo(0, height);
    for (let x = 0; x <= width; x += 2) outline.lineTo(x, surface(x));
    outline.lineTo(width, height); outline.closePath();
    ctx.clearRect(0, 0, width, height);
    // El halo apenas separa los pequeños cristales del fondo nocturno.
    ctx.shadowColor = '#bbd3e52e'; ctx.shadowBlur = 7; ctx.shadowOffsetY = -1;
    const body = ctx.createLinearGradient(0, 58, 0, height);
    body.addColorStop(0, '#ffffff'); body.addColorStop(.42, '#f7fafc');
    body.addColorStop(.8, '#e8f0f5'); body.addColorStop(1, '#d9e5ed');
    ctx.fillStyle = body; ctx.fill(outline);
    ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.save(); ctx.clip(outline);

    // Bolsas de sombra muy difusas: no hay una segunda franja de color plano.
    for (let i = 0; i < 34; i++) {
      const x = random() * width;
      const y = surface(x) + 13 + random() * 22;
      const radius = 24 + random() * 70;
      ctx.save(); ctx.translate(x, y); ctx.scale(1, .15 + random() * .1);
      const shade = ctx.createRadialGradient(0, 0, 0, 0, 0, radius);
      shade.addColorStop(0, '#7c9bb61a'); shade.addColorStop(1, '#7c9bb600');
      ctx.fillStyle = shade; ctx.fillRect(-radius, -radius, radius * 2, radius * 2);
      ctx.restore();
    }
    // Pequeños pliegues del polvo asentado, orientados por el viento.
    for (let i = 0; i < 46; i++) {
      const x = random() * width;
      const length = 20 + random() * 130;
      const y = surface(x) + 5 + random() * 24;
      ctx.beginPath(); ctx.moveTo(x - length * .5, y + 1.1);
      ctx.quadraticCurveTo(x, y - 2.4, x + length * .5, y);
      ctx.strokeStyle = '#93aab713'; ctx.lineWidth = .7; ctx.stroke();
      ctx.translate(0, -.8); ctx.strokeStyle = '#ffffff50'; ctx.stroke(); ctx.translate(0, .8);
    }
    // Grano fino y poros claros/oscuros, sin brillo de confeti ni parpadeo.
    for (let i = 0; i < 7400; i++) {
      const x = random() * width;
      const top = surface(x);
      const y = top + random() * (height - top);
      const bright = random() > .48;
      ctx.fillStyle = bright ? '#ffffff' : '#718c9f';
      ctx.globalAlpha = bright ? .13 + random() * .25 : .025 + random() * .06;
      ctx.beginPath();
      ctx.ellipse(x, y, .18 + random() * .6, .13 + random() * .28, -.35, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.restore();
    // La silueta se deshace en cristales diminutos, sin festones redondos.
    for (let i = 0; i < 1100; i++) {
      const x = random() * width;
      const y = surface(x) + random() * 1.5 - .55;
      ctx.globalAlpha = .12 + random() * .38;
      ctx.fillStyle = '#f5faff';
      ctx.fillRect(x, y, .3 + random() * .9, .3 + random() * .55);
    }
    ctx.globalAlpha = 1;
  }
  function renderCorners(canvas) {
    render(canvas);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    const outline = new Path2D();
    function corner(span, depth, exponent, right) {
      const edge = right ? width : 0;
      outline.moveTo(edge, height);
      for (let distance = 0; distance <= span; distance += 2) {
        const taper = (1 - distance / span) ** exponent;
        const grains = Math.sin(distance * .047) * .78
          + Math.sin(distance * .119) * .32 + Math.sin(distance * .61) * .14;
        const x = right ? width - distance : distance;
        outline.lineTo(x, height - (depth + grains) * taper);
      }
      outline.lineTo(right ? width - span : span, height);
      outline.closePath();
    }
    corner(240, 25.7, 1.45, false);
    corner(246, 22.2, 1.6, true);
    // El grano original queda solo en dos montoncitos, que se disuelven hacia dentro.
    const fade = ctx.createLinearGradient(0, 0, width, 0);
    fade.addColorStop(0, '#fff');
    fade.addColorStop(170 / width, '#fff');
    fade.addColorStop(240 / width, '#fff0');
    fade.addColorStop((width - 246) / width, '#fff0');
    fade.addColorStop((width - 178) / width, '#fff');
    fade.addColorStop(1, '#fff');
    ctx.save();
    ctx.globalCompositeOperation = 'destination-in';
    ctx.fillStyle = fade;
    ctx.fill(outline);
    ctx.restore();
  }
  window.NavidadSnowbank = Object.freeze({ render, renderCorners });
})();
