import { useEffect, useState } from 'react';
import client from '../api/client';
import { useDataRefresh } from '../context/DataRefreshContext';
import TransactionFormModal from '../components/TransactionFormModal';

const today = new Date();

export default function Weekly() {
  const [data, setData] = useState(null);
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [year, setYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(null);
  const { version, bump } = useDataRefresh();

  useEffect(() => {
    client.get('/transactions/weekly/', { params: { month, year } }).then(({ data }) => setData(data));
  }, [month, year, version]);

  function changeMonth(delta) {
    let m = month + delta;
    let y = year;
    if (m > 12) { m = 1; y += 1; }
    if (m < 1) { m = 12; y -= 1; }
    setMonth(m);
    setYear(y);
  }

  function handleSaved() {
    bump();
    setSelectedDate(null);
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Weekly Breakdown</h1>
          <p>Monday-Friday spending, grouped by week. Click a day to add a transaction.</p>
        </div>
        <div className="filter-bar">
          <button className="secondary" onClick={() => changeMonth(-1)}>‹</button>
          <span>{month}/{year}</span>
          <button className="secondary" onClick={() => changeMonth(1)}>›</button>
        </div>
      </div>

      {!data ? (
        <div className="loading">Loading...</div>
      ) : (
        <div className="weekly-list">
          {data.weeks.map((week) => (
            <div key={week.label} className="week-card">
              <div className="week-card-header">
                <h3>{week.label}</h3>
                <strong>{Number(week.total).toFixed(2)}</strong>
              </div>
              <div className="week-grid">
                {week.days.map((day) => (
                  <button
                    type="button"
                    key={day.date}
                    className={`week-day ${Number(day.total) > 0 ? 'has-spend' : ''}`}
                    onClick={() => setSelectedDate(day.date)}
                  >
                    <span>{day.weekday.slice(0, 3)}</span>
                    <strong>{Number(day.total).toFixed(0)}</strong>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <TransactionFormModal
        open={selectedDate !== null}
        initialDate={selectedDate}
        onClose={() => setSelectedDate(null)}
        onSaved={handleSaved}
      />
    </div>
  );
}
