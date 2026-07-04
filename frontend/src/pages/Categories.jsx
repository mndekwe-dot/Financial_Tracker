import { useEffect, useState } from 'react';
import client from '../api/client';
import IconPicker from '../components/IconPicker';
import CategoryIcon from '../components/CategoryIcon';
import { CATEGORY_ICONS } from '../constants/icons';

const EMPTY_FORM = { name: '', type: 'expense', color: '#6366f1', icon: CATEGORY_ICONS[0] };

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [form, setForm] = useState(EMPTY_FORM);
  const [editingId, setEditingId] = useState(null);
  const [error, setError] = useState('');

  function loadCategories() {
    client.get('/categories/').then(({ data }) => setCategories(data));
  }

  useEffect(loadCategories, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    try {
      if (editingId) {
        await client.put(`/categories/${editingId}/`, form);
      } else {
        await client.post('/categories/', form);
      }
      setForm(EMPTY_FORM);
      setEditingId(null);
      loadCategories();
    } catch (err) {
      const data = err.response?.data;
      setError(data ? Object.values(data).flat().join(' ') : 'Save failed.');
    }
  }

  function handleEdit(category) {
    setEditingId(category.id);
    setForm({ name: category.name, type: category.type, color: category.color, icon: category.icon });
  }

  async function handleDelete(id) {
    if (!confirm('Delete this category? Transactions using it will be unlinked.')) return;
    await client.delete(`/categories/${id}/`);
    loadCategories();
  }

  function cancelEdit() {
    setEditingId(null);
    setForm(EMPTY_FORM);
  }

  async function addDefaults() {
    setError('');
    try {
      const { data } = await client.post('/categories/defaults/');
      setCategories(data);
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
          {categories.map((c) => (
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
                <button onClick={() => handleDelete(c.id)}>Delete</button>
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
        </tbody>
      </table>
    </div>
  );
}
