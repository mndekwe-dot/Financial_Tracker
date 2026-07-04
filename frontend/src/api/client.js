import axios from 'axios';

// Dev: talk to the local Django server. Production: same origin as the page.
const BASE_URL = import.meta.env.DEV ? 'http://127.0.0.1:8002/api' : '/api';

const QUEUE_KEY = 'offline-queue';
const MUTATING_METHODS = ['post', 'put', 'patch', 'delete'];

const client = axios.create({ baseURL: BASE_URL });

// --- Offline queue -----------------------------------------------------
// Data changes made while offline are stored locally and replayed in order
// once the connection comes back. Auth requests are never queued.

function readQueue() {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY)) || [];
  } catch {
    return [];
  }
}

function writeQueue(queue) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  window.dispatchEvent(new CustomEvent('offline-queue-changed', { detail: queue.length }));
}

export function pendingSyncCount() {
  return readQueue().length;
}

let syncing = false;

export async function syncOfflineQueue() {
  if (syncing || !navigator.onLine || readQueue().length === 0) return;
  syncing = true;
  try {
    while (readQueue().length > 0) {
      const next = readQueue()[0];
      try {
        await client({ method: next.method, url: next.url, data: next.data, fromOfflineQueue: true });
      } catch (err) {
        if (!err.response) return; // still offline — keep the queue, retry later
        // The server rejected this change (e.g. validation) — drop it so the rest can sync.
        console.warn('Dropped offline change rejected by server:', next, err.response.data);
      }
      writeQueue(readQueue().slice(1));
    }
    window.dispatchEvent(new Event('offline-queue-synced'));
  } finally {
    syncing = false;
  }
}

window.addEventListener('online', syncOfflineQueue);

// --- Interceptors ------------------------------------------------------

client.interceptors.request.use((config) => {
  const access = localStorage.getItem('access');
  if (access) {
    config.headers.Authorization = `Bearer ${access}`;
  }
  return config;
});

let refreshPromise = null;

client.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // Network failure on a data change: queue it and pretend it succeeded.
    if (
      !error.response &&
      original &&
      !original.fromOfflineQueue &&
      MUTATING_METHODS.includes(original.method) &&
      !original.url.includes('/auth/')
    ) {
      const queue = readQueue();
      queue.push({
        method: original.method,
        url: original.url,
        data: typeof original.data === 'string' ? JSON.parse(original.data) : original.data,
      });
      writeQueue(queue);
      return { data: { queuedOffline: true }, status: 202, statusText: 'Queued offline', queuedOffline: true };
    }

    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;
      const refresh = localStorage.getItem('refresh');
      if (!refresh) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
        return Promise.reject(error);
      }
      try {
        if (!refreshPromise) {
          refreshPromise = axios
            .post(`${BASE_URL}/auth/refresh/`, { refresh })
            .finally(() => {
              refreshPromise = null;
            });
        }
        const { data } = await refreshPromise;
        localStorage.setItem('access', data.access);
        original.headers.Authorization = `Bearer ${data.access}`;
        return client(original);
      } catch (refreshError) {
        localStorage.removeItem('access');
        localStorage.removeItem('refresh');
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

// Replay anything left over from a previous offline session.
syncOfflineQueue();

export default client;
