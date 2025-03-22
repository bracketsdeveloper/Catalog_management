import React from "react";

export default function SingleProductModal({
  editProductId,
  newProductData,
  setNewProductData,
  closeSingleProductModal,
  handleSingleProductSubmit,
  handleFileChange,
  uploadProgress,
}) {
  return (
    <div className="fixed inset-0 z-50 bg-black bg-opacity-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-full py-8 px-4">
        <div className="bg-gray-800 p-6 rounded w-full max-w-3xl relative overflow-y-auto max-h-[90vh]">
          <h2 className="text-2xl font-bold mb-4 border-b border-gray-700 pb-2">
            {editProductId ? "Edit Product" : "Upload Single Product"}
          </h2>
          <button
            onClick={closeSingleProductModal}
            className="absolute top-2 right-2 text-white bg-red-600 rounded px-2 py-1"
          >
            X
          </button>
          <form onSubmit={handleSingleProductSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block font-medium mb-1">
                  Product Tag (required)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
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
              <div>
                <label className="block font-medium mb-1">
                  Product ID (required)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
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
              <div>
                <label className="block font-medium mb-1">
                  Variant ID (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.variantId}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      variantId: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Category (required)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.category}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      category: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Sub Category (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.subCategory}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      subCategory: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Variation Hinge (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.variationHinge}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      variationHinge: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Name (required)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
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
              <div>
                <label className="block font-medium mb-1">
                  Brand Name (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.brandName}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      brandName: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Stock In Hand (required)
                </label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.stockInHand}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      stockInHand: e.target.value,
                    }))
                  }
                  required
                />
              </div>
              <div>
                <label className="block font-medium mb-1">
                  Stock Currently With (optional)
                </label>
                <input
                  type="text"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.stockCurrentlyWith}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      stockCurrentlyWith: e.target.value,
                    }))
                  }
                />
              </div>
              <div>
                <label className="block font-medium mb-1">Price</label>
                <input
                  type="number"
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.price}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      price: e.target.value,
                    }))
                  }
                />
              </div>
              <div className="col-span-2">
                <label className="block font-medium mb-1">
                  Product Details (optional)
                </label>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 bg-gray-700 rounded"
                  value={newProductData.productDetails}
                  onChange={(e) =>
                    setNewProductData((prev) => ({
                      ...prev,
                      productDetails: e.target.value,
                    }))
                  }
                />
              </div>
            </div>
            {editProductId && newProductData.images?.length > 0 && (
              <div>
                <label className="block font-medium mb-2">
                  Existing Images
                </label>
                <div className="flex flex-wrap gap-2">
                  {newProductData.images.map((imgUrl, idx) => (
                    <div key={idx} className="relative">
                      <img
                        src={imgUrl}
                        alt="existing"
                        className="w-24 h-24 object-cover border border-gray-500"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setNewProductData((prev) => ({
                            ...prev,
                            images: prev.images.filter((_, i) => i !== idx),
                          }))
                        }
                        className="absolute top-0 right-0 bg-red-600 text-white text-xs p-1"
                      >
                        X
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <div>
              <label className="block font-medium mb-1">Upload Images</label>
              <input
                type="file"
                multiple
                accept="image/*"
                className="w-full"
                onChange={handleFileChange}
              />
              {uploadProgress > 0 && (
                <div className="mt-2 w-full bg-gray-700 h-2.5 rounded">
                  <div
                    className="bg-purple-600 h-2.5 rounded"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
            <div className="mt-6">
              <button
                type="submit"
                className="bg-green-600 px-6 py-2 rounded hover:bg-green-700 disabled:opacity-50"
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
