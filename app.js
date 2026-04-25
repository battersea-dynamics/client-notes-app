// ── Element refs ─────────────────────────────────────────
const therapistEl  = document.getElementById('therapistInput');
const patientEl    = document.getElementById('patientSelect');
const dateEl       = document.getElementById('entryDate');
const noteEl       = document.getElementById('notesInput');
const saveBtn      = document.getElementById('saveBtn');
const dictateBtn   = document.getElementById('dictateBtn');
const stopBtn      = document.getElementById('stopDictateBtn');
const statusEl     = document.getElementById('status');

// ── Status helper ─────────────────────────────────────────
function setStatus(msg, type = '') {
  statusEl.textContent = msg;
  statusEl.className   = 'status ' + type;
}

// ── Save-button gating ────────────────────────────────────
function updateSaveBtn() {
  const ready = therapistEl.value.trim() && patientEl.value && noteEl.value.trim();
  saveBtn.disabled = !ready;
}

// ── LocalStorage keys ─────────────────────────────────────
const LS = {
  THERAPIST:  'en_therapist',
  PATIENT:    'en_patient',
  LAST_NOTE:  'en_last_note',
};

// ── Load patients from Netlify function ───────────────────
async function loadPatients() {
  try {
    const res  = await fetch('/.netlify/functions/get-patients');
    const data = await res.json();

    if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to load patients');

    patientEl.innerHTML = '<option value="">Select patient…</option>';
    data.patients.forEach(name => {
      const opt = document.createElement('option');
      opt.value = opt.textContent = name;
      patientEl.appendChild(opt);
    });

    // Restore saved patient
    const saved = localStorage.getItem(LS.PATIENT);
    if (saved) patientEl.value = saved;

    updateSaveBtn();
  } catch (err) {
    patientEl.innerHTML = '<option value="">Could not load patients</option>';
    setStatus('Patient list failed to load', 'error');
  }
}

// ── Save entry ────────────────────────────────────────────
async function saveEntry() {
  const therapist = therapistEl.value;
  const patient   = patientEl.value;
  const date      = dateEl.value;
  const note      = noteEl.value.trim();

  if (!therapist || !patient || !note) {
    setStatus('Please fill in all fields.', 'error');
    return;
  }

  saveBtn.disabled   = true;
  saveBtn.textContent = 'Saving…';
  setStatus('Saving…', 'info');

  const payload = { therapist, patient, date, note };

  try {
    const res  = await fetch('/.netlify/functions/save-note', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(payload),
    });
    const data = await res.json().catch(() => ({}));

    if (!res.ok || data.ok === false) throw new Error(data.error || `Server error ${res.status}`);

    // Success — persist note so it stays visible until touched
    localStorage.setItem(LS.LAST_NOTE, note);
    setStatus('Saved ✓', 'ok');

    setTimeout(() => {
      setStatus('');
      saveBtn.textContent = 'Save Note';
      updateSaveBtn();
    }, 4000);

  } catch (err) {
    // Offline fallback
    try {
      await addPendingNote(payload);
      localStorage.setItem(LS.LAST_NOTE, note);
      setStatus('Saved offline — will sync when online.', 'info');
    } catch (offErr) {
      setStatus('Save failed: ' + (err.message || err), 'error');
    }
    saveBtn.textContent = 'Save Note';
    updateSaveBtn();
  }
}

// ── Sync offline queue ────────────────────────────────────
async function syncOffline() {
  try {
    const pending = await getPendingNotes();
    if (!pending.length) return;

    setStatus(`Syncing ${pending.length} offline note(s)…`, 'info');

    for (const item of pending) {
      const res  = await fetch('/.netlify/functions/save-note', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(item),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) throw new Error(data.error || `${res.status}`);
      await deletePendingNote(item.id);
    }

    setStatus('Offline notes synced ✓', 'ok');
    setTimeout(() => setStatus(''), 3000);
  } catch (err) {
    setStatus('Sync failed: ' + (err.message || err), 'error');
  }
}

// ── Dictation ─────────────────────────────────────────────
function setupDictation() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SR) {
    dictateBtn.disabled = true;
    stopBtn.disabled    = true;
    dictateBtn.textContent = '🎤 Not supported';
    return;
  }

  const recognition       = new SR();
  recognition.lang        = 'en-GB';
  recognition.continuous  = false;
  recognition.interimResults = true;

  let finalTranscript = '';
  let baseText        = '';   // text that was in the box before dictation started

  dictateBtn.addEventListener('click', () => {
    // If the note shown is the "last saved" placeholder, clear it first
    const lastSaved = localStorage.getItem(LS.LAST_NOTE);
    if (noteEl.value === lastSaved) noteEl.value = '';

    finalTranscript = '';
    baseText        = noteEl.value.trim();

    recognition.start();
    dictateBtn.textContent = '🎤 Listening…';
    dictateBtn.disabled    = true;
    noteEl.classList.add('listening');
    setStatus('Listening…', 'info');
  });

  stopBtn.addEventListener('click', () => {
    recognition.stop();
  });

  recognition.onresult = (e) => {
    let interim = '';
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const t = e.results[i][0].transcript;
      if (e.results[i].isFinal) finalTranscript += t + ' ';
      else interim += t;
    }
    const combined = (finalTranscript + interim).trim();
    noteEl.value = baseText ? `${baseText} ${combined}` : combined;
    updateSaveBtn();
  };

  recognition.onend = () => {
    dictateBtn.textContent = '🎤 Dictate';
    dictateBtn.disabled    = false;
    noteEl.classList.remove('listening');
    setStatus('');
    // Update base for any continuation
    baseText = noteEl.value.trim();
  };

  recognition.onerror = () => {
    dictateBtn.textContent = '🎤 Dictate';
    dictateBtn.disabled    = false;
    noteEl.classList.remove('listening');
    setStatus('Dictation error or permission denied.', 'error');
  };
}

// ── Note field — clear on touch if showing last saved ─────
function setupNoteClear() {
  let shouldClear = false;

  noteEl.addEventListener('focus', () => {
    const lastSaved = localStorage.getItem(LS.LAST_NOTE);
    shouldClear = !!(lastSaved && noteEl.value === lastSaved);
  });

  noteEl.addEventListener('input', () => {
    if (shouldClear) {
      // Remove everything typed so far, start fresh
      shouldClear    = false;
      noteEl.value   = '';
    }
    updateSaveBtn();
  });
}

// ── Init ─────────────────────────────────────────────────
function init() {
  // Date defaults to today
  dateEl.value = new Date().toISOString().split('T')[0];

  // Restore therapist
  const savedTherapist = localStorage.getItem(LS.THERAPIST);
  if (savedTherapist) therapistEl.value = savedTherapist;

  // Restore last note (stays until touched or dictate pressed)
  const lastNote = localStorage.getItem(LS.LAST_NOTE);
  if (lastNote) noteEl.value = lastNote;

  // Persist therapist on change
  therapistEl.addEventListener('input', () => {
    localStorage.setItem(LS.THERAPIST, therapistEl.value);
    updateSaveBtn();
  });

  // Persist patient on change
  patientEl.addEventListener('change', () => {
    localStorage.setItem(LS.PATIENT, patientEl.value);
    updateSaveBtn();
  });

  noteEl.addEventListener('input', updateSaveBtn);

  saveBtn.addEventListener('click', saveEntry);

  setupNoteClear();
  setupDictation();
  loadPatients();
  syncOffline();

  updateSaveBtn();
}

window.addEventListener('online', syncOffline);
window.addEventListener('DOMContentLoaded', init);
