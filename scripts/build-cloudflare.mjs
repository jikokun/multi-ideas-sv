// Lista cerrada: cada nueva dependencia pública debe añadirse y revisarse aquí.
// No se recorre ni se copia la raíz del repositorio.
import { copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

// Incluye la configuración pública del SDK y las dependencias del sitio general.
export const PUBLIC_FILES = Object.freeze(
[
  "terminos.css",
  "terminos-y-condiciones.html",
  "terminos-sensunshop.html",
  "terminos-fidelix.html",
  "terminos-green-play.html",
  "businesses_only.json",
  "componentes_A1.css",
  "contacto.html",
  "estilo_claro.css",
  "estilo_claro_multi.css",
  "estilos.css",
  "firebase-config.js",
  "imagenes/historias/historia_afiches.png",
  "imagenes/historias/historia_android.png",
  "imagenes/historias/historia_diseno.png",
  "imagenes/historias/historia_fotos_magneticas.png",
  "imagenes/historias/historia_impresiones.png",
  "imagenes/historias/historia_menus.png",
  "imagenes/historias/historia_recetarios.png",
  "imagenes/historias/historia_recuerdos.png",
  "imagenes/historias/historia_sobres.png",
  "imagenes/historias/historia_stickers.png",
  "imagenes/historias/historia_tarjetas.png",
  "imagenes/historias/historia_web.png",
  "imagenes/iconos_generales/multiideassv_ico.webp",
  "imagenes/iconos_redes/facebook_ico.png",
  "imagenes/iconos_redes/gmail_ico.svg",
  "imagenes/iconos_redes/instagram_ico.png",
  "imagenes/iconos_redes/tiktok_ico.png",
  "imagenes/iconos_redes/whatsapp_ico.png",
  "imagenes/imagenes_generales/imaagen52.webp",
  "imagenes/imagenes_generales/imagen34.webp",
  "imagenes/imagenes_generales/imagen35.webp",
  "imagenes/imagenes_generales/imagen40.webp",
  "imagenes/imagenes_generales/imagen41.webp",
  "imagenes/imagenes_generales/imagen48.webp",
  "imagenes/imagenes_generales/imagen49.webp",
  "imagenes/imagenes_generales/imagen53.webp",
  "imagenes/imagenes_generales/imagen60.webp",
  "imagenes/isai_claros.webp",
  "imagenes/logo.png",
  "imagenes/logos/icono-sensun-shop.webp",
  "imagenes/logos/logo_pnc.png",
  "imagenes/logos/logo_pnc.svg",
  "imagenes/logos/logosintexto.webp",
  "imagenes/logos/multiideassv.webp",
  "imagenes/logos/multiideassv_logo.webp",
  "imagenes/logos/sensunshop_ico.webp",
  "imagenes/logos/seunsunshop_1.webp",
  "imagenes/showcase/hero_android.png",
  "imagenes/showcase/hero_bots.png",
  "imagenes/showcase/hero_design.png",
  "imagenes/showcase/hero_web.png",
  "imagenes/showcase/reel_menus.png",
  "imagenes/showcase/reel_stickers.png",
  "imagenes/showcase/reel_tarjetas.png",
  "index.html",
  "kickzone.html",
  "laboratorio/appventas/appventas.html",
  "laboratorio/appventas/estilos_appventas.css",
  "laboratorio/appventas/script_appventas.js",
  "laboratorio/centro_notificaciones.html",
  "laboratorio/galeria_botones.html",
  "laboratorio/galeria_ventanas.html",
  "laboratorio/one_chicago.html",
  "laboratorio/prueba_google_auth_btn.html",
  "laboratorio/prueba_whatsapp_avioncito.html",
  "menu.html",
  "mini_widgets/alertas_electrica.html",
  "mini_widgets/alertas_jikokun.html",
  "mini_widgets/alertas_kick_estrellas.html",
  "mini_widgets/alertas_kiphu.html",
  "mini_widgets/alertas_rufus.html",
  "mini_widgets/alertas_samurai.html",
  "mini_widgets/css/style.css",
  "mini_widgets/index.html",
  "mini_widgets/js/script.js",
  "mini_widgets/marcocamara1.html",
  "mini_widgets/mis_widgets.html",
  "mini_widgets/recursos/iconos/discordia_ico.png",
  "mini_widgets/recursos/iconos/facebook_ico.png",
  "mini_widgets/recursos/iconos/instagram_ico.png",
  "mini_widgets/recursos/iconos/kick_ico.webp",
  "mini_widgets/recursos/iconos/spotify_ico.png",
  "mini_widgets/recursos/iconos/telegram_ico.png",
  "mini_widgets/recursos/iconos/tiktok_ico.png",
  "mini_widgets/recursos/iconos/twitch_ico.png",
  "mini_widgets/recursos/iconos/x_ico.svg",
  "mini_widgets/recursos/iconos/youtube_ico.png",
  "mini_widgets/widget_alertas.html",
  "mini_widgets/widget_chat_kick_live.html",
  "mini_widgets/widget_chat_live.html",
  "mini_widgets/widget_clima_moderno.html",
  "mini_widgets/widget_clima_reloj.html",
  "mini_widgets/widget_contador_cuenta_atras.html",
  "mini_widgets/widget_kick_counter.html",
  "mini_widgets/widget_metas.html",
  "mini_widgets/widget_publicidad.html",
  "mini_widgets/widget_redes_sociales.html",
  "mini_widgets/widget_reloj_digital.html",
  "mini_widgets/widget_sponsor.html",
  "mini_widgets/widget_temporizador.html",
  "nosotros.html",
  "one_chicago.html",
  "partials/auth-modal.html",
  "partials/profile-modal.html",
  "politicasprivacidadfidelix.html",
  "productos.html",
  "proyectos.html",
  "robots.txt",
  "script.js",
  "sensunshop.html",
  "sensunshop/admin.html",
  "sensunshop/admin/index.html",
  "sensunshop/emergencias.html",
  "sensunshop/emprendedores.html",
  "sensunshop/emprendedores/sensun_catalog_modal.js",
  "sensunshop/index.html",
  "sensunshop/mapa.html",
  "sensunshop/menu-sensunshop.html",
  "sensunshop/negocioslocales.html",
  "sensunshop/negocioslocales/disenografico-patrick.html",
  "sensunshop/ofertas.html",
  "sensunshop/oficios.html",
  "sensunshop/politicasprivsensunshop.html",
  "sensunshop/profesionales.html",
  "sensunshop/profesionales/drhenrymartinez.html",
  "sensunshop/sensun_catalog_modal.js",
  "sensunshop/sensun_directory.css",
  "sensunshop/sensun_directory.js",
  "sensunshop/sensun_offer_popups.js",
  "sensunshop/sensun_ratings.js",
  "servicios.html",
  "sitemap.xml",
  "tokens_A1.css",
  "tutoriales.html",
  "wolftrack-firebase-config.js",
  "wolftrack.html",
  "wolftrack_service.js"
]
);

export function assetUrl(file) {
  return '/' + file.split('/').map(encodeURIComponent).join('/');
}

// Sólo reglas exactas. No redirigir HTML evita alterar Redirect URIs de OAuth
// o URLs parametrizadas de fuentes de navegador en OBS.
export function cleanRoutes() {
  const routes = new Map();
  const redirects = new Map();
  for (const file of PUBLIC_FILES.filter(file => file.endsWith('.html'))) {
    if (!file.endsWith('/index.html') && file !== 'index.html') {
      routes.set(assetUrl(file.slice(0, -5)), assetUrl(file));
    }
  }
  for (const file of PUBLIC_FILES.filter(file => file === 'index.html' || file.endsWith('/index.html'))) {
    const directory = file.slice(0, -'index.html'.length);
    const url = assetUrl(directory);
    routes.set(url, assetUrl(file));
    // /sensunshop y /sensunshop/admin tienen su .html: conservar ambas versiones.
    // Las carpetas sin .html hermano necesitan la barra para recursos relativos.
    if (directory && !routes.has(url.slice(0, -1))) {
      redirects.set(url.slice(0, -1), url);
    }
  }
  return { routes, redirects };
}

function validatePath(file) {
  const allowedExtension = /\.(?:html|css|js|json|png|webp|svg|webm)$/;
  if (file.includes('\\') || file.split('/').some(part => !part || part === '..' || part.startsWith('.')) ||
      /(?:^|\/)(?:functions|node_modules|tests|Documentacion|google_apps_script)(?:\/|$)/i.test(file) ||
      /(?:backup|respaldo|credential|service.?account|package-lock|database\.rules|\.bak|\.pdf|\.env)/i.test(file) ||
      (!allowedExtension.test(file) && !['robots.txt', 'sitemap.xml'].includes(file))) {
    throw new Error('Ruta no publicable: ' + file);
  }
}

export function checkSecrets(file, contents) {
  // No imprimir valores: los errores identifican únicamente el archivo.
  if (/-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/.test(contents) ||
      /"type"\s*:\s*"service_account"/.test(contents) ||
      /["']private_key["']\s*:/.test(contents) ||
      /(?:client_secret|refresh_token|access_token|password)\s*["']?\s*[:=]\s*["'][^"'\s]{8,}["']/i.test(contents) ||
      /\b(?:github_pat_[A-Za-z0-9_]{20,}|gh[pousr]_[A-Za-z0-9]{20,}|AKIA[A-Z0-9]{16})\b/.test(contents)) {
    throw new Error('Posible credencial privada en: ' + file);
  }
}

export async function buildCloudflare() {
  const root = await realpath(PROJECT_ROOT);
  const dist = path.resolve(root, 'dist');
  // El único destino que se puede limpiar es <repositorio>/dist.
  if (path.dirname(dist) !== root || path.basename(dist) !== 'dist') {
    throw new Error('Destino dist fuera del repositorio');
  }
  try {
    const entry = await lstat(dist);
    if (!entry.isDirectory() || entry.isSymbolicLink() || await realpath(dist) !== dist) {
      throw new Error('dist debe ser un directorio real dentro del repositorio');
    }
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
  if (!PUBLIC_FILES.includes('index.html') || new Set(PUBLIC_FILES).size !== PUBLIC_FILES.length) {
    throw new Error('La lista pública requiere index.html y rutas únicas');
  }

  // Validar todo antes de limpiar dist; rechazar enlaces que salgan de su ruta.
  let bytes = 0;
  for (const file of PUBLIC_FILES) {
    validatePath(file);
    const source = path.resolve(root, ...file.split('/'));
    if (await realpath(source) !== source) throw new Error('Enlace no permitido: ' + file);
    const stat = await lstat(source);
    if (!stat.isFile() || stat.size > MAX_ASSET_BYTES) {
      throw new Error('Asset inválido o mayor de 25 MiB: ' + file);
    }
    if (/\.(?:html|css|js|json|txt|xml|svg)$/.test(file)) {
      checkSecrets(file, await readFile(source, 'utf8'));
    }
    bytes += stat.size;
  }

  await rm(dist, { recursive: true, force: true });
  await mkdir(dist);
  for (const file of PUBLIC_FILES) {
    const destination = path.join(dist, ...file.split('/'));
    await mkdir(path.dirname(destination), { recursive: true });
    await copyFile(path.join(root, ...file.split('/')), destination);
  }

  const { routes, redirects } = cleanRoutes();
  const rules = [
    '# Generado por scripts/build-cloudflare.mjs. No editar.',
    '# Los HTML originales, callbacks OAuth y widgets se sirven sin redirecciones.',
    ...[...routes].map(([from, to]) => from + ' ' + to + ' 200'),
    ...[...redirects].map(([from, to]) => from + ' ' + to + ' 301'),
    ''
  ];
  await writeFile(path.join(dist, '_redirects'), rules.join('\n'));
  await writeFile(path.join(dist, '404.html'), '<!doctype html>\n<html lang="es"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>404 · Multi Ideas SV</title><h1>Página no encontrada</h1><p><a href="/">Volver al inicio</a></p></html>\n');
  console.log('Cloudflare: ' + PUBLIC_FILES.length + ' archivos públicos (' +
    (bytes / 1024 / 1024).toFixed(2) + ' MiB), _redirects y 404.html en dist/');
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await buildCloudflare();
}
