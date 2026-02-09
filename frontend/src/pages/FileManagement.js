"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import axios from "axios";
import RichTextEditor from "../components/RichTextEditor";

const ROLE_OPTIONS_ASC = [
  "ACCOUNTS",
  "ADMIN",
  "CRM",
  "DESIGN",
  "HR",
  "PROCESS",
  "PRODUCTION",
  "PURCHASE",
  "SALES",
];

// -------------------------
// Viewers (Download Prevent)
// -------------------------

const PDFViewer = ({ fileUrl, fileName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-hidden">
          <iframe
            src={fileUrl}
            className="w-full h-full border-0"
            title={fileName}
            onContextMenu={(e) => e.preventDefault()}
          />
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          View Only - Download disabled
        </div>
      </div>
    </div>
  );
};

const ExcelCSVViewer = ({ fileData, fileName, fileType, onClose }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parseCSV = (text) => {
      const lines = text.split("\n").filter((line) => line.trim());
      if (lines.length === 0) return { headers: [], data: [] };

      const hdrs = lines[0].split(",").map((h) => h.trim());
      const rows = lines.slice(1).map((line) => {
        const values = line.split(",").map((v) => v.trim());
        const row = {};
        hdrs.forEach((h, idx) => {
          row[h] = values[idx] || "";
        });
        return row;
      });

      return { headers: hdrs, data: rows };
    };

    if (fileType === "text/csv") {
      const reader = new FileReader();
      reader.onload = (e) => {
        const { headers: hdrs, data: rows } = parseCSV(e.target.result);
        setHeaders(hdrs);
        setData(rows);
        setLoading(false);
      };
      reader.readAsText(fileData);
    } else {
      setLoading(false);
    }
  }, [fileData, fileType]);

  useEffect(() => {
    const preventRightClick = (e) => {
      e.preventDefault();
      return false;
    };
    document.addEventListener("contextmenu", preventRightClick);
    return () => document.removeEventListener("contextmenu", preventRightClick);
  }, []);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6">
          <div className="text-center">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" onContextMenu={(e) => e.preventDefault()}>
          {fileType === "text/csv" ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {headers.map((h, idx) => (
                      <th key={idx} className="px-4 py-2 border text-left font-semibold">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rIdx) => (
                    <tr key={rIdx} className={rIdx % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                      {headers.map((h, cIdx) => (
                        <td key={cIdx} className="px-4 py-2 border">
                          {row[h]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && <div className="text-center py-8 text-gray-500">No data available</div>}
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-gray-600 mb-4">
                <p className="text-lg font-semibold">Excel File View</p>
                <p className="text-sm mt-2">Download functionality is disabled for security reasons.</p>
              </div>
              <div className="bg-yellow-100 border border-yellow-400 rounded p-4 max-w-md mx-auto">
                <p className="text-yellow-800 text-sm">
                  This Excel file can only be viewed. For detailed analysis, please contact your administrator.
                </p>
              </div>
            </div>
          )}
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          View Only - Download disabled
        </div>
      </div>
    </div>
  );
};

const ImageViewer = ({ fileUrl, fileName, onClose }) => {
  const preventDefault = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>
        <div className="p-4 overflow-auto flex items-center justify-center" onContextMenu={preventDefault} onDragStart={preventDefault}>
          <img
            src={fileUrl}
            alt={fileName}
            className="max-w-full max-h-[70vh] object-contain"
            onContextMenu={preventDefault}
            onDragStart={preventDefault}
            draggable="false"
          />
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          View Only - Download disabled
        </div>
      </div>
    </div>
  );
};

const TextViewer = ({ fileData, fileName, onClose }) => {
  const [text, setText] = useState("");

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => setText(e.target.result);
    reader.readAsText(fileData);
  }, [fileData]);

  const preventDefault = (e) => {
    e.preventDefault();
    return false;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" onContextMenu={preventDefault} onSelectStart={preventDefault}>
          <pre
            className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border select-none"
            style={{ userSelect: "none" }}
          >
            {text}
          </pre>
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          View Only - Download disabled
        </div>
      </div>
    </div>
  );
};

const DocumentViewer = ({ documentContent, fileName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl font-bold">
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div className="prose max-w-none" dangerouslySetInnerHTML={{ __html: documentContent }} />
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          Document View - Download disabled
        </div>
      </div>
    </div>
  );
};

// -------------------------
// Excel-like Filter Popover
// -------------------------

const useOnClickOutside = (ref, handler) => {
  useEffect(() => {
    const listener = (event) => {
      if (!ref.current || ref.current.contains(event.target)) return;
      handler(event);
    };
    document.addEventListener("mousedown", listener);
    return () => document.removeEventListener("mousedown", listener);
  }, [ref, handler]);
};

const FilterPopover = ({ title, options, value, onChange }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  useOnClickOutside(wrapRef, () => setOpen(false));

  const filteredOptions = useMemo(() => {
    const q = (value.search || "").toLowerCase().trim();
    if (!q) return options;
    return options.filter((opt) => String(opt).toLowerCase().includes(q));
  }, [options, value.search]);

  const toggleOpt = (opt) => {
    const selected = value.selected || [];
    const next = selected.includes(opt) ? selected.filter((x) => x !== opt) : [...selected, opt];
    onChange({ ...value, selected: next });
  };

  const selectAll = () => onChange({ ...value, selected: [...options] });
  const clear = () => onChange({ selected: [], search: "" });

  const hasActive = (value.selected || []).length > 0 || (value.search || "").length > 0;

  return (
    <div ref={wrapRef} className="relative inline-block">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation(); // don't trigger sort
          setOpen((v) => !v);
        }}
        className={`ml-2 text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 ${hasActive ? "border-purple-500" : ""}`}
        title={`Filter: ${title}`}
      >
        ⏷
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-72 bg-white border shadow-lg rounded p-3"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-2">
            <div className="font-semibold text-sm">{title}</div>
            <button className="text-gray-500 hover:text-gray-800" onClick={() => setOpen(false)}>
              ✕
            </button>
          </div>

          <input
            value={value.search || ""}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            placeholder="Search..."
            className="w-full border rounded px-2 py-1 text-sm mb-2"
          />

          <div className="flex gap-2 mb-2">
            <button type="button" onClick={selectAll} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
              Select All
            </button>
            <button type="button" onClick={clear} className="text-xs px-2 py-1 border rounded hover:bg-gray-50">
              Clear
            </button>
          </div>

          <div className="max-h-56 overflow-auto border rounded">
            {filteredOptions.map((opt) => (
              <label
                key={String(opt)}
                className="flex items-center gap-2 px-2 py-1 text-sm hover:bg-gray-50 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={(value.selected || []).includes(opt)}
                  onChange={() => toggleOpt(opt)}
                />
                <span className="truncate">{String(opt)}</span>
              </label>
            ))}
            {filteredOptions.length === 0 && <div className="p-2 text-sm text-gray-500">No values</div>}
          </div>
        </div>
      )}
    </div>
  );
};

// -------------------------
// Main Component
// -------------------------

export default function FileManagement() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;

  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false);
  const [showEditDocumentModal, setShowEditDocumentModal] = useState(false);

  const [uploading, setUploading] = useState(false);

  // Upload form state
  const [selectedFile, setSelectedFile] = useState(null);
  const [fileName, setFileName] = useState("");
  const [accessibleRoles, setAccessibleRoles] = useState([]);
  const [description, setDescription] = useState("");

  // Document creation state
  const [documentName, setDocumentName] = useState("");
  const [documentDescription, setDocumentDescription] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [documentRoles, setDocumentRoles] = useState([]);
  const [creatingDocument, setCreatingDocument] = useState(false);

  // Document editing state
  const [editingDocument, setEditingDocument] = useState(null);
  const [editDocumentName, setEditDocumentName] = useState("");
  const [editDocumentDescription, setEditDocumentDescription] = useState("");
  const [editDocumentContent, setEditDocumentContent] = useState("");
  const [editDocumentRoles, setEditDocumentRoles] = useState([]);
  const [updatingDocument, setUpdatingDocument] = useState(false);

  // Search & sort
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "updatedOn", direction: "desc" });
  const [showDocumentsOnly, setShowDocumentsOnly] = useState(false);

  // Excel-like column filters
  const [columnFilters, setColumnFilters] = useState({
    fileName: { selected: [], search: "" },
    uploadedBy: { selected: [], search: "" },
    fileType: { selected: [], search: "" },
    accessibleRoles: { selected: [], search: "" },
    isDocument: { selected: [], search: "" }, // Document/File
  });

  // Viewer state
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileType: null,
    fileUrl: null,
    fileData: null,
    fileName: null,
    documentContent: null,
    isDocument: false,
  });

  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDocumentsOnly, sortConfig.key, sortConfig.direction]);

  const fetchFiles = async () => {
    try {
      setLoading(true);

      const url = `${BACKEND_URL}/api/files?sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}${
        showDocumentsOnly ? "&documentOnly=true" : ""
      }`;

      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setFiles(response.data || []);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig((prev) => ({
      key,
      direction: prev.key === key && prev.direction === "asc" ? "desc" : "asc",
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) return alert("Please select a file");
    if (accessibleRoles.length === 0) return alert("Please select at least one role");
    if (!fileName.trim()) return alert("Please enter a file name");

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", fileName.trim());
    formData.append("accessibleRoles", JSON.stringify(accessibleRoles));
    formData.append("description", description);

    try {
      setUploading(true);
      const response = await axios.post(`${BACKEND_URL}/api/files/upload`, formData, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "multipart/form-data",
        },
      });

      setFiles((prev) => [response.data.file, ...prev]);
      setShowUploadModal(false);
      resetUploadForm();
      alert("File uploaded successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to upload file");
    } finally {
      setUploading(false);
    }
  };

  const handleCreateDocument = async (e) => {
    e.preventDefault();

    if (!documentName.trim()) return alert("Please enter a document name");
    if (documentRoles.length === 0) return alert("Please select at least one role");
    if (!documentContent.trim()) return alert("Please add some content to the document");

    try {
      setCreatingDocument(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/files/create-document`,
        {
          fileName: documentName.trim(),
          accessibleRoles: documentRoles,
          description: documentDescription,
          documentContent: documentContent,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFiles((prev) => [response.data.file, ...prev]);
      setShowCreateDocumentModal(false);
      resetDocumentForm();
      alert("Document created successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create document");
    } finally {
      setCreatingDocument(false);
    }
  };

  const handleEditDocument = (file) => {
    if (!file.isDocument) return alert("Only documents can be edited");

    setEditingDocument(file);
    setEditDocumentName(file.fileName || "");
    setEditDocumentDescription(file.description || "");
    setEditDocumentContent(file.documentContent || "");
    setEditDocumentRoles(file.accessibleRoles || []);
    setShowEditDocumentModal(true);
  };

  const handleUpdateDocument = async (e) => {
    e.preventDefault();

    if (!editDocumentName.trim()) return alert("Please enter a document name");
    if (editDocumentRoles.length === 0) return alert("Please select at least one role");
    if (!editDocumentContent.trim()) return alert("Please add some content to the document");

    try {
      setUpdatingDocument(true);
      const response = await axios.put(
        `${BACKEND_URL}/api/files/update-document/${editingDocument.id}`,
        {
          fileName: editDocumentName.trim(),
          accessibleRoles: editDocumentRoles,
          description: editDocumentDescription,
          documentContent: editDocumentContent,
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFiles((prev) => prev.map((f) => (f.id === editingDocument.id ? response.data.file : f)));

      setShowEditDocumentModal(false);
      resetEditForm();
      alert("Document updated successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to update document");
    } finally {
      setUpdatingDocument(false);
    }
  };

  const resetUploadForm = () => {
    setSelectedFile(null);
    setFileName("");
    setAccessibleRoles([]);
    setDescription("");
  };

  const resetDocumentForm = () => {
    setDocumentName("");
    setDocumentDescription("");
    setDocumentContent("");
    setDocumentRoles([]);
  };

  const resetEditForm = () => {
    setEditingDocument(null);
    setEditDocumentName("");
    setEditDocumentDescription("");
    setEditDocumentContent("");
    setEditDocumentRoles([]);
  };

  const handleViewFile = async (file) => {
    if (file.isDocument) {
      setViewerState({
        isOpen: true,
        fileType: "text/html",
        fileUrl: null,
        fileData: null,
        fileName: file.fileName,
        documentContent: file.documentContent,
        isDocument: true,
      });
      return;
    }

    try {
      const response = await axios.get(`${BACKEND_URL}/api/files/view/${file.id}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        responseType: "blob",
      });

      const fileBlob = new Blob([response.data], { type: file.fileType });
      const fileUrl = URL.createObjectURL(fileBlob);

      setViewerState({
        isOpen: true,
        fileType: file.fileType,
        fileUrl,
        fileData: fileBlob,
        fileName: file.fileName,
        documentContent: null,
        isDocument: false,
      });
    } catch (err) {
      alert(err.response?.data?.message || "Failed to view file");
    }
  };

  const closeViewer = () => {
    if (viewerState.fileUrl) URL.revokeObjectURL(viewerState.fileUrl);
    setViewerState({
      isOpen: false,
      fileType: null,
      fileUrl: null,
      fileData: null,
      fileName: null,
      documentContent: null,
      isDocument: false,
    });
  };

  const handleDeleteFile = async (fileId) => {
    if (!isSuperAdmin) return alert("Only Super Admin can delete files");

    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    try {
      await axios.delete(`${BACKEND_URL}/api/files/${fileId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });

      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      alert("File deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete file");
    }
  };

  const toggleRole = (role, setRolesFunction) => {
    setRolesFunction((prev) => (prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]));
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDateTimeIST = (dateString) => {
    if (!dateString) return "-";
    return new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Kolkata",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }).format(new Date(dateString));
  };

  // Options for filters (like excel)
  const uniq = (arr) => Array.from(new Set((arr || []).filter(Boolean)));

  const filterOptions = useMemo(() => {
    return {
      fileName: uniq(files.map((f) => f.fileName)),
      uploadedBy: uniq(files.map((f) => f.uploadedBy)),
      fileType: uniq(files.map((f) => f.fileType)),
      accessibleRoles: uniq(files.flatMap((f) => f.accessibleRoles || [])),
      isDocument: ["Document", "File"],
    };
  }, [files]);

  // Apply excel-like filters + global search
  const filteredFiles = useMemo(() => {
    const matchesExcelFilters = (file) => {
      if (columnFilters.fileName.selected.length > 0) {
        if (!columnFilters.fileName.selected.includes(file.fileName)) return false;
      }

      if (columnFilters.uploadedBy.selected.length > 0) {
        if (!columnFilters.uploadedBy.selected.includes(file.uploadedBy)) return false;
      }

      if (columnFilters.fileType.selected.length > 0) {
        if (!columnFilters.fileType.selected.includes(file.fileType)) return false;
      }

      if (columnFilters.accessibleRoles.selected.length > 0) {
        const roles = file.accessibleRoles || [];
        const ok = columnFilters.accessibleRoles.selected.some((r) => roles.includes(r));
        if (!ok) return false;
      }

      if (columnFilters.isDocument.selected.length > 0) {
        const label = file.isDocument ? "Document" : "File";
        if (!columnFilters.isDocument.selected.includes(label)) return false;
      }

      return true;
    };

    const q = searchTerm.toLowerCase();

    return (files || [])
      .filter(matchesExcelFilters)
      .filter((file) => {
        return (
          (file.fileName || "").toLowerCase().includes(q) ||
          (file.uploadedBy || "").toLowerCase().includes(q) ||
          (file.accessibleRoles || []).some((role) => String(role).toLowerCase().includes(q)) ||
          (file.description || "").toLowerCase().includes(q)
        );
      });
  }, [files, searchTerm, columnFilters]);

  // Sort in UI as well (keeps consistent even if backend already sorted)
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const key = sortConfig.key;
      const dir = sortConfig.direction === "asc" ? 1 : -1;

      if (key === "fileSize") return dir * ((a.fileSize || 0) - (b.fileSize || 0));
      if (key === "uploadedOn") return dir * (new Date(a.uploadedOn || 0) - new Date(b.uploadedOn || 0));
      if (key === "updatedOn") return dir * (new Date(a.updatedOn || 0) - new Date(b.updatedOn || 0));

      const aVal = String(a[key] ?? "");
      const bVal = String(b[key] ?? "");
      return dir * aVal.localeCompare(bVal);
    });
  }, [filteredFiles, sortConfig]);

  const SortableHeader = ({ columnKey, children }) => (
    <th
      className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer hover:bg-purple-200 bg-purple-100"
      onClick={() => handleSort(columnKey)}
    >
      <div className="flex items-center gap-1">
        {children}
        <span className="text-xs">
          {sortConfig.key === columnKey ? (sortConfig.direction === "asc" ? "↑" : "↓") : "↕"}
        </span>
      </div>
    </th>
  );

  const renderViewer = () => {
    if (!viewerState.isOpen) return null;

    const { fileType, fileUrl, fileData, fileName, documentContent, isDocument } = viewerState;

    if (isDocument) {
      return <DocumentViewer documentContent={documentContent} fileName={fileName} onClose={closeViewer} />;
    }

    if (fileType === "application/pdf") {
      return <PDFViewer fileUrl={fileUrl} fileName={fileName} onClose={closeViewer} />;
    } else if (
      fileType === "text/csv" ||
      (fileType || "").includes("spreadsheetml") ||
      fileType === "application/vnd.ms-excel"
    ) {
      return <ExcelCSVViewer fileData={fileData} fileName={fileName} fileType={fileType} onClose={closeViewer} />;
    } else if ((fileType || "").startsWith("image/")) {
      return <ImageViewer fileUrl={fileUrl} fileName={fileName} onClose={closeViewer} />;
    } else if (fileType === "text/plain") {
      return <TextViewer fileData={fileData} fileName={fileName} onClose={closeViewer} />;
    }

    return (
      <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 max-w-md">
          <h3 className="text-lg font-semibold mb-4">File Preview Not Available</h3>
          <p className="text-gray-600 mb-4">Preview is not available for this file type. Download functionality is disabled.</p>
          <div className="flex justify-end">
            <button onClick={closeViewer} className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400">
              Close
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (loading) return <div className="text-gray-900 p-6">Loading files...</div>;

  return (
    <div className="p-6 bg-white text-gray-900 rounded-md shadow-md">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#Ff8045]">File Management</h1>

        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Bar */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search files..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-purple-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">🔍</div>
          </div>

          {/* Documents Only Toggle */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="documentsOnly"
              checked={showDocumentsOnly}
              onChange={(e) => setShowDocumentsOnly(e.target.checked)}
              className="w-4 h-4 text-purple-600 bg-gray-100 border-gray-300 rounded focus:ring-purple-500"
            />
            <label htmlFor="documentsOnly" className="text-sm font-medium">
              Documents Only
            </label>
          </div>

          {/* Create Document Button - Only show for Super Admin */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowCreateDocumentModal(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
            >
              <span>📝</span>
              Create Document
            </button>
          )}

          {/* Upload Button - Only show for Super Admin */}
          {isSuperAdmin && (
            <button
              onClick={() => setShowUploadModal(true)}
              className="bg-[#44b977] text-white px-4 py-2 rounded-lg hover:bg-[#44b977]/90 flex items-center gap-2"
            >
              <span>📁</span>
              Upload File
            </button>
          )}
        </div>
      </div>

      {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">{error}</div>}

      {/* Files Table (Freeze headers) */}
      <div className="overflow-x-auto max-h-[70vh] border border-purple-200 rounded-lg">
        <table className="min-w-full bg-white">
          <thead className="sticky top-0 z-20">
            <tr className="bg-purple-100 text-purple-900">
              <th className="px-6 py-3 text-left text-sm font-medium uppercase bg-purple-100">SL No</th>

              <SortableHeader columnKey="fileName">
                <div className="flex items-center">
                  File Name
                  <FilterPopover
                    title="File Name"
                    options={filterOptions.fileName}
                    value={columnFilters.fileName}
                    onChange={(v) => setColumnFilters((prev) => ({ ...prev, fileName: v }))}
                  />
                </div>
              </SortableHeader>

              <SortableHeader columnKey="fileSize">File Size</SortableHeader>

              <SortableHeader columnKey="uploadedBy">
                <div className="flex items-center">
                  Uploaded By
                  <FilterPopover
                    title="Uploaded By"
                    options={filterOptions.uploadedBy}
                    value={columnFilters.uploadedBy}
                    onChange={(v) => setColumnFilters((prev) => ({ ...prev, uploadedBy: v }))}
                  />
                </div>
              </SortableHeader>

              <th className="px-6 py-3 text-left text-sm font-medium uppercase bg-purple-100">
                <div className="flex items-center">
                  Uploaded For
                  <FilterPopover
                    title="Roles"
                    options={filterOptions.accessibleRoles}
                    value={columnFilters.accessibleRoles}
                    onChange={(v) => setColumnFilters((prev) => ({ ...prev, accessibleRoles: v }))}
                  />
                </div>
              </th>

              <SortableHeader columnKey="uploadedOn">Uploaded On</SortableHeader>
              <SortableHeader columnKey="updatedOn">Updated On</SortableHeader>

              <th className="px-6 py-3 text-left text-sm font-medium uppercase bg-purple-100">
                <div className="flex items-center">
                  Type
                  <FilterPopover
                    title="Type"
                    options={filterOptions.isDocument}
                    value={columnFilters.isDocument}
                    onChange={(v) => setColumnFilters((prev) => ({ ...prev, isDocument: v }))}
                  />
                </div>
              </th>

              <th className="px-6 py-3 text-left text-sm font-medium uppercase bg-purple-100">Actions</th>
            </tr>
          </thead>

          <tbody>
            {sortedFiles.map((file, index) => (
              <tr key={file.id} className="border-b border-purple-200 hover:bg-gray-50">
                <td className="px-6 py-4 text-sm">{index + 1}</td>

                <td className="px-6 py-4 text-sm">
                  <div>
                    <div className="font-medium flex items-center gap-2">
                      {file.fileName}
                      {file.isDocument && (
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">Document</span>
                      )}
                    </div>
                    {file.description && <div className="text-xs text-gray-500 mt-1">{file.description}</div>}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm">{formatFileSize(file.fileSize)}</td>
                <td className="px-6 py-4 text-sm">{file.uploadedBy || "Unknown"}</td>

                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {file.accessibleRoles &&
                      file.accessibleRoles.map((role) => (
                        <span key={role} className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full">
                          {role}
                        </span>
                      ))}
                  </div>
                </td>

                <td className="px-6 py-4 text-sm">{formatDateTimeIST(file.uploadedOn)}</td>
                <td className="px-6 py-4 text-sm">{formatDateTimeIST(file.updatedOn)}</td>

                <td className="px-6 py-4 text-sm">
                  {file.isDocument ? <span className="text-blue-600">📝 Document</span> : <span className="text-gray-600">📎 File</span>}
                </td>

                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => handleViewFile(file)} className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap">
                      👁️ View
                    </button>

                    {isSuperAdmin && file.isDocument && (
                      <button onClick={() => handleEditDocument(file)} className="text-green-600 hover:text-green-800 text-sm whitespace-nowrap">
                        ✏️ Edit
                      </button>
                    )}

                    {isSuperAdmin && (
                      <button onClick={() => handleDeleteFile(file.id)} className="text-red-600 hover:text-red-800 text-sm whitespace-nowrap">
                        🗑️ Delete
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {sortedFiles.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No files found. {isSuperAdmin && "Upload your first file or create a document to get started!"}
          </div>
        )}
      </div>

      {/* Viewer Modal */}
      {renderViewer()}

      {/* Edit Document Modal */}
      {showEditDocumentModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-green-600">✏️ Edit Document</h2>

            <form onSubmit={handleUpdateDocument}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Document Name *</label>
                <input
                  type="text"
                  value={editDocumentName}
                  onChange={(e) => setEditDocumentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Enter document name..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={editDocumentDescription}
                  onChange={(e) => setEditDocumentDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 h-20"
                  placeholder="Enter document description..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Accessible Roles *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-2 border rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                        editDocumentRoles.includes(role)
                          ? "bg-green-600 text-white border-green-600"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={editDocumentRoles.includes(role)}
                        onChange={() => toggleRole(role, setEditDocumentRoles)}
                        className="hidden"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select roles that should have access to this document</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Document Content *</label>
                <RichTextEditor value={editDocumentContent} onChange={setEditDocumentContent} placeholder="Edit your document content here..." />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditDocumentModal(false);
                    resetEditForm();
                  }}
                  className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
                  disabled={updatingDocument}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2"
                  disabled={updatingDocument}
                >
                  {updatingDocument ? "Updating..." : "Update Document"} {updatingDocument && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Document Modal */}
      {showCreateDocumentModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-blue-600">Create Document</h2>

            <form onSubmit={handleCreateDocument}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Document Name *</label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Enter document name..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 h-20"
                  placeholder="Enter document description..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Accessible Roles *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-2 border rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                        documentRoles.includes(role)
                          ? "bg-blue-600 text-white border-blue-600"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={documentRoles.includes(role)}
                        onChange={() => toggleRole(role, setDocumentRoles)}
                        className="hidden"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select roles that should have access to this document</p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Document Content *</label>
                <RichTextEditor value={documentContent} onChange={setDocumentContent} placeholder="Start typing your document content here..." />
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateDocumentModal(false);
                    resetDocumentForm();
                  }}
                  className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
                  disabled={creatingDocument}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2"
                  disabled={creatingDocument}
                >
                  {creatingDocument ? "Creating..." : "Create Document"} {creatingDocument && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal */}
      {showUploadModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Upload File</h2>

            <form onSubmit={handleUpload}>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">File Name *</label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-2"
                  placeholder="Enter a descriptive file name..."
                  required
                />
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Select File *</label>
                <input
                  type="file"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full border border-purple-300 rounded-lg p-2"
                  accept=".pdf,.xlsx,.xls,.csv,.txt,.doc,.docx,.png,.jpg,.jpeg,.gif"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Supported formats: PDF, Excel, CSV, Text, Word documents, Images (Max: 10MB)
                </p>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-2 h-20"
                  placeholder="Enter file description..."
                />
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">Accessible Roles *</label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map((role) => (
                    <label
                      key={role}
                      className={`flex items-center gap-2 border rounded px-3 py-2 text-sm cursor-pointer transition-colors ${
                        accessibleRoles.includes(role)
                          ? "bg-pink-600 text-white border-pink-600"
                          : "bg-gray-50 border-gray-300 hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={accessibleRoles.includes(role)}
                        onChange={() => toggleRole(role, setAccessibleRoles)}
                        className="hidden"
                      />
                      {role}
                    </label>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">Select roles that should have access to this file</p>
              </div>

              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowUploadModal(false);
                    resetUploadForm();
                  }}
                  className="bg-gray-300 text-gray-900 px-4 py-2 rounded-md hover:bg-gray-400"
                  disabled={uploading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-pink-600 text-white px-4 py-2 rounded-md hover:bg-pink-700 flex items-center gap-2"
                  disabled={uploading}
                >
                  {uploading ? "Uploading..." : "Upload File"} {uploading && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
