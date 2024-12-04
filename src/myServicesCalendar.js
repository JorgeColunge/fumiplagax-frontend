import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button, Modal, Form, Table } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Plus } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './InspectionCalendar.css';
import moment from 'moment-timezone';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';

const MyServicesCalendar = () => {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]);
    const [services, setServices] = useState([]);
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const calendarRef = useRef(null);
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const [selectedEvent, setSelectedEvent] = useState(null);
    const [showEventModal, setShowEventModal] = useState(false);
    const [selectedService, setSelectedService] = useState('');
    const [scheduleDate, setScheduleDate] = useState(moment().format('YYYY-MM-DD')); // Fecha inicial: Hoy
    const [scheduleStartTime, setScheduleStartTime] = useState(moment().format('HH:mm')); // Hora inicial: Ahora
    const [scheduleEndTime, setScheduleEndTime] = useState(moment().add(1, 'hour').format('HH:mm')); // Hora final: Una hora después
    const [inspections, setInspections] = useState([]);
    const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
    const [newInspection, setNewInspection] = useState({
        inspection_type: [],
        inspection_sub_type: '',
    });
    const socket = useSocket();
    const navigate = useNavigate();


    useEffect(() => {
        if (socket) {
            socket.on("newEvent", (newEvent) => {
                console.log("Nuevo evento recibido:", newEvent);

                // Formatea el nuevo evento si es necesario
                const formattedEvent = {
                    ...newEvent,
                    start: newEvent.start,
                    end: newEvent.end,
                    color: newEvent.color || '#007bff',
                };

                setEvents((prevEvents) => [...prevEvents, formattedEvent]);
            });
        }

        // Limpieza al desmontar
        return () => {
            if (socket) {
                socket.off("newEvent");
            }
        };
    }, [socket]);

    // Obtener información del usuario conectado desde localStorage
    const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
    const userId = storedUserInfo?.id_usuario || '';
    const userColor = storedUserInfo?.color || '#007bff'; // Color del usuario conectado

    useEffect(() => {
        const fetchData = async () => {
            await fetchScheduleAndServices();
        };
        fetchData();
    }, []);

    const fetchScheduleAndServices = async () => {
        try {
            console.log('Fetching schedule and services...');
            
            // Paso 1: Obtén los eventos de la agenda de servicios
            const scheduleResponse = await fetch('http://localhost:10000/api/service-schedule');
            if (!scheduleResponse.ok) throw new Error('Failed to fetch schedule');
            const scheduleData = await scheduleResponse.json();
    
            console.log('Schedule data received:', scheduleData);
    
            // Paso 2: Crea un array para almacenar los eventos formateados
            const formattedEvents = await Promise.all(
                scheduleData.map(async (schedule) => {
                    try {
                        // Paso 3: Consulta la información del servicio
                        const serviceResponse = await fetch(`http://localhost:10000/api/services/${schedule.service_id}`);
                        if (!serviceResponse.ok) throw new Error(`Failed to fetch service for ID: ${schedule.service_id}`);
                        const serviceData = await serviceResponse.json();

                        console.log(`Service data for ID ${schedule.service_id}:`, serviceData);

                        // Logs para depuración
                        console.log(`Usuario conectado: ${userId}`);
                        console.log(`Responsable del servicio: ${serviceData.responsible}`);
                        console.log(`Compañeros en el servicio (raw): ${serviceData.companion}`);

                        // Convertir el campo companion de texto a un array
                        let companionsArray = [];
                        try {
                            companionsArray = JSON.parse(serviceData.companion.replace(/{/g, '[').replace(/}/g, ']').replace(/"/g, '"'));
                            console.log(`Compañeros en el servicio (parsed):`, companionsArray);
                        } catch (error) {
                            console.error(`Error al procesar el campo companion: ${serviceData.companion}`, error);
                        }

                        // Verificar si el usuario conectado es responsable o está en la lista de acompañantes
                        const isCompanion = companionsArray.includes(userId);
                        console.log(`El usuario ${userId} está como acompañante: ${isCompanion}`);

                        // Filtrar servicios donde el usuario conectado es responsable o acompañante
                        if (serviceData.responsible !== userId && !isCompanion) {
                            console.log(`El usuario ${userId} no es responsable ni acompañante del servicio con ID ${schedule.service_id}.`);
                            return null;
                        }

                        console.log(`El usuario ${userId} tiene acceso al servicio con ID ${schedule.service_id}.`);


                        // Paso 4: Consulta el nombre de la empresa usando el client_id
                        let clientName = 'Sin empresa';
                        let clientData;
                        if (serviceData.client_id) {
                            try {
                                const clientResponse = await fetch(`http://localhost:10000/api/clients/${serviceData.client_id}`);
                                if (clientResponse.ok) {
                                    clientData = await clientResponse.json();
                                    clientName = clientData.name || 'Sin nombre';
                                    console.log(`Client data for ID ${serviceData.client_id}:`, clientData);
                                } else {
                                    console.warn(`Failed to fetch client for ID: ${serviceData.client_id}`);
                                }
                            } catch (error) {
                                console.error(`Error fetching client for ID: ${serviceData.client_id}`, error);
                            }
                        }
    
                        // Paso 5: Consulta la información del responsable usando el responsible_id
                        let responsibleName = 'Sin responsable';
                        let responsibleData;
                        if (serviceData.responsible) {
                            try {
                                const responsibleResponse = await fetch(`http://localhost:10000/api/users/${serviceData.responsible}`);
                                if (responsibleResponse.ok) {
                                    responsibleData = await responsibleResponse.json();
                                    responsibleName = `${responsibleData.name || 'Sin nombre'} ${responsibleData.lastname || ''}`.trim();
                                    console.log(`Responsible data for ID ${serviceData.responsible}:`, responsibleData);
                                } else {
                                    console.warn(`Failed to fetch responsible for ID: ${serviceData.responsible}`);
                                }
                            } catch (error) {
                                console.error(`Error fetching responsible for ID: ${serviceData.responsible}`, error);
                            }
                        }
    
                        // Paso 6: Crea el evento formateado
                        const start = moment(`${schedule.date.split('T')[0]}T${schedule.start_time}`).toISOString();
                        const end = schedule.end_time
                            ? moment(`${schedule.date.split('T')[0]}T${schedule.end_time}`).toISOString()
                            : null;
    
                            const formattedEvent = {
                                id: schedule.id,
                                title: `${serviceData.id}`,
                                serviceType: serviceData.service_type || 'Sin tipo',
                                description: serviceData.description || 'Sin descripción',
                                category: serviceData.category || 'Sin categoría', // Nueva propiedad
                                quantyPerMonth: serviceData.quantity_per_month || null, // Nueva propiedad
                                clientName,
                                responsibleId: serviceData.responsible,
                                responsibleName,
                                address: clientData?.address || 'Sin dirección',
                                phone: clientData?.phone || 'Sin teléfono',
                                color: responsibleData?.color || '#fdd835',
                                start,
                                end,
                                allDay: false,
                            };

                        console.log(`Color del responsable: `, responsibleData.color)
    
                        console.log('Formatted event:', formattedEvent);
                        return formattedEvent;
    
                    } catch (error) {
                        console.error(`Error processing schedule with service_id: ${schedule.service_id}`, error);
                        return null; // Retorna nulo si falla algo
                    }
                })
            );

            const validEvents = formattedEvents.filter((event) => event !== null);
            setAllEvents(validEvents);
            setEvents(validEvents);
        } catch (error) {
            console.error('Error loading schedule and services:', error);
        }
    };

    useEffect(() => {
        if (selectedEvent?.title) {
            console.log(`Servicio seleccionado ${selectedEvent.title}`);
            setInspections([]); // Limpia inspecciones anteriores
            fetchInspections(selectedEvent.title); // Carga inspecciones relacionadas con el servicio
        }
    }, [selectedEvent]);  

    // Función para obtener inspecciones asociadas al servicio seleccionado
    const fetchInspections = async (serviceId) => {
        try {
            console.log(`Obteniendo inspecciones para el servicio: ${serviceId}`);
            const response = await fetch(`http://localhost:10000/api/inspections?service_id=${serviceId}`);
            const data = await response.json();
    
            console.log('Inspecciones recibidas del backend:', data);
    
            // Filtrar inspecciones en el frontend (en caso de datos incorrectos)
            const filteredInspections = data.filter(
                (inspection) => inspection.service_id === serviceId
            );
    
            console.log('Inspecciones filtradas:', filteredInspections);
    
            const formattedInspections = filteredInspections.map((inspection) => ({
                ...inspection,
                date: moment(inspection.date).format('DD/MM/YYYY'),
                time: inspection.time ? moment(inspection.time, 'HH:mm:ss').format('HH:mm') : 'No disponible',
                exit_time: inspection.exit_time ? moment(inspection.exit_time, 'HH:mm:ss').format('HH:mm') : 'No disponible',
                observations: inspection.observations || 'Sin observaciones',
            }));
    
            setInspections(formattedInspections);
            console.log('Inspecciones formateadas:', formattedInspections);
        } catch (error) {
            console.error('Error fetching inspections:', error);
        }
    };

    // Función para guardar inspecciones nuevas
    const handleSaveInspection = async () => {
        try {
            const inspectionData = {
                inspection_type: newInspection.inspection_type,
                inspection_sub_type: newInspection.inspection_type.includes('Desratización')
                    ? newInspection.inspection_sub_type
                    : null,
                service_id: selectedEvent.title,
                date: moment().format('YYYY-MM-DD'),
                time: moment().format('HH:mm:ss'),
            };
            try {
                const response = await axios.post("http://localhost:10000/api/inspections", inspectionData);
        
                if (response.data.success) {
                alert("Inspección guardada con éxito");
                fetchInspections(selectedEvent.title); // Actualiza la tabla
                setShowAddInspectionModal(false); // Cierra el modal
        
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
        } catch (error) {
            console.error('Error saving inspection:', error);
        }
    };

    // Función para abrir el modal de inspecciones
    const handleShowAddInspectionModal = () => {
        setShowAddInspectionModal(true);
    };

    // Función para cerrar el modal de inspecciones
    const handleCloseAddInspectionModal = () => {
        setShowAddInspectionModal(false);
        setNewInspection({ inspection_type: [], inspection_sub_type: '' });
    };

    const renderEventContent = (eventInfo) => {
        const { serviceType, clientName } = eventInfo.event.extendedProps;
        const { start, end } = eventInfo.event;
    
        const cleanServiceType = serviceType.replace(/[\{\}"]/g, '').replace(/,/g, ', ');
        const startTime = moment(start).format('h:mm A');
        const endTime = moment(end).format('h:mm A');
    
        return (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip>
                        <div>{cleanServiceType}</div>
                        <div>{clientName}</div>
                    </Tooltip>
                }
            >
                <div className="event-container">
                    <div className="event-id">{eventInfo.event.title}</div>
                    <div className="event-time">{`${startTime} – ${endTime}`}</div>
                </div>
            </OverlayTrigger>
        );
    }

    const handleEventClick = (clickInfo) => {
        const { extendedProps, title, start, end } = clickInfo.event;
        const currentMonth = moment().format('YYYY-MM'); // Mes actual en formato 'YYYY-MM'
    
        // Contar eventos en el mes actual si es periódico
        let scheduledThisMonth = 0;
        if (extendedProps.category === 'Periódico') {
            scheduledThisMonth = allEvents.filter(event => {
                const eventMonth = moment(event.start).format('YYYY-MM');
                return event.title === clickInfo.event.title && eventMonth === currentMonth;
            }).length;
        }
    
        const eventData = {
            id: clickInfo.event.id,
            title: title,
            service_id: title,
            serviceType: extendedProps.serviceType,
            description: extendedProps.description || 'Sin descripción',
            responsibleName: extendedProps.responsibleName || 'Sin responsable',
            clientName: extendedProps.clientName || 'Sin empresa',
            address: extendedProps.address || 'Sin dirección',
            phone: extendedProps.phone || 'Sin teléfono',
            category: extendedProps.category || 'Sin categoría', // Nueva propiedad
            quantyPerMonth: extendedProps.quantyPerMonth || null, // Nueva propiedad
            scheduledThisMonth, // Nueva propiedad: veces agendado en el mes
            startTime: moment(start).format('h:mm A'),
            endTime: moment(end).format('h:mm A'),
        };
        setSelectedEvent(eventData);
        setShowEventModal(true);
    };    

    const handleTodayClick = () => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.today();
    };

    const changeView = (view) => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(view);
        setCurrentView(view);
    };

    const handleScheduleModalClose = () => {
        setScheduleModalOpen(false);
        setSelectedService('');
        setScheduleDate('');
        setScheduleStartTime('');
        setScheduleEndTime('');
    };

    const handleDateSelect = (selectInfo) => {
        const { start, end } = selectInfo;
        setScheduleDate(moment(start).format('YYYY-MM-DD'));
        setScheduleStartTime(moment(start).format('HH:mm'));
        setScheduleEndTime(moment(end).format('HH:mm'));
        setScheduleModalOpen(true); // Abre el modal
    };

    return (
        <div className="d-flex">
            <div className="calendar-container flex-grow-1">
                <div className="card p-4 shadow-sm">
                    <div className="card-header d-flex justify-content-between align-items-center">
                        <div>
                            <Button variant="light" className="me-2" onClick={() => calendarRef.current.getApi().prev()}>
                                <ChevronLeft />
                            </Button>
                            <Button variant="light" className="me-2" onClick={() => calendarRef.current.getApi().next()}>
                                <ChevronRight />
                            </Button>
                            <Button variant="light" className="me-2" onClick={handleTodayClick}>
                                Hoy
                            </Button>
                        </div>
                        <div>
                            <Button
                                variant={currentView === 'dayGridMonth' ? 'dark' : 'success'}
                                className="me-2"
                                onClick={() => changeView('dayGridMonth')}
                            >
                                Mes
                            </Button>
                            <Button
                                variant={currentView === 'timeGridWeek' ? 'dark' : 'success'}
                                className="me-2"
                                onClick={() => changeView('timeGridWeek')}
                            >
                                Semana
                            </Button>
                            <Button
                                variant={currentView === 'timeGridDay' ? 'dark' : 'success'}
                                onClick={() => changeView('timeGridDay')}
                            >
                                Día
                            </Button>
                        </div>
                    </div>
                    <div className="custom-calendar">
                        <FullCalendar
                            ref={calendarRef}
                            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
                            initialView={currentView}
                            headerToolbar={false}
                            locale={esLocale}
                            events={events}
                            editable={true}
                            selectable={true}
                            select={handleDateSelect} // Evento de selección
                            timeZone="local"
                            height="70vh"
                            nowIndicator={true}
                            slotLabelFormat={{ hour: 'numeric', hour12: true, meridiem: 'short' }}
                            eventContent={renderEventContent}
                            eventClick={handleEventClick} // Aquí añadimos el evento
                            dayHeaderContent={({ date }) => (
                                <div className="day-header">
                                    <div className="day-name text-sm text-gray-500">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                                    <div className="day-number text-lg font-bold">{date.getDate()}</div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
            <Modal show={showEventModal} onHide={() => setShowEventModal(false)} centered size="lg">
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Servicio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <div>
                            <p><strong>ID del servicio:</strong> {selectedEvent.title}</p>
                            <p><strong>Tipo de servicio:</strong> {selectedEvent.serviceType.replace(/[\{\}"]/g, '').replace(/,/g, ', ')}</p>
                            <p><strong>Descripción del servicio:</strong> {selectedEvent.description}</p>
                            <p><strong>Responsable:</strong> {selectedEvent.responsibleName}</p>
                            <p><strong>Empresa:</strong> {selectedEvent.clientName}</p>
                            <p><strong>Dirección de la empresa:</strong> {selectedEvent.address}</p>
                            <p><strong>Teléfono:</strong> {selectedEvent.phone}</p>
                            <p><strong>Horario:</strong> {selectedEvent.startTime} - {selectedEvent.endTime}</p>
                            <p><strong>Categoría:</strong> {selectedEvent.category}</p>
                            {selectedEvent.category === 'Periódico' && selectedEvent.quantyPerMonth && (
                                <>
                                <p><strong>Cantidad al mes:</strong> {selectedEvent.quantyPerMonth}</p>
                                <p><strong>Agendado este mes:</strong> {selectedEvent.scheduledThisMonth}</p>
                                </>
                            )}
                            {/* Tabla de inspecciones */}
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
                                        {inspections.map((inspection) => (
                                            <tr
                                                key={inspection.id}
                                                style={{ cursor: 'pointer' }} // Cambia el cursor para indicar que es clickeable
                                                onClick={() => navigate(`/inspection/${inspection.id}`)} // Redirige al hacer clic
                                            >
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
                        <Button variant="link" className="text-success" onClick={handleShowAddInspectionModal}>
                            Añadir Inspección
                        </Button>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEventModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showAddInspectionModal} onHide={handleCloseAddInspectionModal} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Añadir Inspección</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formInspectionType">
                            <Form.Label>Tipo de Inspección</Form.Label>
                            <div>
                                {selectedEvent?.serviceType
                                    ?.replace(/[\{\}"]/g, '')
                                    .split(',')
                                    .map((type, index) => (
                                        <Form.Check
                                            key={index}
                                            type="checkbox"
                                            label={type.trim()}
                                            value={type.trim()}
                                            checked={newInspection.inspection_type?.includes(type.trim())}
                                            onChange={(e) => {
                                                const { value, checked } = e.target;
                                                setNewInspection((prev) => ({
                                                    ...prev,
                                                    inspection_type: checked
                                                        ? [...(prev.inspection_type || []), value]
                                                        : prev.inspection_type.filter((t) => t !== value),
                                                }));
                                            }}
                                        />
                                    ))}
                            </div>
                        </Form.Group>
                        {Array.isArray(newInspection.inspection_type) &&
                            newInspection.inspection_type.includes('Desratización') && (
                                <Form.Group controlId="formInspectionSubType" className="mt-3">
                                    <Form.Label>Sub tipo</Form.Label>
                                    <Form.Control
                                        as="select"
                                        value={newInspection.inspection_sub_type}
                                        onChange={(e) =>
                                            setNewInspection((prev) => ({
                                                ...prev,
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
                    <Button variant="success" onClick={handleSaveInspection}>
                        Guardar Inspección
                    </Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
    
};

export default MyServicesCalendar;
