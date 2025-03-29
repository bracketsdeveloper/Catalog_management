import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import UserSuggestionInput from "./UserSuggestionInput";
import PurchaseOrderSuggestionInput from "./PurchaseOrderSuggestionInput";
import QuotationSuggestionInput from "./QuotationSuggestionInput";

import "react-datepicker/dist/react-datepicker.css";

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
  deliveryAddress = [],
  setDeliveryAddress,
  giftBoxBagsDetails,
  setGiftBoxBagsDetails,
  packagingInstructions,
  setPackagingInstructions,
  otherDetails,
  setOtherDetails,
  referenceQuotation,
  setReferenceQuotation,
  handleQuotationSelect,
  eventName,
  setEventName,
  companies,
  dropdownOpen,
  setDropdownOpen,
  handleCompanySelect,
  handleOpenCompanyModal,
  selectedItems,
  handleInlineUpdate,
  handleRemoveSelectedItem,
  handleEditItem,
  brandingTypeOptions = ["Screen Printing", "Embroidery", "Heat Transfer", "Patch", "Digital Printing", "Other"]
}) => {
  const [addresses, setAddresses] = useState(
    deliveryAddress?.length ? [...deliveryAddress] : [""]
  );

  // Delivery options
  const deliveryModeOptions = ["Surface", "Air", "Other"];
  const deliveryTypeOptions = [
    "Single office delivery",
    "Multiple office delivery",
    "Individual doorstep courier",
    "Mixed",
    "Others"
  ];
  const deliveryChargesOptions = ["Included in cost", "Additional at actual"];

  // Convert string dates to Date objects for react-datepicker
  const orderDateObj = orderDate ? parse(orderDate, "yyyy-MM-dd", new Date()) : null;
  const deliveryDateObj = deliveryDate ? parse(deliveryDate, "yyyy-MM-dd", new Date()) : null;

  const handleOrderDateChange = (date) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setOrderDate(formattedDate);
  };

  const handleDeliveryDateChange = (date) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setDeliveryDate(formattedDate);
  };

  const handleAddAddress = () => {
    setAddresses([...addresses, ""]);
  };

  const handleAddressChange = (index, value) => {
    const newAddresses = [...addresses];
    newAddresses[index] = value;
    setAddresses(newAddresses);
    setDeliveryAddress(newAddresses.filter((addr) => addr.trim() !== ""));
  };

  const handleRemoveAddress = (index) => {
    const newAddresses = addresses.filter((_, i) => i !== index);
    setAddresses(newAddresses);
    setDeliveryAddress(newAddresses.filter((addr) => addr.trim() !== ""));
  };

  const CustomDateInput = React.forwardRef(({ value, onClick }, ref) => (
    <input
      className="border border-purple-300 rounded w-full p-2"
      onClick={onClick}
      ref={ref}
      value={value}
      readOnly
      placeholder="DD/MM/YYYY"
    />
  ));

  return (
    <div className="space-y-4 mb-6">
      {/* Row 1: Client Company (full width) */}
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

      {/* Row 2: Client Name and Contact Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Client Name *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Contact Number
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Row 3: Event Name, Order Date, and CRM Incharge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Event Name *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Order Date *
          </label>
          <DatePicker
            selected={orderDateObj}
            onChange={handleOrderDateChange}
            dateFormat="dd/MM/yyyy"
            customInput={<CustomDateInput />}
            required
            placeholderText="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            CRM Incharge *
          </label>
          <UserSuggestionInput
            value={crmIncharge}
            onChange={setCrmIncharge}
            placeholder="Select CRM Incharge"
            required
          />
        </div>
      </div>

      {/* Row 4: Reference Quotation (30% width) */}
      <div className="w-full md:w-1/3">
        <label className="block mb-1 font-medium text-purple-700">
          Reference Quotation
        </label>
        <QuotationSuggestionInput
          value={referenceQuotation}
          onChange={setReferenceQuotation}
          placeholder="Enter Reference Quotation"
          label=""
          onSelect={handleQuotationSelect}
        />
      </div>

      {/* Row 5: Products Table */}
      {referenceQuotation && selectedItems.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-purple-700 mb-2">Products</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Color</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Size</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sourcing From</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branding Type</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Branding Vendor</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.product}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.color || "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">{item.size || "-"}</td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        min="1"
                        className="w-16 border rounded p-1"
                        value={item.quantity}
                        onChange={(e) => handleInlineUpdate(idx, "quantity", e.target.value)}
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        value={item.sourcingFrom || ""}
                        onChange={(e) => handleInlineUpdate(idx, "sourcingFrom", e.target.value)}
                        placeholder="Enter sourcing"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <select
                        className="border rounded p-1 w-full"
                        value={item.brandingType || ""}
                        onChange={(e) => handleInlineUpdate(idx, "brandingType", e.target.value)}
                      >
                        <option value="">Select Branding Type</option>
                        {brandingTypeOptions.map((option, index) => (
                          <option key={index} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="text"
                        className="border rounded p-1 w-full"
                        value={item.brandingVendor || ""}
                        onChange={(e) => handleInlineUpdate(idx, "brandingVendor", e.target.value)}
                        placeholder="Enter Vendor"
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <button
                        onClick={() => handleEditItem(idx)}
                        className="text-blue-600 hover:text-blue-900 mr-2"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleRemoveSelectedItem(idx)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Row 6: Delivery Type, Mode, Charges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Delivery Type *
          </label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            required
          >
            <option value="">Select Delivery Type</option>
            {deliveryTypeOptions.map((option, index) => (
              <option key={`type-${index}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Delivery Mode *
          </label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value)}
            required
          >
            <option value="">Select Delivery Mode</option>
            {deliveryModeOptions.map((option, index) => (
              <option key={`mode-${index}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Delivery Charges *
          </label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryCharges}
            onChange={(e) => setDeliveryCharges(e.target.value)}
            required
          >
            <option value="">Select Delivery Charges</option>
            {deliveryChargesOptions.map((option, index) => (
              <option key={`charges-${index}`} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row 7: Delivery Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Delivery Date *
          </label>
          <DatePicker
            selected={deliveryDateObj}
            onChange={handleDeliveryDateChange}
            dateFormat="dd/MM/yyyy"
            customInput={<CustomDateInput />}
            required
            placeholderText="DD/MM/YYYY"
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Delivery Time
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            placeholder="e.g. 10:00 AM"
          />
        </div>
      </div>

      {/* Row 8: Delivery Addresses */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">
          Delivery Addresses
        </label>
        {addresses.map((address, index) => (
          <div key={index} className="flex items-center mb-2">
            <textarea
              className="border border-purple-300 rounded w-full p-2"
              value={address}
              onChange={(e) => handleAddressChange(index, e.target.value)}
              placeholder={`Address ${index + 1}`}
            />
            {index > 0 && (
              <button
                type="button"
                onClick={() => handleRemoveAddress(index)}
                className="ml-2 text-red-600 hover:text-red-800"
              >
                ×
              </button>
            )}
          </div>
        ))}
        <button
          type="button"
          onClick={handleAddAddress}
          className="mt-2 bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-sm"
        >
          + Add Another Address
        </button>
      </div>

      {/* Row 9: Gift Box/Bags Details and Packaging Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
      </div>

      {/* Row 10: Other Details */}
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
