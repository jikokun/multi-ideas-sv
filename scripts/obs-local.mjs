import { createHash } from 'node:crypto';
import { createReadStream } from 'node:fs';
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { PROJECT_ROOT, PUBLIC_FILES } from './build-cloudflare.mjs';

const port = Number(process.env.JIKO_OBS_PORT || 8765);
const cacheDir = path.join(PROJECT_ROOT, '.obs-local');
const cachePrefix = '/__obs/cache/';
const cardsDir = 'imagenes/Tarjetas_jikokun';
const collectionDir = cardsDir + '/Coleccion_Jikokun_001-100';
const shopDir = 'imagenes/tiendita_jiko';
const driveShopDir = 'imagenes/Tiendita_Jiko (tiendita@multi-ideas-sv)';
const overlayFiles = [
    'modochat.html', 'laboratorio/casino.html', 'laboratorio/ruleta.html', 'laboratorio/tragamonedas.html',
    'laboratorio/escena_inicial_integrada.html', 'laboratorio/modochat_integrado.html',
    'laboratorio/modomimir_integrado.html', 'laboratorio/tarjetero.html', 'laboratorio/widget_celebracion_subs.html',
    'mini_widgets/tiendita.html', 'mini_widgets/catalogo_tienda.html',
    'mini_widgets/estadisticas_tienda.html', 'mini_widgets/widget_perfil.html',
    'mini_widgets/casino.html', 'mini_widgets/ruleta.html', 'mini_widgets/tragamonedas.html',
    'mini_widgets/jikobank.html', 'mini_widgets/widget_spotify.html',
    'laboratorio/spotify_isla_widget.html',
    'overley_navideños/escena_inicial_integrada.html', 'overley_navideños/modochat_integrado.html',
    'overley_navideños/modomimir_integrado.html', 'overley_navideños/modojuego_integrado.html'
];
const shopFiles = {
    chocopack: 'Bowl de chocolates envueltos variados.png',
    choripan: '1792290195698.png',
    panmataninos: 'a_high_resolution_cutout_product_photo_on_a_transp.png',
    pastedechocolate: '1793322932566-Photoroom.png',
    pastelcumpleanosmix: '1793321291036.png',
    pizza: 'Gemini_Generated_Image_9nt4jx9nt4jx9nt4-removebg-preview.png',
    porcionpastelchocolate: '1793322915821-Photoroom.png',
    ramen: 'Ramen con fideos y palillos de madera.png',
    sal: 'Paquete de sal LEDA realista y brillante.png',
    sixpackcerveza: '1000333885.png'
};
const backs = {
    common: 'Reverso comun Jikokun con emblema husky-1.png',
    special: 'Reverso especial con brillo iridiscente-3.png',
    rare: 'Reverso raro de Jikokun amatista-2.png',
    epic: 'Reversoépica en carmesí y cobre-2.png',
    legendary: 'Reverso legendaria_ husky de obsidiana y oro-4.png',
    mythic: 'Reverso Jikokun ultra raro de platino-1.png'
};
const mime = {
    '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8', '.json': 'application/json',
    '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
    '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif',
    '.webm': 'video/webm', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg',
    '.woff2': 'font/woff2', '.woff': 'font/woff', '.ico': 'image/x-icon'
};
const publicFiles = new Set(PUBLIC_FILES);
const textPath = file => /\.(html|css|js)$/.test(file);
const fileURL = file => '/' + file.split('/').map(encodeURIComponent).join('/');
const hash = value => createHash('sha256').update(value).digest('hex');
const fullPath = file => path.join(PROJECT_ROOT, file);
const isFile = file => stat(fullPath(file)).then(info => info.isFile()).catch(() => false);

async function loadArtwork() {
    const files = new Set();
    const artwork = { shop: {}, cards: {}, backs: {}, pack: {} };
    async function register(group, key, file) {
        if (!await isFile(file)) return;
        files.add(file);
        artwork[group][key] = fileURL(file);
    }
    for (const file of await readdir(fullPath(shopDir))) {
        if (/^[a-z0-9]+\.png$/.test(file)) await register('shop', path.parse(file).name, shopDir + '/' + file);
    }
    for (const [key, file] of Object.entries(shopFiles)) await register('shop', key, driveShopDir + '/' + file);
    for (const file of await readdir(fullPath(collectionDir)).catch(() => [])) {
        const number = file.match(/^(\d{3})-.*\.png$/i)?.[1];
        if (number) await register('cards', Number(number), collectionDir + '/' + file);
    }
    for (const [rarity, file] of Object.entries(backs)) await register('backs', rarity, cardsDir + '/Reverso_cartas/' + file);
    await register('pack', 'front', cardsDir + '/Sobres_cartas/Sobre_cartas_frontal.png');
    await register('pack', 'back', cardsDir + '/Sobres_cartas/Sobre_cartas_trasera.png');
    if (artwork.pack.front) artwork.shop.sobre = artwork.pack.front;
    return { artwork, files };
}

function isCacheable(value) {
    const url = new URL(value);
    if (url.hostname === 'www.gstatic.com') return /^\/firebasejs\/10\.8\.0\/.*\.js$/.test(url.pathname);
    if (url.hostname === 'res.cloudinary.com') return /\/(image|video|raw)\/upload\//.test(url.pathname);
    if (url.hostname === 'images.unsplash.com') return url.pathname.startsWith('/photo-');
    return ['fonts.googleapis.com', 'fonts.gstatic.com', 'cdnjs.cloudflare.com', 'cdn.jsdelivr.net',
        'assets.codepen.io', 'code.jquery.com', 'cdn.tailwindcss.com', 'unpkg.com'].includes(url.hostname);
}

const remoteUrls = /https:\/\/[a-z0-9.-]+\/[^\s"'<>\x60\\)\x24{}]+/gi;
function replaceRemote(source, replace) {
    return source.replace(remoteUrls, original => {
        const value = original.replace(/&amp;/g, '&');
        return isCacheable(value) ? replace(value, original) : original;
    });
}

async function readCache() {
    try {
        return JSON.parse(await readFile(path.join(cacheDir, 'index.json'), 'utf8'));
    } catch (error) {
        if (error.code !== 'ENOENT') throw error;
        return {};
    }
}

async function prepare() {
    await mkdir(cacheDir, { recursive: true });
    const cache = await readCache();
    const visited = new Set();
    const assets = new Set();
    async function scan(file) {
        if (!publicFiles.has(file) || visited.has(file)) return;
        visited.add(file);
        const source = await readFile(fullPath(file), 'utf8');
        replaceRemote(source, value => { assets.add(value); return value; });
        const dependencies = [...source.matchAll(/(?:src|href)\s*=\s*["']([^"']+\.(?:css|js)(?:\?[^"']*)?)["']|(?:from\s*|import\s*\(?\s*)["']([^"']+\.js(?:\?[^"']*)?)["']/gi)];
        for (const match of dependencies) {
            const relative = match[1] || match[2];
            if (/^(?:[a-z]+:|\/\/)/i.test(relative)) continue;
            const url = new URL(relative, 'http://127.0.0.1' + fileURL(file));
            await scan(decodeURIComponent(url.pathname.slice(1)));
        }
    }
    for (const file of overlayFiles) await scan(file);
    const pending = [...assets];
    const checked = new Set();
    let downloaded = 0;
    const failures = [];
    while (pending.length) {
        const batch = pending.splice(0, 6).filter(url => !checked.has(url) && checked.add(url));
        await Promise.all(batch.map(async url => {
            const key = hash(url);
            const destination = path.join(cacheDir, key);
            try {
                let content;
                if (cache[url]?.type && await stat(destination).then(info => info.isFile()).catch(() => false)) {
                    if (isTextType(cache[url].type)) content = await readFile(destination);
                } else {
                    const response = await fetch(url, { signal: AbortSignal.timeout(30000), headers: {
                        'User-Agent': 'Mozilla/5.0 Chrome/135.0.0.0 Safari/537.36'
                    } });
                    if (!response.ok) throw new Error('HTTP ' + response.status);
                    const type = response.headers.get('content-type')?.split(';')[0] || mime[path.extname(new URL(url).pathname)] || 'application/octet-stream';
                    if (type === 'text/html') throw new Error('La URL devolvió una página HTML');
                    content = Buffer.from(await response.arrayBuffer());
                    await writeFile(destination, content);
                    cache[url] = { type, key };
                    downloaded++;
                }
                if (content && isTextType(cache[url].type)) {
                    replaceRemote(resolveRelativeAssets(content.toString('utf8'), cache[url].type, url),
                        value => { pending.push(value); return value; });
                }
            } catch (error) {
                failures.push(url + ' (' + error.message + ')');
            }
        }));
    }
    await writeFile(path.join(cacheDir, 'index.json'), JSON.stringify(cache, null, 2) + '\n');
    console.log(`OBS: ${downloaded} recursos descargados, ${Object.keys(cache).length} en disco.`);
    if (failures.length) {
        console.warn('Recursos que requieren revisión:\n' + failures.join('\n'));
        process.exitCode = 1;
    }
}

function isTextType(type) {
    return /(?:javascript|text\/css)/i.test(type);
}

function resolveRelativeAssets(source, type, origin) {
    if (type === 'text/css') {
        return source.replace(/url\(\s*(["']?)((?:\.{1,2}\/|\/)[^"'()\s]+)\1\s*\)/g,
            (match, quote, relative) => `url(${quote}${new URL(relative, origin).href}${quote})`);
    }
    if (isTextType(type)) {
        return source.replace(/((?:\bfrom\s*|\bimport\s*\(?\s*)["'])((?:\.{1,2}\/)[^"'\s]+)(["'])/g,
            (match, start, relative, end) => start + new URL(relative, origin).href + end);
    }
    return source;
}

async function sendFile(request, response, file, type) {
    const info = await stat(file);
    const headers = { 'Content-Type': type, 'Content-Length': info.size, 'Accept-Ranges': 'bytes' };
    const range = request.headers.range?.match(/^bytes=(\d*)-(\d*)$/);
    let start = 0;
    let end = info.size - 1;
    let code = 200;
    if (range && (range[1] || range[2])) {
        start = range[1] ? Number(range[1]) : Math.max(0, info.size - Number(range[2]));
        if (range[1] && range[2]) end = Math.min(end, Number(range[2]));
        if (start > end || start >= info.size) {
            response.writeHead(416, { 'Content-Range': 'bytes */' + info.size }).end();
            return;
        }
        code = 206;
        headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        headers['Content-Length'] = end - start + 1;
    }
    response.writeHead(code, headers);
    if (request.method === 'HEAD' || info.size === 0) response.end();
    else createReadStream(file, { start, end }).on('error', () => response.destroy()).pipe(response);
}

export async function startObsServer(listenPort = port) {
    const { artwork, files } = await loadArtwork();
    const cache = await readCache();
    const cachedFiles = new Map(Object.entries(cache).map(([url, item]) => [item.key, { ...item, url }]));
    const rewrite = source => replaceRemote(source, (url, original) => cache[url] ? cachePrefix + cache[url].key : original);
    function sendText(request, response, type, body) {
        response.writeHead(200, { 'Content-Type': type, 'Content-Length': Buffer.byteLength(body), 'Cache-Control': 'no-store' });
        response.end(request.method === 'HEAD' ? undefined : body);
    }
    const server = createServer(async (request, response) => {
        response.setHeader('X-Content-Type-Options', 'nosniff');
        if (!/^((127\.0\.0\.1)|localhost)(:\d+)?$/.test(request.headers.host || '')) {
            response.writeHead(403).end();
            return;
        }
        if (request.method !== 'GET' && request.method !== 'HEAD') {
            response.writeHead(405, { Allow: 'GET, HEAD' }).end();
            return;
        }
        try {
            const url = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
            if (url === '/') {
                const links = overlayFiles.map(file => {
                    const option = file === 'mini_widgets/tiendita.html' || file === 'mini_widgets/casino.html' ? '?overlay=true' :
                        file === 'laboratorio/tarjetero.html' ? '?obs=true' : '';
                    return `<li><a href="${fileURL(file)}${option}">${file}</a></li>`;
                }).join('');
                sendText(request, response, mime['.html'], '<!doctype html><html lang="es"><meta charset="utf-8"><title>Fuentes OBS locales</title><h1>Fuentes OBS locales</h1><ul>' + links + '</ul>');
                return;
            }
            if (url === '/__obs/artwork.js') {
                sendText(request, response, mime['.js'], 'window.JikoObsArtwork = ' + JSON.stringify(artwork) + ';');
                return;
            }
            if (url.startsWith(cachePrefix)) {
                const key = url.slice(cachePrefix.length);
                const info = cachedFiles.get(key);
                if (!info || !/^[a-f0-9]{64}$/.test(key)) { response.writeHead(404).end(); return; }
                const file = path.join(cacheDir, key);
                if (isTextType(info.type)) {
                    const content = resolveRelativeAssets(await readFile(file, 'utf8'), info.type, info.url);
                    sendText(request, response, info.type, rewrite(content));
                }
                else await sendFile(request, response, file, info.type);
                return;
            }
            const file = url.slice(1);
            if (!publicFiles.has(file) && !files.has(file)) { response.writeHead(404).end(); return; }
            const type = mime[path.extname(file)] || 'application/octet-stream';
            if (textPath(file)) {
                let content = rewrite(await readFile(fullPath(file), 'utf8'));
                if (file.endsWith('.html')) {
                    content = content.replace(/<link\s+rel=["']preconnect["']\s+href=["']https:\/\/fonts\.(?:googleapis|gstatic)\.com["'][^>]*>/gi, '');
                    content = content.replace(/<head(?:\s[^>]*)?>/i, '$&<script src="/__obs/artwork.js"></script>');
                }
                sendText(request, response, type, content);
            } else await sendFile(request, response, fullPath(file), type);
        } catch (error) {
            if (!response.headersSent) response.writeHead(error.code === 'ENOENT' ? 404 : 400);
            response.end();
        }
    });
    await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(listenPort, '127.0.0.1', resolve);
    });
    return { server, artwork, cached: cachedFiles.size };
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
    if (process.argv.includes('--prepare')) await prepare();
    else {
        const { server, artwork, cached } = await startObsServer();
        console.log(`OBS: http://127.0.0.1:${server.address().port}/ (${Object.keys(artwork.cards).length} cartas, ${Object.keys(artwork.shop).length} imágenes de tienda y ${cached} recursos en caché).`);
    }
}
