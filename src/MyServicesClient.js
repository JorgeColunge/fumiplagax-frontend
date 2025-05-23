import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Button, Table, Modal, Form, ModalTitle } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { Calendar, Person, Bag, Building, PencilSquare, Trash, Bug, Diagram3, GearFill, Clipboard, PlusCircle, InfoCircle, FileText, GeoAlt, PersonFill, Calendar2Check, SendPlus } from 'react-bootstrap-icons';
import { useNavigate, useLocation } from 'react-router-dom';
import ClientInfoModal from './ClientInfoModal'; // Ajusta la ruta según la ubicación del componente
import './ServiceList.css'
import { useSocket } from './SocketContext';

function MyServicesClient() {
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
  const [newService, setNewService] = useState({
      service_type: [],
      description: '',
      pest_to_control: '',
      intervention_areas: '',
      responsible: '',
      category: '',
      quantity_per_month: '',
      date: '',
      time: '',
      client_id: userId,
      value: '',
      companion: [],
      created_by: userId,
      created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual al abrir el modal
    });
  const dropdownRef = useRef(null);
  const socket = useSocket();
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const handleShowAddServiceModal = () => setShowAddServiceModal(true);
  const handleCloseAddServiceModal = () => setShowAddServiceModal(false);
  const serviceOptions = [
    "Desinsectación",
    "Desratización",
    "Desinfección",
    "Roceria",
    "Limpieza y aseo de archivos",
    "Lavado shut basura",
    "Encarpado",
    "Lavado de tanque",
    "Inspección",
    "Diagnostico"
  ];
  // Opciones de Áreas de Intervención ordenadas alfabéticamente
const interventionAreaOptions = [
    "Área caja",
    "Área de lavado",
    "Baños",
    "Bodega",
    "Cajas eléctricas",
    "Cocina",
    "Comedor",
    "Cubierta",
    "Cuartos de residuos",
    "Entretechos",
    "Equipos",
    "Exteriores",
    "Lokers",
    "Muebles",
    "Necera",
    "Oficinas",
    "Producción",
    "Servicio al cliente",
    "Shot de basuras"
  ];
  // Estado para las opciones visibles de "Plaga a Controlar"
      const [visiblePestOptions, setVisiblePestOptions] = useState([]);
  // Opciones de plagas para cada tipo de servicio
  const pestOptions = {
    "Desinsectación": ["Moscas", "Zancudos", "Cucarachas", "Hormigas", "Pulgas", "Gorgojos", "Escarabajos"],
    "Desratización": ["Rata de alcantarilla", "Rata de techo", "Rata de campo"],
    "Desinfección": ["Virus", "Hongos", "Bacterias"],
    // Los siguientes tipos no mostrarán opciones de plagas
    "Roceria": [],
    "Limpieza y aseo de archivos": [],
    "Lavado shut basura": [],
    "Encarpado": [],
    "Lavado de tanque": [],
    "Inspección": [],
    "Diagnostico": []
    };

  const handleShowRequestModal = () => setShowRequestModal(true);
  const handleCloseRequestModal = () => setShowRequestModal(false);
  const handleContinueRequest = () => {
    handleCloseRequestModal(); // Cierra el modal de solicitud
    handleShowAddServiceModal(); // Abre el modal para añadir servicio
  };


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
    const queryParams = new URLSearchParams(location.search);
    const serviceId = queryParams.get('serviceId');
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        fetchInspections(service.id);
        setShowServiceModal(true);
      }
    }
  }, [location.search, services]);
  
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
          // Consultar los detalles del servicio
          const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/services/${newEvent.id}`);
          const newService = response.data;
  
          // Verifica si el servicio ya existe en el estado
          setServices((prevServices) => {
            const serviceExists = prevServices.some(service => service.id === newService.id);
            return serviceExists ? prevServices : [...prevServices, newService];
          });
  
          // Opcional: Mostrar notificación
          showNotification("Nuevo Servicio", `Se ha añadido un nuevo servicio: ${newService.id}`);
        } catch (error) {
          console.error("Error al obtener detalles del servicio:", error);
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

  const handleServiceTypeChange = (e) => {
    const { value, checked } = e.target;
    setNewService((prevService) => {
      const updatedServiceType = checked
        ? [...prevService.service_type, value]
        : prevService.service_type.filter((type) => type !== value);
  
      // Combina las plagas de todos los tipos de servicio seleccionados
      const combinedPestOptions = Array.from(
        new Set(
          updatedServiceType.flatMap((type) => pestOptions[type] || [])
        )
      );
  
      setVisiblePestOptions(combinedPestOptions);
  
      return {
        ...prevService,
        service_type: updatedServiceType,
        pest_to_control: [], // Limpia las plagas seleccionadas al cambiar el tipo de servicio
      };
    });
  };

  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
  };

  const handlePestToControlChange = (e) => {
    const { value, checked } = e.target;
    setNewService((prevService) => ({
      ...prevService,
      pest_to_control: checked
        ? [...prevService.pest_to_control, value]
        : prevService.pest_to_control.filter((pest) => pest !== value),
    }));
  };

  const handleInterventionAreasChange = (e) => {
    const { value, checked } = e.target;
    setNewService((prevService) => ({
      ...prevService,
      intervention_areas: checked
        ? [...prevService.intervention_areas, value]
        : prevService.intervention_areas.filter((area) => area !== value),
    }));
  };

  const handleSaveNewService = async () => {
    const serviceData = {
      ...newService,
      quantity_per_month: newService.quantity_per_month || null,
      client_id: newService.client_id || null,
      value: newService.value || null,
      responsible: newService.responsible || null, // Asegúrate de incluir responsible
      companion: newService.companion || [],       // Asegúrate de incluir companion
    };
  
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/request-services`, serviceData);
      if (response.data.success) {
        handleCloseAddServiceModal();
        showNotification("Exito", "Servicio guardado exitosamente");
      } else {
        console.error("Error: No se pudo guardar el servicio.", response.data.message);
        showNotification("Error", "Error: No se pudo guardar el servicio");
      }
    } catch (error) {
      console.error("Error saving new service:", error);
      showNotification("Error", "Error: Hubo un problema al guardar el servicio");
    }
  };  

  const handleRequestSchedule = async (serviceId, clientId) => {
    try {
      // Configuración de los datos para enviar en la solicitud
      const serviceData = { serviceId, clientId };

      // Enviar la solicitud POST al backend
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/request-schedule`,
        serviceData
      );

      // Manejar la respuesta exitosa
      console.log("Solicitud de agendamiento enviada:", response.data);

      // Opcional: Redirigir o mostrar una notificación
      showNotification("Exito", "Solicitud de agendamiento enviada exitosamente.");
      handleCloseServiceModal();
    } catch (error) {
      // Manejar errores
      console.error("Error al enviar la solicitud de agendamiento:", error);
      showNotification("Error", "Hubo un error al enviar la solicitud. Por favor, inténtalo nuevamente.");
    }
  };

  useEffect(() => {
    const fetchMyServices = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/services`);
  
        // Filtrar servicios donde el usuario es cliente o está en companions
        const userServices = response.data.filter(service => {
          const isResponsible = service.client_id === userId;
  
          // Verificar si el usuario está en el campo companion
          const isCompanion = service.companion?.includes(`"${userId}"`); // Ajusta según el formato de companion
            
          return isResponsible || isCompanion;
        });
  
        console.log("Servicios filtrados para el usuario:", userServices);
  
        // Obtener nombres de los clientes
        const clientData = {};
        for (const service of userServices) {
          if (service.client_id && !clientData[service.client_id]) {
            try {
              const clientResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients/${service.client_id}`);
              clientData[service.client_id] = clientResponse.data.name;
            } catch (error) {
              console.error(`Error fetching client ${service.client_id}:`, error);
            }
          }
        }
        setClientNames(clientData); // Guarda los nombres de los clientes
        setServices(userServices);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching services:", error);
        setLoading(false);
      }
    };
    fetchMyServices();
  }, [userId]);  

  useEffect(() => {
    const fetchScheduledEvents = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/service-schedule`);
        setScheduledEvents(response.data);
      } catch (error) {
        console.error("Error fetching scheduled events:", error);
      }
    };
    fetchScheduledEvents();
  }, []);

  useEffect(() => {
    const fetchTechnicians = async () => {
      try {
        const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?role=Technician`);
        setTechnicians(response.data);
        console.log("Técnicos:", response.data);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      }
    };
    fetchTechnicians();
  }, []);

  const today = moment().startOf('day');
  const nextWeek = moment().add(7, 'days').endOf('day');

  const filteredScheduledServices = services
  .flatMap(service => {
    const serviceEvents = scheduledEvents.filter(event => event.service_id === service.id);

    return serviceEvents.map(event => ({
      ...service,
      scheduledDate: event.date
    }));
  });

// Agrupamos por fechas sin filtrar
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
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/inspections?service_id=${serviceId}`);
      const formattedInspections = response.data
        .filter((inspection) => inspection.service_id === serviceId) // Filtra por `service_id`
        .map((inspection) => ({
          ...inspection,
          date: moment(inspection.date).format("DD/MM/YYYY"), // Formato legible para la fecha
          time: inspection.time ? moment(inspection.time, "HH:mm:ss").format("HH:mm") : "--",
          exit_time: inspection.exit_time ? moment(inspection.exit_time, "HH:mm:ss").format("HH:mm") : "--",
          observations: inspection.observations || "Sin observaciones",
        }))
        .sort((a, b) => b.datetime - a.datetime); // Ordena por fecha y hora
      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
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

  const handleSchedule = (serviceId) => {
    navigate(`/client-calendar?serviceId=${serviceId}`); // Navega a la ruta con el id del servicio
  };

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
          <div className="text-end mb-3">
            <Button variant="success" onClick={handleShowRequestModal}>
                Solicitar Servicio
            </Button>
          </div>
          <Row style={{ minHeight: 0, height: 'auto' }}>
            {services.map((service, index) => (
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
                          const pests = pestMatches
                            ? pestMatches.map((item) => item.replace(/"/g, "")).join(", ")
                            : "No especificado";
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
                          const areas = areaMatches
                            ? areaMatches.map((item) => item.replace(/"/g, "")).join(", ")
                            : "No especificadas";
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
                      </div>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
            ))}
          </Row>
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
                    {/* Agendamiento */}
                    <div className="bg-white shadow-sm rounded p-3">
                      <h5 className="text-secondary mb-3">
                        <Calendar className="me-2" /> Agendamiento
                      </h5>
                      <div className="d-flex gap-2 my-4">
                        <button
                          className="btn btn-outline-success d-flex align-items-center w-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSchedule(selectedService.id);
                          }}
                        >
                          <Calendar2Check size={18} className="me-2" />
                          Agenda Tu Servicio
                        </button>
                        <button
                          className="btn btn-outline-success d-flex align-items-center w-100"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRequestSchedule(selectedService.id, selectedService.client_id);
                          }}
                        >
                          <SendPlus size={18} className=" me-2"/>
                          Solicita Tu Agendamiento
                        </button>
                      </div>
                    </div>

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
                  </div>
                )}
              </Modal.Body>
              <Modal.Footer>
                <Button variant="dark" onClick={handleCloseServiceModal}>
                  Cerrar
                </Button>
              </Modal.Footer>
            </Modal>

            <Modal show={showRequestModal} onHide={handleCloseRequestModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Solicitar Servicio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                <p>
                    ¡Bienvenido a nuestro proceso de solicitud de servicios! 
                    Este se lleva a cabo en 2 pasos simples: 
                    <br /><br />
                    <strong>1. Información básica:</strong> Completa un breve formulario con los detalles iniciales del servicio que necesitas. Nuestro equipo revisará y validará la información proporcionada. 
                    <br />
                    <strong>2. Confirmación y agendamiento:</strong> Una vez aprobada tu solicitud, recibirás una notificación para elegir la fecha y hora del servicio. Si prefieres, nuestro equipo puede encargarse de agendarlo por ti.
                    <br /><br />
                    ¡Estamos aquí para ayudarte a hacer todo más fácil y rápido!
                </p>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleCloseRequestModal}>
                    Cancelar
                    </Button>
                    <Button variant="success" onClick={handleContinueRequest}>
                    Continuar
                    </Button>
                </Modal.Footer>
                </Modal>

                <Modal show={showAddServiceModal} onHide={() => setShowAddServiceModal(false)}>
                        <Modal.Header closeButton>
                          <Modal.Title><PlusCircle/> Añadir Servicio</Modal.Title>
                        </Modal.Header>
                        <Modal.Body>
                          <Form>
                            {/* Tipo de Servicio */}
                            <Form.Group className="mt-3">
                              <Form.Label style={{ fontWeight: "bold" }}>Tipo de Servicio</Form.Label>
                              <div className="d-flex flex-wrap">
                                {serviceOptions.map((option, index) => (
                                  <div key={index} className="col-4 mb-2">
                                    <Form.Check
                                      type="checkbox"
                                      label={<span style={{ fontSize: "0.8rem" }}>{option}</span>}
                                      value={option}
                                      checked={newService.service_type.includes(option)}
                                      onChange={(e) => handleServiceTypeChange(e)}
                                    />
                                  </div>
                                ))}
                              </div>
                            </Form.Group>
                
                            {/* Descripción */}
                            <Form.Group className="mt-3">
                              <Form.Label style={{ fontWeight: "bold" }}>Descripción</Form.Label>
                              <Form.Control
                                as="textarea"
                                rows={3}
                                name="description"
                                value={newService.description}
                                onChange={handleNewServiceChange}
                              />
                            </Form.Group>
                
                            {/* Plaga a Controlar */}
                            {visiblePestOptions.length > 0 && (
                              <Form.Group className="mt-3">
                                <Form.Label style={{ fontWeight: "bold" }}>Plaga a Controlar</Form.Label>
                                <div className="d-flex flex-wrap">
                                  {visiblePestOptions.map((pest, index) => (
                                    <div key={index} className="col-4 mb-2">
                                      <Form.Check
                                        type="checkbox"
                                        label={<span style={{ fontSize: "0.8rem" }}>{pest}</span>}
                                        value={pest}
                                        checked={newService.pest_to_control.includes(pest)}
                                        onChange={handlePestToControlChange}
                                      />
                                    </div>
                                  ))}
                                </div>
                              </Form.Group>
                            )}
                
                            {/* Áreas de Intervención */}
                            <Form.Group className="mt-3">
                              <Form.Label style={{ fontWeight: "bold" }}>Áreas de Intervención</Form.Label>
                              <div className="d-flex flex-wrap">
                                {interventionAreaOptions.map((area, index) => (
                                  <div key={index} className="col-4 mb-2">
                                    <Form.Check
                                      type="checkbox"
                                      label={<span style={{ fontSize: "0.8rem" }}>{area}</span>}
                                      value={area}
                                      checked={newService.intervention_areas.includes(area)}
                                      onChange={handleInterventionAreasChange}
                                    />
                                  </div>
                                ))}
                              </div>
                            </Form.Group>
                
                            {/* Categoría */}
                            <Form.Group className="mt-3">
                              <Form.Label style={{ fontWeight: "bold" }}>Categoría</Form.Label>
                              <Form.Control
                                as="select"
                                name="category"
                                value={newService.category}
                                onChange={(e) => {
                                  handleNewServiceChange(e);
                                  setNewService({ ...newService, category: e.target.value });
                                }}
                              >
                                <option value="">Seleccione una categoría</option>
                                <option value="Puntual">Puntual</option>
                                <option value="Periódico">Periódico</option>
                              </Form.Control>
                            </Form.Group>
                
                            {/* Cantidad al Mes */}
                            {newService.category === "Periódico" && (
                              <Form.Group className="mt-3">
                                <Form.Label style={{ fontWeight: "bold" }}>Cantidad al Mes</Form.Label>
                                <Form.Control
                                  type="number"
                                  name="quantity_per_month"
                                  value={newService.quantity_per_month}
                                  onChange={handleNewServiceChange}
                                />
                              </Form.Group>
                            )}
                
                            {/* Campos Ocultos */}
                            <Form.Control type="hidden" name="client_id" value={newService.client_id} />
                            <Form.Control type="hidden" name="created_by" value={newService.created_by} />
                            <Form.Control type="hidden" name="created_at" value={newService.created_at} />
                          </Form>
                        </Modal.Body>
                        <Modal.Footer>
                          <Button variant="dark" onClick={() => setShowAddServiceModal(false)}>
                            Cancelar
                          </Button>
                          <Button variant="success" onClick={() => handleSaveNewService()}>
                            Solicitar Servicio
                          </Button>
                        </Modal.Footer>
                      </Modal>
    </div>
  );  
}

export default MyServicesClient;