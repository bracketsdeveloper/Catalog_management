"use client"; // Remove if using Create React App instead of Next.js

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Mapping for field names to display labels
const fieldMapping = {
  name: "Name",
  brandName: "Brand Name",
  category: "Category",
  subCategory: "Sub Category",
  price: "Price",
  productDetails: "Product Details",
  images: "Images",
};

export default function EditCatalogPage() {
  const { id } = useParams(); // catalog id from route
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  // Catalog basic info state
  const [catalogName, setCatalogName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // Margin & Fields state
  const [selectedMargin, setSelectedMargin] = useState(0);
  const [fieldsToDisplay, setFieldsToDisplay] = useState([]);
  const presetMarginOptions = [5, 10, 15, 20];
  const [marginOption, setMarginOption] = useState("preset"); // "preset" or "custom"
  const [selectedPresetMargin, setSelectedPresetMargin] = useState(presetMarginOptions[0]);
  const [customMargin, setCustomMargin] = useState("");

  // Product selection state
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCatalog();
    fetchAllProducts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Fetch the existing catalog details
  const fetchCatalog = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const catalog = res.data;
      setCatalogName(catalog.catalogName);
      setCustomerName(catalog.customerName);
      setCustomerEmail(catalog.customerEmail || "");
      setFieldsToDisplay(catalog.fieldsToDisplay || []);
      setSelectedMargin(catalog.margin || 0);
      setSelectedProducts(catalog.products.map((item) => ({ ...item, index: 0 })));
      // Determine margin option based on preset options
      if (presetMarginOptions.includes(catalog.margin)) {
        setMarginOption("preset");
        setSelectedPresetMargin(catalog.margin);
      } else {
        setMarginOption("custom");
        setCustomMargin(catalog.margin.toString());
      }
    } catch (error) {
      console.error("Error fetching catalog:", error);
    }
  };

  // Fetch all available products for selection
  const fetchAllProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Update the handleSelectProduct function to include an index
  const handleSelectProduct = (product, index) => {
    const isSelected = selectedProducts.some((p) => p._id === product._id);
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter((p) => p._id !== product._id));
    } else {
      setSelectedProducts([...selectedProducts, { ...product, index }]);
    }
  };

  // Add a function to handle drag-and-drop reordering
  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(selectedProducts);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSelectedProducts(items);
  };

  // Toggle a field in "fieldsToDisplay"
  const toggleField = (field) => {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay(fieldsToDisplay.filter((f) => f !== field));
    } else {
      setFieldsToDisplay([...fieldsToDisplay, field]);
    }
  };

  // Apply margin selection (preset or custom)
  const handleApplyMargin = () => {
    let margin;
    if (marginOption === "custom") {
      margin = parseFloat(customMargin);
      if (isNaN(margin) || margin <= 0) {
        alert("Invalid custom margin percentage");
        return;
      }
    } else {
      margin = selectedPresetMargin;
    }
    setSelectedMargin(margin);
  };

  // Update the catalog via a PUT request
  const handleUpdateCatalog = async () => {
    if (!catalogName || !customerName) {
      alert("Catalog Name and Customer Name are required");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      // Extract product IDs from selected products
      const productIds = selectedProducts.map((p) => p._id);
      const body = {
        catalogName,
        customerName,
        customerEmail,
        productIds,
        fieldsToDisplay,
        margin: selectedMargin,
      };
      await axios.put(`${BACKEND_URL}/api/admin/catalogs/${id}`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Catalog updated successfully");
      navigate("/admin-dashboard/manage-catalogs");
    } catch (error) {
      console.error("Error updating catalog:", error);
      alert("Failed to update catalog");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-800">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-100 min-h-screen text-gray-800">
      <h1 className="text-3xl font-bold mb-4">Edit Catalog</h1>

      {/* Basic Catalog Info */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-medium mb-1">Catalog Name *</label>
          <input
            type="text"
            className="bg-white border p-2 rounded w-full"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Customer Name *</label>
          <input
            type="text"
            className="bg-white border p-2 rounded w-full"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Customer Email (optional)</label>
          <input
            type="email"
            className="bg-white border p-2 rounded w-full"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
      </div>

      {/* Margin Section */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Margin (%)</label>
        <div className="flex items-center space-x-2">
          <select
            value={marginOption === "preset" ? selectedPresetMargin : "custom"}
            onChange={(e) => {
              if (e.target.value === "custom") {
                setMarginOption("custom");
              } else {
                setMarginOption("preset");
                setSelectedPresetMargin(parseFloat(e.target.value));
              }
            }}
            className="bg-white border p-2 rounded"
          >
            {presetMarginOptions.map((m) => (
              <option key={m} value={m}>
                {m}%
              </option>
            ))}
            <option value="custom">Custom</option>
          </select>
          {marginOption === "custom" && (
            <input
              type="number"
              min="1"
              placeholder="Enter margin"
              value={customMargin}
              onChange={(e) => setCustomMargin(e.target.value)}
              className="bg-white border p-2 rounded"
            />
          )}
          <button
            onClick={handleApplyMargin}
            className="bg-blue-600 text-white px-3 py-2 rounded"
          >
            Apply Margin
          </button>
        </div>
        <p className="mt-1 text-sm">Current Margin: {selectedMargin}%</p>
      </div>

      {/* Fields to Display */}
      <div className="mb-4">
        <label className="block font-medium mb-1">Fields to Display</label>
        <div className="flex flex-wrap gap-4">
          {["images", "name", "category", "subCategory", "brandName", "price", "productDetails"].map((field) => (
            <label key={field} className="flex items-center space-x-2">
              <input
                type="checkbox"
                checked={fieldsToDisplay.includes(field)}
                onChange={() => toggleField(field)}
              />
              <span>{fieldMapping[field] || field}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Product Selection */}
      <div className="mb-4">
        <h2 className="text-xl font-semibold mb-2">Select Products</h2>
        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="products">
            {(provided) => (
              <div
                {...provided.droppableProps}
                ref={provided.innerRef}
                className="grid grid-cols-2 md:grid-cols-4 gap-4"
              >
                {selectedProducts.map((p, index) => {
                  const isSelected = selectedProducts.some((prod) => prod._id === p._id);
                  return (
                    <Draggable key={p._id} draggableId={p._id} index={index}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`border p-2 rounded cursor-pointer ${
                            isSelected ? "bg-blue-100" : "bg-white"
                          }`}
                          onClick={() => handleSelectProduct(p, index)}
                        >
                          {p.images && p.images.length > 0 ? (
                            <img src={p.images[0]} alt={p.name} className="w-full h-20 object-cover mb-2" />
                          ) : (
                            <div className="w-full h-20 bg-gray-200 flex items-center justify-center mb-2">
                              No Image
                            </div>
                          )}
                          <p className="text-sm font-medium">{p.name}</p>
                        </div>
                      )}
                    </Draggable>
                  );
                })}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>

      {/* Update Button */}
      <div className="mt-6">
        <button
          onClick={handleUpdateCatalog}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
