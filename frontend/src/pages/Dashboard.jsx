import { useEffect, useState } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts';
import { TrendingUp, Trophy, CalendarClock } from 'lucide-react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import WalletCard from '../components/WalletCard';
import CategoryIcon from '../components/CategoryIcon';

function formatCompact(value) {
  return new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const { version } = useDataRefresh();

  useEffect(() => {
    client.get('/transactions/summary/').then(({ data }) => setSummary(data));
  }, [version]);

  if (!summary) return <div className="loading">Loading...</div>;

  const pieData = summary.by_category.map((c) => ({
    name: c.category__name ?? 'Uncategorized',
    icon: c.category__icon,
    value: Number(c.total),
    color: c.category__color ?? '#94a3b8',
  }));

  const trendData = summary.monthly_trend.map((m) => ({
    month: m.month,
    Income: Number(m.income),
    Expense: Number(m.expense),
  }));

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p>Your spending at a glance.</p>
        </div>
      </div>

      <WalletCard />

      <div className="summary-cards">
        <div className="summary-card income">
          <span>Income</span>
          <strong>{Number(summary.total_income).toFixed(2)}</strong>
        </div>
        <div className="summary-card expense">
          <span>Expense</span>
          <strong>{Number(summary.total_expense).toFixed(2)}</strong>
        </div>
        <div className="summary-card balance">
          <span>Balance</span>
          <strong>{Number(summary.balance).toFixed(2)}</strong>
        </div>
      </div>

      <div className="stat-cards">
        <div className="stat-card">
          <span className="stat-icon"><TrendingUp size={17} /></span>
          <div className="stat-card-body">
            <span>Avg daily spend</span>
            <strong>{Number(summary.avg_daily_expense).toFixed(2)}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon">
            {summary.top_category ? <CategoryIcon name={summary.top_category.category__icon} size={17} /> : <Trophy size={17} />}
          </span>
          <div className="stat-card-body">
            <span>Top category</span>
            <strong>{summary.top_category ? summary.top_category.category__name : '—'}</strong>
          </div>
        </div>
        <div className="stat-card">
          <span className="stat-icon"><CalendarClock size={17} /></span>
          <div className="stat-card-body">
            <span>Busiest day</span>
            <strong>{summary.busiest_day ? summary.busiest_day.weekday : '—'}</strong>
          </div>
        </div>
      </div>

      <div className="charts-grid">
        <div className="chart-card">
          <h2>Spending by Category</h2>
          {pieData.length === 0 ? (
            <p>No expenses this month.</p>
          ) : (
            <>
              <div className="donut-wrapper">
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" innerRadius="55%" outerRadius="80%">
                      {pieData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
                <div className="donut-center">
                  <strong>{formatCompact(summary.total_expense)}</strong>
                  <span>Total Spending</span>
                </div>
              </div>
              <ul className="chart-legend">
                {pieData.map((entry) => (
                  <li key={entry.name}>
                    <span className="category-icon" style={{ background: `${entry.color}33`, color: entry.color, width: 22, height: 22 }}>
                      <CategoryIcon name={entry.icon} size={12} />
                    </span>
                    {entry.name}
                    <span className="chart-legend-value">{entry.value.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>

        <div className="chart-card">
          <h2>Income vs Expense (6 months)</h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={trendData} margin={{ left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" fontSize={11} />
              <YAxis fontSize={11} />
              <Tooltip />
              <Legend />
              <Bar dataKey="Income" fill="#22c55e" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Expense" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
