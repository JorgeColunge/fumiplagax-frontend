import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { FaEdit, FaTrash } from 'react-icons/fa';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function ServiceList() { 
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';
  const [selectedUser, setSelectedUser] = useState('');

  const [showEditServiceType, setShowEditServiceType] = useState(false); // Nuevo estado para el colapso en edición

  const [clientNames, setClientNames] = useState({});

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
  const [filteredServices, setFilteredServices] = useState([]); // Estado para los servicios filtrados

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


const handleInterventionAreasChange = (e) => {
  const { value, checked } = e.target;
  setNewService((prevService) => ({
    ...prevService,
    intervention_areas: checked
      ? [...prevService.intervention_areas, value]
      : prevService.intervention_areas.filter((area) => area !== value),
  }));
};

const handleDropdownToggle = (isOpen, event) => {
  // Verificar si el evento es un clic en un checkbox
  if (event && event.target && event.target.tagName === 'INPUT') {
    return; // No cerrar el dropdown si se hace clic en un checkbox
  }
  // Cambiar el estado para abrir/cerrar el dropdown solo si no es un checkbox
  setShowDropdown(isOpen);
};

const handleEditClick = (service) => {
  console.log("Clicked Edit for service:", service); // <-- Log para verificar clic en Editar

  setEditService({
    ...service,
    service_type: service.service_type ? service.service_type.split(',') : [],
    pest_to_control: service.pest_to_control ? service.pest_to_control.split(',') : [],
    intervention_areas: service.intervention_areas ? service.intervention_areas.split(',') : [],
    companion: service.companion ? service.companion.split(',') : []
  });

  console.log("Initial editService after setting:", {
    ...service,
    service_type: service.service_type ? service.service_type.split(',') : [],
    pest_to_control: service.pest_to_control ? service.pest_to_control.split(',') : [],
    intervention_areas: service.intervention_areas ? service.intervention_areas.split(',') : [],
    companion: service.companion ? service.companion.split(',') : []
  }); // <-- Log para verificar estado inicial de editService
  setVisiblePestOptions(pestOptions[service.service_type] || []);
  setShowEditModal(true);
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

  const handleSaveChanges = async () => {
    try {
      const response = await axios.put(`http://localhost:10000/api/services/${editService.id}`, {
        ...editService,
        service_type: editService.service_type.join(','),
        pest_to_control: editService.pest_to_control.join(','),
        intervention_areas: editService.intervention_areas.join(','),
        companion: editService.companion.join(',')
      });
      
      if (response.data.success) {
        setServices(services.map(service => service.id === editService.id ? editService : service));
        setShowEditModal(false);
        setEditService(null);
      }
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };
  
  const handleDeleteClick = async (serviceId) => {
    try {
      const response = await axios.delete(`http://localhost:10000/api/services/${serviceId}`);
      if (response.data.success) {
        setServices(services.filter(service => service.id !== serviceId));
      }
    } catch (error) {
      console.error("Error deleting service:", error);
    }
  };  

  const [technicians, setTechnicians] = useState([]);
  const fetchTechnicians = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/users?role=Technician');
      setTechnicians(response.data);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };  

  const [newInspection, setNewInspection] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_type: '',
    exit_time: '',
  });

  useEffect(() => {
    // Configura el nuevo servicio inicial con el ID del usuario logueado
    setNewService((prevService) => ({
      ...prevService,
      created_by: userId, // Asigna el ID del usuario logueado
    }));
  
    // Función para obtener servicios y clientes
    const fetchServicesAndClients = async () => {
      try {
        const servicesResponse = await axios.get('http://localhost:10000/api/services');
        const clientsResponse = await axios.get('http://localhost:10000/api/clients');
        
        // Crear un diccionario de nombres de clientes
        const clientData = {};
        clientsResponse.data.forEach(client => {
          clientData[client.id] = client.name;
        });
        
        setClientNames(clientData); // Guarda los nombres de los clientes
        setServices(servicesResponse.data);
        setFilteredServices(servicesResponse.data); // Inicialmente, muestra todos los servicios
        setClients(clientsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
  
    fetchServicesAndClients();
    fetchTechnicians();
  
    // Llama a la función de carga de servicios y clientes una sola vez
    fetchServicesAndClients();
    fetchTechnicians(); // Llama a fetchTechnicians aquí
  }, []); // Este bloque solo se ejecuta una vez al montar el componente, sin necesidad de `clients` como dependencia.
  
  // Nuevo useEffect para gestionar el filtrado dinámico de servicios basado en `selectedUser` y `searchServiceText`
  useEffect(() => {
    let filtered = services;
  
    // Filtra servicios por texto de búsqueda si `searchServiceText` tiene algún valor
    if (searchServiceText) {
      filtered = filtered.filter(
        (service) =>
          service.description.toLowerCase().includes(searchServiceText.toLowerCase()) ||
          service.service_type.toLowerCase().includes(searchServiceText.toLowerCase())
      );
    }
  
    // Filtra servicios por usuario responsable seleccionado si `selectedUser` tiene algún valor
    if (selectedUser) {
      filtered = filtered.filter((service) => service.responsible === selectedUser);
    }
  
    // Actualiza los servicios filtrados con los resultados del filtro aplicado
    setFilteredServices(filtered);
  }, [selectedUser, searchServiceText, services]); // Se ejecuta cada vez que cambian estos valores para actualizar el filtrado de servicios
  
  if (loading) return <div>Cargando servicios...</div>;

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
      const formattedInspections = response.data.sort((a, b) => b.datetime - a.datetime);
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
      setSelectedService(service);
      setOpen(true);
      fetchInspections(service.id);
    }
  };

  const handleShowModal = () => {
    setNewInspection({
      date: '',
      time: '',
      duration: '',
      observations: '',
      service_type: selectedService?.service_type || '',
      exit_time: '',
    });
    setShowModal(true);
  };

  const handleClientSelect = (client) => {
    setSearchText(client.name); // Establece el nombre en el campo de búsqueda
    setNewService({ ...newService, client_id: client.id }); // Asigna el ID del cliente seleccionado
    setShowSuggestions(false); // Oculta la lista de sugerencias
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setNewInspection({
      date: '',
      time: '',
      duration: '',
      observations: '',
      service_type: '',
      exit_time: '',
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInspection({ ...newInspection, [name]: value });
  };


  const handleSaveInspection = async () => {
    try {
      const response = await axios.post('http://localhost:10000/api/inspections', {
        ...newInspection,
        service_id: selectedService.id,
      });
      
      if (response.data.success) {
        const savedInspection = response.data.inspection;
        const newInspectionFormatted = {
          id: savedInspection.id,
          date: moment(savedInspection.date).format('DD/MM/YYYY'),
          time: savedInspection.time ? moment(savedInspection.time, 'HH:mm:ss').format('HH:mm') : 'No disponible',
          exit_time: savedInspection.exit_time ? moment(savedInspection.exit_time, 'HH:mm:ss').format('HH:mm') : 'No disponible',
          observations: savedInspection.observations || 'Sin observaciones',
          datetime: moment(`${savedInspection.date} ${savedInspection.time}`, 'YYYY-MM-DD HH:mm')
        };
      
        setInspections(prevInspections => 
          [newInspectionFormatted, ...prevInspections].sort((a, b) => b.datetime - a.datetime)
        );
      
        handleCloseModal();
      } else {
        console.error("Error: No se pudo guardar la inspección correctamente.", response.data.message);
      }      
    } catch (error) {
      console.error("Error saving inspection:", error);
    }
  };
  

  const handleShowAddServiceModal = () => {
    setNewService((prevService) => ({
      ...prevService,
      created_by: userId, // Asigna el ID del usuario logueado
      created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual
    }));
    setShowAddServiceModal(true);
  };

// Filtrar técnicos excluyendo el seleccionado como responsable
const filteredTechniciansForCompanion = technicians.filter(
  (technician) => technician.id !== newService.responsible
);


  const handleCloseAddServiceModal = () => setShowAddServiceModal(false);

  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
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
      const response = await axios.post('http://localhost:10000/api/services', serviceData);
      if (response.data.success) {
        setServices([...services, response.data.service]);
        handleCloseAddServiceModal();
      } else {
        console.error("Error: No se pudo guardar el servicio.", response.data.message);
      }
    } catch (error) {
      console.error("Error saving new service:", error);
    }
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
  

  if (loading) return <div>Cargando servicios...</div>;

  const handleCompanionChange = (e) => {
    const { value, checked } = e.target;
    setNewService((prevService) => ({
      ...prevService,
      companion: checked
        ? [...prevService.companion, value] // Agrega el ID si está seleccionado
        : prevService.companion.filter((companionId) => companionId !== value) // Elimina el ID si se deselecciona
    }));
  };  

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Servicios Pendientes</h2>
      <Form.Group controlId="formServiceSearch" className="mb-4">
        <Form.Control
          type="text"
          placeholder="Buscar servicios..."
          value={searchServiceText}
          onChange={handleServiceSearchChange}
        />
      </Form.Group>
  
      <Form.Group controlId="userFilter" className="mb-4">
        <Form.Label>Filtrar por Usuario</Form.Label>
        <Form.Control as="select" value={selectedUser} onChange={(e) => setSelectedUser(e.target.value)}>
          <option value="">Todos los usuarios</option>
          {technicians.map((technician) => (
            <option key={technician.id} value={technician.id}>
              {technician.name}
            </option>
          ))}
        </Form.Control>
      </Form.Group>
  
      <Button variant="primary" onClick={handleShowAddServiceModal} className="mb-4">
        Añadir Servicio
      </Button>
  
      <Row>
        <Col md={open ? 5 : 12}>
          <div className="service-list">
            <Row>
              {filteredServices.map(service => (
                <Col md={4} lg={4} xl={4} sm={6} xs={12} key={service.id} className="mb-4">

<Card
  className="mb-3 border"
  style={{ cursor: "pointer", minHeight: "280px", height: "280px" }}
  onClick={() => handleServiceClick(service)}
>
  <Card.Body>
    <div className="d-flex align-items-center justify-content-between">
      <div>
        <span className="fw-bold text-primary">🛠 SS-{service.id}</span>
        <span className="text-muted mx-2">|</span>
        <span className="text-dark">{service.service_type.replace(/[{}"]/g, '').split(',').join(', ')}</span>
      </div>
    </div>
    <hr />
    <div>
      <span className="text-muted small">Plagas: </span>
      <span className="text-dark">
        {(() => {
          const pestMatches = service.pest_to_control.match(/"([^"]+)"/g);
          const pests = pestMatches ? pestMatches.map(item => item.replace(/"/g, '')) : [];
          return pests.length > 0 ? pests.join(', ') : "No especificado";
        })()}
      </span>
    </div>
    <div className="mt-2">
      <span className="text-muted small">Áreas: </span>
      <span className="text-dark">
        {(() => {
          const areaMatches = service.intervention_areas.match(/"([^"]+)"/g);
          const areas = areaMatches ? areaMatches.map(item => item.replace(/"/g, '')) : [];
          return areas.length > 0 ? areas.join(', ') : "No especificadas";
        })()}
      </span>
    </div>
    <div className="mt-3">
      <h5 className="text-primary">
        {clientNames[service.client_id] || "Cliente Desconocido"}
      </h5>
    </div>
    <div className="d-flex justify-content-end mt-3">
      <Button
        variant="outline-success"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleEditClick(service);
        }}
        className="me-2"
      >
        <FaEdit size={18} />
      </Button>
      <Button
        variant="outline-danger"
        size="sm"
        onClick={(e) => {
          e.stopPropagation();
          handleDeleteClick(service.id);
        }}
      >
        <FaTrash size={18} />
      </Button>
    </div>
  </Card.Body>
</Card>

                </Col>
              ))}
            </Row>
          </div>
        </Col>
      </Row>
  
      {/* Modal para añadir una nueva inspección */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Inspección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formDate">
              <Form.Label>Fecha</Form.Label>
              <Form.Control type="date" name="date" value={newInspection.date} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formStartTime" className="mt-3">
              <Form.Label>Hora de Inicio</Form.Label>
              <Form.Control type="time" name="time" value={newInspection.time} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formEndTime" className="mt-3">
              <Form.Label>Hora de Finalización</Form.Label>
              <Form.Control type="time" name="exit_time" value={newInspection.exit_time} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formDuration" className="mt-3">
              <Form.Label>Duración (horas)</Form.Label>
              <Form.Control type="number" name="duration" value={newInspection.duration} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formObservations" className="mt-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control as="textarea" rows={3} name="observations" value={newInspection.observations} onChange={handleInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveInspection}>Guardar cambios</Button>
        </Modal.Footer>
      </Modal>

      {/* Modal para añadir un nuevo servicio */}
      <Modal show={showAddServiceModal} onHide={() => setShowAddServiceModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
          <Form.Group className="mt-3">
  <Form.Label
    onClick={() => setShowServiceType((prev) => !prev)}
    style={{ cursor: "pointer", fontWeight: "bold", display: "block" }}
  >
    Tipo de Servicio
  </Form.Label>
  <Collapse in={showServiceType}>
    <div>
      {serviceOptions.map((option, index) => (
        <Form.Check
          key={option}
          type="checkbox"
          label={option}
          value={option}
          id={`service_option_${index}`}
          checked={newService.service_type.includes(option)}
          onChange={(e) => handleServiceTypeChange(e)}
        />
      ))}
    </div>
  </Collapse>
</Form.Group>

<Form.Group className="mt-3">
  <Form.Label htmlFor="description">Descripción</Form.Label>
  <Form.Control
    as="textarea"
    rows={3}
    name="description"
    id="description" // Usar un id único aquí
    value={newService.description}
    onChange={handleNewServiceChange}
  />
</Form.Group>

            {/* Selección de Plaga a Controlar */}
            {visiblePestOptions.length > 0 && (
              <Form.Group controlId="formPestToControl" className="mt-3">
                <Form.Label>Plaga a Controlar</Form.Label>
                <div>
                  {visiblePestOptions.map((pest) => (
                    <Form.Check
                      key={pest}
                      type="checkbox"
                      label={pest}
                      value={pest}
                      checked={newService.pest_to_control.includes(pest)}
                      onChange={handlePestToControlChange}
                    />
                  ))}
                </div>
              </Form.Group>
            )}

<Form.Group className="mt-3">
  <Form.Label
    onClick={() => setShowInterventionAreas((prev) => !prev)}
    style={{ cursor: "pointer", fontWeight: "bold", display: "block" }}
  >
    Áreas de Intervención
  </Form.Label>
  <Collapse in={showInterventionAreas}>
    <div>
      {interventionAreaOptions.map((area, index) => (
        <Form.Check
          key={area}
          type="checkbox"
          label={area}
          value={area}
          id={`intervention_area_${index}`}
          checked={newService.intervention_areas.includes(area)}
          onChange={handleInterventionAreasChange}
        />
      ))}
    </div>
  </Collapse>
</Form.Group>


<Form.Group className="mt-3">
  <Form.Label>Responsable</Form.Label>
  <Form.Control
    as="select"
    name="responsible"
    value={newService.responsible}
    onChange={handleNewServiceChange}
  >
    <option value="">Seleccione un técnico</option>
    {technicians.map((technician) => (
      <option key={technician.id} value={technician.id}>
        {technician.name}
      </option>
    ))}
  </Form.Control>
</Form.Group>

<Form.Group className="mt-3">
  <Form.Label>Categoría</Form.Label>
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

{newService.category === 'Periódico' && (
  <Form.Group controlId="formQuantityPerMonth" className="mt-3">
    <Form.Label>Cantidad al Mes</Form.Label>
    <Form.Control
      type="number"
      name="quantity_per_month"
      value={newService.quantity_per_month}
      onChange={handleNewServiceChange}
    />
  </Form.Group>
)}
            
            {/* Campo de búsqueda para seleccionar cliente con autocompletado */}
            <Form.Group controlId="formClientId" className="mt-3">
              <Form.Label>Cliente</Form.Label>
              <Form.Control
                type="text"
                placeholder="Buscar cliente..."
                value={searchText}
                onChange={handleSearchChange} // Llama al manejador de búsqueda
                onFocus={() => setShowSuggestions(true)} // Muestra sugerencias al enfocar
              />
              {showSuggestions && (
                <div className="suggestions-list" style={{ border: '1px solid #ddd', borderRadius: '4px', maxHeight: '150px', overflowY: 'auto', position: 'absolute', zIndex: '10', backgroundColor: '#fff', width: '100%' }}>
                  {filteredClients.map((client) => (
                    <div
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      style={{ padding: '8px', cursor: 'pointer' }}
                    >
                      {client.name}
                    </div>
                  ))}
                  {filteredClients.length === 0 && (
                    <div style={{ padding: '8px', color: '#999' }}>Sin coincidencias</div>
                  )}
                </div>
              )}
            </Form.Group>

            <Form.Group controlId="formValue" className="mt-3">
              <Form.Label>Valor</Form.Label>
              <Form.Control
                type="number"
                name="value"
                value={newService.value}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group className="mt-3">
  <Form.Label
    onClick={() => setShowCompanionOptions((prev) => !prev)}
    style={{ cursor: "pointer", fontWeight: "bold", display: "block" }}
  >
    Acompañante
  </Form.Label>
  <Collapse in={showCompanionOptions}>
    <div>
      {filteredTechniciansForCompanion.map((technician) => (
        <Form.Check
          key={technician.id}
          type="checkbox"
          label={technician.name}
          value={technician.id}
          checked={newService.companion.includes(technician.id)}
          onChange={handleCompanionChange}
        />
      ))}
    </div>
  </Collapse>
</Form.Group>

            <Form.Group controlId="formCreatedBy" className="mt-3">
              <Form.Label>Creado Por</Form.Label>
              <Form.Control
                type="text"
                name="created_by"
                value={newService.created_by}
                readOnly // Hace que el campo sea de solo lectura
              />
            </Form.Group>

            <Form.Group controlId="formCreatedAt" className="mt-3">
              <Form.Label>Fecha de Creación</Form.Label>
              <Form.Control
                type="text"
                name="created_at"
                value={newService.created_at}
                readOnly
              />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowAddServiceModal(false)}>
            Cancelar
          </Button>
          <Button variant="primary" onClick={() => handleSaveNewService()}>
            Guardar Servicio
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Editar Servicio</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {editService && (
      <Form>
<Form.Group className="mt-3">
  <Form.Label
    onClick={() => setShowServiceType((prev) => !prev)}
    style={{ cursor: "pointer", fontWeight: "bold", display: "block" }}
  >
    Tipo de Servicio
  </Form.Label>
  <Collapse in={showServiceType}>
    <div>
      {serviceOptions.map((option, index) => (
        <Form.Check
          key={option}
          type="checkbox"
          label={option}
          value={option}
          id={`edit_service_option_${index}`}
          checked={editService.service_type.includes(option)} // Verifica si la opción está en el array
          onChange={(e) => {
            const { value, checked } = e.target;

            setEditService((prevService) => {
              // Verificar el estado antes de actualizar
              console.log("Previous service_type:", prevService.service_type);

              const updatedServiceType = checked
                ? [...prevService.service_type, value]
                : prevService.service_type.filter((type) => type !== value);

              return {
                ...prevService,
                service_type: updatedServiceType,
                pest_to_control: [], // Limpia las plagas seleccionadas al cambiar el tipo de servicio
              };
            });
          }}
        />
      ))}
    </div>
  </Collapse>
</Form.Group>

        <Form.Group className="mt-3">
  <Form.Label>Descripción</Form.Label>
  <Form.Control
    as="textarea"
    rows={3}
    value={editService.description}
    onChange={(e) => setEditService({ ...editService, description: e.target.value })}
  />
</Form.Group>

<Form.Group controlId="formPestToControl" className="mt-3">
  <Form.Label>Plaga a Controlar</Form.Label>
  <div>
    {visiblePestOptions.map((pest) => (
      <Form.Check
        key={pest}
        type="checkbox"
        label={pest}
        value={pest}
        checked={editService.pest_to_control.includes(pest)}
        onChange={(e) => {
          const { value, checked } = e.target;
          setEditService((prevService) => ({
            ...prevService,
            pest_to_control: checked
              ? [...prevService.pest_to_control, value]
              : prevService.pest_to_control.filter((p) => p !== value),
          }));
        }}
      />
    ))}
  </div>
</Form.Group>

<Form.Group className="mt-3">
  <Form.Label>Áreas de Intervención</Form.Label>
  <div>
    {interventionAreaOptions.map((area, index) => (
      <Form.Check
        key={area}
        type="checkbox"
        label={area}
        value={area}
        checked={editService.intervention_areas.includes(area)} // Verifica si el área está en el array
        onChange={(e) => {
          const { value, checked } = e.target;

          // Mostrar el valor del área y su estado de checked
          console.log("Área changed:", value, "Checked:", checked);

          setEditService((prevService) => {
            // Verificar el estado de editService y editService.intervention_areas antes de actualizar
            console.log("Previous editService:", prevService);
            console.log("Previous editService.intervention_areas:", prevService.intervention_areas);

            const updatedInterventionAreas = checked
              ? [...prevService.intervention_areas, value]
              : prevService.intervention_areas.filter((area) => area !== value);

            // Mostrar el estado actualizado de intervention_areas
            console.log("Updated intervention_areas:", updatedInterventionAreas);

            return {
              ...prevService,
              intervention_areas: updatedInterventionAreas,
            };
          });
        }}
      />
    ))}
  </div>
</Form.Group>

        <Form.Group className="mt-3">
          <Form.Label>Responsable</Form.Label>
          <Form.Control
            as="select"
            name="responsible"
            value={editService.responsible}
            onChange={(e) => setEditService({ ...editService, responsible: e.target.value })}
          >
            <option value="">Seleccione un técnico</option>
            {technicians.map((technician) => (
              <option key={technician.id} value={technician.id}>
                {technician.name}
              </option>
            ))}
          </Form.Control>
        </Form.Group>

        <Form.Group className="mt-3">
          <Form.Label>Categoría</Form.Label>
          <Form.Control
            as="select"
            name="category"
            value={editService.category}
            onChange={(e) => {
              const value = e.target.value;
              setEditService((prevService) => ({
                ...prevService,
                category: value,
                quantity_per_month: value === 'Periódico' ? prevService.quantity_per_month : '',
              }));
            }}
          >
            <option value="">Seleccione una categoría</option>
            <option value="Puntual">Puntual</option>
            <option value="Periódico">Periódico</option>
          </Form.Control>
        </Form.Group>

        {editService.category === 'Periódico' && (
          <Form.Group controlId="formQuantityPerMonth" className="mt-3">
            <Form.Label>Cantidad al Mes</Form.Label>
            <Form.Control
              type="number"
              name="quantity_per_month"
              value={editService.quantity_per_month || ''}
              onChange={(e) => setEditService({ ...editService, quantity_per_month: e.target.value })}
            />
          </Form.Group>
        )}

        <Form.Group controlId="formValue" className="mt-3">
          <Form.Label>Valor</Form.Label>
          <Form.Control
            type="number"
            name="value"
            value={editService.value}
            onChange={(e) => setEditService({ ...editService, value: e.target.value })}
          />
        </Form.Group>

        <Form.Group className="mt-3">
          <Form.Label>Acompañante</Form.Label>
          <div>
            {filteredTechniciansForCompanion.map((technician) => (
              <Form.Check
                key={technician.id}
                type="checkbox"
                label={technician.name}
                value={technician.id}
                checked={editService.companion.includes(technician.id)}
                onChange={(e) => {
                  const { value, checked } = e.target;
                  setEditService((prevService) => ({
                    ...prevService,
                    companion: checked
                      ? [...prevService.companion, value]
                      : prevService.companion.filter((companionId) => companionId !== value),
                  }));
                }}
              />
            ))}
          </div>
        </Form.Group>
      </Form>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowEditModal(false)}>
      Cancelar
    </Button>
    <Button variant="primary" onClick={handleSaveChanges}>
      Guardar Cambios
    </Button>
  </Modal.Footer>
</Modal>
    </div>
  );
}
export default ServiceList;