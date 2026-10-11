import client from './client';

export const budgetsApi = {
  list: (params) => client.get('/budgets/', { params }).then((res) => res.data),
  create: (data) => client.post('/budgets/', data).then((res) => res.data),
  update: (id, data) => client.put(`/budgets/${id}/`, data).then((res) => res.data),
  delete: (id) => client.delete(`/budgets/${id}/`),
  copy: (data) => client.post('/budgets/copy/', data).then((res) => res.data),
};

export default budgetsApi;
