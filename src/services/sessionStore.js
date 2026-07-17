export const SESSION_KEY = 'unicar.session';

export function readStoredSession() {
  const serialized = sessionStorage.getItem(SESSION_KEY) || localStorage.getItem(SESSION_KEY);

  if (!serialized) {
    return null;
  }

  try {
    return JSON.parse(serialized);
  } catch {
    return null;
  }
}

export function saveSession(session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
  localStorage.removeItem(SESSION_KEY);
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(SESSION_KEY);
}

export function migrateLegacySession(session) {
  if (!sessionStorage.getItem(SESSION_KEY) && localStorage.getItem(SESSION_KEY)) {
    saveSession(session);
  }
}
