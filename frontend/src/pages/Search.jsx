import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Search as SearchIcon } from 'lucide-react';
import client from '../api/client';

export default function Search() {
  const [params, setParams] = useSearchParams();
  const initialQ = params.get('q') || '';
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const query = params.get('q') || '';
    setQ(query);
    if (!query.trim()) {
      setResults(null);
      return;
    }
    setLoading(true);
    client.get('/search/', { params: { q: query } })
      .then(({ data }) => setResults(data))
      .finally(() => setLoading(false));
  }, [params]);

  function submit(e) {
    e.preventDefault();
    setParams(q.trim() ? { q: q.trim() } : {});
  }

  const total = results
    ? results.transactions.length + results.loans.length + results.shopping.length
    : 0;

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Search</h1>
          <p>Find anything across transactions, loans and shopping.</p>
        </div>
      </div>

      <form className="inline-form" onSubmit={submit}>
        <input
          placeholder="Search…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoFocus
          style={{ flex: 1, minWidth: 180 }}
        />
        <button type="submit"><SearchIcon size={15} style={{ verticalAlign: -2 }} /> Search</button>
      </form>

      {loading && <p>Searching…</p>}
      {results && !loading && total === 0 && <p className="shop-empty">No matches found.</p>}

      {results && !loading && results.transactions.length > 0 && (
        <section className="search-group">
          <h2 className="shopping-section-title">Transactions <span className="section-count">{results.transactions.length}</span></h2>
          <table className="data-table">
            <tbody>
              {results.transactions.map((t) => (
                <tr key={t.id}>
                  <td data-label="Date">{t.date}</td>
                  <td data-label="Description">{t.description || t.category_name || '—'}{t.tags ? ` · ${t.tags}` : ''}</td>
                  <td data-label="Amount" className={t.type === 'income' ? 'amount-income' : 'amount-expense'}>
                    {Number(t.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/transactions" className="search-more">Open transactions →</Link>
        </section>
      )}

      {results && !loading && results.loans.length > 0 && (
        <section className="search-group">
          <h2 className="shopping-section-title">Loans <span className="section-count">{results.loans.length}</span></h2>
          <table className="data-table">
            <tbody>
              {results.loans.map((l) => (
                <tr key={l.id}>
                  <td data-label="Person">{l.person}</td>
                  <td data-label="Direction">{l.direction === 'owed_to_me' ? 'Owed to me' : 'I owe'}{l.settled ? ' · settled' : ''}</td>
                  <td data-label="Amount" className={l.direction === 'owed_to_me' ? 'amount-income' : 'amount-expense'}>
                    {Number(l.amount).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/loans" className="search-more">Open loans →</Link>
        </section>
      )}

      {results && !loading && results.shopping.length > 0 && (
        <section className="search-group">
          <h2 className="shopping-section-title">Shopping <span className="section-count">{results.shopping.length}</span></h2>
          <table className="data-table">
            <tbody>
              {results.shopping.map((i) => (
                <tr key={i.id}>
                  <td data-label="Item">{i.name}</td>
                  <td data-label="Category">{i.category || '—'}</td>
                  <td data-label="List">{i.list_name}{i.bought ? ' · bought' : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <Link to="/shopping" className="search-more">Open shopping →</Link>
        </section>
      )}
    </div>
  );
}
