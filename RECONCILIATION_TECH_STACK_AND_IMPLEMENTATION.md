# Smart Reconciliation - Simple Technical Guide

This guide simply explains what tools are used to read your files, what is pending, and which services require credentials.

---

## 1. What Tools Are Used to Read Files? (Excel, PDF & Images)

| File Format | Tool / Library Used | Is It Free? | How It Works |
|---|---|---|---|
| **Excel (.xlsx, .xls, .xlsm, .csv, .tsv)** | **SheetJS (`xlsx`)** | **100% Free** | Reads spreadsheet sheets, headers, and rows instantly in memory without external servers. |
| **Digital PDF (Text-based)** *(From ERP, Tally, SAP, Bank)* | **`pdf-parse` + Stream Tokenizer** | **100% Free** | Extracts the digital text layer, document numbers, dates, and amounts directly with 100% accuracy. |
| **Images & Scanned Bills (.png, .jpg, .jpeg, single scans)** | **`tesseract.js` (Local OCR)** | **100% Free** | Uses on-device Optical Character Recognition (OCR) to convert image pixels into text and financial rows. |

---

## 2. Which Services Require Credentials / API Keys?

### For Normal Use (Current Setup):
- **NO API KEYS OR CREDENTIALS ARE REQUIRED.**
- All parsing for Excel, CSV, PDF, and image OCR runs locally on your machine with **$0 cost** and zero subscriptions.

### Only If You Choose to Enable Cloud Features Later:
- **Google Gemini 1.5 Flash (Optional)**:
  - **Used for**: Understanding heavily crumpled, slanted, or handwritten mobile photos.
  - **Credentials**: `GEMINI_API_KEY` (Free via Google AI Studio — 1,500 scans/day free).
- **PostgreSQL Database**:
  - **Used for**: Permanent storage of reconciled statements.
  - **Credentials**: Already configured in your `.env.local` (`DATABASE_URL`).

---

## 3. What Is Pending / Left to Do? (Kya Baki Hai?)

1. **Multi-Page Scanned PDF OCR**:
   - *Status*: Digital PDFs and single-page images are 100% working.
   - *Pending*: If a scanned paper PDF has multiple photo pages, converting all pages to canvas images before feeding into OCR.
2. **Database Save API (`/api/reconciliation/save`)**:
   - *Pending*: Storing the final matched and unmatched statement lines permanently into PostgreSQL tables.
3. **Export Reconciliation Report Button**:
   - *Pending*: A 1-click button to download the reconciled side-by-side comparison into an Excel file.
