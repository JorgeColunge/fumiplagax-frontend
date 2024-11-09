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

    // Completa la URL si es relativa
    const completeUrl = request.url.startsWith('http')
      ? request.url
      : `http://localhost:10000/api${request.url}`;

    await store.add({
      ...request,
      url: completeUrl,
    });

    await tx.done;
    console.log('Solicitud guardada offline:', request);
  } catch (error) {
    console.error('Error al guardar la solicitud offline:', error);
  }
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

  if (requests.length === 0) {
    console.log('No hay solicitudes para sincronizar.');
    return;
  }

  console.log('Iniciando sincronización de solicitudes:', requests);

  try {
    for (const req of requests) {
      if (req.headers['Content-Type'] === 'application/json') {
        const { inspectionId, generalObservations, findingsByType, productsByType, stationsFindings } = req.body;

        const formData = new FormData();

        // Agregar datos JSON al FormData
        formData.append('inspectionId', inspectionId);
        formData.append('generalObservations', generalObservations);
        formData.append('findingsByType', JSON.stringify(findingsByType));
        formData.append('productsByType', JSON.stringify(productsByType));

        // Agregar estaciones y sus imágenes al FormData
        formData.append(
          'stationsFindings',
          JSON.stringify(
            stationsFindings.map((finding) => ({
              ...finding,
              photoBlob: undefined, // Excluir blob antes de enviarlo
            }))
          )
        );

        stationsFindings.forEach((finding) => {
          if (finding.photoBlob) {
            formData.append('images', finding.photoBlob); // Subir blobs como imágenes
          }
        });

        // Enviar solicitud al backend
        const response = await fetch(req.url, {
          method: req.method,
          body: formData,
        });

        if (!response.ok) {
          throw new Error(`Error en la solicitud ${req.url}: ${response.statusText}`);
        }

        console.log(`Solicitud sincronizada correctamente: ${req.url}`);
      }
    }

    await clearRequests(); // Limpia solicitudes sincronizadas
    console.log('Sincronización completada.');
  } catch (error) {
    console.error('Error durante la sincronización:', error);
  }
};


// Detectar si está offline
export const isOffline = () => !navigator.onLine;
