import React from "react";

// Helper function to get CSS color from color name
const getColorValue = (colorName) => {
  if (!colorName) return null;
  
  const colorMap = {
    // Common color mappings
    "red": "#EF4444",
    "blue": "#3B82F6",
    "green": "#22C55E",
    "yellow": "#EAB308",
    "orange": "#F97316",
    "purple": "#A855F7",
    "pink": "#EC4899",
    "black": "#000000",
    "white": "#FFFFFF",
    "gray": "#6B7280",
    "grey": "#6B7280",
    "brown": "#92400E",
    "navy": "#1E3A8A",
    "navy blue": "#1E3A8A",
    "sky blue": "#0EA5E9",
    "light blue": "#93C5FD",
    "dark blue": "#1E40AF",
    "maroon": "#7F1D1D",
    "beige": "#D4C4A8",
    "cream": "#FFFDD0",
    "gold": "#FFD700",
    "silver": "#C0C0C0",
    "rose": "#FB7185",
    "rose gold": "#B76E79",
    "teal": "#14B8A6",
    "cyan": "#06B6D4",
    "magenta": "#D946EF",
    "olive": "#84CC16",
    "coral": "#F97171",
    "peach": "#FDBA74",
    "mint": "#86EFAC",
    "lavender": "#C4B5FD",
    "burgundy": "#800020",
    "tan": "#D2B48C",
    "ivory": "#FFFFF0",
    "charcoal": "#374151",
    "turquoise": "#40E0D0",
    "indigo": "#6366F1",
    "violet": "#8B5CF6",
    "aqua": "#00FFFF",
    "lime": "#84CC16",
    "khaki": "#C3B091",
    "multicolor": "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #A855F7)",
    "multi": "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #A855F7)",
    "assorted": "linear-gradient(90deg, #EF4444, #F97316, #EAB308, #22C55E, #3B82F6, #A855F7)",
  };

  const lowerColor = colorName.toLowerCase().trim();
  
  // Check if it's in our map
  if (colorMap[lowerColor]) {
    return colorMap[lowerColor];
  }
  
  // Check if it's a valid hex color
  if (/^#([0-9A-F]{3}){1,2}$/i.test(colorName)) {
    return colorName;
  }
  
  // Check if it's a valid CSS color name (browser will handle it)
  return colorName.toLowerCase();
};

// Parse colors from comma-separated string
const parseColors = (colorString) => {
  if (!colorString) return [];
  return colorString
    .split(',')
    .map(c => c.trim())
    .filter(c => c.length > 0);
};

export default function ProductCard({
  product,
  lastUpdatedLog,
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
  
  const colors = parseColors(product.color);

  // Format date for display
  const formatDate = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  // Get user initials for display
  const getUserInitials = (name) => {
    if (!name) return "U";
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  const performerName = lastUpdatedLog?.performedBy?.name || "Unknown";
  const performerEmail = lastUpdatedLog?.performedBy?.email || "";
  const performedAt = lastUpdatedLog?.performedAt;

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-300 p-4 relative">
      <div onClick={() => handleViewProduct(product._id)} className="cursor-pointer group">
        {/* Last Updated Badge - Top Right */}
        {lastUpdatedLog && (
          <div className="absolute top-2 right-2 z-10">
            <div className="relative group/update">
              <div className="bg-blue-600 text-white rounded-full w-7 h-7 flex items-center justify-center text-xs font-medium shadow-md border border-blue-700">
                {getUserInitials(performerName)}
              </div>
              
              {/* Tooltip on hover */}
              <div className="absolute top-0 right-full mr-2 w-48 p-2 bg-white border border-gray-200 rounded-lg shadow-lg opacity-0 invisible group-hover/update:opacity-100 group-hover/update:visible transition-all duration-200 z-20">
                <div className="text-xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">Updated:</span>
                    <span className="text-gray-600">{formatDate(performedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-gray-700">By:</span>
                    <span className="text-blue-600 truncate ml-2" title={performerName}>
                      {performerName}
                    </span>
                  </div>
                  {performerEmail && (
                    <div className="text-gray-500 truncate text-[10px]" title={performerEmail}>
                      {performerEmail}
                    </div>
                  )}
                </div>
                {/* Tooltip arrow */}
                <div className="absolute top-2 -right-1 w-2 h-2 bg-white border-r border-t border-gray-200 transform rotate-45"></div>
              </div>
            </div>
          </div>
        )}

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
          
          {/* Color indicator with multiple color boxes - bottom right of image */}
          {colors.length > 0 && (
            <div className="absolute bottom-2 right-2 bg-white/95 backdrop-blur-sm px-2 py-1 rounded-md shadow-sm border border-gray-200 flex items-center gap-1.5 max-w-[120px]">
              <div className="flex items-center gap-0.5 flex-shrink-0">
                {colors.slice(0, 5).map((color, index) => {
                  const colorValue = getColorValue(color);
                  const isGradient = colorValue?.includes('gradient');
                  return (
                    <div
                      key={index}
                      className="w-3.5 h-3.5 rounded-sm border border-gray-300 flex-shrink-0"
                      style={{
                        background: isGradient ? colorValue : undefined,
                        backgroundColor: !isGradient ? colorValue : undefined,
                      }}
                      title={color}
                    />
                  );
                })}
                {colors.length > 5 && (
                  <span className="text-[10px] text-gray-500 ml-0.5">+{colors.length - 5}</span>
                )}
              </div>
              <span className="text-[10px] font-medium text-gray-600 truncate" title={product.color}>
                {colors.length === 1 ? colors[0] : `${colors.length} colors`}
              </span>
            </div>
          )}
        </div>

        {/* Show MRP + Product Cost */}
        <h2 className="font-semibold text-md mb-1 truncate text-red-500">{product.productId}</h2>
        <h2 className="font-semibold text-lg mb-1 truncate">{product.name}</h2>
        <h2 className="font-semibold text-md mb-1 truncate text-purple-500">{product.brandName}</h2>
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