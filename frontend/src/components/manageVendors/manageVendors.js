import { useEffect, useState, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import { Dropdown } from "react-bootstrap";
import { FaEllipsisV } from "react-icons/fa";
import { VendorAdd } from "./VendorAdd";
import VendorUploader from "../invoicefollowup/invoiceBulkUpload";

export const ManageVendors = () => {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("add"); // 'add' | 'edit'
  const [selectedVendor, setSelectedVendor] = useState(null);

  const [showBulkModal, setShowBulkModal] = useState(false);

  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "", direction: "" });

  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const canExportPurchase = permissions.includes("export-purchase");
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendors(res.data);
      setError(null);
    } catch {
      setError("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
    setIsSuperAdmin(localStorage.getItem("isSuperAdmin") === "true");
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this vendor?")) return;
    try {
      const token = localStorage.getItem("token");
      await axios.delete(`${BACKEND_URL}/api/admin/vendors/${id}?hard=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      fetchVendors();
    } catch {
      alert("Failed to delete");
    }
  };

  const openModal = () => {
    setModalMode("add");
    setSelectedVendor(null);
    setModalOpen(true);
  };
  const openEditModal = (vendor) => {
    setModalMode("edit");
    setSelectedVendor(vendor);
    setModalOpen(true);
  };
  const openBulkModal = () => setShowBulkModal(true);

  const handleSort = (key) => {
    let direction = "asc";
    if (sortConfig.key === key && sortConfig.direction === "asc")
      direction = "desc";
    else if (sortConfig.key === key && sortConfig.direction === "desc")
      direction = "";
    setSortConfig({ key, direction });
  };
  const SortIndicator = ({ field }) => {
    if (sortConfig.key !== field) return null;
    if (sortConfig.direction === "asc") return " ▲";
    if (sortConfig.direction === "desc") return " ▼";
    return null;
  };

  const displayedVendors = useMemo(() => {
    const filtered = vendors.filter((v) => {
      const hay = [
        v.vendorName,
        v.vendorCompany,
        v.brandDealing,
        v.location,
        v.gst,
        v.bankName,
        v.accountNumber,
        v.ifscCode,
        v.postalCode,
        ...(v.clients || []).flatMap((c) => [c.name, c.contactNumber]),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(searchTerm.toLowerCase());
    });
    if (!sortConfig.key || !sortConfig.direction) return filtered;
    const sorted = [...filtered].sort((a, b) => {
      let aVal = a[sortConfig.key] ?? "";
      let bVal = b[sortConfig.key] ?? "";
      if (typeof aVal === "string") {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }
      if (aVal > bVal) return 1;
      if (aVal < bVal) return -1;
      return 0;
    });
    return sortConfig.direction === "desc" ? sorted.reverse() : sorted;
  }, [vendors, searchTerm, sortConfig]);

  const exportToExcel = () => {
    const data = displayedVendors.map((v) => ({
      "Vendor Name": v.vendorName,
      Company: v.vendorCompany,
      "Brand Dealing": v.brandDealing,
      Location: v.location,
      "Postal Code": v.postalCode,
      "Contact Person":
        v.clients?.map((c) => `${c.name} | ${c.contactNumber}`).join(", ") ||
        "-",
      GST: v.gst,
      "Bank Name": v.bankName,
      "Account Number": v.accountNumber,
      "IFSC Code": v.ifscCode,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Vendors");
    XLSX.writeFile(workbook, "Vendors.xlsx");
  };

  const dropdownStyle = {
    backgroundColor: "transparent",
    border: "none",
    boxShadow: "none",
    padding: "0",
  };

  const dropdownMenuStyle = {
    minWidth: "120px",
    padding: "0",
    borderRadius: "4px",
    border: "1px solid #e2e8f0",
  };

  const dropdownItemStyle = {
    fontSize: "0.875rem",
    padding: "0.5rem 1rem",
    color: "#4a5568",
    transition: "all 0.2s ease",
    cursor: "pointer",
  };

  const dropdownEditStyle = {
    ...dropdownItemStyle,
    backgroundColor : "white",
    "&:hover": {
      backgroundColor: "#EDF2F7",
      color: "#2D3748",
    },
  };

  const dropdownDeleteStyle = {
    ...dropdownItemStyle,
    color: "#e53e3e",
    backgroundColor : "white",
    "&:hover": {
      backgroundColor: "#FED7D7",
      color: "#C53030",
    },
  };

  if (loading) return <div className="p-6 text-xs">Loading...</div>;
  if (error) return <div className="p-6 text-xs text-red-600">{error}</div>;

  return (
    <div className="p-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-center mb-4 space-y-2 sm:space-y-0">
        <h1 className="text-lg font-bold">Manage Vendors</h1>
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="text"
            placeholder="Search vendors..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-2 py-1 rounded text-xs"
          />
          <button
            onClick={openModal}
            className="bg-orange-500 text-white px-3 py-1 rounded"
          >
            Add Vendor
          </button>
          <button
            onClick={openBulkModal}
            className="bg-green-500 text-white px-3 py-1 rounded"
          >
            Bulk Upload
          </button>
          {(isSuperAdmin || canExportPurchase) && (
            <button
              onClick={exportToExcel}
              className="bg-blue-500 text-white px-3 py-1 rounded"
            >
              Export to Excel
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full border-collapse border border-gray-200">
          <thead>
            <tr className="bg-gray-50 text-left">
              <th
                onClick={() => handleSort("vendorName")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                WhatsApp Group
                <SortIndicator field="vendorName" />
              </th>
              <th
                onClick={() => handleSort("vendorCompany")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                Company
                <SortIndicator field="vendorCompany" />
              </th>
              <th
                onClick={() => handleSort("brandDealing")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                Brand
                <SortIndicator field="brandDealing" />
              </th>
              <th
                onClick={() => handleSort("location")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                Location
                <SortIndicator field="location" />
              </th>
              <th
                onClick={() => handleSort("postalCode")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                Postal Code
                <SortIndicator field="postalCode" />
              </th>
              <th className="p-2 border border-gray-200">Contact Person</th>
              <th
                onClick={() => handleSort("gst")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                GST#
                <SortIndicator field="gst" />
              </th>
              <th
                onClick={() => handleSort("bankName")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                Bank
                <SortIndicator field="bankName" />
              </th>
              <th
                onClick={() => handleSort("accountNumber")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                A/C No.
                <SortIndicator field="accountNumber" />
              </th>
              <th
                onClick={() => handleSort("ifscCode")}
                className="p-2 cursor-pointer border border-gray-200"
              >
                IFSC
                <SortIndicator field="ifscCode" />
              </th>
              <th className="p-2 border border-gray-200">Actions</th>
            </tr>
          </thead>
          <tbody>
            {displayedVendors.map((v) => (
              <tr key={v._id} className="hover:bg-gray-50">
                <td className="p-2 border border-gray-200">{v.vendorName}</td>
                <td className="p-2 border border-gray-200">{v.vendorCompany}</td>
                <td className="p-2 border border-gray-200">{v.brandDealing}</td>
                <td className="p-2 border border-gray-200">{v.location}</td>
                <td className="p-2 border border-gray-200">{v.postalCode}</td>
                <td className="p-2 border border-gray-200">
                  {v.clients?.length ? (
                    <ul>
                      {v.clients.map((c, i) => (
                        <li key={i}>
                          {c.name} | {c.contactNumber}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    "-"
                  )}
                </td>
                <td className="p-2 border border-gray-200">{v.gst}</td>
                <td className="p-2 border border-gray-200">{v.bankName}</td>
                <td className="p-2 border border-gray-200">{v.accountNumber}</td>
                <td className="p-2 border border-gray-200">{v.ifscCode}</td>
                <td className="p-2 border border-gray-200">
                  <Dropdown>
                    <Dropdown.Toggle
                      variant="link"
                      id={`dropdown-actions-${v._id}`}
                      className="text-gray-500 hover:text-gray-800"
                      style={dropdownStyle}
                    >
                      <FaEllipsisV />
                    </Dropdown.Toggle>
                    <Dropdown.Menu style={dropdownMenuStyle}>
                      <Dropdown.Item
                        onClick={() => openEditModal(v)}
                        style={dropdownEditStyle}
                        className="bg-grey-100 hover:bg-gray-100 "
                      >
                        Edit
                      </Dropdown.Item>
                      <Dropdown.Item
                        onClick={() => handleDelete(v._id)}
                        style={dropdownDeleteStyle}
                        className="hover:bg-red-100"
                      >
                        Delete
                      </Dropdown.Item>
                    </Dropdown.Menu>
                  </Dropdown>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Upload Modal */}
      {showBulkModal && (
        <VendorUploader
          mode="create"
          vendor={null}
          onClose={() => setShowBulkModal(false)}
          onSuccess={() => {
            setShowBulkModal(false);
            fetchVendors();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}

      {/* Add/Edit Vendor Modal */}
      {modalOpen && (
        <VendorAdd
          mode={modalMode}
          vendor={selectedVendor}
          onClose={() => setModalOpen(false)}
          onSuccess={() => {
            setModalOpen(false);
            fetchVendors();
          }}
          BACKEND_URL={BACKEND_URL}
        />
      )}
    </div>
  );
};