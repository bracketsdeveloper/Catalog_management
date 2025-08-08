import React, { useState, forwardRef, useEffect } from "react";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import UserSuggestionInput from "./UserSuggestionInput";
import QuotationSuggestionInput from "./QuotationSuggestionInput";
import "react-datepicker/dist/react-datepicker.css";
import axios from "axios";

const OpportunitySuggestionInput = ({ value, onChange, onSelect, placeholder, suggestions }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleInputChange = (e) => {
    onChange(e.target.value);
    setDropdownOpen(true);
  };

  const handleSelect = (opportunity) => {
    onSelect(opportunity);
    setDropdownOpen(false);
  };

  return (
    <div className="relative w-full">
      <input
        type="text"
        className="border border-purple-300 rounded w-full p-2"
        value={value}
        onChange={handleInputChange}
        placeholder={placeholder}
      />
      {dropdownOpen && suggestions.length > 0 && (
        <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-60 overflow-y-auto">
          {suggestions.map((opportunity, index) => (
            <div
              key={index}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(opportunity)}
            >
              {opportunity.opportunityCode} - {opportunity.opportunityName}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

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
  poStatus,
  setPoStatus,
  customPoStatus,
  setCustomPoStatus,
  deliveryType,
  setDeliveryType,
  deliveryMode,
  setDeliveryMode,
  deliveryCharges,
  setDeliveryCharges,
  deliveryAddress,
  setDeliveryAddress,
  brandingFileName,
  setBrandingFileName,
  giftBoxBagsDetails,
  setGiftBoxBagsDetails,
  packagingInstructions,
  setPackagingInstructions,
  otherDetails,
  setOtherDetails,
  referenceQuotation,
  setReferenceQuotation,
  fetchQuotation,
  quotationSuggestions,
  handleQuotationSelect,
  eventName,
  setEventName,
  opportunityNumber,
  setOpportunityNumber,
  opportunitySuggestions,
  handleOpportunitySelect,
  companies,
  dropdownOpen,
  setDropdownOpen,
  handleCompanySelect,
  handleOpenCompanyModal,
  selectedItems,
  handleInlineUpdate,
  handleRemoveSelectedItem,
  handleEditItem,
  clients,
  clientDropdownOpen,
  setClientDropdownOpen,
  handleClientSelect,
  brandingTypeOptions = [
    "Screen Printing",
    "Sublimation Printing",
    "HT Printing",
    "Engraving",
    "Embroidery",
    "UV Printing",
    "DTF Stickering",
    "Embossing",
    "Debossing",
    "Digital Printing",
    "Offset Printing",
    "Others",
  ],
}) => {
  const [addresses, setAddresses] = useState(deliveryAddress.length > 0 ? deliveryAddress : [""]);
  const [customDeliveryType, setCustomDeliveryType] = useState("");
  const [customDeliveryMode, setCustomDeliveryMode] = useState("");
  const [vendorSuggestions, setVendorSuggestions] = useState([]);
  const [vendorOtherMap, setVendorOtherMap] = useState({});
  const [sourcingOtherMap, setSourcingOtherMap] = useState({});

  const deliveryTypeOptions = [
    "Single office delivery",
    "Multiple office delivery",
    "Individual doorstep courier",
    "Mixed",
    "Others",
  ];
  const deliveryModeOptions = ["Surface", "Air", "Other"];
  const deliveryChargesOptions = ["Included in cost", "Additional at actual"];

  const orderDateObj = orderDate ? parse(orderDate, "yyyy-MM-dd", new Date()) : null;
  const deliveryDateObj = deliveryDate ? parse(deliveryDate, "yyyy-MM-dd", new Date()) : null;

  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  useEffect(() => {
    fetchVendors();
    setAddresses(deliveryAddress.length > 0 ? deliveryAddress : [""]);
  }, [deliveryAddress]);

  const fetchVendors = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setVendorSuggestions(res.data || []);
    } catch (err) {
      console.error("Error fetching vendors:", err);
    }
  };

  const syncWithParent = (newArray) => {
    setAddresses(newArray);
    setDeliveryAddress(newArray);
  };

  const handleOrderDateChange = (date) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setOrderDate(formattedDate);
  };

  const handleDeliveryDateChange = (date) => {
    const formattedDate = date ? format(date, "yyyy-MM-dd") : "";
    setDeliveryDate(formattedDate);
  };

  const handleAddAddress = () => {
    const newArr = [...addresses, ""];
    syncWithParent(newArr);
  };

  const handleAddressChange = (index, value) => {
    const newArr = [...addresses];
    newArr[index] = value;
    syncWithParent(newArr);
  };

  const handleRemoveAddress = (index) => {
    const newArr = addresses.filter((_, i) => i !== index);
    syncWithParent(newArr);
  };

  const CustomDateInput = forwardRef(({ value, onClick }, ref) => (
    <input
      className="border border-purple-300 rounded w-full p-2"
      onClick={onClick}
      ref={ref}
      value={value}
      readOnly
      placeholder="DD/MM/YYYY"
    />
  ));

  const getCurrentCompanyClients = () => {
    if (!clientCompanyName) return [];
    const selectedCompany = companies.find(
      (company) => company.companyName === clientCompanyName
    );
    return selectedCompany?.clients || [];
  };

  const currentCompanyClients = getCurrentCompanyClients();

  return (
    <div className="space-y-4 mb-6">
      {/* Row: Opportunity Number and Reference Quotation */}
      <div className="flex w-full justify-between space-x-4">
        <div className="w-1/2">
          <label className="block mb-1 font-medium text-purple-700">Opportunity Number</label>
          <OpportunitySuggestionInput
            value={opportunityNumber}
            onChange={setOpportunityNumber}
            onSelect={handleOpportunitySelect}
            placeholder="Enter Opportunity Number"
            suggestions={opportunitySuggestions}
            required
          />
        </div>
        <div className="w-1/2">
          <label className="block mb-1 font-medium text-purple-700">Reference Quotation</label>
          <div className="flex space-x-3">
            <QuotationSuggestionInput
              value={referenceQuotation}
              onChange={setReferenceQuotation}
              placeholder="Enter Reference Quotation"
              suggestions={quotationSuggestions}
              onSelect={handleQuotationSelect}
            />
            <button
              type="button"
              onClick={fetchQuotation}
              className="bg-gray-200 hover:bg-gray-300 px-4 rounded"
            >
              Fetch
            </button>
          </div>
        </div>
      </div>

      {/* Row: PO Number and PO Status */}
      <div className="flex w-full justify-between space-x-4">
        <div className="w-1/2 space-y-2">
          <div>
            <label className="block mb-1 font-medium text-purple-700">PO Number</label>
            <input
              type="text"
              className="border border-purple-300 rounded w-full p-2"
              placeholder="PO Number"
              value={poNumber}
              onChange={(e) => setPoNumber(e.target.value)}
            />
          </div>
        </div>
        <div className="w-1/2 space-y-2">
          <div>
            <label className="block mb-1 font-medium text-purple-700">PO Status</label>
            <div className="flex items-center space-x-2">
              <select
                className="border border-purple-300 rounded p-2 w-full"
                value={poStatus}
                onChange={(e) => setPoStatus(e.target.value)}
              >
                <option value="">Select PO Status</option>
                <option value="PO Awaited, Wait for Invoice">PO Awaited, Wait for Invoice</option>
                <option value="PO Received, Generate Invoice">PO Received, Generate Invoice</option>
                <option value="No PO, No Invoice">No PO, No Invoice</option>
                <option value="No PO, Direct Invoice">No PO, Direct Invoice</option>
                <option value="Custom">Custom</option>
              </select>
              {poStatus === "Custom" && (
                <input
                  type="text"
                  className="border border-purple-300 rounded p-2"
                  placeholder="Enter custom PO status"
                  value={customPoStatus}
                  onChange={(e) => setCustomPoStatus(e.target.value)}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Row: Client Company */}
      <div className="relative">
        <label className="block mb-1 font-medium text-purple-700">Client Company *</label>
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
                company.companyName.toLowerCase().includes(clientCompanyName.toLowerCase())
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

      {/* Row: Client Name and Contact Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="relative">
          <label className="block mb-1 font-medium text-purple-700">Client Name *</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={clientName}
            onChange={(e) => {
              setClientName(e.target.value);
              setClientDropdownOpen(true);
            }}
            required
          />
          {clientDropdownOpen && currentCompanyClients.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full">
              {currentCompanyClients
                .filter((client) =>
                  client.name.toLowerCase().includes(clientName.toLowerCase())
                )
                .map((client, index) => (
                  <div
                    key={index}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleClientSelect(client)}
                  >
                    {client.name} ({client.contactNumber})
                  </div>
                ))}
            </div>
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Contact Number</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={contactNumber}
            onChange={(e) => setContactNumber(e.target.value)}
          />
        </div>
      </div>

      {/* Row: Event Name, Order Date, CRM Incharge */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">Event Name *</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={eventName}
            onChange={(e) => setEventName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Order Date *</label>
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
          <label className="block mb-1 font-medium text-purple-700">CRM Incharge *</label>
          <UserSuggestionInput
            value={crmIncharge}
            onChange={setCrmIncharge}
            placeholder="Select CRM Incharge"
            required
          />
        </div>
      </div>

      {/* Row: If Quotation + items => show table of items */}
      {referenceQuotation && selectedItems.length > 0 && (
        <div className="mt-4">
          <h3 className="font-medium text-purple-700 mb-2">Products</h3>
          <div className="border rounded-lg overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Color
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Size
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Qty
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sourcing From
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branding Type
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Branding Vendor
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {selectedItems.map((item, idx) => (
                  <tr key={idx}>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.product}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.color || "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {item.size || "-"}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <input
                        type="number"
                        min="1"
                        className="w-16 border rounded p-1"
                        value={item.quantity}
                        onChange={(e) =>
                          handleInlineUpdate(idx, "quantity", e.target.value)
                        }
                      />
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {sourcingOtherMap[idx] ? (
                        <div className="relative">
                          <input
                            type="text"
                            className="border rounded p-1 w-full"
                            value={item.sourcingFrom || ""}
                            onChange={(e) =>
                              handleInlineUpdate(idx, "sourcingFrom", e.target.value)
                            }
                            placeholder="Enter Sourcing"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setSourcingOtherMap((prev) => ({ ...prev, [idx]: false }))
                            }
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                          >
                            Go to option
                          </button>
                        </div>
                      ) : (
                        <select
                          className="border rounded p-1 w-full"
                          value={item.sourcingFrom || ""}
                          onChange={(e) => {
                            const selected = e.target.value;
                            if (selected === "Other") {
                              setSourcingOtherMap((prev) => ({ ...prev, [idx]: true }));
                              handleInlineUpdate(idx, "sourcingFrom", "");
                            } else {
                              handleInlineUpdate(idx, "sourcingFrom", selected);
                            }
                          }}
                        >
                          <option value="">Select Sourcing</option>
                          {vendorSuggestions.map((vendor, i) => (
                            <option key={i} value={vendor.vendorName}>
                              {vendor.vendorName}
                            </option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      )}
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      <select
                        className="border rounded p-1 w-full"
                        value={item.brandingType || ""}
                        onChange={(e) =>
                          handleInlineUpdate(idx, "brandingType", e.target.value)
                        }
                      >
                        <option value="">Select Branding Type</option>
                        {brandingTypeOptions.map((option, optionIdx) => (
                          <option key={optionIdx} value={option}>
                            {option}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-900">
                      {vendorOtherMap[idx] ? (
                        <div className="relative">
                          <input
                            type="text"
                            className="border rounded p-1 w-full"
                            value={item.brandingVendor || ""}
                            onChange={(e) =>
                              handleInlineUpdate(idx, "brandingVendor", e.target.value)
                            }
                            placeholder="Enter Vendor"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              setVendorOtherMap((prev) => ({ ...prev, [idx]: false }))
                            }
                            className="absolute top-2 right-2 text-gray-600 hover:text-gray-900"
                          >
                            Go to option
                          </button>
                        </div>
                      ) : (
                        <select
                          className="border rounded p-1 w-full"
                          value={item.brandingVendor || ""}
                          onChange={(e) => {
                            const selected = e.target.value;
                            if (selected === "Other") {
                              setVendorOtherMap((prev) => ({ ...prev, [idx]: true }));
                              handleInlineUpdate(idx, "brandingVendor", "");
                            } else {
                              handleInlineUpdate(idx, "brandingVendor", selected);
                            }
                          }}
                        >
                          <option value="">Select Vendor</option>
                          {vendorSuggestions.map((vendor, i) => (
                            <option key={i} value={vendor.vendorName}>
                              {vendor.vendorName}
                            </option>
                          ))}
                          <option value="Other">Other</option>
                        </select>
                      )}
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

      {/* Row: Delivery Type, Delivery Mode, Delivery Charges */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">Delivery Type *</label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryType}
            onChange={(e) => setDeliveryType(e.target.value)}
            required
          >
            <option value="">Select Delivery Type</option>
            {deliveryTypeOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          {deliveryType === "Others" && (
            <input
              type="text"
              className="border border-purple-300 rounded w-full p-2 mt-2"
              placeholder="Enter other delivery type"
              value={customDeliveryType}
              onChange={(e) => setCustomDeliveryType(e.target.value)}
            />
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Delivery Mode *</label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryMode}
            onChange={(e) => setDeliveryMode(e.target.value)}
            required
          >
            <option value="">Select Delivery Mode</option>
            {deliveryModeOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
          {deliveryMode === "Other" && (
            <input
              type="text"
              className="border border-purple-300 rounded w-full p-2 mt-2"
              placeholder="Enter other delivery mode"
              value={customDeliveryMode}
              onChange={(e) => setCustomDeliveryMode(e.target.value)}
            />
          )}
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Delivery Charges *</label>
          <select
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryCharges}
            onChange={(e) => setDeliveryCharges(e.target.value)}
            required
          >
            <option value="">Select Delivery Charges</option>
            {deliveryChargesOptions.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Row: Delivery Date and Time */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">Delivery Date *</label>
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
          <label className="block mb-1 font-medium text-purple-700">Delivery Time</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={deliveryTime}
            onChange={(e) => setDeliveryTime(e.target.value)}
            placeholder="e.g. 10:00 AM"
          />
        </div>
      </div>

      {/* Row: Delivery Addresses */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">Delivery Addresses</label>
        {addresses.map((address, index) => (
          <div key={index} className="flex items-start mb-2">
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

      {/* Row: Branding File Name */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">Branding File Name</label>
        <input
          type="text"
          className="border border-purple-300 rounded w-full p-2"
          placeholder="Enter branding file name"
          value={brandingFileName}
          onChange={(e) => setBrandingFileName(e.target.value)}
        />
      </div>

      {/* Row: Gift Box/Bags Details and Packaging Instructions */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-medium text-purple-700">Gift Box/Bags Details</label>
          <textarea
            className="border border-purple-300 rounded w-full p-2"
            value={giftBoxBagsDetails}
            onChange={(e) => setGiftBoxBagsDetails(e.target.value)}
          />
        </div>
        <div>
          <label className="block mb-1 font-medium text-purple-700">Packaging Instructions</label>
          <textarea
            className="border border-purple-300 rounded w-full p-2"
            value={packagingInstructions}
            onChange={(e) => setPackagingInstructions(e.target.value)}
          />
        </div>
      </div>

      {/* Row: Other Details */}
      <div>
        <label className="block mb-1 font-medium text-purple-700">Other Details</label>
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
