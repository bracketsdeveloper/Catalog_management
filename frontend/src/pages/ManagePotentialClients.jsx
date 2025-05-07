// client/src/pages/ManagePotentialClients.jsx
import React, { useState, useEffect } from "react";
import axios from "axios";
import SearchBar from "../components/manageopportunities/SearchBar.jsx";
import PotentialClientTable from "../components/followup/PotentialClientTable.jsx";
import AddPotentialClientModal from "../components/followup/AddPotentialClientModal.jsx";
import BulkUploadPopup from "../components/potentialclientsList/bulkUploadcli.js";

const BACKEND = process.env.REACT_APP_BACKEND_URL;

export default function ManagePotentialClients() {
  const [pcs, setPcs] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
 const [showbulkModal, setShowbulkModal] = useState(false);

  const fetchPCs = async () => {
    const res = await axios.get(`${BACKEND}/api/admin/potential-clients`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    setPcs(res.data);
  };

  useEffect(() => {
    fetchPCs();
  }, []);


  const handleBulkUpload = () => {
    setShowbulkModal(true);
  };
  return (
    <div className="p-6 bg-white min-h-screen">
      <div className="flex justify-between mb-4">
        <SearchBar
          searchTerm={searchTerm}
          setSearchTerm={setSearchTerm}
        />
        <div className="flex space-x-2">
        <button
          onClick={() => { setEditing(null); setShowModal(true); }}
          className="bg-green-600 text-white px-4 py-2 rounded text-sm"
        >
          + Add Potential Client
        </button>
          <button
           onClick={handleBulkUpload }
          className="bg-[#Ff8045] text-white px-4 py-2 rounded text-sm">
            Bulk Upload
          </button>
        </div>
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

    {showbulkModal && (
        <BulkUploadPopup
         onClose={() => { setShowbulkModal(false); }}
         visible={showbulkModal}
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
