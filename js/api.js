// ============================================
// FUNCIONES API SUPABASE
// ============================================

async function sbFetch(path, opts = {}) {
  const h = {
    'apikey': KEY,
    'Authorization': 'Bearer ' + KEY,
    'Accept': 'application/json',
    ...(opts.headers || {})
  };
  return fetch(SB + path, { ...opts, headers: h });
}

// Lectura que informa si falló. Devuelve { ok, rows }.
//
// Esto existe porque sbGet() devuelve [] pase lo que pase — si el proyecto está
// pausado, si la clave es inválida o si no hay red. Para quien llama, un fallo
// del servidor es indistinguible de "no hay datos", y la app termina diciendo
// "Sin modelos" cuando en realidad no pudo conectarse. Quien necesite notar la
// diferencia usa esta función; el resto sigue usando sbGet() sin cambios.
async function sbGetChecked(path) {
  try {
    const r = await sbFetch(path);
    if (!r.ok) {
      console.error('Supabase GET', r.status, path);
      return { ok: false, rows: [], error: 'HTTP ' + r.status };
    }
    return { ok: true, rows: await r.json(), error: null };
  } catch (e) {
    const msg = (e && e.message) ? e.message : 'sin respuesta del servidor';
    console.error('Supabase GET falló', path, e);
    return { ok: false, rows: [], error: msg };
  }
}

async function sbGet(path) {
  const { rows } = await sbGetChecked(path);
  return rows;
}

async function sbPost(path, body) {
  return sbFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
    body: JSON.stringify(body)
  });
}

async function sbPatch(path, body) {
  return sbFetch(path, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
}

async function sbDelete(path) {
  return sbFetch(path, { method: 'DELETE', headers: { 'Content-Type': 'application/json' } });
}