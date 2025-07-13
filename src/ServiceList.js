import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import { useMemo } from "react";
import { useNavigate, useLocation } from 'react-router-dom'; // Asegúrate de tener configurado react-router
import { Calendar, Person, Bag, Building, PencilSquare, Trash, Bug, Diagram3, GearFill, Clipboard, PlusCircle, InfoCircle, FileText, GeoAlt, Calendar2Check, FileEarmarkWord, FileEarmarkExcel, FileEarmarkPdf, FileEarmarkImage, FileEarmarkArrowDown, EnvelopePaper, Whatsapp, Radioactive } from 'react-bootstrap-icons';
import { Card, Col, Row, Collapse, Button, Table, Modal, Form, CardFooter, ModalTitle } from 'react-bootstrap';
import ClientInfoModal from './ClientInfoModal'; // Ajusta la ruta según la ubicación del componente
import 'bootstrap/dist/css/bootstrap.min.css';
import './ServiceList.css'
import { isMobile } from "react-device-detect";

function ServiceList() {
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
  const [showInterventionAreasOptions, setShowInterventionAreasOptions] = useState(false);
  const [documents, setDocuments] = useState([]);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [convertToPdfModalOpen, setConvertToPdfModalOpen] = useState(false);
  const [selectedDocForPdf, setSelectedDocForPdf] = useState(null);
  const [loadingConvertToPdf, setLoadingConvertToPdf] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [actions, setActions] = useState([]);
  const [clientData, setClientData] = useState(null);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  const [loadingCorreo, setLoadingCorreo] = useState(false);
  const [showModalActions, setShowModalActions] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
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
    companion: '',
    created_by: userId,
    company: '',
    customCompany: '',
    created_at: moment().format('DD-MM-YYYY'),
  });
  const [showEditModal, setShowEditModal] = useState(false);
  const [showServiceType, setShowServiceType] = useState(false);
  const [showCompanionOptions, setShowCompanionOptions] = useState(false);
  const [searchText, setSearchText] = useState(''); // Estado para la búsqueda
  const [filteredClients, setFilteredClients] = useState([]); // Clientes filtrados para la búsqueda
  const [showSuggestions, setShowSuggestions] = useState(false); // Controla si se muestran las sugerencias
  const [searchServiceText, setSearchServiceText] = useState(''); // Estado para el texto de búsqueda en servicios
  const [showClientModal, setShowClientModal] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState(null);
  const [newService, setNewService] = useState({
    service_type: [],
    description: '',
    pest_to_control: [],
    intervention_areas: [],
    customInterventionArea: '', // Nuevo campo para el área personalizada
    responsible: '',
    category: '',
    quantity_per_month: '',
    date: '',
    time: '',
    client_id: '',
    value: '',
    companion: '',
    company: 'Fumiplagax',
    customCompany: '',
    created_by: userId,
    created_at: moment().format('DD-MM-YYYY'),
  });
  const [selectedCompany, setSelectedCompany] = useState('');
  const [expandedCardId, setExpandedCardId] = useState(null);
  const [notification, setNotification] = useState({
    show: false,
    title: '',
    message: '',
  });
  const dropdownRef = useRef(null);

  const toggleActions = (id) => {
    setExpandedCardId((prevId) => (prevId === id ? null : id)); // Alterna el estado abierto/cerrado del menú
  };

  const handleClickOutside = (event) => {
    // Si el clic no es dentro del menú desplegable, ciérralo
    if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
      setExpandedCardId(null);
    }
  };

  const fetchInspections = async (serviceId) => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/inspections?service_id=${serviceId}`);
      const formattedInspections = response.data
        .filter((inspection) => inspection.service_id === serviceId) // Filtra por `service_id`
        .map((inspection) => ({
          ...inspection,
          date: moment(inspection.date).format("DD/MM/YYYY"), // Formato legible para la fecha
          time: inspection.time ? moment(inspection.time, "HH:mm:ss").format("HH:mm") : "--",
          exit_time: inspection.exit_time ? moment(inspection.exit_time, "HH:mm:ss").format("HH:mm") : "--",
          observations: inspection.observations || "Sin observaciones",
        }))
        .sort((a, b) => b.datetime - a.datetime); // Ordena por fecha y hora
      setInspections(formattedInspections);
    } catch (error) {
      console.error("Error fetching inspections:", error);
    }
  };

  // Dentro de tu componente MyServices
  const location = useLocation();
  const serviceIdFromState = location.state?.serviceId;

  // Si el estado contiene un serviceId, selecciona automáticamente ese servicio y abre el modal.
  useEffect(() => {
    if (serviceIdFromState) {
      const service = services.find(s => s.id === serviceIdFromState);
      if (service) {
        setSelectedService(service);
        fetchInspections(service.id);
        setShowDetailsModal(true);
      }
    }
  }, [serviceIdFromState, services]);

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

  const showNotification = (title, message) => {
    setNotification({ show: true, title, message });
    setTimeout(() => {
      setNotification({ show: false, title, message: '' });
    }, 2500); // 2.5 segundos
  };

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search); // Extrae los parámetros de la URL
    const dataParam = queryParams.get("data"); // Obtén el parámetro "data"

    if (dataParam) {
      try {
        const serviceData = JSON.parse(decodeURIComponent(dataParam)); // Decodifica y convierte el JSON

        console.log("Datos extraídos de la URL:", serviceData); // Log para verificar los datos

        // Actualiza el estado del nuevo servicio con los datos extraídos
        setNewService((prevService) => ({
          ...prevService,
          ...serviceData,
          created_by: serviceData.created_by || prevService.created_by,
        }));

        setShowAddServiceModal(true); // Abre el modal automáticamente
      } catch (error) {
        console.error("Error al procesar los datos de la URL:", error);
      }
    } else {
      console.log("No se encontró el parámetro 'data' en la URL.");
    }
  }, [location.search]);

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const serviceId = queryParams.get('serviceId');
    if (serviceId) {
      const service = services.find((s) => s.id === serviceId);
      if (service) {
        setSelectedService(service);
        fetchInspections(service.id);
        setShowAddServiceModal(true);
      }
    }
  }, [location.search, services]);

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
    "Nevera",
    "Oficinas",
    "Producción",
    "Servicio al cliente",
    "Shot de basuras",
    "Otro"
  ];


  const handleInterventionAreasChange = (e) => {
    const { value, checked } = e.target;

    setNewService((prevService) => {
      // Si la opción seleccionada es "Otro"
      if (value === "Otro") {
        setShowInterventionAreas(checked); // Muestra u oculta la casilla de texto personalizada
      }

      // Actualiza las áreas seleccionadas
      return {
        ...prevService,
        intervention_areas: checked
          ? [...prevService.intervention_areas, value] // Agrega la opción seleccionada
          : prevService.intervention_areas.filter((area) => area !== value), // Remueve la opción deseleccionada
      };
    });
  };

  const handleCustomInterventionAreaChange = (e) => {
    setNewService((prevService) => ({
      ...prevService,
      customInterventionArea: e.target.value,
    }));
  };

  const navigate = useNavigate();

  const handleSchedule = (serviceId) => {
    navigate(`/services-calendar?serviceId=${serviceId}`); // Navega a la ruta con el id del servicio
  };

  const handleInspectionClick = (inspection) => {
    console.log("Clicked inspection:", inspection);
    // Redirigir a la página de Detalles de Inspección con el ID seleccionado
    navigate(`/inspection/${inspection.id}`);
  };

  const handleEditClick = (service) => {
    const parseField = (field) => {
      if (!field) return []; // Si es null o undefined, devuelve un array vacío

      if (Array.isArray(field)) {
        return field; // Si ya es un array, lo retornamos directamente
      }

      if (typeof field === "string") {
        return field
          .replace(/[\{\}"]/g, "") // Elimina llaves y comillas
          .split(",")
          .map((item) => item.trim());
      }

      console.error("ERROR: Tipo de dato inesperado en parseField:", field);
      return []; // Previene fallos si el tipo de dato es inesperado
    };

    const interventionAreas = parseField(service.intervention_areas);

    const customArea = interventionAreas.includes("Otro")
      ? interventionAreas.filter((area) => area !== "Otro").join(", ")
      : "";

    setEditService({
      ...service,
      service_type: parseField(service.service_type), // ✅ Manejo seguro
      pest_to_control: parseField(service.pest_to_control),
      intervention_areas: interventionAreas,
      companion: parseField(service.companion),
      customInterventionArea: customArea,
      company: service.company,
      customCompany: service.company === "Otro" ? service.customCompany || "" : "",
    });

    setVisiblePestOptions(
      Array.from(new Set(parseField(service.service_type).flatMap((type) => pestOptions[type.trim()] || [])))
    );

    setShowInterventionAreas(interventionAreas.includes("Otro"));
    setShowEditModal(true);
  };

  const handleCompanyChange = (e) => {
    const selectedCompany = e.target.value;

    setNewService((prevService) => ({
      ...prevService,
      company: selectedCompany,
      customCompany: selectedCompany === "Otro" ? prevService.customCompany : "", // Borra el campo personalizado si no es "Otro"
    }));
  };

  const handleEditCompanyChange = (e) => {
    const selectedCompany = e.target.value;

    setEditService((prevService) => ({
      ...prevService,
      company: selectedCompany,
      customCompany: selectedCompany === "Otro" ? prevService.customCompany || "" : "", // ✅ Asegura que si no es "Otro", el campo se vacía
    }));
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

  const handleSaveChanges = async () => {
    try {
      const interventionAreas = editService.intervention_areas.filter(
        (area) => area !== "Otro"
      );

      if (editService.customInterventionArea.trim()) {
        interventionAreas.push(editService.customInterventionArea.trim());
      }

      const formattedEditService = {
        ...editService,
        responsible: editService.responsible || "", // ✅ Evita valores `null`
        intervention_areas: `{${interventionAreas.map((a) => `"${a}"`).join(",")}}`,
        pest_to_control: `{${editService.pest_to_control.map((p) => `"${p}"`).join(",")}}`,
        service_type: `{${editService.service_type.map((s) => `"${s}"`).join(",")}}`,
        companion: `{${editService.companion.map((c) => `"${c}"`).join(",")}}`,
        customInterventionArea: "",
      };

      const response = await axios.put(
        `${process.env.REACT_APP_API_URL}/api/services/${editService.id}`,
        formattedEditService
      );

      if (response.data.success) {
        setServices((prevServices) =>
          prevServices.map((service) =>
            service.id === editService.id
              ? { ...formattedEditService, id: editService.id }
              : service
          )
        );

        handleCloseEditModal();
      }
    } catch (error) {
      console.error("Error updating service:", error);
    }
  };

  const handleDeleteClick = async (serviceId) => {
    try {
      const response = await axios.delete(`${process.env.REACT_APP_API_URL}/api/services/${serviceId}`);
      if (response.data.success) {
        setServices(services.filter(service => service.id !== serviceId));
      }
    } catch (error) {
      console.error("Error deleting service:", error);
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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const servicesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/services`);
        const clientsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients`);
        const techniciansResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/users?role=Technician`);

        // Ordenar los servicios de forma descendente por created_at
        const sortedServices = servicesResponse.data.sort((a, b) =>
          new Date(b.created_at) - new Date(a.created_at)
        );

        setServices(sortedServices);
        setClients(clientsResponse.data);
        setTechnicians(techniciansResponse.data);
        setFilteredServices(sortedServices);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching data:", error);
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    const fetchServicesAndClients = async () => {
      try {
        const servicesResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/services`);
        const clientsResponse = await axios.get(`${process.env.REACT_APP_API_URL}/api/clients`);

        const clientData = {};
        clientsResponse.data.forEach(client => {
          clientData[client.id] = client.name;
        });

        setClientNames(clientData);
        setServices(servicesResponse.data);
        setFilteredServices(servicesResponse.data);
        setClients(clientsResponse.data);
      } catch (error) {
        console.error("Error fetching data:", error);
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

    // Llama a las funciones sin duplicación
    fetchServicesAndClients();
    fetchTechnicians();
  }, []); // Asegúrate de que las dependencias sean vacías para ejecutarse solo al montar.

  useEffect(() => {
    console.log("Estado actualizado de filteredServices:", filteredServices);
  }, [filteredServices]);

  useEffect(() => {
    // Preprocesar los tipos de servicio una sola vez
    const preprocessedServices = services.map((service) => ({
      ...service,
      service_type_cleaned: service.service_type
        ? service.service_type.replace(/[\{\}"]/g, "").toLowerCase()
        : "",
    }));

    let filtered = preprocessedServices;

    if (searchServiceText) {
      filtered = filtered.filter((service) =>
        service.id.toString().includes(searchServiceText) ||
        (clients.find((client) => client.id === service.client_id)?.name || "").toLowerCase().includes(searchServiceText.toLowerCase()) ||
        (technicians.find((tech) => tech.id === service.responsible)?.name || "").toLowerCase().includes(searchServiceText.toLowerCase()) ||
        service.service_type_cleaned.includes(searchServiceText) ||
        service.company.toLowerCase().includes(searchServiceText)
      );
    }

    if (selectedClient) {
      filtered = filtered.filter((service) => service.client_id === parseInt(selectedClient));
    }

    if (selectedUser) {
      filtered = filtered.filter((service) => service.responsible === selectedUser);
    }

    if (selectedCompany) {
      filtered = filtered.filter((service) => {
        if (selectedCompany === "Otro") {
          return service.company !== "Fumiplagax" && service.company !== "Control";
        }
        return service.company === selectedCompany;
      });
    }

    setFilteredServices(filtered);
  }, [searchServiceText, selectedClient, selectedUser, selectedCompany, services, clients, technicians]);

  if (loading) return <div>Cargando servicios...</div>;

  const handleShowClientModal = (clientId) => {
    setSelectedClientId(clientId);
    setShowClientModal(true);
  };

  const handleCloseClientModal = () => {
    setShowClientModal(false);
    setSelectedClientId(null);
  };

  const handleServiceSearchChange = (e) => {
    const input = e.target.value.toLowerCase();
    setSearchServiceText(input);

    console.log("Texto de búsqueda:", input);

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
    const cli = clients.find(c => c.id === service.client_id);
    setClientData(cli);
    fetchActions();
    fetchDocuments(service.id);
    setShowDetailsModal(true); // Abre el modal
  };

  const fetchActions = async () => {
    try {
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/actions-services`);
      setActions(response.data.actions || []); // Asume que el backend devuelve un array de acciones
    } catch (error) {
      console.error('Error fetching actions:', error);
    }
  };

  const fetchDocuments = async (service) => {
    try {
      console.log("📦 fetchDocuments - Iniciando con service:", service);
      const response = await axios.get(`${process.env.REACT_APP_API_URL}/api/get-documents`, {
        params: { entity_type: 'services', entity_id: service },
      });
      if (response.data.documents && response.data.documents.length > 0) {
        console.log("📄 Documentos encontrados:", response.data.documents);
      } else {
        console.warn("⚠️ No se encontraron documentos para el servicio:", service);
      }
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleDocumentClick = (documentUrl) => {
    setSelectedDocument(documentUrl);
    setDocumentModalOpen(true);
  };

  // Abrir el modal
  const handleOpenConvertToPdfModal = () => {
    setConvertToPdfModalOpen(true);
  };

  // Cerrar el modal
  const handleCloseConvertToPdfModal = () => {
    setConvertToPdfModalOpen(false);
    setSelectedDocForPdf(null);
  };

  // Realizar la conversión a PDF
  const handleConvertToPdf = async () => {
    setLoadingConvertToPdf(true); // Mostrar spinner
    try {
      console.log("Enviando solicitud para convertir a PDF...");
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/convert-to-pdf`, {
        generatedDocumentId: selectedDocForPdf.id,
      });

      console.log("Respuesta recibida del backend:", response.data);

      if (response.data.success) {
        console.log("Conversión exitosa. Datos del nuevo documento:", response.data.newDocument);
        setConvertToPdfModalOpen(false);
        console.log("Actualizando lista de documentos...");
        await fetchDocuments();
      } else {
        console.error("Error en la conversión del documento:", response.data.message);
        alert(response.data.message || "Ocurrió un error al convertir el documento.");
      }
    } catch (error) {
      console.error("Error al conectar con el servidor:", error);
      alert("Error de conexión con el servidor al intentar convertir el documento.");
    } finally {
      setLoadingConvertToPdf(false); // Ocultar spinner
    }
  };

  const handleActionClick = async (configurationId) => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const payload = {
        idEntity: selectedService.id,
        id: configurationId,
        uniqueId: Date.now(),
      };

      console.log("📤 Enviando payload a /api/create-document-service:", payload);

      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}/api/create-document-service`,
        payload
      );

      console.log("✅ Respuesta del backend:", response);
      console.log("📦 response.data:", response.data);

      if (response.data?.success === true) {
        console.log("🎉 Acción ejecutada correctamente");
        showNotification("Acción ejecutada con éxito.");
        await fetchDocuments(selectedService.id); // asegúrate de pasar el ID
      } else {
        console.warn("⚠️ El backend no devolvió 'success: true'");
        showNotification("Error al ejecutar la acción.");
      }
    } catch (error) {
      console.error("❌ Error al ejecutar la acción:", error);
      if (error.response) {
        console.error("📄 error.response.data:", error.response.data);
        console.error("📄 error.response.status:", error.response.status);
      }
      showNotification("Error al ejecutar la acción.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/PrefirmarArchivos`, { url: selectedDocument.document_url });
      if (response.data.signedUrl) {
        const preSignedUrl = response.data.signedUrl;
        const link = document.createElement('a');
        link.href = preSignedUrl;
        link.download = 'document'; // Cambia el nombre del archivo si es necesario
        link.click();
      } else {
        alert('No se pudo obtener la URL prefirmada.');
      }
    } catch (error) {
      console.error('Error al obtener la URL prefirmada para descargar:', error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };

  const handleEditGoogleDrive = async () => {
    setLoadingGoogleDrive(true); // Mostrar el spinner
    try {
      console.log("Iniciando pre-firmado del documento:", selectedDocument);

      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/PrefirmarArchivos`, { url: selectedDocument.document_url });
      console.log("Respuesta de pre-firmado:", response.data);

      if (response.data.signedUrl) {
        const preSignedUrl = response.data.signedUrl;
        console.log("URL prefirmada obtenida:", preSignedUrl);

        console.log("Enviando solicitud para editar en Google Drive...");
        const googleDriveResponse = await axios.post(`${process.env.REACT_APP_API_URL}/api/edit-googledrive`, { s3Url: preSignedUrl });
        console.log("Respuesta de edición en Google Drive:", googleDriveResponse.data);

        if (googleDriveResponse.data.success && googleDriveResponse.data.fileId) {
          const googleDriveEditUrl = `https://docs.google.com/document/d/${googleDriveResponse.data.fileId}/edit`;
          console.log("URL de edición en Google Drive:", googleDriveEditUrl);

          // Abrir Google Drive en una nueva pestaña
          window.open(googleDriveEditUrl, "_blank", "noopener,noreferrer");

          // Pasar información al nuevo componente
          const documentInfo = {
            id: selectedDocument.id,
            entity_id: selectedDocument.entity_id,
            document_url: selectedDocument.document_url,
            google_drive_url: googleDriveEditUrl,
            google_drive_id: googleDriveResponse.data.fileId,
          };

          console.log("Información del documento que se pasa al componente:", documentInfo);

          navigate("/edit-google-drive", {
            state: {
              documentInfo,
            },
          });
        } else {
          console.error("No se pudo obtener el archivo en Google Drive:", googleDriveResponse.data);
          alert("No se pudo obtener el archivo en Google Drive.");
        }
      } else {
        console.error("No se pudo obtener la URL prefirmada.");
        alert("No se pudo obtener la URL prefirmada.");
      }
    } catch (error) {
      console.error("Error al procesar la solicitud de Google Drive:", error);
      alert("Hubo un error al procesar la solicitud.");
    } finally {
      setLoadingGoogleDrive(false); // Ocultar el spinner
    }
  };

  const handleEditLocal = () => {
    navigate("/edit-local-file", { state: { documentId: selectedDocument.id } });
  };

  const closeDocumentModal = () => {
    setSelectedDocument(null);
    setDocumentModalOpen(false);
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

  const handleClientSelect = (client) => {
    setSearchText(client.name); // Establece el nombre en el campo de búsqueda
    setNewService({ ...newService, client_id: client.id }); // Asigna el ID del cliente seleccionado
    setShowSuggestions(false); // Oculta la lista de sugerencias
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

  const handleCloseAddInspectionModal = () => {
    setShowAddInspectionModal(false);
  };

  const handleSaveInspection = async () => {
    if (!Array.isArray(newInspection.inspection_type) || newInspection.inspection_type.length === 0) {
      showNotification("Debe seleccionar al menos un tipo de inspección.");
      return;
    }

    if (
      newInspection.inspection_type.includes("Desratización") &&
      !newInspection.inspection_sub_type
    ) {
      showNotification("Debe seleccionar un Sub tipo para Desratización.");
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
      createdBy: userId,
    };

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/inspections`, inspectionData);

      if (response.data.success) {
        showNotification("Error", "Inspección guardada con éxito");
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

  const handleShowAddServiceModal = () => {
    setNewService((prevService) => ({
      ...prevService,
      created_by: userId, // Asigna el ID del usuario logueado
      created_at: moment().format('DD-MM-YYYY'), // Establece la fecha actual
    }));
    setShowAddServiceModal(true);
  };

  // Filtrar técnicos excluyendo el seleccionado como responsable
  const filteredTechniciansForCompanion = technicians.filter(
    (technician) => technician.id !== newService.responsible
  );

  const filteredTechniciansForEdit = technicians.filter(
    (technician) => technician.id !== editService.responsible
  );


  const handleCloseAddServiceModal = () => {
    setNewService({
      service_type: [],
      description: '',
      pest_to_control: [],
      intervention_areas: [],
      customInterventionArea: '',
      responsible: '',
      category: '',
      quantity_per_month: '',
      date: '',
      time: '',
      client_id: '',
      value: '',
      companion: '',
      created_by: userId,
      created_at: moment().format('DD-MM-YYYY'),
    });
    setShowAddServiceModal(false);
  };

  const handleCloseEditModal = () => {
    setEditService({
      service_type: [],
      description: '',
      pest_to_control: '',
      intervention_areas: '',
      responsible: '',
      category: '',
      quantity_per_month: '',
      client_id: '',
      value: '',
      companion: '',
      created_by: userId,
      created_at: moment().format('DD-MM-YYYY'),
    });
    setShowEditModal(false);
  };

  const handleNewServiceChange = (e) => {
    const { name, value } = e.target;
    setNewService({ ...newService, [name]: value });
  };

  const handleSaveNewService = async () => {
    const interventionAreas = newService.intervention_areas.filter(
      (area) => area !== "Otro" // Excluye la opción "Otro"
    );

    if (newService.customInterventionArea.trim()) {
      interventionAreas.push(newService.customInterventionArea.trim());
    }

    const serviceData = {
      ...newService,
      intervention_areas: interventionAreas,
      customInterventionArea: '', // Limpia el área personalizada tras guardar
      responsible: newService.responsible || null, // Validación para responsables
      client_id: newService.client_id || null, // Validación para cliente
      value: newService.value || null, // Validación para valor
      quantity_per_month: newService.quantity_per_month || null, // Validación para cantidad
      company: newService.company === "" || newService.company === null ? "Fumiplagax" : newService.company === "Otro" ? newService.customCompany : newService.company, // Guarda el nombre correcto de la empresa
    };

    try {
      const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/services`, serviceData);
      if (response.data.success) {
        setServices([...services, response.data.service]);
        handleCloseAddServiceModal();
        showNotification("Éxito", "Servicio guardado exitosamente");
      } else {
        console.error("Error: No se pudo guardar el servicio.", response.data.message);
        showNotification("Error", "Error: No se pudo guardar el servicio");
      }
    } catch (error) {
      console.error("Error saving new service:", error);
      showNotification("Error", "Error: Hubo un problema al guardar el servicio");
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


  if (loading) {
    return (
      <div className="loading-overlay">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Cargando...</span>
        </div>
      </div>
    );
  }


  const handleCompanionChange = (e) => {
    const { value, checked } = e.target;
    setNewService((prevService) => ({
      ...prevService,
      companion: checked
        ? [...prevService.companion, value] // Agrega el ID si está seleccionado
        : prevService.companion.filter((companionId) => companionId !== value) // Elimina el ID si se deselecciona
    }));
  };

  const handleEditCompanionChange = (e) => {
    const { value, checked } = e.target;

    setEditService((prevService) => {
      let updatedCompanions = checked
        ? [...prevService.companion, value] // Agregar el ID si está seleccionado
        : prevService.companion.filter((companionId) => companionId !== value); // Eliminar el ID si se deselecciona

      // Filtra valores vacíos o nulos
      updatedCompanions = updatedCompanions.filter((id) => id.trim() !== "");

      return {
        ...prevService,
        companion: updatedCompanions.length > 0 ? updatedCompanions : [], // Mantiene [] si no hay acompañantes
      };
    });
  };

  return (
    <div className="container mt-4">
      <Row className="align-items-center mb-4" style={{ minHeight: 0, height: 'auto' }}>
        {/* Campo de búsqueda */}
        <Col xs={12} md={4}>
          <Form.Group controlId="formServiceSearch">
            <Form.Control
              type="text"
              placeholder="Buscar"
              value={searchServiceText}
              onChange={handleServiceSearchChange}
            />
          </Form.Group>
        </Col>

        {/* Filtro por empresa responsable */}
        <Col xs={12} md={2}>
          <Form.Group controlId="formCompanyFilter">
            <Form.Control
              as="select"
              value={selectedCompany}
              onChange={(e) => setSelectedCompany(e.target.value)}
            >
              <option value="">Todas las empresas</option>
              <option value="Fumiplagax">Fumiplagax</option>
              <option value="Control">Control</option>
              <option value="Otro">Otro</option>
            </Form.Control>
          </Form.Group>
        </Col>

        {/* Filtro por clientes */}
        <Col xs={12} md={2}>
          <Form.Group controlId="formClientFilter">
            <Form.Control
              as="select"
              value={selectedClient}
              onChange={(e) => setSelectedClient(e.target.value)}
            >
              <option value="">Todas los clientes</option>
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

        {/* Botón Añadir Servicio */}
        <Col xs={12} md={2} className="text-md-end">
          <Button
            variant="success"
            onClick={handleShowAddServiceModal}
            style={{ height: '38px', width: '100%' }} // Mantiene proporciones
          >
            Añadir Servicio
          </Button>
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
                          <span
                            className={`fw-bold px-1 py-1 rounded text-white ${service.company === "Fumiplagax" ? "bg-success" :
                              service.company === "Control" ? "bg-primary" : "bg-warning"
                              }`}
                          >
                            {service.company === "Fumiplagax" ? "F" :
                              service.company === "Control" ? "C" : "O"}
                          </span>
                          <span className="fw-bold"> {service.id}</span>
                          <span className="text-muted mx-2">|</span>
                          <span className="text-secondary">{service.service_type.replace(/[{}"]/g, '').split(',').join(', ')}</span>
                        </div>
                      </div>
                      <hr />
                      <div>
                        <Bug className="text-success me-2" />
                        <span className="text-secondary">
                          {(() => {
                            const pestMatches = typeof service.pest_to_control === "string"
                              ? service.pest_to_control.match(/"([^"]+)"/g)
                              : null;
                            const pests = pestMatches ? pestMatches.map(item => item.replace(/"/g, '')).join(', ') : "No especificado";
                            return pests.length > 20 ? `${pests.slice(0, 20)}...` : pests;
                          })()}
                        </span>
                      </div>
                      <div className="mt-2">
                        <Diagram3 className="text-warning me-2" />
                        <span className="text-secondary">
                          {(() => {
                            const areaMatches = typeof service.intervention_areas === "string"
                              ? service.intervention_areas.match(/"([^"]+)"/g)
                              : null;
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
                              setSelectedService(service); // Asegúrate de seleccionar el servicio
                              handleShowModal();
                            }}
                          >
                            <PlusCircle size={18} className="me-2" />
                            Añadir Inspección
                          </button>
                          <button
                            className="btn d-block"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditClick(service);
                            }}
                          >
                            <PencilSquare size={18} className="me-2" />
                            Editar
                          </button>
                          <button
                            className="btn d-block"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteClick(service.id);
                            }}
                          >
                            <Trash size={18} className="me-2" />
                            Eliminar
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

      {/* Modal para añadir una nueva inspección */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>Añadir Inspección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formInspectionType">
              <Form.Label>Tipo de Inspección</Form.Label>
              <div>
                {selectedService?.service_type
                  ?.replace(/[\{\}"]/g, "")
                  .split(",")
                  .map((type, index) => (
                    <Form.Check
                      key={index}
                      type="checkbox"
                      label={type.trim()}
                      value={type.trim()}
                      checked={newInspection.inspection_type?.includes(type.trim())}
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
          <Button variant="dark" onClick={handleCloseModal}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSaveInspection}>
            Guardar Inspección
          </Button>
        </Modal.Footer>
      </Modal> {/* Cierre del Modal */}

      <Modal show={showAddServiceModal} onHide={() => setShowAddServiceModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title><PlusCircle /> Añadir Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            {/* Selector de Empresa */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Empresa</Form.Label>
              <Form.Control
                as="select"
                name="company"
                value={newService.company}
                onChange={handleCompanyChange}
              >
                <option value="Fumiplagax">Fumiplagax</option>
                <option value="Control">Control</option>
                <option value="Otro">Otro</option>
              </Form.Control>
            </Form.Group>

            {/* Campo oculto para nombre personalizado si el usuario elige "Otro" */}
            {newService.company === "Otro" && (
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Nombre de la Empresa</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Ingrese el nombre de la empresa"
                  value={newService.customCompany}
                  onChange={(e) =>
                    setNewService({ ...newService, customCompany: e.target.value })
                  }
                />
              </Form.Group>
            )}
            {/* Tipo de Servicio */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Tipo de Servicio</Form.Label>
              <div className="d-flex flex-wrap">
                {serviceOptions.map((option, index) => (
                  <div key={index} className="col-4 mb-2">
                    <Form.Check
                      type="checkbox"
                      label={<span style={{ fontSize: "0.8rem" }}>{option}</span>}
                      value={option}
                      checked={newService.service_type.includes(option)}
                      onChange={(e) => handleServiceTypeChange(e)}
                    />
                  </div>
                ))}
              </div>
            </Form.Group>

            {/* Descripción */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Descripción</Form.Label>
              <Form.Control
                as="textarea"
                rows={3}
                name="description"
                value={newService.description}
                onChange={handleNewServiceChange}
              />
            </Form.Group>

            {/* Plaga a Controlar */}
            {visiblePestOptions.length > 0 && (
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Plaga a Controlar</Form.Label>
                <div className="d-flex flex-wrap">
                  {visiblePestOptions.map((pest, index) => (
                    <div key={index} className="col-4 mb-2">
                      <Form.Check
                        type="checkbox"
                        label={<span style={{ fontSize: "0.8rem" }}>{pest}</span>}
                        value={pest}
                        checked={newService.pest_to_control.includes(pest)}
                        onChange={handlePestToControlChange}
                      />
                    </div>
                  ))}
                </div>
              </Form.Group>
            )}

            {/* Áreas de Intervención */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Áreas de Intervención</Form.Label>
              <div className="d-flex flex-wrap">
                {interventionAreaOptions.map((area, index) => (
                  <div key={index} className="col-4 mb-2">
                    <Form.Check
                      type="checkbox"
                      label={<span style={{ fontSize: "0.8rem" }}>{area}</span>}
                      value={area}
                      checked={newService.intervention_areas.includes(area)}
                      onChange={handleInterventionAreasChange}
                    />
                  </div>
                ))}
              </div>
            </Form.Group>

            {/* Casilla para "Otro" */}
            {showInterventionAreas && (
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Añadir área de intervención</Form.Label>
                <Form.Control
                  type="text"
                  placeholder="Escribe aquí"
                  value={newService.customInterventionArea}
                  onChange={handleCustomInterventionAreaChange}
                />
              </Form.Group>
            )}

            {/* Responsable */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Responsable</Form.Label>
              <Form.Control
                as="select"
                name="responsible"
                value={newService.responsible}
                onChange={handleNewServiceChange}
              >
                <option value="">Seleccione un técnico</option>
                {technicians.map((technician) => (
                  <option key={technician.id} value={technician.id}>
                    {technician.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            {/* Categoría */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Categoría</Form.Label>
              <Form.Control
                as="select"
                name="category"
                value={newService.category}
                onChange={(e) => {
                  handleNewServiceChange(e);
                  setNewService({ ...newService, category: e.target.value });
                }}
              >
                <option value="">Seleccione una categoría</option>
                <option value="Puntual">Puntual</option>
                <option value="Periódico">Periódico</option>
              </Form.Control>
            </Form.Group>

            {/* Cantidad al Mes */}
            {newService.category === "Periódico" && (
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Cantidad al Mes</Form.Label>
                <Form.Control
                  type="number"
                  name="quantity_per_month"
                  value={newService.quantity_per_month}
                  onChange={handleNewServiceChange}
                />
              </Form.Group>
            )}

            {/* Cliente */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Cliente</Form.Label>
              <Form.Control
                as="select"
                name="client_id"
                value={newService.client_id}
                onChange={handleNewServiceChange}
              >
                <option value="">Seleccione un cliente</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Form.Control>
            </Form.Group>

            {/* Valor */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Valor</Form.Label>
              <Form.Control
                type="number"
                name="value"
                value={newService.value}
                onChange={handleNewServiceChange}
              />
            </Form.Group>

            {/* Acompañante */}
            <Form.Group className="mt-3">
              <Form.Label style={{ fontWeight: "bold" }}>Acompañante</Form.Label>
              <div className="d-flex flex-wrap">
                {filteredTechniciansForCompanion.map((technician, index) => (
                  <div key={index} className="col-4 mb-2">
                    <Form.Check
                      type="checkbox"
                      label={<span style={{ fontSize: "0.8rem" }}>{technician.name}</span>}
                      value={technician.id}
                      checked={newService.companion.includes(technician.id)}
                      onChange={handleCompanionChange}
                    />
                  </div>
                ))}
              </div>
            </Form.Group>

            {/* Campos Ocultos */}
            <Form.Control type="hidden" name="created_by" value={newService.created_by} />
            <Form.Control type="hidden" name="created_at" value={newService.created_at} />
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={() => handleCloseAddServiceModal()}>
            Cancelar
          </Button>
          <Button variant="success" onClick={() => handleSaveNewService()}>
            Guardar Servicio
          </Button>
        </Modal.Footer>
      </Modal>


      <Modal show={showEditModal} onHide={() => setShowEditModal(false)}>
        <Modal.Header closeButton>
          <Modal.Title><PencilSquare /> Editar Servicio</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {editService && (
            <Form>
              {/* Selector de Empresa */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Empresa</Form.Label>
                <Form.Control
                  as="select"
                  name="company"
                  value={["Fumiplagax", "Control"].includes(editService.company) ? editService.company : "Otro"}
                  onChange={handleEditCompanyChange}
                >
                  <option value="Fumiplagax">Fumiplagax</option>
                  <option value="Control">Control</option>
                  <option value="Otro">Otro</option>
                </Form.Control>
              </Form.Group>

              {/* Campo oculto para nombre personalizado si el usuario elige "Otro" */}
              {!["Fumiplagax", "Control"].includes(editService.company) && (
                <Form.Group className="mt-3">
                  <Form.Label style={{ fontWeight: "bold" }}>Nombre de la Empresa</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Ingrese el nombre de la empresa"
                    value={editService.company || ""}
                    onChange={(e) =>
                      setEditService({ ...editService, customCompany: e.target.value })
                    }
                  />
                </Form.Group>
              )}
              {/* Tipo de Servicio */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Tipo de Servicio</Form.Label>
                <div className="d-flex flex-wrap">
                  {serviceOptions.map((option, index) => (
                    <div key={index} className="col-4 mb-2">
                      <Form.Check
                        type="checkbox"
                        label={<span style={{ fontSize: "0.8rem" }}>{option}</span>}
                        value={option}
                        checked={editService.service_type.includes(option)} // Validación para checkbox
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setEditService((prevService) => ({
                            ...prevService,
                            service_type: checked
                              ? [...prevService.service_type, value]
                              : prevService.service_type.filter((type) => type !== value),
                          }));
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Form.Group>

              {/* Descripción */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Descripción</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={editService.description}
                  onChange={(e) => setEditService({ ...editService, description: e.target.value })}
                />
              </Form.Group>

              {/* Plaga a Controlar */}
              {visiblePestOptions.length > 0 && (
                <Form.Group className="mt-3">
                  <Form.Label style={{ fontWeight: "bold" }}>Plaga a Controlar</Form.Label>
                  <div className="d-flex flex-wrap">
                    {visiblePestOptions.map((pest, index) => (
                      <div key={index} className="col-4 mb-2">
                        <Form.Check
                          type="checkbox"
                          label={<span style={{ fontSize: "0.8rem" }}>{pest}</span>} // Tamaño reducido
                          value={pest}
                          checked={editService.pest_to_control.includes(pest)}
                          onChange={(e) => {
                            const { value, checked } = e.target;
                            setEditService((prevService) => ({
                              ...prevService,
                              pest_to_control: checked
                                ? [...prevService.pest_to_control, value]
                                : prevService.pest_to_control.filter((p) => p !== value),
                            }));
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </Form.Group>
              )}

              {/* Áreas de Intervención */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Áreas de Intervención</Form.Label>
                <div className="d-flex flex-wrap">
                  {interventionAreaOptions.map((area, index) => (
                    <div key={index} className="col-4 mb-2">
                      <Form.Check
                        type="checkbox"
                        label={<span style={{ fontSize: "0.8rem" }}>{area}</span>}
                        value={area}
                        checked={editService.intervention_areas.includes(area)} // Asegura que "Otro" esté marcado
                        onChange={(e) => {
                          const { value, checked } = e.target;
                          setEditService((prevService) => {
                            const updatedInterventionAreas = checked
                              ? [...prevService.intervention_areas, value]
                              : prevService.intervention_areas.filter((a) => a !== value);

                            // Maneja el valor personalizado si "Otro" se selecciona o desmarca
                            if (value === "Otro") {
                              setShowInterventionAreas(checked);
                              return {
                                ...prevService,
                                intervention_areas: updatedInterventionAreas,
                                customInterventionArea: checked ? prevService.customInterventionArea : "", // Limpia si "Otro" se desmarca
                              };
                            }

                            return {
                              ...prevService,
                              intervention_areas: updatedInterventionAreas,
                            };
                          });
                        }}
                      />
                    </div>
                  ))}
                </div>
              </Form.Group>

              {showInterventionAreas && (
                <Form.Group className="mt-3">
                  <Form.Label style={{ fontWeight: "bold" }}>Añadir área de intervención</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="Escribe aquí"
                    value={editService.customInterventionArea || ""}
                    onChange={(e) =>
                      setEditService((prevService) => ({
                        ...prevService,
                        customInterventionArea: e.target.value,
                      }))
                    }
                  />
                </Form.Group>
              )}

              {/* Responsable */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Responsable</Form.Label>
                <Form.Control
                  as="select"
                  name="responsible"
                  value={editService.responsible}
                  onChange={(e) => setEditService({ ...editService, responsible: e.target.value })}
                >
                  <option value="">Seleccione un técnico</option>
                  {technicians.map((technician) => (
                    <option key={technician.id} value={technician.id}>
                      {technician.name}
                    </option>
                  ))}
                </Form.Control>
              </Form.Group>

              {/* Categoría */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Categoría</Form.Label>
                <Form.Control
                  as="select"
                  name="category"
                  value={editService.category}
                  onChange={(e) => {
                    const value = e.target.value;
                    setEditService((prevService) => ({
                      ...prevService,
                      category: value,
                      quantity_per_month: value === "Periódico" ? prevService.quantity_per_month : "",
                    }));
                  }}
                >
                  <option value="">Seleccione una categoría</option>
                  <option value="Puntual">Puntual</option>
                  <option value="Periódico">Periódico</option>
                </Form.Control>
              </Form.Group>

              {/* Cantidad al Mes */}
              {editService.category === "Periódico" && (
                <Form.Group className="mt-3">
                  <Form.Label style={{ fontWeight: "bold" }}>Cantidad al Mes</Form.Label>
                  <Form.Control
                    type="number"
                    value={editService.quantity_per_month || ""}
                    onChange={(e) =>
                      setEditService({ ...editService, quantity_per_month: e.target.value })
                    }
                  />
                </Form.Group>
              )}

              {/* Valor */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Valor</Form.Label>
                <Form.Control
                  type="number"
                  name="value"
                  value={editService.value}
                  onChange={(e) => setEditService({ ...editService, value: e.target.value })}
                />
              </Form.Group>

              {/* Acompañante */}
              <Form.Group className="mt-3">
                <Form.Label style={{ fontWeight: "bold" }}>Acompañante</Form.Label>
                <div className="d-flex flex-wrap">
                  {filteredTechniciansForEdit.map((technician, index) => (
                    <div key={index} className="col-4 mb-2">
                      <Form.Check
                        type="checkbox"
                        label={<span style={{ fontSize: "0.8rem" }}>{technician.name}</span>}
                        value={technician.id}
                        checked={editService.companion.includes(technician.id)}
                        onChange={handleEditCompanionChange}
                      />
                    </div>
                  ))}
                </div>
              </Form.Group>

              {/* Campos Ocultos */}
              <Form.Control
                type="hidden"
                name="created_by"
                value={editService.created_by}
              />
              <Form.Control
                type="hidden"
                name="created_at"
                value={editService.created_at}
              />
            </Form>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={() => handleCloseEditModal()}>
            Cancelar
          </Button>
          <Button variant="success" onClick={handleSaveChanges}>
            Guardar Cambios
          </Button>
        </Modal.Footer>
      </Modal>

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
              <button
                className="btn btn-outline-success d-flex align-items-center w-100"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSchedule(selectedService.id);
                }}
              >
                <Calendar2Check size={18} className="me-2" />
                Agendar Servicio
              </button>
              {/* Detalles del servicio */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <InfoCircle className="me-2" /> Información General
                </h5>
                <div className="d-flex flex-column gap-2">
                  <p className='my-1'><strong>Empresa responsable:</strong> {selectedService.company}</p>
                  <p className='my-1'><strong>ID del Servicio:</strong> {selectedService.id}</p>
                  <p className='my-1'>
                    <strong>Tipo de Servicio:</strong>{" "}
                    {selectedService.service_type
                      .replace(/[\{\}"]/g, "")
                      .split(",")
                      .join(", ")}
                  </p>
                  <p className='my-1'><strong>Categoría:</strong> {selectedService.category}</p>
                  <div className='p-0 m-0 d-flex'>
                    <p className="my-1"><strong>Empresa:</strong> {clientNames[selectedService.client_id] || "Cliente Desconocido"}</p>
                    {selectedService.client_id && (
                      <Building
                        className='ms-2 mt-1'
                        style={{ cursor: "pointer" }}
                        size={22}
                        onClick={(e) => {
                          e.stopPropagation(); // Evita que se activen otros eventos del Card
                          handleShowClientModal(selectedService.client_id);
                        }}
                      />
                    )}
                  </div>
                  <p className='my-1'><strong>Responsable:</strong> {technicians.find((tech) => tech.id === selectedService.responsible)?.name || "No asignado"}</p>
                  {selectedService.companion && selectedService.companion !== "{}" && selectedService.companion !== '{""}' && (
                    <p>
                      <strong>Acompañante(s):</strong>{' '}
                      {(() => {
                        // Convierte la cadena de IDs en un array
                        const companionIds = selectedService.companion
                          .replace(/[\{\}"]/g, '') // Limpia los caracteres `{}`, `"`
                          .split(',')
                          .map((id) => id.trim()); // Divide y recorta espacios
                        // Mapea los IDs a nombres usando el estado `users`
                        const companionNames = companionIds.map((id) => {
                          const tech = technicians.find((tech) => tech.id === id); // Encuentra el usuario por ID
                          return tech ? `${tech.name} ${tech.lastname || ''}`.trim() : `Desconocido (${id})`;
                        });
                        // Devuelve la lista de nombres como texto
                        return companionNames.join(', ');
                      })()}
                    </p>
                  )}
                  {selectedService.category === "Periódico" && (
                    <p><strong>Cantidad al Mes:</strong> {selectedService.quantity_per_month}</p>
                  )}
                  <p><strong>Valor:</strong> {new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(selectedService.value)}</p>
                </div>
              </div>

              {/* Descripción */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <FileText className="me-2" /> Descripción
                </h5>
                <p className="text-muted">{selectedService.description || "No especificada"}</p>
              </div>

              {/* Plagas y Áreas */}
              <div className="d-flex gap-3">
                {/* Plagas */}
                <div className="flex-fill bg-white shadow-sm rounded p-3 w-50">
                  <h5 className="text-secondary mb-3">
                    <Bug className="me-2" /> Plagas
                  </h5>
                  <p>
                    {(() => {
                      const pestMatches = typeof selectedService.pest_to_control === "string"
                        ? selectedService.pest_to_control.match(/"([^"]+)"/g)
                        : null;
                      return pestMatches
                        ? pestMatches.map((item) => item.replace(/"/g, "")).join(", ")
                        : "No especificado";
                    })()}
                  </p>
                </div>

                {/* Áreas */}
                <div className="flex-fill bg-white shadow-sm rounded p-3 w-50">
                  <h5 className="text-secondary mb-3">
                    <GeoAlt className="me-2" /> Áreas de Intervención
                  </h5>
                  <p>
                    {(() => {
                      const areaMatches = typeof selectedService.intervention_areas === "string"
                        ? selectedService.intervention_areas.match(/"([^"]+)"/g)
                        : null;
                      return areaMatches
                        ? areaMatches.map((item) => item.replace(/"/g, "")).join(", ")
                        : "No especificadas";
                    })()}
                  </p>
                </div>
              </div>

              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <Clipboard className="me-2" /> Inspecciones
                </h5>
                {inspections.length > 0 ? (
                  <div className="custom-table-container" style={{ maxHeight: "300px", overflowY: "auto" }}>
                    <table className="custom-table">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Fecha</th>
                          <th>Creado por</th>
                          <th>Inicio</th>
                          <th>Finalización</th>
                          <th>Observaciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inspections
                          .slice() // Clonamos para no mutar el estado original
                          .sort((a, b) => {
                            const dateTimeA = new Date(`${a.date.split('/').reverse().join('-')}T${a.time}`);
                            const dateTimeB = new Date(`${b.date.split('/').reverse().join('-')}T${b.time}`);
                            return dateTimeB - dateTimeA; // Orden descendente (más recientes primero)
                          })
                          .map((inspection) => (
                            <tr key={inspection.id} onClick={() => handleInspectionClick(inspection)}>
                              <td>{inspection.id}</td>
                              <td>{inspection.date}</td>
                              <td>{technicians.find((tech) => tech.id === inspection.created_by)?.name || "No asignado"}</td>
                              <td>{inspection.time}</td>
                              <td>{inspection.exit_time}</td>
                              <td>{inspection.observations}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p>No hay inspecciones registradas.</p>
                )}
              </div>

              {/* Botón para añadir inspección */}
              <div className="text-center">
                <Button variant="outline-success" onClick={handleShowModal}>
                  <PlusCircle className="me-2" />
                  Añadir Inspección
                </Button>
              </div>

              {/* Documentos */}
              <div className="bg-white shadow-sm rounded p-3">
                <h5 className="text-secondary mb-3">
                  <FileEarmarkArrowDown className="me-2" /> Documentos
                </h5>
                {documents.length > 0 ? (
                  <div className="row" style={{ minHeight: 0, height: 'auto' }}>
                    {documents.map((doc, index) => {
                      let Icon;
                      switch (doc.document_type) {
                        case "doc":
                          Icon = <FileEarmarkWord size={40} color="blue" title="Word" />;
                          break;
                        case "xlsx":
                          Icon = <FileEarmarkExcel size={40} color="green" title="Excel" />;
                          break;
                        case "pdf":
                          Icon = <FileEarmarkPdf size={40} color="red" title="PDF" />;
                          break;
                        case "jpg":
                        case "jpeg":
                        case "png":
                          Icon = <FileEarmarkImage size={40} color="orange" title="Imagen" />;
                          break;
                        default:
                          Icon = <FileEarmarkArrowDown size={40} color="gray" title="Archivo" />;
                      }

                      return (
                        <div className="col-6 col-md-3 text-center mb-3" key={index}>
                          <button
                            className="btn p-0"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                            onClick={() => handleDocumentClick(doc)}
                          >
                            {Icon}
                            <div className="mt-2">
                              <small className="text-muted">{doc.document_name}</small>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted">No se encontraron documentos relacionados con este servicio.</p>
                )}
              </div>

              {/* Acciones */}
              <div className="bg-white shadow-sm rounded p-3 mt-4">
                <h5 className="text-secondary mb-3">
                  <GearFill className="me-2" /> Acciones
                </h5>
                {actions.length > 0 ? (
                  <div className="row" style={{ minHeight: 0, height: 'auto' }}>
                    {actions.map((action, index) => {
                      let IconComponent, color;
                      switch (action.action_type) {
                        case "generate_doc":
                          IconComponent = FileEarmarkWord;
                          color = "blue";
                          break;
                        case "generate_xlsm":
                          IconComponent = FileEarmarkExcel;
                          color = "green";
                          break;
                        case "generate_pdf":
                          IconComponent = FileEarmarkPdf;
                          color = "red";
                          break;
                        case "generate_img":
                          IconComponent = FileEarmarkImage;
                          color = "orange";
                          break;
                        case "send_email":
                          IconComponent = EnvelopePaper;
                          color = "black";
                          break;
                        case "send_whatsapp":
                          IconComponent = Whatsapp;
                          color = "green";
                          break;
                        default:
                          IconComponent = Radioactive;
                          color = "gray";
                          break;
                      }

                      return (
                        <div className="col-6 col-md-3 text-center mb-3" key={index}>
                          <button
                            className="btn p-0"
                            style={{ background: "none", border: "none", cursor: "pointer" }}
                            onClick={() =>
                              action.action_type === "generate_pdf" && action.configuration_id === 0
                                ? handleOpenConvertToPdfModal()
                                : handleActionClick(action.configuration_id)
                            }
                          >
                            <IconComponent size={40} color={color} title={action.action_name} />
                            <div className="mt-2">
                              <small className="text-muted">{action.action_name}</small>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-muted">No se encontraron acciones configuradas para este servicio.</p>
                )}
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
        show={notification.show}
        onHide={() => setNotification({ show: false, title: '', message: '' })}
        centered
        backdrop="static"
        keyboard={false}
      >
        <ModalTitle>
          <p className="m-0">{notification.title}</p>
        </ModalTitle>
        <Modal.Body className="text-center">
          <p className="m-0">{notification.message}</p>
        </Modal.Body>
      </Modal>

      <ClientInfoModal
        clientId={selectedClientId}
        show={showClientModal}
        onClose={handleCloseClientModal}
      />

      <Modal show={documentModalOpen} onHide={closeDocumentModal}>
        <Modal.Header closeButton>
          <Modal.Title>Acciones del Documento</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedDocument?.document_type === "pdf" && (
            <Button
              variant="primary"
              className="mb-3 w-100"
              onClick={async () => {
                try {
                  const response = await axios.post(`${process.env.REACT_APP_API_URL}/api/PrefirmarArchivosPDF`, {
                    url: selectedDocument.document_url,
                  });

                  if (response.data.signedUrl) {
                    setPdfUrl(response.data.signedUrl);
                    setShowModalActions(true);
                  } else {
                    showNotification("No se pudo obtener la URL prefirmada.");
                  }
                } catch (error) {
                  console.error("Error al obtener la URL prefirmada:", error);
                  showNotification("Hubo un error al procesar la solicitud.");
                }
              }}
            >
              Ver
            </Button>
          )}
          <Button variant="secondary" className="mb-3 w-100" onClick={handleDownload}>
            Descargar
          </Button>
          <Button variant="warning" className="mb-3 w-100" onClick={handleEditLocal}>
            Actualizar
          </Button>
          {selectedDocument?.document_type === "pdf" && (
            <Button
              variant="success"
              className="mb-3 w-100"
              onClick={async () => {
                try {
                  setLoadingWhatsApp(true);

                  /* 1️⃣  URL firmada (con MIME correcto) */
                  const { data } = await axios.post(`${process.env.REACT_APP_API_URL}/api/PrefirmarArchivosPDF`, {
                    url: selectedDocument.document_url,
                  });
                  const fileUrl = data.signedUrl || selectedDocument.document_url;

                  /* 2️⃣  Descargar y crear File */
                  const blob = await fetch(fileUrl).then((r) => r.blob());
                  const fileName =
                    (selectedDocument.document_name || "Acta_de_servicio").replace(/\s+/g, "_") +
                    ".pdf"; // siempre PDF
                  const file = new File([blob], fileName, { type: "application/pdf" });

                  /* 3️⃣  Intentar compartir el PDF */
                  let shared = false;
                  if (navigator.canShare?.({ files: [file] })) {
                    try {
                      await navigator.share({
                        title: "Acta de servicio",
                        text: `Hola ${clientData.name}, el servicio ha finalizado y por medio del presente compartimos el acta de servicio.`,
                        files: [file],
                      });
                      shared = true;
                      showNotification("Selecciona WhatsApp, elige el contacto y envía.");
                    } catch (shareErr) {
                      // NotAllowedError → cancelado/denegado
                      showNotification(
                        `⚠️ Compartir cancelado o denegado (${shareErr.name}).`
                      );
                    }
                  } else {
                    showNotification(
                      "❌ Este dispositivo o navegador no admite compartir archivos."
                    );
                  }

                  /* 4️⃣  Fallback: abrir chat WhatsApp sin archivo ni URL */
                  if (!shared) {
                    const phone = `57${clientData.phone.replace(/\D/g, "")}`;
                    const text = encodeURIComponent(
                      `Hola ${clientData.name}, el servicio ha finalizado y por medio del presente compartimos el acta de servicio.`
                    );
                    const waUrl = isMobile
                      ? `whatsapp://send?phone=${phone}&text=${text}`
                      : `https://web.whatsapp.com/send?phone=${phone}&text=${text}`;
                    window.open(waUrl, "_blank", "noopener,noreferrer");
                    showNotification(
                      "Se abrió WhatsApp con el mensaje preparado. Adjunta el PDF manualmente."
                    );
                  }
                } catch (err) {
                  const msg =
                    err?.name && err?.message ? `${err.name}: ${err.message}` : String(err);
                  showNotification(`❌ Error al compartir: ${msg}`);
                  console.error("Error al compartir documento:", err);
                } finally {
                  setLoadingWhatsApp(false);
                }
              }}
            >
              {loadingWhatsApp ? (
                <>
                  <span
                    className="spinner-border spinner-border-sm me-2"
                    role="status"
                    aria-hidden="true"
                    style={{ width: "1rem", height: "1rem" }}
                  />
                  Preparando…
                </>
              ) : (
                "Compartir por WhatsApp"
              )}
            </Button>
          )}
          <Button
            variant="info"
            className="mb-3 w-100"
            onClick={async () => {
              try {
                setLoadingCorreo(true);

                /* ─── 1. Construir payload ─────────────────────────── */
                const payload = {
                  nombre: clientData?.name,
                  telefono: `57${clientData?.phone}`,
                  correo: clientData?.email,
                  documento: selectedDocument.document_url,
                  nombreDocumento: selectedDocument?.document_name || "Acta de servicio",
                };

                /* ─── 2. Elegir la ruta según la empresa ───────────── */
                /***
                 *  Asumimos que la empresa del servicio está en:
                 *    selectedService.company   → "Fumiplagax" | "Control" | otro
                 *  Ajusta la fuente si tu objeto se llama diferente.
                 */
                const company = (selectedService?.company || "").toLowerCase();
                let endpoint = `${process.env.REACT_APP_API_URL}/api/enviar-acta-por-correo-otro`;               // valor por defecto

                if (company === "fumiplagax") {
                  endpoint = `${process.env.REACT_APP_API_URL}/api/enviar-acta-por-correo`;
                } else if (company === "control") {
                  endpoint = `${process.env.REACT_APP_API_URL}/api/enviar-acta-por-correo-control`;
                }

                /* ─── 3. Enviar solicitud ───────────────────────────── */
                const sendResponse = await axios.post(endpoint, payload);

                if (sendResponse.data.success) {
                  showNotification("📧 Documento enviado por correo exitosamente.");
                } else {
                  showNotification("❌ Error al enviar el documento por correo.");
                }

              } catch (error) {
                console.error("❌ Error al enviar documento por correo:", error);
                showNotification("Hubo un error al enviar el documento por correo.");
              } finally {
                setLoadingCorreo(false);
              }
            }}
          >
            {loadingCorreo ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                  style={{ width: "1rem", height: "1rem" }}
                />
                Enviando…
              </>
            ) : (
              "Enviar por Correo"
            )}
          </Button>
        </Modal.Body>
      </Modal>

      <Modal
        show={convertToPdfModalOpen}
        onHide={handleCloseConvertToPdfModal}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Convertir Documento a PDF</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <p>Selecciona un documento en formato DOC para convertirlo a PDF:</p>
          <ul className="list-group">
            {documents
              .filter((doc) => doc.document_type === "doc")
              .map((doc) => (
                <li
                  key={doc.id}
                  className={`list-group-item ${selectedDocForPdf?.id === doc.id ? "active" : ""
                    }`}
                  onClick={() => setSelectedDocForPdf(doc)}
                  style={{ cursor: "pointer" }}
                >
                  {doc.document_name}
                </li>
              ))}
          </ul>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="dark" onClick={handleCloseConvertToPdfModal}>
            Cancelar
          </Button>
          <Button
            variant="success"
            onClick={handleConvertToPdf}
            disabled={!selectedDocForPdf || loadingConvertToPdf} // Deshabilitado si está cargando
          >
            {loadingConvertToPdf ? (
              <>
                <span
                  className="spinner-border spinner-border-sm me-2"
                  role="status"
                  aria-hidden="true"
                ></span>
                Convirtiendo...
              </>
            ) : (
              "Convertir a PDF"
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showModalActions}
        onHide={() => setShowModalActions(false)}
        size="xl"
        centered
      >
        <Modal.Body
          style={{
            height: "100vh",
            overflow: "hidden",
            padding: 0, // opcional: elimina padding si no lo necesitas
          }}>
          {pdfUrl && (
            <iframe
              src={pdfUrl}
              title="Vista previa PDF"
              width="100%"
              height="100%"
              style={{ border: "none" }}
            ></iframe>
          )}
        </Modal.Body>
      </Modal>

      {isExecuting && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            zIndex: 2050,
            width: "100vw",
            height: "100vh",
            backgroundColor: "rgba(255, 255, 255, 0.7)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <div className="spinner-border text-secondary" role="status" style={{ width: "5rem", height: "5rem" }}>
            <span className="visually-hidden">Cargando...</span>
          </div>
        </div>
      )}

    </div>

  );
}
export default ServiceList;