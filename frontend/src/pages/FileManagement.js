"use client";

import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import RichTextEditor from "../components/RichTextEditor";

const ROLE_OPTIONS_ASC = [
  "ACCOUNTS", "ADMIN", "CRM", "DESIGN", "HR", "PROCESS", 
  "PRODUCTION", "PURCHASE", "SALES"
];

// PDF Viewer Component with download prevention
const PDFViewer = ({ fileUrl, fileName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
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

// Excel CSV Viewer Component with download prevention
const ExcelCSVViewer = ({ fileData, fileName, fileType, onClose }) => {
  const [data, setData] = useState([]);
  const [headers, setHeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const parseCSV = (text) => {
      const lines = text.split('\n').filter(line => line.trim());
      if (lines.length === 0) return { headers: [], data: [] };
      
      const headers = lines[0].split(',').map(header => header.trim());
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(value => value.trim());
        const row = {};
        headers.forEach((header, index) => {
          row[header] = values[index] || '';
        });
        return row;
      });
      
      return { headers, data };
    };

    if (fileType === 'text/csv') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const { headers, data } = parseCSV(e.target.result);
        setHeaders(headers);
        setData(data);
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

    document.addEventListener('contextmenu', preventRightClick);
    return () => {
      document.removeEventListener('contextmenu', preventRightClick);
    };
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4" onContextMenu={(e) => e.preventDefault()}>
          {fileType === 'text/csv' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full bg-white border border-gray-300">
                <thead>
                  <tr className="bg-gray-100">
                    {headers.map((header, index) => (
                      <th key={index} className="px-4 py-2 border text-left font-semibold">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, rowIndex) => (
                    <tr key={rowIndex} className={rowIndex % 2 === 0 ? 'bg-gray-50' : 'bg-white'}>
                      {headers.map((header, colIndex) => (
                        <td key={colIndex} className="px-4 py-2 border">
                          {row[header]}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
              {data.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No data available
                </div>
              )}
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

// Image Viewer Component with download prevention
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div 
          className="p-4 overflow-auto flex items-center justify-center"
          onContextMenu={preventDefault}
          onDragStart={preventDefault}
        >
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

// Text File Viewer Component with download prevention
const TextViewer = ({ fileData, fileName, onClose }) => {
  const [text, setText] = useState('');

  useEffect(() => {
    const reader = new FileReader();
    reader.onload = (e) => {
      setText(e.target.result);
    };
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
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div 
          className="flex-1 overflow-auto p-4"
          onContextMenu={preventDefault}
          onSelectStart={preventDefault}
        >
          <pre 
            className="whitespace-pre-wrap font-mono text-sm bg-gray-50 p-4 rounded border select-none"
            style={{ userSelect: 'none' }}
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

// Document Viewer Component
const DocumentViewer = ({ documentContent, fileName, onClose }) => {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b">
          <h3 className="text-lg font-semibold text-gray-900">{fileName}</h3>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
          >
            ×
          </button>
        </div>
        <div className="flex-1 overflow-auto p-6">
          <div 
            className="prose max-w-none"
            dangerouslySetInnerHTML={{ __html: documentContent }}
          />
        </div>
        <div className="p-3 bg-gray-100 text-center text-sm text-gray-600 border-t">
          Document View - Download disabled
        </div>
      </div>
    </div>
  );
};

// Enhanced File Management Component
export default function FileManagement() {
  const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
  
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showCreateDocumentModal, setShowCreateDocumentModal] = useState(false);
  const [showEditDocumentModal, setShowEditDocumentModal] = useState(false); // NEW
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
  
  // NEW: Document editing state
  const [editingDocument, setEditingDocument] = useState(null);
  const [editDocumentName, setEditDocumentName] = useState("");
  const [editDocumentDescription, setEditDocumentDescription] = useState("");
  const [editDocumentContent, setEditDocumentContent] = useState("");
  const [editDocumentRoles, setEditDocumentRoles] = useState([]);
  const [updatingDocument, setUpdatingDocument] = useState(false);
  
  // Search and sort state
  const [searchTerm, setSearchTerm] = useState("");
  const [sortConfig, setSortConfig] = useState({ key: "uploadedOn", direction: "desc" });
  const [showDocumentsOnly, setShowDocumentsOnly] = useState(false);

  // File viewer state
  const [viewerState, setViewerState] = useState({
    isOpen: false,
    fileType: null,
    fileUrl: null,
    fileData: null,
    fileName: null,
    documentContent: null,
    isDocument: false
  });

  const isSuperAdmin = localStorage.getItem("isSuperAdmin") === "true";

  useEffect(() => {
    fetchFiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDocumentsOnly]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const url = `${BACKEND_URL}/api/files?sortBy=${sortConfig.key}&sortOrder=${sortConfig.direction}${
        showDocumentsOnly ? '&documentOnly=true' : ''
      }`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      });
      setFiles(response.data);
      setError(null);
    } catch (err) {
      setError(err.response?.data?.message || "Failed to load files");
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prevConfig => ({
      key,
      direction: prevConfig.key === key && prevConfig.direction === "asc" ? "desc" : "asc"
    }));
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      alert("Please select a file");
      return;
    }

    if (accessibleRoles.length === 0) {
      alert("Please select at least one role");
      return;
    }

    if (!fileName.trim()) {
      alert("Please enter a file name");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("fileName", fileName.trim());
    formData.append("accessibleRoles", JSON.stringify(accessibleRoles));
    formData.append("description", description);

    try {
      setUploading(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/files/upload`,
        formData,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );

      setFiles(prev => [response.data.file, ...prev]);
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
    
    if (!documentName.trim()) {
      alert("Please enter a document name");
      return;
    }

    if (documentRoles.length === 0) {
      alert("Please select at least one role");
      return;
    }

    if (!documentContent.trim()) {
      alert("Please add some content to the document");
      return;
    }

    try {
      setCreatingDocument(true);
      const response = await axios.post(
        `${BACKEND_URL}/api/files/create-document`,
        {
          fileName: documentName.trim(),
          accessibleRoles: documentRoles,
          description: documentDescription,
          documentContent: documentContent
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      setFiles(prev => [response.data.file, ...prev]);
      setShowCreateDocumentModal(false);
      resetDocumentForm();
      alert("Document created successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to create document");
    } finally {
      setCreatingDocument(false);
    }
  };

  // NEW: Handle opening edit modal
  const handleEditDocument = (file) => {
    if (!file.isDocument) {
      alert("Only documents can be edited");
      return;
    }

    setEditingDocument(file);
    setEditDocumentName(file.fileName || "");
    setEditDocumentDescription(file.description || "");
    setEditDocumentContent(file.documentContent || "");
    setEditDocumentRoles(file.accessibleRoles || []);
    setShowEditDocumentModal(true);
  };

  // NEW: Handle updating document
  const handleUpdateDocument = async (e) => {
    e.preventDefault();
    
    if (!editDocumentName.trim()) {
      alert("Please enter a document name");
      return;
    }

    if (editDocumentRoles.length === 0) {
      alert("Please select at least one role");
      return;
    }

    if (!editDocumentContent.trim()) {
      alert("Please add some content to the document");
      return;
    }

    try {
      setUpdatingDocument(true);
      const response = await axios.put(
        `${BACKEND_URL}/api/files/update-document/${editingDocument.id}`,
        {
          fileName: editDocumentName.trim(),
          accessibleRoles: editDocumentRoles,
          description: editDocumentDescription,
          documentContent: editDocumentContent
        },
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );

      // Update the file in the list
      setFiles(prev => prev.map(file => 
        file.id === editingDocument.id ? response.data.file : file
      ));
      
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

  // NEW: Reset edit form
  const resetEditForm = () => {
    setEditingDocument(null);
    setEditDocumentName("");
    setEditDocumentDescription("");
    setEditDocumentContent("");
    setEditDocumentRoles([]);
  };

  const handleViewFile = async (file) => {
    // For documents, use the stored content directly
    if (file.isDocument) {
      setViewerState({
        isOpen: true,
        fileType: 'text/html',
        fileUrl: null,
        fileData: null,
        fileName: file.fileName,
        documentContent: file.documentContent,
        isDocument: true
      });
      return;
    }

    try {
      const response = await axios.get(
        `${BACKEND_URL}/api/files/view/${file.id}`,
        {
          headers: { 
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
          responseType: 'blob'
        }
      );

      const fileBlob = new Blob([response.data], { type: file.fileType });
      const fileUrl = URL.createObjectURL(fileBlob);

      setViewerState({
        isOpen: true,
        fileType: file.fileType,
        fileUrl,
        fileData: fileBlob,
        fileName: file.fileName,
        documentContent: null,
        isDocument: false
      });

    } catch (err) {
      alert(err.response?.data?.message || "Failed to view file");
    }
  };

  const closeViewer = () => {
    setViewerState({
      isOpen: false,
      fileType: null,
      fileUrl: null,
      fileData: null,
      fileName: null,
      documentContent: null,
      isDocument: false
    });
    
    if (viewerState.fileUrl) {
      URL.revokeObjectURL(viewerState.fileUrl);
    }
  };

  const handleDeleteFile = async (fileId) => {
    if (!isSuperAdmin) {
      alert("Only Super Admin can delete files");
      return;
    }

    const confirmed = window.confirm("Are you sure you want to delete this file?");
    if (!confirmed) return;

    try {
      await axios.delete(
        `${BACKEND_URL}/api/files/${fileId}`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      
      setFiles(prev => prev.filter(file => file.id !== fileId));
      alert("File deleted successfully!");
    } catch (err) {
      alert(err.response?.data?.message || "Failed to delete file");
    }
  };

  const toggleRole = (role, setRolesFunction) => {
    setRolesFunction(prev =>
      prev.includes(role)
        ? prev.filter(r => r !== role)
        : [...prev, role]
    );
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Filter files based on search term
  const filteredFiles = useMemo(() => {
    return files.filter(file =>
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (file.accessibleRoles && file.accessibleRoles.some(role => 
        role.toLowerCase().includes(searchTerm.toLowerCase())
      )) ||
      (file.description && file.description.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [files, searchTerm]);

  // Sort files
  const sortedFiles = useMemo(() => {
    return [...filteredFiles].sort((a, b) => {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      
      if (sortConfig.key === "fileSize") {
        return sortConfig.direction === "asc" ? aValue - bValue : bValue - aValue;
      }
      
      if (sortConfig.key === "uploadedOn") {
        return sortConfig.direction === "asc" 
          ? new Date(aValue) - new Date(bValue)
          : new Date(bValue) - new Date(aValue);
      }
      
      const compareResult = String(aValue).localeCompare(String(bValue));
      return sortConfig.direction === "asc" ? compareResult : -compareResult;
    });
  }, [filteredFiles, sortConfig]);

  const SortableHeader = ({ columnKey, children }) => (
    <th 
      className="px-6 py-3 text-left text-sm font-medium uppercase cursor-pointer hover:bg-purple-200"
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

  // Render appropriate viewer based on file type
  const renderViewer = () => {
    if (!viewerState.isOpen) return null;

    const { fileType, fileUrl, fileData, fileName, documentContent, isDocument } = viewerState;

    if (isDocument) {
      return <DocumentViewer documentContent={documentContent} fileName={fileName} onClose={closeViewer} />;
    }

    if (fileType === 'application/pdf') {
      return <PDFViewer fileUrl={fileUrl} fileName={fileName} onClose={closeViewer} />;
    } else if (fileType === 'text/csv' || fileType.includes('spreadsheetml') || fileType === 'application/vnd.ms-excel') {
      return <ExcelCSVViewer fileData={fileData} fileName={fileName} fileType={fileType} onClose={closeViewer} />;
    } else if (fileType.startsWith('image/')) {
      return <ImageViewer fileUrl={fileUrl} fileName={fileName} onClose={closeViewer} />;
    } else if (fileType === 'text/plain') {
      return <TextViewer fileData={fileData} fileName={fileName} onClose={closeViewer} />;
    } else {
      return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md">
            <h3 className="text-lg font-semibold mb-4">File Preview Not Available</h3>
            <p className="text-gray-600 mb-4">
              Preview is not available for this file type. Download functionality is disabled.
            </p>
            <div className="flex justify-end">
              <button
                onClick={closeViewer}
                className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      );
    }
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
            <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
              🔍
            </div>
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

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      {/* Files Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-purple-200 rounded-lg">
          <thead>
            <tr className="bg-purple-100 text-purple-900">
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">SL No</th>
              <SortableHeader columnKey="fileName">File Name</SortableHeader>
              <SortableHeader columnKey="fileSize">File Size</SortableHeader>
              <SortableHeader columnKey="uploadedBy">Uploaded By</SortableHeader>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Uploaded For</th>
              <SortableHeader columnKey="uploadedOn">Uploaded On</SortableHeader>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Type</th>
              <th className="px-6 py-3 text-left text-sm font-medium uppercase">Actions</th>
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
                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-1 rounded-full">
                          Document
                        </span>
                      )}
                    </div>
                    {file.description && (
                      <div className="text-xs text-gray-500 mt-1">{file.description}</div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{formatFileSize(file.fileSize)}</td>
                <td className="px-6 py-4 text-sm">{file.uploadedBy || "Unknown"}</td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex flex-wrap gap-1">
                    {file.accessibleRoles && file.accessibleRoles.map(role => (
                      <span
                        key={role}
                        className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded-full"
                      >
                        {role}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="px-6 py-4 text-sm">{formatDate(file.uploadedOn)}</td>
                <td className="px-6 py-4 text-sm">
                  {file.isDocument ? (
                    <span className="text-blue-600">📝 Document</span>
                  ) : (
                    <span className="text-gray-600">📎 File</span>
                  )}
                </td>
                <td className="px-6 py-4 text-sm">
                  <div className="flex gap-2 flex-wrap">
                    <button
                      onClick={() => handleViewFile(file)}
                      className="text-blue-600 hover:text-blue-800 text-sm whitespace-nowrap"
                    >
                      👁️ View
                    </button>
                    {/* NEW: Edit button for documents */}
                    {isSuperAdmin && file.isDocument && (
                      <button
                        onClick={() => handleEditDocument(file)}
                        className="text-green-600 hover:text-green-800 text-sm whitespace-nowrap"
                      >
                        ✏️ Edit
                      </button>
                    )}
                    {isSuperAdmin && (
                      <button
                        onClick={() => handleDeleteFile(file.id)}
                        className="text-red-600 hover:text-red-800 text-sm whitespace-nowrap"
                      >
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

      {/* File Viewer Modal */}
      {renderViewer()}

      {/* NEW: Edit Document Modal */}
      {showEditDocumentModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-green-600">✏️ Edit Document</h2>
            
            <form onSubmit={handleUpdateDocument}>
              {/* Document Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={editDocumentName}
                  onChange={(e) => setEditDocumentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Enter document name..."
                  required
                />
              </div>

              {/* Document Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={editDocumentDescription}
                  onChange={(e) => setEditDocumentDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 h-20"
                  placeholder="Enter document description..."
                />
              </div>

              {/* Accessible Roles */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Accessible Roles *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map(role => (
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
                <p className="text-xs text-gray-500 mt-1">
                  Select roles that should have access to this document
                </p>
              </div>

              {/* Rich Text Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Document Content *
                </label>
                <RichTextEditor
                  value={editDocumentContent}
                  onChange={setEditDocumentContent}
                  placeholder="Edit your document content here..."
                />
              </div>

              {/* Actions */}
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
                  {updatingDocument ? "Updating..." : "Update Document"}
                  {updatingDocument && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Document Modal - Only for Super Admin */}
      {showCreateDocumentModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-6xl max-h-[95vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-blue-600">Create Document</h2>
            
            <form onSubmit={handleCreateDocument}>
              {/* Document Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Document Name *
                </label>
                <input
                  type="text"
                  value={documentName}
                  onChange={(e) => setDocumentName(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2"
                  placeholder="Enter document name..."
                  required
                />
              </div>

              {/* Document Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={documentDescription}
                  onChange={(e) => setDocumentDescription(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg p-2 h-20"
                  placeholder="Enter document description..."
                />
              </div>

              {/* Accessible Roles */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Accessible Roles *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map(role => (
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
                <p className="text-xs text-gray-500 mt-1">
                  Select roles that should have access to this document
                </p>
              </div>

              {/* Rich Text Editor */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Document Content *
                </label>
                <RichTextEditor
                  value={documentContent}
                  onChange={setDocumentContent}
                  placeholder="Start typing your document content here..."
                />
              </div>

              {/* Actions */}
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
                  {creatingDocument ? "Creating..." : "Create Document"}
                  {creatingDocument && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Modal - Only for Super Admin */}
      {showUploadModal && isSuperAdmin && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto my-4">
            <h2 className="text-xl font-bold mb-4 text-[#Ff8045]">Upload File</h2>
            
            <form onSubmit={handleUpload}>
              {/* File Name */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  File Name *
                </label>
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-2"
                  placeholder="Enter a descriptive file name..."
                  required
                />
              </div>

              {/* File Selection */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">
                  Select File *
                </label>
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

              {/* Description */}
              <div className="mb-4">
                <label className="block text-sm font-medium mb-2">Description (Optional)</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full border border-purple-300 rounded-lg p-2 h-20"
                  placeholder="Enter file description..."
                />
              </div>

              {/* Accessible Roles */}
              <div className="mb-6">
                <label className="block text-sm font-medium mb-2">
                  Accessible Roles *
                </label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {ROLE_OPTIONS_ASC.map(role => (
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
                <p className="text-xs text-gray-500 mt-1">
                  Select roles that should have access to this file
                </p>
              </div>

              {/* Actions */}
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
                  {uploading ? "Uploading..." : "Upload File"}
                  {uploading && "⏳"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}