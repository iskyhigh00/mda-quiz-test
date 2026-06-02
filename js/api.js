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

async function sbGet(path) {
  try {
    const r = await sbFetch(path);
    if (!r.ok) {
      console.error('GET', r.status);
      return [];
    }
    return r.json();
  } catch (e) {
    console.error('GET failed', e);
    return [];
  }
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