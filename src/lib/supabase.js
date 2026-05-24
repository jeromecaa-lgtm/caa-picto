const SUPABASE_URL = 'https://mtjvzikhalwdpglaxmeb.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im10anZ6aWtoYWx3ZHBnbGF4bWViIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkxMTQ4NzYsImV4cCI6MjA5NDY5MDg3Nn0.3LrRsWIcYNNnx4xxuOkRjz95izUjkSG6QdaRSSZl4Cw';

const HEADERS = {
  'Content-Type': 'application/json',
  'apikey': SUPABASE_KEY,
};

let _session = null;
const _authListeners = [];

try {
  const saved = localStorage.getItem('caa-session');
  if (saved) _session = JSON.parse(saved);
} catch (e) {}

function authHeaders() {
  return _session
    ? { ...HEADERS, Authorization: 'Bearer ' + _session.access_token }
    : HEADERS;
}

function notifyListeners(event, session) {
  _authListeners.forEach((fn) => fn(event, session));
}

// ── AUTH ─────────────────────────────────────────────────────────────────────

export const supabase = {
  auth: {
    getSession: async () => ({ data: { session: _session }, error: null }),

    onAuthStateChange: (fn) => {
      _authListeners.push(fn);
      if (_session) setTimeout(() => fn('SIGNED_IN', _session), 0);
      return { data: { subscription: { unsubscribe: () => {} } } };
    },

    signInWithPassword: async ({ email, password }) => {
      const r = await fetch(SUPABASE_URL + '/auth/v1/token?grant_type=password', {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (data.access_token) {
        _session = data;
        localStorage.setItem('caa-session', JSON.stringify(data));
        notifyListeners('SIGNED_IN', data);
        return { data, error: null };
      }
      return { data: null, error: { message: data.error_description || data.msg || 'Erreur de connexion' } };
    },

    signUp: async ({ email, password }) => {
      const r = await fetch(SUPABASE_URL + '/auth/v1/signup', {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ email, password }),
      });
      const data = await r.json();
      if (data.id) return { data: { user: data }, error: null };
      return { data: null, error: { message: data.msg || 'Erreur inscription' } };
    },

    signOut: async () => {
      if (_session) {
        await fetch(SUPABASE_URL + '/auth/v1/logout', {
          method: 'POST', headers: authHeaders(),
        });
      }
      _session = null;
      localStorage.removeItem('caa-session');
      notifyListeners('SIGNED_OUT', null);
      return { error: null };
    },

    resetPasswordForEmail: async (email) => {
      const r = await fetch(SUPABASE_URL + '/auth/v1/recover', {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ email }),
      });
      const data = await r.json();
      return data.error ? { error: { message: data.msg } } : { error: null };
    },
  },

  // ── DB ───────────────────────────────────────────────────────────────────

  from: (table) => ({
    select: (cols = '*') => ({
      eq: (col, val) => ({
        single: async () => {
          const r = await fetch(
            `${SUPABASE_URL}/rest/v1/${table}?select=${cols}&${col}=eq.${encodeURIComponent(val)}`,
            { headers: { ...authHeaders(), Accept: 'application/vnd.pgrst.object+json' } }
          );
          if (!r.ok) return { data: null, error: { message: await r.text() } };
          return { data: await r.json(), error: null };
        },
        then: undefined,
      }),
      then: undefined,
    }),

    insert: async (row) => {
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
        method: 'POST',
        headers: { ...authHeaders(), Prefer: 'return=minimal' },
        body: JSON.stringify(row),
      });
      const text = await r.text();
      if (!r.ok) return { data: null, error: { message: text } };
      try { return { data: text ? JSON.parse(text) : null, error: null }; }
      catch { return { data: null, error: null }; }
    },

    update: (row) => ({
      eq: async (col, val) => {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`,
          {
            method: 'PATCH',
            headers: { ...authHeaders(), Prefer: 'return=minimal' },
            body: JSON.stringify(row),
          }
        );
        if (!r.ok) return { error: { message: await r.text() } };
        return { error: null };
      },
    }),

    upsert: async (row, opts) => {
      const conflict = opts?.onConflict ? `&on_conflict=${opts.onConflict}` : '';
      const r = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${conflict}`, {
        method: 'POST',
        headers: { ...authHeaders(), Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      });
      if (!r.ok) return { error: { message: await r.text() } };
      return { error: null };
    },

    delete: () => ({
      eq: async (col, val) => {
        const r = await fetch(
          `${SUPABASE_URL}/rest/v1/${table}?${col}=eq.${encodeURIComponent(val)}`,
          { method: 'DELETE', headers: authHeaders() }
        );
        if (!r.ok) return { error: { message: await r.text() } };
        return { error: null };
      },
    }),
  }),

  // ── RPC (fonctions SQL) ──────────────────────────────────────────────────

  rpc: async (fn, params = {}) => {
    const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(params),
    });
    const text = await r.text();
    if (!r.ok) return { data: null, error: { message: text } };
    try { return { data: JSON.parse(text), error: null }; }
    catch { return { data: text, error: null }; }
  },
};

// ── HELPERS PERSONS ──────────────────────────────────────────────────────────

export async function getMyPersons(userId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_persons?select=id,role,is_admin,can_edit_pictos,can_edit_complexity,can_edit_display,can_edit_accessibility,person:persons(*)&user_id=eq.${userId}`,
    { headers: authHeaders() }
  );
  if (!r.ok) return [];
  const data = await r.json();
  return data.map((row) => ({
    ...row.person,
    role: row.role,
    user_person_id: row.id,
    is_admin: row.is_admin,
    can_edit_pictos: row.can_edit_pictos,
    can_edit_complexity: row.can_edit_complexity,
    can_edit_display: row.can_edit_display,
    can_edit_accessibility: row.can_edit_accessibility,
  }));
}

export async function createPerson(userId, displayName) {
  const username = displayName.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, '');
  
  // Générer le tag via la fonction SQL
  const { data: tag } = await supabase.rpc('generate_unique_tag', { p_username: username });

  // Créer la personne
  const { error } = await supabase.from('persons').insert({
    display_name: displayName,
    username,
    tag,
  });
  if (error) return { data: null, error };

  // Récupérer la personne créée
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/persons?username=eq.${encodeURIComponent(username)}&tag=eq.${encodeURIComponent(tag)}&select=*`,
    { headers: authHeaders() }
  );
  const results = await r.json();
  const created = results[0];
  if (!created) return { data: null, error: { message: 'Erreur lors de la création' } };

  // Lier au user
  await supabase.from('user_persons').insert({
    user_id: userId,
    person_id: created.id,
    role: 'owner',
  });

  return { data: created, error: null };
}

export async function joinPersonByTag(userId, tagString) {
  // tagString = "lea#6262"
  const parts = tagString.trim().split('#');
  if (parts.length !== 2) return { data: null, error: { message: 'Format invalide. Utilise prenom#XXXX' } };
  const [username, tag] = parts;

  // Chercher la personne (retourne un tableau)
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/persons?username=eq.${encodeURIComponent(username.toLowerCase())}&tag=eq.${encodeURIComponent(tag)}&select=*`,
    { headers: authHeaders() }
  );
  if (!r.ok) return { data: null, error: { message: 'Erreur lors de la recherche' } };
  const results = await r.json();
  if (!results.length) return { data: null, error: { message: `Personne introuvable pour le tag "${tagString}"` } };
  const person = results[0];

  // Créer le lien
  const { error } = await supabase.from('user_persons').insert({
    user_id: userId,
    person_id: person.id,
    role: 'helper',
  });
  if (error) return { data: null, error };
  // Notifier le propriétaire
  try {
    const ownerRes = await fetch(
      `${SUPABASE_URL}/rest/v1/user_persons?person_id=eq.${person.id}&role=eq.owner&select=user_id`,
      { headers: authHeaders() }
    );
    const owners = await ownerRes.json();
    if (owners?.[0]) {
      const userRes = await fetch(
        `${SUPABASE_URL}/rest/v1/users?id=eq.${owners[0].user_id}&select=email`,
        { headers: authHeaders() }
      );
      const users = await userRes.json();
      if (users?.[0]?.email) {
        const helperRes = await fetch(
          `${SUPABASE_URL}/rest/v1/users?id=eq.${userId}&select=first_name,last_name,context`,
          { headers: authHeaders() }
        );
        const helpers = await helperRes.json();
        const helper = helpers?.[0];
        fetch('/api/notify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ownerEmail: users[0].email,
            helperName: `${helper?.first_name || ''} ${helper?.last_name || ''}`.trim() || 'Un nouvel aidant',
            helperContext: helper?.context || '',
            personName: person.display_name,
          }),
        });
      }
    }
  } catch(e) {}

  return { data: person, error: null };
}
export async function deletePerson(personId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/persons?id=eq.${personId}`,
    { method: 'DELETE', headers: authHeaders() }
  );
  if (!r.ok) return { error: { message: await r.text() } };
  return { error: null };
}

export async function unlinkPerson(userId, personId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/user_persons?user_id=eq.${userId}&person_id=eq.${personId}`,
    { method: 'DELETE', headers: authHeaders() }
  );
  if (!r.ok) return { error: { message: await r.text() } };
  return { error: null };
}

export async function getPersonChoices(personId) {
  const r = await fetch(
    `${SUPABASE_URL}/rest/v1/pictogram_choices?person_id=eq.${personId}&select=word,arasaac_id`,
    { headers: authHeaders() }
  );
  if (!r.ok) return {};
  const data = await r.json();
  const map = {};
  data.forEach((row) => { map[row.word] = row.arasaac_id; });
  return map;
}