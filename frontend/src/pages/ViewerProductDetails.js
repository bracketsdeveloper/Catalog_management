import React, { useState, useEffect } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import Loader from "../components/Loader";

export default function ViewerProductDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [product, setProduct] = useState(null);
  const [visibleAttributes, setVisibleAttributes] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/viewer/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProduct(res.data.product);
        setVisibleAttributes(res.data.visibleAttributes || []);
      } catch (error) {
        console.error("Error fetching product details:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [id, BACKEND_URL]);

  if (loading) {
    return <Loader />;
  }

  if (!product) {
    return <div className="p-4">Product not found</div>;
  }

  return (
    <div className="relative p-4 md:p-8 bg-gray-900 text-gray-200 min-h-screen">
      <button
        onClick={() => navigate(-1)}
        className="absolute top-4 left-4 bg-gray-700 px-3 py-2 rounded hover:bg-gray-600"
      >
        Back
      </button>
      <div className="flex flex-col md:flex-row gap-8 mt-12">
        {/* Left 40%: Image */}
        <div className="md:w-2/5">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-auto rounded"
            />
          ) : (
            <div className="w-full h-64 bg-gray-700 flex items-center justify-center rounded">
              <span>No Image Available</span>
            </div>
          )}
        </div>
        {/* Right 40%: Visible Attributes */}
        <div className="md:w-2/5">
          <h1 className="text-3xl font-bold mb-4">{product.name}</h1>
          {visibleAttributes.includes("category") && product.category && (
            <p className="mb-2">
              <strong>Category:</strong> {product.category}
            </p>
          )}
          {visibleAttributes.includes("subCategory") && product.subCategory && (
            <p className="mb-2">
              <strong>Sub Category:</strong> {product.subCategory}
            </p>
          )}
          {visibleAttributes.includes("brandName") && product.brandName && (
            <p className="mb-2">
              <strong>Brand:</strong> {product.brandName}
            </p>
          )}
          {visibleAttributes.includes("price") && (
            <p className="mb-2">
              <strong>Price:</strong> ₹{product.price}
            </p>
          )}
          {visibleAttributes.includes("stockInHand") && (
            <p className="mb-2">
              <strong>Stock In Hand:</strong> {product.stockInHand}
            </p>
          )}
          {visibleAttributes.includes("stockCurrentlyWith") && product.stockCurrentlyWith && (
            <p className="mb-2">
              <strong>Stock Currently With:</strong> {product.stockCurrentlyWith}
            </p>
          )}
          {visibleAttributes.includes("productDetails") && product.productDetails && (
            <p className="mb-2">
              <strong>Details:</strong> {product.productDetails}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
