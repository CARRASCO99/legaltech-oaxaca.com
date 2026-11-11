import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const source = await readFile(new URL('../app-install.js', import.meta.url), 'utf8');

function createPage({ standalone = false, register = async () => ({}) } = {}) {
    const listeners = {};
    const buttonListeners = {};
    const button = {
        attributes: {},
        setAttribute(name, value) { this.attributes[name] = value; },
        addEventListener(name, callback) { buttonListeners[name] = callback; }
    };
    const help = {
        textContent: '',
        hidden: true,
        classList: { remove() { help.hidden = false; } }
    };
    const context = {
        document: { getElementById(id) { return id === 'installAppButton' ? button : help; } },
        navigator: { serviceWorker: { register } },
        window: {
            isSecureContext: true,
            matchMedia: () => ({ matches: standalone }),
            addEventListener(name, callback) { listeners[name] = callback; }
        },
        console
    };
    vm.runInNewContext(source, context);
    return { listeners, buttonListeners, button, help };
}

test('offers browser-specific instructions when no install prompt is available', async () => {
    const page = createPage();
    await page.buttonListeners.click();
    assert.match(page.help.textContent, /Safari/);
    assert.match(page.help.textContent, /Android/);
    assert.equal(page.help.hidden, false);
    assert.equal(page.button.attributes['aria-expanded'], 'true');
});

test('invokes the captured installation prompt and handles cancellation', async () => {
    const page = createPage();
    let prevented = false;
    let prompted = false;
    page.listeners.beforeinstallprompt({
        preventDefault() { prevented = true; },
        async prompt() { prompted = true; },
        userChoice: Promise.resolve({ outcome: 'dismissed' })
    });
    await page.buttonListeners.click();
    assert.equal(prevented, true);
    assert.equal(prompted, true);
    assert.match(page.help.textContent, /canceló/);
});

test('acknowledges an installed app and registers the service worker', async () => {
    let registered;
    const page = createPage({ standalone: true, register: async path => { registered = path; } });
    await page.buttonListeners.click();
    assert.match(page.help.textContent, /ya estás usando/i);
    page.listeners.load();
    assert.equal(registered, './service-worker.js');
    page.listeners.appinstalled();
    assert.match(page.help.textContent, /App instalada/);
});
