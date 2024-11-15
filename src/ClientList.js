import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, InputGroup, FormControl, Modal, Form } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import './ClientList.css';
import 'bootstrap/dist/css/bootstrap.min.css';
import '@fortawesome/fontawesome-free/css/all.min.css';

function ClientList() {
  const [clients, setClients] = useState([]);
  const [filteredClients, setFilteredClients] = useState([]); // Para almacenar los clientes filtrados
  const [searchText, setSearchText] = useState(''); // Estado para el texto de búsqueda
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [editingClient, setEditingClient] = useState(null);
  const [selectedClient, setSelectedClient] = useState(null);
  const [newClient, setNewClient] = useState({
    name: '',
    address: '',
    phone: '',
    email: '',
    representative: '',
    document_type: '',
    document_number: '',
    contact_name: '',
    contact_phone: '',
    rut: '',
  });

  const navigate = useNavigate();

  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await axios.get('http://localhost:10000/api/clients');
        setClients(response.data);
        setFilteredClients(response.data); // Inicialmente muestra todos los clientes
        setLoading(false);        
      } catch (error) {
        console.error("Error fetching clients:", error);
        setLoading(false);
      }
    };
    fetchClients();
  }, []);

  // Función para manejar el cambio en el campo de búsqueda
const handleSearch = (e) => {
  const text = e.target.value.toLowerCase();
  setSearchText(text);
  
  const filtered = clients.filter(client => 
    client.name.toLowerCase().includes(text) ||
    client.document_number.toLowerCase().includes(text) ||
    client.contact_name.toLowerCase().includes(text)
  );
  setFilteredClients(filtered);
};

  const handleShowModal = (client = null) => {
    setEditingClient(client);
    if (client) {
      setNewClient(client); // Si editamos, llenamos los datos del cliente seleccionado
    } else {
      setNewClient({
        name: '',
        address: '',
        phone: '',
        email: '',
        representative: '',
        document_type: '',
        document_number: '',
        contact_name: '',
        contact_phone: '',
        rut: '',
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingClient(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewClient({ ...newClient, [name]: value });
  };

  const handleAddOrEditClient = async () => {
    try {
      if (editingClient) {
        await axios.put(`http://localhost:10000/api/clients/${editingClient.id}`, newClient);
        setClients(clients.map((client) => (client.id === editingClient.id ? newClient : client)));
        alert("Cliente actualizado exitosamente");
      } else {
        const response = await axios.post('http://localhost:10000/api/clients', newClient);
        setClients([...clients, response.data.client]);
        alert("Cliente agregado exitosamente");
      }
      handleCloseModal();
    } catch (error) {
      console.error("Error al guardar el cliente:", error);
      alert("Hubo un error al guardar el cliente.");
    }
  };

  const deleteClient = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este cliente?")) {
      try {
        await axios.delete(`http://localhost:10000/api/clients/${id}`);
        setClients(clients.filter(client => client.id !== id));
        alert("Cliente eliminado exitosamente.");
      } catch (error) {
        console.error("Error al eliminar cliente:", error);
        alert("Hubo un error al eliminar el cliente.");
      }
    }
  };

  // Función para manejar la visualización del modal de detalles
  const handleShowDetails = (client) => {
  setSelectedClient(client);
  setShowDetailsModal(true);
  };

  const handleCloseDetailsModal = () => {
    setShowDetailsModal(false);
    setSelectedClient(null);
  };

  if (loading) return <div>Cargando clientes...</div>;

  return (
    <div className="container mt-4">
      <h2 className="mb-4" style={{ color: 'black' }}>Listado de Clientes</h2>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <InputGroup className="w-25">
        <FormControl 
  placeholder="Buscar" 
  aria-label="Buscar" 
  value={searchText}
  onChange={handleSearch} // Evento para manejar la búsqueda
/>
        </InputGroup>
        <Button variant="success" onClick={() => handleShowModal()}>
          Agregar Cliente
        </Button>
      </div>
  
      <div className="card-container">
      {filteredClients.map((client) => (
          <div
            key={client.id}
            className="client-card"
            onClick={() => handleShowDetails(client)}
            style={{ cursor: 'pointer' }}
          >
            <div className="map-placeholder">
            </div>
            <h5>{client.name}</h5>
            <p>{client.phone}</p>
            <div className="actions">
              <i
                className="fas fa-edit text-success"
                onClick={(e) => {
                  e.stopPropagation(); // Evita que el evento de clic abra los detalles
                  handleShowModal(client);
                }}
                style={{ cursor: 'pointer', fontSize: '1.2em' }}
                title="Editar"
              ></i>
              <i
                className="fas fa-trash text-danger"
                onClick={(e) => {
                  e.stopPropagation(); // Evita que el evento de clic abra los detalles
                  deleteClient(client.id);
                }}
                style={{ cursor: 'pointer', fontSize: '1.2em' }}
                title="Eliminar"
              ></i>
            </div>
          </div>
        ))}
      </div>
  
      {/* Modal para agregar/editar cliente */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingClient ? "Editar Cliente" : "Agregar Cliente"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formClientName" className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" name="name" value={newClient.name} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientAddress" className="mb-3">
              <Form.Label>Dirección</Form.Label>
              <Form.Control type="text" name="address" value={newClient.address} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientPhone" className="mb-3">
              <Form.Label>Teléfono</Form.Label>
              <Form.Control type="text" name="phone" value={newClient.phone} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientEmail" className="mb-3">
              <Form.Label>Correo</Form.Label>
              <Form.Control type="email" name="email" value={newClient.email} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientDocumentType" className="mb-3">
              <Form.Label>Tipo de Documento</Form.Label>
              <Form.Control type="text" name="document_type" value={newClient.document_type} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientDocumentNumber" className="mb-3">
              <Form.Label>Número de Documento</Form.Label>
              <Form.Control type="text" name="document_number" value={newClient.document_number} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientContactName" className="mb-3">
              <Form.Label>Nombre de Contacto</Form.Label>
              <Form.Control type="text" name="contact_name" value={newClient.contact_name} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientContactPhone" className="mb-3">
              <Form.Label>Teléfono de Contacto</Form.Label>
              <Form.Control type="text" name="contact_phone" value={newClient.contact_phone} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formClientRUT" className="mb-3">
              <Form.Label>RUT</Form.Label>
              <Form.Control type="text" name="rut" value={newClient.rut} onChange={handleInputChange} />
            </Form.Group>
          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleAddOrEditClient}>
            {editingClient ? "Guardar Cambios" : "Registrar Cliente"}
          </Button>
        </Modal.Footer>
      </Modal>

{/* Modal para mostrar detalles del cliente */}
<Modal show={showDetailsModal} onHide={handleCloseDetailsModal}>
  <Modal.Header closeButton>
    <Modal.Title>Detalles del Cliente</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    {selectedClient && (
      <div>
        <p><strong>Nombre:</strong> {selectedClient.name}</p>
        <p><strong>Dirección:</strong> {selectedClient.address}</p>
        <p><strong>Teléfono:</strong> {selectedClient.phone}</p>
        <p><strong>Correo:</strong> {selectedClient.email}</p>
        <p><strong>Tipo de Documento:</strong> {selectedClient.document_type}</p>
        <p><strong>Número de Documento:</strong> {selectedClient.document_number}</p>
        <p><strong>Nombre de Contacto:</strong> {selectedClient.contact_name}</p>
        <p><strong>Teléfono de Contacto:</strong> {selectedClient.contact_phone}</p>
        <p><strong>RUT:</strong> {selectedClient.rut}</p>
      </div>
    )}
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseDetailsModal}>Cerrar</Button>
    <Button variant="success" onClick={() => console.log("Agregar estación clickeado")}>
      Agregar Estación
    </Button>
  </Modal.Footer>
</Modal>
    </div>
  );  
}
export default ClientList;
