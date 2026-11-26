import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

let ts = null;
try {
    ts = (await import("typescript")).default;
} catch {
    // Optional when node_modules is not installed; fall back to the built-in JSON scanner.
}

function scanJsonEntries(source) {
    const entries = [];
    let i = 0;
    let line = 1;
    const len = source.length;

    const skipWs = () => {
        while (i < len) {
            const ch = source[i];
            if (ch === "\n") line++;
            if (ch === " " || ch === "\t" || ch === "\r" || ch === "\n") i++;
            else break;
        }
    };

    const readString = () => {
        const start = i++;
        while (i < len) {
            const ch = source[i++];
            if (ch === "\\") {
                if (i < len) {
                    if (source[i] === "\n") line++;
                    i++;
                }
            } else if (ch === '"') {
                return JSON.parse(source.slice(start, i));
            } else if (ch === "\n") {
                line++;
            }
        }
        throw new Error("Unterminated string literal");
    };

    const skipValue = () => {
        skipWs();
        if (source[i] === '"') {
            readString();
            return;
        }
        let depth = 0;
        while (i < len) {
            const ch = source[i];
            if (ch === '"') {
                readString();
                if (depth === 0) return;
                continue;
            }
            if (ch === "{" || ch === "[") depth++;
            else if (ch === "}" || ch === "]") {
                if (depth === 0) return;
                depth--;
                if (depth === 0) { i++; return; }
            } else if (ch === "," && depth === 0) {
                return;
            } else if (ch === "\n") {
                line++;
            }
            i++;
        }
    };

    skipWs();
    if (source[i] !== "{") throw new Error("Expected a translation object");
    i++;

    while (i < len) {
        skipWs();
        if (source[i] === "}") break;
        if (source[i] === ",") { i++; continue; }
        const entryLine = line;
        if (source[i] !== '"') {
            skipValue();
            entries.push({ isStringPair: false, line: entryLine, key: "", value: "" });
            continue;
        }
        const key = readString();
        skipWs();
        if (source[i] === ":") i++;
        skipWs();
        if (source[i] !== '"') {
            skipValue();
            entries.push({ isStringPair: false, line: entryLine, key: "", value: "" });
            continue;
        }
        const value = readString();
        entries.push({ isStringPair: true, line: entryLine, key, value });
    }
    return entries;
}

function extractEntries(source) {
    if (!ts) return scanJsonEntries(source);
    const tree = ts.parseJsonText("ar.json", source);
    const object = tree.statements[0]?.expression;
    if (!object || !ts.isObjectLiteralExpression(object)) throw new Error("Expected a translation object");
    return object.properties.map(property => {
        const line = tree.getLineAndCharacterOfPosition(property.getStart(tree)).line + 1;
        if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)
            || !ts.isStringLiteral(property.initializer)) {
            return { isStringPair: false, line, key: "", value: "" };
        }
        return { isStringPair: true, line, key: property.name.text, value: property.initializer.text };
    });
}

// Inspect the syntax tree BEFORE JSON.parse can silently discard duplicate keys.
export function validateTranslations(source) {
    const parsed = JSON.parse(source);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        throw new Error("Expected a translation object");
    }
    const entries = extractEntries(source);
    const seen = new Map();
    const errors = [];
    for (const entry of entries) {
        if (!entry.isStringPair) {
            errors.push("Translation keys and values must be strings");
            continue;
        }
        const { key, value, line } = entry;
        const normalized = key.replace(/\s+/g, " ").trim();
        if (!normalized || !value.trim()) errors.push("Empty translation at line " + line);
        if (normalized && !/[A-Za-z]/.test(normalized)) errors.push("Key lacks ASCII letters at line " + line);
        if (/[\u0600-\u06FF]/.test(key)) errors.push("Key contains Arabic characters at line " + line);
        if (seen.has(normalized)) {
            errors.push(JSON.stringify(key) + " at line " + line + " duplicates line " + seen.get(normalized));
        } else {
            seen.set(normalized, line);
        }
    }
    if (errors.length) throw new Error(errors.join("\n"));
    return seen.size;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const source = readFileSync(new URL("../../src/plugins/arabicDiscord/ar.json", import.meta.url), "utf8");
    console.log("ArabicUI: validated " + validateTranslations(source) + " unique translation keys.");
}
