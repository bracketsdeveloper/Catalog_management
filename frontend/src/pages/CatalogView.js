"use client"; // Remove if using plain Create React App

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; 
import axios from "axios";

// Fields we never want to display
const NEVER_DISPLAY_FIELDS = ["color", "weight"];

// Mandatory fields always shown on the right
const COMMON_FIELDS = ["name", "price", "category", "productDetails"];

// Mapping from field to product doc property
const fieldMapping = {
  name: "name",
  price: "productCost", // We'll calculate price with margin
  category: "category",
  productDetails: "productDetails",
  brandName: "brandName",
  subCategory: "subCategory",
  size: "size",
  // no "color" or "weight"
};

export default function CatalogView() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const { id } = useParams();

  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchCatalog();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const fetchCatalog = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`);
      setCatalog(res.data);
      setError(null);
    } catch (err) {
      console.error("Error fetching catalog:", err);
      setError("Failed to load catalog");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-purple-50 via-blue-50 to-pink-50">
        <p className="text-gray-500 text-lg">Loading catalog...</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-purple-50 via-blue-50 to-pink-50">
        <p className="text-red-500 text-lg">{error}</p>
      </div>
    );
  }
  if (!catalog) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-tr from-purple-50 via-blue-50 to-pink-50">
        <p className="text-gray-500 text-lg">Catalog not found.</p>
      </div>
    );
  }

  const { fieldsToDisplay = [], products = [] } = catalog;
  // Filter out any fields we never display
  const safeFieldsToDisplay = fieldsToDisplay.filter(
    (f) => !NEVER_DISPLAY_FIELDS.includes(f)
  );

  function renderProduct(productDoc) {
    // Calculate margin-based price if productCost exists
    let effectivePrice = null;
    if (typeof productDoc.productCost === "number") {
      const marginVal = typeof catalog.margin === "number" ? catalog.margin : 0;
      effectivePrice = (productDoc.productCost * (1 + marginVal / 100)).toFixed(2);
    }

    return (
      <div className="flex gap-4 items-start bg-white shadow-lg rounded p-4">
        {/* LEFT: image (if "images" in fields) */}
        <div className="w-1/3">
          {safeFieldsToDisplay.includes("images") && productDoc.images && productDoc.images[0] ? (
            <img
              src={productDoc.images[0]}
              alt={productDoc.name}
              className="w-full h-40 object-cover rounded"
            />
          ) : (
            <div className="w-full h-40 bg-gray-100 flex items-center justify-center rounded">
              <span className="text-gray-400 text-sm">No Image</span>
            </div>
          )}
        </div>

        {/* RIGHT: Show mandatory fields first, then optional fields */}
        <div className="flex-1">
          {/* 1) Name */}
          <h2 className="text-xl font-semibold mb-1 text-purple-700">
            {productDoc.name || "Unnamed Product"}
          </h2>

          {/* 2) Price => productCost + margin */}
          <p className="text-md text-gray-800 font-bold mb-1">
            ₹{effectivePrice !== null ? effectivePrice : "N/A"}
          </p>

          {/* 3) Category + subCategory if allowed */}
          <p className="text-sm text-gray-600 mb-1">
            Category: {productDoc.category || ""}
            {productDoc.subCategory &&
              safeFieldsToDisplay.includes("subCategory") &&
              ` / ${productDoc.subCategory}`}
          </p>

          {/* 4) productDetails */}
          {productDoc.productDetails && (
            <p className="text-sm text-gray-600 mt-2">
              <span className="font-semibold">Description:</span>{" "}
              {productDoc.productDetails}
            </p>
          )}

          {/* Additional fields: brandName, size, etc. 
              Skip anything in COMMON_FIELDS or not in fieldMapping or missing value. */}
          {safeFieldsToDisplay.map((field) => {
            if (COMMON_FIELDS.includes(field)) return null;
            const mappedKey = fieldMapping[field];
            if (!mappedKey) return null;
            const val = productDoc[mappedKey];
            if (!val) return null;

            // e.g. brandName => "Brand: Nike"
            let label = field;
            if (field === "brandName") label = "Brand";
            else if (field === "subCategory") label = "Sub-Category";
            else {
              // capitalized field
              label = field.charAt(0).toUpperCase() + field.slice(1);
            }

            return (
              <p key={field} className="text-sm text-gray-600 mt-1">
                <span className="font-semibold">{label}:</span> {val}
              </p>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-purple-50 via-blue-50 to-pink-50 text-gray-800 p-6">
      {/* Catalog Info */}
      <div className="max-w-4xl mx-auto mb-8">
        <div className="bg-white p-6 rounded shadow-lg">
          <h1 className="text-3xl font-bold text-purple-700 mb-2">
            {catalog.catalogName}
          </h1>
          <p className="text-sm text-gray-600 mb-2">
            <span className="font-semibold">For:</span> {catalog.customerName}
            {catalog.customerEmail ? ` (${catalog.customerEmail})` : ""}
          </p>
          {/* If you want more catalog details, add them here */}
        </div>
      </div>

      {/* Product List */}
      <div className="max-w-4xl mx-auto grid grid-cols-1 gap-6">
        {products.length > 0 ? (
          products.map((subDoc, i) => {
            const productDoc = subDoc.productId;
            if (!productDoc) {
              return (
                <div
                  key={i}
                  className="bg-white p-4 rounded shadow-lg text-gray-600"
                >
                  No product data
                </div>
              );
            }
            return <div key={i}>{renderProduct(productDoc)}</div>;
          })
        ) : (
          <p className="text-gray-600">No products in this catalog.</p>
        )}
      </div>
    </div>
  );
}
