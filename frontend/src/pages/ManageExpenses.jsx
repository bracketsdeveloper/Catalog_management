import React, { useState, useEffect, useMemo, useRef } from "react";
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
  const [openPurchases, setOpenPurchases] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterOpen, setFilterOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [modalLoading, setModalLoading] = useState(false);
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

  // Fetch all expenses and open purchases
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [expensesRes, openPurchasesRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/api/admin/expenses`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          }),
          axios.get(`${BACKEND_URL}/api/admin/openpurchases`, {
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
          })
        ]);
        
        setExpenses(expensesRes.data);
        setOpenPurchases(openPurchasesRes.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  const handleRefreshData = async () => {
    try {
      setModalLoading(true);
      const [expensesRes, openPurchasesRes] = await Promise.all([
        axios.get(`${BACKEND_URL}/api/admin/expenses`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        }),
        axios.get(`${BACKEND_URL}/api/admin/openpurchases`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
        })
      ]);
      
      setExpenses(expensesRes.data);
      setOpenPurchases(openPurchasesRes.data);
    } catch (error) {
      console.error("Error refreshing data:", error);
    } finally {
      setModalLoading(false);
    }
  };

  // Helper function to calculate totals from OpenPurchase for a specific jobSheetNumber
  const calculateOpenPurchaseTotals = (jobSheetNumber) => {
    if (!jobSheetNumber || !openPurchases.length) return { productCost: 0, brandingCost: 0 };
    
    const relevantPurchases = openPurchases.filter(
      purchase => purchase.jobSheetNumber === jobSheetNumber && 
      purchase.status && 
      ["received", "closed", "ordered", "in-progress"].includes(purchase.status)
    );
    
    let productCost = 0;
    let brandingCost = 0;
    
    relevantPurchases.forEach(purchase => {
      const quantity = Number(purchase.qtyRequired) || 0;
      const price = Number(purchase.productPrice) || 0;
      const totalCost = quantity * price;
      
      // Check for branding keywords in product name
      const productName = (purchase.product || "").toLowerCase();
      const brandingKeywords = [
        "branding", "printing", "print", "logo", "label", "sticker", 
        "tag", "packaging", "wrap", "vinyl", "banner", "flex", "hoarding"
      ];
      
      const isBranding = brandingKeywords.some(keyword => productName.includes(keyword));
      
      if (isBranding) {
        brandingCost += totalCost;
      } else {
        productCost += totalCost;
      }
    });
    
    return { productCost, brandingCost };
  };

  // Apply search + filters and enhance with OpenPurchase data
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
          orderExpenses: [],
          calculatedProductCost: 0,
          calculatedBrandingCost: 0
        }];
      }
      
      return jobSheets.map(jobSheet => {
        const totals = calculateOpenPurchaseTotals(jobSheet.jobSheetNumber);
        
        // Enhance orderExpenses with calculated values
        let enhancedOrderExpenses = [...(jobSheet.orderExpenses || [])];
        
        // Update or add Product Cost
        const productCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Product Cost");
        if (productCostIndex >= 0) {
          enhancedOrderExpenses[productCostIndex] = {
            ...enhancedOrderExpenses[productCostIndex],
            amount: totals.productCost,
            isAutoCalculated: true
          };
        } else if (totals.productCost > 0) {
          enhancedOrderExpenses.push({
            section: "Product Cost",
            amount: totals.productCost,
            expenseDate: new Date().toISOString().split('T')[0],
            remarks: "Auto-calculated from OpenPurchase",
            damagedBy: "",
            isAutoCalculated: true
          });
        }
        
        // Update or add Branding Cost
        const brandingCostIndex = enhancedOrderExpenses.findIndex(item => item.section === "Branding Cost");
        if (brandingCostIndex >= 0) {
          enhancedOrderExpenses[brandingCostIndex] = {
            ...enhancedOrderExpenses[brandingCostIndex],
            amount: totals.brandingCost,
            isAutoCalculated: true
          };
        } else if (totals.brandingCost > 0) {
          enhancedOrderExpenses.push({
            section: "Branding Cost",
            amount: totals.brandingCost,
            expenseDate: new Date().toISOString().split('T')[0],
            remarks: "Auto-calculated from OpenPurchase",
            damagedBy: "",
            isAutoCalculated: true
          });
        }
        
        return {
          ...exp,
          jobSheetNumber: jobSheet.jobSheetNumber || "",
          orderExpenses: enhancedOrderExpenses,
          calculatedProductCost: totals.productCost,
          calculatedBrandingCost: totals.brandingCost,
          hasAutoCalculated: totals.productCost > 0 || totals.brandingCost > 0
        };
      });
    });
  }, [expenses, openPurchases, searchTerm, filters]);

  // Export to Excel - updated to include auto-calculated values
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
        
        // Sample costs
        SAMPLE_SECTIONS.forEach(s => {
          row.push(sumBy(exp.expenses, s), dateBy(exp.expenses, s));
        });
        
        const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(exp.expenses, s), 0);
        row.push(sampleTotal);
        row.push(exp.orderConfirmed ? "Yes" : "No", exp.jobSheetNumber || "");
        
        // Order costs - use enhanced orderExpenses which includes auto-calculated values
        ORDER_SECTIONS.forEach(s => {
          const value = exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0;
          const item = (exp.orderExpenses || []).find(i => i.section === s);
          const date = item && item.expenseDate ? item.expenseDate : "";
          row.push(exp.orderConfirmed ? value : "", exp.orderConfirmed ? date : "");
        });
        
        const orderTotal = ORDER_SECTIONS.reduce((t, s) => t + (exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0), 0);
        row.push(exp.orderConfirmed ? orderTotal : "");
        row.push(sampleTotal + (exp.orderConfirmed ? orderTotal : 0));
        return row;
      })
    );

    // Add note about auto-calculated values
    aoa.push([]);
    aoa.push(["Note: Product Cost and Branding Cost are auto-calculated from OpenPurchase records"]);

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    ws["!merges"] = [
      { s: { r: 0, c: 5 }, e: { r: 0, c: 5 + sampleCols - 1 } },
      { s: { r: 0, c: 5 + sampleCols }, e: { r: 0, c: 5 + sampleCols + productCols - 1 } },
      { s: { r: aoa.length - 1, c: 0 }, e: { r: aoa.length - 1, c: header2.length - 1 } }
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Expenses");
    XLSX.writeFile(wb, "Expenses.xlsx");
  };

  const handleEditExpense = (expense) => {
    setEditingExpense(expense);
  };

  const handleCloseModal = () => {
    setNewModalOpen(false);
    setEditingExpense(null);
    handleRefreshData();
  };

  return (
    <div className="p-6 bg-white min-h-screen relative">
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

      {/* Loading state */}
      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <span className="ml-3">Loading expenses...</span>
        </div>
      ) : (
        <ExpenseTable data={displayed} onEdit={handleEditExpense} />
      )}

      {/* Modal with proper z-index */}
      {(newModalOpen || editingExpense) && (
        <div className="fixed inset-0 z-50">
          <AddExpenseModal
            expense={editingExpense}
            onClose={handleCloseModal}
            isLoading={modalLoading}
          />
        </div>
      )}
    </div>
  );
}