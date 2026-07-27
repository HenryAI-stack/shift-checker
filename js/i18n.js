const I18N = {
  en: {
    "login.subtitle": "Know where you're working, before you get there.",
    "login.button": "Sign in with Google",
    "login.loading": "Signing in…",
    "login.error": "Sign-in failed. Please try again.",
    "login.gisBlocked": "Couldn't load Google Sign-In. Check your connection or ad-blocker, then reload.",
    "setup.title": "One-time setup",
    "setup.explain": "Pick any Monday that was (or will be) an office Monday — Mon / Wed / Fri in office, Tue / Thu at home. The rhythm flips every following week.",
    "setup.langLabel": "Language",
    "setup.mondayLabel": "Reference office Monday",
    "setup.error": "Please choose a Monday.",
    "setup.save": "Save & start",
    "setup.saving": "Saving…",
    "main.pickDate": "Check a date",
    "main.goToCalendar": "Go to Calendar",
    "main.settings": "Settings",
    "legend.office": "Office",
    "legend.home": "Home office",
    "legend.holiday": "Holiday (PL)",
    "legend.weekend": "Weekend",
    "settings.title": "Settings",
    "settings.cancel": "Cancel",
    "settings.save": "Save",
    "settings.logout": "Sign out",
    "result.office": "Office day",
    "result.home": "Home office",
    "result.weekend": "Weekend",
    "result.holidayPrefix": "Public holiday",
    "result.detailWork": "Working day, based on your reference Monday.",
    "result.detailWeekend": "No shift assigned — weekend.",
    "result.detailHoliday": "No shift assigned — public holiday in Poland."
  },
  pl: {
    "login.subtitle": "Wiedz, gdzie pracujesz, zanim tam dotrzesz.",
    "login.button": "Zaloguj się przez Google",
    "login.loading": "Logowanie…",
    "login.error": "Logowanie nie powiodło się. Spróbuj ponownie.",
    "login.gisBlocked": "Nie udało się załadować logowania Google. Sprawdź połączenie lub blokadę reklam i odśwież stronę.",
    "setup.title": "Konfiguracja początkowa",
    "setup.explain": "Wybierz dowolny poniedziałek, w którym praca odbywała się (lub odbędzie się) w biurze — pon / śr / pt biuro, wt / czw dom. Rytm zmienia się co tydzień.",
    "setup.langLabel": "Język",
    "setup.mondayLabel": "Referencyjny poniedziałek biurowy",
    "setup.error": "Wybierz poniedziałek.",
    "setup.save": "Zapisz i rozpocznij",
    "setup.saving": "Zapisywanie…",
    "main.pickDate": "Sprawdź datę",
    "main.goToCalendar": "Przejdź do kalendarza",
    "main.settings": "Ustawienia",
    "legend.office": "Biuro",
    "legend.home": "Praca zdalna",
    "legend.holiday": "Święto (PL)",
    "legend.weekend": "Weekend",
    "settings.title": "Ustawienia",
    "settings.cancel": "Anuluj",
    "settings.save": "Zapisz",
    "settings.logout": "Wyloguj się",
    "result.office": "Dzień w biurze",
    "result.home": "Praca zdalna",
    "result.weekend": "Weekend",
    "result.holidayPrefix": "Dzień świąteczny",
    "result.detailWork": "Dzień roboczy, wyliczony na podstawie referencyjnego poniedziałku.",
    "result.detailWeekend": "Brak przydziału — weekend.",
    "result.detailHoliday": "Brak przydziału — dzień ustawowo wolny w Polsce."
  }
};

const HOLIDAY_NAMES = {
  en: {
    newYear: "New Year's Day",
    epiphany: "Epiphany",
    easterSunday: "Easter Sunday",
    easterMonday: "Easter Monday",
    laborDay: "Labour Day",
    constitutionDay: "Constitution Day",
    pentecost: "Pentecost",
    corpusChristi: "Corpus Christi",
    assumption: "Assumption of Mary",
    allSaints: "All Saints' Day",
    independenceDay: "Independence Day",
    christmas1: "Christmas Day",
    christmas2: "St. Stephen's Day"
  },
  pl: {
    newYear: "Nowy Rok",
    epiphany: "Trzech Króli",
    easterSunday: "Wielkanoc",
    easterMonday: "Poniedziałek Wielkanocny",
    laborDay: "Święto Pracy",
    constitutionDay: "Święto Konstytucji 3 Maja",
    pentecost: "Zielone Świątki",
    corpusChristi: "Boże Ciało",
    assumption: "Wniebowzięcie NMP",
    allSaints: "Wszystkich Świętych",
    independenceDay: "Święto Niepodległości",
    christmas1: "Boże Narodzenie",
    christmas2: "Drugi dzień Bożego Narodzenia"
  }
};

let currentLang = "en";

function t(key) {
  return (I18N[currentLang] && I18N[currentLang][key]) || I18N.en[key] || key;
}

function setLang(lang) {
  currentLang = (lang === "pl") ? "pl" : "en";
  document.documentElement.lang = currentLang;
  document.querySelectorAll("[data-i18n]").forEach(el => {
    el.textContent = t(el.getAttribute("data-i18n"));
  });
  document.querySelectorAll("[data-i18n-title]").forEach(el => {
    el.title = t(el.getAttribute("data-i18n-title"));
  });
  const toggle = document.getElementById("btn-lang-toggle");
  if (toggle) toggle.textContent = currentLang.toUpperCase();
  document.querySelectorAll(".seg-btn").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.lang === currentLang);
  });
}
