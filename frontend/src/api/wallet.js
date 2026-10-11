import client from './client';

export const walletApi = {
  get: () => client.get('/wallet/').then((res) => res.data),
  update: (data) => client.patch('/wallet/', data).then((res) => res.data),
};

export default walletApi;
