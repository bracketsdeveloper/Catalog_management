  "use client"; // Remove if you're using Create React App

  import React, { useState, useEffect, useCallback } from "react";
  import axios from "axios";
  import * as XLSX from "xlsx";
  import { useDropzone } from "react-dropzone";
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
      productCost_Unit: ""
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

    // ---------------------- FETCH FILTER OPTIONS ----------------------
    useEffect(() => {
      const fetchFilterOptions = async () => {
        try {
          const token = localStorage.getItem("token");
          const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setFullCategories(res.data.categories);
          setFullSubCategories(res.data.subCategories);
          setFullBrands(res.data.brands);
          setFullPriceRanges(res.data.priceRanges);
          setFullVariationHinges(res.data.variationHinges);
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

        console.log("Query params:", params.toString());

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
          productCost_Unit: product.productCost_Unit || ""
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
          productCost_Unit: ""
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
        let finalImages = [];

        // Validate images before sending
        finalImages = newProductData.images.filter(image => typeof image === 'string' && image.trim() !== '');

        const payload = {
          ...newProductData,
          images: finalImages // Ensure only valid URLs are sent
        };

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
      
      try {
        for (const file of files) {
          const formData = new FormData();
          formData.append('image', file);
          
          const response = await axios.post(`${BACKEND_URL}/api/upload`, formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
              Authorization: `Bearer ${localStorage.getItem('token')}`
            },
            onUploadProgress: (progressEvent) => {
              const percentCompleted = Math.round(
                (progressEvent.loaded * 100) / progressEvent.total
              );
              setUploadProgress(percentCompleted);
            }
          });
    
          if (response.data.url) {
            newImages.push(response.data.url);
          }
        }
    
        setNewProductData(prev => ({
          ...prev,
          images: [...prev.images, ...newImages]
        }));
      } catch (error) {
        console.error('Upload failed:', error);
        alert('Image upload failed');
      }
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
          productCost_Unit: row["Product Cost_Unit"] || ""
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
        { v: "Other_image_URL (optional)" }
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
        ""
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
                        onClick={() => setCsvData([])}
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

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <DropdownFilter
              label={`Categories (${selectedCategories.length})`}
              isOpen={categoryOpen}
              setIsOpen={setCategoryOpen}
            >
              {fullCategories.map((cat) => (
                <FilterItem
                  key={cat}
                  checked={selectedCategories.includes(cat)}
                  onChange={() =>
                    toggleFilter(cat, selectedCategories, setSelectedCategories)
                  }
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
              {fullSubCategories.map((sub) => (
                <FilterItem
                  key={sub}
                  checked={selectedSubCategories.includes(sub)}
                  onChange={() =>
                    toggleFilter(
                      sub,
                      selectedSubCategories,
                      setSelectedSubCategories
                    )
                  }
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
              {fullBrands.map((br) => (
                <FilterItem
                  key={br}
                  checked={selectedBrands.includes(br)}
                  onChange={() =>
                    toggleFilter(br, selectedBrands, setSelectedBrands)
                  }
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
              {fullPriceRanges.map((pr) => (
                <FilterItem
                  key={pr}
                  checked={selectedPriceRanges.includes(pr)}
                  onChange={() =>
                    toggleFilter(pr, selectedPriceRanges, setSelectedPriceRanges)
                  }
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
              {fullVariationHinges.map((vh) => (
                <FilterItem
                  key={vh}
                  checked={selectedVariationHinges.includes(vh)}
                  onChange={() =>
                    toggleFilter(
                      vh,
                      selectedVariationHinges,
                      setSelectedVariationHinges
                    )
                  }
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
              {(
                advancedSearchActive ? advancedSearchResults : products
              ).map((product) => (
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

  /** ------------------------------------------------------------------
   *  ProductCard Component
   * ------------------------------------------------------------------*/
  function ProductCard({
    product,
    handleViewProduct,
    handleDeleteProduct,
    openSingleProductModal,
    carouselIndexMap,
    handleNextImage,
    handlePrevImage
  }) {
    const currentIndex = carouselIndexMap[product._id] || 0;
    const images = product.images || [];
    const currentImg = images[currentIndex] || "";
    return (
      <div className="bg-white border border-gray-200 rounded shadow-md p-4 relative">
        <div onClick={() => handleViewProduct(product._id)} className="cursor-pointer">
          <div className="relative h-40 mb-4 flex items-center justify-center bg-gray-50 overflow-hidden">
            {images.length > 0 ? (
              <>
                <img src={currentImg} alt="prod" className="h-full object-contain" />
                {images.length > 1 && (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePrevImage(product._id);
                      }}
                      className="absolute left-2 bg-gray-700/50 text-white px-2 py-1 text-sm rounded"
                    >
                      &lt;
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleNextImage(product._id);
                      }}
                      className="absolute right-2 bg-gray-700/50 text-white px-2 py-1 text-sm rounded"
                    >
                      &gt;
                    </button>
                  </>
                )}
              </>
            ) : (
              <span className="text-sm text-gray-400">No image</span>
            )}
          </div>
          
          {/* 
              CHANGED THIS SECTION BELOW TO DISPLAY MRP
              INSTEAD OF productCost 
          */}
          <h2 className="font-semibold text-lg mb-1 truncate">{product.name}</h2>
          <h3 className="font-semibold text-md text-red-600 mb-1 truncate">₹<strike>{product.MRP}/{product.MRP_Unit}</strike><br/>
          
          </h3>
          <h3 className="font-semibold text-md text-green-600 mb-1 truncate">₹
          {product.productCost}/{product.productCost_Unit}</h3>
          
          <p className="text-sm text-gray-500">
            {product.category}
            {product.subCategory ? ` / ${product.subCategory}` : ""}
          </p>
          {product.productDetails && (
            <p className="text-xs text-gray-500 italic mt-1 line-clamp-2">
              {product.productDetails}
            </p>
          )}
        </div>
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={(e) => {
              e.stopPropagation();
              openSingleProductModal(product);
            }}
            className="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 w-20 rounded"
          >
            Edit
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteProduct(product._id);
            }}
            className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
          >
            Delete
          </button>
        </div>
      </div>
    );
  }

  /** ------------------------------------------------------------------
   *  SkeletonCard Component (Loading)
   * ------------------------------------------------------------------*/
  function SkeletonCard() {
    return (
      <div className="bg-white border border-gray-200 p-4 rounded animate-pulse">
        <div className="bg-gray-200 h-40 w-full rounded mb-4"></div>
        <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
        <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
        <div className="h-8 bg-gray-200 rounded w-32 mt-4"></div>
      </div>
    );
  }

  /** ------------------------------------------------------------------
   *  SingleProductModal Component
   * ------------------------------------------------------------------*/
  function SingleProductModal({
    editProductId,
    newProductData,
    setNewProductData,
    handleSingleProductSubmit,
    closeSingleProductModal,
    handleFileChange,
    uploadProgress,
    categories,
    subCategories,
    brands
  }) {
    const [categorySuggestions, setCategorySuggestions] = useState([]);
    const [subCategorySuggestions, setSubCategorySuggestions] = useState([]);
    const [brandSuggestions, setBrandSuggestions] = useState([]);

    const filterSuggestions = (input, list, setSuggestions) => {
      if (!input) {
        setSuggestions([]);
        return;
      }
      const filtered = list.filter((item) =>
        item.toLowerCase().includes(input.toLowerCase())
      );
      setSuggestions(filtered);
    };

    return (
      <div className="fixed inset-0 z-50 bg-black bg-opacity-40 overflow-y-auto">
        <div className="flex items-center justify-center min-h-full py-8 px-4">
          <div className="bg-white p-6 rounded w-full max-w-3xl relative overflow-y-auto max-h-[90vh] border border-gray-200 shadow-lg z-60">
            <h2 className="text-2xl font-bold mb-4 border-b border-gray-300 pb-2">
              {editProductId ? "Edit Product" : "Upload Single Product"}
            </h2>
            <button
              onClick={closeSingleProductModal}
              className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
            >
              <span className="text-xl font-bold">&times;</span>
            </button>
            <form onSubmit={handleSingleProductSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {/* Basic Product Details */}
                <div>
                  <label className="block font-medium mb-1">Product Tag</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.productTag}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        productTag: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Product ID</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.productId}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        productId: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Variant ID</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.variantId}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        variantId: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Category</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.category}
                    onChange={(e) => {
                      setNewProductData((prev) => ({
                        ...prev,
                        category: e.target.value
                      }));
                      filterSuggestions(e.target.value, categories, setCategorySuggestions);
                    }}
                    required
                  />
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {categorySuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            category: suggestion
                          }));
                          setCategorySuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Sub Category</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.subCategory}
                    onChange={(e) => {
                      setNewProductData((prev) => ({
                        ...prev,
                        subCategory: e.target.value
                      }));
                      filterSuggestions(e.target.value, subCategories, setSubCategorySuggestions);
                    }}
                  />
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {subCategorySuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            subCategory: suggestion
                          }));
                          setSubCategorySuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block font-medium mb-1">Variation Hinge</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.variationHinge}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        variationHinge: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.name}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        name: e.target.value
                      }))
                    }
                    required
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Brand Name</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.brandName}
                    onChange={(e) => {
                      setNewProductData((prev) => ({
                        ...prev,
                        brandName: e.target.value
                      }));
                      filterSuggestions(e.target.value, brands, setBrandSuggestions);
                    }}
                  />
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {brandSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            brandName: suggestion
                          }));
                          setBrandSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional Fields */}
                <div>
                  <label className="block font-medium mb-1">Qty</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.qty}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        qty: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">MRP Currency</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.MRP_Currency}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        MRP_Currency: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">MRP</label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.MRP}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        MRP: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">MRP Unit</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.MRP_Unit}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        MRP_Unit: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Delivery Time</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.deliveryTime}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        deliveryTime: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Size</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.size}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        size: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Color</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.color}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        color: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block font-medium mb-1">Material</label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.material}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        material: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Price Range
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.priceRange}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        priceRange: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Weight
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.weight}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        weight: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    HSN Code
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.hsnCode}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        hsnCode: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Cost Currency
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.productCost_Currency}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        productCost_Currency: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Cost
                  </label>
                  <input
                    type="number"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.productCost}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        productCost: e.target.value
                      }))
                    }
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Product Cost Unit
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                    value={newProductData.productCost_Unit}
                    onChange={(e) =>
                      setNewProductData((prev) => ({
                        ...prev,
                        productCost_Unit: e.target.value
                      }))
                    }
                  />
                </div>
              </div>

              {/* Existing Images */}
              {editProductId &&
                newProductData.images?.length > 0 &&
                typeof newProductData.images[0] === "string" && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Existing Images
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {newProductData.images.map((imgUrl, idx) => (
                        <div key={idx} className="relative">
                          <img
                            src={imgUrl}
                            alt="existing"
                            className="w-24 h-24 object-cover border border-gray-300 rounded"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setNewProductData((prev) => ({
                                ...prev,
                                images: prev.images.filter((_, i) => i !== idx)
                              }))
                            }
                            className="absolute top-0 right-0 bg-red-600 text-white text-xs p-1 rounded"
                          >
                            X
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

              {/* Upload New Images */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Upload Images
                </label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  className="w-full"
                  onChange={handleFileChange}
                />
                {uploadProgress > 0 && (
                  <div className="mt-2 w-full bg-gray-200 h-2.5 rounded">
                    <div
                      className="bg-purple-500 h-2.5 rounded"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>

              <div className="mt-6">
                <button
                  type="submit"
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90 disabled:opacity-50"
                >
                  {editProductId ? "Update Product" : "Create Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    );
  }

  /** ------------------------------------------------------------------
   *  DropdownFilter & FilterItem Components
   * ------------------------------------------------------------------*/
  function DropdownFilter({ label, isOpen, setIsOpen, children }) {
    const dropdownRef = React.useRef();

    // Close dropdown when clicking outside
    useEffect(() => {
      const handleClickOutside = (event) => {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
          setIsOpen(false);
        }
      };
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }, [setIsOpen]);

    return (
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="px-4 py-2 bg-gray-200 rounded"
        >
          {label}
        </button>
        {isOpen && (
          <div className="absolute z-10 mt-2 w-48 bg-white border border-gray-300 rounded shadow-lg max-h-60 overflow-y-auto">
            {children}
          </div>
        )}
      </div>
    );
  }

  function FilterItem({ checked, onChange, children }) {
    return (
      <label className="flex items-center space-x-2 mb-1 text-sm cursor-pointer hover:bg-gray-100 p-1 rounded">
        <input
          type="checkbox"
          className="form-checkbox h-4 w-4 text-purple-500"
          checked={checked}
          onChange={onChange}
        />
        <span className="truncate">{children}</span>
      </label>
    );
  }
