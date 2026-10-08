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

## Scheduling and memory

Initial translation, inserted trees, changed text/attributes and detached-tree
cleanup use resumable jobs. Each animation frame processes at most 200 steps and
yields when its elapsed work reaches a 4 ms target. This is a cooperative target,
not a hard frame-time guarantee: queue collection and a single step can take
longer. Large pages may therefore finish translating over several frames.

Traversal snapshots children and rechecks connectivity and excluded ancestors on
each step. This keeps removals, moves into editors and shutdown safe between
frames. Attribute mutations process only the changed attribute. Insertions into
excluded message/editor content do not create translation jobs. Empty and
plaintext-only contenteditable elements are protected too.

The dynamic cache retains at most 1024 entries, each with an input of at most 512
characters; longer strings still translate but are not cached. Restoration
records for externally changed/untranslated attributes and text are released.
Stopping disconnects the observer, cancels the frame, discards pending jobs and
restores connected translations whose values were not changed externally.

Deterministic regressions cover 2500 text nodes split across frames, an early
time-budget yield, 1000 excluded insertions with no scheduled frame, changed
attributes, removal cleanup, and stopping an unfinished traversal. These are
operation-count and correctness checks, not measured Discord FPS or RAM usage.

## Dictionary audit

Run `node scripts/arabicui/audit-translations.mjs` for the key count, case and
apostrophe variant conflicts, and groups sharing an Arabic value. Keep valid
English variants: Discord may use each spelling on a different surface.
`copy.test.mjs` checks that these source variants do not drift in Arabic wording.
Shared Arabic values across distinct source phrases are reported, not deleted.
