"use client";

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

  // Form state
  const [eventName, setEventName] = useState("");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);

  // Filter state
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

  // Job sheet form state
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
  const [deliveryAddress, setDeliveryAddress] = useState([]);
  const [giftBoxBagsDetails, setGiftBoxBagsDetails] = useState("");
  const [packagingInstructions, setPackagingInstructions] = useState("");
  const [otherDetails, setOtherDetails] = useState("");
  const [referenceQuotation, setReferenceQuotation] = useState("");

  // Quotation suggestions state
  const [quotationSuggestions, setQuotationSuggestions] = useState([]);

  // Selected items and modal state
  const [selectedItems, setSelectedItems] = useState([]);
  const [editIndex, setEditIndex] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);
  const [companies, setCompanies] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [showCompanyModal, setShowCompanyModal] = useState(false);

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

  // --- QUOTATION SUGGESTIONS ---
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

  const fetchQuotationSuggestions = async (query) => {
    try {
      const token = localStorage.getItem("token");
      // Assumes your quotations endpoint supports a search query parameter.
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/quotations?search=${query}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuotationSuggestions(res.data || []);
    } catch (error) {
      console.error("Error fetching quotation suggestions:", error);
    }
  };
  // --- END QUOTATION SUGGESTIONS ---

  const fetchFilterOptions = async () => {
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
  };

  const fetchProducts = async (page = 1) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = new URLSearchParams();
      params.append("page", page);
      params.append("limit", limit);
      if (searchTerm) params.append("search", searchTerm);
      if (selectedCategories.length > 0)
        params.append("categories", selectedCategories.join(","));
      if (selectedSubCategories.length > 0)
        params.append("subCategories", selectedSubCategories.join(","));
      if (selectedBrands.length > 0)
        params.append("brands", selectedBrands.join(","));
      if (selectedPriceRanges.length > 0)
        params.append("priceRanges", selectedPriceRanges.join(","));
      if (selectedVariationHinges.length > 0)
        params.append("variationHinges", selectedVariationHinges.join(","));
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/products?${params.toString()}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setProducts(res.data.products || []);
      setCurrentPage(res.data.currentPage || 1);
      setTotalPages(res.data.totalPages || 1);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(
        `${BACKEND_URL}/api/admin/companies?all=true`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies(res.data || []);
    } catch (error) {
      console.error("Error fetching companies:", error);
    }
  };

  const fetchExistingJobSheet = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/jobsheets/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = res.data;
      setEventName(data.eventName || "");
      setOrderDate(data.orderDate ? data.orderDate.slice(0, 10) : "");
      setClientCompanyName(data.clientCompanyName);
      setClientName(data.clientName);
      setContactNumber(data.contactNumber || "");
      setDeliveryDate(data.deliveryDate ? data.deliveryDate.slice(0, 10) : "");
      setDeliveryTime(data.deliveryTime || "");
      setCrmIncharge(data.crmIncharge || "");
      setPoNumber(data.poNumber || "");
      setPoStatus(data.poStatus || "");
      // If the stored poStatus is not "PO sent" or "No PO", treat it as custom:
      if (data.poStatus && data.poStatus !== "PO sent" && data.poStatus !== "No PO") {
        setPoStatus("Custom");
        setCustomPoStatus(data.poStatus);
      }
      setDeliveryType(data.deliveryType || "");
      setDeliveryMode(data.deliveryMode || "");
      setDeliveryCharges(data.deliveryCharges || "");
      setDeliveryAddress(
        Array.isArray(data.deliveryAddress)
          ? data.deliveryAddress
          : [data.deliveryAddress || ""]
      );
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
  };

  const handleInlineUpdate = (index, field, value) => {
    setSelectedItems((prev) => {
      const newItems = [...prev];
      newItems[index] = { ...newItems[index], [field]: value };
      return newItems;
    });
  };

  // Address management
  const handleAddAddress = () => {
    setDeliveryAddress((prev) => [...prev, ""]);
  };

  const handleAddressChange = (index, value) => {
    setDeliveryAddress((prev) => {
      const newAddresses = [...prev];
      newAddresses[index] = value;
      return newAddresses.filter((addr) => addr.trim() !== "");
    });
  };

  const handleRemoveAddress = (index) => {
    setDeliveryAddress((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageSearchClick = () => {
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
      setAdvancedSearchResults(Array.isArray(res.data) ? res.data : []);
      setAdvancedSearchActive(true);
    } catch (error) {
      console.error("Error in image search:", error);
      alert("Image search failed. Check console.");
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  // Company selection for manual entry (with suggestion dropdown)
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

  // Check for duplicate product (by product name, color, and size)
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

  // Utility to parse product string
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

  // Handle quotation selection: auto-populate client details and map items.
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

  // --- FETCH BUTTON HANDLER ---
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
          `${BACKEND_URL}/api/admin/quotations?quotationNumber=${referenceQuotation.trim()}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        let fetchedQuotation;
        if (Array.isArray(res.data)) {
          fetchedQuotation = res.data.find(
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
  // --- END FETCH BUTTON HANDLER ---

  const handleSaveJobSheet = async () => {
    if (!orderDate || !clientCompanyName || !clientName || !deliveryDate) {
      alert("Please enter Order Date, Client Company, Client Name and Delivery Date.");
      return;
    }
    if (selectedItems.length === 0) {
      alert("Please select at least one product.");
      return;
    }
    const filteredAddresses = deliveryAddress.filter((addr) => addr.trim() !== "");
    if (filteredAddresses.length === 0) {
      alert("Please enter at least one delivery address.");
      return;
    }
    const itemsWithSlNo = selectedItems.map((item, index) => ({
      ...item,
      slNo: item.slNo || index + 1,
    }));
    const finalPoStatus = poStatus === "Custom" ? customPoStatus : poStatus;
    const body = {
      eventName,
      orderDate,
      clientCompanyName,
      clientName,
      contactNumber,
      deliveryDate,
      deliveryTime,
      crmIncharge,
      items: itemsWithSlNo,
      poNumber,
      poStatus: finalPoStatus,
      deliveryType,
      deliveryMode,
      deliveryCharges,
      deliveryAddress: filteredAddresses,
      giftBoxBagsDetails,
      packagingInstructions,
      otherDetails,
      referenceQuotation,
    };

    try {
      const token = localStorage.getItem("token");
      if (isEditMode) {
        await axios.put(`${BACKEND_URL}/api/admin/jobsheets/${id}`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Job sheet updated successfully!");
      } else {
        await axios.post(`${BACKEND_URL}/api/admin/jobsheets`, body, {
          headers: { Authorization: `Bearer ${token}` },
        });
        alert("Job sheet created successfully!");
      }
      navigate("/admin-dashboard/manage-jobsheets");
    } catch (error) {
      console.error("Error saving job sheet:", error);
      alert("Error saving job sheet. Check console.");
    }
  };

  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isEditMode ? "Edit Job Sheet" : "Create Job Sheet"}
        </h1>
        <button
          onClick={handleSaveJobSheet}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          {isEditMode ? "Update Job Sheet" : "Create Job Sheet"}
        </button>
      </div>

      <JobSheetForm
        eventName={eventName}
        setEventName={setEventName}
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
        handleQuotationSelect={handleQuotationSelect}
        companies={companies}
        dropdownOpen={dropdownOpen}
        setDropdownOpen={setDropdownOpen}
        handleCompanySelect={handleCompanySelect}
        handleOpenCompanyModal={handleOpenCompanyModal}
        selectedItems={selectedItems}
        handleInlineUpdate={handleInlineUpdate}
        handleRemoveSelectedItem={handleRemoveSelectedItem}
        handleEditItem={handleEditItem}
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
      {editModalOpen && editIndex != null && (
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
      {showCompanyModal && (
        <CompanyModal onClose={handleCloseCompanyModal} />
      )}
    </div>
  );
}
