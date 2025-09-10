import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams, useNavigate } from "react-router-dom";
import EditInvoiceModal from "../components/invoices/EditInvoiceModal.jsx";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function InvoiceEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [invoice, setInvoice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let mounted = true;
    setLoading(true);
    axios
      .get(`${BACKEND_URL}/api/admin/invoices/${id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => {
        if (mounted) {
          setInvoice(r.data);
          setLoading(false);
        }
      })
      .catch((e) => {
        if (mounted) {
          setError(e.response?.data?.message || e.message);
          setLoading(false);
        }
      });
    return () => (mounted = false);
  }, [id]);

  const handleSave = async (patch) => {
    setSaving(true);
    setError("");
    try {
      await axios.put(`${BACKEND_URL}/api/admin/invoices/${id}`, patch, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      navigate("/admin-dashboard/manage-invoices");
    } catch (e) {
      setError(e.response?.data?.message || e.message);
    } finally {
      setSaving(false);
    }
  };

  // Generate Delivery Challan from current invoice
  const handleGenerateDeliveryChallan = async () => {
    try {
      setSaving(true);
      const res = await axios.post(
        `${BACKEND_URL}/api/admin/invoices/${id}/generate-delivery-challan`,
        {},
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const dc = res.data.deliveryChallan;
      const updatedInv = res.data.invoice;
      alert(`Delivery Challan created: ${dc.dcNumber}`);
      setInvoice(updatedInv || invoice);
      navigate(`/admin-dashboard/manage-dc`);
    } catch (e) {
      alert(`Failed to create Delivery Challan: ${e.response?.data?.message || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  // Delete linked Delivery Challan (with confirmation)
  const handleDeleteDeliveryChallan = async () => {
    const dcNumber = invoice?.deliveryChallanNumber;
    if (!dcNumber) return;

    const ok = window.confirm(
      `Are you sure you want to delete Delivery Challan ${dcNumber}? This cannot be undone.`
    );
    if (!ok) return;

    try {
      setSaving(true);
      const res = await axios.delete(
        `${BACKEND_URL}/api/admin/invoices/${id}/delete-delivery-challan`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      const updatedInv = res.data?.invoice;
      setInvoice(updatedInv || { ...invoice, deliveryChallanNumber: null });
      alert(`Delivery Challan ${dcNumber} deleted`);
    } catch (e) {
      alert(`Failed to delete Delivery Challan: ${e.response?.data?.message || e.message}`);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm">Loading invoice…</div>;
  }
  if (!invoice) {
    return (
      <div className="p-6 text-sm text-red-600">
        Failed to load invoice. {error && <span>({error})</span>}
      </div>
    );
  }

  const hasDC = !!invoice.deliveryChallanNumber;

  return (
    <div className="p-4 space-y-4">
      {/* Top bar actions */}
      <div className="flex items-center justify-between">
        <div className="text-sm text-gray-700">
          <div>
            <span className="font-semibold">Invoice #:</span>{" "}
            {invoice.invoiceDetails?.invoiceNumber}
          </div>
          {hasDC && (
            <div className="mt-1">
              <span className="font-semibold">Linked DC #:</span>{" "}
              {invoice.deliveryChallanNumber}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {!hasDC ? (
            <button
              onClick={handleGenerateDeliveryChallan}
              disabled={saving}
              className="bg-orange-600 hover:bg-orange-700 disabled:opacity-60 text-white px-4 py-2 rounded text-xs"
              title="Generate a Delivery Challan from this invoice"
            >
              Generate Delivery Challan
            </button>
          ) : (
            <button
              onClick={handleDeleteDeliveryChallan}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 disabled:opacity-60 text-white px-4 py-2 rounded text-xs"
              title="Delete the linked Delivery Challan"
            >
              Delete Delivery Challan
            </button>
          )}
        </div>
      </div>

      <EditInvoiceModal
        invoice={invoice}
        saving={saving}
        error={error}
        onClose={() => navigate("/admin-dashboard/manage-invoices")}
        onSave={handleSave}
      />
    </div>
  );
}
