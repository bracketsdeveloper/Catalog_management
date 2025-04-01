// src/pages/CreateOpportunity.jsx

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

// Use your own environment variable or local fallback
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

export default function CreateOpportunity() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id); // If there's an :id param, we're editing

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
    opportunityStatus: "", // "Won","Lost","Discontinued" if stage=Won/Lost/Discontinued
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
        // Example endpoint for users
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

      // The existing doc
      const opp = res.data;
      // Convert closureDate => dd/mm/yyyy if it's a valid date
      let closureDateStr = "";
      if (opp.closureDate) {
        const dt = new Date(opp.closureDate);
        if (!isNaN(dt.getTime())) {
          // e.g. "DD/MM/YYYY"
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
        isActive: opp.isActive !== false, // default true
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

  // Handlers
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setOpportunityData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleSliderChange = (e) => {
    const val = Number(e.target.value);
    setOpportunityData((prev) => ({ ...prev, closureProbability: val }));
  };

  /**
   * If user picks a date from e.g. an <input type="date" />
   * we get yyyy-mm-dd => convert to dd/mm/yyyy
   */
  const handleClosureDateChange = (e) => {
    const [year, month, day] = e.target.value.split("-");
    if (!year || !month || !day) return;
    const formatted = `${day}/${month}/${year}`;
    setOpportunityData((prev) => ({ ...prev, closureDate: formatted }));
  };

  async function handleSaveOpportunity() {
    try {
      const token = localStorage.getItem("token");
      const headers = { Authorization: `Bearer ${token}` };

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
        // PUT => /opportunities/:id
        await axios.put(`${BACKEND_URL}/api/admin/opportunities/${id}`, body, {
          headers,
        });
        alert("Opportunity updated successfully!");
      } else {
        // POST => /opportunities
        await axios.post(`${BACKEND_URL}/api/admin/opportunities`, body, {
          headers,
        });
        alert("Opportunity created successfully!");
      }
      // Navigate back
      navigate("/admin-dashboard/opportunities");
    } catch (error) {
      console.error("Error saving opportunity:", error);
      alert("Error saving opportunity. Check console.");
    }
  }

  // Render
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
          handleClosureDateChange={handleClosureDateChange}
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
