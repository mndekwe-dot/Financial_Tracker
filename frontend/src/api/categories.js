import client from './client';

export const categoriesApi = {
  list: () => client.get('/categories/').then((res) => res.data),
  create: (data) => client.post('/categories/', data).then((res) => res.data),
  update: (id, data) => client.put(`/categories/${id}/`, data).then((res) => res.data),
  delete: (id) => client.delete(`/categories/${id}/`),
};

export default categoriesApi;

