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
  const [showAddServiceModal, setShowAddServiceModal] = useState(false); // Estado para el modal de añadir servicio
  const [newService, setNewService] = useState({
    service_type: '',
    description: '',
    pest_to_control:'',
    intervention_areas:'',
    responsible:'',
    category:'',
    quantity_per_month:'',
    date: '',
    time: '',
    client_id: '', // Id del cliente al que pertenece el servicio
    value:'',
    companion:'',
    created_by:'',
    created_at:'',
  });
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
          datetime: moment(`${inspection.date} ${inspection.time}`, 'YYYY-MM-DD HH:mm'),
          observations: inspection.observations || 'Sin observaciones'
        }))
        .sort((a, b) => b.datetime - a.datetime);
        .sort((a, b) => b.datetime - a.datetime);
      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };
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
    setNewService({
      ...newService,
      created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual
    });
    setShowAddServiceModal(true);
  };

  const handleCloseAddServiceModal = () => setShowAddServiceModal(false);

  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
  };

  const handleSaveNewService = async () => {
    try {
      const response = await axios.post('http://localhost:10000/api/services', newService);

      if (response.data.success) {
        setServices([...services, response.data.service]); // Agregar nuevo servicio a la lista
        handleCloseAddServiceModal();
      } else {
        console.error("Error: No se pudo guardar el servicio.", response.data.message);
      }
    } catch (error) {
      console.error("Error saving new service:", error);
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
      <Button variant="primary" onClick={handleShowAddServiceModal} className="mb-4">
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

      <Modal show={showAddServiceModal} onHide={handleCloseAddServiceModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formServiceType">
              <Form.Label>Tipo de Servicio</Form.Label>
              <Form.Control
                type="text"
                name="service_type"
                value={newService.service_type}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formDescription" className="mt-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={newService.description}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formDate" className="mt-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={newService.date}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formTime" className="mt-3">
              <Form.Label>Hora</Form.Label>
              <Form.Control
                type="time"
                name="time"
                value={newService.time}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formClientId" className="mt-3">
              <Form.Label>Cliente</Form.Label>
              <Form.Control
                as="select"
                name="client_id"
                value={newService.client_id}
                onChange={handleNewServiceChange}
              >
                <option value="">Seleccione un cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>
          </Form>
        </Modal.Body>
      </Modal>

      {/* Modal para añadir un nuevo servicio */}
      <Modal show={showAddServiceModal} onHide={handleCloseAddServiceModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formServiceType">
              <Form.Label>Tipo de Servicio</Form.Label>
              <Form.Control
                as="select"
                name="service_type"
                value={newService.service_type}
                onChange={handleNewServiceChange}
                multiple
              >
                <option value="">Seleccione un tipo de servicio</option>
                <option value="Desinsectación">Desinsectación</option>
                <option value="Desratización">Desratización</option>
                <option value="Desinfección">Desinfección</option>
                <option value="Roceria">Roceria</option>
                <option value="Limpieza y aseo de archivos">Limpieza y aseo de archivos</option>
                <option value="Lavado shut basura">Lavado shut basura</option>
                <option value="Encarpado">Encarpado</option>
                <option value="Lavado de tanque">Lavado de tanque</option>
                <option value="Inspección">Inspección</option>
                <option value="Diagnostico">Diagnostico</option>
              </Form.Control>
            </Form.Group>
            <Form.Group controlId="formDescription" className="mt-3">
              <Form.Label>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={newService.description}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formPestToControl">
              <Form.Label>Plaga a Controlar</Form.Label>
              <Form.Control
                as="select"
                name="pest_to_control"
                value={newService.pest_to_control}
                onChange={handleNewServiceChange}
              >
                <option value="">Seleccione un tipo de Plaga</option>
                <option value="Moscas">Moscas</option>
                <option value="Zancudos">Zancudos</option>
                <option value="Cucarachas">Cucarachas</option>
                <option value="Hormigas">Hormigas</option>
                <option value="Pulgas">Pulgas</option>
                <option value="Rata de alcantarilla">Rata de alcantarilla</option>
                <option value="Rata de techo">Rata de techo</option>
                <option value="Rata de campo">Rata de campo</option>
                <option value="Virus">Virus</option>
                <option value="Hongos">Hongos</option>
                <option value="Bacterias">Bacterias</option>
                <option value="Gorgojos">Gorgojos</option>
                <option value="Escarabajos">Escarabajos</option>
              </Form.Control>
            </Form.Group>

            <Form.Group controlId="formInterventionAreas" className="mt-3">
              <Form.Label>Áreas de Intervención</Form.Label>
              <Form.Control
                type="text"
                name="intervention_areas"
                value={newService.intervention_areas}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formResponsible" className="mt-3">
              <Form.Label>Responsable</Form.Label>
              <Form.Control
                type="text"
                name="responsible"
                value={newService.responsible}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formCategory" className="mt-3">
              <Form.Label>Categoría</Form.Label>
              <Form.Control
                type="text"
                name="category"
                value={newService.category}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formQuantityPerMonth" className="mt-3">
              <Form.Label>Cantidad al Mes</Form.Label>
              <Form.Control
                type="number"
                name="quantity_per_month"
                value={newService.quantity_per_month}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formDate" className="mt-3">
              <Form.Label>Fecha</Form.Label>
              <Form.Control
                type="date"
                name="date"
                value={newService.date}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formTime" className="mt-3">
              <Form.Label>Hora</Form.Label>
              <Form.Control
                type="time"
                name="time"
                value={newService.time}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formClientId" className="mt-3">
              <Form.Label>Cliente</Form.Label>
              <Form.Control
                as="select"
                name="client_id"
                value={newService.client_id}
                onChange={handleNewServiceChange}
              >
                <option value="">Seleccione un cliente</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Form.Control>
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
            <Form.Group controlId="formCompanion" className="mt-3">
              <Form.Label>Acompañante</Form.Label>
              <Form.Control
                type="text"
                name="companion"
                value={newService.companion}
                onChange={handleNewServiceChange}
              />
            </Form.Group>
            <Form.Group controlId="formCreatedBy" className="mt-3">
              <Form.Label>Creado Por</Form.Label>
              <Form.Control
                type="text"
                name="created_by"
                value={newService.created_by}
                onChange={handleNewServiceChange}
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
          <Button variant="secondary" onClick={handleCloseAddServiceModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleSaveNewService}>Guardar Servicio</Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
}

export default ServiceList;
