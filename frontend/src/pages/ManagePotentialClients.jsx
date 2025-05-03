// client/src/pages/ManagePotentialClients.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchBar from "../components/manageopportunities/SearchBar.jsx";
import PotentialClientTable from "../components/followup/PotentialClientTable.jsx";
import AddPotentialClientModal from "../components/followup/AddPotentialClientModal.jsx";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePotentialClients() {
  const [pcs, setPcs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);

  const fetchPCs = async () => {
    const res = await axios.get(`${BACKEND}/api/admin/potential-clients`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setPcs(res.data);
  };

  useEffect(() => {
    fetchPCs();
  }, []);

  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between mb-4">
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          + Add Potential Client
        </button>
      </div>

      {showModal && (
        <AddPotentialClientModal
          pc={editing}
          onClose={() => {
            setShowModal(false);
            setEditing(null);
            fetchPCs();
          }}
        />
      )}

      <PotentialClientTable
        data={pcs.filter(pc =>
          pc.companyName
            .toLowerCase()
            .includes(searchTerm.toLowerCase())
        )}
        onEdit={pc => { setEditing(pc); setShowModal(true); }}
        onDelete={fetchPCs}
      />
    </div>
  );
}
