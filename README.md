# Drive Notes (Phone-Friendly Web App)

This project is now a lightweight PWA (Progressive Web App) that lets a user write notes and save them directly into a text file inside a Google Drive folder.

## Features

- Mobile-friendly single-page UI.
- Installable on phone home screen (PWA manifest + service worker).
- OAuth sign-in with Google.
- Load existing notes file from a chosen Drive folder.
- Save notes directly to that Drive file (create if missing).

## Setup

1. Create a **Google Cloud OAuth Client ID** for a Web application.
2. In Google Cloud, enable the **Google Drive API** for your project.
3. Add your deployed site URL (or local dev URL) to Authorized JavaScript origins.
4. Open the app and enter:
   - OAuth Client ID
   - Google Drive Folder ID
   - Notes file name (example: `phone-notes.txt`)
5. Tap **Connect Google Drive**, authorize, then use **Load from Drive** and **Save to Drive**.

## Local run

Use any static server (example):

```bash
python3 -m http.server 8080
```

Then open `http://localhost:8080`.

## Important notes

- The app stores setup fields in browser localStorage.
- Notes are only saved to Drive when the user taps **Save to Drive**.
- Scope used: `https://www.googleapis.com/auth/drive.file`.
