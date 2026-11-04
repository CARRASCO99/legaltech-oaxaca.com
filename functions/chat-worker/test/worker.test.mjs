import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';

const source = (await readFile(new URL('../src/index.js', import.meta.url), 'utf8'))
    .replace('export class RateLimiter', 'class RateLimiter')
    .replace('export default {', 'const worker = {') + '\nglobalThis.worker = worker;';

function createWorker(fetch = globalThis.fetch) {
    const context = {
        AbortController,
        Response,
        TextEncoder,
        URL,
        clearTimeout,
        console,
        crypto: webcrypto,
        fetch,
        setTimeout
    };
    vm.runInNewContext(source, context);
    return context.worker;
}

function createEnvironment(overrides = {}) {
    return {
        AI_MODEL: 'test-model',
        AI: {
            run: async () => ({ response: 'Respuesta simulada' })
        },
        ALLOWED_ORIGINS: 'https://site.test',
        RATE_LIMITER: {
            idFromName: () => 'test',
            get: () => ({
                fetch: async () => new Response(null, { status: 204 })
            })
        },
        ...overrides
    };
}

function chatRequest(contentType = 'application/json', mode) {
    return new Request('https://worker.test/api/chat', {
        method: 'POST',
        headers: {
            Origin: 'https://site.test',
            'CF-Connecting-IP': '192.0.2.1',
            'Content-Type': contentType
        },
        body: JSON.stringify({
            ...(mode === undefined ? {} : { mode }),
            messages: [{ role: 'user', content: 'Pregunta de prueba' }]
        })
    });
}

test('health reports Workers AI configured only when a model is set', async () => {
    const worker = createWorker();
    const configured = await worker.fetch(new Request('https://worker.test/health'), createEnvironment());
    const missingModel = await worker.fetch(
        new Request('https://worker.test/health'),
        createEnvironment({ AI_MODEL: '' })
    );

    assert.equal((await configured.json()).configured, true);
    assert.equal((await missingModel.json()).configured, false);
});

test('chat calls Workers AI with the legal guidance and returns its response', async () => {
    let call;
    const worker = createWorker();
    const env = createEnvironment({
        AI: {
            run: async (model, input) => {
                call = { model, input };
                return { response: 'Respuesta simulada' };
            }
        }
    });

    const response = await worker.fetch(chatRequest('application/json; charset=utf-8'), env);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.equal(body.reply, 'Respuesta simulada');
    assert.equal(call.model, 'test-model');
    assert.equal(call.input.messages[0].role, 'system');
    assert.match(call.input.messages[0].content, /No ayudes a planear/);
    assert.match(call.input.messages[0].content, /No amenaces ni borres o danies datos/);
    assert.equal(call.input.messages.at(-1).content, 'Pregunta de prueba');
});

test('site editor mode requests safe text proposals instead of code or automatic edits', async () => {
    let call;
    const worker = createWorker();
    const env = createEnvironment({
        AI: {
            run: async (model, input) => {
                call = { model, input };
                return { response: 'Objetivo: mejorar. Propuesta: texto claro. Vista previa textual: Bienvenido.' };
            }
        }
    });

    const response = await worker.fetch(chatRequest('application/json', 'site-editor'), env);
    const body = await response.json();

    assert.equal(response.status, 200);
    assert.match(body.reply, /Vista previa textual/);
    assert.match(call.input.messages[0].content, /No devuelvas HTML, CSS, JavaScript ni codigo ejecutable/);
    assert.match(call.input.messages[0].content, /No afirmes que cambiaste archivos/);
    assert.equal(call.input.max_tokens, 1000);
});

test('chat rejects unsupported modes', async () => {
    const worker = createWorker();
    const response = await worker.fetch(chatRequest('application/json', 'autonomous-deploy'), createEnvironment());

    assert.equal(response.status, 400);
    assert.deepEqual(await response.json(), { error: 'INVALID_MODE' });
});

test('chat rejects non-JSON media types', async () => {
    const worker = createWorker();
    const response = await worker.fetch(chatRequest('application/jsonp'), createEnvironment());

    assert.equal(response.status, 415);
});

test('chat rejects malformed Workers AI responses', async () => {
    const worker = createWorker();
    const env = createEnvironment({
        AI: { run: async () => ({ response: { unexpected: true } }) }
    });
    const response = await worker.fetch(chatRequest(), env);

    assert.equal(response.status, 502);
    assert.deepEqual(await response.json(), { error: 'AI_PROVIDER_INVALID_RESPONSE' });
});
