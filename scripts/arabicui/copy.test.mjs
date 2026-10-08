import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { auditTranslations } from "./audit-translations.mjs";

const translations = JSON.parse(readFileSync(new URL("../../src/plugins/arabicDiscord/ar.json", import.meta.url), "utf8"));

test("Arabic UI copy avoids recurring auxiliary verbs and translation calques", () => {
    const discouraged = [
        /(?:^|[\s،؛.!؟])(?:تم|تمت|يتم|تتم|سيتم|ستتم)\s/u,
        /(?:^|\s)(?:يرجى|يُرجى|الرجاء|للقيام بذلك|من خلال|يقوم ب|قم ب)\s/u,
        /(?:بشكل|بصورة)\s+(?:تلقائي|مؤقت|نهائي|مستمر|منفصل)/u,
        /(?:الخاص|الخاصة)\s+(?:بك|بهم|بها|بي)(?=\s|[،.!؟]|$)/u
    ];
    const violations = Object.entries(translations)
        .filter(([, value]) => discouraged.some(pattern => pattern.test(value)))
        .map(([key, value]) => `${key}: ${value}`);
    assert.deepEqual(violations, [], violations.join("\n"));
});

test("editorial changes preserve interpolation placeholders", () => {
    const placeholders = value => [...value.matchAll(/\{\{?\w+\}?\}/g)].map(match => match[0]).sort();
    for (const [key, value] of Object.entries(translations)) {
        assert.deepEqual(placeholders(value), placeholders(key), `Placeholders in ${key}`);
    }
});

test("case and apostrophe variants keep consistent Arabic copy", () => {
    assert.deepEqual(auditTranslations(JSON.stringify(translations)).conflictingVariants, []);
});
