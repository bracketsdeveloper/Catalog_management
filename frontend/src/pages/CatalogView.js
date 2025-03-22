"use client"; // Remove if using plain Create React App instead of Next.js

import React, { useState, useEffect } from "react";
import { useParams } from "react-router-dom"; // or next/router if using Next.js
import axios from "axios";
import PptxGenJS from "pptxgenjs";

export default function CatalogView() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const { id } = useParams(); // read the catalog ID from the URL

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

  // PPT Export function: effective price = p.price * (1 + margin/100)
  async function handleExportPPT(catalog) {
    try {
      const pptx = new PptxGenJS();
      pptx.title = `Catalog - ${catalog.catalogName}`;

      // Slide 1: Template slide 1
      const slide1 = pptx.addSlide();
      slide1.background = { path: "/templateSlide1.jpg" };

      // Slide 2: Template slide 2
      const slide2 = pptx.addSlide();
      slide2.background = { path: "/templateSlide2.jpg" };

      // Slide 3: Template slide 3 with "Gift Options" text in the center
      const slide3 = pptx.addSlide();
      slide3.background = { path: "/templateSlide3.jpg" };
      slide3.addText("Gift Options", {
        x: 1.5,
        y: 3.0,
        w: 7.0,
        fontSize: 48,
        bold: true,
        color: "ffffff",
        align: "center",
      });

      // Product slides: from slide 4 onward
      catalog.products?.forEach((prodObj, index) => {
        const p = prodObj.productId || prodObj;
        const slide = pptx.addSlide();
        // Use the same background to match the theme
        slide.background = { path: "/templateSlide3.jpg" };

        // Use product image URL directly (ensure it's fully qualified)
        const productImageUrl = (p.images && p.images[0]) ? p.images[0] : "";
        if (productImageUrl) {
          slide.addImage({
            x: 0.5,
            y: 1.5,
            w: 3.0,
            h: 3.0,
            url: productImageUrl,
          });
        } else {
          // Placeholder if no image is available
          slide.addShape(pptx.ShapeType.rect, {
            x: 0.5,
            y: 1.5,
            w: 3.0,
            h: 3.0,
            line: { color: "CCCCCC", width: 1 },
            fill: { color: "EFEFEF" },
          });
          slide.addText("No Image", {
            x: 0.5,
            y: 2.9,
            w: 3.0,
            align: "center",
            fontSize: 12,
            color: "888888",
          });
        }

        // Right side: product details (starting at x = 4.5)
        const textX = 4.5;
        const topY = 1.0;
        slide.addText(`Product #${index + 1}`, {
          x: textX,
          y: topY,
          fontSize: 24,
          bold: true,
          color: "363636",
        });
        slide.addText(`Name: ${p.name || ""}`, {
          x: textX,
          y: topY + 1.0,
          fontSize: 14,
          color: "363636",
        });
        slide.addText(`Brand: ${p.brandName || ""}`, {
          x: textX,
          y: topY + 1.5,
          fontSize: 14,
          color: "363636",
        });
        slide.addText(`Category: ${p.category || ""} / ${p.subCategory || ""}`, {
          x: textX,
          y: topY + 2.0,
          fontSize: 14,
          color: "363636",
        });
        // Calculate effective price: multiply by (1 + margin/100)
        const effectivePrice = p.price !== undefined ? p.price * (1 + (catalog.margin || 0) / 100) : null;
        slide.addText(`Price: ₹${effectivePrice !== null ? effectivePrice.toFixed(2) : "N/A"}`, {
          x: textX,
          y: topY + 2.5,
          fontSize: 14,
          color: "363636",
        });
        slide.addText(`Details: ${p.productDetails || ""}`, {
          x: textX,
          y: topY + 3.0,
          fontSize: 14,
          color: "363636",
          w: 4.0,
          h: 2.0,
          valign: "top",
          wrap: true,
        });
      });

      // Final slide: Template slide Last
      const lastSlide = pptx.addSlide();
      lastSlide.background = { path: "/templateSlideLast.jpg" };

      await pptx.writeFile({ fileName: `Catalog-${catalog.catalogName}.pptx` });
    } catch (error) {
      console.error("PPT export error:", error);
      alert("PPT export failed");
    }
  }

  if (loading) {
    return <div className="p-6 text-gray-200">Loading catalog...</div>;
  }

  if (error) {
    return <div className="p-6 text-red-400">{error}</div>;
  }

  if (!catalog) {
    return <div className="p-6 text-gray-200">Catalog not found.</div>;
  }

  // Extract fields to display and products from catalog
  const { fieldsToDisplay, products } = catalog;

  return (
    <div className="min-h-screen bg-gray-100 text-gray-800 p-6">
      {/* Catalog header */}
      <div className="max-w-4xl mx-auto bg-white p-6 rounded shadow">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">{catalog.catalogName}</h1>
            <p className="text-sm text-gray-600 mb-4">
              Created for: {catalog.customerName}
              {catalog.customerEmail ? ` (${catalog.customerEmail})` : ""}
            </p>
          </div>
          {/* <button
            onClick={() => handleExportPPT(catalog)}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
          >
            Export PPT
          </button> */}
        </div>

        {/* Product List */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mt-4">
          {products && products.length > 0 ? (
            products.map((item, idx) => {
              const product = item.productId; // populated from .populate("products.productId")
              if (!product) return null;

              // Calculate effective price
              const effectivePrice =
                product.price !== undefined
                  ? (product.price * (1 + (catalog.margin || 0) / 100)).toFixed(2)
                  : "N/A";

              return (
                <div key={idx} className="bg-white border rounded shadow-sm p-4">
                  {fieldsToDisplay.includes("images") && product.images?.length > 0 && (
                    <div className="mb-3">
                      <img
                        src={product.images[0]}
                        alt={product.name}
                        className="w-full h-40 object-cover rounded"
                      />
                    </div>
                  )}
                  {fieldsToDisplay.includes("name") && (
                    <h2 className="text-lg font-semibold mb-1">{product.name}</h2>
                  )}
                  {fieldsToDisplay.includes("brandName") && product.brandName && (
                    <p className="text-sm text-gray-600 mb-1">
                      Brand: {product.brandName}
                    </p>
                  )}
                  {fieldsToDisplay.includes("category") && (
                    <p className="text-sm text-gray-600 mb-1">
                      Category: {product.category}
                      {product.subCategory && fieldsToDisplay.includes("subCategory")
                        ? ` / ${product.subCategory}`
                        : ""}
                    </p>
                  )}
                  {fieldsToDisplay.includes("price") && product.price !== undefined && (
                    <p className="text-sm mb-1 font-bold">
                      ₹{effectivePrice}
                    </p>
                  )}
                  {fieldsToDisplay.includes("productDetails") && product.productDetails && (
                    <p className="text-sm text-gray-600 mt-2">
                      {product.productDetails}
                    </p>
                  )}
                </div>
              );
            })
          ) : (
            <div className="col-span-full text-gray-500">
              No products in this catalog
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
