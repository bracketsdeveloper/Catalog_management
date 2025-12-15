const express = require("express");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const File = require("../models/File");
const User = require("../models/User");
const { authenticate } = require("../middleware/authenticate");
const { ROLE_ENUM } = require("../models/User");

const router = express.Router();

// Ensure upload directory exists
const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      "application/pdf",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "text/csv",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "image/png",
      "image/jpeg",
      "image/gif"
    ];
    
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Invalid file type. Only PDF, Excel, CSV, text files, and images are allowed."), false);
    }
  }
});

/* ---------- Upload File ---------- */
router.post("/upload", authenticate, upload.single("file"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    let { accessibleRoles, description, fileName, documentContent, isDocument } = req.body;
    
    // Parse accessibleRoles if it's a string (from form data)
    if (typeof accessibleRoles === 'string') {
      try {
        accessibleRoles = JSON.parse(accessibleRoles);
      } catch (parseError) {
        return res.status(400).json({ message: "Invalid accessibleRoles format" });
      }
    }
    
    if (!accessibleRoles || !Array.isArray(accessibleRoles) || accessibleRoles.length === 0) {
      // Clean up uploaded file if roles are invalid
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "At least one accessible role is required" });
    }

    // Validate roles
    const validRoles = accessibleRoles.every(role => ROLE_ENUM.includes(role));
    if (!validRoles) {
      // Clean up uploaded file if roles are invalid
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(400).json({ message: "Invalid roles specified" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      if (req.file && fs.existsSync(req.file.path)) {
        fs.unlinkSync(req.file.path);
      }
      return res.status(404).json({ message: "User not found" });
    }

    const newFile = new File({
      fileName: fileName || req.file.originalname,
      originalName: req.file.originalname,
      filePath: req.file.path,
      fileSize: req.file.size,
      fileType: req.file.mimetype,
      uploadedBy: req.user.id,
      uploadedByName: user.name,
      accessibleRoles: accessibleRoles,
      description: description || "",
      // NEW: Document fields
      documentContent: documentContent || "",
      isDocument: isDocument === "true" || isDocument === true
    });

    await newFile.save();

    res.status(201).json({
      message: "File uploaded successfully",
      file: {
        id: newFile._id,
        fileName: newFile.fileName,
        originalName: newFile.originalName,
        fileSize: newFile.fileSize,
        uploadedBy: newFile.uploadedByName,
        uploadedById: newFile.uploadedBy,
        accessibleRoles: newFile.accessibleRoles,
        uploadedOn: newFile.createdAt,
        description: newFile.description,
        fileType: newFile.fileType,
        // NEW: Include document fields in response
        documentContent: newFile.documentContent,
        isDocument: newFile.isDocument
      }
    });

  } catch (error) {
    // Clean up file if error occurs
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    res.status(500).json({ message: "Server error while uploading file", error: error.message });
  }
});

/* ---------- Create Document (without file upload) ---------- */
router.post("/create-document", authenticate, async (req, res) => {
  try {
    const { fileName, accessibleRoles, description, documentContent } = req.body;

    if (!fileName || !fileName.trim()) {
      return res.status(400).json({ message: "File name is required" });
    }

    if (!accessibleRoles || !Array.isArray(accessibleRoles) || accessibleRoles.length === 0) {
      return res.status(400).json({ message: "At least one accessible role is required" });
    }

    // Validate roles
    const validRoles = accessibleRoles.every(role => ROLE_ENUM.includes(role));
    if (!validRoles) {
      return res.status(400).json({ message: "Invalid roles specified" });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Create a virtual file path for documents
    const documentPath = path.join(uploadDir, `document-${Date.now()}.html`);

    const newDocument = new File({
      fileName: fileName.trim(),
      originalName: `${fileName.trim()}.html`,
      filePath: documentPath,
      fileSize: Buffer.byteLength(documentContent || '', 'utf8'),
      fileType: 'text/html',
      uploadedBy: req.user.id,
      uploadedByName: user.name,
      accessibleRoles: accessibleRoles,
      description: description || "",
      documentContent: documentContent || "",
      isDocument: true
    });

    await newDocument.save();

    res.status(201).json({
      message: "Document created successfully",
      file: {
        id: newDocument._id,
        fileName: newDocument.fileName,
        originalName: newDocument.originalName,
        fileSize: newDocument.fileSize,
        uploadedBy: newDocument.uploadedByName,
        uploadedById: newDocument.uploadedBy,
        accessibleRoles: newDocument.accessibleRoles,
        uploadedOn: newDocument.createdAt,
        description: newDocument.description,
        fileType: newDocument.fileType,
        documentContent: newDocument.documentContent,
        isDocument: newDocument.isDocument
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error while creating document", error: error.message });
  }
});

/* ---------- Get Files (with role-based access) ---------- */
router.get("/", authenticate, async (req, res) => {
  try {
    const { search, sortBy = "uploadedOn", sortOrder = "desc", documentOnly } = req.query;
    
    let query = {};
    
    // If user is not super admin, filter by their roles
    if (!req.user.isSuperAdmin) {
      const user = await User.findById(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Combine legacy role and new roles for compatibility
      const userRoles = [user.role, ...user.roles].filter(role => 
        role && role !== "GENERAL" && ROLE_ENUM.includes(role)
      );
      
      if (userRoles.length === 0) {
        return res.status(200).json([]);
      }
      
      query.accessibleRoles = { $in: userRoles };
    }

    // Filter for documents only if requested
    if (documentOnly === "true") {
      query.isDocument = true;
    }

    // Search functionality
    if (search) {
      query.$or = [
        { fileName: { $regex: search, $options: "i" } },
        { originalName: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { uploadedByName: { $regex: search, $options: "i" } }
      ];
    }

    // Sort configuration
    const sortConfig = {};
    sortConfig[sortBy] = sortOrder === "asc" ? 1 : -1;

    const files = await File.find(query)
      .select("fileName originalName fileSize uploadedByName uploadedBy accessibleRoles createdAt description fileType documentContent isDocument")
      .sort(sortConfig)
      .lean();

    const formattedFiles = files.map(file => ({
      id: file._id,
      fileName: file.fileName,
      fileSize: file.fileSize,
      uploadedBy: file.uploadedByName,
      uploadedById: file.uploadedBy,
      accessibleRoles: file.accessibleRoles,
      uploadedOn: file.createdAt,
      description: file.description,
      fileType: file.fileType,
      // NEW: Include document fields
      documentContent: file.documentContent,
      isDocument: file.isDocument || false
    }));

    res.status(200).json(formattedFiles);

  } catch (error) {
    res.status(500).json({ message: "Server error while fetching files", error: error.message });
  }
});

router.put("/update-document/:fileId", authenticate, async (req, res) => {
  try {
    const { fileName, accessibleRoles, description, documentContent } = req.body;

    // Check if user is Super Admin
    const user = await User.findById(req.user.id);
    if (!user || !user.isSuperAdmin) {
      return res.status(403).json({ message: "Only Super Admin can edit documents" });
    }

    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ message: "Document not found" });
    }

    if (!file.isDocument) {
      return res.status(400).json({ message: "This is not a document" });
    }

    if (fileName && fileName.trim()) {
      file.fileName = fileName.trim();
      file.originalName = `${fileName.trim()}.html`;
    }

    if (accessibleRoles && Array.isArray(accessibleRoles) && accessibleRoles.length > 0) {
      // Validate roles
      const validRoles = accessibleRoles.every(role => ROLE_ENUM.includes(role));
      if (!validRoles) {
        return res.status(400).json({ message: "Invalid roles specified" });
      }
      file.accessibleRoles = accessibleRoles;
    }

    if (description !== undefined) {
      file.description = description;
    }

    if (documentContent !== undefined) {
      file.documentContent = documentContent;
      file.fileSize = Buffer.byteLength(documentContent, 'utf8');
    }

    await file.save();

    res.status(200).json({
      message: "Document updated successfully",
      file: {
        id: file._id,
        fileName: file.fileName,
        originalName: file.originalName,
        fileSize: file.fileSize,
        uploadedBy: file.uploadedByName,
        uploadedById: file.uploadedBy,
        accessibleRoles: file.accessibleRoles,
        uploadedOn: file.createdAt,
        description: file.description,
        fileType: file.fileType,
        documentContent: file.documentContent,
        isDocument: file.isDocument
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Server error while updating document", error: error.message });
  }
});

/* ---------- View File ---------- */
router.get("/view/:fileId", authenticate, async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
  
      // Check access permissions
      if (!req.user.isSuperAdmin) {
        const user = await User.findById(req.user.id);
        const userRoles = [user.role, ...user.roles].filter(role => 
          role && role !== "GENERAL" && ROLE_ENUM.includes(role)
        );
        
        const hasAccess = file.accessibleRoles.some(role => userRoles.includes(role));
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
  
      // For documents, return the HTML content directly
      if (file.isDocument) {
        const htmlContent = `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>${file.fileName}</title>
            <style>
              body { 
                font-family: Arial, sans-serif; 
                margin: 40px; 
                line-height: 1.6;
                color: #333;
              }
              .document-content {
                max-width: 800px;
                margin: 0 auto;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 20px 0;
              }
              table, th, td {
                border: 1px solid #ddd;
              }
              th, td {
                padding: 12px;
                text-align: left;
              }
              th {
                background-color: #f5f5f5;
              }
              img {
                max-width: 100%;
                height: auto;
              }
            </style>
          </head>
          <body>
            <div class="document-content">
              ${file.documentContent || '<p>No content available</p>'}
            </div>
          </body>
          </html>
        `;
        
        res.setHeader("Content-Type", "text/html");
        res.setHeader("Content-Disposition", "inline");
        res.send(htmlContent);
        return;
      }
  
      if (!fs.existsSync(file.filePath)) {
        return res.status(404).json({ message: "File not found on server" });
      }
  
      // Set proper content type but prevent download
      res.setHeader("Content-Type", file.fileType);
      
      // CRITICAL: Remove any download headers and set to inline
      res.setHeader("Content-Disposition", "inline");
      
      // Additional headers to prevent download
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private");
      
      // Stream file
      const fileStream = fs.createReadStream(file.filePath);
      fileStream.pipe(res);
  
    } catch (error) {
      res.status(500).json({ message: "Server error while viewing file", error: error.message });
    }
  });

/* ---------- Delete File (Super Admin only) ---------- */
router.delete("/:fileId", authenticate, async (req, res) => {
  try {
    // Check if user is Super Admin
    const user = await User.findById(req.user.id);
    if (!user || !user.isSuperAdmin) {
      return res.status(403).json({ message: "Only Super Admin can delete files" });
    }

    const file = await File.findById(req.params.fileId);
    if (!file) {
      return res.status(404).json({ message: "File not found" });
    }

    // Delete physical file if it exists and is not a document
    if (!file.isDocument && fs.existsSync(file.filePath)) {
      fs.unlinkSync(file.filePath);
    }

    // Delete database record
    await File.findByIdAndDelete(req.params.fileId);

    res.status(200).json({ message: "File deleted successfully" });

  } catch (error) {
    res.status(500).json({ message: "Server error while deleting file", error: error.message });
  }
});

router.get("/url/:fileId", authenticate, async (req, res) => {
    try {
      const file = await File.findById(req.params.fileId);
      if (!file) {
        return res.status(404).json({ message: "File not found" });
      }
  
      // Check access permissions
      if (!req.user.isSuperAdmin) {
        const user = await User.findById(req.user.id);
        const userRoles = [user.role, ...user.roles].filter(role => 
          role && role !== "GENERAL" && ROLE_ENUM.includes(role)
        );
        
        const hasAccess = file.accessibleRoles.some(role => userRoles.includes(role));
        if (!hasAccess) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
  
      // Return file information for the frontend to construct the view URL
      res.status(200).json({
        id: file._id,
        fileName: file.fileName,
        fileType: file.fileType,
        isDocument: file.isDocument || false,
        viewUrl: `/api/files/view/${file._id}`
      });
  
    } catch (error) {
      res.status(500).json({ message: "Server error while getting file URL", error: error.message });
    }
  });

/* ---------- Get File Statistics ---------- */
router.get("/stats", authenticate, async (req, res) => {
  try {
    const stats = await File.aggregate([
      {
        $group: {
          _id: null,
          totalFiles: { $sum: 1 },
          totalSize: { $sum: "$fileSize" },
          totalDocuments: {
            $sum: { $cond: [{ $eq: ["$isDocument", true] }, 1, 0] }
          }
        }
      }
    ]);

    res.status(200).json(stats[0] || { totalFiles: 0, totalSize: 0, totalDocuments: 0 });
  } catch (error) {
    res.status(500).json({ message: "Server error while fetching stats", error: error.message });
  }
});

module.exports = router;