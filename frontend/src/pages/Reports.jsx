import { useState } from 'react';
import { FileDown, PiggyBank, ArrowLeftRight, HandCoins, LayoutDashboard } from 'lucide-react';
import client from '../api/client';
import { downloadCsv } from '../utils/csv';

const today = new Date();
const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export default function Reports() {
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');

  const period = `${year}-${String(month).padStart(2, '0')}`;
  const monthLabel = `${MONTH_NAMES[month - 1]} ${year}`;

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  }

  async function run(name, fn) {
    setBusy(name);
    setError('');
    try {
      await fn();
    } catch {
      setError('Could not generate the report. Please try again.');
    } finally {
      setBusy('');
    }
  }

  function exportBudgets() {
    return run('budgets', async () => {
      const { data } = await client.get('/budgets/', { params: { month, year } });
      const rows = [
        [`Budget report - ${monthLabel}`],
        [],
        ['Category', 'Budget', 'Spent', 'Difference', 'Status'],
      ];
      let totalBudget = 0;
      let totalSpent = 0;
      for (const b of data) {
        const amount = Number(b.amount);
        const spent = Number(b.spent);
        totalBudget += amount;
        totalSpent += spent;
        rows.push([
          b.category_name,
          amount.toFixed(2),
          spent.toFixed(2),
          (amount - spent).toFixed(2),
          spent > amount ? 'Over budget' : 'Within budget',
        ]);
      }
      rows.push([]);
      rows.push(['Total', totalBudget.toFixed(2), totalSpent.toFixed(2), (totalBudget - totalSpent).toFixed(2), '']);
      downloadCsv(`budget-report-${period}.csv`, rows);
    });
  }

  function exportTransactions() {
    return run('transactions', async () => {
      const lastDay = new Date(year, month, 0).getDate();
      const { data } = await client.get('/transactions/', {
        params: { start_date: `${period}-01`, end_date: `${period}-${lastDay}` },
      });
      const rows = [
        [`Transactions report - ${monthLabel}`],
        [],
        ['Date', 'Type', 'Category', 'Description', 'Amount'],
      ];
      let income = 0;
      let expense = 0;
      const sorted = [...data].sort((a, b) => a.date.localeCompare(b.date));
      for (const t of sorted) {
        const amount = Number(t.amount);
        if (t.type === 'income') income += amount; else expense += amount;
        rows.push([t.date, t.type, t.category_name || 'Uncategorized', t.description || '', amount.toFixed(2)]);
      }
      rows.push([]);
      rows.push(['Total income', '', '', '', income.toFixed(2)]);
      rows.push(['Total expense', '', '', '', expense.toFixed(2)]);
      rows.push(['Balance', '', '', '', (income - expense).toFixed(2)]);
      downloadCsv(`transactions-report-${period}.csv`, rows);
    });
  }

  function exportSummary() {
    return run('summary', async () => {
      const { data } = await client.get('/transactions/summary/', { params: { month, year } });
      const rows = [
        [`Monthly summary - ${monthLabel}`],
        [],
        ['Total income', Number(data.total_income).toFixed(2)],
        ['Total expense', Number(data.total_expense).toFixed(2)],
        ['Balance', Number(data.balance).toFixed(2)],
        ['Average daily expense', Number(data.avg_daily_expense).toFixed(2)],
        [],
        ['Spending by category'],
        ['Category', 'Amount'],
      ];
      for (const c of data.by_category) {
        rows.push([c.category__name || 'Uncategorized', Number(c.total).toFixed(2)]);
      }
      rows.push([]);
      rows.push(['Last 6 months']);
      rows.push(['Month', 'Income', 'Expense']);
      for (const m of data.monthly_trend) {
        rows.push([m.month, Number(m.income).toFixed(2), Number(m.expense).toFixed(2)]);
      }
      downloadCsv(`monthly-summary-${period}.csv`, rows);
    });
  }

  function exportLoans() {
    return run('loans', async () => {
      const [{ data: loans }, { data: summary }] = await Promise.all([
        client.get('/loans/'),
        client.get('/loans/summary/'),
      ]);
      const rows = [
        ['Loans report'],
        [],
        ['Person', 'Direction', 'Amount', 'Date', 'Settled', 'Note'],
      ];
      for (const l of loans) {
        rows.push([
          l.person,
          l.direction === 'owed_to_me' ? 'Owed to me' : 'I owe',
          Number(l.amount).toFixed(2),
          l.date,
          l.settled ? 'Yes' : 'No',
          l.note || '',
        ]);
      }
      rows.push([]);
      rows.push(['Owed to me (unsettled)', Number(summary.owed_to_me).toFixed(2)]);
      rows.push(['I owe (unsettled)', Number(summary.i_owe).toFixed(2)]);
      rows.push(['Net', Number(summary.net).toFixed(2)]);
      downloadCsv('loans-report.csv', rows);
    });
  }

  const REPORTS = [
    {
      key: 'budgets',
      title: 'Budget report',
      description: `Budget vs actual spend per category for ${monthLabel}.`,
      Icon: PiggyBank,
      action: exportBudgets,
    },
    {
      key: 'transactions',
      title: 'Transactions report',
      description: `Every income and expense recorded in ${monthLabel}.`,
      Icon: ArrowLeftRight,
      action: exportTransactions,
    },
    {
      key: 'summary',
      title: 'Monthly summary',
      description: `Totals, spending by category and 6-month trend for ${monthLabel}.`,
      Icon: LayoutDashboard,
      action: exportSummary,
    },
    {
      key: 'loans',
      title: 'Loans report',
      description: 'All loans (lent and borrowed) with the current net position.',
      Icon: HandCoins,
      action: exportLoans,
    },
  ];

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Reports</h1>
          <p>Download your data as CSV files that open in Excel or Google Sheets.</p>
        </div>
        <div className="filter-bar">
          <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
          <span>{month}/{year}</span>
          <button className="secondary" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      <div className="more-grid">
        {REPORTS.map(({ key, title, description, Icon, action }) => (
          <button key={key} type="button" className="more-card" onClick={action} disabled={busy !== ''}>
            <span className="more-icon"><Icon size={22} /></span>
            <span>
              <strong>{busy === key ? 'Preparing…' : title}</strong>
              <small style={{ display: 'block', opacity: 0.7, marginTop: 4 }}>{description}</small>
            </span>
            <FileDown size={18} style={{ marginLeft: 'auto', opacity: 0.6 }} />
          </button>
        ))}
      </div>
    </div>
  );
}
