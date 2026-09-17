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

test("translates split login instructions without changing the nested layout", () => {
    const f = fixture();
    const before = f.root.append(new f.TestText("Scan this with the "));
    const bold = f.root.append(new f.TestElement());
    const app = bold.append(new f.TestText("Discord mobile app"));
    const after = f.root.append(new f.TestText(" to log in instantly."));
    f.api.translateTree(f.root);
    assert.equal(before.data, "امسح هذا الرمز باستخدام ");
    assert.equal(app.data, "تطبيق ديسكورد على الهاتف");
    assert.equal(after.data, " لتسجيل الدخول فورًا.");
    assert.equal(app.parentNode, bold);
});

test("translates clip hint around unchanged keyboard keys", () => {
    const f = fixture();
    const before = f.root.append(new f.TestText("Press "));
    const keys = f.root.append(new f.TestElement());
    keys.excluded = true;
    const shortcut = keys.append(new f.TestText("ALT C"));
    const after = f.root.append(new f.TestText(" to capture a clip while gaming."));
    f.api.translateTree(f.root);
    assert.equal(before.data, "اضغط ");
    assert.equal(shortcut.data, "ALT C");
    assert.equal(after.data, " لالتقاط مقطع أثناء اللعب.");
});

test("translates passkey login and profile prompts from the shipped dictionary", () => {
    const f = fixture();
    for (const [label, expected] of [
        ["Or sign in with a passkey", "أو سجّل الدخول بمفتاح مرور"],
        ["What video game item would you be?", "لو كنت عنصرًا في لعبة فيديو، ماذا ستكون؟"],
        ["Your vibe in five words", "صف شخصيتك بخمس كلمات"]
    ]) {
        const node = f.root.append(new f.TestText(label));
        f.api.translateTree(node);
        assert.equal(node.data, expected);
    }
});
test("translates anniversary counts and the Nitro trial offer", () => {
    const f = fixture();
    for (const count of [1, 2, 12]) {
        const node = f.root.append(new f.TestText(`Friend Anniversaries — ${count}`));
        f.api.translateTree(node);
        assert.equal(node.data, `ذكريات الصداقة — ${count}`);
    }
    const offer = f.root.append(new f.TestText("Send three friends a 2-week Nitro trial and become the MVP of the group chat."));
    f.api.translateTree(offer);
    assert.equal(offer.data, "أرسل تجربة نيترو لمدة أسبوعين إلى ثلاثة أصدقاء وكن نجم المحادثة الجماعية.");
});

test("translates game activity counts around the original bold game name", () => {
    for (const count of [1, 2, 5]) {
        const f = fixture();
        const prefix = `You may also be sharing activity from ${count} ${count === 1 ? "game" : "games"} you play, including`;
        const before = f.root.append(new f.TestText(prefix + " "));
        const bold = f.root.append(new f.TestElement());
        const game = bold.append(new f.TestText("VALORANT"));
        const after = f.root.append(new f.TestText(". Restrict sharing on a game-by-game basis."));
        f.api.translateTree(f.root);
        assert.equal(before.data, `قد تشارك نشاطك من الألعاب التي تلعبها (العدد: ${count})، ومنها `);
        assert.equal(game.data, "VALORANT");
        assert.equal(game.parentNode, bold);
        assert.equal(after.data, ". يمكنك تقييد المشاركة لكل لعبة على حدة.");
        const whole = f.root.append(new f.TestText(prefix + " VALORANT. Restrict sharing on a game-by-game basis."));
        f.api.translateTree(whole);
        assert.equal(whole.data, before.data + game.data + after.data);
    }
});

test("translates last-played durations as whole labels and split emphasized text", () => {
    const f = fixture();
    for (const [duration, expected] of [
        ["a day ago", "قبل يوم"], ["2 days ago", "قبل يومين"],
        ["9 days ago", "قبل 9 أيام"], ["12 days ago", "قبل 12 يومًا"],
        ["an hour ago", "قبل ساعة"], ["3 hours ago", "قبل 3 ساعات"],
        ["a minute ago", "قبل دقيقة"], ["2 weeks ago", "قبل أسبوعين"],
        ["3 months ago", "قبل 3 أشهر"], ["a year ago", "قبل سنة"]
    ]) {
        const whole = f.root.append(new f.TestText(`Last played ${duration}`));
        const label = f.root.append(new f.TestText("Last played "));
        const bold = f.root.append(new f.TestElement());
        const time = bold.append(new f.TestText(duration));
        f.api.translateTree(f.root);
        assert.equal(whole.data, `آخر لعب ${expected}`);
        assert.equal(label.data + time.data, whole.data);
        assert.equal(time.parentNode, bold);
    }
});

test("translates activity privacy description while retaining the game name", () => {
    const f = fixture();
    const game = f.root.append(new f.TestText("VALORANT"));
    const description = f.root.append(new f.TestText("Control who sees activity information from games and connected apps I use."));
    f.api.translateTree(f.root);
    assert.equal(game.data, "VALORANT");
    assert.equal(description.data, "تحكّم في من يمكنه رؤية معلومات نشاطك في الألعاب والتطبيقات المرتبطة التي تستخدمها.");
});

test("translates group DM member limits", () => {
    const f = fixture();
    for (const [count, expected] of [
        [10, "يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى 10 أعضاء."],
        [20, "يمكن أن تضم المحادثات الخاصة الجماعية ما يصل إلى 20 عضوًا."]
    ]) {
        const node = f.root.append(new f.TestText(`Group DMs can have up to ${count} members.`));
        f.api.translateTree(node);
        assert.equal(node.data, expected);
    }
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
