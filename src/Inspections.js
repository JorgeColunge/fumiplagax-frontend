import React, { useEffect, useState, useRef  } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Col, Row, Collapse, Card, FormControl, InputGroup } from 'react-bootstrap';
import { Bag, Building, Calendar, Clock, Person } from "react-bootstrap-icons"
import { useNavigate } from "react-router-dom";
import './Inspections.css'; // Importa el archivo CSS aquí

function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  // Filtros
  const [filterClient, setFilterClient] = useState('');
  const [filterService, setFilterService] = useState('');
  const [filterDate, setFilterDate] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedInspection, setSelectedInspection] = useState(null);
  const [filteredInspections, setFilteredInspections] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [users, setUsers] = useState([]);
  const navigate = useNavigate();
  const [expandedCardId, setExpandedCardId] = useState(null);
  const menuRef = useRef(null);

  const [form, setForm] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_id: '',
    exit_time: ''
  });
  const [editing, setEditing] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [selectedClient, setSelectedClient] = useState('');
  const [openClient, setOpenClient] = useState(null);
  const [openService, setOpenService] = useState(null);

  useEffect(() => {
    fetchInspections();
    fetchServices();
    fetchClients();
    fetchUsers();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filterClient, filterService, filterDate, searchTerm, inspections]);
  

  const fetchInspections = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/inspections');
      console.log("Inspecciones obtenidas:", response.data);
      setInspections(response.data);
    } catch (error) {
      console.error("Error al obtener inspecciones:", error);
    }
  };  

  const fetchServices = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/services');
      console.log("Servicios obtenidos:", response.data);
      setServices(response.data);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
    }
  };   

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/clients');
      console.log("Clientes obtenidos:", response.data);
      setClients(response.data);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
    }
  };  

  const fetchUsers = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/users');
      console.log("Usuarios obtenidos:", response.data);
      setUsers(response.data);
    } catch (error) {
      console.error("Error al obtener usuarios:", error);
    }
  };
  

  const applyFilters = () => {
    console.log("Aplicando filtros...");
    const lowerSearchTerm = searchTerm.toLowerCase();
  
    const filtered = inspections.filter((inspection) => {
      const service = services.find((s) => s.id === inspection.service_id);
      const client = clients.find((c) => c.id === service?.client_id);
  
      const matchesClient = filterClient ? service?.client_id === Number(filterClient) : true;
      const matchesService = filterService ? inspection.service_id === filterService : true;
  
      const matchesDate = filterDate
        ? new Date(inspection.date).toISOString().slice(0, 10) === filterDate
        : true;
  
      const matchesSearch =
        lowerSearchTerm === "" ||
        inspection.id?.toLowerCase().includes(lowerSearchTerm) || // Buscar por ID de inspección
        service?.id?.toLowerCase().includes(lowerSearchTerm) || // Buscar por ID de servicio
        service?.service_type?.toLowerCase().includes(lowerSearchTerm) ||
        client?.name?.toLowerCase().includes(lowerSearchTerm);
  
      return matchesClient && matchesService && matchesDate && matchesSearch;
    });
  
    // Ordenar inspecciones filtradas por fecha descendente
    const sortedFiltered = filtered.sort((a, b) => new Date(b.date) - new Date(a.date));
  
    console.log("Inspecciones filtradas y ordenadas:", sortedFiltered);
  
    setFilteredInspections(sortedFiltered);
  };
    

  const formatDateTime = (dateStr, timeStr) => {
    const date = new Date(dateStr);
    const formattedDate = date.toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const formattedTime = new Date(`1970-01-01T${timeStr}Z`).toLocaleTimeString('es-ES', {
      hour: '2-digit',
      minute: '2-digit',
    });
    return `${formattedDate} - ${formattedTime}`;
  };

  const handleClientChange = (e) => {
    const selectedClientId = e.target.value;
    setSelectedClient(selectedClientId);
    setForm({ ...form, service_id: '' });
  };

  const handleShowDetails = (inspection) => {
    // Encuentra el servicio asociado a la inspección
    const service = services.find(service => service.id === inspection.service_id);
    // Encuentra el cliente asociado al servicio
    const client = clients.find(client => client.id === service?.client_id);
    
    // Almacena la inspección seleccionada junto con el nombre del cliente
    setSelectedInspection({ ...inspection, clientName: client ? client.name : 'Cliente desconocido' });
    setShowDetailsModal(true);
  };  
  
  const handleShowModal = (inspection = null) => {
    setEditing(Boolean(inspection));
    setSelectedId(inspection?.id || null);

    const durationInHours = inspection?.duration?.hours || '';

    if (inspection) {
      const selectedService = services.find(service => service.id === inspection.service_id);
      const selectedClientId = selectedService ? selectedService.client_id : '';

      setSelectedClient(selectedClientId);
      setForm({
        date: inspection.date || '',
        time: inspection.time || '',
        duration: durationInHours,
        observations: inspection.observations || '',
        service_id: inspection.service_id || '',
        exit_time: inspection.exit_time || ''
      });
    } else {
      setForm({
        date: '',
        time: '',
        duration: '',
        observations: '',
        service_id: '',
        exit_time: ''
      });
      setSelectedClient('');
    }

    setShowModal(true);
  };

  const toggleActions = (id) => {
    setExpandedCardId((prevId) => (prevId === id ? null : id)); // Alterna el estado abierto/cerrado del menú
  };

  const handleClickOutside = (event) => {
    // Si el clic no es dentro del menú desplegable, ciérralo
    if (menuRef.current && !menuRef.current.contains(event.target)) {
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setForm({
      date: '',
      time: '',
      duration: '',
      observations: '',
      service_id: '',
      exit_time: ''
    });
    setSelectedClient('');
  };
  
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        duration: form.duration ? parseFloat(form.duration) * 3600 : 0,
      };

      if (editing) {
        await axios.put(`http://localhost:10000/api/inspections/${selectedId}`, payload);
      } else {
        await axios.post('http://localhost:10000/api/inspections', payload);
      }
      fetchInspections();
      handleCloseModal();
    } catch (error) {
      console.error('Error al guardar la inspección:', error);
    }
  };

  return (
    <div className="container my-4">
      <Row className="w-100" style={{ height: 'auto', alignItems: 'flex-start' }}>
        {/* Filtros */}
        <Row className="mt-1 mb-4 mx-0 w-100 px-0" style={{ minHeight: 0, height: 'auto' }}>
          <Col xs={12} md={4}>
          <InputGroup className='w-100'>
            <FormControl
              placeholder="Buscar"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </InputGroup>
          </Col>
            <Col xs={12} md={2} className='px-1'>
              <Form.Group controlId="filterClient">
                <Form.Select className='w-100'
                  value={filterClient}
                  onChange={(e) => setFilterClient(e.target.value)}
                >
                  <option value="">Todos los Clientes</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>{client.name}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={2} className='px-1'>
              <Form.Group controlId="filterService">
                <Form.Select
                  value={filterService}
                  onChange={(e) => setFilterService(e.target.value)}
                >
                  <option value="">Todos los Servicios</option>
                  {services.map((service) => (
                    <option key={service.id} value={service.id}>{service.id}</option>
                  ))}
                </Form.Select>
              </Form.Group>
            </Col>
            <Col xs={12} md={2} className='px-1'>
              <Form.Group controlId="filterDate">
                <Form.Control
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col xs={12} md={2} className="text-md-end mt-2 mt-md-0 ps-1 mx-0">
              <Button
                onClick={() => handleShowModal()}
                className="btn btn-success w-100"
              >
                Agregar Inspección
              </Button>
            </Col>
        </Row>

        {filteredInspections.length > 0 ? (
          filteredInspections
            .sort((a, b) => new Date(b.date) - new Date(a.date)) // Ordenar por fecha descendente
            .map((inspection) => {
              console.log("Renderizando inspección:", inspection);
              return (
                <Col key={inspection.id} xs={12} sm={6} md={4} lg={3} className="mb-3">
                <Card
                  className="shadow-sm h-100 position-relative"
                  onClick={() => navigate(`/inspection/${inspection.id}`)}
                  style={{
                    cursor: "pointer",
                    border: "1px solid #e0e0e0",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <Card.Body>
                    <Card.Title as="h5" className="mb-3">
                      <strong>{inspection.id}</strong>
                      <hr></hr>
                    </Card.Title>
                    <div className="d-flex align-items-center mb-2">
                      <Calendar className="ms-auto me-2 text-success" />
                      <span className="me-auto">
                        {new Date(inspection.date).toLocaleDateString("es-ES")}
                      </span>
                    </div>
                    <div className="d-flex align-items-center mb-2">
                      <Clock className="ms-auto me-2 text-warning" />
                      <span className="me-auto">
                        {new Date(`1970-01-01T${inspection.time}Z`).toLocaleTimeString("es-ES", {
                          hour: "2-digit",
                          minute: "2-digit",
                          hour12: true,
                        })}
                      </span>
                      <span className="ms-0 me-auto">
                        -{" "}
                        {inspection.exit_time
                          ? new Date(`1970-01-01T${inspection.exit_time}Z`).toLocaleTimeString("es-ES", {
                              hour: "2-digit",
                              minute: "2-digit",
                              hour12: true,
                            })
                          : "No registrada"}
                      </span>
                    </div>
                    <Card.Text className="mt-3 mb-2 text-muted text-truncate">
                      {inspection.observations || "Sin observaciones"}
                    </Card.Text>
                    <p className="my-1">
                      <Bag className="ms-auto me-2" />
                      {services.find((s) => s.id === inspection.service_id)?.id || "Desconocido"}
                    </p>
                    <p className="my-1">
                      <Building className="ms-auto me-2" />
                      {clients.find(
                        (client) =>
                          client.id ===
                          services.find((s) => s.id === inspection.service_id)?.client_id
                      )?.name || "Desconocido"}
                    </p>
                    <p className="my-1">
                      <Person className="ms-auto me-2" />
                      {users.find(
                        (user) =>
                          user.id === services.find((s) => s.id === inspection.service_id)?.responsible
                      )?.name || "No asignado"}
                    </p>
                  </Card.Body>
                  <Card.Footer
                    className="text-center position-relative"
                    style={{ background: "#f9f9f9", cursor: "pointer" }}
                    onClick={(e) => {
                      e.stopPropagation(); // Evita redirigir al hacer clic en el botón
                      toggleActions(inspection.id);
                    }}
                    ref={expandedCardId === inspection.id ? menuRef : null}
                  >
                    <small className="text-success">
                      {expandedCardId === inspection.id ? "Cerrar Acciones" : "Acciones"}
                    </small>
                    {expandedCardId === inspection.id && (
                      <div
                        className={`menu-actions ${
                          expandedCardId === inspection.id ? "expand" : "collapse"
                        }`}
                      >
                        <button
                        className="btn d-block"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Generar informe");
                        }}
                      >
                        Generar informe
                      </button>
                      <button
                        className="btn d-block"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log("Generar informe mensual");
                        }}
                      >
                        Generar informe mensual
                      </button>
                      </div>
                    )}
                  </Card.Footer>
                </Card>
              </Col>
              );
            })
        ) : (
          <p className="text-muted">No hay inspecciones registradas.</p>
        )}
      </Row>

      {/* Modal para agregar/editar inspección */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editing ? 'Editar Inspección' : 'Agregar Inspección'}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form onSubmit={handleSubmit}>
            <Form.Group controlId="formDate" className="mb-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={form.date.slice(0, 10)}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="formTime" className="mb-3">
              <Form.Label>Hora</Form.Label>
              <Form.Control
                type="time"
                name="time"
                value={form.time}
                onChange={handleChange}
                required
              />
            </Form.Group>
            <Form.Group controlId="formDuration" className="mb-3">
              <Form.Label>Duración (horas)</Form.Label>
              <Form.Control
                type="number"
                name="duration"
                step="0.1"
                value={form.duration}
                onChange={handleChange}
                placeholder="Duración en horas"
              />
            </Form.Group>
            <Form.Group controlId="formObservations" className="mb-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                name="observations"
                value={form.observations}
                onChange={handleChange}
                placeholder="Observaciones"
              />
            </Form.Group>
            <Form.Group controlId="formClient" className="mb-3">
              <Form.Label>Empresa</Form.Label>
              <Form.Control
                as="select"
                value={selectedClient}
                onChange={handleClientChange}
              >
                <option value="">Selecciona una empresa</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formServiceId" className="mb-3">
              <Form.Label>Servicio</Form.Label>
              <Form.Control
                as="select"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
                disabled={!selectedClient}
              >
                <option value="">Selecciona un servicio</option>
                {services
                  .filter(service => service.client_id === parseInt(selectedClient))
                  .map(service => (
                    <option key={service.id} value={service.id}>{service.service_type}</option>
                  ))}
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="formExitTime" className="mb-3">
              <Form.Label>Hora de Salida</Form.Label>
              <Form.Control
                type="time"
                name="exit_time"
                value={form.exit_time}
                onChange={handleChange}
              />
            </Form.Group>
            <Button variant="success" type="submit">
              {editing ? 'Guardar Cambios' : 'Agregar Inspección'}
            </Button>
          </Form>
        </Modal.Body>
      </Modal>
      <Modal show={showDetailsModal} onHide={() => setShowDetailsModal(false)}>
      <Modal.Header closeButton>
        <Modal.Title>Detalles de Inspección</Modal.Title>
      </Modal.Header>
      <Modal.Body>
      {selectedInspection && (
        <div>
          <p><strong>ID:</strong> {`I-${selectedInspection.id}`}</p>
          <p><strong>Cliente:</strong> {selectedInspection.clientName}</p> {/* Mostrar el nombre del cliente */}
          <p><strong>Observaciones:</strong> {selectedInspection.observations || 'No hay observaciones'}</p>
          <p><strong>Servicio ID:</strong> {selectedInspection.service_id || 'Desconocido'}</p>
          <p><strong>Fecha y Hora:</strong> {formatDateTime(selectedInspection.date, selectedInspection.time)}</p>
          <p><strong>Duración:</strong> {selectedInspection.duration ? `${selectedInspection.duration / 3600} horas` : 'No especificada'}</p>
          <p><strong>Hora de Salida:</strong> {selectedInspection.exit_time || 'No especificada'}</p>
        </div>
      )}
    </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={() => setShowDetailsModal(false)}>Cerrar</Button>
      </Modal.Footer>
    </Modal>
    </div>
  );
}

export default Inspections;