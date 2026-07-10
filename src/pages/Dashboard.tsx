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
          <h1 className="text-3xl font-black tracking-tight text-gray-900 dark:text-white">Staff Dashboard</h1>
          <p className="text-gray-500">Welcome back, {user.name}</p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Today's Sales</div>
            <div className="text-4xl font-black mt-2 text-blue-600">NPR {metrics.todaySales.toLocaleString()}</div>
          </Card>
          <Card>
            <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Today's Bills</div>
            <div className="text-4xl font-black mt-2 text-emerald-600">{metrics.todayBillsCount}</div>
          </Card>
          <Card>
            <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Today's Expenses</div>
            <div className="text-4xl font-black mt-2 text-orange-600">NPR {metrics.todayExpenses.toLocaleString()}</div>
          </Card>
        </div>

        <Card>
          <h3 className="text-lg font-bold mb-6">Recent Bills</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b dark:border-gray-800">
                  <th className="pb-4 font-medium">Bill No</th>
                  <th className="pb-4 font-medium">Customer</th>
                  <th className="pb-4 font-medium text-right">Amount</th>
                  <th className="pb-4 font-medium text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y dark:divide-gray-800">
                {bills.slice(-5).reverse().map(bill => (
                  <tr key={bill.id}>
                    <td className="py-4 font-mono font-bold">{bill.billNumber}</td>
                    <td className="py-4">{bill.customer.name}</td>
                    <td className="py-4 text-right font-bold">NPR {bill.grandTotal.toLocaleString()}</td>
                    <td className="py-4 text-center">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold ${bill.status === 'Paid' ? 'bg-emerald-100 text-emerald-700' : 'bg-orange-100 text-orange-700'}`}>
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
        <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white">Dashboard</h1>
        <p className="text-gray-500">Real-time overview of your printing press</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Daily Sales</div>
          <div className="text-3xl font-black mt-3 text-blue-600">NPR {metrics.todaySales.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Monthly Revenue</div>
          <div className="text-3xl font-black mt-3 text-emerald-600">NPR {metrics.monthlyRevenue.toLocaleString()}</div>
        </Card>
        <Card>
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Active Customers</div>
          <div className="text-3xl font-black mt-3 text-orange-600">{metrics.activeCustomers}</div>
        </Card>
        <Card>
          <div className="text-sm font-bold uppercase tracking-wider text-gray-400">Pending Bills</div>
          <div className="text-3xl font-black mt-3 text-red-600">{metrics.pendingBills}</div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <h3 className="text-lg font-bold mb-6">Weekly Sales Performance</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData.last7Days}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#9ca3af', fontSize: 12}} />
                <Tooltip 
                  cursor={{fill: '#f3f4f6'}}
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
                <Bar dataKey="sales" fill="#3b82f6" radius={[6, 6, 0, 0]} />
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
                  contentStyle={{borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)'}}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            {chartData.topServices.map((service, index) => (
              <div key={service.name} className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full" style={{backgroundColor: PIE_COLORS[index % PIE_COLORS.length]}}></div>
                <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">{service.name}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
