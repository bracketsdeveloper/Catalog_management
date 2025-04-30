// client/src/components/expenses/ExpenseTable.jsx
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
    list.filter(i => i.section === section)
        .reduce((sum, i) => sum + (Number(i.amount) || 0), 0);

  return (
    <div className="overflow-x-auto border border-gray-300">
      <table className="table-auto w-full text-xs whitespace-nowrap">
        <thead>
          {/* Main headers */}
          <tr>
            <th colSpan={5} className="border"></th>
            <th
              colSpan={SAMPLE_SECTIONS.length + 1}
              className="border bg-yellow-200 text-center font-semibold"
            >
              Sample Cost
            </th>
            <th colSpan={ORDER_SECTIONS.length + 2} className="border bg-orange-200 text-center font-semibold">
              Product Cost
            </th>
            <th colSpan={2} className="border"></th>
          </tr>
          {/* Sub-headers */}
          <tr className="bg-gray-50">
            {/* Basic Info */}
            {[
              "Opportunity #",
              "Client Company",
              "Client Name",
              "Event Name",
              "CRM Name"
            ].map(h => (
              <th key={h} className="px-2 py-1 border text-left">{h}</th>
            ))}

            {/* Sample sections */}
            {SAMPLE_SECTIONS.map(s => (
              <th key={s} className="px-2 py-1 border bg-yellow-100">{s}</th>
            ))}
            <th className="px-2 py-1 border bg-yellow-100">Sample Total</th>

            {/* Order Confirmed & JS# */}
            <th className="px-2 py-1 border bg-orange-100">Order Confirmed</th>
            <th className="px-2 py-1 border bg-orange-100">JobSheet #</th>

            {/* Order sections */}
            {ORDER_SECTIONS.map(s => (
              <th key={s} className="px-2 py-1 border bg-orange-100">{s}</th>
            ))}
            <th className="px-2 py-1 border bg-orange-100">Order Total</th>

            {/* Grand & Actions */}
            <th className="px-2 py-1 border">Grand Total</th>
            <th className="px-2 py-1 border">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map(exp => {
            const sampleTotal = SAMPLE_SECTIONS.reduce(
              (t, s) => t + sumBy(exp.expenses, s),
              0
            );
            const orderTotal = ORDER_SECTIONS.reduce(
              (t, s) => t + sumBy(exp.orderExpenses, s),
              0
            );
            const allSampleFilled = SAMPLE_SECTIONS.every(
              s => sumBy(exp.expenses, s) > 0
            );
            const allOrderFilled =
              exp.orderConfirmed &&
              ORDER_SECTIONS.every(s => sumBy(exp.orderExpenses, s) > 0);
            const rowClass = allSampleFilled && allOrderFilled
              ? "bg-green-100"
              : "";

            return (
              <tr key={exp._id} className={`${rowClass} hover:bg-gray-50`}>
                {/* Basic */}
                <td className="px-2 py-1 border">{exp.opportunityCode}</td>
                <td className="px-2 py-1 border">{exp.clientCompanyName}</td>
                <td className="px-2 py-1 border">{exp.clientName}</td>
                <td className="px-2 py-1 border">{exp.eventName}</td>
                <td className="px-2 py-1 border">{exp.crmName}</td>

                {/* Sample */}
                {SAMPLE_SECTIONS.map(s => (
                  <td key={s} className="px-2 py-1 border">
                    {sumBy(exp.expenses, s) || "-"}
                  </td>
                ))}
                <td className="px-2 py-1 border">{sampleTotal}</td>

                {/* Order */}
                <td className="px-2 py-1 border">
                  {exp.orderConfirmed ? "Yes" : "No"}
                </td>
                <td className="px-2 py-1 border">
                  {exp.jobSheetNumber || "-"}
                </td>
                {ORDER_SECTIONS.map(s => (
                  <td key={s} className="px-2 py-1 border">
                    {sumBy(exp.orderExpenses, s) || "-"}
                  </td>
                ))}
                <td className="px-2 py-1 border">{orderTotal}</td>

                {/* Grand & Actions */}
                <td className="px-2 py-1 border">{sampleTotal + orderTotal}</td>
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
