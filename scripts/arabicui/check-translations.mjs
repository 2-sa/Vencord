import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import ts from "typescript";

// Inspect the syntax tree BEFORE JSON.parse can silently discard duplicate keys.
export function validateTranslations(source) {
    JSON.parse(source);
    const tree = ts.parseJsonText("ar.json", source);
    const object = tree.statements[0]?.expression;
    if (!object || !ts.isObjectLiteralExpression(object)) throw new Error("Expected a translation object");
    const seen = new Map();
    const errors = [];
    for (const property of object.properties) {
        if (!ts.isPropertyAssignment(property) || !ts.isStringLiteral(property.name)
            || !ts.isStringLiteral(property.initializer)) {
            errors.push("Translation keys and values must be strings");
            continue;
        }
        const key = property.name.text;
        const normalized = key.replace(/\s+/g, " ").trim();
        const line = tree.getLineAndCharacterOfPosition(property.getStart(tree)).line + 1;
        if (!normalized || !property.initializer.text.trim()) errors.push("Empty translation at line " + line);
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
