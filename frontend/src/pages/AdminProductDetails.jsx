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

  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  // editing state to toggle form mode
  const [editing, setEditing] = useState(false);
  // local state for product form (extracted from ProductUpload model)
  const [formData, setFormData] = useState({
    productTag: "",
    productId: "",
    variantId: "",
    category: "",
    subCategory: "",
    variationHinge: "",
    name: "",
    brandName: "",
    stockInHand: 0,
    stockCurrentlyWith: "",
    images: [],
    price: 0,
    productDetails: ""
  });
  const [uploadProgress, setUploadProgress] = useState(0);

  const fetchProduct = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/${prodId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // If API returns { product: {...} } then use that; otherwise, use res.data directly.
      const prod = res.data.product ? res.data.product : res.data;
      setProduct(prod);
      // Pre-populate form data with the fetched product details
      setFormData({
        productTag: prod.productTag || "",
        productId: prod.productId || "",
        variantId: prod.variantId || "",
        category: prod.category || "",
        subCategory: prod.subCategory || "",
        variationHinge: prod.variationHinge || "",
        name: prod.name || "",
        brandName: prod.brandName || "",
        stockInHand: prod.stockInHand || 0,
        stockCurrentlyWith: prod.stockCurrentlyWith || "",
        images: prod.images || [],
        price: prod.price || 0,
        productDetails: prod.productDetails || ""
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
  }, [prodId]);

  const handleBack = () => {
    navigate(-1);
  };

  const handleEditToggle = () => {
    setEditing(!editing);
  };

  // Handle changes for text inputs
  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Handle file input change (for new images)
  const handleFileChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      images: [...e.target.files] // files will be uploaded later
    }));
  };

  // Remove an existing image from the form state
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
      // If the first item in images is a File object then upload all file objects.
      if (
        formData.images.length &&
        formData.images[0] instanceof File
      ) {
        for (let i = 0; i < formData.images.length; i++) {
          const res = await uploadImage(formData.images[i]);
          finalImages.push(res.url);
          setUploadProgress(Math.round(((i + 1) / formData.images.length) * 100));
        }
      } else {
        // If images are already URLs, use them directly.
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
        stockInHand: formData.stockInHand,
        stockCurrentlyWith: formData.stockCurrentlyWith,
        images: finalImages,
        price: formData.price,
        productDetails: formData.productDetails
      };
      await axios.put(`${BACKEND_URL}/api/admin/products/${prodId}`, payload, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEditing(false);
      fetchProduct(); // Refresh product details after update
    } catch (error) {
      console.error("Error updating product:", error);
      setError("Failed to update product");
    } finally {
      setUploadProgress(0);
    }
  };

  const userRole = localStorage.getItem("role");

  if (loading) return <Loader />;
  if (error) return <div className="p-4 text-red-600">{error}</div>;
  if (!product) return <div className="p-4">Product not found</div>;

  return (
    <div className="p-4 md:p-6 bg-white text-gray-900 min-h-screen">
      {/* Breadcrumb path */}
      <nav className="mb-4 text-sm">
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
        / <span className="font-semibold">Product Details</span>
      </nav>

      <button onClick={handleBack} className="mb-4 text-sm text-blue-600 hover:underline">
        &larr; Back
      </button>

      {!editing ? (
        <div className="flex flex-col md:flex-row justify-center bg-white border border-purple-200 rounded-lg shadow-lg p-6">
          {/* Left: Product Image */}
          <div className="md:w-1/2 flex justify-center items-center">
            {product.images && product.images.length > 0 ? (
              <img
                src={product.images[0]}
                alt={product.name}
                className="w-full h-auto object-contain rounded-lg"
              />
            ) : (
              <div className="w-full h-64 bg-gray-100 flex items-center justify-center rounded-lg">
                <span className="text-gray-500">No image available</span>
              </div>
            )}
          </div>
          {/* Right: Product Details */}
          <div className="md:w-1/2 md:ml-8 mt-6 md:mt-0">
            <h1 className="text-3xl font-bold mb-4 text-purple-700">{product.name}</h1>
            <div className="space-y-2 text-gray-700">
              <p>
                <span className="font-semibold">Product Tag:</span> {product.productTag}
              </p>
              <p>
                <span className="font-semibold">Product ID:</span> {product.productId}
              </p>
              <p>
                <span className="font-semibold">Variant ID:</span> {product.variantId}
              </p>
              <p>
                <span className="font-semibold">Category:</span> {product.category}
              </p>
              {product.subCategory && (
                <p>
                  <span className="font-semibold">Sub Category:</span> {product.subCategory}
                </p>
              )}
              {product.variationHinge && (
                <p>
                  <span className="font-semibold">Variation Hinge:</span> {product.variationHinge}
                </p>
              )}
              <p>
                <span className="font-semibold">Brand Name:</span> {product.brandName}
              </p>
              <p>
                <span className="font-semibold">Stock In Hand:</span> {product.stockInHand}
              </p>
              <p>
                <span className="font-semibold">Stock Currently With:</span> {product.stockCurrentlyWith}
              </p>
              <p>
                <span className="font-semibold">Price:</span> ₹{product.price}
              </p>
              {product.productDetails && (
                <p>
                  <span className="font-semibold">Details:</span> {product.productDetails}
                </p>
              )}
            </div>
            {userRole === "ADMIN" && (
              <button
                onClick={handleEditToggle}
                className="mt-6 bg-blue-600 hover:bg-blue-700 px-5 py-2 rounded text-white font-medium"
              >
                Edit Product
              </button>
            )}
          </div>
        </div>
      ) : (
        // Edit form
        <form onSubmit={handleProductUpdate} className="space-y-6 bg-white border border-purple-200 rounded-lg shadow-lg p-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Product Tag <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="productTag"
                value={formData.productTag}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Product ID <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="productId"
                value={formData.productId}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Variant ID</label>
              <input
                type="text"
                name="variantId"
                value={formData.variantId}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Category <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Sub Category</label>
              <input
                type="text"
                name="subCategory"
                value={formData.subCategory}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Variation Hinge</label>
              <input
                type="text"
                name="variationHinge"
                value={formData.variationHinge}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Name <span className="text-red-500">*</span></label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Brand Name</label>
              <input
                type="text"
                name="brandName"
                value={formData.brandName}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock In Hand <span className="text-red-500">*</span></label>
              <input
                type="number"
                name="stockInHand"
                value={formData.stockInHand}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Stock Currently With</label>
              <input
                type="text"
                name="stockCurrentlyWith"
                value={formData.stockCurrentlyWith}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Price</label>
              <input
                type="number"
                name="price"
                value={formData.price}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700">Product Details</label>
              <textarea
                name="productDetails"
                rows={3}
                value={formData.productDetails}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-purple-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-600"
              />
            </div>
          </div>
          {/* Existing Images */}
          {formData.images && formData.images.length > 0 && typeof formData.images[0] === "string" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Existing Images</label>
              <div className="flex flex-wrap gap-2">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative">
                    <img
                      src={imgUrl}
                      alt="existing"
                      className="w-24 h-24 object-cover border border-purple-200 rounded"
                    />
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, images: prev.images.filter((_, i) => i !== idx) }))}
                      className="absolute top-0 right-0 bg-red-600 text-white text-xs p-1 rounded"
                    >
                      X
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* File Upload for New Images */}
          <div>
            <label className="block text-sm font-medium text-gray-700">Upload Images</label>
            <input
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileChange}
              className="mt-1 block w-full text-gray-900 bg-gray-50 border border-purple-300 rounded-md"
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
          <div className="flex justify-end space-x-4">
            <button type="submit" className="bg-green-600 hover:bg-green-700 px-4 py-2 rounded text-white font-medium">
              Save Changes
            </button>
            <button onClick={handleEditToggle} className="bg-red-600 hover:bg-red-700 px-4 py-2 rounded text-white font-medium">
              Cancel
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
