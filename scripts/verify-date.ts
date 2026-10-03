// Verifies the date helper used by every "today / this month" calculation.
import assert from 'node:assert';
import { localDateKey, localMonthKey, monthKeyOffset, dayKeyOffset } from '../src/utils/date';

let pass = 0, fail = 0;
const check = (n: string, ok: boolean, x = '') => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x ? ' -> ' + x : '')); } };

console.log('TZ = ' + (process.env.TZ || 'system') + ', offset=' + (-new Date().getTimezoneOffset() / 60) + 'h');

const now = new Date();
const local = localDateKey(now);
const utc = now.toISOString().slice(0, 10);
console.log('  localDateKey = ' + local + '   toISOString = ' + utc);

// The whole point: in a timezone east of UTC the UTC key can lag the local day.
check('localDateKey matches the real local calendar day',
  local === `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`,
  local);
console.log('  (UTC key would be ' + (local === utc ? 'identical — no bug window right now' : 'WRONG by a day — the old code misbucketed here') + ')');

// The specific failure: 00:30 local in Nepal is still the previous day in UTC.
const lateNight = new Date(2026, 8, 3, 0, 30, 0); // 2026-09-03 00:30 local
check('00:30 local resolves to the local day, not the UTC day',
  localDateKey(lateNight) === '2026-09-03',
  localDateKey(lateNight) + ' (UTC says ' + lateNight.toISOString().slice(0, 10) + ')');

// Month boundaries
check('first day of month', localDateKey(new Date(2026, 0, 1, 23, 59)) === '2026-01-01');
check('last day of month', localDateKey(new Date(2026, 1, 28, 0, 0)) === '2026-02-28');
check('localMonthKey', localMonthKey(new Date(2026, 8, 3)) === '2026-09');
check('single digit month is zero padded', localMonthKey(new Date(2026, 0, 15)) === '2026-01');

// Month arithmetic must not roll the year incorrectly
check('monthKeyOffset(1) from December', monthKeyOffset(1, new Date(2026, 11, 15)) === '2027-01', monthKeyOffset(1, new Date(2026, 11, 15)));
check('monthKeyOffset(-1) from January', monthKeyOffset(-1, new Date(2026, 0, 15)) === '2025-12', monthKeyOffset(-1, new Date(2026, 0, 15)));
check('monthKeyOffset(0) is this month', monthKeyOffset(0) === localMonthKey());

// Day arithmetic across a month boundary (a 7-day chart does this)
check('dayKeyOffset(-1) from 1 March', dayKeyOffset(-1, new Date(2026, 2, 1)) === '2026-02-28', dayKeyOffset(-1, new Date(2026, 2, 1)));
check('dayKeyOffset(-6) from 3 Sep', dayKeyOffset(-6, new Date(2026, 8, 3)) === '2026-08-28', dayKeyOffset(-6, new Date(2026, 8, 3)));
check('dayKeyOffset(0) is today', dayKeyOffset(0) === local);

// The 7-day window the dashboard chart builds
const keys: string[] = [];
for (let i = 0; i < 7; i++) keys.push(dayKeyOffset(-(6 - i), new Date(2026, 8, 3)));
check('7 day window is 7 distinct consecutive days ending today',
  new Set(keys).size === 7 && keys[6] === '2026-09-03' && keys[0] === '2026-08-28',
  keys.join(','));

// Guard against the exact regression: no key may contain a stray time part
check('all keys are plain YYYY-MM-DD', keys.every(k => /^\d{4}-\d{2}-\d{2}$/.test(k)));

console.log(`\n${pass} passed, ${fail} failed`);
assert(fail === 0, `${fail} date helper checks failed`);
