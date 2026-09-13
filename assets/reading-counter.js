const READING_NAMESPACE = 'readings-v1';
const COUNTER_TIMEOUT_MS = 10000;
const g_counted_containers = new WeakSet();

// Opaque document keys reveal no search text, source path, IP or browser identifier.
export async function reading_key(kind, id) {
    if (!['source', 'guide'].includes(kind) || !/^[a-zA-Z0-9_-]{1,200}$/.test(id)) throw new Error('Invalid reading identity');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(kind + ':' + id));
    return [...new Uint8Array(digest)].map(value => value.toString(16).padStart(2, '0')).join('');
}

// Counter writes are restricted to the configured public project; every preview is read-only.
export function reading_counter_url(site_url, current_url, key) {
    const site = new URL(site_url);
    const current = new URL(current_url);
    if (site.protocol !== 'https:' || !/^[a-z0-9-]+\.github\.io$/.test(site.hostname) ||
        !/^\/[a-zA-Z0-9_-]+\/$/.test(site.pathname) || site.search || site.hash || site.username || site.password || site.port ||
        !/^[a-f0-9]{64}$/.test(key)) throw new Error('Invalid reading counter');
    if (current.origin !== site.origin || !current.pathname.startsWith(site.pathname)) return null;
    if ((site.hostname + site.pathname + READING_NAMESPACE + '/' + key).length > 250) throw new Error('Reading counter key too long');
    return 'https://hits.sh/' + site.hostname + site.pathname + READING_NAMESPACE + '/' + key + '.svg?style=flat-square&label=reads&color=69e7e8&labelColor=09212b';
}

// A verified, visible document loads exactly one badge; errors never trigger incrementing retries.
export async function record_reading(container, kind, id) {
    const site = document.body.dataset.readingSite;
    if (!site || g_counted_containers.has(container)) return;
    g_counted_containers.add(container);
    const was_visible = document.visibilityState === 'visible';
    const status = document.createElement('p');
    status.className = 'reading-status';
    status.setAttribute('role', 'status');
    status.textContent = '이 자료 열람 · 집계 준비 중';
    container.append(status);
    try {
        const url = reading_counter_url(site, location.href, await reading_key(kind, id));
        if (!url) { status.textContent = '미리보기 · 자료 열람은 집계하지 않습니다.'; return; }
        // Background/pre-rendered pages count only when the reader actually brings them into view.
        if (!was_visible && document.visibilityState !== 'visible') await new Promise(resolve => {
            function on_visible() {
                if (document.visibilityState !== 'visible') return;
                document.removeEventListener('visibilitychange', on_visible);
                resolve();
            }
            document.addEventListener('visibilitychange', on_visible);
        });
        const badge = new Image();
        badge.alt = '이 자료의 누적 열람 요청 (Hits)';
        badge.referrerPolicy = 'no-referrer';
        const timeout = setTimeout(() => { status.textContent = '이 자료 열람 · 집계 지연'; }, COUNTER_TIMEOUT_MS);
        badge.addEventListener('load', () => {
            clearTimeout(timeout);
            status.replaceChildren(document.createTextNode('이 자료 열람 '), badge);
        }, { once: true });
        badge.addEventListener('error', () => { clearTimeout(timeout); status.textContent = '이 자료 열람 · 집계 불가'; }, { once: true });
        badge.src = url;
    } catch { status.textContent = '이 자료 열람 · 집계 불가'; }
}
