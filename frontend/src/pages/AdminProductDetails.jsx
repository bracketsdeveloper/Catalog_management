import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Loader from "../components/Loader";
import SingleProductModal from "../components/manageproducts/SingleProductModal"; // Import the modal

// Helpers
import uploadImage from "../helpers/uploadImage";

export default function AdminProductDetails() {
  const { prodId } = useParams();
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  // ----------------- STATE -----------------
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editing, setEditing] = useState(false);

  const [activeImageIndex, setActiveImageIndex] = useState(0);
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
  const [uploadProgress, setUploadProgress] = useState(0);

  // ----------------- FETCH PRODUCT -----------------
  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/products/${prodId}?full=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const prod = res.data.product || res.data;
      setProduct(prod);
      setActiveImageIndex(0); // reset active image on new fetch
      setError(null);
      // Populate formData with the product details for editing
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

  // ----------------- HANDLERS -----------------
  const handleBack = () => navigate(-1);

  const handleEditToggle = () => setEditing((prev) => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = async (e) => {
    const newImages = [...e.target.files];
    const uploadedImages = [];

    for (let i = 0; i < newImages.length; i++) {
      const uploadedImage = await uploadImage(newImages[i]);
      uploadedImages.push(uploadedImage.secure_url);
    }

    // Set the images to the uploaded image URLs
    setFormData((prev) => ({
      ...prev,
      images: [...prev.images, ...uploadedImages]
    }));
  };

  const handleProductUpdate = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    
    try {
      const token = localStorage.getItem("token");
      const payload = {
        productTag: formData.productTag,
        productId: formData.productId,
        variantId: formData.variantId,
        category: formData.category,
        subCategory: formData.subCategory,
        variationHinge: formData.variationHinge,
        name: formData.name,
        brandName: formData.brandName,
        images: formData.images, // The images are already URLs from Cloudinary
        productDetails: formData.productDetails,
        qty: formData.qty,
        MRP_Currency: formData.MRP_Currency,
        MRP: formData.MRP,
        MRP_Unit: formData.MRP_Unit,
        deliveryTime: formData.deliveryTime,
        size: formData.size,
        color: formData.color,
        material: formData.material,
        priceRange: formData.priceRange,
        weight: formData.weight,
        hsnCode: formData.hsnCode,
        productCost_Currency: formData.productCost_Currency,
        productCost: formData.productCost,
        productCost_Unit: formData.productCost_Unit,
        productGST: Number(formData.productGST)
      };

      await axios.put(`${BACKEND_URL}/api/admin/products/${prodId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setEditing(false); // Toggle editing off after the update
      fetchProduct(); // Refresh product details after update
    } catch (err) {
      console.error("Error updating product:", err);
      setError("Failed to update product");
    } finally {
      setUploadProgress(0);
    }
  };

  // ----------------- RENDER -----------------
  if (loading) return <Loader />;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!product) return <div className="p-4">Product not found</div>;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl p-4 md:p-6">
        {/* Breadcrumb Navigation */}
        <nav className="mb-4 text-sm text-gray-600">
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => navigate("/admin-dashboard/manage-products")}
          >
            Admin Dashboard
          </span>{" "}
          /{" "}
          <span
            className="text-blue-600 hover:underline cursor-pointer"
            onClick={() => navigate("/admin-dashboard/manage-products")}
          >
            Manage Products
          </span>{" "}
          /{" "}
          <span className="font-semibold text-gray-900">Product Details</span>
        </nav>

        <button onClick={handleBack} className="mb-6 text-sm text-blue-600 hover:underline">
          &larr; Back
        </button>

        {/* VIEW MODE */}
        {!editing ? (
          <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Left Section: Image Gallery */}
            <div className="md:w-1/2 p-4 flex flex-col items-center bg-gray-50">
              {product.images && product.images.length > 0 ? (
                <div className="relative w-full h-96 bg-gray-200 flex items-center justify-center">
                  <img
                    src={product.images[activeImageIndex]}
                    alt={product.name}
                    className="object-contain w-full h-full" // Ensures the image fills the container
                  />
                </div>
              ) : (
                <div className="h-96 w-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.map((thumbUrl, idx) => (
                    <img
                      key={idx}
                      src={thumbUrl}
                      alt={`Thumbnail ${idx}`}
                      className={`h-20 w-20 object-cover border border-gray-300 cursor-pointer ${
                        activeImageIndex === idx ? "opacity-80" : ""
                      }`}
                      onClick={() => setActiveImageIndex(idx)}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Section: Details */}
            <div className="md:w-1/2 p-6 space-y-4">
              <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
              <div className="text-xl font-semibold text-purple-700">
                ₹ {product.productCost}
                {product.productCost_Unit ? ` / ${product.productCost_Unit}` : ""}
              </div>

              {/* Key Fields */}
              <div className="space-y-1 text-gray-700">
                <p className="text-sm">
                  <span className="font-semibold">Product Tag:</span> {product.productTag}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Product ID:</span> {product.productId}
                </p>
                {product.variantId && (
                  <p className="text-sm">
                    <span className="font-semibold">Variant ID:</span> {product.variantId}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Category:</span> {product.category}
                  {product.subCategory && ` / ${product.subCategory}`}
                </p>
                {product.variationHinge && (
                  <p className="text-sm">
                    <span className="font-semibold">Variation Hinge:</span> {product.variationHinge}
                  </p>
                )}
                {product.brandName && (
                  <p className="text-sm">
                    <span className="font-semibold">Brand:</span> {product.brandName}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Quantity:</span> {product.qty}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Delivery Time:</span> {product.deliveryTime}
                </p>
                {product.size && (
                  <p className="text-sm">
                    <span className="font-semibold">Size:</span> {product.size}
                  </p>
                )}
                {product.color && (
                  <p className="text-sm">
                    <span className="font-semibold">Color:</span> {product.color}
                  </p>
                )}
                {product.material && (
                  <p className="text-sm">
                    <span className="font-semibold">Material:</span> {product.material}
                  </p>
                )}
                {product.priceRange && (
                  <p className="text-sm">
                    <span className="font-semibold">Price Range:</span> {product.priceRange}
                  </p>
                )}
                {product.weight && (
                  <p className="text-sm">
                    <span className="font-semibold">Weight:</span> {product.weight}
                  </p>
                )}
                {product.hsnCode && (
                  <p className="text-sm">
                    <span className="font-semibold">HSN Code:</span> {product.hsnCode}
                  </p>
                )}
                {product.MRP !== 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">MRP:</span> {product.MRP_Currency} {product.MRP}
                    {product.MRP_Unit ? ` / ${product.MRP_Unit}` : ""}
                  </p>
                )}
                {product.productGST > 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">GST (%):</span> {product.productGST}
                  </p>
                )}
              </div>

              {product.productDetails && (
                <div className="text-sm text-gray-600 pt-2">
                  <span className="font-semibold">Details:</span> {product.productDetails}
                </div>
              )}

              {localStorage.getItem("role") === "ADMIN" && (
                <button
                  onClick={handleEditToggle}
                  className="mt-4 inline-block bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded font-medium"
                >
                  Edit Product
                </button>
              )}
            </div>
          </div>
        ) : (
          // Using the SingleProductModal for editing
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
