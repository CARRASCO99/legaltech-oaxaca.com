import { publicBlock } from './public-cms-contract.mjs';

const maxBytes = 1_000_000;

async function readJson(response) {
    if (!response.ok || response.redirected ||
        !/^application\/json(?:\s*;|$)/i.test(response.headers.get('content-type') || '')) {
        throw new Error('Public content response is unavailable.');
    }
    const length = response.headers.get('content-length');
    if (length && (!/^\d+$/.test(length) || Number(length) > maxBytes)) throw new Error('Public content is too large.');
    if (!response.body) throw new Error('Public content response has no body.');
    const reader = response.body.getReader();
    const chunks = [];
    let size = 0;
    for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        size += value.byteLength;
        if (size > maxBytes) {
            await reader.cancel();
            throw new Error('Public content is too large.');
        }
        chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) {
        bytes.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
}

export async function loadPublicContent(doc, fetchContent) {
    const endpoint = doc.querySelector('meta[name="public-content-endpoint"]')?.content;
    const section = doc.getElementById('publicContent');
    const container = doc.getElementById('publicContentBlocks');
    if (!endpoint || !section || !container) return;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    try {
        const url = new URL(endpoint);
        if (url.protocol !== 'https:' || url.username || url.password ||
            url.pathname !== '/api/public/content' || url.search || url.hash ||
            ['legaltech-oaxaca-private-portal.legaltech-oaxaca-chat.workers.dev',
                'portal.legaltechoaxacacorporativojuridico.com'].includes(url.hostname)) {
            throw new Error('Public content endpoint is invalid.');
        }
        const response = await fetchContent(url.href, {
            method: 'GET', headers: { Accept: 'application/json' },
            credentials: 'omit', redirect: 'error', cache: 'no-store', signal: controller.signal
        });
        const data = await readJson(response);
        if (!data || typeof data !== 'object' || Array.isArray(data) ||
            Object.keys(data).length !== 1 || !Array.isArray(data.items) || data.items.length > 100) {
            throw new Error('Public content response is invalid.');
        }
        const fragment = doc.createDocumentFragment();
        for (const item of data.items) {
            if (!item || typeof item !== 'object' || Array.isArray(item) ||
                Object.keys(item).length !== 3 ||
                !Object.hasOwn(item, 'type') || !Object.hasOwn(item, 'content') || !Object.hasOwn(item, 'position')) {
                throw new Error('Public content block is invalid.');
            }
            const block = publicBlock(item.type, item.content, item.position);
            if (!block) throw new Error('Public content block is invalid.');
            const element = doc.createElement(block.type === 'heading' ? block.content.level :
                block.type === 'link' ? 'a' : 'p');
            element.textContent = block.type === 'link' ? block.content.label : block.content.text;
            if (block.type === 'link') {
                element.href = block.content.url;
                element.className = 'text-gold-400 underline underline-offset-4';
            } else {
                element.className = block.type === 'heading' ? 'font-serif font-bold text-white' :
                    block.type === 'callout' ? 'text-slate-200 border-l-2 border-gold-500 pl-4' : 'text-slate-300';
            }
            fragment.appendChild(element);
        }
        if (data.items.length) {
            container.replaceChildren(fragment);
            section.hidden = false;
        }
    } catch {
        console.warn('No se pudo cargar el contenido público; se conserva el sitio existente.');
    } finally {
        clearTimeout(timer);
    }
}

if (typeof document !== 'undefined') {
    void loadPublicContent(document, fetch);
}
