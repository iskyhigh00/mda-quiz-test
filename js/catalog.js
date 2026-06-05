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
    c.dataset.machineId = m.id;
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
  startCatalogSlideshow();
}

// ===== AUTO-SLIDESHOW =====
let _slideInterval = null;
const _slidePhotos = new Map();
const _slideIdx = new Map();

function _doSlide(id) {
  const photos = _slidePhotos.get(id);
  if (!photos) return;
  const next = (_slideIdx.get(id) + 1) % photos.length;
  _slideIdx.set(id, next);
  const card = document.querySelector('.card[data-machine-id="' + id + '"]');
  if (!card || card.style.display === 'none') return;
  const imgBox = card.querySelector('.card-img');
  const innerWrap = imgBox && imgBox.firstElementChild;
  const curImg = innerWrap && innerWrap.querySelector('img');
  if (!curImg) return;
  const newImg = document.createElement('img');
  newImg.draggable = false;
  newImg.src = getImgUrl(photos[next]);
  newImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;transform:translateX(100%);pointer-events:none;';
  curImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none;';
  innerWrap.style.overflow = 'hidden';
  innerWrap.appendChild(newImg);
  newImg.getBoundingClientRect();
  const ease = 'transform 0.55s cubic-bezier(0.4,0,0.2,1)';
  curImg.style.transition = ease;
  newImg.style.transition = ease;
  curImg.style.transform = 'translateX(-100%)';
  newImg.style.transform = 'translateX(0)';
  setTimeout(() => { curImg.remove(); newImg.style.cssText = ''; innerWrap.style.overflow = ''; }, 620);
}

function startCatalogSlideshow() {
  stopCatalogSlideshow();
  _slidePhotos.clear();
  _slideIdx.clear();
  MACHINES.forEach(m => {
    const all = [...new Set([m.photo_url, ...(m.photo_urls || []).map(photoUrl)].filter(Boolean))];
    if (all.length > 1) {
      _slidePhotos.set(String(m.id), all);
      _slideIdx.set(String(m.id), Math.floor(Math.random() * all.length));
    }
  });
  if (_slidePhotos.size === 0) return;
  const ids = [..._slidePhotos.keys()];
  const tick = () => _doSlide(ids[Math.floor(Math.random() * ids.length)]);
  setTimeout(tick, 600);
  _slideInterval = setInterval(tick, 1800);
}

function stopCatalogSlideshow() {
  if (_slideInterval) { clearInterval(_slideInterval); _slideInterval = null; }
}

let _filterTO = null;
function filterCatalog() {
  clearTimeout(_filterTO);
  _filterTO = setTimeout(() => {
    const q = document.getElementById('search').value.toLowerCase();
    let v = 0;
    document.querySelectorAll('.card').forEach(c => {
      const s = c.dataset.name.includes(q);
      c.style.display = s ? '' : 'none';
      if (s) v++;
    });
    document.getElementById('cat-count').textContent = v + ' modelo' + (v !== 1 ? 's' : '');
  }, 200);
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
  renderGalleryPhoto();
  renderLbThumbs();
  loadLbNotes(m.id);
  history.pushState({ lightbox: true }, '');
  _lbHistoryPushed = true;
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
  nameEl.textContent = base;
  
  const by = photoBy(current);
  const at = photoAt(current);
  const meta = document.getElementById('lb-photo-meta');
  if (meta) {
    if (by || at) {
      const parts = [];
      if (by) parts.push('📸 ' + by);
      if (at) parts.push(new Date(at).toLocaleDateString('es-CL'));
      meta.textContent = parts.join(' · ');
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

let _lbHistoryPushed = false;

function closeLb() {
  const lb = document.getElementById('lightbox');
  if (!lb.classList.contains('open')) return;
  lb.classList.remove('open');
  if (_lbHistoryPushed) {
    _lbHistoryPushed = false;
    history.back();
  }
}

window.addEventListener('popstate', () => {
  const lb = document.getElementById('lightbox');
  if (lb?.classList.contains('open')) {
    _lbHistoryPushed = false;
    lb.classList.remove('open');
  }
});

// Swipe táctil — sigue el dedo en tiempo real con preview de foto adyacente
let _lbTouchX = 0;
let _lbTouchY = 0;
let _lbSwiping = false;
let _lbSideImg = null;
let _lbSwipeDir = 0;
(function initLbSwipe() {
  const lb = document.getElementById('lightbox');
  if (!lb) return;
  lb.addEventListener('touchstart', e => {
    _lbTouchX = e.touches[0].clientX;
    _lbTouchY = e.touches[0].clientY;
    _lbSwiping = false; _lbSwipeDir = 0;
    if (_lbSideImg) { _lbSideImg.remove(); _lbSideImg = null; }
    const img = document.getElementById('lb-img');
    if (img) { img.style.transition = ''; img.style.transform = ''; }
  }, { passive: true });
  lb.addEventListener('touchmove', e => {
    if (galleryPhotos.length <= 1) return;
    const dx = e.touches[0].clientX - _lbTouchX;
    const dy = e.touches[0].clientY - _lbTouchY;
    if (!_lbSwiping) {
      if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;
      if (Math.abs(dy) > Math.abs(dx)) return;
      _lbSwiping = true;
    }
    e.preventDefault();
    const img = document.getElementById('lb-img');
    if (!img) return;
    img.style.transform = 'translateX(' + dx + 'px)';
    const newDir = dx < 0 ? 1 : -1;
    if (_lbSwipeDir !== newDir) {
      if (_lbSideImg) _lbSideImg.remove();
      _lbSwipeDir = newDir;
      const sideIdx = (galleryIdx + newDir + galleryPhotos.length) % galleryPhotos.length;
      _lbSideImg = document.createElement('img');
      _lbSideImg.src = getImgUrl(photoUrl(galleryPhotos[sideIdx]));
      _lbSideImg.draggable = false;
      _lbSideImg.style.cssText = 'position:absolute;inset:16px;width:calc(100% - 32px);height:calc(100% - 32px);object-fit:contain;pointer-events:none;z-index:1;';
      img.parentElement.appendChild(_lbSideImg);
    }
    if (_lbSideImg) {
      const contW = img.parentElement.offsetWidth;
      _lbSideImg.style.transform = 'translateX(' + (dx + _lbSwipeDir * contW) + 'px)';
    }
  }, { passive: false });
  lb.addEventListener('touchend', e => {
    if (!_lbSwiping) return;
    _lbSwiping = false;
    const img = document.getElementById('lb-img');
    if (!img) return;
    const dx = e.changedTouches[0].clientX - _lbTouchX;
    const contW = img.parentElement.offsetWidth;
    const threshold = contW * 0.28;
    const ease = 'transform 0.3s cubic-bezier(0.4,0,0.2,1)';
    if (Math.abs(dx) > threshold && _lbSwipeDir !== 0) {
      const dir = _lbSwipeDir;
      img.style.transition = ease;
      img.style.transform = 'translateX(' + (dx < 0 ? -contW : contW) + 'px)';
      if (_lbSideImg) { _lbSideImg.style.transition = ease; _lbSideImg.style.transform = 'translateX(0)'; }
      const capturedSide = _lbSideImg;
      _lbSideImg = null;
      setTimeout(() => {
        img.style.transition = ''; img.style.transform = '';
        if (capturedSide) capturedSide.remove();
        galleryNav(dir);
      }, 300);
    } else {
      img.style.transition = ease;
      img.style.transform = '';
      if (_lbSideImg) {
        const contW2 = img.parentElement.offsetWidth;
        _lbSideImg.style.transition = ease;
        _lbSideImg.style.transform = 'translateX(' + (_lbSwipeDir * contW2) + 'px)';
        const capturedSide = _lbSideImg;
        _lbSideImg = null;
        setTimeout(() => capturedSide.remove(), 300);
      }
      _lbSwipeDir = 0;
      setTimeout(() => { const i2 = document.getElementById('lb-img'); if (i2) i2.style.transition = ''; }, 300);
    }
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
