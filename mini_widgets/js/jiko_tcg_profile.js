(function () {
    const labels = { common: 'Comunes', special: 'Especiales', rare: 'Raras', epic: 'Épicas', legendary: 'Legendarias', mythic: 'Míticas' };
    const colors = { common: '#7dd3fc', special: '#f9a8d4', rare: '#6ee7b7', epic: '#c4b5fd', legendary: '#fde047', mythic: '#fda4af' };
    window.renderTcgProfile = function (data = {}) {
        document.querySelectorAll('[data-tcg-summary]').forEach(container => {
            container.replaceChildren();
            container.style.cssText = 'margin:6px 0;padding:7px 9px;border:1px solid #6b8ea833;border-radius:7px;background:#06111d66;font-size:10px;line-height:1.4;color:#afc5d3;';
            const title = document.createElement('div');
            title.textContent = `✦ CARTAS ${Number(data.cartasUnicas) || 0}/100 · ${Number(data.totalCartas) || 0} obtenidas · ${Number(data.repetidas) || 0} repetidas`;
            title.style.cssText = 'font-weight:700;margin-bottom:4px;';
            const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:3px 8px;';
            for (const [rarity, label] of Object.entries(labels)) {
                const cell = document.createElement('span'); cell.style.color = colors[rarity];
                cell.textContent = `${label}: ${Number(data.porRareza?.[rarity]) || 0}`; grid.append(cell);
            }
            container.append(title, grid);
        });
    };
})();
