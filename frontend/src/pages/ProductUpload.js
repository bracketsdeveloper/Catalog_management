"use client"; // Remove if you're using Create React App

import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";

// Components
import ProductCard from "../components/manageproducts/ProductCard";
import SkeletonCard from "../components/manageproducts/SkeletonCard";
import SingleProductModal from "../components/manageproducts/SingleProductModal";
import DropdownFilter from "../components/manageproducts/DropdownFilter";
import FilterItem from "../components/manageproducts/FilterItem";

// Helpers
import uploadImage from "../helpers/uploadImage";

export default function ProductManagementPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // ---------------------- STATES ----------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  // Separate filter options (fetched from backend)
  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);

  // Single product modal
  const [singleProductModalOpen, setSingleProductModalOpen] = useState(false);
  const [editProductId, setEditProductId] = useState(null);

  // Include productGST in our default data
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
    productGST: 0 // <-- NEW
  });

  const [uploadProgress, setUploadProgress] = useState(0);

  // Bulk upload
  const [bulkMode, setBulkMode] = useState(false);
  const [csvData, setCsvData] = useState([]);

  // Filters + search (selected filters)
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);

  // Dropdown open/close states
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  // Carousel indices
  const [carouselIndexMap, setCarouselIndexMap] = useState({});

  // Advanced image search
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);

  // Modify the state definitions
  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {}
  });

  // ---------------------- FETCH FILTER OPTIONS ----------------------
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        // Create count maps
        const counts = {
          categories: {},
          subCategories: {},
          brands: {},
          priceRanges: {},
          variationHinges: {}
        };

        res.data.categories.forEach(c => counts.categories[c.name] = c.count);
        res.data.subCategories.forEach(c => counts.subCategories[c.name] = c.count);
        res.data.brands.forEach(c => counts.brands[c.name] = c.count);
        res.data.priceRanges.forEach(c => counts.priceRanges[c.name] = c.count);
        res.data.variationHinges.forEach(c => counts.variationHinges[c.name] = c.count);

        setFilterCounts(counts);
        
        // Set filter options
        setFullCategories(res.data.categories.map(c => c.name).sort());
        setFullSubCategories(res.data.subCategories.map(c => c.name).sort());
        setFullBrands(res.data.brands.map(c => c.name).sort());
        setFullPriceRanges(res.data.priceRanges.map(c => c.name).sort((a, b) => a - b));
        setFullVariationHinges(res.data.variationHinges.map(c => c.name).sort());
      } catch (error) {
        console.error("Error fetching filter options:", error);
      }
    };
    fetchFilterOptions();
  }, [BACKEND_URL]);

  // ---------------------- FETCH PRODUCTS (WITH SERVER-SIDE FILTERING & PAGINATION) ----------------------
  const fetchProducts = async (page = currentPage) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategories.length > 0)
        params.append("categories", selectedCategories.join(","));
      if (selectedSubCategories.length > 0)
        params.append("subCategories", selectedSubCategories.join(","));
      if (selectedBrands.length > 0)
        params.append("brands", selectedBrands.join(","));
      if (selectedPriceRanges.length > 0)
        params.append("priceRanges", selectedPriceRanges.join(","));
      if (selectedVariationHinges.length > 0)
        params.append("variationHinges", selectedVariationHinges.join(","));

      const res = await axios.get(
        `${BACKEND_URL}/api/admin/products?${params.toString()}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setProducts(res.data.products);
      setCurrentPage(res.data.currentPage);
      setTotalPages(res.data.totalPages);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Refetch products when filter selections or search term changes
  useEffect(() => {
    fetchProducts(1);
    // eslint-disable-next-line
  }, [
    searchTerm,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges
  ]);

  // ---------------------- HELPER: Toggle Filter ----------------------
  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  // ---------------------- SINGLE PRODUCT MODAL HANDLERS ----------------------
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
        productGST: product.productGST || 0 // <-- load existing GST
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
        productGST: 0 // <-- default GST
      });
    }
    setSingleProductModalOpen(true);
  };

  const closeSingleProductModal = () => {
    setSingleProductModalOpen(false);
  };

  const handleSingleProductSubmit = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("token");

      // Ensure images are valid strings
      const finalImages = (newProductData.images || []).filter(
        (img) => typeof img === "string" && img.trim() !== ""
      );

      const payload = {
        ...newProductData,
        images: finalImages
      };

      if (!editProductId) {
        // Create new product
        await axios.post(`${BACKEND_URL}/api/admin/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
        // Update existing product
        await axios.put(
          `${BACKEND_URL}/api/admin/products/${editProductId}`,
          payload,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
      }

      fetchProducts();
      closeSingleProductModal();
    } catch (error) {
      console.error("Error creating/updating product:", error);
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
        if (uploadedImage && uploadedImage.secure_url) {
          newImages.push(uploadedImage.secure_url);
        } else {
          console.error("Image upload failed:", uploadedImage);
        }
      } catch (error) {
        console.error("Error during image upload:", error);
      }
    }
    // Update the product data state with the new image URLs
    setNewProductData((prev) => {
      const updatedImages = [...prev.images, ...newImages];
      return { ...prev, images: updatedImages };
    });
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
    }
  };

  // ---------------------- BULK UPLOAD ----------------------
  const { getRootProps, getInputProps } = useDropzone({
    accept: {
      "text/csv": [".csv"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"]
    },
    multiple: false,
    onDrop: async ([file]) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonData = XLSX.utils.sheet_to_json(sheet);
        setCsvData(jsonData);
      };
      reader.readAsArrayBuffer(file);
    }
  });

  const processBulkUpload = async () => {
    if (csvData.length === 0) {
      alert("No CSV data to upload");
      return;
    }
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
          row["Other_image_URL"]
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
        // If you store GST in CSV, parse that here as well
        productGST: row["ProductGST"] != null ? Number(row["ProductGST"]) : 0
      }));

      await axios.post(`${BACKEND_URL}/api/admin/products/bulk`, productsToUpload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert("Bulk upload successful!");
      setCsvData([]);
      fetchProducts();
    } catch (error) {
      console.error("Bulk upload error:", error);
      alert("Error uploading. Check console.");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = () => {
    const wb = XLSX.utils.book_new();
    const headerRow = [
      { v: "Product Tag (required)" },
      { v: "Product ID (required)" },
      { v: "Variant ID (optional)" },
      { v: "Category (required)" },
      { v: "Sub Category (optional)" },
      { v: "Variation_hinge (optional)" },
      { v: "Name (required)" },
      { v: "Brand Name (optional)" },
      { v: "Qty" },
      { v: "MRP_Currency" },
      { v: "MRP" },
      { v: "MRP_Unit" },
      { v: "Delivery Time" },
      { v: "Size" },
      { v: "Color" },
      { v: "Material" },
      { v: "Price Range" },
      { v: "Weight" },
      { v: "HSN Code" },
      { v: "Product Cost_Currency" },
      { v: "Product Cost" },
      { v: "Product Cost_Unit" },
      { v: "Product_Details (optional)" },
      { v: "Main_Image_URL (optional)" },
      { v: "Second_Image_URL (optional)" },
      { v: "Third_Image_URL (optional)" },
      { v: "Fourth_Image_URL (optional)" },
      { v: "Other_image_URL (optional)" },
      // Add your ProductGST column if needed:
      { v: "ProductGST (optional)" }
    ];

    const exampleRow = [
      "Tag123",
      "Prod123",
      "Var001",
      "CategoryX",
      "SubCategoryY",
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
      "Some product info",
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "",
      "",
      "",
      // Add example GST value
      18 // ProductGST
    ];

    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    const wbOut = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([wbOut], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", "bulk-upload-template.xlsx");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // ---------------------- ADVANCED (IMAGE) SEARCH ----------------------
  const {
    getRootProps: advGetRootProps,
    getInputProps: advGetInputProps
  } = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: useCallback(
      async ([file]) => {
        try {
          setAdvancedSearchLoading(true);
          const token = localStorage.getItem("token");
          const formData = new FormData();
          formData.append("image", file);
          const res = await axios.post(
            `${BACKEND_URL}/api/products/advanced-search`,
            formData,
            {
              headers: {
                Authorization: `Bearer ${token}`,
                "Content-Type": "multipart/form-data"
              }
            }
          );
          setAdvancedSearchResults(res.data);
          setAdvancedSearchActive(true);
        } catch (error) {
          console.error("Error in advanced search:", error);
          alert("Image search failed");
        } finally {
          setAdvancedSearchLoading(false);
        }
      },
      [BACKEND_URL]
    )
  });

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  // ---------------------- IMAGE CAROUSEL HANDLERS ----------------------
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

  const handleViewProduct = (prodId) => {
    window.location.href = `/admin-dashboard/product-details/${prodId}`;
  };

  // ---------------------- PAGINATION CONTROLS ----------------------
  const handlePrevPage = () => {
    if (currentPage > 1) {
      fetchProducts(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      fetchProducts(currentPage + 1);
    }
  };

  // ---------------------- Clear Filters ----------------------
  const clearFilters = () => {
    setSearchTerm(""); // Reset search term
    setSelectedCategories([]); // Reset selected categories
    setSelectedSubCategories([]); // Reset selected subcategories
    setSelectedBrands([]); // Reset selected brands
    setSelectedPriceRanges([]); // Reset selected price ranges
    setSelectedVariationHinges([]); // Reset selected variation hinges
  };

  // Sort filter options
  const sortedCategories = fullCategories.sort();
  const sortedSubCategories = fullSubCategories.sort();
  const sortedBrands = fullBrands.sort();
  const sortedPriceRanges = fullPriceRanges.sort((a, b) => a - b); // Assuming price ranges are numbers
  const sortedVariationHinges = fullVariationHinges.sort();

  // Check if any filters are applied
  const isAnyFilterApplied =
    searchTerm ||
    selectedCategories.length > 0 ||
    selectedSubCategories.length > 0 ||
    selectedBrands.length > 0 ||
    selectedPriceRanges.length > 0 ||
    selectedVariationHinges.length > 0;

  // ---------------------- RENDER ----------------------
  return (
    <div className="bg-white text-gray-800 min-h-screen">
      <div className="md:p-6 p-4 w-full max-w-7xl mx-auto">
        {/* Search + Advanced Search */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search by any field..."
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            {/* Advanced Image Search */}
            <div
              {...advGetRootProps()}
              className="flex items-center px-3 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded cursor-pointer hover:opacity-90"
            >
              <input {...advGetInputProps()} />
              {advancedSearchLoading ? (
                <div className="w-5 h-5 border-4 border-white border-t-transparent border-solid rounded-full animate-spin" />
              ) : (
                <span className="text-sm">Search by Image</span>
              )}
            </div>
            {advancedSearchActive && (
              <button
                onClick={handleClearAdvancedSearch}
                className="text-sm px-3 py-2 bg-red-500 text-white rounded hover:bg-red-600"
              >
                Clear Image Search
              </button>
            )}
          </div>
          {/* Single Upload + Bulk Upload Toggles */}
          <div className="space-x-2">
            <button
              onClick={() => openSingleProductModal()}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90"
            >
              Upload Single Product
            </button>
            <div className="relative inline-block text-left">
              <button
                onClick={() => setBulkMode((prev) => !prev)}
                className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90"
              >
                {bulkMode ? "Hide Bulk Options" : "Upload in Bulk"}
              </button>
              {bulkMode && (
                <div className="origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10">
                  <div className="py-1">
                    <button
                      onClick={handleDownloadTemplate}
                      className="text-left w-full px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Download Template
                    </button>
                    <button
                      onClick={processBulkUpload}
                      className="text-left w-full px-4 py-2 text-sm hover:bg-gray-100"
                    >
                      Upload Products
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Display search results info if search term provided */}
        {searchTerm && (
          <div className="mb-4 text-sm text-gray-600">
            Found {products.length} products with "{searchTerm}"
          </div>
        )}

        {/* Clear Filters Button */}
        {isAnyFilterApplied && (
          <div className="mb-4">
            <button
              onClick={clearFilters}
              className="px-4 py-2 bg-red-500 text-white text-xs rounded"
            >
              Clear Filters
            </button>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-4 mb-6">
          <DropdownFilter
            label={`Categories (${selectedCategories.length})`}
            isOpen={categoryOpen}
            setIsOpen={setCategoryOpen}
          >
            {sortedCategories.map((cat) => (
              <FilterItem
                key={cat}
                checked={selectedCategories.includes(cat)}
                onChange={() => toggleFilter(cat, selectedCategories, setSelectedCategories)}
                count={filterCounts.categories[cat] || 0}
              >
                {cat}
              </FilterItem>
            ))}
          </DropdownFilter>
          <DropdownFilter
            label={`SubCats (${selectedSubCategories.length})`}
            isOpen={subCategoryOpen}
            setIsOpen={setSubCategoryOpen}
          >
            {sortedSubCategories.map((sub) => (
              <FilterItem
                key={sub}
                checked={selectedSubCategories.includes(sub)}
                onChange={() => toggleFilter(sub, selectedSubCategories, setSelectedSubCategories)}
                count={filterCounts.subCategories[sub] || 0}
              >
                {sub}
              </FilterItem>
            ))}
          </DropdownFilter>
          <DropdownFilter
            label={`Brands (${selectedBrands.length})`}
            isOpen={brandOpen}
            setIsOpen={setBrandOpen}
          >
            {sortedBrands.map((br) => (
              <FilterItem
                key={br}
                checked={selectedBrands.includes(br)}
                onChange={() => toggleFilter(br, selectedBrands, setSelectedBrands)}
                count={filterCounts.brands[br] || 0}
              >
                {br}
              </FilterItem>
            ))}
          </DropdownFilter>
          <DropdownFilter
            label={`Price Range (${selectedPriceRanges.length})`}
            isOpen={priceRangeOpen}
            setIsOpen={setPriceRangeOpen}
          >
            {sortedPriceRanges.map((pr) => (
              <FilterItem
                key={pr}
                checked={selectedPriceRanges.includes(pr)}
                onChange={() => toggleFilter(pr, selectedPriceRanges, setSelectedPriceRanges)}
                count={filterCounts.priceRanges[pr] || 0}
              >
                {pr}
              </FilterItem>
            ))}
          </DropdownFilter>
          <DropdownFilter
            label={`Variation Hinge (${selectedVariationHinges.length})`}
            isOpen={variationHingeOpen}
            setIsOpen={setVariationHingeOpen}
          >
            {sortedVariationHinges.map((vh) => (
              <FilterItem
                key={vh}
                checked={selectedVariationHinges.includes(vh)}
                onChange={() => toggleFilter(vh, selectedVariationHinges, setSelectedVariationHinges)}
                count={filterCounts.variationHinges[vh] || 0}
              >
                {vh}
              </FilterItem>
            ))}
          </DropdownFilter>
        </div>

        {/* Product Grid or Loading Skeleton */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(advancedSearchActive ? advancedSearchResults : products)
              .slice() // Create a copy to avoid mutating the original array
              .sort((a, b) => {
                if (!searchTerm) return 0;
                const term = searchTerm.toLowerCase();
                const aBrand = (a.brandName || '').toLowerCase();
                const bBrand = (b.brandName || '').toLowerCase();
                const aMatch = aBrand.includes(term);
                const bMatch = bBrand.includes(term);
                
                // Prioritize brand matches first
                if (aMatch && !bMatch) return -1;
                if (!aMatch && bMatch) return 1;
                return 0;
              })
              .map((product) => (
                <ProductCard
                  key={product._id}
                  product={product}
                  handleViewProduct={handleViewProduct}
                  handleDeleteProduct={handleDeleteProduct}
                  openSingleProductModal={openSingleProductModal}
                  carouselIndexMap={carouselIndexMap}
                  handleNextImage={handleNextImage}
                  handlePrevImage={handlePrevImage}
                />
              ))
            }
          </div>
        )}

        {/* Pagination Controls */}
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={handleNextPage}
            disabled={currentPage >= totalPages}
            className="px-4 py-2 bg-gray-300 text-gray-800 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* Single Product Modal */}
      {singleProductModalOpen && (
        <SingleProductModal
          editProductId={editProductId}
          newProductData={newProductData}
          setNewProductData={setNewProductData}
          handleSingleProductSubmit={handleSingleProductSubmit}
          closeSingleProductModal={closeSingleProductModal}
          handleFileChange={handleFileChange}
          uploadProgress={uploadProgress}
          categories={fullCategories}
          subCategories={fullSubCategories}
          brands={fullBrands}
        />
      )}
    </div>
  );
}
