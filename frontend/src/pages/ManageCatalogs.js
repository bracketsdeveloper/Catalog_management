// CreateManualCatalog.jsx
"use client";

import React, { useState, useEffect, useRef } from "react";
import axios from "axios";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import CompanyModal from "../components/CompanyModal";
import FilterDropdown from "../components/manualcatalog/FilterDropdown.js";
import ProductCard from "../components/manualcatalog/ProductCard.js";
import VariationModal from "../components/manualcatalog/VariationModal.js";
import VariationEditModal from "../components/manualcatalog/VariationEditModal.js";
import SuggestedPriceCalculator from "../components/SuggestedPriceCalculator.jsx";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";
import AdminProductDetails from "../pages/AdminProductDetails";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const limit = 100;
const BagIcon = () => <span style={{ fontSize: "1.2rem" }}>🛍️</span>;
const norm = (s) => (s ? s.toString().trim().toLowerCase() : "");
const obj = (arr) => Object.fromEntries(arr.map(({ name, count }) => [norm(name), count]));

export default function CreateManualCatalog() {
  const navigate = useNavigate();
  const { id } = useParams();
  const location = useLocation();

  // Determine mode based on URL path
  const isCatalogEditMode = location.pathname.includes("/catalogs/manual") && !!id;
  const isQuotationEditMode = location.pathname.includes("/quotation/manual") && !!id;
  const isCreateMode = !isCatalogEditMode && !isQuotationEditMode;

  // ─── State ────────────────────────────────────────────────────────────────
  const [opportunityNumber, setOpportunityNumber] = useState("");
  const [opportunityCodes, setOpportunityCodes] = useState([]);
  const [opportunityDropdownOpen, setOpportunityDropdownOpen] = useState(false);

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const [fullCategories, setFullCategories] = useState([]);
  const [fullSubCategories, setFullSubCategories] = useState([]);
  const [fullBrands, setFullBrands] = useState([]);
  const [fullPriceRanges, setFullPriceRanges] = useState([]);
  const [fullVariationHinges, setFullVariationHinges] = useState([]);

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [selectedSubCategories, setSelectedSubCategories] = useState([]);
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [selectedPriceRanges, setSelectedPriceRanges] = useState([]);
  const [selectedVariationHinges, setSelectedVariationHinges] = useState([]);

  // Add state for filter dropdowns
  const [catsOpen, setCatsOpen] = useState(false);
  const [subOpen, setSubOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [prOpen, setPrOpen] = useState(false);
  const [vhOpen, setVhOpen] = useState(false);

  const [filterCounts, setFilterCounts] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {},
  });

  const [advancedSearchActive, setAdvancedSearchActive] = useState(false);
  const [advancedSearchResults, setAdvancedSearchResults] = useState([]);
  const [advancedSearchLoading, setAdvancedSearchLoading] = useState(false);
  const imageInputRef = useRef(null);

  const [selectedProducts, setSelectedProducts] = useState([]);
  const [fieldsToDisplay, setFieldsToDisplay] = useState(["name", "productCost"]);
  const [catalogName, setCatalogName] = useState("");
  const [salutation, setSalutation] = useState("Mr.");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerCompany, setCustomerCompany] = useState("");

  const presetMarginOptions = [0, 5, 10, 15, 20];
  const [selectedMargin, setSelectedMargin] = useState(presetMarginOptions[0]);
  const [marginOption, setMarginOption] = useState("preset");
  const [customMargin, setCustomMargin] = useState("");

  const presetGstOptions = [18];
  const [selectedGst, setSelectedGst] = useState(presetGstOptions[0]);
  const [gstOption, setGstOption] = useState("preset");
  const [customGst, setCustomGst] = useState("");

  const [cartOpen, setCartOpen] = useState(false);
  const [quotationId, setQuotationId] = useState(null);
  const [quotationNumber, setQuotationNumber] = useState(null);
  const [isDraftQuotation, setIsDraftQuotation] = useState(false); // NEW: Track if current quotation is draft

  const [companies, setCompanies] = useState([]);
  const [selectedCompanyData, setSelectedCompanyData] = useState(null);
  const [showCompanyModal, setShowCompanyModal] = useState(false);
  const [clients, setClients] = useState([]);
  const [clientDropdownOpen, setClientDropdownOpen] = useState(false);

  const [brandingTypesList, setBrandingTypesList] = useState([]);
  const [segmentsList, setSegmentsList] = useState([]);

  const [variationModalOpen, setVariationModalOpen] = useState(false);
  const [variationModalProduct, setVariationModalProduct] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editIndex, setEditIndex] = useState(null);

  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [detailsProdId, setDetailsProdId] = useState(null);
  const [detailsProduct, setDetailsProduct] = useState(null);

  const [filterDependencies, setFilterDependencies] = useState({
    subCategories: ["categories"],
    variationHinges: ["categories", "subCategories"],
  });

  const [parentChildMap, setParentChildMap] = useState({
    categories: {},
    subCategories: {},
    brands: {},
    priceRanges: {},
    variationHinges: {},
  });

  // Combine all selected filters for display as tags
  const allSelectedFilters = [
    ...selectedCategories.map((item) => ({
      type: "category",
      value: item,
      label: `Category: ${item}`,
    })),
    ...selectedSubCategories.map((item) => ({
      type: "subCategory",
      value: item,
      label: `SubCategory: ${item}`,
    })),
    ...selectedBrands.map((item) => ({ type: "brand", value: item, label: `Brand: ${item}` })),
    ...selectedPriceRanges.map((item) => ({
      type: "priceRange",
      value: item,
      label: `Price: ${item}`,
    })),
    ...selectedVariationHinges.map((item) => ({
      type: "variationHinge",
      value: item,
      label: `Hinge: ${item}`,
    })),
  ];

  // Remove a specific filter and reapply
  const removeFilter = (filterType, value) => {
    switch (filterType) {
      case "category":
        setSelectedCategories((prev) => prev.filter((x) => x !== value));
        break;
      case "subCategory":
        setSelectedSubCategories((prev) => prev.filter((x) => x !== value));
        break;
      case "brand":
        setSelectedBrands((prev) => prev.filter((x) => x !== value));
        break;
      case "priceRange":
        setSelectedPriceRanges((prev) => prev.filter((x) => x !== value));
        break;
      case "variationHinge":
        setSelectedVariationHinges((prev) => prev.filter((x) => x !== value));
        break;
      default:
        break;
    }
  };

  const openDetails = async (prodId) => {
    setDetailsProdId(prodId);
    setDetailsModalOpen(true);
    setDetailsProduct(null); // reset before fetching
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/products/${prodId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDetailsProduct(data);
    } catch (e) {
      setDetailsProduct(null);
    }
  };
  const closeDetails = () => {
    setDetailsModalOpen(false);
    setDetailsProdId(null);
  };

  // ─── Helpers & Network ────────────────────────────────────────────────────
  const buildParams = () => {
    const p = new URLSearchParams();
    if (searchTerm) p.append("search", searchTerm.toLowerCase().split(" ").filter(Boolean).join(","));
    if (selectedCategories.length) p.append("categories", selectedCategories.join(","));
    if (selectedSubCategories.length) p.append("subCategories", selectedSubCategories.join(","));
    if (selectedBrands.length) p.append("brands", selectedBrands.join(","));
    if (selectedPriceRanges.length) p.append("priceRanges", selectedPriceRanges.join(","));
    if (selectedVariationHinges.length)
      p.append("variationHinges", selectedVariationHinges.join(","));
    return p;
  };

  const fetchFilterOptions = async (extraQS = "") => {
    try {
      const token = localStorage.getItem("token");
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/products/filters${extraQS}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      // Set the options
      setFullCategories(data.categories.map((x) => x.name));
      setFullSubCategories(data.subCategories.map((x) => x.name));
      setFullBrands(data.brands.map((x) => x.name));
      setFullPriceRanges(data.priceRanges.map((x) => x.name));
      setFullVariationHinges(data.variationHinges.map((x) => x.name));

      // Set the counts
      setFilterCounts({
        categories: obj(data.categories),
        subCategories: obj(data.subCategories),
        brands: obj(data.brands),
        priceRanges: obj(data.priceRanges),
        variationHinges: obj(data.variationHinges),
      });

      // Build parent-child relationships
      if (data.relationships) {
        setParentChildMap(data.relationships);
      }
    } catch {
      setFilterCounts({ categories: {}, subCategories: {}, brands: {}, priceRanges: {}, variationHinges: {} });
      setFullCategories([]);
      setFullSubCategories([]);
      setFullBrands([]);
      setFullPriceRanges([]);
      setFullVariationHinges([]);
    }
  };

  const fetchProducts = async (page) => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token");
      const params = buildParams();
      params.append("page", page);
      params.append("limit", limit);
      const { data } = await axios.get(`${BACKEND_URL}/api/admin/products?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setProducts(data.products || []);
      setCurrentPage(data.currentPage || 1);
      setTotalPages(data.totalPages || 1);
      await fetchFilterOptions(`?${buildParams().toString()}`);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  };

  // ─── Initial Data ─────────────────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem("token");
    axios
      .get(`${BACKEND_URL}/api/admin/opportunities`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setOpportunityCodes(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);

    axios
      .get(`${BACKEND_URL}/api/admin/catalogs/branding-types`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((r) => setBrandingTypesList(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);

    axios
      .get(`${BACKEND_URL}/api/admin/segments`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => setSegmentsList(Array.isArray(r.data) ? r.data : []))
      .catch(console.error);

    fetchFilterOptions();
    fetchProducts(1);
  }, []);

  // ─── Fetch Catalog or Quotation for Editing ───────────────────────────────
  useEffect(() => {
    if (!id || (!isCatalogEditMode && !isQuotationEditMode)) return;

    setLoading(true);
    const token = localStorage.getItem("token");

    const fetchCatalog = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/admin/catalogs/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setOpportunityNumber(data.opportunityNumber || "");
        setCatalogName(data.catalogName || "");
        setCustomerName(data.customerName || "");
        setCustomerEmail(data.customerEmail || "");
        setCustomerAddress(data.customerAddress || "");
        setCustomerCompany(data.customerCompany || "");
        setFieldsToDisplay(Array.isArray(data.fieldsToDisplay) ? data.fieldsToDisplay : []);
        setSalutation(data.salutation || "Mr.");

        const m = data.margin ?? presetMarginOptions[0];
        if (presetMarginOptions.includes(m)) {
          setMarginOption("preset");
          setSelectedMargin(m);
        } else {
          setMarginOption("custom");
          setCustomMargin(String(m));
          setSelectedMargin(m);
        }

        const g = data.gst ?? presetGstOptions[0];
        if (presetGstOptions.includes(g)) {
          setGstOption("preset");
          setSelectedGst(g);
        } else {
          setGstOption("custom");
          setCustomGst(String(g));
          setSelectedGst(g);
        }

        setSelectedProducts(
          Array.isArray(data.products)
            ? data.products.map((item) => ({
                _id: item._id,
                productId: item.productId?._id || item.productId,
                productName: item.productName || item.name || "Unknown",
                ProductDescription: item.ProductDescription || item.productDetails || "",
                ProductBrand: item.ProductBrand || item.brandName || "",
                color: item.color || "",
                size: item.size || "",
                quantity: item.quantity || 1,
                productCost: item.productCost || 0,
                productGST: item.productGST || 0,
                material: item.material || "",
                weight: item.weight || "",
                brandingTypes: Array.isArray(item.brandingTypes)
                  ? item.brandingTypes.map((bt) => bt._id || bt)
                  : [],
                baseCost: item.baseCost ?? item.productCost ?? 0,
                suggestedBreakdown: item.suggestedBreakdown ?? {
                  baseCost: 0,
                  marginPct: 0,
                  marginAmount: 0,
                  logisticsCost: 0,
                  brandingCost: 0,
                  finalPrice: 0,
                },
                imageIndex: item.imageIndex || 0,
              }))
            : []
        );

        // Check for associated quotation
        const { data: quotationData } = await axios.get(`${BACKEND_URL}/api/admin/quotations?catalog=${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (Array.isArray(quotationData) && quotationData.length > 0) {
          setQuotationId(quotationData[0]._id);
          setQuotationNumber(quotationData[0].quotationNumber || null);
          setIsDraftQuotation(quotationData[0].isDraft || false); // NEW: Track draft status
        }
      } catch (err) {
        console.error("Error fetching catalog:", err);
      }
    };

    const fetchQuotation = async () => {
      try {
        const { data } = await axios.get(`${BACKEND_URL}/api/admin/quotations/${id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setQuotationId(data._id);
        setQuotationNumber(data.quotationNumber || null);
        setIsDraftQuotation(data.isDraft || false); // NEW: Track draft status
        setOpportunityNumber(data.opportunityNumber || "");
        setCatalogName(data.catalogName || "");
        setCustomerName(data.customerName || "");
        setCustomerEmail(data.customerEmail || "");
        setCustomerAddress(data.customerAddress || "");
        setCustomerCompany(data.customerCompany || "");
        setFieldsToDisplay(Array.isArray(data.fieldsToDisplay) ? data.fieldsToDisplay : []);
        setSalutation(data.salutation || "Mr.");

        const m = data.margin ?? presetMarginOptions[0];
        if (presetMarginOptions.includes(m)) {
          setMarginOption("preset");
          setSelectedMargin(m);
        } else {
          setMarginOption("custom");
          setCustomMargin(String(m));
          setSelectedMargin(m);
        }

        const g = data.gst ?? presetGstOptions[0];
        if (presetGstOptions.includes(g)) {
          setGstOption("preset");
          setSelectedGst(g);
        } else {
          setGstOption("custom");
          setCustomGst(String(g));
          setSelectedGst(g);
        }

        setSelectedProducts(
          Array.isArray(data.items)
            ? data.items.map((item) => ({
                productId: item.productId?._id || item.productId,
                productName: item.product || "Unknown",
                ProductDescription: "",
                ProductBrand: "",
                color: item.color || "",
                size: item.size || "",
                quantity: item.quantity || 1,
                productCost: item.productprice || 0,
                productGST: item.productGST || 0,
                material: item.material || "",
                weight: item.weight || "",
                brandingTypes: Array.isArray(item.brandingTypes)
                  ? item.brandingTypes.map((bt) => bt._id || bt)
                  : [],
                baseCost: item.baseCost || 0,
                suggestedBreakdown: item.suggestedBreakdown || {
                  baseCost: 0,
                  marginPct: 0,
                  marginAmount: 0,
                  logisticsCost: 0,
                  brandingCost: 0,
                  finalPrice: 0,
                },
                imageIndex: item.imageIndex || 0,
              }))
            : []
        );
      } catch (err) {
        console.error("Error fetching quotation:", err);
      }
    };

    if (isCatalogEditMode) {
      fetchCatalog();
    } else if (isQuotationEditMode) {
      fetchQuotation();
    }

    setLoading(false);
  }, [id, isCatalogEditMode, isQuotationEditMode]);

  // ─── Auto‐populate Company and Customer Details on Opportunity change ──────
  useEffect(() => {
    if (!opportunityNumber) {
      setCustomerCompany("");
      setSelectedCompanyData(null);
      setCustomerAddress("");
      setClients([]);
      setCustomerName("");
      setSalutation("Mr.");
      setCustomerEmail("");
      return;
    }
    const opp = opportunityCodes.find((o) => o.opportunityCode === opportunityNumber);
    if (opp && opp.account) {
      setCustomerCompany(opp.account);
      if (opp.contact) {
        const contactParts = opp.contact.split(" ");
        const sal = contactParts[0].toLowerCase().includes("ms.") ? "Ms." : "Mr.";
        setSalutation(sal);
        setCustomerName(opp.contact);
      } else {
        setSalutation("Mr.");
        setCustomerName("");
      }
      // Fetch company details
      axios
        .get(`${BACKEND_URL}/api/admin/companies`, {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          params: { companyName: opp.account.trim() },
        })
        .then((res) => {
          const comp = Array.isArray(res.data) ? res.data[0] : res.data;
          if (comp) {
            setSelectedCompanyData(comp);
            setCustomerAddress(comp.companyAddress || "");
            setClients(comp.clients || []);
            const matchingClient = comp.clients?.find(
              (c) => c.name?.toLowerCase() === opp.contact?.toLowerCase()
            );
            setCustomerEmail(matchingClient?.email || comp.companyEmail || "");
          } else {
            setSelectedCompanyData(null);
            setCustomerAddress("");
            setClients([]);
            setCustomerEmail("");
          }
        })
        .catch(() => {
          setSelectedCompanyData(null);
          setCustomerAddress("");
          setClients([]);
          setCustomerEmail("");
        });
    } else {
      setCustomerCompany("");
      setSelectedCompanyData(null);
      setCustomerAddress("");
      setClients([]);
      setSalutation("Mr.");
      setCustomerName("");
      setCustomerEmail("");
    }
  }, [opportunityNumber, opportunityCodes]);

  // ─── Re‐fetch on searchTerm or filter change ──────────────────────────────
  useEffect(() => {
    fetchProducts(1);
  }, [searchTerm, selectedCategories, selectedSubCategories, selectedBrands, selectedPriceRanges, selectedVariationHinges]);

  // ─── Action Handlers ─────────────────────────────────────────────────────
  const toggleFilter = (val, arr, setArr) =>
    arr.includes(val) ? setArr(arr.filter((v) => v !== val)) : setArr([...arr, val]);

  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCategories([]);
    setSelectedSubCategories([]);
    setSelectedBrands([]);
    setSelectedPriceRanges([]);
    setSelectedVariationHinges([]);
  };

  const filteredOppCodes = opportunityCodes.filter((o) =>
    o.opportunityCode?.toLowerCase().includes(opportunityNumber.toLowerCase())
  );

  const isDuplicate = (pid, c, s, productName) => {
    const skipKeywords = ["voucher", "giftcard", "e-vouchers"];
    const shouldSkip = skipKeywords.some((keyword) =>
      productName?.toLowerCase().includes(keyword.toLowerCase())
    );
    if (shouldSkip) return false;

    return selectedProducts.some((p) => p.productId === pid && (p.color || "") === c && (p.size || "") === s);
  };

  const handleAddSingle = (item) => {
    if (isDuplicate(item.productId, item.color, item.size, item.productName)) {
      alert("This item with the same color & size is already added!");
      return;
    }
    const cost = item.productCost || 0;
    setSelectedProducts((prev) => [
      ...prev,
      {
        ...item,
        productprice: cost,
        brandingTypes: [],
        baseCost: cost,
        suggestedBreakdown: { baseCost: 0, marginPct: 0, marginAmount: 0, logisticsCost: 0, brandingCost: 0, finalPrice: 0 },
        imageIndex: 0,
      },
    ]);
  };

  const handleAddVariations = (variations) => {
    if (!variationModalProduct) return;
    const cost = variationModalProduct.productCost || 0;
    const newItems = variations.map((v) => ({
      productId: variationModalProduct._id,
      productName: variationModalProduct.productName || variationModalProduct.name,
      productCost: cost,
      productGST: variationModalProduct.productGST || 0,
      color: v.color?.trim() || "",
      size: v.size?.trim() || "",
      quantity: v.quantity || 1,
      material: variationModalProduct.material || "",
      weight: variationModalProduct.weight || "",
      ProductDescription: variationModalProduct.productDetails || "",
      ProductBrand: variationModalProduct.brandName || "",
      brandingTypes: [],
      baseCost: cost,
      suggestedBreakdown: { baseCost: 0, marginPct: 0, marginAmount: 0, logisticsCost: 0, brandingCost: 0, finalPrice: 0 },
      imageIndex: 0,
    }));
    const filtered = newItems.filter((i) => !isDuplicate(i.productId, i.color, i.size, i.productName));
    if (filtered.length < newItems.length) alert("Some variations were duplicates and were not added.");
    setSelectedProducts((prev) => [...prev, ...filtered]);
    closeVariationModal();
  };

  const handleEditItem = (idx) => {
    setEditIndex(idx);
    setEditModalOpen(true);
  };

  const handleUpdateItem = (upd) => {
    setSelectedProducts((prev) => {
      const arr = [...prev];
      const dup = arr.some(
        (p, i) =>
          i !== editIndex &&
          p.productId === arr[editIndex].productId &&
          (p.color || "") === (upd.color || "") &&
          (p.size || "") === (upd.size || "")
      );
      if (dup) {
        alert("This update creates a duplicate. Not updating.");
        return arr;
      }
      arr[editIndex] = { ...arr[editIndex], ...upd };
      return arr;
    });
  };

  // ─── Build Quotation Payload ──────────────────────────────────────────────
  function buildQuotationPayload() {
    return {
      _id: isQuotationEditMode ? quotationId : undefined, // Include _id for updates
      opportunityNumber,
      catalogId: isCatalogEditMode ? id : undefined,
      catalogName,
      salutation,
      customerName,
      customerEmail,
      customerCompany,
      customerAddress,
      margin: selectedMargin,
      gst: selectedGst,
      fieldsToDisplay,
      items: selectedProducts.map((p, i) => {
        const qty = p.quantity || 1;
        const base = p.productCost || 0;
        const rate = parseFloat(base.toFixed(2));
        const amount = rate * qty;
        const gst = p.productGST ?? selectedGst;
        const gstVal = parseFloat((amount * (gst / 100)).toFixed(2));
        const total = parseFloat((amount + gstVal).toFixed(2));
        const cleanProductName = p.productName
          .replace(/\s*\(\w+\)\s*/g, "")
          .replace(/\s*\[\w+\]\s*/g, "");
        const productDisplayName = `${cleanProductName}${p.color ? ` (${p.color})` : ""}${p.size ? ` [${p.size}]` : ""}`;
        return {
          slNo: i + 1,
          productId: (p.productId && typeof p.productId === "object") ? p.productId._id : p.productId,
          product: productDisplayName,
          hsnCode: p.hsnCode || "",
          quantity: qty,
          rate,
          productprice: base,
          amount,
          productGST: gst,
          total,
          baseCost: p.baseCost || 0,
          material: p.material || "",
          weight: p.weight || "",
          brandingTypes: p.brandingTypes || [],
          suggestedBreakdown: p.suggestedBreakdown || {},
          imageIndex: p.imageIndex || 0,
        };
      }),
      terms: [],
      displayTotals: true,
      displayHSNCodes: true,
    };
  }

  // ─── Save (Create or Update) Quotation ────────────────────────────────────
  const handleSaveQuotation = async () => {
    if (!catalogName || !selectedProducts.length) {
      return alert("Enter Catalog Name & add ≥1 product");
    }

    const payload = buildQuotationPayload();

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BACKEND_URL}/api/admin/quotations`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotationId(response.data.quotation._id);
      setQuotationNumber(response.data.quotation.quotationNumber || null);
      setIsDraftQuotation(false); // Regular quotations are not drafts
      alert("New quotation created!");
    } catch (error) {
      console.error("Error saving quotation:", error);
      alert("Error saving quotation");
    }
  };

  // ─── NEW: Save Draft Quotation (marks with a DRAFT remark) ────────────────
  const handleCreateDraftQuotation = async () => {
    if (!catalogName || !selectedProducts.length) {
      return alert("Enter Catalog Name & add ≥1 product");
    }

    const payload = {
      ...buildQuotationPayload(),
      isDraft: true, // NEW: Use the proper isDraft field
    };

    try {
      const token = localStorage.getItem("token");
      const response = await axios.post(`${BACKEND_URL}/api/admin/quotations`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setQuotationId(response.data.quotation._id);
      setQuotationNumber(response.data.quotation.quotationNumber || null);
      setIsDraftQuotation(true); // NEW: Track draft status
      alert(`Draft quotation created! #${response.data.quotation.quotationNumber}`);
    } catch (error) {
      console.error("Error creating draft quotation:", error);
      alert("Error creating draft quotation");
    }
  };

  // ─── NEW: Update Draft Quotation ──────────────────────────────────────────
  const handleUpdateDraftQuotation = async () => {
    if (!quotationId || !isDraftQuotation) {
      alert("No draft quotation found to update");
      return;
    }

    if (!catalogName || !selectedProducts.length) {
      return alert("Enter Catalog Name & add ≥1 product");
    }

    const payload = {
      ...buildQuotationPayload(),
      isDraft: true, // Keep it as draft
    };

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${BACKEND_URL}/api/admin/quotations/${quotationId}`, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert("Draft quotation updated successfully!");
    } catch (error) {
      console.error("Error updating draft quotation:", error);
      alert("Error updating draft quotation");
    }
  };

  // ─── NEW: Publish Draft Quotation ─────────────────────────────────────────
  const handlePublishDraftQuotation = async () => {
    if (!quotationId || !isDraftQuotation) {
      alert("No draft quotation found to publish");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await axios.put(`${BACKEND_URL}/api/admin/quotations/${quotationId}/publish`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setIsDraftQuotation(false);
      alert("Draft quotation published successfully!");
    } catch (error) {
      console.error("Error publishing draft quotation:", error);
      alert("Error publishing draft quotation");
    }
  };

  // ─── Save (Create or Update) Catalog ──────────────────────────────────────
  const handleSaveCatalog = async () => {
    if (!opportunityNumber || !catalogName || !selectedProducts.length) {
      alert("Please fill required fields and add at least one product");
      return;
    }

    const sanitizedCustomerName = customerName.trim() === salutation ? "" : customerName.trim();

    const payload = {
      opportunityNumber,
      catalogName,
      salutation,
      customerName: sanitizedCustomerName,
      customerEmail,
      customerAddress,
      customerCompany,
      margin: selectedMargin,
      gst: selectedGst,
      products: selectedProducts.map((p) => ({
        ...(p._id && { _id: p._id }),
        productId: p.productId,
        productName: p.productName,
        ProductDescription: p.ProductDescription,
        ProductBrand: p.ProductBrand,
        color: p.color,
        size: p.size,
        quantity: p.quantity,
        productCost: p.productCost,
        productGST: p.productGST,
        material: p.material,
        weight: p.weight,
        brandingTypes: p.brandingTypes,
        baseCost: p.baseCost,
        suggestedBreakdown: p.suggestedBreakdown,
        imageIndex: p.imageIndex,
      })),
      fieldsToDisplay,
    };

    try {
      const token = localStorage.getItem("token");
      const method = isCatalogEditMode && id ? "put" : "post";
      const url = isCatalogEditMode && id
        ? `${BACKEND_URL}/api/admin/catalogs/${id}`
        : `${BACKEND_URL}/api/admin/catalogs`;
      await axios[method](url, payload, {
        headers: { Authorization: `Bearer ${token}` },
      });
      alert(isCatalogEditMode && id ? "Catalog updated!" : "Catalog created!");
      navigate("/admin-dashboard/manage-catalogs");
    } catch (e) {
      console.error("Error saving catalog:", e);
      alert(e.response?.data?.message || "Error saving catalog");
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 1) fetchProducts(currentPage - 1);
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) fetchProducts(currentPage + 1);
  };

  const fetchCompanies = async () => {
    try {
      const token = localStorage.getItem("token");
      const res = await axios.get(`${BACKEND_URL}/api/admin/companies?all=true`, {
        headers: { Authorization: { Authorization: `Bearer ${token}` } },
      });
      setCompanies(Array.isArray(res.data) ? res.data : []);
    } catch {
      setCompanies([]);
    }
  };

  const handleClientSelect = (client) => {
    setCustomerName(client.name || "");
    setCustomerEmail(client.email || "");
    setClientDropdownOpen(false);
  };

  const handleImageSearchClick = () => {
    imageInputRef.current?.click();
  };

  const handleImageSearch = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setAdvancedSearchLoading(true);
    try {
      const token = localStorage.getItem("token");
      const form = new FormData();
      form.append("image", file);
      const res = await axios.post(`${BACKEND_URL}/api/products/advanced-search`, form, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "multipart/form-data",
        },
      });
      setAdvancedSearchResults(Array.isArray(res.data.products) ? res.data.products : []);
      setAdvancedSearchActive(true);
    } catch {
      alert("Image search failed.");
    } finally {
      setAdvancedSearchLoading(false);
    }
  };

  const handleClearAdvancedSearch = () => {
    setAdvancedSearchActive(false);
    setAdvancedSearchResults([]);
  };

  const updateCompanyInfo = async () => {
    if (!selectedCompanyData?._id) return;
    try {
      const token = localStorage.getItem("token");
      const updatedData = {
        companyEmail: customerEmail,
        clients:
          selectedCompanyData.clients && selectedCompanyData.clients.length > 0
            ? [
                {
                  name: customerName,
                  contactNumber: selectedCompanyData.clients[0].contactNumber,
                  email: customerEmail,
                },
                ...selectedCompanyData.clients.slice(1),
              ]
            : [{ name: customerName, contactNumber: "", email: customerEmail }],
      };
      await axios.put(
        `${BACKEND_URL}/api/admin/companies/${selectedCompanyData._id}`,
        updatedData,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
    } catch {
      console.error("Error updating company info.");
    }
  };

  const handleOpenCompanyModal = () => setShowCompanyModal(true);
  const handleCloseCompanyModal = () => {
    setShowCompanyModal(false);
    fetchCompanies();
  };

  const openVariationSelector = (product) => {
    setVariationModalProduct(product);
    setVariationModalOpen(true);
  };

  const closeVariationModal = () => {
    setVariationModalOpen(false);
    setVariationModalProduct(null);
  };

  // Add cleanup effect
  useEffect(() => {
    return () => {
      setProducts([]);
      setSelectedProducts([]);
      setLoading(true);
      setCurrentPage(1);
      setTotalPages(1);
      setSearchTerm("");
      setSelectedCategories([]);
      setSelectedSubCategories([]);
      setSelectedBrands([]);
      setSelectedPriceRanges([]);
      setSelectedVariationHinges([]);
      setCartOpen(false);
      setDetailsModalOpen(false);
      setVariationModalOpen(false);
      setEditModalOpen(false);
    };
  }, []);

  // ─── JSX ───────────────────────────────────────────────────────────────────
  return (
    <div className="relative bg-white text-gray-800 min-h-screen p-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <h1 className="text-2xl font-bold text-purple-700">
          {isCatalogEditMode ? "Edit Catalog" : isQuotationEditMode ? "Edit Quotation" : "Create Catalog (Manual)"}
        </h1>
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={handleSaveCatalog}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            {isCatalogEditMode && id ? "Update Catalog" : "Create Catalog"}
          </button>

          {/* NEW: Draft Quotation Buttons */}
          {isDraftQuotation ? (
            <>
              <button
                onClick={handleUpdateDraftQuotation}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
                title="Update existing draft quotation"
              >
                Update Draft Quotation
              </button>
              <button
                onClick={handlePublishDraftQuotation}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded"
                title="Publish draft to live quotation"
              >
                Publish Draft
              </button>
            </>
          ) : (
            <button
              onClick={handleCreateDraftQuotation}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded"
              title="Creates a quotation marked as draft"
            >
              Create Draft Quotation
            </button>
          )}

          <button
            onClick={handleSaveQuotation}
            className="bg-[#Ff8045] hover:bg-[#Ff8045]/90 text-white px-4 py-2 rounded"
          >
            {isQuotationEditMode && quotationId ? "Create New Quotation" : "Create Quotation"}
          </button>

          {/* Draft Status Indicator */}
          {isDraftQuotation && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
              Draft Mode
            </div>
          )}
        </div>
      </div>

      {/* Rest of your JSX remains the same... */}
      {/* Form Fields */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {/* Opportunity Number */}
        <div className="relative">
          <label className="block mb-1 font-medium text-purple-700">
            Opportunity Number *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2 bg-white text-black font-bold"
            value={opportunityNumber}
            onChange={(e) => {
              setOpportunityNumber(e.target.value);
              setOpportunityDropdownOpen(true);
            }}
            onBlur={() => setTimeout(() => setOpportunityDropdownOpen(false), 200)}
            placeholder="e.g. 5001"
            required
          />
          {opportunityDropdownOpen && opportunityNumber && filteredOppCodes.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
              {filteredOppCodes.map((opp) => (
                <div
                  key={opp._id}
                  className="p-2 cursor-pointer hover:bg-gray-100"
                  onMouseDown={() => {
                    setOpportunityNumber(opp.opportunityCode || "");
                    setOpportunityDropdownOpen(false);
                  }}
                >
                  {opp.opportunityCode && opp.opportunityName
                    ? `${opp.opportunityCode} - ${opp.opportunityName}`
                    : opp.opportunityCode || "Unknown Opportunity"}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Catalog Name */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Catalog Name *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={catalogName}
            onChange={(e) => setCatalogName(e.target.value)}
            required
          />
        </div>

        {/* Customer Company */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">
            Customer Company *
          </label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerCompany}
            readOnly
            required
          />
        </div>

        {/* Customer Name + Salutation */}
        <div className="relative">
          <label className="block mb-1 font-medium text-purple-700">
            Customer Name *
          </label>
          <div className="flex items-center">
            <select
              className="border border-purple-300 rounded p-2 mr-2"
              value={salutation}
              onChange={(e) => setSalutation(e.target.value)}
            >
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
            </select>
            <input
              type="text"
              className="border border-purple-300 rounded w-full p-2"
              value={customerName}
              onChange={(e) => {
                setCustomerName(e.target.value);
                setClientDropdownOpen(true);
              }}
              onFocus={() => setClientDropdownOpen(true)}
              onBlur={() => setTimeout(() => setClientDropdownOpen(false), 150)}
              required
            />
          </div>
          {clientDropdownOpen && clients.length > 0 && (
            <div className="absolute z-10 bg-white border border-gray-300 rounded shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
              {clients
                .filter((c) => c.name?.toLowerCase().includes(customerName.toLowerCase()))
                .map((c) => (
                  <div
                    key={c._id || c.name}
                    className="p-2 cursor-pointer hover:bg-gray-100"
                    onMouseDown={() => handleClientSelect(c)}
                  >
                    {c.name || "Unknown Client"}
                  </div>
                ))}
            </div>
          )}
        </div>

        {/* Customer Email */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Email</label>
          <input
            type="email"
            className="border border-purple-300 rounded w-full p-2"
            value={customerEmail}
            onChange={(e) => setCustomerEmail(e.target.value)}
            onBlur={updateCompanyInfo}
          />
        </div>

        {/* Customer Address */}
        <div>
          <label className="block mb-1 font-medium text-purple-700">Customer Address</label>
          <input
            type="text"
            className="border border-purple-300 rounded w-full p-2"
            value={customerAddress}
            readOnly
          />
        </div>
      </div>

      {/* Fields to Display */}
      <div className="mb-6">
        <label className="block mb-2 font-medium text-purple-700">Fields to Display</label>
        <div className="flex flex-wrap gap-3">
          {[
            "images",
            "name",
            "category",
            "subCategory",
            "brandName",
            "productCost",
            "size",
            "color",
            "material",
            "weight",
            "brandingTypes",
          ].map((field) => (
            <label key={field} className="flex items-center space-x-1 text-sm">
              <input
                type="checkbox"
                checked={fieldsToDisplay.includes(field)}
                onChange={() => toggleFilter(field, fieldsToDisplay, setFieldsToDisplay)}
                className="form-checkbox h-4 w-4 text-purple-600"
              />
              <span className="text-gray-900">{field}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Search & Image Search */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div className="flex items-center space-x-2 w-full md:w-1/2">
          <input
            type="text"
            placeholder="Search by any field..."
            className="flex-grow px-3 py-2 border border-purple-300 rounded focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            onClick={handleImageSearchClick}
            className="px-3 py-2 bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white rounded hover:opacity-90 flex items-center"
          >
            {advancedSearchLoading && (
              <div className="w-5 h-5 border-4 border-white border-t-transparent border-solid rounded-full animate-spin mr-1"></div>
            )}
            <span>Search by Image</span>
          </button>
          <input
            type="file"
            ref={imageInputRef}
            style={{ display: "none" }}
            accept="image/*"
            onChange={handleImageSearch}
          />
          {advancedSearchActive && (
            <button
              onClick={handleClearAdvancedSearch}
              className="px-2 py-1 bg-red-500 text-white rounded text-sm hover:bg-red-600"
            >
              Clear Image
            </button>
          )}
        </div>
      </div>

      {(searchTerm ||
        selectedCategories.length > 0 ||
        selectedSubCategories.length > 0 ||
        selectedBrands.length > 0 ||
        selectedPriceRanges.length > 0 ||
        selectedVariationHinges.length > 0) && (
        <div className="mb-4">
          <button onClick={clearFilters} className="px-4 py-2 bg-red-500 text-white text-xs rounded">
            Clear Filters
          </button>
        </div>
      )}

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-6">
        <FilterDropdown
          label="categories"
          open={catsOpen}
          setOpen={setCatsOpen}
          options={fullCategories}
          selected={selectedCategories}
          onApply={(next) => setSelectedCategories(next)}
          counts={filterCounts.categories}
          allSelectedFilters={allSelectedFilters}
          removeFilter={removeFilter}
        />
        <FilterDropdown
          label="subCategories"
          open={subOpen}
          setOpen={setSubOpen}
          options={fullSubCategories}
          selected={selectedSubCategories}
          onApply={(next) => setSelectedSubCategories(next)}
          counts={filterCounts.subCategories}
          dependsOn={filterDependencies}
          allSelections={{
            categories: selectedCategories,
            subCategories: selectedSubCategories,
            brands: selectedBrands,
            priceRanges: selectedPriceRanges,
            variationHinges: selectedVariationHinges,
          }}
          parentChildMap={parentChildMap}
          allSelectedFilters={allSelectedFilters}
          removeFilter={removeFilter}
        />
        <FilterDropdown
          label="brands"
          open={brandsOpen}
          setOpen={setBrandsOpen}
          options={fullBrands}
          selected={selectedBrands}
          onApply={(next) => setSelectedBrands(next)}
          counts={filterCounts.brands}
          allSelectedFilters={allSelectedFilters}
          removeFilter={removeFilter}
        />
        <FilterDropdown
          label="priceRanges"
          open={prOpen}
          setOpen={setPrOpen}
          options={fullPriceRanges}
          selected={selectedPriceRanges}
          onApply={(next) => setSelectedPriceRanges(next)}
          counts={filterCounts.priceRanges}
          allSelectedFilters={allSelectedFilters}
          removeFilter={removeFilter}
        />
        <FilterDropdown
          label="variationHinges"
          open={vhOpen}
          setOpen={setVhOpen}
          options={fullVariationHinges}
          selected={selectedVariationHinges}
          onApply={(next) => setSelectedVariationHinges(next)}
          counts={filterCounts.variationHinges}
          dependsOn={filterDependencies}
          allSelections={{
            categories: selectedCategories,
            subCategories: selectedSubCategories,
            brands: selectedBrands,
            priceRanges: selectedPriceRanges,
            variationHinges: selectedVariationHinges,
          }}
          parentChildMap={parentChildMap}
          allSelectedFilters={allSelectedFilters}
          removeFilter={removeFilter}
        />

        {allSelectedFilters.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {allSelectedFilters.map((filter) => (
              <div
                key={`${filter.type}-${filter.value}`}
                className="flex items-center px-2 py-1 bg-purple-100 text-purple-800 text-sm rounded"
              >
                <span>{filter.label}</span>
                <button
                  onClick={() => removeFilter(filter.type, filter.value)}
                  className="ml-2 text-purple-600 hover:text-purple-800"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid & Pagination */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {[...Array(8)].map((_, index) => (
            <div key={index} className="animate-pulse">
              <div className="bg-gray-200 h-64 rounded-lg"></div>
              <div className="mt-2 bg-gray-200 h-4 rounded w-3/4"></div>
              <div className="mt-1 bg-gray-200 h-4 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {(advancedSearchActive ? advancedSearchResults : products).map((prod) => (
              <ProductCard
                key={prod._id}
                isLoading={!prod}
                product={prod}
                onAddSelected={handleAddSingle}
                openVariationSelector={() => openVariationSelector(prod)}
                onViewDetails={() => openDetails(prod._id)}
              />
            ))}
          </div>
          {!advancedSearchActive && (
            <div className="flex justify-center items-center mt-6 space-x-4">
              <button
                onClick={handlePrevPage}
                disabled={currentPage <= 1}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Prev
              </button>
              <span>Page {currentPage} of {totalPages}</span>
              <button
                onClick={handleNextPage}
                disabled={currentPage >= totalPages}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}

      {/* Floating Cart Icon */}
      <div
        className="fixed bottom-4 right-4 bg-purple-600 text-white rounded-full p-3 cursor-pointer shadow-lg"
        style={{ width: 60, height: 60 }}
        onClick={() => setCartOpen(true)}
      >
        <BagIcon />
        {selectedProducts.length > 0 && (
          <span className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-5 h-5 text-center text-xs">
            {selectedProducts.length}
          </span>
        )}
      </div>

      {/* Cart Drawer */}
      {cartOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-end z-50">
          <div className="bg-white w-full sm:w-96 p-4 overflow-auto relative">
            <h2 className="font-bold mb-4">Selected Items</h2>
            <button onClick={() => setCartOpen(false)} className="absolute top-2 right-2 text-xl">
              ×
            </button>
            <DragDropContext
              onDragEnd={(result) => {
                if (!result.destination) return;
                const arr = Array.from(selectedProducts);
                const [moved] = arr.splice(result.source.index, 1);
                arr.splice(result.destination.index, 0, moved);
                setSelectedProducts(arr);
              }}
            >
              <Droppable droppableId="cartItems">
                {(provided) => (
                  <div ref={provided.innerRef} {...provided.droppableProps}>
                    {selectedProducts.map((row, idx) => (
                      <Draggable
                        key={row._id || `${row.productId}-${idx}`}
                        draggableId={String(row._id || `${row.productId}-${idx}`)}
                        index={idx}
                      >
                        {(prov) => (
                          <div
                            ref={prov.innerRef}
                            {...prov.draggableProps}
                            {...prov.dragHandleProps}
                            className="border mb-3 p-2 rounded"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1 pr-2">
                                <div className="font-semibold">{row.productName}</div>
                                {row.color && <div className="text-xs">Color: {row.color}</div>}
                                {row.size && <div className="text-xs">Size: {row.size}</div>}
                                <div className="text-xs">Base Cost: ₹{Number(row.baseCost || row.productCost || 0).toFixed(2)}</div>
                                <div className="text-xs">Product Cost: ₹{Number(row.productCost || 0).toFixed(2)}</div>
                                <div className="text-xs">Qty: {row.quantity}</div>
                                <div className="text-xs">GST: {row.productGST}%</div>
                                {Array.isArray(row.brandingTypes) && row.brandingTypes.length > 0 && (
                                  <div className="text-xs">
                                    Branding:&nbsp;
                                    {(row.brandingTypes || [])
                                      .map((id) => {
                                        const bt = brandingTypesList.find((b) => (b._id || b.id) === id);
                                        return bt ? bt.brandingName : "Unknown";
                                      })
                                      .join(", ")}
                                  </div>
                                )}
                              </div>

                              <button
                                onClick={() => setSelectedProducts((ps) => ps.filter((_, i) => i !== idx))}
                                className="text-red-600"
                              >
                                Remove
                              </button>
                            </div>

                            <button
                              onClick={() => handleEditItem(idx)}
                              className="mt-2 bg-blue-500 text-white px-2 py-1 rounded text-xs"
                            >
                              Edit
                            </button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        </div>
      )}

      {/* Variation Modal */}
      {variationModalOpen && variationModalProduct && (
        <VariationModal
          product={variationModalProduct}
          onClose={closeVariationModal}
          onSave={handleAddVariations}
          companySegment={selectedCompanyData?.segment}
          companyPincode={selectedCompanyData?.pincode}
          brandingTypesList={brandingTypesList}
          segmentsList={segmentsList}
        />
      )}

      {/* Edit Modal */}
      {editModalOpen && editIndex !== null && (
        <VariationEditModal
          item={selectedProducts[editIndex]}
          brandingTypesList={brandingTypesList}
          segmentsList={segmentsList}
          segmentName={selectedCompanyData?.segment}
          companyPincode={selectedCompanyData?.pincode}
          onClose={() => setEditModalOpen(false)}
          onUpdate={(upd) => {
            handleUpdateItem(upd);
            setEditModalOpen(false);
          }}
        />
      )}

      {/* Company Creation Modal */}
      {showCompanyModal && <CompanyModal onClose={handleCloseCompanyModal} />}

      {/* Product Details Drawer/Modal */}
      {detailsModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-start p-4 z-50">
          <div className="bg-white w-full max-w-5xl h-[100vh] overflow-auto rounded-lg shadow-lg relative">
            <button
              onClick={closeDetails}
              className="absolute top-3 right-3 text-gray-600 hover:text-gray-900 text-3xl leading-none"
            >
              &times;
            </button>
            {detailsProduct ? (
              <AdminProductDetails product={detailsProduct} />
            ) : (
              <div className="p-8 text-center text-gray-500">Loading...</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}