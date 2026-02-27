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
    const rawRowsHorizontal = XLSX.utils.sheet_to_json(ws, {
        header: 1, // array-of-arrays
        defval: "",
        blankrows: false,
        raw: false, // stringify values for consistent handling
    });

    if (rawRowsHorizontal.length === 0) {
        return {
            students: [],
            errors: [{ row: 0, field: "data", message: "No data found in sheet." }],
            warnings: [],
        };
    }

    // TRANSPOSE horizontal layout into rows of students for the parser
    let maxCols = 0;
    rawRowsHorizontal.forEach(r => { if (r.length > maxCols) maxCols = r.length; });

    // We expect at least a column of fields, plus data columns
    if (maxCols < 2) {
        return {
            students: [],
            errors: [{ row: 0, field: "data", message: "No student data columns found. Ensure you are filling data into columns." }],
            warnings: [],
        };
    }

    const rawRows = [];
    for (let c = 0; c < maxCols; c++) {
        const hRow = [];
        for (let r = 0; r < rawRowsHorizontal.length; r++) {
            hRow.push(rawRowsHorizontal[r][c] !== undefined ? String(rawRowsHorizontal[r][c]).trim() : "");
        }

        // Skip totally empty transposed rows (columns)
        if (c > 0 && hRow.every(v => v === "")) continue;

        rawRows.push(hRow);
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
        let missingRequiredCols = [];
        for (const [fieldKey, fieldDef] of Object.entries(template.studentFields)) {
            const colHeader = fieldDef.excelHeader;
            const colIdx = headerIndex[colHeader.toLowerCase()];

            if (colIdx === undefined) {
                missingRequiredCols.push(colHeader);
                continue;
            }

            let value = row[colIdx];
            if (value === undefined || value === null) value = "";
            value = String(value).trim();

            // Required-field check
            if (value === "") {
                errors.push({
                    row: `Column ${XLSX.utils.encode_col(rowIdx + 1)}`,
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
                        row: `Column ${XLSX.utils.encode_col(rowIdx + 1)}`,
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

        if (missingRequiredCols.length > 0) {
            errors.push({
                row: rowNum,
                field: "info",
                message: `Missing required columns: ${missingRequiredCols.join(", ")}`,
            });
            rowHasError = true;
            // Skip further processing for this row if headers are badly broken
            students.push(student);
            return;
        }

        // ── B. Subject marks ────────────────────────────────
        let grandTotal = 0;
        let grandMax = 0;
        let selectedSubjects = [];
        let groupCounts = {};

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
            let allBlank = true;
            let componentErrors = [];
            let componentWarnings = [];
            let hasComponentError = false;

            // First pass to see if all components are completely blank
            for (const component of subject.components) {
                const colHeader = mapping[component];
                const colIdx = headerIndex[colHeader?.toLowerCase()];
                if (colIdx !== undefined) {
                    let raw = row[colIdx];
                    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
                        allBlank = false;
                        break;
                    }
                }
            }

            // Optional subject skipping logic
            if (subject.optional && allBlank) {
                continue; // Do not include in totals, warnings, or computations
            }
            if (!subject.optional && allBlank) {
                errors.push({
                    row: rowNum,
                    field: subject.key,
                    message: `Required subject "${subject.label}" is completely blank.`,
                });
                rowHasError = true;
                continue;
            }

            selectedSubjects.push(subject);
            if (subject.choiceGroup) {
                groupCounts[subject.choiceGroup] = (groupCounts[subject.choiceGroup] || 0) + 1;
            }

            // Second pass: actually compute values, validating against maxes and types
            for (const component of subject.components) {
                const colHeader = mapping[component];
                const maxVal = subject.componentMax ? subject.componentMax[component] : subject.maxMarks;

                if (!colHeader) {
                    componentWarnings.push({ field: `${subject.key}.${component}`, message: `No column header mapped for ${subject.label} → ${component}.` });
                    subjectMarks[component] = null;
                    continue;
                }

                const colIdx = headerIndex[colHeader.toLowerCase()];
                if (colIdx === undefined) {
                    componentErrors.push({ field: `${subject.key}.${component}`, message: `Column "${colHeader}" not found in headers.` });
                    hasComponentError = true;
                    subjectMarks[component] = null;
                    continue;
                }

                let raw = row[colIdx];
                if (raw === undefined || raw === null || String(raw).trim() === "") {
                    componentWarnings.push({ field: `${subject.key}.${component}`, message: `${subject.label} ${component} is blank — treated as 0.` });
                    raw = 0;
                } else if (typeof raw === "string" && raw.trim().toUpperCase() === "AB") {
                    componentWarnings.push({ field: `${subject.key}.${component}`, message: `${subject.label} ${component} is marked 'AB' (Absent) — treated as 0.` });
                    raw = 0;
                }

                const num = Number(raw);
                if (isNaN(num)) {
                    componentErrors.push({ field: `${subject.key}.${component}`, message: `${subject.label} ${component}: expected number, got "${raw}".` });
                    hasComponentError = true;
                    subjectMarks[component] = null;
                    continue;
                }

                if (num < 0) {
                    componentErrors.push({ field: `${subject.key}.${component}`, message: `${subject.label} ${component}: marks cannot be negative (${num}).` });
                    hasComponentError = true;
                } else if (maxVal && num > maxVal) {
                    componentErrors.push({ field: `${subject.key}.${component}`, message: `${subject.label} ${component}: exceeds max marks (${num} > ${maxVal}).` });
                    hasComponentError = true;
                }

                subjectMarks[component] = num;
                subjectTotal += num;
            }

            // Push all gathered warnings/errors for this subject
            if (hasComponentError) {
                rowHasError = true;
            }
            const colId = `Column ${XLSX.utils.encode_col(rowIdx + 1)}`;
            componentErrors.forEach((e) => errors.push({ row: colId, field: e.field, message: e.message }));
            componentWarnings.forEach((w) => warnings.push({ row: colId, field: w.field, message: w.message }));

            // ── Computed total for this subject ───────────────
            subjectMarks._total = subjectTotal;
            subjectMarks._max = subject.maxMarks;
            subjectMarks._percentage = subject.maxMarks > 0 ? (subjectTotal / subject.maxMarks) * 100 : 0;

            if (subjectTotal > subject.maxMarks) {
                errors.push({
                    row: `Column ${XLSX.utils.encode_col(rowIdx + 1)}`,
                    field: subject.key,
                    message: `${subject.label}: total ${subjectTotal} exceeds max marks ${subject.maxMarks}.`,
                });
                rowHasError = true;
            }

            student.marks[subject.key] = subjectMarks;
            grandTotal += subjectTotal;
            grandMax += subject.maxMarks;
        }

        // Choice Group validation
        for (const [groupId, groupDef] of Object.entries(template.choiceGroups || {})) {
            const count = groupCounts[groupId] || 0;
            if (count < groupDef.min || count > groupDef.max) {
                errors.push({
                    row: `Column ${XLSX.utils.encode_col(rowIdx + 1)}`,
                    field: 'choiceGroup',
                    message: `${groupDef.label} must select exactly ${groupDef.min} (selected ${count}).`,
                });
                rowHasError = true;
            }
        }

        // ── C. Computed aggregates ──────────────────────────
        let failedSubjects = [];
        for (const subj of selectedSubjects) {
            const sm = student.marks[subj.key];
            if (sm && sm._percentage < template.grading.passPercent) {
                failedSubjects.push(subj.label);
            }
        }

        const pct = grandMax > 0 ? parseFloat(((grandTotal / grandMax) * 100).toFixed(2)) : 0;
        student.computed.subjects = selectedSubjects;
        student.computed.totalMarks = grandTotal;
        student.computed.maxMarks = grandMax;
        student.computed.percentage = pct;
        student.computed.grade = computeGrade(pct);
        student.computed.failedSubjects = failedSubjects;

        if (failedSubjects.length > 0) {
            student.computed.resultText = "FAILED";
        } else {
            student.computed.resultText = "PASSED";
            let divLabel = "";
            // Find highest passing division
            for (const div of template.grading.divisions) {
                if (pct >= div.threshold) {
                    divLabel = div.name;
                    break;
                }
            }
            if (divLabel) {
                student.computed.division = divLabel;
            }
        }

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
    // Use EXACT names as requested if possible or fallback to standard config behavior.
    // Since the prompt explicitly said "Columns must include: SR_NO, ROLL_NO, STUDENT_NAME, FATHER_NAME, MOTHER_NAME, DOB, CLASS, SECTION, SESSION, ATTEND_PRESENT, ATTEND_TOTAL"
    // However, the parser relies on `template.studentFields`. We should construct the headers from the template to ensure parser compatibility, but the prompt says 
    // "Columns must include: SR_NO, ROLL_NO, STUDENT_NAME, FATHER_NAME, MOTHER_NAME, DOB, CLASS, SECTION, SESSION, ATTEND_PRESENT, ATTEND_TOTAL"
    // Wait, the prompt says "Ensure the template matches the parser... The parser should validate required columns and show missing-column errors clearly."
    // If we use "SR_NO" but the template says "Sr No", the parser will fail. Let's update `defaultTemplate.js` to match these new headers OR just output what's in deafultTemplate but also ensure attendances are added.

    // Let's rely on defaultTemplate fields for the main info to guarantee parser compatibility, plus add attendance.
    for (const field of Object.values(template.studentFields)) {
        cols.push(field.excelHeader);
    }

    // (Attendance fields are already included in template.studentFields)

    // Subject marks columns
    for (const subject of template.subjects) {
        const mapping = template.columnMappings[subject.key];
        if (mapping) {
            for (const comp of subject.components) {
                cols.push(mapping[comp]);
            }
        }
    }

    // Sample data rows
    const data = [cols];

    // Build some sample rows
    function createRow(id, name, optionalChoices = []) {
        let row = [];
        row.push(id); // SR_NO
        row.push(100 + id); // ROLL_NO
        row.push(name); // STUDENT_NAME
        row.push(`Father ${name}`); // FATHER_NAME
        row.push(`Mother ${name}`); // MOTHER_NAME
        row.push(`15/05/2012`); // DOB
        row.push("XI"); // CLASS
        row.push("A"); // SECTION
        row.push("2024-25"); // SESSION
        row.push(200); // ATTEND_TOTAL

        row.push("A"); // CO_WORK_ED
        row.push("A"); // CO_ART_ED
        row.push("A"); // CO_HEALTH_ED
        row.push("A"); // CO_DISCIPLINE

        for (const subject of template.subjects) {
            if (subject.optional && !optionalChoices.includes(subject.key)) {
                // leave blank
                for (const _ of subject.components) {
                    row.push("");
                }
            } else {
                for (const comp of subject.components) {
                    let mark = Math.max(1, Math.floor((subject.componentMax ? subject.componentMax[comp] : subject.maxMarks) * 0.8)); // 80% mark
                    row.push(mark);
                }
            }
        }
        return row;
    }

    const horizontalData = [cols];

    if (template.id === 'class11_science') {
        horizontalData.push(createRow(1, "Aarav Sharma (Math)", ["math"]));
        horizontalData.push(createRow(2, "Priya Verma (Bio)", ["biology"]));
    } else if (template.id === 'class11_arts') {
        horizontalData.push(createRow(1, "Rohan Das", ["geography", "political_science", "english_lit"]));
        horizontalData.push(createRow(2, "Sunita Yadav", ["political_science", "english_lit", "economics"]));
    } else {
        horizontalData.push(createRow(1, "General Student 1"));
        horizontalData.push(createRow(2, "General Student 2"));
    }

    // Transpose
    const transposedData = horizontalData[0].map((_, colIndex) => horizontalData.map(row => row[colIndex]));

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(transposedData);

    // Make first column wider for headers, subsequent columns wide for student names
    const colWidths = [{ wch: 30 }];
    for (let i = 1; i < transposedData[0].length; i++) {
        colWidths.push({ wch: 22 });
    }
    ws['!cols'] = colWidths;

    // Bold first column
    for (let R = 0; R < transposedData.length; ++R) {
        const addr = XLSX.utils.encode_cell({ r: R, c: 0 });
        if (!ws[addr]) continue;
        ws[addr].s = { font: { bold: true } };
    }

    // Freeze first column
    ws['!views'] = [{ state: 'frozen', xSplit: 1, ySplit: 0 }];

    XLSX.utils.book_append_sheet(wb, ws, template.sheetName || "details");

    // Add instructions sheet
    const instructionsData = [
        ["VPPS Report Card Excel Template Instructions"],
        [""],
        ["1. One COLUMN = one student. Fill data vertically!"],
        ["2. Do not rename the fields on the 'details' sheet, the system relies on exact names."],
        ["3. Marks must be numerical values or 'AB' (Absent)."],
        ["4. Date of Birth (DOB) must be formatted as DD/MM/YYYY."],
        ["5. Ensure Attend Present and Attend Total fields are complete."],
        ["6. Make sure you enter the data in the 'details' sheet only."],
        ["7. If a subject is OPTIONAL and not taken, leave its columns COMPLETELY BLANK."],
    ];

    if (template.choiceGroups) {
        for (const [id, def] of Object.entries(template.choiceGroups)) {
            instructionsData.push([`8. Choice Group - ${def.label}: You must fill EXACTLY ${def.min} subject(s). Keep others in this group blank.`]);
        }
    }

    const wsInstructions = XLSX.utils.aoa_to_sheet(instructionsData);
    wsInstructions['!cols'] = [{ wch: 80 }];

    // Make Instruction Title Bold
    if (wsInstructions['A1']) {
        wsInstructions['A1'].s = { font: { bold: true, sz: 14 } };
    }

    XLSX.utils.book_append_sheet(wb, wsInstructions, "instructions");

    // Write sheet and trigger download
    XLSX.writeFile(wb, template.downloadFileName || "VPPS_ReportCard_Template.xlsx");
}
