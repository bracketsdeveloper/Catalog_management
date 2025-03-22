import React from "react";

export default function ProductCard({
  product,
  carouselIndex,
  handlePrevImage,
  handleNextImage,
  openSingleProductModal,
  handleDeleteProduct,
  isSelected,
  toggleSelectProduct,
}) {
  const images = product.images || [];
  const currentImg = images[carouselIndex] || "";
  const inStock = product.stockInHand > 0;

  return (
    <div
      className={`bg-white rounded shadow-lg p-4 relative border ${
        isSelected ? "border-pink-500 bg-pink-50" : "border-purple-200"
      }`}
    >
      <span
        className={`absolute top-2 right-2 px-2 py-1 text-xs font-bold rounded z-10 ${
          inStock ? "bg-purple-600" : "bg-pink-600"
        } text-white`}
      >
        {inStock ? "Available" : "Out of Stock"}
      </span>
      <div className="relative h-40 mb-4 flex items-center justify-center bg-white border border-purple-100 rounded">
        {images.length > 0 ? (
          <>
            <img
              src={currentImg}
              alt="Product"
              className="h-40 object-cover rounded"
            />
            {images.length > 1 && (
              <>
                <button
                  onClick={() => handlePrevImage(product._id)}
                  className="absolute left-2 bg-purple-700/70 text-white px-2 py-1 text-sm rounded"
                >
                  &lt;
                </button>
                <button
                  onClick={() => handleNextImage(product._id)}
                  className="absolute right-2 bg-purple-700/70 text-white px-2 py-1 text-sm rounded"
                >
                  &gt;
                </button>
              </>
            )}
          </>
        ) : (
          <span className="text-sm text-gray-500">No image</span>
        )}
      </div>
      <h2 className="font-bold text-xl mb-1 text-purple-900">
        {product.name}
      </h2>
      <p className="text-sm text-purple-700">
        {product.category}
        {product.subCategory ? ` / ${product.subCategory}` : ""}
      </p>
      <p className="text-sm font-semibold text-purple-800">
        Price: ₹{product.price}
      </p>
      {product.productDetails && (
        <p className="text-xs text-purple-600 italic mt-1">
          {product.productDetails}
        </p>
      )}
      
      <div className="mt-2">
        <button
          onClick={() => toggleSelectProduct(product._id)}
          className={`w-full px-4 py-2 rounded text-sm font-semibold ${
            isSelected
              ? "bg-pink-600 hover:bg-pink-700 text-white"
              : "bg-purple-600 hover:bg-purple-700 text-white"
          }`}
        >
          {isSelected ? "Deselect" : "Select"}
        </button>
      </div>
    </div>
  );
}
