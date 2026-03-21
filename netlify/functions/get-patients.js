// netlify/functions/get-patients.js
const { google } = require('googleapis');
const fs = require('fs');

exports.handler = async () => {
  try {
    const spreadsheetId = '1sVMdC88AJhCNw87kTMypVv__MoZ2l-ZwmU2eppQ5YdA';

    // Local dev: read service-account.json from the project root
    const creds = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    // Read Patients tab column A
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Patients!A:A',
    });

    const values = res.data.values || [];
    // Drop header row, trim, remove empties
    const patients = values
      .slice(1)
      .map((r) => (r?.[0] || '').trim())
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, patients }),
    };
  } catch (err) {
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || String(err) }),
    };
  }
};