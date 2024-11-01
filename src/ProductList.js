import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Modal, Form } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
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

  const handleCloseModal = () => {
    setShowModal(false);
    setEditingProduct(null);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewProduct({ ...newProduct, [name]: value });
  };

  const handleAddOrEditProduct = async () => {
    try {
      if (editingProduct) {
        await axios.put(`http://localhost:10000/api/products/${editingProduct.id}`, newProduct);
        setProducts(products.map((product) => (product.id === editingProduct.id ? newProduct : product)));
        alert("Producto actualizado exitosamente");
      } else {
        const response = await axios.post('http://localhost:10000/api/products', newProduct);
        setProducts([...products, response.data.product]);
        alert("Producto agregado exitosamente");
      }
      handleCloseModal();
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

      <div className="row">
        {Object.keys(groupedProducts).map(descriptionType => (
          <div key={descriptionType} className="col-md-6 mb-4">
            <h4>{descriptionType || "Sin Tipo de Descripción"}</h4>
            {groupedProducts[descriptionType].map((product) => (
              <Card key={product.id} className="mb-3">
                <Card.Body>
                  <Card.Title>{product.name}</Card.Title>
                  <Card.Text>
                    <strong>Dosis:</strong> {product.dose}<br />
                    <strong>Duración Residual:</strong> {product.residual_duration}<br />
                    <strong>Hoja de Datos de Seguridad:</strong> {product.safety_data_sheet}<br />
                    <strong>Ficha Técnica:</strong> {product.technical_sheet}<br />
                    <strong>Registro Sanitario:</strong> {product.health_registration}<br />
                    <strong>Tarjeta de Emergencia:</strong> {product.emergency_card}
                  </Card.Text>
                  <Button variant="success" size="sm" onClick={() => handleShowModal(product)}>
                    Editar
                  </Button>
                  <Button variant="danger" size="sm" className="ms-2" onClick={() => deleteProduct(product.id)}>
                    Eliminar
                  </Button>
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
            <Form.Group controlId="formSafetyDataSheet" className="mb-3">
              <Form.Label>Hoja de Datos de Seguridad</Form.Label>
              <Form.Control type="text" name="safety_data_sheet" value={newProduct.safety_data_sheet} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formTechnicalSheet" className="mb-3">
              <Form.Label>Ficha Técnica</Form.Label>
              <Form.Control type="text" name="technical_sheet" value={newProduct.technical_sheet} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formHealthRegistration" className="mb-3">
              <Form.Label>Registro Sanitario</Form.Label>
              <Form.Control type="text" name="health_registration" value={newProduct.health_registration} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group controlId="formEmergencyCard" className="mb-3">
              <Form.Label>Tarjeta de Emergencia</Form.Label>
              <Form.Control type="text" name="emergency_card" value={newProduct.emergency_card} onChange={handleInputChange} />
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
    </div>
  );
}

export default ProductList;
