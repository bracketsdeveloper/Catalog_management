import React, { useState, useEffect } from "react";
import axios from "axios";

const SAMPLE_SECTIONS = [
  "Sample Product Cost",
  "Sample Branding Cost",
  "Sample Logistics",
  "Additional Overheads",
  "Sample Lost",
  "Damages"
];
const ORDER_SECTIONS = [
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

export default function AddExpenseModal({ expense, onClose, isLoading }) {
  const isEdit = Boolean(expense);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  const [opptyCode, setOpptyCode] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [form, setForm] = useState({
    clientCompanyName: "",
    clientName: "",
    eventName: "",
    crmName: ""
  });
  const [expenses, setExpenses] = useState([]);
  const [orderConfirmed, setOrderConfirmed] = useState(false);
  const [jobSheets, setJobSheets] = useState([{ jobSheetNumber: "", orderExpenses: [], jsSuggestions: [] }]);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      (expense.expenses || []).map(item => ({
        ...item,
        expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : "",
        damagedBy: item.damagedBy || ""
      }))
    );
    setOrderConfirmed(expense.orderConfirmed || false);
    setJobSheets(
      expense.jobSheets?.length
        ? expense.jobSheets.map(js => ({
            jobSheetNumber: js.jobSheetNumber || "",
            orderExpenses: (js.orderExpenses || []).map(item => ({
              ...item,
              expenseDate: item.expenseDate ? new Date(item.expenseDate).toISOString().slice(0, 10) : "",
              damagedBy: item.damagedBy || ""
            })),
            jsSuggestions: []
          }))
        : [{ jobSheetNumber: "", orderExpenses: [], jsSuggestions: [] }]
    );
  }, [expense, isEdit]);

  // Debounce fetch for opportunity suggestions
  useEffect(() => {
    const timer = setTimeout(() => {
      if (opptyCode.trim().length >= 2) {
        fetchOpportunities(opptyCode);
      } else {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [opptyCode]);

  const fetchOpportunities = async (searchTerm) => {
    try {
      const response = await axios.get(
        `${BACKEND}/api/admin/opportunities?searchTerm=${encodeURIComponent(searchTerm)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      setSuggestions(response.data);
      setShowSuggestions(response.data.length > 0);
    } catch (error) {
      console.error("Error fetching opportunities:", error);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Fetch jobsheet suggestions for each jobsheet
  const fetchJsSuggestions = async (index, jobSheetNumber) => {
    if (!jobSheetNumber || jobSheetNumber.trim().length < 2) {
      setJobSheets(js => {
        const newJs = [...js];
        newJs[index].jsSuggestions = [];
        return newJs;
      });
      return;
    }
    
    try {
      const response = await axios.get(
        `${BACKEND}/api/admin/jobsheets?searchTerm=${encodeURIComponent(jobSheetNumber)}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }
      );
      
      setJobSheets(js => {
        const newJs = [...js];
        newJs[index].jsSuggestions = response.data;
        return newJs;
      });
    } catch (error) {
      console.error("Error fetching jobsheets:", error);
      setJobSheets(js => {
        const newJs = [...js];
        newJs[index].jsSuggestions = [];
        return newJs;
      });
    }
  };

  const pickOpp = (o) => {
    setOpptyCode(o.opportunityCode);
    setForm({
      clientCompanyName: o.account,
      clientName: o.contact,
      eventName: o.opportunityName,
      crmName: o.opportunityOwner
    });
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const pickJS = (index, j) => {
    setJobSheets(js => {
      const newJs = [...js];
      newJs[index].jobSheetNumber = j.jobSheetNumber;
      newJs[index].jsSuggestions = [];
      return newJs;
    });
  };

  // Row helpers
  const addRow = (list, setList) =>
    setList([...list, { section: "", amount: "", expenseDate: "", remarks: "", damagedBy: "" }]);

  const updateRow = (list, setList, idx, field, val) => {
    const newList = [...list];
    newList[idx][field] = val;
    setList(newList);
  };

  const removeRow = (list, setList, idx) => setList(list.filter((_, i) => i !== idx));

  // Jobsheet helpers
  const addJobSheet = () =>
    setJobSheets([...jobSheets, { jobSheetNumber: "", orderExpenses: [], jsSuggestions: [] }]);

  const updateJobSheetNumber = (index, value) => {
    setJobSheets(js => {
      const newJs = [...js];
      newJs[index].jobSheetNumber = value;
      return newJs;
    });
    
    // Debounce the fetch
    const timer = setTimeout(() => {
      fetchJsSuggestions(index, value);
    }, 300);
    
    return () => clearTimeout(timer);
  };

  const removeJobSheet = index => setJobSheets(js => js.filter((_, i) => i !== index));

  const filteredOrderSections = isSuperAdmin
    ? ORDER_SECTIONS
    : ORDER_SECTIONS.filter(s => s !== "Product Cost" && s !== "Branding Cost");

  // Allow all sections, duplicates permitted
  const getAvailableSections = () => SAMPLE_SECTIONS;
  const getAvailableOrderSections = () => filteredOrderSections;

  // Submit handler with validation
  const handleSubmit = async () => {
    setError("");
    setIsSubmitting(true);

    try {
      // Validate required fields
      if (!opptyCode || !form.clientCompanyName || !form.clientName) {
        setError("Opportunity #, Client Company, and Client Name are required.");
        return;
      }
      if (opptyCode.trim() === "" || form.clientCompanyName.trim() === "" || form.clientName.trim() === "") {
        setError("Required fields cannot be empty.");
        return;
      }

      // Validate expenses
      if (expenses.length) {
        for (const item of expenses) {
          if (!item.section || item.amount === "" || !item.expenseDate) {
            setError("All expense fields (section, amount, date) are required.");
            return;
          }
          if (item.section === "Damages" && (!item.damagedBy || item.damagedBy.trim() === "")) {
            setError("For 'Damages' in Sample Expenses, 'Damaged By' is required.");
            return;
          }
        }
      }

      // Validate jobSheets
      if (orderConfirmed && jobSheets.length) {
        for (const js of jobSheets) {
          if (!js.jobSheetNumber || js.jobSheetNumber.trim() === "") {
            setError("JobSheet number is required.");
            return;
          }
          if (js.orderExpenses.length) {
            for (const item of js.orderExpenses) {
              if (!item.section || item.amount === "" || !item.expenseDate) {
                setError("All order expense fields (section, amount, date) are required.");
                return;
              }
              if (item.section === "Damages" && (!item.damagedBy || item.damagedBy.trim() === "")) {
                setError("For 'Damages' in Order Expenses, 'Damaged By' is required.");
                return;
              }
            }
          }
        }
      }

      const payload = {
        opportunityCode: opptyCode,
        ...form,
        expenses,
        orderConfirmed,
        jobSheets: orderConfirmed
          ? jobSheets.map(js => ({
              jobSheetNumber: js.jobSheetNumber,
              orderExpenses: js.orderExpenses
            }))
          : []
      };

      const config = { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } };
      
      if (isEdit) {
        await axios.put(`${BACKEND}/api/admin/expenses/${expense._id}`, payload, config);
      } else {
        await axios.post(`${BACKEND}/api/admin/expenses`, payload, config);
      }
      
      onClose();
    } catch (e) {
      setError(`Failed to ${isEdit ? "update" : "create"} expense: ${e.response?.data?.message || e.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle click outside suggestions
  useEffect(() => {
    const handleClickOutside = () => {
      setShowSuggestions(false);
    };

    document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div 
        className="bg-white w-full max-w-3xl p-6 rounded-lg shadow-xl overflow-auto max-h-[90vh] relative"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-bold">{isEdit ? "Edit" : "Add"} Expenses</h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-xl"
            disabled={isSubmitting}
          >
            ×
          </button>
        </div>

        {(error || isLoading || isSubmitting) && (
          <div className="mb-4">
            {error && (
              <div className="text-red-600 bg-red-50 p-3 rounded text-xs mb-2">
                {error}
              </div>
            )}
            {isLoading && (
              <div className="text-blue-600 bg-blue-50 p-3 rounded text-xs mb-2">
                Loading opportunity data...
              </div>
            )}
            {isSubmitting && (
              <div className="text-green-600 bg-green-50 p-3 rounded text-xs mb-2">
                {isEdit ? "Updating expense..." : "Creating expense..."}
              </div>
            )}
          </div>
        )}

        {/* Opportunity selector */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="relative">
            <label className="block text-xs font-medium mb-1">Opportunity # *</label>
            <input
              value={opptyCode}
              onChange={e => {
                setOpptyCode(e.target.value);
                setShowSuggestions(true);
              }}
              onClick={(e) => {
                e.stopPropagation();
                if (suggestions.length > 0) {
                  setShowSuggestions(true);
                }
              }}
              className="w-full border p-2 rounded text-xs"
              placeholder="Start typing to search..."
              disabled={isSubmitting}
            />
            {showSuggestions && suggestions.length > 0 && (
              <ul className="absolute z-50 left-0 right-0 mt-1 border rounded bg-white shadow-lg max-h-48 overflow-auto text-xs">
                {suggestions.map(o => (
                  <li
                    key={o._id}
                    onClick={() => pickOpp(o)}
                    className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                  >
                    <div className="font-medium">{o.opportunityCode}</div>
                    <div className="text-gray-600">{o.opportunityName}</div>
                    <div className="text-gray-500 text-xs">Client: {o.account}</div>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Client Company *</label>
            <input
              value={form.clientCompanyName}
              onChange={e => setForm(f => ({ ...f, clientCompanyName: e.target.value }))}
              className="w-full border p-2 rounded text-xs"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Client Name *</label>
            <input
              value={form.clientName}
              onChange={e => setForm(f => ({ ...f, clientName: e.target.value }))}
              className="w-full border p-2 rounded text-xs"
              required
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">Event Name</label>
            <input
              value={form.eventName}
              onChange={e => setForm(f => ({ ...f, eventName: e.target.value }))}
              className="w-full border p-2 rounded text-xs"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-xs font-medium mb-1">CRM Name</label>
            <input
              value={form.crmName}
              onChange={e => setForm(f => ({ ...f, crmName: e.target.value }))}
              className="w-full border p-2 rounded text-xs"
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* Sample expenses */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-semibold">Sample Expenses</h3>
            <button
              onClick={() => addRow(expenses, setExpenses)}
              className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
              disabled={isSubmitting}
            >
              + Add Expense
            </button>
          </div>
          {expenses.map((it, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2 mb-2 text-xs">
              <select
                value={it.section}
                onChange={e => updateRow(expenses, setExpenses, i, "section", e.target.value)}
                className="border p-1 rounded flex-1 min-w-[160px]"
                disabled={isSubmitting}
              >
                <option value="">Select Section</option>
                {getAvailableSections().map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <input
                type="number"
                placeholder="Amount"
                value={it.amount}
                onChange={e => updateRow(expenses, setExpenses, i, "amount", e.target.value)}
                className="border p-1 rounded w-24"
                min="0"
                disabled={isSubmitting}
              />
              <input
                type="date"
                value={it.expenseDate}
                onChange={e => updateRow(expenses, setExpenses, i, "expenseDate", e.target.value)}
                className="border p-1 rounded w-36"
                disabled={isSubmitting}
              />
              {it.section === "Damages" && (
                <input
                  placeholder="Damaged By"
                  value={it.damagedBy || ""}
                  onChange={e => updateRow(expenses, setExpenses, i, "damagedBy", e.target.value)}
                  className="border p-1 rounded flex-1 min-w-[160px]"
                  disabled={isSubmitting}
                />
              )}
              <input
                placeholder="Remarks"
                value={it.remarks || ""}
                onChange={e => updateRow(expenses, setExpenses, i, "remarks", e.target.value)}
                className="border p-1 rounded flex-1 min-w-[160px]"
                disabled={isSubmitting}
              />
              <button
                onClick={() => removeRow(expenses, setExpenses, i)}
                className="text-red-600 px-2 hover:text-red-800"
                title="Remove row"
                disabled={isSubmitting}
              >
                ×
              </button>
            </div>
          ))}
        </div>

        {/* Order confirmed */}
        <div className="mt-4 mb-4 text-xs">
          <label className="font-medium mr-2">Order Confirmed</label>
          <select
            value={orderConfirmed ? "yes" : "no"}
            onChange={e => setOrderConfirmed(e.target.value === "yes")}
            className="border p-1 rounded text-xs"
            disabled={isSubmitting}
          >
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </div>

        {/* JobSheets */}
        {orderConfirmed && (
          <div className="mt-4">
            <div className="flex justify-between items-center mb-2">
              <h3 className="text-sm font-semibold">Job Sheets</h3>
              <button
                onClick={addJobSheet}
                className="bg-blue-500 text-white px-3 py-1 rounded text-xs"
                disabled={isSubmitting}
              >
                + Add JobSheet
              </button>
            </div>
            {jobSheets.map((js, index) => (
              <div key={index} className="mt-4 border-t pt-4">
                <div className="flex justify-between items-center mb-2">
                  <div className="text-xs flex-1 relative">
                    <label className="block font-medium mb-1">JobSheet #{index + 1} *</label>
                    <input
                      value={js.jobSheetNumber}
                      onChange={e => updateJobSheetNumber(index, e.target.value)}
                      className="w-full border p-2 rounded text-xs"
                      placeholder="Start typing job sheet number..."
                      disabled={isSubmitting}
                    />
                    {js.jsSuggestions.length > 0 && (
                      <ul className="absolute z-40 left-0 right-0 mt-1 border rounded bg-white shadow-lg max-h-48 overflow-auto text-xs">
                        {js.jsSuggestions.map(j => (
                          <li
                            key={j._id}
                            onClick={() => pickJS(index, j)}
                            className="p-2 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                          >
                            <div className="font-medium">{j.jobSheetNumber}</div>
                            <div className="text-gray-600">{j.eventName}</div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  {jobSheets.length > 1 && (
                    <button
                      onClick={() => removeJobSheet(index)}
                      className="text-red-600 px-2 text-xs ml-2 hover:text-red-800"
                      disabled={isSubmitting}
                    >
                      Remove
                    </button>
                  )}
                </div>

                <button
                  onClick={() => {
                    setJobSheets(jsList => {
                      const newJs = [...jsList];
                      const current = newJs[index].orderExpenses || [];
                      newJs[index].orderExpenses = [
                        ...current,
                        { section: "", amount: "", expenseDate: "", remarks: "", damagedBy: "" }
                      ];
                      return newJs;
                    });
                  }}
                  className="bg-blue-500 text-white px-3 py-1 rounded text-xs mb-2"
                  disabled={isSubmitting}
                >
                  + Add Order Expense
                </button>

                {(js.orderExpenses || []).map((it, i) => (
                  <div key={i} className="flex flex-wrap items-center gap-2 mb-2 text-xs">
                    <select
                      value={it.section}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          const list = newJs[index].orderExpenses;
                          list[i].section = e.target.value;
                          // reset damagedBy when switching away from Damages
                          if (e.target.value !== "Damages") {
                            list[i].damagedBy = list[i].damagedBy || "";
                          }
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded flex-1 min-w-[160px]"
                      disabled={isSubmitting}
                    >
                      <option value="">Select Section</option>
                      {getAvailableOrderSections().map(s => (
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
                          newJs[index].orderExpenses[i].amount = e.target.value;
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded w-24"
                      min="0"
                      disabled={isSubmitting}
                    />
                    <input
                      type="date"
                      value={it.expenseDate}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          newJs[index].orderExpenses[i].expenseDate = e.target.value;
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded w-36"
                      disabled={isSubmitting}
                    />
                    {it.section === "Damages" && (
                      <input
                        placeholder="Damaged By"
                        value={it.damagedBy || ""}
                        onChange={e => {
                          setJobSheets(jsList => {
                            const newJs = [...jsList];
                            newJs[index].orderExpenses[i].damagedBy = e.target.value;
                            return newJs;
                          });
                        }}
                        className="border p-1 rounded flex-1 min-w-[160px]"
                        disabled={isSubmitting}
                      />
                    )}
                    <input
                      placeholder="Remarks"
                      value={it.remarks || ""}
                      onChange={e => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          newJs[index].orderExpenses[i].remarks = e.target.value;
                          return newJs;
                        });
                      }}
                      className="border p-1 rounded flex-1 min-w-[160px]"
                      disabled={isSubmitting}
                    />
                    <button
                      onClick={() => {
                        setJobSheets(jsList => {
                          const newJs = [...jsList];
                          newJs[index].orderExpenses = newJs[index].orderExpenses.filter((_, k) => k !== i);
                          return newJs;
                        });
                      }}
                      className="text-red-600 px-1 hover:text-red-800"
                      title="Remove row"
                      disabled={isSubmitting}
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <div className="flex justify-end mt-6 space-x-2 pt-4 border-t">
          <button 
            onClick={onClose} 
            className="px-4 py-2 border rounded text-xs hover:bg-gray-50"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit} 
            className="px-4 py-2 bg-green-600 text-white rounded text-xs hover:bg-green-700 disabled:opacity-50"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {isEdit ? "Updating..." : "Saving..."}
              </span>
            ) : (
              isEdit ? "Update" : "Save"
            )}
          </button>
        </div>
      </div>
    </div>
  );
}