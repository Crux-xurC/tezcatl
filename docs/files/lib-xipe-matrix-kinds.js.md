# `lib/xipe/matrix-kinds.js`

The kinds of table `matrix.html` shows, the pure part: the built-in adapters named and described, two kinds that show an answer as it is
(`json:`, `xipe_raw:`), and kinds declared as data (`matrix_kinds/<name>.json`, `~work/matrix_kinds/<name>.json`).

**Decisions homed here**: [D-matrix-raw](#d-matrix-raw)

**Takes part in**: [D-matrix-shell](lib-xipe-matrix-grid.js.md#d-matrix-shell), [D-references](lib-skin-recv-refs.js.md#d-references)

<a id="d-matrix-raw"></a>

## D-matrix-raw — a table with no adapter is shown as it is, and an adapter can be declared as data

**Decided** (2026-11-26, crux): besides the adapters written in code (`xipe`, `xipe_rows`, `xipe_classes`, `given`, `demo`), `matrix.html`
shows

- **`json:<path>`** — a JSON file read through the relay's `/fs/read` (`~work/…` or a path from the FS root)
- **`xipe_raw:<method>[?k=v&…]`** — the answer of a Xipe Totec method, **only one that changes nothing**: before calling it, the table asks
  Xipe Totec's `method/list` and refuses a method that writes the Book, asks to confirm or runs the REPL (`route` other than `dispatch`).
  A query's value is read as JSON where it reads as JSON; `…_ids` and `args` split at commas
- **a declared kind `<name>:all`** — `~work/matrix_kinds/<name>.json` (yours, looked at first; no index) or `matrix_kinds/<name>.json`
  (shipped, named in `matrix_kinds/index.json`). A declaration names its `source` (`{"xipe": "<method>", "params"}` or `{"file"}`), and
  may name `from` (the key holding the array), `id` (the key whose value is a row's id), `ids` (what those ids are, said by `radar`:
  `"node"` → `(node ids)`), `type` (the row type `radar` says), `columns` (keys, or `{key, label}`), `place` (`{path, line}` for `g d`;
  a Xipe Totec source's path is from the project's root, put under the FS root by `lib/xipe/xipe-place.js`). Shipped: `cards` (`card/list`
  with node ids — `v`, `radar`, then `effect/set id=@ …`)

"As it is" is structure, never text: the items are the answer when it is an array, else the one array an object holds (or `from`), else
the object's keys as rows (`key`, `value`). Every key met is a column; a cell is the value as text (an object or array as JSON). A row's id
is the declared key's value when every item has a different one, else its position (`r0`, `r1` …) — colours and selection are kept by id,
so a table whose ids are positions keeps them only as long as its order does.

`matrix save-kind <name>` writes the table shown (as it is, or a declared one) as a declaration, `~work/matrix_kinds/<name>.json`, never
over one there (`absent`); the columns are the ones shown, `id` is `id` when it holds, `place` is `path`/`line` when the items have them.
`matrix kinds` (a matrix_set's line, the frame's input line) lists the built-in kinds with what their ref is, then the declared ones with
where they are. `radar` says what the ids are when the table says (`xipe_rows`: `calc row`, `xipe_classes`: `node`, a declaration's
`ids`; D-references).

**Why**: before, a table needed an adapter written in code, so seeing what Xipe Totec answers (`card/list`'s node ids, to type into
`effect/set id=…`) meant copying from a terminal. Showing structure as it is keeps tezcatl's rule (it never reads a backend's text for
meaning); declaring an adapter as data keeps additions out of code, as intents' `result.table` does. Asking `method/list` first keeps the
table read-only (D-matrix-shell): opening a table must never change anything, and only Xipe Totec knows which of its methods write.

**Alternatives**: a command registering an adapter at run time (it would live only in that window, and an adapter is a fetch plus
meanings — a file says them once for every window); reading `book.jsonl` or Xipe Totec's tables directly (outside the FS root, and the
server's Book and the file may part); a list of read-only methods kept in tezcatl (it would drift from Xipe Totec's own `Methods`);
writing yours in `local/matrix_kinds/` (the pages cannot write there; the work place can).

**What it removed**: copying node ids out of `show` / `card/list` in a terminal.

**Files**: `lib/xipe/matrix-kinds.js`, `lib/xipe/matrix-page.js` (`loadAsIs`, `saveKind`, `filterBy`), `lib/xipe/matrix-bar-page.js`,
`lib/xipe/matrix-commands.js`, `lib/skin/frame-lines.js` (`list kinds`, `matrix kinds`), `lib/skin/radar.js` (`idsOf`),
`matrix_kinds/`, `test/matrix-kinds.test.js`, `test/e2e/matrix_kinds.mjs`; Xipe Totec's `method/list`.
