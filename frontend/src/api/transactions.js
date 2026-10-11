import client from './client';

export const transactionsApi = {
  list: (params) => client.get('/transactions/', { params }).then((res) => res.data),
  get: (id) => client.get(`/transactions/${id}/`).then((res) => res.data),
  create: (data) => client.post('/transactions/', data).then((res) => res.data),
  update: (id, data) => client.put(`/transactions/${id}/`, data).then((res) => res.data),
  patch: (id, data) => client.patch(`/transactions/${id}/`, data).then((res) => res.data),
  delete: (id) => client.delete(`/transactions/${id}/`),
  getSummary: (params) => client.get('/transactions/summary/', { params }).then((res) => res.data),
  getWeekly: (params) => client.get('/transactions/weekly/', { params }).then((res) => res.data),
};

export default transactionsApi;

