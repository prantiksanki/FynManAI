import { createContext, useContext, useState, useCallback } from 'react';

// ── JWT decode ────────────────────────────────────────────────
function decodeJwt(token) {
  try {
    const payload = token.split('.')[1];
    return JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
  } catch {
    return null;
  }
}

// ── Cookie helpers ────────────────────────────────────────────
const COOKIE_KEY = 'fynmanai_user';
const COOKIE_DAYS = 30;

function setCookie(name, value, days) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString();
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`;
}

function getCookie(name) {
  const match = document.cookie
    .split('; ')
    .find(row => row.startsWith(name + '='));
  if (!match) return null;
  try {
    return decodeURIComponent(match.split('=').slice(1).join('='));
  } catch {
    return null;
  }
}

function deleteCookie(name) {
  document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; SameSite=Lax`;
}

// ── Persist / read user ───────────────────────────────────────
const LS_KEY = 'vm_user'; // kept for backwards compat read

function saveUser(userData) {
  const json = JSON.stringify(userData);
  setCookie(COOKIE_KEY, json, COOKIE_DAYS);
  try { localStorage.setItem(LS_KEY, json); } catch { /* ignore */ }
}

function loadUser() {
  // Prefer cookie; fall back to localStorage (old sessions)
  const fromCookie = getCookie(COOKIE_KEY);
  if (fromCookie) {
    try { return JSON.parse(fromCookie); } catch { /* fall through */ }
  }
  try {
    const fromLs = localStorage.getItem(LS_KEY);
    if (fromLs) {
      const parsed = JSON.parse(fromLs);
      // Migrate: write to cookie so next load uses cookie
      setCookie(COOKIE_KEY, fromLs, COOKIE_DAYS);
      return parsed;
    }
  } catch { /* ignore */ }
  return null;
}

function clearUser() {
  deleteCookie(COOKIE_KEY);
  try { localStorage.removeItem(LS_KEY); } catch { /* ignore */ }
}

// ── Context ───────────────────────────────────────────────────
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => loadUser());

  const login = useCallback((credentialResponse) => {
    const decoded = decodeJwt(credentialResponse.credential);
    if (!decoded) return;
    const userData = {
      name:    decoded.name,
      email:   decoded.email,
      picture: decoded.picture,
      sub:     decoded.sub,
    };
    saveUser(userData);
    setUser(userData);
  }, []);

  const logout = useCallback(() => {
    clearUser();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
