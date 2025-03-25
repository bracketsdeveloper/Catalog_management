import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";  // <-- Ensure this is present
import FilterBarForViewer from "../components/FilterBarforViewer.jsx";
import ProductCardforViewer from "../components/ProductCardforViewer.jsx";
import Loader from "../components/Loader";

// Define default visible attributes for the viewer
const defaultAttributes = [
  "name",
  "category",
  "subCategory",
  "brandName",
  "productCost",       // new price field
  "variationHinge",
  "productDetails",
  "color",
  "size",
  "material",
];

export default function ViewerDashboard() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [visibleAttributes, setVisibleAttributes] = useState(defaultAttributes);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  // Filters (derived from fetched products)
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);

  // Advanced image search states
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [isAdvancedSearchLoading, setIsAdvancedSearchLoading] = useState(false);

  // Carousel state for product images
  const [carouselIndexMap, setCarouselIndexMap] = useState({});

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Viewer endpoint returns products & visibleAttributes for this viewer
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

  // Derived filter options from fetched products
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean)));
  const subCategories = Array.from(new Set(products.map((p) => p.subCategory).filter(Boolean)));
  const brands = Array.from(new Set(products.map((p) => p.brandName).filter(Boolean)));

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

  // Filter products based on search term and selected filters
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
      (prod.productCost || "") +
      (prod.productDetails || "")
    ).toLowerCase();
    const matchesSearch = !searchTerm || combinedString.includes(term);
    const matchesCategory = selectedCategories.length === 0 || selectedCategories.includes(prod.category);
    const matchesSubCategory = selectedSubCategories.length === 0 || selectedSubCategories.includes(prod.subCategory);
    const matchesBrand = selectedBrands.length === 0 || selectedBrands.includes(prod.brandName);
    return matchesSearch && matchesCategory && matchesSubCategory && matchesBrand;
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
      } catch (error) {
        console.error("Error in advanced search:", error);
        alert("Image search failed");
      } finally {
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
      const p = products.find((x) => x._id === prodId);
      if (!p || !p.images || p.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      next[prodId] = (currentIndex + 1) % p.images.length;
      return next;
    });
  };

  const handlePrevImage = (prodId) => {
    setCarouselIndexMap((prev) => {
      const next = { ...prev };
      const p = products.find((x) => x._id === prodId);
      if (!p || !p.images || p.images.length === 0) return prev;
      const currentIndex = prev[prodId] || 0;
      next[prodId] = (currentIndex - 1 + p.images.length) % p.images.length;
      return next;
    });
  };

  const handleViewProduct = (prodId) => {
    navigate(`/product-details/${prodId}`);
  };

  return (
    <div className="p-6 bg-white text-gray-900 min-h-screen">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-purple-700">Viewer Dashboard</h1>
        <p className="text-sm text-blue-600">
          Accessible products displayed with your selected attributes.
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
        // For viewer, we’re not using stock currently; omit that filter if not needed.
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
      />

      {isAdvancedSearchLoading && <Loader />}
      {advancedSearchActive && (
        <button
          onClick={handleClearAdvancedSearch}
          className="bg-pink-600 px-3 py-2 rounded hover:bg-pink-700 text-sm text-white mb-4"
        >
          Clear Image Search
        </button>
      )}

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
