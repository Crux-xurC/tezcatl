# Questions asked first, and concerns seen first

The short answers to what a reader — a person, or an AI asked to assess this repository — tends to ask or doubt first. Each answer is
a few lines and points to where it is decided; [`scope.md`](scope.md) is the whole of what is promised and what is not, and wins
where this page is shorter than it. Xipe Totec's: [its `faq.md`](https://github.com/Crux-xurC/xipe_totec/blob/main/document/faq.md).

**Why Emacs? Why not VS Code, or code-server?**
tezcatl is a window, not an editor to compete with: what Emacs already does well (Magit, Org, dired …) is used from Emacs rather
than made again, and the window decides only how things are operated and shown. VS Code and code-server are whole editors with
their own extension worlds; tezcatl is not one of them. ([README](../README.md#what-it-is-not),
[structure.md](structure.md#1-the-twelve-starting-principles))

**Why a browser of its own (Poca)?**
So that the window is the only one that can use the backends: Poca hands the relay a secret each time it starts, and an ordinary
browser, `curl` or another localhost page cannot use it. Poca also loads nothing but localhost and keeps no history. Any
Chromium-based browser works with `t --no-auth`, without that guard. ([README](../README.md),
[D-poca-secret](files/lib-relay-secret_gate.exs.md#d-poca-secret))

**Is listening on localhost safe? On a shared machine?**
On a machine only you log in to. `127.0.0.1` is open to every user of the machine, and emacs-vent and Xipe Totec check no secret
on connections that are not a browser's: another user could reach a shell, your files and your Emacs as you. Do not run it on a
shared host. ([scope.md](scope.md), "Other users of the same machine")

**Does it send anything outside?**
tezcatl itself does not, and Poca loads nothing but localhost. What runs inside it talks as it does: a terminal, Claude Code in a
pane, a language server, your Emacs' packages, `git push`. ([README](../README.md#what-it-is-not))

**Why does tezcatl never read the backends' output?**
Input goes to the backends uninterpreted and they decide its meaning; their human-readable text is for people and changes without
notice. When structure is needed it comes from a general mechanism a person chooses (a dictionary of yanked lines, an intent that
answers a table), not from parsing. ([structure.md](structure.md#1-the-twelve-starting-principles),
[D-dictionary](files/lib-list-dict.js.md#d-dictionary))

**Do I need Nix?**
This repository is managed with Nix. Without it: [tezcatlipoca](https://github.com/Crux-xurC/tezcatlipoca), a tarball with
tezcatl, Xipe Totec, Poca and emacs-vent (Linux x86_64).

**Downloads, such as the table's CSV?**
Poca refuses downloads, so the table's `CSV` writes a file at the top of the FS root through the relay and says where
([D-matrix-csv](files/lib-xipe-matrix-grid.js.md#d-matrix-csv)).
