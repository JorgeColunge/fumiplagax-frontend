import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
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
  const [newInspection, setNewInspection] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_type: '',
    exit_time: '',
  });

  useEffect(() => {
    const fetchServicesAndClients = async () => {
      try {
        const servicesResponse = await axios.get('http://localhost:10000/api/services');
        const clientsResponse = await axios.get('http://localhost:10000/api/clients');
        setServices(servicesResponse.data);
        setClients(clientsResponse.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchServicesAndClients();
  }, []);

  // Fetch inspections for the selected service
  const fetchInspections = async (serviceId) => {
    try {
      const response = await axios.get(`http://localhost:10000/api/inspections?service_id=${serviceId}`);
  
      const formattedInspections = response.data.map(inspection => {
        console.log("Raw inspection data:", inspection);
        return {
          ...inspection,
          time: inspection.time ? moment(inspection.time, 'HH:mm').format('HH:mm') : 'Hora inválida',
          exit_time: inspection.exit_time ? moment(inspection.exit_time, 'HH:mm').format('HH:mm') : 'Hora inválida',
          date: moment(inspection.date).format('DD/MM/YYYY'),
          observations: inspection.observations || 'Sin observaciones'
        };
      });
      console.log("Formatted inspections data:", formattedInspections);
      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };  

  // Manejar la selección del servicio
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

  // Manejar cambios en el formulario modal
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewInspection({ ...newInspection, [name]: value });
  };

  // Guardar la nueva inspección
  const handleSaveInspection = async () => {
    try {
      console.log("New inspection data before saving:", newInspection);
      const response = await axios.post(`http://localhost:10000/api/inspections`, {
        ...newInspection,
        service_id: selectedService.id
      });
      console.log("Saved inspection response:", response.data);

      const newInspectionFormatted = {
        ...response.data,
        time: response.data.time ? moment(response.data.time, 'HH:mm').format('HH:mm') : 'Hora inválida',
        exit_time: response.data.exit_time ? moment(response.data.exit_time, 'HH:mm').format('HH:mm') : 'Hora inválida',
        date: moment(response.data.date).format('DD/MM/YYYY'),
        observations: response.data.observations || 'Sin observaciones'
      };
      
      console.log("Formatted new inspection after saving:", newInspectionFormatted);

      setInspections([...inspections, newInspectionFormatted]);
      handleCloseModal();
    } catch (error) {
      console.error("Error saving inspection:", error);
    }
  };

  if (loading) return <div>Cargando servicios...</div>;

  const groupedServices = clients.map(client => ({
    client,
    services: services.filter(service => service.client_id === client.id),
  }));

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Servicios Pendientes</h2>
      <Row>
        <Col md={open ? 5 : 12}>
          <div className="service-list">
            {groupedServices.map(({ client, services }) => (
              <div key={client.id} className="mb-4">
                <h5 className="text-muted">{client.name}</h5>
                <Row>
                  {services.length > 0 ? (
                    services.map(service => (
                      <Col md={6} key={service.id}>
                        <Card
                          className={`mb-3 ${selectedService?.id === service.id ? 'border-success' : ''}`}
                          onClick={() => handleServiceClick(service)}
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
                              <Button variant="outline-success" size="sm">Generar Informe</Button>
                              <Button variant="outline-primary" size="sm">Novedad en Estación</Button>
                            </div>
                          </Card.Body>
                        </Card>
                      </Col>
                    ))
                  ) : (
                    <p>No hay servicios para este cliente</p>
                  )}
                </Row>
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
                  <p><strong>Responsable:</strong> {selectedService.responsible}</p>
                  <p><strong>Categoría:</strong> {selectedService.category}</p>
                  {selectedService.category === 'Periodico' && (
                    <p><strong>Cantidad al mes:</strong> {selectedService.quantity_per_month}</p>
                  )}
                  <p><strong>Valor:</strong> ${selectedService.value}</p>
                  <p><strong>Acompañante:</strong> {selectedService.companion}</p>

                  {/* Tabla de Inspecciones */}
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

                  {/* Botón para añadir inspección */}
                  <Button variant="link" className="text-success" onClick={handleShowModal}>Añadir</Button>

                  {/* Botones de acción */}
                  <div className="d-flex justify-content-start mt-3">
                    <Button variant="primary" className="me-2">Generar Informe</Button>
                    <Button variant="secondary" className="me-2">Novedad en Estación</Button>
                    <Button variant="danger">Eliminar</Button>
                  </div>
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
              <Form.Control
                type="date"
                name="date"
                value={newInspection.date}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="formStartTime" className="mt-3">
              <Form.Label>Hora de Inicio</Form.Label>
              <Form.Control
                type="time"
                name="time"
                value={newInspection.time}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="formEndTime" className="mt-3">
              <Form.Label>Hora de Finalización</Form.Label>
              <Form.Control
                type="time"
                name="exit_time"
                value={newInspection.exit_time}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="formDuration" className="mt-3">
              <Form.Label>Duración (horas)</Form.Label>
              <Form.Control
                type="number"
                name="duration"
                value={newInspection.duration}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="formObservations" className="mt-3">
              <Form.Label>Observaciones</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="observations"
                value={newInspection.observations}
                onChange={handleInputChange}
              />
            </Form.Group>
            <Form.Group controlId="formServiceType" className="mt-3">
              <Form.Label>Servicio</Form.Label>
              <Form.Control
                type="text"
                name="service_type"
                value={newInspection.service_type}
                readOnly
              />
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

export default ServiceList;
