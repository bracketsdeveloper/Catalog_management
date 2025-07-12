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

  const sumBy = (list, section) =>
    (list || []).filter(i => i?.section === section).reduce((s, i) => s + (Number(i.amount) || 0), 0);

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
            const total = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(exp.expenses, s), 0);
            return total.toString().includes(searchLower);
          }
          if (key === "orderTotal") {
            const total = ORDER_SECTIONS.reduce((t, s) => t + (exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0), 0);
            return total.toString().includes(searchLower);
          }
          if (key === "grandTotal") {
            const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(exp.expenses, s), 0);
            const orderTotal = ORDER_SECTIONS.reduce((t, s) => t + (exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0), 0);
            return (sampleTotal + orderTotal).toString().includes(searchLower);
          }
          if (SAMPLE_SECTIONS.includes(key)) {
            return sumBy(exp.expenses, key).toString().includes(searchLower);
          }
          if (ORDER_SECTIONS.includes(key)) {
            return exp.orderConfirmed ? sumBy(exp.orderExpenses, key).toString().includes(searchLower) : false;
          }
          const value = exp[key] || "";
          return value.toLowerCase().includes(searchLower);
        });
      }
    });

    // Apply sorting
    if (sortConfig.key) {
      result.sort((a, b) => {
        let aValue, bValue;
        if (sortConfig.key === "sampleTotal") {
          aValue = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(a.expenses, s), 0);
          bValue = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(b.expenses, s), 0);
        } else if (sortConfig.key === "orderTotal") {
          aValue = ORDER_SECTIONS.reduce((t, s) => t + (a.orderConfirmed ? sumBy(a.orderExpenses, s) : 0), 0);
          bValue = ORDER_SECTIONS.reduce((t, s) => t + (b.orderConfirmed ? sumBy(b.orderExpenses, s) : 0), 0);
        } else if (sortConfig.key === "grandTotal") {
          const aSample = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(a.expenses, s), 0);
          const bSample = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(b.expenses, s), 0);
          const aOrder = ORDER_SECTIONS.reduce((t, s) => t + (a.orderConfirmed ? sumBy(a.orderExpenses, s) : 0), 0);
          const bOrder = ORDER_SECTIONS.reduce((t, s) => t + (b.orderConfirmed ? sumBy(b.orderExpenses, s) : 0), 0);
          aValue = aSample + aOrder;
          bValue = bSample + bOrder;
        } else if (SAMPLE_SECTIONS.includes(sortConfig.key)) {
          aValue = sumBy(a.expenses, sortConfig.key);
          bValue = sumBy(b.expenses, sortConfig.key);
        } else if (ORDER_SECTIONS.includes(sortConfig.key)) {
          aValue = a.orderConfirmed ? sumBy(a.orderExpenses, sortConfig.key) : 0;
          bValue = b.orderConfirmed ? sumBy(b.orderExpenses, sortConfig.key) : 0;
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
            const sampleTotal = SAMPLE_SECTIONS.reduce((t, s) => t + sumBy(exp.expenses, s), 0);
            const orderTotal = ORDER_SECTIONS.reduce((t, s) => t + (exp.orderConfirmed ? sumBy(exp.orderExpenses, s) : 0), 0);
            const allSampleFilled = SAMPLE_SECTIONS.every(s => sumBy(exp.expenses, s) > 0);
            const allOrderFilled = exp.orderConfirmed && ORDER_SECTIONS.every(s => sumBy(exp.orderExpenses, s) > 0);
            const rowClass = allSampleFilled && allOrderFilled ? "bg-green-100" : "";

            return (
              <tr key={`${exp._id}-${idx}`} className={`${rowClass} hover:bg-gray-50`}>
                <td className="px-2 py-1 border">{exp.opportunityCode}</td>
                <td className="px-2 py-1 border">{exp.clientCompanyName}</td>
                <td className="px-2 py-1 border">{exp.clientName}</td>
                <td className="px-2 py-1 border">{exp.eventName}</td>
                <td className="px-2 py-1 border">{exp.crmName}</td>
                {SAMPLE_SECTIONS.map(s => (
                  <td key={s} className="px-2 py-1 border">
                    {sumBy(exp.expenses, s) || "-"}
                  </td>
                ))}
                <td className="px-2 py-1 border">{sampleTotal}</td>
                <td className="px-2 py-1 border">{exp.orderConfirmed ? "Yes" : "No"}</td>
                <td className="px-2 py-1 border">{exp.jobSheetNumber || "-"}</td>
                {ORDER_SECTIONS.map(s => (
                  <td key={s} className="px-2 py-1 border">
                    {exp.orderConfirmed ? sumBy(exp.orderExpenses, s) || "-" : ""}
                  </td>
                ))}
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
    </div>
  );
}