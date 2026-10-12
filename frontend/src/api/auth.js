import client from './client';

export const authApi = {
  login: (data) => client.post('/auth/login/', data).then((res) => res.data),
  register: (data) => client.post('/auth/register/', data).then((res) => res.data),
  getMe: () => client.get('/auth/me/').then((res) => res.data),
  updateProfile: (data) => client.patch('/auth/me/', data).then((res) => res.data),
  changePassword: (data) => client.post('/auth/change-password/', data).then((res) => res.data),
  requestPasswordReset: (email) => client.post('/auth/password-reset/', { email }).then((res) => res.data),
  confirmPasswordReset: (data) => client.post('/auth/password-reset/confirm/', data).then((res) => res.data),
  setPassphrase: (data) => client.post('/auth/set-passphrase/', data).then((res) => res.data),
  resetWithPassphrase: (data) => client.post('/auth/passphrase-reset/', data).then((res) => res.data),
};

export default authApi;

