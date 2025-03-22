"use client";

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import FilterBar from "../components/FilterBar";
import ProductGrid from "../components/ProductGrid";
import Loader from "../components/Loader";
import { useNavigate } from "react-router-dom";

export default function SelectProductsForViewer() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStockLocations, setSelectedStockLocations] = useState([]);
  const [carouselIndexMap, setCarouselIndexMap] = useState({});
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [isAdvancedSearchLoading, setIsAdvancedSearchLoading] = useState(false);
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Dropdown states for FilterBar
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);

  // Advanced image search dropzone
  const { getRootProps: advGetRootProps, getInputProps: advGetInputProps } = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: useCallback(async ([file]) => {
      try {
        setIsAdvancedSearchLoading(true);
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("image", file);
        const res = await axios.post(
          `${BACKEND_URL}/api/products/advanced-search`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "multipart/form-data",
            },
          }
        );
        setAdvancedSearchResults(res.data);
        setAdvancedSearchActive(true);
        setIsAdvancedSearchLoading(false);
      } catch (error) {
        console.error("Error in advanced search:", error);
        alert("Image search failed");
        setIsAdvancedSearchLoading(false);
      }
    }, [BACKEND_URL]),
  });

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  const fetchProducts = async () => {
    setLoading(true);
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

  useEffect(() => {
    fetchProducts();
  }, []);

  // Generate filter options
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const subCategories = Array.from(new Set(products.map((p) => p.subCategory).filter(Boolean)));
  const brands = Array.from(new Set(products.map((p) => p.brandName).filter(Boolean)));
  const stockLocations = Array.from(new Set(products.map((p) => p.stockCurrentlyWith).filter(Boolean)));

  const toggleCategory = (cat) => {
    setSelectedCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };
  const toggleSubCategory = (sub) => {
    setSelectedSubCategories((prev) =>
      prev.includes(sub) ? prev.filter((c) => c !== sub) : [...prev, sub]
    );
  };
  const toggleBrand = (br) => {
    setSelectedBrands((prev) =>
      prev.includes(br) ? prev.filter((c) => c !== br) : [...prev, br]
    );
  };
  const toggleStockLocation = (loc) => {
    setSelectedStockLocations((prev) =>
      prev.includes(loc) ? prev.filter((c) => c !== loc) : [...prev, loc]
    );
  };

  const filteredProducts = products.filter((prod) => {
    const term = searchTerm.toLowerCase();
    const combinedString = (
      prod.productTag +
      prod.productId +
      prod.variantId +
      prod.category +
      prod.subCategory +
      prod.variationHinge +
      prod.name +
      prod.brandName +
      prod.stockCurrentlyWith +
      (prod.price || "") +
      (prod.productDetails || "")
    ).toLowerCase();
    const matchesSearch = !searchTerm || combinedString.includes(term);
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(prod.category);
    const matchesSubCategory =
      selectedSubCategories.length === 0 || selectedSubCategories.includes(prod.subCategory);
    const matchesBrand =
      selectedBrands.length === 0 || selectedBrands.includes(prod.brandName);
    const matchesStock =
      selectedStockLocations.length === 0 || selectedStockLocations.includes(prod.stockCurrentlyWith);
    return matchesSearch && matchesCategory && matchesSubCategory && matchesBrand && matchesStock;
  });

  const displayedProducts = advancedSearchActive ? advancedSearchResults : filteredProducts;

  // Toggle select/deselect a product
  const toggleSelectProduct = (prodId) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  // Select all displayed products
  const handleSelectAllProducts = () => {
    const allIds = displayedProducts.map((p) => p._id);
    setSelectedProductIds(allIds);
  };

  // Fixed proceed button at bottom right
  const handleProceed = () => {
    localStorage.setItem("selectedViewerProductIds", JSON.stringify(selectedProductIds));
    navigate("/admin-dashboard/viewer-manager");
  };

  const handleClose = () => {
    navigate("/admin-dashboard/viewer-manager");
  };

  const handleNextImage = (prodId) => {
    setCarouselIndexMap((prev) => {
      const next = { ...prev };
      const p = products.find((x) => x._id === prodId);
      if (!p || !p.images || p.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      const newIndex = (currentIndex + 1) % p.images.length;
      next[prodId] = newIndex;
      return next;
    });
  };

  const handlePrevImage = (prodId) => {
    setCarouselIndexMap((prev) => {
      const next = { ...prev };
      const p = products.find((x) => x._id === prodId);
      if (!p || !p.images || p.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      const newIndex = (currentIndex - 1 + p.images.length) % p.images.length;
      next[prodId] = newIndex;
      return next;
    });
  };

  return (
    <div className="p-6 bg-purple-200 text-gray-900 min-h-screen relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex gap-4 items-center w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search by any field..."
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              if (advancedSearchActive) handleClearAdvancedSearch();
            }}
          />
          <div
            {...advGetRootProps()}
            className="flex items-center px-3 py-2 bg-white border border-gray-300 rounded cursor-pointer hover:bg-gray-100"
          >
            <input {...advGetInputProps()} />
            <span className="text-sm text-gray-800">Search by Image</span>
          </div>
          {isAdvancedSearchLoading && <Loader />}
          {advancedSearchActive && (
            <button
              onClick={handleClearAdvancedSearch}
              className="bg-pink-600 px-3 py-2 rounded hover:bg-pink-700 text-sm text-white"
            >
              Clear Image Search
            </button>
          )}
        </div>
        <div className="flex gap-4 mt-4 md:mt-0">
          <button
            onClick={handleSelectAllProducts}
            className="bg-blue-600 px-4 py-2 rounded hover:bg-blue-700 text-sm text-white"
          >
            Select All
          </button>
          <button
            onClick={handleClose}
            className="bg-gray-500 px-4 py-2 rounded hover:bg-gray-400 text-sm text-white"
          >
            Close
          </button>
        </div>
      </div>

      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        advancedSearchActive={advancedSearchActive}
        handleClearAdvancedSearch={handleClearAdvancedSearch}
        advGetRootProps={advGetRootProps}
        advGetInputProps={advGetInputProps}
        categories={categories}
        subCategories={subCategories}
        brands={brands}
        stockLocations={stockLocations}
        selectedCategories={selectedCategories}
        toggleCategory={toggleCategory}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
        selectedSubCategories={selectedSubCategories}
        toggleSubCategory={toggleSubCategory}
        subCategoryOpen={subCategoryOpen}
        setSubCategoryOpen={setSubCategoryOpen}
        selectedBrands={selectedBrands}
        toggleBrand={toggleBrand}
        brandOpen={brandOpen}
        setBrandOpen={setBrandOpen}
        selectedStockLocations={selectedStockLocations}
        toggleStockLocation={toggleStockLocation}
        stockOpen={stockOpen}
        setStockOpen={setStockOpen}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 p-4 rounded animate-pulse">
              <div className="bg-gray-300 h-40 w-full rounded mb-4"></div>
              <div className="h-5 bg-gray-300 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-gray-300 rounded w-1/2 mb-2"></div>
            </div>
          ))}
        </div>
      ) : (
        <ProductGrid
          products={displayedProducts}
          carouselIndexMap={carouselIndexMap}
          handlePrevImage={handlePrevImage}
          handleNextImage={handleNextImage}
          openSingleProductModal={() => {}}
          handleDeleteProduct={() => {}}
          loading={loading}
          selectedProductIds={selectedProductIds}
          toggleSelectProduct={toggleSelectProduct}
        />
      )}

      {/* Fixed Proceed Button */}
      <div className="fixed bottom-4 right-4 z-30">
        <button
          onClick={handleProceed}
          className="bg-green-600 px-6 py-3 rounded hover:bg-green-700 text-sm shadow-lg text-white"
        >
          Proceed with {selectedProductIds.length} product
          {selectedProductIds.length !== 1 && "s"}
        </button>
      </div>
    </div>
  );
}
