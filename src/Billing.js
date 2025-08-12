import React, { useEffect, useState, useRef, useCallback } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import 'moment/locale/es';
import { useNavigate } from 'react-router-dom'; // Asegúrate de tener configurado react-router
import { Calendar, Person, Bag, Building, PencilSquare, Trash, Bug, Diagram3, GearFill, Clipboard, PlusCircle, InfoCircle, FileText, GeoAlt } from 'react-bootstrap-icons';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form, CardFooter, ModalTitle } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';
import './ServiceList.css'

function Billing() {
  const [services, setServices] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState(null);
  const [inspections, setInspections] = useState([]);
  const [showAddInspectionModal, setShowAddInspectionModal] = useState(false);
  const [open, setOpen] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showAddServiceModal, setShowAddServiceModal] = useState(false);
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userId = storedUserInfo?.id_usuario || '';
  const [selectedUser, setSelectedUser] = useState('');
  const [filteredServices, setFilteredServices] = useState([]);
  const [selectedClient, setSelectedClient] = useState('');
  const [showEditServiceType, setShowEditServiceType] = useState(false); // Nuevo estado para el colapso en edición
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [clientNames, setClientNames] = useState({});
  const [showPestOptions, setShowPestOptions] = useState(false);
  const [filterStatus, setFilterStatus] = useState(''); // Estado para el filtro de agendamiento
  const [selectedInspections, setSelectedInspections] = useState([]);
  const [billingData, setBillingData] = useState([]);
  const [showBillingModal, setShowBillingModal] = useState(false);
  const [billingFile, setBillingFile] = useState(null);
  const [billedServices, setBilledServices] = useState([]); // Estado para almacenar los servicios facturados
  const [showBilled, setShowBilled] = useState(null); // Estado para alternar entre facturados/no facturados
  const [loadingAnimation, setLoadingAnimation] = useState(false);
  const [showInterventionAreasOptions, setShowInterventionAreasOptions] = useState(false);
  const [billedInspections, setBilledInspections] = useState([]);
  const [servicesWithPendingInspections, setServicesWithPendingInspections] = useState([]);
  const [newInspection, setNewInspection] = useState({
    inspection_type: [], // Tipos de inspección seleccionados
    inspection_sub_type: "", // Opcional, para subtipos como en Desratización
    service_type: "", // Tipo de servicio del servicio seleccionado
  });
  const [technicians, setTechnicians] = useState([]);
  const [editService, setEditService] = useState({
    service_type: [],
    description: '',
    pest_to_control: '',
    intervention_areas: '',
    responsible: '',
    category: '',
    quantity_per_month: '',
    client_id: '',
    value: '',
    companion: [],
    created_by: userId,
    created_at: moment().format('DD-MM-YYYY'),
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceType, setShowServiceType] = useState(false);
  const [showCompanionOptions, setShowCompanionOptions] = useState(false);
  const [searchText, setSearchText] = useState(''); // Estado para la búsqueda
  const [filteredClients, setFilteredClients] = useState([]); // Clientes filtrados para la búsqueda
  const [showSuggestions, setShowSuggestions] = useState(false); // Controla si se muestran las sugerencias
  const [searchServiceText, setSearchServiceText] = useState(''); // Estado para el texto de búsqueda en servicios
  const [scheduleEvents, setScheduleEvents] = useState([]);
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
    companion: [],
    created_by: userId,
    created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual al abrir el modal
  });
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
  });
  const [selectedMonth, setSelectedMonth] = useState(moment().month() + 1); // Mes actual
  const [selectedYear, setSelectedYear] = useState(moment().year()); // Año actual
  const [company, setCompany] = useState(
    () => localStorage.getItem('company_filter') || 'Fumiplagax'
  );
  const dropdownRef = useRef(null);

  useEffect(() => {
    localStorage.setItem('company_filter', company);
  }, [company]);

  const toggleActions = (id) => {
    setExpandedCardId((prevId) => (prevId === id ? null : id)); // Alterna el estado abierto/cerrado del menú
  };

  const handleClickOutside = (event) => {
    // Si el clic no es dentro del menú desplegable, ciérralo
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpandedCardId(null);
    }
  };

  const showNotification = (title, message) => {
    setNotification({ show: true, title, message });
    setTimeout(() => {
      setNotification({ show: false, title, message: '' });
    }, 2500); // 2.5 segundos
  };

  const determineScheduleStatus = (service, events) => {
    const serviceEvents = events.filter((event) => event.service_id === service.id);
    const filteredEvents = serviceEvents.filter(
      (event) =>
        moment(event.date).month() + 1 === selectedMonth && moment(event.date).year() === selectedYear
    );

    if (service.category === 'Puntual') {
      return filteredEvents.length > 0 ? 'Agendado' : 'Pendiente de Agenda';
    } else if (service.category === 'Periódico') {
      if (filteredEvents.length >= service.quantity_per_month) {
        return 'Agendado';
      } else if (filteredEvents.length > 0) {
        return 'Agendamiento Parcial';
      } else {
        return 'Pendiente de Agenda';
      }
    }

    return 'Sin Categoría';
  };


  const fetchBilledServices = async () => {
    try {
      const { data } = await axios.get(`${process.env.REACT_APP_API_URL}/api/billing`);

      // ➊ lista de todas las inspecciones facturadas
      const allBilledInspections = data.flatMap((bill) =>
        (bill.billing_data || []).flatMap((entry) =>
          entry.services.flatMap((svc) => svc.inspections)
        )
      );

      /*  — si aún necesitas los IDs de servicio facturados — */
      const billedServiceIds = data.flatMap((bill) =>
        (bill.billing_data || []).flatMap((entry) =>
          entry.services.map((svc) => svc.service_id)
        )
      );

      setBilledInspections(allBilledInspections);
      setBilledServices(billedServiceIds);

      return allBilledInspections;   // ➋ ← DEVUELVE el arreglo
    } catch (err) {
      console.error("Error fetching billed services:", err);
      return [];                     // para no romper el flujo
    }
  };

  const fetchTechnicians = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?role=Technician`);
      setTechnicians(response.data);
    } catch (error) {
      console.error("Error fetching technicians:", error);
    }
  };

  const getBilledInspectionsForService = (serviceId) => {
    const billingEntry = billingData.find((b) =>
      b.services.some((svc) => svc.service_id === serviceId)
    );

    if (!billingEntry) return [];

    // Obtener inspecciones facturadas para ese servicio
    const serviceEntry = billingEntry.services.find((svc) => svc.service_id === serviceId);
    return serviceEntry ? serviceEntry.inspections : [];
  };

  const fetchInspections = async (serviceId) => {
    try {
      const response = await axios.get(
        `${process.env.REACT_APP_API_URL}/api/inspections?service_id=${serviceId}`
      );

      const formattedInspections = response.data
        .filter((inspection) => inspection.service_id === serviceId)
        // 🔥 Filtrar inspecciones que NO estén en billedInspections
        .filter((inspection) => !billedInspections.includes(inspection.id))
        .map((inspection) => ({
          ...inspection,
          date: moment(inspection.date).format("DD/MM/YYYY"),
          time: inspection.time ? moment(inspection.time, "HH:mm:ss").format("HH:mm") : "--",
          exit_time: inspection.exit_time ? moment(inspection.exit_time, "HH:mm:ss").format("HH:mm") : "--",
          observations: inspection.observations || "Sin observaciones",
        }))
        .sort((a, b) => b.datetime - a.datetime);

      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  // Intenta leer la empresa; ajusta los campos según tu data real.
  const resolveCompanyLabel = (svc) => {
    // 1) Ideal: si el backend ya trae una marca en el servicio o el cliente:
    // ejemplos posibles: svc.company, svc.brand, svc.tenant, etc.
    if (svc.company) return svc.company;
    if (svc.brand) return svc.brand;

    const cli = clients.find((c) => c.id === svc.client_id);

    if (cli?.company) return cli.company;
    if (cli?.brand) return cli.brand;

    // 2) Heurística por nombre (si no hay campo dedicado)
    const name = (cli?.name || '').toLowerCase();
    if (name.includes('fumiplagax')) return 'Fumiplagax';
    if (name.includes('control')) return 'Control';
    return 'Otro';
  };

  const applyFilters = useCallback(() => {
    if (!services.length) {
      setFilteredServices([]);
      return;
    }

    const pivot = moment(`${selectedYear}-${selectedMonth}-01`, "YYYY-M-D");

    let list = services.filter((svc) => {
      const created = moment(
        svc.created_at,
        [moment.ISO_8601, "DD-MM-YYYY", "YYYY-MM-DD"],
        true
      );
      if (!created.isValid()) return false;

      if (svc.category === "Puntual") {
        return created.month() + 1 === selectedMonth && created.year() === selectedYear;
      }
      if (svc.category === "Periódico") {
        return created.isSameOrBefore(pivot, "month");
      }
      return false;
    });

    // 🔥 NUEVO FILTRO → Solo mostrar servicios con inspecciones pendientes

    list = list.filter((svc) => resolveCompanyLabel(svc) === company);

    list = list.filter((svc) => servicesWithPendingInspections.includes(svc.id));

    if (selectedClient) {
      list = list.filter((svc) => String(svc.client_id) === String(selectedClient));
    }

    if (selectedUser) {
      list = list.filter((svc) => svc.responsible === selectedUser);
    }

    if (filterStatus) {
      list = list.filter((svc) => determineScheduleStatus(svc, scheduleEvents) === filterStatus);
    }

    setFilteredServices(list);
  }, [
    services,
    selectedMonth,
    selectedYear,
    selectedClient,
    selectedUser,
    filterStatus,
    scheduleEvents,
    servicesWithPendingInspections,
    company,
    clients
  ]);

  const handleAddToBilling = (selectedInspections) => {
    setShowDetailsModal(false);
    // Obtener inspecciones seleccionadas con sus servicios y clientes
    const selectedDetails = selectedInspections.map((inspectionId) => {
      const inspection = inspections.find((insp) => insp.id === inspectionId);
      if (!inspection) return null; // Verifica que la inspección exista
      const service = services.find((serv) => serv.id === inspection.service_id);
      if (!service) return null; // Verifica que el servicio exista
      return {
        inspection_id: inspection.id,
        service_id: service.id,
        client_id: service.client_id,
      };
    }).filter(Boolean); // Elimina valores nulos del mapeo

    const updatedBillingData = [...billingData];

    selectedDetails.forEach((current) => {
      // Buscar cliente en billingData
      const clientIndex = updatedBillingData.findIndex((item) => item.client_id === current.client_id);

      if (clientIndex !== -1) {
        // Si el cliente ya existe, buscar el servicio
        const serviceIndex = updatedBillingData[clientIndex].services.findIndex(
          (svc) => svc.service_id === current.service_id
        );

        if (serviceIndex !== -1) {
          // Si el servicio ya existe, agregar la inspección si no está duplicada
          if (
            !updatedBillingData[clientIndex].services[serviceIndex].inspections.includes(
              current.inspection_id
            )
          ) {
            updatedBillingData[clientIndex].services[serviceIndex].inspections.push(
              current.inspection_id
            );
          }
        } else {
          // Si el servicio no existe, agregarlo al cliente
          updatedBillingData[clientIndex].services.push({
            service_id: current.service_id,
            inspections: [current.inspection_id],
          });
        }
      } else {
        // Si el cliente no existe, agregarlo con el servicio y la inspección
        updatedBillingData.push({
          client_id: current.client_id,
          services: [
            {
              service_id: current.service_id,
              inspections: [current.inspection_id],
            },
          ],
        });
      }
    });

    // Actualizar billingData con los datos organizados
    setBillingData(updatedBillingData);
  };

  const isCheckboxDisabled = (inspection) => {
    if (billingData.length === 0) return false; // Si no hay facturación activa, no bloquear
    const service = services.find((svc) => svc.id === inspection.service_id);
    if (!service) return true; // Si no encuentra el servicio, deshabilitar el checkbox
    return billingData[0].client_id !== service.client_id; // Comparar cliente del servicio con el cliente en facturación
  };

  // Función para limpiar la facturación
  const resetBillingData = () => {
    setBillingData([]);
    setSelectedInspections([]);
  };

  // Calcular totales para el botón Facturar
  const totalServices = billingData.reduce((acc, client) => acc + client.services.length, 0);
  const totalInspections = billingData.reduce(
    (acc, client) => acc + client.services.reduce((sum, svc) => sum + svc.inspections.length, 0),
    0
  );

  const openBillingModal = () => {
    setShowBillingModal(true);
  };

  const closeBillingModal = () => {
    setShowBillingModal(false);
  };

  // Función para enviar los datos al backend
  const handleSubmitBilling = async () => {

    console.log('Datos de facturación antes de enviar:', billingData);
    console.log('Archivo seleccionado:', billingFile);

    // Crear el FormData para enviar el archivo y los datos
    const formData = new FormData();
    formData.append('billingData', JSON.stringify(billingData));
    if (billingFile) {
      formData.append('file', billingFile);
    }

    try {
      // Enviar la facturación al backend
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/billing`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      console.log('Respuesta del backend:', response.data);

      // Limpia los datos de facturación y el archivo cargado
      resetBillingData();
      setBillingFile(null);

      setLoadingAnimation(true);          // spinner corto mientras refresca

      const billed = await fetchBilledServices();              // 🔄  lista actualizada
      await fetchPendingInspectionsForAllServices(billed);     // recalcular pendientes

      applyFilters();                                          // la lista ya tiene los datos correctos
      setLoadingAnimation(false);

      // Notifica el éxito
      showNotification('Éxito', 'La facturación se procesó correctamente.');
      setShowBillingModal(false);
    } catch (error) {
      console.error('Error al enviar los datos de facturación:', error);

      // Notifica el error
      showNotification('Error', 'Hubo un problema al procesar la facturación.');
    }
  };


  const handleFileChange = (event) => {
    const file = event.target.files[0];
    setBillingFile(file);
  };




  useEffect(() => {
    // Agregar evento de clic al documento cuando hay un menú desplegable abierto
    if (expandedCardId !== null) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    // Cleanup al desmontar
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expandedCardId]);



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

  const [showInterventionAreas, setShowInterventionAreas] = useState(false);

  // Estado para controlar si el dropdown está abierto o cerrado
  const [showDropdown, setShowDropdown] = useState(false);

  // Opciones de Áreas de Intervención ordenadas alfabéticamente
  const interventionAreaOptions = [
    "Área caja",
    "Área de lavado",
    "Baños",
    "Bodega",
    "Cajas eléctricas",
    "Cocina",
    "Comedor",
    "Cubierta",
    "Cuartos de residuos",
    "Entretechos",
    "Equipos",
    "Exteriores",
    "Lokers",
    "Muebles",
    "Necera",
    "Oficinas",
    "Producción",
    "Servicio al cliente",
    "Shot de basuras"
  ];


  const navigate = useNavigate();

  const formatMonthParam = (m, y) => `${String(m).padStart(2, '0')}/${y}`; // "08/2025"

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      moment.locale('es');

      try {
        /* 1. Servicios y clientes */
        const [svcRes, cliRes] = await Promise.all([
          axios.get(`${process.env.REACT_APP_API_URL}/api/services`),
          axios.get(`${process.env.REACT_APP_API_URL}/api/clients`)
        ]);

        setServices(svcRes.data);
        setClients(cliRes.data);
        setClientNames(Object.fromEntries(cliRes.data.map(c => [c.id, c.name])));

        /* 2. Eventos del mes actual */
        const now = moment();
        const evRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/service-schedule`, {
          params: { month: formatMonthParam(now.month() + 1, now.year()) }
        });
        setScheduleEvents(evRes.data);

        /* 3. Técnicos (todos los usuarios) */
        const techRes = await axios.get(`${process.env.REACT_APP_API_URL}/api/users`);
        setTechnicians(techRes.data);

        /* 4. Facturas → devuelve la lista facturada */
        const billed = await fetchBilledServices();

        /* 5. Inspecciones pendientes con esa lista */
        await fetchPendingInspectionsForAllServices(billed);
      } catch (err) {
        console.error('❌ Error cargando datos:', err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);          // ← solo al montar

  // Condición para mostrar animación de carga
  const isLoading = loading || loadingAnimation;

  useEffect(() => {
    if (services.length && servicesWithPendingInspections.length >= 0) {
      applyFilters();
    }
  }, [services, servicesWithPendingInspections, selectedMonth, selectedYear, selectedClient, selectedUser, filterStatus, company]);

  const handleServiceSearchChange = (e) => {
    const input = e.target.value.toLowerCase();
    setSearchServiceText(input);

    let filtered = services.filter((svc) => {
      const clientName = (clientNames[svc.client_id] || "").toLowerCase();
      return (
        svc.description.toLowerCase().includes(input) ||
        svc.service_type.toLowerCase().includes(input) ||
        clientName.includes(input)                                   // ← ahora busca por empresa
      );
    });

    if (selectedClient) {
      filtered = filtered.filter(
        (svc) => String(svc.client_id) === String(selectedClient)    // ← casteo
      );
    }
    if (selectedUser) {
      filtered = filtered.filter((svc) => svc.responsible === selectedUser);
    }

    setFilteredServices(filtered);
  };

  // pon ‘billed’ opcional con valor por defecto para llamadas internas
  const fetchPendingInspectionsForAllServices = async (billed = billedInspections) => {
    try {
      const { data: allInspections } = await axios.get(`${process.env.REACT_APP_API_URL}/api/inspections`);

      const pending = allInspections.filter((insp) => !billed.includes(insp.id));
      const pendingSvcIds = [...new Set(pending.map((i) => i.service_id))];

      setServicesWithPendingInspections(pendingSvcIds);
    } catch (err) {
      console.error("Error obteniendo inspecciones pendientes:", err);
    }
  };


  const handleSearchChange = (e) => {
    const input = e.target.value;
    setSearchText(input); // Actualiza el texto de búsqueda
    if (input) {
      // Filtra clientes según el texto ingresado
      const filtered = clients.filter((client) =>
        client.name.toLowerCase().includes(input.toLowerCase())
      );
      setFilteredClients(filtered);
      setShowSuggestions(true); // Muestra sugerencias cuando hay texto
    } else {
      setShowSuggestions(false); // Oculta sugerencias si no hay texto
    }
  };

  const handleServiceClick = (service) => {
    setSelectedService(service); // Establece el servicio seleccionado
    fetchInspections(service.id); // Pasa el `service.id` a la función para filtrar las inspecciones
    setShowDetailsModal(true); // Abre el modal
  };

  const handleCloseAddInspectionModal = () => {
    setShowAddInspectionModal(false);
  };



  // Filtrar técnicos excluyendo el seleccionado como responsable
  const filteredTechniciansForCompanion = technicians.filter(
    (technician) => technician.id !== newService.responsible
  );

  return (
    <div className="container mt-1">
      {isLoading ? (
        <div className="loading-animation-container">
          <div className="spinner"></div>
          <p>Cargando datos...</p>
        </div>
      ) : (
        <>
          <Row className="align-items-center mb-2" style={{ minHeight: 0, height: 'auto' }}>
            <Col className='ms-auto' xs={12} md={2}>
              <Form.Group controlId="formCompanyFilter">
                <Form.Control
                  as="select"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                >
                  <option value="Fumiplagax">Fumiplagax</option>
                  <option value="Control">Control</option>
                  <option value="Otro">Otro</option>
                </Form.Control>
              </Form.Group>
            </Col>
            <Col xs={6} md={2}>
              <Form.Group controlId="formMonthFilter">
                <Form.Control
                  as="select"
                  value={selectedMonth}
                  onChange={(e) => setSelectedMonth(parseInt(e.target.value))}
                >
                  {Array.from({ length: 12 }, (_, i) => (
                    <option key={i + 1} value={i + 1}>
                      {moment().month(i).format("MMMM")}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>

            <Col xs={6} md={2}>
              <Form.Group controlId="formYearFilter">
                <Form.Control
                  as="select"
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                >
                  {Array.from({ length: 5 }, (_, i) => (
                    <option key={i} value={moment().year() - i}>
                      {moment().year() - i}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>
          <Row className="align-items-center mb-4" style={{ minHeight: 0, height: 'auto' }}>
            {/* Campo de búsqueda */}
            <Col xs={12} md={6}>
              <Form.Group controlId="formServiceSearch">
                <Form.Control
                  type="text"
                  placeholder="Buscar"
                  value={searchServiceText}
                  onChange={handleServiceSearchChange}
                />
              </Form.Group>
            </Col>

            <Col className="m-0" xs={6} md={2}>
              <Button className='w-100' variant="outline-success" onClick={openBillingModal} disabled={billingData.length === 0}>
                Facturar ({totalServices}) ({totalInspections})
              </Button>
            </Col>

            {/* Filtro por empresa */}
            <Col xs={12} md={2}>
              <Form.Group controlId="formClientFilter">
                <Form.Control
                  as="select"
                  value={selectedClient}
                  onChange={(e) => setSelectedClient(e.target.value)}
                >
                  <option value="">Todas las empresas</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>

            {/* Filtro por responsable */}
            <Col xs={12} md={2}>
              <Form.Group controlId="formUserFilter">
                <Form.Control
                  as="select"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">Todos los responsables</option>
                  {technicians.map((tech) => (
                    <option key={tech.id} value={tech.id}>
                      {tech.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>
            </Col>
          </Row>


          <Row style={{ minHeight: 0, height: 'auto' }}>
            <Col md={open ? 5 : 12}>
              <div className="service-list">
                <Row style={{ minHeight: 0, height: 'auto' }}>
                  {filteredServices.map(service => (
                    <Col md={6} lg={4} xl={4} sm={6} xs={12} key={service.id} className="mb-4">

                      <Card
                        className="mb-3 border"
                        style={{ cursor: "pointer", minHeight: "280px", height: "280px" }}
                        onClick={() => handleServiceClick(service)}
                      >

                        <Card.Body>
                          <div className="d-flex align-items-center justify-content-between">
                            <div className="flex-grow-1 text-truncate">
                              <span className="fw-bold">{service.id}</span>
                              <span className="text-muted mx-2">|</span>
                              <span className="text-secondary">{service.service_type.replace(/[{}"]/g, '').split(',').join(', ')}</span>
                            </div>
                          </div>
                          <hr />
                          <div>
                            <Bug className="text-success me-2" />
                            <span className="text-secondary">
                              {(() => {
                                const pestMatches = service.pest_to_control.match(/"([^"]+)"/g);
                                const pests = pestMatches ? pestMatches.map(item => item.replace(/"/g, '')).join(', ') : "No especificado";
                                return pests.length > 20 ? `${pests.slice(0, 20)}...` : pests;
                              })()}
                            </span>
                          </div>
                          <div className="mt-2">
                            <Diagram3 className="text-warning me-2" />
                            <span className="text-secondary">
                              {(() => {
                                const areaMatches = service.intervention_areas.match(/"([^"]+)"/g);
                                const areas = areaMatches ? areaMatches.map(item => item.replace(/"/g, '')).join(', ') : "No especificadas";
                                return areas.length > 20 ? `${areas.slice(0, 20)}...` : areas;
                              })()}
                            </span>
                          </div>
                          <div className="mt-3">
                            <h6 >
                              <Building /> {clientNames[service.client_id] || "Cliente Desconocido"}
                            </h6>
                          </div>
                          <div className="mt-3">
                            <h6>
                              <Person />{" "}
                              {technicians.find((tech) => tech.id === service.responsible)?.name || "No asignado"}
                            </h6>
                          </div>
                        </Card.Body>
                        <Card.Footer
                          className="text-center position-relative"
                          style={{ background: "#f9f9f9", cursor: "pointer" }}
                          onClick={(e) => {
                            e.stopPropagation(); // Evita redirigir al hacer clic en el botón
                            toggleActions(service.id);
                          }}
                          ref={expandedCardId === service.id ? dropdownRef : null} // Solo asigna la referencia al desplegable abierto
                        >
                          <small className="text-success">
                            {expandedCardId === service.id ? "Cerrar Acciones" : "Acciones"}
                          </small>
                          {expandedCardId === service.id && (
                            <div
                              className={`menu-actions ${expandedCardId === service.id ? "expand" : "collapse"
                                }`}
                            >
                              <button
                                className="btn d-block"
                                onClick={(e) => {
                                  e.stopPropagation();
                                }}
                              >
                                <Trash size={18} className="me-2" />
                                Facturar
                              </button>
                            </div>
                          )}
                        </Card.Footer>
                      </Card>
                    </Col>
                  ))}
                </Row>
              </div>
            </Col>
          </Row>
        </>
      )}
      <Modal
        show={showDetailsModal}
        onHide={() => setShowDetailsModal(false)}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <GearFill className="me-2" /> Detalles del Servicio
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          {selectedService && (
            <div className="d-flex flex-column gap-4">
              {/* Información General */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <InfoCircle className="me-2" /> Información General
                </h5>
                <div className="d-flex flex-column gap-2">
                  <p className="my-1">
                    <strong>ID del Servicio:</strong> {selectedService.id}
                  </p>
                  <p className="my-1">
                    <strong>Tipo de Servicio:</strong>{" "}
                    {selectedService.service_type
                      .replace(/[\{\}"]/g, "")
                      .split(",")
                      .join(", ")}
                  </p>
                  <p className="my-1">
                    <strong>Cliente:</strong>{" "}
                    {clientNames[selectedService.client_id] || "Cliente Desconocido"}
                  </p>
                  <p className="my-1">
                    <strong>Responsable:</strong>{" "}
                    {technicians.find((tech) => tech.id === selectedService.responsible)?.name || "No asignado"}
                  </p>
                  <p className="my-1"><strong>Categoría:</strong> {selectedService.category}</p>
                  {selectedService.category === "Periódico" && (
                    <p className="my-1"><strong>Cantidad al Mes:</strong> {selectedService.quantity_per_month}</p>
                  )}
                  <p className="my-1">
                    <strong>Valor:</strong> ${selectedService.value}
                  </p>
                </div>
              </div>

              {/* Inspecciones */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <Clipboard className="me-2" /> Inspecciones
                </h5>
                {inspections.length > 0 ? (
                  <Table bordered hover>
                    <thead>
                      <tr>
                        <th>
                          <Form.Check
                            type="checkbox"
                            onChange={(e) => {
                              const isChecked = e.target.checked;
                              setSelectedInspections(
                                isChecked
                                  ? inspections
                                    .filter((inspection) => !isCheckboxDisabled(inspection)) // Solo agregar inspecciones habilitadas
                                    .map((inspection) => inspection.id)
                                  : []
                              );
                            }}
                            checked={
                              selectedInspections.length ===
                              inspections.filter((inspection) => !isCheckboxDisabled(inspection)).length &&
                              inspections.filter((inspection) => !isCheckboxDisabled(inspection)).length > 0
                            }
                          />
                        </th>
                        <th>ID</th>
                        <th>Fecha</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {inspections.map((inspection) => {
                        let findings = {};
                        if (typeof inspection.findings === "string") {
                          try {
                            findings = JSON.parse(inspection.findings);
                          } catch (error) {
                            console.error(`Error parsing findings for inspection ID ${inspection.id}:`, error);
                            findings = {};
                          }
                        } else if (typeof inspection.findings === "object" && inspection.findings !== null) {
                          findings = inspection.findings;
                        }

                        const hasClientSignature = findings.signatures?.client?.signature || false;
                        const hasTechnicianSignature = findings.signatures?.technician?.signature || false;
                        const isFinalized = hasClientSignature && hasTechnicianSignature;

                        return (
                          <tr key={inspection.id}>
                            <td>
                              <Form.Check
                                type="checkbox"
                                disabled={isCheckboxDisabled(inspection)} // Bloquear inspecciones de otros clientes
                                onChange={(e) => {
                                  const isChecked = e.target.checked;
                                  setSelectedInspections((prev) =>
                                    isChecked
                                      ? [...prev, inspection.id]
                                      : prev.filter((id) => id !== inspection.id)
                                  );
                                }}
                                checked={selectedInspections.includes(inspection.id)}
                              />
                            </td>
                            <td>{inspection.id}</td>
                            <td>{inspection.date}</td>
                            <td>{isFinalized ? "Finalizada" : "Pendiente"}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </Table>
                ) : (
                  <p>No hay inspecciones registradas para este servicio.</p>
                )}
                {/* Botón Agregar a Facturación */}
                <div className="d-flex justify-content-end mt-3">
                  <Button
                    variant="success"
                    onClick={() => handleAddToBilling(selectedInspections)}
                    disabled={selectedInspections.length === 0}
                  >
                    Agregar a Facturación
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={() => setShowDetailsModal(false)}>
            Cerrar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showBillingModal}
        onHide={closeBillingModal}
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title className="fw-bold">
            <GearFill className="me-2" /> Facturación
          </Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light p-4">
          {billingData.length > 0 && (
            <div>
              {/* Información del cliente */}
              <div className="bg-white shadow-sm rounded p-3 mb-3">
                <h5 className="text-secondary">Información del Cliente</h5>
                <p>
                  <strong>Tipo de Documento:</strong>{" "}
                  {clients.find((client) => client.id === billingData[0].client_id)?.document_type || "N/A"}
                </p>
                <p>
                  <strong>Número de Documento:</strong>{" "}
                  {clients.find((client) => client.id === billingData[0].client_id)?.document_number || "N/A"}
                </p>
              </div>

              {/* Información por servicio */}
              {billingData[0].services.map((service) => {
                const serviceInfo = services.find((svc) => svc.id === service.service_id);
                return (
                  <div key={service.service_id} className="bg-white shadow-sm rounded p-3 mb-3">
                    <h5 className="text-secondary">{serviceInfo?.id} | {serviceInfo?.service_type.replace(/[{}"]/g, '').split(',').join(', ')}</h5>
                    <p>
                      <strong>Valor del Servicio:</strong> ${serviceInfo?.value || "0"}
                    </p>
                    <h6>Inspecciones:</h6>
                    <ul>
                      {service.inspections.map((inspectionId) => (
                        <li key={inspectionId}>Inspección: {inspectionId}</li>
                      ))}
                    </ul>
                  </div>
                );
              })}

              {/* Comprobante de Facturación */}
              <div className="bg-white shadow-sm rounded p-3 mb-3">
                <h5 className="text-secondary">Comprobante de Facturación</h5>
                <Form.Group controlId="formFile" className="mb-3">
                  <Form.Label>Subir Comprobante</Form.Label>
                  <Form.Control
                    type="file"
                    onChange={handleFileChange}
                    accept=".pdf,.jpg,.png,.jpeg"
                  />
                </Form.Group>
              </div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="danger" onClick={resetBillingData}>
            Borrar
          </Button>
          <Button variant="success" onClick={handleSubmitBilling}>
            Facturar
          </Button>
        </Modal.Footer>
      </Modal>
    </div>

  );
}
export default Billing;