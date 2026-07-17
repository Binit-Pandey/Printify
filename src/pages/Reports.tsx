import { useMemo, useState } from 'react';
import { useStore } from '../contexts/store';
import { useTheme } from '../contexts/ThemeContext';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import Card from '../components/ui/Card';
import {
  TrendingUp, TrendingDown, Users, ShoppingCart,
  Download, Calendar, ArrowUpRight, ArrowDownRight
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'];

type DateFilter = 'all' | 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom';

const Reports = () => {
  const { bills, expenses, inventory } = useStore();
  const { dark } = useTheme();
  const [dateFilter, setDateFilter] = useState<DateFilter>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const dateRange = useMemo(() => {
    const now = new Date();
    const today = now.toISOString().split('T')[0];
    switch (dateFilter) {
      case 'today':
        return { start: today, end: today };
      case 'thisWeek': {
        const day = now.getDay();
        const start = new Date(now);
        start.setDate(now.getDate() - day);
        return { start: start.toISOString().split('T')[0], end: today };
      }
      case 'thisMonth':
        return { start: today.substring(0, 7) + '-01', end: today };
      case 'thisYear':
        return { start: today.substring(0, 4) + '-01-01', end: today };
      case 'custom':
        return { start: customStart || '2000-01-01', end: customEnd || '2099-12-31' };
      default:
        return { start: '2000-01-01', end: '2099-12-31' };
    }
  }, [dateFilter, customStart, customEnd]);

  const filteredBills = useMemo(() => {
    return bills.filter(b => b.date >= dateRange.start && b.date <= dateRange.end);
  }, [bills, dateRange]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(e => e.date >= dateRange.start && e.date <= dateRange.end);
  }, [expenses, dateRange]);

  const reportData = useMemo(() => {
    // Monthly revenue trend (last 12 months)
    const monthlyRevData: Record<string, number> = {};
    const monthlyExpData: Record<string, number> = {};
    bills.forEach(bill => {
      const month = bill.date.substring(0, 7);
      monthlyRevData[month] = (monthlyRevData[month] || 0) + bill.grandTotal;
    });
    expenses.forEach(exp => {
      const month = exp.date.substring(0, 7);
      monthlyExpData[month] = (monthlyExpData[month] || 0) + exp.amount;
    });

    const allMonths = [...new Set([...Object.keys(monthlyRevData), ...Object.keys(monthlyExpData)])].sort();
    const profitOverTime = allMonths.slice(-12).map(month => ({
      month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      revenue: monthlyRevData[month] || 0,
      expenses: monthlyExpData[month] || 0,
      profit: (monthlyRevData[month] || 0) - (monthlyExpData[month] || 0),
    }));

    // Daily sales for current month
    const currentMonth = new Date().toISOString().slice(0, 7);
    const dailyData: Record<string, number> = {};
    bills
      .filter(b => b.date.startsWith(currentMonth))
      .forEach(bill => {
        const day = bill.date.substring(8);
        dailyData[day] = (dailyData[day] || 0) + bill.grandTotal;
      });
    const dailySales = Object.entries(dailyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([day, sales]) => ({ day: parseInt(day), sales }));

    // Top services
    const serviceMap: Record<string, { count: number; revenue: number }> = {};
    filteredBills.forEach(b => {
      b.items.forEach(item => {
        if (!serviceMap[item.name]) serviceMap[item.name] = { count: 0, revenue: 0 };
        serviceMap[item.name].count += item.quantity;
        serviceMap[item.name].revenue += item.quantity * item.unitPrice;
      });
    });
    const topServices = Object.entries(serviceMap)
      .map(([name, data]) => ({ name, value: data.count, revenue: data.revenue }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Customer-wise sales
    const customerSales: Record<string, { name: string; total: number; billCount: number; paid: number; pending: number }> = {};
    filteredBills.forEach(b => {
      const key = b.customer.id;
      if (!customerSales[key]) customerSales[key] = { name: b.customer.name, total: 0, billCount: 0, paid: 0, pending: 0 };
      customerSales[key].total += b.grandTotal;
      customerSales[key].billCount += 1;
      if (b.status === 'Paid') customerSales[key].paid += b.grandTotal;
      else customerSales[key].pending += b.grandTotal;
    });
    const customerSalesList = Object.values(customerSales)
      .sort((a, b) => b.total - a.total);

    // Expense breakdown
    const expenseMap: Record<string, number> = {};
    filteredExpenses.forEach(e => {
      expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
    });
    const expenseBreakdown = Object.entries(expenseMap)
      .map(([category, amount]) => ({ name: category, value: amount }))
      .sort((a, b) => b.value - a.value);

    // Inventory valuation
    const inventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    const lowStockValue = inventory.filter(i => i.quantity < 10).reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);

    // Key metrics (filtered)
    const totalRevenue = filteredBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalExpenses = filteredExpenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalExpenses;
    const paidBills = filteredBills.filter(b => b.status === 'Paid').length;
    const totalBills = filteredBills.length;
    const collectionRate = totalBills > 0 ? (paidBills / totalBills) * 100 : 0;

    // Monthly comparison
    const thisMonth = new Date().toISOString().slice(0, 7);
    const lastMonthDate = new Date();
    lastMonthDate.setMonth(lastMonthDate.getMonth() - 1);
    const lastMonth = lastMonthDate.toISOString().slice(0, 7);

    const thisMonthRevenue = bills.filter(b => b.date.startsWith(thisMonth)).reduce((s, b) => s + b.grandTotal, 0);
    const lastMonthRevenue = bills.filter(b => b.date.startsWith(lastMonth)).reduce((s, b) => s + b.grandTotal, 0);
    const thisMonthExpenses = expenses.filter(e => e.date.startsWith(thisMonth)).reduce((s, e) => s + e.amount, 0);
    const lastMonthExpenses = expenses.filter(e => e.date.startsWith(lastMonth)).reduce((s, e) => s + e.amount, 0);

    const revenueChange = lastMonthRevenue > 0 ? ((thisMonthRevenue - lastMonthRevenue) / lastMonthRevenue) * 100 : 0;
    const expenseChange = lastMonthExpenses > 0 ? ((thisMonthExpenses - lastMonthExpenses) / lastMonthExpenses) * 100 : 0;

    return {
      profitOverTime, dailySales, topServices, customerSalesList,
      inventoryValue, lowStockValue, expenseBreakdown,
      totalRevenue, totalExpenses, profit, paidBills, totalBills, collectionRate,
      thisMonthRevenue, lastMonthRevenue, thisMonthExpenses, lastMonthExpenses,
      revenueChange, expenseChange,
    };
  }, [bills, expenses, inventory, filteredBills, filteredExpenses]);

  const exportCSV = () => {
    const rows = [
      ['Metric', 'Value'],
      ['Total Revenue', `NPR ${reportData.totalRevenue.toLocaleString()}`],
      ['Total Expenses', `NPR ${reportData.totalExpenses.toLocaleString()}`],
      ['Net Profit', `NPR ${reportData.profit.toLocaleString()}`],
      ['Collection Rate', `${reportData.collectionRate.toFixed(1)}%`],
      ['Total Bills', `${reportData.totalBills}`],
      ['Paid Bills', `${reportData.paidBills}`],
      [],
      ['Customer Sales'],
      ['Customer', 'Total', 'Bills', 'Paid', 'Pending'],
      ...reportData.customerSalesList.map(c => [c.name, c.total, c.billCount, c.paid, c.pending]),
      [],
      ['Expense Breakdown'],
      ['Category', 'Amount'],
      ...reportData.expenseBreakdown.map(e => [e.name, e.value]),
    ];
    const csv = rows.map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tight">Reports & Analytics</h1>
          <p className="text-gray-500 mt-1">Comprehensive business insights and metrics</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-1">
            {(['all', 'today', 'thisWeek', 'thisMonth', 'thisYear', 'custom'] as DateFilter[]).map(f => (
              <button
                key={f}
                onClick={() => setDateFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                  dateFilter === f
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {f === 'all' ? 'All Time' : f === 'thisWeek' ? 'This Week' : f === 'thisMonth' ? 'This Month' : f === 'thisYear' ? 'This Year' : f === 'today' ? 'Today' : 'Custom'}
              </button>
            ))}
          </div>
          {dateFilter === 'custom' && (
            <div className="flex items-center gap-2">
              <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
              <span className="text-gray-400">to</span>
              <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)}
                className="px-3 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm outline-none" />
            </div>
          )}
          <button onClick={exportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <Download className="w-4 h-4" /> Export CSV
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Revenue</div>
              <div className="text-3xl font-black mt-3 text-blue-600">NPR {reportData.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="flex items-center gap-1 mt-2">
                {reportData.revenueChange >= 0 ? <ArrowUpRight className="w-4 h-4 text-emerald-500" /> : <ArrowDownRight className="w-4 h-4 text-red-500" />}
                <span className={`text-xs font-bold ${reportData.revenueChange >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {Math.abs(reportData.revenueChange).toFixed(1)}% vs last month
                </span>
              </div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Expenses</div>
              <div className="text-3xl font-black mt-3 text-red-600">NPR {reportData.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
              <div className="flex items-center gap-1 mt-2">
                {reportData.expenseChange <= 0 ? <ArrowDownRight className="w-4 h-4 text-emerald-500" /> : <ArrowUpRight className="w-4 h-4 text-red-500" />}
                <span className={`text-xs font-bold ${reportData.expenseChange <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                  {Math.abs(reportData.expenseChange).toFixed(1)}% vs last month
                </span>
              </div>
            </div>
            <TrendingDown className="w-8 h-8 text-red-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Net Profit</div>
              <div className={`text-3xl font-black mt-3 ${reportData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                NPR {reportData.profit.toLocaleString(undefined, { maximumFractionDigits: 0 })}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Margin: {reportData.totalRevenue > 0 ? ((reportData.profit / reportData.totalRevenue) * 100).toFixed(1) : 0}%
              </p>
            </div>
            <ShoppingCart className={`w-8 h-8 opacity-20 ${reportData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Collection Rate</div>
              <div className="text-3xl font-black mt-3 text-orange-600">{reportData.collectionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-2">{reportData.paidBills} of {reportData.totalBills} bills paid</p>
            </div>
            <Users className="w-8 h-8 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Monthly Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold">Revenue Comparison</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase text-blue-600">This Month</p>
              <p className="text-2xl font-black mt-1 text-blue-600">NPR {reportData.thisMonthRevenue.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Last Month</p>
              <p className="text-2xl font-black mt-1">NPR {reportData.lastMonthRevenue.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-red-600" />
            <h3 className="text-lg font-bold">Expense Comparison</h3>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-red-50 dark:bg-red-900/20 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase text-red-600">This Month</p>
              <p className="text-2xl font-black mt-1 text-red-600">NPR {reportData.thisMonthExpenses.toLocaleString()}</p>
            </div>
            <div className="bg-gray-50 dark:bg-gray-800 rounded-2xl p-4">
              <p className="text-xs font-bold uppercase text-gray-500">Last Month</p>
              <p className="text-2xl font-black mt-1">NPR {reportData.lastMonthExpenses.toLocaleString()}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Profit Over Time Chart */}
      <Card>
        <h3 className="text-lg font-bold mb-6">Profit Analysis (Revenue vs Expenses)</h3>
        <div className="h-96">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={reportData.profitOverTime}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
              <Tooltip
                cursor={{stroke: '#3b82f6'}}
                contentStyle={{borderRadius: '16px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: dark ? '#1e293b' : '#ffffff', color: dark ? '#f1f5f9' : '#0f172a'}}
                formatter={(value: number, name: string) => [`NPR ${value.toLocaleString()}`, name.charAt(0).toUpperCase() + name.slice(1)]}
              />
              <Legend />
              <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{fill: '#3b82f6', r: 4}} name="Revenue" />
              <Line type="monotone" dataKey="expenses" stroke="#ef4444" strokeWidth={3} dot={{fill: '#ef4444', r: 4}} name="Expenses" />
              <Line type="monotone" dataKey="profit" stroke="#10b981" strokeWidth={3} dot={{fill: '#10b981', r: 4}} name="Profit" strokeDasharray="5 5" />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold mb-6">Monthly Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.profitOverTime}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip
                  cursor={{fill: dark ? '#1e293b' : '#f3f4f6'}}
                  contentStyle={{borderRadius: '16px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: dark ? '#1e293b' : '#ffffff', color: dark ? '#f1f5f9' : '#0f172a'}}
                  formatter={(value: number) => [`NPR ${value.toLocaleString()}`, 'Revenue']}
                />
                <Bar dataKey="revenue" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-6">Top Selling Services</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.topServices}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {reportData.topServices.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{borderRadius: '16px', border: `1px solid ${dark ? '#334155' : '#e2e8f0'}`, boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', backgroundColor: dark ? '#1e293b' : '#ffffff', color: dark ? '#f1f5f9' : '#0f172a'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {reportData.topServices.map((service, index) => (
              <div key={service.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{service.name}</span>
                <span className="text-xs text-gray-400 ml-auto">{service.value} qty</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Expense Breakdown */}
      <Card>
        <h3 className="text-lg font-bold mb-6">Expense Breakdown</h3>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={reportData.expenseBreakdown}
                  cx="50%" cy="50%" outerRadius={100}
                  paddingAngle={3}
                  dataKey="value"
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                >
                  {reportData.expenseBreakdown.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`NPR ${value.toLocaleString()}`, 'Amount']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="space-y-4">
            {reportData.expenseBreakdown.length > 0 ? (
              reportData.expenseBreakdown.map((expense, index) => {
                const total = reportData.expenseBreakdown.reduce((sum, e) => sum + e.value, 0);
                const percentage = total > 0 ? (expense.value / total) * 100 : 0;
                return (
                  <div key={expense.name}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                        <span className="text-sm font-medium">{expense.name}</span>
                      </div>
                      <span className="text-sm font-bold">NPR {expense.value.toLocaleString()} <span className="text-gray-400 font-normal">({percentage.toFixed(1)}%)</span></span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${percentage}%`, backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-8">No expenses recorded</p>
            )}
          </div>
        </div>
      </Card>

      {/* Customer Sales Table */}
      <Card>
        <h3 className="text-lg font-bold mb-6">Customer-wise Sales</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b dark:border-gray-800 text-left text-sm text-gray-500">
                <th className="pb-4 font-medium">Customer</th>
                <th className="pb-4 font-medium text-right">Total Sales</th>
                <th className="pb-4 font-medium text-center">Bills</th>
                <th className="pb-4 font-medium text-right">Paid</th>
                <th className="pb-4 font-medium text-right">Pending</th>
              </tr>
            </thead>
            <tbody className="divide-y dark:divide-gray-800">
              {reportData.customerSalesList.length > 0 ? (
                reportData.customerSalesList.map(customer => (
                  <tr key={customer.name} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                    <td className="py-4 font-bold">{customer.name}</td>
                    <td className="py-4 text-right font-semibold text-blue-600">NPR {customer.total.toLocaleString()}</td>
                    <td className="py-4 text-center">{customer.billCount}</td>
                    <td className="py-4 text-right text-emerald-600">NPR {customer.paid.toLocaleString()}</td>
                    <td className="py-4 text-right text-orange-600">NPR {customer.pending.toLocaleString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-gray-500">No sales data available.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Inventory Summary */}
      <Card>
        <h3 className="text-lg font-bold mb-6">Inventory Valuation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Inventory Value</p>
            <p className="text-3xl font-black mt-3 text-blue-600">NPR {reportData.inventoryValue.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Low Stock Value</p>
            <p className="text-3xl font-black mt-3 text-orange-600">NPR {reportData.lowStockValue.toLocaleString()}</p>
          </div>
          <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 rounded-2xl p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Total Items</p>
            <p className="text-3xl font-black mt-3 text-emerald-600">{inventory.length}</p>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Reports;
