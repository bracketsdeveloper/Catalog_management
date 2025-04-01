// components/manualcatalog/CatalogForm.jsx
import React from "react";

export default function CatalogForm({
  catalogName,
  setCatalogName,
  customerName,
  customerEmail,
  customerAddress,
  selectedMargin,
  setSelectedMargin,
  selectedGst,
  setSelectedGst,
  onSaveCatalog,
  isEditMode,
}) {
  return (
    <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
      <h1 className="text-2xl font-bold text-purple-700">
        {isEditMode ? "Edit Catalog" : "Create Catalog (Manual)"}
      </h1>
      <div className="flex flex-col md:flex-row gap-4">
        {/* Margin and GST selectors can be further broken down if needed */}
        <div>
          <label className="block mb-1 font-medium">Select Margin</label>
          <input
            type="number"
            value={selectedMargin}
            onChange={(e) => setSelectedMargin(parseFloat(e.target.value))}
            className="border p-2 rounded"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium">Select GST</label>
          <input
            type="number"
            value={selectedGst}
            onChange={(e) => setSelectedGst(parseFloat(e.target.value))}
            className="border p-2 rounded"
          />
        </div>
        <button
          onClick={onSaveCatalog}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          {isEditMode ? "Update Catalog" : "Create Catalog"}
        </button>
      </div>
      <div className="grid grid-cols-3 gap-4 w-full mt-4">
        <div>
          <label>Catalog Name *</label>
          <input
            type="text"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label>Customer Name *</label>
          <input
            type="text"
            value={customerName}
            readOnly
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label>Customer Email</label>
          <input
            type="email"
            value={customerEmail}
            readOnly
            className="border p-2 rounded w-full"
          />
        </div>
        <div>
          <label>Customer Address</label>
          <input
            type="text"
            value={customerAddress}
            readOnly
            className="border p-2 rounded w-full"
          />
        </div>
      </div>
    </div>
  );
}
