// client/src/pages/ManageCompanies.js
"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import CompanyModal from "../components/company/CompanyModal.js";
import { TrashIcon } from "@heroicons/react/24/solid";

export default function ManageCompanies() {
  const navigate = useNavigate();
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  /* ------------ state ------------ */
  const [companies, setCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");

  /* modal */
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [selectedCompany, setSelectedCompany] = useState(null);

  /* logs dropdown */
  const [commonLogs, setCommonLogs] = useState([]);
  const [showLogsDropdown, setShowLogsDropdown] = useState(false);
  const [logsLoading, setLogsLoading] = useState(false);

  //vecdor code
const [vendorCodeInputs, setVendorCodeInputs] = useState({});

//portal upload
const [portalUploadInputs, setPortalUploadInputs] = useState({});
const [portalUploadSelections, setPortalUploadSelections] = useState({});


//payment terms
       const [paymentTermsInputs, setPaymentTermsInputs] = useState({});
       const [paymentTermsSelections, setPaymentTermsSelections] = useState({});

  /* ------------ fetch companies ------------ */
  useEffect(() => {
    fetchCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function fetchCompanies() {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch companies");
    } finally {
      setLoading(false);
    }
  }

  /* ------------ helpers ------------ */
  const filteredCompanies = companies.filter((c) => {
    const s = searchTerm.toLowerCase();
    return (
      c.companyName.toLowerCase().includes(s) ||
      (c.brandName && c.brandName.toLowerCase().includes(s)) ||
      (c.GSTIN && c.GSTIN.toLowerCase().includes(s)) ||
      (c.companyAddress && c.companyAddress.toLowerCase().includes(s)) ||
      c.clients?.some(
        (cl) =>
          cl.name.toLowerCase().includes(s) ||
          (cl.email && cl.email.toLowerCase().includes(s)) ||
          cl.contactNumber.includes(searchTerm)
      )
    );
  });

  const openAddModal = () => {
    setModalMode("add");
    setSelectedCompany(null);
    setModalOpen(true);
  };

  const openEditModal = (company) => {
    setModalMode("edit");
    setSelectedCompany(company);
    setModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this company?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchCompanies();
    } catch (_) {
      alert("Failed to delete");
    }
  };




  const handleSegmentChange = async (e, id) => {
      const selectedSegment = e.target.value;

      const token = localStorage.getItem('token'); // Or sessionStorage, wherever you saved after login
      try{
          await axios.put(
              `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
              { segment: selectedSegment },
              {
                  headers: {
                      Authorization: `Bearer ${token}`,
                  },
              }
          );
          setCompanies((prevCompanies) =>
              prevCompanies.map((company) =>
                  company._id === id
                      ? { ...company, segment: selectedSegment }
                      : company
              )
          );
          alert("Successfully updated segment!");
      }catch(err){
        console.error(err);
      }
  }



const handleVendorCodeInputChange = (e, id) => {
  setVendorCodeInputs((prev) => ({
    ...prev,
    [id]: e.target.value,
  }));
};
 
const saveVendorCode = async (id) => {
  const code = vendorCodeInputs[id];
  if (!code?.trim()) return;
  const token = localStorage.getItem("token");
  try {
    const response = await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
      { vendorCode: code },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    console.log("Vendor code saved:", response.data);

    // Optionally, update local state or refetch the company list
    // Example: refetchCompanies();

    // Clear the input state for that ID
    setVendorCodeInputs((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });
  } catch (error) {
    console.error("Error saving vendor code:", error);
    // Optionally show a user-facing error message
  }
};

const handleDeleteVendorCode = async (id) => {
  const token = localStorage.getItem("token");
 
  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
          { vendorCode: "" },  
         {
          headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );  
    setCompanies((prevComapnaies) =>
      prevComapnaies.map((company) =>
        company._id === id ? { ...company, vendorCode: "" } : company  
      )
    );
    alert("Successfully deleted vendor code!");
  } catch (error) {
    console.error("Error deleting vendor code:", error);
    alert("Failed to delete vendor code");
  }
};


const handleDeleteSegment = async ( id) => {
  const token = localStorage.getItem("token");
 
  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
          { segment: "" },  
         {
          headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setCompanies((prevComapnaies) =>
      prevComapnaies.map((company) =>
        company._id === id ? { ...company, segment: "" } : company  
      )
    );

    alert("Successfully deleted segment!");
  } catch (error) {
    console.error("Error deleting segment:", error);
    alert("Failed to delete  segment");
  }
};


const handlePortalUploadSelect = (e, id) => {
  const value = e.target.value;
  setPortalUploadSelections((prev) => ({
    ...prev,
    [id]: value,
  }));
};

const handlePortalUploadInputChange = (e, id) => {
  setPortalUploadInputs((prev) => ({
    ...prev,
    [id]: e.target.value,
  }));
};

const savePortalUpload = async (id) => {
  const value = portalUploadInputs[id]?.trim();
  if (!value) {
    alert("Please fill in the portal upload details.");
    return;
  }
  const token = localStorage.getItem("token");
  try {
    const response = await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
      { portalUpload: value },
      {
        headers: {
          Authorization: `Bearer ${token}`
        },
      }
    );
    console.log("Portal Upload saved:", response.data);

    // Clear after saving
    setPortalUploadInputs((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    setPortalUploadSelections((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

     alert("Portal upload deleted successfully")
  } catch (error) {
    console.error("Error saving portal upload:", error);
  }
};

const handleDeletePortalUpload = async (id) => {
  const token = localStorage.getItem("token");
 
  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
          { portalUpload: "" },  
         {
          headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );  
    setCompanies((prevComapnaies) =>
      prevComapnaies.map((company) =>
        company._id === id ? { ...company, portalUpload: "" } : company  
      )
    );
    alert("Successfully deleted portal upload!");
  } catch (error) {
    console.error("Error deleting portal upload:", error);
    alert("Failed to delete portal upload");
  }
};

const handlePaymentTermsInputChange = (e, id) => {
  setPaymentTermsInputs((prev) => ({
    ...prev,
    [id]: e.target.value,
  }));
};

const savePaymentTerms = async (id) => {
  const value = paymentTermsInputs[id]?.trim();
  if (!value) {
    alert("Please fill in the payment terms.");
    return;
  }
  const token = localStorage.getItem("token");
  try {
    const response = await axios.put(
      `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
      { paymentTerms: value },
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );
    console.log("Payment terms saved:", response.data);

    // Clear after saving
    setPaymentTermsInputs((prev) => {
      const updated = { ...prev };
      delete updated[id];
      return updated;
    });

    alert("Payment terms saved successfully")
  } catch (error) {
    console.error("Error saving payment terms:", error);
  }
};

const handleDeletePaymentTerms = async (id) => {
  const token = localStorage.getItem("token");
 
  try {
    await axios.put(
           `${process.env.REACT_APP_BACKEND_URL}/api/admin/companies/${id}`,
          { paymentTerms: "" },  
         {
          headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    setCompanies((prevComapnaies) =>
      prevComapnaies.map((company) =>
        company._id === id ? { ...company, paymentTerms: "" } : company  
      )
    );

    alert("Successfully deleted payment terms!");
  } catch (error) {
    console.error("Error deleting payment terms:", error);
    alert("Failed to delete payment terms");
  }
};


  const getDotColor = (a) =>
    a === "create" ? "bg-green-400" : a === "update" ? "bg-orange-500" : "bg-red-600";

  /* ------------ UI ------------ */
  return (
    <div className="p-6">
      {/* header */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">Manage Companies</h1>
        <div className="flex gap-2">
          {/* logs */}
          <div
            className="relative"
            onMouseEnter={() => {
              setShowLogsDropdown(true);
              fetchAllLogs();
            }}
            onMouseLeave={() => setShowLogsDropdown(false)}
          >
            <button className="bg-cyan-600 text-white px-4 py-2 rounded">Logs</button>
            {showLogsDropdown && (
              <div className="absolute right-0 mt-2 w-96 max-h-96 overflow-y-auto bg-white border rounded shadow z-50 p-2">
                {logsLoading ? (
                  <div className="text-center py-4">Loading…</div>
                ) : commonLogs.length ? (
                  commonLogs.map((l, i) => (
                    <div key={i} className="border-b last:border-b-0 py-1 text-sm">
                      <span className={`inline-block w-2 h-2 rounded-full mr-2 ${getDotColor(l.action)}`} />
                      <b className="capitalize">{l.action}</b> on {l.field || "record"}{" "}
                      <span className="text-xs text-gray-500">
                        ({new Date(l.performedAt).toLocaleString()})
                      </span>
                      <div className="text-xs text-gray-600">Company: {l.companyName}</div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-4">No logs</div>
                )}
              </div>
            )}
          </div>
          {/* add */}
            <button onClick={openAddModal} className="bg-orange-500 text-white px-4 py-2 rounded">
              Add Company
            </button>
        </div>
      </div>

      {/* search */}
      <input
        type="text"
        placeholder="Search companies..."
        className="w-full mb-4 p-2 border rounded focus:ring-2 focus:ring-blue-500"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      {/* table */}
      {loading ? (
        <div className="text-center py-20">Loading…</div>
      ) : error ? (
        <div className="text-red-600">{error}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-sm font-semibold text-gray-700">
                <th className="p-3">Company</th>
                <th className="p-3">Brand</th>
                <th className="p-3">Segment</th>
                <th className="p-3">Clients</th>
                <th className="p-3">Address</th>
                <th className="p-3">GSTIN</th>
                <th className="p-3">Vendor Code</th>
                <th className="p-3">Payment terms</th>
                <th className="p-3">Portal Upload</th>
                <th className="p-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCompanies.map((c) => (
                <tr key={c._id} className="border-b hover:bg-gray-50">
                  <td className="p-3">{c.companyName}</td>
                  <td className="p-3">{c.brandName || "-"}</td>
                  <td className="p-3">
                    {c.segment ? (
                      <div className="flex justify-between">
                        <div>
                          <span className="text-sm font-medium text-gray-700">{c.segment}</span>
                        </div>
                        <div>
                          <button
                            onClick={() => handleDeleteSegment(c._id)}
                            className="text-red-600 text-sm underline"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>  
                      </div>
                    ) : (                  
                    <select
                        name="segment"
                        value={c.segment}
                        onChange={(e) => handleSegmentChange(e, c._id)}
                        className="border rounded px-2 py-1 text-sm"
                      >
                        <option value="">Select</option>
                        <option value="segmentA">Segment A</option>
                        <option value="segmentB">Segment B</option>
                        <option value="segmentC">Segment C</option>
                      </select>
                      )}
                  </td>
                    <td className="p-3">
                    {c.clients?.length ? (
                      <ul>
                        {c.clients.map((cl, i) => (
                          <li key={i} className="text-xs">
                            {cl.name} | {cl.department || "-"} | {cl.email || "-"} | {cl.contactNumber}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      "-"
                    )}
                  </td>
                    <td className="p-3">{c.companyAddress || "-"}</td>
                  <td className="p-3">{c.GSTIN || "-"}</td>
                  <td className="p-3">
                   {c.vendorCode ? (
                        <div className="flex justify-between items-center gap-4">
                          <div>
                          <span className="text-sm">{c.vendorCode}</span>
                          </div>
                          <div className="space-x-2">
                            <button
                              onClick={() => handleDeleteVendorCode(c._id)}
                              className="text-red-600 text-sm underline"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className=" space-x-2">
                              <input
                                type="text"
                                placeholder="Enter vendor code"
                                value={vendorCodeInputs[c._id] || ""}
                                onChange={(e) => handleVendorCodeInputChange(e, c._id)}
                                className="border rounded px-2 py-1 text-sm w-full"
                              />
                              <button
                                onClick={() => saveVendorCode(c._id)}
                                className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600"
                              >
                                Submit
                              </button>
                            </div>

                      )}
                     </td>
                  <td className="p-3">
                    {c.paymentTerms ? (
                      <div className="flex justify-between items-center gap-4">
                        <div>
                        <span className="text-sm">{c.paymentTerms}</span>
                        </div>
                        <div>
                          <button
                            onClick={() => handleDeletePaymentTerms(c._id)}
                            className="text-red-600 text-sm underline"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>  
                      </div>
                    ) : (
                      <div className=" space-x-2">
                        <input
                          type="text"
                          placeholder="Enter payment terms"
                          value={paymentTermsInputs[c._id] || ""}
                          onChange={(e) => handlePaymentTermsInputChange(e, c._id)}
                          className="border rounded px-2 py-1 text-sm w-full"
                        />
                        <button
                          onClick={() => savePaymentTerms(c._id)}
                          className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </td>
              
                <td className="p-3">
                  {c.portalUpload ?(
                         <div className="flex justify-between items-center gap-4">
                           <div>
                             <span className="text-sm">{c.vendorCode}</span>
                          </div>
                          <div>
                            <button
                              onClick={() => handleDeletePortalUpload(c._id)}
                              className="text-red-600 text-sm underline"
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button> 
                          </div>
                             </div>
                  ) : (
                    <div className="space-y-1">
                      <select
                        value={portalUploadSelections[c._id] || ""}
                        onChange={(e) => handlePortalUploadSelect(e, c._id)}
                        className="border rounded px-2 py-1 text-sm w-30"
                      >
                        <option value="">Select</option>
                        <option value="Yes">Yes</option>
                        <option value="No">No</option>
                      </select>

                      {portalUploadSelections[c._id] === "Yes" ? (
                        <div className=" space-x-2">
                          <input
                            type="text"
                            placeholder="Enter upload info"
                            value={portalUploadInputs[c._id] || ""}
                            onChange={(e) => handlePortalUploadInputChange(e, c._id)}
                            className="border rounded px-2 py-1 text-sm w-full"
                          />
                          <button
                            onClick={() => savePortalUpload(c._id)}
                            className="bg-blue-500 text-white text-sm px-3 py-1 rounded hover:bg-blue-600"
                          >
                            Submit
                          </button>
                        </div>
                      ) : portalUploadSelections[c._id] === "No" ? (
                        <input
                          type="text"
                          value="Not Required"
                          disabled
                          className="bg-gray-100 border rounded px-2 py-1 text-sm w-full text-gray-500 cursor-not-allowed"
                        />
                      ) : null}
                    </div>
                    )
                  }
                  </td>


                  <td className="p-3 space-x-1">
                    <button
                      onClick={() => openEditModal(c)}
                      className="bg-yellow-500 text-white px-2 py-1 rounded text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c._id)}
                      className="bg-red-600 text-white px-2 py-1 rounded text-sm"
                    >
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* modal */}
      {modalOpen && (
        <CompanyModal
          mode={modalMode}
          company={selectedCompany}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchCompanies();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );

  /* ------------ logs helper ------------ */
  async function fetchAllLogs() {
    try {
      setLogsLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/logs`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCommonLogs(res.data.logs);
    } finally {
      setLogsLoading(false);
    }
  }
}
