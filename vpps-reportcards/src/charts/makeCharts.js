/**
 * makeCharts.js
 * ─────────────
 * Renders Chart.js bar & radar charts on an offscreen canvas,
 * exports each as a PNG Uint8Array for embedding into pdf-lib pages.
 *
 * Every call to `makeChartsForStudent()` creates fresh charts
 * tailored to that student's marks & subjects, then destroys
 * the Chart instances to avoid memory leaks.
 *
 * Exports:
 *   makeChartsForStudent(student, subjects) → { barPng, radarPng }
 */

import {
    Chart,
    BarController,
    RadarController,
    BarElement,
    LineElement,
    PointElement,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';

/* ── Register only the pieces we use ───────────────────────── */
Chart.register(
    BarController,
    RadarController,
    BarElement,
    LineElement,
    PointElement,
    RadialLinearScale,
    CategoryScale,
    LinearScale,
    Filler,
    Tooltip,
    Legend
);

/* ── Design tokens (mirroring renderReportCard palette) ────── */
const COLORS = {
    barGradientStart: 'rgba(64, 123, 217, 0.92)',   // indigo-blue
    barGradientEnd: 'rgba(102, 174, 235, 0.92)',   // lighter blue
    barBorder: 'rgba(30, 28, 117, 0.7)',
    radarFill: 'rgba(64, 123, 217, 0.22)',
    radarBorder: 'rgba(30, 28, 117, 0.85)',
    radarPoint: 'rgba(64, 123, 217, 1)',
    gridColor: 'rgba(180, 180, 195, 0.35)',
    tickColor: '#666',
    labelColor: '#333',
    titleColor: '#1e1c75',
};

/* ── Shared chart defaults ─────────────────────────────────── */
const CHART_DEFAULTS = {
    devicePixelRatio: 2,          // crisp on PDF at 2×
    animation: false,             // no animation for static export
    responsive: false,
};

/* ══════════════════════════════════════════════════════════════
   Helpers
   ══════════════════════════════════════════════════════════════ */

/**
 * Create an offscreen canvas (works in modern browsers).
 * Falls back to a hidden DOM canvas if OffscreenCanvas is unavailable.
 */
function createCanvas(width, height) {
    // We intentionally avoid OffscreenCanvas because it lacks `.toDataURL()`
    // support in several browsers (e.g. Safari, older Firefox), which Chart.js requires.
    const c = document.createElement('canvas');
    c.width = width;
    c.height = height;
    c.style.cssText = 'position:fixed;left:-9999px;top:-9999px;visibility:hidden;';
    document.body.appendChild(c);
    c.__removeOnCleanup = true;
    return c;
}

/** Remove a DOM-fallback canvas from the document. */
function destroyCanvas(canvas) {
    if (canvas.__removeOnCleanup && canvas.parentNode) {
        canvas.parentNode.removeChild(canvas);
    }
}

/**
 * Convert a base64 data-URL (or raw base64 string) to Uint8Array.
 * Handles both "data:image/png;base64,…" and raw base64.
 */
function base64ToUint8Array(b64) {
    const raw = b64.includes(',') ? b64.split(',')[1] : b64;
    const bin = atob(raw);
    const arr = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = bin.charCodeAt(i);
    return arr;
}

/**
 * Filter subjects that have valid mark totals.
 */
function getValidSubjects(marks, subjects) {
    return subjects.filter(sub => {
        const m = marks[sub.key];
        return m && m._total != null && !isNaN(m._total);
    });
}

/**
 * Generate alternating bar colours for each subject index.
 */
function barColors(count) {
    const bg = [];
    const border = [];
    for (let i = 0; i < count; i++) {
        bg.push(i % 2 === 0 ? COLORS.barGradientStart : COLORS.barGradientEnd);
        border.push(COLORS.barBorder);
    }
    return { bg, border };
}

/* ══════════════════════════════════════════════════════════════
   Chart builders
   ══════════════════════════════════════════════════════════════ */

/**
 * Build a horizontal-friendly vertical bar chart of subject totals.
 * @returns {Uint8Array} PNG bytes
 */
function renderBarChart(marks, subjects, width = 640, height = 320) {
    const valid = getValidSubjects(marks, subjects);
    if (valid.length === 0) return null;

    const labels = valid.map(s => s.label);
    const data = valid.map(s => marks[s.key]._total);
    const maxMarks = Math.max(...valid.map(s => s.maxMarks), 100);
    const { bg, border } = barColors(valid.length);

    const canvas = createCanvas(width, height);

    const chart = new Chart(canvas, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Marks Obtained',
                data,
                backgroundColor: bg,
                borderColor: border,
                borderWidth: 1.5,
                borderRadius: 4,
                barPercentage: 0.72,
                categoryPercentage: 0.78,
            }],
        },
        options: {
            ...CHART_DEFAULTS,
            indexAxis: 'x',
            layout: {
                padding: { top: 18, bottom: 6, left: 8, right: 8 },
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                title: {
                    display: true,
                    text: 'Subject Performance',
                    color: COLORS.titleColor,
                    font: { size: 13, weight: 'bold', family: 'Helvetica, Arial, sans-serif' },
                    padding: { top: 2, bottom: 10 },
                },
            },
            scales: {
                x: {
                    ticks: {
                        color: COLORS.labelColor,
                        font: { size: 9, family: 'Helvetica, Arial, sans-serif' },
                        maxRotation: 45,
                        minRotation: 0,
                    },
                    grid: { display: false },
                },
                y: {
                    beginAtZero: true,
                    max: maxMarks,
                    ticks: {
                        color: COLORS.tickColor,
                        font: { size: 8 },
                        stepSize: Math.ceil(maxMarks / 5),
                    },
                    grid: {
                        color: COLORS.gridColor,
                        drawBorder: false,
                    },
                },
            },
        },
    });

    const b64 = chart.toBase64Image('image/png');
    chart.destroy();
    const png = base64ToUint8Array(b64);
    destroyCanvas(canvas);
    return png;
}

/**
 * Build a radar / spider chart showing subject performance distribution.
 * @returns {Uint8Array} PNG bytes
 */
function renderRadarChart(marks, subjects, width = 480, height = 480) {
    const valid = getValidSubjects(marks, subjects);
    if (valid.length < 3) return null;   // radar needs ≥ 3 axes

    const labels = valid.map(s => s.label);
    const maxMarks = Math.max(...valid.map(s => s.maxMarks), 100);
    const data = valid.map(s => {
        const pct = (marks[s.key]._total / s.maxMarks) * 100;
        return Math.round(pct * 10) / 10;  // percentage with 1 decimal
    });

    const canvas = createCanvas(width, height);

    const chart = new Chart(canvas, {
        type: 'radar',
        data: {
            labels,
            datasets: [{
                label: 'Performance (%)',
                data,
                backgroundColor: COLORS.radarFill,
                borderColor: COLORS.radarBorder,
                borderWidth: 2,
                pointBackgroundColor: COLORS.radarPoint,
                pointBorderColor: '#fff',
                pointBorderWidth: 1.5,
                pointRadius: 4,
                pointHoverRadius: 5,
                fill: true,
            }],
        },
        options: {
            ...CHART_DEFAULTS,
            layout: {
                padding: { top: 12, bottom: 12, left: 12, right: 12 },
            },
            plugins: {
                legend: { display: false },
                tooltip: { enabled: false },
                title: {
                    display: true,
                    text: 'Performance Distribution',
                    color: COLORS.titleColor,
                    font: { size: 13, weight: 'bold', family: 'Helvetica, Arial, sans-serif' },
                    padding: { top: 2, bottom: 8 },
                },
            },
            scales: {
                r: {
                    beginAtZero: true,
                    max: 100,
                    ticks: {
                        stepSize: 20,
                        color: COLORS.tickColor,
                        font: { size: 7 },
                        backdropColor: 'rgba(255,255,255,0.65)',
                    },
                    grid: {
                        color: COLORS.gridColor,
                    },
                    angleLines: {
                        color: COLORS.gridColor,
                    },
                    pointLabels: {
                        color: COLORS.labelColor,
                        font: { size: 9, family: 'Helvetica, Arial, sans-serif' },
                    },
                },
            },
        },
    });

    const b64 = chart.toBase64Image('image/png');
    chart.destroy();
    const png = base64ToUint8Array(b64);
    destroyCanvas(canvas);
    return png;
}

/* ══════════════════════════════════════════════════════════════
   Public API
   ══════════════════════════════════════════════════════════════ */

/**
 * Generate bar & radar chart PNGs for a single student.
 *
 * @param {Object} student            Student record
 * @param {Object} student.marks      { subjectKey: { _total, … }, … }
 * @param {Array}  subjects           Subject definitions from template
 * @param {Object} [opts]             Optional overrides
 * @param {number} [opts.barWidth]    Bar chart canvas width  (default 640)
 * @param {number} [opts.barHeight]   Bar chart canvas height (default 320)
 * @param {number} [opts.radarWidth]  Radar chart canvas width  (default 480)
 * @param {number} [opts.radarHeight] Radar chart canvas height (default 480)
 *
 * @returns {{ barPng: Uint8Array|null, radarPng: Uint8Array|null }}
 */
export function makeChartsForStudent(student, subjects, opts = {}) {
    const {
        barWidth = 640,
        barHeight = 320,
        radarWidth = 480,
        radarHeight = 480,
    } = opts;

    const barPng = renderBarChart(student.marks, subjects, barWidth, barHeight);
    const radarPng = renderRadarChart(student.marks, subjects, radarWidth, radarHeight);

    return { barPng, radarPng };
}
