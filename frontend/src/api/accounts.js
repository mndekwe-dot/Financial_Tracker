import client from './client';

export const accountsApi = {
  list: () => client.get('/money/accounts/').then((res) => res.data),
  create: (data) => client.post('/money/accounts/', data).then((res) => res.data),
  update: (id, data) => client.put(`/money/accounts/${id}/`, data).then((res) => res.data),
  delete: (id) => client.delete(`/money/accounts/${id}/`),
  listTransfers: () => client.get('/money/transfers/').then((res) => res.data),
  createTransfer: (data) => client.post('/money/transfers/', data).then((res) => res.data),
  deleteTransfer: (id) => client.delete(`/money/transfers/${id}/`),
};

export default accountsApi;
