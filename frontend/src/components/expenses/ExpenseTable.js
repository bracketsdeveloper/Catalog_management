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
    <div className="border border-gray-300 rounded-lg overflow-hidden">
      <div 
        className="overflow-auto"
        style={{ 
          maxHeight: 'calc(100vh - 150px)',
          position: 'relative'
        }}
      >
        <table className="table-auto w-full text-xs">
          <thead style={{ position: 'sticky', top: 0, zIndex: 50 }}>
            <tr>
              <th colSpan={5} className="border bg-gray-100"></th>
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
              <th colSpan={2} className="border bg-gray-100"></th>
            </tr>
            <tr className="bg-gray-50" style={{ position: 'sticky', top: '28px', zIndex: 40 }}>
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
                <th 
                  key={key} 
                  className={`px-2 py-1 border text-left bg-gray-50 ${key === "clientCompanyName" ? "max-w-[120px] whitespace-normal" : "whitespace-nowrap"}`}
                  style={{ 
                    position: 'sticky',
                    top: '28px',
                    zIndex: 40
                  }}
                >
                  <div className="flex items-center space-x-1">
                    <span
                      onClick={() => key !== "actions" && handleSort(key)}
                      className={key !== "actions" ? "cursor-pointer hover:underline font-medium" : ""}
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
                        : key === "clientName"
                        ? "Client Name"
                        : key === "eventName"
                        ? "Event Name"
                        : key === "crmName"
                        ? "CRM Name"
                        : key === "jobSheetNumber"
                        ? "JobSheet #"
                        : key === "orderConfirmed"
                        ? "Order Confirmed"
                        : key === "actions"
                        ? "Actions"
                        : key}
                      {sortConfig.key === key && (
                        <span className="ml-1">{sortConfig.direction === "asc" ? "↑" : "↓"}</span>
                      )}
                    </span>
                  </div>
                  {key !== "actions" && (
                    <input
                      type="text"
                      value={filters[key] || ""}
                      onChange={(e) => handleFilterChange(key, e.target.value)}
                      className="mt-1 w-full px-1 py-0.5 text-xs border rounded bg-white"
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
              
              const rowClass = allSampleFilled && allOrderFilled ? "bg-green-50" : "hover:bg-gray-50";

              return (
                <tr key={`${exp._id}-${idx}`} className={rowClass}>
                  <td className="px-2 py-1 border whitespace-nowrap">{exp.opportunityCode}</td>
                  <td className="px-2 py-1 border max-w-[120px] break-words whitespace-normal">{exp.clientCompanyName}</td>
                  <td className="px-2 py-1 border whitespace-nowrap">{exp.clientName}</td>
                  <td className="px-2 py-1 border whitespace-nowrap">{exp.eventName}</td>
                  <td className="px-2 py-1 border whitespace-nowrap">{exp.crmName}</td>
                  
                  {/* Sample Costs */}
                  {SAMPLE_SECTIONS.map(s => {
                    const item = sumBy(exp.expenses, s);
                    return (
                      <td key={s} className="px-2 py-1 border whitespace-nowrap">
                        {item.amount > 0 ? item.amount : (item.amount === 0 ? "0" : "-")}
                      </td>
                    );
                  })}
                  
                  <td className="px-2 py-1 border font-medium whitespace-nowrap">{sampleTotal}</td>
                  <td className="px-2 py-1 border whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${exp.orderConfirmed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                      {exp.orderConfirmed ? "Yes" : "No"}
                    </span>
                  </td>
                  <td className="px-2 py-1 border font-medium whitespace-nowrap">{exp.jobSheetNumber || "-"}</td>
                  
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
                        className={`px-2 py-1 border whitespace-nowrap ${isAutoCalculated ? 'bg-blue-50' : ''}`}
                        title={isAutoCalculated ? "Auto-calculated from OpenPurchase" : ""}
                      >
                        {exp.orderConfirmed ? (
                          <div className="flex items-center justify-between">
                            <span>{displayValue}</span>
                            {isAutoCalculated && item.amount > 0 && (
                              <span className="text-blue-500 text-xs" title="Auto-calculated">*</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                    );
                  })}
                  
                  {showTotals && (
                    <>
                      <td className="px-2 py-1 border font-medium whitespace-nowrap">
                        {exp.orderConfirmed ? orderTotal : "-"}
                      </td>
                      <td className="px-2 py-1 border font-medium bg-gray-50 whitespace-nowrap">
                        {sampleTotal + (exp.orderConfirmed ? orderTotal : 0)}
                      </td>
                    </>
                  )}
                  <td className="px-2 py-1 border whitespace-nowrap">
                    <button
                      onClick={() => onEdit(exp)}
                      className="text-blue-600 hover:text-blue-800 hover:underline text-xs font-medium px-2 py-1 rounded hover:bg-blue-50 transition-colors"
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        
        {/* Empty state */}
        {sortedAndFilteredData().length === 0 && (
          <div className="text-center py-12 text-gray-500 bg-gray-50">
            <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25zM6.75 12h.008v.008H6.75V12zm0 3h.008v.008H6.75V15zm0 3h.008v.008H6.75V18z" />
            </svg>
            <p className="mt-2">No expenses found matching your criteria</p>
          </div>
        )}
      </div>
      
      {/* Legend for auto-calculated values */}
      {hasAutoCalculatedValues && (
        <div className="sticky bottom-0 left-0 right-0 p-3 text-xs text-blue-700 bg-blue-50 border-t border-blue-200 flex items-center">
          <span className="text-blue-500 mr-2 text-sm">*</span>
          <span>Product Cost and Branding Cost values with asterisk (*) are auto-calculated from OpenPurchase records</span>
        </div>
      )}
    </div>
  );
}