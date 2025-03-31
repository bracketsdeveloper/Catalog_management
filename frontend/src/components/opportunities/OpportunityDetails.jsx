// ../components/opportunities/OpportunityDetails.jsx
import React from "react";
import DatePicker from "react-datepicker";
import { format } from "date-fns";
import FunnelGraphic from "./FunnelGraphic";

export default function OpportunityDetails({
  data,
  setData,
  handleChange,
  handleSliderChange,
  companies,
  users,
}) {
  // When user picks a stage from the funnel
  const handleStageSelect = (stage) => {
    setData((prev) => ({
      ...prev,
      opportunityStage: stage,
      // Only keep status if stage is Won/Lost/Discontinued
      opportunityStatus: stage === "Won/Lost/Discontinued" ? prev.opportunityStatus : "",
    }));
  };

  // For the "Account" field, find the matching company so we can show its clients as options for "Contact"
  const selectedCompany = companies.find((c) => c.companyName === data.account);
  const contactOptions = selectedCompany ? selectedCompany.clients : [];

  // Handle the closure date using DatePicker – store as Date object
  const handleDateChange = (date) => {
    setData((prev) => ({ ...prev, closureDate: date }));
  };

  return (
    <div className="flex flex-col md:flex-row gap-6">
      {/* LEFT: Form Fields */}
      <div className="w-full md:w-2/3 space-y-4">
        {/* Row 1: Opportunity Name, Account, Contact */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Opportunity Name */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="opportunityName"
              value={data.opportunityName}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="Enter Opportunity Name"
            />
          </div>

          {/* Account */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Account <span className="text-red-500">*</span>
            </label>
            <select
              name="account"
              value={data.account}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="">--Select Company--</option>
              {companies.map((co) => (
                <option key={co._id} value={co.companyName}>
                  {co.companyName}
                </option>
              ))}
            </select>
          </div>

          {/* Contact */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Contact
            </label>
            <select
              name="contact"
              value={data.contact}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
              disabled={!data.account}
            >
              <option value="">--Select Contact--</option>
              {contactOptions.map((cl, idx) => (
                <option key={idx} value={cl.name}>
                  {cl.name}
                </option>
              ))}
            </select>
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
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="e.g., 10000"
            />

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

          {/* Closure Date using DatePicker */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Closure Date <span className="text-red-500">*</span>
            </label>
            <DatePicker
              placeholderText="Select date"
              onChange={handleDateChange}
              dateFormat="dd/MM/yy"
              selected={data.closureDate || null}
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

          {/* Gross Profit */}
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Gross Profit
            </label>
            <input
              type="text"
              name="grossProfit"
              value={data.grossProfit}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
              placeholder="Optional"
            />
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

          {/* isRecurring */}
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
              Free Text Field
            </label>
            <select
              name="freeTextField"
              value={data.freeTextField}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="">Type or select an option</option>
              <option value="Option1">Option1</option>
              <option value="Option2">Option2</option>
            </select>
          </div>
        </div>

        {/* Row: Opportunity Owner, Opportunity Code, Is Active */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              Opportunity Owner <span className="text-red-500">*</span>
            </label>
            <select
              name="opportunityOwner"
              value={data.opportunityOwner}
              onChange={handleChange}
              className="border rounded w-full px-2 py-1 text-sm"
            >
              <option value="">--Select User--</option>
              {users.map((u) => (
                <option key={u._id} value={u.name}>
                  {u.name}
                </option>
              ))}
            </select>
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
    </div>
  );
}
