// netlify/functions/get-patients.js
const { google } = require('googleapis');
const fs = require('fs');

exports.handler = async () => {
  try {
    const spreadsheetId =
      process.env.SPREADSHEET_ID || '1sVMdC88AJhCNw87kTMypVv__MoZ2l-ZwmU2eppQ5YdA';

    let creds;

    if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
      creds = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT_JSON);
    } else {
      creds = JSON.parse(fs.readFileSync('service-account.json', 'utf8'));
    }

    const auth = new google.auth.JWT({
      email: creds.client_email,
      key: creds.private_key,
      scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId,
      range: 'Patients!A:A',
    });

    const values = res.data.values || [];
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