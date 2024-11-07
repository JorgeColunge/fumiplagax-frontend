import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form} from 'react-bootstrap';
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
  console.log("Stored User Info:", storedUserInfo); // Verifica el contenido completo
  const userId = storedUserInfo?.id_usuario || '';
  console.log("User ID:", userId); // Debería mostrar el ID real ahora
  const [selectedUser, setSelectedUser] = useState('');

  const [showServiceType, setShowServiceType] = useState(false);

  const [showCompanionOptions, setShowCompanionOptions] = useState(false);

  const [searchText, setSearchText] = useState(''); // Estado para la búsqueda
  const [filteredClients, setFilteredClients] = useState([]); // Clientes filtrados para la búsqueda
  const [showSuggestions, setShowSuggestions] = useState(false); // Controla si se muestran las sugerencias

  const [searchServiceText, setSearchServiceText] = useState(''); // Estado para el texto de búsqueda en servicios
  const [filteredServices, setFilteredServices] = useState([]); // Estado para los servicios filtrados
  
  const [collapsedGroups, setCollapsedGroups] = useState({})

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
        setServices(servicesResponse.data);
        setFilteredServices(servicesResponse.data); // Inicialmente, muestra todos los servicios
        setClients(clientsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
  
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
  

  console.log("User ID:", newService.created_by); // Verifica que el ID del usuario logueado se esté configurando correctamente

  if (loading) return <div>Cargando servicios...</div>;

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
    if (selectedService?.id === service.id) {
      setSelectedService(null);
      setOpen(false);
    } else {
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

  const groupedServices = clients.map(client => ({
    client,
    services: services.filter(service => service.client_id === client.id),
  }));

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
      {groupedServices.map(({ client, services }) => (
        <div key={client.id} className="mb-4">
        <h5
          className="text-muted"
          onClick={() => toggleGroupCollapse(client.id)}
          style={{ cursor: 'pointer' }}
        >
          {client.name} {collapsedGroups[client.id] ? '▲' : '▼'}
        </h5>
        <Collapse in={collapsedGroups[client.id]}>
          <div>
            <Row>
              {filteredServices
                .filter(service => service.client_id === client.id) // Filtra servicios para este cliente
                .map(service => (
                  <Col md={6} key={service.id}>
                    <Card
                      className={`mb-3 ${selectedService?.id === service.id ? 'border-success' : ''}`}
                      onClick={() => handleServiceClick(service)}
                      style={{ cursor: "pointer", minHeight: "200px" }}
                    >
                      <Card.Body>
                        <Card.Title>
                          {service.service_type.replace(/[{}"]/g, '').split(',').join(', ')}
                        </Card.Title>
                        <Card.Text>
                          <strong>Descripción:</strong> {service.description}<br />
                          <strong>Fecha:</strong> {service.date}<br />
                          <strong>Hora:</strong> {service.time}
                        </Card.Text>
                        <div className="d-flex justify-content-between mt-3">
                          <Button variant="outline-success" size="sm">Generar Informe</Button>
                          <Button variant="outline-primary" size="sm">Novedad en Estación</Button>
                        </div>
                        </Card.Body>
                      </Card>
                    </Col>
                  ))
                }
              </Row>
              {services.length === 0 && (
                <p>No hay servicios para este cliente</p>
              )}
            </div>
          </Collapse>
          <br />
        </div>
      ))}
    </div>
  </Col>

  <Col md={open ? 7 : 0}>
    <Collapse in={open}>
      <div>
        {selectedService ? (
          <div className="service-details p-3 border">
            <h4>Detalles del Servicio</h4>
            <p><strong>ID del servicio:</strong> {selectedService.id}</p>
            <p><strong>Tipo de Servicio:</strong> {selectedService.service_type}</p>
            <p><strong>Descripción:</strong> {selectedService.description}</p>
            <p><strong>Categoría:</strong> {selectedService.categoria}</p>
            {selectedService.categoria === 'Periodico' && (
              <p><strong>Cantidad al mes:</strong> {selectedService.cantidad_al_mes}</p>
            )}
            <p><strong>Valor:</strong> ${selectedService.value}</p>

            <h5 className="mt-4">Inspecciones</h5>
            {inspections.length > 0 ? (
              <Table striped bordered hover size="sm" className="mt-3">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Fecha</th>
                    <th>Hora de Inicio</th>
                    <th>Hora de Finalización</th>
                    <th>Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {inspections.map(inspection => (
                    <tr key={inspection.id}>
                      <td>{inspection.id}</td>
                      <td>{inspection.date}</td>
                      <td>{inspection.time}</td>
                      <td>{inspection.exit_time}</td>
                      <td>{inspection.observations}</td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : (
              <p>No hay inspecciones registradas para este servicio.</p>
            )}
            <Button variant="link" className="text-success" onClick={handleShowModal}>Añadir Inspección</Button>
          </div>
        ) : (
          <p className="text-center mt-4">Seleccione un servicio para ver los detalles</p>
        )}
      </div>
    </Collapse>
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
    </div>
  );
}
export default ServiceList;