import { TcgCloud, initializeTcg } from '../mini_widgets/js/jiko_tcg_firebase.js?v=20261107-delivery4';
const $ = id => document.getElementById(id);
const fields = { duplicateXpPercent: 'tcg-duplicate-xp', userCooldownMs: 'tcg-user-cooldown', globalCooldownMs: 'tcg-global-cooldown', collectionDurationMs: 'tcg-carousel-duration', revealDurationMs: 'tcg-reveal-duration', maxQueue: 'tcg-queue-capacity', maxPacksPerPurchase: 'tcg-max-packs' };
const seconds = new Set(['userCooldownMs', 'globalCooldownMs', 'collectionDurationMs', 'revealDurationMs']);
let dirty = false;
$('tcg-commerce-panel').addEventListener('input', () => { dirty = true; });
const setField = (id, value) => { if (document.activeElement !== $(id)) $(id).value = value; };
try {
    await initializeTcg();
    TcgCloud.subscribe(service => {
        if (!dirty) {
        setField('tcg-product-name', service.product.nombre);
        setField('tcg-product-price', service.product.precio);
        setField('tcg-product-front', service.product.img);
        setField('tcg-product-back', service.product.packBack);
        $('tcg-product-active').checked = service.product.activo !== false;
        $('tcg-admin-pack-image').src = service.product.img;
        for (const [key, id] of Object.entries(fields)) setField(id, service.settings[key] / (seconds.has(key) ? 1000 : 1));
        }
        const jobs = window.JikoTcgEngine.pending(service.control);
        $('tcg-admin-queue').replaceChildren();
        const names = { reserved: 'Confirmando compra', ready: 'En espera', delivering: 'Entrega en la mesa', awaiting_open: 'Esperando apertura', opening: 'Abriendo sobres', showing: 'Mostrando colección' };
        jobs.forEach((job, i) => { const row = document.createElement('p'); row.textContent = `${i + 1}. @${job.user} · ${job.type === 'purchase' ? 'Compra de sobre' : 'Últimas cartas'} · ${names[job.status] || job.status}${job.lastError ? ' · ' + job.lastError.message : ''}`; $('tcg-admin-queue').append(row); });
        if (!jobs.length) $('tcg-admin-queue').textContent = 'Sin solicitudes pendientes.';
    });
    $('tcg-save-commerce').disabled = false;
    $('tcg-publish-catalog').disabled = false;
    $('tcg-admin-status').textContent = 'Conectado a Firebase. Precio, inventarios y cola se guardan en la nube.';
    $('tcg-save-commerce').addEventListener('click', async () => {
        const button = $('tcg-save-commerce'); button.disabled = true;
        try {
            const values = { nombre: $('tcg-product-name').value.trim(), precio: Number($('tcg-product-price').value), activo: $('tcg-product-active').checked, img: $('tcg-product-front').value.trim(), packBack: $('tcg-product-back').value.trim() };
            for (const [key, id] of Object.entries(fields)) values[key] = Number($(id).value) * (seconds.has(key) ? 1000 : 1);
            await TcgCloud.saveSettings(values);
            dirty = false;
            TcgCloud.emit();
            $('tcg-admin-status').textContent = 'Producto y ajustes guardados en Firebase.';
        } catch (error) { $('tcg-admin-status').textContent = error.message; }
        finally { button.disabled = false; }
    });
    $('tcg-publish-catalog').addEventListener('click', async () => {
        try { await TcgCloud.publishCatalog(window.getTcgAdminCatalog()); $('tcg-admin-status').textContent = 'Las 100 cartas de la colección principal están publicadas en Firebase.'; }
        catch (error) { $('tcg-admin-status').textContent = error.message; }
    });
} catch (error) { $('tcg-admin-status').textContent = 'No se pudo conectar: ' + error.message; }
