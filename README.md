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
- "Summary tiles" (Total, Percentage, Division, Attendance)
- A proper school header with VPPS branding

### ✅ Charts & Performance Analysis (Auto)
- **Bar chart:** subject-wise obtained marks
- **Radar chart:** overall performance distribution
- "Insights box":
  - Best subject
  - Needs improvement subject

### ✅ Print-Optimized for School Use
- A4 Landscape pages (consistent sizing)
- Made for duplex printing: **Flip on Long Edge**
- "Range generate" option to avoid heavy loads (e.g., generate students 1–50)

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
  app.js                       # main app flow
  main.js                      # Vite entry
  index.html
  vite.config.js
  package.json
```

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
- Dimensions: **842 x 595 points**

### Page 1 — Front (Brand + Details + Summary)
Includes:
- VPPS logo (top-left)
- School name (center)
- Address: *Kelwa Road, Amet, District Rajsamand, Rajasthan*
- "REPORT CARD" heading
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

> **Note:** All commands below should be run from the `vpps-reportcards/` subdirectory.

### 1) Install dependencies
```bash
cd vpps-reportcards
npm install
```

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

This project is deployed to **GitHub Pages** using **GitHub Actions**. Every push to `main` triggers an automatic build and deploy.

### Step 1 — Enable GitHub Pages

1. Go to your repository on GitHub: **[github.com/veerpatta/reportcard](https://github.com/veerpatta/reportcard)**
2. Navigate to **Settings -> Pages** (left sidebar)
3. Under **Build and deployment -> Source**, select **GitHub Actions**
4. Click **Save**

> **Do NOT select "Deploy from a branch"** — the project uses a GitHub Actions workflow to build the Vite app first.

### Step 2 — Verify the Vite base path

In `vpps-reportcards/vite.config.js`, the `base` must match your **GitHub repo name** (not the folder name):

```js
import { defineConfig } from 'vite';

export default defineConfig({
  base: '/reportcard/',   // <-- must match your repo name exactly
});
```

> **Why?** GitHub Pages serves your site at `https://<username>.github.io/<repo-name>/`. If the base path doesn't match, all asset URLs will be wrong and you'll see a blank page.

### Step 3 — Push to `main` to deploy

```bash
git add .
git commit -m "deploy: update for GitHub Pages"
git push origin main
```

GitHub Actions will automatically:
1. Install dependencies in `vpps-reportcards/`
2. Run `npm run build` to create the `dist/` folder
3. Upload and deploy `dist/` to GitHub Pages

### Step 4 — Access your live site

After the workflow completes (1-2 minutes), your site will be live at:

```
https://veerpatta.github.io/reportcard/
```

You can check the deployment status under the **Actions** tab in your repo.

### Workflow file location

The GitHub Actions workflow is located at the **repo root**:

```
.github/workflows/deploy.yml
```

> **Important:** GitHub only reads workflows from the repo root's `.github/workflows/` directory, not from subdirectories.

---

## Troubleshooting

### Blank page after deployment

**This is the most common issue.** It's almost always caused by a wrong Vite `base` path.

**How to diagnose:**
1. Open the deployed URL and press `F12` (DevTools)
2. Check the **Console** tab — you'll see 404 errors for JS/CSS files
3. Look at the URLs it's trying to load — they'll have the wrong path prefix

**How to fix:**
1. Open `vpps-reportcards/vite.config.js`
2. Ensure the `base` value matches your **GitHub repo name** exactly:
   ```js
   // Correct -- repo name is "reportcard"
   base: '/reportcard/'

   // Wrong -- this is the folder name, not the repo name
   base: '/vpps-reportcards/'

   // Wrong -- missing trailing slash
   base: '/reportcard'
   ```
3. Commit, push, and wait for the Action to re-deploy

### GitHub Actions workflow not running

* Make sure the workflow file is at the **repo root**: `.github/workflows/deploy.yml`
* NOT inside `vpps-reportcards/.github/workflows/` — GitHub won't detect it there
* Check that the branch is `main` (the workflow triggers on `push` to `main`)

### Build fails in GitHub Actions

* Check the **Actions** tab for error logs
* Common causes:
  - Missing `package-lock.json` — run `npm install` locally and commit the lock file
  - Node version mismatch — the workflow uses Node 20
  - Missing dependencies — ensure all deps are in `package.json`

### Excel uploads but marks missing

* Check column header spelling vs `template.schema.json`
* Confirm sheet name is `details`
* Ensure marks are stored as values (not unresolved formulas)

### PDF generation is slow / freezes on many students

* Use "Generate Range" (e.g., 1-50)
* Generate class-wise PDFs instead of whole school at once
* Avoid heavy images/high-res logo

---

## Roadmap / Future Enhancements

* QR code verification on report cards
* Hindi + English headings
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
