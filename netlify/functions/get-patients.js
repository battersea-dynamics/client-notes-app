// netlify/functions/get-patients.js
const { google } = require('googleapis');

exports.handler = async () => {
  try {
    const spreadsheetId = process.env.SPREADSHEET_ID;
    if (!spreadsheetId) throw new Error('SPREADSHEET_ID env var is not set');

    const creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);

    const auth = new google.auth.JWT({
      email:  creds.client_email,
      key:    creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Patients!A:A',
    });

    const rows     = res.data.values || [];
    const patients = rows
      .slice(1)                            // skip header row
      .map(r => (r[0] || '').trim())
      .filter(Boolean);

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true, patients }),
    };
  } catch (err) {
    console.error('get-patients error:', err);
    return {
      statusCode: 500,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: false, error: err.message || String(err) }),
    };
  }
};
