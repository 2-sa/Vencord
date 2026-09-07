import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import vm from "node:vm";
import { build } from "esbuild";

// Bundle the production implementation; stub Discord imports, not translation logic.
const result = await build({
    stdin: {
        contents: readFileSync(new URL("../../src/plugins/arabicDiscord/index.tsx", import.meta.url), "utf8")
            + "\nexport { translateTree, forgetTree, restoreTranslations, handleMutations, flushMutations, translatedTextNodes, translatedAttributes, pendingNodes, pendingRoots };",
        resolveDir: new URL("../../src/plugins/arabicDiscord", import.meta.url).pathname.replace(/^\/(\w:)/, "$1"),
        loader: "tsx"
    },
    bundle: true, write: false, format: "cjs", platform: "node",
    plugins: [{
        name: "discord-fixtures",
        setup(builder) {
            builder.onResolve({ filter: /^@/ }, args => ({ path: args.path, namespace: "discord" }));
            builder.onLoad({ filter: /.*/, namespace: "discord" }, () => ({
                contents: "export default x=>x; export const Link=null, Devs={TwoSa:{}}, Forms={};"
            }));
            builder.onLoad({ filter: /ar\.json$/ }, () => ({
                contents: '{"Open":"فتح","Close":"إغلاق"}', loader: "json"
            }));
        }
    }]
});

function fixture() {
    class TestNode {
        static TEXT_NODE = 3;
        parentNode = null;
        children = [];
        connected = false;
        get isConnected() { return this.connected || Boolean(this.parentNode?.isConnected); }
        get parentElement() { return this.parentNode instanceof TestElement ? this.parentNode : null; }
        append(node) { node.parentNode = this; this.children.push(node); return node; }
    }
    class TestElement extends TestNode {
        excluded = false;
        attrs = new Map();
        matches() { return this.excluded; }
        closest() { return this.excluded ? this : this.parentElement?.closest(); }
        getAttribute(key) { return this.attrs.get(key) ?? null; }
        setAttribute(key, value) { this.attrs.set(key, value); }
    }
    class TestText extends TestNode {
        nodeType = 3;
        constructor(data) { super(); this.data = data; }
    }
    let frames = 0;
    let visits = 0;
    const document = {
        createTreeWalker(root, _mask, filter) {
            const pending = [...root.children];
            return { nextNode() {
                while (pending.length) {
                    const node = pending.shift();
                    visits++;
                    if (filter?.acceptNode(node) === 2) continue;
                    pending.unshift(...node.children);
                    return node;
                }
                return null;
            } };
        }
    };
    const context = {
        module: { exports: {} }, document,
        Node: TestNode, Element: TestElement, Text: TestText,
        NodeFilter: { SHOW_ELEMENT: 1, SHOW_TEXT: 4, FILTER_REJECT: 2, FILTER_ACCEPT: 1 },
        requestAnimationFrame: () => ++frames, cancelAnimationFrame: () => {}
    };
    vm.runInNewContext(result.outputFiles[0].text, context);
    const root = new TestElement();
    root.connected = true;
    return { api: context.module.exports, root, TestElement, TestText, frames: () => frames, visits: () => visits };
}

test("translates standalone inserted text and restores original whitespace", () => {
    const f = fixture(), text = f.root.append(new f.TestText(" Open "));
    f.api.translateTree(text);
    assert.equal(text.data, " فتح ");
    f.api.restoreTranslations();
    assert.equal(text.data, " Open ");
});
test("moving a translated subtree retains restoration records", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.api.forgetTree(f.root);
    f.api.restoreTranslations();
    assert.equal(text.data, "Open");
});
test("detached subtrees release restoration references", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.root.connected = false;
    f.api.forgetTree(f.root);
    assert.equal(f.api.translatedTextNodes.has(text), false);
});
test("self-generated text and attribute mutations do not schedule another frame", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.root.setAttribute("title", "Open");
    f.api.translateTree(f.root);
    f.api.handleMutations([
        { type: "characterData", target: text },
        { type: "attributes", target: f.root, attributeName: "title" }
    ]);
    assert.equal(f.frames(), 0);
});
test("external updates still translate and restore the new source value", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    text.data = "Close";
    f.api.handleMutations([{ type: "characterData", target: text }]);
    assert.equal(f.frames(), 1);
    f.api.flushMutations();
    assert.equal(text.data, "إغلاق");
    f.api.restoreTranslations();
    assert.equal(text.data, "Close");
});
test("excluded user content is unchanged and does not schedule text processing", () => {
    const f = fixture();
    f.root.excluded = true;
    const text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    f.api.handleMutations([{ type: "characterData", target: text }]);
    assert.equal(text.data, "Open");
    assert.equal(f.frames(), 0);
});
test("nested added roots are walked once", () => {
    const f = fixture(), child = f.root.append(new f.TestElement());
    const text = child.append(new f.TestText("Open"));
    f.api.pendingRoots.add(f.root);
    f.api.pendingRoots.add(child);
    f.api.pendingNodes.add(text);
    f.api.flushMutations();
    assert.equal(f.visits(), 2);
    assert.equal(text.data, "فتح");
});
test("stop cancels pending work and preserves externally changed text", () => {
    const f = fixture(), text = f.root.append(new f.TestText("Open"));
    f.api.translateTree(f.root);
    text.data = "User change";
    f.api.pendingNodes.add(text);
    f.api.default.stop();
    assert.equal(text.data, "User change");
    assert.equal(f.api.pendingNodes.size, 0);
    assert.equal(f.api.translatedTextNodes.size, 0);
});
