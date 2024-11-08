import axios from 'axios';
import { saveRequest, isOffline } from './offlineHandler';

const api = axios.create({
  baseURL: 'http://localhost:10000/api',
});

api.interceptors.request.use(async (config) => {
  if (isOffline()) {
    // Guardar solicitud offline
    await saveRequest({
      url: config.url,
      method: config.method,
      headers: config.headers,
      body: config.data,
    });
    return Promise.reject({ message: 'Offline: la solicitud se guardó localmente' });
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
