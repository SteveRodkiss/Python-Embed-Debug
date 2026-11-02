import { createEditor } from "./editor.js";
import { Runner } from "./runner.js";
import { Terminal } from "./terminal.js";
import { DebuggerView } from "./debugger.js";

const DEFAULT_CODE = `# Welcome! Press Run to try this program.
name = "Python"
for i in range(3):
    print("Hello,", name, i)
`;

async function loadExercises() {
  try {
    const res = await fetch("exercises.json", { cache: "no-cache" });
    if (!res.ok) throw new Error(res.status);
    return await res.json();
  } catch (err) {
    console.error("Could not load exercises:", err);
    return {};
  }
}

const $ = (id) => document.getElementById(id);
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch { /* storage blocked in iframe */ } },
  remove(k) { try { localStorage.removeItem(k); } catch { /* storage blocked in iframe */ } },
};

const params = new URLSearchParams(location.search);
let theme = params.get("theme") || store.get("theme") || "dark";
let fontSize = Number(store.get("fontSize")) || 16;
document.documentElement.dataset.theme = theme;

const term = new Terminal($("terminal"));
let current = null; // { key, title, instructions, code, hint }
let busy = false;
let pythonReady = false;

const runner = new Runner({
  onOutput: (text, stream) => term.write(text, stream),
  onReady: () => { pythonReady = true; updateUi(); },
});

const editor = await createEditor($("editor"), {
  code: DEFAULT_CODE,
  theme,
  fontSize,
});
const dbg = new DebuggerView(editor);
const errorMarks = editor.createDecorationsCollection();

function updateUi() {
  $("btn-run").disabled = $("btn-debug").disabled = busy || !pythonReady;
  $("btn-stop").disabled = !busy;
  $("status").textContent = busy ? "Running…" : pythonReady ? "Ready" : "Loading Python…";
}

function showTab(name) {
  for (const t of ["output", "debugger"]) {
    $("tab-" + t).classList.toggle("active", t === name);
    $("panel-" + t).classList.toggle("hidden", t !== name);
  }
  dbg.setActive(name === "debugger");
}

async function execute(debug) {
  if (busy || !pythonReady) return;
  busy = true;
  updateUi();
  dbg.clear();
  errorMarks.clear();
  showTab("output");
  const code = editor.getValue();
  const inputs = [];

  try {
    for (;;) {
      term.clear();
      const result = await runner.run(code, inputs, debug);
      if (result.needInput) {
        const answer = await term.readLine();
        if (answer === null) throw new Error("stopped");
        inputs.push(answer);
        continue;
      }
      if (result.errorLine) {
        errorMarks.set([{
          range: new window.monaco.Range(result.errorLine, 1, result.errorLine, 1),
          options: { isWholeLine: true, className: "error-line" },
        }]);
      }
      if (debug) {
        dbg.load(code, result);
        showTab("debugger");
      }
      break;
    }
  } catch (err) {
    if (err.message === "stopped") term.write("\n[Program stopped]\n", "info");
    else term.write("\n" + err.message + "\n", "stderr");
  } finally {
    busy = false;
    updateUi();
  }
}

function stop() {
  if (!busy) return;
  pythonReady = false; // the worker restarts; onReady re-enables the buttons
  term.cancelInput();
  runner.stop();
}

$("btn-run").onclick = () => execute(false);
$("btn-debug").onclick = () => execute(true);
$("btn-stop").onclick = stop;
$("btn-clear").onclick = () => term.clear();
$("tab-output").onclick = () => showTab("output");
$("tab-debugger").onclick = () => showTab("debugger");

editor.addCommand(window.monaco.KeyMod.CtrlCmd | window.monaco.KeyCode.Enter, () => execute(false));

// Code is saved per exercise (keyed by exercise key); unchanged starter code isn't stored,
// so later edits to an exercise's starter code still reach students.
const codeKey = (c) => (c ? "code:" + c.key : "code");
editor.onDidChangeModelContent(() => {
  const code = editor.getValue();
  if (current && code === current.code) store.remove(codeKey(current));
  else store.set(codeKey(current), code);
  errorMarks.clear();
});

const select = $("examples");
const exercises = await loadExercises();
const keys = Object.keys(exercises);
keys.forEach((k) => select.add(new Option(exercises[k].title || k, k)));

function showExercise(key, updateUrl = true) {
  const exercise = exercises[key];
  if (!exercise) return;
  current = { key, ...exercise };
  select.value = key;
  store.set("exercise", key);

  $("exercise-title").textContent = exercise.title || key;
  $("exercise-instructions").textContent = exercise.instructions || "";
  $("exercise-hint").textContent = exercise.hint ? "💡 Hint: " + exercise.hint : "";
  $("exercise-hint").classList.toggle("hidden", !exercise.hint);
  document.title = (exercise.title || key) + " | Python Debug Exercises";

  editor.setValue(store.get(codeKey(current)) ?? exercise.code ?? DEFAULT_CODE);
  dbg.clear();
  errorMarks.clear();
  updateUi();

  if (updateUrl) {
    const url = new URL(location.href);
    url.searchParams.set("exercise", key);
    history.replaceState(null, "", url);
  }
}

// The ?exercise= URL parameter (used by Google Sites embeds) wins; otherwise
// fall back to the last exercise viewed, then "default", then the first one.
const initial =
  (params.get("exercise") && exercises[params.get("exercise")] ? params.get("exercise") : null) ??
  (exercises[store.get("exercise")] ? store.get("exercise") : null) ??
  (exercises.default ? "default" : null) ??
  keys[0] ??
  null;

select.onchange = () => showExercise(select.value);
$("btn-reset").onclick = () => {
  if (!current) return;
  if (confirm("Start this exercise again? Your code for it will be replaced.")) editor.setValue(current.code);
};

if (initial) {
  showExercise(initial, false);
} else {
  $("exercise-title").textContent = "Unable to load exercises";
  $("exercise-instructions").textContent = "exercises.json could not be loaded. Make sure it sits next to index.html and the page is served over http(s).";
  $("status").textContent = "Error loading exercises.";
}

function setFont(size) {
  fontSize = Math.max(10, Math.min(32, size));
  editor.updateOptions({ fontSize });
  store.set("fontSize", fontSize);
}
$("btn-font-up").onclick = () => setFont(fontSize + 2);
$("btn-font-down").onclick = () => setFont(fontSize - 2);
$("btn-theme").onclick = () => {
  theme = theme === "dark" ? "light" : "dark";
  document.documentElement.dataset.theme = theme;
  window.monaco.editor.setTheme(theme === "light" ? "vs" : "vs-dark");
  store.set("theme", theme);
};

updateUi();
