// src/pages/ProductManagementPage.jsx
import React, { useState, useEffect, useRef, useCallback } from "react";
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

  // — persisted state helpers —
  const loadState = (key, def) => {
    try {
      return JSON.parse(localStorage.getItem(key)) ?? def;
    } catch {
      return def;
    }
  };
  const saveState = (key, val) => {
    localStorage.setItem(key, JSON.stringify(val));
  };

  // — paging & filters —
  const query = new URLSearchParams(location.search);
  const [currentPage, setCurrentPage] = useState(
    parseInt(query.get("page"), 10) || loadState("productPage", 1)
  );
  const [searchTerm, setSearchTerm] = useState(
    loadState("productSearchTerm", "")
  );
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const [selectedCategories, setSelectedCategories] = useState(
    loadState("productCategories", [])
  );
  const [selectedSubCategories, setSelectedSubCategories] = useState(
    loadState("productSubCategories", [])
  );
  const [selectedBrands, setSelectedBrands] = useState(
    loadState("productBrands", [])
  );
  const [selectedPriceRanges, setSelectedPriceRanges] = useState(
    loadState("productPriceRanges", [])
  );
  const [selectedVariationHinges, setSelectedVariationHinges] = useState(
    loadState("productVariationHinges", [])
  );

  // — dropdown open state —
  const [categoryOpen, setCategoryOpen] = useState(false);
  const [subCategoryOpen, setSubCategoryOpen] = useState(false);
  const [brandOpen, setBrandOpen] = useState(false);
  const [priceRangeOpen, setPriceRangeOpen] = useState(false);
  const [variationHingeOpen, setVariationHingeOpen] = useState(false);

  // — UI and sort state —
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    subCategories: [],
    brands: [],
    priceRanges: [],
    variationHinges: [],
  });
  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {},
  });

  // — single product modal —
  const [singleModalOpen, setSingleModalOpen] = useState(false);
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

  // — bulk upload modal —
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvData, setCsvData] = useState([]);

  // — advanced image search —
  const [advancedSearchActive, setAdvancedSearchActive] = useState(
    loadState("productAdvancedSearchActive", false)
  );
  const [advancedSearchResults, setAdvancedSearchResults] = useState(
    loadState("productAdvancedSearchResults", [])
  );
  const [advLoading, setAdvLoading] = useState(false);

  // — data fetched from API —
  const [products, setProducts] = useState([]);
  const [totalPages, setTotalPages] = useState(1);

  // — loading flags —
  const [isFetching, setIsFetching] = useState(false);
  const [initialLoad, setInitialLoad] = useState(true);

  // — carousel & details modal —
  const [carouselIndexMap, setCarouselIndexMap] = useState(
    loadState("productCarouselIndexMap", {})
  );
  const [productDetailsOpen, setProductDetailsOpen] = useState(false);
  const [selectedProductIndex, setSelectedProductIndex] = useState(0);

  // — NEW: upload progress state for modal progress bar —
  const [uploadProgress, setUploadProgress] = useState(0);

  const limit = 100;

  // Debounce searchTerm into debouncedSearch
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm.trim());
    }, 100);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  // Persist page & filters & URL
  useEffect(() => {
    saveState("productPage", currentPage);
    navigate(`/admin-dashboard/manage-products?page=${currentPage}`, {
      replace: true,
    });
  }, [currentPage, navigate]);

  useEffect(() => {
    saveState("productSearchTerm", searchTerm);
  }, [searchTerm]);
  useEffect(() => {
    saveState("productCategories", selectedCategories);
  }, [selectedCategories]);
  useEffect(() => {
    saveState("productSubCategories", selectedSubCategories);
  }, [selectedSubCategories]);
  useEffect(() => {
    saveState("productBrands", selectedBrands);
  }, [selectedBrands]);
  useEffect(() => {
    saveState("productPriceRanges", selectedPriceRanges);
  }, [selectedPriceRanges]);
  useEffect(() => {
    saveState("productVariationHinges", selectedVariationHinges);
  }, [selectedVariationHinges]);
  useEffect(() => {
    saveState("productAdvancedSearchActive", advancedSearchActive);
  }, [advancedSearchActive]);
  useEffect(() => {
    saveState("productAdvancedSearchResults", advancedSearchResults);
  }, [advancedSearchResults]);
  useEffect(() => {
    saveState("productCarouselIndexMap", carouselIndexMap);
  }, [carouselIndexMap]);

  // normalize helper
  const norm = (s) => (s ? s.toString().trim().toLowerCase() : "");

  // toggle helper
  const toggleList = (val, arr, setArr) => {
    const next = arr.includes(val)
      ? arr.filter((x) => x !== val)
      : [...arr, val];
    setArr(next);
    return next;
  };

  // Fetch filter options once
  useEffect(() => {
    (async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/products/filters`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const { categories, subCategories, brands, priceRanges, variationHinges } =
          res.data;
        setFilterOptions({
          categories: categories.map((c) => c.name),
          subCategories: subCategories.map((c) => c.name),
          brands: brands.map((b) => b.name),
          priceRanges: priceRanges.map((p) => p.name),
          variationHinges: variationHinges.map((v) => v.name),
        });
        setFilterCounts({
          categories: Object.fromEntries(
            categories.map((c) => [norm(c.name), c.count])
          ),
          subCategories: Object.fromEntries(
            subCategories.map((c) => [norm(c.name), c.count])
          ),
          brands: Object.fromEntries(
            brands.map((b) => [norm(b.name), b.count])
          ),
          priceRanges: Object.fromEntries(
            priceRanges.map((p) => [norm(p.name), p.count])
          ),
          variationHinges: Object.fromEntries(
            variationHinges.map((v) => [norm(v.name), v.count])
          ),
        });
      } catch (err) {
        console.error("Error fetching filter options:", err);
      }
    })();
  }, [BACKEND_URL]);

  // Unified fetch effect
  useEffect(() => {
    const cancelSrc = axios.CancelToken.source();
    (async () => {
      setIsFetching(true);
      try {
        const token = localStorage.getItem("token");
        const params = new URLSearchParams();
        if (debouncedSearch) params.set("search", debouncedSearch);
        if (selectedCategories.length)
          params.set("categories", selectedCategories.join(","));
        if (selectedSubCategories.length)
          params.set("subCategories", selectedSubCategories.join(","));
        if (selectedBrands.length)
          params.set("brands", selectedBrands.join(","));
        if (selectedPriceRanges.length)
          params.set("priceRanges", selectedPriceRanges.join(","));
        if (selectedVariationHinges.length)
          params.set("variationHinges", selectedVariationHinges.join(","));
        params.set("page", currentPage);
        params.set("limit", limit);

        const [prodRes, countRes] = await Promise.all([
          axios.get(
            `${BACKEND_URL}/api/admin/products?${params.toString()}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cancelToken: cancelSrc.token,
            }
          ),
          axios.get(
            `${BACKEND_URL}/api/admin/products/filters?${params.toString()}`,
            {
              headers: { Authorization: `Bearer ${token}` },
              cancelToken: cancelSrc.token,
            }
          ),
        ]);

        setProducts(prodRes.data.products);
        setTotalPages(prodRes.data.totalPages);

        const fc = countRes.data;
        setFilterCounts({
          categories: Object.fromEntries(
            fc.categories.map((c) => [norm(c.name), c.count])
          ),
          subCategories: Object.fromEntries(
            fc.subCategories.map((c) => [norm(c.name), c.count])
          ),
          brands: Object.fromEntries(
            fc.brands.map((b) => [norm(b.name), b.count])
          ),
          priceRanges: Object.fromEntries(
            fc.priceRanges.map((p) => [norm(p.name), p.count])
          ),
          variationHinges: Object.fromEntries(
            fc.variationHinges.map((v) => [norm(v.name), v.count])
          ),
        });

        // handle out-of-range page
        if (currentPage > prodRes.data.totalPages && prodRes.data.totalPages > 0) {
          setCurrentPage(1);
        }
      } catch (err) {
        if (!axios.isCancel(err)) console.error("Fetch error:", err);
      } finally {
        setIsFetching(false);
        if (initialLoad) setInitialLoad(false);
      }
    })();
    return () => cancelSrc.cancel();
  }, [
    BACKEND_URL,
    currentPage,
    debouncedSearch,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
    initialLoad,
  ]);

  // Advanced image search
  const { getRootProps: advRoot, getInputProps: advInput } = useDropzone({
    accept: "image/*",
    multiple: false,
    onDrop: async ([file]) => {
      setAdvLoading(true);
      try {
        const token = localStorage.getItem("token");
        const fd = new FormData();
        fd.append("image", file);
        const res = await axios.post(
          `${BACKEND_URL}/api/products/advanced-search`,
          fd,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setAdvancedSearchResults(res.data.products);
        setAdvancedSearchActive(true);
      } catch (err) {
        console.error("Image search error:", err);
        alert("Image search failed");
      } finally {
        setAdvLoading(false);
      }
    },
  });
  const clearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  // Carousel handlers
  const handleNextImage = (id) => {
    setCarouselIndexMap((prev) => {
      const prod = products.find((x) => x._id === id);
      if (!prod?.images?.length) return prev;
      const next = ((prev[id] || 0) + 1) % prod.images.length;
      return { ...prev, [id]: next };
    });
  };
  const handlePrevImage = (id) => {
    setCarouselIndexMap((prev) => {
      const prod = products.find((x) => x._id === id);
      if (!prod?.images?.length) return prev;
      const next =
        ((prev[id] || 0) - 1 + prod.images.length) % prod.images.length;
      return { ...prev, [id]: next };
    });
  };

  // Product details modal
  const displayList = advancedSearchActive
    ? advancedSearchResults
    : products;
  const hasSearch = Boolean(debouncedSearch);
  const openDetails = (id) => {
    const idx = displayList.findIndex((p) => p._id === id);
    if (idx >= 0) {
      setSelectedProductIndex(idx);
      setProductDetailsOpen(true);
    }
  };
  const nextDetails = () =>
    setSelectedProductIndex((i) => (i + 1) % displayList.length);
  const prevDetails = () =>
    setSelectedProductIndex((i) =>
      (i - 1 + displayList.length) % displayList.length
    );

  // Clear all filters
  const clearAllFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setSelectedVariationHinges([]);
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
    setCarouselIndexMap({});
    setCurrentPage(1);
    localStorage.removeItem("productSearchTerm");
    localStorage.removeItem("productCategories");
    localStorage.removeItem("productSubCategories");
    localStorage.removeItem("productBrands");
    localStorage.removeItem("productPriceRanges");
    localStorage.removeItem("productVariationHinges");
    localStorage.removeItem("productAdvancedSearchActive");
    localStorage.removeItem("productAdvancedSearchResults");
    localStorage.removeItem("productCarouselIndexMap");
  };

  return (
    <div className="bg-white text-gray-800 min-h-screen">
      <div className="md:p-6 p-4 max-w-7xl mx-auto">
        {/* SEARCH & ACTIONS */}
        <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4 items-center w-full sm:w-1/2">
            <input
              type="text"
              placeholder="Search by any field..."
              className="w-full px-3 py-2 border rounded focus:ring-2 focus:ring-purple-400"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <div
              {...advRoot()}
              className={`flex items-center px-3 py-2 bg-[#Ff8045] text-white rounded cursor-pointer ${
                advLoading ? "opacity-50 pointer-events-none" : ""
              }`}
            >
              <input {...advInput()} disabled={advLoading} />
              {advLoading ? (
                <div className="w-5 h-5 border-4 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm">Search by Image</span>
              )}
            </div>
            {advancedSearchActive && (
              <button
                onClick={clearAdvancedSearch}
                className="px-3 py-2 bg-red-500 text-white rounded"
              >
                Clear Image Search
              </button>
            )}
          </div>
          <div className="space-x-2">
            <button
              onClick={() => {
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
                setSingleModalOpen(true);
              }}
              className="px-4 py-2 bg-[#Ff8045] text-white rounded"
            >
              Upload Single Product
            </button>
            <button
              onClick={() => setBulkOpen(true)}
              className="px-4 py-2 bg-[#66C3D0] text-white rounded"
            >
              Bulk Upload
            </button>
          </div>
        </div>

        {/* CLEAR FILTERS */}
        {(searchTerm ||
          selectedCategories.length ||
          selectedSubCategories.length ||
          selectedBrands.length ||
          selectedPriceRanges.length ||
          selectedVariationHinges.length ||
          advancedSearchActive) && (
          <div className="mb-4">
            <button
              onClick={clearAllFilters}
              className="px-4 py-2 bg-red-500 text-white rounded text-sm"
            >
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
            options={filterOptions.categories}
            selectedOptions={selectedCategories}
            toggleOption={(v) =>
              toggleList(v, selectedCategories, setSelectedCategories)
            }
            filterCounts={filterCounts.categories}
            disabled={isFetching}
          />
          <DropdownFilter
            label={`SubCats (${selectedSubCategories.length})`}
            isOpen={subCategoryOpen}
            setIsOpen={setSubCategoryOpen}
            options={filterOptions.subCategories}
            selectedOptions={selectedSubCategories}
            toggleOption={(v) =>
              toggleList(v, selectedSubCategories, setSelectedSubCategories)
            }
            filterCounts={filterCounts.subCategories}
            disabled={isFetching}
          />
          <DropdownFilter
            label={`Brands (${selectedBrands.length})`}
            isOpen={brandOpen}
            setIsOpen={setBrandOpen}
            options={filterOptions.brands}
            selectedOptions={selectedBrands}
            toggleOption={(v) =>
              toggleList(v, selectedBrands, setSelectedBrands)
            }
            filterCounts={filterCounts.brands}
            disabled={isFetching}
          />
          <DropdownFilter
            label={`Price Range (${selectedPriceRanges.length})`}
            isOpen={priceRangeOpen}
            setIsOpen={setPriceRangeOpen}
            options={filterOptions.priceRanges}
            selectedOptions={selectedPriceRanges}
            toggleOption={(v) =>
              toggleList(v, selectedPriceRanges, setSelectedPriceRanges)
            }
            filterCounts={filterCounts.priceRanges}
            disabled={isFetching}
          />
          <DropdownFilter
            label={`Variation Hinge (${selectedVariationHinges.length})`}
            isOpen={variationHingeOpen}
            setIsOpen={setVariationHingeOpen}
            options={filterOptions.variationHinges}
            selectedOptions={selectedVariationHinges}
            toggleOption={(v) =>
              toggleList(v, selectedVariationHinges, setSelectedVariationHinges)
            }
            filterCounts={filterCounts.variationHinges}
            disabled={isFetching}
          />
        </div>

        {/* SELECTED FILTER PILLS */}
        {(selectedCategories.length ||
          selectedSubCategories.length ||
          selectedBrands.length ||
          selectedPriceRanges.length ||
          selectedVariationHinges.length) && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedCategories.map((cat) => (
              <span
                key={cat}
                className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
              >
                {cat}
                <button
                  onClick={() =>
                    setSelectedCategories((sel) => sel.filter((x) => x !== cat))
                  }
                  className="ml-1 text-purple-500 hover:text-purple-700"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedSubCategories.map((sub) => (
              <span
                key={sub}
                className="flex items-center px-2 py-1 bg-green-100 text-green-800 rounded-full text-sm"
              >
                {sub}
                <button
                  onClick={() =>
                    setSelectedSubCategories((sel) =>
                      sel.filter((x) => x !== sub)
                    )
                  }
                  className="ml-1 text-green-500 hover:text-green-700"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedBrands.map((br) => (
              <span
                key={br}
                className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
              >
                {br}
                <button
                  onClick={() =>
                    setSelectedBrands((sel) => sel.filter((x) => x !== br))
                  }
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedPriceRanges.map((pr) => (
              <span
                key={pr}
                className="flex items-center px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm"
              >
                {pr}
                <button
                  onClick={() =>
                    setSelectedPriceRanges((sel) => sel.filter((x) => x !== pr))
                  }
                  className="ml-1 text-yellow-500 hover:text-yellow-700"
                >
                  ×
                </button>
              </span>
            ))}
            {selectedVariationHinges.map((vh) => (
              <span
                key={vh}
                className="flex items-center px-2 py-1 bg-red-100 text-red-800 rounded-full text-sm"
              >
                {vh}
                <button
                  onClick={() =>
                    setSelectedVariationHinges((sel) =>
                      sel.filter((x) => x !== vh)
                    )
                  }
                  className="ml-1 text-red-500 hover:text-red-700"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        )}

        {/* NO RESULTS */}
        {!initialLoad && !isFetching && displayList.length === 0 && (
          <div className="py-8 text-center text-gray-500">
            No products found
            {hasSearch ? ` for “${debouncedSearch}”` : ""}.
          </div>
        )}

        {/* INITIAL SKELETON OR GRID WITH OVERLAY */}
        {initialLoad && isFetching ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div className="relative">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {displayList.map((p) => (
                <ProductCard
                  key={p._id}
                  product={p}
                  handleViewProduct={openDetails}
                  handleDeleteProduct={async (id) => {
                    if (
                      !window.confirm("Are you sure you want to delete this product?")
                    )
                      return;
                    try {
                      const token = localStorage.getItem("token");
                      await axios.delete(
                        `${BACKEND_URL}/api/admin/products/${id}`,
                        { headers: { Authorization: `Bearer ${token}` } }
                      );
                      setCurrentPage(1);
                    } catch (err) {
                      console.error(err);
                    }
                  }}
                  openSingleProductModal={() => {
                    setEditProductId(p._id);
                    setNewProductData(p);
                    setSingleModalOpen(true);
                  }}
                  carouselIndexMap={carouselIndexMap}
                  handleNextImage={handleNextImage}
                  handlePrevImage={handlePrevImage}
                />
              ))}
            </div>
            {isFetching && (
              <div className="absolute inset-0 bg-white bg-opacity-50 flex items-center justify-center">
                <div className="w-12 h-12 border-4 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
              </div>
            )}
          </div>
        )}

        {/* PAGINATION */}
        <div className="flex justify-center items-center mt-6 space-x-4">
          <button
            onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
            disabled={currentPage <= 1 || isFetching}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Previous
          </button>
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
            disabled={currentPage >= totalPages || isFetching}
            className="px-4 py-2 bg-gray-300 rounded disabled:opacity-50"
          >
            Next
          </button>
        </div>
      </div>

      {/* SINGLE PRODUCT MODAL */}
      {singleModalOpen && (
        <SingleProductModal
          editProductId={editProductId}
          newProductData={newProductData}
          setNewProductData={setNewProductData}
          handleSingleProductSubmit={async (e) => {
            e.preventDefault();
            try {
              const token = localStorage.getItem("token");
              const imgs = newProductData.images.filter(
                (i) => typeof i === "string"
              );
              const payload = { ...newProductData, images: imgs };
              if (!editProductId) {
                await axios.post(`${BACKEND_URL}/api/admin/products`, payload, {
                  headers: { Authorization: `Bearer ${token}` },
                });
              } else {
                await axios.put(
                  `${BACKEND_URL}/api/admin/products/${editProductId}`,
                  payload,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
              }
              setSingleModalOpen(false);
              setCurrentPage(1);
            } catch (err) {
              console.error(err);
              alert(
                err?.response?.data?.message ||
                  err?.message ||
                  "Error creating/updating product"
              );
            }
          }}
          closeSingleProductModal={() => setSingleModalOpen(false)}
          handleFileChange={async (e) => {
            const files = Array.from(e.target.files || []);
            if (!files.length) return;

            setUploadProgress(0);
            const urls = [];

            // Upload sequentially for simpler progress UX
            for (const file of files) {
              try {
                const result = await uploadImage(file, (pct) => {
                  setUploadProgress(pct);
                });
                if (result.secure_url) {
                  urls.push(result.secure_url);
                } else {
                  throw new Error("Upload returned no URL");
                }
              } catch (err) {
                console.error("Upload failed:", err);
                alert(
                  `Upload failed for ${file.name}: ${
                    err?.message || "Unknown error"
                  }`
                );
              } finally {
                // slight reset for next file in a batch
                setTimeout(() => setUploadProgress(0), 300);
              }
            }

            if (urls.length) {
              setNewProductData((d) => ({
                ...d,
                images: [...(d.images || []), ...urls],
              }));
            }
            // Clear input so choosing the same file again triggers onChange
            e.target.value = "";
          }}
          uploadProgress={uploadProgress}
          categories={filterOptions.categories}
          subCategories={filterOptions.subCategories}
          brands={filterOptions.brands}
        />
      )}

      {/* BULK UPLOAD MODAL */}
      {bulkOpen && (
        <BulkUploadModal
          onClose={() => setBulkOpen(false)}
          getRootProps={advRoot}
          getInputProps={advInput}
          handleDownloadTemplate={() => {
            const wb = XLSX.utils.book_new();
            const headerRow = [
              "Product Tag",
              "Product ID",
              "Variant ID",
              "Category",
              "Sub Category",
              "Variation_hinge",
              "Name",
              "Brand Name",
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
              "Product_Details",
              "Main_Image_URL",
              "Second_Image_URL",
              "Third_Image_URL",
              "Fourth_Image_URL",
              "Other_image_URL",
              "ProductGST",
            ];
            const example = headerRow.map((_, i) => (i === 0 ? "Tag123" : ""));
            const ws = XLSX.utils.aoa_to_sheet([headerRow, example]);
            XLSX.utils.book_append_sheet(wb, ws, "Template");
            const blob = new Blob(
              [XLSX.write(wb, { bookType: "xlsx", type: "array" })],
              { type: "application/octet-stream" }
            );
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = "bulk-upload-template.xlsx";
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
          }}
          processBulkUpload={async () => {
            if (!csvData.length) return alert("No CSV data to upload");
            try {
              const token = localStorage.getItem("token");
              const toUpload = csvData.map((r) => ({
                productTag: r["Product Tag"] || "",
                productId: r["Product ID"] || "",
                variantId: r["Variant ID"] || "",
                category: r["Category"] || "",
                subCategory: r["Sub Category"] || "",
                variationHinge: r["Variation_hinge"] || "",
                name: r["Name"] || "",
                brandName: r["Brand Name"] || "",
                images: [
                  r["Main_Image_URL"],
                  r["Second_Image_URL"],
                  r["Third_Image_URL"],
                  r["Fourth_Image_URL"],
                  r["Other_image_URL"],
                ].filter(Boolean),
                productDetails: r["Product_Details"] || "",
                qty: r["Qty"] || 0,
                MRP_Currency: r["MRP_Currency"] || "",
                MRP: r["MRP"] || 0,
                MRP_Unit: r["MRP_Unit"] || "",
                deliveryTime: r["Delivery Time"] || "",
                size: r["Size"] || "",
                color: r["Color"] || "",
                material: r["Material"] || "",
                priceRange: r["Price Range"] || "",
                weight: r["Weight"] || "",
                hsnCode: r["HSN Code"] || "",
                productCost_Currency: r["Product Cost_Currency"] || "",
                productCost: r["Product Cost"] || 0,
                productCost_Unit: r["Product Cost_Unit"] || "",
                productGST: Number(r["ProductGST"] || 0),
              }));
              await axios.post(
                `${BACKEND_URL}/api/admin/products/bulk`,
                toUpload,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              alert("Bulk upload successful!");
              setBulkOpen(false);
              setCurrentPage(1);
            } catch (err) {
              console.error(err);
              alert("Error with bulk upload");
            }
          }}
          csvData={csvData}
        />
      )}

      {/* PRODUCT DETAILS LIGHTBOX */}
      {productDetailsOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="relative bg-white rounded-lg shadow-lg w/full max-w-4xl max-h-[90vh] overflow-auto">
            <button
              onClick={() => setProductDetailsOpen(false)}
              className="absolute top-4 right-4 text-2xl text-gray-600 z-50"
            >
              ×
            </button>
            <div className="absolute inset-y-0 left-0 flex items-center px-4">
              <button
                onClick={prevDetails}
                className="bg-gray-800 text-white p-2 rounded-full"
              >
                ←
              </button>
            </div>
            <div className="absolute inset-y-0 right-0 flex items-center px-4">
              <button
                onClick={nextDetails}
                className="bg-gray-800 text-white p-2 rounded-full"
              >
                →
              </button>
            </div>
            <div className="p-6">
              <AdminProductDetails
                product={displayList[selectedProductIndex]}
                onEditToggle={() => {
                  setProductDetailsOpen(false);
                  setEditProductId(displayList[selectedProductIndex]._id);
                  setNewProductData(displayList[selectedProductIndex]);
                  setSingleModalOpen(true);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
