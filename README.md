# Easy Notes — Battersea Dynamics

A lightweight PWA (Progressive Web App) for therapists to write and save session notes directly into a Google Sheet, from their phone or any browser.

## How it works

- Therapist selects their name and the patient from a dropdown
- Picks the session date (defaults to today)
- Types or dictates a note
- Taps **Save Note** — the note is appended as a new row in the Google Sheet instantly
- Works offline — notes are queued locally and synced when back online

## Stack

- Vanilla HTML/CSS/JS frontend (PWA, installable on phone home screen)
- Netlify for hosting and serverless functions
- Google Sheets API via a service account for reading patients and saving notes

## Google Sheet structure

The app expects two tabs in the spreadsheet:

| Tab | Columns |
|-----|---------|
| `Patients` | A: Patient name (row 1 = header, names from row 2 down) |
| `Notes` | A: Date, B: Therapist, C: Patient, D: Note |

## Netlify environment variables

Set these in Netlify → Site configuration → Environment variables:

| Variable | Value |
|----------|-------|
| `SPREADSHEET_ID` | The ID from your Google Sheet URL |
| `GOOGLE_SERVICE_ACCOUNT_JSON` | Full contents of the service account JSON file |

## Therapist names

Edit the `<select id="therapistSelect">` options in `index.html` to match your team.

## Google Cloud setup

1. Create a project in [Google Cloud Console](https://console.cloud.google.com)
2. Enable the **Google Sheets API**
3. Create a **Service Account** and generate a JSON key
4. Share the Google Sheet with the service account email (Editor access)
5. Paste the JSON key contents into the Netlify environment variable above
