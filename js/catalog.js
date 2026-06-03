// ============================================
// CATÁLOGO Y LIGHTBOX
// ============================================

async function loadMachines() {
  setSyncBadge('loading');
  try {
    const rows = await sbGet('/rest/v1/machines?order=name.asc&limit=500&select=id,name,sort_order,photo_url,photo_urls');
    MACHINES = rows.map(r => {
      let extraPhotos = [];
      try {
        extraPhotos = r.photo_urls ? (typeof r.photo_urls === 'string' ? JSON.parse(r.photo_urls) : r.photo_urls) : [];
        if (!Array.isArray(extraPhotos)) extraPhotos = [];
      } catch (e) {
        console.warn('photo_urls invalido', r.id, e);
        extraPhotos = [];
      }
      return { ...r, photo_url: r.photo_url || '', photo_urls: extraPhotos.filter(p => photoUrl(p)) };
    });
    MACHINES.sort((a, b) => a.name.localeCompare(b.name, 'es', { numeric: true, sensitivity: 'base' }));
    setSyncBadge('ok');
  } catch (e) {
    setSyncBadge('err');
    MACHINES = [];
  }
  buildCatalog();
  updateCounts();
  if (adminUnlocked && typeof renderAdmin === 'function') renderAdmin();
}

function updateCounts() {
  const n = MACHINES.length;
  const wi = MACHINES.filter(m => m.photo_url).length;
  const ac = document.getElementById('admin-count');
  if (ac) ac.textContent = '(' + n + ' total, ' + wi + ' con foto)';
}

function buildCatalog() {
  const g = document.getElementById('grid');
  g.innerHTML = '';
  if (!MACHINES.length) {
    g.innerHTML = '<div class="loading">Sin modelos. Agrega desde Admin.</div>';
    return;
  }
  MACHINES.forEach(m => {
    const c = document.createElement('div');
    c.className = 'card';
    c.dataset.name = m.name.toLowerCase();
    const allPhotos = [...new Set([m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean))];
    const badge = allPhotos.length > 1 ? '<span style="position:absolute;top:6px;right:6px;background:var(--accent);color:#fff;font-size:0.6rem;font-weight:800;padding:2px 7px;border-radius:10px;">' + allPhotos.length + ' 📷</span>' : '';
    const ih = m.photo_url
      ? '<div style="position:relative;width:100%;height:100%;">' + badge + '<img src="' + getImgUrl(m.photo_url) + '" loading="lazy" draggable="false"></div>'
      : '<div class="card-no-img">🎰</div>';
    c.innerHTML = '<div class="card-img">' + ih + '</div><div class="card-label">' + m.name + '</div>';
    if (m.photo_url) c.onclick = () => openGallery(m);
    g.appendChild(c);
  });
  filterCatalog();
}

function filterCatalog() {
  const q = document.getElementById('search').value.toLowerCase();
  let v = 0;
  document.querySelectorAll('.card').forEach(c => {
    const s = c.dataset.name.includes(q);
    c.style.display = s ? '' : 'none';
    if (s) v++;
  });
  document.getElementById('cat-count').textContent = v + ' modelo' + (v !== 1 ? 's' : '');
}

// ========== LIGHTBOX ==========
function openGallery(m) {
  lbMachineId = m.id;
  const mainMeta = (m.photo_urls || []).find(p => photoUrl(p) === m.photo_url);
  galleryPhotos = [
    ...(m.photo_url ? [mainMeta || { url: m.photo_url, uploaded_by: '' }] : []),
    ...(m.photo_urls || []).filter(p => photoUrl(p) !== m.photo_url).map(p => typeof p === 'string' ? { url: p, uploaded_by: '' } : p)
  ].filter(p => photoUrl(p));
  galleryIdx = 0;
  const nameEl = document.getElementById('lb-name');
  nameEl.dataset.baseName = m.name;
  nameEl.textContent = m.name;
  document.getElementById('lb-form-note')?.classList.remove('open');
  document.getElementById('lb-form-photo')?.classList.remove('open');
  document.getElementById('lb-form-author-name2').textContent = playerName || localStorage.getItem('mda_user_name') || '';
  renderGalleryPhoto();  // <-- Asegurar que esta línea existe
  renderLbThumbs();
  loadLbNotes(m.id);
  document.getElementById('lightbox').classList.add('open');
}
function renderGalleryPhoto() {
  const img = document.getElementById('lb-img');
  const current = galleryPhotos[galleryIdx];
  img.src = getImgUrl(photoUrl(current));
  const arrL = document.getElementById('lb-arr-l');
  const arrR = document.getElementById('lb-arr-r');
  if (arrL) arrL.classList.toggle('visible', galleryPhotos.length > 1);
  if (arrR) arrR.classList.toggle('visible', galleryPhotos.length > 1);
  const nameEl = document.getElementById('lb-name');
  const base = nameEl.dataset.baseName || nameEl.textContent.split(' - ').pop().split(' | ').shift();
  nameEl.dataset.baseName = base;
  
  // Mostrar contador de fotos de forma separada
  if (galleryPhotos.length > 1) {
    nameEl.innerHTML = `<span class="counter">📷 ${galleryIdx + 1} / ${galleryPhotos.length}</span><span>${base}</span>`;
  } else {
    nameEl.innerHTML = `<span>${base}</span>`;
  }
  
  const by = photoBy(current);
  const at = photoAt(current);
  const meta = document.getElementById('lb-photo-meta');
  if (meta) {
    if (by) {
      meta.textContent = '📸 Subida por ' + by + (at ? ' el ' + new Date(at).toLocaleDateString('es-CL') : '');
      meta.style.display = 'block';
    } else {
      meta.style.display = 'none';
    }
  }
}
function renderLbThumbs() {
  const wrap = document.getElementById('lb-thumbs');
  if (!wrap) return;
  if (galleryPhotos.length <= 1) {
    wrap.innerHTML = '';
    return;
  }
  wrap.innerHTML = galleryPhotos.map((url, i) => {
    const cls = 'lb-thumb' + (i === galleryIdx ? ' active' : '');
    return '<img src="' + getImgUrl(photoUrl(url)) + '" class="' + cls + '" onclick="galleryJump(' + i + ')" draggable="false">';
  }).join('');
}

function galleryJump(idx) {
  galleryIdx = idx;
  renderGalleryPhoto();
  renderLbThumbs();
}

function galleryNav(dir) {
  galleryIdx = (galleryIdx + dir + galleryPhotos.length) % galleryPhotos.length;
  renderGalleryPhoto();
  renderLbThumbs();
}

function closeLb() {
  document.getElementById('lightbox').classList.remove('open');
}

// Swipe touch para galería
let _lbTouchX = 0;
(function initLbSwipe() {
  document.addEventListener('touchstart', e => {
    if (document.getElementById('lightbox')?.classList.contains('open')) {
      _lbTouchX = e.touches[0].clientX;
    }
  }, { passive: true });
  document.addEventListener('touchend', e => {
    if (!document.getElementById('lightbox')?.classList.contains('open')) return;
    if (galleryPhotos.length <= 1) return;
    const dx = _lbTouchX - e.changedTouches[0].clientX;
    if (Math.abs(dx) > 44) galleryNav(dx > 0 ? 1 : -1);
  }, { passive: true });
})();

function toggleLbForm(type) {
  const noteForm = document.getElementById('lb-form-note');
  const photoForm = document.getElementById('lb-form-photo');
  if (type === 'note') {
    noteForm.classList.toggle('open');
    photoForm.classList.remove('open');
  } else {
    photoForm.classList.toggle('open');
    noteForm.classList.remove('open');
  }
}

async function loadLbNotes(machineId) {
  const wrap = document.getElementById('lb-notes-list');
  if (!wrap) return;
  wrap.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);">🔍 Cargando...</div>';
  try {
    const notes = await sbGet('/rest/v1/machine_notes?machine_id=eq.' + machineId + '&order=created_at.asc&limit=100');
    if (!notes.length) {
      wrap.innerHTML = '<div class="no-data">✨ Sin datos registrados.<br>¡Sé el primero en aportar!</div>';
      return;
    }
    wrap.innerHTML = notes.map(n => {
        const d = new Date(n.created_at);
        const fecha = d.toLocaleDateString('es-CL');
        const hora = d.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
        return '<div class="lb-note-card">' +
          '<div class="lb-note-card-text">' + n.note.replace(/</g, '&lt;').replace(/>/g, '&gt;') + '</div>' +
          '<div class="lb-note-card-meta">✍️ ' + n.author + ' · ' + fecha + ' ' + hora + '</div>' +
        '</div>';
      }).join('');
  } catch(e) {
    wrap.innerHTML = '<div class="no-data" style="color:var(--red);">⚠️ Error: ' + e.message + '</div>';
  }
}
async function lbSubmitNote() {
  if (!lbMachineId) return;
  const author = playerName || localStorage.getItem('mda_user_name') || '';
  const note = document.getElementById('lb-note-input')?.value.trim();
  if (!author) {
    alert('Primero configura tu nombre.');
    return;
  }
  if (!note) {
    alert('Escribe algo antes de agregar.');
    return;
  }
  if (note.length > 1000) {
    alert('Máximo 1000 caracteres.');
    return;
  }
  try {
    const r = await sbPost('/rest/v1/machine_notes', { machine_id: lbMachineId, author: author, note: note });
    if (!r.ok) {
      const e = await r.text();
      alert('Error ' + r.status + ': ' + e);
      return;
    }
    document.getElementById('lb-note-input').value = '';
    document.getElementById('lb-form-note').classList.remove('open');
    await loadLbNotes(lbMachineId);
  } catch (e) {
    alert('Error: ' + e.message);
  }
}

async function lbUploadPhotos(input) {
  if (!lbMachineId || !input.files.length) return;
  const author = playerName || localStorage.getItem('mda_user_name') || '';
  if (!author) {
    alert('Primero configura tu nombre.');
    return;
  }
  const status = document.getElementById('lb-upload-status');
  status.style.display = 'block';
  status.textContent = 'Subiendo...';
  const m = MACHINES.find(x => x.id === lbMachineId);
  if (!m) {
    status.textContent = 'Error: máquina no encontrada.';
    return;
  }
  const files = Array.from(input.files).slice(0, 3);
  let ok = 0;
  for (let i = 0; i < files.length; i++) {
    status.textContent = 'Subiendo foto ' + (i + 1) + ' de ' + files.length + '...';
    try {
      const filename = makeFilename(m.id, 'pub_' + Date.now() + '_' + i);
      const url = await uploadPhoto(files[i], filename);
      const entry = makePhotoEntry(url, author);
      if (!m.photo_urls) m.photo_urls = [];
      if (!m.photo_url) {
        m.photo_url = url;
        m.photo_urls.push(entry);
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_url: url, photo_urls: JSON.stringify(m.photo_urls) });
      } else {
        m.photo_urls.push(entry);
        await sbPatch('/rest/v1/machines?id=eq.' + m.id, { photo_urls: JSON.stringify(m.photo_urls) });
      }
      ok++;
    } catch (e) {
      status.textContent = 'Error: ' + e.message;
    }
  }
  if (ok) {
    status.textContent = ok + ' foto(s) subida(s). ¡Gracias, ' + author + '!';
    const mainMeta = (m.photo_urls || []).find(p => photoUrl(p) === m.photo_url);
    galleryPhotos = [
      ...(m.photo_url ? [mainMeta || { url: m.photo_url, uploaded_by: '' }] : []),
      ...(m.photo_urls || []).filter(p => photoUrl(p) !== m.photo_url).map(p => typeof p === 'string' ? { url: p, uploaded_by: '' } : p)
    ].filter(p => photoUrl(p));
    renderGalleryPhoto();
    renderLbThumbs();
    buildCatalog();
  }
  input.value = '';
}
