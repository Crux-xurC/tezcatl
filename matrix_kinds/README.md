# matrix_kinds/

Kinds of table declared as data (D-matrix-raw, `lib/xipe/matrix-kinds.js`): `matrix get <name>:all` shows one. Each file is
`<name>.json`, named in `index.json`. Yours go in `~work/matrix_kinds/<name>.json` (looked at first; no index needed) —
`matrix save-kind <name>` writes one from a table shown as it is (`json:`, `xipe_raw:`). The shape is in the head of
`lib/xipe/matrix-kinds.js`.

| Kind | What |
|---|---|
| `cards` | Xipe Totec's functions with their node ids (`card/list`); `radar` says "(node ids)" |
