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

This change intentionally keeps the existing frame-based scheduler. Time-sliced
tree traversal should follow profiling in Discord and tests for a tree changing
between slices; a guessed performance percentage is not a benchmark.
