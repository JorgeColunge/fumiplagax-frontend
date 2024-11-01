import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Modal, Form, Col, Row } from 'react-bootstrap';

function Inspections() {
  const [inspections, setInspections] = useState([]);
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [showModal, setShowModal] = useState(false);
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

  useEffect(() => {
    fetchInspections();
    fetchServices();
    fetchClients();
  }, []);

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

  const handleShowModal = (inspection = null) => {
    setEditing(Boolean(inspection));
    setSelectedId(inspection?.id || null);

    const durationInHours = inspection?.duration?.hours || '';

    setForm({
      date: inspection?.date || '',
      time: inspection?.time || '',
      duration: durationInHours,
      observations: inspection?.observations || '',
      service_id: inspection?.service_id || '',
      exit_time: inspection?.exit_time || ''
    });
    setShowModal(true);
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
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm({ ...form, [name]: value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const payload = {
        ...form,
        duration: form.duration ? { hours: parseFloat(form.duration) } : { hours: 0 },
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

  const groupedData = clients.map(client => {
    const clientServices = services.filter(service => service.client_id === client.id);
    const servicesWithInspections = clientServices.map(service => ({
      ...service,
      inspections: inspections.filter(inspection => inspection.service_id === service.id)
    }));
    return { ...client, services: servicesWithInspections };
  });

  return (
    <div className="container my-4">
      <h2 className="text-center mb-5">Consulta de Inspecciones</h2>
      {groupedData.map(client => (
        <div key={client.id} className="mb-5">
          <h3 className="mb-4 border-bottom pb-2">Empresa: {client.name}</h3>
          {client.services.length > 0 ? (
            <div>
              {client.services.map(service => (
                <div key={service.id} className="mb-4">
                  <h4 className="mb-3">{service.service_type}</h4>
                  {/* Se ajusta el Row para no ocupar todo el alto */}
                  <Row style={{ height: 'auto', alignItems: 'flex-start' }}>
                    {service.inspections.length > 0 ? (
                      service.inspections.map(inspection => (
                        <Col key={inspection.id} xs={12} sm={6} md={4} lg={3} className="mb-3">
                          <div className="border p-3 rounded shadow-sm">
                            <h5 className="mb-3">Inspección #{inspection.id}</h5>
                            <p><strong>Fecha y Hora:</strong> {formatDateTime(inspection.date, inspection.time)}</p>
                            <p><strong>Duración:</strong> {inspection.duration?.hours || 0} horas</p>
                            <p><strong>Observaciones:</strong> {inspection.observations || 'No disponible'}</p>
                            <Button
                              variant="secondary"
                              size="sm"
                              onClick={() => handleShowModal(inspection)}
                            >
                              Editar
                            </Button>
                          </div>
                        </Col>
                      ))
                    ) : (
                      <p className="text-muted">No hay inspecciones para este servicio.</p>
                    )}
                  </Row>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-muted">No hay servicios para esta empresa.</p>
          )}
        </div>
      ))}
      
      <Button
        onClick={() => handleShowModal()}
        className="mt-4 btn btn-success"
      >
        Agregar Nueva Inspección
      </Button>
  
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
            <Form.Group controlId="formServiceId" className="mb-3">
              <Form.Label>Servicio</Form.Label>
              <Form.Control
                as="select"
                name="service_id"
                value={form.service_id}
                onChange={handleChange}
              >
                <option value="">Selecciona un servicio</option>
                {services.map((service) => (
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
    </div>
  );
}

export default Inspections;
