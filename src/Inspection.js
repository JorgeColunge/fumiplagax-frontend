import React, { useEffect, useState, useRef, useMemo } from 'react';
import { useParams, useLocation } from 'react-router-dom';
import { useNavigate } from 'react-router-dom';
import { Button, Table, InputGroup, FormControl, Modal, Form } from 'react-bootstrap';
import api from './Api'; // Usa el archivo de API con lógica offline integrada
import { saveRequest, isOffline } from './offlineHandler';
import { initUsersDB, saveUsers, getUsers, getInspectionById, saveInspections, saveProducts, getProducts, getServiceById, getClientById, getStationsByClient, saveStations } from './indexedDBHandler';
import SignatureCanvas from 'react-signature-canvas';
import "./Inspection.css";
import { ArrowDownSquare, ArrowUpSquare, Eye, FileEarmarkArrowDown, FileEarmarkPlus, EnvelopePaper, Whatsapp, Radioactive, FileEarmarkExcel, FileEarmarkImage, FileEarmarkPdf, FileEarmarkWord, PencilSquare, QrCodeScan, XCircle } from 'react-bootstrap-icons';
import { useUnsavedChanges } from './UnsavedChangesContext'
import QrScannerComponent from './QrScannerComponent';
import moment from 'moment';
import { useSocket } from './SocketContext';
import { isMobile } from "react-device-detect";

function Inspection() {
  const storedUserInfo = JSON.parse(localStorage.getItem("user_info"));
  const userRol = storedUserInfo?.rol || '';
  const { inspectionId } = useParams();
  const [inspectionData, setInspectionData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [generalObservations, setGeneralObservations] = useState('');
  const [generalObservationsClient, setGeneralObservationsClient] = useState('');
  const [findingsByType, setFindingsByType] = useState({});
  const [productsByType, setProductsByType] = useState({});
  const [availableProducts, setAvailableProducts] = useState([]);
  const [stations, setStations] = useState([]); // Estado para estaciones
  const [clientStations, setClientStations] = useState({}); // Estado para hallazgos en estaciones
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [currentStationId, setCurrentStationId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [stationFinding, setStationFinding] = useState({
    category: 'Roedores',
    purpose: 'Consumo',
    consumptionAmount: 1,
    captureQuantity: '',
    marked: 'Si',
    physicalState: 'Buena',
    damageLocation: '',
    requiresChange: 'No',
    changePriority: 'No',
    doseConsumed: 0,
    doseReplaced: 0,
    consumerType: '',             // ← Nuevo: quién consumió
    otherConsumer: '',            // ← Nuevo: cuál otro
    replacementProduct: '',       // ← Nuevo: producto de reposición
    replacementAmount: '',        // ← Nuevo: cantidad en cebos
    activity: 'Cambio de producto', // ← Nuevo: actividad realizada
    description: '',
    photo: null,
    photoBlob: null
  });
  const [stationModalOpenDesinsectacion, setStationModalOpenDesinsectacion] = useState(false);
  const [currentStationIdDesinsectacion, setCurrentStationIdDesinsectacion] = useState(null);
  const [stationFindingDesinsectacion, setStationFindingDesinsectacion] = useState({
    category: 'Aéreas',
    captureQuantity: '',
    physicalState: 'Buena', // Default: Buena
    damageLocation: '',
    requiresChange: 'No', // Default: No
    changePriority: 'No', // Default: No
    description: '',
    photo: null,
  });
  const [collapseStates, setCollapseStates] = useState({});
  const [isMobile, setIsMobile] = useState(false);
  const [viewStationModalOpen, setViewStationModalOpen] = useState(false);
  const [actions, setActions] = useState([]);
  const [viewStationData, setViewStationData] = useState({});
  const [stationType, setStationType] = useState(null); // 'Desratización' o 'Desinsectación'
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [techSignaturePreview, setTechSignaturePreview] = useState(null);
  const [clientSignaturePreview, setClientSignaturePreview] = useState(null);
  const [techSignature, setTechSignature] = useState(null);
  const [clientSignature, setClientSignature] = useState(null);
  const [signData, setSignData] = useState({
    name: '',
    id: '',
    position: '',
  });
  const [serviceData, setServiceData] = useState(null);
  const sigCanvasTech = useRef();
  const sigCanvasClient = useRef();
  const location = useLocation();
  const { setHasUnsavedChanges, setUnsavedRoute } = useUnsavedChanges();
  const [notification, setNotification] = useState({ show: false, message: '' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, type: null, index: null });
  const [searchTermDesratizacion, setSearchTermDesratizacion] = useState('');
  const [searchTermDesinsectacion, setSearchTermDesinsectacion] = useState('');
  const [qrScannerOpen, setQrScannerOpen] = useState(false);
  const [currentQrStationType, setCurrentQrStationType] = useState(null);
  const [selectedDocument, setSelectedDocument] = useState(null);
  const [documentModalOpen, setDocumentModalOpen] = useState(false);
  const [loadingGoogleDrive, setLoadingGoogleDrive] = useState(false);
  const [convertToPdfModalOpen, setConvertToPdfModalOpen] = useState(false);
  const [selectedDocForPdf, setSelectedDocForPdf] = useState(null);
  const [loadingConvertToPdf, setLoadingConvertToPdf] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [clientData, setClientData] = useState(null);
  const [loadingWhatsApp, setLoadingWhatsApp] = useState(false);
  const [loadingCorreo, setLoadingCorreo] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [pdfUrl, setPdfUrl] = useState(null);
  const navigate = useNavigate();

  const socket = useSocket(); // Obtenemos el socket

  useEffect(() => {
    if (socket) {
      socket.on("inspection_synced", ({ oldId, newId }) => {
        console.log(`🔄 La inspección ${oldId} ha sido actualizada a ${newId}`);

        if (inspectionId === oldId) {
          console.log(`✅ Actualizando ID de la inspección actual: ${oldId} → ${newId}`);

          // Actualizamos la URL sin recargar la página
          navigate(`/inspection/${newId}`, { replace: true });

          // Actualizamos el estado para reflejar el nuevo ID
          setInspectionData((prevData) => ({
            ...prevData,
            id: newId, // Reemplazamos el ID viejo con el nuevo
          }));

          // Reemplazamos en los hallazgos y firmas si es necesario
          setFindingsByType((prevFindings) => {
            const updatedFindings = { ...prevFindings };
            for (const type in updatedFindings) {
              updatedFindings[type] = updatedFindings[type].map(finding =>
                finding.inspection_id === oldId ? { ...finding, inspection_id: newId } : finding
              );
            }
            return updatedFindings;
          });

          setClientStations((prevStations) => {
            const updatedStations = { ...prevStations };
            for (const stationId in updatedStations) {
              if (updatedStations[stationId].inspection_id === oldId) {
                updatedStations[stationId].inspection_id = newId;
              }
            }
            return updatedStations;
          });

          setActions((prevActions) =>
            prevActions.map((action) =>
              action.inspection_id === oldId ? { ...action, inspection_id: newId } : action
            )
          );
        }
      });

      return () => {
        socket.off("inspection_synced");
      };
    }
  }, [socket, inspectionId, navigate]);

  useEffect(() => {
    const selectedProduct = getFilteredProducts('Desratización').find(p => p.name === stationFinding.product);
    const replacementProduct = getFilteredProducts('Desratización').find(p => p.name === stationFinding.replacementProduct);

    const dose = selectedProduct?.dose || 0;
    const replacementDose = replacementProduct?.dose || 0;

    const doseConsumed = dose * (parseFloat(stationFinding.consumptionAmount) || 0);
    const doseReplaced = replacementDose * (parseFloat(stationFinding.replacementAmount) || 0);

    setStationFinding(prev => ({
      ...prev,
      doseConsumed,
      doseReplaced,
    }));
  }, [
    stationFinding.product,
    stationFinding.replacementProduct,
    stationFinding.consumptionAmount,
    stationFinding.replacementAmount,
  ]);

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
      const response = await api.post("/convert-to-pdf", {
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


  const handleView = async () => {
    if (!selectedDocument.document_url) {
      console.error("La URL del documento no está configurada.");
      alert("No se ha seleccionado un documento válido.");
      return;
    }

    try {
      const response = await api.post('/PrefirmarArchivos', { url: selectedDocument.document_url });
      if (response.data.signedUrl) {
        const preSignedUrl = response.data.signedUrl;
        navigate(`/view-document?url=${encodeURIComponent(preSignedUrl)}`);
      } else {
        alert('No se pudo obtener la URL prefirmada.');
      }
    } catch (error) {
      console.error('Error al obtener la URL prefirmada para ver:', error);
      alert('Hubo un error al procesar la solicitud.');
    }
  };


  const handleDownload = async () => {
    try {
      const response = await api.post('/PrefirmarArchivos', { url: selectedDocument.document_url });
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

      const response = await api.post("/PrefirmarArchivos", { url: selectedDocument.document_url });
      console.log("Respuesta de pre-firmado:", response.data);

      if (response.data.signedUrl) {
        const preSignedUrl = response.data.signedUrl;
        console.log("URL prefirmada obtenida:", preSignedUrl);

        console.log("Enviando solicitud para editar en Google Drive...");
        const googleDriveResponse = await api.post("/edit-googledrive", { s3Url: preSignedUrl });
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

  const handleDocumentClick = (documentUrl) => {
    setSelectedDocument(documentUrl);
    setDocumentModalOpen(true);
  };

  const closeDocumentModal = () => {
    setSelectedDocument(null);
    setDocumentModalOpen(false);
  };

  console.log("user rol", userRol);

  const showNotification = (message) => {
    setNotification({ show: true, message });
    setTimeout(() => setNotification({ show: false, message: '' }), 1500); // Cerrar después de 1.5 segundos
  };

  const handleClearTechSignature = () => {
    sigCanvasTech.current.clear();
    setTechSignature(null);
  };

  const handleClearClientSignature = () => {
    sigCanvasClient.current.clear();
    setClientSignature(null);
  };

  const handleSaveSignature = async () => {
    if (sigCanvasTech.current) {
      // Generar la imagen en formato Blob para enviar al backend
      sigCanvasTech.current.getTrimmedCanvas().toBlob((blob) => {
        setTechSignature(blob); // Guardar como Blob
      });
      // Generar la imagen en formato base64 para previsualización
      const dataURL = sigCanvasTech.current.getTrimmedCanvas().toDataURL();
      setTechSignaturePreview(dataURL); // Guardar la previsualización
    }
    if (sigCanvasClient.current) {
      // Generar la imagen en formato Blob para enviar al backend
      sigCanvasClient.current.getTrimmedCanvas().toBlob((blob) => {
        setClientSignature(blob); // Guardar como Blob
      });
      // Generar la imagen en formato base64 para previsualización
      const dataURL = sigCanvasClient.current.getTrimmedCanvas().toDataURL();
      setClientSignaturePreview(dataURL); // Guardar la previsualización
    }
  };


  const handleSignModalCancel = () => {
    setSignModalOpen(false);
    setTechSignature(null);
    setClientSignature(null);
    setSignData({ name: "", id: "", position: "" });
  };

  const handleSignModalClose = () => {
    setSignModalOpen(false);
  };


  const handleSignDataChange = (field, value) => {
    setSignData((prevData) => ({
      ...prevData,
      [field]: value,
    }));
    // Marcar cambios detectados
    setHasUnsavedChanges(true);
    setUnsavedRoute(location.pathname);
  };

  useEffect(() => {
    const preSignUrl = async (url) => {
      try {
        console.log(`Intentando pre-firmar la URL: ${url}`); // Log de inicio
        const response = await api.post('/PrefirmarArchivos', { url });
        console.log(`URL pre-firmada con éxito: ${response.data.signedUrl}`); // Log de éxito
        return response.data.signedUrl;
      } catch (error) {
        console.error(`Error al pre-firmar la URL: ${url}`, error); // Log de error
        return null; // Retorna null si hay un error
      }
    };

    const fetchInspectionData = async () => {
      try {
        console.log('🔍 Verificando modo de conexión...');

        let inspectionData;

        if (isOffline()) {
          console.log('📴 Modo offline activado. Consultando IndexedDB...');
          inspectionData = await getInspectionById(inspectionId);

          if (!inspectionData) {
            console.warn(`⚠️ Inspección ${inspectionId} no encontrada en IndexedDB.`);
            return setLoading(false);
          }

          console.log('✅ Inspección cargada desde IndexedDB:', inspectionData);

          // 🔥 Convertir `inspection_type` de array a string separado por comas
          if (Array.isArray(inspectionData.inspection_type)) {
            inspectionData.inspection_type = inspectionData.inspection_type.join(", ");
          }
        } else {
          console.log('🌐 Modo online. Consultando API...');
          const response = await api.get(`${process.env.REACT_APP_API_URL}/api/inspections/${inspectionId}`);
          inspectionData = response.data;

          console.log('✅ Inspección obtenida desde API:', inspectionData);

          // Guardar en IndexedDB para acceso offline en el futuro
          await saveInspections({ [inspectionData.service_id]: [inspectionData] });
          console.log('📥 Inspección almacenada en IndexedDB.');
        }

        setInspectionData(inspectionData);

        // Cargar observaciones generales
        setGeneralObservations(inspectionData.observations || '');

        // Procesar hallazgos
        const initialFindings = inspectionData.findings?.findingsByType || {};
        for (const type of Object.keys(initialFindings)) {
          initialFindings[type] = await Promise.all(
            initialFindings[type].map(async (finding) => {
              if (!finding.photo) return { ...finding, photo: null, photoRelative: null, photoBlob: null };

              let signedUrl = null;
              try {
                signedUrl = await preSignUrl(finding.photo);
              } catch (error) {
                console.error(`❌ Error al pre-firmar la URL del hallazgo ${finding.id}:`, error);
              }

              return { ...finding, photo: signedUrl, photoRelative: finding.photo || null, photoBlob: null };
            })
          );
        }
        setFindingsByType(initialFindings);

        setProductsByType(inspectionData.findings?.productsByType || {});

        // Cargar firmas y pre-firmar URLs
        const signatures = inspectionData.findings?.signatures || {};
        if (signatures.technician?.signature) {
          setTechSignaturePreview(await preSignUrl(signatures.technician.signature) || signatures.technician.signature);
        }
        if (signatures.client?.signature) {
          setClientSignaturePreview(await preSignUrl(signatures.client.signature) || signatures.client.signature);
        }

        // Cargar datos del cliente
        if (signatures.client) {
          setSignData({
            name: signatures.client.name || '',
            id: signatures.client.id || '',
            position: signatures.client.position || '',
          });
        }

        // Procesar hallazgos en estaciones
        const clientStationsData = {};
        for (const finding of inspectionData.findings?.stationsFindings || []) {
          try {
            const signedUrl = finding.photo ? await preSignUrl(finding.photo) : null;
            if (!finding.stationId) continue;

            clientStationsData[finding.stationId] = { ...finding, photo: signedUrl, photoRelative: finding.photo || null, photoBlob: null };
          } catch (error) {
            console.error(`❌ Error procesando hallazgo en estación ${finding.stationId}:`, error);
          }
        }
        setClientStations(clientStationsData);

        /* ---------- Cargar estaciones relacionadas ---------- */
        if (inspectionData.service_id) {
          let clientId, stationsArr = [];

          if (isOffline()) {
            /* 📴 OFFLINE: todo sale de IndexedDB */
            const service = await getServiceById(inspectionData.service_id);
            clientId = service?.client_id;

            if (clientId) {
              const client = await getClientById(clientId);
              setClientData(client);                  // <– info básica del cliente

              stationsArr = await getStationsByClient(clientId);
              console.log(`📂 ${stationsArr.length} estaciones offline cargadas`);
            }
          } else {
            /* 🌐 ONLINE: peticiones a la API + cache local */
            const { data: service } = await api.get(
              `${process.env.REACT_APP_API_URL}/api/services/${inspectionData.service_id}`
            );
            clientId = service.client_id;
            setServiceData(service);

            const { data: client } = await api.get(`${process.env.REACT_APP_API_URL}/api/clients/${clientId}`);
            setClientData(client);

            const { data: stations } = await api.get(
              `${process.env.REACT_APP_API_URL}/api/stations/client/${clientId}`
            );
            stationsArr = stations;

            /* guarda las estaciones para uso offline futuro */
            await saveStations(clientId, stationsArr);
          }

          setStations(stationsArr);
        }

        // Cargar productos disponibles
        try {
          if (isOffline()) {
            console.log('📴 Offline: leyendo productos desde IndexedDB...');
            const offlineProducts = await getProducts();
            setAvailableProducts(offlineProducts);
          } else {
            console.log('🌐 Online: descargando productos...');
            const { data: productsFromServer } = await api.get(`${process.env.REACT_APP_API_URL}/api/products`);
            setAvailableProducts(productsFromServer);

            // Cachear para el futuro
            await saveProducts(productsFromServer);
          }
        } catch (prodErr) {
          console.error('❌ Error al cargar productos:', prodErr);
          setAvailableProducts([]);               // evita crashes de UI
        }

        setLoading(false);
        console.log('✅ Carga de datos de inspección completada.');
      } catch (error) {
        console.error('❌ Error al cargar los datos de inspección:', error);
        setLoading(false);
      }
    };

    const fetchActions = async () => {
      try {
        const response = await api.get(`${process.env.REACT_APP_API_URL}/api/actions-inspections`, {
          params: { inspection_id: inspectionId }, // Consulta con el ID de inspección
        });
        setActions(response.data.actions || []); // Asume que el backend devuelve un array de acciones
      } catch (error) {
        console.error('Error fetching actions:', error);
      }
    };

    fetchDocuments();
    fetchActions();

    fetchInspectionData();
  }, []);

  useEffect(() => {
    const fetchProcedures = async () => {
      try {
        console.log('📄 Consultando procedimientos desde el backend...');

        const response = await api.get(`${process.env.REACT_APP_API_URL}/api/procedures`);
        const procedures = response.data;

        console.log('✅ Procedimientos cargados:', procedures);
        setProcedures(procedures); // Asegúrate de tener este estado definido con `useState`
      } catch (error) {
        console.error('❌ Error al consultar los procedimientos:', error);
      }
    };

    fetchProcedures();
  }, []);

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`${process.env.REACT_APP_API_URL}/api/get-documents`, {
        params: { entity_type: 'inspections', entity_id: inspectionId },
      });
      setDocuments(response.data.documents || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  };

  const handleQrScan = (scannedValue) => {
    console.log("Valor recibido del escáner QR:", scannedValue);
    const normalizedValue = scannedValue.toLowerCase();

    if (currentQrStationType === "Desratización") {
      setSearchTermDesratizacion(normalizedValue);
      console.log("Estado de búsqueda actualizado (Desratización):", normalizedValue);
    } else if (currentQrStationType === "Desinsectación") {
      setSearchTermDesinsectacion(normalizedValue);
      console.log("Estado de búsqueda actualizado (Desinsectación):", normalizedValue);
    }

    setQrScannerOpen(false); // Cierra el modal
  };

  const handleOpenQrScanner = (type) => {
    setCurrentQrStationType(type); // Define el tipo antes de abrir el escáner
    setQrScannerOpen(true); // Abre el modal de escáner QR
  };

  useEffect(() => {
    return () => {
      if (stationFinding.photo) {
        URL.revokeObjectURL(stationFinding.photo);
      }
      if (stationFindingDesinsectacion.photo) {
        URL.revokeObjectURL(stationFindingDesinsectacion.photo);
      }
    };
  }, [stationFinding.photo, stationFindingDesinsectacion.photo]);

  useEffect(() => {
    // Detectar si el dispositivo es móvil
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768); // Ancho típico para dispositivos móviles
    };

    // Escuchar cambios en el tamaño de la ventana
    window.addEventListener('resize', handleResize);

    // Ejecutar al montar el componente
    handleResize();

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const detectChanges = () => {
    const changes = {
      generalObservations: generalObservations !== inspectionData?.observations,
      findingsByType: JSON.stringify(findingsByType) !== JSON.stringify(inspectionData?.findings?.findingsByType),
      productsByType: JSON.stringify(productsByType) !== JSON.stringify(inspectionData?.findings?.productsByType),
      stationsFindings: JSON.stringify(clientStations) !== JSON.stringify(
        inspectionData?.findings?.stationsFindings.reduce((acc, finding) => {
          acc[finding.stationId] = finding;
          return acc;
        }, {})
      ),
    };

    console.log('Cambios detectados:', changes);
    return Object.values(changes).some((change) => change); // Retorna true si hay algún cambio
  };

  const handleSaveChanges = async () => {
    if (isExecuting) return;
    setIsExecuting(true);
    try {
      const formData = new FormData();

      // Información básica
      formData.append("inspectionId", inspectionId);
      formData.append("generalObservations", generalObservations);

      // Incluir el ID del usuario explícitamente
      formData.append("userId", storedUserInfo?.id_usuario || null);
      formData.append("exitTime", moment().format("HH:mm"));

      // Procesar findingsByType
      const findingsByTypeProcessed = {};
      Object.keys(findingsByType).forEach((type) => {
        findingsByTypeProcessed[type] = findingsByType[type].map((finding) => {
          const base = {
            id: finding.id,
            faseLavado: finding.faseLavado || null,
            date: finding.date || getFormattedDateWithSlashes(),
            time: finding.time || new Date().toLocaleTimeString('es-CO', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
            }).replace(/\u00A0/g, ' '),
          };

          const photoUrl = finding.photoBlob ? null : finding.photoRelative || null;

          switch (finding.faseLavado) {
            case "Antes":
              return {
                ...base,
                placeAn: finding.place || '',
                descriptionAn: finding.description || '',
                photoAn: photoUrl,
              };
            case "Durante":
              return {
                ...base,
                placeDu: finding.place || '',
                descriptionDu: finding.description || '',
                photoDu: photoUrl,
              };
            case "Después":
              return {
                ...base,
                placeDe: finding.place || '',
                descriptionDe: finding.description || '',
                photoDe: photoUrl,
              };
            default:
              return {
                ...base,
                place: finding.place || '',
                description: finding.description || '',
                photo: photoUrl,
              };
          }
        });
      });

      formData.append("findingsByType", JSON.stringify(findingsByTypeProcessed));

      // Procesar productsByType con ID
      const productsByTypeProcessed = {};
      Object.keys(productsByType).forEach((type) => {
        const productData = productsByType[type];
        const baseType = type.replace(/[0-9]+$/, ''); // ← extrae solo el tipo
        const procedureMatch = procedures.find(proc => proc.category === baseType);
        if (productData) {
          productsByTypeProcessed[type] = {
            id: productData.id || null, // Incluir el ID
            product: productData.product || '',
            dosage: productData.dosage || '',
            activeIngredient: productData.active_ingredient || '',
            batch: productData.batch || '',
            unity: productData.unity || 'No especificado', // Evita valores nulos
            category: productData.category || 'No especificado',
            residualDuration: productData.residual_duration || 'No especificado',
            expirationDate: productData.expiration_date || 'No especificado',
            tipo: baseType,
            process: procedureMatch?.application ? JSON.parse(procedureMatch.application).join(', ') : 'No especificado',

          };
        }
      });

      formData.append("productsByType", JSON.stringify(productsByTypeProcessed));

      // Procesar stationsFindings
      const stationsFindingsArray = Object.entries(clientStations).map(([stationId, finding]) => ({
        ...finding,
        stationId,
        photo: finding.photoBlob ? null : finding.photoRelative, // Enviar la URL relativa si no hay nueva imagen
      }));

      formData.append("stationsFindings", JSON.stringify(stationsFindingsArray));

      // Ajuste en las firmas: eliminar el prefijo completo si existe
      const removePrefix = (url) => {
        const prefix = "";
        return url && url.startsWith(prefix) ? url.replace(prefix, "") : url;
      };

      // Construir el objeto signatures
      const signatures = {
        client: {
          id: signData.id,
          name: signData.name,
          position: signData.position,
          signature: clientSignature instanceof Blob ? null : removePrefix(clientSignaturePreview), // Usar la URL si no hay nueva firma
        },
        technician: {
          id: storedUserInfo?.id_usuario || null,
          name: `${storedUserInfo?.name || ""} ${storedUserInfo?.lastname || ""}`.trim(),
          role: userRol || "No disponible",
          signature: techSignature instanceof Blob ? null : removePrefix(techSignaturePreview), // Usar la URL si no hay nueva firma
        },
      };

      formData.append("signatures", JSON.stringify(signatures));

      // Agregar imágenes como campos separados
      if (techSignature instanceof Blob) {
        formData.append("tech_signature", techSignature, "tech_signature.jpg");
      }
      if (clientSignature instanceof Blob) {
        formData.append("client_signature", clientSignature, "client_signature.jpg");
      }

      // Agregar imágenes de findings
      Object.keys(findingsByType).forEach((type) => {
        findingsByType[type].forEach((finding) => {
          if (finding.photoBlob) {
            formData.append("findingsImages", finding.photoBlob, `${finding.id}.jpg`);
          }
        });
      });

      // Agregar imágenes de stationsFindings
      stationsFindingsArray.forEach((finding) => {
        if (finding.photoBlob) {
          formData.append("stationImages", finding.photoBlob, `${finding.stationId}.jpg`);
        }
      });

      // Enviar datos al backend
      await api.post(`/inspections/${inspectionId}/save`, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      showNotification("Cambios guardados exitosamente.");

      // Resetear el estado de cambios no guardados
      setHasUnsavedChanges(false);
      setUnsavedRoute(null); // Opcional: Resetear la ruta de cambios
    } catch (error) {
      console.error("Error guardando los cambios:", error);

      if (error.message.includes("Offline")) {
        showNotification(
          "Cambios guardados localmente. Se sincronizarán automáticamente cuando vuelva la conexión."
        );
      } else {
        showNotification("Hubo un error al guardar los cambios.");
      }
    } finally {
      setIsExecuting(false);
    }
  };

  const dataURLtoBlob = (dataURL) => {
    const byteString = atob(dataURL.split(',')[1]);
    const mimeString = dataURL.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  };

  const handleStationChange = (stationId, field, value) => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [stationId]: { ...prevStations[stationId], [field]: value },
    }));
  };

  const handleAddFinding = (type) => {
    const newFindingId = Date.now(); // ID único basado en el timestamp
    const newFindingKey = `${type}-${newFindingId}`; // Clave única para el hallazgo

    setFindingsByType((prevFindings) => {
      const now = new Date();
      const dateFinding = getFormattedDateWithSlashes();
      const timeFinding = now.toLocaleTimeString('es-CO', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).replace(/\u00A0/g, ' ');

      return {
        ...prevFindings,
        [type]: [
          ...(prevFindings[type] || []),
          {
            id: newFindingId,
            place: '',
            description: '',
            photo: null,
            faseLavado: null,
            date: dateFinding,
            time: timeFinding,
          },
        ],
      };
    });

    // Actualizar los estados de colapso para expandir el nuevo hallazgo
    setCollapseStates((prevStates) => ({
      ...prevStates,
      [newFindingKey]: true, // Expandir el nuevo hallazgo
    }));
  };

  const handleFindingChange = (type, index, field, value) => {
    setFindingsByType((prevFindings) => {
      const updatedFindings = [...prevFindings[type]];
      updatedFindings[index] = { ...updatedFindings[index], [field]: value };
      // Marcar cambios detectados
      setHasUnsavedChanges(true);
      setUnsavedRoute(location.pathname);
      return { ...prevFindings, [type]: updatedFindings };
    });
  };

  const handleFindingPhotoChange = (type, index, file) => {
    if (!file || !file.type.startsWith('image/')) {
      showNotification('Seleccione un archivo válido de tipo imagen.');
      return;
    }

    const photoURL = URL.createObjectURL(file);

    setFindingsByType((prevFindings) => {
      const updatedFindings = [...prevFindings[type]];
      updatedFindings[index] = {
        ...updatedFindings[index],
        photo: photoURL, // Nueva URL para previsualización
        photoBlob: file, // Nuevo archivo seleccionado
      };
      // Marcar cambios detectados
      setHasUnsavedChanges(true);
      setUnsavedRoute(location.pathname);
      return { ...prevFindings, [type]: updatedFindings };
    });
  };

  const handleProductChange = (type, field, value) => {
    setProductsByType((prevProducts) => {
      const updatedProduct = { ...prevProducts[type] };
      const baseType = type.replace(/[0-9]+$/, '');
      const procedureMatch = procedures.find(proc => proc.category === baseType);

      if (field === 'product') {
        const selectedProduct = availableProducts.find((product) => product.name === value);

        updatedProduct.product = value;
        updatedProduct.id = selectedProduct?.id || null;
        updatedProduct.active_ingredient = selectedProduct?.active_ingredient || '';
        updatedProduct.batch = selectedProduct?.batch || '';
        updatedProduct.dosage = selectedProduct?.dosage || '';
        updatedProduct.expiration_date = selectedProduct?.expiration_date || 'No especificado';
        updatedProduct.unity = selectedProduct?.unity || 'No especificado';
        updatedProduct.category = selectedProduct?.category || 'No especificado';
        updatedProduct.residual_duration = selectedProduct?.residual_duration || 'No especificado';
        updatedProduct.tipo = baseType;
        updatedProduct.process = procedureMatch?.application ? JSON.parse(procedureMatch.application).join(', ') : 'No especificado'; // ✅ Aplicación del formato legible
      } else {
        updatedProduct[field] = value;
      }

      return {
        ...prevProducts,
        [type]: updatedProduct,
      };
    });

    // Marcar cambios detectados
    setHasUnsavedChanges(true);
    setUnsavedRoute(location.pathname);
  };

  const getFilteredProducts = (type) => {
    if (!availableProducts || !type) {
      console.log("No hay productos disponibles o el tipo de inspección está vacío.");
      return [];
    }

    console.log("Filtrando productos para el tipo de inspección:", type);
    console.log("Productos disponibles antes del filtrado:", availableProducts);

    return availableProducts.filter((product) => {
      console.log("Evaluando producto:", product);

      if (!product.category) {
        console.warn(
          `Producto omitido (${product.name}) porque no tiene categoría definida.`,
          product
        );
        return false; // Omitimos productos sin categoría
      }

      try {
        // Convertir la categoría a string si es un array u objeto
        let categoryStr = Array.isArray(product.category)
          ? product.category.join(", ") // Convierte array en string separado por comas
          : typeof product.category === "string"
            ? product.category
            : JSON.stringify(product.category); // Convierte objeto a string si es necesario

        // Limpiar las categorías, eliminar corchetes y dividir en un array
        const cleanedCategory = categoryStr
          .replace(/[\{\}\[\]"]/g, "") // Elimina `{`, `}`, `[`, `]`, y comillas
          .split(",")
          .map((cat) => cat.trim().toLowerCase()); // Convierte a minúsculas para comparación

        console.log(
          `Categorías procesadas del producto (${product.name}):`,
          cleanedCategory
        );

        // Verificar si alguna categoría coincide con el tipo de inspección
        const match = cleanedCategory.some((category) => {
          const isMatch = category === type.toLowerCase();
          console.log(
            `Comparando categoría (${category}) con tipo (${type.toLowerCase()}):`,
            isMatch ? "Coincide" : "No coincide"
          );
          return isMatch;
        });

        console.log(
          `Resultado del filtrado para el producto (${product.name}):`,
          match ? "Incluido" : "Excluido"
        );

        return match;
      } catch (error) {
        console.error(
          `Error al procesar las categorías del producto (${product.name}):`,
          product.category,
          error
        );
        return false; // Omitir producto en caso de error
      }
    });
  };

  const handleOpenStationModal = (stationId) => {
    setCurrentStationId(stationId);

    const station = stations.find((s) => s.id === stationId); // Encuentra la estación por su ID
    const stationCategory = station?.category || ''; // Obtén la categoría o un valor por defecto

    if (clientStations[stationId]) {
      setStationFinding({
        ...clientStations[stationId], // Carga los datos existentes
        photoBlob: null, // Asegúrate de que `photoBlob` esté vacío para nuevas selecciones
        category: stationCategory,
      });
    } else {
      // Si no hay hallazgo previo, usa valores predeterminados
      setStationFinding({
        category: stationCategory,
        purpose: 'Consumo',
        consumptionAmount: 1,
        captureQuantity: '',
        marked: 'Si',
        physicalState: 'Buena',
        damageLocation: '',
        requiresChange: 'No',
        changePriority: 'No',
        doseConsumed: 0,
        doseReplaced: 0,
        consumerType: '',
        otherConsumer: '',
        replacementProduct: '',
        replacementAmount: '',
        activity: 'Cambio de producto',
        description: '',
        photo: null,
        photoBlob: null
      });
    }

    setStationModalOpen(true);
  };

  const handleActionClick = async (configurationId) => {
    if (isExecuting) return;
    setIsExecuting(true);

    try {
      const payload = { idEntity: inspectionId, id: configurationId, uniqueId: Date.now() };
      const response = await api.post(
        `${process.env.REACT_APP_API_URL}/api/create-document-inspeccion`,
        payload
      );

      if (response.data.success) {
        showNotification("Acción ejecutada con éxito.");
        await fetchDocuments();
      } else {
        showNotification("Error al ejecutar la acción.");
      }
    } catch (error) {
      console.error("Error al ejecutar la acción:", error);
      showNotification("Error al ejecutar la acción.");
    } finally {
      setIsExecuting(false);
    }
  };

  const handleCloseStationModal = () => {
    setCurrentStationId(null);
    setStationModalOpen(false);
    setStationFinding({
      purpose: 'Consumo',
      consumptionAmount: 1,
      captureQuantity: '',
      marked: 'Si',
      physicalState: 'Buena',
      damageLocation: '',
      requiresChange: 'No',
      changePriority: 'No',
      doseConsumed: 0,
      doseReplaced: 0,
      consumerType: '',
      otherConsumer: '',
      replacementProduct: '',
      replacementAmount: '',
      activity: 'Cambio de producto',
      description: '',
      photo: null,
      photoBlob: null
    });
  };

  const handleStationFindingChange = (field, value) => {
    setStationFinding((prevFinding) => {
      const updatedFinding = {
        ...prevFinding,
        [field]: value,
        id: prevFinding.id || Date.now(), // Asegurar que cada hallazgo tenga un id único
      };
      // Marcar cambios detectados
      setHasUnsavedChanges(true);
      setUnsavedRoute(location.pathname);
      console.log(`Hallazgo para estación id asignado: ${updatedFinding.id}`);
      return updatedFinding; // Retornar el nuevo estado
    });
  };



  const handleStationFindingPhotoChange = (file) => {
    if (!file || !file.type.startsWith('image/')) {
      console.error('No se seleccionó un archivo válido o no es una imagen.');
      showNotification('Seleccione un archivo válido de tipo imagen.');
      return;
    }

    // Crear una URL temporal para la previsualización
    const photoURL = URL.createObjectURL(file);

    setStationFinding((prevFinding) => {
      // Liberar la URL anterior si existía
      if (prevFinding.photo && prevFinding.photo.startsWith('blob:')) {
        URL.revokeObjectURL(prevFinding.photo);
      }

      return {
        ...prevFinding,
        photo: photoURL, // Nueva URL para previsualización
        photoBlob: file, // Nuevo archivo seleccionado (Blob)
      };
    });

    // Marcar cambios detectados
    setHasUnsavedChanges(true);
    setUnsavedRoute(location.pathname);

    console.log('Nueva imagen seleccionada:', file);
  };

  const handleSaveStationFinding = () => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [currentStationId]: { ...stationFinding },
    }));
    handleCloseStationModal();
  };

  const handleSaveStationFindingDesinsectacion = () => {
    setClientStations((prevStations) => ({
      ...prevStations,
      [currentStationIdDesinsectacion]: { ...stationFindingDesinsectacion },
    }));
    handleCloseStationModalDesinsectacion();
  };


  const handleOpenStationModalDesinsectacion = (stationId) => {
    setCurrentStationIdDesinsectacion(stationId);

    const station = stations.find((s) => s.id === stationId); // Encuentra la estación por su ID
    const stationCategory = station?.category || ''; // Obtén la categoría o un valor por defecto

    if (clientStations[stationId]) {
      setStationFindingDesinsectacion({
        ...clientStations[stationId], // Carga los datos existentes
        photoBlob: null, // Asegúrate de que `photoBlob` esté vacío para nuevas selecciones
        category: stationCategory,
      });
    } else {
      // Si no hay hallazgo previo, usa valores predeterminados
      setStationFindingDesinsectacion({
        category: stationCategory,
        captureQuantity: '',
        physicalState: 'Buena',
        damageLocation: '',
        requiresChange: 'No',
        changePriority: 'No',
        description: '',
        photo: null,
        photoBlob: null,
      });
    }

    setStationModalOpenDesinsectacion(true);
  };


  const handleCloseStationModalDesinsectacion = () => {
    setCurrentStationIdDesinsectacion(null);
    setStationModalOpenDesinsectacion(false);
    setStationFindingDesinsectacion({
      captureQuantity: '',
      physicalState: 'Buena',
      damageLocation: '',
      requiresChange: 'No',
      changePriority: 'No',
      description: '',
      photo: null,
    });
  };

  const handleStationFindingChangeDesinsectacion = (field, value) => {
    setStationFindingDesinsectacion((prevFinding) => {
      const updatedFinding = {
        ...prevFinding,
        [field]: value,
        id: prevFinding.id || Date.now(), // Generar un id único si no existe
      };
      // Marcar cambios detectados
      setHasUnsavedChanges(true);
      setUnsavedRoute(location.pathname);
      console.log(`Hallazgo de desinsectación id asignado: ${updatedFinding.id}`);
      return updatedFinding; // Retornar el estado actualizado
    });
  };


  const handleStationFindingPhotoChangeDesinsectacion = (file) => {
    if (!file || !file.type.startsWith("image/")) {
      console.error("No se seleccionó un archivo válido o no es una imagen.");
      showNotification("Seleccione un archivo válido de tipo imagen.");
      return;
    }

    const photoURL = URL.createObjectURL(file);

    setStationFindingDesinsectacion((prevFinding) => ({
      ...prevFinding,
      photo: photoURL, // URL para previsualización
      photoBlob: file, // Blob para guardar offline o enviar online
    }));
    // Marcar cambios detectados
    setHasUnsavedChanges(true);
    setUnsavedRoute(location.pathname);
  };

  // Manejador de estado de colapso
  const handleCollapseToggle = (currentKey) => {
    setCollapseStates({ [currentKey]: !collapseStates[currentKey] }); // Solo permite un hallazgo expandido
  };

  const handleViewStation = (stationId) => {
    setViewStationData(clientStations[stationId] || {});
    setViewStationModalOpen(true);
  };

  const handlePrefirmDocument = async (documentUrl) => {
    try {
      // Paso 1: Obtener la URL prefirmada
      const prefirmResponse = await api.post('/PrefirmarArchivos', { url: documentUrl });

      if (prefirmResponse.data.signedUrl) {
        const preSignedUrl = prefirmResponse.data.signedUrl;

        // Paso 2: Usar la URL prefirmada para subir a Google Drive
        const googleDriveResponse = await api.post('/edit-googledrive', { s3Url: preSignedUrl });

        if (googleDriveResponse.data.success && googleDriveResponse.data.fileId) {
          // Paso 3: Construir la URL de edición en Google Drive
          const googleDriveEditUrl = `https://docs.google.com/document/d/${googleDriveResponse.data.fileId}/edit`;

          // Abrir el archivo en una nueva pestaña
          window.open(googleDriveEditUrl, '_blank', 'noopener,noreferrer');
        } else {
          // Manejo de error si no se obtuvo el archivo en Google Drive
          showNotification('No se pudo obtener el archivo en Google Drive.');
        }
      } else {
        // Manejo de error si no se pudo obtener la URL prefirmada
        showNotification('No se pudo obtener la URL prefirmada.');
      }
    } catch (error) {
      // Manejo de errores generales
      console.error('Error en el proceso:', error.message);
      showNotification('Hubo un error al intentar procesar el documento.');
    }
  };

  const handleViewStationDesratizacion = (stationId) => {
    setViewStationData(clientStations[stationId] || {});
    setStationType('Desratización');
    setViewStationModalOpen(true);
  };

  const handleViewStationDesinsectacion = (stationId) => {
    setViewStationData(clientStations[stationId] || {});
    setStationType('Desinsectación');
    setViewStationModalOpen(true);
  };

  const handleShowConfirmDelete = (type, index) => {
    setConfirmDelete({ show: true, type, index });
  };

  const handleCloseConfirmDelete = () => {
    setConfirmDelete({ show: false, type: null, index: null });
  };

  const handleDeleteFinding = () => {
    const { type, index } = confirmDelete;

    if (!type || index === null || index === undefined) {
      console.error(`El tipo ${type} o el índice ${index} no son válidos.`);
      handleCloseConfirmDelete();
      return;
    }

    setFindingsByType((prevFindings) => {
      const updatedFindings = { ...prevFindings };
      updatedFindings[type].splice(index, 1);

      if (updatedFindings[type].length === 0) {
        delete updatedFindings[type];
      }

      return updatedFindings;
    });

    handleCloseConfirmDelete();
  };

  if (loading) return
  <div
    style={{
      position: "fixed",
      top: 0,
      left: 0,
      zIndex: 1050,
      width: "100vw",
      height: "100vh",
      backgroundColor: "rgba(255, 255, 255, 0.7)",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
    }}
  >
    <div className="spinner-border text-secondary" role="status" style={{ width: "5rem", height: "5rem" }}>
      <span className="visually-hidden">Cargando datos de la Inspección...</span>
    </div>
  </div>
    ;

  if (!inspectionData)
    return (
      <div className="alert alert-danger" role="alert">
        No se encontró información de la inspección.
      </div>
    );

  const getFormattedDateWithSlashes = () => {
    const now = new Date();
    const day = String(now.getDate()).padStart(2, '0');
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const year = String(now.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`; // formato con /
  };

  const { inspection_type, inspection_sub_type, date, time, service_id, exit_time } = inspectionData;

  const parsedInspectionTypes = inspection_type
    ? [
      ...inspection_type.split(",").map((type) => type.trim())
    ]
    : [];

  const isLocked = techSignaturePreview && clientSignaturePreview && userRol === 'Técnico';


  /* ← 1. categorías originales que vienen en la ficha */
  const originalCategories = parsedInspectionTypes;

  /* ← 2. ¿existe al menos un hallazgo con descripción en cada categoría? */
  const hasFindingsInEveryOriginalCategory = originalCategories.every(cat =>
    (findingsByType[cat] || []).some(
      f => f.description && f.description.trim().length > 0
    )
  );

  /* ← 3. ¿hay observación general? */
  const hasGeneralObs = generalObservations.trim().length > 0;

  /* ← 4. bandera final */
  const canSign = hasGeneralObs && hasFindingsInEveryOriginalCategory;

  return (
    <div className="container mt-4">

      {/* Tarjeta Información General */}
      <div className="card border-success mb-3" style={{ minHeight: 0, height: 'auto' }}>
        <div className="card-header">Información General</div>
        <div className="card-body">
          {/* Primera fila: Información General y Documentos */}
          <div className="row" style={{ minHeight: 0, height: 'auto' }}>
            {/* Columna 1: Información General */}
            <div className="col-md-6">
              <p><strong>Inspección:</strong> {inspectionId}</p>
              <p><strong>Fecha:</strong> {moment.utc(date).format('DD/MM/YYYY')}</p>
              <p><strong>Hora de Inicio:</strong> {moment(time, "HH:mm:ss").format("hh:mm A")}</p>
              <p><strong>Hora de Finalización:</strong> {moment(exit_time, "HH:mm:ss").format("hh:mm A")}</p>
              <p><strong>Servicio:</strong> {service_id}</p>
              <br></br>
              <textarea
                id="generalObservations"
                className="form-control"
                rows="4"
                value={generalObservations}
                onChange={(e) => {
                  const newValue = e.target.value;
                  setGeneralObservations(newValue);

                  // Detectar cambios en las observaciones generales
                  if (newValue !== (inspectionData?.observations || '')) {
                    setHasUnsavedChanges(true);
                    setUnsavedRoute(location.pathname);
                  }
                }}
                placeholder="Ingrese sus observaciones generales aquí"
                disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
              ></textarea>
            </div>

            {/* Columna 2: Documentos */}
            <div className="col-md-6">
              <h5>Documentos</h5>
              {documents.length > 0 ? (
                <div className="row" style={{ minHeight: 0, height: 'auto' }}>
                  {documents.map((doc, index) => (
                    <div className="col-6 col-md-3 text-center mb-3" key={index}>
                      <button
                        className="btn p-0"
                        style={{ background: "none", border: "none", cursor: "pointer" }}
                        onClick={() => handleDocumentClick(doc)}
                      >
                        {doc.document_type === "doc" ? (
                          <FileEarmarkWord size={40} color="blue" title="Documento Word" />
                        ) : doc.document_type === "xlsx" ? (
                          <FileEarmarkExcel size={40} color="green" title="Hoja de cálculo Excel" />
                        ) : doc.document_type === "pdf" ? (
                          <FileEarmarkPdf size={40} color="red" title="Documento PDF" />
                        ) : ["jpg", "jpeg", "png"].includes(doc.document_type) ? (
                          <FileEarmarkImage size={40} color="orange" title="Imagen" />
                        ) : (
                          <FileEarmarkArrowDown size={40} color="gray" title="Archivo" />
                        )}
                        <div className="mt-2">
                          <small>{doc.document_name}</small>
                        </div>
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <p>No se encontraron documentos relacionados con esta inspección.</p>
              )}

              {/* Mostrar las acciones debajo de los documentos */}
              <div className="mt-3">
                <h5>Acciones</h5>
                {actions.length > 0 ? (
                  <div className="row" style={{ minHeight: 0, height: 'auto' }}>
                    {actions.map((action, index) => {
                      // Determinar el ícono y color según el action_type
                      let IconComponent;
                      let color;

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
                            onClick={() => {
                              if (action.action_type === "generate_pdf" && action.configuration_id === 0) {
                                handleOpenConvertToPdfModal();
                              } else {
                                handleActionClick(action.configuration_id);
                              }
                            }}
                          >
                            <IconComponent size={40} color={color} title={action.action_name} />
                            <div className="mt-2">
                              <small>{action.action_name}</small>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p>No se encontraron acciones relacionadas con esta inspección.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Secciones por Tipo de Inspección */}
      {parsedInspectionTypes.map((type, index) => (
        <div className="card border-success mb-3" key={index} >
          <div className="card-header">{type}</div>
          <div className="card-body">

            {type === 'Desratización' && stations.length > 0 && (
              <div className="mt-1">
                <h6>Hallazgos en Estaciones</h6>
                <div className="mb-3 d-flex">
                  <input
                    type="text"
                    className="form-control me-2"
                    placeholder="Buscar estación por descripción"
                    value={searchTermDesratizacion}
                    onChange={(e) => setSearchTermDesratizacion(e.target.value)}
                  />
                  <QrCodeScan
                    size={40}
                    className="btn p-0 mx-4"
                    onClick={() => handleOpenQrScanner("Desratización")}
                  />
                </div>
                <div className="table-responsive mt-3">
                  {isMobile ? (
                    // Vista móvil con colapso
                    stations
                      .filter((station) => {
                        // Validar primero que la categoría sea "Roedores"
                        if (station.category !== "Roedores") {
                          return false;
                        }

                        // Normalizamos el término de búsqueda
                        const search = searchTermDesratizacion.trim().toLowerCase();

                        // Verificamos si el término de búsqueda tiene el formato "station-<id>"
                        const stationPrefix = "station-";
                        const isStationSearch = search.startsWith(stationPrefix);

                        // Búsqueda por ID exacto
                        if (isStationSearch) {
                          const stationId = Number(search.replace(stationPrefix, ""));
                          return !isNaN(stationId) && station.id === stationId;
                        }

                        // Búsqueda general en nombre y descripción
                        const stationName = station.name ? station.name.toLowerCase() : "";
                        const stationDescription = station.description ? station.description.toLowerCase() : "";
                        return stationName.includes(search) || stationDescription.includes(search);
                      })
                      .map((station) => {
                        const currentKey = `station-${station.id}`;
                        return (
                          <div
                            key={station.id}
                            className="finding-item border mb-3 p-2"
                            style={{ borderRadius: '5px', backgroundColor: '#f8f9fa' }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <strong>{station.name || `Estación ${station.description}`}</strong>
                              <div
                                className="icon-toggle"
                                onClick={() => handleCollapseToggle(currentKey)}
                                style={{ cursor: 'pointer' }}
                              >
                                {collapseStates[currentKey] ? (
                                  <ArrowUpSquare title="Ocultar" />
                                ) : (
                                  <ArrowDownSquare title="Expandir" />
                                )}
                              </div>
                            </div>
                            <div
                              className={`finding-details ${collapseStates[currentKey] ? 'd-block' : 'd-none'
                                } mt-2`}
                            >
                              <>
                                <p><strong>Finalidad:</strong> {clientStations[station.id]?.purpose || '-'}</p>

                                {clientStations[station.id]?.purpose === 'Consumo' && (
                                  <p><strong>Cantidad Consumida:</strong> {clientStations[station.id]?.consumptionAmount || '-'}</p>
                                )}

                                {clientStations[station.id]?.purpose === 'Captura' && (
                                  <p><strong>Cantidad Capturada:</strong> {clientStations[station.id]?.captureQuantity || '-'}</p>
                                )}

                                <p><strong>Estado Físico:</strong> {clientStations[station.id]?.physicalState || '-'}</p>
                                {clientStations[station.id]?.physicalState === 'Dañada' && (
                                  <>
                                    <p><strong>Lugar del Daño:</strong> {clientStations[station.id]?.damageLocation || '-'}</p>
                                    <p><strong>Requiere Cambio:</strong> {clientStations[station.id]?.requiresChange || '-'}</p>
                                    {clientStations[station.id]?.requiresChange === 'Si' && (
                                      <p><strong>Prioridad de Cambio:</strong> {clientStations[station.id]?.changePriority || '-'}</p>
                                    )}
                                  </>
                                )}
                                <p><strong>Descripción:</strong> {clientStations[station.id]?.description || '-'}</p>
                                <div className="mb-3">
                                  {clientStations[station.id]?.photo ? (
                                    <img
                                      src={clientStations[station.id]?.photo}
                                      alt="Foto"
                                      style={{ width: '150px', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <span>Sin Foto</span>
                                  )}
                                </div>
                                <button
                                  className="btn btn-outline-success"
                                  onClick={() => handleOpenStationModal(station.id)}
                                  disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                >
                                  Editar
                                </button>
                              </>
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    // Vista de tabla para tablet y computadora
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Estación</th>
                          <th>Finalidad</th>
                          <th>Estado Físico</th>
                          <th>Descripción</th>
                          <th>Foto</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stations.filter((station) => {
                          console.log("Evaluando estación:", station);

                          // Verificar categoría
                          if (station.category !== "Roedores") {
                            console.log(`Estación ${station.name || `ID: ${station.id}`} excluida por categoría:`, station.category);
                            return false;
                          }

                          // Normalizamos el término de búsqueda
                          const search = searchTermDesratizacion.trim().toLowerCase();
                          console.log("Término de búsqueda utilizado:", search); // Log del término de búsqueda

                          const stationPrefix = "station-";
                          const isStationSearch = search.startsWith(stationPrefix);

                          // Búsqueda por ID exacto usando el prefijo
                          if (isStationSearch) {
                            const stationId = Number(search.replace(stationPrefix, ""));
                            console.log(`Buscando estación con ID ${stationId} en estación con ID:`, station.id);
                            const match = !isNaN(stationId) && station.id === stationId;
                            console.log(`Resultado de búsqueda exacta para estación ${station.id}:`, match ? "Coincide" : "No coincide");
                            return match;
                          }

                          // Búsqueda general en nombre o descripción
                          const stationName = station.name ? station.name.toLowerCase() : "";
                          const stationDescription = station.description ? station.description.toLowerCase() : "";
                          const matches = stationName.includes(search) || stationDescription.includes(search);

                          console.log(`Resultado del filtro general para estación ${station.name || `ID: ${station.id}`}:`, matches ? "Incluida" : "Excluida");
                          return matches;
                        })
                          .map((station) => (
                            <tr key={station.id}>
                              <td className='align-middle'>{station.name || `Estación ${station.description}`}</td>
                              {clientStations[station.id] ? (
                                <>
                                  <td className='align-middle'>{clientStations[station.id].purpose || '-'}</td>
                                  <td className='align-middle'>{clientStations[station.id].physicalState || '-'}</td>
                                  <td className='align-middle'>{clientStations[station.id].description || '-'}</td>
                                  <td className='align-middle mx-1 px-1'>
                                    {clientStations[station.id].photo ? (
                                      <img
                                        src={clientStations[station.id].photo}
                                        alt="Foto"
                                        style={{ width: '250px', objectFit: 'cover', margin: "0px", padding: "0px" }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className='align-middle'>
                                    {!isMobile && (
                                      <button
                                        className="btn btn-link p-0"
                                        onClick={() => handleViewStationDesratizacion(station.id)}
                                        style={{ border: "none", background: "none" }}
                                      >
                                        <Eye
                                          className='mx-2'
                                          size={"25px"}
                                          color='blue'
                                          type='button'
                                        />
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-link p-0"
                                      onClick={() => handleOpenStationModal(station.id)}
                                      disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'} // Bloquear si ya está firmado
                                      style={{ border: "none", background: "none" }} // Estilo para eliminar apariencia de botón
                                    >
                                      <PencilSquare
                                        className="mx-2"
                                        size={"20px"}
                                        color={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico' ? "gray" : "green"} // Cambiar color si está bloqueado
                                        type="button"
                                        title={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico' ? "Inspección firmada, edición bloqueada" : "Editar"}
                                      />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td colSpan="4">Sin hallazgo reportado</td>
                                  <td>
                                    <button
                                      className="btn btn-outline-success"
                                      onClick={() => handleOpenStationModal(station.id)}
                                      disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                    >
                                      +
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}


            {type === 'Desinsectación' && stations.length > 0 && (
              <div className="mt-1">
                <h6>Hallazgos en Estaciones</h6>
                <div className="mb-3 d-flex">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Buscar estación por descripción"
                    value={searchTermDesinsectacion}
                    onChange={(e) => setSearchTermDesinsectacion(e.target.value)}
                  />
                  <QrCodeScan
                    size={40}
                    className="btn p-0 mx-4"
                    onClick={() => handleOpenQrScanner("Desinsectación")}
                  />
                </div>
                <div className="table-responsive mt-3">
                  {isMobile ? (
                    // Vista móvil con colapso
                    stations
                      .filter((station) => {
                        // Validar primero que la categoría sea "Aéreas"
                        if (station.category !== "Aéreas") {
                          return false;
                        }

                        // Normalizamos el término de búsqueda
                        const search = searchTermDesinsectacion.trim().toLowerCase();

                        // Verificamos si el término de búsqueda tiene el formato "station-<id>"
                        const stationPrefix = "station-";
                        const isStationSearch = search.startsWith(stationPrefix);

                        // Búsqueda por ID exacto
                        if (isStationSearch) {
                          const stationId = Number(search.replace(stationPrefix, ""));
                          return !isNaN(stationId) && station.id === stationId;
                        }

                        // Búsqueda general en nombre y descripción
                        const stationName = station.name ? station.name.toLowerCase() : "";
                        const stationDescription = station.description ? station.description.toLowerCase() : "";
                        return stationName.includes(search) || stationDescription.includes(search);
                      })
                      .map((station) => {
                        const currentKey = `station-desinsectacion-${station.id}`;
                        return (
                          <div
                            key={station.id}
                            className="finding-item border mb-3 p-2"
                            style={{ borderRadius: '5px', backgroundColor: '#f8f9fa' }}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <strong>{station.name || `Estación ${station.description}`}</strong>
                              <div
                                className="icon-toggle"
                                onClick={() => handleCollapseToggle(currentKey)}
                                style={{ cursor: 'pointer' }}
                              >
                                {collapseStates[currentKey] ? (
                                  <ArrowUpSquare title="Ocultar" />
                                ) : (
                                  <ArrowDownSquare title="Expandir" />
                                )}
                              </div>
                            </div>
                            <div
                              className={`finding-details ${collapseStates[currentKey] ? 'd-block' : 'd-none'
                                } mt-2`}
                            >
                              {clientStations[station.id] ? (
                                <>
                                  <p><strong>Capturas:</strong> {clientStations[station.id].captureQuantity || '-'}</p>
                                  <p><strong>Estado Físico:</strong> {clientStations[station.id].physicalState || '-'}</p>
                                  <p><strong>Descripción:</strong> {clientStations[station.id].description || '-'}</p>
                                  <div className="mb-3">
                                    {clientStations[station.id].photo ? (
                                      <img
                                        src={clientStations[station.id].photo}
                                        alt="Foto"
                                        style={{ width: '150px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <span>Sin Foto</span>
                                    )}
                                  </div>
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                    disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                  >
                                    Editar
                                  </button>
                                </>
                              ) : (
                                <>
                                  <p>Sin hallazgo reportado</p>
                                  <button
                                    className="btn btn-outline-success"
                                    onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                    disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                  >
                                    +
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        );
                      })
                  ) : (
                    // Vista de tabla para tablet y computadora
                    <table className="table table-bordered">
                      <thead>
                        <tr>
                          <th>Estación</th>
                          <th>Cantidad de Capturas</th>
                          <th>Estado Físico</th>
                          <th>Descripción</th>
                          <th>Foto</th>
                          <th>Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stations
                          .filter((station) => {
                            const search = searchTermDesinsectacion.trim().toLowerCase(); // Normalizamos el término de búsqueda
                            const stationPrefix = "station-"; // Prefijo esperado para búsqueda por ID
                            const isStationSearch = search.startsWith(stationPrefix);

                            // Verificar primero que la categoría sea "Aéreas"
                            if (station.category !== "Aéreas") {
                              return false;
                            }

                            // Búsqueda por ID exacto
                            if (isStationSearch) {
                              const stationId = Number(search.replace(stationPrefix, ""));
                              return !isNaN(stationId) && station.id === stationId;
                            }

                            // Búsqueda general en nombre, descripción o ID
                            const stationName = station.name ? station.name.toLowerCase() : "";
                            const stationDescription = station.description ? station.description.toLowerCase() : "";
                            const stationId = station.id ? station.id.toString().toLowerCase() : "";

                            return (
                              stationName.includes(search) ||
                              stationDescription.includes(search) ||
                              stationId.includes(search)
                            );
                          })
                          .map((station) => (
                            <tr key={station.id}>
                              <td className='align-middle'>{station.name || `Estación ${station.description}`}</td>
                              {clientStations[station.id] ? (
                                <>
                                  <td className='align-middle'>{clientStations[station.id].captureQuantity || '-'}</td>
                                  <td className='align-middle'>{clientStations[station.id].physicalState || '-'}</td>
                                  <td className='align-middle'>{clientStations[station.id].description || '-'}</td>
                                  <td className='align-middle'>
                                    {clientStations[station.id].photo ? (
                                      <img
                                        src={clientStations[station.id].photo}
                                        alt="Foto"
                                        style={{ width: '250px', objectFit: 'cover', margin: "0px", padding: "0px" }}
                                      />
                                    ) : (
                                      '-'
                                    )}
                                  </td>
                                  <td className='align-middle'>
                                    {!isMobile && (
                                      <button
                                        className="btn btn-link p-0"
                                        onClick={() => handleViewStationDesinsectacion(station.id)}
                                        style={{ border: "none", background: "none" }}
                                      >
                                        <Eye
                                          className='mx-2'
                                          size={"25px"}
                                          color='blue'
                                          type='button'
                                        />
                                      </button>
                                    )}
                                    <button
                                      className="btn btn-link p-0"
                                      onClick={() => handleOpenStationModal(station.id)}
                                      disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                      style={{ border: "none", background: "none" }}
                                    >
                                      <PencilSquare
                                        className='mx-2'
                                        size={"20px"}
                                        color='green'
                                        type='button'
                                        onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                        disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                      />
                                    </button>
                                  </td>
                                </>
                              ) : (
                                <>
                                  <td colSpan="4">Sin hallazgo reportado</td>
                                  <td>
                                    <button
                                      className="btn btn-outline-success"
                                      onClick={() => handleOpenStationModalDesinsectacion(station.id)}
                                      disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                                    >
                                      +
                                    </button>
                                  </td>
                                </>
                              )}
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            )}

            {/* Hallazgos */}
            <hr></hr>
            <h6 className='mt-2'>Hallazgos</h6>
            <div className="table-responsive findings-container">
              {(findingsByType[type] || []).map((finding, idx) => {
                const currentKey = `${type}-${finding.id}`; // Usar el ID único como clave
                const findingTitle = finding.place && finding.place.trim() !== ''
                  ? `Hallazgo ${finding.place}`
                  : `Hallazgo ${idx + 1}`; // Mostrar 'Hallazgo' seguido del índice si 'place' está vacío

                return (
                  <div key={currentKey} className="finding-item mb-3 mx-1">
                    {/* Para dispositivos móviles: función de colapso */}
                    {isMobile ? (
                      <>
                        <div className="d-flex justify-content-between align-items-center" >
                          <strong>{findingTitle}</strong>
                          <div
                            className="icon-toggle"
                            onClick={() =>
                              setCollapseStates({ [currentKey]: !collapseStates[currentKey] })
                            }
                            style={{ cursor: "pointer", display: "inline-block" }}
                          >
                            {collapseStates[currentKey] ? (
                              <ArrowUpSquare title="Ocultar" />
                            ) : (
                              <ArrowDownSquare title="Expandir" />
                            )}
                          </div>
                        </div>

                        <div
                          className={`finding-details ${collapseStates[currentKey] ? "d-block" : "d-none"
                            }`}
                        >

                          <div className="col-md-2 mt-3 mb-0 ms-auto text-end">
                            <XCircle
                              size={"18px"}
                              color={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico') ? "gray" : "red"} // Cambiar color si está bloqueado
                              onClick={() => {
                                if ((techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')) {
                                  return;
                                }
                                handleShowConfirmDelete(type, idx);
                              }}
                              style={{
                                cursor: (techSignaturePreview && clientSignaturePreview && userRol === 'Técnico') ? "not-allowed" : "pointer", // Cambiar cursor si está bloqueado
                              }}
                              title={
                                (techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')
                                  ? "Inspección firmada, acción bloqueada"
                                  : "Eliminar hallazgo"
                              }
                            />
                          </div>
                          <div className="row mt-3" style={{ minHeight: 0, height: 'auto' }}>
                            <div className="col-md-2" >
                              <label htmlFor={`place-${type}-${idx}`} className="form-label">
                                Lugar
                              </label>
                              <input
                                id={`place-${type}-${idx}`}
                                type="text"
                                className="form-control table-input"
                                value={finding.place}
                                onChange={(e) =>
                                  handleFindingChange(type, idx, "place", e.target.value)
                                }
                                placeholder="Lugar"
                                disabled={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')}
                              />
                            </div>
                            <div className="col-md-8">
                              <label
                                htmlFor={`description-${type}-${idx}`}
                                className="form-label"
                              >
                                Descripción
                              </label>
                              <textarea
                                id={`description-${type}-${idx}`}
                                className="form-control table-textarea"
                                rows="2"
                                value={finding.description}
                                onChange={(e) =>
                                  handleFindingChange(type, idx, "description", e.target.value)
                                }
                                placeholder="Descripción"
                                disabled={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')}
                              ></textarea>
                            </div>
                            <div className="col-md-2">
                              <label className="form-label">Foto</label>
                              <div className="image-upload-container">
                                {finding.photo ? (
                                  <img
                                    src={finding.photo}
                                    alt={`Preview ${idx}`}
                                    className="image-preview"
                                  />
                                ) : (
                                  <div className="drag-drop-area">
                                    <span>Arrastra o selecciona una imagen</span>
                                  </div>
                                )}
                                <input
                                  type="file"
                                  className="image-input"
                                  disabled={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')}
                                  onChange={(e) =>
                                    handleFindingPhotoChange(type, idx, e.target.files[0])
                                  }
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    ) : (
                      // Para tablet y computadoras: mostrar todo expandido
                      <div className="finding-details d-block">
                        <div className="col-md-2 mt-0 mb-0 ms-auto text-end">
                          <XCircle
                            size={"20px"}
                            color={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico') ? "gray" : "red"} // Cambiar color si está bloqueado
                            onClick={() => {
                              if ((techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')) {
                                return;
                              }
                              handleShowConfirmDelete(type, idx);
                            }}
                            style={{
                              cursor: (techSignaturePreview && clientSignaturePreview && userRol === 'Técnico') ? "not-allowed" : "pointer", // Cambiar cursor si está bloqueado
                            }}
                            title={
                              (techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')
                                ? "Inspección firmada, acción bloqueada"
                                : "Eliminar hallazgo"
                            }
                          />
                        </div>
                        <div className="row mt-3" style={{ minHeight: 0, height: 'auto' }}>
                          <div className="col-md-2">
                            <label htmlFor={`place-${type}-${idx}`} className="form-label">
                              Lugar
                            </label>
                            <input
                              id={`place-${type}-${idx}`}
                              type="text"
                              className="form-control table-input"
                              value={finding.place}
                              onChange={(e) =>
                                handleFindingChange(type, idx, "place", e.target.value)
                              }
                              placeholder="Lugar"
                              disabled={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')}
                            />
                          </div>
                          <div className="col-md-8">
                            <label htmlFor={`description-${type}-${idx}`} className="form-label">Descripción</label>
                            <textarea
                              id={`description-${type}-${idx}`}
                              className="form-control table-textarea"
                              rows="2"
                              value={finding.description}
                              onChange={(e) =>
                                handleFindingChange(type, idx, "description", e.target.value)
                              }
                              placeholder="Descripción"
                              disabled={isLocked}
                            ></textarea>
                          </div>

                          <div className="col-md-2">
                            <label className="form-label">Foto</label>
                            <div className="image-upload-container">
                              {finding.photo ? (
                                <img
                                  src={finding.photo}
                                  alt={`Preview ${idx}`}
                                  className="image-preview"
                                />
                              ) : (
                                <div className="drag-drop-area">
                                  <span>Arrastra o selecciona una imagen</span>
                                </div>
                              )}
                              <input
                                type="file"
                                className="image-input"
                                disabled={isLocked}
                                onChange={(e) =>
                                  handleFindingPhotoChange(type, idx, e.target.files[0])
                                }
                              />
                            </div>
                          </div>

                          {/* ✅ Botón exclusivo para Lavado de tanque */}
                          {type.trim().toLowerCase() === "lavado de tanque" && (
                            <div className="col-md-12 mt-3 text-center">
                              <label className="form-label d-block mb-2">Fase del Lavado</label>
                              <div className="d-flex justify-content-center gap-2">
                                {["Antes", "Durante", "Después"].map((fase) => (
                                  <button
                                    key={fase}
                                    type="button"
                                    className={`btn ${finding.faseLavado === fase ? "btn-primary" : "btn-outline-primary"}`}
                                    onClick={() => handleFindingChange(type, idx, "faseLavado", fase)}
                                    disabled={isLocked}
                                  >
                                    {fase}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <button
              className="btn btn-outline-success mb-3"
              onClick={() => handleAddFinding(type)}
              disabled={(techSignaturePreview && clientSignaturePreview && userRol === 'Técnico')}
            >
              + Agregar Hallazgo
            </button>

            {type !== 'Observaciones Cliente' && type !== 'Observaciones Inspector' && type !== 'Observaciones SST' && (
              <>
                {/* Producto */}
                <hr />
                <h6 className="mt-2">Producto</h6>
                {Object.entries(productsByType)
                  .filter(([key]) => key.startsWith(type))
                  .map(([key, productData], index) => (
                    <div key={key} className="row align-items-end" style={{ minHeight: 0, height: 'auto' }}>

                      {/* Selección de Producto - Aumentado a col-md-6 */}
                      <div className="col-md-6">
                        <label className="form-label">Producto</label>
                        <select
                          id={`product-${key}`}
                          className="form-select"
                          value={productData.product || ''}
                          onChange={(e) => {
                            const selectedProductName = e.target.value;
                            const selectedProduct = getFilteredProducts(type).find(
                              (product) => product.name === selectedProductName
                            );

                            if (!selectedProduct) return;

                            setProductsByType((prevState) => {
                              const baseType = type.replace(/[0-9]+$/, '');
                              const procedureMatch = procedures.find(proc => proc.category === baseType);

                              return {
                                ...prevState,
                                [`${type}${index}`]: {
                                  ...prevState[`${type}${index}`], // Mantiene los valores previos del producto
                                  id: selectedProduct.id,
                                  product: selectedProductName,
                                  unity: selectedProduct.unity || 'Unidad no definida',
                                  dosage: prevState[`${type}${index}`]?.dosage || '',
                                  expiration_date: selectedProduct.expiration_date || 'No especificado',
                                  active_ingredient: selectedProduct.active_ingredient || 'No especificado',
                                  batch: selectedProduct.batch || 'No especificado',
                                  category: selectedProduct.category || 'No especificado',
                                  residual_duration: selectedProduct.residual_duration || 'No especificado',
                                  tipo: baseType,
                                  process: procedureMatch?.application ? JSON.parse(procedureMatch.application).join(', ') : 'No especificado', // ✅ Formato legible aplicado aquí
                                },
                              };
                            });
                          }}
                          disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                        >
                          <option value="">Seleccione un producto</option>
                          {getFilteredProducts(type).map((product) => (
                            <option key={product.id} value={product.name}>
                              {product.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Entrada de Dosificación - Reducida a 90px */}
                      <div className="col-md-3">
                        <label className="form-label">Dosificación</label>
                        <input
                          id={`dosage-${key}`}
                          type="number"
                          className="form-control"
                          style={{ width: '100%' }} // Ajuste de tamaño
                          value={productData.dosage || ''}
                          onChange={(e) => {
                            setProductsByType((prevState) => ({
                              ...prevState,
                              [key]: {
                                ...prevState[key],
                                dosage: e.target.value,
                              },
                            }));
                          }}
                          placeholder="Dosificación"
                          disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                        />
                      </div>

                      {/* Unidad del Producto - Reducida a 70px */}
                      <div className="col-md-2">
                        <label className="form-label">Unidad</label>
                        <input
                          id={`unit-${key}`}
                          type="text"
                          className="form-control"
                          style={{ width: '100%' }} // Ajuste de tamaño
                          value={productData.unity || ''}
                          readOnly
                          placeholder="Unidad"
                        />
                      </div>

                      {/* Botón de Eliminar */}
                      {isMobile ? (
                        <div className="col-12 mt-2 text-center">
                          <XCircle
                            className="text-danger"
                            size={22}
                            style={{ cursor: "pointer" }}
                            title="Eliminar producto"
                            onClick={() => {
                              setProductsByType((prevState) => {
                                const updatedProducts = { ...prevState };
                                delete updatedProducts[key]; // Elimina el producto actual
                                return updatedProducts;
                              });
                            }}
                            disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                          />
                        </div>
                      ) : (
                        <div className="col-md-1 d-flex align-items-center justify-content-center">
                          <XCircle
                            className="text-danger"
                            size={18}
                            style={{ cursor: "pointer" }}
                            title="Eliminar producto"
                            onClick={() => {
                              setProductsByType((prevState) => {
                                const updatedProducts = { ...prevState };
                                delete updatedProducts[key]; // Elimina el producto actual
                                return updatedProducts;
                              });
                            }}
                            disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                          />
                        </div>
                      )}

                    </div>
                  ))}

                {/* Botón para agregar nuevo producto */}
                <div className="col-12 d-flex justify-content-center mt-3">
                  <button
                    className="btn btn-outline-success"
                    type="button"
                    onClick={() => {
                      const newIndex = Object.keys(productsByType).filter((key) => key.startsWith(type)).length;
                      const baseType = type.replace(/[0-9]+$/, '');
                      const procedureMatch = procedures.find(proc => proc.category === baseType);
                      const readableProcess = procedureMatch?.application ? JSON.parse(procedureMatch.application).join(', ') : 'No especificado';
                      setProductsByType((prevProducts) => ({
                        ...prevProducts,
                        [`${type}${newIndex}`]: { expiration_date: '', residual_duration: '', batch: '', active_ingredient: '', product: '', dosage: '', unity: '', id: null, tipo: baseType, process: readableProcess, },
                      }));
                    }}
                  >
                    Agregar Producto
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

      ))}

      {/* Sección de Firma */}
      <div className="card border-success mt-4">
        <div className="card-header">Firmas</div>
        <div className="card-body">
          {/* Mostrar solo el botón si no hay firmas */}
          {!techSignaturePreview || !clientSignaturePreview ? (
            userRol !== 'Cliente' && userRol !== 'SST' && (
              <div className="text-center">
                <button
                  className="btn btn-outline-success"
                  onClick={() => setSignModalOpen(true)}
                  disabled={!canSign}
                >
                  Firmar
                </button>
              </div>
            )
          ) : (
            <>
              {/* Mostrar la información completa si hay firmas */}
              {/* Firma del Técnico */}
              <div className="mb-4 text-center">
                <h5>Firma del Técnico</h5>
                <img
                  src={techSignaturePreview}
                  alt="Firma del Técnico"
                  style={{ width: isMobile ? 280 : 700, height: 200, objectFit: 'contain', border: '1px solid #ddd' }}
                />
              </div>

              {/* Firma del Cliente */}
              <div className="mb-4 text-center">
                <h5>Firma del Cliente</h5>
                <img
                  src={clientSignaturePreview}
                  alt="Firma del Cliente"
                  style={{ width: isMobile ? 280 : 700, height: 200, objectFit: 'contain', border: '1px solid #ddd' }}
                />
              </div>

              {/* Datos del Cliente */}
              <div className="mt-4">
                <h5>Datos del Cliente</h5>
                <p><strong>Nombre:</strong> {signData.name || 'No registrado'}</p>
                <p><strong>Cédula:</strong> {signData.id || 'No registrada'}</p>
                <p><strong>Cargo:</strong> {signData.position || 'No registrado'}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Botón para guardar cambios y firmar */}
      <div className="text-end mt-4">
        <button className="btn btn-success me-2" onClick={handleSaveChanges}>
          Guardar Cambios
        </button>
      </div>

      <Modal show={stationModalOpen} onHide={handleCloseStationModal} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agregar Hallazgo para la Estación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* --- Extraer producto seleccionado --- */}
          {(() => {
            const selectedProduct = getFilteredProducts('Desratización').find(p => p.name === stationFinding.product);
            const replacementProduct = getFilteredProducts('Desratización').find(p => p.name === stationFinding.replacementProduct);

            const doseConsumed = (selectedProduct?.dose || 0) * (parseFloat(stationFinding.consumptionAmount) || 0);
            const doseReplaced = (replacementProduct?.dose || 0) * (parseFloat(stationFinding.replacementAmount) || 0);

            return (
              <>
                {/* Selección de Producto para la categoría Desratización */}
                <div className="mb-3">
                  <label className="form-label">Producto</label>
                  <select
                    id="product-desratization"
                    className="form-select"
                    value={stationFinding.product || ''}
                    onChange={(e) => {
                      const selectedProductName = e.target.value;
                      const selectedProduct = getFilteredProducts('Desratización').find(
                        (product) => product.name === selectedProductName
                      );

                      handleStationFindingChange('product', selectedProductName);
                      handleStationFindingChange('unit', selectedProduct?.unity || '');
                    }}
                    disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                  >
                    <option value="">Seleccione un producto</option>
                    {getFilteredProducts('Desratización').map((product) => (
                      <option key={product.id} value={product.name}>
                        {product.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Finalidad</label>
                  <select
                    className="form-select"
                    value={stationFinding.purpose}
                    onChange={(e) => handleStationFindingChange('purpose', e.target.value)}
                  >
                    <option value="Consumo">Consumo</option>
                    <option value="Captura">Captura</option>
                  </select>
                </div>

                {stationFinding.purpose === 'Consumo' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Cantidad de Consumo (cebos)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.1"
                        placeholder="Ej: 0.5, 1, 1.5..."
                        value={stationFinding.consumptionAmount}
                        onChange={(e) =>
                          handleStationFindingChange('consumptionAmount', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="mb-3 d-none">
                      <label className="form-label">Dosis Total Consumida</label>
                      <input
                        type="number"
                        className="form-control"
                        name="doseConsumed"
                        value={stationFinding.doseConsumed}
                        onChange={(e) =>
                          handleStationFindingChange('doseConsumed', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="mb-3">
                      <label className="form-label">¿Quién consumió?</label>
                      <select
                        className="form-select"
                        value={
                          stationFinding.consumerType === 'Roedor' || stationFinding.consumerType === 'Molusco'
                            ? stationFinding.consumerType
                            : 'Otro'
                        }
                        onChange={(e) => {
                          const selected = e.target.value;
                          if (selected === 'Roedor' || selected === 'Molusco') {
                            handleStationFindingChange('consumerType', selected);
                          } else {
                            handleStationFindingChange('consumerType', '');
                          }
                        }}
                      >
                        <option value="">Seleccione</option>
                        <option value="Roedor">Roedor</option>
                        <option value="Molusco">Molusco</option>
                        <option value="Otro">Otro</option>
                      </select>
                    </div>

                    {stationFinding.consumerType !== 'Roedor' &&
                      stationFinding.consumerType !== 'Molusco' && (
                        <div className="mb-3">
                          <label className="form-label">¿Cuál?</label>
                          <input
                            type="text"
                            className="form-control"
                            value={stationFinding.consumerType}
                            onChange={(e) => handleStationFindingChange('consumerType', e.target.value)}
                            placeholder="Ej: Insecto, Lagartija..."
                          />
                        </div>
                      )}

                    <div className="mb-3">
                      <label className="form-label">Producto de Reposición</label>
                      <select
                        className="form-select"
                        value={stationFinding.replacementProduct}
                        onChange={(e) => handleStationFindingChange('replacementProduct', e.target.value)}
                      >
                        <option value="">Seleccione un producto</option>
                        {getFilteredProducts('Desratización').map((product) => (
                          <option key={product.id} value={product.name}>{product.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Cantidad de Reposición (cebos)</label>
                      <input
                        type="number"
                        className="form-control"
                        min="0"
                        step="0.1"
                        value={stationFinding.replacementAmount}
                        onChange={(e) =>
                          handleStationFindingChange('replacementAmount', parseFloat(e.target.value))
                        }
                      />
                    </div>

                    <div className="mb-3 d-none">
                      <label className="form-label">Dosis Total Repuesta</label>
                      <input
                        type="number"
                        className="form-control"
                        name="doseReplaced"
                        value={stationFinding.doseReplaced}
                        onChange={(e) =>
                          handleStationFindingChange('doseReplaced', parseFloat(e.target.value))
                        }
                      />
                    </div>
                  </>
                )}

                {stationFinding.purpose === 'Captura' && (
                  <div className="mb-3">
                    <label className="form-label">Cantidad de Capturas</label>
                    <input
                      type="number"
                      className="form-control"
                      value={stationFinding.captureQuantity}
                      onChange={(e) => handleStationFindingChange('captureQuantity', e.target.value)}
                    />
                  </div>
                )}

                <div className="mb-3">
                  <label className="form-label">Señalizada</label>
                  <select
                    className="form-select"
                    value={stationFinding.marked}
                    onChange={(e) => handleStationFindingChange('marked', e.target.value)}
                  >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">Estado Físico</label>
                  <select
                    className="form-select"
                    value={stationFinding.physicalState}
                    onChange={(e) => handleStationFindingChange('physicalState', e.target.value)}
                  >
                    <option value="Buena">Buena</option>
                    <option value="Dañada">Dañada</option>
                    <option value="Faltante">Faltante</option>
                  </select>
                </div>

                {stationFinding.physicalState === 'Dañada' && (
                  <>
                    <div className="mb-3">
                      <label className="form-label">Lugar del Daño</label>
                      <select
                        className="form-select"
                        value={stationFinding.damageLocation}
                        onChange={(e) => handleStationFindingChange('damageLocation', e.target.value)}
                      >
                        <option value="Cuerpo">Cuerpo</option>
                        <option value="Tapa">Tapa</option>
                        <option value="Sticker">Sticker</option>
                        <option value="Tablero">Tablero</option>
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Requiere Cambio</label>
                      <select
                        className="form-select"
                        value={stationFinding.requiresChange}
                        onChange={(e) => handleStationFindingChange('requiresChange', e.target.value)}
                      >
                        <option value="Si">Si</option>
                        <option value="No">No</option>
                      </select>
                    </div>

                    {stationFinding.requiresChange === 'Si' && (
                      <div className="mb-3">
                        <label className="form-label">Prioridad de Cambio</label>
                        <select
                          className="form-select"
                          value={stationFinding.changePriority}
                          onChange={(e) => handleStationFindingChange('changePriority', e.target.value)}
                        >
                          <option value="Si">Si</option>
                          <option value="No">No</option>
                        </select>
                      </div>
                    )}
                  </>
                )}

                <div className="mb-3">
                  <label className="form-label">Actividad Realizada</label>
                  <input
                    type="text"
                    className="form-control"
                    value={stationFinding.activity}
                    onChange={(e) => handleStationFindingChange('activity', e.target.value)}
                    placeholder="Ej: Cambio de producto, Revisión visual, Limpieza..."
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">Descripción</label>
                  <textarea
                    className="form-control"
                    rows="3"
                    value={stationFinding.description || ''}
                    onChange={(e) => handleStationFindingChange('description', e.target.value)}
                    placeholder="Ingrese una descripción del hallazgo"
                    disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                  ></textarea>
                </div>

                <div className="mb-3">
                  <label className="form-label">Fotografía</label>
                  <div className="image-upload-container">
                    {stationFinding.photo ? (
                      <img
                        src={stationFinding.photo}
                        alt="Preview"
                        className="image-preview"
                      />
                    ) : (
                      <div className="drag-drop-area">
                        <span>Arrastra o selecciona una imagen</span>
                      </div>
                    )}
                    <input
                      type="file"
                      className="image-input"
                      disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          handleStationFindingPhotoChange(file);
                        }
                      }}
                    />
                  </div>
                </div>
              </>
            );
          })()}
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={handleCloseStationModal}>
            Cancelar
          </button>
          <button className="btn btn-success" onClick={handleSaveStationFinding}>
            Guardar Hallazgo
          </button>
        </Modal.Footer>
      </Modal>

      <Modal show={stationModalOpenDesinsectacion} onHide={handleCloseStationModalDesinsectacion} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Agregar Hallazgo para la Estación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Selección de Producto para la categoría Desinsectación */}
          <div className="mb-3">
            <label className="form-label">Producto</label>
            <select
              id="product-desinsectacion"
              className="form-select"
              value={stationFindingDesinsectacion.product || ''}
              onChange={(e) => {
                const selectedProductName = e.target.value;
                const selectedProduct = getFilteredProducts('Desinsectación').find(
                  (product) => product.name === selectedProductName
                );

                handleStationFindingChangeDesinsectacion('product', selectedProductName);
                handleStationFindingChangeDesinsectacion('unit', selectedProduct?.unity || ''); // Asegura que la unidad se actualiza
              }}
              disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
            >
              <option value="">Seleccione un producto</option>
              {getFilteredProducts('Desinsectación').map((product) => (
                <option key={product.id} value={product.name}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cantidad de Capturas */}
          <div className="mb-3">
            <label className="form-label">Cantidad de Capturas</label>
            <input
              type="number"
              className="form-control"
              value={stationFindingDesinsectacion.captureQuantity}
              onChange={(e) => handleStationFindingChangeDesinsectacion('captureQuantity', e.target.value)}
              placeholder="Ingrese la cantidad de capturas"
            />
          </div>
          <div className="mb-3">
            <label className="form-label">Estado Físico</label>
            <select
              className="form-select"
              value={stationFindingDesinsectacion.physicalState}
              onChange={(e) => handleStationFindingChangeDesinsectacion('physicalState', e.target.value)}
            >
              <option value="Buena">Buena</option>
              <option value="Dañada">Dañada</option>
              <option value="Faltante">Faltante</option>
            </select>
          </div>
          {stationFindingDesinsectacion.physicalState === 'Dañada' && (
            <>
              <div className="mb-3">
                <label className="form-label">Lugar del Daño</label>
                <select
                  className="form-select"
                  value={stationFindingDesinsectacion.damageLocation}
                  onChange={(e) => handleStationFindingChangeDesinsectacion('damageLocation', e.target.value)}
                >
                  <option value="Marco">Marco</option>
                  <option value="Estacas">Estacas</option>
                  <option value="Lamina">Lámina</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Requiere Cambio</label>
                <select
                  className="form-select"
                  value={stationFindingDesinsectacion.requiresChange}
                  onChange={(e) => handleStationFindingChangeDesinsectacion('requiresChange', e.target.value)}
                >
                  <option value="Si">Si</option>
                  <option value="No">No</option>
                </select>
              </div>
              {stationFindingDesinsectacion.requiresChange === 'Si' && (
                <div className="mb-3">
                  <label className="form-label">Prioridad de Cambio</label>
                  <select
                    className="form-select"
                    value={stationFindingDesinsectacion.changePriority}
                    onChange={(e) => handleStationFindingChangeDesinsectacion('changePriority', e.target.value)}
                  >
                    <option value="Si">Si</option>
                    <option value="No">No</option>
                  </select>
                </div>
              )}
            </>
          )}
          <div className="mb-3">
            <label className="form-label">Descripción</label>
            <textarea
              className="form-control"
              rows="3"
              value={stationFindingDesinsectacion.description}
              onChange={(e) => handleStationFindingChangeDesinsectacion('description', e.target.value)}
              placeholder="Ingrese una descripción del hallazgo"
              disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
            ></textarea>
          </div>
          <div className="mb-3">
            <label className="form-label">Fotografía</label>
            <div className="image-upload-container">
              {stationFindingDesinsectacion.photo ? (
                <img
                  src={stationFindingDesinsectacion.photo}
                  alt="Preview"
                  className="image-preview"
                />
              ) : (
                <div className="drag-drop-area">
                  <span>Arrastra o selecciona una imagen</span>
                </div>
              )}
              <input
                type="file"
                className="image-input"
                disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
                onChange={(e) => {
                  const file = e.target.files[0];
                  if (file) {
                    handleStationFindingPhotoChangeDesinsectacion(file); // Mantiene la lógica original
                  }
                }}
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={handleCloseStationModalDesinsectacion}>
            Cancelar
          </button>
          <button className="btn btn-success" onClick={handleSaveStationFindingDesinsectacion}>
            Guardar Hallazgo
          </button>
        </Modal.Footer>
      </Modal>

      <Modal show={viewStationModalOpen} onHide={() => setViewStationModalOpen(false)} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Detalles de la Estación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {stationType === 'Desratización' && (
            <>
              <p><strong>Finalidad:</strong> {viewStationData.purpose || '-'}</p>
              {viewStationData.purpose === 'Consumo' && (
                <p><strong>Cantidad Consumida:</strong> {viewStationData.consumptionAmount || '-'}</p>
              )}
              {viewStationData.purpose === 'Captura' && (
                <p><strong>Cantidad Capturada:</strong> {viewStationData.captureQuantity || '-'}</p>
              )}
            </>
          )}
          {stationType === 'Desinsectación' && (
            <>
              <p><strong>Capturas:</strong> {viewStationData.captureQuantity || '-'}</p>
            </>
          )}
          <p><strong>Estado Físico:</strong> {viewStationData.physicalState || '-'}</p>
          {viewStationData.physicalState === 'Dañada' && (
            <>
              <p><strong>Lugar del Daño:</strong> {viewStationData.damageLocation || '-'}</p>
              <p><strong>Requiere Cambio:</strong> {viewStationData.requiresChange || '-'}</p>
              {viewStationData.requiresChange === 'Si' && (
                <p><strong>Prioridad de Cambio:</strong> {viewStationData.changePriority || '-'}</p>
              )}
            </>
          )}
          <p><strong>Descripción:</strong> {viewStationData.description || '-'}</p>
          <div className="mb-3">
            {viewStationData.photo ? (
              <img
                src={viewStationData.photo}
                alt="Foto"
                style={{ width: '300px', objectFit: 'cover' }}
              />
            ) : (
              <span>Sin Foto</span>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={() => setViewStationModalOpen(false)}>
            Cerrar
          </button>
        </Modal.Footer>
      </Modal>

      {/* Modal de firma */}
      <Modal show={signModalOpen} onHide={handleSignModalCancel} size="lg">
        <Modal.Header closeButton>
          <Modal.Title>Firmar Inspección</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {/* Firma del Técnico */}
          <div className="mb-4 text-center">
            <h5 className="mb-3">Firma del Técnico</h5>
            <div className="position-relative text-center">
              <SignatureCanvas
                ref={sigCanvasTech}
                penColor="black"
                canvasProps={{
                  width: isMobile ? 280 : 700,
                  height: 200,
                  className: "signature-canvas",
                }}
              />
              <XCircle
                className="position-absolute top-0 end-0 text-danger"
                size={24}
                style={{ cursor: "pointer" }}
                title="Limpiar Firma Técnico"
                onClick={handleClearTechSignature}
                disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
              />
            </div>
            <div className="mt-4 text-center">
              <h6>Datos del Técnico</h6>
              <p><strong>Nombre:</strong> {storedUserInfo?.name || 'No disponible'} {storedUserInfo?.lastname}</p>
              <p><strong>Cédula:</strong> {storedUserInfo?.id_usuario || 'No disponible'}</p>
              <p><strong>Cargo:</strong> {userRol || 'No disponible'}</p>
            </div>
          </div>

          {/* Firma del Cliente */}
          <div className="mb-4 text-center">
            <h5 className="mb-3">Firma del Cliente</h5>
            <div className="col-12 position-relative text-center">
              <SignatureCanvas
                ref={sigCanvasClient}
                penColor="black"
                canvasProps={{
                  width: isMobile ? 280 : 700,
                  height: 200,
                  className: "signature-canvas",
                }}
              />
              <XCircle
                className="position-absolute top-0 end-0 text-danger"
                size={24}
                style={{ cursor: "pointer" }}
                title="Limpiar Firma Cliente"
                onClick={handleClearClientSignature}
                disabled={techSignaturePreview && clientSignaturePreview && userRol === 'Técnico'}
              />
            </div>
          </div>

          {/* Datos adicionales */}
          <div className="row justify-content-center" style={{ minHeight: 0, height: 'auto' }}>
            <div className="col-md-4 mt-1 text-center">
              <h5 className="mb-3">Datos del Cliente</h5>
              <input
                type="text"
                className="form-control mb-3"
                value={signData.name}
                onChange={(e) => handleSignDataChange("name", e.target.value)}
                placeholder="Nombre del cliente"
                required
              />
              <input
                type="number"
                className="form-control mb-3"
                value={signData.id}
                onChange={(e) => handleSignDataChange("id", e.target.value)}
                placeholder="Cédula"
                required
              />
              <input
                type="text"
                className="form-control"
                value={signData.position}
                onChange={(e) => handleSignDataChange("position", e.target.value)}
                placeholder="Cargo"
                required
              />
            </div>
          </div>
        </Modal.Body>
        <Modal.Footer>
          <button className="btn btn-secondary" onClick={handleSignModalCancel}>
            Cancelar
          </button>
          <button
            className="btn btn-success"
            onClick={() => {
              // Validación de firmas
              if (sigCanvasTech.current.isEmpty() || sigCanvasClient.current.isEmpty()) {
                showNotification("Ambas firmas (Técnico y Cliente) son obligatorias.");
                return;
              }

              // Validación de campos del cliente
              if (!signData.name.trim() || !signData.id.trim() || !signData.position.trim()) {
                showNotification("Todos los campos del cliente (Nombre, Cédula, Cargo) son obligatorios.");
                return;
              }

              // Guardar las firmas y los datos del cliente
              handleSaveSignature();
              setSignData((prevData) => ({
                ...prevData,
                name: signData.name.trim(),
                id: signData.id.trim(),
                position: signData.position.trim(),
              }));
              showNotification('Firmas y datos guardados correctamente.');
              handleSignModalClose();
            }}
          >
            Guardar Firmas
          </button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={notification.show}
        centered
        onHide={() => setNotification({ show: false, message: '' })}
        backdrop="static"
        keyboard={false}
      >
        <Modal.Body className="text-center">
          <p>{notification.message}</p>
        </Modal.Body>
      </Modal>

      <Modal show={confirmDelete.show} onHide={handleCloseConfirmDelete} centered>
        <Modal.Header closeButton>
          <Modal.Title>Confirmar Eliminación</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          ¿Estás seguro de que deseas eliminar este hallazgo?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseConfirmDelete}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteFinding}>
            Eliminar
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal show={qrScannerOpen} onHide={() => setQrScannerOpen(false)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Escanear Código QR</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <QrScannerComponent onScan={handleQrScan} />
        </Modal.Body>
      </Modal>

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
                  const response = await api.post("/PrefirmarArchivosPDF", {
                    url: selectedDocument.document_url,
                  });

                  if (response.data.signedUrl) {
                    setPdfUrl(response.data.signedUrl);
                    setShowModal(true);
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
                  const { data } = await api.post("/PrefirmarArchivosPDF", {
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
                const company = (serviceData?.company || "").toLowerCase();
                let endpoint = "/enviar-acta-por-correo-otro";               // valor por defecto

                if (company === "fumiplagax") {
                  endpoint = "/enviar-acta-por-correo";
                } else if (company === "control") {
                  endpoint = "/enviar-acta-por-correo-control";
                }

                /* ─── 3. Enviar solicitud ───────────────────────────── */
                const sendResponse = await api.post(endpoint, payload);

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
        show={showModal}
        onHide={() => setShowModal(false)}
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
            zIndex: 1050,
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

export default Inspection;
