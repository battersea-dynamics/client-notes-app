const SCOPES = 'https://www.googleapis.com/auth/spreadsheets';

let tokenClient;
let accessToken = null;

const clientIdEl = document.getElementById('clientId');
const spreadsheetIdEl = document.getElementById('spreadsheetId');
const patientCodeEl = document.getElementById('patientCode');
const therapistNameEl = document.getElementById('therapistName');
const entryDateEl = document.getElementById('entryDate');
const notesInputEl = document.getElementById('notesInput');

const connectBtnEl = document.getElementById('connectBtn');
const disconnectBtnEl = document.getElementById('disconnectBtn');
const saveBtnEl = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');

const SETTINGS_KEY = 'client-notes-settings-v1';

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#065f46';
}

function readSettings() {
  try {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || {};
  } catch {
    return {};
  }
}

function writeSettings() {
  localStorage.setItem(
    SETTINGS_KEY,
    JSON.stringify({
      clientId: clientIdEl.value.trim(),
      spreadsheetId: spreadsheetIdEl.value.trim(),
    })
  );
}

function loadSettingsIntoForm() {
  const s = readSettings();
  clientIdEl.value = s.clientId || '';
  spreadsheetIdEl.value = s.spreadsheetId || '';
}

function setConnectedUI(isConnected) {
  connectBtnEl.disabled = isConnected;
  disconnectBtnEl.disabled = !isConnected;
  saveBtnEl.disabled = !isConnected;
}

function connectGoogle() {
  const clientId = clientIdEl.value.trim();
  if (!clientId) {
    setStatus('Enter Client ID', true);
    return;
  }

  writeSettings();

  tokenClient = google.accounts.oauth2.initTokenClient({
    client_id: clientId,
    scope: SCOPES,
    callback: (resp) => {
      if (resp.error) {
        setStatus(`Google auth error: ${resp.error}`, true);
        return;
      }
      accessToken = resp.access_token;
      setConnectedUI(true);
      setStatus('Connected');
    },
  });

  tokenClient.requestAccessToken({ prompt: 'consent' });
}

function disconnect() {
  accessToken = null;
  setConnectedUI(false);
  setStatus('Disconnected');
}

async function saveEntry() {
  try {
    const spreadsheetId = spreadsheetIdEl.value.trim();
    if (!spreadsheetId) {
      setStatus('Missing Spreadsheet ID', true);
      return;
    }

    const patient = patientCodeEl.value.trim();
    const therapist = therapistNameEl.value.trim();
    const date = entryDateEl.value || '';
    const note = notesInputEl.value.trim();

    if (!patient || !therapist || !note) {
      setStatus('Fill Patient, Therapist and Note', true);
      return;
    }

    // Append to first sheet, columns A:D
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/A:D:append?valueInputOption=USER_ENTERED`;

    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [[date, therapist, patient, note]],
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Sheets error: ${resp.status} ${text}`);
    }

    notesInputEl.value = '';
    setStatus('Saved to sheet');
  } catch (e) {
    setStatus(e.message, true);
  }
}

function init() {
  loadSettingsIntoForm();
  setConnectedUI(false);

  connectBtnEl.addEventListener('click', connectGoogle);
  disconnectBtnEl.addEventListener('click', disconnect);
  saveBtnEl.addEventListener('click', saveEntry);

  [clientIdEl, spreadsheetIdEl].forEach((el) => {
    el.addEventListener('change', writeSettings);
  });
}

window.addEventListener('DOMContentLoaded', init);