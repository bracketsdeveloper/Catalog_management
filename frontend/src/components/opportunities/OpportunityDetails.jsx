import React, { useState } from "react";
import DatePicker from "react-datepicker";
import { format, parse } from "date-fns";
import FunnelGraphic from "./FunnelGraphic";
import CreateCompanyModal from "./CreateCompanyModal";
import CreateContactModal from "./CreateContactModal";

export default function OpportunityDetails({
  data,
  setData,
  handleChange,
  handleSliderChange,
  companies,
  users,
}) {
  // Normalize companies prop to an array for suggestions
  const companiesArr = Array.isArray(companies)
    ? companies
    : companies && companies.companies
    ? companies.companies
    : [];

  // Local state for modal visibility
  const [showCreateCompanyModal, setShowCreateCompanyModal] = useState(false);
  const [showCreateContactModal, setShowCreateContactModal] = useState(false);
  // Local state for suggestion lists
  const [accountSuggestions, setAccountSuggestions] = useState([]);
  const [contactSuggestions, setContactSuggestions] = useState([]);
  const [ownerSuggestions, setOwnerSuggestions] = useState([]);
  const [isOpportunityName, setIsOpportunityName] = useState(false);
 
  // Add error state
  const [errors, setErrors] = useState({});

  // Add state for opportunity name suggestions
  const [opportunityNameSuggestions, setOpportunityNameSuggestions] = useState([]);

  const openModal = () => {
    setIsOpportunityName(true);
  }

  const closeModal = () => {
    setIsOpportunityName(false)
  }

  // Add validation handler
  const validateField = (fieldName, value) => {
    const requiredFields = {
      opportunityName: 'Opportunity Name',
      customOpportunityName: 'CustomOpportunity Name',
      account: 'Account',
      opportunityValue: 'Opportunity Value',
      currency: 'Currency',
      closureDate: 'Closure Date',
      opportunityOwner: 'Opportunity Owner',
      contact: 'Contact',
      freeTextField: 'Reason for Won / Lost / Discontinued'
    };

    let errorMessage = '';
    if (!value) {
      // Make freeTextField mandatory only when opportunityStatus is Lost or Discontinued
      if (fieldName === 'freeTextField' && 
          (data.opportunityStatus === 'Lost' || data.opportunityStatus === 'Discontinued')) {
        errorMessage = `${requiredFields[fieldName]} is required`;
      } else if (fieldName !== 'freeTextField') {
        errorMessage = `${requiredFields[fieldName]} is required`;
      }
    } else if (fieldName === 'opportunityOwner') {
      const userExists = users.some(user => user.name === value);
      if (!userExists) {
        errorMessage = 'User does not exist';
      }
    }

    setErrors(prev => ({
      ...prev,
      [fieldName]: errorMessage
    }));
  };

  // When user picks a stage from the funnel
  const handleStageSelect = (stage) => {
    setData((prev) => ({
      ...prev,
      opportunityStage: stage,
      // Only keep status if stage is "Won/Lost/Discontinued"
      opportunityStatus: stage === "Won/Lost/Discontinued" ? prev.opportunityStatus : "",
    }));
  };

  // For the "Account" field, find the matching company so we can show its clients as options for "Contact"
  const selectedCompany = companiesArr.find((c) => c.companyName === data.account);
  const contactOptions =
    selectedCompany && Array.isArray(selectedCompany.clients)
      ? selectedCompany.clients
      : [];

  // Handle Account change with suggestion dropdown
  const handleAccountChange = (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, account: value }));
    // If input is empty, show all companies; otherwise, filter based on the input
    const suggestions =
      value.trim() === ""
        ? companiesArr
        : companiesArr.filter((c) =>
            c.companyName.toLowerCase().includes(value.toLowerCase())
          );
    setAccountSuggestions(suggestions);
  };

  const handleSelectAccountSuggestion = (companyName) => {
    setData((prev) => ({ ...prev, account: companyName }));
    setAccountSuggestions([]);
  };

  // Handle Contact change with suggestion dropdown
  const handleContactChange = (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, contact: value }));
    if (data.account) {
      const selectedComp = companiesArr.find((c) => c.companyName === data.account);
      if (selectedComp && Array.isArray(selectedComp.clients)) {
        const suggestions =
          value.trim() === ""
            ? selectedComp.clients
            : selectedComp.clients.filter((client) =>
                client.name.toLowerCase().includes(value.toLowerCase())
              );
        setContactSuggestions(suggestions);
      }
    }
  };

  const handleSelectContactSuggestion = (contactName) => {
    setData((prev) => ({ ...prev, contact: contactName }));
    setContactSuggestions([]);
  };

  // DatePicker handler
  const handleDateChange = (date) => {
    if (date) {
      const formatted = format(date, "dd/MM/yyyy");
      setData((prev) => ({ ...prev, closureDate: formatted }));
    } else {
      setData((prev) => ({ ...prev, closureDate: "" }));
    }
  };

  const handleOwnerInputChange = (e) => {
    const value = e.target.value;
    handleChange(e); // Update the data state
    // Filter and sort users
    const filteredUsers = users.filter(user => 
      user.name.toLowerCase().includes(value.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
    setOwnerSuggestions(filteredUsers);
  };

  const handleSelectOwnerSuggestion = (userName) => {
    setData(prev => ({ ...prev, opportunityOwner: userName }));
    setOwnerSuggestions([]);
  };

  const opportunityName = [
    "Annual Gifts",
    "Awards & Trophies",
    "Bags / Suitcases",
    "C-Level Gifts",
    "Campus Giveaways",
    "Client Gifts",
    "Conference Gifts",
    "Cultural Gifts",
    "Dealers Meet Gifts",
    "Doctors Gifts",
    "Evolve",
    "Exhibition Giveaways",
    "Farewell Gifts",
    "Festive Gifts",
    "Get Well Soon Gifts",
    "Gifts Under 500",
    "Gifts under 1000",
    "Gifts under 2000",
    "Hoodies",
    "Joining Kit",
    "Luxury Gifts",
    "New Parents Gifts",
    "Offsite Gifts",
    "Pre Joininers Kit",
    "Team Giveaways",
    "T-shirts",
    "Training Giveaways",
    "Travel Gifts",
    "Work Anniversary Gifts",
    "Others"
  ];

  // Handle opportunity name input change with suggestions
  const handleOpportunityNameChange = (e) => {
    const value = e.target.value;
    setData((prev) => ({ ...prev, opportunityName: value }));
    // Filter suggestions based on input
    const suggestions = opportunityName.filter((name) =>
      name.toLowerCase().includes(value.toLowerCase())
    );
    setOpportunityNameSuggestions(suggestions);
  };

  const handleSelectOpportunityNameSuggestion = (name) => {
    setData((prev) => ({ ...prev, opportunityName: name }));
    setOpportunityNameSuggestions([]);
  };

  // Determine if freeTextField is mandatory
  const isFreeTextMandatory = data.opportunityStatus === 'Lost' || data.opportunityStatus === 'Discontinued';

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* LEFT: Form Fields */}
      <div className="w-full md:w-2/3 space-y-4">
        {/* Row 1: Opportunity Name, Account, Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Opportunity Name (updated to text field with suggestions) */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="opportunityName"
              value={data.opportunityName}
              onChange={handleOpportunityNameChange}
              onBlur={(e) => validateField('opportunityName', e.target.value)}
              className={`border rounded w-full px-2 py-1 text-sm ${
                errors.opportunityName ? 'border-red-500' : ''
              }`}
              placeholder="Enter Opportunity Name"
            />
            {errors.opportunityName && (
              <div className="text-red-500 text-xs mt-1">{errors.opportunityName}</div>
            )}
            {opportunityNameSuggestions.length > 0 && (
              <div className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-auto">
                {opportunityNameSuggestions.map((name, index) => (
                  <div
                    key={index}
                    className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSelectOpportunityNameSuggestion(name)}
                  >
                    {name}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Account with suggestions and Create button */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Account <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="text"
                name="account"
                value={data.account}
                onChange={handleAccountChange}
                onBlur={(e) => validateField('account', e.target.value)}
                className={`border rounded-l w-full px-2 py-1 text-sm ${
                  errors.account ? 'border-red-500' : ''
                }`}
                placeholder="Enter Company Name"
              />
              <button
                type="button"
                onClick={() => setShowCreateCompanyModal(true)}
                className="bg-blue-500 text-white px-2 py-1 rounded-r text-sm"
              >
                +
              </button>
            </div>
            {errors.account && (
              <div className="text-red-500 text-xs mt-1">{errors.account}</div>
            )}
            {accountSuggestions.length > 0 && (
              <div className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-auto">
                {accountSuggestions.map((company) => (
                  <div
                    key={company._id}
                    className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSelectAccountSuggestion(company.companyName)}
                  >
                    {company.companyName}
                  </div>
                ))}
              </div>
            )}
          </div>
          {/* Contact with suggestions and Create button (updated to be mandatory) */}
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contact <span className="text-red-500">*</span>
            </label>
            <div className="flex">
              <input
                type="text"
                name="contact"
                value={data.contact}
                onChange={handleContactChange}
                onBlur={(e) => validateField('contact', e.target.value)}
                className={`border rounded-l w-full px-2 py-1 text-sm ${
                  errors.contact ? 'border-red-500' : ''
                }`}
                placeholder="Enter Contact Name"
                disabled={!data.account}
              />
              <button
                type="button"
                onClick={() => setShowCreateContactModal(true)}
                className="bg-blue-500 text-white px-2 py-1 rounded-r text-sm"
                disabled={!data.account}
              >
                +
              </button>
            </div>
            {errors.contact && (
              <div className="text-red-500 text-xs mt-1">{errors.contact}</div>
            )}
            {contactSuggestions.length > 0 && (
              <div className="absolute z-10 bg-white border border-gray-300 w-full mt-1 max-h-40 overflow-auto">
                {contactSuggestions.map((client, idx) => (
                  <div
                    key={idx}
                    className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSelectContactSuggestion(client.name)}
                  >
                    {client.name}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Opportunity Type */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Type
            </label>
            <select
              name="opportunityType"
              value={data.opportunityType}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="Non-Tender">Non-Tender</option>
              <option value="Tender">Tender</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* If stage is "Won/Lost/Discontinued", show Opportunity Status */}
        {data.opportunityStage === "Won/Lost/Discontinued" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">
                Opportunity Status
              </label>
              <select
                name="opportunityStatus"
                value={data.opportunityStatus}
                onChange={handleChange}
                className="border rounded w-full px-2 py-1 text-sm"
              >
                <option value="">--Select--</option>
                <option value="Won">Won</option>
                <option value="Lost">Lost</option>
                <option value="Discontinued">Discontinued</option>
              </select>
            </div>
          </div>
        )}

        {/* Opportunity Detail, Value, Currency */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Detail
            </label>
            <textarea
              name="opportunityDetail"
              value={data.opportunityDetail}
              onChange={handleChange}
              rows={3}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="Enter details..."
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Value (Estimated) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              name="opportunityValue"
              value={data.opportunityValue}
              onChange={handleChange}
              onBlur={(e) => validateField('opportunityValue', e.target.value)}
              className={`border rounded w-full px-2 py-1 text-sm ${
                errors.opportunityValue ? 'border-red-500' : ''
              }`}
              placeholder="e.g., 10000"
              required
            />
            {errors.opportunityValue && (
              <div className="text-red-500 text-xs mt-1">{errors.opportunityValue}</div>
            )}
            <label className="block text-sm font-semibold text-gray-700 mb-1 mt-3">
              Currency <span className="text-red-500">*</span>
            </label>
            <select
              name="currency"
              value={data.currency}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="Indian Rupee">Indian Rupee</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
        </div>

        {/* Row: Lead Source, Closure Date, Closure Probability, Gross Profit */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Lead Source */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Lead Source
            </label>
            <select
              name="leadSource"
              value={data.leadSource}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="cold call">cold call</option>
              <option value="existing client reference">existing client reference</option>
              <option value="others">others</option>
            </select>
          </div>

          {/* Closure Date */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Closure Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              placeholderText="Select date"
              onChange={handleDateChange}
              dateFormat="dd/MM/yyyy"
              selected={
                data.closureDate
                  ? parse(data.closureDate, "dd/MM/yyyy", new Date())
                  : null
              }
              className="border rounded w-full px-2 py-1 text-sm"
            />
          </div>

          {/* Closure Probability */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Closure Probability
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="range"
                min={0}
                max={100}
                step={5}
                name="closureProbability"
                value={data.closureProbability}
                onChange={handleSliderChange}
                className="w-full"
              />
              <span className="text-sm font-medium w-10 text-center">
                {data.closureProbability}%
              </span>
            </div>
          </div>
        </div>

        {/* Row: Opportunity Priority, isRecurring, Deal Registration # */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Priority
            </label>
            <select
              name="opportunityPriority"
              value={data.opportunityPriority}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="Low">Low</option>
              <option value="Medium">Medium</option>
              <option value="High">High</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Is this a recurring opportunity
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isRecurring"
                checked={data.isRecurring}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="ml-2 text-sm">
                {data.isRecurring ? "Yes" : "No"}
              </span>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Deal Registration #
            </label>
            <input
              type="text"
              name="dealRegistrationNumber"
              value={data.dealRegistrationNumber}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="Optional"
            />
          </div>
        </div>

        {/* Free Text Field */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {isFreeTextMandatory ? "Reason for Won / Lost / Discontinued" : "Free Text Field"}
              {isFreeTextMandatory && <span className="text-red-500">*</span>}
            </label>
            <input
              type="text"
              name="freeTextField"
              value={data.freeTextField}
              onChange={handleChange}
              onBlur={(e) => validateField('freeTextField', e.target.value)}
              className={`border rounded w-full px-2 py-1 text-sm ${
                errors.freeTextField ? 'border-red-500' : ''
              }`}
              placeholder={isFreeTextMandatory ? "Enter reason..." : "Type here..."}
            />
            {errors.freeTextField && (
              <div className="text-red-500 text-xs mt-1">{errors.freeTextField}</div>
            )}
          </div>
        </div>

        {/* Row: Opportunity Owner, Opportunity Code, Is Active */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="relative">
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Owner <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="opportunityOwner"
              value={data.opportunityOwner}
              onChange={handleOwnerInputChange}
              onBlur={(e) => validateField('opportunityOwner', e.target.value)}
              className={`border rounded w-full px-2 py-1 text-sm ${
                errors.opportunityOwner ? 'border-red-500' : ''
              }`}
              placeholder="Start typing to search users..."
            />
            {errors.opportunityOwner && (
              <div className="text-red-500 text-xs mt-1">{errors.opportunityOwner}</div>
            )}
            {ownerSuggestions.length > 0 && (
              <div className="absolute bottom-full z-10 bg-white border border-gray-300 w-full mb-1 max-h-40 overflow-auto">
                {ownerSuggestions.map((user) => (
                  <div
                    key={user._id}
                    className="px-2 py-1 hover:bg-gray-200 cursor-pointer"
                    onClick={() => handleSelectOwnerSuggestion(user.name)}
                  >
                    {user.name}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Code
            </label>
            <input
              type="text"
              name="opportunityCode"
              value={data.opportunityCode}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="Auto-generated or manual"
              disabled
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Is Active
            </label>
            <div className="flex items-center">
              <input
                type="checkbox"
                name="isActive"
                checked={data.isActive}
                onChange={handleChange}
                className="h-4 w-4"
              />
              <span className="ml-2 text-sm">
                {data.isActive ? "Active" : "Inactive"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* RIGHT: Funnel */}
      <div className="w-full md:w-1/3 mt-6 md:mt-0">
        <FunnelGraphic
          selectedStage={data.opportunityStage}
          onStageSelect={handleStageSelect}
        />
      </div>

      {/* Render Modals */}
      {showCreateCompanyModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateCompanyModal(false)}
          onCompanyCreated={(newCompany) => {
            setData((prev) => ({ ...prev, account: newCompany.companyName }));
            setShowCreateCompanyModal(false);
          }}
        />
      )}

      {showCreateContactModal && (
        <CreateContactModal
          onClose={() => setShowCreateContactModal(false)}
          onContactCreated={(newContact) => {
            setData((prev) => ({ ...prev, contact: newContact.name }));
            setShowCreateContactModal(false);
          }}
          companyName={data.account}
        />
      )}
    </div>
  );
}