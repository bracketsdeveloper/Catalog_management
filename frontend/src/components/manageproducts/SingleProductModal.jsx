import React, { useState, useEffect } from "react";

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
  brands
}) {
  const [categorySuggestions, setCategorySuggestions] = useState([]);
  const [subCategorySuggestions, setSubCategorySuggestions] = useState([]);
  const [brandSuggestions, setBrandSuggestions] = useState([]);

  // Helpers for filtering suggestions
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
                      productTag: e.target.value
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
                      productId: e.target.value
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
                      variantId: e.target.value
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
                      category: e.target.value
                    }));
                    filterSuggestions(e.target.value, categories, setCategorySuggestions);
                  }}
                  required
                />
                {/* Category Suggestions */}
                {categorySuggestions.length > 0 && (
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
                )}
              </div>

              {/* Sub Category */}
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
                {/* SubCategory Suggestions */}
                {subCategorySuggestions.length > 0 && (
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
                      variationHinge: e.target.value
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
                      name: e.target.value
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
                      brandName: e.target.value
                    }));
                    filterSuggestions(e.target.value, brands, setBrandSuggestions);
                  }}
                />
                {/* Brand Suggestions */}
                {brandSuggestions.length > 0 && (
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
                )}
              </div>

              {/* Product Description */}
              <div className="col-span-2">
                <label className="block font-medium mb-1">Product Description</label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productDetails}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productDetails: e.target.value
                    }))
                  }
                  rows={4}
                />
              </div>

              {/* Qty */}
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

              {/* MRP Currency */}
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

              {/* MRP */}
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

              {/* MRP Unit */}
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

              {/* Delivery Time */}
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

              {/* Size */}
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

              {/* Color */}
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

              {/* Material */}
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

              {/* Price Range */}
              <div className="col-span-1">
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

              {/* Weight */}
              <div className="col-span-1">
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

              {/* HSN Code */}
              <div className="col-span-1">
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

              {/* Product Cost Currency */}
              <div className="col-span-1">
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

              {/* Product Cost */}
              <div className="col-span-1">
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

              {/* Product Cost Unit */}
              <div className="col-span-1">
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

              {/* Product GST */}
              <div className="col-span-1">
                <label className="block text-sm font-medium text-gray-700">
                  Product GST (%)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-purple-400"
                  value={newProductData.productGST}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productGST: Number(e.target.value)
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
