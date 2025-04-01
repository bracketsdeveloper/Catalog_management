// components/manualcatalog/CompanyDropdown.jsx
import React, { useState } from "react";

export default function CompanyDropdown({ companies, selectedCompany, onSelectCompany }) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  return (
    <div className="relative mb-6">
      <label className="block mb-1 font-medium">Customer Company *</label>
      <input
        type="text"
        value={selectedCompany}
        onChange={() => setDropdownOpen(true)}
        className="border p-2 rounded w-full"
      />
      {dropdownOpen && selectedCompany && (
        <div className="absolute z-10 bg-white border rounded shadow-lg mt-1 w-full">
          {companies
            .filter((company) =>
              company.companyName.toLowerCase().includes(selectedCompany.toLowerCase())
            )
            .map((company) => (
              <div
                key={company._id}
                className="p-2 cursor-pointer hover:bg-gray-100"
                onClick={() => {
                  onSelectCompany(company);
                  setDropdownOpen(false);
                }}
              >
                {company.companyName}
              </div>
            ))}
          <div
            className="p-2 cursor-pointer hover:bg-gray-100"
            onClick={() => {
              // Handle creation of a new company if needed.
              setDropdownOpen(false);
            }}
          >
            + Create Company
          </div>
        </div>
      )}
    </div>
  );
}
