// client/src/pages/ManageExpenses.jsx
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
  const [filters, setFilters] = useState({
    opptyFrom: "", opptyTo: "",
    jsFrom: "",    jsTo: "",
    createdFrom: "", createdTo: "",
    updatedFrom: "", updatedTo: ""
  });

  // Fetch once
  useEffect(() => {
    axios.get(`${BACKEND_URL}/api/admin/expenses`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    }).then(r => setExpenses(r.data));
  }, []);

  // Apply search + filters
  const displayed = useMemo(() => {
    return expenses.filter(exp => {
      if (searchTerm) {
        const txt = searchTerm.toLowerCase();
        if (!exp.opportunityCode.includes(txt) &&
            !exp.clientCompanyName.toLowerCase().includes(txt)) {
          return false;
        }
      }
      if (filters.opptyFrom && exp.opportunityCode < filters.opptyFrom) return false;
      if (filters.opptyTo   && exp.opportunityCode > filters.opptyTo)   return false;
      const js = exp.jobSheetNumber || "";
      if (filters.jsFrom && js < filters.jsFrom) return false;
      if (filters.jsTo   && js > filters.jsTo)   return false;
      const ca = new Date(exp.createdAt), ua = new Date(exp.updatedAt);
      if (filters.createdFrom && ca < new Date(filters.createdFrom)) return false;
      if (filters.createdTo   && ca > new Date(filters.createdTo))   return false;
      if (filters.updatedFrom && ua < new Date(filters.updatedFrom)) return false;
      if (filters.updatedTo   && ua > new Date(filters.updatedTo))   return false;
      return true;
    });
  }, [expenses, searchTerm, filters]);

  // Excel export
  const exportToExcel = () => {
    const SAMPLE_SECTIONS = [
      "Sample Product Cost","Sample Branding Cost","Sample Logistics",
      "Additional Overheads","Sample Lost","Damages"
    ];
    const ORDER_SECTIONS = [
      "Product Cost","Branding Cost","Logistics","Packaging Cost","OT Cost",
      "Success Fee","Additional Qty Ordered","Damages","Any Additional Expenses"
    ];

    // helper: sum amounts
    const sumBy = (list, section) =>
      (list||[])
        .filter(i=>i.section===section)
        .reduce((s,i)=>s + (Number(i.amount)||0), 0);

    // helper: pick first date
    const dateBy = (list, section) => {
      const item = (list||[]).find(i=>i.section===section);
      return item && item.expenseDate
        ? new Date(item.expenseDate).toISOString().slice(0,10)
        : "";
    };

    // Build rows as arrays
    const header1 = [];
    // 5 basics
    header1.push("","","","","");
    // sample group header
    const sampleCols = SAMPLE_SECTIONS.length*2 + 1;
    header1.push("Sample Cost", ...Array(sampleCols-1).fill(""));
    // product group header (includes orderConfirmed + js + each section*2 + orderTotal)
    const productCols = 2 + ORDER_SECTIONS.length*2 + 1;
    header1.push("Product Cost", ...Array(productCols-1).fill(""));
    // grand total
    header1.push("");

    const header2 = [
      "Opportunity #","Client Company","Client Name","Event Name","CRM Name",
      // sample subheaders
      ...SAMPLE_SECTIONS.flatMap(s=>[`${s} Amount`, `${s} Date`]),
      "Sample Total",
      // orderConfirmed + js
      "Order Confirmed","JobSheet #",
      // order subheaders
      ...ORDER_SECTIONS.flatMap(s=>[`${s} Amount`, `${s} Date`]),
      "Order Total",
      // grand
      "Grand Total"
    ];

    // Data rows
    const dataRows = displayed.map(exp => {
      const row = [];
      row.push(
        exp.opportunityCode, exp.clientCompanyName,
        exp.clientName, exp.eventName, exp.crmName
      );
      // sample details
      SAMPLE_SECTIONS.forEach(s => {
        row.push(sumBy(exp.expenses, s), dateBy(exp.expenses, s));
      });
      const sampleTotal = SAMPLE_SECTIONS.reduce((t,s)=>t+sumBy(exp.expenses,s),0);
      row.push(sampleTotal);

      // orderConfirmed & js
      row.push(exp.orderConfirmed?"Yes":"No", exp.jobSheetNumber||"");
      // order details
      ORDER_SECTIONS.forEach(s => {
        row.push(sumBy(exp.orderExpenses, s), dateBy(exp.orderExpenses, s));
      });
      const orderTotal = ORDER_SECTIONS.reduce((t,s)=>t+sumBy(exp.orderExpenses,s),0);
      row.push(orderTotal);

      // grand
      row.push(sampleTotal + orderTotal);
      return row;
    });

    // Combine
    const aoa = [header1, header2, ...dataRows];
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merge header1 groups
    ws["!merges"] = [
      // Sample Cost group
      { s:{r:0,c:5}, e:{r:0,c:5+sampleCols-1} },
      // Product Cost group
      { s:{r:0,c:5+sampleCols}, e:{r:0,c:5+sampleCols+productCols-1} }
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
            onClick={()=>setFilterOpen(!filterOpen)}
            className="bg-gray-200 px-3 py-1 rounded text-xs"
          >
            {filterOpen ? "Hide Filters":"Filters"}
          </button>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={exportToExcel}
            className="bg-blue-600 text-white px-3 py-1 rounded text-xs"
          >
            Export to Excel
          </button>
          <button
            onClick={()=>setNewModalOpen(true)}
            className="bg-green-600 text-white px-3 py-1 rounded text-xs"
          >
            + Add Expenses
          </button>
        </div>
      </div>

      {filterOpen && (
        <FilterPanel filters={filters} setFilters={setFilters} />
      )}

      {(newModalOpen||editingExpense) && (
        <AddExpenseModal
          expense={editingExpense}
          onClose={()=>{
            setNewModalOpen(false);
            setEditingExpense(null);
            // refresh
            axios.get(`${BACKEND_URL}/api/admin/expenses`, {
              headers:{Authorization:`Bearer ${localStorage.getItem("token")}`}
            }).then(r=>setExpenses(r.data));
          }}
        />
      )}

      <ExpenseTable
        data={displayed}
        onEdit={e=>setEditingExpense(e)}
      />
    </div>
  );
}
