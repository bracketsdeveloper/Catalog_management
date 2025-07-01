import React from "react";

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

  const sumBy = (list, section) =>
    (list || []).filter(i => i.section === section).reduce((s, i) => s + (Number(i.amount) || 0), 0);

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
            {["Opportunity #", "Client Company", "Client Name", "Event Name", "CRM Name"].map(h => (
              <th key={h} className="px-2 py-1 border text-left">
                {h}
              </th>
            ))}
            {SAMPLE_SECTIONS.map(s => (
              <th key={s} className="px-2 py-1 border bg-yellow-100">
                {s}
              </th>
            ))}
            <th className="px-2 py-1 border bg-yellow-100">Sample Total</th>
            <th className="px-2 py-1 border bg-orange-100">Order Confirmed</th>
            <th className="px-2 py-1 border bg-orange-100">JobSheet #</th>
            {ORDER_SECTIONS.map(s => (
              <th key={s} className="px-2 py-1 border bg-orange-100">
                {s}
              </th>
            ))}
            {showTotals && (
              <>
                <th className="px-2 py-1 border bg-orange-100">Order Total</th>
                <th className="px-2 py-1 border">Grand Total</th>
              </>
            )}
            <th className="px-2 py-1 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((exp, idx) => {
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