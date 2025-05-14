// src/pages/AdminProductDetails.jsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ChevronLeftIcon } from "@heroicons/react/24/solid";
import Loader from "../components/Loader";
import SingleProductModal from "../components/manageproducts/SingleProductModal";
import uploadImage from "../helpers/uploadImage";
import colorsList from "../helpers/colors.json";

// Build exact lookup from JSON
const COLOR_MAP = {};
colorsList.forEach(({ name, hex }) => {
  COLOR_MAP[name.trim().toLowerCase()] = hex;
});

// Fuzzy-match helper
function getColorHex(colorName) {
  const key = colorName.trim().toLowerCase();
  if (COLOR_MAP[key]) return COLOR_MAP[key];
  const found = Object.keys(COLOR_MAP).find(k => k.includes(key));
  return found ? COLOR_MAP[found] : "#ffffff";
}

export default function AdminProductDetails({ prodId: propProdId }) {
  const { prodId: routeProdId } = useParams();
  const prodId = propProdId || routeProdId;

  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formData, setFormData] = useState({
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
    productGST: 0
  });

  // Fetch product details
  const fetchProduct = async () => {
    if (!prodId) {
      setError("No product ID provided");
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/products/${prodId}?full=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const prod = res.data.product || res.data;
      setProduct(prod);
      setActiveImageIndex(0);
      setError(null);
      setFormData({
        productTag: prod.productTag || "",
        productId: prod.productId || "",
        variantId: prod.variantId || "",
        category: prod.category || "",
        subCategory: prod.subCategory || "",
        variationHinge: prod.variationHinge || "",
        name: prod.name || "",
        brandName: prod.brandName || "",
        images: prod.images || [],
        productDetails: prod.productDetails || "",
        qty: prod.qty || 0,
        MRP_Currency: prod.MRP_Currency || "",
        MRP: prod.MRP || 0,
        MRP_Unit: prod.MRP_Unit || "",
        deliveryTime: prod.deliveryTime || "",
        size: prod.size || "",
        color: prod.color || "",
        material: prod.material || "",
        priceRange: prod.priceRange || "",
        weight: prod.weight || "",
        hsnCode: prod.hsnCode || "",
        productCost_Currency: prod.productCost_Currency || "",
        productCost: prod.productCost || 0,
        productCost_Unit: prod.productCost_Unit || "",
        productGST: prod.productGST || 0
      });
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError("Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
  }, [prodId]);

  // Handlers
  const handleBack = () => navigate(-1);
  const handleEditToggle = () => setEditing(prev => !prev);
  const handleChange = e => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };
  const handleFileChange = async e => {
    const files = Array.from(e.target.files);
    const urls = [];
    for (let file of files) {
      const up = await uploadImage(file);
      urls.push(up.secure_url);
    }
    setFormData(prev => ({ ...prev, images: [...prev.images, ...urls] }));
  };
  const handleProductUpdate = async e => {
    e.preventDefault();
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("token");
      const payload = { ...formData, productGST: Number(formData.productGST) };
      await axios.put(`${BACKEND_URL}/api/admin/products/${prodId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      fetchProduct();
    } catch (err) {
      console.error("Error updating product:", err);
      setError("Failed to update product");
    } finally {
      setUploadProgress(0);
    }
  };

  // Render
  if (loading) return <Loader />;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!product) return <div className="p-4">Product not found</div>;

  return (
    <div className="min-h-screen bg-gray-100 py-6">
      <div className="mx-auto max-w-6xl p-4 md:p-6">

      {!propProdId && (
          <button
            onClick={handleBack}
            className="mb-6 inline-flex items-center px-4 py-2 bg-white border border-gray-300 rounded text-gray-700 hover:bg-gray-50 shadow"
          >
            <ChevronLeftIcon className="h-5 w-5 mr-2 text-gray-500" />
            Back
          </button>
        )}

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
                          className={`h-20 w-20 object-cover border border-gray-300 cursor-pointer ${activeImageIndex === idx ? "opacity-80" : ""}`}
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
                ₹{product.productCost}
                {product.productCost_Unit && ` / ${product.productCost_Unit}`}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-y-4 gap-x-6 text-gray-700">
                {/* Product Tag */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Product Tag</h3>
                  <p className="text-sm">{product.productTag}</p>
                </div>
                {/* Product ID */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Product ID</h3>
                  <p className="text-sm">{product.productId}</p>
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
                    {product.category}
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
                  <p className="text-sm">{product.qty}</p>
                </div>
                {/* Delivery Time */}
                <div>
                  <h3 className="text-sm font-medium text-gray-600">Delivery Time</h3>
                  <p className="text-sm">{product.deliveryTime}</p>
                </div>

                {/* Size badges */}
                {product.size && (
                  <div className="col-span-2">
                    <h3 className="text-sm font-medium text-gray-600">Size</h3>
                    <div className="flex flex-wrap gap-2 mt-1">
                      {product.size.split(",").map(sz => (
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
                      {product.color.split(",").map(clr => {
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
                      {product.MRP_Currency} {product.MRP}
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
              </div>

              {/* Details */}
              {product.productDetails && (
                <div className="mt-6 text-sm text-gray-600">
                  <h3 className="text-sm font-medium text-gray-600">Details</h3>
                  <p className="mt-1">{product.productDetails}</p>
                </div>
              )}

              {/* Edit Button */}
              {!propProdId && localStorage.getItem("role") === "ADMIN" && (
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
          /* SingleProductModal for editing */
          <SingleProductModal
            editProductId={product._id}
            newProductData={formData}
            setNewProductData={setFormData}
            handleSingleProductSubmit={handleProductUpdate}
            closeSingleProductModal={handleEditToggle}
            handleFileChange={handleFileChange}
            uploadProgress={uploadProgress}
            categories={product.categories}
            subCategories={product.subCategories}
            brands={product.brands}
          />
        )}
      </div>
    </div>
  );
}
