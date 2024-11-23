import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button, Modal, Form, Col, Row } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Plus } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './InspectionCalendar.css';
import moment from 'moment-timezone';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

const InspectionCalendar = () => {
    const [events, setEvents] = useState([]);
    const [allEvents, setAllEvents] = useState([]); // Todos los eventos cargados
    const [services, setServices] = useState([]);
    const calendarRef = useRef(null);
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
    const [selectedService, setSelectedService] = useState('');
    const [selectedEvent, setSelectedEvent] = useState(null); // Evento seleccionado
    const [showEventModal, setShowEventModal] = useState(false); // Estado del modal
    const [scheduleDate, setScheduleDate] = useState(moment().format('YYYY-MM-DD')); // Fecha inicial: Hoy
    const [scheduleStartTime, setScheduleStartTime] = useState(moment().format('HH:mm')); // Hora inicial: Ahora
    const [scheduleEndTime, setScheduleEndTime] = useState(moment().add(1, 'hour').format('HH:mm')); // Hora final: Una hora después
    const [users, setUsers] = useState([]); // Lista de usuarios
    const [isCollapsed, setIsCollapsed] = useState(true); // Estado de la columna colapsable
    const [selectedUsers, setSelectedUsers] = useState([]); // Lista de usuarios seleccionados


    const userTimeZone = moment.tz.guess();

    useEffect(() => {
        const fetchData = async () => {
            await fetchScheduleAndServices();
            await fetchServices(); // Carga todos los servicios
            await fetchUsers();
        };
        fetchData();
    }, []);

    // Efecto para filtrar eventos al cambiar los usuarios seleccionados
    useEffect(() => {
        filterEvents();
    }, [selectedUsers]);

    const filterEvents = () => {
        const filteredEvents = allEvents.filter((event) =>
            selectedUsers.includes(event.responsibleId)
        );
        setEvents(filteredEvents);
    };

    const fetchUsers = async () => {
        try {
            const response = await fetch('http://localhost:10000/api/users');
            if (!response.ok) throw new Error('Error al cargar usuarios');
            const data = await response.json();
            setUsers(data); // Guardar usuarios en el estado
            setSelectedUsers(data.map((user) => user.id));
        } catch (error) {
            console.error('Error al cargar usuarios:', error);
        }
    };

    const toggleCollapse = () => {
        setIsCollapsed(!isCollapsed);
    };
    
    const fetchServices = async () => {
        try {
            console.log('Fetching all services...');
            const response = await fetch('http://localhost:10000/api/services');
            if (!response.ok) throw new Error('Failed to fetch services');
            const data = await response.json();
            console.log('Services received:', data);
    
            // Formatear los servicios con el cliente
            const formattedServices = await Promise.all(
                data.map(async (service) => {
                    let clientName = 'Sin empresa';
                    if (service.client_id) {
                        try {
                            const clientResponse = await fetch(`http://localhost:10000/api/clients/${service.client_id}`);
                            if (clientResponse.ok) {
                                const clientData = await clientResponse.json();
                                clientName = clientData.name || 'Sin nombre';
                            }
                        } catch (error) {
                            console.error(`Error fetching client for service ID ${service.id}`, error);
                        }
                    }
                    return {
                        ...service,
                        clientName,
                    };
                })
            );
    
            setServices(formattedServices);
            console.log('Formatted services:', formattedServices);
        } catch (error) {
            console.error('Error loading services:', error);
        }
    };

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
    
            // Filtra los eventos nulos en caso de errores
            const validEvents = formattedEvents.filter(event => event !== null);
    
            // Paso 7: Actualiza el estado con los eventos válidos
            setAllEvents(validEvents);
            setEvents(validEvents);
            console.log('Events set in state:', validEvents);
    
        } catch (error) {
            console.error('Error loading schedule and services:', error);
        }
    };

    const groupByRole = (users) => {
        return users.reduce((groups, user) => {
            const role = user.rol || 'Sin Rol';
            if (!groups[role]) groups[role] = [];
            groups[role].push(user);
            return groups;
        }, {});
    };    

    const handleUserSelection = (userId) => {
        setSelectedUsers((prevSelected) => {
            if (prevSelected.includes(userId)) {
                return prevSelected.filter((id) => id !== userId); // Deseleccionar
            } else {
                return [...prevSelected, userId]; // Seleccionar
            }
        });
    };
    
    const toggleSelectAll = () => {
        if (selectedUsers.length === users.length) {
            setSelectedUsers([]); // Deseleccionar todos
        } else {
            setSelectedUsers(users.map((user) => user.id)); // Seleccionar todos
        }
    };
    
    const renderEventContent = (eventInfo) => {
        const { serviceType, clientName } = eventInfo.event.extendedProps;
        const { start, end } = eventInfo.event;
    
        const cleanServiceType = serviceType.replace(/[\{\}"]/g, ''); // Elimina {} y ""
        const startTime = moment(start).format('h:mm A');
        const endTime = moment(end).format('h:mm A');
    
        return (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip>
                        <div>{cleanServiceType}</div> {/* Ahora muestra solo el texto limpio */}
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
    };    

    const changeView = (view) => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(view);
        setCurrentView(view);
    };

    const handleTodayClick = () => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.today();
    };
    

    const handleEventClick = (clickInfo) => {
        const { extendedProps, start, end } = clickInfo.event;
        const eventData = {
            id: clickInfo.event.id,
            serviceType: extendedProps.serviceType,
            description: extendedProps.description || 'Sin descripción',
            responsibleName: extendedProps.responsibleName || 'Sin responsable',
            clientName: extendedProps.clientName || 'Sin empresa',
            address: extendedProps.address || 'Sin dirección',
            phone: extendedProps.phone || 'Sin teléfono',
            startTime: moment(start).format('h:mm A'),
            endTime: moment(end).format('h:mm A'),
        };
        setSelectedEvent(eventData);
        setShowEventModal(true);
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
    

    const handleScheduleService = async () => {
        try {
            if (!selectedService || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
                alert('Todos los campos son obligatorios');
                return;
            }
    
            const selectedServiceData = services.find(service => service.id === selectedService);
    
            const newSchedule = {
                service_id: selectedService,
                date: scheduleDate,
                start_time: scheduleStartTime,
                end_time: scheduleEndTime,
            };
    
            const response = await fetch('http://localhost:10000/api/service-schedule', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newSchedule),
            });
    
            if (!response.ok) {
                throw new Error('Failed to schedule service');
            }
    
            const createdSchedule = await response.json();
            console.log('New schedule created:', createdSchedule);
    
            const formattedEvent = {
                id: createdSchedule.id,
                title: `${selectedServiceData.id}`,
                serviceType: selectedServiceData.service_type || 'Sin tipo',
                clientName: selectedServiceData.clientName || 'Sin empresa',
                description: selectedServiceData.description || 'Sin descripción',
                start: moment(`${scheduleDate}T${scheduleStartTime}`).toISOString(),
                end: moment(`${scheduleDate}T${scheduleEndTime}`).toISOString(),
                allDay: false,
            };
    
            setEvents((prevEvents) => [...prevEvents, formattedEvent]);
            handleScheduleModalClose();
        } catch (error) {
            console.error('Error scheduling service:', error);
        }
    };
    

    return (
        <div className="d-flex">
            {/* Contenedor principal */}
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
                            <Button variant={currentView === 'dayGridMonth' ? 'dark' : 'primary'} className="me-2" onClick={() => changeView('dayGridMonth')}>
                                Mes
                            </Button>
                            <Button variant={currentView === 'timeGridWeek' ? 'dark' : 'primary'} className="me-2" onClick={() => changeView('timeGridWeek')}>
                                Semana
                            </Button>
                            <Button variant={currentView === 'timeGridDay' ? 'dark' : 'primary'} onClick={() => changeView('timeGridDay')}>
                                Día
                            </Button>
                            <Button variant="primary" className="ms-2" onClick={() => setScheduleModalOpen(true)}>
                                <Plus className="me-1" /> Agendar Servicio
                            </Button>
                        </div>
                    </div>
                    <div className="card-body">
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
                {/* Columna colapsable */}
                <div
                className={`user-column bg-light shadow-sm ${isCollapsed ? 'collapsed' : ''}`}
                style={{
                    width: isCollapsed ? '50px' : '250px',
                    transition: 'width 0.3s ease',
                }}
            >
                <div className="d-flex flex-column align-items-center py-3">
                    <Button variant="outline-primary" onClick={toggleCollapse} className="mb-3">
                        {isCollapsed ? '<' : '>'}
                    </Button>
                    {!isCollapsed && (
                        <div className="user-list w-100 px-3">
                        <div
                            className={`user-item-all d-flex flex-row align-items-center p-2 mb-3 ${
                                selectedUsers.length === users.length ? 'selected' : ''
                            }`}
                            onClick={toggleSelectAll}
                            style={{
                                cursor: 'pointer',
                                borderRadius: '5px',
                            }}
                        >
                            <div className="flex-grow-1 text-center text-dark fw-bold">Todos</div>
                        </div>
                        {Object.entries(groupByRole(users)).map(([role, roleUsers]) => (
                            <div key={role} className="mb-4">
                                <h6 className="text-secondary text-uppercase">{role}</h6>
                                {roleUsers.map((user) => (
                                    <div
                                        key={user.id}
                                        className={`user-item d-flex flex-column align-items-center p-3 ${
                                            selectedUsers.includes(user.id) ? 'selected' : ''
                                        }`}
                                        onClick={() => handleUserSelection(user.id)}
                                        style={{
                                            cursor: 'pointer',
                                            borderRadius: '10px',
                                            transition: 'background-color 0.2s ease',
                                            textAlign: 'center',
                                            position: 'relative', // Para posicionar el cuadro en relación al contenedor
                                        }}
                                    >
                                        {/* Cuadro de color */}
                                        <div
                                            style={{
                                                position: 'absolute',
                                                top: '5px',
                                                right: '5px',
                                                width: '15px',
                                                height: '15px',
                                                borderRadius: '3px',
                                                backgroundColor: user.color, // Color del usuario
                                            }}
                                        ></div>
                    
                                        <img
                                            src={`http://localhost:10000${user.image}`}
                                            alt={user.name}
                                            className="rounded-circle"
                                            style={{
                                                width: '90px',
                                                height: '90px',
                                                objectFit: 'cover',
                                                marginBottom: '5px',
                                            }}
                                        />
                                        <div>
                                            <strong style={{ fontSize: '14px', color: '#333' }}>{user.name}</strong>
                                            <br />
                                            <small style={{ fontSize: '12px', color: '#666' }}>{user.rol}</small>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ))}
                    </div>                    
                    )}
                </div>
            </div>

            <Modal show={scheduleModalOpen} onHide={handleScheduleModalClose} backdrop="static" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Agendar Servicio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        {/* Campo de selección de servicio */}
                        <Form.Group controlId="formServiceSelect" className="mb-3">
                            <Form.Label>Servicio</Form.Label>
                            <Form.Select
                                value={selectedService}
                                onChange={(e) => setSelectedService(e.target.value)}
                            >
                                <option value="">Selecciona un servicio</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {`${service.id} - ${service.service_type || 'Sin tipo'} - ${service.clientName || 'Sin empresa'}`}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>

                        {/* Campo de fecha */}
                        <Form.Group controlId="formScheduleDate" className="mb-3">
                            <Form.Label>Fecha</Form.Label>
                            <Form.Control
                                type="date"
                                value={scheduleDate}
                                onChange={(e) => setScheduleDate(e.target.value)}
                            />
                        </Form.Group>

                        {/* Campo de hora de inicio */}
                        <Form.Group controlId="formScheduleStartTime" className="mb-3">
                            <Form.Label>Hora de Inicio</Form.Label>
                            <Form.Control
                                type="time"
                                value={scheduleStartTime}
                                onChange={(e) => setScheduleStartTime(e.target.value)}
                            />
                        </Form.Group>

                        {/* Campo de hora de finalización */}
                        <Form.Group controlId="formScheduleEndTime" className="mb-3">
                            <Form.Label>Hora de Fin</Form.Label>
                            <Form.Control
                                type="time"
                                value={scheduleEndTime}
                                onChange={(e) => setScheduleEndTime(e.target.value)}
                            />
                        </Form.Group>
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleScheduleModalClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleScheduleService}>Guardar</Button>
                </Modal.Footer>
            </Modal>

            <Modal show={showEventModal} onHide={() => setShowEventModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Servicio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <div>
                            <p><strong>ID del servicio:</strong> {selectedEvent.id}</p>
                            <p><strong>Tipo de servicio:</strong> {selectedEvent.serviceType.replace(/[\{\}"]/g, '')}</p>
                            <p><strong>Descripción del servicio:</strong> {selectedEvent.description}</p>
                            <p><strong>Responsable:</strong> {selectedEvent.responsibleName}</p>
                            <p><strong>Empresa:</strong> {selectedEvent.clientName}</p>
                            <p><strong>Dirección de la empresa:</strong> {selectedEvent.address}</p>
                            <p><strong>Teléfono:</strong> {selectedEvent.phone}</p>
                            <p><strong>Horario:</strong> {selectedEvent.startTime} - {selectedEvent.endTime}</p>
                        </div>
                    )}
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={() => setShowEventModal(false)}>Cerrar</Button>
                </Modal.Footer>
            </Modal>

        </div>
    );
};

export default InspectionCalendar;
