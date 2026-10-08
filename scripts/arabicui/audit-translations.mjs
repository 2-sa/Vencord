import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { validateTranslations } from "./check-translations.mjs";

// Case/apostrophe variants remain separate runtime keys. Report conflicts for
// editorial review; identical Arabic values for unrelated keys are legitimate.
export function auditTranslations(source) {
    const count = validateTranslations(source);
    const variants = new Map(), values = new Map();
    for (const [key, value] of Object.entries(JSON.parse(source))) {
        const normalized = key.replace(/\s+/g, " ").trim().replace(/[’‘]/g, "'").toLowerCase();
        if (!variants.has(normalized)) variants.set(normalized, []);
        variants.get(normalized).push({ key, value });
        if (!values.has(value)) values.set(value, []);
        values.get(value).push(key);
    }
    const groups = [...variants.values()].filter(group => group.length > 1);
    return {
        count,
        sourceVariantGroups: groups.length,
        conflictingVariants: groups.filter(group => new Set(group.map(entry => entry.value)).size > 1),
        sharedArabicValueGroups: [...values.values()].filter(keys => keys.length > 1).length
    };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const source = readFileSync(new URL("../../src/plugins/arabicDiscord/ar.json", import.meta.url), "utf8");
    console.log(JSON.stringify(auditTranslations(source), null, 2));
}
