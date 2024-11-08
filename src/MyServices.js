import React, { useEffect, useState } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { Card, Col, Row, Button, Table, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useNavigate } from 'react-router-dom';

function MyServices() {
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [scheduledEvents, setScheduledEvents] = useState([]);
  const [clientNames, setClientNames] = useState({});


  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';

  const [newInspection, setNewInspection] = useState({
    inspection_type: [],
    inspection_sub_type: "",
    date: "",
    time: "",
    duration: "",
    observations: "",
    service_type: "",
    exit_time: "",
  });
   

  useEffect(() => {
    const fetchMyServices = async () => {
      try {
        const response = await axios.get(`http://localhost:10000/api/services`);
        const userServices = response.data.filter(service => service.responsible === userId);
  
        console.log("Servicios filtrados para el usuario:", userServices);
  
        // Obtener nombres de los clientes
        const clientData = {};
        for (const service of userServices) {
          if (service.client_id && !clientData[service.client_id]) {
            try {
              const clientResponse = await axios.get(`http://localhost:10000/api/clients/${service.client_id}`);
              clientData[service.client_id] = clientResponse.data.name;
            } catch (error) {
              console.error(`Error fetching client ${service.client_id}:`, error);
            }
          }
        }
        setClientNames(clientData); // Guarda los nombres de los clientes
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

  const navigate = useNavigate();

    const handleSaveInspection = async () => {
    if (!Array.isArray(newInspection.inspection_type) || newInspection.inspection_type.length === 0) {
        alert("Debe seleccionar al menos un tipo de inspección.");
        return;
    }

    if (
        newInspection.inspection_type.includes("Desratización") &&
        !newInspection.inspection_sub_type
    ) {
        alert("Debe seleccionar un Sub tipo para Desratización.");
        return;
    }

    const inspectionData = {
        inspection_type: newInspection.inspection_type,
        inspection_sub_type: newInspection.inspection_type.includes("Desratización")
        ? newInspection.inspection_sub_type
        : null, // Enviar null si no aplica
        service_id: selectedService.id,
        date: moment().format("YYYY-MM-DD"), // Fecha actual
        time: moment().format("HH:mm:ss"), // Hora actual
    };

    try {
        const response = await axios.post("http://localhost:10000/api/inspections", inspectionData);

        if (response.data.success) {
        alert("Inspección guardada con éxito");
        fetchInspections(selectedService.id);
        handleCloseAddInspectionModal();

        // Redirigir al componente de inspección con el ID
        navigate(`/inspection/${response.data.inspection.id}`);
        } else {
        console.error(
            "Error: No se pudo guardar la inspección correctamente.",
            response.data.message
        );
        }
    } catch (error) {
        console.error("Error saving inspection:", error);
    }
    }; 

  const parseServiceType = (serviceType) => {
    if (!serviceType) return [];
    return serviceType
      .replace(/[\{\}]/g, '') // Elimina las llaves { y }
      .split(',') // Divide por comas
      .map(type => type.trim()); // Elimina espacios en blanco
  };

  const parseField = (field) => {
    if (!field) return "No especificado";
    try {
      const parsed = JSON.parse(field.replace(/'/g, '"')); // Reemplazar comillas simples por dobles para JSON válido
      if (Array.isArray(parsed)) {
        return parsed.join(", "); // Agregar un espacio después de la coma
      } else if (typeof parsed === "string") {
        return parsed;
      } else {
        return Object.values(parsed).join(", "); // Agregar un espacio después de la coma
      }
    } catch (error) {
      return field.replace(/[\{\}"]/g, "").split(",").join(", "); // Agregar un espacio después de la coma
    }
  };
  
  

  if (loading) return <div>Cargando servicios...</div>;

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Mis Servicios Agendados (Próximos 7 días)</h2>
      <Row>
        <Col md={12}>
          {Object.keys(groupedServicesByDate).map(dateKey => (
            <div key={dateKey} className="mb-4">
              <h4>{formatDate(dateKey)}</h4>
              <Row style={{ minHeight: 0, height: 'auto' }}>
                {groupedServicesByDate[dateKey].map((service, index) => (
                    <Col md={4} key={`${service.id}-${index}`} className="mb-3">
                    <Card
                        className="mb-3 border"
                        style={{ cursor: "pointer", minHeight: "250px" }}
                        onClick={() => handleServiceClick(service)}
                    >
                        <Card.Body>
                        {/* Encabezado con ID y Tipos de Servicio */}
                        <div className="d-flex align-items-center justify-content-between">
                            <div>
                            <span className="fw-bold text-primary">🛠 S{service.id}</span>
                            <span className="text-muted mx-2">|</span>
                            <span className="text-dark">{parseField(service.service_type)}</span>
                            </div>
                        </div>
                        <hr />

                        {/* Plagas a Controlar */}
                        <div>
                            <span className="text-muted small">Plagas: </span>
                            <span className="text-dark">{parseField(service.pest_to_control)}</span>
                        </div>

                        {/* Áreas de Intervención */}
                        <div className="mt-2">
                            <span className="text-muted small">Áreas: </span>
                            <span className="text-dark">
                            {Array.isArray(service.intervention_areas)
                                ? service.intervention_areas.join(", ")
                                : typeof service.intervention_areas === "string"
                                ? service.intervention_areas.replace(/[\{\}]/g, "").split(",").join(", ")
                                : "No especificadas"}
                            </span>
                        </div>

                        {/* Nombre del Cliente */}
                        <div className="mt-3">
                            <h5 className="text-primary">
                                {clientNames[service.client_id] || "Cliente Desconocido"}
                            </h5>
                        </div>


                        {/* Descripción del Servicio */}
                        <div className="mt-2">
                            <p className="text-muted small">
                            {service.description || "Sin descripción"}
                            </p>
                        </div>

                        {/* Acciones (Eliminar o Editar) */}
                        <div className="d-flex justify-content-end mt-3">
                            <Button
                            variant="outline-danger"
                            size="sm"
                            onClick={(e) => {
                                e.stopPropagation();
                                console.log("Eliminar servicio", service.id);
                            }}
                            >
                            🗑
                            </Button>
                        </div>
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
              <h5>Tipos de Servicio:</h5>
              <ul>
                {parseServiceType(selectedService.service_type).map((type, idx) => (
                  <li key={idx}>{type}</li>
                ))}
              </ul>

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
            {/* Selección de Tipo de Inspección */}
            <Form.Group controlId="formInspectionType" className="mt-3">
                <Form.Label>Tipo de Inspección</Form.Label>
                <div>
                {parseServiceType(selectedService?.service_type || "").map((type, idx) => (
                    <Form.Check
                    key={idx}
                    type="checkbox"
                    label={type.replace(/"/g, "")} // Elimina comillas en el texto
                    value={type.replace(/"/g, "")} // Elimina comillas en el valor
                    onChange={(e) => {
                        const { value, checked } = e.target;
                        setNewInspection((prevInspection) => ({
                        ...prevInspection,
                        inspection_type: checked
                            ? [...(prevInspection.inspection_type || []), value]
                            : prevInspection.inspection_type.filter((t) => t !== value),
                        }));
                    }}
                    />
                ))}
                </div>
            </Form.Group>

            {/* Sub tipo de inspección */}
            {Array.isArray(newInspection.inspection_type) &&
            newInspection.inspection_type.includes("Desratización") && (
                <Form.Group controlId="formInspectionSubType" className="mt-3">
                <Form.Label>Sub tipo</Form.Label>
                <Form.Control
                    as="select"
                    value={newInspection.inspection_sub_type}
                    onChange={(e) =>
                    setNewInspection((prevInspection) => ({
                        ...prevInspection,
                        inspection_sub_type: e.target.value,
                    }))
                    }
                >
                    <option value="">Seleccione una opción</option>
                    <option value="Control">Control</option>
                    <option value="Seguimiento">Seguimiento</option>
                </Form.Control>
                </Form.Group>
            )}
            </Form>
        </Modal.Body>
        <Modal.Footer>
            <Button variant="secondary" onClick={handleCloseAddInspectionModal}>
            Cancelar
            </Button>
            <Button variant="primary" onClick={handleSaveInspection}>
            Guardar Inspección
            </Button>
        </Modal.Footer>
        </Modal>
    </div>
  );
}

export default MyServices;
