import React from "react";

export default function ProductCard({
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

        {/* Show MRP + Product Cost */}
        <h2 className="font-semibold text-lg mb-1 truncate">{product.name}</h2>
        <h3 className="font-semibold text-md text-red-600 mb-1 truncate">
          ₹<strike>{product.MRP}/{product.MRP_Unit}</strike>
        </h3>
        <h3 className="font-semibold text-md text-green-600 mb-1 truncate">
          ₹{product.productCost}/{product.productCost_Unit}
        </h3>

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
