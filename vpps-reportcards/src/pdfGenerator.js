/**
 * pdfGenerator.js
 * ───────────────
 * Generates a duplex PDF of report cards using pdf-lib.
 * Each student gets 2 pages (front + back) in a single PDF.
 *
 * Uses html-to-image-like technique with pdf-lib text drawing
 * for a simple but effective approach.
 */

import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';

/* ── Constants ────────────────────────────────────────────── */
const PAGE_W = 595.28; // A4 width in points
const PAGE_H = 841.89; // A4 height in points
const MARGIN = 40;
const LINE_H = 16;
const COL_W = PAGE_W - 2 * MARGIN;

/* ══════════════════════════════════════════════════════════
   Main export
   ══════════════════════════════════════════════════════════ */
export async function generateDuplexPDF(students, subjects, onProgress) {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    // Try to embed logo
    let logoImage = null;
    try {
        const logoResp = await fetch('/logo.png');
        const logoBytes = await logoResp.arrayBuffer();
        logoImage = await pdfDoc.embedPng(new Uint8Array(logoBytes));
    } catch {
        // Skip logo if unavailable
    }

    const total = students.length;

    for (let i = 0; i < students.length; i++) {
        const student = students[i];
        if (onProgress) onProgress(i + 1, total);

        // ── FRONT PAGE ──
        drawFrontPage(pdfDoc, student, subjects, font, fontBold, logoImage);

        // ── BACK PAGE ──
        drawBackPage(pdfDoc, student, subjects, font, fontBold, logoImage);

        // Small delay to keep UI responsive
        if (i % 5 === 0) await new Promise(r => setTimeout(r, 0));
    }

    // Download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ReportCards_Duplex.pdf';
    a.click();
    URL.revokeObjectURL(url);
}

/* ══════════════════════════════════════════════════════════
   FRONT PAGE
   ══════════════════════════════════════════════════════════ */
function drawFrontPage(pdfDoc, student, subjects, font, fontBold, logoImage) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const info = student.info;
    const marks = student.marks;
    const computed = student.computed;
    let y = PAGE_H - MARGIN;

    // ── Logo + School Name ──
    if (logoImage) {
        const logoDim = logoImage.scale(0.08);
        page.drawImage(logoImage, {
            x: MARGIN,
            y: y - logoDim.height,
            width: logoDim.width,
            height: logoDim.height,
        });
    }

    const schoolNameX = MARGIN + 60;
    page.drawText('Veer Patta Public School', {
        x: schoolNameX,
        y: y - 18,
        size: 18,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.4),
    });
    page.drawText('Affiliated to CBSE, New Delhi', {
        x: schoolNameX,
        y: y - 34,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
    });
    page.drawText(`Session: ${info.session || '—'}`, {
        x: schoolNameX,
        y: y - 48,
        size: 9,
        font: font,
        color: rgb(0.4, 0.4, 0.4),
    });

    y -= 70;

    // ── Title ──
    const titleText = 'REPORT CARD';
    const titleWidth = fontBold.widthOfTextAtSize(titleText, 14);
    page.drawText(titleText, {
        x: (PAGE_W - titleWidth) / 2,
        y,
        size: 14,
        font: fontBold,
        color: rgb(0.25, 0.22, 0.8),
    });
    y -= 8;
    // Underline
    page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 1.5,
        color: rgb(0.25, 0.22, 0.8),
    });
    y -= 24;

    // ── Student Info ──
    const infoFields = [
        ['Sr. No.', info.srNo],
        ['Roll No.', info.rollNo],
        ['Student Name', info.name],
        ["Father's Name", info.fatherName],
        ["Mother's Name", info.motherName],
        ['Date of Birth', info.dob],
        ['Class', `${info.class || '—'}${info.section ? ' - ' + info.section : ''}`],
    ];

    for (let r = 0; r < infoFields.length; r += 2) {
        const left = infoFields[r];
        page.drawText(`${left[0]}:`, { x: MARGIN, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
        page.drawText(`${left[1] || '—'}`, { x: MARGIN + 110, y, size: 9, font, color: rgb(0.1, 0.1, 0.1) });

        if (r + 1 < infoFields.length) {
            const right = infoFields[r + 1];
            page.drawText(`${right[0]}:`, { x: PAGE_W / 2, y, size: 9, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
            page.drawText(`${right[1] || '—'}`, { x: PAGE_W / 2 + 110, y, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        }
        y -= LINE_H;
    }

    y -= 10;

    // ── Marks Table ──
    const tableX = MARGIN;
    const colWidths = [200, 80, 110, 80]; // Subject, Max, Obtained, Grade
    const headers = ['Subject', 'Max Marks', 'Marks Obtained', 'Grade'];

    // Header row background
    page.drawRectangle({
        x: tableX,
        y: y - 14,
        width: COL_W,
        height: 20,
        color: rgb(0.15, 0.14, 0.5),
    });

    let cx = tableX;
    headers.forEach((h, i) => {
        page.drawText(h, {
            x: cx + 6,
            y: y - 10,
            size: 9,
            font: fontBold,
            color: rgb(1, 1, 1),
        });
        cx += colWidths[i];
    });
    y -= 20;

    // Rows
    subjects.forEach((sub, idx) => {
        const m = marks[sub.key];
        const total = m ? String(m._total) : '—';
        const grade = m ? getSubjectGrade(m._total, sub.maxMarks) : '—';

        // Alternating row bg
        if (idx % 2 === 0) {
            page.drawRectangle({
                x: tableX,
                y: y - 12,
                width: COL_W,
                height: 18,
                color: rgb(0.95, 0.95, 0.98),
            });
        }

        cx = tableX;
        const rowData = [sub.label, String(sub.maxMarks), total, grade];
        rowData.forEach((val, i) => {
            page.drawText(val, {
                x: cx + 6,
                y: y - 8,
                size: 9,
                font: i === 0 ? font : font,
                color: rgb(0.1, 0.1, 0.1),
            });
            cx += colWidths[i];
        });
        y -= 18;
    });

    // Total row
    y -= 2;
    page.drawRectangle({
        x: tableX,
        y: y - 12,
        width: COL_W,
        height: 20,
        color: rgb(0.88, 0.88, 0.95),
    });
    cx = tableX;
    const totalData = [
        'TOTAL',
        String(subjects.reduce((s, sub) => s + sub.maxMarks, 0)),
        String(computed.totalMarks),
        computed.grade,
    ];
    totalData.forEach((val, i) => {
        page.drawText(val, {
            x: cx + 6,
            y: y - 8,
            size: 9,
            font: fontBold,
            color: rgb(0.1, 0.1, 0.4),
        });
        cx += colWidths[i];
    });
    y -= 24;

    // Percentage
    page.drawText(`Percentage: ${computed.percentage}%`, {
        x: MARGIN,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.2, 0.2, 0.6),
    });
}

/* ══════════════════════════════════════════════════════════
   BACK PAGE
   ══════════════════════════════════════════════════════════ */
function drawBackPage(pdfDoc, student, subjects, font, fontBold, logoImage) {
    const page = pdfDoc.addPage([PAGE_W, PAGE_H]);
    const info = student.info;
    const computed = student.computed;
    let y = PAGE_H - MARGIN;

    // ── Mini Header ──
    if (logoImage) {
        const logoDim = logoImage.scale(0.05);
        page.drawImage(logoImage, {
            x: MARGIN,
            y: y - logoDim.height,
            width: logoDim.width,
            height: logoDim.height,
        });
    }

    page.drawText('Veer Patta Public School', {
        x: MARGIN + 45,
        y: y - 14,
        size: 13,
        font: fontBold,
        color: rgb(0.1, 0.1, 0.4),
    });
    page.drawText(`Session: ${info.session || '—'}  |  ${info.name || ''}  |  Class: ${info.class || '—'}`, {
        x: MARGIN + 45,
        y: y - 30,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.4),
    });

    y -= 55;

    // ── Co-Scholastic Areas ──
    const sectionTitle = 'CO-SCHOLASTIC AREAS';
    const stWidth = fontBold.widthOfTextAtSize(sectionTitle, 11);
    page.drawText(sectionTitle, {
        x: (PAGE_W - stWidth) / 2,
        y,
        size: 11,
        font: fontBold,
        color: rgb(0.25, 0.22, 0.8),
    });
    y -= 6;
    page.drawLine({
        start: { x: MARGIN, y },
        end: { x: PAGE_W - MARGIN, y },
        thickness: 1,
        color: rgb(0.25, 0.22, 0.8),
    });
    y -= 22;

    const coScholasticAreas = [
        'Work Education', 'Art Education', 'Health & Physical Education',
        'Discipline', 'Library Skills',
    ];

    // Header
    page.drawRectangle({
        x: MARGIN, y: y - 12, width: COL_W, height: 20,
        color: rgb(0.15, 0.14, 0.5),
    });
    page.drawText('Area', { x: MARGIN + 6, y: y - 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Grade', { x: MARGIN + COL_W - 80, y: y - 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    y -= 20;

    coScholasticAreas.forEach((area, idx) => {
        if (idx % 2 === 0) {
            page.drawRectangle({
                x: MARGIN, y: y - 12, width: COL_W, height: 18,
                color: rgb(0.95, 0.95, 0.98),
            });
        }
        page.drawText(area, { x: MARGIN + 6, y: y - 8, size: 9, font, color: rgb(0.1, 0.1, 0.1) });
        page.drawText('A', { x: MARGIN + COL_W - 74, y: y - 8, size: 9, font: fontBold, color: rgb(0.1, 0.4, 0.2) });
        y -= 18;
    });

    y -= 30;

    // ── Attendance ──
    const attTitle = 'ATTENDANCE RECORD';
    const atWidth = fontBold.widthOfTextAtSize(attTitle, 11);
    page.drawText(attTitle, {
        x: (PAGE_W - atWidth) / 2, y, size: 11,
        font: fontBold, color: rgb(0.25, 0.22, 0.8),
    });
    y -= 6;
    page.drawLine({
        start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
        thickness: 1, color: rgb(0.25, 0.22, 0.8),
    });
    y -= 22;

    page.drawRectangle({ x: MARGIN, y: y - 12, width: COL_W, height: 20, color: rgb(0.15, 0.14, 0.5) });
    page.drawText('Total Working Days', { x: MARGIN + 6, y: y - 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    page.drawText('Days Present', { x: MARGIN + COL_W / 2 + 6, y: y - 8, size: 9, font: fontBold, color: rgb(1, 1, 1) });
    y -= 20;
    page.drawText('—', { x: MARGIN + 6, y: y - 8, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    page.drawText('—', { x: MARGIN + COL_W / 2 + 6, y: y - 8, size: 9, font, color: rgb(0.4, 0.4, 0.4) });
    y -= 30;

    // ── Result ──
    y -= 10;
    page.drawText('Result:', { x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.2) });
    const resultText = computed.percentage >= 33 ? 'PASSED' : 'FAILED';
    const resultColor = computed.percentage >= 33 ? rgb(0.1, 0.6, 0.3) : rgb(0.8, 0.2, 0.2);
    page.drawText(resultText, { x: MARGIN + 60, y, size: 11, font: fontBold, color: resultColor });

    page.drawText(`Overall Grade: ${computed.grade}`, {
        x: PAGE_W / 2, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.6),
    });
    y -= 18;
    page.drawText(`Percentage: ${computed.percentage}%`, {
        x: MARGIN, y, size: 11, font: fontBold, color: rgb(0.2, 0.2, 0.6),
    });

    y -= 40;

    // ── Remarks ──
    page.drawText("Teacher's Remarks:", { x: MARGIN, y, size: 10, font: fontBold, color: rgb(0.3, 0.3, 0.3) });
    y -= 16;
    page.drawLine({
        start: { x: MARGIN, y }, end: { x: PAGE_W - MARGIN, y },
        thickness: 0.5, color: rgb(0.7, 0.7, 0.7),
    });

    y -= 60;

    // ── Signatures ──
    const sigLabels = ['Class Teacher', 'Principal', 'Parent/Guardian'];
    const sigSpacing = (COL_W) / sigLabels.length;

    sigLabels.forEach((label, i) => {
        const sx = MARGIN + i * sigSpacing + sigSpacing / 2;
        page.drawLine({
            start: { x: sx - 50, y: y + 14 },
            end: { x: sx + 50, y: y + 14 },
            thickness: 0.5,
            color: rgb(0.5, 0.5, 0.5),
        });
        const labelW = font.widthOfTextAtSize(label, 8);
        page.drawText(label, {
            x: sx - labelW / 2,
            y,
            size: 8,
            font,
            color: rgb(0.4, 0.4, 0.4),
        });
    });
}

/* ══════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════ */
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
