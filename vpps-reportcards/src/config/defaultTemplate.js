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
        srNo: { label: "Sr. No.", excelHeader: "SR_NO", type: "number" },
        rollNo: { label: "Roll No.", excelHeader: "ROLL_NO", type: "number" },
        name: { label: "Student Name", excelHeader: "STUDENT_NAME", type: "string" },
        fatherName: { label: "Father's Name", excelHeader: "FATHER_NAME", type: "string" },
        motherName: { label: "Mother's Name", excelHeader: "MOTHER_NAME", type: "string" },
        dob: { label: "Date of Birth", excelHeader: "DOB", type: "date", format: "DD/MM/YYYY" },
        class: { label: "Class", excelHeader: "CLASS", type: "string" },
        section: { label: "Section", excelHeader: "SECTION", type: "string" },
        session: { label: "Session", excelHeader: "SESSION", type: "string" },
        attendPresent: { label: "Attendance Present", excelHeader: "ATTEND_PRESENT", type: "number" },
        attendTotal: { label: "Attendance Total", excelHeader: "ATTEND_TOTAL", type: "number" },
    },

    coScholasticFields: {
        coWorkEd: { label: "Work Education Grade", excelHeader: "CO_WORK_ED", type: "string" },
        coArtEd: { label: "Art Education Grade", excelHeader: "CO_ART_ED", type: "string" },
        coHealthEd: { label: "Health & PE Grade", excelHeader: "CO_HEALTH_ED", type: "string" },
        coDiscipline: { label: "Discipline Grade", excelHeader: "CO_DISCIPLINE", type: "string" },
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
