# Tezcatl

A local, web-based development environment that uses Emacs as a **backend** instead of
re-implementing it. Tezcatl (Nahuatl for "mirror") is the window: it decides how things are
operated and shown in the browser, and sends input to the backends **without interpreting it**.
The backends — Emacs through emacs-vent (a separate repository), a terminal, the disk, language servers,
Xipe Totec (a separate project) — compute.

```
Browser (Tezcatl: CodeMirror / xterm.js)
        │ WebSocket
 ───────┼──────────────────────── the same host
 Elixir relay   ① vent  ② PTY  ③ files  ④ LSP  ⑤ Xipe Totec
        │
 emacs-vent (in / out)  →  Emacs (Magit / Org / dired …)
```

The browser never talks to Emacs, a PTY, the disk or a language server directly; one Elixir
relay owns each connection and multiplexes the windows.

What it looks like: [Xipe Totec's README](https://github.com/Crux-xurC/xipe_totec#readme) has a screenshot and a 3.5-minute video of an AI agent trying a library's functions over MCP, with tezcatl as the window.

## What it is not

- not a re-implementation of Emacs, an IDE, Git, LSP, an LLM or vterm
- not a mirror of Emacs' buffers (it carries computed results, not what Emacs displays)
- not a competitor of VS Code, not a plugin marketplace
- not for the network: everything listens on `127.0.0.1` only, and started from Poca the relay serves only Poca's window (see
  [docs/scope.md](docs/scope.md))

## Run it

Start it from the box of [Poca](https://github.com/Crux-xurC/poca) — a browser that starts the processes and opens the window — (the
`tezcatl` row with `"auth": true`): Poca hands it a secret and the relay serves only Poca's window.

<!-- env:nix -->
```
nix develop
t --no-auth   # by hand, without Poca: page server + relay without authentication (Ctrl+C stops both); opens no browser
```

The backends are started on their own: your Emacs with [emacs-vent](https://github.com/Crux-xurC/emacs-vent) loaded and `emacs-vent-mode` on (for example
`emacs --fg-daemon`, :4000) and [Xipe Totec](https://github.com/Crux-xurC/xipe_totec)
(`xipe start --port 4200 --lsp ws://127.0.0.1:4100/lsp --fs-root <root>`, :4200).

Then open `http://127.0.0.1:4001/main.html` (the launcher) and pick `frame`.
The steps above assume the dev shell.
<!-- /env:nix -->

Without Nix: [tezcatlipoca](https://github.com/Crux-xurC/tezcatlipoca), a tarball with Tezcatl, Xipe Totec, Poca, emacs-vent and
embody for Linux x86_64 (or [tezcatl_without_nix](https://github.com/Crux-xurC/tezcatl_without_nix), this repository as a Mix project).

## Which document to read

| You want to | Read |
|---|---|
| see the usual questions and first concerns answered (Why Emacs? Why Poca? Is localhost safe?) — start here when assessing it | [docs/faq.md](docs/faq.md) |
| use it day to day | [docs/how-to-use.md](docs/how-to-use.md) |
| add a command, an intent, a panel, a language … | [docs/extending.md](docs/extending.md) — a table: what to write, where, which test guards it |
| know what is promised to work, and what happens outside | [docs/scope.md](docs/scope.md) — each promise with a one-line why and the file records that hold the details |
| change or analyse the core | [docs/scope.md](docs/scope.md), then [docs/files/](docs/files/index.md) (one record per file: what it does, why, the decisions it is home to) |
| see the overall shape | [docs/structure.md](docs/structure.md) (principles, who does what, the decision index) |
| know the wire format | [docs/protocol.md](docs/protocol.md) |
| review or verify it | [docs/review.md](docs/review.md) |
| see what is left to do | [docs/issues.md](docs/issues.md) |

## Glossary

| Term | In a word |
|---|---|
| **vent protocol** | the editor-neutral agreement between Tezcatl and an editor |
| **emacs-vent** | its Emacs implementation (vent-out: Emacs → outside, vent-in: outside → Emacs) |
| **relay** | the Elixir process that owns emacs-vent's single client slot, the PTYs, the files, the language servers |
| **panel** | one page (an editor, a terminal, a list …), alone in a window or inside a skin |
| **skin** | a page that holds panels; **frame** is the one to use (columns of panels and a dock) |
| **dock** | the part of the frame outside the columns: the map, the input line, the receiving side, … |
| **lead key** | `;` and one character: how the input line writes keys a browser would take (`;cx` is `C-x`) |
| **intent** | a named operation run in a backend (an Emacs form, a browser action), declared in JSON |
| **book** | a table kept in the work place (`~work/books/`): task_table and run_table edit books |
| **work place** | `~work/…` — Tezcatl's own files, outside the project (`~/.local/state/tezcatl/work/`) |

## Related projects

Tezcatl is one of a few small tools that work together; each is its own repository and each can be used without the others unless
said otherwise. The names are Nahuatl (and one asteroid), written without their long vowels.

| Project | What it is | With Tezcatl |
|---|---|---|
| [emacs-vent](https://github.com/Crux-xurC/emacs-vent) | an Emacs package: the vent protocol, Emacs' side | the backend for editing, Magit, Org … |
| [Xipe Totec](https://github.com/Crux-xurC/xipe_totec) | a REPL table: calls kept as rows, evaluated again in your project's REPL; an MCP server for AI agents | the matrix panels and the dock are its window |
| [embody](https://github.com/Crux-xurC/embody) | Xipe Totec's languages other than Elixir | — |
| [Poca](https://github.com/Crux-xurC/poca) | a CEF-based browser that starts Tezcatl's processes and opens its window with a secret | the usual way to start it ("Run it") |
| [tezcatlipoca](https://github.com/Crux-xurC/tezcatlipoca) | all of the above as one tarball, without Nix (Linux x86_64) | — |
| [forbidden](https://github.com/Crux-xurC/forbidden) | a wall: a terminal or a command without network, but for one door | usable in Tezcatl's terminal |
| [Citlalpol](https://github.com/Crux-xurC/Citlalpol) | behind forbidden's door: only declared destinations get out, every attempt recorded | its records in the Citlalpol panels ([how-to-use](docs/how-to-use.md)) |
| [zoozve](https://github.com/Crux-xurC/zoozve) | a gate in front of a local server, for Citlalpol's `to` | drawn in citlalpol_image |

## License

- Tezcatl (this repository): MIT ([LICENSE](LICENSE))
- emacs-vent (separate repository): GPL-3.0-or-later
