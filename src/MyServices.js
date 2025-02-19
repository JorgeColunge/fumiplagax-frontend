import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { getServices, saveServices, saveEvents, getEvents, saveTechnicians, getTechnicians, saveInspections, getInspections } from "./indexedDBHandler";
import { Card, Col, Row, Button, Table, Modal, Form, ModalTitle } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Calendar, Person, Bag, Building, PencilSquare, Trash, Bug, Diagram3, GearFill, Clipboard, PlusCircle, InfoCircle, FileText, GeoAlt, PersonFill } from 'react-bootstrap-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';
import ClientInfoModal from './ClientInfoModal'; // Ajusta la ruta según la ubicación del componente
import './ServiceList.css'
import { useSocket } from './SocketContext';

function MyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [clientNames, setClientNames] = useState({});
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';
  const [technicians, setTechnicians] = useState([]);
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [newInspection, setNewInspection] = useState({
    inspection_type: [],
    inspection_sub_type: "",
    date: "",
    time: "",
    duration: "",
    observations: "",
    service_type: "",
    exit_time: "",
  });
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
  });
  const dropdownRef = useRef(null);
  const socket = useSocket();

  const toggleActions = (uniqueKey) => {
    setExpandedCardId((prevKey) => (prevKey === uniqueKey ? null : uniqueKey)); // Alterna el estado abierto/cerrado del menú
  };
  
  const handleClickOutside = (event) => {
    // Si el clic no es dentro del menú desplegable, ciérralo
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpandedCardId(null);
    }
  };

  // Dentro de tu componente MyServices
  const location = useLocation();
  const serviceIdFromState = location.state?.serviceId;

  // Si el estado contiene un serviceId, selecciona automáticamente ese servicio y abre el modal.
  useEffect(() => {
      if (serviceIdFromState) {
          const service = services.find(s => s.id === serviceIdFromState);
          if (service) {
              setSelectedService(service);
              fetchInspections(service.id);
              setShowServiceModal(true);
          }
      }
  }, [serviceIdFromState, services]);
  
  useEffect(() => {
    // Agregar evento de clic al documento cuando hay un menú desplegable abierto
    if (expandedCardId !== null) {
      document.addEventListener("mousedown", handleClickOutside);
    } else {
      document.removeEventListener("mousedown", handleClickOutside);
    }
  
    // Cleanup al desmontar
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [expandedCardId]);

  useEffect(() => {
    if (socket) {
        socket.on("newEvent", async (newEvent) => {
            console.log("Nuevo evento recibido:", newEvent);

            try {
                // Consultar los detalles del evento si no están completos en `newEvent`
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/service-schedule/${newEvent.id}`);
                const detailedEvent = response.data;

                // Formatea el evento y actualiza el estado
                setScheduledEvents((prevEvents) => [
                    ...prevEvents,
                    {
                        ...detailedEvent,
                        start: detailedEvent.start,
                        end: detailedEvent.end,
                        color: detailedEvent.color || '#007bff',
                    },
                ]);

                // Opcional: Mostrar notificación o alerta
                showNotification("Nuevo Evento", "Se ha añadido un nuevo evento al calendario.");
            } catch (error) {
                console.error("Error al obtener detalles del evento:", error);
            }
        });
    }

    // Limpieza al desmontar
    return () => {
        if (socket) {
            socket.off("newEvent");
        }
    };
}, [socket]);

  const handleShowClientModal = (clientId) => {
    setSelectedClientId(clientId);
    setShowClientModal(true);
  };
  
  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setSelectedClientId(null);
  };  

  useEffect(() => {
    const fetchMyServices = async () => {
      try {
        if (navigator.onLine) {
          console.log("🌐 Modo online: obteniendo servicios desde el servidor...");
  
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/services`);
          const userServices = response.data.filter(service => {
            const isResponsible = service.responsible === userId;
            const isCompanion = service.companion?.includes(`"${userId}"`);
            return isResponsible || isCompanion;
          });
  
          console.log("✅ Servicios filtrados para el usuario:", userServices);
  
          // Obtener nombres de los clientes
          const clientData = {};
          for (const service of userServices) {
              if (service.client_id && !clientData[service.client_id]) {
                  try {
                      const clientResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients/${service.client_id}`);
                      clientData[service.client_id] = clientResponse.data.name; // Asegurar que solo se almacene el nombre como string
                  } catch (error) {
                      console.error(`⚠️ Error obteniendo cliente ${service.client_id}:`, error);
                  }
              }
          }
  
          // Guardar en IndexedDB
          await saveServices(userServices, clientData);
          console.log("📥 Servicios y clientes almacenados en IndexedDB.");
  
          // Actualizar el estado con los datos
          setClientNames(clientData);
          setServices(userServices);
        } else {
          console.log("📴 Modo offline: obteniendo datos desde IndexedDB...");
  
          const { services, clients } = await getServices();
  
          console.log("📂 Servicios obtenidos desde IndexedDB:", services);
          console.log("📂 Clientes obtenidos desde IndexedDB:", clients);
  
          if (!services || services.length === 0) {
            console.error("❌ No se encontraron servicios en IndexedDB.");
          }
  
          setClientNames(clients);
          setServices(services);
        }
      } catch (error) {
        console.error("❌ Error al obtener servicios:", error);
        
        if (error instanceof TypeError && error.message.includes("Failed to convert value to 'Response'")) {
          console.error("⚠️ Error del Service Worker detectado: posible fallo de red o solicitud interceptada.");
        }
  
        setLoading(false);
      } finally {
        setLoading(false);
      }
    };
  
    fetchMyServices();
  }, [userId]);

  useEffect(() => {
    const fetchScheduledEvents = async () => {
        try {
            const userServiceIds = services.map(service => service.id).join(",");

            console.log("📌 Lista de service_id del usuario:", userServiceIds);

            if (!userServiceIds) {
                console.log("❌ No hay servicios asignados al usuario. No se solicitarán eventos.");
                return;
            }

            if (navigator.onLine) {
                console.log("🌐 Modo online: obteniendo eventos desde el servidor...");
                const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/service-service-schedule?serviceIds=${userServiceIds}`);

                console.log("✅ Respuesta de la API de eventos:", response.data);

                // Guardar eventos en IndexedDB para uso offline
                await saveEvents(response.data);

                setScheduledEvents(response.data);
            } else {
                console.log("📴 Modo offline: obteniendo eventos desde IndexedDB...");
                const offlineEvents = await getEvents();
                setScheduledEvents(offlineEvents);
            }

        } catch (error) {
            console.error("❌ Error al obtener eventos programados:", error);
        }
    };

    if (services.length > 0) {
        console.log("📢 Se han obtenido servicios, procediendo a solicitar eventos...");
        fetchScheduledEvents();
    } else {
        console.log("⚠️ Aún no hay servicios cargados, esperando actualización...");
    }
}, [services]); // Se ejecuta cuando los servicios cambian

useEffect(() => {
  const fetchTechnicians = async () => {
      try {
          if (navigator.onLine) {
              console.log("🌐 Modo online: obteniendo técnicos desde el servidor...");
              const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?role=Technician`);

              console.log("✅ Respuesta de la API de técnicos:", response.data);

              // Guardar técnicos en IndexedDB para modo offline
              await saveTechnicians(response.data);

              setTechnicians(response.data);
          } else {
              console.log("📴 Modo offline: obteniendo técnicos desde IndexedDB...");
              const offlineTechnicians = await getTechnicians();
              setTechnicians(offlineTechnicians);
          }

      } catch (error) {
          console.error("❌ Error al obtener técnicos:", error);
      }
  };

  fetchTechnicians();
}, []);

  const today = moment().startOf('day');
  const nextWeek = moment().add(7, 'days').endOf('day');

  const filteredScheduledServices = services
    .flatMap(service => {
      const serviceEvents = scheduledEvents
        .filter(event => event.service_id === service.id)
        .filter(event => {
          const eventDate = moment(event.date);
          return eventDate.isBetween(today, nextWeek, null, '[]');
        });

      return serviceEvents.map(event => ({
        ...service,
        scheduledDate: event.date
      }));
    })
    .sort((a, b) => moment(a.scheduledDate) - moment(b.scheduledDate));

  const groupedServicesByDate = filteredScheduledServices.reduce((acc, service) => {
    const dateKey = moment(service.scheduledDate).format('YYYY-MM-DD');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(service);
    return acc;
  }, {});

  const formatDate = (date) => {
    const eventDate = moment(date);
    if (eventDate.isSame(today, 'day')) return 'Hoy';
    if (eventDate.isSame(moment().add(1, 'days'), 'day')) return 'Mañana';
    return eventDate.format('DD-MM-YYYY');
  };

  const fetchInspections = async (serviceId) => {
    try {
        if (navigator.onLine) {
            console.log(`🌐 Modo online: obteniendo inspecciones desde el servidor para el servicio ${serviceId}...`);
            const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/inspections?service_id=${serviceId}`);

            console.log("✅ Respuesta de la API de inspecciones:", response.data);

            // Formatear inspecciones antes de guardar
            const formattedInspections = response.data.map((inspection) => ({
                ...inspection,
                date: moment(inspection.date).format("DD/MM/YYYY"),
                time: inspection.time ? moment(inspection.time, "HH:mm:ss").format("HH:mm") : "--",
                exit_time: inspection.exit_time ? moment(inspection.exit_time, "HH:mm:ss").format("HH:mm") : "--",
                observations: inspection.observations || "Sin observaciones",
            }));

            console.log("📋 Inspecciones formateadas antes de guardar:", formattedInspections);

            // Guardar en IndexedDB
            await saveInspections(formattedInspections);

            setInspections(formattedInspections);
        } else {
            console.log(`📴 Modo offline: obteniendo inspecciones desde IndexedDB para el servicio ${serviceId}...`);
            const offlineInspections = await getInspections(serviceId);
            setInspections(offlineInspections);
        }

    } catch (error) {
        console.error("❌ Error fetching inspections:", error);
    }
};

  const handleServiceClick = (service) => {
    setSelectedService(service);
    fetchInspections(service.id);
    setShowServiceModal(true);
  };

  const handleCloseServiceModal = () => {
    setShowServiceModal(false);
    setSelectedService(null);
    setInspections([]);
  };

  const handleShowAddInspectionModal = () => {
    setNewInspection({
      date: '',
      time: '',
      duration: '',
      observations: '',
      service_type: selectedService?.service_type || '',
      exit_time: '',
    });
    setShowAddInspectionModal(true);
  };

  const handleCloseAddInspectionModal = () => {
    setShowAddInspectionModal(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInspection({ ...newInspection, [name]: value });
  };

  const showNotification = (title, message) => {
    setNotification({ show: true, title, message });
    setTimeout(() => {
      setNotification({ show: false, title, message: '' });
    }, 2500); // 2.5 segundos
  };

  const navigate = useNavigate();

    const handleSaveInspection = async () => {
    if (!Array.isArray(newInspection.inspection_type) || newInspection.inspection_type.length === 0) {
        showNotification("Error","Debe seleccionar al menos un tipo para la Inspección.");
        return;
    }

    if (
        newInspection.inspection_type.includes("Desratización") &&
        !newInspection.inspection_sub_type
    ) {
        showNotification("Error","Debe seleccionar un Sub tipo para Desratización.");
        return;
    }

    const inspectionData = {
        inspection_type: newInspection.inspection_type,
        inspection_sub_type: newInspection.inspection_type.includes("Desratización")
        ? newInspection.inspection_sub_type
        : null, // Enviar null si no aplica
        service_id: selectedService.id,
        date: moment().format("YYYY-MM-DD"), // Fecha actual
        time: moment().format("HH:mm:ss"), // Hora actual
    };

    try {
        const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/inspections`, inspectionData);

        if (response.data.success) {
        showNotification("Exito","Inspección guardada exitosamente");
        fetchInspections(selectedService.id);
        handleCloseAddInspectionModal();

        // Redirigir al componente de inspección con el ID
        navigate(`/inspection/${response.data.inspection.id}`);
        } else {
        console.error(
            "Error: No se pudo guardar la inspección correctamente.",
            response.data.message
        );
        }
    } catch (error) {
        console.error("Error saving inspection:", error);
    }
    }; 

  const parseServiceType = (serviceType) => {
    if (!serviceType) return [];
    return serviceType
      .replace(/[\{\}]/g, '') // Elimina las llaves { y }
      .split(',') // Divide por comas
      .map(type => type.trim()); // Elimina espacios en blanco
  };

  const parseField = (field) => {
    if (!field) return "No especificado";
    try {
      const parsed = JSON.parse(field.replace(/'/g, '"')); // Reemplazar comillas simples por dobles para JSON válido
      if (Array.isArray(parsed)) {
        return parsed.join(", "); // Agregar un espacio después de la coma
      } else if (typeof parsed === "string") {
        return parsed;
      } else {
        return Object.values(parsed).join(", "); // Agregar un espacio después de la coma
      }
    } catch (error) {
      return field.replace(/[\{\}"]/g, "").split(",").join(", "); // Agregar un espacio después de la coma
    }
  };
  
  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }  

  return (
    <div className="container mt-2">
      <Row>
        <Col md={12}>
          {Object.keys(groupedServicesByDate).map(dateKey => (
            <div key={dateKey} className="mb-1">
              <h4 className='pb-2'>{formatDate(dateKey)}</h4>
              <Row style={{ minHeight: 0, height: 'auto' }}>
                {groupedServicesByDate[dateKey].map((service, index) => (
                  <Col md={6} lg={4} xl={4} sm={6} xs={12} key={`${service.id}-${index}`} className="mb-4">
                    <Card
                      className="mb-3 border"
                      style={{ cursor: "pointer", minHeight: "280px", height: "280px" }}
                      onClick={() => handleServiceClick(service)}
                    >
                      <Card.Body>
                        {/* Encabezado: ID y Tipo de Servicio */}
                        <div className="d-flex align-items-center justify-content-between">
                          <div className="flex-grow-1 text-truncate">
                            <span className="fw-bold">{service.id}</span>
                            <span className="text-muted mx-2">|</span>
                            <span className="text-secondary">
                              {service.service_type.replace(/[{}"]/g, "").split(",").join(", ")}
                            </span>
                          </div>
                        </div>
                        <hr />

                        {/* Plagas a Controlar */}
                        <div>
                          <Bug className="text-success me-2" />
                          <span className="text-secondary">
                            {(() => {
                              const pestMatches = service.pest_to_control?.match(/"([^"]+)"/g);
                              const pests = pestMatches ? pestMatches.map((item) => item.replace(/"/g, "")).join(", ") : "No especificado";
                              return pests.length > 20 ? `${pests.slice(0, 20)}...` : pests;
                            })()}
                          </span>
                        </div>

                        {/* Áreas de Intervención */}
                        <div className="mt-2">
                          <Diagram3 className="text-warning me-2" />
                          <span className="text-secondary">
                            {(() => {
                              const areaMatches = service.intervention_areas?.match(/"([^"]+)"/g);
                              const areas = areaMatches ? areaMatches.map((item) => item.replace(/"/g, "")).join(", ") : "No especificadas";
                              return areas.length > 20 ? `${areas.slice(0, 20)}...` : areas;
                            })()}
                          </span>
                        </div>

                        {/* Cliente */}
                        <div className="mt-3">
                          <h6>
                            <Building className="me-2" />
                            {clientNames[service.client_id] || "Cliente Desconocido"}
                          </h6>
                        </div>

                        {/* Responsable */}
                        <div className="mt-3">
                          <h6>
                            <Person />{" "}
                            {technicians.find((tech) => tech.id === service.responsible)?.name || "No asignado"}
                          </h6>
                        </div>
                        
                      </Card.Body>

                      {/* Pie de Tarjeta: Acciones */}
                      <Card.Footer
                        className="text-center position-relative"
                        style={{ background: "#f9f9f9", cursor: "pointer" }}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita redirigir al hacer clic en el botón
                          toggleActions(`${service.id}-${index}`); // Usa la combinación id-index como clave
                        }}
                        ref={expandedCardId === `${service.id}-${index}` ? dropdownRef : null} // Compara con la clave única
                      >
                        <small className="text-success">
                          {expandedCardId === `${service.id}-${index}` ? "Cerrar Acciones" : "Acciones"}
                        </small>
                        {expandedCardId === `${service.id}-${index}` && (
                          <div
                            className={`menu-actions ${
                              expandedCardId === `${service.id}-${index}` ? "expand" : "collapse"
                            }`}
                          >
                            <button
                              className="btn d-block"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedService(service); // Asegúrate de seleccionar el servicio
                                handleShowAddInspectionModal();
                              }}
                            >
                              <PlusCircle size={18} className="me-2" />
                              Añadir Inspección
                            </button>
                          </div>
                        )}
                      </Card.Footer>

                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Col>
      </Row>

      {/* Modal para mostrar los detalles del servicio */}
      <Modal
        show={showServiceModal}
        onHide={handleCloseServiceModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <GearFill className="me-2" /> Detalles del Servicio
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          {selectedService && (
            <div className="d-flex flex-column gap-4">
              {/* Detalles del servicio */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <InfoCircle className="me-2" /> Información General
                </h5>
                <div className="d-flex flex-column gap-2">
                  <p className="my-1"><strong>ID del Servicio:</strong> {selectedService.id}</p>
                  <p className="my-1">
                    <strong>Tipo de Servicio:</strong>{" "}
                    {selectedService.service_type.replace(/[\{\}"]/g, "").split(",").join(", ")}
                  </p>
                  <p className="my-1"><strong>Categoría:</strong> {selectedService.category}</p>
                  <div className='p-0 m-0 d-flex'>
                    <p className="my-1"><strong>Empresa:</strong> {clientNames[selectedService.client_id] || "Cliente Desconocido"}</p>
                    {selectedService.client_id && (
                      <Building
                        className='ms-2 mt-1'
                        style={{cursor: "pointer"}}
                        size={22}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que se activen otros eventos del Card
                          handleShowClientModal(selectedService.client_id);
                        }}
                      />
                    )}
                  </div>
                  <p className="my-1"><strong>Responsable:</strong> {technicians.find((tech) => tech.id === selectedService.responsible)?.name || "No asignado"}</p>
                  {selectedService.companion && selectedService.companion !== "{}" && selectedService.companion !== '{""}' && (
                    <p>
                        <strong>Acompañante(s):</strong>{' '}
                        {(() => {
                            // Convierte la cadena de IDs en un array
                            const companionIds = selectedService.companion
                                .replace(/[\{\}"]/g, '') // Limpia los caracteres `{}`, `"`
                                .split(',')
                                .map((id) => id.trim()); // Divide y recorta espacios
                            // Mapea los IDs a nombres usando el estado `users`
                            const companionNames = companionIds.map((id) => {
                                const tech = technicians.find((tech) => tech.id === id); // Encuentra el usuario por ID
                                return tech ? `${tech.name} ${tech.lastname || ''}`.trim() : `Desconocido (${id})`;
                            });
                            // Devuelve la lista de nombres como texto
                            return companionNames.join(', ');
                        })()}
                    </p>
                  )}
                  {selectedService.category === "Periódico" && (
                    <p><strong>Cantidad al Mes:</strong> {selectedService.quantity_per_month}</p>
                  )}
                  <p><strong>Valor:</strong> ${selectedService.value}</p>
                </div>
              </div>

              {/* Descripción */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <FileText className="me-2" /> Descripción
                </h5>
                <p className="text-muted">{selectedService.description || "No especificada"}</p>
              </div>

              {/* Plagas y Áreas */}
              <div className="d-flex gap-3">
                {/* Plagas */}
                <div className="flex-fill bg-white shadow-sm rounded p-3 w-50">
                  <h5 className="text-secondary mb-3">
                    <Bug className="me-2" /> Plagas
                  </h5>
                  <p>
                    {(() => {
                      const pestMatches = selectedService.pest_to_control?.match(/"([^"]+)"/g);
                      return pestMatches
                        ? pestMatches.map((item) => item.replace(/"/g, "")).join(", ")
                        : "No especificado";
                    })()}
                  </p>
                </div>

                {/* Áreas */}
                <div className="flex-fill bg-white shadow-sm rounded p-3 w-50">
                  <h5 className="text-secondary mb-3">
                    <GeoAlt className="me-2" /> Áreas de Intervención
                  </h5>
                  <p>
                    {(() => {
                      const areaMatches = selectedService.intervention_areas?.match(/"([^"]+)"/g);
                      return areaMatches
                        ? areaMatches.map((item) => item.replace(/"/g, "")).join(", ")
                        : "No especificadas";
                    })()}
                  </p>
                </div>
              </div>

              {/* Tabla de inspecciones */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <Clipboard className="me-2" /> Inspecciones
                </h5>
                {inspections.length > 0 ? (
                  <div className="custom-table-container">
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Inicio</th>
                        <th>Finalización</th>
                        <th>Observaciones</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((inspection) => (
                        <tr key={inspection.id} onClick={() => navigate(`/inspection/${inspection.id}`)}>
                          <td>{inspection.id}</td>
                          <td>{inspection.date}</td>
                          <td>{inspection.time}</td>
                          <td>{inspection.exit_time}</td>
                          <td>{inspection.observations}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>                  
                ) : (
                  <p>No hay inspecciones registradas para este servicio.</p>
                )}
              </div>

              {/* Botón para añadir inspección */}
              <div className="text-center">
                <Button variant="outline-success" onClick={handleShowAddInspectionModal}>
                  <PlusCircle className="me-2" />
                  Añadir Inspección
                </Button>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={handleCloseServiceModal}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para añadir una nueva inspección */}
      <Modal show={showAddInspectionModal} onHide={handleCloseAddInspectionModal}>
        <Modal.Header closeButton>
            <Modal.Title>Añadir Inspección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
            <Form>
            {/* Selección de Tipo de Inspección */}
            <Form.Group controlId="formInspectionType" className="mt-3">
                <Form.Label>Tipo de Inspección</Form.Label>
                <div>
                {parseServiceType(selectedService?.service_type || "").map((type, idx) => (
                    <Form.Check
                    key={idx}
                    type="checkbox"
                    label={type.replace(/"/g, "")} // Elimina comillas en el texto
                    value={type.replace(/"/g, "")} // Elimina comillas en el valor
                    onChange={(e) => {
                        const { value, checked } = e.target;
                        setNewInspection((prevInspection) => ({
                        ...prevInspection,
                        inspection_type: checked
                            ? [...(prevInspection.inspection_type || []), value]
                            : prevInspection.inspection_type.filter((t) => t !== value),
                        }));
                    }}
                    />
                ))}
                </div>
            </Form.Group>

            {/* Sub tipo de inspección */}
            {Array.isArray(newInspection.inspection_type) &&
            newInspection.inspection_type.includes("Desratización") && (
                <Form.Group controlId="formInspectionSubType" className="mt-3">
                <Form.Label>Sub tipo</Form.Label>
                <Form.Control
                    as="select"
                    value={newInspection.inspection_sub_type}
                    onChange={(e) =>
                    setNewInspection((prevInspection) => ({
                        ...prevInspection,
                        inspection_sub_type: e.target.value,
                    }))
                    }
                >
                    <option value="">Seleccione una opción</option>
                    <option value="Control">Control</option>
                    <option value="Seguimiento">Seguimiento</option>
                </Form.Control>
                </Form.Group>
            )}
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="dark" onClick={handleCloseAddInspectionModal}>
            Cancelar
            </Button>
            <Button variant="success" onClick={handleSaveInspection}>
            Guardar Inspección
            </Button>
        </Modal.Footer>
        </Modal>

        <Modal
        show={notification.show}
        onHide={() => setNotification({ show: false, title:'', message: '' })}
        centered
        backdrop="static"
        keyboard={false}
      >
        <ModalTitle>
        <p className="m-0">{notification.title}</p>
        </ModalTitle>
        <Modal.Body className="text-center">
          <p className="m-0">{notification.message}</p>
        </Modal.Body>
      </Modal>

      <ClientInfoModal
        clientId={selectedClientId}
        show={showClientModal}
        onClose={handleCloseClientModal}
      />

    </div>
  );
}

export default MyServices;