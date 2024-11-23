import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { Button, Card, Modal, Form, Collapse } from 'react-bootstrap';
import { BsPencilSquare, BsTrash, BsEye, BsPlusCircle } from 'react-icons/bs';
import 'bootstrap/dist/css/bootstrap.min.css';

function ProductList() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchText, setSearchText] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false); // Nuevo estado para el modal de detalles
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);
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
    emergency_card: '',
    category: [] // Inicializa la categoría como un arreglo vacío
  });  

  const categoryOptions = [
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
  
  const [showCategoryOptions, setShowCategoryOptions] = useState(false); // Controlar el colapso de categorías  

  const [safetyDataSheetFile, setSafetyDataSheetFile] = useState(null);
  const [technicalSheetFile, setTechnicalSheetFile] = useState(null);
  const [healthRegistrationFile, setHealthRegistrationFile] = useState(null);
  const [emergencyCardFile, setEmergencyCardFile] = useState(null);  

  const [pendingAlert, setPendingAlert] = useState(false);

  const filteredProducts = products.filter((product) =>
    (product.name || '').toLowerCase().includes(searchText.toLowerCase()) ||
    product.category.some(cat => (cat || '').toLowerCase().includes(searchText.toLowerCase()))
  );  

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const response = await axios.get('http://localhost:10000/api/products');
        const productsWithCategories = response.data.map(product => ({
          ...product,
          category: product.category || []
        }));
        setProducts(productsWithCategories);
        setLoading(false);
      } catch (error) {
        console.error("Error fetching products:", error);
        setLoading(false);
      }
    };
    fetchProducts();
  }, []);  

  const handleCategoryChange = (e) => {
    const { value, checked } = e.target;
    setNewProduct((prevProduct) => {
      const currentCategories = prevProduct.category || [];
      const updatedCategories = checked
        ? [...currentCategories, value] // Agrega categoría seleccionada
        : currentCategories.filter((cat) => cat !== value); // Elimina categoría deseleccionada
  
      console.log("Categorías actualizadas:", updatedCategories); // Depura las categorías seleccionadas
      return { ...prevProduct, category: updatedCategories };
    });
  };  

  const handleShowModal = (product = null) => {
    setEditingProduct(product);
    if (product) {
      setNewProduct({
        ...product,
        category: product.category || []
      });
    } else {
      setNewProduct({
        name: '',
        description_type: '',
        dose: '',
        residual_duration: '',
        safety_data_sheet: '',
        technical_sheet: '',
        health_registration: '',
        emergency_card: '',
        category: [] // Inicializa la categoría como un arreglo vacío
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
    console.log("Categorías seleccionadas antes de enviar:", newProduct.category);
  
    if (!newProduct.name || newProduct.name.trim() === '') {
      alert('El campo "Nombre" es obligatorio.');
      return;
    }
  
    if (!newProduct.category || newProduct.category.length === 0) {
      alert('Debes seleccionar al menos una categoría.');
      return;
    }
  
    try {
      const formData = new FormData();
      formData.append('name', newProduct.name);
      formData.append('description_type', newProduct.description_type);
      formData.append('dose', newProduct.dose);
      formData.append('residual_duration', newProduct.residual_duration);
      formData.append('category', JSON.stringify(newProduct.category));
  
      // Archivos opcionales
      if (safetyDataSheetFile) formData.append('safety_data_sheet', safetyDataSheetFile);
      if (technicalSheetFile) formData.append('technical_sheet', technicalSheetFile);
      if (healthRegistrationFile) formData.append('health_registration', healthRegistrationFile);
      if (emergencyCardFile) formData.append('emergency_card', emergencyCardFile);
  
      let response;
      if (editingProduct) {
        response = await axios.put(
          `http://localhost:10000/api/products/${editingProduct.id}`,
          formData,
          { headers: { 'Content-Type': 'multipart/form-data' } }
        );
      } else {
        response = await axios.post('http://localhost:10000/api/products', formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }
  
      alert('Producto registrado correctamente.');
      setShowConfirmationModal(false);
      handleCloseModal();
  
      // Actualiza la lista de productos
      const updatedProducts = await axios.get('http://localhost:10000/api/products');
      setProducts(updatedProducts.data);
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      alert('Error al registrar el producto.');
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

  return (
    <div className="container mt-4">
      <h2 className="text-primary mb-4">Productos</h2>
  
      <Form.Group controlId="searchProducts" className="mb-4">
        <Form.Control
          type="text"
          placeholder="Buscar por nombre o categoría..."
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
        />
      </Form.Group>
  
      <Button variant="primary" className="mb-4" onClick={() => handleShowModal()}>
        Agregar Producto
      </Button>
  
      {pendingAlert && (
        <div className="alert alert-info">El registro del producto estará listo en breve</div>
      )}
  
      <div className="row">
        {filteredProducts.map((product) => (
          <div key={product.id} className="col-md-4 mb-4">
            <Card
              className="mb-3"
              style={{ cursor: "pointer" }}
              onClick={() => handleShowDetailModal(product)}
            >
              <Card.Body className="d-flex flex-column align-items-center position-relative" style={{ height: "250px" }}>
                <div className="text-center mb-4">
                  <Card.Title>{product.name}</Card.Title>
                  <Card.Text>
  <strong>Categoría:</strong> {
    (() => {
      try {
        const parsedCategory = JSON.parse(product.category); // Intentar parsear el JSON
        return Array.isArray(parsedCategory) ? parsedCategory.join(", ") : parsedCategory;
      } catch (e) {
        return product.category || "Sin categoría"; // Si no es JSON válido, mostrar directamente
      }
    })()
  }
  <br />
  <strong>Dosis:</strong> {product.dose}
  <br />
  <strong>Duración Residual:</strong> {product.residual_duration}
</Card.Text>
                </div>
                <div className="position-absolute bottom-0 end-0 mb-2 me-2">
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      handleShowModal(product);
                    }}
                  >
                    <BsPencilSquare style={{ color: "green", fontSize: "1.5em" }} />
                  </Button>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation();
                      deleteProduct(product.id);
                    }}
                  >
                    <BsTrash style={{ color: "red", fontSize: "1.5em" }} />
                  </Button>
                </div>
              </Card.Body>
            </Card>
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
              <Form.Label>Descripción</Form.Label>
              <Form.Control type="text" name="description_type" value={newProduct.description_type} onChange={handleInputChange} />
            </Form.Group>
            <Form.Group className="mt-3">
  <Form.Label
    onClick={() => setShowCategoryOptions((prev) => !prev)}
    style={{ cursor: "pointer", fontWeight: "bold", display: "block" }}
  >
    Categoría
  </Form.Label>
  <Collapse in={showCategoryOptions}>
    <div>
    {categoryOptions.map((option, index) => (
    <Form.Check
        key={option}
        type="checkbox"
        label={option}
        value={option}
        id={`category_option_${index}`}
        checked={newProduct.category?.includes(option) || false}
        onChange={handleCategoryChange}
    />
))}
    </div>
  </Collapse>
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
          <Button
  variant="primary"
  onClick={() => setShowConfirmationModal(true)}
>
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
      <p><strong>Categoría:</strong> 
  {Array.isArray(selectedProduct.category) // Verifica si es un arreglo
    ? selectedProduct.category.join(', ') // Si es un arreglo, únelos con comas
    : typeof selectedProduct.category === 'string' // Si no, verifica si es un string
    ? JSON.parse(selectedProduct.category).join(', ') // Convierte el string JSON a un arreglo y únelos
    : "Sin categoría"} {/* Mensaje por defecto */}
</p>
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
{/* Modal para confirmar el registro del producto */}
<Modal show={showConfirmationModal} onHide={() => setShowConfirmationModal(false)}>
  <Modal.Header closeButton>
    <Modal.Title>Confirmación</Modal.Title>
  </Modal.Header>
  <Modal.Body>
    ¿Estás seguro de que quieres registrar este producto?
  </Modal.Body>
  <Modal.Footer>
    <Button variant="secondary" onClick={() => setShowConfirmationModal(false)}>
      Cancelar
    </Button>
    <Button
      variant="primary"
      onClick={() => {
        handleAddOrEditProduct(); // Llama a la función de registro
        setShowConfirmationModal(false); // Cierra el modal de confirmación
        handleCloseModal(); // Cierra el modal principal
      }}
    >
      Confirmar
    </Button>
  </Modal.Footer>
</Modal>

    </div>
  );
}

export default ProductList;
