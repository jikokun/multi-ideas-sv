function setDirectoryViewMode(mode) {
    const listMode = mode === 'list';
    const gridButton = document.getElementById('viewModeGrid');
    const listButton = document.getElementById('viewModeList');
    const container = document.getElementById(listButton.getAttribute('aria-controls'));
    container.classList.toggle('is-list-view', listMode);
    gridButton.classList.toggle('active', !listMode);
    listButton.classList.toggle('active', listMode);
    gridButton.setAttribute('aria-pressed', String(!listMode));
    listButton.setAttribute('aria-pressed', String(listMode));
}

function filterDirectoryBusinesses(category, tag, search) {
    const query = search.trim().toLowerCase();
    let visibleCount = 0;

    document.querySelectorAll('#negocios-container > .negocio-card').forEach(card => {
        if (card.classList.contains('disponible')) {
            card.classList.toggle('hidden-filter', Boolean(query));
            return;
        }

        const cardCategory = card.dataset.category || '';
        const cardTags = (card.dataset.tags || '').split(',').map(value => value.trim());
        const matchesCategory = category === 'all' || cardCategory === category || cardTags.includes(category);
        const matchesTag = tag === 'all' || cardTags.includes(tag);
        const title = card.querySelector('h3')?.textContent || '';
        const description = card.querySelector('p')?.textContent || '';
        const matchesSearch = `${title} ${description} ${cardTags.join(' ')} ${cardCategory}`.toLowerCase().includes(query);
        const matches = matchesCategory && matchesTag && matchesSearch;
        card.classList.toggle('hidden-filter', !matches);
        if (matches && !card.classList.contains('business-inactive')) visibleCount++;
    });

    return visibleCount;
}
