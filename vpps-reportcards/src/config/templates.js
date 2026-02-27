/**
 * Multi-template system for Rajasthan Board Yearly Scheme.
 * Defines Class 11 (Science, Commerce, Arts) and Class 9 templates.
 */

// Common student fields across all templates
const commonStudentFields = {
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
};

const commonCoScholasticFields = {
    coWorkEd: { label: "Work Education Grade", excelHeader: "CO_WORK_ED", type: "string" },
    coArtEd: { label: "Art Education Grade", excelHeader: "CO_ART_ED", type: "string" },
    coHealthEd: { label: "Health & PE Grade", excelHeader: "CO_HEALTH_ED", type: "string" },
    coDiscipline: { label: "Discipline Grade", excelHeader: "CO_DISCIPLINE", type: "string" },
};

const commonGrading = {
    passPercent: 33,
    divisions: [
        { name: "I", threshold: 60 },
        { name: "II", threshold: 48 },
        { name: "III", threshold: 36 },
    ],
};

export const theoryComponents = ["UT1", "UT2", "UT3", "HALF_YEARLY", "ANNUAL"];
export const theoryComponentMax = { UT1: 10, UT2: 10, UT3: 10, HALF_YEARLY: 70, ANNUAL: 100 };

export const practicalComponents = ["UT1", "UT2", "UT3", "HY_THEORY", "HY_PRACTICAL", "AN_THEORY", "AN_PRACTICAL"];
export const practicalComponentMax = { UT1: 10, UT2: 10, UT3: 10, HY_THEORY: 50, HY_PRACTICAL: 20, AN_THEORY: 70, AN_PRACTICAL: 30 };

export function generateColumnMappings(subjects) {
    const mappings = {};
    subjects.forEach((subj) => {
        mappings[subj.key] = {};
        const prefix = subj.key.toUpperCase();
        subj.components.forEach((comp) => {
            const maxVal = subj.componentMax ? subj.componentMax[comp] : subj.maxMarks;
            mappings[subj.key][comp] = `${prefix}_${comp} (Max ${maxVal})`;
        });
    });
    return mappings;
}

const templatesConfig = [
    {
        id: "class11_science",
        label: "Class 11 Science",
        sheetName: "details",
        headerRow: 1,
        downloadFileName: "Template_Class11_Science.xlsx",
        studentFields: commonStudentFields,
        coScholasticFields: commonCoScholasticFields,
        grading: commonGrading,
        subjects: [
            { key: "english", label: "English Compulsory", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "hindi", label: "Hindi Compulsory", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "physics", label: "Physics", maxMarks: 200, components: practicalComponents, componentMax: practicalComponentMax },
            { key: "chemistry", label: "Chemistry", maxMarks: 200, components: practicalComponents, componentMax: practicalComponentMax },
            { key: "math", label: "Mathematics", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax, optional: true, choiceGroup: "sci_elective" },
            { key: "biology", label: "Biology", maxMarks: 200, components: practicalComponents, componentMax: practicalComponentMax, optional: true, choiceGroup: "sci_elective" },
        ],
        choiceGroups: {
            sci_elective: { min: 1, max: 1, label: "Science Elective (Math or Biology)" }
        }
    },
    {
        id: "class11_commerce",
        label: "Class 11 Commerce",
        sheetName: "details",
        headerRow: 1,
        downloadFileName: "Template_Class11_Commerce.xlsx",
        studentFields: commonStudentFields,
        coScholasticFields: commonCoScholasticFields,
        grading: commonGrading,
        subjects: [
            { key: "english", label: "English", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "hindi", label: "Hindi", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "business", label: "Business Studies", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "accountancy", label: "Accountancy", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "economics", label: "Economics", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
        ],
        choiceGroups: {}
    },
    {
        id: "class11_arts",
        label: "Class 11 Arts",
        sheetName: "details",
        headerRow: 1,
        downloadFileName: "Template_Class11_Arts.xlsx",
        studentFields: commonStudentFields,
        coScholasticFields: commonCoScholasticFields,
        grading: commonGrading,
        subjects: [
            { key: "english", label: "English", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "hindi", label: "Hindi", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            // Optionals
            { key: "geography", label: "Geography", maxMarks: 200, components: practicalComponents, componentMax: practicalComponentMax, optional: true, choiceGroup: "arts_optional" },
            { key: "political_science", label: "Political Science", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax, optional: true, choiceGroup: "arts_optional" },
            { key: "english_lit", label: "English Literature", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax, optional: true, choiceGroup: "arts_optional" },
            { key: "economics", label: "Economics", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax, optional: true, choiceGroup: "arts_optional" },
        ],
        choiceGroups: {
            arts_optional: { min: 3, max: 3, label: "Arts Optionals (Choose 3)" }
        }
    },
    {
        id: "class9",
        label: "Class 9",
        sheetName: "details",
        headerRow: 1,
        downloadFileName: "Template_Class9.xlsx",
        studentFields: commonStudentFields,
        coScholasticFields: commonCoScholasticFields,
        grading: commonGrading,
        subjects: [
            { key: "math", label: "Mathematics", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "science", label: "Science", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "sst", label: "Social Science", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "english", label: "English", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "hindi", label: "Hindi", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
            { key: "sanskrit", label: "Sanskrit", maxMarks: 200, components: theoryComponents, componentMax: theoryComponentMax },
        ],
        choiceGroups: {}
    }
];

// Pre-compute mappings for each template to save space
export const TEMPLATES = templatesConfig.map(tmpl => {
    tmpl.columnMappings = generateColumnMappings(tmpl.subjects);
    return tmpl;
});

export const DEFAULT_TEMPLATE_ID = "class9";

function applyCustomSubjects(baseTemplate) {
    if (!baseTemplate) return null;
    try {
        const stored = localStorage.getItem(`vpps_custom_subjects_${baseTemplate.id}`);
        if (stored) {
            const customSubjects = JSON.parse(stored);
            if (customSubjects && customSubjects.length > 0) {
                // Return a deep cloned and augmented array rather than mutating the exported base
                const tmpl = JSON.parse(JSON.stringify(baseTemplate));
                tmpl.subjects.push(...customSubjects);
                // Regenerate mappings to include custom
                tmpl.columnMappings = generateColumnMappings(tmpl.subjects);
                // Automatically patch in Choice Groups if they don't exist in base schema but referenced
                customSubjects.forEach(s => {
                    if (s.choiceGroup && !tmpl.choiceGroups[s.choiceGroup]) {
                        tmpl.choiceGroups[s.choiceGroup] = { min: 1, max: 1, label: `Custom Elective (${s.choiceGroup})` };
                    }
                });
                return tmpl;
            }
        }
    } catch (e) {
        console.warn('Could not parse custom subjects from localStorage:', e);
    }
    return baseTemplate;
}

export const getTemplateById = (id) => {
    const base = TEMPLATES.find((t) => t.id === id) || TEMPLATES.find((t) => t.id === DEFAULT_TEMPLATE_ID);
    return applyCustomSubjects(base);
};
