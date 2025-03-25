import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { useDropzone } from "react-dropzone";
import { useNavigate } from "react-router-dom";
import FilterBar from "../components/FilterBar";
import ProductGrid from "../components/ProductGrid";
import Loader from "../components/Loader";

export default function SelectProductsForViewer() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const navigate = useNavigate();

  const [page, setPage] = useState(1);
  const limit = 100; // 100 products per page
  const [totalPages, setTotalPages] = useState(1);

  const [products, setProducts] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  // Selected filters (for filtering products)
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);

  // Full distinct filter options fetched from API
  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);

  const [carouselIndexMap, setCarouselIndexMap] = useState({});
  const [selectedProductIds, setSelectedProductIds] = useState([]);

  // Dropdown toggles for filters
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);

  // Advanced image search state
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [isAdvancedSearchLoading, setIsAdvancedSearchLoading] = useState(false);

  // DRAG & DROP for image search
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
          `${BACKEND_URL}/api/admin/products/advanced-search`,
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

  // Fetch distinct filter options from API
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
          headers: { Authorization: `Bearer ${token}` },
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

  // Fetch products with pagination & filters
  const fetchProducts = async (pageNumber = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = { page: pageNumber, limit };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategories.length > 0) params.categories = selectedCategories.join(",");
      if (selectedSubCategories.length > 0) params.subCategories = selectedSubCategories.join(",");
      if (selectedBrands.length > 0) params.brands = selectedBrands.join(",");
      if (selectedVariationHinges.length > 0) params.variationHinges = selectedVariationHinges.join(",");
      if (selectedPriceRanges.length > 0) params.priceRanges = selectedPriceRanges.join(",");

      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });

      setProducts(res.data.products || []);
      setPage(res.data.currentPage || pageNumber);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  // Reset page whenever filters or search term change
  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, selectedCategories, selectedSubCategories, selectedBrands, selectedVariationHinges, selectedPriceRanges]);

  const displayedProducts = advancedSearchActive ? advancedSearchResults : products;

  // Toggle selection for a product
  const toggleSelectProduct = (prodId) => {
    setSelectedProductIds((prev) =>
      prev.includes(prodId) ? prev.filter((id) => id !== prodId) : [...prev, prodId]
    );
  };

  // Updated "Select All" to fetch all matching product IDs across pages
  const handleSelectAllProducts = async () => {
    try {
      const token = localStorage.getItem("token");
      // Use a high limit to cover all matching products
      const params = { page: 1, limit: 10000 };
      if (searchTerm) params.search = searchTerm;
      if (selectedCategories.length > 0) params.categories = selectedCategories.join(",");
      if (selectedSubCategories.length > 0) params.subCategories = selectedSubCategories.join(",");
      if (selectedBrands.length > 0) params.brands = selectedBrands.join(",");
      if (selectedVariationHinges.length > 0) params.variationHinges = selectedVariationHinges.join(",");
      if (selectedPriceRanges.length > 0) params.priceRanges = selectedPriceRanges.join(",");

      const res = await axios.get(`${BACKEND_URL}/api/admin/products`, {
        headers: { Authorization: `Bearer ${token}` },
        params,
      });
      const allIds = res.data.products.map((p) => p._id);
      setSelectedProductIds(allIds);
    } catch (err) {
      console.error("Error selecting all products:", err);
    }
  };

  const handleProceed = () => {
    localStorage.setItem("selectedViewerProductIds", JSON.stringify(selectedProductIds));
    navigate("/admin-dashboard/viewer-manager");
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

  // Reset page on filters or search change
  const handleResetPage = () => {
    setPage(1);
    fetchProducts(1);
  };

  const canPrev = page > 1;
  const canNext = page < totalPages;

  return (
    <div className="p-6 bg-purple-200 text-gray-900 min-h-screen relative">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-6">
        <div className="flex gap-4 items-center w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search..."
            className="w-full px-3 py-2 rounded border border-gray-300 focus:outline-none focus:ring focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              handleClearAdvancedSearch();
              handleResetPage();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleResetPage();
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
            onClick={() => navigate("/admin-dashboard/viewer-manager")}
            className="bg-gray-500 px-4 py-2 rounded hover:bg-gray-400 text-sm text-white"
          >
            Close
          </button>
        </div>
      </div>

      {searchTerm && (
        <div className="mb-4 text-sm text-gray-600">
          Found {products.length} products with "{searchTerm}"
        </div>
      )}

      {/* Pass full filter values to FilterBar */}
      <FilterBar
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        advancedSearchActive={advancedSearchActive}
        handleClearAdvancedSearch={handleClearAdvancedSearch}
        advGetRootProps={advGetRootProps}
        advGetInputProps={advGetInputProps}
        categories={fullCategories}
        subCategories={fullSubCategories}
        brands={fullBrands}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        categoryOpen={categoryOpen}
        setCategoryOpen={setCategoryOpen}
        selectedSubCategories={selectedSubCategories}
        setSelectedSubCategories={setSelectedSubCategories}
        subCategoryOpen={subCategoryOpen}
        setSubCategoryOpen={setSubCategoryOpen}
        selectedBrands={selectedBrands}
        setSelectedBrands={setSelectedBrands}
        brandOpen={brandOpen}
        setBrandOpen={setBrandOpen}
        selectedPriceRanges={selectedPriceRanges}
        setSelectedPriceRanges={setSelectedPriceRanges}
        priceRangeOpen={priceRangeOpen}
        setPriceRangeOpen={setPriceRangeOpen}
        selectedVariationHinges={selectedVariationHinges}
        setSelectedVariationHinges={setSelectedVariationHinges}
        variationHingeOpen={variationHingeOpen}
        setVariationHingeOpen={setVariationHingeOpen}
      />

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="bg-gray-100 p-4 rounded animate-pulse">
              <div className="bg-gray-200 h-40 w-full rounded mb-4"></div>
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-5 bg-gray-200 rounded w-1/2 mb-2"></div>
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

      {!advancedSearchActive && (
        <div className="flex justify-center items-center mt-4 space-x-4">
          <button
            disabled={!canPrev}
            onClick={() => {
              setPage(page - 1);
              fetchProducts(page - 1);
            }}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              page > 1 ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-300 text-gray-500"
            }`}
          >
            Prev
          </button>
          <span className="text-sm">
            Page {page} of {totalPages}
          </span>
          <button
            disabled={page >= totalPages}
            onClick={() => {
              setPage(page + 1);
              fetchProducts(page + 1);
            }}
            className={`px-4 py-2 rounded text-sm font-semibold ${
              page < totalPages ? "bg-purple-600 hover:bg-purple-700 text-white" : "bg-gray-300 text-gray-500"
            }`}
          >
            Next
          </button>
        </div>
      )}

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
