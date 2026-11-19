import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const script = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1]).filter(Boolean).at(-1);

function createPage(fetch) {
    const nodes = {};
    for (const id of ['siteAssistantInput', 'siteAssistantStatus', 'siteAssistantError',
        'siteAssistantSendButton', 'siteAssistantClearButton', 'siteAssistantMessages',
        'siteProposalReview', 'siteProposalPreview', 'siteProposalApprove',
        'siteApprovedDraftPanel', 'siteApprovedDraft']) {
        const classes = new Set(['hidden']);
        nodes[id] = {
            value: '', textContent: '', disabled: false, children: [],
            classList: { add: value => classes.add(value), remove: value => classes.delete(value), contains: value => classes.has(value) },
            appendChild(child) { this.children.push(child); },
            replaceChildren() { this.children = []; },
            focus() {}
        };
    }
    const context = {
        document: {
            getElementById: id => nodes[id],
            querySelector: () => ({ content: 'https://worker.test/api/chat' }),
            createElement: () => ({ scrollIntoView() {} })
        },
        window: { addEventListener() {} },
        fetch, AbortController, setTimeout, clearTimeout,
        console: { error() {} }
    };
    vm.runInNewContext(script, context);
    return { nodes, context };
}

test('ideas send the site-editor contract and approval stays a local preview', async () => {
    let payload;
    const { nodes, context } = createPage(async (_url, options) => {
        payload = JSON.parse(options.body);
        return { ok: true, json: async () => ({ mode: 'site-editor', reply: '<b>Propuesta</b>' }) };
    });
    nodes.siteAssistantInput.value = 'Mejorar el inicio';
    await context.enviarIdeaAsistenteSitio({ preventDefault() {} });
    assert.equal(payload.mode, 'site-editor');
    assert.deepEqual(payload.messages, [{ role: 'user', content: 'Mejorar el inicio' }]);
    assert.equal(nodes.siteProposalPreview.textContent, '<b>Propuesta</b>');
    assert.equal(nodes.siteProposalReview.classList.contains('hidden'), false);
    context.aprobarPropuestaSitio();
    assert.equal(nodes.siteApprovedDraft.textContent, '<b>Propuesta</b>');
    assert.match(nodes.siteAssistantStatus.textContent, /No se editaron archivos ni se publicó/);
    context.limpiarAsistenteSitio();
    assert.equal(nodes.siteApprovedDraftPanel.classList.contains('hidden'), true);
    assert.equal(nodes.siteApprovedDraft.textContent, '');
});

test('unconfirmed and failed responses preserve the idea for retry', async () => {
    let calls = 0;
    const { nodes, context } = createPage(async () => {
        calls++;
        if (calls === 1) return { ok: true, json: async () => ({ reply: 'Respuesta genérica' }) };
        throw new Error('offline');
    });
    nodes.siteAssistantInput.value = 'Una idea';
    await context.enviarIdeaAsistenteSitio({ preventDefault() {} });
    assert.match(nodes.siteAssistantError.textContent, /no confirma el modo/);
    assert.equal(nodes.siteAssistantInput.value, 'Una idea');
    assert.equal(nodes.siteProposalReview.classList.contains('hidden'), true);
    await context.enviarIdeaAsistenteSitio({ preventDefault() {} });
    assert.match(nodes.siteAssistantError.textContent, /intenta de nuevo/);
    assert.equal(nodes.siteAssistantInput.value, 'Una idea');
    assert.equal(nodes.siteAssistantSendButton.disabled, false);
});

test('a failed follow-up cannot approve an earlier proposal as the new result', async () => {
    let calls = 0;
    const { nodes, context } = createPage(async () => {
        calls++;
        if (calls === 1) return { ok: true, json: async () => ({ mode: 'site-editor', reply: 'Primera propuesta' }) };
        throw new Error('offline');
    });
    nodes.siteAssistantInput.value = 'Primera idea';
    await context.enviarIdeaAsistenteSitio({ preventDefault() {} });
    context.aprobarPropuestaSitio();
    nodes.siteAssistantInput.value = 'Segunda idea';
    await context.enviarIdeaAsistenteSitio({ preventDefault() {} });
    assert.equal(nodes.siteProposalReview.classList.contains('hidden'), true);
    assert.equal(nodes.siteApprovedDraftPanel.classList.contains('hidden'), true);
    context.aprobarPropuestaSitio();
    assert.equal(nodes.siteApprovedDraftPanel.classList.contains('hidden'), true);
    assert.equal(nodes.siteAssistantInput.value, 'Segunda idea');
});
