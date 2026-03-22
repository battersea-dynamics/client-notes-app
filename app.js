const saveBtnEl = document.getElementById('saveBtn');
const statusEl = document.getElementById('status');
const dictateBtnEl = document.getElementById('dictateBtn');
const stopDictationBtnEl = document.getElementById('stopDictationBtn');

const patientCodeEl = document.getElementById('patientCode');
const therapistNameEl = document.getElementById('therapistName');
const entryDateEl = document.getElementById('entryDate');
const notesInputEl = document.getElementById('notesInput');

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? '#b91c1c' : '#065f46';
}

function setSaveButtonState(isSaving) {
  saveBtnEl.disabled = isSaving;
  saveBtnEl.textContent = isSaving ? 'Saving...' : 'Save Entry';
}

async function loadPatients() {
  try {
    const response = await fetch('/.netlify/functions/get-patients');
    const data = await response.json();

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || 'Failed to load patients');
    }

    patientCodeEl.innerHTML = '<option value="">Select patient</option>';

    data.patients.forEach((code) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = code;
      patientCodeEl.appendChild(option);
    });

    const savedPatient = localStorage.getItem('patientCode');
    if (savedPatient) {
      patientCodeEl.value = savedPatient;
    }
    updateSaveButtonState();
  } catch (error) {
    setStatus(error.message || String(error), true);
    patientCodeEl.innerHTML = '<option value="">No patients loaded</option>';
  }
}

async function saveEntry() {
  const patient = patientCodeEl.value.trim();
  const therapist = therapistNameEl.value.trim();
  const today = new Date().toISOString().split('T')[0];

// If the current date field is empty or older than today, refresh it
  if (!entryDateEl.value || entryDateEl.value < today) {
   entryDateEl.value = today;
  }

  const date = entryDateEl.value;
  const note = notesInputEl.value.trim();

  if (!patient || !therapist || !note) {
    setStatus('Please fill Patient, Therapist, and Note.', true);
    return;
  }

  localStorage.setItem('therapistName', therapist);

  try {
    setStatus('Saving...');
    setSaveButtonState(true);

    const response = await fetch('/.netlify/functions/save-note', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ patient, therapist, date, note }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok || data.ok === false) {
      throw new Error(data.error || `Server error ${response.status}`);
    }

    localStorage.setItem('lastSavedNote', note);
    notesInputEl.focus();

    setStatus('Saved ✓');

    setTimeout(() => {
      setStatus('Ready to save notes.');
      setSaveButtonState(false);
    }, 5000);
  } catch (error) {
  try {
    await addPendingNote({ patient, therapist, date, note });

    notesInputEl.value = '';
    notesInputEl.focus();

    setStatus('Saved offline. Will sync later.');
  } catch (offlineError) {
    setStatus(
      `Save failed: ${error.message || String(error)} / Offline save failed: ${offlineError.message || String(offlineError)}`,
      true
    );
  }

  setSaveButtonState(false);
}
}

function setupDictation() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
    dictateBtnEl.disabled = true;
    stopDictationBtnEl.disabled = true;
    dictateBtnEl.textContent = '🎤 Not supported';
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = 'en-GB';
  recognition.interimResults = true;
  recognition.continuous = false;

  let finalTranscript = '';

  dictateBtnEl.addEventListener('click', () => {
  finalTranscript = '';

  const lastSavedNote = localStorage.getItem('lastSavedNote');
  if (notesInputEl.value === lastSavedNote) {
    notesInputEl.value = '';
  }

  recognition.start();
  dictateBtnEl.textContent = '🎤 Listening...';
  setStatus('Listening...');
});

  stopDictationBtnEl.addEventListener('click', () => {
    recognition.stop();
    dictateBtnEl.textContent = '🎤 Dictate';
    setStatus('Dictation stopped.');
  });

  recognition.onresult = (event) => {
    let interimTranscript = '';

    for (let i = event.resultIndex; i < event.results.length; i += 1) {
      const transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += `${transcript} `;
      } else {
        interimTranscript += transcript;
      }
    }

  const dictatedText = (finalTranscript + interimTranscript).trim();
  const existingText = notesInputEl.value.trim();

  notesInputEl.value = existingText
    ? `${existingText} ${dictatedText}`.trim()
    : dictatedText;
  };

  recognition.onend = () => {
    dictateBtnEl.textContent = '🎤 Dictate';
    setStatus('Ready to save notes.');
  };

  recognition.onerror = () => {
    dictateBtnEl.textContent = '🎤 Dictate';
    setStatus('Dictation error or permission denied.', true);
  };
}

async function syncPendingNotes() {
  try {
    const pendingNotes = await getPendingNotes();

    if (!pendingNotes.length) {
      return;
    }

    setStatus(`Syncing ${pendingNotes.length} offline note(s)...`);

    for (const item of pendingNotes) {
      const response = await fetch('/.netlify/functions/save-note', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient: item.patient,
          therapist: item.therapist,
          date: item.date,
          note: item.note,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok || data.ok === false) {
        throw new Error(data.error || `Server error ${response.status}`);
      }

      await deletePendingNote(item.id);
    }

    setStatus('Offline notes synced ✓');
  } catch (error) {
    setStatus(`Sync failed: ${error.message || String(error)}`, true);
  }
}

function updateSaveButtonState() {
  const hasPatient = patientCodeEl.value.trim() !== '';
  saveBtnEl.disabled = !hasPatient;
}

function init() {
  setStatus('Ready to save notes.');
  loadPatients();
  syncPendingNotes();
  setupDictation();

  patientCodeEl.addEventListener('change', () => {
    localStorage.setItem('patientCode', patientCodeEl.value);
    updateSaveButtonState();
  });

  const savedTherapist = localStorage.getItem('therapistName');
  if (savedTherapist) {
    therapistNameEl.value = savedTherapist;
  }

    const lastSavedNote = localStorage.getItem('lastSavedNote');
  if (lastSavedNote) {
    notesInputEl.value = lastSavedNote;
  }

  const today = new Date().toISOString().split('T')[0];
  entryDateEl.value = today;

    let shouldClearSavedNoteOnNextInput = false;

  notesInputEl.addEventListener('focus', () => {
    const lastSavedNote = localStorage.getItem('lastSavedNote');
    shouldClearSavedNoteOnNextInput = !!lastSavedNote && notesInputEl.value === lastSavedNote;
  });

  notesInputEl.addEventListener('input', () => {
    if (shouldClearSavedNoteOnNextInput) {
      shouldClearSavedNoteOnNextInput = false;
      notesInputEl.value = '';
    }
  });

  saveBtnEl.addEventListener('click', saveEntry);
}

window.addEventListener('online', syncPendingNotes);
window.addEventListener('DOMContentLoaded', init);