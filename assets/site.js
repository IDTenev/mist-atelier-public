// Match the approved-only server search contract without sending a search request.
export function filter_public_guides(documents, params) {
    if (!Array.isArray(documents) || documents.length > 1000 || [...params.keys()].some(key =>
        !['q', 'manufacturer'].includes(key) || params.getAll(key).length !== 1)) throw new Error('검색 조건을 확인해 주세요.');
    const filters = { q: (params.get('q') || '').trim(), manufacturer: params.get('manufacturer') || 'all' };
    const manufacturers = [...new Set(documents.map(item => item.target.manufacturer))].sort();
    if (filters.q.length > 200 || /[\u0000-\u001f\u007f]/.test(filters.q) ||
        filters.manufacturer !== 'all' && !manufacturers.includes(filters.manufacturer)) throw new Error('검색 조건을 확인해 주세요.');
    const terms = filters.q.toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    const items = documents.filter(item => (filters.manufacturer === 'all' || item.target.manufacturer === filters.manufacturer) &&
        terms.every(term => [item.title, ...Object.values(item.target), item.text].join('\n').toLocaleLowerCase('ko').includes(term)));
    return { filters, items };
}

// Preserve shareable filters locally; no cookies, local storage or analytics are used.
function replace_query(params) {
    const url = new URL(location.href);
    url.search = params.toString();
    history.replaceState(null, '', url);
}

// Leave the complete, readable HTML list in place when search data cannot be loaded.
async function enable_search(form) {
    const status = form.querySelector('[role="status"]');
    const controls = form.querySelector('[data-search-controls]');
    try {
        const response = await fetch(new URL('../api/search.json', import.meta.url), { signal: AbortSignal.timeout(10000) });
        if (!response.ok) throw new Error('검색 자료를 불러오지 못했습니다.');
        const data = await response.json();
        if (data.scope !== 'approved_guides_only' || !Array.isArray(data.documents)) throw new Error('검색 자료 형식이 올바르지 않습니다.');
        const cards = [...document.querySelectorAll('.guide-grid .guide-card')];
        const heading = document.querySelector('.results-heading h2');
        const empty = document.createElement('p');
        empty.className = 'empty-state';
        empty.textContent = '일치하는 안내가 없어요. 검색어나 제조사 조건을 바꿔 보세요.';
        empty.hidden = true;
        document.querySelector('.guide-grid')?.after(empty);
        const card_ids = cards.map(card => new URL(card.querySelector('h2 a').href).pathname.split('/').filter(Boolean).at(-1));
        if (card_ids.length !== data.documents.length || card_ids.some(id => !data.documents.some(item => item.document_id === id))) throw new Error('검색 자료와 안내 목록이 일치하지 않습니다.');
        // Invalid incoming queries show a warning and the full list, never stale filtered results.
        function apply(params, update_address) {
            try {
                const result = filter_public_guides(data.documents, params);
                const ids = new Set(result.items.map(item => item.document_id));
                cards.forEach((card, index) => { card.hidden = !ids.has(card_ids[index]); });
                form.elements.q.value = result.filters.q;
                form.elements.manufacturer.value = result.filters.manufacturer;
                heading.textContent = '안내 검색 결과 ' + result.items.length;
                empty.hidden = result.items.length > 0;
                status.textContent = '승인 안내 ' + result.items.length + '개 · 브라우저에서 검색했습니다.';
                if (update_address) replace_query(params);
            } catch (error) {
                cards.forEach(card => { card.hidden = false; });
                empty.hidden = true;
                heading.textContent = '안내 목록 ' + cards.length;
                status.textContent = error.message + ' 전체 목록을 표시합니다.';
            }
        }
        form.addEventListener('submit', event => {
            event.preventDefault();
            const params = new URLSearchParams(new FormData(form));
            apply(params, true);
        });
        controls.disabled = false;
        apply(new URLSearchParams(location.search), false);
        addEventListener('popstate', () => apply(new URLSearchParams(location.search), false));
    } catch {
        controls.disabled = true;
        status.textContent = '검색 자료를 불러오지 못했습니다. 아래 전체 안내를 직접 열어 주세요.';
    }
}

// Filter existing event elements; their exact text remains server-rendered and inspectable.
function enable_history(form) {
    const select = form.elements.document;
    const events = [...document.querySelectorAll('.change-list > li')];
    const status = document.createElement('p');
    status.className = 'search-status';
    status.setAttribute('role', 'status');
    form.after(status);
    // Query values must name one of the already-published guide options.
    function apply(params, update_address) {
        const selected = params.get('document') || '';
        const valid = [...params.keys()].every(key => key === 'document' && params.getAll(key).length === 1) &&
            [...select.options].some(option => option.value === selected);
        events.forEach(event => {
            const id = new URL(event.querySelector('h2 a').href).pathname.split('/').filter(Boolean).at(-1);
            event.hidden = valid && selected !== '' && id !== selected;
        });
        select.value = valid ? selected : '';
        status.textContent = valid ? '기록 ' + events.filter(event => !event.hidden).length + '개' : '이력 조건을 확인해 주세요. 전체 기록을 표시합니다.';
        if (valid && update_address) replace_query(params);
    }
    form.querySelectorAll('[disabled]').forEach(control => { control.disabled = false; });
    form.addEventListener('submit', event => { event.preventDefault(); apply(new URLSearchParams(new FormData(form)), true); });
    apply(new URLSearchParams(location.search), false);
    addEventListener('popstate', () => apply(new URLSearchParams(location.search), false));
}

if (typeof document !== 'undefined') {
    const search = document.querySelector('[data-guide-search]');
    if (search) void enable_search(search);
    const history_form = document.querySelector('.history-filter');
    if (history_form) enable_history(history_form);
}
