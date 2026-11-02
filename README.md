# Python Debug Exercises

A tiny, dependency-free set of static web pages for embedding runnable Python
"fix the bug" exercises into a website (e.g. Google Sites). Students write
and run real Python in the browser using [Pyodide](https://pyodide.org/) —
no server, account, or install required.

The player shares its layout and code with
[Python-Challenge-Runner](https://github.com/SteveRodkiss/Python-Challenge-Runner):
a toolbar with an exercise drop-down, a Monaco editor, an output terminal and
a step-through debugger.

```
index.html        page (entry point)
editor.html       exercise editor (CRUD for exercises.json)
editor.js, editor.css   its code and styles
css/styles.css    styles
js/main.js        wiring, run/debug/stop logic, exercise drop-down
js/editor.js      Monaco setup
js/runner.js      talks to the Pyodide worker
js/worker.js      Web Worker hosting Pyodide
js/terminal.js    output terminal + inline input()
js/debugger.js    debugger UI (variables, next line, output so far)
py/runtime.py     Python-side runner and tracer
exercises.json    every exercise (title, instructions, starter code, hint)
```

## How it works

`index.html` loads every exercise from `exercises.json`, which sits next to it
in the same folder, and lists them in the drop-down at the top of the page.
Choosing an exercise loads its title, instructions, hint and starter code.

It also reads an `exercise` key from its own URL:

```
index.html?exercise=debug01
```

If no `exercise` parameter is given, it falls back to the last exercise viewed
and then to the `"default"` entry. Selecting an exercise from the drop-down
updates the `exercise` URL parameter, so each embedded page keeps its own
exercise.

Students edit the code in a Monaco editor, click **▶ Run**, and see output (and
Python tracebacks) in the terminal — Pyodide runs Python entirely client-side
in a Web Worker. **🐞 Debug** runs the same code step by step: students can
step forward/back, play automatically, or drag the slider while watching the
variables, the next line to run and the output so far. Changed variables are
highlighted, and the editor is read-only while the Debugger tab is open.
**■ Stop** kills the worker, so endless loops can always be interrupted.

Optional URL parameter: `?theme=light` (default is dark). Code is autosaved to
`localStorage` per exercise when the browser allows it; **↺ Reset** restores
the exercise's starter code.

## 1. Fork and host it

1. Fork/clone this repo.
2. In GitHub, go to **Settings → Pages** and set the source to your default
   branch (root folder). GitHub Pages will serve the files as static HTML —
   no build step needed.
3. Your site will be available at something like:
   `https://<your-username>.github.io/<repo-name>/index.html`

Any static host works (GitHub Pages, Netlify, your school's web host, etc.) —
just keep the folder structure intact (`index.html`, `exercises.json` and the
`css/`, `js/` and `py/` folders side by side).

Needs internet access to load Monaco and Pyodide from jsDelivr. To run locally,
serve the folder (e.g. `python -m http.server`); opening `index.html` via
`file://` won't work.

## 2. Embed an exercise in Google Sites

1. Open your Google Site and go to the page you want the exercise on.
2. In the right-hand **Insert** panel, choose **Embed**.
3. Choose **By URL** and paste your hosted page with the exercise you want, e.g.:
   ```
   https://<your-username>.github.io/<repo-name>/index.html?exercise=debug03
   ```
4. Click **Insert**. Google Sites will embed it in an `<iframe>`.
5. Resize the embedded frame in the Sites editor so the editor and output
   area aren't cramped (roughly 700–900px tall works well).
6. Repeat on a new page/section for each exercise, just changing the
   `exercise=` value in the URL.

Because everything runs client-side, no data is sent anywhere — each student
gets their own private, in-browser Python session.

## 3. Create/edit/delete exercises with `editor.html`

`editor.html` is a small standalone page for managing `exercises.json` — you
don't need to hand-write JSON.

1. Open `editor.html` directly in **Chrome or Edge** (double-click the file,
   or visit it on your hosted site). Chromium-based browsers can save changes
   straight back to disk; other browsers can still open/view but will
   download an updated copy instead of saving in place.
2. Click **Open exercises.json** and select the `exercises.json` file from
   your local clone of the repo.
3. Use the sidebar to:
   - **View/Edit** — click an exercise to load it into the form (key, title,
     instructions, code, hint). Edits are applied as you type.
   - **Create** — click **+ New Exercise**, enter a unique key (e.g. `debug41`).
   - **Delete** — select an exercise and click **Delete Exercise**.
4. Click **Save** to write the changes back to `exercises.json` on disk.
   The next time you open `editor.html`, it will try to reload the same file
   automatically (Chrome/Edge remember the file permission), so you usually
   won't need to click **Open** again.
5. Commit and push the updated `exercises.json` to your repo so the hosted
   site (and any Google Sites embeds) picks up the changes.

### Exercise JSON format

Each exercise is a key in `exercises.json` mapping to an object:

```json
"debug01": {
  "title": "Debug 1",
  "instructions": "This program contains a mistake. Run it, read the error message carefully, and fix the program.",
  "code": "name = \"Sam\"\nprint(\"Hello\", nmae)",
  "hint": "Look carefully at the names used in the program."
}
```

| Field          | Purpose                                                        |
|----------------|------------------------------------------------------------------|
| `title`        | Shown as the exercise heading.                                  |
| `instructions` | Shown above the code editor, explains what to do.                |
| `code`         | The starter code loaded into the editor (`\n` for new lines).    |
| `hint`         | Optional hint text shown to students; leave `""` for no hint.    |

The key (e.g. `debug01`) is what you put in the URL as `?exercise=debug01`,
so keep it short and URL-safe (letters, numbers, underscores).

## License

Public domain — see [LICENSE.md](LICENSE.md) (CC0). Use, modify, and share
freely with no attribution required.
