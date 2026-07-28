let settings = null; // { language: 'en'|'pl', referenceMonday: 'YYYY-MM-DD' }
let calendarCursor = new Date(); // month currently shown
let selectedDate = new Date();

const el = (id) => document.getElementById(id);

function showScreen(name) {
  ["login", "setup", "main"].forEach(s => {
    el(`screen-${s}`).classList.toggle("hidden", s !== name);
  });
}

function ymd(date) {
  const d = toUTCDateOnly(date);
  return d.toISOString().slice(0, 10);
}

function isMondayISO(isoStr) {
  if (!isoStr) return false;
  const d = new Date(isoStr + "T00:00:00Z");
  return d.getUTCDay() === 1;
}

/* ---------------- Boot ---------------- */

let gisReady = false;
let autoAttemptInFlight = false;

function onGoogleToken(token, err) {
  if (err || !token) {
    const wasAuto = autoAttemptInFlight;
    autoAttemptInFlight = false;
    if (wasAuto) {
      // Silent/remembered attempt didn't go through (session expired,
      // consent revoked, or the browser needed a real user gesture).
      // Not an error from the user's point of view — just fall back to
      // the visible "Continue" tap they can already see on screen.
      el("login-status").textContent = "";
    } else {
      el("login-status").textContent = t("login.error");
    }
    return;
  }
  autoAttemptInFlight = false;
  el("login-status").textContent = t("login.loading");
  Promise.all([fetchUserInfo(), loadSettingsFromDrive()])
    .then(([user, remoteSettings]) => {
      renderUser(user);
      writeLastUser(user);
      if (remoteSettings && remoteSettings.referenceMonday) {
        settings = remoteSettings;
        writeLocalSettings(settings);
        setLang(settings.language || "en");
        enterMainApp();
      } else {
        const cached = readLocalSettings();
        setLang((cached && cached.language) || "en");
        showScreen("setup");
      }
    })
    .catch((e) => {
      console.error(e);
      el("login-status").textContent = t("login.error");
    });
}

function showRememberedLoginUI(user) {
  el("login-remembered").classList.remove("hidden");
  el("btn-login").classList.add("hidden");
  const avatar = el("remembered-avatar");
  if (user.picture) avatar.src = user.picture;
  avatar.alt = user.name || user.email || "";
  el("remembered-name").textContent = user.name || user.email || "";
}

function hideRememberedLoginUI() {
  el("login-remembered").classList.add("hidden");
  el("btn-login").classList.remove("hidden");
}

// Called once the accounts.google.com/gsi/client script has actually
// finished loading (wired via the script tag's onload in index.html).
// This must not run before `google` exists, and DOMContentLoaded alone
// does not guarantee that, since the script tag is async/defer.
window.__onGsiLoaded = function () {
  if (gisReady) return; // guard against double-init
  gisReady = true;
  initGoogleAuth(onGoogleToken);
  el("btn-login").disabled = false;
  el("btn-continue").disabled = false;

  const remembered = readLastUser();
  if (remembered) {
    showRememberedLoginUI(remembered);
    // Best-effort automatic silent reauth — if the browser still has an
    // active Google session and consent was already granted, this signs
    // the user back in with no tap at all. If the browser blocks it (no
    // user gesture on this page load) or the session is gone, the
    // "Continue" button underneath still lets them finish in one tap.
    autoAttemptInFlight = true;
    el("login-status").textContent = t("login.autoSigningIn");
    requestSilentLogin(remembered.email);
  } else {
    el("login-status").textContent = "";
  }
};

window.addEventListener("DOMContentLoaded", () => {
  setLang("en");
  wireStaticEvents();

  el("btn-login").disabled = true;
  el("btn-continue").disabled = true;
  el("login-status").textContent = t("login.loading");

  // In case the GIS script already finished loading (e.g. served from
  // cache) before this listener ran, the onload attribute may have fired
  // before __onGsiLoaded existed — so also check directly.
  if (window.google && window.google.accounts && window.google.accounts.oauth2) {
    window.__onGsiLoaded();
  } else {
    // Fallback: if the script fails to load (ad-blocker, offline, network
    // policy), surface a clear error instead of a silently dead button.
    setTimeout(() => {
      if (!gisReady) {
        el("login-status").textContent = t("login.gisBlocked");
      }
    }, 6000);
  }

  el("btn-login").addEventListener("click", () => {
    if (!gisReady) return;
    el("login-status").textContent = "";
    requestLogin();
  });

  el("btn-continue").addEventListener("click", () => {
    if (!gisReady) return;
    el("login-status").textContent = "";
    const remembered = readLastUser();
    requestSilentLogin(remembered && remembered.email);
  });

  el("btn-switch-account").addEventListener("click", () => {
    clearLastUser();
    hideRememberedLoginUI();
    el("login-status").textContent = "";
    requestLoginFresh();
  });
});

function renderUser(user) {
  const avatar = el("user-avatar");
  if (user && user.picture) {
    avatar.src = user.picture;
    avatar.alt = user.name || "";
    avatar.classList.remove("hidden");
  }
}

/* ---------------- Setup screen ---------------- */

function wireStaticEvents() {
  document.querySelectorAll("#setup-lang .seg-btn").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });
  document.querySelectorAll("#settings-lang .seg-btn").forEach(btn => {
    btn.addEventListener("click", () => setLang(btn.dataset.lang));
  });

  el("btn-setup-save").addEventListener("click", async () => {
    const monday = el("setup-monday").value;
    if (!isMondayISO(monday)) {
      el("setup-error").classList.remove("hidden");
      return;
    }
    el("setup-error").classList.add("hidden");
    el("btn-setup-save").textContent = t("setup.saving");

    settings = { language: currentLang, referenceMonday: monday };
    try {
      await saveSettingsToDrive(settings);
      writeLocalSettings(settings);
      enterMainApp();
    } catch (e) {
      console.error(e);
      alert(t("login.error"));
    } finally {
      el("btn-setup-save").textContent = t("setup.save");
    }
  });

  el("btn-lang-toggle").addEventListener("click", () => {
    setLang(currentLang === "en" ? "pl" : "en");
    if (settings) {
      settings.language = currentLang;
      writeLocalSettings(settings);
      saveSettingsToDrive(settings).catch(console.error);
    }
    refreshResult();
    renderCalendar();
  });

  el("date-input").addEventListener("change", (e) => {
    if (!e.target.value) return;
    selectedDate = new Date(e.target.value + "T00:00:00Z");
    calendarCursor = new Date(selectedDate);
    refreshResult();
    renderCalendar();
  });

  el("btn-go-calendar").addEventListener("click", () => goToCalendar());

  el("cal-prev").addEventListener("click", () => {
    calendarCursor.setUTCDate(1);
    calendarCursor.setUTCMonth(calendarCursor.getUTCMonth() - 1);
    renderCalendar();
  });
  el("cal-next").addEventListener("click", () => {
    calendarCursor.setUTCDate(1);
    calendarCursor.setUTCMonth(calendarCursor.getUTCMonth() + 1);
    renderCalendar();
  });

  el("btn-settings").addEventListener("click", () => openSettingsModal());
  el("btn-settings-cancel").addEventListener("click", () => el("modal-settings").classList.add("hidden"));
  el("btn-settings-save").addEventListener("click", async () => {
    const monday = el("settings-monday").value;
    if (!isMondayISO(monday)) {
      alert(t("setup.error"));
      return;
    }
    settings = { language: currentLang, referenceMonday: monday };
    try {
      await saveSettingsToDrive(settings);
      writeLocalSettings(settings);
      el("modal-settings").classList.add("hidden");
      refreshResult();
      renderCalendar();
    } catch (e) {
      console.error(e);
      alert(t("login.error"));
    }
  });
  el("btn-logout").addEventListener("click", () => {
    signOut();
    settings = null;
    el("modal-settings").classList.add("hidden");
    el("user-avatar").classList.add("hidden");
    hideRememberedLoginUI();
    showScreen("login");
    el("login-status").textContent = "";
  });
}

function openSettingsModal() {
  document.querySelectorAll("#settings-lang .seg-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
  el("settings-monday").value = settings ? settings.referenceMonday : "";
  el("modal-settings").classList.remove("hidden");
}

/* ---------------- Main app ---------------- */

function enterMainApp() {
  showScreen("main");
  selectedDate = toUTCDateOnly(new Date());
  calendarCursor = new Date(selectedDate);
  el("date-input").value = ymd(selectedDate);
  refreshResult();
  renderCalendar();
}

function refreshResult() {
  if (!settings) return;
  const { type, holiday } = evaluateDay(selectedDate, settings.referenceMonday);
  const badge = el("result-badge");
  const label = el("result-label");
  const detail = el("result-detail");

  badge.className = "result-badge " + (holiday ? "holiday" : type);

  if (holiday) {
    const name = (HOLIDAY_NAMES[currentLang] && HOLIDAY_NAMES[currentLang][holiday.key]) || holiday.key;
    label.textContent = `${t("result.holidayPrefix")} — ${name}`;
    detail.textContent = t("result.detailHoliday");
  } else if (type === "weekend") {
    label.textContent = t("result.weekend");
    detail.textContent = t("result.detailWeekend");
  } else {
    label.textContent = type === "office" ? t("result.office") : t("result.home");
    detail.textContent = t("result.detailWork");
  }
}

/* ---------------- Calendar export ---------------- */

function pad2(n) { return String(n).padStart(2, "0"); }

function toBasicDate(date) {
  const d = toUTCDateOnly(date);
  return `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}`;
}

// Known in-app browsers (Facebook, Instagram, Line, WeChat, etc.) and
// generic Android WebView signature ("; wv)"). These can't reliably hand
// off to native OS apps, so they get the Google Calendar web fallback.
function isInAppWebView() {
  const ua = navigator.userAgent || "";
  return /FBAN|FBAV|Instagram|Line\/|MicroMessenger|Twitter|; ?wv\)/i.test(ua);
}

function isMobileDevice() {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || "");
}

function currentEventTitle() {
  const { type, holiday } = evaluateDay(selectedDate, settings.referenceMonday);
  if (holiday) {
    const name = (HOLIDAY_NAMES[currentLang] && HOLIDAY_NAMES[currentLang][holiday.key]) || holiday.key;
    return `${t("result.holidayPrefix")} — ${name}`;
  }
  if (type === "weekend") return t("result.weekend");
  return type === "office" ? t("result.office") : t("result.home");
}

function escapeICSText(str) {
  return str.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;");
}

// Installed/standalone PWAs run without browser chrome. Navigating
// in-place to a data:text/calendar URI there just silently downloads the
// file instead of the OS offering "open with Calendar" the way a normal
// browser tab does. Opening it as a fresh navigation (new window/tab)
// makes the OS treat it as regular browser traffic again, which restores
// the calendar handoff.
function isStandalonePWA() {
  return (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
         window.navigator.standalone === true;
}

function openDataUri(dataUri) {
  if (isStandalonePWA()) {
    const a = document.createElement("a");
    a.href = dataUri;
    a.target = "_blank";
    a.rel = "noopener";
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else {
    window.location.href = dataUri;
  }
}

function goToCalendar() {
  const start = toUTCDateOnly(selectedDate);
  const end = addDaysUTC(start, 1); // exclusive end, per all-day event convention
  const title = currentEventTitle();

  if (isMobileDevice() && !isInAppWebView()) {
    // Native OS calendar (Apple Calendar, Samsung Calendar, etc.) via an
    // inline .ics — navigating to a data:text/calendar URI is the
    // standard cross-platform trick to hand an event off to whatever
    // calendar app is registered as default, without needing a backend.
    const now = new Date();
    const ics = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//Shift-checker//EN",
      "CALSCALE:GREGORIAN",
      "BEGIN:VEVENT",
      `UID:shift-checker-${toBasicDate(start)}@cloudplay.at`,
      `DTSTAMP:${toBasicDate(now)}T${pad2(now.getUTCHours())}${pad2(now.getUTCMinutes())}00Z`,
      `DTSTART;VALUE=DATE:${toBasicDate(start)}`,
      `DTEND;VALUE=DATE:${toBasicDate(end)}`,
      `SUMMARY:${escapeICSText(title)}`,
      "END:VEVENT",
      "END:VCALENDAR"
    ].join("\r\n");
    openDataUri("data:text/calendar;charset=utf8," + encodeURIComponent(ics));
  } else {
    // WebView / desktop: no reliable native handoff, so open Google
    // Calendar's web event-creation screen in a new tab/window instead.
    const gcalUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE" +
      `&text=${encodeURIComponent(title)}` +
      `&dates=${toBasicDate(start)}/${toBasicDate(end)}`;
    window.open(gcalUrl, "_blank", "noopener");
  }
}


const WEEKDAY_LABELS = {
  en: ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"],
  pl: ["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"]
};

const MONTH_LABELS = {
  en: ["January","February","March","April","May","June","July","August","September","October","November","December"],
  pl: ["Styczeń","Luty","Marzec","Kwiecień","Maj","Czerwiec","Lipiec","Sierpień","Wrzesień","Październik","Listopad","Grudzień"]
};

function renderCalendar() {
  if (!settings) return;
  const weekdaysEl = el("cal-weekdays");
  weekdaysEl.innerHTML = "";
  WEEKDAY_LABELS[currentLang].forEach(lbl => {
    const s = document.createElement("span");
    s.textContent = lbl;
    weekdaysEl.appendChild(s);
  });

  const y = calendarCursor.getFullYear();
  const m = calendarCursor.getMonth();
  el("cal-month-label").textContent = `${MONTH_LABELS[currentLang][m]} ${y}`;

  const firstOfMonth = new Date(Date.UTC(y, m, 1));
  const firstWeekday = firstOfMonth.getUTCDay(); // 0=Sun..6=Sat
  const leadingBlanks = firstWeekday === 0 ? 6 : firstWeekday - 1; // convert to Mon-first
  const daysInMonth = new Date(Date.UTC(y, m + 1, 0)).getUTCDate();

  const grid = el("cal-grid");
  grid.innerHTML = "";

  for (let i = 0; i < leadingBlanks; i++) {
    const blank = document.createElement("div");
    blank.className = "cal-cell empty";
    grid.appendChild(blank);
  }

  const today = toUTCDateOnly(new Date());
  const selIso = ymd(selectedDate);

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(Date.UTC(y, m, day));
    const { type, holiday } = evaluateDay(date, settings.referenceMonday);
    const cls = holiday ? "holiday" : type;

    const cell = document.createElement("div");
    cell.className = `cal-cell ${cls}`;
    if (sameUTCDate(date, today)) cell.classList.add("today");
    if (ymd(date) === selIso) cell.classList.add("selected");
    cell.textContent = String(day);
    cell.title = holiday
      ? ((HOLIDAY_NAMES[currentLang] && HOLIDAY_NAMES[currentLang][holiday.key]) || holiday.key)
      : "";
    cell.addEventListener("click", () => {
      selectedDate = date;
      el("date-input").value = ymd(date);
      refreshResult();
      renderCalendar();
    });
    grid.appendChild(cell);
  }
}
