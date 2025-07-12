import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
import * as XLSX from "xlsx";
import AddExpenseModal from "../components/expenses/AddExpenseModal.js";
import ExpenseTable from "../components/expenses/ExpenseTable.js";
import SearchBar from "../components/manageopportunities/SearchBar.jsx";
import FilterPanel from "../components/expenses/FilterPanel.js";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function ManageExpenses() {
  const [newModalOpen, setNewModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [expenses, setExpenses] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const hasExportPermission = localStorage.getItem("permissions")?.includes("expenses-export");

  const [filters, setFilters] = useState({
    opptyFrom: "",
    opptyTo: "",
    jsFrom: "",
    jsTo: "",
    createdFrom: "",
    createdTo: "",
    updatedFrom: "",
    updatedTo: "",
    crmName: "",
    orderConfirmed: ""
  });

  // Fetch all expenses
  useEffect(() => {
    axios
      .get(`${BACKEND_URL}/api/admin/expenses`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
      })
      .then(r => setExpenses(r.data))
      .catch(console.error);
  }, []);

  // Apply search + filters
  const displayed = useMemo(() => {
    return expenses.flatMap(exp => {
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase();
        const fieldsToSearch = [
          exp.opportunityCode,
          exp.clientCompanyName,
          exp.clientName,
          exp.eventName,
          exp.crmName
        ];
        if (!fieldsToSearch.some(field => field?.toLowerCase()?.includes(searchLower))) {
          return [];
        }
      }
      if (filters.opptyFrom && exp.opportunityCode < filters.opptyFrom) return [];
      if (filters.opptyTo && exp.opportunityCode > filters.opptyTo) return [];
      if (filters.createdFrom && new Date(exp.createdAt) < new Date(filters.createdFrom)) return [];
      if (filters.createdTo && new Date(exp.createdAt) > new Date(filters.createdTo)) return [];
      if (filters.updatedFrom && new Date(exp.updatedAt) < new Date(filters.updatedFrom)) return [];
      if (filters.updatedTo && new Date(exp.updatedAt) > new Date(filters.updatedTo)) return [];
      if (filters.crmName && !exp.crmName?.toLowerCase()?.includes(filters.crmName.toLowerCase())) return [];
      if (filters.orderConfirmed === "yes" && !exp.orderConfirmed) return [];
      if (filters.orderConfirmed === "no" && exp.orderConfirmed) return [];

      const jobSheets = exp.jobSheets?.length ? exp.jobSheets : [];

      if (!exp.orderConfirmed || !jobSheets.length) {
        return [{
          ...exp,
          jobSheetNumber: "",
          orderExpenses: []
        }];
      }
      return jobSheets.map(jobSheet => ({
        ...exp,
        jobSheetNumber: jobSheet.jobSheetNumber || "",
        orderExpenses: jobSheet.orderExpenses || []
      }));
    });
  }, [expenses, searchTerm, filters]);

  // Export to Excel
  const exportToExcel = () => {
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

    const sumBy = (list, section) =>
      (list || []).filter(i => i.section === section).reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const dateBy = (list, section) => {
      const item = (list || []).find(i => i.section === section);
      return item && item.expenseDate ? item.expenseDate : "";
    };

    const header1 = [
      "", "", "", "", "",
      ...Array(SAMPLE_SECTIONS.length * 2 + 1).fill("Sample Cost"),
      ...Array(ORDER_SECTIONS.length * 2 + 3).fill("Product Cost"),
      ""
    ];
    const sampleCols = SAMPLE_SECTIONS.length * 2 + 1;
    const productCols = ORDER_SECTIONS.length * 2 + 3;

    const header2 = [
      "Opportunity #", "Client Company", "Client Name", "Event Name", "CRM Name",
      ...SAMPLE_SECTIONS.flatMap(s => [`${s} Amount`, `${s} Date`]),
      "Sample Total",
      "Order Confirmed", "JobSheet #",
      ...ORDER_SECTIONS.flatMap(s => [`${s} Amount`, `${s} Date`]),
      "Order Total",
      "Grand Total"
    ];

    const aoa = [header1, header2].concat(
      displayed.map(exp => {
        const row = [
          exp.opportunityCode,
          exp.clientCompanyName,
          exp.clientName,
          exp.eventName,
          exp.crmName
        ];
        SAMPLE_SECTIONS.forEach(s => {
          row.push(sumBy(exp.expenses, s), dateBy(exp.expenses, s));
        });
        const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(exp.expenses, s), 0);
        row.push(sampleTotal);
        row.push(exp.orderConfirmed ? "Yes" : "No", exp.jobSheetNumber || "");
        ORDER_SECTIONS.forEach(s => {
          row.push(exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : "", exp.orderConfirmed ? dateBy(exp.orderExpenses, s) : "");
        });
        const orderTotal = ORDER_SECTIONS.reduce((t, s) => t + (exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0), 0);
        row.push(exp.orderConfirmed ? orderTotal : "");
        row.push(sampleTotal + (exp.orderConfirmed ? orderTotal : 0));
        return row;
      })
    );

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 5 + sampleCols - 1 } },
      { s: { r: 0, c: 5 + sampleCols }, e: { r: 0, c: 5 + sampleCols + productCols - 1 } }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "Expenses.xlsx");
  };

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between items-center mb-4">
        <div className="flex space-x-2">
          <SearchBar searchTerm={searchTerm} setSearchTerm={setSearchTerm} />
          <button
            onClick={() => setFilterOpen(f => !f)}
            className="bg-gray-200 px-3 py-1 rounded text-xs"
          >
            {filterOpen ? "Hide Filters" : "Filters"}
          </button>
        </div>
        <div className="flex space-x-2">
          {(isSuperAdmin || hasExportPermission) && (
            <button
              onClick={exportToExcel}
              className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
            >
              Export to Excel
            </button>
          )}
          <button
            onClick={() => setNewModalOpen(true)}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
          >
            + Add Expenses
          </button>
        </div>
      </div>

      {filterOpen && (
        <FilterPanel filters={filters} setFilters={setFilters} />
      )}

      {(newModalOpen || editingExpense) && (
        <AddExpenseModal
          expense={editingExpense}
          onClose={() => {
            setNewModalOpen(false);
            setEditingExpense(null);
            axios
              .get(`${BACKEND_URL}/api/admin/expenses`, {
                headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
              })
              .then(r => setExpenses(r.data))
              .catch(console.error);
          }}
        />
      )}

      <ExpenseTable data={displayed} onEdit={e => setEditingExpense(e)} />
    </div>
  );
}