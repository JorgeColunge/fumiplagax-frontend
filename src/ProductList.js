import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Modal, Form } from 'react-bootstrap';
import { BsPencilSquare, BsTrash, BsEye, BsPlusCircle } from 'react-icons/bs';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // Nuevo estado para el modal de detalles
  const [editingProduct, setEditingProduct] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null); // Nuevo estado para el producto seleccionado  
  const [newProduct, setNewProduct] = useState({
    name: '',
    description_type: '',
    dose: '',
    residual_duration: '',
    safety_data_sheet: '',
    technical_sheet: '',
    health_registration: '',
    emergency_card: ''
  });

  const [safetyDataSheetFile, setSafetyDataSheetFile] = useState(null);
  const [technicalSheetFile, setTechnicalSheetFile] = useState(null);
  const [healthRegistrationFile, setHealthRegistrationFile] = useState(null);
  const [emergencyCardFile, setEmergencyCardFile] = useState(null);  

  const [pendingAlert, setPendingAlert] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:10000/api/products');
        setProducts(response.data);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);

  const handleShowModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setNewProduct(product);
    } else {
      setNewProduct({
        name: '',
        description_type: '',
        dose: '',
        residual_duration: '',
        safety_data_sheet: '',
        technical_sheet: '',
        health_registration: '',
        emergency_card: ''
      });
    }
    setShowModal(true);
  };

  const handleShowDetailModal = (product) => {
    setSelectedProduct(product);
    setShowDetailModal(true);
  };  

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedProduct(null);
  };  

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddOrEditProduct = async () => {
    // Muestra la primera alerta de "en breve"
    alert("El registro del producto estará listo en breve");

    // Cierra el modal
    handleCloseModal();

    try {
        const formData = new FormData();
        formData.append("name", newProduct.name);
        formData.append("description_type", newProduct.description_type);
        formData.append("dose", newProduct.dose);
        formData.append("residual_duration", newProduct.residual_duration);

        if (safetyDataSheetFile) formData.append("safety_data_sheet", safetyDataSheetFile);
        if (technicalSheetFile) formData.append("technical_sheet", technicalSheetFile);
        if (healthRegistrationFile) formData.append("health_registration", healthRegistrationFile);
        if (emergencyCardFile) formData.append("emergency_card", emergencyCardFile);

        let response;
        if (editingProduct) {
            response = await axios.put(
                `http://localhost:10000/api/products/${editingProduct.id}`,
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            setProducts(products.map((product) => (product.id === editingProduct.id ? response.data.product : product)));
        } else {
            response = await axios.post('http://localhost:10000/api/products', formData, {
                headers: { "Content-Type": "multipart/form-data" }
            });
            setProducts([...products, response.data.product]);
        }

        // Muestra la alerta de éxito una vez se complete el registro
        alert("El registro del producto se realizó con éxito");
    } catch (error) {
        console.error("Error al guardar el producto:", error);
        alert("Hubo un error al guardar el producto.");
    }
};

  const deleteProduct = async (id) => {
    if (window.confirm("¿Estás seguro de que deseas eliminar este producto?")) {
      try {
        await axios.delete(`http://localhost:10000/api/products/${id}`);
        setProducts(products.filter(product => product.id !== id));
        alert("Producto eliminado exitosamente.");
      } catch (error) {
        console.error("Error al eliminar producto:", error);
        alert("Hubo un error al eliminar el producto.");
      }
    }
  };

  if (loading) return <div>Cargando productos...</div>;

  const groupedProducts = products.reduce((acc, product) => {
    const { description_type } = product;
    if (!acc[description_type]) acc[description_type] = [];
    acc[description_type].push(product);
    return acc;
  }, {});

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Productos</h2>

      <Button variant="primary" className="mb-4" onClick={() => handleShowModal()}>
        Agregar Producto
      </Button>
      {pendingAlert && (
    <div className="alert alert-info">
        El registro del producto estará listo en breve
    </div>
)}

      <div className="row">
        {Object.keys(groupedProducts).map(descriptionType => (
          <div key={descriptionType} className="col-md-4 mb-4">
  <h4>{descriptionType || "Sin Tipo de Descripción"}</h4>
  {groupedProducts[descriptionType].map((product) => (
    <Card key={product.id} className="mb-3" onClick={() => handleShowDetailModal(product)} style={{ cursor: 'pointer' }}>
<Card.Body className="d-flex flex-column align-items-center position-relative" style={{ height: '250px' }}>
  <div className="text-center mb-4">
    <Card.Title>{product.name}</Card.Title>
    <Card.Text>
      <strong>Dosis:</strong> {product.dose}<br />
      <strong>Duración Residual:</strong> {product.residual_duration}
    </Card.Text>
  </div>
  <div className="position-absolute bottom-0 end-0 mb-2 me-2">
    <Button variant="link" size="sm" onClick={(event) => { event.stopPropagation(); handleShowModal(product); }}>
      <BsPencilSquare style={{ color: 'green', fontSize: '1.5em' }} />
    </Button>
    <Button variant="link" size="sm" onClick={(event) => { event.stopPropagation(); deleteProduct(product.id); }}>
      <BsTrash style={{ color: 'red', fontSize: '1.5em' }} />
    </Button>
  </div>
</Card.Body>
</Card>
  ))}
</div>
        ))}
      </div>

      {/* Modal para agregar/editar producto */}
      <Modal show={showModal} onHide={handleCloseModal}>
        <Modal.Header closeButton>
          <Modal.Title>{editingProduct ? "Editar Producto" : "Agregar Producto"}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form>
            <Form.Group controlId="formName" className="mb-3">
              <Form.Label>Nombre</Form.Label>
              <Form.Control type="text" name="name" value={newProduct.name} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formDescriptionType" className="mb-3">
              <Form.Label>Tipo de Descripción</Form.Label>
              <Form.Control type="text" name="description_type" value={newProduct.description_type} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formDose" className="mb-3">
              <Form.Label>Dosis</Form.Label>
              <Form.Control type="text" name="dose" value={newProduct.dose} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formResidualDuration" className="mb-3">
              <Form.Label>Duración Residual</Form.Label>
              <Form.Control type="text" name="residual_duration" value={newProduct.residual_duration} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formSafetyDataSheet" className="mb-3 d-flex align-items-center flex-column">
  <div className="d-flex w-100 align-items-center">
    <Form.Label className="me-2">Hoja de Datos de Seguridad</Form.Label>
    <div className="ms-auto d-flex justify-content-end">
      {/* Botón para cargar archivo */}
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => {
          setSafetyDataSheetFile(e.target.files[0]);
          setNewProduct({ ...newProduct, safety_data_sheet: e.target.files[0]?.name || '' });
        }}
        style={{ display: 'none' }}
        id="safetyDataSheetFileInput"
      />
      <Button variant="link" size="sm" onClick={() => document.getElementById('safetyDataSheetFileInput').click()}>
        <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
      </Button>
      {/* Botón para ver el archivo */}
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          if (newProduct.safety_data_sheet) {
            window.open(newProduct.safety_data_sheet, '_blank');
          } else {
            alert("No hay Hoja de Datos de Seguridad disponible.");
          }
        }}
      >
        <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
      </Button>
      {/* Botón para eliminar el archivo */}
      <Button
        variant="link"
        size="sm"
        onClick={() => {
          setSafetyDataSheetFile(null);
          setNewProduct({ ...newProduct, safety_data_sheet: '' });
          alert("Hoja de Datos de Seguridad eliminada.");
        }}
      >
        <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
      </Button>
    </div>
  </div>
  {/* Mostrar nombre del archivo si existe */}
  <small className="text-muted mt-1">
    {newProduct.safety_data_sheet || 'Sin archivo seleccionado'}
  </small>
</Form.Group>

<Form.Group controlId="formTechnicalSheet" className="mb-3 d-flex align-items-center flex-column">
  <div className="d-flex w-100 align-items-center">
    <Form.Label className="me-2">Ficha Técnica</Form.Label>
    <div className="ms-auto d-flex justify-content-end">
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => {
          setTechnicalSheetFile(e.target.files[0]);
          setNewProduct({ ...newProduct, technical_sheet: e.target.files[0]?.name || '' });
        }}
        style={{ display: 'none' }}
        id="technicalSheetFileInput"
      />
      <Button variant="link" size="sm" onClick={() => document.getElementById('technicalSheetFileInput').click()}>
        <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => newProduct.technical_sheet && window.open(newProduct.technical_sheet, '_blank')}>
        <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => {
        setTechnicalSheetFile(null);
        setNewProduct({ ...newProduct, technical_sheet: '' });
      }}>
        <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
      </Button>
    </div>
  </div>
  <small className="text-muted mt-1">{newProduct.technical_sheet || 'Sin archivo seleccionado'}</small>
</Form.Group>

<Form.Group controlId="formHealthRegistration" className="mb-3 d-flex align-items-center flex-column">
  <div className="d-flex w-100 align-items-center">
    <Form.Label className="me-2">Registro Sanitario</Form.Label>
    <div className="ms-auto d-flex justify-content-end">
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => {
          setHealthRegistrationFile(e.target.files[0]);
          setNewProduct({ ...newProduct, health_registration: e.target.files[0]?.name || '' });
        }}
        style={{ display: 'none' }}
        id="healthRegistrationFileInput"
      />
      <Button variant="link" size="sm" onClick={() => document.getElementById('healthRegistrationFileInput').click()}>
        <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => newProduct.health_registration && window.open(newProduct.health_registration, '_blank')}>
        <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => {
        setHealthRegistrationFile(null);
        setNewProduct({ ...newProduct, health_registration: '' });
      }}>
        <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
      </Button>
    </div>
  </div>
  <small className="text-muted mt-1">{newProduct.health_registration || 'Sin archivo seleccionado'}</small>
</Form.Group>

<Form.Group controlId="formEmergencyCard" className="mb-3 d-flex align-items-center flex-column">
  <div className="d-flex w-100 align-items-center">
    <Form.Label className="me-2">Tarjeta de Emergencia</Form.Label>
    <div className="ms-auto d-flex justify-content-end">
      <input
        type="file"
        accept=".pdf,.doc,.docx"
        onChange={(e) => {
          setEmergencyCardFile(e.target.files[0]);
          setNewProduct({ ...newProduct, emergency_card: e.target.files[0]?.name || '' });
        }}
        style={{ display: 'none' }}
        id="emergencyCardFileInput"
      />
      <Button variant="link" size="sm" onClick={() => document.getElementById('emergencyCardFileInput').click()}>
        <BsPencilSquare style={{ color: 'green', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => newProduct.emergency_card && window.open(newProduct.emergency_card, '_blank')}>
        <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
      </Button>
      <Button variant="link" size="sm" onClick={() => {
        setEmergencyCardFile(null);
        setNewProduct({ ...newProduct, emergency_card: '' });
      }}>
        <BsTrash style={{ color: 'red', fontSize: '1.2em' }} />
      </Button>
    </div>
  </div>
  <small className="text-muted mt-1">{newProduct.emergency_card || 'Sin archivo seleccionado'}</small>
</Form.Group>

          </Form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseModal}>Cancelar</Button>
          <Button variant="primary" onClick={handleAddOrEditProduct}>
            {editingProduct ? "Guardar Cambios" : "Registrar Producto"}
          </Button>
        </Modal.Footer>
      </Modal>
      {/* Modal para ver detalles del producto */}
<Modal show={showDetailModal} onHide={handleCloseDetailModal}>
  <Modal.Header closeButton>
    <Modal.Title>Detalles del Producto</Modal.Title>
  </Modal.Header>

  <Modal.Body>
  {selectedProduct && (
    <>
      <p><strong>Nombre:</strong> {selectedProduct.name}</p>
      <p><strong>Dosis:</strong> {selectedProduct.dose}</p>
      <p><strong>Duración Residual:</strong> {selectedProduct.residual_duration}</p>

      <div className="d-flex justify-content-between align-items-center">
        <p><strong>Hoja de Datos de Seguridad:</strong></p>
        {selectedProduct.safety_data_sheet ? (
          <Button variant="link" size="sm" onClick={() => window.open(selectedProduct.safety_data_sheet, '_blank')}>
            <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
          </Button>
        ) : null}
      </div>

      <div className="d-flex justify-content-between align-items-center">
        <p><strong>Ficha Técnica:</strong></p>
        {selectedProduct.technical_sheet ? (
          <Button variant="link" size="sm" onClick={() => window.open(selectedProduct.technical_sheet, '_blank')}>
            <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
          </Button>
        ) : null}
      </div>

      <div className="d-flex justify-content-between align-items-center">
        <p><strong>Registro Sanitario:</strong></p>
        {selectedProduct.health_registration ? (
          <Button variant="link" size="sm" onClick={() => window.open(selectedProduct.health_registration, '_blank')}>
            <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
          </Button>
        ) : null}
      </div>

      <div className="d-flex justify-content-between align-items-center">
        <p><strong>Tarjeta de Emergencia:</strong></p>
        {selectedProduct.emergency_card ? (
          <Button variant="link" size="sm" onClick={() => window.open(selectedProduct.emergency_card, '_blank')}>
            <BsEye style={{ color: 'orange', fontSize: '1.2em' }} />
          </Button>
        ) : null}
      </div>
    </>
  )}
</Modal.Body>

  <Modal.Footer>
    <Button variant="secondary" onClick={handleCloseDetailModal}>Cerrar</Button>
  </Modal.Footer>
</Modal>

    </div>
  );
}

export default ProductList;
