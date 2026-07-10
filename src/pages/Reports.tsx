import { useMemo } from 'react';
import { useStore } from '../contexts/store';
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import Card from '../components/ui/Card';
import { TrendingUp, TrendingDown, Users, ShoppingCart } from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

const Reports = () => {
  const { bills, customers, expenses, inventory } = useStore();

  const reportData = useMemo(() => {
    // Monthly revenue trend
    const monthlyData: Record<string, number> = {};
    bills.forEach(bill => {
      const month = bill.date.substring(0, 7);
      monthlyData[month] = (monthlyData[month] || 0) + bill.grandTotal;
    });

    const monthlyRevenue = Object.entries(monthlyData)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, revenue]) => ({
        month: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue,
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
      .map(([day, sales]) => ({
        day: parseInt(day),
        sales,
      }));

    // Top services
    const serviceMap: Record<string, number> = {};
    bills.forEach(b => {
      b.items.forEach(item => {
        serviceMap[item.name] = (serviceMap[item.name] || 0) + item.quantity;
      });
    });

    const topServices = Object.entries(serviceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    // Inventory valuation
    const inventoryValue = inventory.reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);
    const lowStockValue = inventory
      .filter(i => i.quantity < 10)
      .reduce((sum, item) => sum + (item.quantity * item.purchasePrice), 0);

    // Expense breakdown
    const expenseMap: Record<string, number> = {};
    expenses.forEach(e => {
      expenseMap[e.category] = (expenseMap[e.category] || 0) + e.amount;
    });

    const expenseBreakdown = Object.entries(expenseMap)
      .map(([category, amount]) => ({ name: category, value: amount }))
      .sort((a, b) => b.value - a.value);

    // Key metrics
    const totalRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const profit = totalRevenue - totalExpenses;
    const paidBills = bills.filter(b => b.status === 'Paid').length;
    const totalBills = bills.length;
    const conversionRate = totalBills > 0 ? (paidBills / totalBills) * 100 : 0;

    return {
      monthlyRevenue,
      dailySales,
      topServices,
      inventoryValue,
      lowStockValue,
      expenseBreakdown,
      totalRevenue,
      totalExpenses,
      profit,
      paidBills,
      totalBills,
      conversionRate,
    };
  }, [bills, customers, expenses, inventory]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-black tracking-tight">Reports & Analytics</h1>
        <p className="text-gray-500 mt-1">Comprehensive business insights and metrics</p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Revenue</div>
              <div className="text-3xl font-black mt-3 text-blue-600">NPR {reportData.totalRevenue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            </div>
            <TrendingUp className="w-8 h-8 text-blue-600 opacity-20" />
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Total Expenses</div>
              <div className="text-3xl font-black mt-3 text-red-600">NPR {reportData.totalExpenses.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
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
            </div>
            <ShoppingCart className={`w-8 h-8 opacity-20 ${reportData.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`} />
          </div>
        </Card>

        <Card>
          <div className="flex justify-between items-start">
            <div>
              <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Collection Rate</div>
              <div className="text-3xl font-black mt-3 text-orange-600">{reportData.conversionRate.toFixed(1)}%</div>
              <p className="text-xs text-gray-500 mt-2">{reportData.paidBills} of {reportData.totalBills} bills paid</p>
            </div>
            <Users className="w-8 h-8 text-orange-600 opacity-20" />
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold mb-6">Monthly Revenue Trend</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={reportData.monthlyRevenue}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  cursor={{stroke: '#3b82f6'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Line type="monotone" dataKey="revenue" stroke="#3b82f6" strokeWidth={3} dot={{fill: '#3b82f6', r: 5}} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-6">Daily Sales (Current Month)</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={reportData.dailySales}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="sales" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
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
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {reportData.topServices.map((service, index) => (
              <div key={service.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{service.name}</span>
              </div>
            ))}
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-6">Expense Breakdown</h3>
          <div className="space-y-4">
            {reportData.expenseBreakdown.length > 0 ? (
              reportData.expenseBreakdown.map((expense, index) => {
                const total = reportData.expenseBreakdown.reduce((sum, e) => sum + e.value, 0);
                const percentage = (expense.value / total) * 100;
                return (
                  <div key={expense.name}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">{expense.name}</span>
                      <span className="text-sm font-bold">NPR {expense.value.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: PIE_COLORS[index % PIE_COLORS.length]
                        }}
                      ></div>
                    </div>
                  </div>
                );
              })
            ) : (
              <p className="text-center text-gray-500 py-8">No expenses recorded</p>
            )}
          </div>
        </Card>
      </div>

      {/* Inventory Summary */}
      <Card>
        <h3 className="text-lg font-bold mb-6">Inventory Valuation</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 rounded-2xl p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Total Inventory Value</p>
            <p className="text-3xl font-black mt-3 text-blue-600">NPR {reportData.inventoryValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
          </div>
          <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 rounded-2xl p-6">
            <p className="text-sm font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">Low Stock Value</p>
            <p className="text-3xl font-black mt-3 text-orange-600">NPR {reportData.lowStockValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
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
