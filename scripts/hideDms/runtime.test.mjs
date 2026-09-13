import assert from "node:assert/strict";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

const result = await build({
    entryPoints: [new URL("../../src/plugins/hideDms/index.tsx", import.meta.url).pathname.replace(/^\/(\w:)/, "$1")],
    bundle: true, write: false, format: "cjs", platform: "node",
    jsx: "transform", jsxFactory: "h",
    plugins: [{
        name: "discord-fixtures",
        setup(builder) {
            builder.onResolve({ filter: /^@/ }, args => ({ path: args.path, namespace: "fixture" }));
            builder.onResolve({ filter: /\.css(?:\?managed)?$/ }, args => ({ path: args.path, namespace: "css" }));
            builder.onLoad({ filter: /.*/, namespace: "css" }, () => ({ contents: 'export default "hidden-style";' }));
            builder.onLoad({ filter: /.*/, namespace: "fixture" }, () => ({ contents: `
                export default x => x;
                export const Devs = {TwoSa:{}}, IS_MAC = globalThis.isMac;
                export const OptionType = {BOOLEAN: 0}, ServerListRenderPosition = {Above: 0};
                export const definePluginSettings = globalThis.makeSettings;
                export const enableStyle = () => globalThis.hidden = true;
                export const disableStyle = () => globalThis.hidden = false;
                export const addServerListElement = (_, component) => globalThis.buttons.add(component);
                export const removeServerListElement = (_, component) => globalThis.buttons.delete(component);
            ` }));
        }
    }]
});

function fixture(isMac = false) {
    const listeners = new Set();
    const context = vm.createContext({
        module: { exports: {} }, isMac, hidden: false, buttons: new Set(),
        h: (type, props, ...children) => ({ type, props, children }),
        document: {
            addEventListener(type, listener, capture) {
                assert.equal(type, "keydown");
                assert.equal(capture, true);
                listeners.add(listener);
            },
            removeEventListener(type, listener, capture) {
                assert.equal(type, "keydown");
                assert.equal(capture, true);
                listeners.delete(listener);
            }
        },
        makeSettings(def) {
            const store = new Proxy(Object.fromEntries(Object.entries(def).map(([key, value]) => [key, value.default])), {
                set(target, key, value) {
                    target[key] = value;
                    def[key].onChange?.();
                    return true;
                }
            });
            return { store, use: () => store };
        }
    });
    vm.runInContext(result.outputFiles[0].text, context);
    const plugin = context.module.exports.default;
    function key(overrides = {}) {
        const event = {
            code: "KeyH", ctrlKey: !isMac, metaKey: isMac, shiftKey: true,
            altKey: false, repeat: false, isComposing: false, defaultPrevented: false,
            preventDefault() { this.defaultPrevented = true; },
            stopPropagation() {}, ...overrides
        };
        for (const listener of listeners) listener(event);
        return event;
    }
    return { plugin, context, listeners, key };
}

for (const isMac of [false, true]) {
    test(`${isMac ? "macOS" : "Windows/Linux"}: shortcut toggles once and ignores unrelated keys`, () => {
        const { plugin, context, key } = fixture(isMac);
        plugin.start();
        assert.equal(context.hidden, false);
        assert.equal(key().defaultPrevented, true);
        assert.equal(context.hidden, true);
        for (const overrides of [
            { repeat: true }, { isComposing: true }, { defaultPrevented: true },
            { shiftKey: false }, { altKey: true }, { code: "KeyJ" },
            { ctrlKey: isMac, metaKey: !isMac }
        ]) {
            key(overrides);
            assert.equal(context.hidden, true);
        }
        key();
        assert.equal(context.hidden, false);
        plugin.settings.store.shortcut = false;
        assert.equal(key().defaultPrevented, false);
        assert.equal(context.hidden, false);
        plugin.stop();
    });
}

test("button, settings, shutdown and restart agree on the saved visibility", () => {
    const { plugin, context, listeners } = fixture();
    plugin.settings.store.hidden = true;
    assert.equal(context.hidden, false, "settings cannot hide anything while stopped");
    plugin.start();
    assert.equal(context.hidden, true);
    const render = [...context.buttons][0];
    const button = () => render().children[0];
    assert.equal(button().props["aria-pressed"], true);
    button().props.onClick();
    assert.equal(context.hidden, false);
    assert.equal(button().props["aria-pressed"], false);
    button().props.onClick();
    plugin.stop();
    assert.equal(context.hidden, false);
    assert.equal(listeners.size, 0);
    assert.equal(context.buttons.size, 0);
    assert.equal(plugin.settings.store.hidden, true);
    plugin.start();
    assert.equal(context.hidden, true);
    assert.equal(listeners.size, 1);
    assert.equal(context.buttons.size, 1);
    plugin.stop();
});
