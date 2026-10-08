import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL("../../src/plugins/rtl/index.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS }
}).outputText;

function loadPlugin(initialDirection = null, failEnable = false) {
    let direction = initialDirection;
    const calls = [];
    const styles = {
        enableStyle() {
            if (failEnable) throw new Error("Style unavailable");
            calls.push("enable");
        },
        disableStyle() { calls.push("disable"); }
    };
    const context = {
        exports: {},
        document: {
            documentElement: {
                getAttribute: () => direction,
                setAttribute: (_, value) => { direction = value; },
                removeAttribute: () => { direction = null; }
            }
        },
        require(id) {
            if (id === "@api/Styles") return styles;
            if (id === "@utils/constants") return { Devs: { TwoSa: {} } };
            if (id === "@utils/types") return plugin => plugin;
            if (id === "./style.css?managed") return "rtl-style";
            throw new Error(`Unexpected import: ${id}`);
        }
    };
    vm.runInNewContext(compiled, context);
    return {
        plugin: context.exports.default,
        calls,
        get direction() { return direction; },
        set direction(value) { direction = value; }
    };
}

test("enabling twice still restores the original document direction", () => {
    for (const direction of [null, "ltr", "auto", "rtl"]) {
        const runtime = loadPlugin(direction);
        runtime.plugin.start();
        runtime.plugin.start();
        assert.equal(runtime.direction, "rtl");
        runtime.plugin.stop();
        assert.equal(runtime.direction, direction);
        assert.deepEqual(runtime.calls, ["enable", "disable"]);
    }
});

test("stopping an inactive plugin does not remove someone else's RTL direction", () => {
    const runtime = loadPlugin("rtl");
    runtime.plugin.stop();
    assert.equal(runtime.direction, "rtl");
    assert.deepEqual(runtime.calls, []);
});

test("a direction changed by another component while active is preserved", () => {
    const runtime = loadPlugin("ltr");
    runtime.plugin.start();
    runtime.direction = "auto";
    runtime.plugin.stop();
    assert.equal(runtime.direction, "auto");
    assert.deepEqual(runtime.calls, ["enable", "disable"]);
});

test("repeated enable and disable cycles restore the direction of each cycle", () => {
    const runtime = loadPlugin();
    runtime.plugin.start();
    runtime.plugin.stop();
    runtime.plugin.stop();
    runtime.direction = "ltr";
    runtime.plugin.start();
    runtime.plugin.stop();
    assert.equal(runtime.direction, "ltr");
    assert.deepEqual(runtime.calls, ["enable", "disable", "enable", "disable"]);
});

test("a failed stylesheet load does not leave the application mirrored", () => {
    const runtime = loadPlugin("ltr", true);
    assert.throws(() => runtime.plugin.start(), /Style unavailable/);
    assert.equal(runtime.direction, "ltr");
    runtime.plugin.stop();
    assert.deepEqual(runtime.calls, []);
});

test("submenu placement follows plugin enable and disable without forcing offscreen coordinates", () => {
    const runtime = loadPlugin("ltr");
    assert.equal(runtime.plugin.getSubmenuPlacement(), "right-start");
    runtime.plugin.start();
    assert.equal(runtime.plugin.getSubmenuPlacement(), "left-start");
    runtime.plugin.stop();
    assert.equal(runtime.plugin.getSubmenuPlacement(), "right-start");
});

test("both submenu render paths change placement while retaining Discord edge handling", () => {
    const { plugin } = loadPlugin();
    const fixture = 'submenuPaddingContainer;({placement:"right-start",autoFlip:!0,viewportPadding:48});({placement:"right-start",autoFlip:!0,shiftPadding:8})';
    const replacement = plugin.patches[0].replacement;
    const patched = fixture.replace(replacement.match, replacement.replace);
    assert.equal((patched.match(/getSubmenuPlacement\(\)/g) || []).length, 2);
    assert.ok(patched.includes("autoFlip:!0,viewportPadding:48"));
    assert.ok(patched.includes("autoFlip:!0,shiftPadding:8"));
    assert.ok(!patched.includes('placement:"right-start"'));
});
