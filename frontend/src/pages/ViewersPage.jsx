import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { useDropzone } from "react-dropzone";
import FilterBar from "../components/FilterBar";
import ProductGrid from "../components/ProductGrid";
import BulkUpload from "../components/BulkUpload";
import SingleProductModal from "../components/SingleProductModal";
import uploadImage from "../helpers/uploadImage";

export default function ViewersPage() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [isAdvancedSearchLoading, setIsAdvancedSearchLoading] = useState(false);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
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
    stockInHand: 0,
    stockCurrentlyWith: "",
    images: [],
    price: 0,
    productDetails: "",
  });
  const [uploadProgress, setUploadProgress] = useState(0);
  const [bulkMode, setBulkMode] = useState(false);
  const [csvData, setCsvData] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedStockLocations, setSelectedStockLocations] = useState([]);
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [stockOpen, setStockOpen] = useState(false);
  const [carouselIndexMap, setCarouselIndexMap] = useState({});
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);

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

  // Generate filter options based on products
  const categories = Array.from(
    new Set(products.map((p) => p.category).filter(Boolean))
  );
  const subCategories = Array.from(
    new Set(products.map((p) => p.subCategory).filter(Boolean))
  );
  const brands = Array.from(
    new Set(products.map((p) => p.brandName).filter(Boolean))
  );
  const stockLocations = Array.from(
    new Set(products.map((p) => p.stockCurrentlyWith).filter(Boolean))
  );

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

  const openSingleProductModal = (product = null) => {
    console.log("Open modal for product:", product);
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
        stockInHand: product.stockInHand || 0,
        stockCurrentlyWith: product.stockCurrentlyWith || "",
        images: product.images || [],
        price: product.price || 0,
        productDetails: product.productDetails || "",
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
        stockInHand: 0,
        stockCurrentlyWith: "",
        images: [],
        price: 0,
        productDetails: "",
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
      // If images are file objects (not URLs) then upload them first
      if (newProductData.images.length && typeof newProductData.images[0] !== "string") {
        for (let i = 0; i < newProductData.images.length; i++) {
          const res = await uploadImage(newProductData.images[i]);
          finalImages.push(res.url);
          setUploadProgress(Math.round(((i + 1) / newProductData.images.length) * 100));
        }
      } else {
        finalImages = newProductData.images;
      }
      const payload = {
        productTag: newProductData.productTag,
        productId: newProductData.productId,
        variantId: newProductData.variantId,
        category: newProductData.category,
        subCategory: newProductData.subCategory,
        variationHinge: newProductData.variationHinge,
        name: newProductData.name,
        brandName: newProductData.brandName,
        stockInHand: newProductData.stockInHand,
        stockCurrentlyWith: newProductData.stockCurrentlyWith,
        images: finalImages,
        price: newProductData.price,
        productDetails: newProductData.productDetails,
      };
      if (!editProductId) {
        await axios.post(`${BACKEND_URL}/api/admin/products`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.put(`${BACKEND_URL}/api/admin/products/${editProductId}`, payload, {
          headers: { Authorization: `Bearer ${token}` },
        });
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

  const handleFileChange = (e) => {
    setNewProductData((prev) => ({
      ...prev,
      images: [...e.target.files],
    }));
  };

  const handleDeleteProduct = async (id) => {
    if (!window.confirm("Are you sure you want to delete this product?")) return;
    try {
      console.log("Deleting product with id:", id);
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/products/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchProducts();
    } catch (error) {
      console.error("Error deleting product:", error);
      alert("Error deleting product. Check console.");
    }
  };

  // Advanced image search dropzone for FilterBar
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
        stockInHand: row["Stock In Hand"] || 0,
        stockCurrentlyWith: row["Stock Currently With"] || "",
        price: row["Price"] || 0,
        productDetails: row["Product_Details (optional)"] || "",
        images: [
          row["Main_Image_URL"],
          row["Second_Image_URL"],
          row["Third_Image_URL"],
          row["Fourth_Image_URL"],
          row["Other_image_URL"],
        ].filter(Boolean),
      }));
      await axios.post(`${BACKEND_URL}/api/admin/products/bulk`, productsToUpload, {
        headers: { Authorization: `Bearer ${token}` },
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
      { v: "Product Tag (required)", s: { fill: { fgColor: { rgb: "FFCCCC" } } } },
      { v: "Product ID (required)", s: { fill: { fgColor: { rgb: "FFCCCC" } } } },
      { v: "Variant ID (optional)", s: {} },
      { v: "Category (required)", s: { fill: { fgColor: { rgb: "FFCCCC" } } } },
      { v: "Sub Category (optional)", s: {} },
      { v: "Variation_hinge (optional)", s: {} },
      { v: "Name (required)", s: { fill: { fgColor: { rgb: "FFCCCC" } } } },
      { v: "Brand Name (optional)", s: {} },
      { v: "Stock In Hand (required)", s: { fill: { fgColor: { rgb: "FFCCCC" } } } },
      { v: "Stock Currently With (optional)", s: {} },
      { v: "Price", s: {} },
      { v: "Product_Details (optional)", s: {} },
      { v: "Main_Image_URL (optional)", s: {} },
      { v: "Second_Image_URL (optional)", s: {} },
      { v: "Third_Image_URL (optional)", s: {} },
      { v: "Fourth_Image_URL (optional)", s: {} },
      { v: "Other_image_URL (optional)", s: {} },
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
      50,
      "Warehouse A",
      99.99,
      "Some product info",
      "https://example.com/img1.jpg",
      "https://example.com/img2.jpg",
      "",
      "",
      "",
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

  return (
    <div className="p-6 bg-gray-900 text-gray-200 min-h-screen">
      <h1 className="text-2xl font-bold mb-4">Product Management</h1>
      
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
      
      <ProductGrid
        products={displayedProducts}
        carouselIndexMap={carouselIndexMap}
        handlePrevImage={handlePrevImage}
        handleNextImage={handleNextImage}
        openSingleProductModal={openSingleProductModal}
        handleDeleteProduct={handleDeleteProduct}
        loading={loading}
      />
      {singleProductModalOpen && (
        <SingleProductModal
          editProductId={editProductId}
          newProductData={newProductData}
          setNewProductData={setNewProductData}
          closeSingleProductModal={closeSingleProductModal}
          handleSingleProductSubmit={handleSingleProductSubmit}
          handleFileChange={handleFileChange}
          uploadProgress={uploadProgress}
        />
      )}
    </div>
  );
}
