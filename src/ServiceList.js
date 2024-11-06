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
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
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
    companion: '',
    created_by: '',
    created_at: '',
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
      <Modal show={showAddServiceModal} onHide={handleCloseAddServiceModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
          <Form.Group controlId="formServiceType">
  <Form.Label>Tipo de Servicio</Form.Label>
  <div>
    {serviceOptions.map((option) => (
      <Form.Check
        key={option}
        type="checkbox"
        label={option}
        value={option}
        checked={newService.service_type.includes(option)}
        onChange={(e) => handleServiceTypeChange(e)}
      />
    ))}
  </div>
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