import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Button, Table, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function MyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]);

  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';

  const [newInspection, setNewInspection] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_type: '',
    exit_time: '',
  });

  useEffect(() => {
    const fetchMyServices = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/services`);
        const userServices = response.data.filter(service => service.responsible === userId);
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
        const response = await axios.get('http://localhost:10000/api/service-schedule');
        setScheduledEvents(response.data);
      } catch (error) {
        console.error("Error fetching scheduled events:", error);
      }
    };
    fetchScheduledEvents();
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
      const response = await axios.get(`http://localhost:10000/api/inspections?service_id=${serviceId}`);
      const formattedInspections = response.data
        .filter(inspection => inspection.service_id === serviceId)
        .sort((a, b) => b.datetime - a.datetime);
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

  const handleSaveInspection = async () => {
    try {
      const response = await axios.post('http://localhost:10000/api/inspections', {
        ...newInspection,
        service_id: selectedService.id,
      });

      if (response.data.success) {
        alert("Inspección guardada con éxito");
        fetchInspections(selectedService.id);
        handleCloseAddInspectionModal();
      } else {
        console.error("Error: No se pudo guardar la inspección correctamente.", response.data.message);
      }
    } catch (error) {
      console.error("Error saving inspection:", error);
    }
  };

  if (loading) return <div>Cargando servicios...</div>;

  return (
    <div className="container mt-4" style={{ minHeight: 0, height: 'auto' }}>
      <h2 className="text-primary mb-4">Mis Servicios Agendados (Próximos 7 días)</h2>
      <Row style={{ minHeight: 0, height: 'auto' }}>
        <Col md={12} style={{ minHeight: 0, height: 'auto' }}>
          {Object.keys(groupedServicesByDate).map(dateKey => (
            <div key={dateKey} className="mb-4" style={{ minHeight: 0, height: 'auto' }}>
              <h4>{formatDate(dateKey)}</h4>
              <Row style={{ minHeight: 0, height: 'auto' }}>
                {groupedServicesByDate[dateKey].map((service, index) => (
                  <Col md={4} key={`${service.id}-${index}`} className="mb-3" style={{ minHeight: 0, height: 'auto' }}>
                    <Card
                      className="mb-3"
                      onClick={() => handleServiceClick(service)}
                      style={{ cursor: "pointer", minHeight: "200px" }}
                    >
                      <Card.Body>
                        <Card.Title>{service.service_type}</Card.Title>
                        <Card.Text>
                          <strong>Descripción:</strong> {service.description}<br />
                          <strong>Hora:</strong> {service.time}
                        </Card.Text>
                        <Button variant="outline-success" size="sm" onClick={(e) => {
                          e.stopPropagation();
                          handleShowAddInspectionModal();
                        }}>Añadir Inspección</Button>
                      </Card.Body>
                    </Card>
                  </Col>
                ))}
              </Row>
            </div>
          ))}
        </Col>
      </Row>

      {/* Modal para mostrar los detalles del servicio */}
      <Modal show={showServiceModal} onHide={handleCloseServiceModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles del Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedService && (
            <>
              <h4>Servicio: {selectedService.service_type}</h4>
              <p><strong>ID del servicio:</strong> {selectedService.id}</p>
              <p><strong>Descripción:</strong> {selectedService.description}</p>
              <p><strong>Fecha:</strong> {selectedService.date}</p>
              <p><strong>Hora:</strong> {selectedService.time}</p>

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
              <Button variant="link" className="text-success" onClick={handleShowAddInspectionModal}>Añadir Inspección</Button>
            </>
          )}
        </Modal.Body>
      </Modal>

      {/* Modal para añadir una nueva inspección */}
      <Modal show={showAddInspectionModal} onHide={handleCloseAddInspectionModal}>
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
          <Button variant="secondary" onClick={handleCloseAddInspectionModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveInspection}>Guardar cambios</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default MyServices;
