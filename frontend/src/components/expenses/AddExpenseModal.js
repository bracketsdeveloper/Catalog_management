import React, { useState, useEffect } from "react";
import axios from "axios";

const SAMPLE_SECTIONS = [
  "Sample Product Cost",
  "Sample Branding Cost",
  "Sample Logistics",
  "Additional Overheads",
  "Sample Lost",
  "Damages",
];
const FULL_ORDER_SECTIONS = [
  "Product Cost",
  "Branding Cost",
  "Logistics",
  "Packaging Cost",
  "OT Cost",
  "Success Fee",
  "Additional Qty Ordered",
  "Damages",
  "Any Additional Expenses",
];
const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function AddExpenseModal({ expense, onClose }) {
  const isEdit = Boolean(expense);

  // Determine permissions
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const ORDER_SECTIONS = isSuperAdmin
    ? FULL_ORDER_SECTIONS
    : permissions.includes("manage-expenses")
    ? FULL_ORDER_SECTIONS.filter(
        (s) => s !== "Product Cost" && s !== "Branding Cost" && s !== "Success Fee"
      )
    : FULL_ORDER_SECTIONS;

  // Auto-fill fields
  const [opptyCode, setOpptyCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({
    clientCompanyName: "",
    clientName: "",
    eventName: "",
    crmName: "",
  });

  // Expense rows
  const [expenses, setExpenses] = useState([]);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [jobSheetNumber, setJobSheetNumber] = useState("");
  const [jsSuggestions, setJsSuggestions] = useState([]);
  const [orderExpenses, setOrderExpenses] = useState([]);
  const [invoiceData, setInvoiceData] = useState(null);

  // Fetch invoice data when jobSheetNumber changes (for super admins)
  useEffect(() => {
    if (!isSuperAdmin || !jobSheetNumber || !orderConfirmed) {
      setInvoiceData(null);
      return;
    }

    const fetchInvoices = async () => {
      try {
        // Fetch PurchaseInvoices
        const purchaseRes = await axios.get(`${BACKEND}/api/admin/purchaseInvoice`, {
          params: { jobSheetNumber },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log(`PurchaseInvoices for ${jobSheetNumber}:`, purchaseRes.data); // Debug log

        // Fetch ProductionJobSheetInvoices
        const productionRes = await axios.get(`${BACKEND}/api/admin/productionjobsheetinvoice`, {
          params: { jobSheet: jobSheetNumber },
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        });
        console.log(`ProductionJobSheetInvoices request params:`, { jobSheet: jobSheetNumber }); // Debug log
        console.log(`ProductionJobSheetInvoices for ${jobSheetNumber}:`, productionRes.data); // Debug log

        const newInvoiceData = {
          purchaseInvoices: purchaseRes.data || [],
          productionInvoices: productionRes.data || [],
        };
        setInvoiceData(newInvoiceData);
        console.log("Updated invoiceData:", newInvoiceData); // Debug log
      } catch (error) {
        console.error(`Error fetching invoices for jobSheetNumber ${jobSheetNumber}:`, error);
        setInvoiceData({ purchaseInvoices: [], productionInvoices: [] });
      }
    };

    fetchInvoices();
  }, [jobSheetNumber, isSuperAdmin, orderConfirmed]);

  // Auto-fill Product Cost and Branding Cost for super admins
  useEffect(() => {
    if (!isSuperAdmin || !invoiceData || !orderConfirmed) {
      // Remove Product Cost and Branding Cost if conditions aren't met
      setOrderExpenses((prev) =>
        prev.filter((item) => item.section !== "Product Cost" && item.section !== "Branding Cost")
      );
      return;
    }

    const productCost = invoiceData.purchaseInvoices.reduce((total, inv) => {
      const qty = Number(inv.qtyRequired) || 0;
      const cost = Number(inv.negotiatedCost) || 0;
      return total + qty * cost;
    }, 0);
    console.log(`Product Cost for ${jobSheetNumber}:`, productCost); // Debug log

    const brandingCost = invoiceData.productionInvoices.reduce((total, inv) => {
      const qty = Number(inv.qtyRequired) || 0;
      const cost = Number(inv.negotiatedCost) || 0;
      const itemCost = qty * cost;
      console.log(
        `Branding Cost for product ${inv.product} (Qty: ${qty}, Cost: ${cost}):`,
        itemCost
      ); // Debug log
      return total + itemCost;
    }, 0);
    console.log(`Total Branding Cost for ${jobSheetNumber}:`, brandingCost); // Debug log

    // Update orderExpenses to include or update Product Cost and Branding Cost
    setOrderExpenses((prev) => {
      let updated = prev.filter(
        (item) => item.section !== "Product Cost" && item.section !== "Branding Cost"
      );

      if (productCost > 0) {
        updated.push({
          section: "Product Cost",
          amount: productCost,
          expenseDate: new Date().toISOString().slice(0, 10),
          remarks: "Auto-filled from Purchase Invoices",
        });
      }

      if (brandingCost > 0) {
        updated.push({
          section: "Branding Cost",
          amount: brandingCost,
          expenseDate: new Date().toISOString().slice(0, 10),
          remarks: "Auto-filled from Production Job Sheet Invoices",
        });
      }

      return updated;
    });
  }, [invoiceData, isSuperAdmin, orderConfirmed]);

  // On mount or when editing, populate and convert dates
  useEffect(() => {
    if (!isEdit) return;

    setOpptyCode(expense.opportunityCode);
    setForm({
      clientCompanyName: expense.clientCompanyName,
      clientName: expense.clientName,
      eventName: expense.eventName,
      crmName: expense.crmName,
    });

    setExpenses(
      expense.expenses.map((item) => ({
        ...item,
        expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : "",
      }))
    );

    setOrderConfirmed(expense.orderConfirmed);
    setJobSheetNumber(expense.jobSheetNumber || "");

    // Filter order expenses to only include allowed sections
    setOrderExpenses(
      expense.orderExpenses
        .filter((item) => ORDER_SECTIONS.includes(item.section))
        .map((item) => ({
          ...item,
          expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : "",
        }))
    );
  }, [expense, isEdit, ORDER_SECTIONS]);

  // Fetch opportunity suggestions
  useEffect(() => {
    if (!opptyCode) return;
    axios
      .get(`${BACKEND}/api/admin/opportunities?searchTerm=${encodeURIComponent(opptyCode)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => setSuggestions(r.data))
      .catch(() => {});
  }, [opptyCode]);

  const pickOpp = (o) => {
    setOpptyCode(o.opportunityCode);
    setForm({
      clientCompanyName: o.account,
      clientName: o.contact,
      eventName: o.opportunityName,
      crmName: o.opportunityOwner,
    });
    setSuggestions([]);
  };

  // Fetch jobsheet suggestions
  useEffect(() => {
    if (!jobSheetNumber) return;
    axios
      .get(`${BACKEND}/api/admin/jobsheets?searchTerm=${encodeURIComponent(jobSheetNumber)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((r) => setJsSuggestions(r.data))
      .catch(() => {});
  }, [jobSheetNumber]);

  const pickJS = (j) => {
    setJobSheetNumber(j.jobSheetNumber);
    setJsSuggestions([]);
  };

  // Row helpers
  const addRow = (list, setList) => {
    const newRow = { section: "", amount: "", expenseDate: "", remarks: "" };
    setList((prev) => {
      const updatedList = [...prev, newRow];
      console.log("Added row to list:", updatedList); // Debug log
      return updatedList;
    });
  };

  const updateRow = (list, setList, idx, field, val) => {
    const updatedList = [...list];
    updatedList[idx][field] = val;
    setList(updatedList);
    console.log(`Updated row ${idx} in list:`, updatedList); // Debug log
  };

  const removeRow = (list, setList, idx) => {
    const updatedList = list.filter((_, i) => i !== idx);
    setList(updatedList);
    console.log(`Removed row ${idx} from list:`, updatedList); // Debug log
  };

  // Submit handler
  const handleSubmit = async () => {
    const payload = {
      opportunityCode: opptyCode,
      ...form,
      expenses,
      orderConfirmed,
      jobSheetNumber,
      orderExpenses,
    };
    const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    if (isEdit) {
      await axios.put(`${BACKEND}/api/admin/expenses/${expense._id}`, payload, config);
    } else {
      await axios.post(`${BACKEND}/api/admin/expenses`, payload, config);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-2xl p-6 rounded shadow-lg overflow-auto max-h-full">
        <h2 className="text-lg font-bold mb-4">{isEdit ? "Edit" : "Add"} Expenses</h2>

        {/* Opportunity selector */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-medium">Opportunity #</label>
            <input
              value={opptyCode}
              onChange={(e) => setOpptyCode(e.target.value)}
              className="w-full border p-2 rounded text-xs"
            />
            {suggestions.length > 0 && (
              <ul className="border rounded bg-white mt-1 max-h-32 overflow-auto text-xs">
                {suggestions.map((o) => (
                  <li
                    key={o._id}
                    onClick={() => pickOpp(o)}
                    className="p-2 hover:bg-gray-100 cursor-pointer"
                  >
                    {o.opportunityCode} — {o.opportunityName}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium">Client Company</label>
            <input
              readOnly
              value={form.clientCompanyName}
              className="w-full border p-2 rounded bg-gray-100 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Client Name</label>
            <input
              readOnly
              value={form.clientName}
              className="w-full border p-2 rounded bg-gray-100 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">Event Name</label>
            <input
              readOnly
              value={form.eventName}
              className="w-full border p-2 rounded bg-gray-100 text-xs"
            />
          </div>
          <div>
            <label className="block text-xs font-medium">CRM Name</label>
            <input
              readOnly
              value={form.crmName}
              className="w-full border p-2 rounded bg-gray-100 text-xs"
            />
          </div>
        </div>

        {/* Sample expenses */}
        <div className="mb-4">
          <button
            onClick={() => addRow(expenses, setExpenses)}
            className="bg-blue-500 text-white px-3 py-1 rounded text-xs mb-2"
          >
            + Add Expense
          </button>
          {expenses.length === 0 && (
            <p className="text-xs text-gray-500">No sample expenses added.</p>
          )}
          {expenses.map((it, i) => (
            <div key={i} className="flex gap-2 mb-2 text-xs">
              <select
                value={it.section}
                onChange={(e) => updateRow(expenses, setExpenses, i, "section", e.target.value)}
                className="border p-1 rounded flex-1"
              >
                <option value="">Select</option>
                {SAMPLE_SECTIONS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={it.amount}
                onChange={(e) => updateRow(expenses, setExpenses, i, "amount", e.target.value)}
                className="border p-1 rounded w-20"
              />
              <input
                type="date"
                value={it.expenseDate}
                onChange={(e) => updateRow(expenses, setExpenses, i, "expenseDate", e.target.value)}
                className="border p-1 rounded w-32"
              />
              <input
                placeholder="Remarks"
                value={it.remarks}
                onChange={(e) => updateRow(expenses, setExpenses, i, "remarks", e.target.value)}
                className="border p-1 rounded flex-1"
              />
              <button
                onClick={() => removeRow(expenses, setExpenses, i)}
                className="text-red-600 px-1"
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Order confirmed */}
        <div className="mt-4 text-xs">
          <label className="font-medium">Order Confirmed</label>
          <select
            value={orderConfirmed ? "yes" : "no"}
            onChange={(e) => setOrderConfirmed(e.target.value === "yes")}
            className="border p-1 rounded ml-2 text-xs"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {orderConfirmed && (
          <>
            <div className="mt-4 text-xs">
              <label className="block">JobSheet #</label>
              <input
                value={jobSheetNumber}
                onChange={(e) => setJobSheetNumber(e.target.value)}
                className="w-full border p-2 rounded text-xs"
              />
              {jsSuggestions.length > 0 && (
                <ul className="border rounded bg-white mt-1 max-h-32 overflow-auto text-xs">
                  {jsSuggestions.map((j) => (
                    <li
                      key={j._id}
                      onClick={() => pickJS(j)}
                      className="p-2 hover:bg-gray-100 cursor-pointer"
                    >
                      {j.jobSheetNumber} — {j.eventName}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="mt-4">
              <button
                onClick={() => addRow(orderExpenses, setOrderExpenses)}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs my-2"
              >
                + Add Order Expense
              </button>
              {orderExpenses.length === 0 && (
                <p className="text-xs text-gray-500">No order expenses added.</p>
              )}
              {orderExpenses.map((it, i) => (
                <div key={i} className="flex gap-2 mb-2 text-xs">
                  <select
                    value={it.section}
                    onChange={(e) => updateRow(orderExpenses, setOrderExpenses, i, "section", e.target.value)}
                    className="border p-1 rounded flex-1"
                    disabled={it.section === "Product Cost" || it.section === "Branding Cost"}
                  >
                    <option value="">Select</option>
                    {ORDER_SECTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Amount"
                    value={it.amount}
                    onChange={(e) => updateRow(orderExpenses, setOrderExpenses, i, "amount", e.target.value)}
                    className="border p-1 rounded w-20"
                    readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                  />
                  <input
                    type="date"
                    value={it.expenseDate}
                    onChange={(e) => updateRow(orderExpenses, setOrderExpenses, i, "expenseDate", e.target.value)}
                    className="border p-1 rounded w-32"
                    readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                  />
                  <input
                    placeholder="Remarks"
                    value={it.remarks}
                    onChange={(e) => updateRow(orderExpenses, setOrderExpenses, i, "remarks", e.target.value)}
                    className="border p-1 rounded flex-1"
                    readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                  />
                  <button
                    onClick={() => removeRow(orderExpenses, setOrderExpenses, i)}
                    className="text-red-600 px-1"
                    disabled={it.section === "Product Cost" || it.section === "Branding Cost"}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Actions */}
        <div className="flex justify-end mt-6 space-x-2">
          <button onClick={onClose} className="px-4 py-2 border rounded text-xs">
            Cancel
          </button>
          <button onClick={handleSubmit} className="px-4 py-2 bg-green-600 text-white rounded text-xs">
            {isEdit ? "Update" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}