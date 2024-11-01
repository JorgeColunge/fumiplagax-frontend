import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Modal, Form } from 'react-bootstrap';

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
    <div style={{ padding: '20px' }}>
      <h2>Consulta de Inspecciones</h2>
      {groupedData.map(client => (
        <div key={client.id} style={{ marginBottom: '30px' }}>
          <h3>Empresa: {client.name}</h3>
          {client.services.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {client.services.map(service => (
                <div
                  key={service.id}
                  style={{
                    width: '100%',
                    border: '1px solid #ccc',
                    borderRadius: '8px',
                    padding: '16px',
                    marginBottom: '20px',
                  }}
                >
                  <h4>{service.service_type}</h4>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {service.inspections.length > 0 ? (
                      service.inspections.map(inspection => (
                        <div
                          key={inspection.id}
                          style={{
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            padding: '10px',
                            width: '100%', // Ocupa todo el ancho de la columna del servicio
                            boxShadow: '0 4px 8px rgba(0, 0, 0, 0.1)',
                            marginBottom: '10px'
                          }}
                        >
                          <h5>Inspección #{inspection.id}</h5>
                          <p><strong>Fecha y Hora:</strong> {formatDateTime(inspection.date, inspection.time)}</p>
                          <p><strong>Duración:</strong> {inspection.duration?.hours || 0} horas</p>
                          <p><strong>Observaciones:</strong> {inspection.observations || 'No disponible'}</p>
                          <Button variant="secondary" size="sm" onClick={() => handleShowModal(inspection)}>
                            Editar
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p>No hay inspecciones para este servicio.</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p>No hay servicios para esta empresa.</p>
          )}
        </div>
      ))}
      
      <Button
        onClick={() => handleShowModal()}
        style={{
          marginTop: '20px',
          padding: '10px 20px',
          fontSize: '16px',
          borderRadius: '4px',
          border: 'none',
          backgroundColor: '#4CAF50',
          color: 'white',
          cursor: 'pointer',
        }}
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
