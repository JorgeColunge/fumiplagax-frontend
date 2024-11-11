import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { Button, Table, InputGroup, FormControl, Modal, Form } from 'react-bootstrap';
import api from './Api'; // Usa el archivo de API con lógica offline integrada
import { saveRequest, isOffline } from './offlineHandler';
import { initDB, initUsersDB, saveUsers, getUsers } from './indexedDBHandler';

function Inspection() {
  const { inspectionId } = useParams();
  const [inspectionData, setInspectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generalObservations, setGeneralObservations] = useState('');
  const [findingsByType, setFindingsByType] = useState({});
  const [productsByType, setProductsByType] = useState({});
  const [availableProducts, setAvailableProducts] = useState([]);
  const [stations, setStations] = useState([]); // Estado para estaciones
  const [clientStations, setClientStations] = useState({}); // Estado para hallazgos en estaciones
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [currentStationId, setCurrentStationId] = useState(null);
  const [stationFinding, setStationFinding] = useState({
    purpose: 'Consumo', // Valor predeterminado
    consumptionAmount: 'Nada', // Valor predeterminado
    captureQuantity: '',
    marked: 'Si', // Valor predeterminado
    physicalState: 'Buena', // Valor predeterminado
    damageLocation: '',
    requiresChange: 'No', // Valor predeterminado
    changePriority: 'No', // Valor predeterminado
    description: '', // Nuevo campo
    photo: null,
  });  
  const [stationModalOpenDesinsectacion, setStationModalOpenDesinsectacion] = useState(false);
  const [currentStationIdDesinsectacion, setCurrentStationIdDesinsectacion] = useState(null);
  const [stationFindingDesinsectacion, setStationFindingDesinsectacion] = useState({
    captureQuantity: '',
    physicalState: 'Buena', // Default: Buena
    damageLocation: '',
    requiresChange: 'No', // Default: No
    changePriority: 'No', // Default: No
    description: '',
    photo: null,
  });



  useEffect(() => {
    const fetchInspectionData = async () => {
      try {
        const response = await api.get(`http://localhost:10000/api/inspections/${inspectionId}`);
        setInspectionData(response.data);
  
        // Cargar observaciones generales
        setGeneralObservations(response.data.observations || '');
  
        // Inicializar findingsByType y productsByType con los datos existentes o vacíos
        const initialFindings = response.data.findings?.findingsByType || {};
        const initialProducts = response.data.findings?.productsByType || {};
  
        // Preprocesar imágenes para findingsByType
        Object.keys(initialFindings).forEach((type) => {
          initialFindings[type] = initialFindings[type].map((finding) => ({
            ...finding,
            photo: finding.photo ? `http://localhost:10000${finding.photo}` : null, // Agregar prefijo si existe la foto
          }));
        });
  
        // Establecer estado inicial para los hallazgos
        setFindingsByType(initialFindings);
        setProductsByType(initialProducts);
  
        // Preprocesar estaciones y sus hallazgos
        const initialStationsFindings = response.data.findings?.stationsFindings || [];
        const clientStationsData = {};
        initialStationsFindings.forEach((finding) => {
          clientStationsData[finding.stationId] = {
            ...finding,
            photo: finding.photo ? `http://localhost:10000${finding.photo}` : null, // Agregar prefijo si existe la foto
          };
        });
  
        setClientStations(clientStationsData);
  
        // Cargar estaciones relacionadas (si existen)
        const clientId = response.data.service_id
          ? (await api.get(`http://localhost:10000/api/services/${response.data.service_id}`)).data
              .client_id
          : null;
  
        if (clientId) {
          const stationsResponse = await api.get(
            `http://localhost:10000/api/stations/client/${clientId}`
          );
          setStations(stationsResponse.data);
        }
  
        setLoading(false);
      } catch (error) {
        console.error('Error fetching inspection data:', error);
        setLoading(false);
      }
    };
  
    const fetchProducts = async () => {
      try {
        const response = await api.get('http://localhost:10000/api/products');
        setAvailableProducts(response.data);
      } catch (error) {
        console.error('Error fetching products:', error);
      }
    };
  
    fetchInspectionData();
    fetchProducts();
  }, [inspectionId]);

  useEffect(() => {
    return () => {
      if (stationFinding.photo) {
        URL.revokeObjectURL(stationFinding.photo);
      }
      if (stationFindingDesinsectacion.photo) {
        URL.revokeObjectURL(stationFindingDesinsectacion.photo);
      }
    };
  }, [stationFinding.photo, stationFindingDesinsectacion.photo]);

  const detectChanges = () => {
  const changes = {
    generalObservations: generalObservations !== inspectionData?.observations,
    findingsByType: JSON.stringify(findingsByType) !== JSON.stringify(inspectionData?.findings?.findingsByType),
    productsByType: JSON.stringify(productsByType) !== JSON.stringify(inspectionData?.findings?.productsByType),
    stationsFindings: JSON.stringify(clientStations) !== JSON.stringify(
      inspectionData?.findings?.stationsFindings.reduce((acc, finding) => {
        acc[finding.stationId] = finding;
        return acc;
      }, {})
    ),
  };

  console.log('Cambios detectados:', changes);
  return Object.values(changes).some((change) => change); // Retorna true si hay algún cambio
};


const handleSaveChanges = async () => {
  try {
    const formData = new FormData();

    formData.append('inspectionId', inspectionId);
    formData.append('generalObservations', generalObservations);
    formData.append('findingsByType', JSON.stringify(findingsByType));
    formData.append('productsByType', JSON.stringify(productsByType));

    // Convertir stationsFindings en un array
    const stationsFindingsArray = Object.entries(clientStations).map(([stationId, finding]) => ({
      stationId,
      ...finding,
    }));

    formData.append('stationsFindings', JSON.stringify(stationsFindingsArray));

    // Mapear imágenes de findings y estaciones
    Object.keys(findingsByType).forEach((type) => {
      findingsByType[type].forEach((finding) => {
        if (finding.photoBlob) {
          formData.append('images', finding.photoBlob, `${finding.id}.jpg`);
        }
      });
    });

    stationsFindingsArray.forEach((finding) => {
      if (finding.photoBlob) {
        formData.append('images', finding.photoBlob, `${finding.stationId}.jpg`);
      }
    });

    // Enviar datos al backend
    await api.post(`/inspections/${inspectionId}/save`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });

    alert('Cambios guardados exitosamente.');
  } catch (error) {
    console.error('Error guardando los cambios:', error);

    if (error.message.includes('Offline')) {
      alert(
        'Cambios guardados localmente. Se sincronizarán automáticamente cuando vuelva la conexión.'
      );
    } else {
      alert('Hubo un error al guardar los cambios.');
    }
  }
};

  const handleStationChange = (stationId, field, value) => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [stationId]: { ...prevStations[stationId], [field]: value },
    }));
  };

  const handleAddFinding = (type) => {
    setFindingsByType((prevFindings) => ({
      ...prevFindings,
      [type]: [
        ...(prevFindings[type] || []),
        { id: Date.now(), place: '', description: '', photo: null },
      ],
    }));
  };
  

  const handleFindingChange = (type, index, field, value) => {
    setFindingsByType((prevFindings) => {
      const updatedFindings = [...prevFindings[type]];
      updatedFindings[index] = { ...updatedFindings[index], [field]: value };
      return { ...prevFindings, [type]: updatedFindings };
    });
  };

  const handleFindingPhotoChange = (type, index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error('No se seleccionó un archivo válido o no es una imagen.');
      alert('Seleccione un archivo válido de tipo imagen.');
      return;
    }
  
    const photoURL = URL.createObjectURL(file);
  
    setFindingsByType((prevFindings) => {
      const updatedFindings = [...prevFindings[type]];
      updatedFindings[index] = {
        ...updatedFindings[index],
        photo: photoURL, // URL para previsualización
        photoBlob: file, // Asegúrate de guardar el archivo como File
      };
      return { ...prevFindings, [type]: updatedFindings };
    });
  
    console.log(`Imagen seleccionada para tipo ${type}, índice ${index}:`, file);
  };    

  const handleProductChange = (type, field, value) => {
    setProductsByType((prevProducts) => ({
      ...prevProducts,
      [type]: { ...prevProducts[type], [field]: value },
    }));
  };

  const getFilteredProducts = (type) => {
    if (!availableProducts || !type) {
      console.log("No hay productos disponibles o el tipo está vacío.");
      return [];
    }
  
    return availableProducts.filter((product) => {
      console.log("Producto evaluado:", product);
  
      if (!product.category) {
        console.log("Producto omitido porque no tiene categoría:", product);
        return false; // Si el producto no tiene categoría, lo omitimos
      }
  
      try {
        // Limpiar las llaves y comillas en la categoría
        const cleanedCategory = product.category.replace(/[\{\}"]/g, "").split(",").map((cat) => cat.trim());
        console.log("Categorías procesadas:", cleanedCategory);
  
        // Verificar si alguna categoría coincide con el tipo de inspección
        return cleanedCategory.some(
          (category) => category.toLowerCase() === type.toLowerCase()
        );
      } catch (error) {
        console.error(
          "Error al procesar la categoría del producto:",
          product.category,
          error
        );
        return false; // Si ocurre un error, omitimos el producto
      }
    });
  };

  const handleOpenStationModal = (stationId) => {
    setCurrentStationId(stationId);
    setStationModalOpen(true);
  };
  
  const handleCloseStationModal = () => {
    setCurrentStationId(null);
    setStationModalOpen(false);
    setStationFinding({
      purpose: 'Consumo',
      consumptionAmount: 'Nada',
      captureQuantity: '',
      marked: 'No',
      physicalState: 'Buena',
      damageLocation: '',
      requiresChange: 'No',
      changePriority: 'No',
      photo: null,
    });
  };
  
  const handleStationFindingChange = (field, value) => {
    setStationFinding((prevFinding) => ({
      ...prevFinding,
      [field]: value,
      id: prevFinding.id || Date.now(), // Asegurar que cada hallazgo tenga un id único
    }));
  };
  

  const handleStationFindingPhotoChange = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      console.error("No se seleccionó un archivo válido o no es una imagen.");
      alert("Seleccione un archivo válido de tipo imagen.");
      return;
    }
  
    const photoURL = URL.createObjectURL(file);
  
    setStationFinding((prevFinding) => ({
      ...prevFinding,
      photo: photoURL, // URL para previsualización
      photoBlob: file, // Blob para guardar offline o enviar online
    }));
  }; 
  
  
  const handleSaveStationFinding = () => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [currentStationId]: { ...stationFinding },
    }));
    handleCloseStationModal();
  };
  
  const handleSaveStationFindingDesinsectacion = () => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [currentStationIdDesinsectacion]: { ...stationFindingDesinsectacion },
    }));
    handleCloseStationModalDesinsectacion();
  };
   

  const handleOpenStationModalDesinsectacion = (stationId) => {
    setCurrentStationIdDesinsectacion(stationId);
    setStationModalOpenDesinsectacion(true);
  };
  
  const handleCloseStationModalDesinsectacion = () => {
    setCurrentStationIdDesinsectacion(null);
    setStationModalOpenDesinsectacion(false);
    setStationFindingDesinsectacion({
      captureQuantity: '',
      physicalState: 'Buena',
      damageLocation: '',
      requiresChange: 'No',
      changePriority: 'No',
      description: '',
      photo: null,
    });
  };
  
  const handleStationFindingChangeDesinsectacion = (field, value) => {
    setStationFindingDesinsectacion((prevFinding) => ({
      ...prevFinding,
      [field]: value,
    }));
  };
  
  const handleStationFindingPhotoChangeDesinsectacion = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      console.error("No se seleccionó un archivo válido o no es una imagen.");
      alert("Seleccione un archivo válido de tipo imagen.");
      return;
    }
  
    const photoURL = URL.createObjectURL(file);
  
    setStationFindingDesinsectacion((prevFinding) => ({
      ...prevFinding,
      photo: photoURL, // URL para previsualización
      photoBlob: file, // Blob para guardar offline o enviar online
    }));
  };

  const saveStationFindingOffline = async (stationId, finding) => {
    const db = await initDB();
    const tx = db.transaction("stationFindings", "readwrite");
    const store = tx.objectStore("stationFindings");
  
    await store.put({
      id: stationId,
      ...finding,
      photoBlob: finding.photoBlob ? new Blob([finding.photoBlob], { type: "image/jpeg" }) : null,
    });
  
    await tx.done;
    console.log("Hallazgo guardado offline para estación:", stationId);
  };  

  const syncStationFindings = async () => {
    const db = await initDB();
    const tx = db.transaction("stationFindings", "readonly");
    const store = tx.objectStore("stationFindings");
    const findings = await store.getAll();
  
    for (const finding of findings) {
      const formData = new FormData();
      formData.append("stationId", finding.id);
      formData.append("description", finding.description || "");
      if (finding.photoBlob) {
        formData.append("photo", finding.photoBlob, `${finding.id}.jpg`);
      }
  
      try {
        await api.post("/station/findings", formData);
        console.log(`Hallazgo sincronizado para estación: ${finding.id}`);
      } catch (error) {
        console.error(`Error al sincronizar hallazgo para estación ${finding.id}:`, error);
      }
    }
  }; 
  

  if (loading) return <div>Cargando detalles de la inspección...</div>;

  if (!inspectionData)
    return (
      <div className="alert alert-danger" role="alert">
        No se encontró información de la inspección.
      </div>
    );

  const { inspection_type, inspection_sub_type, date, time, service_id } = inspectionData;

  const parsedInspectionTypes = inspection_type
    ? inspection_type.split(",").map((type) => type.trim())
    : [];

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Detalles de la Inspección</h2>

      {/* Sección General */}
      <div className="card border-dark mb-3">
        <div className="card-header">General</div>
        <div className="card-body">
          <h5 className="card-title">Información General</h5>
          <p><strong>ID de la Inspección:</strong> {inspectionId}</p>
          <p><strong>Fecha:</strong> {date}</p>
          <p><strong>Hora:</strong> {time}</p>
          <p><strong>ID del Servicio Relacionado:</strong> {service_id}</p>
          <div className="mt-3">
            <label htmlFor="generalObservations" className="form-label">
              Observaciones Generales:
            </label>
            <textarea
              id="generalObservations"
              className="form-control"
              rows="4"
              value={generalObservations}
              onChange={(e) => setGeneralObservations(e.target.value)}
              placeholder="Ingrese sus observaciones generales aquí"
            ></textarea>
          </div>
        </div>
      </div>

      {/* Secciones por Tipo de Inspección */}
      {parsedInspectionTypes.map((type, index) => (
        <div className="card border-primary mb-3" key={index}>
          <div className="card-header">{type}</div>
          <div className="card-body">
            <h5 className="card-title">{`Detalles Específicos de ${type}`}</h5>

            {type === 'Desratización' && stations.length > 0 && (
            <div className="mt-3">
                <h6>Hallazgos en Estaciones ({type})</h6>
                <div className="table-responsive">
                <table className="table table-bordered">
                    <thead>
                    <tr>
                        <th>Estación</th>
                        <th>Finalidad</th>
                        <th>Estado Físico</th>
                        <th>Descripción</th>
                        <th>Foto</th>
                        <th>Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {stations
                        .filter((station) => station.category === 'Roedores')
                        .map((station) => (
                        <tr key={station.id}>
                            <td>{station.name || `Estación ${station.id}`}</td>
                            {clientStations[station.id] ? (
                            <>
                                <td>{clientStations[station.id].purpose || '-'}</td>
                                <td>{clientStations[station.id].physicalState || '-'}</td>
                                <td>{clientStations[station.id].description || '-'}</td>
                                <td>
                                {clientStations[station.id].photo ? (
                                    <img
                                    src={clientStations[station.id].photo}
                                    alt="Foto"
                                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    '-'
                                )}
                                </td>
                                <td>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleOpenStationModal(station.id)}
                                >
                                    Editar
                                </button>
                                </td>
                            </>
                            ) : (
                            <>
                                <td colSpan="4">Sin hallazgo reportado</td>
                                <td>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleOpenStationModal(station.id)}
                                >
                                    +
                                </button>
                                </td>
                            </>
                            )}
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}

            {type === 'Desinsectación' && stations.length > 0 && (
            <div className="mt-3">
                <h6>Hallazgos en Estaciones ({type})</h6>
                <div className="table-responsive">
                <table className="table table-bordered">
                    <thead>
                    <tr>
                        <th>Estación</th>
                        <th>Cantidad de Capturas</th>
                        <th>Estado Físico</th>
                        <th>Descripción</th>
                        <th>Foto</th>
                        <th>Acciones</th>
                    </tr>
                    </thead>
                    <tbody>
                    {stations
                        .filter((station) => station.category === 'Aéreas')
                        .map((station) => (
                        <tr key={station.id}>
                            <td>{station.name || `Estación ${station.id}`}</td>
                            {clientStations[station.id] ? (
                            <>
                                <td>{clientStations[station.id].captureQuantity || '-'}</td>
                                <td>{clientStations[station.id].physicalState || '-'}</td>
                                <td>{clientStations[station.id].description || '-'}</td>
                                <td>
                                {clientStations[station.id].photo ? (
                                    <img
                                    src={clientStations[station.id].photo}
                                    alt="Foto"
                                    style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                                    />
                                ) : (
                                    '-'
                                )}
                                </td>
                                <td>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                >
                                    Editar
                                </button>
                                </td>
                            </>
                            ) : (
                            <>
                                <td colSpan="4">Sin hallazgo reportado</td>
                                <td>
                                <button
                                    className="btn btn-outline-primary"
                                    onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                >
                                    +
                                </button>
                                </td>
                            </>
                            )}
                        </tr>
                        ))}
                    </tbody>
                </table>
                </div>
            </div>
            )}

            {/* Hallazgos */}
            <h6>Hallazgos</h6>
            <div className="table-responsive">
              <table className="table table-bordered">
                <thead>
                  <tr>
                    <th style={{ width: "20%" }}>Lugar</th>
                    <th style={{ width: "50%" }}>Descripción</th>
                    <th style={{ width: "30%" }}>Foto</th>
                  </tr>
                </thead>
                <tbody>
                {(findingsByType[type] || []).map((finding, idx) => (
                    <tr key={idx}>
                      <td>
                        <input
                          type="text"
                          className="form-control"
                          value={finding.place}
                          onChange={(e) => handleFindingChange(type, idx, 'place', e.target.value)}
                          placeholder="Lugar"
                        />
                      </td>
                      <td>
                        <textarea
                          className="form-control"
                          rows="2"
                          value={finding.description}
                          onChange={(e) => handleFindingChange(type, idx, 'description', e.target.value)}
                          placeholder="Descripción"
                        ></textarea>
                      </td>
                      <td>
                        <div className="d-flex flex-column align-items-center">
                          <input
                            type="file"
                            className="form-control mb-2"
                            onChange={(e) => handleFindingPhotoChange(type, idx, e.target.files[0])}
                          />
                          {finding.photo && (
                            <img
                              src={finding.photo}
                              alt={`Preview ${idx}`}
                              style={{ width: "100px", height: "100px", objectFit: "cover" }}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <button
              className="btn btn-outline-primary mb-3"
              onClick={() => handleAddFinding(type)}
            >
              + Agregar Hallazgo
            </button>

            {/* Producto */}
            <h6>Producto</h6>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label htmlFor={`product-${type}`} className="form-label">
                  Producto
                </label>
                <select
                  id={`product-${type}`}
                  className="form-select"
                  value={productsByType[type]?.product || ''}
                  onChange={(e) => handleProductChange(type, 'product', e.target.value)}
                >
                  <option value="">Seleccione un producto</option>
                  {getFilteredProducts(type).map((product) => (
                    <option key={product.id} value={product.name}>
                      {product.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="col-md-6 mb-3">
                <label htmlFor={`dosage-${type}`} className="form-label">
                  Dosificación (en gramos/ml)
                </label>
                <input
                  id={`dosage-${type}`}
                  type="number"
                  className="form-control"
                  value={productsByType[type]?.dosage || ''}
                  onChange={(e) => handleProductChange(type, 'dosage', e.target.value)}
                  placeholder="Ingrese la dosificación"
                />
              </div>
            </div>
          </div>
        </div>
      ))}

      {/* Botón para guardar cambios */}
      <div className="text-end mt-4">
        <button className="btn btn-success" onClick={handleSaveChanges}>
            Guardar Cambios
        </button>
      </div>

      <Modal show={stationModalOpen} onHide={handleCloseStationModal} size="lg">
        <Modal.Header closeButton>
            <Modal.Title>Agregar Hallazgo para la Estación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="mb-3">
            <label className="form-label">Finalidad</label>
            <select
                className="form-select"
                value={stationFinding.purpose}
                onChange={(e) => handleStationFindingChange('purpose', e.target.value)}
            >
                <option value="Consumo">Consumo</option>
                <option value="Captura">Captura</option>
            </select>
            </div>
            {stationFinding.purpose === 'Consumo' && (
            <div className="mb-3">
                <label className="form-label">Cantidad de Consumo</label>
                <select
                className="form-select"
                value={stationFinding.consumptionAmount}
                onChange={(e) => handleStationFindingChange('consumptionAmount', e.target.value)}
                >
                <option value="Nada">Nada</option>
                <option value="1/4">1/4</option>
                <option value="1/2">1/2</option>
                <option value="3/4">3/4</option>
                <option value="Todo">Todo</option>
                </select>
            </div>
            )}
            {stationFinding.purpose === 'Captura' && (
            <div className="mb-3">
                <label className="form-label">Cantidad de Capturas</label>
                <input
                type="number"
                className="form-control"
                value={stationFinding.captureQuantity}
                onChange={(e) => handleStationFindingChange('captureQuantity', e.target.value)}
                />
            </div>
            )}
            <div className="mb-3">
            <label className="form-label">Señalizada</label>
            <select
                className="form-select"
                value={stationFinding.marked}
                onChange={(e) => handleStationFindingChange('marked', e.target.value)}
            >
                <option value="Si">Si</option>
                <option value="No">No</option>
            </select>
            </div>
            <div className="mb-3">
            <label className="form-label">Estado Físico</label>
            <select
                className="form-select"
                value={stationFinding.physicalState}
                onChange={(e) => handleStationFindingChange('physicalState', e.target.value)}
            >
                <option value="Buena">Buena</option>
                <option value="Dañada">Dañada</option>
                <option value="Faltante">Faltante</option>
            </select>
            </div>
            {stationFinding.physicalState === 'Dañada' && (
            <>
                <div className="mb-3">
                <label className="form-label">Lugar del Daño</label>
                <select
                    className="form-select"
                    value={stationFinding.damageLocation}
                    onChange={(e) => handleStationFindingChange('damageLocation', e.target.value)}
                >
                    <option value="Cuerpo">Cuerpo</option>
                    <option value="Tapa">Tapa</option>
                    <option value="Sticker">Sticker</option>
                    <option value="Tablero">Tablero</option>
                </select>
                </div>
                <div className="mb-3">
                <label className="form-label">Requiere Cambio</label>
                <select
                    className="form-select"
                    value={stationFinding.requiresChange}
                    onChange={(e) => handleStationFindingChange('requiresChange', e.target.value)}
                >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                </select>
                </div>
                {stationFinding.requiresChange === 'Si' && (
                <div className="mb-3">
                    <label className="form-label">Prioridad de Cambio</label>
                    <select
                    className="form-select"
                    value={stationFinding.changePriority}
                    onChange={(e) => handleStationFindingChange('changePriority', e.target.value)}
                    >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                    </select>
                </div>
                )}
            </>
            )}
            <div className="mb-3">
            <label className="form-label">Descripción</label>
            <textarea
                className="form-control"
                rows="3"
                value={stationFinding.description || ''}
                
                onChange={(e) => handleStationFindingChange('description', e.target.value)}
                placeholder="Ingrese una descripción del hallazgo"
            ></textarea>
            </div>
            <div className="mb-3">
            <label className="form-label">Fotografía</label>
            <input
              type="file"
              className="form-control"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleStationFindingPhotoChange(file);
              }}
            />
            {stationFinding.photo && (
                <img
                src={stationFinding.photo}
                alt="Preview"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                className="mt-2"
                />
            )}
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="btn btn-secondary" onClick={handleCloseStationModal}>
            Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveStationFinding}>
            Guardar Hallazgo
            </button>
        </Modal.Footer>
        </Modal>

        <Modal show={stationModalOpenDesinsectacion} onHide={handleCloseStationModalDesinsectacion} size="lg">
        <Modal.Header closeButton>
            <Modal.Title>Agregar Hallazgo para la Estación (Desinsectación)</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <div className="mb-3">
            <label className="form-label">Cantidad de Capturas</label>
            <input
                type="number"
                className="form-control"
                value={stationFindingDesinsectacion.captureQuantity}
                onChange={(e) => handleStationFindingChangeDesinsectacion('captureQuantity', e.target.value)}
                placeholder="Ingrese la cantidad de capturas"
            />
            </div>
            <div className="mb-3">
            <label className="form-label">Estado Físico</label>
            <select
                className="form-select"
                value={stationFindingDesinsectacion.physicalState}
                onChange={(e) => handleStationFindingChangeDesinsectacion('physicalState', e.target.value)}
            >
                <option value="Buena">Buena</option>
                <option value="Dañada">Dañada</option>
                <option value="Faltante">Faltante</option>
            </select>
            </div>
            {stationFindingDesinsectacion.physicalState === 'Dañada' && (
            <>
                <div className="mb-3">
                <label className="form-label">Lugar del Daño</label>
                <select
                    className="form-select"
                    value={stationFindingDesinsectacion.damageLocation}
                    onChange={(e) => handleStationFindingChangeDesinsectacion('damageLocation', e.target.value)}
                >
                    <option value="Marco">Marco</option>
                    <option value="Estacas">Estacas</option>
                    <option value="Lamina">Lámina</option>
                </select>
                </div>
                <div className="mb-3">
                <label className="form-label">Requiere Cambio</label>
                <select
                    className="form-select"
                    value={stationFindingDesinsectacion.requiresChange}
                    onChange={(e) => handleStationFindingChangeDesinsectacion('requiresChange', e.target.value)}
                >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                </select>
                </div>
                {stationFindingDesinsectacion.requiresChange === 'Si' && (
                <div className="mb-3">
                    <label className="form-label">Prioridad de Cambio</label>
                    <select
                    className="form-select"
                    value={stationFindingDesinsectacion.changePriority}
                    onChange={(e) => handleStationFindingChangeDesinsectacion('changePriority', e.target.value)}
                    >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                    </select>
                </div>
                )}
            </>
            )}
            <div className="mb-3">
            <label className="form-label">Descripción</label>
            <textarea
                className="form-control"
                rows="3"
                value={stationFindingDesinsectacion.description}
                onChange={(e) => handleStationFindingChangeDesinsectacion('description', e.target.value)}
                placeholder="Ingrese una descripción del hallazgo"
            ></textarea>
            </div>
            <div className="mb-3">
            <label className="form-label">Fotografía</label>
            <input
              type="file"
              className="form-control"
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) handleStationFindingPhotoChangeDesinsectacion(file);
              }}
            />
            {stationFindingDesinsectacion.photo && (
                <img
                src={stationFindingDesinsectacion.photo}
                alt="Preview"
                style={{ width: '100px', height: '100px', objectFit: 'cover' }}
                className="mt-2"
                />
            )}
            </div>
        </Modal.Body>
        <Modal.Footer>
            <button className="btn btn-secondary" onClick={handleCloseStationModalDesinsectacion}>
            Cancelar
            </button>
            <button className="btn btn-primary" onClick={handleSaveStationFindingDesinsectacion}>
            Guardar Hallazgo
            </button>
        </Modal.Footer>
        </Modal>
    </div>
  );
}

export default Inspection;
