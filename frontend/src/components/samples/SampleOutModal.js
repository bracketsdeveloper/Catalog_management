"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";

export default function SampleOutModal({ initialData, onClose, onSave }) {
  const isEdit = Boolean(initialData);
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  const token = localStorage.getItem("token");

  // form state
  const [form, setForm] = useState({
    sampleOutDate: new Date(),
    clientCompanyName: "",
    clientName: "",
    contactNumber: "",
    sentBy: "",
    sampleReferenceCode: "",
    productCode: "",
    productPicture: "",
    productName: "",
    brand: "",
    qty: "",
    color: "",
    sentThrough: "",
    sampleDCNumber: "",
    sampleOutStatus: "",
    qtyReceivedBack: "",
    receivedBack: false,
    returned: false,
    sampleBackDate: null,
    sampleQty: 0,

    // NEW: manual opportunity number
    opportunityNumber: "",
  });

  // suggestions & lists
  const [companySug, setCompanySug] = useState([]);
  const [clientList, setClientList] = useState([]);
  const [userSug, setUserSug] = useState([]);
  const [sampleSug, setSampleSug] = useState([]);

  // availability & validation
  const [existingOuts, setExistingOuts] = useState([]);
  const [availableQty, setAvailableQty] = useState(0);
  const [qtyError, setQtyError] = useState("");
  const [receivedBackError, setReceivedBackError] = useState("");

  // 1) prefill basic fields when editing
  useEffect(() => {
    if (!initialData) return;
    setForm((f) => ({
      ...f,
      sampleOutDate: new Date(initialData.sampleOutDate),
      clientCompanyName: initialData.clientCompanyName,
      clientName: initialData.clientName,
      contactNumber: initialData.contactNumber,
      sentBy: initialData.sentByName,
      sampleReferenceCode: initialData.sampleReferenceCode,
      productCode: initialData.productCode,
      productPicture: initialData.productPicture,
      productName: initialData.productName,
      brand: initialData.brand,
      qty: initialData.qty,
      color: initialData.color,
      sentThrough: initialData.sentThrough,
      sampleDCNumber: initialData.sampleDCNumber,
      sampleOutStatus: initialData.sampleOutStatus,
      qtyReceivedBack: initialData.qtyReceivedBack,
      receivedBack: initialData.receivedBack,
      returned: initialData.returned ?? false,
      sampleBackDate: initialData.sampleBackDate
        ? new Date(initialData.sampleBackDate)
        : null,

      // NEW: prefill opp number
      opportunityNumber: initialData.opportunityNumber || "",
    }));
  }, [initialData]);

  // 2) fetch sampleQty, clients, and existing outs after prefill
  useEffect(() => {
    if (!initialData) return;

    // fetch client list for this company
    axios
      .get(
        `${BACKEND_URL}/api/admin/companies?search=${encodeURIComponent(
          initialData.clientCompanyName
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => {
        const c = r.data.find(
          (x) => x.companyName === initialData.clientCompanyName
        );
        if (c) setClientList(c.clients || []);
      })
      .catch((err) => {
        console.error("Error fetching client list:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          companyName: initialData.clientCompanyName,
          timestamp: new Date().toISOString(),
        });
      });

    // fetch this sample's details to get sampleQty
    axios
      .get(
        `${BACKEND_URL}/api/admin/samples?search=${encodeURIComponent(
          initialData.sampleReferenceCode
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => {
        const list = r.data.products ?? r.data;
        const s = list.find(
          (x) => x.sampleReferenceCode === initialData.sampleReferenceCode
        );
        if (s) setForm((f) => ({ ...f, sampleQty: s.qty }));
      })
      .catch((err) => {
        console.error("Error fetching sample details:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          sampleReferenceCode: initialData.sampleReferenceCode,
          timestamp: new Date().toISOString(),
        });
      });

    // fetch existing outs for availability
    axios
      .get(
        `${BACKEND_URL}/api/admin/sample-outs?search=${encodeURIComponent(
          initialData.sampleReferenceCode
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => setExistingOuts(r.data))
      .catch((err) => {
        console.error("Error fetching existing sample-outs:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          sampleReferenceCode: initialData.sampleReferenceCode,
          timestamp: new Date().toISOString(),
        });
      });
  }, [initialData]);

  // 3) recalc availableQty whenever sampleQty or existingOuts change
  useEffect(() => {
    const totalSent = existingOuts.reduce((sum, o) => sum + Number(o.qty), 0);
    const totalRet = existingOuts.reduce(
      (sum, o) => sum + Number(o.qtyReceivedBack),
      0
    );
    setAvailableQty(form.sampleQty - totalSent + totalRet);
  }, [form.sampleQty, existingOuts]);

  // 4) company suggestions
  useEffect(() => {
    if (!form.clientCompanyName) {
      setCompanySug([]);
      return;
    }
    axios
      .get(
        `${BACKEND_URL}/api/admin/companies?search=${encodeURIComponent(
          form.clientCompanyName
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => setCompanySug(r.data))
      .catch((err) => {
        console.error("Error fetching company suggestions:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          companyName: form.clientCompanyName,
          timestamp: new Date().toISOString(),
        });
      });
  }, [form.clientCompanyName]);

  const selectCompany = (c) => {
    setForm((f) => ({
      ...f,
      clientCompanyName: c.companyName,
      clientName: "",
      contactNumber: "",
    }));
    setClientList(c.clients || []);
    setCompanySug([]);
  };

  // 5) user suggestions
  useEffect(() => {
    if (!form.sentBy) {
      setUserSug([]);
      return;
    }
    axios
      .get(
        `${BACKEND_URL}/api/admin/users?search=${encodeURIComponent(
          form.sentBy
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => setUserSug(r.data))
      .catch((err) => {
        console.error("Error fetching user suggestions:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          sentBy: form.sentBy,
          timestamp: new Date().toISOString(),
        });
      });
  }, [form.sentBy]);

  // 6) sample suggestions
  useEffect(() => {
    if (!form.sampleReferenceCode) {
      setSampleSug([]);
      return;
    }
    axios
      .get(
        `${BACKEND_URL}/api/admin/samples?search=${encodeURIComponent(
          form.sampleReferenceCode
        )}`,
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .then((r) => setSampleSug(r.data.products ?? r.data))
      .catch((err) => {
        console.error("Error fetching sample suggestions:", {
          message: err.message,
          stack: err.stack,
          response: err.response?.data,
          sampleReferenceCode: form.sampleReferenceCode,
          timestamp: new Date().toISOString(),
        });
      });
  }, [form.sampleReferenceCode]);

  const selectSample = (s) => {
    setForm((f) => ({
      ...f,
      sampleReferenceCode: s.sampleReferenceCode,
      productCode: s.productId,
      productPicture: s.productPicture,
      productName: s.productName,
      brand: s.brandName,
      color: s.color,
      sampleQty: s.qty,
      qty: "",
      qtyReceivedBack: "",
    }));
    setSampleSug([]);
    setQtyError("");
    setReceivedBackError("");
  };

  // 7) handleChange + validation
  const handleChange = (key, val) => {
    setForm((f) => ({ ...f, [key]: val }));

    if (key === "qty") {
      const out = Number(val);
      setQtyError(
        out > availableQty ? `Cannot exceed available qty (${availableQty})` : ""
      );
      if (form.qtyReceivedBack !== "") {
        setReceivedBackError(
          Number(form.qtyReceivedBack) > out
            ? `Must be ≤ out qty (${out})`
            : ""
        );
      }
    }

    if (key === "qtyReceivedBack") {
      const ret = Number(val);
      const out = Number(form.qty) || 0;
      setReceivedBackError(ret > out ? `Must be ≤ out qty (${out})` : "");
    }
  };

  // 8) submit handler
  const handleSubmit = async () => {
    if (qtyError || receivedBackError) return;
    try {
      const payload = {
        ...form,
        sampleOutDate: form.sampleOutDate.toISOString(),
        sampleBackDate: form.sampleBackDate
          ? form.sampleBackDate.toISOString()
          : null,

        // ensure trimmed string to API
        opportunityNumber: (form.opportunityNumber || "").trim(),
      };

      if (isEdit) {
        await axios.put(
          `${BACKEND_URL}/api/admin/sample-outs/${initialData._id}`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      } else {
        await axios.post(
          `${BACKEND_URL}/api/admin/sample-outs`,
          payload,
          { headers: { Authorization: `Bearer ${token}` } }
        );
      }
      onSave();
    } catch (err) {
      console.error("Error saving sample-out:", {
        message: err.message,
        stack: err.stack,
        response: err.response?.data,
        payload: form,
        endpoint: isEdit
          ? `${BACKEND_URL}/api/admin/sample-outs/${initialData._id}`
          : `${BACKEND_URL}/api/admin/sample-outs`,
        method: isEdit ? "PUT" : "POST",
        timestamp: new Date().toISOString(),
      });
      alert(err.response?.data?.message || "Error saving Sample Out");
    }
  };

  // helper for <input type="date">
  const toDateInput = (date) =>
    date ? new Date(date).toISOString().slice(0, 10) : "";

  // filter suggestion lists
  const filteredCompanySug = companySug.filter((c) =>
    c.companyName.toLowerCase().includes(form.clientCompanyName.toLowerCase())
  );
  const filteredClientSug = clientList.filter((c) =>
    c.name.toLowerCase().includes(form.clientName.toLowerCase())
  );
  const filteredUserSug = userSug.filter((u) =>
    u.name.toLowerCase().includes(form.sentBy.toLowerCase())
  );
  const filteredSampleSug = sampleSug.filter((s) =>
    s.sampleReferenceCode
      .toLowerCase()
      .includes(form.sampleReferenceCode.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">
          {isEdit ? "Edit" : "New"} Sample Out
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Sample Out Date */}
          <div>
            <label className="block mb-1">Sample Out Date</label>
            <input
              type="date"
              className="border rounded p-2 w-full"
              value={toDateInput(form.sampleOutDate)}
              onChange={(e) =>
                handleChange("sampleOutDate", new Date(e.target.value))
              }
            />
          </div>

          {/* NEW: Opportunity Number (manual input) */}
          <div>
            <label className="block mb-1">Opportunity #</label>
            <input
              className="border rounded p-2 w-full"
              value={form.opportunityNumber}
              onChange={(e) => handleChange("opportunityNumber", e.target.value)}
              placeholder="Enter opportunity number"
            />
          </div>

          {/* Client Company */}
          <div>
            <label className="block mb-1">Client Company</label>
            <input
              className="border rounded p-2 w-full"
              value={form.clientCompanyName}
              onChange={(e) =>
                handleChange("clientCompanyName", e.target.value)
              }
            />
            {filteredCompanySug.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {filteredCompanySug.map((c) => (
                  <li
                    key={c._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => selectCompany(c)}
                  >
                    {c.companyName}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Client Name */}
          <div>
            <label className="block mb-1">Client Name</label>
            <input
              className="border rounded p-2 w-full"
              value={form.clientName}
              onChange={(e) => handleChange("clientName", e.target.value)}
            />
            {filteredClientSug.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {filteredClientSug.map((c) => (
                  <li
                    key={c.name}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => {
                      handleChange("clientName", c.name);
                      handleChange("contactNumber", c.contactNumber);
                    }}
                  >
                    {c.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Contact Number */}
          <div>
            <label className="block mb-1">Contact Number</label>
            <input
              className="border rounded p-2 w-full"
              value={form.contactNumber}
              readOnly
            />
          </div>

          {/* Sent By */}
          <div>
            <label className="block mb-1">Sent By</label>
            <input
              className="border rounded p-2 w-full"
              value={form.sentBy}
              onChange={(e) => handleChange("sentBy", e.target.value)}
            />
            {filteredUserSug.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {filteredUserSug.map((u) => (
                  <li
                    key={u._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => handleChange("sentBy", u.name)}
                  >
                    {u.name}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Sample Ref # */}
          <div>
            <label className="block mb-1">Sample Ref #</label>
            <input
              className="border rounded p-2 w-full"
              value={form.sampleReferenceCode}
              onChange={(e) =>
                handleChange("sampleReferenceCode", e.target.value)
              }
            />
            {filteredSampleSug.length > 0 && (
              <ul className="border bg-white max-h-40 overflow-auto mt-1">
                {filteredSampleSug.map((s) => (
                  <li
                    key={s._id}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                    onClick={() => selectSample(s)}
                  >
                    {s.sampleReferenceCode}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Product Code */}
          <div>
            <label className="block mb-1">Product Code</label>
            <input
              className="border rounded p-2 w-full"
              value={form.productCode}
              readOnly
            />
          </div>

          {/* Product Pic */}
          <div className="flex items-center justify-center">
            {form.productPicture ? (
              <img
                src={form.productPicture}
                alt=""
                className="h-20 w-20 object-contain border"
              />
            ) : (
              <div className="h-20 w-20 border flex items-center justify-center text-xs">
                No Image
              </div>
            )}
          </div>

          {/* Product Name */}
          <div>
            <label className="block mb-1">Product Name</label>
            <input
              className="border rounded p-2 w-full"
              value={form.productName}
              readOnly
            />
          </div>

          {/* Brand */}
          <div>
            <label className="block mb-1">Brand</label>
            <input
              className="border rounded p-2 w-full"
              value={form.brand}
              readOnly
            />
          </div>

          {/* Qty (Out) */}
          <div>
            <label className="block mb-1">Qty (max: {availableQty})</label>
            <input
              type="number"
              className={`border rounded p-2 w-full ${
                qtyError ? "border-red-500" : ""
              }`}
              value={form.qty}
              onChange={(e) => handleChange("qty", e.target.value)}
            />
            {qtyError && (
              <p className="text-red-600 text-sm mt-1">{qtyError}</p>
            )}
          </div>

          {/* Color */}
          <div>
            <label className="block mb-1">Color</label>
            <input
              className="border rounded p-2 w-full"
              value={form.color}
              readOnly
            />
          </div>

          {/* Sent Through */}
          <div>
            <label className="block mb-1">Sent Through</label>
            <input
              className="border rounded p-2 w-full"
              value={form.sentThrough}
              onChange={(e) => handleChange("sentThrough", e.target.value)}
            />
          </div>

          {/* Sample DC# */}
          <div>
            <label className="block mb-1">Sample DC#</label>
            <input
              className="border rounded p-2 w-full"
              value={form.sampleDCNumber}
              onChange={(e) => handleChange("sampleDCNumber", e.target.value)}
            />
          </div>

          {/* Sample Out Status */}
          <div>
            <label className="block mb-1">Sample Out Status</label>
            <select
              className="border rounded p-2 w-full"
              value={form.sampleOutStatus}
              onChange={(e) =>
                handleChange("sampleOutStatus", e.target.value)
              }
            >
              <option value="">None</option>
              <option value="sent">Sent</option>
              <option value="not sent">Not Sent</option>
            </select>
          </div>

          {/* Qty Rec'd Back */}
          <div>
            <label className="block mb-1">Qty Rec'd Back</label>
            <input
              type="number"
              className={`border rounded p-2 w-full ${
                receivedBackError ? "border-red-500" : ""
              }`}
              value={form.qtyReceivedBack}
              onChange={(e) =>
                handleChange("qtyReceivedBack", e.target.value)
              }
            />
            {receivedBackError && (
              <p className="text-red-600 text-sm mt-1">
                {receivedBackError}
              </p>
            )}
          </div>

          {/* Received Back */}
          <div>
            <label className="block mb-1">Received Back</label>
            <select
              className="border rounded p-2 w-full"
              value={form.receivedBack}
              onChange={(e) =>
                handleChange("receivedBack", e.target.value === "true")
              }
            >
              <option value={false}>No</option>
              <option value={true}>Yes</option>
            </select>
          </div>

          {/* Returned */}
          <div>
            <label className="block mb-1">Returned to vendor</label>
            <select
              className="border rounded p-2 w-full"
              value={form.returned}
              onChange={(e) =>
                handleChange("returned", e.target.value === "true")
              }
            >
              <option value={false}>No</option>
              <option value={true}>Yes</option>
            </select>
          </div>

          {/* Sample Back Date */}
          {form.receivedBack && (
            <div>
              <label className="block mb-1">Sample Back Date</label>
              <input
                type="date"
                className="border rounded p-2 w-full"
                value={toDateInput(form.sampleBackDate)}
                onChange={(e) =>
                  handleChange("sampleBackDate", new Date(e.target.value))
                }
              />
            </div>
          )}
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
            disabled={Boolean(qtyError || receivedBackError)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  );
}
