/**
 * excelParser.js
 * ──────────────
 * Reads an uploaded Excel workbook via SheetJS, maps columns to the
 * template schema, validates required fields, computes totals &
 * percentages in pure JS (no dependency on Excel formulas).
 *
 * Public API:
 *   • getSheetNames(file)          → Promise<string[]>
 *   • parseExcel(file, template, sheetOverride?)
 *       → Promise<{ students, errors, warnings }>
 */

import * as XLSX from "xlsx";

/* ═══════════════════════════════════════════════════════════
   1. READ WORKBOOK
   ═══════════════════════════════════════════════════════════ */

/**
 * Read an uploaded File/Blob into a SheetJS workbook.
 * @param {File} file
 * @returns {Promise<import('xlsx').WorkBook>}
 */
function readWorkbook(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const wb = XLSX.read(data, { type: "array", cellDates: true });
                resolve(wb);
            } catch (err) {
                reject(new Error(`Failed to read Excel file: ${err.message}`));
            }
        };
        reader.onerror = () => reject(new Error("FileReader error"));
        reader.readAsArrayBuffer(file);
    });
}

/* ═══════════════════════════════════════════════════════════
   2. PUBLIC — get sheet names (to populate dropdown)
   ═══════════════════════════════════════════════════════════ */

/**
 * Return an array of sheet names found in the workbook.
 * @param {File} file
 * @returns {Promise<string[]>}
 */
export async function getSheetNames(file) {
    const wb = await readWorkbook(file);
    return wb.SheetNames;
}

/* ═══════════════════════════════════════════════════════════
   3. PUBLIC — full parse pipeline
   ═══════════════════════════════════════════════════════════ */

/**
 * Parse an Excel file according to the supplied template.
 *
 * @param {File}   file            Uploaded Excel file
 * @param {Object} template        Template object (see defaultTemplate.js)
 * @param {string} [sheetOverride] Optional sheet name override
 * @returns {Promise<ParseResult>}
 *
 * @typedef  {Object} ParseResult
 * @property {StudentRecord[]} students  Parsed & computed student records
 * @property {ParseError[]}    errors    Validation errors (row-level)
 * @property {ParseWarning[]}  warnings  Non-fatal warnings
 */
export async function parseExcel(file, template, sheetOverride) {
    const wb = await readWorkbook(file);

    // ── Resolve target sheet ──────────────────────────────
    const targetSheet = sheetOverride || template.sheetName || "details";
    if (!wb.SheetNames.includes(targetSheet)) {
        return {
            students: [],
            errors: [
                {
                    row: 0,
                    field: "sheet",
                    message: `Sheet "${targetSheet}" not found. Available sheets: ${wb.SheetNames.join(", ")}`,
                },
            ],
            warnings: [],
        };
    }

    const ws = wb.Sheets[targetSheet];
    const headerRow = template.headerRow || 1;

    // Convert sheet to array-of-arrays so we control header resolution
    const rawRows = XLSX.utils.sheet_to_json(ws, {
        header: 1, // array-of-arrays
        defval: "",
        blankrows: false,
        raw: false, // stringify values for consistent handling
    });

    if (rawRows.length < headerRow + 1) {
        return {
            students: [],
            errors: [{ row: 0, field: "data", message: "No data rows found after the header row." }],
            warnings: [],
        };
    }

    // ── Build header index ────────────────────────────────
    const headers = rawRows[headerRow - 1].map((h) => String(h).trim());
    const headerIndex = {};
    headers.forEach((h, i) => {
        headerIndex[h.toLowerCase()] = i;
    });

    const dataRows = rawRows.slice(headerRow);
    const students = [];
    const errors = [];
    const warnings = [];

    /* ─────────────────────────────────────────────────────
       Process each data row
       ───────────────────────────────────────────────────── */
    dataRows.forEach((row, rowIdx) => {
        const rowNum = rowIdx + headerRow + 1; // 1-based Excel row number
        const student = { _row: rowNum, info: {}, marks: {}, computed: {} };
        let rowHasError = false;

        // ── A. Student info fields ──────────────────────────
        for (const [fieldKey, fieldDef] of Object.entries(template.studentFields)) {
            const colHeader = fieldDef.excelHeader;
            const colIdx = headerIndex[colHeader.toLowerCase()];

            if (colIdx === undefined) {
                errors.push({
                    row: rowNum,
                    field: fieldKey,
                    message: `Column "${colHeader}" not found in headers.`,
                });
                rowHasError = true;
                continue;
            }

            let value = row[colIdx];
            if (value === undefined || value === null) value = "";
            value = String(value).trim();

            // Required-field check
            if (value === "") {
                errors.push({
                    row: rowNum,
                    field: fieldKey,
                    message: `"${fieldDef.label}" is empty.`,
                });
                rowHasError = true;
            }

            // Type coercion
            if (fieldDef.type === "number" && value !== "") {
                const num = Number(value);
                if (isNaN(num)) {
                    errors.push({
                        row: rowNum,
                        field: fieldKey,
                        message: `"${fieldDef.label}" should be a number but got "${value}".`,
                    });
                    rowHasError = true;
                } else {
                    value = num;
                }
            }

            student.info[fieldKey] = value;
        }

        // ── B. Subject marks ────────────────────────────────
        let grandTotal = 0;
        let grandMax = 0;

        for (const subject of template.subjects) {
            const mapping = template.columnMappings[subject.key];
            if (!mapping) {
                warnings.push({
                    row: rowNum,
                    field: subject.key,
                    message: `No column mapping defined for subject "${subject.label}". Skipped.`,
                });
                continue;
            }

            const subjectMarks = {};
            let subjectTotal = 0;

            for (const component of subject.components) {
                const colHeader = mapping[component];
                if (!colHeader) {
                    warnings.push({
                        row: rowNum,
                        field: `${subject.key}.${component}`,
                        message: `No column header mapped for ${subject.label} → ${component}.`,
                    });
                    subjectMarks[component] = null;
                    continue;
                }

                const colIdx = headerIndex[colHeader.toLowerCase()];
                if (colIdx === undefined) {
                    errors.push({
                        row: rowNum,
                        field: `${subject.key}.${component}`,
                        message: `Column "${colHeader}" not found in headers.`,
                    });
                    rowHasError = true;
                    subjectMarks[component] = null;
                    continue;
                }

                let raw = row[colIdx];
                if (raw === undefined || raw === null || String(raw).trim() === "") {
                    // Treat blank marks as 0 with a warning
                    warnings.push({
                        row: rowNum,
                        field: `${subject.key}.${component}`,
                        message: `${subject.label} ${component} is blank — treated as 0.`,
                    });
                    raw = 0;
                }

                const num = Number(raw);
                if (isNaN(num)) {
                    errors.push({
                        row: rowNum,
                        field: `${subject.key}.${component}`,
                        message: `${subject.label} ${component}: expected number, got "${raw}".`,
                    });
                    rowHasError = true;
                    subjectMarks[component] = null;
                    continue;
                }

                if (num < 0) {
                    errors.push({
                        row: rowNum,
                        field: `${subject.key}.${component}`,
                        message: `${subject.label} ${component}: marks cannot be negative (${num}).`,
                    });
                    rowHasError = true;
                }

                subjectMarks[component] = num;
                subjectTotal += num;
            }

            // ── Computed total for this subject ───────────────
            subjectMarks._total = subjectTotal;
            subjectMarks._max = subject.maxMarks;

            // Validate total does not exceed max
            if (subjectTotal > subject.maxMarks) {
                errors.push({
                    row: rowNum,
                    field: subject.key,
                    message: `${subject.label}: total ${subjectTotal} exceeds max marks ${subject.maxMarks}.`,
                });
                rowHasError = true;
            }

            student.marks[subject.key] = subjectMarks;
            grandTotal += subjectTotal;
            grandMax += subject.maxMarks;
        }

        // ── C. Computed aggregates ──────────────────────────
        student.computed.totalMarks = grandTotal;
        student.computed.maxMarks = grandMax;
        student.computed.percentage = grandMax > 0 ? parseFloat(((grandTotal / grandMax) * 100).toFixed(2)) : 0;
        student.computed.grade = computeGrade(student.computed.percentage);
        student.computed.hasErrors = rowHasError;

        students.push(student);
    });

    return { students, errors, warnings };
}

/* ═══════════════════════════════════════════════════════════
   4. HELPERS
   ═══════════════════════════════════════════════════════════ */

/**
 * Map percentage to a letter grade.
 * Customize thresholds as needed.
 */
function computeGrade(pct) {
    if (pct >= 91) return "A1";
    if (pct >= 81) return "A2";
    if (pct >= 71) return "B1";
    if (pct >= 61) return "B2";
    if (pct >= 51) return "C1";
    if (pct >= 41) return "C2";
    if (pct >= 33) return "D";
    return "E";
}

/* ═══════════════════════════════════════════════════════════
   5. PUBLIC — sample template generation
   ═══════════════════════════════════════════════════════════ */

/**
 * Generates and downloads a sample Excel template based on the schema.
 * @param {Object} template 
 */
export function generateSampleTemplate(template) {
    const cols = [];

    // Student Info columns
    for (const field of Object.values(template.studentFields)) {
        cols.push(field.excelHeader);
    }

    // Subject marks columns
    for (const subject of template.subjects) {
        const mapping = template.columnMappings[subject.key];
        if (mapping) {
            for (const comp of subject.components) {
                if (mapping[comp]) cols.push(mapping[comp]);
            }
        }
    }

    // Sample data rows
    const data = [
        cols,
        [1, 101, "Aarav Sharma", "Rahul Sharma", "Priya Sharma", "15/05/2012", "V", "A", "2024-25", 75, 18, 80, 19, 92, 85, 15, 88, 45, 48, 90, 95, 85, 90],
        [2, 102, "Isha Verma", "Anil Verma", "Kavita Verma", "22/08/2012", "V", "A", "2024-25", 88, 19, 85, 18, 78, 75, 19, 90, 40, 45, 85, 92, 90, 85]
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(data);

    // Make columns wider
    ws['!cols'] = cols.map(c => ({ wch: Math.max(c.length + 2, 12) }));

    // Write sheet and trigger download
    XLSX.utils.book_append_sheet(wb, ws, template.sheetName || "details");
    XLSX.writeFile(wb, "VPPS_Sample_Template.xlsx");
}
