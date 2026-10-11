import { useEffect, useState } from 'react';
import { transactionsApi } from '../api/transactions';
import { useDataRefresh } from '../context/DataRefreshContext';
import DayTransactionsModal from '../components/DayTransactionsModal';
import { TableSkeleton } from '../components/Skeleton';
import { formatMoney } from '../utils/currency';

const today = new Date();

export default function Weekly() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const { version, bump } = useDataRefresh();

  useEffect(() => {
    setLoading(true);
    transactionsApi.getWeekly({ month, year })
      .then((data) => setData(data))
      .finally(() => setLoading(false));
  }, [month, year, version]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Weekly Breakdown</h1>
          <p>Full Monday–Sunday spending grid grouped by week. Click any day to view or record expenses.</p>
        </div>
        <div className="filter-bar">
          <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
          <span>{String(month).padStart(2, '0')}/{year}</span>
          <button className="secondary" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

      {loading || !data ? (
        <TableSkeleton rows={4} />
      ) : (
        <div className="weekly-list">
          {data.weeks.map((week) => (
            <div key={week.label} className="week-card">
              <div className="week-card-header">
                <h3>{week.label}</h3>
                <strong className="week-total-pill">{formatMoney(week.total)}</strong>
              </div>
              <div className="week-grid">
                {week.days.map((day) => {
                  const hasSpend = Number(day.total) > 0;
                  return (
                    <button
                      type="button"
                      key={day.date}
                      className={`week-day ${hasSpend ? 'has-spend' : ''}`}
                      onClick={() => setSelectedDate(day.date)}
                    >
                      <span className="week-day-name">{day.weekday.slice(0, 3)}</span>
                      <strong className="week-day-amt">
                        {hasSpend ? formatMoney(day.total) : '—'}
                      </strong>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      <DayTransactionsModal
        open={selectedDate !== null}
        date={selectedDate}
        onClose={() => setSelectedDate(null)}
        onChanged={bump}
      />
    </div>
  );
}
