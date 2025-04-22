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
import BulkUploadModal from "../components/manageproducts/BulkUploadModal";

// Helpers
import uploadImage from "../helpers/uploadImage";

export default function ProductManagementPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // ---------------------- STATES ----------------------
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 100;

  // Filter states
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

  // Filter counts
  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {}
  });

  // Single product modal
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
    productGST: 0
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  // Bulk upload
  const [bulkUploadOpen, setBulkUploadOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);

  // Advanced image search
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);

  // Carousel indices
  const [carouselIndexMap, setCarouselIndexMap] = useState({});

  // ---------------------- FETCH PRODUCTS ----------------------
  const fetchProducts = async (page = currentPage) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) {
        const searchTerms = searchTerm.toLowerCase().split(" ").filter(term => term);
        params.append("search", searchTerms.join(",")); // Pass as comma-separated for backend
      }
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
      updateFilterCounts(res.data.products);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // ---------------------- UPDATE FILTER COUNTS ----------------------
  const updateFilterCounts = (products) => {
    const counts = {
      categories: {},
      subCategories: {},
      brands: {},
      priceRanges: {},
      variationHinges: {}
    };

    products.forEach(product => {
      if (product.category) counts.categories[product.category] = (counts.categories[product.category] || 0) + 1;
      if (product.subCategory) counts.subCategories[product.subCategory] = (counts.subCategories[product.subCategory] || 0) + 1;
      if (product.brandName) counts.brands[product.brandName] = (counts.brands[product.brandName] || 0) + 1;
      if (product.priceRange) counts.priceRanges[product.priceRange] = (counts.priceRanges[product.priceRange] || 0) + 1;
      if (product.variationHinge) counts.variationHinges[product.variationHinge] = (counts.variationHinges[product.variationHinge] || 0) + 1;
    });

    setFilterCounts(counts);
  };

  // ---------------------- COMPUTE FILTER OPTIONS ----------------------
  const computeFilterOptions = (products) => {
    const categories = [...new Set(products.map(p => p.category).filter(Boolean))].sort();
    const subCategories = [...new Set(products.map(p => p.subCategory).filter(Boolean))].sort();
    const brands = [...new Set(products.map(p => p.brandName).filter(Boolean))].sort();
    const priceRanges = [...new Set(products.map(p => p.priceRange).filter(Boolean))].sort((a, b) => a - b);
    const variationHinges = [...new Set(products.map(p => p.variationHinge).filter(Boolean))].sort();
    return { categories, subCategories, brands, priceRanges, variationHinges };
  };

  // ---------------------- HELPER: Toggle Filter ----------------------
  const toggleFilter = (value, list, setList) => {
    if (list.includes(value)) {
      setList(list.filter((item) => item !== value));
    } else {
      setList([...list, value]);
    }
  };

  // ---------------------- FETCH PRODUCTS ON FILTER CHANGE ----------------------
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
        productGST: product.productGST || 0
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
        productGST: 0
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
      const finalImages = (newProductData.images || []).filter(
        (img) => typeof img === "string" && img.trim() !== ""
      );
      const payload = { ...newProductData, images: finalImages };

      if (!editProductId) {
        await axios.post(`${BACKEND_URL}/api/admin/products`, payload, {
          headers: { Authorization: `Bearer ${token}` }
        });
      } else {
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
        }
      } catch (error) {
        console.error("Error during image upload:", error);
      }
    }
    setNewProductData((prev) => ({
      ...prev,
      images: [...prev.images, ...newImages]
    }));
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
      "ProductGST (optional)"
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
      "Red Colony",
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
      18
    ];

    const ws = XLSX.utils.aoa_to_sheet([headerRow, exampleRow]);
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.write(wb, { bookType: "xlsx", type: "binary" });
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
  const { getRootProps: advGetRootProps, getInputProps: advGetInputProps } =
    useDropzone({
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

  // ---------------------- CLEAR FILTERS ----------------------
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setSelectedVariationHinges([]);
  };

  // ---------------------- RENDER ----------------------
  const displayProducts = advancedSearchActive ? advancedSearchResults : products;
  const { categories, subCategories, brands, priceRanges, variationHinges } =
    computeFilterOptions(displayProducts);

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
          <div className="space-x-2">
            <button
              onClick={() => openSingleProductModal()}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90"
            >
              Upload Single Product
            </button>
            <button
              onClick={() => setBulkUploadOpen(true)}
              className="px-4 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90"
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
          selectedCategories.length > 0 ||
          selectedSubCategories.length > 0 ||
          selectedBrands.length > 0 ||
          selectedPriceRanges.length > 0 ||
          selectedVariationHinges.length > 0) && (
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
            options={categories}
            selectedOptions={selectedCategories}
            toggleOption={(value) => toggleFilter(value, selectedCategories, setSelectedCategories)}
            filterCounts={filterCounts.categories}
          />
          <DropdownFilter
            label={`SubCats (${selectedSubCategories.length})`}
            isOpen={subCategoryOpen}
            setIsOpen={setSubCategoryOpen}
            options={subCategories}
            selectedOptions={selectedSubCategories}
            toggleOption={(value) => toggleFilter(value, selectedSubCategories, setSelectedSubCategories)}
            filterCounts={filterCounts.subCategories}
          />
          <DropdownFilter
            label={`Brands (${selectedBrands.length})`}
            isOpen={brandOpen}
            setIsOpen={setBrandOpen}
            options={brands}
            selectedOptions={selectedBrands}
            toggleOption={(value) => toggleFilter(value, selectedBrands, setSelectedBrands)}
            filterCounts={filterCounts.brands}
          />
          <DropdownFilter
            label={`Price Range (${selectedPriceRanges.length})`}
            isOpen={priceRangeOpen}
            setIsOpen={setPriceRangeOpen}
            options={priceRanges}
            selectedOptions={selectedPriceRanges}
            toggleOption={(value) => toggleFilter(value, selectedPriceRanges, setSelectedPriceRanges)}
            filterCounts={filterCounts.priceRanges}
          />
          <DropdownFilter
            label={`Variation Hinge (${selectedVariationHinges.length})`}
            isOpen={variationHingeOpen}
            setIsOpen={setVariationHingeOpen}
            options={variationHinges}
            selectedOptions={selectedVariationHinges}
            toggleOption={(value) => toggleFilter(value, selectedVariationHinges, setSelectedVariationHinges)}
            filterCounts={filterCounts.variationHinges}
          />
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
            {displayProducts
              .slice()
              .sort((a, b) => {
                if (!searchTerm) return 0;
                const term = searchTerm.toLowerCase();
                const aBrand = (a.brandName || "").toLowerCase();
                const bBrand = (b.brandName || "").toLowerCase();
                const aMatch = aBrand.includes(term);
                const bMatch = bBrand.includes(term);
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
              ))}
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

      {singleProductModalOpen && (
        <SingleProductModal
          editProductId={editProductId}
          newProductData={newProductData}
          setNewProductData={setNewProductData}
          handleSingleProductSubmit={handleSingleProductSubmit}
          closeSingleProductModal={closeSingleProductModal}
          handleFileChange={handleFileChange}
          uploadProgress={uploadProgress}
          categories={categories}
          subCategories={subCategories}
          brands={brands}
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
    </div>
  );
}