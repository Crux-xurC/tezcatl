# `lib/core/old-place.js`

Where tezcatl puts what a person takes away from a panel: `~work/old/<kind>/<name>-<YYYYMMDD-HHMMSS>.json`, and the "press it twice"
that asks first.

**Decisions homed here**: [D-old-place](#d-old-place)

<a id="d-old-place"></a>

## D-old-place — taking something away moves it to `~work/old/`; deleting is the shell's

**Decided** (2026-11-26, crux): what tezcatl keeps and a person takes away from a panel is not deleted: it is written to
`~work/old/<kind>/<name>-<time>.json` (`~/.local/state/tezcatl/work/old/`), and only once that is written is it taken out of where it was.
The key is pressed twice (within 3 s, the same item), as magit's `X`. A person cleans `~work/old/` with the shell
(`rm -r ~/.local/state/tezcatl/work/old/*`). The first use: the `skin_list` panel's `Del` on a skin kept by `skin save` (out of
`~work/store/frame-skins.json`; back: put the file in `local/skins/` and name it in its `index.json`). A skin of a file is not moved
(`skins/` is shipped; `local/skins/` is the person's own, moved by hand).

**Why**: a panel is not the place to destroy what cannot be made again; a move keeps it recoverable and makes cleaning one shell command
over one directory. Writing first and removing second means nothing is lost between the two.

**Alternatives**: deleting at once with a confirmation (lost for good on a slip); a trash per kind (many places to clean); moving
`local/skins/` files too (the pages cannot write there, and they are the person's own files).

**Not here**: Citlalpol's records (the wall's evidence; tezcatl only reads them, D-citlalpol-bus) and Xipe Totec's Book (Xipe Totec's
own; `row/remove`).

**Files**: `lib/core/old-place.js`, `lib/list/kinds/skin_list.js` (`remove`), `test/list-kinds.test.js`, `test/e2e/skin_list.mjs`.
