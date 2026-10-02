# ArabicUI regression checks

Run `pnpm testArabicUI`. This is also the first step of `pnpm test` and
`pnpm testWeb`, so existing CI and release jobs invoking those commands fail
before building when the dictionary contains duplicate keys.

The dictionary validator reads JSON syntax before parsing can discard duplicate
properties. It rejects exact duplicates, escaped equivalents and keys equivalent
after whitespace normalization (the same normalization used at runtime).
Different English keys may legitimately share the same Arabic value.

Runtime tests bundle the actual plugin with Discord imports replaced by fixtures.
A small DOM model tests inserted text roots, mutation filtering, nested roots,
excluded content, subtree disposal, moved-node restoration and shutdown.
These tests do not replace an actual Discord session or measure real frame time.

## Arabic copy conventions

Review Arabic values without changing the English lookup keys. Keep recognizable
product names, commands, URLs and interpolation placeholders intact. Use concise
Arabic verbs for instructions, verbal nouns for action buttons and direct passive
verbs for completed actions. Avoid auxiliary phrases such as `تم إرسال`,
`بشكل تلقائي` and `الخاص بك` when a direct Arabic construction conveys the meaning.

`copy.test.mjs` checks recurring copy regressions and placeholder preservation
throughout the dictionary. Runtime tests cover the six Arabic plural categories,
including singulars and duals without a redundant numeral. Callers supply dual
forms appropriate to the sentence (e.g. `عضوان` in a label, `عضوين` after `إلى`).

This change intentionally keeps the existing frame-based scheduler. Time-sliced
tree traversal should follow profiling in Discord and tests for a tree changing
between slices; a guessed performance percentage is not a benchmark.
