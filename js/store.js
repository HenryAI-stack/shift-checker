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
