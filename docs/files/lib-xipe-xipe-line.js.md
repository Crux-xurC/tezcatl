# `lib/xipe/xipe-line.js`

Lines typed outside the dialogue window, sent to Xipe Totec as the dialogue window sends them: the dock's input line with Xipe Totec as
its destination (`lib/target/xipe.js`) and a `matrix_set`'s command line (`xipe <line>`, `lib/xipe/matrix-bar-page.js`).

**Decisions homed here**: [D-xipe-elsewhere](#d-xipe-elsewhere)

**Takes part in**: [D-xipe-dialogue](lib-xipe-xipe-session.js.md#d-xipe-dialogue), [D-unified-dock](lib-skin-frame-dock.js.md#d-unified-dock),
[D-matrix-shell](lib-xipe-matrix-grid.js.md#d-matrix-shell), [D-work-list](lib-core-work-log.js.md#d-work-list)

<a id="d-xipe-elsewhere"></a>

## D-xipe-elsewhere — Xipe Totec is a destination of the dock, and a matrix_set's line reaches it; lines go as the dialogue window sends them

**Decided** (2026-11-24): Xipe Totec is reached from more than its dialogue window (`open xipe`), as Emacs is:

- **The dock**: `input_target/xipe.json` (letter `i`, the project `.` of `xipe.json`). A line typed in the dock's input line (or the
  palette's) goes as `input` `{text}`, unread — the same one method as the dialogue window ([D-xipe-dialogue](lib-xipe-xipe-session.js.md#d-xipe-dialogue)).
  A line of characters only, as tezcatl's own destination takes
- **Its answers**: `output_target/xipe.json` (`lib/recv/xipe.js`), the same id, so while the keyboard is in the input form the receiving
  side follows and shows the line and its answer where it was typed ([D-unified-dock](lib-skin-frame-dock.js.md#d-unified-dock)). The
  lines are those of the dialogue window's record (`lib/xipe/xipe-transcript.js`: `dialogue.text` as it is, else the result); the
  broadcast `notify/*` is left out (the dialogue window shows it). Said on the bus as `xipe.said {lines, kind, root, skin}`: the dock's
  input_target is no panel of its skin, so it names the skin page's bus id, and the source takes its own skin's only
- **A matrix_set's command line**: `xipe <line>` sends `<line>` to the root of the table shown; its answer's first line is the bar's
  status, all of it the frame's xipe source. The table is still not fetched again by itself (`update`)
- Both say `xipe.sent` / `xipe.answered`, so a line waiting for its answer is a row of `work` as the dialogue window's are; `@` is the
  last reference (`radar`), put in as text before the line goes; a line sent before the connection is made waits for it

**Alternatives**: keep the dialogue window the only way in (a person switches windows for one line); give the dock a second, Xipe-only
input; have the matrix bar read `xipe do …` and call the methods itself.

**Why not**: switching windows for a line is what crux met while driving another project's probes from Tezcatl (2026-11-24). A second input duplicates the
dock's destination mechanism. Reading the line in the browser breaks [D-xipe-dialogue](lib-xipe-xipe-session.js.md#d-xipe-dialogue)
(the notation would live in two places).

**What the dock does not have (yet)**: the dialogue window's dictionary (completion from yanked lines), its whole record in a pane, and
`?backend=<name>` (another backend the relay serves). One connection per root; only `.` from the dock.

**Files**: `lib/xipe/xipe-line.js`, `lib/target/xipe.js`, `lib/recv/xipe.js`, `input_target/xipe.json`, `output_target/xipe.json`,
`lib/xipe/matrix-bar-page.js`, `test/xipe-line.test.js`, `test/e2e/xipe_elsewhere.mjs`.
