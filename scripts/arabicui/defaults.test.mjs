import assert from "node:assert/strict";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";

const result = await build({
    stdin: {
        contents: 'export * from "./src/utils/arabicUiDefaults.ts"; export { SettingsStore } from "./src/shared/SettingsStore.ts";',
        resolveDir: fileURLToPath(new URL("../../", import.meta.url)),
        loader: "ts"
    },
    bundle: true, write: false, format: "esm", platform: "node"
});
const { applyArabicUiDefaultsV1, ARABIC_UI_DEFAULTS_V1, SettingsStore } = await import(
    "data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64")
);
const desktop = Object.fromEntries(ARABIC_UI_DEFAULTS_V1.map(name => [name, {}]));

test("rollout enables the agreed plugins and preserves all other settings", () => {
    const state = {
        plugins: Object.fromEntries(ARABIC_UI_DEFAULTS_V1.map(name => [name, { enabled: false, isFavorite: true }])),
        themeLinks: ["custom-theme"],
    };
    state.plugins.HideDMs.hidden = false;
    state.plugins.ImageZoom = { enabled: false };
    state.plugins.ArabicUI = { enabled: false };
    applyArabicUiDefaultsV1(state, desktop);
    for (const name of ARABIC_UI_DEFAULTS_V1) {
        assert.equal(state.plugins[name].enabled, true);
        assert.equal(state.plugins[name].isFavorite, true);
    }
    assert.equal(state.plugins.HideDMs.hidden, false);
    assert.equal(state.plugins.ImageZoom.enabled, false);
    assert.equal(state.plugins.ArabicUI.enabled, false);
    assert.deepEqual(state.themeLinks, ["custom-theme"]);
});

test("saved migration survives restart without overriding subsequent user choices or writing again", () => {
    const store = new SettingsStore({ plugins: {} });
    let saved;
    store.addGlobalChangeListener(data => { saved = JSON.stringify(data); });
    applyArabicUiDefaultsV1(store.store, desktop);
    assert.equal(JSON.parse(saved).arabicUiDefaultsV1Applied.length, ARABIC_UI_DEFAULTS_V1.length);
    for (const name of ARABIC_UI_DEFAULTS_V1) store.store.plugins[name].enabled = false;

    const restored = new SettingsStore(JSON.parse(saved));
    let writes = 0;
    restored.addGlobalChangeListener(() => writes++);
    applyArabicUiDefaultsV1(restored.store, desktop);
    for (const name of ARABIC_UI_DEFAULTS_V1) assert.equal(restored.store.plugins[name].enabled, false);
    assert.equal(writes, 0);
});

test("browser skips desktop-only plugins and migrates them once when available later", () => {
    const browser = { ...desktop };
    delete browser.YoutubeAdblock;
    const state = { plugins: {} };
    applyArabicUiDefaultsV1(state, browser);
    assert.equal(state.plugins.YoutubeAdblock, undefined);
    assert.equal(state.arabicUiDefaultsV1Applied.includes("YoutubeAdblock"), false);
    state.plugins.ReviewDB.enabled = false;
    applyArabicUiDefaultsV1(state, desktop);
    assert.equal(state.plugins.YoutubeAdblock.enabled, true);
    assert.equal(state.plugins.ReviewDB.enabled, false);
    state.plugins.YoutubeAdblock.enabled = false;
    applyArabicUiDefaultsV1(state, desktop);
    assert.equal(state.plugins.YoutubeAdblock.enabled, false);
});
