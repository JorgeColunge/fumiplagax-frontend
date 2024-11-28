import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Col, Row, Collapse, Card } from 'react-bootstrap';
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
  }, []);

  useEffect(() => {
  applyFilters();
}, [filterClient, filterService, filterDate, inspections]);

  const fetchInspections = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/inspections');
      setInspections(response.data);
    } catch (error) {
      console.error("Error al obtener inspecciones:", error);
    }
  };

  const fetchServices = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/services');
      setServices(response.data);
    } catch (error) {
      console.error("Error al obtener servicios:", error);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await axios.get('http://localhost:10000/api/clients');
      setClients(response.data);
    } catch (error) {
      console.error("Error al obtener clientes:", error);
    }
  };

  const applyFilters = () => {
  const filtered = inspections.filter((inspection) => {
    const matchesClient = filterClient ? inspection.client_id === parseInt(filterClient) : true;
    const matchesService = filterService ? inspection.service_id === parseInt(filterService) : true;
    const matchesDate = filterDate ? inspection.date === filterDate : true;
    return matchesClient && matchesService && matchesDate;
  });
  setFilteredInspections(filtered);
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
      <h2 className="text-center mb-5">Consulta de Inspecciones</h2>
      <Row className="w-100" style={{ height: 'auto', alignItems: 'flex-start' }}>
        {/* Filtros */}
        <Row className="mb-1" style={{ minHeight: 0, height: 'auto' }}>
  <Col xs={12} md={3}>
    <Form.Group controlId="filterClient">
      <Form.Label>Filtrar por Cliente</Form.Label>
      <Form.Select
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
  <Col xs={12} md={3}>
    <Form.Group controlId="filterService">
      <Form.Label>Filtrar por Servicio</Form.Label>
      <Form.Select
        value={filterService}
        onChange={(e) => setFilterService(e.target.value)}
      >
        <option value="">Todos los Servicios</option>
        {services.map((service) => (
          <option key={service.id} value={service.id}>{service.service_type}</option>
        ))}
      </Form.Select>
    </Form.Group>
  </Col>
  <Col xs={12} md={3}>
    <Form.Group controlId="filterDate">
      <Form.Label>Filtrar por Fecha</Form.Label>
      <Form.Control
        type="date"
        value={filterDate}
        onChange={(e) => setFilterDate(e.target.value)}
      />
    </Form.Group>
  </Col>
  <Col xs={12} md={3} className="text-md-end mt-2 mt-md-0">
    <Button
      onClick={() => handleShowModal()}
      className="btn btn-success"
    >
      Agregar Nueva Inspección
    </Button>
  </Col>
</Row>

{filteredInspections.length > 0 ? (
  filteredInspections.map(inspection => (
    <Col key={inspection.id} xs={12} sm={6} md={4} lg={3} className="mb-3">
        <Card className="shadow-sm h-100" onClick={() => handleShowDetails(inspection)} style={{ cursor: 'pointer' }}>
          <Card.Body>
            <Card.Title as="h6" className="mb-2">
              <strong>{`I-${inspection.id}`}</strong>
            </Card.Title>
            <Card.Text className="mb-1">
              {inspection.observations || 'No hay observaciones'}
            </Card.Text>
            <p>
              <strong>Servicio ID:</strong> {inspection.service_id || 'Desconocido'}
            </p>
            <p>{formatDateTime(inspection.date, inspection.time)}</p>
            <div className="d-flex justify-content-between mt-3">
            <Button variant="link" className="text-success" onClick={(e) => { e.stopPropagation(); /* Acciones aquí */ }}>Generar Informe</Button>
            <Button variant="link" className="text-success" onClick={(e) => { e.stopPropagation(); /* Acciones aquí */ }}>Novedad en Estación</Button>

            </div>
          </Card.Body>
        </Card>
      </Col>
    ))
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
            <Button variant="primary" type="submit">
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