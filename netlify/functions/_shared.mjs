export const json = (data, status = 200) => new Response(JSON.stringify(data), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' }
});

export function envOrThrow(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing environment variable: ${name}`);
  return value;
}

export async function supabaseRequest(path, { method = 'GET', body, token } = {}) {
  const base = envOrThrow('SUPABASE_URL').replace(/\/$/, '');
  const key = envOrThrow('SUPABASE_SERVICE_ROLE_KEY');
  const response = await fetch(`${base}/rest/v1/${path}`, {
    method,
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...(token ? { 'x-user-token': token } : {})
    },
    ...(body !== undefined ? { body: JSON.stringify(body) } : {})
  });
  const text = await response.text();
  let data = null;
  try { data = text ? JSON.parse(text) : null; } catch { data = { message: text }; }
  if (!response.ok) {
    const error = new Error(data?.message || data?.hint || `Supabase request failed (${response.status})`);
    error.status = response.status;
    throw error;
  }
  return data;
}

export async function getAuthenticatedUser(request) {
  const authorization = request.headers.get('authorization') || '';
  const token = authorization.startsWith('Bearer ') ? authorization.slice(7).trim() : '';
  if (!token) return null;
  const base = envOrThrow('SUPABASE_URL').replace(/\/$/, '');
  const anonKey = envOrThrow('SUPABASE_ANON_KEY');
  const response = await fetch(`${base}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: `Bearer ${token}` }
  });
  if (!response.ok) return null;
  const user = await response.json();
  return user?.id ? { ...user, accessToken: token } : null;
}

export async function requireAdmin(request) {
  const user = await getAuthenticatedUser(request);
  if (!user) return { error: json({ error: 'Autentikasi diperlukan.' }, 401) };
  const rows = await supabaseRequest(`profiles?id=eq.${encodeURIComponent(user.id)}&select=id,role&limit=1`);
  if (!rows?.length || rows[0].role !== 'admin') {
    return { error: json({ error: 'Akses admin diperlukan.' }, 403) };
  }
  return { user };
}
