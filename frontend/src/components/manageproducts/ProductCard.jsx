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
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-4 relative">
      <div onClick={() => handleViewProduct(product._id)} className="cursor-pointer group">
        <div className="relative h-48 mb-4 flex items-center justify-center bg-gray-50 rounded-lg overflow-hidden">
          {images.length > 0 ? (
            <>
              <img src={currentImg} alt="prod" className="h-full w-full object-contain transition-transform duration-300 group-hover:scale-105" />
              {images.length > 1 && (
                <>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrevImage(product._id);
                    }}
                    className="absolute left-2 bg-gray-800/70 text-white px-2 py-1 text-sm rounded-full hover:bg-gray-900/80 transition-colors"
                  >
                    &lt;
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNextImage(product._id);
                    }}
                    className="absolute right-2 bg-gray-800/70 text-white px-2 py-1 text-sm rounded-full hover:bg-gray-900/80 transition-colors"
                  >
                    &gt;
                  </button>
                </>
              )}
            </>
          ) : (
            <span className="text-sm text-gray-400">No image available</span>
          )}
        </div>

        {/* Show MRP + Product Cost */}
        <h2 className="font-semibold text-lg mb-1 truncate">{product.name}</h2>
        <div className="flex items-center gap-2 mb-1">
          <h3 className="font-medium text-md text-gray-500 line-through">
            ₹{product.MRP}/{product.MRP_Unit}
          </h3>
          <h3 className="font-semibold text-md text-green-600">
            ₹{product.productCost}/{product.productCost_Unit}
          </h3>
        </div>

        <p className="text-sm text-gray-500 mb-2">
          {product.category}
          {product.subCategory ? ` / ${product.subCategory}` : ""}
        </p>
        {product.productDetails && (
          <p className="text-xs text-gray-500 italic line-clamp-2">
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
          className="bg-[#Ff8045] hover:bg-[#E6733D] text-white px-3 py-1.5 w-20 rounded-md transition-colors duration-200"
        >
          Edit
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleDeleteProduct(product._id);
          }}
          className="bg-[#66C3D0] hover:bg-[#5AB0BD] text-white px-3 py-1.5 w-20 rounded-md transition-colors duration-200"
        >
          Delete
        </button>
      </div>
    </div>
  );
}
