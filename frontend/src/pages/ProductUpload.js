// src/pages/ProductManagementPage.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

// Components
import ProductCard from "../components/manageproducts/ProductCard";
import SkeletonCard from "../components/manageproducts/SkeletonCard";
import SingleProductModal from "../components/manageproducts/SingleProductModal";
import DropdownFilter from "../components/manageproducts/DropdownFilter";
import BulkUploadModal from "../components/manageproducts/BulkUploadModal";
import AdminProductDetails from "./AdminProductDetails";

// Helpers
import uploadImage from "../helpers/uploadImage";

export default function ProductManagementPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();
  const location = useLocation();

  // Helper to load state from localStorage
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  // Get page from URL query params or localStorage
  const queryParams = new URLSearchParams(location.search);
  const initialPage = parseInt(queryParams.get("page")) || loadState("productPage", 1);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    subCategories: [],
    brands: [],
    priceRanges: [],
    variationHinges: [],
  });

  const [searchTerm, setSearchTerm] = useState(loadState("productSearchTerm", ""));
  const [selectedCategories, setSelectedCategories] = useState(loadState("productCategories", []));
  const [selectedSubCategories, setSelectedSubCategories] = useState(loadState("productSubCategories", []));
  const [selectedBrands, setSelectedBrands] = useState(loadState("productBrands", []));
  const [selectedPriceRanges, setSelectedPriceRanges] = useState(loadState("productPriceRanges", []));
  const [selectedVariationHinges, setSelectedVariationHinges] = useState(loadState("productVariationHinges", []));

  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {},
  });

  const [singleProductModalOpen, setSingleProductModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState(null);
  const [newProductData, setNewProductData] = useState({
    productTag: "",
    productId: "",
    variantId: "",
    category: "",
    subCategory: "",
    variationHinge: "",
    name: "",
    brandName: "",
    images: [],
    productDetails: "",
    qty: 0,
    MRP_Currency: "",
    MRP: 0,
    MRP_Unit: "",
    deliveryTime: "",
    size: "",
    color: "",
    material: "",
    priceRange: "",
    weight: "",
    hsnCode: "",
    productCost_Currency: "",
    productCost: 0,
    productCost_Unit: "",
    productGST: 0,
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);

  const [advancedSearchActive, setAdvancedSearchActive] = useState(loadState("productAdvancedSearchActive", false));
  const [advancedSearchResults, setAdvancedSearchResults] = useState(loadState("productAdvancedSearchResults", []));
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);

  const [carouselIndexMap, setCarouselIndexMap] = useState(loadState("productCarouselIndexMap", {}));

  // State for product details modal
  const [productDetailsModalOpen, setProductDetailsModalOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // Persist state to localStorage and update URL
  useEffect(() => {
    localStorage.setItem("productPage", JSON.stringify(currentPage));
    const currentQueryParams = new URLSearchParams(location.search);
    if (parseInt(currentQueryParams.get("page")) !== currentPage) {
      navigate(`/admin-dashboard/manage-products?page=${currentPage}`, { replace: true });
    }
  }, [currentPage, navigate, location.search]);

  useEffect(() => {
    localStorage.setItem("productSearchTerm", JSON.stringify(searchTerm));
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem("productCategories", JSON.stringify(selectedCategories));
  }, [selectedCategories]);

  useEffect(() => {
    localStorage.setItem("productSubCategories", JSON.stringify(selectedSubCategories));
  }, [selectedSubCategories]);

  useEffect(() => {
    localStorage.setItem("productBrands", JSON.stringify(selectedBrands));
  }, [selectedBrands]);

  useEffect(() => {
    localStorage.setItem("productPriceRanges", JSON.stringify(selectedPriceRanges));
  }, [selectedPriceRanges]);

  useEffect(() => {
    localStorage.setItem("productVariationHinges", JSON.stringify(selectedVariationHinges));
  }, [selectedVariationHinges]);

  useEffect(() => {
    localStorage.setItem("productAdvancedSearchActive", JSON.stringify(advancedSearchActive));
  }, [advancedSearchActive]);

  useEffect(() => {
    localStorage.setItem("productAdvancedSearchResults", JSON.stringify(advancedSearchResults));
  }, [advancedSearchResults]);

  useEffect(() => {
    localStorage.setItem("productCarouselIndexMap", JSON.stringify(carouselIndexMap));
  }, [carouselIndexMap]);

  // Helpers
  const norm = (s) => (s ? s.toString().trim().toLowerCase() : "");

  const toggleFilter = (value, list, setList) => {
    const newList = list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
    setList(newList);
    return newList;
  };

  const updateCountsFromServer = (data) => {
    const obj = (arr) =>
      Object.fromEntries(arr.map(({ name, count }) => [norm(name), count]));
    setFilterCounts({
      categories: obj(data.categories),
      subCategories: obj(data.subCategories),
      brands: obj(data.brands),
      priceRanges: obj(data.priceRanges),
      variationHinges: obj(data.variationHinges),
    });
  };

  // Load static filter options
  const fetchFilterOptions = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const { categories, subCategories, brands, priceRanges, variationHinges } = res.data;
      setFilterOptions({
        categories: categories.map((c) => c.name),
        subCategories: subCategories.map((c) => c.name),
        brands: brands.map((b) => b.name),
        priceRanges: priceRanges.map((p) => p.name),
        variationHinges: variationHinges.map((v) => v.name),
      });
      updateCountsFromServer(res.data);
    } catch (err) {
      console.error("Error fetching filter options:", err);
    }
  };

  useEffect(() => {
    fetchFilterOptions();
  }, []);

  // Main fetch
  const fetchProducts = async (page = currentPage) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");

      const buildParams = () => {
        const p = new URLSearchParams();
        if (searchTerm) {
          const terms = searchTerm.toLowerCase().split(" ").filter(Boolean);
          p.append("search", terms.join(","));
        }
        if (selectedCategories.length) p.append("categories", selectedCategories.join(","));
        if (selectedSubCategories.length) p.append("subCategories", selectedSubCategories.join(","));
        if (selectedBrands.length) p.append("brands", selectedBrands.join(","));
        if (selectedPriceRanges.length) p.append("priceRanges", selectedPriceRanges.join(","));
        if (selectedVariationHinges.length)
          p.append("variationHinges", selectedVariationHinges.join(","));
        return p;
      };

      const prodParams = buildParams();
      prodParams.append("page", page);
      prodParams.append("limit", limit);

      const prodRes = await axios.get(
        `${BACKEND_URL}/api/admin/products?${prodParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setProducts(prodRes.data.products);
      setTotalPages(prodRes.data.totalPages);
      setCurrentPage(page);

      if (page > prodRes.data.totalPages) {
        setCurrentPage(1);
        localStorage.setItem("productPage", JSON.stringify(1));
        fetchProducts(1);
      }

      const countParams = buildParams();
      const countRes = await axios.get(
        `${BACKEND_URL}/api/admin/products/filters?${countParams.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      updateCountsFromServer(countRes.data);
    } catch (err) {
      console.error("Error fetching products:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts(currentPage);
  }, [currentPage]);

  useEffect(() => {
    setCurrentPage(1);
    localStorage.setItem("productPage", JSON.stringify(1));
    fetchProducts(1);
  }, [
    searchTerm,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
  ]);

  // Single product modal handlers
  const openSingleProductModal = (product = null) => {
    if (product) {
      setEditProductId(product._id);
      setNewProductData({
        productTag: product.productTag || "",
        productId: product.productId || "",
        variantId: product.variantId || "",
        category: product.category || "",
        subCategory: product.subCategory || "",
        variationHinge: product.variationHinge || "",
        name: product.name || "",
        brandName: product.brandName || "",
        images: product.images || [],
        productDetails: product.productDetails || "",
        qty: product.qty || 0,
        MRP_Currency: product.MRP_Currency || "",
        MRP: product.MRP || 0,
        MRP_Unit: product.MRP_Unit || "",
        deliveryTime: product.deliveryTime || "",
        size: product.size || "",
        color: product.color || "",
        material: product.material || "",
        priceRange: product.priceRange || "",
        weight: product.weight || "",
        hsnCode: product.hsnCode || "",
        productCost_Currency: product.productCost_Currency || "",
        productCost: product.productCost || 0,
        productCost_Unit: product.productCost_Unit || "",
        productGST: product.productGST || 0,
      });
    } else {
      setEditProductId(null);
      setNewProductData({
        productTag: "",
        productId: "",
        variantId: "",
        category: "",
        subCategory: "",
        variationHinge: "",
        name: "",
        brandName: "",
        images: [],
        productDetails: "",
        qty: 0,
        MRP_Currency: "",
        MRP: 0,
        MRP_Unit: "",
        deliveryTime: "",
        size: "",
        color: "",
        material: "",
        priceRange: "",
        weight: "",
        hsnCode: "",
        productCost_Currency: "",
        productCost: 0,
        productCost_Unit: "",
        productGST: 0,
      });
    }
    setSingleProductModalOpen(true);
  };

  const closeSingleProductModal = () => setSingleProductModalOpen(false);

  const handleSingleProductSubmit = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("token");
      const finalImages = (newProductData.images || []).filter((img) => typeof img === "string" && img.trim());
      const payload = { ...newProductData, images: finalImages };

      if (!editProductId) {
        await axios.post(`${BACKEND_URL}/api/admin/products`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${BACKEND_URL}/api/admin/products/${editProductId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      }
      fetchProducts(currentPage);
      closeSingleProductModal();
    } catch (err) {
      console.error("Error creating/updating product:", err);
      alert("Error. Check console.");
    } finally {
      setUploadProgress(0);
    }
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const newImages = [];
    for (const file of files) {
      try {
        const uploadedImage = await uploadImage(file);
        if (uploadedImage && uploadedImage.secure_url) newImages.push(uploadedImage.secure_url);
      } catch (err) {
        console.error("Image upload error:", err);
      }
    }
    setNewProductData((prev) => ({ ...prev, images: [...prev.images, ...newImages] }));
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts(currentPage);
      if (displayProducts[selectedProductIndex]?._id === id) {
        setProductDetailsModalOpen(false);
      }
    } catch (err) {
      console.error("Error deleting product:", err);
    }
  };

  // Bulk upload
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    multiple: false,
    onDrop: async ([file]) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: "array" });
        const sheet = wb.Sheets[wb.SheetNames[0]];
        setCsvData(XLSX.utils.sheet_to_json(sheet));
      };
      reader.readAsArrayBuffer(file);
    },
  });

  const processBulkUpload = async () => {
    if (!csvData.length) return alert("No CSV data to upload");
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const productsToUpload = csvData.map((row) => ({
        productTag: row["Product Tag"] || "",
        productId: row["Product ID"] || "",
        variantId: row["Variant ID"] || "",
        category: row["Category"] || "",
        subCategory: row["Sub Category"] || "",
        variationHinge: row["Variation_hinge"] || "",
        name: row["Name"] || "",
        brandName: row["Brand Name"] || "",
        images: [
          row["Main_Image_URL"],
          row["Second_Image_URL"],
          row["Third_Image_URL"],
          row["Fourth_Image_URL"],
          row["Other_image_URL"],
        ].filter(Boolean),
        productDetails: row["Product_Details (optional)"] || "",
        qty: row["Qty"] || 0,
        MRP_Currency: row["MRP_Currency"] || "",
        MRP: row["MRP"] || 0,
        MRP_Unit: row["MRP_Unit"] || "",
        deliveryTime: row["Delivery Time"] || "",
        size: row["Size"] || "",
        color: row["Color"] || "",
        material: row["Material"] || "",
        priceRange: row["Price Range"] || "",
        weight: row["Weight"] || "",
        hsnCode: row["HSN Code"] || "",
        productCost_Currency: row["Product Cost_Currency"] || "",
        productCost: row["Product Cost"] || 0,
        productCost_Unit: row["Product Cost_Unit"] || "",
        productGST: row["ProductGST"] != null ? Number(row["ProductGST"]) : 0,
      }));
      await axios.post(`${BACKEND_URL}/api/admin/products/bulk`, productsToUpload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Bulk upload successful!");
      setCsvData([]);
      fetchProducts(currentPage);
    } catch (err) {
      console.error("Bulk upload error:", err);
      alert("Error uploading. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headerRow = [
      "Product Tag (required)",
      "Product ID (required)",
      "Variant ID (optional)",
      "Category (required)",
      "Sub Category (optional)",
      "Variation_hinge (optional)",
      "Name (required)",
      "Brand Name (optional)",
      "Qty",
      "MRP_Currency",
      "MRP",
      "MRP_Unit",
      "Delivery Time",
      "Size",
      "Color",
      "Material",
      "Price Range",
      "Weight",
      "HSN Code",
      "Product Cost_Currency",
      "Product Cost",
      "Product Cost_Unit",
      "Product_Details (optional)",
      "Main_Image_URL (optional)",
      "Second_Image_URL (optional)",
      "Third_Image_URL (optional)",
      "Fourth_Image_URL (optional)",
      "Other_image_URL (optional)",
      "ProductGST (optional)",
    ];
    const exampleRow = [
      "Tag123",
      "Prod123",
      "Var001",
      "CategoryX",
      "SubY",
      "",
      "Sample Name",
      "BrandZ",
      100,
      "INR",
      999.99,
      "per unit",
      "3-5 days",
      "M",
      "Red",
      "Cotton",
      "Budget",
      "500g",
      "HSN123",
      "INR",
      750,
      "per unit",
      "Some details",
      "https://example.com/img1.jpg",
      "",
      "",
      "",
      "",
      18,
    ];
    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const blob = new Blob([XLSX.write(wb, { bookType: "xlsx", type: "array" })], {
      type: "application/octet-stream",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "bulk-upload-template.xlsx";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Advanced image search
  const { getRootProps: advRoot, getInputProps: advInput } = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: useCallback(async ([file]) => {
      try {
        setAdvancedSearchLoading(true);
        const token = localStorage.getItem("token");
        const formData = new FormData();
        formData.append("image", file);
        const res = await axios.post(`${BACKEND_URL}/api/products/advanced-search`, formData, {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "multipart/form-data" },
        });
        setAdvancedSearchResults(res.data.products);
        setAdvancedSearchActive(true);
      } catch (err) {
        console.error("Image search error:", err);
        alert("Image search failed");
      } finally {
        setAdvancedSearchLoading(false);
      }
    }, [BACKEND_URL]),
  });

  const clearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  // Image carousel handlers
  const handleNextImage = (id) => {
    setCarouselIndexMap((prev) => {
      const p = products.find((x) => x._id === id);
      if (!p?.images?.length) return prev;
      const idx = ((prev[id] || 0) + 1) % p.images.length;
      return { ...prev, [id]: idx };
    });
  };

  const handlePrevImage = (id) => {
    setCarouselIndexMap((prev) => {
      const p = products.find((x) => x._id === id);
      if (!p?.images?.length) return prev;
      const idx = (prev[id] || 0) - 1 + p.images.length;
      return { ...prev, [id]: idx % p.images.length };
    });
  };

  // Product details modal handlers
  const handleViewProduct = (id) => {
    const index = displayProducts.findIndex((p) => p._id === id);
    if (index !== -1) {
      setSelectedProductIndex(index);
      setProductDetailsModalOpen(true);
    }
  };

  const handleNextProduct = () => {
    setSelectedProductIndex((prev) => (prev + 1) % displayProducts.length);
  };

  const handlePrevProduct = () => {
    setSelectedProductIndex((prev) => (prev - 1 + displayProducts.length) % displayProducts.length);
  };

  const closeProductDetailsModal = () => {
    setProductDetailsModalOpen(false);
    setSelectedProductIndex(0);
  };

  const handleEditToggle = () => {
    fetchProducts(currentPage); // Refresh product list after edit
  };

  // Pagination
  const prevPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const nextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  // Clear filters
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setSelectedVariationHinges([]);
    setCurrentPage(1);
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
    setCarouselIndexMap({});
    localStorage.removeItem("productSearchTerm");
    localStorage.removeItem("productCategories");
    localStorage.removeItem("productSubCategories");
    localStorage.removeItem("productBrands");
    localStorage.removeItem("productPriceRanges");
    localStorage.removeItem("productVariationHinges");
    localStorage.removeItem("productPage");
    localStorage.removeItem("productAdvancedSearchActive");
    localStorage.removeItem("productAdvancedSearchResults");
    localStorage.removeItem("productCarouselIndexMap");
  };

  // Product Details Modal Component
  const ProductDetailsModal = ({ isOpen, onClose, product, onNext, onPrev }) => {
    if (!isOpen || !product) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-600 hover:text-gray-800 text-2xl"
            aria-label="Close"
          >
            ×
          </button>
          {/* Navigation Arrows */}
          <div className="absolute top-1/2 transform -translate-y-1/2 flex justify-between w-full px-4">
            <button
              onClick={onPrev}
              className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-600"
              aria-label="Previous Product"
            >
              ←
            </button>
            <button
              onClick={onNext}
              className="bg-gray-800 text-white p-2 rounded-full hover:bg-gray-600"
              aria-label="Next Product"
            >
              →
            </button>
          </div>
          {/* Product Details */}
          <div className="p-6">
            <AdminProductDetails product={product} onEditToggle={handleEditToggle} />
          </div>
        </div>
      </div>
    );
  };

  // Render
  const displayProducts = advancedSearchActive ? advancedSearchResults : products;
  const { categories, subCategories, brands, priceRanges, variationHinges } = filterOptions;

  return (
    <div className="bg-white text-gray-800 min-h-screen">
      <div className="md:p-6 p-4 max-w-7xl mx-auto">
        {/* SEARCH + IMAGE SEARCH + ACTION BUTTONS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search by any field..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={loading}
            />
            <div
              {...advRoot()}
              className={`flex items-center px-3 py-2 bg-[#Ff8045] text-white rounded cursor-pointer hover:opacity-90 ${loading ? "opacity-50 pointer-events-none" : ""}`}
            >
              <input {...advInput()} disabled={loading} />
              {advancedSearchLoading ? (
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm">Search by Image</span>
              )}
            </div>
            {advancedSearchActive && (
              <button
                onClick={clearAdvancedSearch}
                className="text-sm px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
                disabled={loading}
              >
                Clear Image Search
              </button>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => openSingleProductModal()}
              className="px-4 py-2 bg-[#Ff8045] text-white rounded hover:opacity-90"
              disabled={loading}
            >
              Upload Single Product
            </button>
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="px-4 py-2 bg-[#66C3D0] text-white rounded hover:opacity-90"
              disabled={loading}
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            Found {displayProducts.length} products with "{searchTerm}"
          </div>
        )}

        {(searchTerm ||
          selectedCategories.length ||
          selectedSubCategories.length ||
          selectedBrands.length ||
          selectedPriceRanges.length ||
          selectedVariationHinges.length) && (
          <div className="mb-4">
            <button onClick={clearFilters} className="px-4 py-2 bg-red-500 text-white text-xs rounded" disabled={loading}>
              Clear Filters
            </button>
          </div>
        )}

        {/* FILTERS */}
        <div className="flex flex-wrap gap-4 mb-6">
          <DropdownFilter
            label={`Categories (${selectedCategories.length})`}
            isOpen={categoryOpen}
            setIsOpen={setCategoryOpen}
            options={categories}
            selectedOptions={selectedCategories}
            toggleOption={(v) => toggleFilter(v, selectedCategories, setSelectedCategories)}
            filterCounts={filterCounts.categories}
            disabled={loading}
          />
          <DropdownFilter
            label={`SubCats (${selectedSubCategories.length})`}
            isOpen={subCategoryOpen}
            setIsOpen={setSubCategoryOpen}
            options={subCategories}
            selectedOptions={selectedSubCategories}
            toggleOption={(v) => toggleFilter(v, selectedSubCategories, setSelectedSubCategories)}
            filterCounts={filterCounts.subCategories}
            disabled={loading}
          />
          <DropdownFilter
            label={`Brands (${selectedBrands.length})`}
            isOpen={brandOpen}
            setIsOpen={setBrandOpen}
            options={brands}
            selectedOptions={selectedBrands}
            toggleOption={(v) => toggleFilter(v, selectedBrands, setSelectedBrands)}
            filterCounts={filterCounts.brands}
            disabled={loading}
          />
          <DropdownFilter
            label={`Price Range (${selectedPriceRanges.length})`}
            isOpen={priceRangeOpen}
            setIsOpen={setPriceRangeOpen}
            options={priceRanges}
            selectedOptions={selectedPriceRanges}
            toggleOption={(v) => toggleFilter(v, selectedPriceRanges, setSelectedPriceRanges)}
            filterCounts={filterCounts.priceRanges}
            disabled={loading}
          />
          <DropdownFilter
            label={`Variation Hinge (${selectedVariationHinges.length})`}
            isOpen={variationHingeOpen}
            setIsOpen={setVariationHingeOpen}
            options={variationHinges}
            selectedOptions={selectedVariationHinges}
            toggleOption={(v) => toggleFilter(v, selectedVariationHinges, setSelectedVariationHinges)}
            filterCounts={filterCounts.variationHinges}
            disabled={loading}
          />
        </div>

        {/* PRODUCT GRID */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {displayProducts
              .slice()
              .sort((a, b) => {
                if (!searchTerm) return 0;
                const term = searchTerm.toLowerCase();
                const aMatch = (a.brandName || "").toLowerCase().includes(term);
                const bMatch = (b.brandName || "").toLowerCase().includes(term);
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
              })
              .map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  handleViewProduct={handleViewProduct}
                  handleDeleteProduct={handleDeleteProduct}
                  openSingleProductModal={openSingleProductModal}
                  carouselIndexMap={carouselIndexMap}
                  handleNextImage={handleNextImage}
                  handlePrevImage={handlePrevImage}
                />
              ))}
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={prevPage}
            disabled={currentPage <= 1 || loading}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={nextPage}
            disabled={currentPage >= totalPages || loading}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* MODALS */}
      {singleProductModalOpen && (
        <SingleProductModal
          editProductId={editProductId}
          newProductData={newProductData}
          setNewProductData={setNewProductData}
          handleSingleProductSubmit={handleSingleProductSubmit}
          closeSingleProductModal={closeSingleProductModal}
          handleFileChange={handleFileChange}
          uploadProgress={uploadProgress}
          categories={filterOptions.categories}
          subCategories={filterOptions.subCategories}
          brands={filterOptions.brands}
        />
      )}
      {bulkUploadOpen && (
        <BulkUploadModal
          onClose={() => setBulkUploadOpen(false)}
          getRootProps={getRootProps}
          getInputProps={getInputProps}
          handleDownloadTemplate={handleDownloadTemplate}
          processBulkUpload={processBulkUpload}
          csvData={csvData}
        />
      )}
      {productDetailsModalOpen && (
        <ProductDetailsModal
          isOpen={productDetailsModalOpen}
          onClose={closeProductDetailsModal}
          product={displayProducts[selectedProductIndex]}
          onNext={handleNextProduct}
          onPrev={handlePrevProduct}
        />
      )}
    </div>
  );
}