import React, { useState, useEffect } from "react";

const VariationEditModal = ({ item, onClose, onUpdate }) => {
  const [name, setName] = useState(""); // Product name
  const [productCost, setProductCost] = useState(0);
  const [productGST, setProductGST] = useState(0);
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");
  const [quantity, setQuantity] = useState(1);

  // Use useEffect to set initial values when the modal opens
  useEffect(() => {
    if (item) {
      setName(item.productName || ""); // Set product name
      setProductCost(item.productCost || 0);
      setProductGST(item.productGST || 0);
      setColor(item.color || "");
      setSize(item.size || "");
      setQuantity(item.quantity || 1);
    }
  }, [item]);

  const handleSave = () => {
    const updatedItem = {
      productName: name,
      productCost,
      productGST,
      color,
      size,
      quantity: parseInt(quantity) || 1,
    };
    onUpdate(updatedItem); // Call the onUpdate function with the updated item
  };

  return (
    <div className="modal">
      <div className="modal-content">
        <button onClick={onClose} className="close-button">
          &times;
        </button>
        <h2>Edit Variation</h2>
        <div>
          <label>Product Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label>Product Cost</label>
          <input
            type="number"
            value={productCost}
            onChange={(e) => setProductCost(parseFloat(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label>Product GST (%)</label>
          <input
            type="number"
            value={productGST}
            onChange={(e) => setProductGST(parseFloat(e.target.value))}
            className="input-field"
          />
        </div>
        <div>
          <label>Color</label>
          <input
            type="text"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label>Size</label>
          <input
            type="text"
            value={size}
            onChange={(e) => setSize(e.target.value)}
            className="input-field"
          />
        </div>
        <div>
          <label>Quantity</label>
          <input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            className="input-field"
          />
        </div>
        <div className="modal-actions">
          <button onClick={handleSave} className="save-button">
            Save
          </button>
          <button onClick={onClose} className="cancel-button">
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default VariationEditModal; 