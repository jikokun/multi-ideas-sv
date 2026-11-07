import { TcgCloud, initializeTcg } from '../mini_widgets/js/jiko_tcg_firebase.js';

const params = new URLSearchParams(location.search);
const live = params.get('obs') === 'true' && !params.has('preview') && parent === window;
await initializeTcg();
TcgCloud.subscribe(service => {
    window.JikoBooster?.setCloudCatalog(service.catalog);
    window.JikoBooster?.setCloudProduct(service.product);
});

if (live) {
    await import('../mini_widgets/js/jiko_widget_sync.js');
    TcgCloud.startWorker('cards', async (job, signal, checkpoint) => {
        const widget = window.JikoBooster;
        widget.setCloudCatalog(TcgCloud.catalog);
        widget.setQueueLocked(true);
        window.JikoWidgetSync?.acquire('tarjetero', job.user, 180000);
        try {
            if (job.type === 'collection') {
                await widget.showOwned(job.cards, { signal, duration: TcgCloud.settings.collectionDurationMs });
            } else {
                for (let index = job.packIndex || 0; index < job.receipt.packs.length; index++) {
                    if (signal.aborted) throw new Error('Turno cancelado.');
                    await widget.playAwarded(job.receipt.packs[index], { signal, duration: TcgCloud.settings.revealDurationMs });
                    await checkpoint(index + 1);
                }
            }
        } finally { widget.setQueueLocked(false); window.JikoWidgetSync?.release('tarjetero'); }
    }, () => {
        if (window.JikoBooster?.snapshot().phase !== 'idle') return false;
        const lock = window.JikoWidgetSync?.getActiveLock();
        return !lock || lock.widget === 'tarjetero';
    });
}
addEventListener('pagehide', () => TcgCloud.destroy(), { once: true });
