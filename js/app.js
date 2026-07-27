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

window.addEventListener("DOMContentLoaded", () => {
  setLang("en");
  wireStaticEvents();

  initGoogleAuth(async (token, err) => {
    if (err || !token) {
      el("login-status").textContent = t("login.error");
      return;
    }
    el("login-status").textContent = t("login.loading");
    try {
      const [user, remoteSettings] = await Promise.all([
        fetchUserInfo(),
        loadSettingsFromDrive()
      ]);
      renderUser(user);

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
    } catch (e) {
      console.error(e);
      el("login-status").textContent = t("login.error");
    }
  });

  el("btn-login").addEventListener("click", () => {
    el("login-status").textContent = "";
    requestLogin();
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
