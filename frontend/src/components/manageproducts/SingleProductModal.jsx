import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SingleProductModal({
  editProductId,
  newProductData,
  setNewProductData,
  handleSingleProductSubmit,
  closeSingleProductModal,
  handleFileChange,
  uploadProgress,
  categories,
  subCategories,
  brands,

  // NEW: pass populated vendors (objects with _id, vendorCompany/vendorName)
  initialSelectedVendors = [],
}) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [subCategorySuggestions, setSubCategorySuggestions] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [vendorSearch, setVendorSearch] = useState("");

  // Map of vendorId -> { _id, vendorCompany?, vendorName? }
  const [selectedVendorsMap, setSelectedVendorsMap] = useState({});

  // Hydrate map from initialSelectedVendors (edit mode or prefilled product)
  useEffect(() => {
    if (!Array.isArray(initialSelectedVendors)) return;
    setSelectedVendorsMap((prev) => {
      const next = { ...prev };
      for (const v of initialSelectedVendors) {
        if (v && v._id) {
          next[v._id] = {
            _id: v._id,
            vendorCompany: v.vendorCompany,
            vendorName: v.vendorName,
          };
        }
      }
      return next;
    });
  }, [initialSelectedVendors]);

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

  const fetchVendorSuggestions = async (query) => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/vendors/suggestions?query=${encodeURIComponent(
          query
        )}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const list = res.data || [];
      setVendorSuggestions(list);

      // Merge labels for currently selected ids
      if (Array.isArray(newProductData?.preferredVendors)) {
        setSelectedVendorsMap((prev) => {
          const next = { ...prev };
          for (const v of list) {
            if (newProductData.preferredVendors.includes(v._id)) {
              next[v._id] =
                next[v._id] || {
                  _id: v._id,
                  vendorCompany: v.vendorCompany,
                  vendorName: v.vendorName,
                };
            }
          }
          return next;
        });
      }
    } catch (err) {
      console.error("Error fetching vendor suggestions:", err);
      setVendorSuggestions([]);
    }
  };

  // Debounced vendor search
  useEffect(() => {
    const delay = setTimeout(() => {
      if (vendorSearch) {
        fetchVendorSuggestions(vendorSearch);
      } else {
        setVendorSuggestions([]);
      }
    }, 300);
    return () => clearTimeout(delay);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vendorSearch]);

  const handleVendorSelect = (vendor) => {
    setNewProductData((prev) => ({
      ...prev,
      preferredVendors: [
        ...new Set([...(prev.preferredVendors || []), vendor._id]),
      ],
    }));
    setSelectedVendorsMap((prev) => ({
      ...prev,
      [vendor._id]: {
        _id: vendor._id,
        vendorCompany: vendor.vendorCompany,
        vendorName: vendor.vendorName,
      },
    }));
    setVendorSearch("");
    setVendorSuggestions([]);
  };

  const handleVendorRemove = (vendorId) => {
    setNewProductData((prev) => ({
      ...prev,
      preferredVendors: (prev.preferredVendors || []).filter(
        (id) => id !== vendorId
      ),
    }));
    setSelectedVendorsMap((prev) => {
      const next = { ...prev };
      delete next[vendorId];
      return next;
    });
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
              {/* Product Tag */}
              <div>
                <label className="block font-medium mb-1">Product Tag</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productTag}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productTag: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              {/* Product ID */}
              <div>
                <label className="block font-medium mb-1">Product ID</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productId}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productId: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              {/* Variant ID */}
              <div>
                <label className="block font-medium mb-1">Variant ID</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.variantId}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      variantId: e.target.value,
                    }))
                  }
                />
              </div>
              {/* Category */}
              <div>
                <label className="block font-medium mb-1">Category</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.category}
                  onChange={(e) => {
                    setNewProductData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }));
                    filterSuggestions(
                      e.target.value,
                      categories,
                      setCategorySuggestions
                    );
                  }}
                  required
                />
                {categorySuggestions.length > 0 && (
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {categorySuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            category: suggestion,
                          }));
                          setCategorySuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* SubCategory */}
              <div>
                <label className="block font-medium mb-1">Sub Category</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.subCategory}
                  onChange={(e) => {
                    setNewProductData((prev) => ({
                      ...prev,
                      subCategory: e.target.value,
                    }));
                    filterSuggestions(
                      e.target.value,
                      subCategories,
                      setSubCategorySuggestions
                    );
                  }}
                />
                {subCategorySuggestions.length > 0 && (
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {subCategorySuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            subCategory: suggestion,
                          }));
                          setSubCategorySuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {/* Variation Hinge */}
              <div>
                <label className="block font-medium mb-1">Variation Hinge</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.variationHinge}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      variationHinge: e.target.value,
                    }))
                  }
                />
              </div>
              {/* Name */}
              <div>
                <label className="block font-medium mb-1">Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.name}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      name: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              {/* Brand Name */}
              <div>
                <label className="block font-medium mb-1">Brand Name</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.brandName}
                  onChange={(e) => {
                    setNewProductData((prev) => ({
                      ...prev,
                      brandName: e.target.value,
                    }));
                    filterSuggestions(e.target.value, brands, setBrandSuggestions);
                  }}
                />
                {brandSuggestions.length > 0 && (
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md">
                    {brandSuggestions.map((suggestion, index) => (
                      <div
                        key={index}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => {
                          setNewProductData((prev) => ({
                            ...prev,
                            brandName: suggestion,
                          }));
                          setBrandSuggestions([]);
                        }}
                      >
                        {suggestion}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="col-span-2">
                <label className="block font-medium mb-1">Product Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productDetails}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productDetails: e.target.value,
                    }))
                  }
                  rows={4}
                />
              </div>

              {/* Qty / prices */}
              <div>
                <label className="block font-medium mb-1">Qty</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.qty}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      qty: e.target.value,
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
                      MRP_Currency: e.target.value,
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
                      MRP: e.target.value,
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
                      MRP_Unit: e.target.value,
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
                      deliveryTime: e.target.value,
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
                      size: e.target.value,
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
                      color: e.target.value,
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
                      material: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Price Range</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.priceRange}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      priceRange: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Weight</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.weight}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      weight: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">HSN Code</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.hsnCode}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      hsnCode: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Product Cost Currency</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productCost_Currency}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productCost_Currency: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Product Cost</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productCost}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productCost: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Product Cost Unit</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productCost_Unit}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productCost_Unit: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Product GST (%)</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productGST}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productGST: e.target.value,
                    }))
                  }
                />
              </div>

              {/* Preferred Vendors */}
              <div className="col-span-2">
                <label className="block font-medium mb-1">Preferred Vendors</label>
                <input
                  type="text"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={vendorSearch}
                  onChange={(e) => setVendorSearch(e.target.value)}
                  placeholder="Search vendors..."
                />
                {vendorSuggestions.length > 0 && (
                  <div className="bg-white border border-gray-300 mt-1 rounded shadow-md max-h-40 overflow-y-auto">
                    {vendorSuggestions.map((vendor) => (
                      <div
                        key={vendor._id}
                        className="p-2 cursor-pointer hover:bg-gray-200"
                        onClick={() => handleVendorSelect(vendor)}
                      >
                        {vendor.vendorCompany || vendor.vendorName}
                      </div>
                    ))}
                  </div>
                )}
                {(newProductData.preferredVendors || []).length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(newProductData.preferredVendors || []).map((vendorId) => {
                      const fromMap = selectedVendorsMap[vendorId];
                      const fromSuggestions =
                        vendorSuggestions.find((v) => v._id === vendorId) || null;
                      const label =
                        (fromMap && (fromMap.vendorCompany || fromMap.vendorName)) ||
                        (fromSuggestions &&
                          (fromSuggestions.vendorCompany || fromSuggestions.vendorName)) ||
                        vendorId;
                      return (
                        <span
                          key={vendorId}
                          className="flex items-center px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
                        >
                          {label}
                          <button
                            type="button"
                            onClick={() => handleVendorRemove(vendorId)}
                            className="ml-1 text-blue-500 hover:text-blue-700"
                          >
                            ×
                          </button>
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Images */}
              <div className="col-span-2">
                <label className="block font-medium mb-1">Images</label>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleFileChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                />
                {uploadProgress > 0 && (
                  <div className="mt-2">
                    <div className="w-full bg-gray-200 rounded h-2">
                      <div
                        className="bg-blue-600 h-2 rounded"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <p className="text-sm text-gray-600">
                      Uploading: {uploadProgress}%
                    </p>
                  </div>
                )}
                {newProductData.images && newProductData.images.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {newProductData.images.map((img, index) => (
                      <div key={index} className="relative">
                        <img
                          src={img}
                          alt={`Uploaded ${index}`}
                          className="h-20 w-20 object-cover rounded"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setNewProductData((prev) => ({
                              ...prev,
                              images: prev.images.filter((_, i) => i !== index),
                            }))
                          }
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full h-5 w-5 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end space-x-2 mt-4">
              <button
                type="button"
                onClick={closeSingleProductModal}
                className="px-4 py-2 bg-gray-300 text-gray-800 rounded hover:bg-gray-400"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-[#Ff8045] text-white rounded hover:bg-[#e66f3b]"
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
