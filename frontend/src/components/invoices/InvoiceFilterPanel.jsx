import React from "react";

export default function InvoiceFilterPanel({ filters, setFilters }) {
  const on = (e) => setFilters({ ...filters, [e.target.name]: e.target.value });

  const Field = ({ label, name, type="text" }) => (
    <div>
      <label className="block">{label}</label>
      <input
        type={type}
        name={name}
        value={filters[name]}
        onChange={on}
        className="border p-1 rounded w-full text-xs"
      />
    </div>
  );

  return (
    <div className="border border-gray-300 bg-gray-50 p-4 mb-4 text-xs rounded">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Field label="Invoice #" name="invoiceNumber" />
        <Field label="Quotation Ref #" name="quotationRefNumber" />
        <Field label="Ref. JobSheet #" name="refJobSheetNumber" />
        <Field label="Client Company" name="clientCompanyName" />
        <Field label="Client Name" name="clientName" />
        <Field label="Place of Supply" name="placeOfSupply" />
        <Field label="PO Number" name="poNumber" />
        <Field label="E-Way Bill #" name="eWayBillNumber" />
        <Field label="Created By" name="createdBy" />

        <Field label="Subtotal Min" name="subtotalMin" type="number" />
        <Field label="Subtotal Max" name="subtotalMax" type="number" />
        <Field label="Grand Total Min" name="grandMin" type="number" />
        <Field label="Grand Total Max" name="grandMax" type="number" />

        <Field label="Invoice Date From" name="dateFrom" type="date" />
        <Field label="Invoice Date To" name="dateTo" type="date" />
        <Field label="Quotation Date From" name="quotationDateFrom" type="date" />
        <Field label="Quotation Date To" name="quotationDateTo" type="date" />
        <Field label="Due Date From" name="dueDateFrom" type="date" />
        <Field label="Due Date To" name="dueDateTo" type="date" />
        <Field label="PO Date From" name="poDateFrom" type="date" />
        <Field label="PO Date To" name="poDateTo" type="date" />
      </div>
    </div>
  );
}
