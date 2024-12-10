import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import 'moment/locale/es';
import { useNavigate } from 'react-router-dom'; // Asegúrate de tener configurado react-router
import { Calendar, Person, Bag, Building, PencilSquare, Trash, Bug, Diagram3, GearFill, Clipboard, PlusCircle, InfoCircle, FileText, GeoAlt } from 'react-bootstrap-icons';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form, CardFooter, ModalTitle } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ServiceList.css'

function Billing() { 
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';
  const [selectedUser, setSelectedUser] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [showEditServiceType, setShowEditServiceType] = useState(false); // Nuevo estado para el colapso en edición
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clientNames, setClientNames] = useState({});
  const [showPestOptions, setShowPestOptions] = useState(false);
  const [filterStatus, setFilterStatus] = useState(''); // Estado para el filtro de agendamiento
  const [showInterventionAreasOptions, setShowInterventionAreasOptions] = useState(false);
  const [newInspection, setNewInspection] = useState({
    inspection_type: [], // Tipos de inspección seleccionados
    inspection_sub_type: "", // Opcional, para subtipos como en Desratización
    service_type: "", // Tipo de servicio del servicio seleccionado
  });
  const [technicians, setTechnicians] = useState([]);
  const [editService, setEditService] = useState({
    service_type: [],
    description: '',
    pest_to_control: '',
    intervention_areas: '',
    responsible: '',
    category: '',
    quantity_per_month: '',
    client_id: '',
    value: '',
    companion: [],
    created_by: userId,
    created_at: moment().format('DD-MM-YYYY'),
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceType, setShowServiceType] = useState(false);
  const [showCompanionOptions, setShowCompanionOptions] = useState(false);
  const [searchText, setSearchText] = useState(''); // Estado para la búsqueda
  const [filteredClients, setFilteredClients] = useState([]); // Clientes filtrados para la búsqueda
  const [showSuggestions, setShowSuggestions] = useState(false); // Controla si se muestran las sugerencias
  const [searchServiceText, setSearchServiceText] = useState(''); // Estado para el texto de búsqueda en servicios
  const [scheduleEvents, setScheduleEvents] = useState([]);
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
    client_id: '',
    value: '',
    companion: [],
    created_by: userId,
    created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual al abrir el modal
  });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
  });
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1); // Mes actual
  const [selectedYear, setSelectedYear] = useState(moment().year()); // Año actual
  const dropdownRef = useRef(null);

  const toggleActions = (id) => {
    setExpandedCardId((prevId) => (prevId === id ? null : id)); // Alterna el estado abierto/cerrado del menú
  };

  const handleClickOutside = (event) => {
    // Si el clic no es dentro del menú desplegable, ciérralo
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpandedCardId(null);
    }
  };

  useEffect(() => {
    // Agregar evento de clic al documento cuando hay un menú desplegable abierto
    if (expandedCardId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup al desmontar
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedCardId]);

  const showNotification = (title, message) => {
    setNotification({ show: true, title, message });
    setTimeout(() => {
      setNotification({ show: false, title, message: '' });
    }, 2500); // 2.5 segundos
  };

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

  const [showInterventionAreas, setShowInterventionAreas] = useState(false);

// Estado para controlar si el dropdown está abierto o cerrado
const [showDropdown, setShowDropdown] = useState(false);

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


  const navigate = useNavigate();

  const fetchTechnicians = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/users?role=Technician');
      setTechnicians(response.data);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };  

  useEffect(() => {
    moment.locale('es');
    const fetchData = async () => {
      try {
        const servicesResponse = await axios.get('http://localhost:10000/api/services');
        const clientsResponse = await axios.get('http://localhost:10000/api/clients');
        const techniciansResponse = await axios.get('http://localhost:10000/api/users?role=Technician');

        setServices(servicesResponse.data);
        setClients(clientsResponse.data);
        setTechnicians(techniciansResponse.data);
        setFilteredServices(servicesResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchServicesAndClients = async () => {
        try {
          const servicesResponse = await axios.get('http://localhost:10000/api/services');
          const clientsResponse = await axios.get('http://localhost:10000/api/clients');
          const scheduleResponse = await axios.get('http://localhost:10000/api/service-schedule');
          
          const clientData = {};
          clientsResponse.data.forEach(client => {
            clientData[client.id] = client.name;
          });
      
          setServices(servicesResponse.data);
          setScheduleEvents(scheduleResponse.data);
          setClients(clientsResponse.data);
          setClientNames(clientData);
          setFilteredServices(servicesResponse.data);
          setLoading(false);
        } catch (error) {
          console.error('Error fetching data:', error);
          setLoading(false);
        }
      };      
  
    const fetchTechnicians = async () => {
      try {
        const response = await axios.get('http://localhost:10000/api/users?role=Technician');
        setTechnicians(response.data);
      } catch (error) {
        console.error("Error fetching technicians:", error);
      }
    };
  
    // Llama a las funciones sin duplicación
    fetchServicesAndClients();
    fetchTechnicians();
  }, []); // Asegúrate de que las dependencias sean vacías para ejecutarse solo al montar.
  
  
  useEffect(() => {
    const applyFilters = () => {
      // Recalcular el estado de cada servicio
      const updatedServices = services.map(service => {
        const status = determineScheduleStatus(service, scheduleEvents); // Recalcula el estado basado en el mes y año seleccionados
        return { ...service, scheduleStatus: status };
      });
  
      let filtered = updatedServices;
  
      // Filtrar servicios creados en o antes del mes y año seleccionados
      filtered = filtered.filter(service => {
        const serviceCreatedAt = moment(service.created_at); // Deja que moment interprete el formato ISO automáticamente
        const selectedDate = moment(`${selectedYear}-${selectedMonth}-01`, 'YYYY-MM-DD');
        
        console.log("Service ID:", service.id);
        console.log("Created At:", service.created_at);
        console.log("Parsed Created At:", serviceCreatedAt.format('YYYY-MM-DD'));
        console.log("Selected Date:", selectedDate.format('YYYY-MM-DD'));
        console.log("Is Same Or Before:", serviceCreatedAt.isSameOrBefore(selectedDate, 'month'));
  
        return serviceCreatedAt.isSameOrBefore(selectedDate, 'month'); // Verifica si la fecha de creación es menor o igual al mes seleccionado
      });
  
      // Filtro por texto de búsqueda
      if (searchServiceText) {
        filtered = filtered.filter((service) =>
          service.id.toString().includes(searchServiceText) || // Busca por ID
          (clients.find((client) => client.id === service.client_id)?.name || "")
            .toLowerCase()
            .includes(searchServiceText.toLowerCase()) || // Busca por nombre del cliente
          (technicians.find((tech) => tech.id === service.responsible)?.name || "")
            .toLowerCase()
            .includes(searchServiceText.toLowerCase()) // Busca por responsable
        );
      }
  
      // Filtro por cliente seleccionado
      if (selectedClient) {
        filtered = filtered.filter((service) => service.client_id === parseInt(selectedClient));
      }
  
      // Filtro por responsable seleccionado
      if (selectedUser) {
        filtered = filtered.filter((service) => service.responsible === selectedUser);
      }
  
      // Filtro por estado de agendamiento
      if (filterStatus) {
        filtered = filtered.filter((service) => service.scheduleStatus === filterStatus);
      }
  
      // Actualizar servicios filtrados
      setFilteredServices(filtered);
    };
  
    applyFilters();
  }, [
    searchServiceText,
    selectedClient,
    selectedUser,
    filterStatus,
    services,
    scheduleEvents,
    selectedMonth,
    selectedYear,
    clients,
    technicians
  ]);
  
  
  useEffect(() => {
    let filtered = services;

    // Aplicar filtro por texto de búsqueda
    if (searchServiceText) {
      filtered = filtered.filter(
        (service) =>
          service.id.toLowerCase().includes(searchServiceText.toLowerCase()) || // Buscar por ID completo
          (clients.find((client) => client.id === service.client_id)?.name || "")
            .toLowerCase()
            .includes(searchServiceText.toLowerCase()) || // Buscar por cliente
          (technicians.find((tech) => tech.id === service.responsible)?.name || "")
            .toLowerCase()
            .includes(searchServiceText.toLowerCase()) // Buscar por responsable
      );      
    }

    // Aplicar filtro por cliente seleccionado
    if (selectedClient) {
      filtered = filtered.filter((service) => service.client_id === parseInt(selectedClient));
    }

    // Aplicar filtro por responsable seleccionado
    if (selectedUser) {
      filtered = filtered.filter((service) => service.responsible === selectedUser);
    }

    setFilteredServices(filtered);
  }, [searchServiceText, selectedClient, selectedUser, services, clients, technicians]);

  if (loading) return <div>Cargando servicios...</div>;

  const determineScheduleStatus = (service, events) => {
    const serviceEvents = events.filter(event => event.service_id === service.id);
    const filteredEvents = serviceEvents.filter(event =>
      moment(event.date).month() + 1 === selectedMonth && // Compara con el mes seleccionado
      moment(event.date).year() === selectedYear // Compara con el año seleccionado
    );
  
    if (service.category === 'Puntual') {
      return filteredEvents.length > 0 ? 'Agendado' : 'Pendiente de Agenda';
    } else if (service.category === 'Periódico') {
      if (filteredEvents.length >= service.quantity_per_month) {
        return 'Agendado';
      } else if (filteredEvents.length > 0) {
        return 'Agendamiento Parcial';
      } else {
        return 'Pendiente de Agenda';
      }
    }
    return 'Sin Categoría';
  };
  

  const handleServiceSearchChange = (e) => {
    const input = e.target.value;
    setSearchServiceText(input);
    let filtered = services;
  
    if (input) {
      filtered = filtered.filter(
        (service) =>
          service.description.toLowerCase().includes(input.toLowerCase()) ||
          service.service_type.toLowerCase().includes(input.toLowerCase())
      );
    }
  
    if (selectedUser) {
      filtered = filtered.filter((service) => service.responsible === selectedUser);
    }
  
    setFilteredServices(filtered);
  };  

  const fetchInspections = async (serviceId) => {
    try {
      const response = await axios.get(`http://localhost:10000/api/inspections?service_id=${serviceId}`);
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

  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchText(input); // Actualiza el texto de búsqueda
    if (input) {
      // Filtra clientes según el texto ingresado
      const filtered = clients.filter((client) =>
        client.name.toLowerCase().includes(input.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowSuggestions(true); // Muestra sugerencias cuando hay texto
    } else {
      setShowSuggestions(false); // Oculta sugerencias si no hay texto
    }
  };

  const handleServiceClick = (service) => {
    setSelectedService(service); // Establece el servicio seleccionado
    fetchInspections(service.id); // Pasa el `service.id` a la función para filtrar las inspecciones
    setShowDetailsModal(true); // Abre el modal
  };

  const handleCloseAddInspectionModal = () => {
    setShowAddInspectionModal(false);
  };

  

// Filtrar técnicos excluyendo el seleccionado como responsable
const filteredTechniciansForCompanion = technicians.filter(
  (technician) => technician.id !== newService.responsible
);  

  if (loading) return <div>Cargando servicios...</div>;

  return (
      <div className="container mt-1">
      <Row className="align-items-center mb-2" style={{ minHeight: 0, height: 'auto' }}>
        <Col className='ms-auto' xs={6} md={2}>
            <Form.Group controlId="formMonthFilter">
                <Form.Control
                as="select"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                    {moment().month(i).format("MMMM")}
                    </option>
                ))}
                </Form.Control>
            </Form.Group>
            </Col>

            <Col xs={6} md={2}>
            <Form.Group controlId="formYearFilter">
                <Form.Control
                as="select"
                value={selectedYear}
                onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={moment().year() - i}>
                    {moment().year() - i}
                    </option>
                ))}
                </Form.Control>
            </Form.Group>
        </Col>      
      </Row>
      <Row className="align-items-center mb-4" style={{ minHeight: 0, height: 'auto' }}>
        {/* Campo de búsqueda */}
        <Col xs={12} md={6}>
          <Form.Group controlId="formServiceSearch">
            <Form.Control
              type="text"
              placeholder="Buscar"
              value={searchServiceText}
              onChange={handleServiceSearchChange}
            />
          </Form.Group>
        </Col>

        {/* Filtro por empresa */}
        <Col xs={12} md={2}>
          <Form.Group controlId="formClientFilter">
            <Form.Control
              as="select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Todas las empresas</option>
              {clients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>

        {/* Filtro por responsable */}
        <Col xs={12} md={2}>
          <Form.Group controlId="formUserFilter">
            <Form.Control
              as="select"
              value={selectedUser}
              onChange={(e) => setSelectedUser(e.target.value)}
            >
              <option value="">Todos los responsables</option>
              {technicians.map((tech) => (
                <option key={tech.id} value={tech.id}>
                  {tech.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>
        </Col>

        {/* Filtro por responsable */}
        <Col xs={12} md={2}>
        <Form.Group controlId="formScheduleStatus">
            <Form.Control as="select" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
                <option value="">Todos los estados</option>
                <option value="Pendiente de Agenda">Pendiente de Agenda</option>
                <option value="Agendamiento Parcial">Agendamiento Parcial</option>
                <option value="Agendado">Agendado</option>
            </Form.Control>
        </Form.Group>
        </Col>
      </Row>


      <Row style={{ minHeight: 0, height: 'auto' }}>
        <Col md={open ? 5 : 12}>
          <div className="service-list">
            <Row style={{ minHeight: 0, height: 'auto' }}>
              {filteredServices.map(service => (
                <Col md={6} lg={4} xl={4} sm={6} xs={12} key={service.id} className="mb-4">

                  <Card
                    className="mb-3 border"
                    style={{ cursor: "pointer", minHeight: "280px", height: "280px" }}
                    onClick={() => handleServiceClick(service)}
                  >

                    <Card.Body>
                    <div className="d-flex align-items-center justify-content-between">
                        <div className="flex-grow-1 text-truncate">
                          <span className="fw-bold">{service.id}</span>
                          <span className="text-muted mx-2">|</span>
                          <span className="text-secondary">{service.service_type.replace(/[{}"]/g, '').split(',').join(', ')}</span>
                        </div>
                      </div>
                      <hr />
                      <div>
                  <Bug className="text-success me-2" />     
                  <span className="text-secondary">
                    {(() => {
                      const pestMatches = service.pest_to_control.match(/"([^"]+)"/g);
                      const pests = pestMatches ? pestMatches.map(item => item.replace(/"/g, '')).join(', ') : "No especificado";
                      return pests.length > 20 ? `${pests.slice(0, 20)}...` : pests;
                    })()}
                  </span>
                      </div>
                      <div className="mt-2">
                  <Diagram3 className="text-warning me-2" /> 
                  <span className="text-secondary">
                    {(() => {
                      const areaMatches = service.intervention_areas.match(/"([^"]+)"/g);
                      const areas = areaMatches ? areaMatches.map(item => item.replace(/"/g, '')).join(', ') : "No especificadas";
                      return areas.length > 20 ? `${areas.slice(0, 20)}...` : areas;
                    })()}
                  </span>
                      </div>
                      <div className="mt-3">
                        <h6 >
                          <Building /> {clientNames[service.client_id] || "Cliente Desconocido"}
                        </h6>
                      </div>
                      <div className="mt-3">
                        <h6>
                          <Person />{" "}
                          {technicians.find((tech) => tech.id === service.responsible)?.name || "No asignado"}
                        </h6>
                      </div>
                    </Card.Body>
                    <Card.Footer
                    className="text-center position-relative"
                    style={{ background: "#f9f9f9", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation(); // Evita redirigir al hacer clic en el botón
                      toggleActions(service.id);
                    }}
                    ref={expandedCardId === service.id ? dropdownRef : null} // Solo asigna la referencia al desplegable abierto
                  >
                    <small className="text-success">
                      {expandedCardId === service.id ? "Cerrar Acciones" : "Acciones"}
                    </small>
                    {expandedCardId === service.id && (
                      <div
                        className={`menu-actions ${
                          expandedCardId === service.id ? "expand" : "collapse"
                        }`}
                      >
                        <button
                          className="btn d-block"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <Trash size={18} className="me-2" />
                          Facturar
                        </button>
                      </div>
                    )}
                  </Card.Footer>
                  </Card>
                </Col>
              ))}
            </Row>
          </div>
        </Col>
      </Row>

      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
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
                {/* Información General */}
                <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                    <InfoCircle className="me-2" /> Información General
                </h5>
                <div className="d-flex flex-column gap-2">
                    <p className="my-1">
                    <strong>ID del Servicio:</strong> {selectedService.id}
                    </p>
                    <p className="my-1">
                    <strong>Tipo de Servicio:</strong>{" "}
                    {selectedService.service_type
                        .replace(/[\{\}"]/g, "")
                        .split(",")
                        .join(", ")}
                    </p>
                    <p className="my-1">
                    <strong>Cliente:</strong>{" "}
                    {clientNames[selectedService.client_id] || "Cliente Desconocido"}
                    </p>
                    <p className="my-1">
                    <strong>Responsable:</strong>{" "}
                    {technicians.find((tech) => tech.id === selectedService.responsible)?.name || "No asignado"}
                    </p>
                    <p className="my-1">
                    <strong>Valor:</strong> ${selectedService.value}
                    </p>
                </div>
                </div>

                {/* Inspecciones */}
                <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                    <Clipboard className="me-2" /> Inspecciones
                </h5>
                {inspections.length > 0 ? (
                    <ul className="list-unstyled">
                    {inspections.map((inspection) => (
                        <li key={inspection.id} className="mb-2">
                        <strong>ID:</strong> {inspection.id} <br />
                        <strong>Fecha:</strong> {inspection.date} <br />
                        <strong>Inicio:</strong> {inspection.time} <br />
                        <strong>Finalización:</strong> {inspection.exit_time} <br />
                        <strong>Observaciones:</strong>{" "}
                        {inspection.observations || "Sin observaciones"}
                        </li>
                    ))}
                    </ul>
                ) : (
                    <p>No hay inspecciones registradas para este servicio.</p>
                )}
                </div>
            </div>
            )}
        </Modal.Body>
        <Modal.Footer>
            <Button variant="dark" onClick={() => setShowDetailsModal(false)}>
            Cerrar
            </Button>
        </Modal.Footer>
        </Modal>

    </div>
    
  );
}
export default Billing;