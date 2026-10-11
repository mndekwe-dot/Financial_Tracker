import client from './client';

export const loansApi = {
  list: (params) => client.get('/loans/', { params }).then((res) => res.data),
  create: (data) => client.post('/loans/', data).then((res) => res.data),
  update: (id, data) => client.put(`/loans/${id}/`, data).then((res) => res.data),
  delete: (id) => client.delete(`/loans/${id}/`),
  summary: () => client.get('/loans/summary/').then((res) => res.data),
};

export default loansApi;
