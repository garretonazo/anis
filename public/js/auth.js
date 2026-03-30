const AUTH_KEY = 'anis_token';

export function getToken() {
  return localStorage.getItem(AUTH_KEY);
}

export async function checkAuth() {
  const token = getToken();
  if (!token) return false;
  const res = await fetch('/api/auth/check', {
    headers: { Authorization: `Bearer ${token}` },
  });
  const { isOwner } = await res.json();
  if (!isOwner) localStorage.removeItem(AUTH_KEY);
  return isOwner;
}

export async function login(password) {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password }),
  });
  if (!res.ok) throw new Error('Contraseña incorrecta');
  const { token } = await res.json();
  localStorage.setItem(AUTH_KEY, token);
  return token;
}

export async function logout() {
  const token = getToken();
  if (token) {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    localStorage.removeItem(AUTH_KEY);
  }
}

export function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}
