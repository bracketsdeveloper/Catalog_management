import axios from "axios";
import * as XLSX from "xlsx";

const BASE = process.env.REACT_APP_BACKEND_URL;

const api = axios.create({
  baseURL: BASE,
  timeout: 30000,
});

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// Date Utilities
export const dateUtils = {
  parseDateString(dateString) {
    if (!dateString) return new Date();
    const parts = dateString.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      return new Date(year, month, day);
    }
    return new Date(dateString);
  },
  
  formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  
  getStartOfDay(date) {
    const d = new Date(date);
    d.setHours(0, 0, 0, 0);
    return d;
  },
  
  getEndOfDay(date) {
    const d = new Date(date);
    d.setHours(23, 59, 59, 999);
    return d;
  },
  
  getMonthName(month) {
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];
    return monthNames[month - 1] || '';
  },
  
  getWorkingDaysInMonth(year, month) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    let workingDays = 0;
    
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      const dayOfWeek = d.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
    }
    
    return workingDays;
  },
  
  formatIndianDate(date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }
};

// Excel Utilities
export const excelUtils = {
  generateAttendanceTemplate() {
    const headers = [
      "SNo",
      "E. Code",
      "Name",
      "Shift",
      "InTime(00:00)",
      "OutTime(00:00)",
      "Work Dur.(00:00)",
      "OT(00:00)",
      "Tot. Dur.(8:42)",
      "Status(Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present , WeeklyOff Present )",
      "Remarks",
    ];

    const sampleData = [
      {
        "SNo": 1,
        "E. Code": "EMP001",
        "Name": "John Doe",
        "Shift": "General",
        "InTime(00:00)": "09:00",
        "OutTime(00:00)": "18:00",
        "Work Dur.(00:00)": "8:00",
        "OT(00:00)": "1:00",
        "Tot. Dur.(8:42)": "9:00",
        "Status(Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present , WeeklyOff Present )": "Present",
        "Remarks": "Regular day"
      },
      {
        "SNo": 2,
        "E. Code": "EMP002",
        "Name": "Jane Smith",
        "Shift": "Morning",
        "InTime(00:00)": "08:30",
        "OutTime(00:00)": "17:30",
        "Work Dur.(00:00)": "8:00",
        "OT(00:00)": "0:30",
        "Tot. Dur.(8:42)": "8:30",
        "Status(Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present , WeeklyOff Present )": "Present",
        "Remarks": ""
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData, {
      header: headers,
      skipHeader: false,
    });

    const colWidths = [
      { wch: 5 },
      { wch: 10 },
      { wch: 20 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 10 },
      { wch: 12 },
      { wch: 30 },
      { wch: 20 },
    ];
    worksheet["!cols"] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Template");

    // Add instructions sheet
    const instructions = [
      ["ATTENDANCE UPLOAD TEMPLATE - INSTRUCTIONS"],
      [""],
      ["Column", "Description", "Format", "Required"],
      ["SNo", "Serial Number", "Number", "Optional"],
      ["E. Code", "Employee ID (must match employee records)", "Text", "Required"],
      ["Name", "Employee Name", "Text", "Optional"],
      ["Shift", "Shift Type", "Text", "Optional"],
      ["InTime(00:00)", "Check-in time", "HH:mm (24-hour)", "Optional"],
      ["OutTime(00:00)", "Check-out time", "HH:mm (24-hour)", "Optional"],
      ["Work Dur.(00:00)", "Working duration", "HH:mm or decimal", "Optional"],
      ["OT(00:00)", "Overtime duration", "HH:mm or decimal", "Optional"],
      ["Tot. Dur.(8:42)", "Total duration", "HH:mm or decimal", "Optional"],
      ["Status", "Attendance status", "One of: Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present, WeeklyOff Present", "Required"],
      ["Remarks", "Additional notes", "Text", "Optional"],
      [""],
      ["NOTES:"],
      ["1. Date is selected during upload and applies to all records"],
      ["2. Employee ID must exist in the system"],
      ["3. Leave 'InTime' and 'OutTime' blank for Absent/Leave status"],
      ["4. For half-day, use '½Present' status and appropriate hours"],
      ["5. File should be saved as .xlsx or .xls format"],
    ];

    const instructionSheet = XLSX.utils.aoa_to_sheet(instructions);
    XLSX.utils.book_append_sheet(workbook, instructionSheet, "Instructions");

    return workbook;
  },

  downloadTemplate(filename = "Attendance_Template.xlsx") {
    const workbook = this.generateAttendanceTemplate();
    XLSX.writeFile(workbook, filename);
  },

  readExcelFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array" });
          const sheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
          
          resolve({
            success: true,
            data: jsonData,
            sheetName,
            headers: Object.keys(jsonData[0] || {}),
          });
        } catch (error) {
          reject(new Error(`Failed to parse Excel file: ${error.message}`));
        }
      };
      
      reader.onerror = () => {
        reject(new Error("Failed to read file"));
      };
      
      reader.readAsArrayBuffer(file);
    });
  },

  // Validate attendance data
  validateAttendanceData(data, requiredFields = ["E. Code"]) {
    const errors = [];
    const warnings = [];
    
    data.forEach((row, index) => {
      const rowNum = index + 2;
      
      // Check required fields
      requiredFields.forEach(field => {
        if (!row[field] || String(row[field]).trim() === "") {
          errors.push(`Row ${rowNum}: Missing required field "${field}"`);
        }
      });
      
      // Validate employee ID
      if (row["E. Code"]) {
        const empId = String(row["E. Code"]).trim();
        if (empId.length < 3) {
          warnings.push(`Row ${rowNum}: Employee ID "${empId}" seems too short`);
        }
      }
      
      // Validate time formats
      ["InTime(00:00)", "OutTime(00:00)"].forEach(timeField => {
        if (row[timeField] && row[timeField] !== "") {
          const time = String(row[timeField]);
          if (!/^\d{1,2}:\d{2}$/.test(time) && isNaN(parseFloat(time))) {
            warnings.push(`Row ${rowNum}: Invalid time format in "${timeField}". Use HH:mm or decimal hours`);
          }
        }
      });
      
      // Validate status
      if (row["Status(Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present , WeeklyOff Present )"]) {
        const validStatuses = [
          "Absent", "WeeklyOff", "Present", 
          "Absent (No OutPunch)", "½Present", "WeeklyOff Present",
          "Leave", "WFH", "Holiday"
        ];
        const status = String(row["Status(Absent, WeeklyOff, Present, Absent (No OutPunch), ½Present , WeeklyOff Present )"]).trim();
        
        if (!validStatuses.some(valid => status.toLowerCase().includes(valid.toLowerCase()))) {
          warnings.push(`Row ${rowNum}: Unusual status "${status}". Expected one of: ${validStatuses.join(", ")}`);
        }
      }
    });
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      totalRows: data.length,
      validRows: data.length - errors.length,
    };
  },

  // Export summary data to Excel
  exportSummaryToExcel(data, month, year) {
    const headers = [
      "Employee ID",
      "Name",
      "Department",
      "Role",
      "Working Days",
      "Present Days",
      "Absent Days",
      "Leave Days",
      "WFH Days",
      "Total Hours",
      "OT Hours",
      "Attendance Rate %",
      "Utilization Rate %",
      "Late Arrivals",
      "Early Departures",
      "Status"
    ];

    const excelData = data.map(emp => ({
      "Employee ID": emp.employeeId,
      "Name": emp.name,
      "Department": emp.department || "-",
      "Role": emp.role || "-",
      "Working Days": emp.summary.workingDays,
      "Present Days": emp.summary.presentDays,
      "Absent Days": emp.summary.absentDays,
      "Leave Days": emp.summary.leaveDays,
      "WFH Days": emp.summary.wfhDays,
      "Total Hours": emp.summary.totalHours.toFixed(2),
      "OT Hours": emp.summary.totalOT.toFixed(2),
      "Attendance Rate %": emp.summary.attendanceRate,
      "Utilization Rate %": emp.summary.utilizationRate,
      "Late Arrivals": emp.summary.lateArrivals,
      "Early Departures": emp.summary.earlyDepartures,
      "Status": emp.summary.attendanceRate >= 90 ? "Excellent" : 
                emp.summary.attendanceRate >= 75 ? "Good" : "Needs Attention"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    
    const colWidths = [
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 },
      { wch: 12 },
      { wch: 15 },
      { wch: 15 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Attendance Summary");

    // Add summary sheet
    const summaryStats = [
      ["ATTENDANCE SUMMARY REPORT"],
      [`Month: ${dateUtils.getMonthName(month)} ${year}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [""],
      ["Overall Statistics", "Value"],
      ["Total Employees", data.length],
      ["Average Attendance Rate", `${(data.reduce((sum, emp) => sum + emp.summary.attendanceRate, 0) / data.length).toFixed(2)}%`],
      ["Total Working Hours", `${data.reduce((sum, emp) => sum + emp.summary.totalHours, 0).toFixed(2)}`],
      ["Total OT Hours", `${data.reduce((sum, emp) => sum + emp.summary.totalOT, 0).toFixed(2)}`],
      ["Employees with Excellent Attendance (>90%)", data.filter(emp => emp.summary.attendanceRate >= 90).length],
      ["Employees Needing Attention (<75%)", data.filter(emp => emp.summary.attendanceRate < 75).length]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryStats);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary Stats");

    return workbook;
  },

  // Export calendar data to Excel
  exportCalendarToExcel(calendarData, employee, month, year) {
    const headers = [
      "Date",
      "Day",
      "Status",
      "In Time",
      "Out Time",
      "Work Hours",
      "OT Hours",
      "Remarks",
      "Holiday",
      "Weekend"
    ];

    const excelData = calendarData.map(day => ({
      "Date": day.date,
      "Day": day.dayName,
      "Status": day.status,
      "In Time": day.attendance?.inTime || "-",
      "Out Time": day.attendance?.outTime || "-",
      "Work Hours": day.attendance?.workHours?.toFixed(2) || "0.00",
      "OT Hours": day.attendance?.otHours?.toFixed(2) || "0.00",
      "Remarks": day.attendance?.remarks || "-",
      "Holiday": day.isHoliday ? day.holidayName : "No",
      "Weekend": day.isWeekend ? "Yes" : "No"
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    
    const colWidths = [
      { wch: 12 },
      { wch: 10 },
      { wch: 15 },
      { wch: 10 },
      { wch: 10 },
      { wch: 12 },
      { wch: 12 },
      { wch: 20 },
      { wch: 15 },
      { wch: 10 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Calendar");

    // Add employee info sheet
    const employeeInfo = [
      ["EMPLOYEE ATTENDANCE CALENDAR"],
      [`Employee: ${employee.name}`],
      [`Employee ID: ${employee.employeeId}`],
      [`Department: ${employee.department || "-"}`],
      [`Role: ${employee.role || "-"}`],
      [`Month: ${dateUtils.getMonthName(month)} ${year}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [""],
      ["Summary", "Value"],
      ["Working Days", calendarData.filter(d => !d.isWeekend && !d.isHoliday).length],
      ["Present Days", calendarData.filter(d => d.status.toLowerCase().includes('present')).length],
      ["Absent Days", calendarData.filter(d => d.status.toLowerCase().includes('absent')).length],
      ["Leave Days", calendarData.filter(d => d.status.toLowerCase().includes('leave')).length],
      ["WFH Days", calendarData.filter(d => d.status.toLowerCase().includes('wfh')).length],
      ["Total Work Hours", calendarData.reduce((sum, d) => sum + (d.attendance?.workHours || 0), 0).toFixed(2)],
      ["Total OT Hours", calendarData.reduce((sum, d) => sum + (d.attendance?.otHours || 0), 0).toFixed(2)]
    ];

    const infoSheet = XLSX.utils.aoa_to_sheet(employeeInfo);
    XLSX.utils.book_append_sheet(workbook, infoSheet, "Employee Info");

    return workbook;
  }
};

export const HRMS = {
  // Employee Management
  listEmployees(params = {}) {
    return api.get("/api/hrms/employees", { params });
  },
  upsertEmployee(payload) {
    return api.post("/api/hrms/employees", payload);
  },
  updateEmployee(employeeId, payload) {
    return api.put(`/api/hrms/employees/${employeeId}`, payload);
  },
  deleteEmployee(employeeId) {
    return api.delete(`/api/hrms/employees/${employeeId}`);
  },
  getEmployee(employeeId) {
    return api.get(`/api/hrms/employees/${employeeId}`);
  },
  searchUsers(q) {
    return api.get("/api/hrms/users/search", { params: { q } });
  },

  // Attendance - Individual View
  uploadAttendance(formData) {
    return api.post("/api/attendance/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  getEmployeeAttendance(employeeId, params = {}) {
    return api.get(`/api/attendance/employee/${employeeId}`, { params });
  },
  exportAttendance(params = {}) {
    return api.get("/api/attendance/export", {
      params,
      responseType: "blob",
    });
  },
  getAttendanceSummary(params = {}) {
    return api.get("/api/attendance/summary", { params });
  },
  manualAttendanceEntry(data) {
    return api.post("/api/attendance/manual", data);
  },

  // Attendance - Summary & Calendar View
  getAttendanceSummaryAll(params = {}) {
    return api.get("/api/attendance/summary/all", { params });
  },
  getEmployeeCalendar(employeeId, params = {}) {
    return api.get(`/api/attendance/employee/${employeeId}/calendar`, { params });
  },
  updateAttendanceStatus(data) {
    return api.post("/api/attendance/update", data);
  },
  bulkUpdateAttendance(data) {
    return api.post("/api/attendance/bulk-update", data);
  },

  // Leave Management
  listLeaves(params = {}) {
    return api.get("/api/hrms/leaves", { params });
  },
  createLeave(data) {
    return api.post("/api/hrms/leaves", data);
  },
  updateLeaveStatus(id, status) {
    return api.patch(`/api/hrms/leaves/${id}/status`, { status });
  },

  // WFH Management
  listWFH(params = {}) {
    return api.get("/api/hrms/wfh", { params });
  },
  createWFH(data) {
    return api.post("/api/hrms/wfh", data);
  },

  // Restricted Holidays
  listRestrictedHolidays() {
    return api.get("/api/hrms/holidays/restricted");
  },
  listRHRequests(params = {}) {
    return api.get("/api/hrms/rh/requests", { params });
  },
  createRHRequest(data) {
    return api.post("/api/hrms/self/rh", data);
  },

  // Profile Management
  getProfile() {
    return api.get("/api/me/profile");
  },
  updateProfile(data) {
    return api.put("/api/me/profile", data);
  },

  // Salary Management
  calculateSalary(params = {}) {
    return api.get("/api/hrms/salary/calc", { params });
  },
  finalizeSalary(data) {
    return api.post("/api/hrms/salary/finalize", data);
  },

  // Bulk Operations
  importAttendanceBulk(data) {
    return api.post("/api/hrms/attendance/bulk", data);
  },
  importAttendanceFile(formData) {
    return api.post("/api/hrms/attendance/import-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Helper Methods
  downloadFile(blob, filename) {
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", filename);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  downloadExcelFile(workbook, filename) {
    XLSX.writeFile(workbook, filename);
  },

  handleError(error) {
    if (error.response) {
      return {
        status: error.response.status,
        message: error.response.data?.message || "An error occurred",
        data: error.response.data,
      };
    } else if (error.request) {
      return {
        status: 0,
        message: "No response from server. Please check your connection.",
      };
    } else {
      return {
        status: -1,
        message: error.message || "An error occurred",
      };
    }
  },

  // Quick Export Methods
  exportSummaryExcel(data, month, year, filename = null) {
    const workbook = excelUtils.exportSummaryToExcel(data, month, year);
    const defaultFilename = `Attendance_Summary_${dateUtils.getMonthName(month)}_${year}.xlsx`;
    excelUtils.downloadTemplate(filename || defaultFilename);
  },

  exportCalendarExcel(calendarData, employee, month, year, filename = null) {
    const workbook = excelUtils.exportCalendarToExcel(calendarData, employee, month, year);
    const defaultFilename = `Attendance_Calendar_${employee.name}_${dateUtils.getMonthName(month)}_${year}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  }
};

export { api as hrmsApi };
export default HRMS;