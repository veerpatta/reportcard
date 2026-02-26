/**
 * Default report-card template for Veer Patta Public School.
 * Conforms to the schema defined in template.schema.json.
 *
 * To add / remove subjects, edit the `subjects` array AND
 * add a matching entry in `columnMappings`.
 */

const defaultTemplate = {
    /* ── Sheet settings ──────────────────────────────────────── */
    sheetName: "details",
    headerRow: 1,

    /* ── Required student info fields ────────────────────────── */
    studentFields: {
        srNo: { label: "Sr. No.", excelHeader: "Sr No", type: "number" },
        rollNo: { label: "Roll No.", excelHeader: "Roll No", type: "number" },
        name: { label: "Student Name", excelHeader: "Name", type: "string" },
        fatherName: { label: "Father's Name", excelHeader: "Father Name", type: "string" },
        motherName: { label: "Mother's Name", excelHeader: "Mother Name", type: "string" },
        dob: { label: "Date of Birth", excelHeader: "DOB", type: "date", format: "DD/MM/YYYY" },
        class: { label: "Class", excelHeader: "Class", type: "string" },
        section: { label: "Section", excelHeader: "Section", type: "string" },
        session: { label: "Session", excelHeader: "Session", type: "string" },
    },

    /* ── Subjects ────────────────────────────────────────────── */
    subjects: [
        { key: "english", label: "English", maxMarks: 100, components: ["theory", "practical"] },
        { key: "hindi", label: "Hindi", maxMarks: 100, components: ["theory", "practical"] },
        { key: "math", label: "Mathematics", maxMarks: 100, components: ["total"] },
        { key: "science", label: "Science", maxMarks: 100, components: ["theory", "practical"] },
        { key: "sst", label: "Social Science", maxMarks: 100, components: ["total"] },
        { key: "computer", label: "Computer Science", maxMarks: 100, components: ["theory", "practical"] },
        { key: "gk", label: "General Knowledge", maxMarks: 100, components: ["total"] },
        { key: "moral", label: "Moral Science", maxMarks: 100, components: ["total"] },
        { key: "drawing", label: "Drawing", maxMarks: 100, components: ["total"] },
        { key: "pt", label: "Physical Training", maxMarks: 100, components: ["total"] },
    ],

    /* ── Column mappings (subject key → component → Excel header) */
    columnMappings: {
        english: { theory: "English Theory", practical: "English Practical" },
        hindi: { theory: "Hindi Theory", practical: "Hindi Practical" },
        math: { total: "Mathematics" },
        science: { theory: "Science Theory", practical: "Science Practical" },
        sst: { total: "Social Science" },
        computer: { theory: "Computer Theory", practical: "Computer Practical" },
        gk: { total: "General Knowledge" },
        moral: { total: "Moral Science" },
        drawing: { total: "Drawing" },
        pt: { total: "Physical Training" },
    },
};

export default defaultTemplate;
