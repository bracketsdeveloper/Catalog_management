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
  const [productIds, setProductIds] = useState([]); // Store list of product IDs

  useEffect(() => {
    const fetchProductDetails = async () => {
      setLoading(true);
      try {
        const token = localStorage.getItem("token");
        // Fetch product details
        const productRes = await axios.get(`${BACKEND_URL}/api/viewer/products/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProduct(productRes.data.product);
        setVisibleAttributes(productRes.data.visibleAttributes || []);

        // Fetch list of product IDs (adjust endpoint as needed)
        const idsRes = await axios.get(`${BACKEND_URL}/api/viewer/products/ids`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setProductIds(idsRes.data.productIds || []); // Expecting { productIds: ["id1", "id2", ...] }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchProductDetails();
  }, [id, BACKEND_URL]);

  // Find current product index and determine prev/next IDs
  const currentIndex = productIds.indexOf(id);
  const prevProductId = currentIndex > 0 ? productIds[currentIndex - 1] : null;
  const nextProductId = currentIndex < productIds.length - 1 ? productIds[currentIndex + 1] : null;

  // Navigate to previous or next product
  const handlePrevProduct = () => {
    if (prevProductId) {
      navigate(`/viewer/products/${prevProductId}`);
    }
  };

  const handleNextProduct = () => {
    if (nextProductId) {
      navigate(`/viewer/products/${nextProductId}`);
    }
  };

  if (loading) {
    return <Loader />;
  }
  if (!product) {
    return <div className="p-4">Product not found</div>;
  }

  // Mapping attribute keys to friendly labels
  const attributeLabels = {
    productTag: "Product Tag",
    productId: "Product ID",
    variantId: "Variant ID",
    category: "Category",
    subCategory: "Sub Category",
    variationHinge: "Variation Hinge",
    name: "Name",
    brandName: "Brand Name",
    qty: "Quantity",
    MRP_Currency: "MRP Currency",
    MRP: "MRP",
    MRP_Unit: "MRP Unit",
    deliveryTime: "Delivery Time",
    size: "Size",
    color: "Color",
    material: "Material",
    priceRange: "Price Range",
    weight: "Weight",
    hsnCode: "HSN Code",
    productCost_Currency: "Cost Currency",
    productCost: "Cost",
    productCost_Unit: "Cost Unit",
    productDetails: "Details",
  };

  // Render only the attributes that are included in visibleAttributes
  const renderAttributes = () => {
    return visibleAttributes.map((attr) => {
      const label = attributeLabels[attr] || attr;
      const value = product[attr];
      if (value === undefined || value === null || value === "") return null;
      return (
        <p key={attr} className="mb-2 text-sm">
          <span className="font-semibold text-purple-700">{label}:</span>{" "}
          <span className="text-gray-800">{value}</span>
        </p>
      );
    });
  };

  return (
    <div className="relative p-6 md:p-8 bg-white text-gray-900 min-h-screen">
      {/* Navigation Buttons */}
      <div className="absolute top-4 left-4 flex items-center gap-4">
        <button
          onClick={() => navigate(-1)}
          className="bg-blue-600 px-3 py-2 rounded hover:bg-blue-700 text-white"
        >
          Back
        </button>
        <button
          onClick={handlePrevProduct}
          disabled={!prevProductId}
          className={`px-3 py-2 rounded text-white ${prevProductId ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"}`}
        >
          ← Prev
        </button>
        <button
          onClick={handleNextProduct}
          disabled={!nextProductId}
          className={`px-3 py-2 rounded text-white ${nextProductId ? "bg-purple-600 hover:bg-purple-700" : "bg-gray-400 cursor-not-allowed"}`}
        >
          Next →
        </button>
      </div>
      <div className="flex flex-col md:flex-row gap-8 mt-12">
        {/* Left: Product Image */}
        <div className="md:w-2/5">
          {product.images && product.images.length > 0 ? (
            <img
              src={product.images[0]}
              alt={product.name}
              className="w-full h-auto rounded shadow"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center rounded shadow">
              <span className="text-gray-600">No Image Available</span>
            </div>
          )}
        </div>
        {/* Right: Product Attributes */}
        <div className="md:w-2/5">
          <h1 className="text-3xl font-bold mb-4 text-pink-600">{product.name}</h1>
          {renderAttributes()}
        </div>
      </div>
    </div>
  );
}