import './style.css';
import { mountUploadUI } from './src/ui/uploadUI.js';

/* ── Bootstrap the app ───────────────────────────────────── */
const app = document.querySelector('#app');

app.innerHTML = `
  <header class="app-header">
    <h1>VPPS Report Cards Generator</h1>
    <p class="subtitle">Upload your marks Excel sheet, validate data, and generate beautiful report cards.</p>
  </header>
  <main id="main-content"></main>
`;

mountUploadUI(document.querySelector('#main-content'));

/* ── Listen for parsed students (other modules can subscribe too) ── */
document.addEventListener('students:parsed', (e) => {
  const { students, errors } = e.detail;
  console.log(
    `%c[Parser] ${students.length} students parsed, ${errors.length} errors`,
    'color: #6c63ff; font-weight: bold;'
  );
  // The parsed student array is available at e.detail.students
  // Other modules (PDF generator, chart, etc.) can consume it here.
});
