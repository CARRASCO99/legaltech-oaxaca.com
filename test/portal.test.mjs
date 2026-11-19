import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).at(-1);

test('public portal status and protected portal link do not simulate a login', async () => {
    const alternate = await readFile(new URL('../legaltech_oaxaca.html', import.meta.url), 'utf8');
    assert.equal(alternate, html);
    assert.match(html, /Esta vista es informativa y pública/);
    assert.match(html, /El acceso del propietario está separado y protegido por Cloudflare Access/);
    assert.match(html, /href="https:\/\/legaltech-oaxaca-private-portal\.legaltech-oaxaca-chat\.workers\.dev\/">Acceso privado<\/a>/);
    assert.equal([...html.matchAll(/>Acceso privado<\/a>/g)].length, 1);
    assert.match(html, /<link rel="icon" href="\/favicon\.ico" type="image\/x-icon">/);
    assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/icons\/legaltech-icon\.svg">/);
    assert.match(html, /name="viewport" content="width=device-width, initial-scale=1\.0"/);
    assert.doesNotMatch(html, /maximum-scale|user-scalable=no|text-slate-500|text-slate-600/);
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
    const headingLevels = [...html.matchAll(/<h([1-6])\b/gi)].map(([, level]) => Number(level));
    for (let index = 1; index < headingLevels.length; index += 1) {
        assert.ok(headingLevels[index] <= headingLevels[index - 1] + 1, 'heading levels must not skip');
    }
    assert.doesNotMatch(html, /<h3\b[^>]*>LEGAL TECH OAXACA<\/h3>/);
    assert.doesNotMatch(html, /Portal privado · pendiente|ningún acceso está habilitado/);
    assert.doesNotMatch(html, /autenticarAdmin|adminDashboard|adm_pass|lexDB|lexNuevoExpediente/);
    assert.doesNotMatch(html, /Acceso al Panel de Control|PIN autorizado|<input\b[^>]*type=["']password/i);
    assert.match(html, /Modo demostración: este redactor solo genera un borrador local; no guarda ni envía estos campos/);
    assert.doesNotMatch(html, /\b(?:localStorage|sessionStorage)\b/);
    for (const id of ['inp_ai_p1', 'inp_ai_p3']) {
        const field = [...html.matchAll(/<input\b[^>]*>/gi)]
            .map(([tag]) => tag)
            .find(tag => new RegExp(`\\bid="${id}"`, 'i').test(tag));
        assert.ok(field, `${id} must exist`);
        assert.doesNotMatch(field, /\bvalue\s*=/i);
        assert.match(field, /placeholder="Ejemplo ficticio; no uses datos reales"/);
    }
    const sampleFacts = html.match(/<textarea\b[^>]*id="inp_ai_p2"[^>]*>([\s\S]*?)<\/textarea>/i);
    assert.ok(sampleFacts);
    assert.equal(sampleFacts[1].trim(), '');
    assert.match(sampleFacts[0], /placeholder="Ejemplo ficticio; no uses datos reales"/);
    const redactorStart = html.indexOf('function generarEscritoIA');
    const redactorEnd = html.indexOf('function ', redactorStart + 1);
    assert.ok(redactorStart >= 0 && redactorEnd > redactorStart);
    assert.doesNotMatch(html.slice(redactorStart, redactorEnd), /\bfetch\s*\(|localStorage|sessionStorage|document\.cookie/);
    assert.match(html, /integración automática con PJF/);
    assert.match(html, /id="view-planes"/);
    assert.match(html, /Google y Gmail son el mismo proveedor/);
    assert.match(html, /No hay proveedor, métodos de pago, Checkout ni webhooks conectados/);
    assert.match(html, /Principiante[\s\S]*Periodicidad propuesta: semanal/);
    assert.match(html, /Starter[\s\S]*Periodicidad propuesta: mensual/);
    assert.match(html, /Premium[\s\S]*Periodicidad propuesta: anual/);
    const views = Object.fromEntries([...html.matchAll(/id="(view-[^"]+)"/g)]
        .map(([, id]) => [id, { style: {} }]));
    const mobile = { open: true };
    let reduceMotion = false;
    let scrollBehavior;
    const context = {
        document: {
            getElementById: id => id === 'mobileNavigation' ? mobile : views[id],
            querySelector: () => null,
            querySelectorAll: () => []
        },
        window: {
            addEventListener() {},
            matchMedia: () => ({ matches: reduceMotion }),
            scrollTo: options => { scrollBehavior = options.behavior; }
        }
    };
    vm.runInNewContext(script, context);
    context.switchView('portal');
    assert.equal(scrollBehavior, 'smooth');
    assert.equal(views['view-home'].style.display, 'none');
    assert.equal(views['view-portal'].style.display, 'block');
    assert.equal(mobile.open, false);
    context.switchView('planes');
    assert.equal(views['view-planes'].style.display, 'block');
    assert.equal(views['view-portal'].style.display, 'none');
    reduceMotion = true;
    context.switchView('home');
    assert.equal(scrollBehavior, 'auto');
    assert.equal(views['view-planes'].style.display, 'none');
    assert.equal(views['view-portal'].style.display, 'none');
    assert.equal(views['view-home'].style.display, 'block');
});

test('service worker handles public pages but does not cache private navigations', async () => {
    const source = await readFile(new URL('../service-worker.js', import.meta.url), 'utf8');
    const listeners = {};
    const writes = [];
    const context = {
        URL,
        self: {
            location: { origin: 'https://example.test' },
            registration: { scope: 'https://example.test/' },
            addEventListener: (name, handler) => { listeners[name] = handler; }
        },
        caches: { open: async () => ({ put: async request => writes.push(request.url) }) },
        fetch: async () => ({ ok: true, clone() { return this; } })
    };
    vm.runInNewContext(source, context);
    let response;
    const navigate = url => {
        response = undefined;
        listeners.fetch({ request: { url, method: 'GET', mode: 'navigate' }, respondWith: value => { response = value; } });
        return response;
    };
    await navigate('https://example.test/index.html');
    assert.deepEqual(writes, ['https://example.test/index.html']);
    assert.equal(navigate('https://example.test/private'), undefined);
    assert.equal(navigate('https://example.test/index.html?token=example'), undefined);
    assert.equal(writes.length, 1);
});

test('manifest icons resolve to existing files', async () => {
    const manifest = JSON.parse(await readFile(new URL('../manifest.webmanifest', import.meta.url), 'utf8'));
    const favicon = await readFile(new URL('../favicon.ico', import.meta.url));
    assert.equal(favicon.readUInt16LE(0), 0);
    assert.equal(favicon.readUInt16LE(2), 1);
    assert.equal(favicon.readUInt16LE(4), 1);
    assert.deepEqual([...favicon.subarray(22, 26)], [0x89, 0x50, 0x4e, 0x47]);
    for (const icon of manifest.icons) {
        await readFile(new URL(`../${icon.src}`, import.meta.url));
    }
});
