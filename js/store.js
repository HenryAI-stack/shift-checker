const LOCAL_KEY = "shift-checker:settings-cache";

function readLocalSettings() {
  try {
    const raw = localStorage.getItem(LOCAL_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeLocalSettings(settings) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(settings));
  } catch (e) {
    /* storage unavailable (private mode etc.) — ignore, Drive stays source of truth */
  }
}

function clearLocalSettings() {
  try { localStorage.removeItem(LOCAL_KEY); } catch (e) {}
}

const LAST_USER_KEY = "shift-checker:last-user";

function readLastUser() {
  try {
    const raw = localStorage.getItem(LAST_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (e) {
    return null;
  }
}

function writeLastUser(user) {
  try {
    localStorage.setItem(LAST_USER_KEY, JSON.stringify({
      email: user.email,
      name: user.name,
      picture: user.picture
    }));
  } catch (e) {
    /* storage unavailable — remembered login just won't work, no hard failure */
  }
}

function clearLastUser() {
  try { localStorage.removeItem(LAST_USER_KEY); } catch (e) {}
}

