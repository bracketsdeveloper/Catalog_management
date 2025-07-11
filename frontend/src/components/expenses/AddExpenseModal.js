import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import debounce from "lodash/debounce";

const SAMPLE_SECTIONS = [
  "Sample Product Cost",
  "Sample Branding Cost",
  "Sample Logistics",
  "Additional Overheads",
  "Sample Lost",
  "Damages"
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
  "Any Additional Expenses"
];
const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function AddExpenseModal({ expense, onClose }) {
  const isEdit = Boolean(expense);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const ORDER_SECTIONS = isSuperAdmin
    ? FULL_ORDER_SECTIONS
    : FULL_ORDER_SECTIONS.filter(
        s => s !== "Product Cost" && s !== "Branding Cost" && s !== "Success Fee"
      );

  const [opptyCode, setOpptyCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [form, setForm] = useState({
    clientCompanyName: "",
    clientName: "",
    eventName: "",
    crmName: ""
  });
  const [expenses, setExpenses] = useState([]);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [jobSheets, setJobSheets] = useState([]);

  // Populate form for editing
  useEffect(() => {
    if (!isEdit) return;

    setOpptyCode(expense.opportunityCode);
    setForm({
      clientCompanyName: expense.clientCompanyName,
      clientName: expense.clientName,
      eventName: expense.eventName,
      crmName: expense.crmName
    });
    setExpenses(
      expense.expenses.map(item => ({
        ...item,
        expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : ""
      }))
    );
    setOrderConfirmed(expense.orderConfirmed);
    setJobSheets(
      expense.jobSheets?.length
        ? expense.jobSheets.map(js => ({
            jobSheetNumber: js.jobSheetNumber,
            orderExpenses: js.orderExpenses
              .filter(item => ORDER_SECTIONS.includes(item.section))
              .map(item => ({
                ...item,
                expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : ""
              })),
            jsSuggestions: [],
            invoiceData: null
          }))
        : []
    );
  }, [expense, isEdit, ORDER_SECTIONS]);

  // Clear jobSheets when orderConfirmed is toggled off
  useEffect(() => {
    if (!orderConfirmed) {
      setJobSheets([]);
    } else if (jobSheets.length === 0) {
      setJobSheets([{ jobSheetNumber: "", orderExpenses: [], jsSuggestions: [], invoiceData: null }]);
    }
  }, [orderConfirmed, jobSheets.length]);

  // Fetch opportunity suggestions
  useEffect(() => {
    if (!opptyCode) return;
    axios
      .get(`${BACKEND}/api/admin/opportunities?searchTerm=${encodeURIComponent(opptyCode)}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(r => setSuggestions(r.data))
      .catch(() => {});
  }, [opptyCode]);

  const pickOpp = o => {
    setOpptyCode(o.opportunityCode);
    setForm({
      clientCompanyName: o.account,
      clientName: o.contact,
      eventName: o.opportunityName,
      crmName: o.opportunityOwner
    });
    setSuggestions([]);
  };

  // Debounced fetch for jobsheet suggestions and invoice data
  const fetchJsSuggestions = useCallback(
    debounce(async (index, jobSheetNumber) => {
      if (!jobSheetNumber) {
        setJobSheets(js => {
          const newJs = [...js];
          newJs[index].jsSuggestions = [];
          newJs[index].invoiceData = null;
          return newJs;
        });
        return;
      }

      try {
        const res = await axios.get(
          `${BACKEND}/api/admin/jobsheets?searchTerm=${encodeURIComponent(jobSheetNumber)}`,
          { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
        );
        setJobSheets(js => {
          const newJs = [...js];
          newJs[index].jsSuggestions = res.data;
          return newJs;
        });
      } catch (error) {
        console.error(`Error fetching jobsheet suggestions for ${jobSheetNumber}:`, error);
      }

      // Fetch invoice data for super admins
      if (isSuperAdmin && orderConfirmed) {
        try {
          const purchaseRes = await axios.get(`${BACKEND}/api/admin/purchaseInvoice`, {
            params: { jobSheetNumber },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });
          const productionRes = await axios.get(`${BACKEND}/api/admin/productionjobsheetinvoice`, {
            params: { jobSheet: jobSheetNumber },
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          });

          const newInvoiceData = {
            purchaseInvoices: purchaseRes.data || [],
            productionInvoices: productionRes.data || []
          };

          setJobSheets(js => {
            const newJs = [...js];
            newJs[index].invoiceData = newInvoiceData;
            return newJs;
          });
        } catch (error) {
          console.error(`Error fetching invoices for jobSheetNumber ${jobSheetNumber}:`, error);
          setJobSheets(js => {
            const newJs = [...js];
            newJs[index].invoiceData = { purchaseInvoices: [], productionInvoices: [] };
            return newJs;
          });
        }
      }
    }, 500),
    [isSuperAdmin, orderConfirmed]
  );

  const pickJS = (index, j) => {
    setJobSheets(js => {
      const newJs = [...js];
      newJs[index].jobSheetNumber = j.jobSheetNumber;
      newJs[index].jsSuggestions = [];
      return newJs;
    });
    fetchJsSuggestions(index, j.jobSheetNumber);
  };

  // Auto-fill Product Cost and Branding Cost for each jobsheet
  useEffect(() => {
    if (!isSuperAdmin || !orderConfirmed) {
      setJobSheets(js => js.map(j => ({
        ...j,
        orderExpenses: j.orderExpenses.filter(
          item => item.section !== "Product Cost" && item.section !== "Branding Cost"
        )
      })));
      return;
    }

    setJobSheets(js => js.map((j, index) => {
      if (!j.invoiceData) return j;

      const productCost = j.invoiceData.purchaseInvoices.reduce((total, inv) => {
        const qty = Number(inv.qtyRequired) || 0;
        const cost = Number(inv.negotiatedCost) || 0;
        return total + qty * cost;
      }, 0);

      const brandingCost = j.invoiceData.productionInvoices.reduce((total, inv) => {
        const qty = Number(inv.qtyRequired) || 0;
        const cost = Number(inv.negotiatedCost) || 0;
        return total + qty * cost;
      }, 0);

      let updatedOrderExpenses = j.orderExpenses.filter(
        item => item.section !== "Product Cost" && item.section !== "Branding Cost"
      );

      if (productCost > 0) {
        updatedOrderExpenses.push({
          section: "Product Cost",
          amount: productCost,
          expenseDate: new Date().toISOString().slice(0, 10),
          remarks: "Auto-filled from Purchase Invoices"
        });
      }

      if (brandingCost > 0) {
        updatedOrderExpenses.push({
          section: "Branding Cost",
          amount: brandingCost,
          expenseDate: new Date().toISOString().slice(0, 10),
          remarks: "Auto-filled from Production Job Sheet Invoices"
        });
      }

      return { ...j, orderExpenses: updatedOrderExpenses };
    }));
  }, [jobSheets, isSuperAdmin, orderConfirmed]);

  // Row helpers
  const addRow = (list, setList) => setList([...list, { section: "", amount: "", expenseDate: "", remarks: "" }]);
  const updateRow = (list, setList, idx, field, val) => {
    const a = [...list];
    a[idx][field] = val;
    setList(a);
  };
  const removeRow = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));

  // Jobsheet helpers
  const addJobSheet = () => setJobSheets([...jobSheets, { jobSheetNumber: "", orderExpenses: [], jsSuggestions: [], invoiceData: null }]);
  const updateJobSheetNumber = (index, value) => {
    if (jobSheets.some((js, i) => i !== index && js.jobSheetNumber === value && value !== "")) {
      alert("JobSheet number must be unique");
      return;
    }
    setJobSheets(js => {
      const newJs = [...js];
      newJs[index].jobSheetNumber = value;
      return newJs;
    });
    fetchJsSuggestions(index, value);
  };
  const removeJobSheet = index => setJobSheets(js => js.filter((_, i) => i !== index));

  // Submit handler
  const handleSubmit = async () => {
    // Validate required fields
    if (!opptyCode || !form.clientCompanyName || !form.clientName) {
      alert("Please fill in Opportunity #, Client Company, and Client Name");
      return;
    }

    // Validate expenses
    for (const item of expenses) {
      if (!item.section || item.amount == null || !item.expenseDate) {
        alert("All expenses must have section, amount, and date");
        return;
      }
    }

    // Validate jobSheets if orderConfirmed
    if (orderConfirmed) {
      if (!jobSheets.length) {
        alert("At least one job sheet is required when order is confirmed");
        return;
      }
      for (const js of jobSheets) {
        if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
          alert("All job sheets must have a non-empty job sheet number");
          return;
        }
        for (const item of js.orderExpenses) {
          if (!item.section || item.amount == null || !item.expenseDate) {
            alert("All order expenses must have section, amount, and date");
            return;
          }
        }
      }
    }

    const payload = {
      opportunityCode: opptyCode,
      ...form,
      expenses,
      orderConfirmed,
      jobSheets: orderConfirmed ? jobSheets.map(js => ({
        jobSheetNumber: js.jobSheetNumber,
        orderExpenses: js.orderExpenses
      })) : []
    };
    const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
    try {
      console.log("Submitting payload:", JSON.stringify(payload, null, 2));
      if (isEdit) {
        await axios.put(`${BACKEND}/api/admin/expenses/${expense._id}`, payload, config);
      } else {
        await axios.post(`${BACKEND}/api/admin/expenses`, payload, config);
      }
      onClose();
    } catch (error) {
      console.error("Error saving expense:", error);
      alert(`Failed to save expense: ${error.response?.data?.message || error.message}`);
    }
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
              onChange={e => setOpptyCode(e.target.value)}
              className="w-full border p-2 rounded text-xs"
            />
            {suggestions.length > 0 && (
              <ul className="border rounded bg-white mt-1 max-h-32 overflow-auto text-xs">
                {suggestions.map(o => (
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
        <button
          onClick={() => addRow(expenses, setExpenses)}
          className="bg-blue-500 text-white px-3 py-1 rounded text-xs mb-2"
        >
          + Add Expense
        </button>
        {expenses.map((it, i) => (
          <div key={i} className="flex gap-2 mb-2 text-xs">
            <select
              value={it.section}
              onChange={e => updateRow(expenses, setExpenses, i, "section", e.target.value)}
              className="border p-1 rounded flex-1"
            >
              <option value="">Select</option>
              {SAMPLE_SECTIONS.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input
              type="number"
              placeholder="Amount"
              value={it.amount}
              onChange={e => updateRow(expenses, setExpenses, i, "amount", e.target.value)}
              className="border p-1 rounded w-20"
            />
            <input
              type="date"
              value={it.expenseDate}
              onChange={e => updateRow(expenses, setExpenses, i, "expenseDate", e.target.value)}
              className="border p-1 rounded w-32"
            />
            <input
              placeholder="Remarks"
              value={it.remarks}
              onChange={e => updateRow(expenses, setExpenses, i, "remarks", e.target.value)}
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

        {/* Order confirmed */}
        <div className="mt-4 text-xs">
          <label className="font-medium">Order Confirmed</label>
          <select
            value={orderConfirmed ? "yes" : "no"}
            onChange={e => setOrderConfirmed(e.target.value === "yes")}
            className="border p-1 rounded ml-2 text-xs"
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {orderConfirmed && (
          <>
            <button
              onClick={addJobSheet}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs my-2"
            >
              + Add JobSheet
            </button>
            {jobSheets.map((js, index) => (
              <div key={index} className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center">
                  <div className="text-xs">
                    <label className="block">JobSheet #{index + 1}</label>
                    <input
                      value={js.jobSheetNumber}
                      onChange={e => updateJobSheetNumber(index, e.target.value)}
                      className="w-full border p-2 rounded text-xs"
                    />
                    {js.jsSuggestions.length > 0 && (
                      <ul className="border rounded bg-white mt-1 max-h-32 overflow-auto text-xs">
                        {js.jsSuggestions.map(j => (
                          <li
                            key={j._id}
                            onClick={() => pickJS(index, j)}
                            className="p-2 hover:bg-gray-100 cursor-pointer"
                          >
                            {j.jobSheetNumber} — {j.eventName}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {jobSheets.length > 1 && (
                    <button
                      onClick={() => removeJobSheet(index)}
                      className="text-red-600 px-1 text-xs"
                    >
                      Remove JobSheet
                    </button>
                  )}
                </div>
                <button
                  onClick={() => {
                    setJobSheets(jsList => {
                      const newJs = [...jsList];
                      addRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps);
                      return newJs;
                    });
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs my-2"
                >
                  + Add Order Expense
                </button>
                {js.orderExpenses.map((it, i) => (
                  <div key={i} className="flex gap-2 mb-2 text-xs">
                    <select
                      value={it.section}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          updateRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps, i, "section", e.target.value);
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded flex-1"
                      disabled={it.section === "Product Cost" || it.section === "Branding Cost"}
                    >
                      <option value="">Select</option>
                      {ORDER_SECTIONS.map(s => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      placeholder="Amount"
                      value={it.amount}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          updateRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps, i, "amount", e.target.value);
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded w-20"
                      readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                    />
                    <input
                      type="date"
                      value={it.expenseDate}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          updateRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps, i, "expenseDate", e.target.value);
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded w-32"
                      readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                    />
                    <input
                      placeholder="Remarks"
                      value={it.remarks}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          updateRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps, i, "remarks", e.target.value);
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded flex-1"
                      readOnly={it.section === "Product Cost" || it.section === "Branding Cost"}
                    />
                    <button
                      onClick={() => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          removeRow(newJs[index].orderExpenses, exps => newJs[index].orderExpenses = exps, i);
                          return newJs;
                        });
                      }}
                      className="text-red-600 px-1"
                      disabled={it.section === "Product Cost" || it.section === "Branding Cost"}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </>
        )}

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