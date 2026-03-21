// netlify/functions/save-note.js
const { google } = require('googleapis');
const fs = require('fs');

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') {
      return { statusCode: 405, body: 'Method Not Allowed' };
    }

    const body = JSON.parse(event.body || '{}');
    const { date, therapist, patient, note } = body;

    if (!therapist || !patient || !note) {
      return { statusCode: 400, body: 'Missing required fields' };
    }

    const spreadsheetId = '1sVMdC88AJhCNw87kTMypVv__MoZ2l-ZwmU2eppQ5YdA';
    if (!spreadsheetId) {
      return { statusCode: 500, body: 'Server missing SPREADSHEET_ID env var' };
    }

    // Local dev: read service-account.json from the project root
const creds = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: 'Notes!A:D',
      valueInputOption: 'USER_ENTERED',
      requestBody: {
        values: [[date || '', therapist, patient, note]],
      },
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ ok: true }),
      headers: { 'Content-Type': 'application/json' },
    };
  } catch (err) {
    return {
      statusCode: 500,
      body: JSON.stringify({ ok: false, error: err.message || String(err) }),
      headers: { 'Content-Type': 'application/json' },
    };
  }
};