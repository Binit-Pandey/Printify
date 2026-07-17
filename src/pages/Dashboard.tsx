import { useAuth } from '../contexts/AuthContext';
import { useStore } from '../contexts/store';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import Card from '../components/ui/Card';
import { useMemo } from 'react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

const Dashboard = () => {
  const { user } = useAuth();
  const { bills, customers, expenses } = useStore();

  const metrics = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayBills = bills.filter(b => b.date === today);
    const todaySales = todayBills.reduce((sum, b) => sum + b.grandTotal, 0);
    const todayExpenses = expenses.filter(e => e.date === today).reduce((sum, e) => sum + e.amount, 0);
    
    const monthlyRevenue = bills.reduce((sum, b) => sum + b.grandTotal, 0);
    const pendingBills = bills.filter(b => b.status === 'Pending').length;

    return {
      todaySales,
      todayBillsCount: todayBills.length,
      todayExpenses,
      monthlyRevenue,
      activeCustomers: customers.length,
      pendingBills
    };
  }, [bills, customers, expenses]);

  const chartData = useMemo(() => {
    // Group bills by day for the last 7 days
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - (6 - i));
      return {
        name: days[d.getDay()],
        date: d.toISOString().split('T')[0],
        sales: 0
      };
    });

    last7Days.forEach(day => {
      day.sales = bills
        .filter(b => b.date === day.date)
        .reduce((sum, b) => sum + b.grandTotal, 0);
    });

    // Top services from bill items
    const serviceMap: Record<string, number> = {};
    bills.forEach(b => {
      b.items.forEach(item => {
        serviceMap[item.name] = (serviceMap[item.name] || 0) + item.quantity;
      });
    });

    const topServices = Object.entries(serviceMap)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    return { last7Days, topServices };
  }, [bills]);

  if (user?.role === 'staff') {
    return (
      <div className="space-y-8">
        <div>
          <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Staff Dashboard</h1>
          <p className="text-slate-600 dark:text-slate-400 mt-2">Welcome back, <span className="text-blue-600 dark:text-blue-400 font-medium">{user.name}</span></p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-transparent border-l-4 border-blue-600">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Today's Sales</div>
            <div className="text-4xl font-bold mt-3 text-blue-600 dark:text-blue-400">NPR {metrics.todaySales.toLocaleString()}</div>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950/20 to-transparent border-l-4 border-emerald-500">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Today's Bills</div>
            <div className="text-4xl font-bold mt-3 text-emerald-500 dark:text-emerald-400">{metrics.todayBillsCount}</div>
          </Card>
          <Card className="bg-gradient-to-br from-orange-50 dark:from-orange-950/20 to-transparent border-l-4 border-orange-500">
            <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Today's Expenses</div>
            <div className="text-4xl font-bold mt-3 text-orange-500 dark:text-orange-400">NPR {metrics.todayExpenses.toLocaleString()}</div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-50">Recent Bills</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-slate-600 dark:text-slate-400 border-b border-slate-200 dark:border-slate-800">
                  <th className="pb-4 font-semibold">Bill No</th>
                  <th className="pb-4 font-semibold">Customer</th>
                  <th className="pb-4 font-semibold text-right">Amount</th>
                  <th className="pb-4 font-semibold text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {bills.slice(-5).reverse().map(bill => (
                  <tr key={bill.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-4 font-mono font-semibold text-blue-600 dark:text-blue-400">{bill.billNumber}</td>
                    <td className="py-4 text-slate-900 dark:text-slate-50">{bill.customer.name}</td>
                    <td className="py-4 text-right font-semibold text-slate-900 dark:text-slate-50">NPR {bill.grandTotal.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <span className={`px-3 py-1 rounded-md text-xs font-semibold ${bill.status === 'Paid' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-orange-100 dark:bg-orange-950 text-orange-700 dark:text-orange-300'}`}>
                        {bill.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-4xl font-bold text-slate-900 dark:text-slate-50">Dashboard</h1>
        <p className="text-slate-600 dark:text-slate-400 mt-2">Real-time overview of your printing press</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-blue-50 dark:from-blue-950/20 to-transparent border-l-4 border-blue-600">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Daily Sales</div>
          <div className="text-3xl font-bold mt-3 text-blue-600 dark:text-blue-400">NPR {metrics.todaySales.toLocaleString()}</div>
        </Card>
        <Card className="bg-gradient-to-br from-emerald-50 dark:from-emerald-950/20 to-transparent border-l-4 border-emerald-500">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Monthly Revenue</div>
          <div className="text-3xl font-bold mt-3 text-emerald-500 dark:text-emerald-400">NPR {metrics.monthlyRevenue.toLocaleString()}</div>
        </Card>
        <Card className="bg-gradient-to-br from-orange-50 dark:from-orange-950/20 to-transparent border-l-4 border-orange-500">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Active Customers</div>
          <div className="text-3xl font-bold mt-3 text-orange-500 dark:text-orange-400">{metrics.activeCustomers}</div>
        </Card>
        <Card className="bg-gradient-to-br from-red-50 dark:from-red-950/20 to-transparent border-l-4 border-red-500">
          <div className="text-sm font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-400">Pending Bills</div>
          <div className="text-3xl font-bold mt-3 text-red-500 dark:text-red-400">{metrics.pendingBills}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-50">Weekly Sales Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f1f5f9'}}
                  contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f1722'}}
                />
                <Bar dataKey="sales" fill="#2563eb" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h3 className="text-lg font-bold mb-6 text-slate-900 dark:text-slate-50">Top Selling Services</h3>
          <div className="h-80 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData.topServices}
                  cx="50%" cy="50%" innerRadius={70} outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {chartData.topServices.map((_, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{borderRadius: '8px', border: '1px solid #e2e8f0', backgroundColor: '#ffffff', color: '#0f1722'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {chartData.topServices.map((service, index) => (
              <div key={service.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                <span className="text-xs font-medium text-slate-600 dark:text-slate-400 truncate">{service.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
