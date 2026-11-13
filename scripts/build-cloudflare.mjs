// Lista cerrada: cada nueva dependencia pública debe añadirse y revisarse aquí.
// No se recorre ni se copia la raíz del repositorio.
import { copyFile, lstat, mkdir, readFile, realpath, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const PROJECT_ROOT = fileURLToPath(new URL('../', import.meta.url));
export const MAX_ASSET_BYTES = 25 * 1024 * 1024;

// Incluye la configuración del SDK web de Firebase (pública), no credenciales
// de servidor. Los dos JSON raíz son dependencias de pantallas existentes:
// seeder_firebase.html y estadisticas_tienda.html (datos de muestra).
export const PUBLIC_FILES = Object.freeze(
[
  "terminos.css",
  "terminos-y-condiciones.html",
  "terminos-sensunshop.html",
  "terminos-fidelix.html",
  "terminos-green-play.html",
  "businesses_only.json",
  "callback.html",
  "callback/index.html",
  "componentes_A1.css",
  "contacto.html",
  "data/tarjetas_coleccion_001_100.json",
  "data/tarjetas_coleccion_00_33.js",
  "data/tarjetas_coleccion_00_33.json",
  "data/tarjetas_default_data.js",
  "data/tiendita_items_catalog.json",
  "data/tiendita_items_snippet.js",
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
  "imagenes/tiendita_jiko/aguabotella.png",
  "imagenes/tiendita_jiko/aguacoco.png",
  "imagenes/tiendita_jiko/aguagalon.png",
  "imagenes/tiendita_jiko/anillitos.png",
  "imagenes/tiendita_jiko/arepita.png",
  "imagenes/tiendita_jiko/arrozenleche.png",
  "imagenes/tiendita_jiko/burrito.png",
  "imagenes/tiendita_jiko/cafe.png",
  "imagenes/tiendita_jiko/cafenegro.png",
  "imagenes/tiendita_jiko/capuchino.png",
  "imagenes/tiendita_jiko/capuchinohelado.png",
  "imagenes/tiendita_jiko/cerveza.png",
  "imagenes/tiendita_jiko/chocolatito.png",
  "imagenes/tiendita_jiko/chocopastel.png",
  "imagenes/tiendita_jiko/coca.png",
  "imagenes/tiendita_jiko/empanadamechada.png",
  "imagenes/tiendita_jiko/expreso.png",
  "imagenes/tiendita_jiko/frozen.png",
  "imagenes/tiendita_jiko/galleta.png",
  "imagenes/tiendita_jiko/guarito.png",
  "imagenes/tiendita_jiko/hamburguesa.png",
  "imagenes/tiendita_jiko/helado.png",
  "imagenes/tiendita_jiko/horchata.png",
  "imagenes/tiendita_jiko/hotdog.png",
  "imagenes/tiendita_jiko/juguito.png",
  "imagenes/tiendita_jiko/juguitocaja.png",
  "imagenes/tiendita_jiko/juguitofresa.png",
  "imagenes/tiendita_jiko/limonada.png",
  "imagenes/tiendita_jiko/matcha.png",
  "imagenes/tiendita_jiko/mesero.png",
  "imagenes/tiendita_jiko/pabellon.png",
  "imagenes/tiendita_jiko/papitas.png",
  "imagenes/tiendita_jiko/pastelitos.png",
  "imagenes/tiendita_jiko/pollofrito.png",
  "imagenes/tiendita_jiko/pupusas.png",
  "imagenes/tiendita_jiko/salchipapa.png",
  "imagenes/tiendita_jiko/sopita.png",
  "imagenes/tiendita_jiko/taco.png",
  "imagenes/tiendita_jiko/tamal.png",
  "imagenes/tiendita_jiko/techai.png",
  "imagenes/tiendita_jiko/tequeyoyo.png",
  "imagenes/tiendita_jiko/tesito.png",
  "imagenes/tiendita_jiko/vasoagua.png",
  "imagenes/tiendita_jiko/vinito.png",
  "imagenes/tiendita_jiko/yucafrita.png",
  "index.html",
  "jikokun.html",
  "kickzone.html",
  "laboratorio/admintarjetas.html",
  "laboratorio/appventas/appventas.html",
  "laboratorio/appventas/estilos_appventas.css",
  "laboratorio/appventas/script_appventas.js",
  "laboratorio/casino.html",
  "laboratorio/centro_notificaciones.html",
  "laboratorio/cine_neon.html",
  "laboratorio/escena_inicial.css",
  "laboratorio/escena_inicial.js",
  "laboratorio/escena_inicial_chat.js",
  "laboratorio/escena_inicial_integrada.html",
  "laboratorio/galeria_botones.html",
  "laboratorio/galeria_ventanas.html",
  "laboratorio/index.html",
  "laboratorio/lista_reproductor_spotify.html",
  "laboratorio/modochat.html",
  "laboratorio/modochat_integrado.html",
  "laboratorio/modomimir_integrado.html",
  "laboratorio/one_chicago.html",
  "laboratorio/patrocinio_jikokun.html",
  "laboratorio/prueba_google_auth_btn.html",
  "laboratorio/prueba_whatsapp_avioncito.html",
  "laboratorio/radioshow_integrado.html",
  "laboratorio/ruleta.html",
  "laboratorio/seeder_firebase.html",
  "laboratorio/spotify_callback.html",
  "laboratorio/spotify_isla_widget.html",
  "laboratorio/tarjetero.html",
  "laboratorio/tarjetero_admin_cloud.js",
  "laboratorio/tarjetero_sobres_core.js",
  "laboratorio/tragamonedas.html",
  "laboratorio/widget spotify mio.html",
  "laboratorio/widget_celebracion_subs.html",
  "laboratorio/widget_cumpleanos_integrado.html",
  "menu.html",
  "mini_widgets/alertas_electrica.html",
  "mini_widgets/alertas_jikokun.html",
  "mini_widgets/alertas_kick_estrellas.html",
  "mini_widgets/alertas_kiphu.html",
  "mini_widgets/alertas_rufus.html",
  "mini_widgets/alertas_samurai.html",
  "mini_widgets/casino.html",
  "mini_widgets/catalogo_tienda.html",
  "mini_widgets/css/jiko_casino.css",
  "mini_widgets/css/jiko_tcg_profile.css",
  "mini_widgets/css/style.css",
  "mini_widgets/estadisticas_tienda.html",
  "mini_widgets/index.html",
  "mini_widgets/jikobank.html",
  "mini_widgets/js/jiko_casino.js",
  "mini_widgets/js/jiko_casino_bridge.js",
  "mini_widgets/js/jiko_casino_ui.js",
  "mini_widgets/js/jiko_points_engine.js",
  "mini_widgets/js/jiko_tcg_engine.js",
  "mini_widgets/js/jiko_tcg_firebase.js",
  "mini_widgets/js/jiko_tcg_profile.js",
  "mini_widgets/js/jiko_tcg_service.js",
  "mini_widgets/js/jiko_widget_sync.js",
  "mini_widgets/js/script.js",
  "mini_widgets/js/stream_firebase.js",
  "mini_widgets/js/tienda_categorias.js",
  "mini_widgets/js/tienda_vitrina.js",
  "mini_widgets/la_jikoteca_integrada.html",
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
  "mini_widgets/recursos/skin_wolf_jikokun/aplaudir_u5mb46.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/bailederechoback_f00m0a.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/bailederechofrontal_qjtmsw.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/baileizquierdafrontal_mmghpm.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/baileizquierdoback_rkqn8e.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/bebiendo_dxwffi.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/caminandoderecha_j54s2n.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/caminandoizquierda_w9xsa0.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/comiendo_exdifx.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/enllamas_xgvrbj.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/enmascarado_eqcmcu.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/explotando_hxib2f.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/girando_pekovc.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/morir_i9ljlp.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/sentadoderecha.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/sentadoespalda.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/sentadoizquierda.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/tranquiloderecho_opvgy9.webm",
  "mini_widgets/recursos/skin_wolf_jikokun/tranquiloizquierdo_fziywj.webm",
  "mini_widgets/ruleta.html",
  "mini_widgets/tiendita.html",
  "mini_widgets/tragamonedas.html",
  "mini_widgets/widget_alertas.html",
  "mini_widgets/widget_chat_kick_live.html",
  "mini_widgets/widget_chat_live.html",
  "mini_widgets/widget_clima_moderno.html",
  "mini_widgets/widget_clima_reloj.html",
  "mini_widgets/widget_contador_cuenta_atras.html",
  "mini_widgets/widget_kick_counter.html",
  "mini_widgets/widget_metas.html",
  "mini_widgets/widget_perfil.html",
  "mini_widgets/widget_publicidad.html",
  "mini_widgets/widget_redes_sociales.html",
  "mini_widgets/widget_reloj_digital.html",
  "mini_widgets/widget_sponsor.html",
  "mini_widgets/widget_spotify.html",
  "mini_widgets/widget_temporizador.html",
  "modochat.html",
  "nosotros.html",
  "one_chicago.html",
  "partials/auth-modal.html",
  "partials/profile-modal.html",
  "politicasprivacidadfidelix.html",
  "productos.html",
  "proyectos.html",
  "prueba.html",
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
  "sensunshop/sensun_offer_popups.js",
  "sensunshop/sensun_ratings.js",
  "servicios.html",
  "sitemap.xml",
  "stream_database_seed.json",
  "stream_firebase.js",
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
