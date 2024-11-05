import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form, Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function ServiceList() {
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [newInspection, setNewInspection] = useState({
    date: '',
    time: '',
    duration: '',
    observations: '',
    service_type: '',
    exit_time: '',
  });
  const [newService, setNewService] = useState({
    service_type: '',
    description: '',
    plaga_a_controlar: '',
    areas_a_intervenir: '',
    categoria: '',
    cantidad_al_mes: '',
    cliente: '',
    value: '',
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

  const fetchInspections = async (serviceId) => {
    try {
      const response = await axios.get(`http://localhost:10000/api/inspections?service_id=${serviceId}`);
      const formattedInspections = response.data
        .map(inspection => ({
          ...inspection,
          time: inspection.time ? moment(inspection.time, 'HH:mm').format('HH:mm') : 'Hora inválida',
          exit_time: inspection.exit_time ? moment(inspection.exit_time, 'HH:mm').format('HH:mm') : 'Hora inválida',
          date: moment(inspection.date).format('DD/MM/YYYY'),
          datetime: moment(`${inspection.date} ${inspection.time}`, 'YYYY-MM-DD HH:mm'),
          observations: inspection.observations || 'Sin observaciones'
        }))
        .sort((a, b) => b.datetime - a.datetime);
      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
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
      const response = await axios.post(`http://localhost:10000/api/inspections`, {
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

  const handleShowServiceModal = () => {
    setShowServiceModal(true);
  };

  const handleCloseServiceModal = () => {
    setShowServiceModal(false);
    setNewService({
      service_type: '',
      description: '',
      plaga_a_controlar: '',
      areas_a_intervenir: '',
      categoria: '',
      cantidad_al_mes: '',
      cliente: '',
      value: '',
    });
  };

  const handleServiceInputChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
  };

  const handleSaveService = async () => {
    const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
    const { service_type, description, plaga_a_controlar, areas_a_intervenir, categoria, cliente, value } = newService;

    if (!service_type || !description || !plaga_a_controlar || !areas_a_intervenir || !categoria || !cliente || !value) {
      alert("Todos los campos son obligatorios, excepto 'Cantidad al mes'.");
      return;
    }

    try {
      const response = await axios.post('http://localhost:10000/api/services', {
        ...newService,
        client_id: cliente,
        pest_to_control: plaga_a_controlar,
        intervention_areas: areas_a_intervenir,
        category: categoria,
        created_by: storedUserInfo?.id || "default_user_id"
      });

      if (response.data.success) {
        setServices(prevServices => [...prevServices, response.data.service]);
        handleCloseServiceModal();
      } else {
        console.error("Error: No se pudo crear el servicio correctamente.", response.data.message);
      }
    } catch (error) {
      console.error("Error saving service:", error);
    }
  };

  if (loading) return <div><Spinner animation="border" /> Cargando servicios...</div>;

  const groupedServices = clients.map(client => ({
    client,
    services: services.filter(service => service.client_id === client.id),
  }));

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Servicios Pendientes</h2>
      <Button variant="primary" className="mb-4" onClick={handleShowServiceModal}>
        Añadir Servicio
      </Button>
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
      <Modal show={showServiceModal} onHide={handleCloseServiceModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formServiceType">
              <Form.Label>Tipo de Servicio</Form.Label>
              <Form.Control type="text" name="service_type" value={newService.service_type} onChange={handleServiceInputChange} />
            </Form.Group>
            <Form.Group controlId="formDescription" className="mt-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control type="text" name="description" value={newService.description} onChange={handleServiceInputChange} />
            </Form.Group>
            <Form.Group controlId="formPlagaAControlar" className="mt-3">
              <Form.Label>Plaga a Controlar</Form.Label>
              <Form.Control type="text" name="plaga_a_controlar" value={newService.plaga_a_controlar} onChange={handleServiceInputChange} />
            </Form.Group>
            <Form.Group controlId="formAreasAIntervenir" className="mt-3">
              <Form.Label>Áreas a Intervenir</Form.Label>
              <Form.Control type="text" name="areas_a_intervenir" value={newService.areas_a_intervenir} onChange={handleServiceInputChange} />
            </Form.Group>
            <Form.Group controlId="formCategoria" className="mt-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Control as="select" name="categoria" value={newService.categoria} onChange={handleServiceInputChange}>
                <option value="">Seleccionar</option>
                <option value="Puntual">Puntual</option>
                <option value="Periodico">Periodico</option>
              </Form.Control>
            </Form.Group>
            {newService.categoria === "Periodico" && (
              <Form.Group controlId="formCantidadAlMes" className="mt-3">
                <Form.Label>Cantidad al Mes</Form.Label>
                <Form.Control type="number" name="cantidad_al_mes" value={newService.cantidad_al_mes} onChange={handleServiceInputChange} />
              </Form.Group>
            )}
            <Form.Group controlId="formCliente" className="mt-3">
              <Form.Label>Cliente</Form.Label>
              <Form.Control as="select" name="cliente" value={newService.cliente} onChange={handleServiceInputChange}>
                <option value="">Seleccionar Cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>{client.name}</option>
                ))}
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="formValue" className="mt-3">
              <Form.Label>Valor</Form.Label>
              <Form.Control type="number" name="value" value={newService.value} onChange={handleServiceInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseServiceModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveService}>Guardar Servicio</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ServiceList;
