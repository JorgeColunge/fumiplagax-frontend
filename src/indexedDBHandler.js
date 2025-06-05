import { openDB } from 'idb';
import api from './Api';
import axios from 'axios';
import { updateRequestsWithNewInspectionId } from './offlineHandler';

// Solicitar almacenamiento persistente y mostrar detalles de almacenamiento
const requestPersistentStorage = async () => {
  if (navigator.storage && navigator.storage.persist) {
    console.log("🟢 Verificando si el almacenamiento ya es persistente...");
    const isPersisted = await navigator.storage.persisted();

    if (!isPersisted) {
      try {
        const granted = await navigator.storage.persist();
        console.log(granted
          ? "✅ Almacenamiento persistente concedido con éxito."
          : "❌ No se pudo establecer almacenamiento persistente.");

        if (!granted) {
          console.warn("🔍 Posibles razones del rechazo:");
          console.warn("1️⃣ El usuario no ha interactuado lo suficiente con la app.");
          console.warn("2️⃣ La app no está instalada como PWA.");
          console.warn("3️⃣ El sitio no está en HTTPS (excepto localhost).");
          console.warn("4️⃣ Restricciones del navegador o modo incógnito.");
          console.warn("5️⃣ No se ha alcanzado el umbral de uso de almacenamiento.");
        }
      } catch (error) {
        console.error("❌ Error al solicitar almacenamiento persistente:", error);
        return false;
      }
    } else {
      console.log("✅ El almacenamiento YA era persistente.");
    }

    // Obtener detalles de almacenamiento
    if (navigator.storage && navigator.storage.estimate) {
      const estimate = await navigator.storage.estimate();
      console.log(`📊 Cuota total: ${(estimate.quota / 1024 / 1024).toFixed(2)} MB`);
      console.log(`📦 Espacio usado: ${(estimate.usage / 1024 / 1024).toFixed(2)} MB`);
      console.log(`💾 Uso: ${(estimate.usage / estimate.quota * 100).toFixed(2)}%`);
    }

    return isPersisted;
  } else {
    console.warn("❌ El navegador NO soporta `navigator.storage.persist()`.");
    return false;
  }
};

// Inicializar IndexedDB para los usuarios
export const initUsersDB = async () => {
  await requestPersistentStorage();
  return openDB('offline-ddbb', 3, { // Incrementa la versión a 3
    upgrade(db, oldVersion) {
      if (oldVersion < 1) {
        // Crear otros object stores si los necesitas
      }
      if (oldVersion < 2) {
        // Crear el object store para usuarios si no existe
        if (!db.objectStoreNames.contains('users')) {
          db.createObjectStore('users', { keyPath: 'id' });
        }
      }
    },
  });
};



const getImageUrl = (image) => {
  if (!image) return null;
  return image.startsWith('http') ? image : `${process.env.REACT_APP_API_URL}${image}`;
};


// Guardar usuarios en IndexedDB
export const saveUsers = async (users, initialSync) => {
  // Procesar previamente las imágenes
  const processedUsers = await Promise.all(
    users.map(async (user) => {
      if (user.image) {
        try {
          // Primero, solicita la URL prefirmada desde el backend
          const preSignedResponse = await api.post('/PrefirmarArchivos', { url: user.image });

          if (preSignedResponse.data?.signedUrl) {
            const imageUrl = preSignedResponse.data.signedUrl;

            // Descarga la imagen desde la URL prefirmada
            const response = await fetch(imageUrl);
            if (response.ok) {
              const blob = await response.blob();
              user.imageBlob = blob;
              console.log(`Imagen descargada correctamente para el usuario ${user.id}`);
            } else {
              console.warn(`No se pudo obtener la imagen para el usuario ${user.id}`);
              user.imageBlob = null;
            }
          } else {
            console.warn(`No se obtuvo una URL prefirmada para el usuario ${user.id}`);
            user.imageBlob = null;
          }
        } catch (error) {
          console.error(`Error al procesar la imagen del usuario ${user.id}:`, error);
          user.imageBlob = null;
        }
      }
      return user;
    })
  );

  // Ahora guarda los usuarios en IndexedDB
  const db = await initUsersDB();
  const tx = db.transaction('users', 'readwrite', { durability: 'strict' });
  const store = tx.objectStore('users');

  // Las operaciones de IndexedDB son rápidas y síncronas
  processedUsers.forEach((user) => {
    user.synced = initialSync;
    console.log(`Guardando usuario en IndexedDB: ${user.id}`, user);
    store.put(user); // Guarda cada usuario
  });

  await tx.done; // Finaliza la transacción
  console.log('Usuarios guardados en IndexedDB con imágenes.');
};


export const getUsers = async () => {
  const db = await initUsersDB();
  const users = await db.getAll('users');

  console.log('Usuarios recuperados de IndexedDB:', users);

  // Convierte los blobs en URLs locales
  users.forEach((user) => {
    if (user.imageBlob) {
      user.imageUrl = URL.createObjectURL(user.imageBlob); // Genera una URL temporal desde el blob
      console.log(`URL de imagen creada para usuario ${user.id}:`, user.imageUrl);
    } else {
      console.warn(`Usuario ${user.id} no tiene una imagen almacenada en IndexedDB.`);
    }
  });

  return users;
};

export const syncUsers = async () => {
  const db = await initUsersDB();

  const allUsers = await db.getAll('users'); // Obtén todos los usuarios
  const unsyncedUsers = allUsers.filter((user) => !user.synced); // Filtra los no sincronizados

  console.log('Usuarios no sincronizados:', unsyncedUsers);

  if (unsyncedUsers.length === 0) {
    console.log('No hay usuarios para sincronizar.');
    return;
  }

  try {
    for (const user of unsyncedUsers) {
      console.log(`Sincronizando usuario: ${user.id}`, user);

      const formData = new FormData();
      formData.append('id', user.id);
      formData.append('name', user.name);
      formData.append('lastname', user.lastname);
      formData.append('phone', user.phone);
      formData.append('rol', user.rol);
      formData.append('password', user.password);
      formData.append('email', user.email);

      if (user.imageBlob) {
        formData.append('image', user.imageBlob, `${user.id}.jpg`);
      }

      // Sincroniza el usuario con el servidor
      try {
        await api.post('/register', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        console.log(`Usuario sincronizado correctamente: ${user.id}`);

        // Actualiza el estado del usuario en IndexedDB
        const tx = db.transaction('users', 'readwrite', { durability: 'strict' });
        const store = tx.objectStore('users');
        user.synced = true; // Marca como sincronizado
        await store.put(user);
        await tx.done; // Finaliza la transacción
      } catch (syncError) {
        console.error(`Error al sincronizar el usuario ${user.id}:`, syncError);
      }
    }
  } catch (globalError) {
    console.error('Error global durante la sincronización de usuarios:', globalError);
  } finally {
    console.log('Sincronización completada.');
  }
};

export const syncUsersOnStart = async () => {
  try {
    const db = await initUsersDB();
    const usersInDB = await db.getAll('users');

    if (navigator.onLine) { // Verifica si hay conexión
      const response = await api.get('/users');
      const serverUsers = response.data; // Usuarios obtenidos del servidor

      // Crear un Set con los IDs de los usuarios del servidor
      const serverUserIds = new Set(serverUsers.map(user => user.id));

      // Eliminar usuarios de IndexedDB que no están en el servidor
      const tx = db.transaction('users', 'readwrite', { durability: 'strict' });
      const store = tx.objectStore('users');
      for (const user of usersInDB) {
        if (!serverUserIds.has(user.id)) { // Si el ID no está en el servidor, eliminarlo
          console.log(`Eliminando usuario de IndexedDB: ${user.id}`);
          await store.delete(user.id);
        }
      }
      await tx.done;

      // Guardar los nuevos usuarios en IndexedDB
      await saveUsers(serverUsers, true);
      console.log('Usuarios sincronizados en IndexedDB.');

    } else {
      console.log('No hay conexión a Internet. No se pueden sincronizar los usuarios.');
    }
  } catch (error) {
    console.error('Error al sincronizar usuarios en el inicio:', error);
  }
};

// Inicializa IndexedDB para perfiles
export const initProfileDB = async () => {
  await requestPersistentStorage();
  return openDB('offline-profile', 3, {
    upgrade(db) {
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: 'id' });
      }
    },
  });
};

// Guardar perfil en IndexedDB
export const saveProfile = async (user) => {
  const db = await initProfileDB();
  const tx = db.transaction('profile', 'readwrite', { durability: 'strict' });
  const store = tx.objectStore('profile');
  await store.put(user);
  await tx.done;
  console.log(`Perfil de usuario ${user.id} guardado en IndexedDB.`);
};

// Obtener perfil desde IndexedDB
export const getProfile = async (userId) => {
  const db = await initProfileDB();
  return await db.get('profile', userId);
};


// Inicializar IndexedDB para servicios y clientes
export const initServicesDB = async () => {
  await requestPersistentStorage();
  return openDB('offline-services', 8, { // Asegura que la versión sea mayor a la anterior
    upgrade(db, oldVersion) {
      if (oldVersion < 8) {
        if (!db.objectStoreNames.contains('services')) {
          db.createObjectStore('services', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('events')) {
          db.createObjectStore('events', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('technicians')) {
          db.createObjectStore('technicians', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('inspections')) {
          db.createObjectStore('inspections', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('pending_inspections')) {
          db.createObjectStore('pending_inspections', { keyPath: 'id', autoIncrement: true });
        }
        if (!db.objectStoreNames.contains('stations')) {
          const st = db.createObjectStore('stations', { keyPath: 'id' });
          // índice por cliente para búsquedas rápidas
          st.createIndex('client_id', 'client_id', { unique: false });
        }
      }
    },
  });
};

// Guardar servicios y clientes en IndexedDB
export const saveServices = async (services, clients) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction(['services', 'clients'], 'readwrite', { durability: 'strict' });
    const serviceStore = tx.objectStore('services');
    const clientStore = tx.objectStore('clients');

    // Guardar cada servicio en IndexedDB
    for (const service of services) {
      await serviceStore.put(service);
    }

    // Guardar cada cliente en IndexedDB correctamente
    for (const clientId in clients) {
      if (clients.hasOwnProperty(clientId)) {
        const clientData = clients[clientId];
        if (typeof clientData === 'string') {
          // Si clientData es una cadena, guardarlo como objeto correctamente
          await clientStore.put({ id: clientId, name: clientData });
        } else if (typeof clientData === 'object' && clientData !== null) {
          // Si ya es un objeto, guardarlo tal cual
          await clientStore.put({ id: clientId, ...clientData });
        }
      }
    }

    await tx.done;
    console.log("✅ Servicios y clientes guardados correctamente en IndexedDB.");
  } catch (error) {
    console.error("❌ Error al guardar servicios y clientes en IndexedDB:", error);
  }
};

// Obtener servicios y clientes desde IndexedDB
export const getServices = async () => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction(['services', 'clients'], 'readonly');
    const services = await tx.objectStore('services').getAll();
    const clients = await tx.objectStore('clients').getAll();

    /* ⬇ normaliza cada cliente en un mismo formato ⬇ */
    const clientMap = clients.reduce((acc, cli) => {
      acc[cli.id] = {
        name: cli.name ?? 'Cliente Desconocido',
        address: cli.address ?? 'No especificada',
        phone: cli.phone ?? 'No especificado',
      };
      return acc;
    }, {});

    return { services, clients: clientMap };
  } catch (err) {
    console.error('❌ Error al obtener services/clients:', err);
    return { services: [], clients: {} };
  }
};


// Sincronizar servicios con el backend
export const syncServicesOnStart = async () => {
  try {
    const db = await initServicesDB();
    const storedServices = await db.transaction('services', 'readonly').objectStore('services').getAll();

    if (navigator.onLine) {
      console.log("🌐 Modo online: obteniendo servicios desde el servidor...");
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/services`);
      const serverServices = response.data;

      // Obtener los clientes relacionados
      const clientData = {};
      for (const service of serverServices) {
        if (service.client_id && !clientData[service.client_id]) {
          try {
            const clientResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients/${service.client_id}`);
            clientData[service.client_id] = clientResponse.data; // Guardar el objeto completo
          } catch (error) {
            console.error(`⚠️ Error obteniendo cliente ${service.client_id}:`, error);
          }
        }
      }

      // Crear un Set con los IDs de los servicios del servidor
      const serverServiceIds = new Set(serverServices.map(service => service.id));

      // Eliminar servicios que ya no existen en el servidor
      const tx = db.transaction('services', 'readwrite');
      const store = tx.objectStore('services');

      for (const service of storedServices) {
        if (!serverServiceIds.has(service.id)) {
          console.log(`🗑 Eliminando servicio obsoleto de IndexedDB: ${service.id}`);
          await store.delete(service.id);
        }
      }
      await tx.done;

      // Guardar los servicios y clientes actualizados en IndexedDB
      await saveServices(serverServices, clientData);
      console.log("✅ Servicios y clientes sincronizados en IndexedDB.");
    } else {
      console.log("📴 Modo offline: usando datos desde IndexedDB.");
    }
  } catch (error) {
    console.error("❌ Error al sincronizar servicios y clientes:", error);
  }
};


// Inicializar IndexedDB para clientes
export const initClientsDB = async () => {
  await requestPersistentStorage();
  return openDB('offline-clients', 1, { // Asegurar nueva versión
    upgrade(db, oldVersion) {
      if (oldVersion < 6) {
        if (!db.objectStoreNames.contains('clients')) {
          db.createObjectStore('clients', { keyPath: 'id' });
        }
      }
    },
  });
};

// Guardar clientes en IndexedDB
export const saveClients = async (clients) => {
  try {
    const db = await initClientsDB();
    const tx = db.transaction('clients', 'readwrite', { durability: 'strict' });
    const store = tx.objectStore('clients');

    for (const client of clients) {
      await store.put(client);
    }

    await tx.done;
    console.log("Clientes guardados en IndexedDB.");
  } catch (error) {
    console.error("Error al guardar clientes en IndexedDB:", error);
  }
};

// Obtener clientes desde IndexedDB
export const getClients = async () => {
  try {
    const db = await initClientsDB();
    const tx = db.transaction('clients', 'readonly');
    const store = tx.objectStore('clients');
    return await store.getAll();
  } catch (error) {
    console.error("Error al obtener clientes desde IndexedDB:", error);
    return [];
  }
};

export const saveEvents = async (events) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('events', 'readwrite', { durability: 'strict' });
    const eventStore = tx.objectStore('events');

    // Guardar cada evento en IndexedDB
    for (const event of events) {
      await eventStore.put(event);
    }

    await tx.done;
    console.log("✅ Eventos guardados correctamente en IndexedDB.");
  } catch (error) {
    console.error("❌ Error al guardar eventos en IndexedDB:", error);
  }
};

export const getEvents = async () => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('events', 'readonly');
    const events = await tx.objectStore('events').getAll();

    console.log("📂 Eventos obtenidos desde IndexedDB:", events);
    return events;
  } catch (error) {
    console.error("❌ Error al obtener eventos desde IndexedDB:", error);
    return [];
  }
};

export const saveTechnicians = async (technicians) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('technicians', 'readwrite', { durability: 'strict' });
    const techStore = tx.objectStore('technicians');

    // Guardar cada técnico en IndexedDB
    for (const technician of technicians) {
      await techStore.put(technician);
    }

    await tx.done;
    console.log("✅ Técnicos guardados correctamente en IndexedDB.");
  } catch (error) {
    console.error("❌ Error al guardar técnicos en IndexedDB:", error);
  }
};

export const getTechnicians = async () => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('technicians', 'readonly');
    const technicians = await tx.objectStore('technicians').getAll();

    console.log("📂 Técnicos obtenidos desde IndexedDB:", technicians);
    return technicians;
  } catch (error) {
    console.error("❌ Error al obtener técnicos desde IndexedDB:", error);
    return [];
  }
};


export const saveInspections = async (inspections) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('inspections', 'readwrite', { durability: 'strict' });
    const inspectionStore = tx.objectStore('inspections');

    console.log("🔄 Guardando inspecciones en IndexedDB...", inspections);

    // 🔥 Convertir el objeto de inspecciones en un array plano
    for (const serviceId in inspections) {
      if (Array.isArray(inspections[serviceId])) { // Verifica que sea un array
        for (const inspection of inspections[serviceId]) {
          console.log("➡️ Guardando inspección con service_id:", inspection.service_id, " - ID:", inspection.id);
          await inspectionStore.put(inspection);
        }
      }
    }

    await tx.done;
    console.log("✅ Inspecciones guardadas correctamente en IndexedDB.");
  } catch (error) {
    console.error("❌ Error al guardar inspecciones en IndexedDB:", error);
  }
};

export const getInspections = async () => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('inspections', 'readonly');
    const allInspections = await tx.objectStore('inspections').getAll();

    console.log("📂 Todas las inspecciones en IndexedDB:", allInspections);

    // 🔥 Agrupar inspecciones por `service_id`
    const inspectionsByService = {};
    for (const inspection of allInspections) {
      if (!inspectionsByService[inspection.service_id]) {
        inspectionsByService[inspection.service_id] = [];
      }
      inspectionsByService[inspection.service_id].push(inspection);
    }

    console.log("📂 Inspecciones organizadas por servicio:", inspectionsByService);
    return inspectionsByService;
  } catch (error) {
    console.error("❌ Error al obtener inspecciones desde IndexedDB:", error);
    return {};
  }
};

export const getInspectionById = async (inspectionId) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('inspections', 'readonly');
    const store = tx.objectStore('inspections');

    // Buscar la inspección por ID
    const inspection = await store.get(inspectionId);

    if (inspection) {
      console.log(`🔍 Inspección encontrada con ID ${inspectionId}:`, inspection);
      return inspection;
    } else {
      console.warn(`⚠️ No se encontró la inspección con ID ${inspectionId}`);
      return null;
    }
  } catch (error) {
    console.error(`❌ Error al obtener la inspección con ID ${inspectionId}:`, error);
    return null;
  }
};

export const savePendingInspection = async (inspectionData) => {
  try {
    console.log("📴 Modo offline: generando ID personalizado...");

    // 📌 Generar ID basado en la fecha y hora actual
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Mes empieza desde 0
    const year = String(now.getFullYear()).slice(-2); // Últimos dos dígitos del año
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');

    const generatedId = `offline${day}${month}${year}-${hours}${minutes}`;

    console.log(`✅ ID generado para inspección offline: ${generatedId}`);

    // 📌 Agregar el ID personalizado a la inspección antes de almacenarla
    const inspectionWithId = {
      id: generatedId, // ID generado
      ...inspectionData,
    };

    // 🛢️ Guardar en `pending_inspections`
    const db = await initServicesDB();
    let tx = db.transaction('pending_inspections', 'readwrite');
    let store = tx.objectStore('pending_inspections');
    await store.add(inspectionWithId);
    await tx.done;

    console.log(`✅ Inspección guardada en IndexedDB en 'pending_inspections' con ID: ${generatedId}`);

    // 🛢️ Guardar también en `inspections`
    tx = db.transaction('inspections', 'readwrite');
    store = tx.objectStore('inspections');
    await store.put(inspectionWithId);
    await tx.done;

    console.log(`✅ Inspección guardada en IndexedDB en 'inspections' con ID: ${generatedId}`);

    return generatedId; // Retornar el ID para redirigir en MyServices.js

  } catch (error) {
    console.error("❌ Error al guardar inspección en IndexedDB:", error);
  }
};

export const syncPendingInspections = async (socket) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('pending_inspections', 'readonly');
    const pendingInspections = await tx.objectStore('pending_inspections').getAll();

    if (pendingInspections.length === 0) {
      console.log("✅ No hay inspecciones pendientes por sincronizar.");
      return;
    }

    console.log("🔄 Sincronizando inspecciones pendientes:", pendingInspections);

    for (const inspection of pendingInspections) {
      try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/inspections`, inspection);

        if (response.data.success && response.data.inspection.id) {
          const newId = response.data.inspection.id; // ID generado por el servidor
          console.log(`✅ Inspección ${inspection.id} sincronizada con nuevo ID: ${newId}`);

          // 🛢️ Eliminar inspección sincronizada de `pending_inspections`
          const deleteTx = db.transaction('pending_inspections', 'readwrite');
          await deleteTx.objectStore('pending_inspections').delete(inspection.id);
          await deleteTx.done;

          // 🛢️ Actualizar ID en `inspections`
          const updateTx = db.transaction('inspections', 'readwrite');
          const store = updateTx.objectStore('inspections');
          await store.delete(inspection.id); // Eliminar el antiguo registro
          await store.put({ ...inspection, id: newId }); // Guardar con el nuevo ID
          await updateTx.done;

          console.log(`✅ Inspección con ID ${inspection.id} actualizada a ${newId} en IndexedDB.`);

          // 🔄 ACTUALIZAR TODAS LAS SOLICITUDES QUE USABAN EL ID PROVISIONAL
          await updateRequestsWithNewInspectionId(inspection.id, newId);

          // 📡 Enviar solicitud al backend para que emita el evento del socket
          await axios.post(`${process.env.REACT_APP_API_URL}/api/emit-inspection-update`, {
            oldId: inspection.id,
            newId
          });
          console.log(`📡 Solicitud enviada al backend para emitir evento con oldId: ${inspection.id}, newId: ${newId}`);

        } else {
          console.error(`❌ Error al sincronizar inspección ${inspection.id}:`, response.data.message);
        }
      } catch (error) {
        console.error(`❌ Error en la sincronización de la inspección ${inspection.id}:`, error);
      }
    }

    console.log("✅ Sincronización de inspecciones completada.");
  } catch (error) {
    console.error("❌ Error al sincronizar inspecciones pendientes:", error);
  }
};

// 🔄 Nueva función para actualizar los campos de la inspección en IndexedDB según los datos recibidos
export const updateInspection = async (inspectionId, newObservations, exitTime, findings) => {
  try {
    const db = await initServicesDB();
    const tx = db.transaction('inspections', 'readwrite');
    const store = tx.objectStore('inspections');

    const inspection = await store.get(inspectionId);
    if (!inspection) {
      console.warn(`⚠️ No se encontró la inspección con ID ${inspectionId}`);
      return;
    }

    // Actualizar solo los campos que reciban datos
    if (newObservations !== undefined) {
      inspection.observations = newObservations;
    }
    if (exitTime !== undefined) {
      inspection.exit_time = exitTime;
    }
    if (findings !== undefined) {
      inspection.findings = findings;
    }

    await store.put(inspection);
    await tx.done;

    console.log(`✅ Inspección con ID ${inspectionId} actualizada.`, { observations: newObservations, exit_time: exitTime, findings: findings });
  } catch (error) {
    console.error(`❌ Error al actualizar la inspección con ID ${inspectionId}:`, error);
  }
};


export const initProductsDB = async () => {
  await requestPersistentStorage();          // ya lo tienes arriba
  return openDB('offline-products', 1, {     // nueva BBDD
    upgrade(db) {
      if (!db.objectStoreNames.contains('products')) {
        db.createObjectStore('products', { keyPath: 'id' }); // clave = id del producto
      }
      if (!db.objectStoreNames.contains('pending_products')) {
        db.createObjectStore('pending_products', { keyPath: 'tmpId', autoIncrement: true });
      }
    },
  });
};

export const saveProducts = async (products) => {
  try {
    const db = await initProductsDB();
    const tx = db.transaction('products', 'readwrite', { durability: 'strict' });
    const sto = tx.objectStore('products');

    for (const product of products) {
      await sto.put(product);               // sobrescribe o inserta
    }
    await tx.done;
    console.log('✅ Productos guardados en IndexedDB:', products.length);
  } catch (err) {
    console.error('❌ Error al guardar productos:', err);
  }
};

export const getProducts = async () => {
  try {
    const db = await initProductsDB();
    const tx = db.transaction('products', 'readonly');
    const all = await tx.objectStore('products').getAll();
    console.log('📂 Productos recuperados de IndexedDB:', all.length);
    return all;
  } catch (err) {
    console.error('❌ Error al leer productos:', err);
    return [];
  }
};

export const syncProductsOnStart = async () => {
  if (!navigator.onLine) {
    console.log('📴 Offline: no se sincronizan productos.');
    return;
  }
  try {
    const { data: serverProducts } = await axios.get(`${process.env.REACT_APP_API_URL}/api/products`);
    await saveProducts(serverProducts);
    console.log('✅ Productos sincronizados al iniciar.');
  } catch (err) {
    console.error('❌ Error al sincronizar productos:', err);
  }
};


// 🔄 Manejo de caché mensual
let monthDBPromise = null;

const getMonthDB = async () => {
  if (!monthDBPromise) {
    monthDBPromise = openDB('inspectionCalendar', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('months')) {
          db.createObjectStore('months');
        }
      },
    });
  }
  return monthDBPromise;
};

export const getCachedMonth = async (monthKey) => {
  const db = await getMonthDB();
  return db.get('months', monthKey);
};

export const setCachedMonth = async (monthKey, events) => {
  const db = await getMonthDB();
  return db.put('months', events, monthKey);
};

// 🔄 Cache para lista de servicios
let servicesDBPromise;

const getServicesDB = async () => {
  if (!servicesDBPromise) {
    servicesDBPromise = openDB('serviceList', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('services')) {
          db.createObjectStore('services');
        }
      },
    });
  }
  return servicesDBPromise;
};

export const getCachedServices = async () => {
  const db = await getServicesDB();
  return db.get('services', 'servicesCache');
};

export const setCachedServices = async (services) => {
  const db = await getServicesDB();
  return db.put('services', services, 'servicesCache');
};

/* ---------- guardar todas las estaciones de un cliente --------- */
export const saveStations = async (clientId, stations) => {
  const db = await initServicesDB();
  const tx = db.transaction('stations', 'readwrite', { durability: 'strict' });
  const store = tx.objectStore('stations');

  // añadimos client_id a cada registro por si el backend no lo trae
  for (const st of stations) {
    await store.put({ ...st, client_id: clientId });
  }

  await tx.done;
  console.log(`✅ ${stations.length} estaciones guardadas para cliente ${clientId}`);
};

/* ---------- recuperar por cliente --------- */
export const getStationsByClient = async (clientId) => {
  const db = await initServicesDB();
  const index = db.transaction('stations').objectStore('stations').index('client_id');
  const result = await index.getAll(clientId);
  console.log(`📂 ${result.length} estaciones leídas para cliente ${clientId}`);
  return result;
};

export const syncStationsOnStart = async () => {
  if (!navigator.onLine) {
    console.log('📴 Offline: no se sincronizan estaciones.');
    return;
  }

  try {
    const db = await initServicesDB();
    const clients = await db.transaction('clients').objectStore('clients').getAll();

    for (const { id: clientId } of clients) {
      try {
        const { data: stations } = await axios.get(
          `${process.env.REACT_APP_API_URL}/api/stations/client/${clientId}`
        );
        await saveStations(clientId, stations);
      } catch (e) {
        console.error(`❌ Error trayendo estaciones de cliente ${clientId}:`, e);
      }
    }
    console.log('✅ Estaciones sincronizadas al iniciar.');
  } catch (err) {
    console.error('❌ Error global al sincronizar estaciones:', err);
  }
};

export const getServiceById = async (serviceId) => {
  const db = await initServicesDB();
  return db.transaction('services').objectStore('services').get(serviceId);
};

export const getClientById = async (clientId) => {
  const db = await initServicesDB();
  return db.transaction('clients').objectStore('clients').get(clientId);
};