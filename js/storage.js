// ============================================
// FUNCIONES DE STORAGE (FOTOS)
// ============================================

function b64ToBlob(b64, type) {
  const bytes = atob(b64);
  const arr = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) arr[i] = bytes.charCodeAt(i);
  return new Blob([arr], { type });
}

function resizeImgPromise(file, maxW, maxH) {
  return new Promise(resolve => {
    const r = new FileReader();
    r.onload = e => {
      const img = new Image();
      img.onload = () => {
        let w = img.width, h = img.height;
        const ratio = Math.min(maxW / w, maxH / h, 1);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
        const c = document.createElement('canvas');
        c.width = w;
        c.height = h;
        c.getContext('2d').drawImage(img, 0, 0, w, h);
        resolve(c.toDataURL('image/jpeg', 0.84).split(',')[1]);
      };
      img.src = e.target.result;
    };
    r.readAsDataURL(file);
  });
}

function makeFilename(machineId, index) {
  return 'machine_' + machineId + '_' + index + '_' + Date.now() + '.jpg';
}

async function uploadPhoto(file, filename) {
  const b64 = await resizeImgPromise(file, 400, 520);
  const blob = b64ToBlob(b64, 'image/jpeg');
  const r = await fetch(STORAGE_URL + filename, {
    method: 'POST',
    headers: {
      'apikey': KEY,
      'Authorization': 'Bearer ' + KEY,
      'Content-Type': 'image/jpeg',
      'x-upsert': 'true'
    },
    body: blob
  });
  if (!r.ok) {
    const e = await r.text();
    throw new Error('Upload failed: ' + r.status + ' ' + e);
  }
  return STORAGE_PUBLIC + filename;
}

function getImgUrl(url) {
  return url ? url + '?t=' + Date.now() : '';
}

function photoUrl(p) {
  return typeof p === 'string' ? p : (p && p.url) || '';
}

function photoBy(p) {
  return typeof p === 'object' && p ? p.uploaded_by || p.by || '' : '';
}

function photoAt(p) {
  return typeof p === 'object' && p ? p.uploaded_at || '' : '';
}

function makePhotoEntry(url, by) {
  return { url, uploaded_by: by, uploaded_at: new Date().toISOString() };
}

function currentSeason() {
  return (compState && compState.active && compState.compId) ? compState.compId : 'practica';
}

function getClaveHora() {
  const n = new Date();
  return String(n.getHours()).padStart(2, '0') + String(n.getMinutes()).padStart(2, '0');
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}