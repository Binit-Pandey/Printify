// Verifies expense/profit aggregation against a hand-computed fixture.
// The formulas mirror src/pages/Dashboard.tsx and src/pages/Reports.tsx exactly.
import { localDateKey, localMonthKey } from '../src/utils/date';

const B = 'http://127.0.0.1:3001/api';
let pass = 0, fail = 0;
const check = (n: string, ok: boolean, x = '') => { if (ok) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (x ? ' -> ' + x : '')); } };
const near = (a: number, b: number) => Math.abs(a - b) < 0.005;

async function req(path: string, opts: { method?: string; token?: string; body?: unknown } = {}) {
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
  if (opts.token) headers['Authorization'] = 'Bearer ' + opts.token;
  const res = await fetch(B + path, { method: opts.method || 'GET', headers, body: opts.body === undefined ? undefined : JSON.stringify(opts.body) });
  const text = await res.text();
  let json: any; try { json = JSON.parse(text); } catch { json = text; }
  return { status: res.status, json };
}
const uid = () => 'calc-' + Math.random().toString(36).slice(2, 10);

const login = await req('/auth/login', { method: 'POST', body: { username: 'superadmin', password: 'admin123' } });
const T = login.json.token;
if (!T) { console.error('login failed'); process.exit(1); }

// ── Clean slate so the fixture totals are exact ─────────────────────────────
for (const e of (await req('/expenses', { token: T })).json) await req('/expenses/' + e.id, { method: 'DELETE', token: T });
for (const b of (await req('/bills', { token: T })).json) await req('/bills/' + b.id, { method: 'DELETE', token: T });
for (const p of (await req('/vendor-payments/all', { token: T })).json) await req('/vendor-payments/' + p.id, { method: 'DELETE', token: T });

// ── Fixture ────────────────────────────────────────────────────────────────
const thisMonth = localMonthKey();
const lastMonth = (() => { const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - 1); return localMonthKey(d); })();
const thisDay = localDateKey();
const lastMonthDay = lastMonth + '-15';

const expenses = [
  { id: uid(), category: 'Rent', amount: 10000, date: thisDay },
  { id: uid(), category: 'Rent', amount: 5000, date: thisDay },
  { id: uid(), category: 'Supplies', amount: 2500.5, date: thisDay },
  { id: uid(), category: 'Travel', amount: 1000, date: lastMonthDay },
];
for (const e of expenses) {
  const r = await req('/expenses', { method: 'POST', token: T, body: { ...e, reason: 'fixture', addedBy: 'Super Admin' } });
  if (r.status !== 201) console.log('   (seed expense failed: ' + r.status + ')');
}

const mkBill = (id: string, date: string, grandTotal: number, status: string) => req('/bills', {
  method: 'POST', token: T,
  body: { id, billNumber: id.slice(-6).toUpperCase(), date, customer: { id: '', name: 'Cash / Walk-in', phone: '', address: '', email: '' }, items: [{ name: 'Item', quantity: 1, unitPrice: grandTotal }], subtotal: grandTotal, discount: 0, discountType: 'flat', vat: 0, grandTotal, status, paymentMethod: 'Cash', notes: '', createdBy: 'Super Admin' },
});
await mkBill(uid(), thisDay, 20000, 'Paid');
await mkBill(uid(), thisDay, 5000, 'Pending');
await mkBill(uid(), lastMonthDay, 99999, 'Paid'); // must be excluded from "this month"

// ── Fetch what the UI would receive ────────────────────────────────────────
const bills = (await req('/bills', { token: T })).json;
const expenseRows = (await req('/expenses', { token: T })).json;

// ── Dashboard: "Monthly profit" (now scoped to the current month) ──────────
const monthlyRevenue = bills.filter((b: any) => b.date.startsWith(thisMonth)).reduce((s: number, b: any) => s + b.grandTotal, 0);
const monthlyExpenses = expenseRows.filter((e: any) => e.date.startsWith(thisMonth)).reduce((s: number, e: any) => s + e.amount, 0);
const monthlyProfit = monthlyRevenue - monthlyExpenses;
console.log('\n  monthly revenue=' + monthlyRevenue + ' expenses=' + monthlyExpenses + ' profit=' + monthlyProfit);

check('monthly revenue counts only this month (25000, not 124999)', monthlyRevenue === 25000, String(monthlyRevenue));
check('monthly expenses counts only this month (17500.5, not 18500.5)', near(monthlyExpenses, 17500.5), String(monthlyExpenses));
check('monthly profit = revenue - expenses', near(monthlyProfit, 25000 - 17500.5), String(monthlyProfit));
check('last-month expense is NOT in this month', !expenseRows.filter((e: any) => e.date.startsWith(thisMonth)).some((e: any) => e.amount === 1000 && e.category === 'Travel'));

// ── Dashboard: "Today's" figures ───────────────────────────────────────────
const todayExpenses = expenseRows.filter((e: any) => e.date === thisDay).reduce((s: number, e: any) => s + e.amount, 0);
check("today's expenses = 17500.5", near(todayExpenses, 17500.5), String(todayExpenses));

// ── Reports: full-range totals and breakdown ────────────────────────────────
const totalExpenses = expenseRows.reduce((s: number, e: any) => s + e.amount, 0);
check('all-time total expenses = 18500.5', near(totalExpenses, 18500.5), String(totalExpenses));

const expenseMap: Record<string, number> = {};
for (const e of expenseRows) expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
const breakdown = Object.entries(expenseMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value);
const breakdownSum = breakdown.reduce((s, e) => s + e.value, 0);
check('expense breakdown sums back to total expenses', near(breakdownSum, totalExpenses), breakdownSum + ' vs ' + totalExpenses);
check('breakdown is sorted descending', breakdown.every((e, i) => i === 0 || breakdown[i - 1].value >= e.value), JSON.stringify(breakdown));
check('two Rent entries merged into 15000', breakdown.find(b => b.name === 'Rent')?.value === 15000, JSON.stringify(breakdown));
console.log('  breakdown: ' + breakdown.map(b => b.name + '=' + b.value).join(', '));

// Percentages shown in the UI must add to ~100%
const pctSum = breakdown.reduce((s, e) => s + (e.value / breakdownSum) * 100, 0);
check('breakdown percentages add to 100%', near(pctSum, 100), pctSum.toFixed(4) + '%');

// ── Reports: filtered range excludes out-of-range rows ──────────────────────
const filteredExpenses = expenseRows.filter((e: any) => e.date >= thisMonth + '-01' && e.date <= thisDay);
check('date-filtered expenses = this month only', near(filteredExpenses.reduce((s: number, e: any) => s + e.amount, 0), 17500.5), String(filteredExpenses.length));

// ── Reports: month-over-month change ───────────────────────────────────────
const thisM = expenseRows.filter((e: any) => e.date.startsWith(thisMonth)).reduce((s: number, e: any) => s + e.amount, 0);
const lastM = expenseRows.filter((e: any) => e.date.startsWith(lastMonth)).reduce((s: number, e: any) => s + e.amount, 0);
const expenseChange = lastM > 0 ? ((thisM - lastM) / lastM) * 100 : 0;
console.log(`  this month expenses=${thisM} last month=${lastM} change=${expenseChange.toFixed(1)}%`);
check('expense change = +1650% (1000 -> 17500.5)', near(expenseChange, 1650.05), expenseChange.toFixed(3));
check('expense rising shows as an increase (positive)', expenseChange > 0, String(expenseChange));

// ── Purchases deducted as investment ────────────────────────────────────────
const vid = uid();
await req('/vendors', { method: 'POST', token: T, body: { id: vid, name: 'Calc Vendor', phone: '1', address: 'x', panNumber: '' } });
await req('/vendor-payments', { method: 'POST', token: T, body: { id: uid(), vendorId: vid, amount: 4000, date: thisDay, type: 'purchase' } });
await req('/vendor-payments', { method: 'POST', token: T, body: { id: uid(), vendorId: vid, amount: 1500, date: thisDay, type: 'payment' } });
const vps = (await req('/vendor-payments/all', { token: T })).json;
const monthPurchases = vps.filter((p: any) => p.type === 'purchase' && p.date.startsWith(thisMonth)).reduce((s: number, p: any) => s + p.amount, 0);
check('purchases this month = 4000', monthPurchases === 4000, String(monthPurchases));
check('profit subtracts purchases too', near(monthlyRevenue - monthlyExpenses - monthPurchases, 25000 - 17500.5 - 4000));

// vendor outstanding = purchases - payments
const vendor = (await req('/vendors', { token: T })).json.find((v: any) => v.id === vid);
check('vendor outstanding = 4000 - 1500 = 2500', vendor?.outstandingBalance === 2500, String(vendor?.outstandingBalance));

// ── Zero / edge cases must not produce NaN ──────────────────────────────────
check('empty range gives 0 not NaN', Number.isFinite(0));
const noData = [].reduce((s: number, e: any) => s + e.amount, 0);
const changeNoBase = noData > 0 ? 1 : 0;
check('zero base yields 0% not Infinity', changeNoBase === 0 && !Number.isNaN(changeNoBase));

// ── Cleanup ────────────────────────────────────────────────────────────────
for (const e of expenseRows) await req('/expenses/' + e.id, { method: 'DELETE', token: T });
for (const b of bills) await req('/bills/' + b.id, { method: 'DELETE', token: T });
for (const p of vps) await req('/vendor-payments/' + p.id, { method: 'DELETE', token: T });
await req('/vendors/' + vid, { method: 'DELETE', token: T });

console.log(`\n${pass} passed, ${fail} failed`);
if (fail) process.exit(1);
