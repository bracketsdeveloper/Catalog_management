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
    opportunityNumber: "",
    remarks:           "",
    crmName:           "",
  });

  const [suggestions, setSuggestions] = useState([]);
  const [opportunitySuggestions, setOpportunitySuggestions] = useState([]);
  const [allFilters, setAllFilters] = useState({ categories: [], subCategories: [], brands: [] });
  const [colorOptions, setColorOptions] = useState([]);

  // users typeahead
  const [allUsers, setAllUsers] = useState([]);
  const [userSuggestions, setUserSuggestions] = useState([]);

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

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
        opportunityNumber: initialData.opportunityNumber || "",
        remarks:          initialData.remarks || "",
        crmName:          initialData.crmName || "",
      });
      setColorOptions(
        (initialData.color || "")
          .split(",")
          .map((c) => c.trim())
          .filter(Boolean)
      );
    }
  }, [initialData]);

  // filters for products
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/products/filters`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAllFilters(res.data))
      .catch(console.error);
  }, []);

  // suggestions for products
  useEffect(() => {
    const q = form.productId || form.productName;
    if (q.trim()) {
      axios
        .get(`${BACKEND_URL}/api/admin/products?search=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => setSuggestions(res.data.products ?? res.data))
        .catch(console.error);
    } else {
      setSuggestions([]);
    }
  }, [form.productId, form.productName]);

  // suggestions for opportunities
  useEffect(() => {
    const q = form.opportunityNumber;
    if (q.trim()) {
      axios
        .get(
          `${BACKEND_URL}/api/admin/samples/opportunity-suggestions?search=${encodeURIComponent(q)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        )
        .then((res) => setOpportunitySuggestions(res.data))
        .catch(console.error);
    } else {
      setOpportunitySuggestions([]);
    }
  }, [form.opportunityNumber]);

  // load users once
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/users`, { headers: { Authorization: `Bearer ${token}` } })
      .then((res) => setAllUsers(Array.isArray(res.data) ? res.data : []))
      .catch(console.error);
  }, []);

  // filter user suggestions
  useEffect(() => {
    const q = (form.crmName || "").trim().toLowerCase();
    if (!q) return setUserSuggestions([]);
    setUserSuggestions(
      allUsers.filter((u) => (u.name || "").toLowerCase().includes(q)).slice(0, 8)
    );
  }, [form.crmName, allUsers]);

  const handleSelectProduct = (p) => {
    setForm((f) => ({
      ...f,
      productId: p.productId,
      productName: p.name,
      category: p.category,
      subCategory: p.subCategory,
      brandName: p.brandName,
      specs: p.productDetails,
      color: "",
      productPicture: Array.isArray(p.images) ? p.images[0] : "",
    }));
    setColorOptions(
      (p.color || "")
        .split(",")
        .map((c) => c.trim())
        .filter(Boolean)
    );
    setSuggestions([]);
  };

  const handleSelectOpportunity = (opp) => {
    setForm((f) => ({ ...f, opportunityNumber: opp.opportunityCode }));
    setOpportunitySuggestions([]);
  };

  const handleSelectUser = (u) => {
    setForm((f) => ({ ...f, crmName: u.name || "" }));
    setUserSuggestions([]);
  };

  const handleChange = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    try {
      if (isEdit) {
        await axios.put(`${BACKEND_URL}/api/admin/samples/${initialData._id}`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/samples`, form, {
          headers: { Authorization: `Bearer ${token}` },
        });
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
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />

      {/* Modal container (centers content & allows page scroll if needed) */}
      <div className="absolute inset-0 overflow-y-auto">
        <div className="min-h-full flex items-center justify-center p-4">
          {/* Card */}
          <div className="relative w-full max-w-3xl bg-white rounded shadow-lg flex flex-col">
            {/* Header */}
            <div className="px-6 py-4 border-b">
              <h2 className="text-xl font-bold">{isEdit ? "Edit Sample" : "Add Sample"}</h2>
            </div>

            {/* Scrollable body */}
            <div className="px-6 py-4 overflow-y-auto max-h-[70vh]">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* Sample In Date */}
                <div>
                  <label className="block mb-1">Sample In Date</label>
                  <DatePicker
                    selected={form.sampleInDate}
                    onChange={(date) => handleChange("sampleInDate", date)}
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
                    onChange={(e) => handleChange("opportunityNumber", e.target.value)}
                  />
                  {opportunitySuggestions.length > 0 && (
                    <ul className="border bg-white max-h-40 overflow-auto mt-1 rounded">
                      {opportunitySuggestions.map((opp) => (
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
                    onChange={(e) =>
                      handleChange(form.productId ? "productId" : "productName", e.target.value)
                    }
                  />
                  {suggestions.length > 0 && (
                    <ul className="border bg-white max-h-40 overflow-auto mt-1 rounded">
                      {suggestions.map((p) => (
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
                      className="h-24 w-24 object-contain border rounded"
                    />
                  ) : (
                    <div className="h-24 w-24 flex items-center justify-center border rounded text-gray-400">
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
                    onChange={(e) => handleChange("category", e.target.value)}
                  />
                  <datalist id="cats">
                    {allFilters.categories.map((c) => (
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
                    onChange={(e) => handleChange("subCategory", e.target.value)}
                  />
                  <datalist id="subs">
                    {allFilters.subCategories.map((c) => (
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
                    onChange={(e) => handleChange("brandName", e.target.value)}
                  />
                  <datalist id="brands">
                    {allFilters.brands.map((b) => (
                      <option key={b.name} value={b.name} />
                    ))}
                  </datalist>
                </div>

                {/* Specs */}
                <div className="md:col-span-3">
                  <label className="block mb-1">Specs</label>
                  <textarea
                    className="border rounded p-2 w-full"
                    value={form.specs}
                    onChange={(e) => handleChange("specs", e.target.value)}
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="block mb-1">Color</label>
                  <input
                    list="colors"
                    className="border rounded p-2 w-full"
                    value={form.color}
                    onChange={(e) => handleChange("color", e.target.value)}
                  />
                  <datalist id="colors">
                    {colorOptions.map((clr) => (
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
                    onChange={(e) => handleChange("fromVendorClient", e.target.value)}
                  />
                </div>

                {/* Sample Rate */}
                <div>
                  <label className="block mb-1">Sample Rate</label>
                  <input
                    type="number"
                    className="border rounded p-2 w-full"
                    value={form.sampleRate}
                    onChange={(e) => handleChange("sampleRate", e.target.value)}
                  />
                </div>

                {/* Qty */}
                <div>
                  <label className="block mb-1">Qty</label>
                  <input
                    type="number"
                    className="border rounded p-2 w-full"
                    value={form.qty}
                    onChange={(e) => handleChange("qty", e.target.value)}
                  />
                </div>

                {/* Returnable */}
                <div>
                  <label className="block mb-1">Returnable</label>
                  <select
                    className="border rounded p-2 w-full"
                    value={form.returnable}
                    onChange={(e) => handleChange("returnable", e.target.value)}
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
                      onChange={(e) => handleChange("returnableDays", e.target.value)}
                    />
                  </div>
                )}

                {/* CRM Name (with suggestions) */}
                <div>
                  <label className="block mb-1">CRM Name</label>
                  <input
                    type="text"
                    className="border rounded p-2 w-full"
                    value={form.crmName}
                    onChange={(e) => handleChange("crmName", e.target.value)}
                    placeholder="Start typing a user's name…"
                  />
                  {userSuggestions.length > 0 && (
                    <ul className="border bg-white max-h-40 overflow-auto mt-1 rounded">
                      {userSuggestions.map((u) => (
                        <li
                          key={u._id}
                          className="p-2 hover:bg-gray-100 cursor-pointer"
                          onClick={() => handleSelectUser(u)}
                        >
                          {u.name} <span className="text-gray-500 text-xs">({u.email})</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                {/* Remarks */}
                <div className="md:col-span-3">
                  <label className="block mb-1">Remarks</label>
                  <textarea
                    className="border rounded p-2 w-full"
                    value={form.remarks}
                    onChange={(e) => handleChange("remarks", e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Footer (sticky inside modal) */}
            <div className="px-6 py-3 border-t bg-white sticky bottom-0">
              <div className="flex justify-end gap-2">
                <button onClick={onClose} className="px-4 py-2 border rounded hover:bg-gray-100">
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
          {/* end card */}
        </div>
      </div>
    </div>
  );
}
