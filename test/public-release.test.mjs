import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';
import test from 'node:test';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const mirror = await readFile(new URL('../legaltech_oaxaca.html', import.meta.url), 'utf8');

test('public pages remove simulated access and exposed LexControl records', () => {
    assert.equal(mirror, html);
    assert.doesNotMatch(html, /Acceso al Panel de Control|PIN autorizado|modalAdmin|adminLoginForm/);
    assert.doesNotMatch(html, /autenticarAdmin|adminDashboard|adm_pass|lexDB|lexNuevoExpediente/);
    assert.doesNotMatch(html, /<input\b[^>]*type=["']password/i);
    assert.doesNotMatch(html, /id="lexField(?:Expediente|Cliente|Acto)"/);
    assert.match(html, /Demostración no operativa: no existe almacenamiento protegido de expedientes/);
    assert.match(html, /No ingreses información confidencial/);
    assert.doesNotMatch(html, /\b(?:localStorage|sessionStorage)\b/);

    for (const id of ['inp_ai_p1', 'inp_ai_p3']) {
        const field = [...html.matchAll(/<input\b[^>]*>/gi)]
            .map(([tag]) => tag)
            .find(tag => new RegExp(`\\bid="${id}"`, 'i').test(tag));
        assert.ok(field, `${id} must exist`);
        assert.doesNotMatch(field, /\bvalue\s*=/i);
        assert.match(field, /placeholder="Ejemplo ficticio; no uses datos reales"/);
    }
    const facts = html.match(/<textarea\b[^>]*id="inp_ai_p2"[^>]*>([\s\S]*?)<\/textarea>/i);
    assert.ok(facts);
    assert.equal(facts[1].trim(), '');
});

test('public page restores zoom, readable text, accessible controls, and valid icons', async () => {
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0"/);
    assert.doesNotMatch(html, /maximum-scale|user-scalable=no|text-slate-500|text-slate-600/);
    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map(([, level]) => Number(level));
    for (let index = 1; index < headingLevels.length; index += 1) {
        assert.ok(headingLevels[index] <= headingLevels[index - 1] + 1, 'heading levels must not skip');
    }
    assert.doesNotMatch(html, /<h3\b[^>]*>LEGAL TECH OAXACA<\/h3>/);
    assert.match(html, /<link rel="icon" href="\/favicon\.ico" type="image\/x-icon">/);
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/icons\/legaltech-icon\.svg">/);

    for (const id of [
        'tesisSearchInp', 'tesisMatFilter', 'tesisTipoFilter', 'inp_ai_p1',
        'inp_ai_p2', 'inp_ai_p3', 'inp_pair_text', 'inp_reddit_text',
        'ctrTipo', 'ctrParte1', 'ctrParte2', 'ctrMonto'
    ]) {
        const control = [...html.matchAll(/<(?:input|select|textarea)\b[^>]*>/gi)]
            .map(([tag]) => tag)
            .find(tag => new RegExp(`\\bid="${id}"`, 'i').test(tag));
        assert.ok(control, `${id} must exist`);
        assert.match(control, /\baria-label="/i);
    }

    const favicon = await readFile(new URL('../favicon.ico', import.meta.url));
    assert.equal(favicon.readUInt16LE(0), 0);
    assert.equal(favicon.readUInt16LE(2), 1);
    assert.equal(favicon.readUInt16LE(4), 1);
    assert.deepEqual([...favicon.subarray(22, 26)], [0x89, 0x50, 0x4e, 0x47]);

    const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
    for (const icon of manifest.icons) {
        await readFile(new URL(`../${icon.src}`, import.meta.url));
    }
});

test('service worker caches only public navigations', async () => {
    const worker = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
    const handlers = new Map();
    const self = {
        location: { origin: 'https://example.test' },
        registration: { scope: 'https://example.test/' },
        addEventListener: (type, handler) => handlers.set(type, handler)
    };
    runInNewContext(worker, { self, URL, caches: {}, fetch: async () => ({ ok: false }) });

    let responsePromise;
    handlers.get('fetch')({
        request: {
            method: 'GET',
            mode: 'navigate',
            url: 'https://example.test/private-portal/'
        },
        respondWith: promise => { responsePromise = promise; }
    });
    assert.equal(responsePromise, undefined);

    handlers.get('fetch')({
        request: {
            method: 'GET',
            mode: 'navigate',
            url: 'https://example.test/'
        },
        respondWith: promise => { responsePromise = promise; }
    });
    assert.ok(responsePromise);
    await responsePromise;
});
