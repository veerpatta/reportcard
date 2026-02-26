/**
 * reportCardPreview.js
 * ────────────────────
 * Renders an HTML preview of a single student's report card:
 *   - FRONT: School info, student details, marks table, totals
 *   - BACK:  Co-scholastic areas, attendance, remarks, signature blocks
 */

/* ══════════════════════════════════════════════════════════
   FRONT SIDE
   ══════════════════════════════════════════════════════════ */
export function renderReportCardFront(container, student, subjects) {
    const info = student.info;
    const marks = student.marks;
    const computed = student.computed;

    container.innerHTML = `
    <div class="rc rc--front">
      <!-- Header -->
      <div class="rc__header">
        <img src="/logo.png" alt="VPPS" class="rc__logo" />
        <div class="rc__school-info">
          <h2 class="rc__school-name">Veer Patta Public School</h2>
          <p class="rc__school-sub">Affiliated to CBSE, New Delhi</p>
          <p class="rc__school-sub rc__school-sub--sm">Session: ${info.session || '—'}</p>
        </div>
      </div>

      <div class="rc__title-bar">REPORT CARD</div>

      <!-- Student info grid -->
      <div class="rc__info-grid">
        <div class="rc__info-item">
          <span class="rc__info-label">Sr. No.</span>
          <span class="rc__info-value">${info.srNo || '—'}</span>
        </div>
        <div class="rc__info-item">
          <span class="rc__info-label">Roll No.</span>
          <span class="rc__info-value">${info.rollNo || '—'}</span>
        </div>
        <div class="rc__info-item rc__info-item--wide">
          <span class="rc__info-label">Student Name</span>
          <span class="rc__info-value">${info.name || '—'}</span>
        </div>
        <div class="rc__info-item">
          <span class="rc__info-label">Father's Name</span>
          <span class="rc__info-value">${info.fatherName || '—'}</span>
        </div>
        <div class="rc__info-item">
          <span class="rc__info-label">Mother's Name</span>
          <span class="rc__info-value">${info.motherName || '—'}</span>
        </div>
        <div class="rc__info-item">
          <span class="rc__info-label">Date of Birth</span>
          <span class="rc__info-value">${info.dob || '—'}</span>
        </div>
        <div class="rc__info-item">
          <span class="rc__info-label">Class</span>
          <span class="rc__info-value">${info.class || '—'} ${info.section ? '- ' + info.section : ''}</span>
        </div>
      </div>

      <!-- Marks table -->
      <table class="rc__marks-table">
        <thead>
          <tr>
            <th>Subject</th>
            <th>Max Marks</th>
            <th>Marks Obtained</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${subjects.map(sub => {
        const m = marks[sub.key];
        const total = m ? m._total : '—';
        const grade = m ? getSubjectGrade(total, sub.maxMarks) : '—';
        return `
              <tr>
                <td>${sub.label}</td>
                <td class="rc__td-center">${sub.maxMarks}</td>
                <td class="rc__td-center rc__td-marks">${total}</td>
                <td class="rc__td-center rc__td-grade">${grade}</td>
              </tr>`;
    }).join('')}
        </tbody>
        <tfoot>
          <tr class="rc__total-row">
            <td>Total</td>
            <td class="rc__td-center">${subjects.reduce((sum, s) => sum + s.maxMarks, 0)}</td>
            <td class="rc__td-center">${computed.totalMarks}</td>
            <td class="rc__td-center">${computed.grade}</td>
          </tr>
          <tr class="rc__pct-row">
            <td colspan="2">Percentage</td>
            <td class="rc__td-center" colspan="2">${computed.percentage}%</td>
          </tr>
        </tfoot>
      </table>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   BACK SIDE
   ══════════════════════════════════════════════════════════ */
export function renderReportCardBack(container, student, subjects) {
    const info = student.info;
    const computed = student.computed;

    container.innerHTML = `
    <div class="rc rc--back">
      <!-- Header (repeated for print) -->
      <div class="rc__header rc__header--compact">
        <img src="/logo.png" alt="VPPS" class="rc__logo rc__logo--sm" />
        <div class="rc__school-info">
          <h2 class="rc__school-name rc__school-name--sm">Veer Patta Public School</h2>
          <p class="rc__school-sub rc__school-sub--sm">Session: ${info.session || '—'}</p>
        </div>
      </div>

      <div class="rc__title-bar rc__title-bar--sm">CO-SCHOLASTIC AREAS</div>

      <!-- Co-scholastic table -->
      <table class="rc__marks-table rc__marks-table--compact">
        <thead>
          <tr>
            <th>Area</th>
            <th>Grade</th>
          </tr>
        </thead>
        <tbody>
          ${[
            'Work Education', 'Art Education', 'Health & Physical Education',
            'Discipline', 'Library Skills'
        ].map(area => `
            <tr>
              <td>${area}</td>
              <td class="rc__td-center">A</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <!-- Attendance -->
      <div class="rc__title-bar rc__title-bar--sm">ATTENDANCE RECORD</div>
      <table class="rc__marks-table rc__marks-table--compact">
        <thead>
          <tr>
            <th>Total Working Days</th>
            <th>Days Present</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td class="rc__td-center">—</td>
            <td class="rc__td-center">—</td>
          </tr>
        </tbody>
      </table>

      <!-- Result & Remarks -->
      <div class="rc__result-block">
        <div class="rc__result-item">
          <span class="rc__result-label">Result</span>
          <span class="rc__result-value rc__result-value--${computed.percentage >= 33 ? 'pass' : 'fail'}">
            ${computed.percentage >= 33 ? 'PASSED' : 'FAILED'}
          </span>
        </div>
        <div class="rc__result-item">
          <span class="rc__result-label">Overall Grade</span>
          <span class="rc__result-value">${computed.grade}</span>
        </div>
        <div class="rc__result-item rc__result-item--wide">
          <span class="rc__result-label">Percentage</span>
          <span class="rc__result-value">${computed.percentage}%</span>
        </div>
      </div>

      <!-- Remarks -->
      <div class="rc__remarks">
        <p class="rc__remarks-label">Teacher's Remarks:</p>
        <div class="rc__remarks-line"></div>
      </div>

      <!-- Signatures -->
      <div class="rc__signatures">
        <div class="rc__sig">
          <div class="rc__sig-line"></div>
          <span>Class Teacher</span>
        </div>
        <div class="rc__sig">
          <div class="rc__sig-line"></div>
          <span>Principal</span>
        </div>
        <div class="rc__sig">
          <div class="rc__sig-line"></div>
          <span>Parent/Guardian</span>
        </div>
      </div>
    </div>
  `;
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */
function getSubjectGrade(marks, maxMarks) {
    if (marks === '—' || marks == null || isNaN(marks)) return '—';
    const pct = (marks / maxMarks) * 100;
    if (pct >= 91) return 'A1';
    if (pct >= 81) return 'A2';
    if (pct >= 71) return 'B1';
    if (pct >= 61) return 'B2';
    if (pct >= 51) return 'C1';
    if (pct >= 41) return 'C2';
    if (pct >= 33) return 'D';
    return 'E';
}
