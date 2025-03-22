import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import Loader from "../components/Loader";
import FilterBarForViewer from "../components/FilterBarforViewer.jsx";
import ProductCardforViewer from "../components/ProductCardforViewer.jsx";

export default function ViewerDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const defaultAttributes = [
    "price",
    "category",
    "subCategory",
    "brandName",
    "stockCurrentlyWith",
    "productDetails",
    "name",
  ];

  const [products, setProducts] = useState([]);
  const [visibleAttributes, setVisibleAttributes] = useState(defaultAttributes);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStockLocations, setSelectedStockLocations] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [isAdvancedSearchLoading, setIsAdvancedSearchLoading] = useState(false);
  const [carouselIndexMap, setCarouselIndexMap] = useState({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // The viewer endpoint returns an object with products and visibleAttributes.
      const res = await axios.get(`${BACKEND_URL}/api/viewer/products`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.products);
      setVisibleAttributes(res.data.visibleAttributes || defaultAttributes);
    } catch (error) {
      console.error("Error fetching products for viewer:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Derived filter options based on fetched products.
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
      (prod.productTag || "") +
      (prod.productId || "") +
      (prod.variantId || "") +
      (prod.category || "") +
      (prod.subCategory || "") +
      (prod.variationHinge || "") +
      (prod.name || "") +
      (prod.brandName || "") +
      (prod.stockCurrentlyWith || "") +
      (prod.price || "") +
      (prod.productDetails || "")
    ).toLowerCase();
    const matchesSearch = !searchTerm || combinedString.includes(term);
    const matchesCategory =
      selectedCategories.length === 0 || selectedCategories.includes(prod.category);
    const matchesSubCategory =
      selectedSubCategories.length === 0 || selectedSubCategories.includes(prod.subCategory);
    const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(prod.brandName);
    const matchesStock =
      selectedStockLocations.length === 0 || selectedStockLocations.includes(prod.stockCurrentlyWith);
    return matchesSearch && matchesCategory && matchesSubCategory && matchesBrand && matchesStock;
  });

  const displayedProducts = advancedSearchActive ? advancedSearchResults : filteredProducts;

  const { getRootProps: advGetRootProps, getInputProps: advGetInputProps } = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: useCallback(async ([file]) => {
      try {
        setIsAdvancedSearchLoading(true);
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("image", file);
        const res = await axios.post(`${BACKEND_URL}/api/products/advanced-search`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
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

  const handleNextImage = (prodId) => {
    setCarouselIndexMap((prev) => {
      const next = { ...prev };
      const product = products.find((p) => p._id === prodId);
      if (!product || !product.images || product.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      next[prodId] = (currentIndex + 1) % product.images.length;
      return next;
    });
  };

  const handlePrevImage = (prodId) => {
    setCarouselIndexMap((prev) => {
      const next = { ...prev };
      const product = products.find((p) => p._id === prodId);
      if (!product || !product.images || product.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      next[prodId] = (currentIndex - 1 + product.images.length) % product.images.length;
      return next;
    });
  };

  const handleViewProduct = (prodId) => {
    navigate(`/product-details/${prodId}`);
  };

  return (
    <div className="p-4 md:p-6 bg-gray-900 text-gray-200 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Viewer Dashboard</h1>
        <p className="text-sm text-gray-400">
          Showing your accessible products with assigned attributes.
        </p>
      </div>

      <FilterBarForViewer
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        visibleAttributes={visibleAttributes}
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

      {/* <div className="mb-4 flex items-center gap-4">
        <div
          {...advGetRootProps()}
          className="flex items-center px-3 py-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600"
        >
          <input {...advGetInputProps()} />
          <span className="text-sm">Search by Image</span>
        </div>
        {isAdvancedSearchLoading && <Loader />}
        {advancedSearchActive && (
          <button
            onClick={handleClearAdvancedSearch}
            className="bg-red-600 px-3 py-2 rounded hover:bg-red-700 text-sm"
          >
            Clear Image Search
          </button>
        )}
      </div> */}

      {loading ? (
        <div className="flex justify-center items-center">
          <Loader />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {displayedProducts.map((product) => (
            <div
              key={product._id}
              onClick={() => handleViewProduct(product._id)}
              className="cursor-pointer hover:opacity-90"
            >
              <ProductCardforViewer
                product={product}
                visibleAttributes={visibleAttributes}
                carouselIndex={carouselIndexMap[product._id] || 0}
                handlePrevImage={handlePrevImage}
                handleNextImage={handleNextImage}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
