# Veer Patta Senior Secondary School - Report Card Generator

![Status: Active](https://img.shields.io/badge/Status-Active-success) ![Stack: HTML/Vanilla JS](https://img.shields.io/badge/Stack-Vanilla_JS-f7df1e) ![Build: Vite](https://img.shields.io/badge/Build-Vite-646CFF)

This web application generates automated, stunning, two-page duplex Report Card PDFs for VPPS students mapping strictly to the **Rajasthan Education Board** yearly marking schemes.

It features a heavily optimized Vite workflow leveraging **SheetJS** for Excel parsing, **pdf-lib** for raw PDF document building, and **Chart.js** via Offscreen Canvas for generating dynamic data visualization radar charts inside the generated PDFs.

## Key Features

1. **Excel Parsing & Validation:** Fast parsing of structured Excel mark sheets. Validates against max component limits, required subjects, and elective choice constraints to prevent bad data from ever reaching the PDF generator.
2. **Duplex A4 Landscape PDFs:** Generates print-ready PDFs (Front and Back per student in sequence) optimized for "Flip on Long Edge" double-sided printing.
3. **Responsive UI Preview:** Beautiful, mobile-friendly live HTML previews of student report cards before committing to PDF generation.
4. **Data Visualization:** Employs Chart.js to render aesthetic OffscreenCanvas Radar Charts of student performance per subject, embedding them into the PDF seamlessly.
5. **Detailed Page Layouts:** 
   - **Page 1 (Front):** Student details, primary Marks Table, Total Marks, Percentage, Grade, Insights, and School Branding.
   - **Page 2 (Back):** Co-Scholastic grades, Attendance Records, Pass/Fail Status & Division, Performance Radar Chart, Component Breakdown Table, Grading Scale Reference, and Principal/Teacher signature blocks.

## Developer Architecture

For agents or developers working further on this repository, here is the functional file structure:

- `main.js`: The central orchestrator binding the UI flow. It manages file uploading, config state, preview switching, validation rendering, and invoking the PDF builder.
- `src/excelParser.js`: Configures rules sets (e.g. Class 11 Science vs Class 9 Theory) and heavily uses `SheetJS` to read arrays and validate constraints, outputting `.info`, `.marks`, `.computed` blocks per student.
- `src/ui/reportCardPreview.js`: Renders the HTML DOM based live-previews of the exact `renderReportCard.js` layout.
- `src/pdf/pdfGenerator.js`: Prepares the `pdf-lib` document and loads required external assets (Custom Fonts, VPPS Logo).
- `src/pdf/renderReportCard.js`: The heavy-lifter. Procedurally draws rectangles, lines, and text onto the `pdf-lib` document utilizing specific layout coordinates for both Page 1 (Front) and Page 2 (Back).
- `src/charts/makeCharts.js`: Spawns a hidden DOM container, renders a `Chart.js` Radar chart with the student's data, pauses to allow animation/render completion, and rips it to a Base64 image URL to inject into the PDF.
- `src/config/templates.js` & `defaultTemplate.js`: Data schemas declaring Subjects and sub-components (e.g. `HY_THEORY`, `AN_PRACTICAL`) with constraints on max marks.

## Teacher Workflow Guide

Follow these sequential steps to effortlessly generate your class's report cards:

### 1. Configure the Class and Download Template
- Open the application in your browser.
- Under **Step 2: Configure**, select your exact class and stream (e.g. `Class 11 Science`, `Class 9`) from the **Report Template** dropdown.
- Scroll to **Step 1: Upload Excel File** and click **Download Sample Excel Template**.

### 2. Fill in the Data Correctly
- Open the downloaded Excel sheet. You will find two tabs: `details` and `Instructions`.
- Do **NOT** rename columns on `details`.
- You only need to type marks into the applicable component columns. **Blank components correctly compute as 0 and generate a warning** whereas explicit `AB` calculates to `0` automatically in your totals.
- **Optional Subjects:** 
  - If a student *did not* take an optional subject (e.g., Biology), **leave all its columns 100% blank**.
  - The system will naturally ignore it and compute total marks strictly out of the valid enrolled amount!

### 3. Parse and Fix Errors
- Drop your finalized `.xlsx` file into the upload zone at Step 1.
- Click **Parse & Validate**.
- If any data is incomplete or illegal (e.g., scoring `12` in a `10` max UT slot), they will populate within the **Validation Errors** red accordion. Check the row number flag, fix the typo in Excel, resave, and click Parse again until everything passes.

### 4. Print the Output
Once validations pass without critical errors, click **Generate Duplex PDF**. The browser will automatically download the unified PDF file.

## Print Instructions
To get perfectly aligned FRONT/BACK sheets:
- Open the PDF in Chrome or your PDF viewer.
- Trigger `CTRL/CMD + P` to Print.
- Adjust **Paper Size** to `A4` and **Orientation** to `Landscape`.
- Check **Print on Both Sides (Duplex)**.
- Critically, select **Flip on Long Edge**. This ensures the page back doesn't print upside down!
