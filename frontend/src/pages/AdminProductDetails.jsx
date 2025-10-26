import React, { useState, useEffect } from "react";
import PropTypes from "prop-types";
import axios from "axios";
import SingleProductModal from "../components/manageproducts/SingleProductModal";
import uploadImage from "../helpers/uploadImage";
import colorsList from "../helpers/colors.json";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";

// Build exact lookup from JSON
const COLOR_MAP = {};
colorsList.forEach(({ name, hex }) => {
  COLOR_MAP[name.trim().toLowerCase()] = hex;
});

// Fuzzy-match helper
function getColorHex(colorName) {
  const key = colorName.trim().toLowerCase();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  const found = Object.keys(COLOR_MAP).find((k) => k.includes(key));
  return found ? COLOR_MAP[found] : "#ffffff";
}

export default function AdminProductDetails({
  product,
  onEditToggle,
  categories,
  subCategories,
  brands,
}) {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // Helper to load state from localStorage
  const loadState = (key, defaultValue) => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch {
      return defaultValue;
    }
  };

  const [editing, setEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(
    loadState(`productImageIndex_${product?._id}`, 0)
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
    productTag: product?.productTag || "",
    productId: product?.productId || "",
    variantId: product?.variantId || "",
    category: product?.category || "",
    subCategory: product?.subCategory || "",
    variationHinge: product?.variationHinge || "",
    name: product?.name || "",
    brandName: product?.brandName || "",
    images: product?.images || [],
    productDetails: product?.productDetails || "",
    qty: product?.qty || 0,
    MRP_Currency: product?.MRP_Currency || "",
    MRP: product?.MRP || 0,
    MRP_Unit: product?.MRP_Unit || "",
    deliveryTime: product?.deliveryTime || "",
    size: product?.size || "",
    color: product?.color || "",
    material: product?.material || "",
    priceRange: product?.priceRange || "",
    weight: product?.weight || "",
    hsnCode: product?.hsnCode || "",
    productCost_Currency: product?.productCost_Currency || "",
    productCost: product?.productCost || 0,
    productCost_Unit: product?.productCost_Unit || "",
    productGST: product?.productGST || 0,
    preferredVendors: product?.preferredVendors?.map((v) => v._id) || [], // Initialize with vendor IDs
  });

  // Persist activeImageIndex to localStorage
  useEffect(() => {
    if (product?._id) {
      localStorage.setItem(
        `productImageIndex_${product._id}`,
        JSON.stringify(activeImageIndex)
      );
    }
  }, [activeImageIndex, product?._id]);

  // Validate activeImageIndex when product changes
  useEffect(() => {
    if (product?.images?.length > 0) {
      const validIndex = Math.min(activeImageIndex, product.images.length - 1);
      setActiveImageIndex(validIndex);
      localStorage.setItem(
        `productImageIndex_${product._id}`,
        JSON.stringify(validIndex)
      );
    } else {
      setActiveImageIndex(0);
    }
  }, [product]); // eslint-disable-line react-hooks/exhaustive-deps

  // Update formData when product changes
  useEffect(() => {
    if (product) {
      setFormData({
        productTag: product.productTag || "",
        productId: product.productId || "",
        variantId: product.variantId || "",
        category: product.category || "",
        subCategory: product.subCategory || "",
        variationHinge: product.variationHinge || "",
        name: product.name || "",
        brandName: product.brandName || "",
        images: product.images || [],
        productDetails: product.productDetails || "",
        qty: product.qty || 0,
        MRP_Currency: product.MRP_Currency || "",
        MRP: product.MRP || 0,
        MRP_Unit: product.MRP_Unit || "",
        deliveryTime: product.deliveryTime || "",
        size: product.size || "",
        color: product.color || "",
        material: product.material || "",
        priceRange: product.priceRange || "",
        weight: product.weight || "",
        hsnCode: product.hsnCode || "",
        productCost_Currency: product.productCost_Currency || "",
        productCost: product.productCost || 0,
        productCost_Unit: product.productCost_Unit || "",
        productGST: product.productGST || 0,
        preferredVendors: product.preferredVendors?.map((v) => v._id) || [],
      });
    }
  }, [product]);

  // Handlers
  const handleEditToggle = () => {
    setEditing((prev) => !prev);
    if (editing && onEditToggle) {
      onEditToggle(); // Notify parent to refresh product list
    }
    // Reset activeImageIndex when exiting edit mode
    if (editing && product?.images?.length > 0) {
      const validIndex = Math.min(activeImageIndex, product.images.length - 1);
      setActiveImageIndex(validIndex);
      localStorage.setItem(
        `productImageIndex_${product._id}`,
        JSON.stringify(validIndex)
      );
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const files = Array.from(e.target.files);
    const urls = [];
    for (let file of files) {
      try {
        const up = await uploadImage(file, (pct) => setUploadProgress(pct));
        urls.push(up.secure_url);
      } catch (err) {
        console.error("Image upload error:", err);
        alert(`Failed to upload image: ${err.message}`);
      }
    }
    setFormData((prev) => ({ ...prev, images: [...prev.images, ...urls] }));
  };

  const handleProductUpdate = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("token");
      const payload = {
        ...formData,
        productGST: Number(formData.productGST),
        qty: Number(formData.qty),
        MRP: Number(formData.MRP),
        productCost: Number(formData.productCost),
      };
      await axios.put(`${BACKEND_URL}/api/admin/products/${product._id}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setEditing(false);
      if (onEditToggle) {
        onEditToggle(); // Notify parent to refresh product list
      }
    } catch (err) {
      console.error("Error updating product:", err);
      alert(err?.response?.data?.message || "Failed to update product");
    } finally {
      setUploadProgress(0);
    }
  };

  // Render
  if (!product || !product._id) {
    return (
      <div className="p-4 text-red-600 text-center">
        No product data available
      </div>
    );
  }

  // Build vendor labels using vendorCompany -> vendorName -> _id
  const vendorLabels =
    (product.preferredVendors || [])
      .map((v) => v?.vendorCompany || v?.vendorName || v?._id)
      .filter(Boolean) || [];

  return (
    <div className="bg-white py-6">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {!editing ? (
          <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg ring-1 ring-gray-200 overflow-hidden">
            {/* Image Gallery */}
            <div className="md:w-1/2 bg-gray-50 p-4 flex flex-col items-center">
              {product.images?.length ? (
                <>
                  <div className="relative w-full h-96 bg-gray-200 flex items-center justify-center">
                    <img
                      src={product.images[activeImageIndex]}
                      alt={product.name}
                      className="object-contain w-full h-full"
                    />
                  </div>
                  {product.images.length > 1 && (
                    <div className="flex gap-2 mt-4">
                      {product.images.map((thumb, idx) => (
                        <img
                          key={idx}
                          src={thumb}
                          alt={`Thumb ${idx}`}
                          className={`h-20 w-20 object-cover border border-gray-300 cursor-pointer ${
                            activeImageIndex === idx ? "opacity-80" : ""
                          }`}
                          onClick={() => setActiveImageIndex(idx)}
                        />
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <div className="h-96 w-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
            </div>

            {/* Details Panel */}
            <div className="md:w-1/2 p-6">
              <h1 className="text-2xl font-semibold text-gray-900">{product.name}</h1>
              <p className="mt-2 text-xl font-bold text-purple-600">
                {product.productCost_Currency || "₹"}
                {product.productCost}
                {product.productCost_Unit && ` / ${product.productCost_Unit}`}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-6 text-gray-700">
                {/* Product Tag */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Product Tag</h3>
                  <p className="text-sm">{product.productTag || "N/A"}</p>
                </div>
                {/* Product ID */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Product ID</h3>
                  <p className="text-sm">{product.productId || "N/A"}</p>
                </div>
                {/* Variant ID */}
                {product.variantId && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Variant ID</h3>
                    <p className="text-sm">{product.variantId}</p>
                  </div>
                )}
                {/* Category */}
                <div className="col-span-2">
                  <h3 className="text-sm font-medium text-gray-600">Category</h3>
                  <p className="text-sm">
                    {product.category || "N/A"}
                    {product.subCategory && ` / ${product.subCategory}`}
                  </p>
                </div>
                {/* Variation Hinge */}
                {product.variationHinge && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Variation Hinge</h3>
                    <p className="text-sm">{product.variationHinge}</p>
                  </div>
                )}
                {/* Brand */}
                {product.brandName && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Brand</h3>
                    <p className="text-sm">{product.brandName}</p>
                  </div>
                )}
                {/* Quantity */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Quantity</h3>
                  <p className="text-sm">{product.qty || 0}</p>
                </div>
                {/* Delivery Time */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Delivery Time</h3>
                  <p className="text-sm">{product.deliveryTime || "N/A"}</p>
                </div>
                {/* Size badges */}
                {product.size && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-600">Size</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.size.split(",").map((sz) => (
                        <span
                          key={sz}
                          className="text-sm font-medium border border-gray-300 rounded px-2 py-1"
                        >
                          {sz.trim()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                {/* Color swatches */}
                {product.color && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-600">Color</h3>
                    <div className="flex flex-wrap gap-4 mt-1">
                      {product.color.split(",").map((clr) => {
                        const name = clr.trim();
                        const hex = getColorHex(name);
                        return (
                          <div key={name} className="flex items-center space-x-2">
                            <span
                              className="inline-block w-6 h-6 rounded-full border"
                              style={{ backgroundColor: hex }}
                            />
                            <span className="text-sm text-gray-700">{name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
                {/* Material */}
                {product.material && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Material</h3>
                    <p className="text-sm">{product.material}</p>
                  </div>
                )}
                {/* Price Range */}
                {product.priceRange && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Price Range</h3>
                    <p className="text-sm">{product.priceRange}</p>
                  </div>
                )}
                {/* Weight */}
                {product.weight && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">Weight</h3>
                    <p className="text-sm">{product.weight}</p>
                  </div>
                )}
                {/* HSN Code */}
                {product.hsnCode && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">HSN Code</h3>
                    <p className="text-sm">{product.hsnCode}</p>
                  </div>
                )}
                {/* MRP */}
                {product.MRP !== 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">MRP</h3>
                    <p className="text-sm">
                      {product.MRP_Currency || ""} {product.MRP}
                      {product.MRP_Unit && ` / ${product.MRP_Unit}`}
                    </p>
                  </div>
                )}
                {/* GST */}
                {product.productGST > 0 && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-600">GST (%)</h3>
                    <p className="text-sm">{product.productGST}</p>
                  </div>
                )}
                {/* Preferred Vendors */}
                {product.preferredVendors?.length > 0 && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-600">Preferred Vendors</h3>
                    <p className="text-sm">
                      {vendorLabels.length ? vendorLabels.join(", ") : "None"}
                    </p>
                  </div>
                )}
              </div>

              {/* Details */}
              {product.productDetails && (
                <div className="mt-6 text-sm text-gray-600">
                  <h3 className="text-sm font-medium text-gray-600">Details</h3>
                  <p className="mt-1">{product.productDetails}</p>
                </div>
              )}

              {/* Edit Button */}
              {localStorage.getItem("role") === "ADMIN" && (
                <button
                  onClick={handleEditToggle}
                  className="mt-6 px-6 py-2 bg-blue-600 rounded text-white font-medium hover:bg-blue-700 shadow"
                >
                  Edit Product
                </button>
              )}
            </div>
          </div>
        ) : (
          <SingleProductModal
            editProductId={product._id}
            newProductData={formData}
            setNewProductData={setFormData}
            handleSingleProductSubmit={handleProductUpdate}
            closeSingleProductModal={handleEditToggle}
            handleFileChange={handleFileChange}
            uploadProgress={uploadProgress}
            categories={categories || []}
            subCategories={subCategories || []}
            brands={brands || []}
          />
        )}
      </div>
    </div>
  );
}

AdminProductDetails.propTypes = {
  product: PropTypes.shape({
    _id: PropTypes.string.isRequired,
    name: PropTypes.string,
    productTag: PropTypes.string,
    productId: PropTypes.string,
    variantId: PropTypes.string,
    category: PropTypes.string,
    subCategory: PropTypes.string,
    variationHinge: PropTypes.string,
    brandName: PropTypes.string,
    images: PropTypes.arrayOf(PropTypes.string),
    productDetails: PropTypes.string,
    qty: PropTypes.number,
    MRP_Currency: PropTypes.string,
    MRP: PropTypes.number,
    MRP_Unit: PropTypes.string,
    deliveryTime: PropTypes.string,
    size: PropTypes.string,
    color: PropTypes.string,
    material: PropTypes.string,
    priceRange: PropTypes.string,
    weight: PropTypes.string,
    hsnCode: PropTypes.string,
    productCost_Currency: PropTypes.string,
    productCost: PropTypes.number,
    productCost_Unit: PropTypes.string,
    productGST: PropTypes.number,
    preferredVendors: PropTypes.arrayOf(
      PropTypes.shape({
        _id: PropTypes.string,
        vendorCompany: PropTypes.string, // show company first
        vendorName: PropTypes.string,    // fallback if company missing
      })
    ),
    categories: PropTypes.arrayOf(PropTypes.string),
    subCategories: PropTypes.arrayOf(PropTypes.string),
    brands: PropTypes.arrayOf(PropTypes.string),
  }).isRequired,
  onEditToggle: PropTypes.func,
  categories: PropTypes.arrayOf(PropTypes.string),
  subCategories: PropTypes.arrayOf(PropTypes.string),
  brands: PropTypes.arrayOf(PropTypes.string),
};
