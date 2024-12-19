import React, { useState, useEffect } from "react";
import { Form, Button } from "react-bootstrap";

const TemplateSelector = ({ onTemplateSelect }) => {
  const [templates, setTemplates] = useState([]);
  const [selectedTemplate, setSelectedTemplate] = useState("");

  // Cargar las plantillas disponibles al montar el componente
  useEffect(() => {
    const fetchTemplates = async () => {
      try {
        const response = await fetch("http://localhost:10000/api/get-templates");
        if (response.ok) {
          const data = await response.json();
          setTemplates(data.templates);
        } else {
          console.error("Error al obtener las plantillas");
        }
      } catch (error) {
        console.error("Error al conectar con el servidor:", error);
      }
    };

    fetchTemplates();
  }, []);

  const handleTemplateChange = (event) => {
    setSelectedTemplate(event.target.value);
  };

  const handleSelectClick = () => {
    if (selectedTemplate) {
      onTemplateSelect(selectedTemplate);
    } else {
      alert("Por favor selecciona una plantilla");
    }
  };

  return (
    <div className="template-selector">
      <Form>
        <Form.Group controlId="templateSelect">
          <Form.Label>Seleccionar Plantilla</Form.Label>
          <Form.Control
            as="select"
            value={selectedTemplate}
            onChange={handleTemplateChange}
          >
            <option value="">-- Selecciona una plantilla --</option>
            {templates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.nombre}
              </option>
            ))}
          </Form.Control>
        </Form.Group>
        <Button
          variant="primary"
          className="mt-3"
          onClick={handleSelectClick}
        >
          Seleccionar
        </Button>
      </Form>
    </div>
  );
};

export default TemplateSelector;
