/**
 * uploadUI.js
 * ────────────
 * Renders the file-upload area, sheet selector dropdown, parse button,
 * validation error list, and a preview table of parsed students.
 *
 * Uses the excelParser module for all data work.
 * Emits a custom event "students:parsed" on `document` with the
 * final student array so other modules can subscribe.
 */

import { getSheetNames, parseExcel } from "../excelParser.js";
import defaultTemplate from "../config/defaultTemplate.js";

/* ── State ────────────────────────────────────────────────── */
let currentFile = null;
let sheetNames = [];
let parseResult = null;

/* ══════════════════════════════════════════════════════════
   Render the upload UI inside a container element
   ══════════════════════════════════════════════════════════ */
export function mountUploadUI(container) {
    container.innerHTML = /* html */ `
    <section class="upload-section" id="upload-section">
      <!-- ─── Drop zone ──────────────────────────────── -->
      <div class="drop-zone" id="drop-zone">
        <div class="drop-zone__icon">
          <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <polyline points="9 15 12 12 15 15"/>
          </svg>
        </div>
        <p class="drop-zone__label">Drop your Excel file here</p>
        <p class="drop-zone__hint">or click to browse &nbsp;—&nbsp; <code>.xlsx</code> / <code>.xls</code></p>
        <input type="file" id="file-input" accept=".xlsx,.xls,.csv" hidden />
      </div>

      <!-- ─── File info bar ──────────────────────────── -->
      <div class="file-info-bar hidden" id="file-info-bar">
        <span class="file-info-bar__name" id="file-name"></span>
        <span class="file-info-bar__size" id="file-size"></span>
        <button class="btn-icon" id="clear-file" title="Remove file">✕</button>
      </div>

      <!-- ─── Sheet selector ─────────────────────────── -->
      <div class="sheet-selector hidden" id="sheet-selector-wrap">
        <label for="sheet-select" class="sheet-selector__label">Sheet</label>
        <select id="sheet-select" class="sheet-selector__select"></select>
        <button class="btn btn--primary" id="parse-btn">
          <span class="btn__text">Parse &amp; Validate</span>
          <span class="btn__spinner hidden" id="parse-spinner"></span>
        </button>
      </div>

      <!-- ─── Status / progress ──────────────────────── -->
      <div class="status-banner hidden" id="status-banner"></div>

      <!-- ─── Errors panel ───────────────────────────── -->
      <details class="errors-panel hidden" id="errors-panel">
        <summary class="errors-panel__summary">
          <span class="errors-panel__badge" id="error-count">0</span> Validation Errors
        </summary>
        <div class="errors-panel__body" id="errors-list"></div>
      </details>

      <!-- ─── Warnings panel ─────────────────────────── -->
      <details class="warnings-panel hidden" id="warnings-panel">
        <summary class="warnings-panel__summary">
          <span class="warnings-panel__badge" id="warning-count">0</span> Warnings
        </summary>
        <div class="warnings-panel__body" id="warnings-list"></div>
      </details>

      <!-- ─── Preview table ──────────────────────────── -->
      <div class="preview-wrap hidden" id="preview-wrap">
        <h3 class="preview-wrap__title">
          Parsed Students
          <span class="preview-wrap__count" id="student-count"></span>
        </h3>
        <div class="preview-table-scroll">
          <table class="preview-table" id="preview-table">
            <thead id="preview-thead"></thead>
            <tbody id="preview-tbody"></tbody>
          </table>
        </div>
      </div>
    </section>
  `;

    bindEvents(container);
}

/* ══════════════════════════════════════════════════════════
   Event binding
   ══════════════════════════════════════════════════════════ */
function bindEvents(root) {
    const dropZone = root.querySelector("#drop-zone");
    const fileInput = root.querySelector("#file-input");
    const fileInfoBar = root.querySelector("#file-info-bar");
    const clearBtn = root.querySelector("#clear-file");
    const parseBtn = root.querySelector("#parse-btn");
    const sheetSelect = root.querySelector("#sheet-select");

    // Click to browse
    dropZone.addEventListener("click", () => fileInput.click());

    // Drag & drop
    dropZone.addEventListener("dragover", (e) => {
        e.preventDefault();
        dropZone.classList.add("drop-zone--over");
    });
    dropZone.addEventListener("dragleave", () => dropZone.classList.remove("drop-zone--over"));
    dropZone.addEventListener("drop", (e) => {
        e.preventDefault();
        dropZone.classList.remove("drop-zone--over");
        const files = e.dataTransfer.files;
        if (files.length) handleFile(files[0], root);
    });

    // File input change
    fileInput.addEventListener("change", (e) => {
        if (e.target.files.length) handleFile(e.target.files[0], root);
    });

    // Clear
    clearBtn.addEventListener("click", () => resetState(root));

    // Parse
    parseBtn.addEventListener("click", () => runParse(root));
}

/* ══════════════════════════════════════════════════════════
   Handlers
   ══════════════════════════════════════════════════════════ */
async function handleFile(file, root) {
    currentFile = file;

    // Update UI
    root.querySelector("#file-name").textContent = file.name;
    root.querySelector("#file-size").textContent = formatBytes(file.size);
    root.querySelector("#file-info-bar").classList.remove("hidden");
    root.querySelector("#drop-zone").classList.add("drop-zone--has-file");

    // Read sheet names
    try {
        sheetNames = await getSheetNames(file);
        const select = root.querySelector("#sheet-select");
        select.innerHTML = sheetNames
            .map(
                (name) =>
                    `<option value="${name}" ${name.toLowerCase() === defaultTemplate.sheetName.toLowerCase() ? "selected" : ""
                    }>${name}</option>`
            )
            .join("");
        root.querySelector("#sheet-selector-wrap").classList.remove("hidden");
        showStatus(root, "info", `Found ${sheetNames.length} sheet(s). Select one and click Parse.`);
    } catch (err) {
        showStatus(root, "error", err.message);
    }
}

async function runParse(root) {
    if (!currentFile) return;

    const sheetOverride = root.querySelector("#sheet-select").value;
    const spinner = root.querySelector("#parse-spinner");
    const btnText = root.querySelector(".btn__text");

    spinner.classList.remove("hidden");
    btnText.textContent = "Parsing…";
    root.querySelector("#parse-btn").disabled = true;

    try {
        parseResult = await parseExcel(currentFile, defaultTemplate, sheetOverride);
        renderResults(root, parseResult);

        // Dispatch event so other modules can consume the data
        document.dispatchEvent(
            new CustomEvent("students:parsed", { detail: parseResult })
        );
    } catch (err) {
        showStatus(root, "error", `Parse failed: ${err.message}`);
    } finally {
        spinner.classList.add("hidden");
        btnText.textContent = "Parse & Validate";
        root.querySelector("#parse-btn").disabled = false;
    }
}

function resetState(root) {
    currentFile = null;
    sheetNames = [];
    parseResult = null;

    root.querySelector("#file-info-bar").classList.add("hidden");
    root.querySelector("#sheet-selector-wrap").classList.add("hidden");
    root.querySelector("#drop-zone").classList.remove("drop-zone--has-file");
    root.querySelector("#status-banner").classList.add("hidden");
    root.querySelector("#errors-panel").classList.add("hidden");
    root.querySelector("#warnings-panel").classList.add("hidden");
    root.querySelector("#preview-wrap").classList.add("hidden");
    root.querySelector("#file-input").value = "";
}

/* ══════════════════════════════════════════════════════════
   Rendering helpers
   ══════════════════════════════════════════════════════════ */
function renderResults(root, result) {
    const { students, errors, warnings } = result;

    // ── Status banner ─────────────────────────────────────
    const validStudents = students.filter((s) => !s.computed.hasErrors);
    if (errors.length === 0) {
        showStatus(
            root,
            "success",
            `✅ All ${students.length} student(s) parsed successfully!`
        );
    } else {
        showStatus(
            root,
            "warning",
            `Parsed ${students.length} student(s) — ${validStudents.length} valid, ${students.length - validStudents.length} with errors.`
        );
    }

    // ── Errors panel ──────────────────────────────────────
    const errorsPanel = root.querySelector("#errors-panel");
    const errorsList = root.querySelector("#errors-list");
    const errorCount = root.querySelector("#error-count");
    if (errors.length) {
        errorsPanel.classList.remove("hidden");
        errorsPanel.open = true;
        errorCount.textContent = errors.length;
        errorsList.innerHTML = errors
            .map(
                (e) => `
        <div class="error-item">
          <span class="error-item__row">Row ${e.row}</span>
          <span class="error-item__field">${e.field}</span>
          <span class="error-item__msg">${e.message}</span>
        </div>`
            )
            .join("");
    } else {
        errorsPanel.classList.add("hidden");
    }

    // ── Warnings panel ────────────────────────────────────
    const warningsPanel = root.querySelector("#warnings-panel");
    const warningsList = root.querySelector("#warnings-list");
    const warningCount = root.querySelector("#warning-count");
    if (warnings.length) {
        warningsPanel.classList.remove("hidden");
        warningCount.textContent = warnings.length;
        warningsList.innerHTML = warnings
            .map(
                (w) => `
        <div class="warning-item">
          <span class="warning-item__row">Row ${w.row}</span>
          <span class="warning-item__field">${w.field}</span>
          <span class="warning-item__msg">${w.message}</span>
        </div>`
            )
            .join("");
    } else {
        warningsPanel.classList.add("hidden");
    }

    // ── Preview table ─────────────────────────────────────
    renderPreviewTable(root, students);
}

function renderPreviewTable(root, students) {
    if (!students.length) return;

    const wrap = root.querySelector("#preview-wrap");
    wrap.classList.remove("hidden");
    root.querySelector("#student-count").textContent = `(${students.length})`;

    const thead = root.querySelector("#preview-thead");
    const tbody = root.querySelector("#preview-tbody");

    // Build header: info fields + subjects + total + %
    const infoCols = Object.entries(defaultTemplate.studentFields).map(([, f]) => f.label);
    const subjectCols = defaultTemplate.subjects.map((s) => s.label);

    thead.innerHTML = `<tr>
    ${["#", ...infoCols, ...subjectCols, "Total", "%", "Grade"]
            .map((h) => `<th>${h}</th>`)
            .join("")}
  </tr>`;

    tbody.innerHTML = students
        .map(
            (s, i) => `
      <tr class="${s.computed.hasErrors ? "row--error" : ""}">
        <td>${i + 1}</td>
        ${Object.keys(defaultTemplate.studentFields)
                    .map((k) => `<td>${s.info[k] ?? ""}</td>`)
                    .join("")}
        ${defaultTemplate.subjects
                    .map((sub) => {
                        const m = s.marks[sub.key];
                        return `<td>${m ? m._total : "—"}</td>`;
                    })
                    .join("")}
        <td class="td--bold">${s.computed.totalMarks}</td>
        <td class="td--bold">${s.computed.percentage}%</td>
        <td class="td--grade td--grade-${s.computed.grade.toLowerCase()}">${s.computed.grade}</td>
      </tr>`
        )
        .join("");
}

/* ══════════════════════════════════════════════════════════
   Utility
   ══════════════════════════════════════════════════════════ */
function showStatus(root, type, message) {
    const banner = root.querySelector("#status-banner");
    banner.className = `status-banner status-banner--${type}`;
    banner.textContent = message;
    banner.classList.remove("hidden");
}

function formatBytes(bytes) {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}
