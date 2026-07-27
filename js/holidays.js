// All dates handled as UTC midnight to avoid timezone drift.

function easterSundayUTC(year) {
  // Anonymous Gregorian algorithm (Meeus/Jones/Butcher)
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31); // 3=March, 4=April
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function addDaysUTC(date, days) {
  const d = new Date(date.getTime());
  d.setUTCDate(d.getUTCDate() + days);
  return d;
}

function sameUTCDate(a, b) {
  return a.getUTCFullYear() === b.getUTCFullYear() &&
         a.getUTCMonth() === b.getUTCMonth() &&
         a.getUTCDate() === b.getUTCDate();
}

const _holidayCache = {};

function getPolishHolidays(year) {
  if (_holidayCache[year]) return _holidayCache[year];
  const easter = easterSundayUTC(year);
  const fixed = [
    [0, 1, "newYear"],
    [0, 6, "epiphany"],
    [4, 1, "laborDay"],
    [4, 3, "constitutionDay"],
    [7, 15, "assumption"],
    [10, 1, "allSaints"],
    [10, 11, "independenceDay"],
    [11, 25, "christmas1"],
    [11, 26, "christmas2"]
  ];
  const list = fixed.map(([m, d, key]) => ({ date: new Date(Date.UTC(year, m, d)), key }));
  list.push({ date: easter, key: "easterSunday" });
  list.push({ date: addDaysUTC(easter, 1), key: "easterMonday" });
  list.push({ date: addDaysUTC(easter, 49), key: "pentecost" });
  list.push({ date: addDaysUTC(easter, 60), key: "corpusChristi" });
  _holidayCache[year] = list;
  return list;
}

// date: JS Date at UTC midnight
function getHolidayForDate(date) {
  const list = getPolishHolidays(date.getUTCFullYear());
  return list.find(h => sameUTCDate(h.date, date)) || null;
}
