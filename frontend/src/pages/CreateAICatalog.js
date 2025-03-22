"use client"; // Remove if using Create React App

import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

/**
 * AI-Generated Catalog page with:
 * - Search + filter selection (category, subCategory, brand, stockLocation)
 * - Price range (fromPrice, toPrice) for sum-based subset
 * - Generate -> calls backend route (subset-sum or knapsack logic)
 * - Read-only list of chosen products
 * - Margin entry + fields selection
 * - Create Catalog
 */
export default function CreateAICatalog() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  // 1) Basic catalog info
  const [catalogName, setCatalogName] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");

  // 2) Price range for sum-based selection
  const [fromPrice, setFromPrice] = useState(0);
  const [toPrice, setToPrice] = useState(0);

  // 3) Search + filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStockLocations, setSelectedStockLocations] = useState([]);

  // For toggling filter dropdown UIs
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  // 4) Step handling
  const [step, setStep] = useState(1);

  // 5) AI subset result
  const [generatedProducts, setGeneratedProducts] = useState([]);
  const [loading, setLoading] = useState(false);

  // 6) Margin and fields
  const [margin, setMargin] = useState(0);
  const [fieldsToDisplay, setFieldsToDisplay] = useState(["name", "price"]);

  // NOTE: In a real app, you'd fetch distinct categories, subCategories, etc.
  // For demonstration, let’s just hardcode some sample filter values:
  const allCategories = ["Electronics", "Clothing", "Furniture"];
  const allSubCategories = ["Phones", "Shirts", "Chairs"];
  const allBrands = ["BrandA", "BrandB", "BrandC"];
  const allStockLocations = ["Warehouse1", "Warehouse2", "StoreA"];

  /** Step 1: Generate subset from server */
  async function handleGenerate() {
    if (!toPrice || toPrice <= 0) {
      alert("Please enter a valid 'toPrice' > 0");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      // Build filters object for server
      const filters = {
        categories: selectedCategories,
        subCategories: selectedSubCategories,
        brands: selectedBrands,
        stockLocations: selectedStockLocations
      };

      const body = {
        fromPrice,
        toPrice,
        searchTerm,
        filters
      };

      // POST /catalogs/ai-generate with sum-based subset logic
      const res = await axios.post(`${BACKEND_URL}/api/admin/catalogs/ai-generate`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGeneratedProducts(res.data); // array of chosen products from server
      setStep(2);
    } catch (error) {
      console.error("AI sum-based generation error:", error);
      alert("AI generation failed. Check console.");
    } finally {
      setLoading(false);
    }
  }

  /** Apply margin to entire subset */
  function handleApplyMargin() {
    if (margin <= 0) {
      alert("Enter a valid margin % > 0");
      return;
    }
    // Mark up each product's price
    const updated = generatedProducts.map((p) => {
      const oldPrice = p.price || 0;
      const newPrice = oldPrice + (oldPrice * margin) / 100;
      return { ...p, price: parseFloat(newPrice.toFixed(2)) };
    });
    setGeneratedProducts(updated);
    alert(`Margin of ${margin}% applied to AI-chosen products`);
  }

  /** Final creation */
  async function handleCreateCatalog() {
    if (!catalogName || !customerName) {
      alert("Catalog Name and Customer Name are required");
      return;
    }
    if (!generatedProducts || generatedProducts.length === 0) {
      alert("No AI subset found. Please generate again.");
      return;
    }
    try {
      const token = localStorage.getItem("token");
      const productIds = generatedProducts.map((p) => p._id);
      const body = {
        catalogName,
        customerName,
        customerEmail,
        productIds,
        fieldsToDisplay,
        priceRange: { from: fromPrice, to: toPrice }
      };
      await axios.post(`${BACKEND_URL}/api/admin/catalogs`, body, {
        headers: { Authorization: `Bearer ${token}` }
      });
      alert("AI Catalog created successfully!");
      navigate("/admin-dashboard/manage-catalogs");
    } catch (error) {
      console.error("Error creating AI catalog:", error);
      alert("Error creating catalog. Check console.");
    }
  }

  /** Toggle fields to display */
  function toggleField(field) {
    if (fieldsToDisplay.includes(field)) {
      setFieldsToDisplay((prev) => prev.filter((f) => f !== field));
    } else {
      setFieldsToDisplay((prev) => [...prev, field]);
    }
  }

  /** Utility: Toggle item in array-based filter */
  function toggleInArray(value, array, setArray) {
    if (array.includes(value)) {
      setArray(array.filter((x) => x !== value));
    } else {
      setArray([...array, value]);
    }
  }

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">AI-Generated Catalog (Sum Price Range)</h1>

      {step === 1 && (
        <>
          {/* Catalog Info */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block font-medium mb-1">Catalog Name *</label>
              <input
                type="text"
                className="bg-gray-700 w-full p-2 rounded"
                value={catalogName}
                onChange={(e) => setCatalogName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Customer Name *</label>
              <input
                type="text"
                className="bg-gray-700 w-full p-2 rounded"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">Customer Email (optional)</label>
              <input
                type="email"
                className="bg-gray-700 w-full p-2 rounded"
                value={customerEmail}
                onChange={(e) => setCustomerEmail(e.target.value)}
              />
            </div>
          </div>

          {/* Price Range */}
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block font-medium mb-1">From Price</label>
              <input
                type="number"
                className="bg-gray-700 w-full p-2 rounded"
                value={fromPrice}
                onChange={(e) => setFromPrice(parseInt(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className="block font-medium mb-1">To Price *</label>
              <input
                type="number"
                className="bg-gray-700 w-full p-2 rounded"
                value={toPrice}
                onChange={(e) => setToPrice(parseInt(e.target.value) || 0)}
              />
            </div>
          </div>

          {/* Search */}
          <div className="mb-4">
            <label className="block font-medium mb-1">Search Term (optional)</label>
            <input
              type="text"
              className="bg-gray-700 w-full p-2 rounded"
              placeholder="e.g. 'phone', 'shirt', etc."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            {/* Category filter */}
            <div className="relative">
              <button
                onClick={() => setCategoryOpen((o) => !o)}
                className="bg-gray-700 px-3 py-2 rounded"
              >
                Categories ({selectedCategories.length})
              </button>
              {categoryOpen && (
                <div className="absolute mt-2 w-48 bg-gray-800 p-2 rounded z-50">
                  {allCategories.map((cat) => (
                    <label
                      key={cat}
                      className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedCategories.includes(cat)}
                        onChange={() => toggleInArray(cat, selectedCategories, setSelectedCategories)}
                      />
                      <span>{cat}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* SubCategory filter */}
            <div className="relative">
              <button
                onClick={() => setSubCategoryOpen((o) => !o)}
                className="bg-gray-700 px-3 py-2 rounded"
              >
                SubCats ({selectedSubCategories.length})
              </button>
              {subCategoryOpen && (
                <div className="absolute mt-2 w-48 bg-gray-800 p-2 rounded z-50">
                  {allSubCategories.map((sub) => (
                    <label
                      key={sub}
                      className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSubCategories.includes(sub)}
                        onChange={() =>
                          toggleInArray(sub, selectedSubCategories, setSelectedSubCategories)
                        }
                      />
                      <span>{sub}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Brand filter */}
            <div className="relative">
              <button
                onClick={() => setBrandOpen((o) => !o)}
                className="bg-gray-700 px-3 py-2 rounded"
              >
                Brands ({selectedBrands.length})
              </button>
              {brandOpen && (
                <div className="absolute mt-2 w-48 bg-gray-800 p-2 rounded z-50">
                  {allBrands.map((br) => (
                    <label
                      key={br}
                      className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedBrands.includes(br)}
                        onChange={() => toggleInArray(br, selectedBrands, setSelectedBrands)}
                      />
                      <span>{br}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Stock filter */}
            <div className="relative">
              <button
                onClick={() => setStockOpen((o) => !o)}
                className="bg-gray-700 px-3 py-2 rounded"
              >
                Stock ({selectedStockLocations.length})
              </button>
              {stockOpen && (
                <div className="absolute mt-2 w-48 bg-gray-800 p-2 rounded z-50">
                  {allStockLocations.map((loc) => (
                    <label
                      key={loc}
                      className="flex items-center space-x-2 text-sm hover:bg-gray-700 p-1 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={selectedStockLocations.includes(loc)}
                        onChange={() =>
                          toggleInArray(loc, selectedStockLocations, setSelectedStockLocations)
                        }
                      />
                      <span>{loc}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={loading}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700"
          >
            {loading ? "Generating..." : "Generate Subset"}
          </button>
        </>
      )}

      {step === 2 && (
        <>
          <h2 className="text-lg font-bold mb-3">AI-Chosen Subset</h2>
          {generatedProducts.length === 0 ? (
            <p className="text-sm mb-4">No products found within this sum range.</p>
          ) : (
            <div className="grid grid-cols-4 gap-4 mb-4">
              {generatedProducts.map((p) => (
                <div key={p._id} className="bg-gray-800 p-3 rounded flex flex-col">
                  <h4 className="font-bold text-sm mb-1">{p.name}</h4>
                  <p className="text-xs text-gray-400 mb-1">
                    {p.category} {p.subCategory ? `/ ${p.subCategory}` : ""}
                  </p>
                  <p className="text-xs">₹{p.price}</p>
                </div>
              ))}
            </div>
          )}

          {/* Margin + fields */}
          <div className="mb-4 flex items-center">
            <div className="mr-2">
              <label className="block font-medium mb-1">Margin %</label>
              <input
                type="number"
                className="bg-gray-700 w-20 p-2 rounded"
                value={margin}
                onChange={(e) => setMargin(parseFloat(e.target.value) || 0)}
              />
            </div>
            <button
              onClick={handleApplyMargin}
              className="bg-pink-600 px-3 py-2 rounded hover:bg-pink-700 mt-6"
            >
              Apply Margin
            </button>
          </div>

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

          <button
            onClick={handleCreateCatalog}
            className="bg-green-600 px-4 py-2 rounded hover:bg-green-700"
          >
            Create Catalog
          </button>
        </>
      )}
    </div>
  );
}
