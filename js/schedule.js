// All calculations use UTC midnight Date objects so that browser timezone
// never shifts a date across a day boundary.

function toUTCDateOnly(dateLike) {
  const d = new Date(dateLike);
  return new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
}

// Monday (00:00 UTC) of the ISO week containing `date`.
function mondayOfWeek(date) {
  const d = toUTCDateOnly(date);
  const day = d.getUTCDay(); // 0 = Sunday ... 6 = Saturday
  const diff = (day === 0 ? -6 : 1 - day);
  d.setUTCDate(d.getUTCDate() + diff);
  return d;
}

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;
const OFFICE_DAYS_PATTERN_A = [1, 3, 5]; // Mon, Wed, Fri (getUTCDay values)

/**
 * @param {Date|string} dateLike date to evaluate
 * @param {Date|string} referenceMonday a Monday defined as "office pattern A"
 *        (Mon/Wed/Fri office, Tue/Thu home)
 * @returns {{ type: 'office'|'home'|'weekend', holiday: object|null }}
 */
function evaluateDay(dateLike, referenceMonday) {
  const date = toUTCDateOnly(dateLike);
  const holiday = getHolidayForDate(date);
  const dow = date.getUTCDay();

  if (dow === 0 || dow === 6) {
    return { type: "weekend", holiday };
  }

  const weekMonday = mondayOfWeek(date);
  const refMonday = mondayOfWeek(referenceMonday);
  const weeksDiff = Math.round((weekMonday.getTime() - refMonday.getTime()) / MS_PER_WEEK);
  const parity = ((weeksDiff % 2) + 2) % 2; // 0 = pattern A week, 1 = flipped week

  const isPatternADay = OFFICE_DAYS_PATTERN_A.includes(dow);
  const isOffice = parity === 0 ? isPatternADay : !isPatternADay;

  return { type: isOffice ? "office" : "home", holiday };
}
