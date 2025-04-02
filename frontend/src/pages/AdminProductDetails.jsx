"use client"; // Remove if you're using Create React App

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import Loader from "../components/Loader";
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

  // The full product form data, reflecting your product model
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
    productGST: 0 // <-- Added field for storing GST percentage
  });

  const [uploadProgress, setUploadProgress] = useState(0);

  // ----------------- FETCH PRODUCT -----------------
  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      // If you have an endpoint for single product details, e.g. GET /products/:id
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/${prodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const prod = res.data.product ? res.data.product : res.data;

      setProduct(prod);
      // Populate form with existing product details
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
        productGST: prod.productGST || 0 // <-- Load existing GST
      });
      setError(null);
    } catch (err) {
      console.error("Error fetching product details:", err);
      setError("Failed to fetch product details");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProduct();
    // eslint-disable-next-line
  }, [prodId]);

  // ----------------- HANDLERS -----------------
  const handleBack = () => navigate(-1);
  const handleEditToggle = () => setEditing((prev) => !prev);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      images: [...e.target.files]
    }));
  };

  const handleRemoveExistingImage = (idx) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== idx)
    }));
  };

  const handleProductUpdate = async (e) => {
    e.preventDefault();
    setUploadProgress(0);
    try {
      const token = localStorage.getItem("token");
      let finalImages = [];

      // If images are newly uploaded files, handle them
      if (formData.images.length && formData.images[0] instanceof File) {
        for (let i = 0; i < formData.images.length; i++) {
          const res = await uploadImage(formData.images[i]);
          finalImages.push(res.url);
          setUploadProgress(Math.round(((i + 1) / formData.images.length) * 100));
        }
      } else {
        // Otherwise, images are already URLs
        finalImages = formData.images;
      }

      const payload = {
        productTag: formData.productTag,
        productId: formData.productId,
        variantId: formData.variantId,
        category: formData.category,
        subCategory: formData.subCategory,
        variationHinge: formData.variationHinge,
        name: formData.name,
        brandName: formData.brandName,
        images: finalImages,
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
        productGST: Number(formData.productGST) // <-- Send updated GST
      };

      await axios.put(`${BACKEND_URL}/api/admin/products/${prodId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      fetchProduct(); // Refresh
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

  const userRole = localStorage.getItem("role");

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
          / <span className="font-semibold text-gray-900">Product Details</span>
        </nav>

        <button
          onClick={handleBack}
          className="mb-6 text-sm text-blue-600 hover:underline"
        >
          &larr; Back
        </button>

        {/* VIEW MODE */}
        {!editing ? (
          <div className="flex flex-col md:flex-row bg-white rounded-lg shadow-lg overflow-hidden">
            {/* Left Section: Image Gallery */}
            <div className="md:w-1/2 p-4 flex flex-col items-center bg-gray-50">
              {/* Main Image */}
              {product.images && product.images.length > 0 ? (
                <img
                  src={product.images[0]}
                  alt={product.name}
                  className="object-contain max-h-96 w-auto mb-4"
                />
              ) : (
                <div className="h-96 w-full bg-gray-200 flex items-center justify-center text-gray-500">
                  No Image
                </div>
              )}
              {/* Thumbnails */}
              {product.images && product.images.length > 1 && (
                <div className="flex gap-2">
                  {product.images.slice(1).map((thumbUrl, idx) => (
                    <img
                      key={idx}
                      src={thumbUrl}
                      alt="Thumbnail"
                      className="h-20 w-20 object-cover border border-gray-300"
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Right Section: Details */}
            <div className="md:w-1/2 p-6 space-y-4">
              <h1 className="text-2xl font-bold text-gray-800">
                {product.name}
              </h1>
              <div className="text-xl font-semibold text-purple-700">
                ₹ {product.productCost}
                {product.productCost_Unit ? ` / ${product.productCost_Unit}` : ""}
              </div>

              {/* Key Fields */}
              <div className="space-y-1 text-gray-700">
                <p className="text-sm">
                  <span className="font-semibold">Product Tag:</span>{" "}
                  {product.productTag}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Product ID:</span>{" "}
                  {product.productId}
                </p>
                {product.variantId && (
                  <p className="text-sm">
                    <span className="font-semibold">Variant ID:</span>{" "}
                    {product.variantId}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Category:</span>{" "}
                  {product.category}
                  {product.subCategory && ` / ${product.subCategory}`}
                </p>
                {product.variationHinge && (
                  <p className="text-sm">
                    <span className="font-semibold">Variation Hinge:</span>{" "}
                    {product.variationHinge}
                  </p>
                )}
                {product.brandName && (
                  <p className="text-sm">
                    <span className="font-semibold">Brand:</span>{" "}
                    {product.brandName}
                  </p>
                )}
                <p className="text-sm">
                  <span className="font-semibold">Quantity:</span> {product.qty}
                </p>
                <p className="text-sm">
                  <span className="font-semibold">Delivery Time:</span>{" "}
                  {product.deliveryTime}
                </p>
                {product.size && (
                  <p className="text-sm">
                    <span className="font-semibold">Size:</span> {product.size}
                  </p>
                )}
                {product.color && (
                  <p className="text-sm">
                    <span className="font-semibold">Color:</span>{" "}
                    {product.color}
                  </p>
                )}
                {product.material && (
                  <p className="text-sm">
                    <span className="font-semibold">Material:</span>{" "}
                    {product.material}
                  </p>
                )}
                {product.priceRange && (
                  <p className="text-sm">
                    <span className="font-semibold">Price Range:</span>{" "}
                    {product.priceRange}
                  </p>
                )}
                {product.weight && (
                  <p className="text-sm">
                    <span className="font-semibold">Weight:</span>{" "}
                    {product.weight}
                  </p>
                )}
                {product.hsnCode && (
                  <p className="text-sm">
                    <span className="font-semibold">HSN Code:</span>{" "}
                    {product.hsnCode}
                  </p>
                )}
                {product.productCost !== 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">MRP:</span>{" "}
                    {product.productCost_Currency} {product.MRP}
                    {product.productCost_Unit ? ` / ${product.productCost_Unit}` : ""}
                  </p>
                )}
                {/* Display GST if applicable */}
                {product.productGST > 0 && (
                  <p className="text-sm">
                    <span className="font-semibold">GST (%):</span> {product.productGST}
                  </p>
                )}
              </div>

              {/* Additional Description */}
              {product.productDetails && (
                <div className="text-sm text-gray-600 pt-2">
                  <span className="font-semibold">Details:</span>{" "}
                  {product.productDetails}
                </div>
              )}

              {/* Edit Button (if admin) */}
              {userRole === "ADMIN" && (
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
          // EDIT MODE
          <form
            onSubmit={handleProductUpdate}
            className="bg-white p-6 rounded-lg shadow-lg space-y-6"
          >
            <h2 className="text-2xl font-bold text-purple-700 mb-4">
              Edit Product
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Product Tag */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Tag *
                </label>
                <input
                  type="text"
                  name="productTag"
                  value={formData.productTag}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Product ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product ID *
                </label>
                <input
                  type="text"
                  name="productId"
                  value={formData.productId}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Variant ID */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Variant ID
                </label>
                <input
                  type="text"
                  name="variantId"
                  value={formData.variantId}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Category *
                </label>
                <input
                  type="text"
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Sub Category */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Sub Category
                </label>
                <input
                  type="text"
                  name="subCategory"
                  value={formData.subCategory}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Variation Hinge */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Variation Hinge
                </label>
                <input
                  type="text"
                  name="variationHinge"
                  value={formData.variationHinge}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Name */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Name *
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Brand Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Brand Name
                </label>
                <input
                  type="text"
                  name="brandName"
                  value={formData.brandName}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Quantity
                </label>
                <input
                  type="number"
                  name="qty"
                  value={formData.qty}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* MRP Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MRP Currency
                </label>
                <input
                  type="text"
                  name="MRP_Currency"
                  value={formData.MRP_Currency}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* MRP */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MRP
                </label>
                <input
                  type="number"
                  name="MRP"
                  value={formData.MRP}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* MRP Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  MRP Unit
                </label>
                <input
                  type="text"
                  name="MRP_Unit"
                  value={formData.MRP_Unit}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Delivery Time */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Delivery Time
                </label>
                <input
                  type="text"
                  name="deliveryTime"
                  value={formData.deliveryTime}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Size */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Size
                </label>
                <input
                  type="text"
                  name="size"
                  value={formData.size}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Color */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Color
                </label>
                <input
                  type="text"
                  name="color"
                  value={formData.color}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Material */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Material
                </label>
                <input
                  type="text"
                  name="material"
                  value={formData.material}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Price Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Price Range
                </label>
                <input
                  type="text"
                  name="priceRange"
                  value={formData.priceRange}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Weight */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Weight
                </label>
                <input
                  type="text"
                  name="weight"
                  value={formData.weight}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* HSN Code */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  HSN Code
                </label>
                <input
                  type="text"
                  name="hsnCode"
                  value={formData.hsnCode}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Product Cost Currency */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Cost Currency
                </label>
                <input
                  type="text"
                  name="productCost_Currency"
                  value={formData.productCost_Currency}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Product Cost */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Cost
                </label>
                <input
                  type="number"
                  name="productCost"
                  value={formData.productCost}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
              {/* Product Cost Unit */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Product Cost Unit
                </label>
                <input
                  type="text"
                  name="productCost_Unit"
                  value={formData.productCost_Unit}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Product GST */}
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  GST (%)
                </label>
                <input
                  type="number"
                  name="productGST"
                  value={formData.productGST}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>

              {/* Product Details */}
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700">
                  Product Details
                </label>
                <textarea
                  name="productDetails"
                  rows={3}
                  value={formData.productDetails}
                  onChange={handleChange}
                  className="mt-1 block w-full px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-600"
                />
              </div>
            </div>

            {/* Existing Images (if editing and images are URLs) */}
            {formData.images?.length > 0 &&
              typeof formData.images[0] === "string" && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Existing Images
                  </label>
                  <div className="flex flex-wrap gap-4">
                    {formData.images.map((imgUrl, idx) => (
                      <div key={idx} className="relative">
                        <img
                          src={imgUrl}
                          alt="Existing"
                          className="w-24 h-24 object-cover border border-gray-300 rounded"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveExistingImage(idx)}
                          className="absolute top-1 right-1 bg-red-600 text-white text-xs px-2 py-1 rounded"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            {/* File Upload for New Images */}
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Upload New Images
              </label>
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={handleFileChange}
                className="mt-1 block w-full text-gray-900 bg-gray-50 border border-gray-300 rounded-md"
              />
              {uploadProgress > 0 && (
                <div className="mt-2 w-full bg-gray-200 h-2.5 rounded">
                  <div
                    className="bg-purple-600 h-2.5 rounded"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end space-x-4">
              <button
                type="submit"
                className="bg-green-600 hover:bg-green-700 px-6 py-2 rounded text-white font-medium"
              >
                Save Changes
              </button>
              <button
                onClick={handleEditToggle}
                type="button"
                className="bg-gray-600 hover:bg-gray-700 px-6 py-2 rounded text-white font-medium"
              >
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
