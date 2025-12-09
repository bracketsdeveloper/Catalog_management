import React, { useState } from "react";

export default function ExpenseTable({ data, onEdit }) {
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

  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";
  const permissions = JSON.parse(localStorage.getItem("permissions") || "[]");
  const ORDER_SECTIONS = isSuperAdmin
    ? FULL_ORDER_SECTIONS
    : permissions.includes("manage-expenses")
    ? FULL_ORDER_SECTIONS.filter(s => s !== "Product Cost" && s !== "Branding Cost" && s !== "Success Fee")
    : FULL_ORDER_SECTIONS;

  const showTotals = isSuperAdmin || !permissions.includes("manage-expenses");

  const [sortConfig, setSortConfig] = useState({ key: null, direction: "asc" });
  const [filters, setFilters] = useState({});

  // Enhanced sumBy function that checks for auto-calculated values
  const sumBy = (list, section) => {
    if (!list || !Array.isArray(list)) return 0;
    
    const item = list.find(i => i?.section === section);
    if (item) {
      const amount = Number(item.amount) || 0;
      const isAutoCalculated = item.isAutoCalculated || 
                               (section === "Product Cost" || section === "Branding Cost");
      
      return {
        amount,
        isAutoCalculated,
        hasData: true
      };
    }
    
    return {
      amount: 0,
      isAutoCalculated: false,
      hasData: false
    };
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const sortedAndFilteredData = () => {
    let result = [...data];

    // Apply filters
    Object.keys(filters).forEach((key) => {
      if (filters[key]) {
        const searchLower = filters[key].toLowerCase();
        result = result.filter((exp) => {
          if (key === "sampleTotal") {
            const total = SAMPLE_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.expenses, s);
              return t + item.amount;
            }, 0);
            return total.toString().includes(searchLower);
          }
          if (key === "orderTotal") {
            const total = ORDER_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.orderExpenses, s);
              return t + (exp.orderConfirmed ? item.amount : 0);
            }, 0);
            return total.toString().includes(searchLower);
          }
          if (key === "grandTotal") {
            const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.expenses, s);
              return t + item.amount;
            }, 0);
            const orderTotal = ORDER_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.orderExpenses, s);
              return t + (exp.orderConfirmed ? item.amount : 0);
            }, 0);
            return (sampleTotal + orderTotal).toString().includes(searchLower);
          }
          if (SAMPLE_SECTIONS.includes(key)) {
            const item = sumBy(exp.expenses, key);
            return item.amount.toString().includes(searchLower);
          }
          if (ORDER_SECTIONS.includes(key)) {
            const item = sumBy(exp.orderExpenses, key);
            return exp.orderConfirmed ? item.amount.toString().includes(searchLower) : false;
          }
          const value = (exp[key] || "").toString();
          return value.toLowerCase().includes(searchLower);
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === "sampleTotal") {
          aValue = SAMPLE_SECTIONS.reduce((t, s) => {
            const item = sumBy(a.expenses, s);
            return t + item.amount;
          }, 0);
          bValue = SAMPLE_SECTIONS.reduce((t, s) => {
            const item = sumBy(b.expenses, s);
            return t + item.amount;
          }, 0);
        } else if (sortConfig.key === "orderTotal") {
          aValue = ORDER_SECTIONS.reduce((t, s) => {
            const item = sumBy(a.orderExpenses, s);
            return t + (a.orderConfirmed ? item.amount : 0);
          }, 0);
          bValue = ORDER_SECTIONS.reduce((t, s) => {
            const item = sumBy(b.orderExpenses, s);
            return t + (b.orderConfirmed ? item.amount : 0);
          }, 0);
        } else if (sortConfig.key === "grandTotal") {
          const aSample = SAMPLE_SECTIONS.reduce((t, s) => {
            const item = sumBy(a.expenses, s);
            return t + item.amount;
          }, 0);
          const bSample = SAMPLE_SECTIONS.reduce((t, s) => {
            const item = sumBy(b.expenses, s);
            return t + item.amount;
          }, 0);
          const aOrder = ORDER_SECTIONS.reduce((t, s) => {
            const item = sumBy(a.orderExpenses, s);
            return t + (a.orderConfirmed ? item.amount : 0);
          }, 0);
          const bOrder = ORDER_SECTIONS.reduce((t, s) => {
            const item = sumBy(b.orderExpenses, s);
            return t + (b.orderConfirmed ? item.amount : 0);
          }, 0);
          aValue = aSample + aOrder;
          bValue = bSample + bOrder;
        } else if (SAMPLE_SECTIONS.includes(sortConfig.key)) {
          const itemA = sumBy(a.expenses, sortConfig.key);
          const itemB = sumBy(b.expenses, sortConfig.key);
          aValue = itemA.amount;
          bValue = itemB.amount;
        } else if (ORDER_SECTIONS.includes(sortConfig.key)) {
          const itemA = sumBy(a.orderExpenses, sortConfig.key);
          const itemB = sumBy(b.orderExpenses, sortConfig.key);
          aValue = a.orderConfirmed ? itemA.amount : 0;
          bValue = b.orderConfirmed ? itemB.amount : 0;
        } else {
          aValue = a[sortConfig.key] || "";
          bValue = b[sortConfig.key] || "";
        }
        if (typeof aValue === "string") {
          return sortConfig.direction === "asc"
            ? aValue.localeCompare(bValue)
            : bValue.localeCompare(aValue);
        }
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      });
    }

    return result;
  };

  // Check if any expense has auto-calculated values
  const hasAutoCalculatedValues = data.some(exp => 
    exp.orderExpenses?.some(item => item.isAutoCalculated) || 
    exp.hasAutoCalculated
  );

  return (
    <div className="overflow-x-auto border border-gray-300">
      <table className="table-auto w-full text-xs whitespace-nowrap">
        <thead>
          <tr>
            <th colSpan={5} className="border"></th>
            <th
              colSpan={SAMPLE_SECTIONS.length + 1}
              className="border bg-yellow-200 text-center font-semibold"
            >
              Sample Cost
            </th>
            <th
              colSpan={ORDER_SECTIONS.length + 2}
              className="border bg-orange-200 text-center font-semibold"
            >
              Product Cost
            </th>
            <th colSpan={2} className="border"></th>
          </tr>
          <tr className="bg-gray-50">
            {[
              "opportunityCode",
              "clientCompanyName",
              "clientName",
              "eventName",
              "crmName",
              ...SAMPLE_SECTIONS,
              "sampleTotal",
              "orderConfirmed",
              "jobSheetNumber",
              ...ORDER_SECTIONS,
              ...(showTotals ? ["orderTotal", "grandTotal"] : []),
              "actions"
            ].map((key) => (
              <th key={key} className="px-2 py-1 border text-left">
                <div className="flex items-center space-x-1">
                  <span
                    onClick={() => key !== "actions" && handleSort(key)}
                    className={key !== "actions" ? "cursor-pointer hover:underline" : ""}
                  >
                    {key === "sampleTotal"
                      ? "Sample Total"
                      : key === "orderTotal"
                      ? "Order Total"
                      : key === "grandTotal"
                      ? "Grand Total"
                      : key === "opportunityCode"
                      ? "Opportunity #"
                      : key === "clientCompanyName"
                      ? "Client Company"
                      : key === "jobSheetNumber"
                      ? "JobSheet #"
                      : key}
                    {sortConfig.key === key && (
                      <span>{sortConfig.direction === "asc" ? " ↑" : " ↓"}</span>
                    )}
                  </span>
                </div>
                {key !== "actions" && (
                  <input
                    type="text"
                    value={filters[key] || ""}
                    onChange={(e) => handleFilterChange(key, e.target.value)}
                    className="mt-1 w-full px-1 py-0.5 text-xs border rounded"
                    placeholder="Filter..."
                  />
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {sortedAndFilteredData().map((exp, idx) => {
            // Calculate totals
            const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.expenses, s);
              return t + item.amount;
            }, 0);
            
            const orderTotal = ORDER_SECTIONS.reduce((t, s) => {
              const item = sumBy(exp.orderExpenses, s);
              return t + (exp.orderConfirmed ? item.amount : 0);
            }, 0);
            
            const allSampleFilled = SAMPLE_SECTIONS.every(s => {
              const item = sumBy(exp.expenses, s);
              return item.amount > 0;
            });
            
            const allOrderFilled = exp.orderConfirmed && ORDER_SECTIONS.every(s => {
              const item = sumBy(exp.orderExpenses, s);
              return item.amount > 0;
            });
            
            const rowClass = allSampleFilled && allOrderFilled ? "bg-green-100" : "";

            return (
              <tr key={`${exp._id}-${idx}`} className={`${rowClass} hover:bg-gray-50`}>
                <td className="px-2 py-1 border">{exp.opportunityCode}</td>
                <td className="px-2 py-1 border">{exp.clientCompanyName}</td>
                <td className="px-2 py-1 border">{exp.clientName}</td>
                <td className="px-2 py-1 border">{exp.eventName}</td>
                <td className="px-2 py-1 border">{exp.crmName}</td>
                
                {/* Sample Costs */}
                {SAMPLE_SECTIONS.map(s => {
                  const item = sumBy(exp.expenses, s);
                  return (
                    <td key={s} className="px-2 py-1 border">
                      {item.amount || "-"}
                    </td>
                  );
                })}
                
                <td className="px-2 py-1 border">{sampleTotal}</td>
                <td className="px-2 py-1 border">{exp.orderConfirmed ? "Yes" : "No"}</td>
                <td className="px-2 py-1 border">{exp.jobSheetNumber || "-"}</td>
                
                {/* Order Costs - Special handling for Product Cost and Branding Cost */}
                {ORDER_SECTIONS.map(s => {
                  const item = sumBy(exp.orderExpenses, s);
                  const isAutoCalculated = item.isAutoCalculated || 
                                          (s === "Product Cost" && exp.calculatedProductCost > 0) ||
                                          (s === "Branding Cost" && exp.calculatedBrandingCost > 0);
                  
                  let displayValue = "-";
                  if (exp.orderConfirmed) {
                    displayValue = item.amount > 0 ? item.amount : (item.amount === 0 ? "0" : "-");
                  }
                  
                  return (
                    <td 
                      key={s} 
                      className={`px-2 py-1 border ${isAutoCalculated ? 'bg-blue-50' : ''}`}
                      title={isAutoCalculated ? "Auto-calculated from OpenPurchase" : ""}
                    >
                      {exp.orderConfirmed ? (
                        <>
                          {displayValue}
                          {isAutoCalculated && item.amount > 0 && (
                            <span className="text-blue-500 text-xs ml-1" title="Auto-calculated">*</span>
                          )}
                        </>
                      ) : (
                        ""
                      )}
                    </td>
                  );
                })}
                
                {showTotals && (
                  <>
                    <td className="px-2 py-1 border">{exp.orderConfirmed ? orderTotal : ""}</td>
                    <td className="px-2 py-1 border">{sampleTotal + (exp.orderConfirmed ? orderTotal : 0)}</td>
                  </>
                )}
                <td className="px-2 py-1 border">
                  <button
                    onClick={() => onEdit(exp)}
                    className="text-blue-600 hover:underline text-xs"
                  >
                    Edit
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
      
      {/* Legend for auto-calculated values */}
      {hasAutoCalculatedValues && (
        <div className="p-2 text-xs text-blue-600 bg-blue-50 border-t flex items-center">
          <span className="text-blue-500 mr-1">*</span>
          <span>Product Cost and Branding Cost values with asterisk (*) are auto-calculated from OpenPurchase records</span>
        </div>
      )}
    </div>
  );
}