/**
 * renderReportCard.js
 * ───────────────────
 * Generates professional duplex PDF report cards using pdf-lib.
 *
 * Layout:  A4 landscape (842 × 595 pts)
 * Per student:
 *   Page 1 (Front) — Header, student info, summary tiles, insights, bar chart, signatures
 *   Page 2 (Back)  — Marks table, bar + radar charts, teacher remarks
 *
 * Exports:
 *   renderReportCards(students, subjects, onProgress) → triggers .pdf download
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { makeChartsForStudent } from '../charts/makeCharts.js';

/* ── Constants ──────────────────────────────────────────────── */
const PAGE_W = 842;   // A4 landscape width  in points
const PAGE_H = 595;   // A4 landscape height in points
const MARGIN = 36;
const LINE_H = 14;
const CONTENT_W = PAGE_W - 2 * MARGIN;

/* ── Colour palette ─────────────────────────────────────────── */
const C = {
    primary: rgb(0.12, 0.11, 0.46),   // deep indigo
    accent: rgb(0.25, 0.22, 0.78),   // indigo
    text: rgb(0.10, 0.10, 0.10),
    textLight: rgb(0.40, 0.40, 0.40),
    white: rgb(1, 1, 1),
    rowAlt: rgb(0.95, 0.95, 0.98),
    border: rgb(0.78, 0.78, 0.82),
    success: rgb(0.10, 0.58, 0.28),
    danger: rgb(0.78, 0.18, 0.18),
    tileBlue: rgb(0.22, 0.42, 0.82),
    tileGreen: rgb(0.14, 0.60, 0.34),
    tileOrange: rgb(0.85, 0.50, 0.10),
    tilePurple: rgb(0.50, 0.22, 0.72),
    barFill: rgb(0.25, 0.48, 0.85),
    barAlt: rgb(0.40, 0.68, 0.92),
    radarFill: rgb(0.25, 0.48, 0.85),
    radarLine: rgb(0.12, 0.11, 0.46),
    radarGrid: rgb(0.80, 0.80, 0.84),
};

/* ══════════════════════════════════════════════════════════════
   Main export
   ══════════════════════════════════════════════════════════════ */
export async function renderReportCards(students, subjects, onProgress) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Embed logo
    let logoImage = null;
    try {
        const resp = await fetch(import.meta.env.BASE_URL + 'logo.png');
        const bytes = await resp.arrayBuffer();
        logoImage = await pdfDoc.embedPng(new Uint8Array(bytes));
    } catch { /* logo unavailable – continue without it */ }

    const total = students.length;
    const ctx = { pdfDoc, font, fontBold, logoImage, subjects };

    for (let i = 0; i < total; i++) {
        const student = students[i];
        if (onProgress) onProgress(i + 1, total);

        // Generate Chart.js charts for this student
        const { barPng, radarPng } = makeChartsForStudent(student, subjects);

        // Embed chart PNGs into the PDF document once
        let barImage = null;
        let radarImage = null;
        if (barPng) barImage = await pdfDoc.embedPng(barPng);
        if (radarPng) radarImage = await pdfDoc.embedPng(radarPng);

        await drawFrontPage(ctx, student, barImage);
        await drawBackPage(ctx, student, barImage, radarImage);

        // yield to keep UI responsive
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // ── Post-process: add page footers ──
    const pages = pdfDoc.getPages();
    const totalPages = pages.length;
    pages.forEach((page, idx) => {
        drawPageFooter(page, font, idx + 1, totalPages);
    });

    // Save & download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ReportCards_Duplex.pdf';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return blob;
}

/* ══════════════════════════════════════════════════════════════
   PAGE 1 — FRONT
   ══════════════════════════════════════════════════════════════ */
async function drawFrontPage(ctx, student, barImage) {
    const { pdfDoc, font, fontBold, logoImage, subjects } = ctx;
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const info = student.info;
    const marks = student.marks;
    const computed = student.computed;

    let y = PAGE_H - MARGIN;

    // ── 1. Header (logo + school name + address) ──
    y = drawHeader(page, fontBold, font, logoImage, y);

    // ── 2. REPORT CARD title ──
    y -= 4;
    const rcText = 'REPORT CARD';
    const rcWidth = fontBold.widthOfTextAtSize(rcText, 16);
    page.drawText(rcText, {
        x: (PAGE_W - rcWidth) / 2,
        y,
        size: 16,
        font: fontBold,
        color: C.accent,
    });
    y -= 6;
    page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 1.2,
        color: C.accent,
    });
    y -= 18;

    // ── 3. Student details (two-column) ──
    y = drawStudentInfo(page, font, fontBold, info, y);
    y -= 12;

    // ── 4. Summary tiles ──
    y = drawSummaryTiles(page, font, fontBold, computed, y);
    y -= 12;

    // ── 5. Insights box ──
    y = drawInsightsBox(page, font, fontBold, marks, subjects, y);
    y -= 12;

    // ── 6. Bar chart (Chart.js rendered PNG) ──
    const chartHeight = Math.max(y - MARGIN - 46, 80);
    y = embedChartImage(page, barImage, MARGIN, y, CONTENT_W, chartHeight,
        'Subject Performance', fontBold);

    // ── 7. Signatures (always near bottom) ──
    drawSignatures(page, font, fontBold, MARGIN + 6);
}

/* ══════════════════════════════════════════════════════════════
   PAGE 2 — BACK
   ══════════════════════════════════════════════════════════════ */
async function drawBackPage(ctx, student, barImage, radarImage) {
    const { pdfDoc, font, fontBold, logoImage, subjects } = ctx;
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const info = student.info;
    const marks = student.marks;
    const computed = student.computed;

    let y = PAGE_H - MARGIN;

    // ── Mini header ──
    y = drawMiniHeader(page, fontBold, font, logoImage, info, y);
    y -= 10;

    // ── Marks table (left half) ──
    const tableW = CONTENT_W * 0.52;
    const chartX = MARGIN + tableW + 20;
    const chartW = CONTENT_W - tableW - 20;

    const tableBottom = drawMarksTable(page, font, fontBold, marks, subjects, computed,
        MARGIN, y, tableW);

    // ── Charts section (right half) ──
    const chartAreaH = y - tableBottom;
    const halfChartH = Math.max((chartAreaH - 28) / 2, 70);

    // Bar chart (Chart.js rendered PNG)
    const barBottom = embedChartImage(page, barImage, chartX, y, chartW, halfChartH,
        null, fontBold);

    // Radar chart (Chart.js rendered PNG)
    embedChartImage(page, radarImage, chartX, barBottom - 14, chartW, halfChartH,
        null, fontBold);

    // ── Teacher remarks box ──
    const remarksY = Math.min(tableBottom, barBottom - 14 - halfChartH) - 14;
    drawRemarksBox(page, font, fontBold, remarksY);
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawHeader()
   ══════════════════════════════════════════════════════════════ */
function drawHeader(page, fontBold, font, logoImage, y) {
    const logoSize = 52;
    if (logoImage) {
        page.drawImage(logoImage, {
            x: MARGIN,
            y: y - logoSize,
            width: logoSize,
            height: logoSize,
        });
    }

    // School name — centered between logo-right and page-right
    const textBlockX = MARGIN + logoSize + 10;
    const schoolName = 'Veer Patta Public School';
    const nameSize = 17;
    const nameW = fontBold.widthOfTextAtSize(schoolName, nameSize);
    const centerX = (PAGE_W - nameW) / 2;
    page.drawText(schoolName, {
        x: Math.max(textBlockX, centerX),
        y: y - 16,
        size: nameSize,
        font: fontBold,
        color: C.primary,
    });

    const address = 'Kelwa Road, Amet, District Rajsamand, Rajasthan';
    const addrW = font.widthOfTextAtSize(address, 8.5);
    page.drawText(address, {
        x: (PAGE_W - addrW) / 2,
        y: y - 30,
        size: 8.5,
        font,
        color: C.textLight,
    });

    const tagline = 'Affiliated to CBSE, New Delhi';
    const tagW = font.widthOfTextAtSize(tagline, 7.5);
    page.drawText(tagline, {
        x: (PAGE_W - tagW) / 2,
        y: y - 42,
        size: 7.5,
        font,
        color: C.textLight,
    });

    return y - logoSize - 6;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawMiniHeader()   (used on Back page)
   ══════════════════════════════════════════════════════════════ */
function drawMiniHeader(page, fontBold, font, logoImage, info, y) {
    const logoSize = 32;
    if (logoImage) {
        page.drawImage(logoImage, {
            x: MARGIN,
            y: y - logoSize,
            width: logoSize,
            height: logoSize,
        });
    }

    page.drawText('Veer Patta Public School', {
        x: MARGIN + logoSize + 8,
        y: y - 13,
        size: 12,
        font: fontBold,
        color: C.primary,
    });

    const subLine = `Session: ${info.session || '—'}  |  ${info.name || ''}  |  Class: ${info.class || '—'}`;
    page.drawText(subLine, {
        x: MARGIN + logoSize + 8,
        y: y - 27,
        size: 7.5,
        font,
        color: C.textLight,
    });

    return y - logoSize - 4;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawStudentInfo()
   ══════════════════════════════════════════════════════════════ */
function drawStudentInfo(page, font, fontBold, info, y) {
    const fields = [
        ['Sr. No.', info.srNo],
        ['Roll No.', info.rollNo],
        ['Student Name', info.name],
        ["Father's Name", info.fatherName],
        ["Mother's Name", info.motherName],
        ['Date of Birth', info.dob],
        ['Class', `${info.class || '—'}${info.section ? ' – ' + info.section : ''}`],
        ['Session', info.session],
    ];

    const col1X = MARGIN;
    const col1VX = MARGIN + 105;
    const col2X = PAGE_W / 2 + 10;
    const col2VX = PAGE_W / 2 + 115;

    for (let r = 0; r < fields.length; r += 2) {
        const [lbl, val] = fields[r];
        page.drawText(`${lbl}:`, { x: col1X, y, size: 8.5, font: fontBold, color: C.textLight });
        page.drawText(`${val ?? '—'}`, { x: col1VX, y, size: 8.5, font, color: C.text });

        if (r + 1 < fields.length) {
            const [lbl2, val2] = fields[r + 1];
            page.drawText(`${lbl2}:`, { x: col2X, y, size: 8.5, font: fontBold, color: C.textLight });
            page.drawText(`${val2 ?? '—'}`, { x: col2VX, y, size: 8.5, font, color: C.text });
        }
        y -= LINE_H;
    }
    return y;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawSummaryTiles()
   ══════════════════════════════════════════════════════════════ */
function drawSummaryTiles(page, font, fontBold, computed, y) {
    const tileW = (CONTENT_W - 30) / 4;
    const tileH = 48;
    const gap = 10;
    const tileColors = [C.tileBlue, C.tileGreen, C.tileOrange, C.tilePurple];

    const resultText = computed.percentage >= 33 ? 'PASSED' : 'FAILED';

    const tiles = [
        { label: 'Total Marks', value: String(computed.totalMarks) },
        { label: 'Percentage', value: `${computed.percentage}%` },
        { label: 'Division/Result', value: resultText },
        { label: 'Attendance', value: '—' },
    ];

    const tileY = y - tileH;

    tiles.forEach((tile, i) => {
        const tx = MARGIN + i * (tileW + gap);

        // Background rectangle
        page.drawRectangle({
            x: tx, y: tileY,
            width: tileW, height: tileH,
            color: tileColors[i],
            borderColor: tileColors[i],
            borderWidth: 0,
        });

        // Rounded feel — overlay with slightly inset lighter stripe at top
        page.drawRectangle({
            x: tx + 1, y: tileY + tileH - 14,
            width: tileW - 2, height: 13,
            color: rgb(1, 1, 1),
            opacity: 0.12,
        });

        // Value
        const valW = fontBold.widthOfTextAtSize(tile.value, 16);
        page.drawText(tile.value, {
            x: tx + (tileW - valW) / 2,
            y: tileY + 20,
            size: 16,
            font: fontBold,
            color: C.white,
        });

        // Label
        const lblW = font.widthOfTextAtSize(tile.label, 7);
        page.drawText(tile.label, {
            x: tx + (tileW - lblW) / 2,
            y: tileY + 6,
            size: 7,
            font,
            color: rgb(1, 1, 1),
            opacity: 0.85,
        });
    });

    return tileY - 4;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawInsightsBox()
   ══════════════════════════════════════════════════════════════ */
function drawInsightsBox(page, font, fontBold, marks, subjects, y) {
    // Determine best & weakest subject
    let bestSub = null, worstSub = null;
    let bestPct = -1, worstPct = 101;

    subjects.forEach(sub => {
        const m = marks[sub.key];
        if (!m || m._total == null || isNaN(m._total)) return;
        const pct = (m._total / sub.maxMarks) * 100;
        if (pct > bestPct) { bestPct = pct; bestSub = sub.label; }
        if (pct < worstPct) { worstPct = pct; worstSub = sub.label; }
    });

    const boxH = 34;
    const boxW = CONTENT_W;

    // Soft background
    page.drawRectangle({
        x: MARGIN, y: y - boxH,
        width: boxW, height: boxH,
        color: rgb(0.94, 0.94, 0.98),
        borderColor: C.border,
        borderWidth: 0.5,
    });

    // Title
    page.drawText('Insights', {
        x: MARGIN + 8, y: y - 12,
        size: 8, font: fontBold, color: C.primary,
    });

    // Best subject
    page.drawText(`★ Best Subject: ${bestSub || '—'}`, {
        x: MARGIN + 8, y: y - 26,
        size: 7.5, font, color: C.success,
    });

    // Needs improvement
    page.drawText(`▲ Needs Improvement: ${worstSub || '—'}`, {
        x: MARGIN + CONTENT_W / 2, y: y - 26,
        size: 7.5, font, color: C.danger,
    });

    return y - boxH;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — embedChartImage()
   Embeds a Chart.js-rendered PNG into a pdf-lib page area.
   ══════════════════════════════════════════════════════════════ */
function embedChartImage(page, image, startX, startY, width, height, title, fontBold) {
    // Optional section title above the chart
    if (title && fontBold) {
        const ttW = fontBold.widthOfTextAtSize(title, 8);
        page.drawText(title, {
            x: startX + (width - ttW) / 2,
            y: startY,
            size: 8,
            font: fontBold,
            color: C.primary,
        });
    }

    const imgY = title ? startY - 10 : startY;
    const imgH = title ? height - 10 : height;

    if (!image || imgH < 30) return startY - height;

    // Light background behind chart
    page.drawRectangle({
        x: startX, y: imgY - imgH,
        width, height: imgH,
        color: rgb(0.97, 0.97, 0.99),
        borderColor: C.border,
        borderWidth: 0.3,
    });

    // Scale image to fit within the given area while preserving aspect ratio
    const imgDims = image.scale(1);
    const scaleX = (width - 8) / imgDims.width;
    const scaleY = (imgH - 4) / imgDims.height;
    const scale = Math.min(scaleX, scaleY);
    const drawW = imgDims.width * scale;
    const drawH = imgDims.height * scale;

    // Center the image within the chart area
    const drawX = startX + (width - drawW) / 2;
    const drawY = imgY - imgH + (imgH - drawH) / 2;

    page.drawImage(image, {
        x: drawX,
        y: drawY,
        width: drawW,
        height: drawH,
    });

    return imgY - imgH - 4;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawMarksTable()
   ══════════════════════════════════════════════════════════════ */
function drawMarksTable(page, font, fontBold, marks, subjects, computed, tableX, y, tableW) {
    // Column widths proportional to table width
    const colRatios = [0.30, 0.13, 0.17, 0.12, 0.28]; // Subject, Max, Obtained, Grade, Remarks
    const colWidths = colRatios.map(r => r * tableW);
    const headers = ['Subject', 'Max', 'Obtained', 'Grade', 'Remarks'];
    const rowH = 16;

    // Header row
    page.drawRectangle({
        x: tableX, y: y - rowH + 2,
        width: tableW, height: rowH,
        color: C.primary,
    });
    let cx = tableX;
    headers.forEach((h, i) => {
        page.drawText(h, {
            x: cx + 4, y: y - rowH + 6,
            size: 7.5, font: fontBold, color: C.white,
        });
        cx += colWidths[i];
    });
    y -= rowH;

    // Data rows
    subjects.forEach((sub, idx) => {
        const m = marks[sub.key];
        const total = m ? String(m._total) : '—';
        const grade = m ? getSubjectGrade(m._total, sub.maxMarks) : '—';
        const remark = getSubjectRemark(m ? m._total : null, sub.maxMarks);

        // Alternating row bg
        if (idx % 2 === 0) {
            page.drawRectangle({
                x: tableX, y: y - rowH + 2,
                width: tableW, height: rowH,
                color: C.rowAlt,
            });
        }

        cx = tableX;
        const rowData = [sub.label, String(sub.maxMarks), total, grade, remark];
        rowData.forEach((val, i) => {
            const fs = i === 4 ? 6.5 : 7.5;
            page.drawText(val, {
                x: cx + 4, y: y - rowH + 6,
                size: fs,
                font: i === 0 ? font : font,
                color: C.text,
            });
            cx += colWidths[i];
        });

        // Light bottom border
        page.drawLine({
            start: { x: tableX, y: y - rowH + 2 },
            end: { x: tableX + tableW, y: y - rowH + 2 },
            thickness: 0.25,
            color: C.border,
        });

        y -= rowH;
    });

    // Total row
    y -= 2;
    page.drawRectangle({
        x: tableX, y: y - rowH + 2,
        width: tableW, height: rowH,
        color: rgb(0.88, 0.88, 0.94),
    });
    cx = tableX;
    const totalMax = subjects.reduce((s, sub) => s + sub.maxMarks, 0);
    const totalData = [
        'TOTAL',
        String(totalMax),
        String(computed.totalMarks),
        computed.grade,
        `${computed.percentage}%`,
    ];
    totalData.forEach((val, i) => {
        page.drawText(val, {
            x: cx + 4, y: y - rowH + 6,
            size: 7.5,
            font: fontBold,
            color: C.primary,
        });
        cx += colWidths[i];
    });
    y -= rowH;

    return y;
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawSignatures()
   ══════════════════════════════════════════════════════════════ */
function drawSignatures(page, font, fontBold, y) {
    const labels = ['Class Teacher', 'Parent/Guardian', 'Principal/Seal'];
    const spacing = CONTENT_W / labels.length;

    labels.forEach((label, i) => {
        const sx = MARGIN + i * spacing + spacing / 2;

        // Signature line
        page.drawLine({
            start: { x: sx - 55, y: y + 14 },
            end: { x: sx + 55, y: y + 14 },
            thickness: 0.5,
            color: C.border,
        });

        // Label text
        const lw = font.widthOfTextAtSize(label, 7);
        page.drawText(label, {
            x: sx - lw / 2,
            y,
            size: 7,
            font,
            color: C.textLight,
        });
    });
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawRemarksBox()
   ══════════════════════════════════════════════════════════════ */
function drawRemarksBox(page, font, fontBold, y) {
    const boxW = CONTENT_W;
    const boxH = 40;
    const boxY = Math.max(y - boxH, MARGIN);

    page.drawRectangle({
        x: MARGIN, y: boxY,
        width: boxW, height: boxH,
        color: rgb(0.97, 0.97, 0.99),
        borderColor: C.border,
        borderWidth: 0.4,
    });

    page.drawText("Teacher's Remarks:", {
        x: MARGIN + 8, y: boxY + boxH - 12,
        size: 8, font: fontBold, color: C.textLight,
    });

    // Lines for writing
    for (let i = 1; i <= 2; i++) {
        const lineY = boxY + boxH - 12 - i * 12;
        if (lineY > boxY + 4) {
            page.drawLine({
                start: { x: MARGIN + 8, y: lineY },
                end: { x: MARGIN + boxW - 8, y: lineY },
                thickness: 0.3,
                color: C.border,
            });
        }
    }
}

/* ══════════════════════════════════════════════════════════════
   HELPER — drawPageFooter()
   Adds a tiny footer: "Page X of Y • Generated by VPPS Report Card Generator"
   ══════════════════════════════════════════════════════════════ */
function drawPageFooter(page, font, pageNum, totalPages) {
    const footerText = `Page ${pageNum} of ${totalPages}  \u2022  Generated by VPPS Report Card Generator`;
    const fontSize = 6;
    const textW = font.widthOfTextAtSize(footerText, fontSize);
    const { width } = page.getSize();

    page.drawText(footerText, {
        x: (width - textW) / 2,
        y: 10,
        size: fontSize,
        font,
        color: rgb(0.55, 0.55, 0.58),
    });
}

/* ══════════════════════════════════════════════════════════════
   Utility — getSubjectGrade()
   ══════════════════════════════════════════════════════════════ */
function getSubjectGrade(marks, maxMarks) {
    if (marks == null || isNaN(marks)) return '—';
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

/* ══════════════════════════════════════════════════════════════
   Utility — getSubjectRemark()
   ══════════════════════════════════════════════════════════════ */
function getSubjectRemark(marks, maxMarks) {
    if (marks == null || isNaN(marks)) return '—';
    const pct = (marks / maxMarks) * 100;
    if (pct >= 91) return 'Outstanding';
    if (pct >= 81) return 'Excellent';
    if (pct >= 71) return 'Very Good';
    if (pct >= 61) return 'Good';
    if (pct >= 51) return 'Average';
    if (pct >= 41) return 'Below Average';
    if (pct >= 33) return 'Needs Improvement';
    return 'Poor';
}
