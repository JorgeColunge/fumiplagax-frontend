import React, { useState, useEffect, useRef } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import { Button, Modal, Form } from 'react-bootstrap';
import { ChevronLeft, ChevronRight, Plus } from 'react-bootstrap-icons';
import 'bootstrap/dist/css/bootstrap.min.css';
import './InspectionCalendar.css';
import moment from 'moment-timezone';
import Tooltip from 'react-bootstrap/Tooltip';
import OverlayTrigger from 'react-bootstrap/OverlayTrigger';

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

                        // Filtrar servicios donde el usuario conectado es responsable
                        if (serviceData.responsible !== userId) return null;

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

            const validEvents = formattedEvents.filter((event) => event !== null);
            setAllEvents(validEvents);
            setEvents(validEvents);
        } catch (error) {
            console.error('Error loading schedule and services:', error);
        }
    };

    const renderEventContent = (eventInfo) => {
        const { serviceType, clientName } = eventInfo.event.extendedProps;
        const { start, end } = eventInfo.event;
    
        const startTime = moment(start).format('h:mm A');
        const endTime = moment(end).format('h:mm A');
    
        return (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip>
                        <div>{serviceType}</div>
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
                                variant={currentView === 'dayGridMonth' ? 'dark' : 'primary'}
                                className="me-2"
                                onClick={() => changeView('dayGridMonth')}
                            >
                                Mes
                            </Button>
                            <Button
                                variant={currentView === 'timeGridWeek' ? 'dark' : 'primary'}
                                className="me-2"
                                onClick={() => changeView('timeGridWeek')}
                            >
                                Semana
                            </Button>
                            <Button
                                variant={currentView === 'timeGridDay' ? 'dark' : 'primary'}
                                onClick={() => changeView('timeGridDay')}
                            >
                                Día
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
            <Modal show={showEventModal} onHide={() => setShowEventModal(false)} centered>
                <Modal.Header closeButton>
                    <Modal.Title>Detalles del Servicio</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    {selectedEvent && (
                        <div>
                            <p><strong>ID del servicio:</strong> {selectedEvent.id}</p>
                            <p><strong>Tipo de servicio:</strong> {selectedEvent.serviceType}</p>
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

export default MyServicesCalendar;
