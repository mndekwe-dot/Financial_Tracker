import { useState } from 'react';
import { categoriesApi } from '../api/categories';
import { useLookups } from '../context/LookupContext';
import IconPicker from '../components/IconPicker';
import CategoryIcon from '../components/CategoryIcon';
import FilterPills from '../components/FilterPills';
import { useUndoableDelete } from '../utils/useUndoableDelete';
import { CATEGORY_ICONS } from '../constants/icons';

const EMPTY_FORM = { name: '', type: 'expense', color: '#6366f1', icon: CATEGORY_ICONS[0] };

export default function Categories() {
  const { categories, refreshCategories } = useLookups();
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');
  const [typeFilter, setTypeFilter] = useState('all'); // 'all' | 'expense' | 'income'
  const undoableDelete = useUndoableDelete();

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await categoriesApi.update(editingId, form);
      } else {
        await categoriesApi.create(form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      refreshCategories();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, type: category.type, color: category.color, icon: category.icon });
  }

  function handleDelete(c) {
    undoableDelete({
      label: 'Category',
      remove: () => refreshCategories(),
      restore: () => refreshCategories(),
      doDelete: async () => { await categoriesApi.delete(c.id); refreshCategories(); },
    });
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  const visibleCategories = typeFilter === 'all'
    ? categories
    : categories.filter((c) => c.type === typeFilter);

  async function addDefaults() {
    setError('');
    try {
      const { data } = await client.post('/categories/defaults/');
      if (Array.isArray(data)) {
        setCategories(data);
      }
    } catch {
      setError('Could not add starter categories.');
    }
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1>Categories</h1>
          <p>Organize income and expenses into custom categories.</p>
        </div>
      </div>
      <form className="inline-form" onSubmit={handleSubmit}>
        {error && <p className="error">{error}</p>}
        <input
          placeholder="Name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          required
        />
        <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
          <option value="expense">Expense</option>
          <option value="income">Income</option>
        </select>
        <input
          type="color"
          value={form.color}
          onChange={(e) => setForm({ ...form, color: e.target.value })}
        />
        <IconPicker value={form.icon} onChange={(icon) => setForm({ ...form, icon })} />
        <button type="submit">{editingId ? 'Update' : 'Add'}</button>
        {editingId && <button type="button" onClick={cancelEdit}>Cancel</button>}
      </form>

      {categories.length > 0 && (
        <div className="filter-row">
          <FilterPills
            ariaLabel="Filter categories by type"
            value={typeFilter}
            onChange={setTypeFilter}
            options={[
              { key: 'all', label: 'All', count: categories.length },
              { key: 'expense', label: 'Expense', count: categories.filter((c) => c.type === 'expense').length },
              { key: 'income', label: 'Income', count: categories.filter((c) => c.type === 'income').length },
            ]}
          />
        </div>
      )}

      <table className="data-table">
        <thead>
          <tr>
            <th></th>
            <th>Name</th>
            <th>Type</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {visibleCategories.map((c) => (
            <tr key={c.id}>
              <td data-label="Icon">
                <span className="category-icon" style={{ background: `${c.color}33`, color: c.color }}>
                  <CategoryIcon name={c.icon} size={15} />
                </span>
              </td>
              <td data-label="Name">{c.name}</td>
              <td data-label="Type">{c.type}</td>
              <td>
                <button onClick={() => handleEdit(c)}>Edit</button>
                <button onClick={() => handleDelete(c)}>Delete</button>
              </td>
            </tr>
          ))}
          {categories.length === 0 && (
            <tr>
              <td colSpan={4}>
                No categories yet.{' '}
                <button type="button" onClick={addDefaults}>Add starter categories</button>
              </td>
            </tr>
          )}
          {categories.length > 0 && visibleCategories.length === 0 && (
            <tr><td colSpan={4}>No {typeFilter} categories.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
