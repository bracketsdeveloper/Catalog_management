// ../components/opportunities/ProductTab.jsx
import React from "react";

export default function ProductTab({ products, setProducts }) {
  const handleAddProduct = () => {
    setProducts((prev) => [
      ...prev,
      {
        productCode: "Auto-generated",
        productName: "",
        listPrice: "",
      },
    ]);
  };

  const handleRemoveProduct = (index) => {
    setProducts((prev) => prev.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    setProducts((prev) =>
      prev.map((prod, i) =>
        i === index ? { ...prod, [field]: value } : prod
      )
    );
  };

  return (
    <div className="p-4">
      <div className="grid grid-cols-4 gap-4 mb-2 text-blue-900 text-sm font-semibold">
        <div>Product Code</div>
        <div>Product</div>
        <div>List Price</div>
        <div>Delete</div>
      </div>

      {products.map((prod, index) => (
        <div
          key={index}
          className="grid grid-cols-4 gap-4 items-center bg-gray-50 p-2 mb-2 rounded"
        >
          {/* Product Code (read-only) */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm bg-gray-100"
            value={prod.productCode}
            readOnly
          />

          {/* Product Name */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Enter product"
            value={prod.productName}
            onChange={(e) => handleChange(index, "productName", e.target.value)}
          />

          {/* List Price */}
          <input
            type="text"
            className="border rounded px-2 py-1 text-sm"
            placeholder="Enter price"
            value={prod.listPrice}
            onChange={(e) => handleChange(index, "listPrice", e.target.value)}
          />

          {/* Delete Button */}
          <button
            onClick={() => handleRemoveProduct(index)}
            className="text-red-600 hover:text-red-800 text-xl"
            title="Remove product"
          >
            &#10060;
          </button>
        </div>
      ))}

      {products.length === 0 && (
        <div className="italic text-sm text-gray-500 mb-2">
          No products added.
        </div>
      )}

      <div>
        <button
          onClick={handleAddProduct}
          className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm"
        >
          + Add Product
        </button>
      </div>
    </div>
  );
}
