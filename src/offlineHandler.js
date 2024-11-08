import { openDB } from 'idb';

// Inicializar IndexedDB
const initDB = async () => {
  return openDB('offline-db', 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// Guardar solicitud
export const saveRequest = async (request) => {
  const db = await initDB();
  await db.add('requests', request);
};

// Obtener todas las solicitudes almacenadas
export const getRequests = async () => {
  const db = await initDB();
  return db.getAll('requests');
};

// Eliminar solicitudes sincronizadas
export const clearRequests = async () => {
  const db = await initDB();
  await db.clear('requests');
};

// Sincronizar solicitudes
export const syncRequests = async () => {
  const requests = await getRequests();
  if (requests.length === 0) return;

  try {
    for (const req of requests) {
      await fetch(req.url, {
        method: req.method,
        headers: req.headers,
        body: req.body ? JSON.stringify(req.body) : undefined,
      });
    }
    await clearRequests();
    console.log('Sincronización completada');
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
};

// Detectar si está offline
export const isOffline = () => !navigator.onLine;
