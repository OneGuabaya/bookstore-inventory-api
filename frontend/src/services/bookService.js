import { apiClient } from '../api/client.js';

export const bookService = {
  async list(limit = 6, offset = 0) {
    const res = await apiClient(`/books/?limit=${limit}&offset=${offset}`);
    const items = res?.data ?? res?.results ?? (Array.isArray(res) ? res : []);
    const total = res?.metadata?.total_records ?? res?.count ?? items.length;
    return { results: items, count: total };
  },

  async getById(id) {
    const res = await apiClient(`/books/${id}/`);
    return res?.data ?? res;
  },

  async create(payload) {
    return apiClient('/books/', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  async update(id, payload) {
    return apiClient(`/books/${id}/`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  async delete(id) {
    return apiClient(`/books/${id}/`, {
      method: 'DELETE',
    });
  },

  async searchByCategory(category) {
    const res = await apiClient(`/books/search/?category=${encodeURIComponent(category)}`);
    const items = res?.data ?? res?.results ?? (Array.isArray(res) ? res : []);
    const total = res?.metadata?.total_records ?? res?.count ?? items.length;
    return { results: items, count: total };
  },

  async getLowStock(threshold = 10) {
    const res = await apiClient(`/books/low-stock/?threshold=${threshold}`);
    const items = res?.data ?? res?.results ?? (Array.isArray(res) ? res : []);
    const total = res?.metadata?.total_records ?? res?.count ?? items.length;
    return { results: items, count: total };
  },

  async calculatePrice(id) {
    const res = await apiClient(`/books/${id}/calculate-price/`, {
      method: 'POST',
    });
    return res?.data ?? res;
  },
};