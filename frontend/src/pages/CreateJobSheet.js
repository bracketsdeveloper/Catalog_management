import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams } from "react-router-dom";
import JobSheetForm from "../components/jobsheet/JobSheetForm";
import ProductGrid from "../components/jobsheet/ProductGrid";
import JobSheetCart from "../components/jobsheet/JobSheetCart";
import JobSheetItemEditModal from "../components/jobsheet/JobSheetItemEditModal";
import VariationModal from "../components/jobsheet/VariationModal";
import CompanyModal from "../components/CompanyModal";

const limit = 100;
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

export default function CreateJobSheet() {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const [existingIsDraft, setExistingIsDraft] = useState(false);
  const [eventName, setEventName] = useState("");
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [opportunitySuggestions, setOpportunitySuggestions] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);
  const [fullCategories, setFullCategories] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);
  const [orderDate, setOrderDate] = useState("");
  const [clientCompanyName, setClientCompanyName] = useState("");
  const [clientName, setClientName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [crmIncharge, setCrmIncharge] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [poStatus, setPoStatus] = useState("");
  const [customPoStatus, setCustomPoStatus] = useState("");
  const [deliveryType, setDeliveryType] = useState("");
  const [deliveryMode, setDeliveryMode] = useState("");
  const [deliveryCharges, setDeliveryCharges] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState([""]);
  const [brandingFileName, setBrandingFileName] = useState("");
  const [giftBoxBagsDetails, setGiftBoxBagsDetails] = useState("");
  const [packagingInstructions, setPackagingInstructions] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [referenceQuotation, setReferenceQuotation] = useState("");
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);
  const [selectedItems, setSelectedItems] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  useEffect(() => {
    fetchFilterOptions();
    fetchCompanies();
  }, []);

  useEffect(() => {
    fetchProducts(1);
  }, [
    searchTerm,
    selectedCategories,
    selectedSubCategories,
    selectedBrands,
    selectedPriceRanges,
    selectedVariationHinges,
  ]);

  useEffect(() => {
    if (isEditMode) {
      fetchExistingJobSheet();
    } else {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (referenceQuotation.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        fetchQuotationSuggestions(referenceQuotation.trim());
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setQuotationSuggestions([]);
    }
  }, [referenceQuotation]);

  useEffect(() => {
    if (opportunityNumber.trim().length > 0) {
      const delayDebounceFn = setTimeout(() => {
        fetchOpportunitySuggestions(opportunityNumber.trim());
      }, 300);
      return () => clearTimeout(delayDebounceFn);
    } else {
      setOpportunitySuggestions([]);
    }
  }, [opportunityNumber]);

  async function fetchOpportunitySuggestions(query) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/opportunities/suggestions?search=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setOpportunitySuggestions(res.data || []);
    } catch (error) {
      console.error("Error fetching opportunity suggestions:", error);
    }
  }

  async function fetchQuotationSuggestions(query) {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/quotations?search=${query}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotationSuggestions(res.data || []);
    } catch (error) {
      console.error("Error fetching quotation suggestions:", error);
    }
  }

  async function fetchFilterOptions() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/products/filters`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setFullCategories(res.data.categories || []);
      setFullSubCategories(res.data.subCategories || []);
      setFullBrands(res.data.brands || []);
      setFullPriceRanges(res.data.priceRanges || []);
      setFullVariationHinges(res.data.variationHinges || []);
    } catch (error) {
      console.error("Error fetching filter options:", error);
    }
  }

  async function fetchProducts(page = 1) {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategories.length) {
        params.append("categories", selectedCategories.join(","));
      }
      if (selectedSubCategories.length) {
        params.append("subCategories", selectedSubCategories.join(","));
      }
      if (selectedBrands.length) {
        params.append("brands", selectedBrands.join(","));
      }
      if (selectedPriceRanges.length) {
        params.append("priceRanges", selectedPriceRanges.join(","));
      }
      if (selectedVariationHinges.length) {
        params.append("variationHinges", selectedVariationHinges.join(","));
      }

      const url = `${BACKEND_URL}/api/admin/products?${params.toString()}`;
      const res = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(res.data.products || []);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  }

  async function fetchCompanies() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies?all=true`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data || []);
      
      const allClients = [];
      res.data.forEach(company => {
        if (company.clients && Array.isArray(company.clients)) {
          allClients.push(...company.clients);
        }
      });
      setClients(allClients);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  }

  async function fetchExistingJobSheet() {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      setExistingIsDraft(data.isDraft === true);
      setEventName(data.eventName || "");
      setOpportunityNumber(data.opportunityNumber || "");
      setOrderDate(data.orderDate ? data.orderDate.slice(0, 10) : "");
      setClientCompanyName(data.clientCompanyName || "");
      setClientName(data.clientName || "");
      setContactNumber(data.contactNumber || "");
      setDeliveryDate(data.deliveryDate ? data.deliveryDate.slice(0, 10) : "");
      setDeliveryTime(data.deliveryTime || "");
      setCrmIncharge(data.crmIncharge || "");
      setPoNumber(data.poNumber || "");
      setPoStatus(data.poStatus || "");
      if (
        data.poStatus &&
        data.poStatus !== "PO Awaited, Wait for Invoice" &&
        data.poStatus !== "PO Received, Generate Invoice" &&
        data.poStatus !== "No PO, No Invoice" &&
        data.poStatus !== "No PO, Direct Invoice"
      ) {
        setPoStatus("Custom");
        setCustomPoStatus(data.poStatus);
      }
      setDeliveryType(data.deliveryType || "");
      setDeliveryMode(data.deliveryMode || "");
      setDeliveryCharges(data.deliveryCharges || "");
      if (Array.isArray(data.deliveryAddress) && data.deliveryAddress.length > 0) {
        setDeliveryAddress(data.deliveryAddress);
      } else {
        setDeliveryAddress([""]);
      }
      setBrandingFileName(data.brandingFileName || "");
      setGiftBoxBagsDetails(data.giftBoxBagsDetails || "");
      setPackagingInstructions(data.packagingInstructions || "");
      setOtherDetails(data.otherDetails || "");
      setReferenceQuotation(data.referenceQuotation || "");

      const items = data.items || [];
      const mappedItems = items.map((item) => ({
        product: item.product,
        color: item.color || "",
        size: item.size || "",
        quantity: item.quantity || 1,
        sourcingFrom: item.sourcingFrom || "",
        brandingType: item.brandingType || "",
        brandingVendor: item.brandingVendor || "",
        remarks: item.remarks || "",
        slNo: item.slNo,
      }));
      setSelectedItems(mappedItems);
    } catch (error) {
      console.error("Error fetching job sheet:", error);
    } finally {
      setLoading(false);
    }
  }

  const handleInlineUpdate = (index, field, value) => {
    setSelectedItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  function isDuplicate(productName, color, size) {
    return selectedItems.some(
      (item) =>
        item.product === productName &&
        (item.color || "") === (color || "") &&
        (item.size || "") === (size || "")
    );
  }

  const handleAddSingle = (item) => {
    if (isDuplicate(item.product, item.color, item.size)) {
      alert("This item with the same product, color & size is already added!");
      return;
    }
    const newItem = { ...item, slNo: selectedItems.length + 1 };
    setSelectedItems((prev) => [...prev, newItem]);
  };

  const openVariationModal = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  const handleAddVariation = (item) => {
    if (isDuplicate(item.product, item.color, item.size)) {
      alert("This item with the same product, color & size is already added!");
      return;
    }
    const newItem = { ...item, slNo: selectedItems.length + 1 };
    setSelectedItems((prev) => [...prev, newItem]);
    closeVariationModal();
  };

  const handleEditItem = (index) => {
    setEditIndex(index);
    setEditModalOpen(true);
  };

  const handleUpdateItem = (updatedItem) => {
    setSelectedItems((prev) => {
      const newArr = [...prev];
      const isDup = newArr.some((item, i) => {
        if (i === editIndex) return false;
        return (
          item.product === newArr[editIndex].product &&
          (item.color || "") === (updatedItem.color || "") &&
          (item.size || "") === (updatedItem.size || "")
        );
      });
      if (isDup) {
        alert("This update creates a duplicate. Not updating.");
        return newArr;
      }
      newArr[editIndex] = { ...newArr[editIndex], ...updatedItem };
      return newArr;
    });
  };

  const handleRemoveSelectedItem = (index) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const parseProductString = (productStr) => {
    let color = "";
    let size = "";
    let baseProduct = productStr;
    const colorMatch = productStr.match(/\(([^)]+)\)/);
    if (colorMatch) {
      color = colorMatch[1];
      baseProduct = baseProduct.replace(colorMatch[0], "");
    }
    const sizeMatch = productStr.match(/\[([^\]]+)\]/);
    if (sizeMatch) {
      size = sizeMatch[1];
      baseProduct = baseProduct.replace(sizeMatch[0], "");
    }
    return { baseProduct: baseProduct.trim(), color, size };
  };

  const handleQuotationSelect = (quotation) => {
    setReferenceQuotation(quotation.quotationNumber);
    setClientCompanyName(quotation.customerCompany || "");
    setClientName(quotation.customerName || "");
    setContactNumber(quotation.contactNumber || "");
    if (quotation.items && quotation.items.length > 0) {
      const newItems = quotation.items.map((item, index) => {
        const { baseProduct, color, size } = parseProductString(item.product);
        return {
          product: baseProduct,
          color: color,
          size: size,
          quantity: item.quantity,
          sourcingFrom: item.sourcingFrom || "",
          brandingType: "",
          brandingVendor: "",
          remarks: "",
          slNo: index + 1,
        };
      });
      setSelectedItems(newItems);
    }
  };

  const handleFetchQuotation = async () => {
    if (!referenceQuotation.trim()) {
      alert("Please enter a reference quotation number");
      return;
    }
    const match = quotationSuggestions.find(
      (q) => q.quotationNumber === referenceQuotation.trim()
    );
    if (match) {
      handleQuotationSelect(match);
    } else {
      try {
        const token = localStorage.getItem("token");
        const res = await axios.get(
          `${BACKEND_URL}/api/admin/quotations?search=${referenceQuotation.trim()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let fetchedQuotation;
        if (Array.isArray(res.data)) {
          fetchedQuotation = res.data.find(
            (q) => q.quotationNumber === referenceQuotation.trim()
          );
        } else if (res.data.quotations) {
          fetchedQuotation = res.data.quotations.find(
            (q) => q.quotationNumber === referenceQuotation.trim()
          );
        } else {
          fetchedQuotation = res.data;
        }
        if (fetchedQuotation) {
          handleQuotationSelect(fetchedQuotation);
        } else {
          alert("No quotations found");
        }
      } catch (error) {
        console.error("Error fetching quotation:", error);
        alert("No quotations found");
      }
    }
  };

  const handleOpportunitySelect = (opportunity) => {
    setOpportunityNumber(opportunity.opportunityCode);
    setOpportunitySuggestions([]);
  };

  const handleSaveJobSheet = async (isDraft = false) => {
    const today = new Date().toISOString().split("T")[0];

    const body = {
      eventName: eventName || ".",
      opportunityNumber,
      orderDate: orderDate || today,
      clientCompanyName: clientCompanyName || ".",
      clientName: clientName || ".",
      contactNumber: contactNumber || ".",
      deliveryDate: deliveryDate || today,
      deliveryTime: deliveryTime || ".",
      crmIncharge: crmIncharge || ".",
      items: selectedItems.map((item, index) => ({
        ...item,
        slNo: item.slNo || index + 1,
      })),
      poNumber: poNumber || ".",
      poStatus: poStatus === "Custom" ? customPoStatus || "." : poStatus || ".",
      deliveryType: deliveryType || ".",
      deliveryMode: deliveryMode || ".",
      deliveryCharges: deliveryCharges || ".",
      deliveryAddress: deliveryAddress.filter((addr) => addr.trim() !== "") || ["."],
      brandingFileName: brandingFileName || ".",
      giftBoxBagsDetails: giftBoxBagsDetails || ".",
      packagingInstructions: packagingInstructions || ".",
      otherDetails: otherDetails || ".",
      referenceQuotation: referenceQuotation || ".",
      isDraft,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/jobsheets/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(
          isDraft
            ? "Draft job sheet updated successfully!"
            : "Job sheet updated successfully!"
        );
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/jobsheets`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert(
          isDraft
            ? "Draft job sheet created successfully!"
            : "Job sheet created successfully!"
        );
      }
      navigate("/admin-dashboard/manage-jobsheets");
    } catch (error) {
      console.error("Error saving job sheet:", error);
      alert("Error saving job sheet. Check console.");
    }
  };

  const handleImageSearchClick = async () => {
    if (imageInputRef.current) imageInputRef.current.click();
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAdvancedSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const formData = new FormData();
      formData.append("image", file);
      const res = await axios.post(
        `${BACKEND_URL}/api/products/advanced-search`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      setAdvancedSearchResults(Array.isArray(res.data.products) ? res.data.products : []);
      setAdvancedSearchActive(true);
    } catch (error) {
      console.error("Error in image search:", error);
      alert(`Image search failed: ${error.response?.data?.message || "Check console"}`);
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  const handleCompanySelect = (company) => {
    setClientCompanyName(company.companyName);
    if (company.clients && company.clients.length > 0) {
      setClientName(company.clients[0].name);
      setContactNumber(company.clients[0].contactNumber);
    } else {
      setClientName("");
      setContactNumber("");
    }
    setDropdownOpen(false);
  };

  const handleOpenCompanyModal = () => {
    setShowCompanyModal(true);
  };

  const handleCloseCompanyModal = () => {
    setShowCompanyModal(false);
    fetchCompanies();
  };

  const showSaveDraftButton = !isEditMode || existingIsDraft;

  const handleClientSelect = (client) => {
    setClientName(client.name);
    setContactNumber(client.contactNumber);
    setClientDropdownOpen(false);
  };

  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isEditMode ? "Edit Job Sheet" : "Create Job Sheet"}
        </h1>
        <div className="flex gap-3">
          {showSaveDraftButton && (
            <button
              onClick={() => handleSaveJobSheet(true)}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
            >
              {isEditMode ? "Update as Draft" : "Save Draft"}
            </button>
          )}
          <button
            onClick={() => handleSaveJobSheet(false)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
          >
            {isEditMode ? "Update Job Sheet" : "Create Job Sheet"}
          </button>
        </div>
      </div>

      <JobSheetForm
        eventName={eventName}
        setEventName={setEventName}
        opportunityNumber={opportunityNumber}
        setOpportunityNumber={setOpportunityNumber}
        opportunitySuggestions={opportunitySuggestions}
        handleOpportunitySelect={handleOpportunitySelect}
        orderDate={orderDate}
        setOrderDate={setOrderDate}
        clientCompanyName={clientCompanyName}
        setClientCompanyName={setClientCompanyName}
        clientName={clientName}
        setClientName={setClientName}
        contactNumber={contactNumber}
        setContactNumber={setContactNumber}
        deliveryDate={deliveryDate}
        setDeliveryDate={setDeliveryDate}
        deliveryTime={deliveryTime}
        setDeliveryTime={setDeliveryTime}
        crmIncharge={crmIncharge}
        setCrmIncharge={setCrmIncharge}
        poNumber={poNumber}
        setPoNumber={setPoNumber}
        poStatus={poStatus}
        setPoStatus={setPoStatus}
        customPoStatus={customPoStatus}
        setCustomPoStatus={setCustomPoStatus}
        deliveryType={deliveryType}
        setDeliveryType={setDeliveryType}
        deliveryMode={deliveryMode}
        setDeliveryMode={setDeliveryMode}
        deliveryCharges={deliveryCharges}
        setDeliveryCharges={setDeliveryCharges}
        deliveryAddress={deliveryAddress}
        setDeliveryAddress={setDeliveryAddress}
        brandingFileName={brandingFileName}
        setBrandingFileName={setBrandingFileName}
        giftBoxBagsDetails={giftBoxBagsDetails}
        setGiftBoxBagsDetails={setGiftBoxBagsDetails}
        packagingInstructions={packagingInstructions}
        setPackagingInstructions={setPackagingInstructions}
        otherDetails={otherDetails}
        setOtherDetails={setOtherDetails}
        referenceQuotation={referenceQuotation}
        setReferenceQuotation={setReferenceQuotation}
        fetchQuotation={handleFetchQuotation}
        quotationSuggestions={quotationSuggestions}
        handleQuotationSelect={handleQuotationSelect} // Added this prop
        companies={companies}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        handleCompanySelect={handleCompanySelect}
        handleOpenCompanyModal={handleOpenCompanyModal}
        selectedItems={selectedItems}
        handleInlineUpdate={handleInlineUpdate}
        handleRemoveSelectedItem={handleRemoveSelectedItem}
        handleEditItem={handleEditItem}
        clients={clients}
        clientDropdownOpen={clientDropdownOpen}
        setClientDropdownOpen={setClientDropdownOpen}
        handleClientSelect={handleClientSelect}
      />

      <ProductGrid
        products={products}
        loading={loading}
        advancedSearchActive={advancedSearchActive}
        advancedSearchResults={advancedSearchResults}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleImageSearchClick={handleImageSearchClick}
        imageInputRef={imageInputRef}
        handleImageSearch={handleImageSearch}
        advancedSearchLoading={advancedSearchLoading}
        handleClearAdvancedSearch={handleClearAdvancedSearch}
        finalProducts={advancedSearchActive ? advancedSearchResults : products}
        handlePrevPage={() => {
          if (currentPage > 1) fetchProducts(currentPage - 1);
        }}
        handleNextPage={() => {
          if (currentPage < totalPages) fetchProducts(currentPage + 1);
        }}
        currentPage={currentPage}
        totalPages={totalPages}
        onAddSelected={handleAddSingle}
        onOpenVariationModal={openVariationModal}
        fullCategories={fullCategories}
        selectedCategories={selectedCategories}
        setSelectedCategories={setSelectedCategories}
        fullSubCategories={fullSubCategories}
        selectedSubCategories={selectedSubCategories}
        setSelectedSubCategories={setSelectedSubCategories}
        fullBrands={fullBrands}
        selectedBrands={selectedBrands}
        setSelectedBrands={setSelectedBrands}
        fullPriceRanges={fullPriceRanges}
        selectedPriceRanges={selectedPriceRanges}
        setSelectedPriceRanges={setSelectedPriceRanges}
        fullVariationHinges={fullVariationHinges}
        selectedVariationHinges={selectedVariationHinges}
        setSelectedVariationHinges={setSelectedVariationHinges}
      />

      <div
        className="fixed bottom-4 right-4 bg-purple-600 text-white rounded-full p-3 cursor-pointer flex items-center justify-center shadow-lg"
        style={{ width: 60, height: 60 }}
        onClick={() => setCartOpen(true)}
      >
        <span style={{ fontSize: "1.2rem" }}>🛍️</span>
        {selectedItems.length > 0 && (
          <span className="absolute text-xs bg-red-500 w-5 h-5 rounded-full text-center -top-1 -right-1 text-white">
            {selectedItems.length}
          </span>
        )}
      </div>

      {cartOpen && (
        <JobSheetCart
          selectedItems={selectedItems}
          setCartOpen={setCartOpen}
          handleRemoveSelectedItem={handleRemoveSelectedItem}
          handleEditItem={handleEditItem}
          handleInlineUpdate={handleInlineUpdate}
        />
      )}

      {editModalOpen && editIndex !== null && (
        <JobSheetItemEditModal
          item={selectedItems[editIndex]}
          onClose={() => {
            setEditIndex(null);
            setEditModalOpen(false);
          }}
          onUpdate={(updatedItem) => {
            handleUpdateItem(updatedItem);
            setEditIndex(null);
            setEditModalOpen(false);
          }}
        />
      )}

      {variationModalOpen && variationModalProduct && (
        <VariationModal
          product={variationModalProduct}
          onClose={closeVariationModal}
          onSave={handleAddVariation}
        />
      )}

      {showCompanyModal && <CompanyModal onClose={handleCloseCompanyModal} />}
    </div>
  );
}