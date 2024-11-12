import { openDB } from 'idb';

// Inicializar IndexedDB
const initDB = async () => {
  return openDB('offline-db', 2, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('requests')) {
        db.createObjectStore('requests', { keyPath: 'id', autoIncrement: true });
      }
    },
  });
};

// Guardar solicitud
export const saveRequest = async (request) => {
  try {
    const db = await initDB();
    const tx = db.transaction('requests', 'readwrite');
    const store = tx.objectStore('requests');

    const completeUrl = request.url.startsWith('http')
      ? request.url
      : `http://localhost:10000/api${request.url}`;

    const serializableRequest = {
      ...request,
      url: completeUrl,
    };

    await store.add(serializableRequest);
    await tx.done;
    console.log('Solicitud guardada offline:', serializableRequest);
  } catch (error) {
    console.error('Error al guardar la solicitud offline:', error);
  }
};

// Convertir FormData a un objeto serializable (manejo de blobs)
export const convertFormDataToObject = async (formData) => {
  const object = {};
  const promises = [];

  formData.forEach((value, key) => {
    if (value instanceof Blob) {
      const promise = new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          object[key] = {
            type: 'blob',
            data: reader.result, // Base64 del blob
            name: value.name,
          };
          resolve();
        };
        reader.readAsDataURL(value);
      });
      promises.push(promise);
    } else {
      object[key] = value;
    }
  });

  // Esperar a que todas las promesas se resuelvan
  await Promise.all(promises);
  return object;
};


// Reconstruir FormData desde un objeto
export const reconstructFormData = (data) => {
  const formData = new FormData();

  Object.entries(data).forEach(([key, value]) => {
    if (value && value.type === 'blob') {
      const byteString = atob(value.data.split(',')[1]);
      const mimeString = value.data.split(',')[0].split(':')[1].split(';')[0];
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);

      for (let i = 0; i < byteString.length; i++) {
        ia[i] = byteString.charCodeAt(i);
      }

      const blob = new Blob([ab], { type: mimeString });
      formData.append(key, blob, value.name);
    } else {
      formData.append(key, value);
    }
  });

  return formData;
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

// Detectar si está offline
export const isOffline = () => !navigator.onLine;

// Sincronizar solicitudes
export const syncRequests = async () => {
  const requests = await getRequests();

  if (requests.length === 0) {
    console.log('No hay solicitudes para sincronizar.');
    return;
  }

  console.log('Iniciando sincronización de solicitudes:', requests);

  try {
    for (const req of requests) {
      // Reconstruir FormData si los datos son serializables
      const formData = reconstructFormData(req.body);

      console.log('Datos reconstruidos para sincronización:', formData);

      // Enviar la solicitud reconstruida al backend
      const response = await fetch(req.url, {
        method: req.method,
        body: formData,
        // NO agregar manualmente 'Content-Type', fetch lo hará automáticamente
      });

      if (!response.ok) {
        throw new Error(`Error en la solicitud ${req.url}: ${response.statusText}`);
      }

      console.log(`Solicitud sincronizada correctamente: ${req.url}`);
    }

    await clearRequests(); // Limpiar solicitudes sincronizadas
    console.log('Sincronización completada.');
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
};
