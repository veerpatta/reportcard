# Veer Patta Public School - Report Card Generator

This web application generates automated, two-page duplex Report Card PDFs for VPPS students strictly mapping to the Rajasthan Board Yearly Marking Scheme components. 

## Teacher Workflow Guide

Follow these sequential steps to effortlessly generate your class's report cards:

### 1. Configure the Class and Download Template
- Open the application in your browser.
- Under **Step 2: Configure**, select your exact class and stream (e.g. `Class 11 Science`, `Class 9`) from the **Report Template** dropdown.
- *(Optional)* If you have custom subjects not listed, click **Manage Subjects** to add them to your local constraints beforehand.
- Scroll to **Step 1: Upload Excel File** and click **Download Sample Excel Template**.

### 2. Fill in the Data Correctly
- Open the downloaded Excel sheet. You will find two tabs: `details` and `Instructions`.
- Do **NOT** rename columns on `details`.
- You only need to type marks into the applicable component columns. **Blank components correctly compute as 0 and generate a warning** whereas explicit `AB` calculates to `0` automatically in your totals.
- **Optional Subjects (Science / Arts Rules):** 
  - If a student *did not* take an optional subject (e.g., Biology), **leave all its columns 100% blank**.
  - The system will naturally ignore it and compute total marks strictly out of the valid enrolled amount!
  - Pay attention to Choice Constraints (must choose exactly 1 elective in Science, 3 optionals in Arts). 

### 3. Parse and Fix Errors
- Drop your finalized `.xlsx` file into the upload zone at Step 1.
- Make sure the appropriate **Session** is specified in Step 2.
- Click **Parse & Validate**.
- If any data is incomplete or illegal (e.g., scoring `12` in a `10` max UT slot), they will populate within the **Validation Errors** red accordion. Simply check the row number flag, fix the typo in Excel, resave, and click Parse again until everything passes! 

### 4. Print the Output
Once validations pass without critical errors, click **Generate Duplex PDF**. The browser will automatically download the unified PDF file.

## Print Instructions
To get perfectly aligned FRONT/BACK sheets:
- Open the PDF in Chrome or your PDF viewer.
- Trigger `CTRL/CMD + P` to Print.
- Adjust **Paper Size** to `A4` and **Orientation** to `Landscape`.
- Check **Print on Both Sides (Duplex)**.
- Critically, select **Flip on Long Edge**. This ensures the page back doesn't print upside down!

## Common Errors to Avoid
- **"Missing Required Column X"**: Do not change the column header format string (e.g `MATH_UT1`) that comes initialized on the sample.
- **"Component exceeds max for X"**: You typed a value bigger than the maximum allowed for that test/exam (like entering `52` when the max is `50` for `HY_THEORY`).
- **"Incorrect number of choice subjects"**: The student has marks in 2 elective subjects when they are only allowed to choose 1. Erase all marks of the dropped elective.

---
*Built incrementally for VPPS administration.*
