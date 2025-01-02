import React, { useState, useEffect } from "react";
import { Button, Form, Row, Col, Card, Table } from "react-bootstrap";

const DocumentConfigurator = ({ selectedTemplateId, selectedEntity }) => {
  const [templateData, setTemplateData] = useState(null);
  const [variableMappings, setVariableMappings] = useState({});
  const [sourceOptions, setSourceOptions] = useState({});
  const [showSourceDropdown, setShowSourceDropdown] = useState({});
  const [fieldOptions, setFieldOptions] = useState({});
  const [selectedField, setSelectedField] = useState({});
  const [selectedSource, setSelectedSource] = useState({});
  const [intermediateSelection, setIntermediateSelection] = useState({});
  const [serviceTypeSelection, setServiceTypeSelection] = useState({});
  const [tableData, setTableData] = useState({});
  const [tableSourceOptions, setTableSourceOptions] = useState({});
  const [tableShowSourceDropdown, setTableShowSourceDropdown] = useState({});
  const [tableFieldOptions, setTableFieldOptions] = useState({});
  const [tableSelectedSource, setTableSelectedSource] = useState({});
  const [tableSelectedField, setTableSelectedField] = useState({});
  const [tableIntermediateSelection, setTableIntermediateSelection] = useState({});
  const [tableServiceTypeSelection, setTableServiceTypeSelection] = useState({});

  // Mapear las columnas de "clients" a nombres en español
  const clientFields = [
    { label: "Nombre", value: "name" },
    { label: "Dirección", value: "address" },
    { label: "Teléfono", value: "phone" },
    { label: "Correo Electrónico", value: "email" },
    { label: "Representante", value: "representative" },
    { label: "Tipo de Documento", value: "document_type" },
    { label: "Número de Documento", value: "document_num1" },
    { label: "Nombre de Contacto", value: "contact_name" },
    { label: "Teléfono de Contacto", value: "contact_phone" },
    { label: "RUT", value: "rut" },
    { label: "Latitud", value: "latitude" },
    { label: "Longitud", value: "longitude" },
    { label: "Departamento", value: "department" },
    { label: "Ciudad", value: "city" },
  ];

  const responsibleFields = [
    { label: "Nombre", value: "name" },
    { label: "Apellido", value: "lastname" },
    { label: "Teléfono", value: "phone" },
    { label: "Correo Electrónico", value: "email" },
    { label: "Foto", value: "image" },
    { label: "Documento", value: "id" },
  ];

  const stationFields = [
    { label: "Descripción", value: "description" },
    { label: "Categoría", value: "category" },
    { label: "Tipo", value: "type" },
    { label: "Método de Control", value: "control_method" },
    { label: "ID del Cliente", value: "client_id" },
    { label: "Código QR", value: "qr_code" },
  ];
  
  // Mapeo de columnas para "Mapas"
  const mapFields = [
    { label: "Descripción", value: "description" },
    { label: "Imagen", value: "image" },
  ];

  const serviceFields = [
    { label: "ID", value: "id" },
    { label: "Tipo de Servicio", value: "service_type" },
    { label: "Descripción", value: "description" },
    { label: "Plaga a Controlar", value: "pest_to_control" },
    { label: "Área de Intervención", value: "intervention_are" },
    { label: "Responsable", value: "responsible" },
    { label: "Categoría", value: "category" },
    { label: "Cantidad por Mes", value: "quantity_per_month" },
    { label: "ID del Cliente", value: "client_id" },
    { label: "Valor", value: "value" },
    { label: "Compañero", value: "companion" },
    { label: "Creado Por", value: "created_by" },
    { label: "Fecha de Creación", value: "created_at" },
  ];  

  const getInspectionFields = (serviceType) => {
    const commonFields = [
      { label: "ID", value: "id" },
      { label: "Fecha", value: "date" },
      { label: "Hora", value: "time" },
      { label: "Duración", value: "duration" },
      { label: "Observaciones", value: "observations" },
      { label: "ID del Servicio", value: "service_id" },
      { label: "Hora de Salida", value: "exit_time" },
      { label: "Tipo de Inspección", value: "inspection_type" },
      { label: "Subtipo de Inspección", value: "inspection_sub_" },
      { label: "Responsable", value: "findings_signatures_technician_name" },
      { label: "Cédula del Responsable", value: "findings_signatures_technician_id" },
      { label: "Firma del Técnico", value: "findings_signatures_technician_signature" },
      { label: "Firma del Cliente", value: "findings_signatures_client_signature" },
      { label: "Nombre del Cliente", value: "findings_signatures_client_name" },
      { label: "Cédula Cliente", value: "findings_signatures_client_id" },
      { label: "Cargo", value: "findings_signatures_client_position" },
      { label: "Hallazgos (Todo)", value: "findings_all" },
      { label: "Lugar Hallazgo", value: "findings_findingsByType_place" },
      { label: "Descripción Hallazgo", value: "findings_findingsByType_description" },
      { label: "Foto Hallazgo", value: "findings_findingsByType_photo" },
      { label: "Producto", value: "findings_productsByType_product" },
      { label: "Dosificación", value: "findings_productsByType_dosage" },
    ];
  
    const stationDesratizacion = [
      { label: "Finalidad Estación", value: "findings_stationsFindings_Roedores_purpose" },
      { label: "Cantidad Consumo Estación", value: "findings_stationsFindings_Roedores_consumptionAmount" },
      { label: "Cantidad de Capturas Estación", value: "findings_stationsFindings_Roedores_captureQuantity" },
      { label: "Estación Señalizada", value: "findings_stationsFindings_Roedores_marked" },
      { label: "Estado Físico Estación", value: "findings_stationsFindings_Roedores_physicalState" },
      { label: "Lugar del Daño", value: "findings_stationsFindings_Roedores_damageLocation" },
      { label: "¿Requiere Cambio?", value: "findings_stationsFindings_Roedores_requiresChange" },
      { label: "¿Prioridad de Cambio?", value: "findings_stationsFindings_Roedores_changePriority" },
      { label: "Descripción Hallazgo Estación", value: "findings_stationsFindings_Roedores_description" },
      { label: "Fotografía Hallazgo Estación", value: "findings_stationsFindings_Roedores_photo" },
    ];
  
    const stationDesinsectacion = [
      { label: "Cantidad de Capturas Estación", value: "findings_stationsFindings_Aéreas_captureQuantity" },
      { label: "Estado Físico Estación", value: "findings_stationsFindings_Aéreas_physicalState" },
      { label: "Lugar del Daño", value: "findings_stationsFindings_Aéreas_damageLocation" },
      { label: "¿Requiere Cambio?", value: "findings_stationsFindings_Aéreas_requiresChange" },
      { label: "¿Prioridad de Cambio?", value: "findings_stationsFindings_Aéreas_changePriority" },
      { label: "Descripción Estación", value: "findings_stationsFindings_Aéreas_description" },
      { label: "Fotografía Hallazgo Estación", value: "findings_stationsFindings_Aéreas_photo" },
    ];

    const allStation = [
      { label: "Finalidad Estación", value: "findings_stationsFindings_all_purpose" },
      { label: "Cantidad Consumo Estación", value: "findings_stationsFindings_all_consumptionAmount" },
      { label: "Cantidad de Capturas Estación", value: "findings_stationsFindings_all_captureQuantity" },
      { label: "Estación Señalizada", value: "findings_stationsFindings_all_marked" },
      { label: "Estado Físico Estación", value: "findings_stationsFindings_all_physicalState" },
      { label: "Lugar del Daño", value: "findings_stationsFindings_all_damageLocation" },
      { label: "¿Requiere Cambio?", value: "findings_stationsFindings_all_requiresChange" },
      { label: "¿Prioridad de Cambio?", value: "findings_stationsFindings_all_changePriority" },
      { label: "Descripción Hallazgo Estación", value: "findings_stationsFindings_all_description" },
      { label: "Fotografía Hallazgo Estación", value: "findings_stationsFindings_all_photo" },
    ];
  
    // Condicional para agregar campos de estaciones
    if (serviceType === "Desratización") {
      return [...commonFields, ...stationDesratizacion];
    } else if (serviceType === "Desinsectación") {
      return [...commonFields, ...stationDesinsectacion];
    } else if (serviceType === "all") {
      return [...commonFields,...allStation];
    } else {
      return commonFields; // Sin estaciones
    }
  };
  
  useEffect(() => {
    const fetchTemplateDetails = async () => {
      if (!selectedTemplateId) return;

      try {
        const response = await fetch(
          `http://localhost:10000/api/get-template/${selectedTemplateId}`
        );
        if (response.ok) {
          const data = await response.json();
          setTemplateData(data.plantilla);
          initializeMappings(data.plantilla.datos.variables);
          initializeTables(data.plantilla.datos.tablas || []);
        } else {
          console.error("Error al obtener detalles de la plantilla");
        }
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
      }
    };

    fetchTemplateDetails();
  }, [selectedTemplateId]);

  // Inicializa variables
  const initializeMappings = (variables) => {
    const mappings = {};
    variables.forEach((variable) => {
      mappings[variable.nombre] = "";
    });
    setVariableMappings(mappings);
  };

  // Inicializa tablas
  const initializeTables = (tables) => {
    const tablesState = {};
    tables.forEach((table) => {
      // Normalizar encabezado
      const normalizedHeaders = table.encabezado?.detalles.map((item) => {
        if (Array.isArray(item)) {
          return item; // Si ya es un array, lo deja intacto
        } else if (item?.cells) {
          return item.cells; // Si es un objeto, extrae los 'cells'
        } else {
          return []; // Default si no es ninguno
        }
      }) || [[]];
  
      tablesState[table.nombre] = {
        encabezado: normalizedHeaders,
        cuerpo: table.cuerpo?.detalles || [[]], // Garantiza que cuerpo siempre sea un array válido
      };
    });
    setTableData(tablesState);
  };
  

  const handleFuenteClick = (variable) => {
    let options = [
      "Cliente",
      "Estaciones Aéreas",
      "Estaciones Roedores",
      "Mapas",
      "Servicios",
      "Inspecciones",
    ];
  
    // Ajustar opciones si la entidad es "Servicio"
    if (selectedEntity === "servicio") {
      options = ["Servicio", "Inspecciones", "Responsable", "Acompañante", "Cliente"];
    }
    else if (selectedEntity === "inspeccion") {
      options = ["Inspección", "Servicio", "Responsable", "Acompañante", "Cliente"];
    }
  
    setSourceOptions((prev) => ({ ...prev, [variable]: options }));
    setShowSourceDropdown((prev) => ({ ...prev, [variable]: true }));
  };
  

  const handleTableFuenteClick = (tableName, rowIndex, colIndex) => {
    const key = `${tableName}_${rowIndex}_${colIndex}`;
    let options = [
      "Cliente",
      "Estaciones Aéreas",
      "Estaciones Roedores",
      "Mapas",
      "Servicios",
      "Inspecciones",
    ];
  
    // Ajustar opciones si la entidad es "Servicio"
    if (selectedEntity === "servicio") {
      options = ["Servicio", "Inspecciones", "Responsable", "Acompañante", "Cliente"];
    } else if (selectedEntity === "inspeccion") {
      options = ["Inspección", "Servicio", "Responsable", "Acompañante", "Cliente"];
    }
  
    setTableSourceOptions((prev) => ({ ...prev, [key]: options }));
    setTableShowSourceDropdown((prev) => ({ ...prev, [key]: true }));
  };  
  

  const handleSourceSelect = (variable, source) => {
    setSelectedSource((prev) => ({ ...prev, [variable]: source }));
  
    if (source === "Inspecciones") {
      setFieldOptions((prev) => ({ ...prev, [variable]: getInspectionFields("") })); // Por defecto sin filtro
      setIntermediateSelection((prev) => ({ ...prev, [variable]: "" })); // Reset período
      setServiceTypeSelection((prev) => ({ ...prev, [variable]: "" })); // Reset subtipo
    } else if (source === "Inspección") {
      setFieldOptions((prev) => ({ ...prev, [variable]: getInspectionFields("") }));
      setServiceTypeSelection((prev) => ({ ...prev, [variable]: "" })); // Reset subtipo
    } else if (source === "Servicios") {
      // Opciones de campos para Servicios
      setFieldOptions((prev) => ({ ...prev, [variable]: serviceFields }));
      setIntermediateSelection((prev) => ({ ...prev, [variable]: "" })); // Reset período
      setServiceTypeSelection((prev) => ({ ...prev, [variable]: "" })); // Reset tipo de servicio
    } else if (source === "Servicio") {
      // Opciones de campos para Servicios
      setFieldOptions((prev) => ({ ...prev, [variable]: serviceFields }));
    } else if (source === "Cliente") {
      // Opciones de campos para Cliente
      setFieldOptions((prev) => ({ ...prev, [variable]: clientFields }));
    } else if (source === "Responsable") {
      // Opciones de campos para Responsable
      setFieldOptions((prev) => ({ ...prev, [variable]: responsibleFields }));
    } else if (source === "Acompañante") {
      // Opciones de campos para Acompañante
      setFieldOptions((prev) => ({ ...prev, [variable]: responsibleFields }));
    } else if (source === "Estaciones Aéreas" || source === "Estaciones Roedores") {
      // Opciones de campos para Estaciones
      setFieldOptions((prev) => ({ ...prev, [variable]: stationFields }));
    } else if (source === "Mapas") {
      // Opciones de campos para Mapas
      setFieldOptions((prev) => ({ ...prev, [variable]: mapFields }));
    } else {
      // Fuente sin campos específicos
      setFieldOptions((prev) => ({ ...prev, [variable]: [] }));
    }
  };

  const handleTableSourceSelect = (tableName, rowIndex, colIndex, source) => {
    const key = `${tableName}_${rowIndex}_${colIndex}`;
    setTableSelectedSource((prev) => ({ ...prev, [key]: source }));
  
    if (source === "Inspecciones") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: getInspectionFields("") }));
      setTableIntermediateSelection((prev) => ({ ...prev, [key]: "" })); // Reset período
      setTableServiceTypeSelection((prev) => ({ ...prev, [key]: "" })); // Reset subtipo
    } else if (source === "Inspección") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: getInspectionFields("") }));
    } else if (source === "Servicios") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: serviceFields }));
      setTableIntermediateSelection((prev) => ({ ...prev, [key]: "" }));
      setTableServiceTypeSelection((prev) => ({ ...prev, [key]: "" }));
    } else if (source === "Servicio") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: serviceFields }));
    } else if (source === "Cliente") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: clientFields }));
    } else if (source === "Responsable") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: responsibleFields }));
    } else if (source === "Acompañante") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: responsibleFields }));
    } else if (source === "Estaciones Aéreas" || source === "Estaciones Roedores") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: stationFields })); // Asignar campos de estaciones
    } else if (source === "Mapas") {
      setTableFieldOptions((prev) => ({ ...prev, [key]: mapFields })); // Asignar campos de mapas
    } else {
      setTableFieldOptions((prev) => ({ ...prev, [key]: [] })); // Fuente sin campos
    }
  };  

  const handleTableIntermediateSelect = (tableName, rowIndex, colIndex, selection) => {
    const key = `${tableName}_${rowIndex}_${colIndex}`;
    setTableIntermediateSelection((prev) => ({ ...prev, [key]: selection }));
  };
  
  const handleTableServiceTypeSelect = (tableName, rowIndex, colIndex, serviceType) => {
    const key = `${tableName}_${rowIndex}_${colIndex}`;
    setTableServiceTypeSelection((prev) => ({ ...prev, [key]: serviceType }));
  
    // Actualizar dinámicamente los campos según el tipo de servicio seleccionado
    if (tableSelectedSource[key] === "Inspecciones") {
      const updatedFields = getInspectionFields(serviceType);
      setTableFieldOptions((prev) => ({ ...prev, [key]: updatedFields }));
    } else if (tableSelectedSource[key] === "Inspección") {
      const updatedFields = getInspectionFields(serviceType);
      setTableFieldOptions((prev) => ({ ...prev, [key]: updatedFields }));
    }
  };  
  
  const handleServiceTypeSelect = (variable, serviceType) => {
    setServiceTypeSelection((prev) => ({ ...prev, [variable]: serviceType }));
  
    // Actualizar dinámicamente los campos según el tipo de inspección seleccionado
    if (selectedSource[variable] === "Inspecciones") {
      const updatedFields = getInspectionFields(serviceType);
      setFieldOptions((prev) => ({ ...prev, [variable]: updatedFields }));
    } else if (selectedSource[variable] === "Inspección") {
      const updatedFields = getInspectionFields(serviceType);
      setFieldOptions((prev) => ({ ...prev, [variable]: updatedFields }));
    }
  };

  const handleTableFieldSelect = (tableName, rowIndex, colIndex, field) => {
    const key = `${tableName}_${rowIndex}_${colIndex}`;
    const source = tableSelectedSource[key] || "";
    const period = tableIntermediateSelection[key] || "all";
    const serviceType = tableServiceTypeSelection[key] || "all";
  
    let combinedValue = `${source}-${field}`;
  
    // Agregar período y tipo de servicio si la fuente es "Inspecciones" o "Servicios"
    if (source === "Inspecciones" || source === "Inspección" || source === "Servicios") {
      combinedValue = `${source}-${period}-${serviceType}-${field}`;
    }
  
    setTableData((prevTables) => {
      const updatedTable = { ...prevTables[tableName] };
      updatedTable.cuerpo[rowIndex][colIndex] = combinedValue;
  
      return { ...prevTables, [tableName]: updatedTable };
    });
  
    setTableSelectedField((prev) => ({ ...prev, [key]: field }));
  };   
  
  const handleIntermediateSelect = (variable, selection) => {
    setIntermediateSelection((prev) => ({ ...prev, [variable]: selection }));
  };  

  const handleFieldSelect = (variable, field) => {
    const source = selectedSource[variable];
    const period = intermediateSelection[variable] || "all";
    const serviceType = serviceTypeSelection[variable] || "all";
    let combinedValue = `${source}-${field}`;
  
    // Incluir el período y tipo si la fuente es "Inspecciones" o "Servicios"
    if (source === "Inspecciones" || source === "Inspección" || source === "Servicios") {
      combinedValue = `${source}-${period}-${serviceType}-${field}`;
    }
  
    setVariableMappings((prevMappings) => ({
      ...prevMappings,
      [variable]: combinedValue,
    }));
  
    setSelectedField((prev) => ({ ...prev, [variable]: field }));
  };  

  // Manejar cambios en la tabla
  const handleTableCellChange = (tableName, rowIndex, colIndex, value) => {
    setTableData((prevTables) => {
      const updatedTable = { ...prevTables[tableName] };
      updatedTable.cuerpo[rowIndex][colIndex] = value;

      return { ...prevTables, [tableName]: updatedTable };
    });
  };

  // Guardar configuración
const handleSaveConfiguration = async () => {
    // Preparar las tablas con el tipo incluido
    const preparedTables = Object.entries(tableData).map(([tableName, tableInfo]) => ({
      nombre: tableName,
      tipo: tableInfo.tipo || "Estática",
      orientacion: tableInfo.orientacion || null,
      encabezado: tableInfo.encabezado,
      cuerpo: tableInfo.cuerpo,
    }));
  
    const configuration = {
      templateId: selectedTemplateId,
      entity: selectedEntity,
      variables: variableMappings,
      tablas: preparedTables,
    };
  
    try {
      const response = await fetch("http://localhost:10000/api/save-configuration", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(configuration),
      });
  
      if (!response.ok) {
        throw new Error(`Error al guardar configuración: ${response.statusText}`);
      }
  
      const data = await response.json();
  
      console.log("Configuración guardada en el servidor:", data);
      alert("Configuración guardada correctamente");
    } catch (error) {
      console.error("Error al enviar la configuración:", error);
      alert("Ocurrió un error al guardar la configuración. Por favor, intenta nuevamente.");
    }
  };  

  if (!templateData) {
    return <p className="text-center mt-4">Selecciona una plantilla para comenzar la configuración.</p>;
  }

  return (
    <div className="document-configurator mt-4">
      <Card>
        <Card.Header>
          <h4 className="text-center">Variables</h4>
        </Card.Header>
        <Card.Body>
          {templateData.datos.variables.map((variable) => (
            <Row key={variable.nombre} className="align-items-center mb-3" style={{height:'auto'}}>
              <Col sm={4}>
                <Form.Label>
                  <strong>{variable.nombre}</strong>
                </Form.Label>
              </Col>
              <Col sm={4}>
                <Form.Control
                  type="text"
                  placeholder={`Dato para ${variable.nombre}`}
                  value={variableMappings[variable.nombre] || ""}
                  readOnly
                  disabled
                />
              </Col>
              <Col sm={4} className="text-center">
                <Button
                  variant="info"
                  size="sm"
                  className="me-2"
                  onClick={() => handleFuenteClick(variable.nombre)}
                >
                  Fuente
                </Button>
              </Col>

              {/* Desplegable de fuente */}
              {showSourceDropdown[variable.nombre] && (
                <Col sm={12} className="mt-2">
                  <Form.Select
                    onChange={(e) => handleSourceSelect(variable.nombre, e.target.value)}
                    value={selectedSource[variable.nombre] || ""} // Mostrar la fuente seleccionada
                    >
                    <option value="">-- Selecciona una fuente --</option>
                    {sourceOptions[variable.nombre]?.map((option, index) => (
                        <option key={index} value={option}>
                        {option}
                        </option>
                    ))}
                  </Form.Select>
                </Col>
              )}

            {/* Selector intermedio si la fuente es "Servicios" o "Inspecciones" */}
            {(selectedSource[variable.nombre] === "Servicios" || selectedSource[variable.nombre] === "Inspecciones") && (
            <>
                <Col sm={12} className="mt-2">
                <Form.Select
                    onChange={(e) =>
                    handleIntermediateSelect(variable.nombre, e.target.value)
                    }
                    value={intermediateSelection[variable.nombre] || ""}
                >
                    <option value="">-- Selecciona un período --</option>
                    <option value="all">Todos</option>
                    <option value="this_year">Este año</option>
                    <option value="last_3_months">Últimos 3 meses</option>
                    <option value="last_month">Último mes</option>
                    <option value="this_week">Esta semana</option>
                </Form.Select>
                </Col>
                <Col sm={12} className="mt-2">
                <Form.Select
                    onChange={(e) =>
                    handleServiceTypeSelect(variable.nombre, e.target.value)
                    }
                    value={serviceTypeSelection[variable.nombre] || ""}
                >
                    <option value="">-- Selecciona un tipo de servicio --</option>
                    <option value="all">Todos</option>
                    <option value="Desinsectación">Desinsectación</option>
                    <option value="Desratización">Desratización</option>
                    <option value="Desinfección">Desinfección</option>
                    <option value="Roceria">Roceria</option>
                    <option value="Limpieza y aseo de archivos">
                    Limpieza y aseo de archivos
                    </option>
                    <option value="Lavado shut basura">Lavado shut basura</option>
                    <option value="Encarpado">Encarpado</option>
                    <option value="Lavado de tanque">Lavado de tanque</option>
                    <option value="Inspección">Inspección</option>
                    <option value="Diagnostico">Diagnostico</option>
                </Form.Select>
                </Col>
            </>
            )}

            {(selectedSource[variable.nombre] === "Inspección") && (
            <>
                <Col sm={12} className="mt-2">
                <Form.Select
                    onChange={(e) =>
                    handleServiceTypeSelect(variable.nombre, e.target.value)
                    }
                    value={serviceTypeSelection[variable.nombre] || ""}
                >
                    <option value="">-- Selecciona un tipo de servicio --</option>
                    <option value="all">Todos</option>
                    <option value="Desinsectación">Desinsectación</option>
                    <option value="Desratización">Desratización</option>
                    <option value="Desinfección">Desinfección</option>
                    <option value="Roceria">Roceria</option>
                    <option value="Limpieza y aseo de archivos">
                    Limpieza y aseo de archivos
                    </option>
                    <option value="Lavado shut basura">Lavado shut basura</option>
                    <option value="Encarpado">Encarpado</option>
                    <option value="Lavado de tanque">Lavado de tanque</option>
                    <option value="Inspección">Inspección</option>
                    <option value="Diagnostico">Diagnostico</option>
                </Form.Select>
                </Col>
            </>
            )}

              {/* Desplegable de campos específicos si selecciona "Cliente" */}
              {fieldOptions[variable.nombre] && (
                <Col sm={12} className="mt-2">
                    <Form.Select
                    onChange={(e) => handleFieldSelect(variable.nombre, e.target.value)}
                    value={selectedField[variable.nombre] || ""}
                    >
                    <option value="">-- Selecciona un campo --</option>
                    {fieldOptions[variable.nombre]?.map((field) => (
                        <option key={field.value} value={field.value}>
                        {field.label}
                        </option>
                    ))}
                    </Form.Select>
                </Col>
                )}
            </Row>
          ))}
        </Card.Body>
      </Card>

      {/* Nueva sección para Tablas */}
      {templateData.datos.tablas && (
        <Card className="mt-4">
          <Card.Header>
            <h4 className="text-center">Tablas</h4>
          </Card.Header>
          <Card.Body>
            {templateData.datos.tablas.map((table) => (
              <div key={table.nombre} className="mb-4">
                <Form.Group as={Row} className="mb-3" style={{ height: "auto" }}>
                <Col sm={2}>
                    <Form.Label>Tipo de Tabla</Form.Label>
                </Col>
                <Col sm={4}>
                    <Form.Select
                    onChange={(e) =>
                        setTableData((prevTables) => ({
                        ...prevTables,
                        [table.nombre]: {
                            ...prevTables[table.nombre],
                            tipo: e.target.value,
                            orientacion: e.target.value === "Dinámica" ? "Horizontal" : "", // Valor predeterminado
                        },
                        }))
                    }
                    value={tableData[table.nombre]?.tipo || "Estática"}
                    >
                    <option value="Estática">Estática</option>
                    <option value="Dinámica">Dinámica</option>
                    </Form.Select>
                </Col>

                {/* Selector de Orientación si es Dinámica */}
                {tableData[table.nombre]?.tipo === "Dinámica" && (
                    <>
                    <Col sm={2}>
                        <Form.Label>Orientación</Form.Label>
                    </Col>
                    <Col sm={4}>
                        <Form.Select
                        onChange={(e) =>
                            setTableData((prevTables) => ({
                            ...prevTables,
                            [table.nombre]: {
                                ...prevTables[table.nombre],
                                orientacion: e.target.value, // Guardar la orientación seleccionada
                            },
                            }))
                        }
                        value={tableData[table.nombre]?.orientacion || "Horizontal"}
                        >
                        <option value="Horizontal">Horizontal</option>
                        <option value="Vertical">Vertical</option>
                        </Form.Select>
                    </Col>
                    </>
                )}
                </Form.Group>
                <h5>{table.nombre}</h5>
                <Table bordered>
                  <thead>
                    <tr>
                     {tableData[table.nombre]?.encabezado[0]?.map((header, index) => (
                        <th key={index}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {tableData[table.nombre]?.cuerpo.map((row, rowIndex) => (
                      <tr key={rowIndex}>
                        {row.map((cell, colIndex) => (
                          <td key={colIndex}>
                          <div className="d-flex flex-column">
                            <div className="d-flex align-items-center">
                              <Form.Control
                                type="text"
                                value={tableData[table.nombre]?.cuerpo[rowIndex][colIndex] || ""}
                                readOnly
                              />
                              <Button
                                variant="info"
                                size="sm"
                                className="ms-2"
                                onClick={() =>
                                  handleTableFuenteClick(table.nombre, rowIndex, colIndex)
                                }
                              >
                                Fuente
                              </Button>
                            </div>
                        
                            {/* Selector de fuente */}
                            {tableShowSourceDropdown[`${table.nombre}_${rowIndex}_${colIndex}`] && (
                              <Form.Select
                                className="mt-2"
                                onChange={(e) =>
                                  handleTableSourceSelect(
                                    table.nombre,
                                    rowIndex,
                                    colIndex,
                                    e.target.value
                                  )
                                }
                                value={
                                  tableSelectedSource[`${table.nombre}_${rowIndex}_${colIndex}`] || ""
                                }
                              >
                                <option value="">-- Selecciona una fuente --</option>
                                {tableSourceOptions[`${table.nombre}_${rowIndex}_${colIndex}`]?.map(
                                  (option, index) => (
                                    <option key={index} value={option}>
                                      {option}
                                    </option>
                                  )
                                )}
                              </Form.Select>
                            )}
                        
                            {/* Selector intermedio para "Servicios" y "Inspecciones" */}
                            {(tableSelectedSource[`${table.nombre}_${rowIndex}_${colIndex}`] === "Servicios" ||
                              tableSelectedSource[`${table.nombre}_${rowIndex}_${colIndex}`] === "Inspecciones") && (
                              <>
                                {/* Selector de Período */}
                                <Form.Select
                                  className="mt-2"
                                  onChange={(e) =>
                                    handleTableIntermediateSelect(
                                      table.nombre,
                                      rowIndex,
                                      colIndex,
                                      e.target.value
                                    )
                                  }
                                  value={
                                    tableIntermediateSelection[`${table.nombre}_${rowIndex}_${colIndex}`] || ""
                                  }
                                >
                                  <option value="">-- Selecciona un período --</option>
                                  <option value="all">Todos</option>
                                  <option value="this_year">Este año</option>
                                  <option value="last_3_months">Últimos 3 meses</option>
                                  <option value="last_month">Último mes</option>
                                  <option value="this_week">Esta semana</option>
                                </Form.Select>
                        
                                {/* Selector de Tipo de Servicio */}
                                <Form.Select
                                  className="mt-2"
                                  onChange={(e) =>
                                    handleTableServiceTypeSelect(
                                      table.nombre,
                                      rowIndex,
                                      colIndex,
                                      e.target.value
                                    )
                                  }
                                  value={
                                    tableServiceTypeSelection[`${table.nombre}_${rowIndex}_${colIndex}`] || ""
                                  }
                                >
                                  <option value="">-- Selecciona un tipo de servicio --</option>
                                  <option value="all">Todos</option>
                                  <option value="Desinsectación">Desinsectación</option>
                                  <option value="Desratización">Desratización</option>
                                  <option value="Desinfección">Desinfección</option>
                                  <option value="Roceria">Roceria</option>
                                </Form.Select>
                              </>
                            )}

                            {/* Selector intermedio para "Inspección" */}
                            {(tableSelectedSource[`${table.nombre}_${rowIndex}_${colIndex}`] === "Inspección") && (
                              <>
                        
                                {/* Selector de Tipo de Servicio */}
                                <Form.Select
                                  className="mt-2"
                                  onChange={(e) =>
                                    handleTableServiceTypeSelect(
                                      table.nombre,
                                      rowIndex,
                                      colIndex,
                                      e.target.value
                                    )
                                  }
                                  value={
                                    tableServiceTypeSelection[`${table.nombre}_${rowIndex}_${colIndex}`] || ""
                                  }
                                >
                                  <option value="">-- Selecciona un tipo de servicio --</option>
                                  <option value="all">Todos</option>
                                  <option value="Desinsectación">Desinsectación</option>
                                  <option value="Desratización">Desratización</option>
                                  <option value="Desinfección">Desinfección</option>
                                  <option value="Roceria">Roceria</option>
                                </Form.Select>
                              </>
                            )}
                        
                            {/* Selector de campos */}
                            {tableFieldOptions[`${table.nombre}_${rowIndex}_${colIndex}`] && (
                              <Form.Select
                                className="mt-2"
                                onChange={(e) =>
                                  handleTableFieldSelect(
                                    table.nombre,
                                    rowIndex,
                                    colIndex,
                                    e.target.value
                                  )
                                }
                                value={
                                  tableSelectedField[`${table.nombre}_${rowIndex}_${colIndex}`] || ""
                                }
                              >
                                <option value="">-- Selecciona un campo --</option>
                                {tableFieldOptions[`${table.nombre}_${rowIndex}_${colIndex}`]?.map(
                                  (field) => (
                                    <option key={field.value} value={field.value}>
                                      {field.label}
                                    </option>
                                  )
                                )}
                              </Form.Select>
                            )}
                          </div>
                        </td>                                                                       
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </Table>
              </div>
            ))}
          </Card.Body>
        </Card>
      )}

      <div className="text-center mt-4">
        <Button variant="success" onClick={handleSaveConfiguration}>
          Guardar Configuración
        </Button>
      </div>
    </div>
  );
};

export default DocumentConfigurator;
