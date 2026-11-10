import assert from 'node:assert/strict';
import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { PUBLIC_FILES, PROJECT_ROOT, MAX_ASSET_BYTES, assetUrl, buildCloudflare, checkSecrets, cleanRoutes } from '../build-cloudflare.mjs';

process.env.WRANGLER_SEND_METRICS = 'false';

async function inventory(directory, prefix = '') {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const relative = prefix + entry.name;
    if (entry.isDirectory()) files.push(...await inventory(path.join(directory, entry.name), relative + '/'));
    else files.push(relative);
  }
  return files.sort();
}

test('paquete público y rutas en el runtime local de Cloudflare', { timeout: 120_000 }, async t => {
  const dist = path.join(PROJECT_ROOT, 'dist');
  await buildCloudflare();

  await t.test('reconstruir elimina archivos obsoletos y conserva los originales byte por byte', async () => {
    await writeFile(path.join(dist, 'archivo-interno-obsoleto.bak'), 'No publicar');
    await buildCloudflare();
    assert.deepEqual(await inventory(dist), [...PUBLIC_FILES, '_redirects', '404.html'].sort());
    for (const file of PUBLIC_FILES) {
      assert.deepEqual(await readFile(path.join(dist, file)), await readFile(path.join(PROJECT_ROOT, file)), file);
      assert.ok((await stat(path.join(dist, file))).size <= MAX_ASSET_BYTES, file);
    }
  });

  await t.test('no se empaquetan documentos internos, credenciales ni código de servidor', () => {
    assert.ok(PUBLIC_FILES.includes('index.html'));
    for (const file of PUBLIC_FILES) {
      assert.doesNotMatch(file, /(?:^|\/)(?:functions|google_apps_script|Documentacion|node_modules|tests|\.git|\.firebase)(?:\/|$)/i);
      assert.doesNotMatch(file, /\.pdf$|\.bak|\.md$|\.env|service.?account|credential|backup|respaldo|CNAME|firebase\.json|database\.rules/i);
    }
    assert.throws(() => checkSecrets('fixture.json', JSON.stringify({ type: 'service_account' })));
    assert.throws(() => checkSecrets('fixture.js', 'const CLIENT_SECRET = "example-private-value";'));
    assert.throws(() => checkSecrets('fixture.pem', '-----BEGIN PRIVATE KEY-----'));
    assert.doesNotThrow(() => checkSecrets('web.js', 'const firebaseConfig = { apiKey: "public-browser-key" };'));
  });

  const config = JSON.parse(await readFile(path.join(PROJECT_ROOT, 'wrangler.jsonc'), 'utf8'));
  assert.equal(config.name, 'multi-ideas-sv');
  assert.equal(config.compatibility_date, '2026-11-10');
  assert.deepEqual(config.assets, { directory: './dist', html_handling: 'none', not_found_handling: '404-page' });
  assert.equal(config.main, undefined);
  assert.equal(config.routes, undefined);

  const { unstable_dev } = await import('wrangler');
  const server = await unstable_dev(undefined, {
    config: path.join(PROJECT_ROOT, 'wrangler.jsonc'),
    local: true, port: 0, inspectorPort: 0, persist: false, logLevel: 'error',
    experimental: { disableExperimentalWarning: true, disableDevRegistry: true }
  });
  t.after(() => server.stop());
  const base = 'http://127.0.0.1:' + server.port;
  async function expectAsset(url, file) {
    const response = await fetch(base + url, { redirect: 'manual' });
    assert.equal(response.status, 200, url);
    assert.equal(response.headers.get('location'), null, url);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), await readFile(path.join(dist, file)), url);
    return response;
  }

  await t.test('todos los archivos públicos se sirven sin redirección', async () => {
    for (const file of PUBLIC_FILES) await expectAsset(assetUrl(file), file);
  });

  await t.test('las rutas limpias sirven el HTML correcto y las carpetas resuelven recursos relativos', async () => {
    const { routes, redirects } = cleanRoutes();
    for (const [from, to] of routes) await expectAsset(from + '?prueba=1', decodeURIComponent(to.slice(1)));
    for (const [from, to] of redirects) {
      const response = await fetch(base + from + '?prueba=1', { redirect: 'manual' });
      assert.equal(response.status, 301, from);
      assert.equal(new URL(response.headers.get('location'), base).pathname, to, from);
      assert.equal(new URL(response.headers.get('location'), base).search, '?prueba=1', from);
    }
    assert.equal(routes.has('/admin'), false);
    assert.equal(routes.get('/sensunshop'), '/sensunshop.html');
  });

  await t.test('OAuth y fuentes OBS con parámetros conservan su URL y su contenido', async () => {
    for (const file of ['callback.html', 'callback/index.html', 'laboratorio/spotify_callback.html',
      'mini_widgets/widget_spotify.html', 'mini_widgets/widget_perfil.html',
      'laboratorio/spotify_isla_widget.html', 'laboratorio/widget spotify mio.html']) {
      await expectAsset(assetUrl(file) + '?code=prueba%2B123&state=estado%2Fobs&user=jikokun2', file);
    }
  });

  await t.test('URLs inexistentes y archivos excluidos devuelven 404, sin fallback a la portada', async () => {
    for (const url of ['/ruta-inexistente', '/ruta-inexistente.html', '/.env', '/.git/config', '/CNAME',
      '/admin', '/admin/', '/admin.html', '/admin/index.html',
      '/firebase.json', '/database.rules.json', '/backup_users_culion_aguita.json', '/index.html.bak',
      '/functions/index.js', '/Documentacion/README.md', '/scripts/build-cloudflare.mjs',
      '/mini_widgets/recursos/Manual_A1_Unico_Interfaces_y_Rendimiento.pdf']) {
      const response = await fetch(base + url, { redirect: 'manual' });
      assert.equal(response.status, 404, url);
      assert.equal(response.headers.get('location'), null, url);
      assert.match(await response.text(), /Página no encontrada/, url);
    }
  });
});
