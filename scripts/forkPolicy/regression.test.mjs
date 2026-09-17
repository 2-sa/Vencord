import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";

const root = fileURLToPath(new URL("../../", import.meta.url));
const read = file => readFileSync(path.join(root, file), "utf8");

function sourceFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
        const file = path.join(directory, entry.name);
        return entry.isDirectory() ? sourceFiles(file) : /\.(?:[cm]?[jt]sx?|css|html)$/.test(entry.name) ? [file] : [];
    });
}

test("removed service hosts stay absent from shipped source", () => {
    const hosts = /badges\.vencord\.dev|(?:ugc\.)?decor\.fieryflames\.dev|usrbg\.is-hardly\.online/i;
    const offenders = sourceFiles(path.join(root, "src"))
        .filter(file => hosts.test(readFileSync(file, "utf8")))
        .map(file => path.relative(root, file));
    assert.deepEqual(offenders, [], "Upstream restored a removed service; remove its requests before release");
});

test("Decor and USRBG cannot be restored to the plugin registry by an upstream merge", () => {
    for (const plugin of ["decor", "usrbg"]) {
        assert.equal(existsSync(path.join(root, "src/plugins", plugin)), false, `${plugin} must remain removed`);
    }
    const restored = sourceFiles(path.join(root, "src/plugins"))
        .filter(file => /\bname\s*:\s*["'`](?:Decor|USRBG)["'`]/.test(readFileSync(file, "utf8")));
    assert.deepEqual(restored, [], "Removed plugin was restored under another filename");
});

test("CSP allows VenCloud without restoring the wildcard for developer services", () => {
    const csp = read("src/main/csp/index.ts");
    assert.doesNotMatch(csp, /\*\.vencord\.dev/);
    assert.match(csp, /["']api\.vencord\.dev["']\s*:\s*ConnectSrc/);
});

// Render the real settings component with Discord services stubbed. This catches
// the upstream card returning even if its helper or image constants are renamed.
const settingsCode = ts.transpileModule(read("src/components/settings/tabs/vencord/index.tsx"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React }
}).outputText;

for (const donor of [false, true]) {
    for (const contributor of [false, true]) {
        test(`settings omit donation cards (donor=${donor}, contributor=${contributor})`, () => {
            const h = (type, props, ...children) => ({ type, props: props ?? {}, children });
            const exports = {};
            const services = {
                React: { createElement: h },
                useMemo: fn => fn(),
                UserStore: { getCurrentUser: () => ({ id: "fixture-user" }) },
                isDonor: () => donor,
                isPluginDev: () => contributor,
                wrapTab: component => component,
                SpecialCard: "SpecialCard",
                Forms: { FormTitle: "FormTitle", FormText: "FormText" },
                Margins: {},
            };
            vm.runInNewContext(settingsCode, {
                exports,
                require: () => services,
                IS_WEB: false,
                IS_WINDOWS: true,
                IS_DISCORD_DESKTOP: true,
            });
            const tree = exports.default();
            const cards = [];
            function visit(node) {
                if (!node || typeof node !== "object") return;
                if (Array.isArray(node)) return node.forEach(visit);
                if (node.type === "SpecialCard") cards.push(node.props.title);
                visit(node.children);
            }
            visit(tree);
            assert.deepEqual(cards, contributor ? ["Contributions"] : []);
            assert.doesNotMatch(JSON.stringify(tree), /Support the Project|Thank you for donating|supporting the development of Vencord by donating/);
        });
    }
}
