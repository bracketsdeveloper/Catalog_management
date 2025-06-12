"use client";
import React, { useState, useEffect, forwardRef } from "react";
import axios from "axios";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

export default function AddSampleModal({ initialData, onClose, onSave }) {
  const isEdit = Boolean(initialData);
  const [form, setForm] = useState({
    sampleInDate:      new Date(),
    productId:         "",
    productName:       "",
    category:          "",
    subCategory:       "",
    brandName:         "",
    specs:             "",
    color:             "",
    fromVendorClient:  "",
    sampleRate:        "",
    qty:               "",
    returnable:        "",
    returnableDays:    "",
    productPicture:    "",
    opportunityNumber: "", // Added
    remarks:           "", // Added
  });
  const [suggestions, setSuggestions] = useState([]);
  const [opportunitySuggestions, setOpportunitySuggestions] = useState([]); // Added
  const [allFilters, setAllFilters] = useState({
    categories: [], subCategories: [], brands: []
  });
  const [colorOptions, setColorOptions] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  // Prefill form when editing
  useEffect(() => {
    if (initialData) {
      setForm({
        sampleInDate:     new Date(initialData.sampleInDate),
        productId:        initialData.productId,
        productName:      initialData.productName,
        category:         initialData.category,
        subCategory:      initialData.subCategory,
        brandName:        initialData.brandName,
        specs:            initialData.specs,
        color:            initialData.color,
        fromVendorClient: initialData.fromVendorClient,
        sampleRate:       initialData.sampleRate,
        qty:              initialData.qty,
        returnable:       initialData.returnable,
        returnableDays:   initialData.returnableDays || "",
        productPicture:   initialData.productPicture || "",
        opportunityNumber: initialData.opportunityNumber || "", // Added
        remarks:          initialData.remarks || "", // Added
      });
      setColorOptions(
        (initialData.color || "")
          .split(",")
          .map(c => c.trim())
          .filter(c => c)
      );
    }
  }, [initialData]);

  // Fetch product filter lists
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
      headers: { Authorization: `Bearer ${token}` }
    })
    .then(res => setAllFilters(res.data))
    .catch(console.error);
  }, []);

  // Fetch product suggestions
  useEffect(() => {
    const q = form.productId || form.productName;
    if (q.trim()) {
      axios.get(
        `${BACKEND_URL}/api/admin/products?search=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => {
        const data = res.data.products ?? res.data;
        setSuggestions(data);
      })
      .catch(console.error);
    } else {
      setSuggestions([]);
    }
  }, [form.productId, form.productName]);

  // Fetch opportunity suggestions
  useEffect(() => {
    const q = form.opportunityNumber;
    if (q.trim()) {
      axios.get(
        `${BACKEND_URL}/api/admin/samples/opportunity-suggestions?search=${encodeURIComponent(q)}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then(res => setOpportunitySuggestions(res.data))
      .catch(console.error);
    } else {
      setOpportunitySuggestions([]);
    }
  }, [form.opportunityNumber]);

  // When product suggestion is clicked
  const handleSelectProduct = p => {
    setForm(f => ({
      ...f,
      productId:        p.productId,
      productName:      p.name,
      category:         p.category,
      subCategory:      p.subCategory,
      brandName:        p.brandName,
      specs:            p.productDetails,
      color:            "",
      productPicture:   Array.isArray(p.images) ? p.images[0] : "",
    }));
    setColorOptions(
      (p.color || "")
        .split(",")
        .map(c => c.trim())
        .filter(c => c)
    );
    setSuggestions([]);
  };

  // When opportunity suggestion is clicked
  const handleSelectOpportunity = opp => {
    setForm(f => ({
      ...f,
      opportunityNumber: opp.opportunityCode,
    }));
    setOpportunitySuggestions([]);
  };

  const handleChange = (key, val) =>
    setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/samples/${initialData._id}`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/samples`,
          form,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSave();
    } catch (err) {
      console.error("Error saving sample:", err);
    }
  };

  const DateInput = forwardRef(({ value, onClick }, ref) => (
    <input
      className="border rounded p-2 w-full cursor-pointer"
      onClick={onClick}
      ref={ref}
      value={value}
      readOnly
    />
  ));

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-2xl">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Edit Sample" : "Add Sample"}
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sample In Date */}
          <div>
            <label className="block mb-1">Sample In Date</label>
            <DatePicker
              selected={form.sampleInDate}
              onChange={date => handleChange("sampleInDate", date)}
              dateFormat="dd/MM/yyyy"
              customInput={<DateInput />}
            />
          </div>

          {/* Opportunity Number */}
          <div>
            <label className="block mb-1">Opportunity #</label>
            <input
              type="text"
              className="border rounded p-2 w-full"
              value={form.opportunityNumber}
              onChange={e => handleChange("opportunityNumber", e.target.value)}
            />
            {opportunitySuggestions.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {opportunitySuggestions.map(opp => (
                  <li
                    key={opp._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectOpportunity(opp)}
                  >
                    {opp.opportunityCode} — {opp.opportunityName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Product ID / Name */}
          <div>
            <label className="block mb-1">Product ID or Name</label>
            <input
              type="text"
              className="border rounded p-2 w-full"
              value={form.productId || form.productName}
              onChange={e =>
                handleChange(
                  form.productId ? "productId" : "productName",
                  e.target.value
                )
              }
            />
            {suggestions.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {suggestions.map(p => (
                  <li
                    key={p._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleSelectProduct(p)}
                  >
                    {p.productId} — {p.name}
                  </li>
                ))}
              </ul>
            )}
          </div>
          {/* Product Picture Preview */}
          <div className="flex items-center justify-center">
            {form.productPicture ? (
              <img
                src={form.productPicture}
                alt="Product"
                className="h-24 w-24 object-contain border"
              />
            ) : (
              <div className="h-24 w-24 flex items-center justify-center border text-gray-400">
                No Image
              </div>
            )}
          </div>
          {/* Category */}
          <div>
            <label className="block mb-1">Category</label>
            <input
              list="cats"
              className="border rounded p-2 w-full"
              value={form.category}
              onChange={e => handleChange("category", e.target.value)}
            />
            <datalist id="cats">
              {allFilters.categories.map(c => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>
          {/* Sub Category */}
          <div>
            <label className="block mb-1">Sub Category</label>
            <input
              list="subs"
              className="border rounded p-2 w-full"
              value={form.subCategory}
              onChange={e => handleChange("subCategory", e.target.value)}
            />
            <datalist id="subs">
              {allFilters.subCategories.map(c => (
                <option key={c.name} value={c.name} />
              ))}
            </datalist>
          </div>
          {/* Brand Name */}
          <div>
            <label className="block mb-1">Brand Name</label>
            <input
              list="brands"
              className="border rounded p-2 w-full"
              value={form.brandName}
              onChange={e => handleChange("brandName", e.target.value)}
            />
            <datalist id="brands">
              {allFilters.brands.map(b => (
                <option key={b.name} value={b.name} />
              ))}
            </datalist>
          </div>
          {/* Specs */}
          <div>
            <label className="block mb-1">Specs</label>
            <textarea
              className="border rounded p-2 w-full"
              value={form.specs}
              onChange={e => handleChange("specs", e.target.value)}
            />
          </div>
          {/* Color */}
          <div>
            <label className="block mb-1">Color</label>
            <input
              list="colors"
              className="border rounded p-2 w-full"
              value={form.color}
              onChange={e => handleChange("color", e.target.value)}
            />
            <datalist id="colors">
              {colorOptions.map(clr => (
                <option key={clr} value={clr} />
              ))}
            </datalist>
          </div>
          {/* From Vendor/Client */}
          <div>
            <label className="block mb-1">From Vendor/Client</label>
            <input
              className="border rounded p-2 w-full"
              value={form.fromVendorClient}
              onChange={e => handleChange("fromVendorClient", e.target.value)}
            />
          </div>
          {/* Sample Rate */}
          <div>
            <label className="block mb-1">Sample Rate</label>
            <input
              type="number"
              className="border rounded p-2 w-full"
              value={form.sampleRate}
              onChange={e => handleChange("sampleRate", e.target.value)}
            />
          </div>
          {/* Qty */}
          <div>
            <label className="block mb-1">Qty</label>
            <input
              type="number"
              className="border rounded p-2 w-full"
              value={form.qty}
              onChange={e => handleChange("qty", e.target.value)}
            />
          </div>
          {/* Returnable */}
          <div>
            <label className="block mb-1">Returnable</label>
            <select
              className="border rounded p-2 w-full"
              value={form.returnable}
              onChange={e => handleChange("returnable", e.target.value)}
            >
              <option value="">None</option>
              <option value="Returnable">Returnable</option>
              <option value="Non Returnable">Non Returnable</option>
            </select>
          </div>
          {/* Returnable Days */}
          {form.returnable === "Returnable" && (
            <div>
              <label className="block mb-1">Returnable Days</label>
              <input
                type="number"
                className="border rounded p-2 w-full"
                value={form.returnableDays}
                onChange={e => handleChange("returnableDays", e.target.value)}
              />
            </div>
          )}
          
          {/* Remarks */}
          <div>
            <label className="block mb-1">Remarks</label>
            <textarea
              className="border rounded p-2 w-full"
              value={form.remarks}
              onChange={e => handleChange("remarks", e.target.value)}
            />
          </div>
        </div>

        <div className="mt-6 flex justify-end space-x-2">
          <button
            onClick={onClose}
            className="px-4 py-2 border rounded hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}