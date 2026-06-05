// ============================================
// PREGUNTAS COMUNITARIAS — APORTE PÚBLICO
// ============================================

let _qSubmitFile = null;

async function openSubmitQuestion() {
  document.getElementById('sq-author').value = playerName || localStorage.getItem('mda_user_name') || '';
  document.getElementById('sq-anon').checked = false;
  document.getElementById('sq-type').value = 'falla';
  document.getElementById('sq-question').value = '';
  document.getElementById('sq-correct').value = '';
  document.getElementById('sq-optb').value = '';
  document.getElementById('sq-optc').value = '';
  document.getElementById('sq-optd').value = '';
  document.getElementById('sq-preview').innerHTML = '<span style="color:var(--muted);font-size:0.82rem;">Sin imagen seleccionada</span>';
  document.getElementById('sq-status').style.display = 'none';
  _qSubmitFile = null;
  openModal('modal-submit-q');
}

function previewQPhoto(input) {
  if (!input.files[0]) return;
  _qSubmitFile = input.files[0];
  resizeImgPromise(input.files[0], 800, 600).then(b64 => {
    document.getElementById('sq-preview').innerHTML = '<img src="data:image/jpeg;base64,' + b64 + '" style="max-height:130px;max-width:100%;object-fit:contain;border-radius:8px;">';
  });
}

async function submitQuestion() {
  const author = document.getElementById('sq-author').value.trim();
  const anon = document.getElementById('sq-anon').checked;
  const type = document.getElementById('sq-type').value;
  const question = document.getElementById('sq-question').value.trim();
  const correct = document.getElementById('sq-correct').value.trim();
  const optB = document.getElementById('sq-optb').value.trim();
  const optC = document.getElementById('sq-optc').value.trim();
  const optD = document.getElementById('sq-optd').value.trim();
  const statusEl = document.getElementById('sq-status');

  if (!author) { await mdaAlert('Ingresa tu nombre.'); return; }
  if (!question) { await mdaAlert('Escribe la pregunta.'); return; }
  if (!correct) { await mdaAlert('Escribe la respuesta correcta.'); return; }
  if (!optB || !optC || !optD) { await mdaAlert('Completa las 3 alternativas incorrectas.'); return; }
  if (!_qSubmitFile) { await mdaAlert('Selecciona una imagen.'); return; }

  statusEl.style.display = 'block';
  statusEl.style.color = 'var(--accent2)';
  statusEl.textContent = 'Subiendo imagen...';

  try {
    const filename = 'quiz_q_' + Date.now() + '_' + Math.random().toString(36).slice(2) + '.jpg';
    const url = await uploadPhoto(_qSubmitFile, filename);
    statusEl.textContent = 'Guardando pregunta...';
    await sbPost('/rest/v1/quiz_questions', {
      type,
      image_url: url,
      question_text: question,
      correct_answer: correct,
      option_b: optB,
      option_c: optC,
      option_d: optD,
      submitted_by_display: anon ? 'Anónimo' : author,
      submitted_by_real: author,
      status: 'pending'
    });
    statusEl.textContent = '✓ ¡Pregunta enviada! Será revisada antes de publicarse. ¡Gracias!';
    statusEl.style.color = 'var(--green)';
    setTimeout(() => closeModal('modal-submit-q'), 2500);
  } catch (e) {
    statusEl.textContent = 'Error: ' + e.message;
    statusEl.style.color = 'var(--red)';
  }
}
