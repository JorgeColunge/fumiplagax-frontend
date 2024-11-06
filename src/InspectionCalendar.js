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

const InspectionCalendar = () => {
    const [events, setEvents] = useState([]);
    const calendarRef = useRef(null);
    const [currentView, setCurrentView] = useState('timeGridWeek');
    const [modalIsOpen, setModalIsOpen] = useState(false);
    const [eventTitle, setEventTitle] = useState('');
    const [selectedStartDate, setSelectedStartDate] = useState('');
    const [selectedEndDate, setSelectedEndDate] = useState('');
    const [selectedStartTime, setSelectedStartTime] = useState('');
    const [selectedEndTime, setSelectedEndTime] = useState('');
    const [allDay, setAllDay] = useState(false);
    const [multiDay, setMultiDay] = useState(false);
    
    const userTimeZone = moment.tz.guess();

    useEffect(() => {
        const fetchInspections = async () => {
            try {
                console.log('Fetching inspections...');
                const response = await fetch(`http://localhost:10000/api/inspections`);
                if (!response.ok) throw new Error('Failed to fetch inspections');
                
                const inspections = await response.json();
                console.log('Inspections data received:', inspections); // Verifica los datos obtenidos
                
                const formattedEvents = inspections.map((inspection) => {
                    const start = moment.tz(`${inspection.date.split('T')[0]}T${inspection.time}`, userTimeZone).format();
                    const end = inspection.exit_time 
                        ? moment.tz(`${inspection.date.split('T')[0]}T${inspection.exit_time}`, userTimeZone).format() 
                        : null;
                    
                    const formattedEvent = {
                        id: inspection.id,
                        title: `Servicio ${inspection.service_id}`,
                        start,
                        end,
                        allDay: false
                    };
                    console.log('Formatted event:', formattedEvent); // Verifica el formato de cada evento
                    return formattedEvent;
                });

                setEvents(formattedEvents);
                console.log('Events set in state:', formattedEvents); // Verifica que los eventos se guarden correctamente
            } catch (error) {
                console.error('Error loading inspections:', error);
            }
        };
        fetchInspections();
    }, []);

    const changeView = (view) => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.changeView(view);
        setCurrentView(view);
    };

    const handleTodayClick = () => {
        const calendarApi = calendarRef.current.getApi();
        calendarApi.today();
    };

    const handleEventSelect = (selectInfo) => {
        const startDateTime = selectInfo.startStr.split('T');
        const endDateTime = selectInfo.endStr.split('T');
        if (startDateTime[0] !== endDateTime[0]) {
            setMultiDay(true);
            setSelectedStartDate(startDateTime[0]);
            setSelectedEndDate(endDateTime[0]);
            setSelectedStartTime('00:00');
            setSelectedEndTime('23:59');
        } else {
            setMultiDay(false);
            setSelectedStartDate(startDateTime[0]);
            setSelectedEndDate(startDateTime[0]);
            setSelectedStartTime(startDateTime[1] ? startDateTime[1].substring(0, 5) : '');
            setSelectedEndTime(endDateTime[1] ? endDateTime[1].substring(0, 5) : '');
        }
        setModalIsOpen(true);
    };

    const handleModalClose = () => {
        setModalIsOpen(false);
        setEventTitle('');
        setSelectedStartDate('');
        setSelectedEndDate('');
        setSelectedStartTime('');
        setSelectedEndTime('');
        setAllDay(false);
        setMultiDay(false);
    };

    const handleEventCreate = async () => {
        const newEvent = {
            title: eventTitle,
            start: moment.tz(`${selectedStartDate}T${allDay ? '00:00' : selectedStartTime}`, userTimeZone).format(),
            end: multiDay 
                ? moment.tz(selectedEndDate, userTimeZone).format() 
                : moment.tz(`${selectedStartDate}T${allDay ? '23:59' : selectedEndTime}`, userTimeZone).format(),
            allDay: allDay || multiDay
        };

        try {
            setEvents((prevEvents) => [
                ...prevEvents, 
                { ...newEvent, id: Math.random().toString() } // Temporal ID
            ]);
            console.log('New event created and added to state:', newEvent); // Verifica el evento recién creado
            handleModalClose();
        } catch (error) {
            console.error('Error creating event:', error);
        }
    };

    return (
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
                    <Button variant="primary" className="ms-2" onClick={() => setModalIsOpen(true)}>
                        <Plus className="me-1" /> Añadir
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
                    select={handleEventSelect}
                    timeZone="local"
                    height="70vh"
                    nowIndicator={true}
                    slotLabelFormat={{ hour: 'numeric', hour12: true, meridiem: 'short' }}
                    dayHeaderContent={({ date }) => (
                        <div className="day-header">
                            <div className="day-name text-sm text-gray-500">{date.toLocaleDateString('es-ES', { weekday: 'short' }).toUpperCase()}</div>
                            <div className="day-number text-lg font-bold">{date.getDate()}</div>
                        </div>
                    )}
                    eventContent={({ event }) => (
                        <div className="event-content">
                            <span className="event-title">{event.title}</span>
                        </div>
                    )}
                />
            </div>

            {/* Modal para agregar eventos */}
            <Modal show={modalIsOpen} onHide={handleModalClose} backdrop="static" centered>
                <Modal.Header closeButton>
                    <Modal.Title>Agregar Evento</Modal.Title>
                </Modal.Header>
                <Modal.Body>
                    <Form>
                        <Form.Group controlId="formEventTitle">
                            <Form.Label>Título del Evento</Form.Label>
                            <Form.Control
                                type="text"
                                value={eventTitle}
                                onChange={(e) => setEventTitle(e.target.value)}
                                placeholder="Ingresa el título del evento"
                            />
                        </Form.Group>
                        {!multiDay && (
                            <Form.Group controlId="formAllDay" className="mt-3">
                                <Form.Check
                                    type="checkbox"
                                    label="Todo el día"
                                    checked={allDay}
                                    onChange={(e) => setAllDay(e.target.checked)}
                                />
                            </Form.Group>
                        )}
                        <Row className="mt-3">
                            <Col>
                                <Form.Group controlId="formStartDate">
                                    <Form.Label>Fecha de Inicio</Form.Label>
                                    <Form.Control
                                        type="date"
                                        value={selectedStartDate}
                                        onChange={(e) => setSelectedStartDate(e.target.value)}
                                    />
                                </Form.Group>
                            </Col>
                            {!multiDay && (
                                <>
                                    <Col>
                                        <Form.Group controlId="formStartTime">
                                            <Form.Label>Hora de Inicio</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={selectedStartTime}
                                                onChange={(e) => setSelectedStartTime(e.target.value)}
                                                disabled={allDay}
                                            />
                                        </Form.Group>
                                    </Col>
                                    <Col>
                                        <Form.Group controlId="formEndTime">
                                            <Form.Label>Hora de Fin</Form.Label>
                                            <Form.Control
                                                type="time"
                                                value={selectedEndTime}
                                                onChange={(e) => setSelectedEndTime(e.target.value)}
                                                disabled={allDay}
                                            />
                                        </Form.Group>
                                    </Col>
                                </>
                            )}
                        </Row>
                        {multiDay && (
                            <Row className="mt-3">
                                <Col>
                                    <Form.Group controlId="formEndDate">
                                        <Form.Label>Fecha de Fin</Form.Label>
                                        <Form.Control
                                            type="date"
                                            value={selectedEndDate}
                                            onChange={(e) => setSelectedEndDate(e.target.value)}
                                        />
                                    </Form.Group>
                                </Col>
                            </Row>
                        )}
                    </Form>
                </Modal.Body>
                <Modal.Footer>
                    <Button variant="secondary" onClick={handleModalClose}>Cancelar</Button>
                    <Button variant="primary" onClick={handleEventCreate}>Guardar</Button>
                </Modal.Footer>
            </Modal>
        </div>
    );
};

export default InspectionCalendar;
