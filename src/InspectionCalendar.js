import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button, Modal, Form, Col, Row, Table } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Plus } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './InspectionCalendar.css';
import moment from 'moment-timezone';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';
import { useNavigate } from 'react-router-dom';
import { useSocket } from './SocketContext';

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
    const [alertMessage, setAlertMessage] = useState('');
    const [scheduleConflictMessage, setScheduleConflictMessage] = useState('');
    const [inspections, setInspections] = useState([]);
    const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
    const [newInspection, setNewInspection] = useState({
        inspection_type: [],
        inspection_sub_type: '',
    });


    const userTimeZone = moment.tz.guess();
    const navigate = useNavigate();
    const socket = useSocket();

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

    useEffect(() => {
        const calendarApi = calendarRef.current?.getApi();
        if (calendarApi) {
            calendarApi.removeAllEvents();
            calendarApi.addEventSource(events); // Agrega los eventos actuales
        }
    }, [events]); // Dependencia en `events`

    const openScheduleModal = async () => {
        try {
            // Obtener los eventos más recientes de la base de datos
            await fetchScheduleAndServices();
            // Abrir el modal después de actualizar los datos
            setScheduleModalOpen(true);
        } catch (error) {
            console.error("Error fetching updated events before opening modal:", error);
        }
    };    
    

    const filterEvents = (updatedAllEvents = allEvents) => {
        const filteredEvents = selectedUsers.length
            ? updatedAllEvents.filter((event) => selectedUsers.includes(event.responsibleId))
            : updatedAllEvents; // Si no hay usuarios seleccionados, muestra todos
        setEvents(filteredEvents);
    };    

    useEffect(() => {
        if (selectedEvent?.title) {
            console.log(`Servicio seleccionado ${selectedEvent.title}`);
            setInspections([]); // Limpia inspecciones anteriores
            fetchInspections(selectedEvent.title); // Carga inspecciones relacionadas con el servicio
        }
    }, [selectedEvent]);    

    useEffect(() => {
        const validateServiceAndSchedule = () => {
            if (!selectedService || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
                setScheduleConflictMessage('');
                setAlertMessage('');
                return;
            }
    
            const selectedServiceData = services.find(service => service.id === selectedService);
            if (!selectedServiceData) {
                setScheduleConflictMessage('');
                setAlertMessage('');
                return;
            }
    
            const newStart = moment(`${scheduleDate}T${scheduleStartTime}`);
            const newEnd = moment(`${scheduleDate}T${scheduleEndTime}`);
    
            // Validar conflictos de horario
            const conflictingEvents = allEvents.filter(event => {
                const eventStart = moment(event.start);
                const eventEnd = moment(event.end);
    
                const overlaps = newStart.isBefore(eventEnd) && newEnd.isAfter(eventStart);
    
                return (
                    event.responsibleId === selectedServiceData.responsible &&
                    overlaps
                );
            });
    
            if (conflictingEvents.length > 0) {
                setScheduleConflictMessage(
                    `Conflicto detectado: El responsable tiene ${conflictingEvents.length} servicio(s) ya agendado(s) en este horario. Ajusta el horario antes de guardar.`
                );
            } else {
                setScheduleConflictMessage('');
            }
    
            // Validar servicios puntuales y periódicos
            const currentMonth = moment().format('YYYY-MM'); // Mes actual en formato 'YYYY-MM'
            const scheduledThisMonth = allEvents.filter(event => {
                const eventMonth = moment(event.start).format('YYYY-MM');
                return event.title === selectedService && eventMonth === currentMonth;
            }).length;
    
            if (selectedServiceData.category === 'Puntual') {
                // Validación para servicios Puntuales
                if (scheduledThisMonth > 0) {
                    setAlertMessage(
                        `El servicio ${selectedService} es Puntual y ya está agendado ${scheduledThisMonth} veces. ¿Aun así quieres agendar nuevamente?`
                    );
                } else {
                    setAlertMessage('');
                }
            } else if (selectedServiceData.category === 'Periódico') {
                // Validación para servicios Periódicos
                const quantityPerMonth = selectedServiceData.quantity_per_month || 0;
                if (scheduledThisMonth >= quantityPerMonth) {
                    setAlertMessage(
                        `Este servicio debe agendarse ${quantityPerMonth} veces al mes y ya está agendado ${scheduledThisMonth} veces. ¡No deberías agendar más!`
                    );
                } else {
                    setAlertMessage(
                        `Este servicio debe agendarse ${quantityPerMonth} veces al mes y ya está agendado ${scheduledThisMonth} veces.`
                    );
                }
            } else {
                setAlertMessage('');
            }
        };
    
        validateServiceAndSchedule();
    }, [selectedService, scheduleDate, scheduleStartTime, scheduleEndTime, allEvents, services]);
    
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
    
            // Formatear y ordenar los servicios
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
    
            // Ordenar servicios por fecha (descendente) usando el ID
            const sortedServices = formattedServices.sort((a, b) => {
                const dateA = parseInt(a.id.split('-')[1]); // Extraer 'ddmmaa' del ID
                const dateB = parseInt(b.id.split('-')[1]);
                return dateB - dateA; // Orden descendente
            });
    
            setServices(sortedServices);
            console.log('Sorted services:', sortedServices);
        } catch (error) {
            console.error('Error loading services:', error);
        }
    };
    

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
                                category: serviceData.category || 'Sin categoría', // Nueva propiedad
                                quantyPerMonth: serviceData.quantity_per_month || null, // Nueva propiedad
                                clientName,
                                responsibleId: serviceData.responsible,
                                responsibleName,
                                address: clientData?.address || 'Sin dirección',
                                phone: clientData?.phone || 'Sin teléfono',
                                color: responsibleData?.color || '#fdd835',
                                backgroundColor: responsibleData?.color,
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

    const handleServiceSelect = (serviceId) => {
        setSelectedService(serviceId);
    
        console.log('Service ID seleccionado:', serviceId);
        console.log('Eventos disponibles:', allEvents);
    
        if (serviceId) {
            const selectedServiceData = services.find(service => service.id === serviceId);
    
            if (selectedServiceData) {
                const currentMonth = moment().format('YYYY-MM'); // Mes actual en formato 'YYYY-MM'
                const scheduledThisMonth = allEvents.filter(event => {
                    const eventMonth = moment(event.start).format('YYYY-MM');
                    return event.title === serviceId && eventMonth === currentMonth;
                }).length;
    
                if (selectedServiceData.category === 'Puntual') {
                    // Para servicios Puntuales
                    if (scheduledThisMonth > 0) {
                        setAlertMessage(
                            `El servicio ${serviceId} es Puntual y ya está agendado ${scheduledThisMonth} veces. ¿Aun así quieres agendar nuevamente?`
                        );
                    } else {
                        setAlertMessage('');
                    }
                } else if (selectedServiceData.category === 'Periódico') {
                    // Para servicios Periódicos
                    const quantityPerMonth = selectedServiceData.quantity_per_month || 0;
    
                    if (scheduledThisMonth >= quantityPerMonth) {
                        setAlertMessage(
                            `Este servicio debe agendarse ${quantityPerMonth} veces al mes y ya está agendado ${scheduledThisMonth} veces. ¡No deberías agendar más!`
                        );
                    } else {
                        setAlertMessage(
                            `Este servicio debe agendarse ${quantityPerMonth} veces al mes y ya está agendado ${scheduledThisMonth} veces.`
                        );
                    }
                }
            }
        }
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
        const { start, end, backgroundColor } = eventInfo.event;
    
        const cleanServiceType = serviceType.replace(/[\{\}"]/g, '').replace(/,/g, ', ');
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
                <div className="event-container"
                style={{
                    backgroundColor: backgroundColor || '#fdd835',
                    color: "white"
                  }}>
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

    const handleScheduleModalClose = () => {
        setScheduleModalOpen(false);
        setSelectedService('');
        setScheduleDate('');
        setScheduleStartTime('');
        setScheduleEndTime('');
        setAlertMessage('');
    };

    const handleDateSelect = (selectInfo) => {
        const { start, end } = selectInfo;
        setScheduleDate(moment(start).format('YYYY-MM-DD'));
        setScheduleStartTime(moment(start).format('HH:mm'));
        setScheduleEndTime(moment(end).format('HH:mm'));
        openScheduleModal(); // Abre el modal
    };
    

    const handleScheduleService = async () => {
        try {
            if (!selectedService || !scheduleDate || !scheduleStartTime || !scheduleEndTime) {
                alert('Todos los campos son obligatorios');
                return;
            }
    
            const selectedServiceData = services.find(service => service.id === selectedService);
    
            // Crear el objeto del nuevo horario
            const newSchedule = {
                service_id: selectedService,
                date: scheduleDate,
                start_time: scheduleStartTime,
                end_time: scheduleEndTime,
            };
    
            // Enviar el nuevo horario al backend
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
    
            // Obtener datos del responsable
            let responsibleColor = '#fdd835'; // Color predeterminado
            if (selectedServiceData.responsible) {
                try {
                    const responsibleResponse = await fetch(`http://localhost:10000/api/users/${selectedServiceData.responsible}`);
                    if (responsibleResponse.ok) {
                        const responsibleData = await responsibleResponse.json();
                        responsibleColor = responsibleData.color || '#fdd835';
                    } else {
                        console.warn(`Failed to fetch responsible for ID: ${selectedServiceData.responsible}`);
                    }
                } catch (error) {
                    console.error(`Error fetching responsible for ID: ${selectedServiceData.responsible}`, error);
                }
            }
    
            // Formatear el evento para incluir el color
            const formattedEvent = {
                id: createdSchedule.id,
                title: `${selectedServiceData.id}`,
                serviceType: selectedServiceData.service_type || 'Sin tipo',
                clientName: selectedServiceData.clientName || 'Sin empresa',
                description: selectedServiceData.description || 'Sin descripción',
                color: responsibleColor, // Agregar el color del responsable
                backgroundColor: responsibleColor,
                category: selectedServiceData.category || 'Sin categoría', // Asegurarse de que la categoría esté presente
                quantyPerMonth: selectedServiceData.quantity_per_month || null, // Cantidad por mes si es periódico
                start: moment(`${scheduleDate}T${scheduleStartTime}`).toISOString(),
                end: moment(`${scheduleDate}T${scheduleEndTime}`).toISOString(),
                allDay: false,
            };
    
            // Actualiza el estado de forma segura
            setAllEvents((prevAllEvents) => {
                const updatedAllEvents = [...prevAllEvents, formattedEvent];
                setEvents(updatedAllEvents); // Sincroniza eventos visibles
                return updatedAllEvents;
            });
    
            // Cerrar el modal y limpiar los campos
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
                            <Button variant={currentView === 'dayGridMonth' ? 'dark' : 'success'} className="me-2" onClick={() => changeView('dayGridMonth')}>
                                Mes
                            </Button>
                            <Button variant={currentView === 'timeGridWeek' ? 'dark' : 'success'} className="me-2" onClick={() => changeView('timeGridWeek')}>
                                Semana
                            </Button>
                            <Button variant={currentView === 'timeGridDay' ? 'dark' : 'success'} onClick={() => changeView('timeGridDay')}>
                                Día
                            </Button>
                            <Button variant="success" className="ms-2" onClick={openScheduleModal}>
                                <Plus className="me-1" /> Agendar Servicio
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
                            select={handleDateSelect}
                            timeZone="local"
                            height="70vh"
                            nowIndicator={true}
                            slotLabelFormat={{ hour: 'numeric', hour12: true, meridiem: 'short' }}
                            eventContent={renderEventContent}
                            eventClick={handleEventClick}
                            dayHeaderContent={({ date }) => (
                                <div className="day-header">
                                    <div className="day-name">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                                    <div className="day-number font-bold">{date.getDate()}</div>
                                </div>
                            )}
                        />
                    </div>
                </div>
            </div>
            {/* Columna fija de usuarios */}
            <div
                className="user-column bg-light shadow-sm px-3"
                style={{
                    width: '240px',
                    height: '87vh',
                    overflowY: 'auto',
                    scrollbarWidth: 'none',
                }}
            >
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
                                            position: 'relative',
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
                                                backgroundColor: user.color,
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
                                onChange={(e) => handleServiceSelect(e.target.value)}
                            >
                                <option value="">Selecciona un servicio</option>
                                {services.map((service) => (
                                    <option key={service.id} value={service.id}>
                                        {`${service.id} - ${service.service_type.replace(/[{}"]/g, '').split(',').join(', ') || 'Sin tipo'} - ${service.clientName || 'Sin empresa'}`}
                                    </option>
                                ))}
                            </Form.Select>
                        </Form.Group>
                        {scheduleConflictMessage && (
                            <div className="alert alert-danger mt-3">
                                {scheduleConflictMessage}
                            </div>
                        )}

                        {alertMessage && (
                            <div className="alert alert-warning mt-3">
                                {alertMessage}
                            </div>
                        )}
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
                    <Button variant="success" onClick={handleScheduleService} disabled={!!scheduleConflictMessage}>Guardar</Button>
                </Modal.Footer>
            </Modal>

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

export default InspectionCalendar;
