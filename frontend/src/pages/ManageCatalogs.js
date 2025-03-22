"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";

// List of Indian states
const indianStates = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat",
  "Haryana", "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra",
  "Manipur", "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim",
  "Tamil Nadu", "Telangana", "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function CreateManualCatalog() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  // Product data
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Search & filter
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStockLocations, setSelectedStockLocations] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  // Selected products & quantities
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [productQuantities, setProductQuantities] = useState({});

  // Fields to display
  const [fieldsToDisplay, setFieldsToDisplay] = useState(["name", "price"]);

  // Catalog Info
  const [catalogName, setCatalogName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Margin
  const presetMarginOptions = [5, 10, 15, 20];
  const [selectedMargin, setSelectedMargin] = useState(presetMarginOptions[0]);
  const [marginOption, setMarginOption] = useState("preset");
  const [selectedPresetMargin, setSelectedPresetMargin] = useState(presetMarginOptions[0]);
  const [customMargin, setCustomMargin] = useState("");

  useEffect(() => {
    fetchAllProducts();
    if (isEditMode) {
      fetchExistingCatalog();
    } else {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchAllProducts = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data);
    } catch (error) {
      console.error("Error fetching products:", error);
    }
  };

  const fetchExistingCatalog = async () => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCatalogName(data.catalogName);
      setCustomerName(data.customerName);
      setCustomerEmail(data.customerEmail || "");
      setCustomerCompany(data.customerCompany || "");
      setCustomerAddress(data.customerAddress || "");
      setFieldsToDisplay(data.fieldsToDisplay || []);
      const existingMargin = data.margin || presetMarginOptions[0];
      setSelectedMargin(existingMargin);
      if (presetMarginOptions.includes(existingMargin)) {
        setMarginOption("preset");
        setSelectedPresetMargin(existingMargin);
      } else {
        setMarginOption("custom");
        setCustomMargin(String(existingMargin));
      }
      const productArray = data.products.map((item) => item.productId);
      setSelectedProducts(productArray);
      const quantitiesObj = {};
      productArray.forEach((prod) => {
        quantitiesObj[prod._id] = 1;
      });
      setProductQuantities(quantitiesObj);
    } catch (error) {
      console.error("Error fetching catalog for edit:", error);
    } finally {
      setLoading(false);
    }
  };

  // Margin logic
  const handlePresetMarginChange = (value) => {
    const marginVal = parseFloat(value);
    setSelectedPresetMargin(marginVal);
    setSelectedMargin(marginVal);
    recalcPrices(marginVal);
  };

  const handleCustomMarginChange = (e) => {
    const val = e.target.value;
    setCustomMargin(val);
    const marginVal = parseFloat(val);
    if (!isNaN(marginVal) && marginVal > 0) {
      setSelectedMargin(marginVal);
      recalcPrices(marginVal);
    }
  };

  const recalcPrices = (marginVal) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (selectedProducts.some((sp) => sp._id === p._id)) {
          const newPrice = p.price + (p.price * marginVal) / 100;
          return { ...p, price: parseFloat(newPrice.toFixed(2)) };
        }
        return p;
      })
    );
    setSelectedProducts((prev) =>
      prev.map((sp) => {
        const updatedPrice = sp.price + (sp.price * marginVal) / 100;
        return { ...sp, price: parseFloat(updatedPrice.toFixed(2)) };
      })
    );
  };

  const handleMarginOptionChange = (e) => {
    const val = e.target.value;
    if (val === "custom") {
      setMarginOption("custom");
    } else {
      setMarginOption("preset");
      handlePresetMarginChange(val);
    }
  };

  // Filtering products
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const subCategories = Array.from(new Set(products.map((p) => p.subCategory).filter(Boolean)));
  const brands = Array.from(new Set(products.map((p) => p.brandName).filter(Boolean)));
  const stockLocations = Array.from(new Set(products.map((p) => p.stockCurrentlyWith).filter(Boolean)));

  const toggleCat = (c) => {
    setSelectedCategories((prev) =>
      prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]
    );
  };

  const filteredProducts = products.filter((prod) => {
    const term = searchTerm.toLowerCase();
    const combinedString = (
      prod.name +
      prod.category +
      prod.subCategory +
      prod.brandName +
      prod.stockCurrentlyWith +
      (prod.productId || "") +
      (prod.productTag || "") +
      (prod.price || "") +
      (prod.productDetails || "")
    ).toLowerCase();
    const matchesSearch = !searchTerm || combinedString.includes(term);
    const matchCat = selectedCategories.length === 0 || selectedCategories.includes(prod.category);
    const matchSub = selectedSubCategories.length === 0 || selectedSubCategories.includes(prod.subCategory);
    const matchBrand = selectedBrands.length === 0 || selectedBrands.includes(prod.brandName);
    const matchStock = selectedStockLocations.length === 0 || selectedStockLocations.includes(prod.stockCurrentlyWith);
    return matchesSearch && matchCat && matchSub && matchBrand && matchStock;
  });

  // Selecting products
  const handleSelectProduct = (product) => {
    const isSelected = selectedProducts.some((sp) => sp._id === product._id);
    if (isSelected) {
      setSelectedProducts((prev) => prev.filter((p) => p._id !== product._id));
      setProductQuantities((prev) => {
        const newQuantities = { ...prev };
        delete newQuantities[product._id];
        return newQuantities;
      });
    } else {
      setSelectedProducts((prev) => [...prev, product]);
      setProductQuantities((prev) => ({ ...prev, [product._id]: 1 }));
      if (selectedMargin > 0) {
        const newPrice = product.price + (product.price * selectedMargin) / 100;
        product.price = parseFloat(newPrice.toFixed(2));
      }
    }
  };

  const handleQuantityChange = (productId, value) => {
    const qty = parseInt(value);
    setProductQuantities((prev) => ({
      ...prev,
      [productId]: isNaN(qty) ? 1 : qty,
    }));
  };

  // Toggling fields to display
  const toggleField = (field) => {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay((prev) => prev.filter((f) => f !== field));
    } else {
      setFieldsToDisplay((prev) => [...prev, field]);
    }
  };

  // Save / Update Catalog
  const handleSaveCatalog = async () => {
    if (!catalogName || !customerName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product");
      return;
    }
    const productIds = selectedProducts.map((p) => p._id);
    const body = {
      catalogName,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      productIds,
      fieldsToDisplay,
      margin: selectedMargin,
    };
    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/catalogs/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Catalog updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/catalogs`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Catalog created successfully!");
      }
      navigate("/admin-dashboard/manage-catalogs");
    } catch (error) {
      console.error("Error saving catalog:", error);
      alert("Error saving catalog. Check console.");
    }
  };

  // Create Quotation
  const handleCreateQuotation = async () => {
    if (!catalogName || !customerName) {
      alert("Please enter Catalog Name and Customer Name");
      return;
    }
    if (selectedProducts.length === 0) {
      alert("Please select at least one product for the quotation");
      return;
    }
    const items = selectedProducts.map((p, index) => {
      const quantity = productQuantities[p._id] || 1;
      const rate = p.price;
      const amount = rate * quantity;
      const gst = parseFloat((amount * 0.18).toFixed(2));
      const total = parseFloat((amount + gst).toFixed(2));
      return {
        slNo: index + 1,
        image: p.images?.[0] || "",
        product: p.name,
        quantity,
        rate,
        amount,
        gst,
        total,
      };
    });
    try {
      const token = localStorage.getItem("token");
      const body = {
        catalogName,
        customerName,
        customerEmail,
        customerCompany,
        customerAddress,
        margin: selectedMargin,
        items,
      };
      await axios.post(`${BACKEND_URL}/api/admin/quotations`, body, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Quotation created successfully!");
    } catch (error) {
      console.error("Error creating quotation:", error);
      alert("Error creating quotation. Check console.");
    }
  };

  if (loading) {
    return <div className="p-6 text-gray-200">Loading...</div>;
  }

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-center mb-4 space-y-2 md:space-y-0">
        <h1 className="text-2xl font-bold">
          {isEditMode ? "Edit Catalog" : "Create Catalog (Manual)"}
        </h1>
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-2">
          <div className="flex items-center space-x-2">
            <select
              value={marginOption === "preset" ? selectedPresetMargin : "custom"}
              onChange={handleMarginOptionChange}
              className="bg-gray-700 px-3 py-2 rounded"
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
                onChange={handleCustomMarginChange}
                className="bg-gray-700 px-3 py-2 rounded"
              />
            )}
          </div>
          <button
            onClick={handleSaveCatalog}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            {isEditMode ? "Update Catalog" : "Create Catalog"}
          </button>
          <button
            onClick={handleCreateQuotation}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            Create Quotation
          </button>
        </div>
      </div>

      {/* Basic Info Form */}
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <label className="block font-medium mb-1">
            Catalog Name {isEditMode ? "" : "*"}
          </label>
          <input
            type="text"
            className="bg-gray-700 rounded w-full p-2"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">
            Customer Name {isEditMode ? "" : "*"}
          </label>
          <input
            type="text"
            className="bg-gray-700 rounded w-full p-2"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Customer Email (optional)</label>
          <input
            type="email"
            className="bg-gray-700 rounded w-full p-2"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Customer Company</label>
          <input
            type="text"
            className="bg-gray-700 rounded w-full p-2"
            value={customerCompany}
            onChange={(e) => setCustomerCompany(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">Customer Address</label>
          <input
            type="text"
            className="bg-gray-700 rounded w-full p-2"
            value={customerAddress}
            onChange={(e) => setCustomerAddress(e.target.value)}
          />
        </div>
        <div>
          <label className="block font-medium mb-1">State</label>
          <select
            className="bg-gray-700 rounded w-full p-2"
            value={customerAddress} // adjust if you have a separate state field
            onChange={(e) => setCustomerAddress(e.target.value)}
          >
            <option value="">Select State</option>
            {indianStates.map((state) => (
              <option key={state} value={state}>
                {state}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Fields to Display */}
      <div className="mb-6">
        <label className="block font-medium mb-2">Fields to Display</label>
        <div className="flex flex-wrap gap-4">
          {["images", "name", "category", "subCategory", "brandName", "price"].map(
            (field) => (
              <label key={field} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  checked={fieldsToDisplay.includes(field)}
                  onChange={() => toggleField(field)}
                />
                <span>{field}</span>
              </label>
            )
          )}
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex justify-between items-center mb-4">
        <input
          type="text"
          placeholder="Search products..."
          className="w-1/2 px-3 py-2 rounded bg-gray-700 focus:outline-none"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <div className="flex space-x-2">
          {/* Category Filter */}
          <div className="relative">
            <button
              onClick={() => setCategoryOpen(!categoryOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Cat ({selectedCategories.length})
            </button>
            {categoryOpen && (
              <div className="absolute mt-2 w-40 bg-gray-800 p-2 rounded z-50">
                {categories.map((c) => (
                  <label
                    key={c}
                    className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedCategories.includes(c)}
                      onChange={() =>
                        setSelectedCategories((prev) =>
                          prev.includes(c)
                            ? prev.filter((x) => x !== c)
                            : [...prev, c]
                        )
                      }
                    />
                    <span>{c}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* SubCategory Filter */}
          <div className="relative">
            <button
              onClick={() => setSubCategoryOpen(!subCategoryOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Sub ({selectedSubCategories.length})
            </button>
            {subCategoryOpen && (
              <div className="absolute mt-2 w-40 bg-gray-800 p-2 rounded z-50">
                {subCategories.map((s) => (
                  <label
                    key={s}
                    className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedSubCategories.includes(s)}
                      onChange={() =>
                        setSelectedSubCategories((prev) =>
                          prev.includes(s)
                            ? prev.filter((x) => x !== s)
                            : [...prev, s]
                        )
                      }
                    />
                    <span>{s}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Brand Filter */}
          <div className="relative">
            <button
              onClick={() => setBrandOpen(!brandOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Brand ({selectedBrands.length})
            </button>
            {brandOpen && (
              <div className="absolute mt-2 w-40 bg-gray-800 p-2 rounded z-50">
                {brands.map((b) => (
                  <label
                    key={b}
                    className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedBrands.includes(b)}
                      onChange={() =>
                        setSelectedBrands((prev) =>
                          prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]
                        )
                      }
                    />
                    <span>{b}</span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Stock Filter */}
          <div className="relative">
            <button
              onClick={() => setStockOpen(!stockOpen)}
              className="bg-gray-700 px-3 py-2 rounded"
            >
              Stock ({selectedStockLocations.length})
            </button>
            {stockOpen && (
              <div className="absolute mt-2 w-40 bg-gray-800 p-2 rounded z-50">
                {stockLocations.map((loc) => (
                  <label
                    key={loc}
                    className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                  >
                    <input
                      type="checkbox"
                      checked={selectedStockLocations.includes(loc)}
                      onChange={() =>
                        setSelectedStockLocations((prev) =>
                          prev.includes(loc)
                            ? prev.filter((x) => x !== loc)
                            : [...prev, loc]
                        )
                      }
                    />
                    <span>{loc}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Product Cards */}
      <div className="grid grid-cols-4 gap-6">
        {filteredProducts.map((p) => {
          const isSelected = selectedProducts.some((sp) => sp._id === p._id);
          return (
            <div
              key={p._id}
              className={`bg-gray-800 p-4 rounded relative flex flex-col ${
                isSelected ? "border-2 border-blue-400" : ""
              }`}
            >
              <span
                className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded ${
                  p.stockInHand > 0 ? "bg-green-600" : "bg-red-600"
                }`}
              >
                {p.stockInHand > 0 ? "Available" : "Out of stock"}
              </span>
              {p.images?.length > 0 ? (
                <img
                  src={p.images[0]}
                  alt={p.name}
                  className="w-full h-32 object-cover mb-2 rounded"
                />
              ) : (
                <div className="w-full h-32 bg-gray-700 flex items-center justify-center mb-2 rounded">
                  <span className="text-gray-400 text-sm">No Image</span>
                </div>
              )}
              <h4 className="font-bold text-sm mb-1">{p.name}</h4>
              <p className="text-xs text-gray-400 mb-2">
                {p.category} {p.subCategory ? `/ ${p.subCategory}` : ""}
              </p>
              <p className="text-xs">Price: ₹{p.price}</p>
              <button
                onClick={() => handleSelectProduct(p)}
                className={`mt-auto px-2 py-1 text-sm rounded ${
                  isSelected
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {isSelected ? "Remove" : "Select"}
              </button>
              {isSelected && (
                <input
                  type="number"
                  min="1"
                  className="mt-2 bg-gray-600 p-1 rounded text-center"
                  value={productQuantities[p._id] || 1}
                  onChange={(e) => handleQuantityChange(p._id, e.target.value)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
