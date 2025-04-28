"use client";

import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

import TabButton from "../components/opportunities/TabButton";
import OpportunityDetails from "../components/opportunities/OpportunityDetails";
import ProductTab from "../components/opportunities/ProductTab";
import ContactTab from "../components/opportunities/ContactTab";
import MediaTab from "../components/opportunities/MediaTab";
import TeamTab from "../components/opportunities/TeamTab";
import CompetitorTab from "../components/opportunities/CompetitorTab";
import NoteTab from "../components/opportunities/NoteTab";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function CreateOpportunity() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  const [activeTab, setActiveTab] = useState("details");

  // Master object for "Opportunity" main fields
  const [opportunityData, setOpportunityData] = useState({
    opportunityName: "",
    account: "",
    contact: "",
    opportunityType: "Non-Tender",
    opportunityStage: "Lead",
    opportunityDetail: "",
    opportunityValue: "",
    currency: "Indian Rupee",
    leadSource: "others",
    closureDate: "",
    closureProbability: 10,
    grossProfit: "",
    opportunityPriority: "Low",
    isRecurring: false,
    dealRegistrationNumber: "",
    freeTextField: "",
    opportunityOwner: "",
    opportunityCode: "",
    isActive: true,
    opportunityStatus: "",
  });

  // Tab data
  const [productTabData, setProductTabData] = useState([]);
  const [contactTabData, setContactTabData] = useState([]);
  const [mediaTabData, setMediaTabData] = useState([]);
  const [teamTabData, setTeamTabData] = useState([]);
  const [competitorTabData, setCompetitorTabData] = useState([]);
  const [noteTabData, setNoteTabData] = useState([]);

  // For suggestions
  const [companies, setCompanies] = useState([]);
  const [users, setUsers] = useState([]);

  // On mount, fetch companies & users
  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/admin/companies?all=true`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data || []);
      } catch (err) {
        console.error("Error fetching companies:", err);
      }
    };

    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(`${BACKEND_URL}/api/user/users`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setUsers(res.data || []);
      } catch (err) {
        console.error("Error fetching users:", err);
      }
    };

    fetchCompanies();
    fetchUsers();
  }, []);

  // If we're editing, fetch existing doc
  useEffect(() => {
    if (isEditMode) {
      fetchOpportunityById(id);
    }
  }, [isEditMode, id]);

  // Fetch existing opportunity
  async function fetchOpportunityById(opportunityId) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/opportunities/${opportunityId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const opp = res.data;
      let closureDateStr = "";
      if (opp.closureDate) {
        const dt = new Date(opp.closureDate);
        if (!isNaN(dt.getTime())) {
          const dd = String(dt.getDate()).padStart(2, "0");
          const mm = String(dt.getMonth() + 1).padStart(2, "0");
          const yyyy = dt.getFullYear();
          closureDateStr = `${dd}/${mm}/${yyyy}`;
        }
      }

      setOpportunityData({
        opportunityName: opp.opportunityName || "",
        account: opp.account || "",
        contact: opp.contact || "",
        opportunityType: opp.opportunityType || "Non-Tender",
        opportunityStage: opp.opportunityStage || "Lead",
        opportunityDetail: opp.opportunityDetail || "",
        opportunityValue: opp.opportunityValue || "",
        currency: opp.currency || "Indian Rupee",
        leadSource: opp.leadSource || "others",
        closureDate: closureDateStr,
        closureProbability: opp.closureProbability ?? 10,
        grossProfit: opp.grossProfit || "",
        opportunityPriority: opp.opportunityPriority || "Low",
        isRecurring: opp.isRecurring || false,
        dealRegistrationNumber: opp.dealRegistrationNumber || "",
        freeTextField: opp.freeTextField || "",
        opportunityOwner: opp.opportunityOwner || "",
        opportunityCode: opp.opportunityCode || "",
        isActive: opp.isActive !== false,
        opportunityStatus: opp.opportunityStatus || "",
      });

      // Tab arrays
      setProductTabData(opp.products || []);
      setContactTabData(opp.contacts || []);
      setMediaTabData(opp.mediaItems || []);
      setTeamTabData(opp.teamMembers || []);
      setCompetitorTabData(opp.competitors || []);
      setNoteTabData(opp.notes || []);
    } catch (err) {
      console.error("Error fetching existing opportunity:", err);
      alert("Failed to load existing opportunity. Check console.");
    }
  }

  const handleChange = (e) => {
  const { name, value, type, checked } = e.target;

    setOpportunityData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value, // Standard handling for other fields
    }));
  
};


  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setOpportunityData((prev) => ({ ...prev, closureProbability: val }));
  };

  async function handleSaveOpportunity() {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

      // Validate required fields
      const requiredFields = {
        opportunityName: "Opportunity Name",
        account: "Account",
        opportunityType: "Opportunity Type",
        opportunityStage: "Opportunity Stage",
        closureDate: "Closure Date",
        opportunityOwner: "Opportunity Owner"
      };

      const missingFields = [];
      Object.entries(requiredFields).forEach(([key, label]) => {
        if (!opportunityData[key]?.toString().trim()) {
          missingFields.push(label);
        }
      });

      if (missingFields.length > 0) {
        alert(`Please fill in all required fields:\n${missingFields.join("\n")}`);
        return;
      }

      // Validate closure date format
      const dateRegex = /^\d{2}\/\d{2}\/\d{4}$/;
      if (!dateRegex.test(opportunityData.closureDate)) {
        alert("Please enter Closure Date in DD/MM/YYYY format");
        return;
      }

      // Build final body
      const body = {
        ...opportunityData,
        products: productTabData,
        contacts: contactTabData,
        mediaItems: mediaTabData,
        teamMembers: teamTabData,
        competitors: competitorTabData,
        notes: noteTabData,
      };

      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/opportunities/${id}`, body, {
          headers,
        });
        alert("Opportunity updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/opportunities`, body, {
          headers,
        });
        alert("Opportunity created successfully!");
      }
      navigate("/admin-dashboard/opportunities");
    } catch (error) {
      console.error("Error saving opportunity:", error);
      alert(error.response?.data?.message || "Error saving opportunity. Please check all fields and try again.");
    }
  }

  return (
    <div className="min-h-screen bg-white text-gray-800 p-4">
      {/* Top bar */}
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-xl font-bold text-purple-700">
          {isEditMode ? "Edit Opportunity" : "Create Opportunity"}
        </h1>
        <button
          onClick={handleSaveOpportunity}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          {isEditMode ? "Update Opportunity" : "Save Opportunity"}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex space-x-4 mb-4">
        <TabButton
          label="Opportunity Details"
          active={activeTab === "details"}
          onClick={() => setActiveTab("details")}
        />
        <TabButton
          label="Product"
          active={activeTab === "product"}
          onClick={() => setActiveTab("product")}
        />
        <TabButton
          label="Contact"
          active={activeTab === "contact"}
          onClick={() => setActiveTab("contact")}
        />
        <TabButton
          label="Media"
          active={activeTab === "media"}
          onClick={() => setActiveTab("media")}
        />
        <TabButton
          label="Team"
          active={activeTab === "team"}
          onClick={() => setActiveTab("team")}
        />
        <TabButton
          label="Competitor"
          active={activeTab === "competitor"}
          onClick={() => setActiveTab("competitor")}
        />
        <TabButton
          label="Note"
          active={activeTab === "note"}
          onClick={() => setActiveTab("note")}
        />
      </div>

      {/* Tab Content */}
      {activeTab === "details" && (
        <OpportunityDetails
          data={opportunityData}
          setData={setOpportunityData}
          handleChange={handleChange}
          handleSliderChange={handleSliderChange}
          companies={companies}
          users={users}
        />
      )}
      {activeTab === "product" && (
        <ProductTab products={productTabData} setProducts={setProductTabData} />
      )}
      {activeTab === "contact" && (
        <ContactTab contacts={contactTabData} setContacts={setContactTabData} />
      )}
      {activeTab === "media" && (
        <MediaTab mediaItems={mediaTabData} setMediaItems={setMediaTabData} />
      )}
      {activeTab === "team" && (
        <TeamTab teamMembers={teamTabData} setTeamMembers={setTeamTabData} users={users} />
      )}
      {activeTab === "competitor" && (
        <CompetitorTab
          competitors={competitorTabData}
          setCompetitors={setCompetitorTabData}
        />
      )}
      {activeTab === "note" && (
        <NoteTab notes={noteTabData} setNotes={setNoteTabData} />
      )}
    </div>
  );
}