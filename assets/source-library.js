const MAX_RECORDS = 50000;
const RESULT_PAGE_SIZE = 100;
const MAX_JSON_BYTES = 8 * 1024 * 1024;
const MAX_SOURCE_BYTES = 4 * 1024 * 1024;

// Search metadata literally; untrusted input never becomes a regular expression or HTML.
export function filter_source_records(records, params, repositories) {
    if (!Array.isArray(records) || records.length > MAX_RECORDS || [...params.keys()].some(key =>
        !['q', 'repository'].includes(key) || params.getAll(key).length !== 1)) throw new Error('검색 조건을 확인해 주세요.');
    const filters = { q: (params.get('q') || '').trim(), repository: params.get('repository') || 'all' };
    if (filters.q.length > 200 || /[\u0000-\u001f\u007f]/.test(filters.q) ||
        filters.repository !== 'all' && !repositories.includes(filters.repository)) throw new Error('검색 조건을 확인해 주세요.');
    const terms = filters.q.toLocaleLowerCase('ko').split(/\s+/).filter(Boolean);
    return { filters, items: records.filter(record => (filters.repository === 'all' || record.repository === filters.repository) &&
        terms.every(term => [record.repository, record.source_path, record.role, ...record.licenses].join('\n').toLocaleLowerCase('ko').includes(term))) };
}

// A viewer selects one approved metadata group and ID, never a filesystem path or arbitrary URL.
export function source_view_query(params) {
    if ([...params.keys()].some(key => !['id', 'group'].includes(key) || params.getAll(key).length !== 1) ||
        !/^[a-zA-Z0-9_-]{1,200}$/.test(params.get('id') || '') || !/^[a-f0-9]{2}$/.test(params.get('group') || '')) throw new Error('원문 주소가 올바르지 않습니다.');
    return { id: params.get('id'), group: params.get('group') };
}

// Only generated same-origin project paths may be fetched; metadata cannot redirect the browser.
function data_url(value, prefix) {
    const base = new URL('../', import.meta.url);
    const result = new URL(value, base);
    if (result.origin !== base.origin || !result.pathname.startsWith(base.pathname + prefix) || result.search || result.hash ||
        result.username || result.password) throw new Error('공개 자료 경로가 올바르지 않습니다.');
    return result;
}

// Bound actual streamed bytes as well as declared size; a network failure leaves browse links intact.
async function fetch_bytes(url, limit, signal) {
    const response = await fetch(url, { redirect: 'error', signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000) });
    if (!response.ok || Number(response.headers.get('content-length')) > limit) throw new Error('자료를 불러오지 못했습니다.');
    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.length;
            if (total > limit) throw new Error('자료 크기가 허용 범위를 넘었습니다.');
            chunks.push(value);
        }
    } catch (error) { await reader.cancel().catch(() => {}); throw error; }
    finally { reader.releaseLock(); }
    const bytes = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    return bytes;
}

// JSON is only data; no upstream strings are inserted through innerHTML.
async function fetch_json(url, signal) {
    const bytes = await fetch_bytes(url, MAX_JSON_BYTES, signal);
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

// Text-only DOM construction also protects filenames, titles, license notices and code examples.
function element(tag, text, class_name) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (class_name) node.className = class_name;
    return node;
}

// Generated internal links are checked separately from explicit pinned upstream citations.
function link(title, value, prefix) {
    const node = element('a', title);
    node.href = data_url(value, prefix).href;
    return node;
}

// Keep complete static repository pages available even when JavaScript search is unavailable.
async function enable_source_search(form) {
    const status = form.querySelector('[role="status"]');
    const controls = form.querySelector('[data-source-controls]');
    const results = document.querySelector('[data-source-results]');
    try {
        const index = await fetch_json(new URL('../api/sources/index.json', import.meta.url));
        if (index.schema_version !== 1 || index.scope !== 'approved_unchanged_sources' || !Array.isArray(index.repositories) ||
            index.repositories.length > 200 || !Number.isSafeInteger(index.published) || index.published > MAX_RECORDS ||
            index.repositories.reduce((sum, item) => sum + item.count, 0) !== index.published) throw new Error('검색 색인 형식 오류');
        const names = index.repositories.map(item => item.repository);
        const cache = new Map();
        let pending;
        let sequence = 0;
        // Four bounded requests avoid fetching the entire corpus for a single-repository search.
        async function collect(selected, signal) {
            let next = 0;
            await Promise.all(Array.from({ length: Math.min(4, selected.length) }, async () => {
                while (next < selected.length) {
                    const item = selected[next++];
                    if (cache.has(item.repository)) continue;
                    const data = await fetch_json(data_url(item.search_url, 'api/sources/repositories/'), signal);
                    if (data.schema_version !== 1 || !Array.isArray(data.records) || data.records.length !== item.count ||
                        data.records.some(record => record.repository !== item.repository || !Array.isArray(record.licenses))) throw new Error('검색 자료와 공개 목록이 일치하지 않습니다.');
                    cache.set(item.repository, data.records);
                }
            }));
            return selected.flatMap(item => cache.get(item.repository));
        }
        // At most 100 result cards are mounted; pagination uses the same already-validated result set.
        function render(items, page = 1) {
            const heading = element('h2', '검색 결과 ' + items.length.toLocaleString('en-US') + '개');
            const grid = element('div', undefined, 'result-grid');
            for (const item of items.slice((page - 1) * RESULT_PAGE_SIZE, page * RESULT_PAGE_SIZE)) {
                const card = element('article', undefined, 'result-card');
                const title = element('h3');
                const viewer = new URL(item.url, location.href);
                const params = source_view_query(viewer.searchParams);
                const source_link = link(item.source_path, viewer.pathname, 'sources/view/');
                source_link.search = new URLSearchParams(params).toString();
                title.append(source_link);
                card.append(element('span', item.repository, 'type-label'), title,
                    element('p', item.role + ' · ' + item.commit.slice(0, 7) + ' · ' + item.licenses.join(' AND ')), link(item.format === 'pdf' ? '원본 PDF' : '원문 텍스트', item.raw_url, 'source-files/'));
                grid.append(card);
            }
            const navigation = element('nav', undefined, 'pagination');
            navigation.setAttribute('aria-label', '검색 결과 페이지');
            for (const [title, target] of [['이전', page - 1], ['다음', page + 1]]) {
                const button = element('button', title);
                button.type = 'button';
                button.disabled = target < 1 || target > Math.ceil(items.length / RESULT_PAGE_SIZE);
                button.addEventListener('click', () => render(items, target));
                navigation.append(button);
            }
            navigation.prepend(element('span', page + ' / ' + Math.max(1, Math.ceil(items.length / RESULT_PAGE_SIZE))));
            results.replaceChildren(heading, items.length ? grid : element('p', '일치하는 원문이 없어요. 저장소나 검색어를 바꿔 보세요.', 'empty-state'), navigation);
        }
        // A new query supersedes pending requests and cannot be overwritten by stale responses.
        async function apply(params, update_address) {
            const current = ++sequence;
            pending?.abort();
            pending = new AbortController();
            results.replaceChildren();
            try {
                const { filters } = filter_source_records([], params, names);
                form.elements.q.value = filters.q;
                form.elements.repository.value = filters.repository;
                const selected = index.repositories.filter(item => filters.repository === 'all' || item.repository === filters.repository);
                status.textContent = '공개 메타데이터를 불러오는 중입니다. 원문 본문은 검색 요청에 포함되지 않습니다.';
                const records = await collect(selected, pending.signal);
                if (sequence !== current) return;
                const result = filter_source_records(records, params, names);
                render(result.items);
                status.textContent = '검색 결과 ' + result.items.length.toLocaleString('en-US') + '개 · 저장소·파일명·자료 유형·라이선스 검색';
                if (update_address) {
                    const address = new URL(location.href);
                    address.search = new URLSearchParams(result.filters).toString();
                    history.replaceState(null, '', address);
                }
            } catch (error) {
                if (sequence !== current) return;
                status.textContent = error.name === 'AbortError' ? '검색을 취소했습니다.' : error.message + ' 아래 저장소별 목록을 이용하세요.';
            }
        }
        controls.disabled = false;
        status.textContent = '검색 준비 완료 · 저장소를 고르면 필요한 색인만 불러옵니다. 본문 전체 검색은 제공하지 않습니다.';
        form.addEventListener('submit', event => { event.preventDefault(); void apply(new URLSearchParams(new FormData(form)), true); });
        if (location.search) void apply(new URLSearchParams(location.search), false);
        addEventListener('popstate', () => { void apply(new URLSearchParams(location.search), false); });
    } catch {
        controls.disabled = true;
        status.textContent = '검색 색인을 불러오지 못했습니다. 아래 저장소별 목록에서 원문을 열어 주세요.';
    }
}

// Render raw bytes as escaped text after integrity verification, never as Markdown/HTML or executable code.
async function enable_source_view(container) {
    const status = container.querySelector('[role="status"]');
    try {
        const { id, group } = source_view_query(new URLSearchParams(location.search));
        const data = await fetch_json(new URL('../api/sources/groups/' + group + '.json', import.meta.url));
        if (data.schema_version !== 1 || !Array.isArray(data.records) || data.records.length > 1000) throw new Error('원문 색인 형식 오류');
        const record = data.records.find(item => item.id === id);
        if (!record || !/^[a-f0-9]{64}$/.test(record.sha256) || !Number.isSafeInteger(record.bytes) || record.bytes > MAX_SOURCE_BYTES) throw new Error('공개 원문을 찾을 수 없습니다.');
        const heading = element('h1', record.source_path);
        const metadata = element('section', undefined, 'prose source-metadata');
        const upstream = new URL(record.source_url);
        if (upstream.protocol !== 'https:' || !['github.com', 'raw.githubusercontent.com'].includes(upstream.hostname) || upstream.username || upstream.password ||
            !/^[a-f0-9]{40}$/.test(record.commit) || !upstream.pathname.includes(record.commit)) throw new Error('고정 출처 주소 오류');
        const citation = element('a', '고정 원출처');
        citation.href = upstream.href;
        const download = link(record.format === 'pdf' ? '원본 PDF 다운로드' : '원문 텍스트 다운로드', record.raw_url, 'source-files/');
        download.download = record.source_path.split('/').at(-1) + (record.format === 'pdf' ? '' : '.txt');
        metadata.append(element('p', record.repository + ' · ' + record.role), element('p', '판본: ' + record.commit, 'file-path'),
            element('p', 'SHA-256: ' + record.sha256, 'file-path'), element('p', '원문 변경 없음 · ' + record.bytes.toLocaleString('en-US') + ' bytes · 빌드·실기 미검증'), citation, document.createTextNode(' · '), download,
            element('h2', '라이선스와 원저작 고지'), element('p', '적용 조건: ' + record.licenses.join(' AND ')));
        if (record.original_expression) metadata.append(element('p', '원래 표현: ' + record.original_expression));
        const notices = element('ul');
        for (const item of [...record.terms.map(item => ({ title: item.id + ' 전문', url: item.url })), ...record.evidence, ...record.supplemental]) {
            const row = element('li');
            row.append(link(item.title, item.url, item.url.includes('/source-files/') ? 'source-files/' : 'source-licenses/'));
            notices.append(row);
        }
        metadata.append(notices, element('p', '개별 고지와 저작자 표시는 아래 원문에 그대로 보존했습니다. 원문의 이용은 해당 라이선스를 따릅니다. 상표·특허·하드웨어 적합성을 별도로 보증하지 않습니다.'));
        const loading = element('p', '원문 바이트와 해시를 확인 중입니다.');
        loading.setAttribute('role', 'status');
        container.replaceChildren(heading, metadata, loading);
        document.title = record.source_path + ' — Mist Atelier';
        const bytes = await fetch_bytes(data_url(record.raw_url, 'source-files/'), MAX_SOURCE_BYTES);
        const digest = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(value => value.toString(16).padStart(2, '0')).join('');
        if (bytes.length !== record.bytes || digest !== record.sha256) throw new Error('원문 무결성 확인에 실패했습니다. 본문을 표시하지 않습니다.');
        if (record.format === 'pdf') {
            const description = element('p', '원본 PDF의 SHA-256을 확인했습니다. PDF 자체의 저작자·라이선스·안전 고지를 유지한 파일입니다.');
            description.dataset.pdfVerified = 'true';
            loading.replaceWith(description, link('원본 PDF 열기', record.raw_url, 'source-files/'));
            return;
        }
        const pre = element('pre', undefined, 'public-source-text');
        pre.tabIndex = 0;
        pre.setAttribute('aria-label', '변경하지 않은 원문 텍스트');
        pre.append(element('code', new TextDecoder('utf-8', { fatal: true }).decode(bytes)));
        loading.replaceWith(element('h2', '원문'), pre);
    } catch (error) {
        const current = container.querySelector('[role="status"]') || status;
        current.textContent = error.message + ' 자료실의 원문 텍스트 링크를 확인해 주세요.';
    }
}

if (typeof document !== 'undefined') {
    const search = document.querySelector('[data-source-search]');
    if (search) void enable_source_search(search);
    const view = document.querySelector('[data-source-view]');
    if (view) void enable_source_view(view);
}
