(function () {
    const labels = { common: 'Comunes', special: 'Especiales', rare: 'Raras', epic: 'Épicas', legendary: 'Legendarias', mythic: 'Míticas' };
    const colors = { common: '#7dd3fc', special: '#f9a8d4', rare: '#c4b5fd', epic: '#fda4af', legendary: '#fde047', mythic: '#e2e8f0' };
    window.renderTcgProfile = function (data = {}) {
        const uniqueByRarity = Object.fromEntries(Object.keys(labels).map(rarity => [rarity, 0]));
        // Una entrada del inventario representa una carta distinta, tenga una o cien copias.
        // Los perfiles antiguos sin inventario pueden usar los contadores de únicas guardados.
        if (data.inventario && typeof data.inventario === 'object') {
            for (const card of Object.values(data.inventario)) {
                if (Number(card?.cantidad) > 0 && Object.hasOwn(uniqueByRarity, card.rareza)) uniqueByRarity[card.rareza]++;
            }
        } else {
            for (const rarity of Object.keys(labels)) uniqueByRarity[rarity] = Math.max(0, Math.floor(Number(data.unicasPorRareza?.[rarity]) || 0));
        }
        const uniqueTotal = Object.values(uniqueByRarity).reduce((sum, count) => sum + count, 0);
        document.querySelectorAll('[data-tcg-summary]').forEach(container => {
            container.replaceChildren();
            container.classList.add('tcg-profile-summary');
            const heading = document.createElement('div'); heading.className = 'tcg-profile-heading';
            const title = document.createElement('div');
            title.textContent = 'CARTAS ÚNICAS';
            const total = document.createElement('strong'); total.className = 'tcg-profile-total';
            total.textContent = `${uniqueTotal} / 100`;
            heading.append(title, total);
            const grid = document.createElement('dl'); grid.className = 'tcg-profile-grid';
            for (const [rarity, label] of Object.entries(labels)) {
                const cell = document.createElement('div'); cell.className = 'tcg-profile-rarity'; cell.dataset.rarity = rarity;
                cell.style.setProperty('--rarity-color', colors[rarity]);
                const name = document.createElement('dt'); name.textContent = label;
                const count = document.createElement('dd'); count.textContent = uniqueByRarity[rarity];
                cell.append(name, count); grid.append(cell);
            }
            const note = document.createElement('div'); note.className = 'tcg-profile-note';
            note.textContent = 'Las repetidas otorgan XP';
            container.append(heading, grid, note);
        });
    };
})();
