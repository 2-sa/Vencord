import assert from "node:assert/strict";
import { test } from "node:test";
import { validateTranslations } from "./check-translations.mjs";

test("rejects exact duplicate keys even with identical translations", () => {
    assert.throws(() => validateTranslations('{"Open":"فتح","Open":"فتح"}'), /duplicates/);
});
test("rejects whitespace-equivalent keys", () => {
    assert.throws(() => validateTranslations('{"Open  Settings":"أ"," Open Settings ":"ب"}'), /duplicates/);
});
test("rejects escape-equivalent keys", () => {
    assert.throws(() => validateTranslations('{"Open":"أ","\\u004fpen":"ب"}'), /duplicates/);
});
test("permits different source phrases with the same Arabic wording", () => {
    assert.equal(validateTranslations('{"Open":"فتح","Launch":"فتح"}'), 2);
});
test("handles escaped quotes and colons in strings", () => {
    assert.equal(validateTranslations('{"Say \\"Hi\\":":"قل مرحبًا:"}'), 1);
});
test("rejects malformed JSON, nested values and empty translations", () => {
    for (const value of ['{"a":', '{"a":{}}', '{"a":""}', '[]']) {
        assert.throws(() => validateTranslations(value));
    }
});
