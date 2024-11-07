import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Button, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function MyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);

  // Obtén la información del usuario logueado desde el localStorage
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';

  // Estado para manejar la inspección seleccionada
  const [newInspection, setNewInspection] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_type: '',
    exit_time: '',
  });

  // Función para obtener los servicios del usuario logueado
  useEffect(() => {
    const fetchMyServices = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/services?user_id=${userId}`);
        setServices(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching services:", error);
        setLoading(false);
      }
    };
    fetchMyServices();
  }, [userId]);

  if (loading) return <div>Cargando servicios...</div>;

  // Función para abrir el modal de inspección
  const handleShowModal = (service) => {
    setSelectedService(service);
    setNewInspection({
      date: '',
      time: '',
      duration: '',
      observations: '',
      service_type: service.service_type || '',
      exit_time: '',
    });
    setShowModal(true);
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
        alert("Inspección guardada con éxito");
        handleCloseModal();
      } else {
        console.error("Error: No se pudo guardar la inspección correctamente.", response.data.message);
      }
    } catch (error) {
      console.error("Error saving inspection:", error);
    }
  };

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Mis Servicios</h2>
      
      <Row>
        {services.map((service) => (
          <Col md={6} key={service.id}>
            <Card
              className="mb-3"
              onClick={() => setSelectedService(service)}
              style={{ cursor: "pointer", minHeight: "200px" }}
            >
              <Card.Body>
                <Card.Title>{service.service_type}</Card.Title>
                <Card.Text>
                  <strong>Descripción:</strong> {service.description}<br />
                  <strong>Fecha:</strong> {service.date}<br />
                  <strong>Hora:</strong> {service.time}
                </Card.Text>
                <div className="d-flex justify-content-between mt-3">
                  <Button variant="outline-success" size="sm" onClick={() => handleShowModal(service)}>Añadir Inspección</Button>
                </div>
              </Card.Body>
            </Card>
          </Col>
        ))}
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
    </div>
  );
}

export default MyServices;
