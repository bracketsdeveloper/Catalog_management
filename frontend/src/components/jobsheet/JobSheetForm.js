// ../components/jobsheet/JobSheetForm.js
import React from "react";
import UserSuggestionInput from "./UserSuggestionInput";
import PurchaseOrderSuggestionInput from "./PurchaseOrderSuggestionInput";
import QuotationSuggestionInput from "./QuotationSuggestionInput";

const JobSheetForm = ({
  orderDate,
  setOrderDate,
  clientCompanyName,
  setClientCompanyName,
  clientName,
  setClientName,
  contactNumber,
  setContactNumber,
  deliveryDate,
  setDeliveryDate,
  deliveryTime,
  setDeliveryTime,
  crmIncharge,
  setCrmIncharge,
  poNumber,
  setPoNumber,
  deliveryType,
  setDeliveryType,
  deliveryMode,
  setDeliveryMode,
  deliveryCharges,
  setDeliveryCharges,
  deliveryAddress,
  setDeliveryAddress,
  giftBoxBagsDetails,
  setGiftBoxBagsDetails,
  packagingInstructions,
  setPackagingInstructions,
  otherDetails,
  setOtherDetails,
  referenceQuotation,
  setReferenceQuotation,
  handleQuotationSelect, // NEW: callback when a quotation is selected
  companies,
  dropdownOpen,
  setDropdownOpen,
  handleCompanySelect,
  handleOpenCompanyModal
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
      {/* Order Date */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Order Date *
        </label>
        <input
          type="date"
          className="border border-purple-300 rounded w-full p-2"
          value={orderDate}
          onChange={(e) => setOrderDate(e.target.value)}
          required
        />
      </div>

      {/* Client Company */}
      <div className="relative">
        <label className="block mb-1 font-medium text-purple-700">
          Client Company *
        </label>
        <input
          type="text"
          className="border border-purple-300 rounded w-full p-2"
          value={clientCompanyName}
          onChange={(e) => {
            setClientCompanyName(e.target.value);
            setDropdownOpen(true);
          }}
          required
        />
        {dropdownOpen && clientCompanyName && (
          <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full">
            {companies
              .filter((company) =>
                company.companyName
                  .toLowerCase()
                  .includes(clientCompanyName.toLowerCase())
              )
              .map((company) => (
                <div
                  key={company._id}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                  onClick={() => handleCompanySelect(company)}
                >
                  {company.companyName}
                </div>
              ))}
            <div
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={handleOpenCompanyModal}
            >
              + Create Company
            </div>
          </div>
        )}
      </div>

      {/* Client Name (auto-filled from company model) */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Client Name *
        </label>
        <input
          type="text"
          readOnly
          className="border border-purple-300 rounded w-full p-2 bg-gray-100"
          value={clientName}
          placeholder="Auto-filled from company"
        />
      </div>

      {/* Contact Number (auto-filled from company model) */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Contact Number
        </label>
        <input
          type="text"
          readOnly
          className="border border-purple-300 rounded w-full p-2 bg-gray-100"
          value={contactNumber}
          placeholder="Auto-filled from company"
        />
      </div>

      {/* Delivery Date */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Date *
        </label>
        <input
          type="date"
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryDate}
          onChange={(e) => setDeliveryDate(e.target.value)}
          required
        />
      </div>

      {/* Delivery Time */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Time
        </label>
        <input
          type="text"
          placeholder="e.g. 2:00 PM"
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryTime}
          onChange={(e) => setDeliveryTime(e.target.value)}
        />
      </div>

      {/* CRM Incharge using ERP suggestion */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          CRM Incharge
        </label>
        <UserSuggestionInput
          value={crmIncharge}
          onChange={setCrmIncharge}
          placeholder="Enter CRM Incharge"
          label=""
          onUserSelect={() => {
            // No extra action required.
          }}
        />
      </div>

      {/* PO Number using ERP suggestion for Purchase Orders */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          PO Number
        </label>
        <PurchaseOrderSuggestionInput
          value={poNumber}
          onChange={setPoNumber}
          placeholder="Enter PO Number"
          label=""
        />
      </div>

      {/* Delivery Type */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Type
        </label>
        <input
          type="text"
          placeholder="e.g. Standard, Express"
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryType}
          onChange={(e) => setDeliveryType(e.target.value)}
        />
      </div>

      {/* Delivery Mode */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Mode
        </label>
        <input
          type="text"
          placeholder="e.g. Courier, Self-delivery"
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryMode}
          onChange={(e) => setDeliveryMode(e.target.value)}
        />
      </div>

      {/* Delivery Charges */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Charges
        </label>
        <input
          type="text"
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryCharges}
          onChange={(e) => setDeliveryCharges(e.target.value)}
        />
      </div>

      {/* Delivery Address */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Address
        </label>
        <textarea
          className="border border-purple-300 rounded w-full p-2"
          value={deliveryAddress}
          onChange={(e) => setDeliveryAddress(e.target.value)}
        />
      </div>

      {/* Gift Box/Bags Details */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Gift Box/Bags Details
        </label>
        <textarea
          className="border border-purple-300 rounded w-full p-2"
          value={giftBoxBagsDetails}
          onChange={(e) => setGiftBoxBagsDetails(e.target.value)}
        />
      </div>

      {/* Packaging Instructions */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Packaging Instructions
        </label>
        <textarea
          className="border border-purple-300 rounded w-full p-2"
          value={packagingInstructions}
          onChange={(e) => setPackagingInstructions(e.target.value)}
        />
      </div>

      {/* Other Details */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Other Details
        </label>
        <textarea
          className="border border-purple-300 rounded w-full p-2"
          value={otherDetails}
          onChange={(e) => setOtherDetails(e.target.value)}
        />
      </div>

      
    </div>
  );
};

export default JobSheetForm;
