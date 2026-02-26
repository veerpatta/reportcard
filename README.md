```md
# VPPS Report Card Generator (Duplex PDF) — GitHub Pages Web App

A static, privacy-friendly web application for **Shri Veer Patta Senior Secondary School (VPPS)** to generate **modern, duplex-ready report cards** from an **Excel template**.

This app runs fully in the browser (no backend). Staff can bulk upload an Excel sheet and download **one single PDF** where **each student gets 2 pages**:
- **Page 1 (Front):** Student details + summary + logo + clean modern layout
- **Page 2 (Back):** Marks table + bar/radar charts + analysis  
Designed for **A4 Landscape duplex printing** (front/back on the same sheet).

---

## Why this project exists

Our school currently uses Excel-based result sheets to enter marks and print report cards, but printing from Excel often:
- wastes space on the page
- looks old-fashioned
- breaks formatting across devices/printers
- makes it difficult to generate **one combined PDF** for duplex printing
- makes it hard to add modern visuals like charts & performance insights

This project solves that by providing a **single website** where:
1. We upload results data in a structured Excel template
2. The app parses the data locally
3. It generates **high-quality, consistent, modern report cards**
4. It exports everything into **one duplex PDF** ready for printing

---

## Key Features

### ✅ Excel Upload (Bulk)
- Upload a `.xlsx` file with a defined template (sheet name: `details`)
- Reads student rows (one row = one student)
- Validates required fields and missing marks
- Optional: choose sheet from dropdown if file contains multiple sheets

### ✅ Duplex PDF Export (2 pages per student)
- One combined PDF: `ReportCards_Duplex.pdf`
- Page order:
  - Student 1 Front
  - Student 1 Back
  - Student 2 Front
  - Student 2 Back
  - ... and so on

### ✅ Modern Report Card Design
- Clean, modern typography
- Clear layout and spacing
- “Summary tiles” (Total, Percentage, Division, Attendance)
- A proper school header with VPPS branding

### ✅ Charts & Performance Analysis (Auto)
- **Bar chart:** subject-wise obtained marks
- **Radar chart:** overall performance distribution
- “Insights box”:
  - Best subject
  - Needs improvement subject

### ✅ Print-Optimized for School Use
- A4 Landscape pages (consistent sizing)
- Made for duplex printing: **Flip on Long Edge**
- “Range generate” option to avoid heavy loads (e.g., generate students 1–50)

### ✅ Privacy & Security by Design
- No backend server
- No data upload to internet
- Excel is read locally and PDF is generated locally in the browser
- This is important for student data privacy

---

## School Branding & Context (VPPS)

This tool is built for **Shri Veer Patta Senior Secondary School / Veer Patta School**.

### Official School Address (use everywhere)
**Kelwa Road, Amet, District Rajsamand, Rajasthan**

### School Identifiers (internal reference)
- School/Board Code: **1300187**
- PSP Code: **P24979**
- UDISE Code: **08250314903**

### Logo
Place the school logo at:
```

public/logo.png

```
This logo is embedded on every report card (front page header, optional watermark on back).

---

## Technology Stack

### Frontend Framework
- **Vite** (fast dev server + static build)

### Excel Parsing
- **SheetJS (xlsx)** — reads Excel in browser from `ArrayBuffer`

> Note: We compute totals/percentages in JavaScript to avoid dependency on Excel formulas.

### PDF Generation
- **pdf-lib**
  - Creates multi-page PDFs directly in browser
  - Embeds images (logo + charts)
  - Controls exact layout/positioning for printing

### Charts
- **Chart.js**
  - Renders bar/radar charts on hidden/offscreen canvas
  - Exports charts as PNG base64
  - Embedded into pdf-lib pages

### Hosting
- **GitHub Pages**
  - Deployed via **GitHub Actions**
  - Static site output from `dist/`

---

## Project Structure

```

vpps-reportcards/
public/
logo.png                   # VPPS logo used in report cards
src/
config/
template.schema.json     # Excel mapping & subjects configuration
excel/
parseExcel.js            # Reads XLSX, validates, returns student objects
validate.js              # Validation logic (required fields, marks sanity)
charts/
makeCharts.js            # Chart.js: bar + radar generation, export PNG
pdf/
renderReportCard.js      # pdf-lib rendering: front/back pages
layout.js                # layout constants: margins, fonts, sizes
helpers.js               # drawHeader, drawTable, drawTiles, etc.
ui/
preview.js               # HTML preview of first student front/back
progress.js              # progress updates during pdf generation
app.js                     # main app flow
main.js                    # Vite entry
index.html
vite.config.js
package.json
README.md

````

---

## Excel Template Requirements

### Required Sheet
- Default: `details`
- App can also support selecting a sheet from dropdown.

### Required Columns (example)
These must exist as **headers in row 1** (exact names should match `template.schema.json` mapping):

Student identity:
- `SR_NO` / `SR No`
- `ROLL_NO` / `Roll No`
- `NAME`
- `FATHER_NAME`
- `MOTHER_NAME`
- `DOB`
- `CLASS`
- `SECTION`
- `SESSION` (optional if provided in UI)

Marks columns:
- Subject-wise columns such as:
  - `HINDI_TOTAL`
  - `ENGLISH_TOTAL`
  - `HISTORY_TOTAL`
  - etc.

> The actual column names are configured in:
`src/config/template.schema.json`

### Important Note about Formulas
SheetJS CE does **not reliably calculate Excel formulas**.  
Therefore:
- The app reads raw values from cells
- Totals/percentage/division are computed in JavaScript

This ensures consistent output across systems.

---

## Report Card Layout Specification

### PDF Page Specs
- Size: **A4 Landscape**
- Dimensions: **842 × 595 points**

### Page 1 — Front (Brand + Details + Summary)
Includes:
- VPPS logo (top-left)
- School name (center)
- Address: *Kelwa Road, Amet, District Rajsamand, Rajasthan*
- “REPORT CARD” heading
- Student details (two-column card layout)
- Summary tiles:
  - Total
  - Percentage
  - Division / Result
  - Attendance
- Insights box:
  - Best subject
  - Needs improvement subject
- One bar chart at bottom (to use space nicely)
- Signatures (only 3):
  - Class Teacher
  - Parent/Guardian
  - Principal/Seal

### Page 2 — Back (Marks + Analysis)
Includes:
- Subject marks table:
  - Subject
  - Max Marks
  - Obtained
  - Grade
  - Remarks
- Charts section:
  - Bar chart: subject totals
  - Radar chart: performance distribution
- Teacher Remarks box (optional)
- Footer: Page X of Y

---

## Printing Instructions (Duplex)

Recommended printer settings:
- Paper: **A4**
- Orientation: **Landscape**
- Duplex: **Print on both sides**
- Flip option: **Flip on Long Edge**

This ensures:
- Front = Page 1, Back = Page 2 for each student
- Proper alignment for report cards

---

## Local Development

### 1) Install dependencies
```bash
npm install
````

### 2) Start dev server

```bash
npm run dev
```

### 3) Build production output

```bash
npm run build
```

### 4) Preview production build locally

```bash
npm run preview
```

---

## Deployment to GitHub Pages

### 1) Create a GitHub repo

Example repo name:

```
vpps-reportcards
```

### 2) Set Vite base path

In `vite.config.js`:

```js
base: "/vpps-reportcards/"
```

### 3) Enable GitHub Pages via GitHub Actions

* Go to repo: **Settings → Pages**
* Source: **GitHub Actions**

### 4) Push to main branch

GitHub Actions will:

* build the site
* deploy the `dist/` folder to Pages

Your website URL will be:

```
https://<your-username>.github.io/vpps-reportcards/
```

---

## Troubleshooting

### Blank page after deployment

Most common reason: incorrect Vite `base` path.
Fix:

* ensure `vite.config.js` base matches repo name exactly

### Excel uploads but marks missing

* Check column header spelling vs `template.schema.json`
* Confirm sheet name is `details`
* Ensure marks are stored as values (not unresolved formulas)

### PDF generation is slow / freezes on many students

* Use “Generate Range” (e.g., 1–50)
* Generate class-wise PDFs instead of whole school at once
* Avoid heavy images/high-res logo

---

## Roadmap / Future Enhancements

* QR code verification on report cards
* Hindi + English headings (“प्रगति पत्र / Report Card”)
* Multiple templates (Nursery/Primary vs Senior)
* Export student-wise separate PDFs + combined PDF
* Add watermark logo background on back page
* Add attendance/monthwise analytics import
* Teacher remarks auto-suggestions based on performance

---

## License / Usage

This project is intended for **internal use** at VPPS.
If you want to open source it later:

* choose MIT license
* remove any student datasets before publishing

---

## Credits & Tools

* Vite (static build + local dev)
* SheetJS (Excel parsing)
* pdf-lib (PDF generation)
* Chart.js (graphs)

---

## Contact / Maintainer Notes (School Use)

Maintain this project like a school tool:

* Keep the Excel template stable
* Only update `template.schema.json` when subjects/columns change
* Store the VPPS logo in `public/logo.png`
* Test printing once per new session/printer

---

```
```
