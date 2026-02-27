import { getSheetNames, parseExcel, generateSampleTemplate } from './src/excelParser.js';
import { TEMPLATES, getTemplateById, DEFAULT_TEMPLATE_ID } from './src/config/templates.js';
import { renderReportCardFront, renderReportCardBack } from './src/ui/reportCardPreview.js';
import { renderReportCards } from './src/pdf/renderReportCard.js';

/* ── State ────────────────────────────────────────────────── */
let currentFile = null;
let sheetNames = [];
let parsedStudents = [];
let parseErrors = [];
let parseWarnings = [];
let activeTemplateId = localStorage.getItem('vpps_template_id') || DEFAULT_TEMPLATE_ID;
let activeTemplate = getTemplateById(activeTemplateId);

/* ── Bootstrap the app ───────────────────────────────────── */
const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header" id="app-header">
    <div class="app-header__brand">
      <img src="${import.meta.env.BASE_URL}logo.png" alt="VPPS Logo" class="app-header__logo" id="header-logo" />
      <div class="app-header__text">
        <h1>VPPS Report Card Generator</h1>
        <p class="subtitle">Upload Excel mark sheets → Preview → Generate duplex PDF report cards</p>
      </div>
    </div>
  </header>

  <main id="main-content">
    <!-- ═══ Step 1: Upload ═══ -->
    <section class="card" id="upload-card">
      <div class="card__header">
        <span class="card__step">1</span>
        <h2 class="card__title">Upload Excel File</h2>
      </div>
      <div class="card__body">
        <div class="drop-zone" id="drop-zone">
          <div class="drop-zone__icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor"
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

        <div style="margin-top: 1.25rem;">
          <button id="download-template-btn" class="btn" style="border: 1px dashed var(--border-accent); background: var(--bg-glass); font-size: 0.85rem; color: var(--text-secondary); width: 100%; justify-content: center; display: flex; align-items: center; transition: all 0.2s;">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 6px;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
            Download Sample Excel Template
          </button>
        </div>

        <!-- File info bar -->
        <div class="file-info-bar hidden" id="file-info-bar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="var(--success)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
          </svg>
          <span class="file-info-bar__name" id="file-name"></span>
          <span class="file-info-bar__size" id="file-size"></span>
          <button class="btn-icon" id="clear-file" title="Remove file">✕</button>
        </div>
      </div>
    </section>

    <!-- ═══ Step 2: Configure ═══ -->
    <section class="card hidden" id="config-card">
      <div class="card__header">
        <span class="card__step">2</span>
        <h2 class="card__title">Configure</h2>
      </div>
      <div class="card__body">
        <div class="config-grid" id="config-grid">
          <!-- Template selector -->
          <div class="form-group">
            <label for="template-select" class="form-label">Report Template</label>
            <select id="template-select" class="form-select">
              ${TEMPLATES.map(t => `<option value="${t.id}" ${t.id === activeTemplateId ? 'selected' : ''}>${t.label}</option>`).join('')}
            </select>
          </div>

          <!-- Sheet selector -->
          <div class="form-group">
            <label for="sheet-select" class="form-label">Sheet Name</label>
            <select id="sheet-select" class="form-select"></select>
          </div>

          <!-- Session -->
          <div class="form-group">
            <label for="session-input" class="form-label">Session</label>
            <input type="text" id="session-input" class="form-input" placeholder="e.g. 2023-24" value="2024-25" />
          </div>

          <!-- Class / Section -->
          <div class="form-group">
            <label for="class-input" class="form-label">Class / Section <span class="form-hint">(optional)</span></label>
            <input type="text" id="class-input" class="form-input" placeholder="e.g. V-A" />
          </div>

          <!-- Range filter -->
          <div class="form-group">
            <label class="form-label">Student Range <span class="form-hint">(avoid memory issues)</span></label>
            <div class="range-row">
              <input type="number" id="range-from" class="form-input form-input--sm" placeholder="From" min="1" value="1" />
              <span class="range-sep">to</span>
              <input type="number" id="range-to" class="form-input form-input--sm" placeholder="To" min="1" value="50" />
            </div>
          </div>
        </div>

        <button class="btn btn--primary btn--wide" id="parse-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
          </svg>
          <span class="btn__text" id="parse-btn-text">Parse &amp; Validate</span>
          <span class="btn__spinner hidden" id="parse-spinner"></span>
        </button>
      </div>
    </section>

    <!-- ═══ Status banner ═══ -->
    <div class="status-banner hidden" id="status-banner"></div>

    <!-- ═══ Errors / Warnings ═══ -->
    <details class="errors-panel hidden" id="errors-panel">
      <summary class="errors-panel__summary">
        <span class="errors-panel__badge" id="error-count">0</span> Validation Errors
      </summary>
      <div class="errors-panel__body" id="errors-list"></div>
    </details>

    <details class="warnings-panel hidden" id="warnings-panel">
      <summary class="warnings-panel__summary">
        <span class="warnings-panel__badge" id="warning-count">0</span> Warnings
      </summary>
      <div class="warnings-panel__body" id="warnings-list"></div>
    </details>

    <!-- ═══ Step 3: Preview ═══ -->
    <section class="card hidden" id="preview-card">
      <div class="card__header">
        <span class="card__step">3</span>
        <h2 class="card__title">Preview — Student #1</h2>
        <span class="preview-badge" id="preview-student-info"></span>
      </div>
      <div class="card__body">
        <div class="preview-flip-container" id="preview-flip-container">
          <div class="preview-side" id="preview-front">
            <div class="preview-side__label">FRONT</div>
            <div class="report-card-page" id="rc-front"></div>
          </div>
          <div class="preview-side" id="preview-back">
            <div class="preview-side__label">BACK</div>
            <div class="report-card-page" id="rc-back"></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ═══ Step 4: Generate PDF ═══ -->
    <section class="card hidden" id="generate-card">
      <div class="card__header">
        <span class="card__step">4</span>
        <h2 class="card__title">Generate PDF</h2>
      </div>
      <div class="card__body generate-body">
        <p class="generate-info" id="generate-info"></p>

        <!-- Progress bar -->
        <div class="progress-wrap hidden" id="progress-wrap">
          <div class="progress-bar">
            <div class="progress-bar__fill" id="progress-fill"></div>
          </div>
          <p class="progress-text" id="progress-text">Preparing…</p>
        </div>

        <button class="btn btn--accent btn--wide" id="generate-btn">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
            <polyline points="7 10 12 15 17 10"/>
            <line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          <span class="btn__text" id="generate-btn-text">Generate Duplex PDF</span>
          <span class="btn__spinner hidden" id="generate-spinner"></span>
        </button>

        <div id="download-action-container" class="hidden" style="margin-top: 1rem;">
          <a id="download-pdf-btn" class="btn btn--wide" href="#" download="ReportCards_Duplex.pdf" style="text-decoration: none; justify-content: center; display: flex; align-items: center; background-color: var(--success); color: white; border: none;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="margin-right: 8px;">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
              <polyline points="7 10 12 15 17 10"/>
              <line x1="12" y1="15" x2="12" y2="3"/>
            </svg>
            <span class="btn__text">Download PDF Now</span>
          </a>
        </div>
      </div>
    </section>

    <!-- ═══ Print Help ═══ -->
    <section class="card" id="print-help-card">
      <div class="card__header">
        <span class="card__step">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="6 9 6 2 18 2 18 9"/>
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
            <rect x="6" y="14" width="12" height="8"/>
          </svg>
        </span>
        <h2 class="card__title">Print Help</h2>
      </div>
      <div class="card__body">
        <p class="print-help__intro">To print the generated PDF as duplex (double-sided) report cards, use these printer settings:</p>

        <div class="print-help__steps">
          <div class="print-help__step">
            <span class="print-help__step-num">1</span>
            <div class="print-help__step-body">
              <strong>Print on Both Sides (Duplex)</strong>
              <p>Enable <code>Print on Both Sides</code> or <code>Two-Sided Printing</code> in your printer dialog. This ensures each student's front and back are printed on a single sheet.</p>
            </div>
          </div>

          <div class="print-help__step">
            <span class="print-help__step-num">2</span>
            <div class="print-help__step-body">
              <strong>Flip on Long Edge</strong>
              <p>Select <code>Flip on Long Edge</code> (sometimes called "Long-Edge Binding"). This makes the back page flip correctly like a book — not upside-down.</p>
            </div>
          </div>

          <div class="print-help__step">
            <span class="print-help__step-num">3</span>
            <div class="print-help__step-body">
              <strong>Paper Size: A4 Landscape</strong>
              <p>Set paper size to <code>A4</code> and orientation to <code>Landscape</code>. The PDF is already laid out in A4 landscape format (842 × 595 pts).</p>
            </div>
          </div>
        </div>

        <div class="print-help__note">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          <div>
            <strong>PDF Page Order:</strong> The PDF is generated as Student 1 Front → Student 1 Back → Student 2 Front → Student 2 Back, and so on. This is the correct order for duplex printing — no manual reordering needed.
          </div>
        </div>
      </div>
    </section>
  </main>

  <footer class="app-footer">
    <p>Veer Patta Public School &copy; ${new Date().getFullYear()} &mdash; Report Card Generator</p>
  </footer>
`;

/* ══════════════════════════════════════════════════════════
   DOM References
   ══════════════════════════════════════════════════════════ */
const $ = (sel) => document.querySelector(sel);

const dropZone = $('#drop-zone');
const fileInput = $('#file-input');
const downloadTemplateBtn = $('#download-template-btn');
const fileInfoBar = $('#file-info-bar');
const clearBtn = $('#clear-file');
const configCard = $('#config-card');
const templateSelect = $('#template-select');
const sheetSelect = $('#sheet-select');
const parseBtn = $('#parse-btn');
const statusBanner = $('#status-banner');
const errorsPanel = $('#errors-panel');
const warningsPanel = $('#warnings-panel');
const previewCard = $('#preview-card');
const generateCard = $('#generate-card');
const generateBtn = $('#generate-btn');
const downloadActionContainer = $('#download-action-container');
const downloadPdfBtn = $('#download-pdf-btn');

/* ══════════════════════════════════════════════════════════
   Events
   ══════════════════════════════════════════════════════════ */

// ── Drop zone ────────────────────────────────────────────
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drop-zone--over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drop-zone--over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drop-zone--over');
  if (e.dataTransfer.files.length) handleFile(e.dataTransfer.files[0]);
});
fileInput.addEventListener('change', (e) => {
  if (e.target.files.length) handleFile(e.target.files[0]);
});
clearBtn.addEventListener('click', resetAll);
if (downloadTemplateBtn) {
  downloadTemplateBtn.addEventListener('click', () => {
    generateSampleTemplate(activeTemplate);
    showStatus('success', `Sample template downloaded for ${activeTemplate.label}!`);
  });
}
templateSelect.addEventListener('change', (e) => {
  activeTemplateId = e.target.value;
  localStorage.setItem('vpps_template_id', activeTemplateId);
  activeTemplate = getTemplateById(activeTemplateId);
});
parseBtn.addEventListener('click', runParse);
generateBtn.addEventListener('click', runGenerate);

/* ══════════════════════════════════════════════════════════
   File Upload Handler
   ══════════════════════════════════════════════════════════ */
async function handleFile(file) {
  currentFile = file;

  $('#file-name').textContent = file.name;
  $('#file-size').textContent = formatBytes(file.size);
  fileInfoBar.classList.remove('hidden');
  dropZone.classList.add('drop-zone--has-file');

  // Hide downstream sections
  hideDownstream();

  try {
    sheetNames = await getSheetNames(file);
    sheetSelect.innerHTML = sheetNames
      .map(name =>
        `<option value="${name}" ${name.toLowerCase() === activeTemplate.sheetName.toLowerCase() ? 'selected' : ''}>${name}</option>`
      )
      .join('');
    configCard.classList.remove('hidden');
    showStatus('info', `Found ${sheetNames.length} sheet(s). Configure options and click Parse & Validate.`);
  } catch (err) {
    showStatus('error', err.message);
  }
}

/* ══════════════════════════════════════════════════════════
   Parse & Validate
   ══════════════════════════════════════════════════════════ */
async function runParse() {
  if (!currentFile) return;

  const spinner = $('#parse-spinner');
  const btnText = $('#parse-btn-text');
  spinner.classList.remove('hidden');
  btnText.textContent = 'Parsing…';
  parseBtn.disabled = true;

  // Hide downstream
  previewCard.classList.add('hidden');
  generateCard.classList.add('hidden');
  errorsPanel.classList.add('hidden');
  warningsPanel.classList.add('hidden');

  try {
    const sheetOverride = sheetSelect.value || activeTemplate.sheetName;
    const result = await parseExcel(currentFile, activeTemplate, sheetOverride);

    // Apply range filter
    const from = parseInt($('#range-from').value) || 1;
    const to = parseInt($('#range-to').value) || result.students.length;
    const rangeFrom = Math.max(1, from);
    const rangeTo = Math.min(result.students.length, to);

    parsedStudents = result.students.slice(rangeFrom - 1, rangeTo);
    parseErrors = result.errors;
    parseWarnings = result.warnings;

    // Apply session override
    const sessionVal = $('#session-input').value.trim();
    if (sessionVal) {
      parsedStudents.forEach(s => { s.info.session = sessionVal; });
    }

    // Apply class/section override
    const classVal = $('#class-input').value.trim();
    if (classVal) {
      const parts = classVal.split('-');
      parsedStudents.forEach(s => {
        s.info.class = parts[0]?.trim() || s.info.class;
        if (parts[1]) s.info.section = parts[1].trim();
      });
    }

    renderResultsBanner(result, rangeFrom, rangeTo);
    renderErrorsPanels();
    renderPreview();
    showGenerateCard();

    // Emit event
    document.dispatchEvent(new CustomEvent('students:parsed', {
      detail: { students: parsedStudents, errors: parseErrors }
    }));
  } catch (err) {
    showStatus('error', `Parse failed: ${err.message}`);
  } finally {
    spinner.classList.add('hidden');
    btnText.textContent = 'Parse & Validate';
    parseBtn.disabled = false;
  }
}

/* ══════════════════════════════════════════════════════════
   Render results banner
   ══════════════════════════════════════════════════════════ */
function renderResultsBanner(result, from, to) {
  const valid = parsedStudents.filter(s => !s.computed.hasErrors).length;
  const total = parsedStudents.length;
  if (parseErrors.length === 0) {
    showStatus('success', `✅ ${total} student(s) parsed (range ${from}–${to}). All valid!`);
  } else {
    showStatus('warning', `Parsed ${total} student(s) (range ${from}–${to}) — ${valid} valid, ${total - valid} with errors.`);
  }
}

/* ══════════════════════════════════════════════════════════
   Errors / Warnings panel
   ══════════════════════════════════════════════════════════ */
function renderErrorsPanels() {
  if (parseErrors.length) {
    errorsPanel.classList.remove('hidden');
    errorsPanel.open = true;
    $('#error-count').textContent = parseErrors.length;
    $('#errors-list').innerHTML = parseErrors.map(e => `
      <div class="error-item">
        <span class="error-item__row">Row ${e.row}</span>
        <span class="error-item__field">${e.field}</span>
        <span class="error-item__msg">${e.message}</span>
      </div>`).join('');
  }

  if (parseWarnings.length) {
    warningsPanel.classList.remove('hidden');
    $('#warning-count').textContent = parseWarnings.length;
    $('#warnings-list').innerHTML = parseWarnings.map(w => `
      <div class="warning-item">
        <span class="warning-item__row">Row ${w.row}</span>
        <span class="warning-item__field">${w.field}</span>
        <span class="warning-item__msg">${w.message}</span>
      </div>`).join('');
  }
}

/* ══════════════════════════════════════════════════════════
   Preview — Student #1 front & back
   ══════════════════════════════════════════════════════════ */
function renderPreview() {
  if (!parsedStudents.length) return;

  previewCard.classList.remove('hidden');
  const student = parsedStudents[0];
  const subjects = activeTemplate.subjects;

  $('#preview-student-info').textContent = student.info.name || 'Student #1';
  renderReportCardFront($('#rc-front'), student, subjects);
  renderReportCardBack($('#rc-back'), student, subjects);
}

/* ══════════════════════════════════════════════════════════
   Generate Card section
   ══════════════════════════════════════════════════════════ */
function showGenerateCard() {
  if (!parsedStudents.length) return;
  generateCard.classList.remove('hidden');
  const valid = parsedStudents.filter(s => !s.computed.hasErrors).length;
  $('#generate-info').textContent = `Ready to generate duplex PDF for ${valid} valid student(s) out of ${parsedStudents.length} total.`;
}

/* ══════════════════════════════════════════════════════════
   PDF Generation
   ══════════════════════════════════════════════════════════ */
let generatedPdfUrl = null;

async function runGenerate() {
  if (!parsedStudents.length) return;

  const spinner = $('#generate-spinner');
  const btnText = $('#generate-btn-text');
  const progressWrap = $('#progress-wrap');
  const progressFill = $('#progress-fill');
  const progressText = $('#progress-text');

  spinner.classList.remove('hidden');
  btnText.textContent = 'Generating…';
  generateBtn.disabled = true;
  progressWrap.classList.remove('hidden');
  downloadActionContainer.classList.add('hidden');

  if (generatedPdfUrl) {
    URL.revokeObjectURL(generatedPdfUrl);
    generatedPdfUrl = null;
  }

  try {
    const validStudents = parsedStudents.filter(s => !s.computed.hasErrors);
    if (validStudents.length === 0) {
      throw new Error("No valid students without errors found to generate PDF.");
    }
    const blob = await renderReportCards(validStudents, activeTemplate.subjects, (current, total) => {
      const pct = Math.round((current / total) * 100);
      progressFill.style.width = `${pct}%`;
      progressText.textContent = `Student ${current}/${total}`;
    });

    generatedPdfUrl = URL.createObjectURL(blob);
    downloadPdfBtn.href = generatedPdfUrl;
    downloadActionContainer.classList.remove('hidden');

    downloadPdfBtn.click(); // Trigger auto-download
    showStatus('success', `🎉 PDF generated! Your download should start automatically.`);
  } catch (err) {
    showStatus('error', `PDF generation failed: ${err.message}`);
  } finally {
    spinner.classList.add('hidden');
    btnText.textContent = 'Generate Duplex PDF';
    generateBtn.disabled = false;
    setTimeout(() => {
      progressWrap.classList.add('hidden');
      progressFill.style.width = '0%';
    }, 2000);
  }
}

/* ══════════════════════════════════════════════════════════
   Reset
   ══════════════════════════════════════════════════════════ */
function resetAll() {
  currentFile = null;
  sheetNames = [];
  parsedStudents = [];
  parseErrors = [];
  parseWarnings = [];

  fileInfoBar.classList.add('hidden');
  dropZone.classList.remove('drop-zone--has-file');
  fileInput.value = '';
  hideDownstream();
}

function hideDownstream() {
  configCard.classList.add('hidden');
  statusBanner.classList.add('hidden');
  errorsPanel.classList.add('hidden');
  warningsPanel.classList.add('hidden');
  previewCard.classList.add('hidden');
  generateCard.classList.add('hidden');
  if (downloadActionContainer) {
    downloadActionContainer.classList.add('hidden');
  }
}

/* ══════════════════════════════════════════════════════════
   Utilities
   ══════════════════════════════════════════════════════════ */
function showStatus(type, message) {
  statusBanner.className = `status-banner status-banner--${type}`;
  statusBanner.textContent = message;
  statusBanner.classList.remove('hidden');
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
