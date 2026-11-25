# `lib/citlalpol/citlalpol-bus-page.js`

The page script of citlalpol_bus: the one reader of Citlalpol's records for its skin, passing each to the skin's citlalpol_log and
citlalpol_image.

**Decisions homed here**: [D-citlalpol-bus](#d-citlalpol-bus)

**Takes part in**: [D-matrix-shell](lib-xipe-matrix-grid.js.md#d-matrix-shell) (citlalpol_log is its exception: rows only added),
[D-poca-secret](lib-relay-secret_gate.exs.md#d-poca-secret)

<a id="d-citlalpol-bus"></a>

## D-citlalpol-bus — Citlalpol's records are read as files through the relay by one panel per skin, which passes them to the log and the picture

**Decided** (2026-11-24, crux): Citlalpol (another program, not part of Tezcatl: the fake outside behind the door of forbidden's wall,
which records every attempt of the program inside as one JSON line) is seen in Tezcatl through three panels:

- **citlalpol_bus** — the one reader for its skin. It asks the relay `GET /citlalpol/records?cursor=` every `poll_ms` of
  `citlalpol.json` and tells the panels of the same skin each new record (`citlalpol.record {n, r}`) and whether citld runs
  (`citlalpol.state`). It keeps the last `keep` and answers a panel opened later (`citlalpol.ask` → `citlalpol.records`, to the asker),
  so a panel never sees half. It shows only whether records flow (`running…`, the count, the last one, citld running or not). It does not
  shape the records: what they look like is the other two's
- **citlalpol_log** — the records as a table (the matrix grid), from the bus of its own skin only. **Rows are only added at the bottom and
  never change**: the exception to [D-matrix-shell](lib-xipe-matrix-grid.js.md#d-matrix-shell)'s "no automatic refresh", granted because
  records are append-only and colours and selection are kept by row id, so nothing moves under the cursor. `p` pauses (what comes
  meanwhile waits, counted), `Enter` shows the record in full
- **citlalpol_image** — the records drawn: tezcatl's side (a satellite), Citlalpol (Venus, the morning star), the Internet (the Earth),
  each with a turning ring of its name (the Nahuatl name alone says nothing of the picture). A record travels as a glyph of
  `citlalpol.json` chosen by its structured fields only (decision, proto, port, method, the path's extension, undecided): on to the
  Internet (pass), to Zoozve and back (a pass to a local server behind a zoozve gate: `to_auth`), back from Citlalpol (it answered
  itself: the wall's DNS; an older record's stand-in) or stopped there (✕). Zoozve — Venus's quasi-satellite, as zoozve is
  Citlalpol's gate to the person's own servers — rides a loop around Venus backwards with a glow trailing it (SMIL: the glow and
  its motion on one clock, so a packet can follow where it is now; `assets/citlalpol/zoozve.svg`, crux's picture with its white
  ground taken out). Records that come together travel as one glyph per
  kind with a circled count; at most six at once. Behind them the night sky (`assets/citlalpol/skyscape.webp`, made a 33 KB WebP from
  crux's 1.5 MB PNG; 3:1 with its ends meeting) flows to the left without end. Neither the rings nor the sky move under
  `prefers-reduced-motion` (the SMIL of Zoozve's loop is paused then)

The log and the picture never depend on each other, only on the bus of their skin; without one they say so.

**The relay's route** (`lib/relay/citlalpol_records.exs`): read only (GET, OPTIONS), behind Poca's secret and tickets like every route.
It reads `<state>/records/<day>.jsonl` as files (`CITLALPOL_STATE`, else `~/.local/share/citlalpol`) and whether citld runs from its pid
file (`CITLALPOL_RUNTIME`, else `$XDG_RUNTIME_DIR/citlalpol`). A cursor is `<day>:<offset>` and nothing else, so no path can be named.
Without a cursor: the last 200 of the newest day; with one, what was added, on into a newer day; a half-written line waits.

**Safety** — asked by crux: does showing the log go over the network, and is Citlalpol still safe?
- Nothing leaves the machine: file → relay → the page in Poca, on the loopback, behind the secret. Citlalpol records only what comes
  through forbidden's door; the relay reads files and the pages talk to the relay outside the wall, so **looking makes no record and there
  is no loop**. Citlalpol is never asked over its door, and Tezcatl, Poca, Emacs and Xipe Totec are never run under it. Citlalpol never
  passes to their ports (4000, 4001, 4100, 4200), not even with `allow_local` (Citlalpol's own rule, made for this)
- The flow is one way, from outside the wall toward the page; nothing goes back toward the wall. The panels only read: access.json is
  changed by a person, never from here
- The records' strings are the wall's program's (with `forbidden run --strict`, possibly hostile). They are text everywhere: cells by
  `textContent` (control characters shown as `\xNN`), the record in full as text, glyphs chosen from fields and never from strings

**Alternatives**: each panel reading the relay itself; the log in a CodeMirror panel; Citlalpol's records under the FS root (the
existing `/fs` would read them); asking citld over a socket of its own.

**Why not**: panels reading on their own would each see a different part (one opened later sees half) and poll twice. A table fits
structured records (columns, `/` filters, sorting, colours, CSV) better than text. Under the FS root the records would be writable through
`/fs` and open to every file panel. A socket of citld's own would be one more door to Citlalpol, the thing kept closed.

**Files**: `lib/citlalpol/citlalpol-bus.js`, `lib/citlalpol/citlalpol-bus-page.js`, `lib/citlalpol/citlalpol-log.js`,
`lib/citlalpol/citlalpol-log-page.js`, `lib/citlalpol/citlalpol-image.js`, `lib/citlalpol/citlalpol-image-page.js`,
`panels/resident/citlalpol_bus.html`, `panels/resident/citlalpol_log.html`, `panels/resident/citlalpol_image.html`, `citlalpol.json`,
`assets/citlalpol/` (crux's pictures, free to use), `lib/relay/citlalpol_records.exs`, `test/citlalpol.test.js`,
`test/relay/citlalpol_records_test.exs`, `test/e2e/citlalpol.mjs`.
