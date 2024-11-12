import axios from 'axios';
import { saveRequest, isOffline, convertFormDataToObject } from './offlineHandler';

const api = axios.create({
  baseURL: 'http://localhost:10000/api',
});

api.interceptors.request.use(async (config) => {
  if (isOffline()) {
    console.log('Interceptando solicitud offline:', config);

    let serializableBody;
    if (config.data instanceof FormData) {
      // Esperar a que la serialización del FormData sea completa
      serializableBody = await convertFormDataToObject(config.data);
    } else {
      serializableBody = config.data;
    }

    // Guardar solicitud offline
    await saveRequest({
      url: config.url,
      method: config.method,
      headers: config.headers,
      body: serializableBody,
    });

    return Promise.reject({ message: 'Offline: la solicitud se guardó localmente' });
  }
  return config;
}, (error) => {
  return Promise.reject(error);
});

export default api;
