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
  },
  
  formatCurrency(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount || 0);
  },
  
  formatCurrencyDecimal(amount) {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(amount || 0);
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
  },

  // Export salary records to Excel (Enhanced for new requirements)
  exportSalaryToExcel(records, month, year) {
    const headers = [
      "S.No",
      "Employee ID",
      "Employee Name",
      "Probation",
      "Days in Month",
      "Working Days",
      "Days Present",
      "Total Leaves",
      "Sick Leaves Used",
      "Earned Leaves Used",
      "Excess Leaves",
      "Days to Pay",
      "Expected Hours",
      "Hours Worked",
      "Hours Shortfall",
      "99-Hour Deduction",
      "Emergency WFH Days",
      "Casual WFH Days",
      "WFH Deduction",
      "Missed Punches",
      "Missed Punch Penalty",
      "Weekend Deduction",
      "Salary Offered",
      "Per Day Salary",
      "Gross Salary",
      "PF Deduction",
      "ESI Deduction",
      "Professional Tax",
      "Total Deductions",
      "Net Payable",
      "Status"
    ];

    const excelData = records.map((r, i) => ({
      "S.No": i + 1,
      "Employee ID": r.employeeId,
      "Employee Name": r.employeeName,
      "Probation": r.isProbationary ? "Yes" : "No",
      "Days in Month": r.daysInMonth,
      "Working Days": r.totalWorkingDays,
      "Days Present": r.daysPresent,
      "Total Leaves": r.totalLeavesTaken,
      "Sick Leaves Used": r.sickLeavesUsed || 0,
      "Earned Leaves Used": r.earnedLeavesUsed || 0,
      "Excess Leaves": r.excessLeaves || 0,
      "Days to Pay": r.daysToBePaidFor,
      "Expected Hours": r.totalExpectedHours,
      "Hours Worked": r.totalHoursWorked?.toFixed(2) || "0.00",
      "Hours Shortfall": r.hoursShortfall?.toFixed(2) || "0.00",
      "99-Hour Deduction": r.deductions?.hourlyShortfallDeduction || 0,
      "Emergency WFH Days": r.emergencyWFHDays || 0,
      "Casual WFH Days": r.casualWFHDays || 0,
      "WFH Deduction": r.deductions?.totalWFHDeduction || 0,
      "Missed Punches": r.missedPunchCount || 0,
      "Missed Punch Penalty": r.deductions?.missedPunchPenalty || 0,
      "Weekend Deduction": r.deductions?.weekendExcessLeaveDeduction || 0,
      "Salary Offered": r.salaryOffered,
      "Per Day Salary": r.perDaySalary?.toFixed(2) || "0.00",
      "Gross Salary": r.grossSalary,
      "PF Deduction": r.deductions?.pfDeduction || 0,
      "ESI Deduction": r.deductions?.esiDeduction || 0,
      "Professional Tax": r.deductions?.professionalTax || 0,
      "Total Deductions": r.totalDeductions,
      "Net Payable": r.netPayable,
      "Status": r.status
    }));

    const worksheet = XLSX.utils.json_to_sheet(excelData, { header: headers });
    
    const colWidths = headers.map(h => ({ wch: Math.max(h.length, 10) }));
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Salary Records");

    // Add summary sheet
    const totalGross = records.reduce((sum, r) => sum + r.grossSalary, 0);
    const totalDeductions = records.reduce((sum, r) => sum + r.totalDeductions, 0);
    const totalNet = records.reduce((sum, r) => sum + r.netPayable, 0);
    const total99HourDeductions = records.reduce((sum, r) => sum + (r.deductions?.hourlyShortfallDeduction || 0), 0);
    const totalWFHDeductions = records.reduce((sum, r) => sum + (r.deductions?.totalWFHDeduction || 0), 0);
    const totalPenalties = records.reduce((sum, r) => sum + (r.deductions?.missedPunchPenalty || 0), 0);

    const summaryStats = [
      ["SALARY REPORT - ACE PRINT PACK / ACE GIFTING SOLUTIONS"],
      [`Month: ${dateUtils.getMonthName(month)} ${year}`],
      [`Generated: ${new Date().toLocaleDateString()}`],
      [""],
      ["Overall Summary", "Value"],
      ["Total Employees", records.length],
      ["Probation Employees", records.filter(r => r.isProbationary).length],
      ["Regular Employees", records.filter(r => !r.isProbationary).length],
      ["Total Gross Salary", dateUtils.formatCurrency(totalGross)],
      ["Total 99-Hour Deductions", dateUtils.formatCurrency(total99HourDeductions)],
      ["Total WFH Deductions", dateUtils.formatCurrency(totalWFHDeductions)],
      ["Total Penalties", dateUtils.formatCurrency(totalPenalties)],
      ["Total Deductions", dateUtils.formatCurrency(totalDeductions)],
      ["Total Net Payable", dateUtils.formatCurrency(totalNet)],
      [""],
      ["Deductions Breakdown", "Amount"],
      ["99-Hour Rule Deductions", dateUtils.formatCurrency(total99HourDeductions)],
      ["WFH Deductions", dateUtils.formatCurrency(totalWFHDeductions)],
      ["Missed Punch Penalties", dateUtils.formatCurrency(totalPenalties)],
      ["PF Deductions", dateUtils.formatCurrency(records.reduce((sum, r) => sum + (r.deductions?.pfDeduction || 0), 0))],
      ["PT Deductions", dateUtils.formatCurrency(records.reduce((sum, r) => sum + (r.deductions?.professionalTax || 0), 0))],
      ["ESI Deductions", dateUtils.formatCurrency(records.reduce((sum, r) => sum + (r.deductions?.esiDeduction || 0), 0))],
      ["TDS Deductions", dateUtils.formatCurrency(records.reduce((sum, r) => sum + (r.deductions?.tdsDeduction || 0), 0))],
      [""],
      ["Status Breakdown", "Count"],
      ["Calculated", records.filter(r => r.status === 'calculated').length],
      ["Approved", records.filter(r => r.status === 'approved').length],
      ["Paid", records.filter(r => r.status === 'paid').length]
    ];

    const summarySheet = XLSX.utils.aoa_to_sheet(summaryStats);
    XLSX.utils.book_append_sheet(workbook, summarySheet, "Summary");

    return workbook;
  },

  // Generate payslip data for Excel (Enhanced)
  generatePayslipExcel(record) {
    const payslipData = [
      ["PAYSLIP - ACE PRINT PACK / ACE GIFTING SOLUTIONS"],
      [`Month: ${dateUtils.getMonthName(record.month)} ${record.year}`],
      [""],
      ["Employee Details", ""],
      ["Employee ID", record.employeeId],
      ["Employee Name", record.employeeName],
      ["Status", record.isProbationary ? "Probationary" : "Regular"],
      [""],
      ["Attendance Summary", ""],
      ["Days in Month", record.daysInMonth],
      ["Working Days", record.totalWorkingDays],
      ["Days Present", record.daysPresent],
      ["Total Leaves", record.totalLeavesTaken],
      ["Sick Leaves Used", record.sickLeavesUsed || 0],
      ["Earned Leaves Used", record.earnedLeavesUsed || 0],
      ["Excess Leaves", record.excessLeaves || 0],
      ["Days Paid For", record.daysToBePaidFor],
      [""],
      ["Hours Summary", ""],
      ["Expected Hours", record.totalExpectedHours],
      ["Hours Worked", record.totalHoursWorked?.toFixed(2) || "0.00"],
      ["Hours Shortfall", record.hoursShortfall?.toFixed(2) || "0.00"],
      ["Overtime Hours", record.overtimeHours?.toFixed(2) || "0.00"],
      [""],
      ["99-Hour Rule Details", ""],
      ...(record.biWeeklyCalculations || []).map((period, i) => [
        `Period ${i + 1} (${dateUtils.formatIndianDate(period.startDate)} - ${dateUtils.formatIndianDate(period.endDate)})`,
        `Expected: ${period.expectedHours}h, Worked: ${period.actualHours}h, Shortfall: ${period.shortfallHours}h, Deduction: ${dateUtils.formatCurrency(period.deduction)}`
      ]),
      [""],
      ["WFH Details", ""],
      ["Emergency WFH Days", record.emergencyWFHDays || 0],
      ["Casual WFH Days", record.casualWFHDays || 0],
      ["Total WFH Deduction", dateUtils.formatCurrency(record.deductions?.totalWFHDeduction || 0)],
      [""],
      ["Penalties", ""],
      ["Missed Punches", record.missedPunchCount || 0],
      ["Missed Punch Penalty", dateUtils.formatCurrency(record.deductions?.missedPunchPenalty || 0)],
      [""],
      ["Weekend Deductions (for excess leaves)", ""],
      ["Excess Leaves", record.excessLeaves || 0],
      ["Weekend Deduction", dateUtils.formatCurrency(record.deductions?.weekendExcessLeaveDeduction || 0)],
      [""],
      ["Earnings", "Amount (₹)"],
      ["Salary Offered", record.salaryOffered],
      ["Per Day Salary", record.perDaySalary?.toFixed(2) || "0.00"],
      ["Gross Salary", record.grossSalary],
      ["Incentive", record.additions?.incentive || 0],
      ["Bonus", record.additions?.bonus || 0],
      ["Attendance Bonus", record.additions?.attendanceBonus || 0],
      ["Performance Bonus", record.additions?.performanceBonus || 0],
      ["Other Additions", record.additions?.otherAdditions || 0],
      ["Total Earnings", record.grossSalary + (record.totalAdditions || 0)],
      [""],
      ["Deductions", "Amount (₹)"],
      ["99-Hour Shortfall Deduction", record.deductions?.hourlyShortfallDeduction || 0],
      ["Weekend Excess Leave Deduction", record.deductions?.weekendExcessLeaveDeduction || 0],
      ["WFH Deduction", record.deductions?.totalWFHDeduction || 0],
      ["Missed Punch Penalty", record.deductions?.missedPunchPenalty || 0],
      ["PF", record.deductions?.pfDeduction || 0],
      ["ESI", record.deductions?.esiDeduction || 0],
      ["Professional Tax", record.deductions?.professionalTax || 0],
      ["TDS", record.deductions?.tdsDeduction || 0],
      ["Damages", record.deductions?.damages || 0],
      ["Advance Recovery", record.deductions?.advanceSalaryRecovery || 0],
      ["Other Deductions", record.deductions?.otherDeductions || 0],
      ["Total Deductions", record.totalDeductions],
      [""],
      ["NET PAYABLE", dateUtils.formatCurrency(record.netPayable)],
      ["", ""],
      ["", `Rs. ${record.netPayable?.toLocaleString('en-IN') || 0}`],
      [""],
      [`Generated on: ${new Date().toLocaleDateString()}`],
      ["", "Authorized Signatory"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(payslipData);
    worksheet['!cols'] = [{ wch: 35 }, { wch: 25 }];

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Payslip");

    return workbook;
  }
};

export const HRMS = {
  // ─────────────────────────────────────────────────────────────────────────
  // EMPLOYEE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE - Individual View
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // ATTENDANCE - Summary & Calendar View
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // LEAVE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  listLeaves(params = {}) {
    return api.get("/api/hrms/leaves", { params });
  },
  createLeave(data) {
    return api.post("/api/hrms/leaves", data);
  },
  updateLeaveStatus(id, status, remarks = '') {
    return api.patch(`/api/hrms/leaves/${id}/status`, { status, remarks });
  },
  cancelLeave(id) {
    return api.post(`/api/hrms/leaves/${id}/cancel`);
  },
  getLeaveBalance(employeeId) {
    return api.get(`/api/hrms/leaves/balance/${employeeId}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // WFH MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  listWFH(params = {}) {
    return api.get("/api/hrms/wfh", { params });
  },
  createWFH(data) {
    return api.post("/api/hrms/wfh", data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HOLIDAY MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  listHolidays(params = {}) {
    return api.get("/api/admin/holidays", { params });
  },
  createHoliday(data) {
    return api.post("/api/admin/holidays", data);
  },
  updateHoliday(id, data) {
    return api.put(`/api/admin/holidays/${id}`, data);
  },
  deleteHoliday(id) {
    return api.delete(`/api/admin/holidays/${id}`);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // RESTRICTED HOLIDAYS
  // ─────────────────────────────────────────────────────────────────────────
  listRestrictedHolidays() {
    return api.get("/api/hrms/holidays/restricted");
  },
  listRHRequests(params = {}) {
    return api.get("/api/hrms/rh/requests", { params });
  },
  createRHRequest(data) {
    return api.post("/api/hrms/self/rh", data);
  },
  updateRHRequestStatus(id, status) {
    return api.patch(`/api/hrms/rh/requests/${id}/status`, { status });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALARY CONFIGURATION (UPDATED FOR NEW REQUIREMENTS)
  // ─────────────────────────────────────────────────────────────────────────
  getSalaryConfig(employeeId) {
    return api.get(`/api/salary/config/${employeeId}`);
  },
  saveSalaryConfig(config) {
    return api.post("/api/salary/config", config);
  },
  getAllSalaryConfigs() {
    return api.get("/api/salary/configs");
  },

  // ─────────────────────────────────────────────────────────────────────────
  // COMPANY CONFIGURATION (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  getCompanyConfig() {
    return api.get("/api/configuration/company");
  },
  updateCompanyConfig(config) {
    return api.put("/api/configuration/company", config);
  },
  applyCompanyConfig(data) {
    return api.post("/api/salary/apply-company-config", data);
  },
  getConfigTemplates() {
    return api.get("/api/configuration/templates");
  },
  applyConfigTemplate(data) {
    return api.post("/api/configuration/apply-template", data);
  },
  exportConfigurations() {
    return api.get("/api/configuration/export", { responseType: "blob" });
  },
  importConfigurations(data) {
    return api.post("/api/configuration/import", data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALARY CONFIGURATION TEMPLATES (NEW)
  // ─────────────────────────────────────────────────────────────────────────
  getSalaryConfigTemplates() {
    return api.get("/api/salary/config-templates");
  },
  applySalaryTemplate(data) {
    return api.post("/api/salary/apply-template", data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALARY CALCULATION (ENHANCED FOR NEW REQUIREMENTS)
  // ─────────────────────────────────────────────────────────────────────────
  calculateEmployeeSalary(employeeId, data) {
    return api.post(`/api/salary/calculate/${employeeId}`, data);
  },
  calculateAllSalaries(data) {
    return api.post("/api/salary/calculate-all", data);
  },
  previewSalary(employeeId, data) {
    return api.post(`/api/salary/preview/${employeeId}`, data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // SALARY RECORDS (ENHANCED FOR NEW REQUIREMENTS)
  // ─────────────────────────────────────────────────────────────────────────
  getSalaryRecords(params = {}) {
    return api.get("/api/salary/records", { params });
  },
  getSalaryRecord(employeeId, month, year) {
    return api.get(`/api/salary/record/${employeeId}/${month}/${year}`);
  },
  updateSalaryRecord(id, data) {
    return api.put(`/api/salary/record/${id}`, data);
  },
  addSalaryAdjustment(id, adjustment) {
    return api.post(`/api/salary/record/${id}/adjustment`, adjustment);
  },
  approveSalaryRecord(id) {
    return api.post(`/api/salary/record/${id}/approve`);
  },
  markSalaryPaid(id, data = {}) {
    return api.post(`/api/salary/record/${id}/mark-paid`, data);
  },
  exportSalaryRecords(params = {}) {
    return api.get("/api/salary/export", {
      params,
      responseType: "blob",
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // PROFILE MANAGEMENT
  // ─────────────────────────────────────────────────────────────────────────
  getProfile() {
    return api.get("/api/me/profile");
  },
  updateProfile(data) {
    return api.put("/api/me/profile", data);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // BULK OPERATIONS
  // ─────────────────────────────────────────────────────────────────────────
  importAttendanceBulk(data) {
    return api.post("/api/hrms/attendance/bulk", data);
  },
  importAttendanceFile(formData) {
    return api.post("/api/hrms/attendance/import-file", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // ─────────────────────────────────────────────────────────────────────────
  // HELPER METHODS
  // ─────────────────────────────────────────────────────────────────────────
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

  // ─────────────────────────────────────────────────────────────────────────
  // QUICK EXPORT METHODS
  // ─────────────────────────────────────────────────────────────────────────
  exportSummaryExcel(data, month, year, filename = null) {
    const workbook = excelUtils.exportSummaryToExcel(data, month, year);
    const defaultFilename = `Attendance_Summary_${dateUtils.getMonthName(month)}_${year}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  },

  exportCalendarExcel(calendarData, employee, month, year, filename = null) {
    const workbook = excelUtils.exportCalendarToExcel(calendarData, employee, month, year);
    const defaultFilename = `Attendance_Calendar_${employee.name}_${dateUtils.getMonthName(month)}_${year}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  },

  exportSalaryExcel(records, month, year, filename = null) {
    const workbook = excelUtils.exportSalaryToExcel(records, month, year);
    const defaultFilename = `Salary_Report_${dateUtils.getMonthName(month)}_${year}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  },

  downloadPayslip(record, filename = null) {
    const workbook = excelUtils.generatePayslipExcel(record);
    const defaultFilename = `Payslip_${record.employeeName}_${dateUtils.getMonthName(record.month)}_${record.year}.xlsx`;
    XLSX.writeFile(workbook, filename || defaultFilename);
  },

  // ─────────────────────────────────────────────────────────────────────────
  // NEW: CONFIGURATION UTILITY METHODS
  // ─────────────────────────────────────────────────────────────────────────
  
  /**
   * Generate default company configuration
   */
  getDefaultCompanyConfig() {
    return {
      companyName: "Ace Print Pack / Ace Gifting Solutions",
      attendanceSettings: {
        dailyWorkHours: 9,
        standardStartTime: "10:00",
        standardEndTime: "19:00",
        officeHoursStart: "09:00",
        officeHoursEnd: "20:00"
      },
      biWeeklyRule: {
        targetHours: 99,
        gracePeriodHours: 2,
        deductionPerHour: 500
      },
      saturdaysPattern: "1st_3rd",
      leavePolicy: {
        sickLeave: {
          perMonth: 1,
          nonCumulative: true,
          cannotBeBundled: true
        },
        earnedLeave: {
          per20WorkingDays: 1.25,
          maxCarryForward: 30,
          encashAtYearEnd: true,
          requires7DaysNotice: true,
          cannotBeBundled: true
        },
        specialLeaves: {
          deathInFamily: 10,
          selfMarriage: 2
        },
        holidays: {
          compulsoryPerYear: 10,
          restrictedPerYear: 2,
          canConvertToEL: true
        },
        weekendDeductionTiers: [
          { minExcessDays: 0, maxExcessDays: 2, sundaysDeducted: 0, description: "No weekend deduction" },
          { minExcessDays: 3, maxExcessDays: 4, sundaysDeducted: 1, description: "1 Sunday deduction" },
          { minExcessDays: 5, maxExcessDays: 6, sundaysDeducted: 2, description: "2 Sundays deduction" },
          { minExcessDays: 7, maxExcessDays: 999, sundaysDeducted: 4, description: "All Sundays (LOP for weekends)" }
        ]
      },
      wfhPolicy: {
        emergencyWFH: {
          salaryPercentage: 75,
          deductionPercentage: 25
        },
        casualWFH: {
          salaryPercentage: 50,
          deductionPercentage: 50
        },
        requiresPermission: true
      },
      disciplinePolicy: {
        missedPunchPenalty: 250,
        ncncPenalty: {
          maxInstancesPerQuarter: 2,
          action: "termination"
        },
        overtimePolicy: {
          noMonetaryCompensation: true,
          forAppraisalOnly: true
        }
      },
      eligibilityPolicy: {
        probationPeriodDays: 30,
        benefitsStartAfterProbation: true,
        firstMonthPayBasis: "per_day_present"
      },
      incentives: {
        attendanceBonus: {
          amount: 1000,
          consecutiveMonths: 4,
          requires100Percent: true
        },
        departmentWeightage: [
          { department: "Sales", revenueWeightage: 80, attendanceWeightage: 20 },
          { department: "Operations", revenueWeightage: 30, attendanceWeightage: 70 },
          { department: "Marketing", revenueWeightage: 60, attendanceWeightage: 40 },
          { department: "Finance", revenueWeightage: 40, attendanceWeightage: 60 },
          { department: "HR", revenueWeightage: 30, attendanceWeightage: 70 },
          { department: "IT", revenueWeightage: 40, attendanceWeightage: 60 }
        ]
      },
      defaultSalaryBreakdown: {
        basicPercentage: 45,
        hraPercentage: 22.5,
        conveyancePercentage: 12.5,
        medicalPercentage: 0,
        specialPercentage: 15,
        otherPercentage: 5
      },
      statutoryDefaults: {
        pfPercentage: 12,
        esiPercentage: 0.75,
        esiSalaryThreshold: 21000,
        professionalTax: 200
      },
      financialYear: {
        startMonth: 4,
        startDay: 1,
        endMonth: 3,
        endDay: 31
      },
      version: "2026.1",
      policyDocumentPath: ""
    };
  },

  /**
   * Calculate 99-hour rule deduction
   */
  calculate99HourDeduction(shortfallHours, gracePeriodHours = 2, deductionRate = 500) {
    if (shortfallHours <= gracePeriodHours) return 0;
    return (shortfallHours - gracePeriodHours) * deductionRate;
  },

  /**
   * Calculate WFH deduction
   */
  calculateWFHDeduction(emergencyWFHDays, casualWFHDays, dailyRate, emergencyDeductionRate = 0.25, casualDeductionRate = 0.50) {
    const emergencyDeduction = emergencyWFHDays * dailyRate * emergencyDeductionRate;
    const casualDeduction = casualWFHDays * dailyRate * casualDeductionRate;
    return emergencyDeduction + casualDeduction;
  },

  /**
   * Calculate weekend deduction based on excess leaves
   */
  calculateWeekendDeduction(excessDays, weekendTiers, dailyRate, sundaysInMonth) {
    if (!weekendTiers || weekendTiers.length === 0) return 0;
    
    for (const tier of weekendTiers) {
      if (excessDays >= tier.minExcessDays && excessDays <= tier.maxExcessDays) {
        const sundaysToDeduct = Math.min(tier.sundaysDeducted, sundaysInMonth);
        return sundaysToDeduct * dailyRate;
      }
    }
    return 0;
  },

  /**
   * Check if employee is in probation
   */
  isInProbation(joiningDate, probationPeriodDays = 30) {
    if (!joiningDate) return true;
    
    const probationEnd = new Date(joiningDate);
    probationEnd.setDate(probationEnd.getDate() + probationPeriodDays);
    
    return new Date() < probationEnd;
  },

  /**
   * Format salary breakdown for display
   */
  formatSalaryBreakdown(breakdown, grossSalary) {
    if (!breakdown) return null;
    
    const formatted = {};
    const percentages = {
      basic: breakdown.basicPercentage || 0,
      hra: breakdown.hraPercentage || 0,
      conveyance: breakdown.conveyancePercentage || 0,
      medical: breakdown.medicalPercentage || 0,
      special: breakdown.specialPercentage || 0,
      other: breakdown.otherPercentage || 0
    };

    Object.keys(percentages).forEach(key => {
      formatted[key] = {
        percentage: percentages[key],
        amount: Math.round(grossSalary * (percentages[key] / 100))
      };
    });

    return formatted;
  },

  /**
   * Generate configuration export file
   */
  exportConfigurationToExcel(configData, filename = "Company_Configuration.xlsx") {
    const headers = [
      "Setting Category",
      "Setting Name",
      "Value",
      "Description"
    ];

    const excelData = [
      // Attendance Settings
      ["Attendance", "Daily Work Hours", configData.attendanceSettings?.dailyWorkHours, "Standard work hours per day"],
      ["Attendance", "Standard Start Time", configData.attendanceSettings?.standardStartTime, "Office start time"],
      ["Attendance", "Standard End Time", configData.attendanceSettings?.standardEndTime, "Office end time"],
      
      // 99-Hour Rule
      ["99-Hour Rule", "Target Hours", configData.biWeeklyRule?.targetHours, "Target hours per 2 weeks"],
      ["99-Hour Rule", "Grace Period Hours", configData.biWeeklyRule?.gracePeriodHours, "No deduction grace period"],
      ["99-Hour Rule", "Deduction per Hour", configData.biWeeklyRule?.deductionPerHour, "Deduction rate per hour"],
      
      // Saturdays
      ["Weekends", "Saturdays Off Pattern", configData.saturdaysPattern, "Which Saturdays are off"],
      
      // Leave Policy
      ["Leave Policy", "Sick Leave per Month", configData.leavePolicy?.sickLeave?.perMonth, "Monthly sick leave entitlement"],
      ["Leave Policy", "Earned Leave per 20 Days", configData.leavePolicy?.earnedLeave?.per20WorkingDays, "EL accrual rate"],
      ["Leave Policy", "Max Carry Forward EL", configData.leavePolicy?.earnedLeave?.maxCarryForward, "Max EL carry forward"],
      
      // WFH Policy
      ["WFH Policy", "Emergency WFH Salary %", configData.wfhPolicy?.emergencyWFH?.salaryPercentage, "Salary % for emergency WFH"],
      ["WFH Policy", "Casual WFH Salary %", configData.wfhPolicy?.casualWFH?.salaryPercentage, "Salary % for casual WFH"],
      
      // Penalties
      ["Discipline", "Missed Punch Penalty", configData.disciplinePolicy?.missedPunchPenalty, "Penalty per missed punch"],
      
      // Probation
      ["Eligibility", "Probation Period Days", configData.eligibilityPolicy?.probationPeriodDays, "Probation period duration"],
      
      // Incentives
      ["Incentives", "Attendance Bonus Amount", configData.incentives?.attendanceBonus?.amount, "Attendance bonus amount"],
      ["Incentives", "Attendance Bonus Months", configData.incentives?.attendanceBonus?.consecutiveMonths, "Consecutive months for bonus"],
      
      // Statutory
      ["Statutory", "PF Percentage", configData.statutoryDefaults?.pfPercentage, "PF contribution percentage"],
      ["Statutory", "ESI Percentage", configData.statutoryDefaults?.esiPercentage, "ESI contribution percentage"],
      ["Statutory", "Professional Tax", configData.statutoryDefaults?.professionalTax, "Monthly professional tax"],
      
      // Financial Year
      ["Financial Year", "Start Month", configData.financialYear?.startMonth, "Financial year start month"],
      ["Financial Year", "End Month", configData.financialYear?.endMonth, "Financial year end month"]
    ];

    const worksheet = XLSX.utils.aoa_to_sheet([headers, ...excelData]);
    
    const colWidths = [
      { wch: 20 },
      { wch: 25 },
      { wch: 15 },
      { wch: 40 }
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Configuration");

    // Add weekend tiers sheet if exists
    if (configData.leavePolicy?.weekendDeductionTiers) {
      const tierHeaders = ["Min Excess Days", "Max Excess Days", "Sundays Deducted", "Description"];
      const tierData = configData.leavePolicy.weekendDeductionTiers.map(tier => [
        tier.minExcessDays,
        tier.maxExcessDays,
        tier.sundaysDeducted,
        tier.description
      ]);
      
      const tierSheet = XLSX.utils.aoa_to_sheet([tierHeaders, ...tierData]);
      XLSX.utils.book_append_sheet(workbook, tierSheet, "Weekend Tiers");
    }

    // Add department weightage sheet if exists
    if (configData.incentives?.departmentWeightage) {
      const weightageHeaders = ["Department", "Revenue Weightage %", "Attendance Weightage %"];
      const weightageData = configData.incentives.departmentWeightage.map(w => [
        w.department,
        w.revenueWeightage,
        w.attendanceWeightage
      ]);
      
      const weightageSheet = XLSX.utils.aoa_to_sheet([weightageHeaders, ...weightageData]);
      XLSX.utils.book_append_sheet(workbook, weightageSheet, "Department Weightage");
    }

    XLSX.writeFile(workbook, filename);
  }
};

export { api as hrmsApi };
export default HRMS;