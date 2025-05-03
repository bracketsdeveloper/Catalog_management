// client/src/components/managepotentialclients/FilterPanel.jsx
import React from "react";

export default function FilterPanel({ filterVals, setFilterVals }) {
  const onChange = e => {
    const { name, value } = e.target;
    setFilterVals(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
      {[
        { label: "Company Name", name: "companyName" },
        { label: "Client Name",   name: "clientName"   },
        { label: "Designation",    name: "designation"  },
        { label: "Source",         name: "source"       },
        { label: "Mobile",         name: "mobile"       },
        { label: "Email",          name: "email"        },
        { label: "Location",       name: "location"     },
      ].map(f => (
        <div key={f.name}>
          <label className="block text-sm mb-1">{f.label}</label>
          <input
            type="text"
            name={f.name}
            value={filterVals[f.name]}
            onChange={onChange}
            className="border rounded p-2 w-full text-sm"
          />
        </div>
      ))}
    </div>
  );
}
