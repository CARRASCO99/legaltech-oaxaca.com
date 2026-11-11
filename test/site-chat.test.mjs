import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).at(-1);

test('a failed chat request reports the failure and lets the visitor retry', async () => {
    const nodes = {
        chatInput: { value: 'Una pregunta general', focus() {} },
        chatStatus: { textContent: '' },
        chatError: { textContent: '' },
        chatSendButton: { disabled: false, textContent: '' },
        chatMessages: { appendChild() {} }
    };
    const requests = [];
    const context = {
        document: {
            getElementById: id => nodes[id],
            querySelector: () => ({ content: 'https://worker.test/api/chat' }),
            createElement: () => ({ scrollIntoView() {} })
        },
        window: { addEventListener() {} },
        localStorage: { getItem: () => null },
        fetch: async (_url, options) => {
            requests.push(JSON.parse(options.body));
            if (requests.length === 1) throw new Error('offline');
            return { ok: true, json: async () => ({ reply: 'Respuesta de prueba' }) };
        },
        AbortController, setTimeout, clearTimeout,
        console: { error() {} }
    };
    vm.runInNewContext(script, context);
    await context.enviarMensajeChat({ preventDefault() {} });
    assert.match(nodes.chatError.textContent, /No se recibió una respuesta/);
    assert.equal(nodes.chatInput.value, 'Una pregunta general');
    assert.equal(nodes.chatStatus.textContent, 'Servicio de IA no disponible.');
    await context.enviarMensajeChat({ preventDefault() {} });
    assert.equal(requests[1].messages.length, 1);
    assert.equal(nodes.chatStatus.textContent, 'Respuesta recibida.');
    assert.equal(nodes.chatError.textContent, '');
});
