# AI Agent Context: Veer Patta Senior Secondary School Report Card Generator

This document provides comprehensive context, architectural details, and strict rules for any AI agent or developer working on this codebase. Read this carefully before making any code modifications.

## 1. Project Overview
- **Name:** Veer Patta Senior Secondary School - Report Card Generator
- **App Stack:** Vite, Vanilla JavaScript (ESModules), HTML, CSS.
- **Key Dependencies:** 
  - `xlsx` (SheetJS) for parsing Excel templates.
  - `pdf-lib` for generating A4 landscape duplex PDFs.
  - `chart.js` for rendering performance radar charts.
- **Core Goal:** To allow school staff to upload a filled Excel template, preview the parsed data, and generate a batch of high-quality, 2-page duplex PDF report cards mapped to the **Rajasthan Education Board** yearly marking scheme.

## 2. File Architecture & Data Flow

### A. Template & Configuration
- **`src/config/templates.js` & `src/config/defaultTemplate.js`**: 
  - These files dictate the schemas. They define `SUBJECTS`, the components each subject has (e.g., `UT1`, `HY_THEORY`, `HY_PRACTICAL`, `AN_THEORY`, `AN_PRACTICAL`), and the `MAX_MARKS` for each.
  - They also enforce "Constraints" like "must choose exactly 1 elective" (Class 11 Science) or "must choose exactly 3 optionals" (Class 11 Arts).

### B. Excel Parsing (`src/excelParser.js`)
- The parser reads the uploaded `.xlsx` file (specifically the `details` sheet).
- **CRITICAL LAYOUT RULE:** The Excel sheet uses a **Vertical Layout** for data entry! This means **Row 1** contains headers (like Student 1, Student 2) and **Column A (Index 0)** contains the field names (like `SR_NO`, `MATH_UT1`). 
- To seamlessly support this, `excelParser.js` immediately transposes the `XLSX.sheet_to_json` array upon read, converting the columns back into student rows internally. Thus, the rest of the parsing engine operates exactly as if the data were horizontal!
- It extracts:
  1. `student.info`: Identity (Name, Father's Name, DOB, etc.) and Attendance (`attendTotal`, `attendPresent`).
  2. `student.marks`: Key-value pairs matching subject keys to component scores. Missing values default to `0`. `AB` (Absent) strings also parse as `0` for calculations.
  3. `student.computed`: Computed totals, percentages, grades, division, pass/fail status, and an array of `hasErrors` (validation warnings).
- **Rule:** Never allow PDF generation if critical validation errors exist in `hasErrors`.

### C. UI & Preview (`main.js` & `src/ui/reportCardPreview.js`)
- **`main.js`**: Orchestrates state. Handles downloading the sample template via SheetJS, handling file drop/upload, rendering error lists, and invoking the PDF builder.
- **`src/ui/reportCardPreview.js`**: Renders a live DOM HTML approximation of the report card (front and back).

### D. PDF Generation (`src/pdf/pdfGenerator.js` & `src/pdf/renderReportCard.js`)
- **`pdfGenerator.js`**: Initializes the `pdf-lib` document, embeds the VPPS logo (`/public/logo.png`), registers standard Document Fonts, and loops through the array of valid parsed students.
- **`renderReportCard.js`**: The heaviest file. Draws the literal rectangles, tables, and typography natively using precise `x/y` coordinate math on the A4 bounds. 
  - **Page 1 (Front):** Headers, Student Info Grid, Marks Table (Subject, Max, Obtained, Grade), and Grand Totals.
  - **Page 2 (Back):** Co-Scholastic grid, Attendance Record, Final Result Block (Passed/Division), Component Breakdown Table, Grading Scale Reference, and Radar Chart.

### E. Chart Generation (`src/charts/makeCharts.js`)
- Renders `Chart.js` charts invisibly using DOM canvas elements.
- Captures the canvas to a Base64 PNG using `.toDataURL()` and supplies it to `pdf-lib` for embedding. Currently used exclusively for the Radar Chart on Page 2.

## 3. Strict Design Rules & Layout Constraints
1. **Never** change the document size or duplex order. It must remain A4 Landscape format. Page index `i` is the front, `i+1` is the back.
2. **Never** re-add page footers (e.g., "Page 1 of 4"). They were explicitly removed for a cleaner look.
3. The school affiliation string **must** remain: `"Affiliated to Rajasthan Education Board"`.
4. The exact school string **must** remain: `"Veer Patta Senior Secondary School"`.
5. **No Bar Chart on Page 2:** Redundant visual components were stripped in favor of expanded tables and radar charts.
6. Check `student.info.attendPresent` and `student.info.attendTotal` for attendance UI logic.
7. Always maintain the modern aesthetic constraints: Use the `C` color constant object (in `renderReportCard.js`) which enforces a curated, clean styling palette mapping (e.g., `C.primary`, `C.border`, `C.rowAlt`).

## 4. How to Extend
To add new features (e.g., a "Class 12 Commerce" template):
1. Add the new template rule object to `src/config/templates.js`.
2. Define its specific static subjects and elective constraints.
3. The `excelParser.js` is highly generalized and will recursively map and enforce whatever you define in `templates.js`. No hardcore parser updates are typically needed—just configuration!
