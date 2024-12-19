import React, { useState } from "react";
import TemplateSelector from "./TemplateSelector";
import DocumentConfigurator from "./DocumentConfigurator";

const DocumentAutomation = () => {
  const [selectedTemplateId, setSelectedTemplateId] = useState(null);
  const [selectedEntity, setSelectedEntity] = useState("");

  const handleTemplateSelect = (templateId) => {
    setSelectedTemplateId(templateId); // Establece la plantilla seleccionada
    setSelectedEntity(""); // Resetea la entidad al cambiar de plantilla
  };

  const handleEntitySelect = (event) => {
    setSelectedEntity(event.target.value);
  };

  return (
    <div className="document-automation">
      <h2>Automatización de Documentos</h2>
      
      {/* Mostrar el selector de plantillas */}
      <TemplateSelector onTemplateSelect={handleTemplateSelect} />

      {/* Mostrar el selector de entidad si hay una plantilla seleccionada */}
      {selectedTemplateId && (
        <div className="mt-4">
          <h3>Seleccionar Entidad</h3>
          <select
            className="form-control"
            value={selectedEntity}
            onChange={handleEntitySelect}
          >
            <option value="">-- Selecciona una entidad --</option>
            <option value="cliente">Cliente</option>
            <option value="usuario">Usuario</option>
            <option value="servicio">Servicio</option>
            <option value="inspeccion">Inspección</option>
          </select>
        </div>
      )}

      {/* Mostrar configurador si hay una plantilla y una entidad seleccionada */}
      {selectedTemplateId && selectedEntity && (
        <div className="mt-4">
          <h3>Configuración de Plantilla</h3>
          <DocumentConfigurator
            selectedTemplateId={selectedTemplateId}
            selectedEntity={selectedEntity}
          />
        </div>
      )}
    </div>
  );
};

export default DocumentAutomation;
