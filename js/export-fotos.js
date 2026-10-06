// ============================================
// DESCARGAR FOTOS DEL CATÁLOGO (06-oct-2026)
// Un ZIP con todas las fotos, cada una nombrada con su modelo, para subirlas a
// otra app, + "referencia.csv" (archivo → modelo, ID, principal, quién la
// subió, fecha y dirección original). Todo se arma en el navegador.
// ============================================

const _CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function _crc32(u) { let c = 0xffffffff; for (let i = 0; i < u.length; i++) c = _CRC_T[(c ^ u[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }

// ZIP sin compresión (las fotos ya vienen comprimidas en JPG).
function _armarZip(archivos) {
  const te = new TextEncoder(), partes = [], central = [];
  let off = 0;
  for (const a of archivos) {
    const nom = te.encode(a.nombre), datos = a.datos, crc = _crc32(datos);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true);
    h.setUint32(14, crc, true); h.setUint32(18, datos.length, true); h.setUint32(22, datos.length, true); h.setUint16(26, nom.length, true);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true);
    c.setUint32(16, crc, true); c.setUint32(20, datos.length, true); c.setUint32(24, datos.length, true); c.setUint16(28, nom.length, true); c.setUint32(42, off, true);
    partes.push(new Uint8Array(h.buffer), nom, datos);
    central.push(new Uint8Array(c.buffer), nom);
    off += 30 + nom.length + datos.length;
  }
  const tam = central.reduce((s, x) => s + x.length, 0);
  const fin = new DataView(new ArrayBuffer(22));
  fin.setUint32(0, 0x06054b50, true); fin.setUint16(8, archivos.length, true); fin.setUint16(10, archivos.length, true);
  fin.setUint32(12, tam, true); fin.setUint32(16, off, true);
  return new Blob([...partes, ...central, new Uint8Array(fin.buffer)], { type: 'application/zip' });
}

// Nombre de archivo seguro a partir del nombre del modelo.
function _nombreArchivo(s) {
  return String(s || 'sin nombre').replace(/[\\/:*?"<>|]+/g, '-').replace(/\s+/g, ' ').trim().slice(0, 80) || 'sin nombre';
}
function _fotosDe(m) {
  let extras = m.photo_urls || [];
  if (typeof extras === 'string') { try { extras = JSON.parse(extras) || []; } catch (e) { extras = []; } }
  const lista = [];
  if (m.photo_url) lista.push({ url: m.photo_url, principal: true, por: '', fecha: '' });
  extras.forEach((p) => {
    const url = photoUrl(p);
    if (url && url !== m.photo_url) lista.push({ url, principal: false, por: photoBy(p), fecha: photoAt(p) });
  });
  return lista;
}

async function descargarFotosCatalogo(btn) {
  const modelos = (MACHINES || []).slice().sort((a, b) => String(a.name).localeCompare(String(b.name), 'es', { numeric: true }));
  const todas = [];
  modelos.forEach((m) => _fotosDe(m).forEach((f, i) => todas.push({ m, f, i })));
  if (!todas.length) return alert('No hay fotos para descargar.');
  const txt = btn ? btn.textContent : '';
  const archivos = [], filas = [['archivo', 'modelo', 'id', 'principal', 'n_foto', 'subida_por', 'fecha', 'url_original', 'estado']];
  const usados = new Set();
  let hechas = 0, fallas = 0;
  // De a 4 descargas a la vez (rápido sin saturar el celular).
  const cola = todas.slice();
  async function trabajador() {
    while (cola.length) {
      const { m, f, i } = cola.shift();
      const base = _nombreArchivo(m.name) + (i === 0 ? '' : ' (' + (i + 1) + ')');
      let nombre = base + '.jpg', k = 2;
      while (usados.has(nombre.toLowerCase())) nombre = base + ' ' + (k++) + '.jpg';
      usados.add(nombre.toLowerCase());
      let estado = 'ok';
      try {
        const r = await fetch(getImgUrl(f.url));
        if (!r.ok) throw new Error('HTTP ' + r.status);
        archivos.push({ nombre: 'fotos/' + nombre, datos: new Uint8Array(await r.arrayBuffer()) });
      } catch (e) { estado = 'no se pudo descargar (' + (e.message || e) + ')'; fallas++; }
      filas.push([estado === 'ok' ? 'fotos/' + nombre : '', m.name, m.id, f.principal ? 'sí' : 'no', i + 1, f.por, f.fecha, f.url, estado]);
      hechas++;
      if (btn) btn.textContent = '⬇ ' + hechas + '/' + todas.length + '…';
    }
  }
  if (btn) btn.disabled = true;
  try {
    await Promise.all([trabajador(), trabajador(), trabajador(), trabajador()]);
    const csv = '﻿' + filas.map((f) => f.map((v) => { const s = String(v == null ? '' : v); return /[";\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; }).join(';')).join('\n');
    archivos.sort((a, b) => a.nombre.localeCompare(b.nombre, 'es', { numeric: true }));
    archivos.unshift({ nombre: 'referencia.csv', datos: new TextEncoder().encode(csv) });
    const blob = _armarZip(archivos);
    const a = document.createElement('a');
    const d = new Date();
    a.href = URL.createObjectURL(blob);
    a.download = 'fotos catalogo MDA ' + d.toISOString().slice(0, 10) + '.zip';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    if (fallas) alert('Listo. ' + (todas.length - fallas) + ' fotos descargadas; ' + fallas + ' no se pudieron (quedan marcadas en referencia.csv).');
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = txt; }
  }
}
