// backend/utils/leaveNotifications.js
const sendMail = require("./sendMail");
const User = require("../models/User");
const Employee = require("../models/Employee");

/**
 * Send email notification when a leave is applied
 */
async function notifyLeaveApplication(leave) {
  try {
    // Get all super admins
    const superAdmins = await User.find({ isSuperAdmin: true }, "email name").lean();
    
    if (!superAdmins || superAdmins.length === 0) {
      console.log("No super admins found to notify");
      return;
    }

    // Get employee details
    let employeeName = leave.employeeId;
    let employeeDetails = "";
    
    try {
      const employee = await Employee.findOne(
        { "personal.employeeId": leave.employeeId },
        { "personal.name": 1, "org.role": 1, "org.department": 1 }
      ).lean();
      
      if (employee) {
        employeeName = employee.personal?.name || leave.employeeId;
        const role = employee.org?.role || "";
        const dept = employee.org?.department || "";
        
        if (role || dept) {
          employeeDetails = `
            <p style="margin: 10px 0; color: #666;">
              <strong>Role:</strong> ${role || "N/A"}<br/>
              <strong>Department:</strong> ${dept || "N/A"}
            </p>
          `;
        }
      }
    } catch (err) {
      console.error("Error fetching employee details:", err);
    }

    // Format dates
    const startDate = new Date(leave.startDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const endDate = new Date(leave.endDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Prepare email content
    const subject = `New Leave Application - ${employeeName}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #4CAF50; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid #4CAF50; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; margin-left: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
          .button { display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px; margin-top: 15px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">🗓️ New Leave Application</h2>
          </div>
          <div class="content">
            <p>Dear Admin,</p>
            <p>A new leave application has been submitted and requires your attention.</p>
            
            <div class="info-box">
              <h3 style="margin-top: 0; color: #4CAF50;">Employee Information</h3>
              <p style="margin: 5px 0;">
                <span class="label">Name:</span>
                <span class="value">${employeeName}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">Employee ID:</span>
                <span class="value">${leave.employeeId}</span>
              </p>
              ${employeeDetails}
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: #4CAF50;">Leave Details</h3>
              <p style="margin: 5px 0;">
                <span class="label">Leave Type:</span>
                <span class="value" style="text-transform: capitalize;">${leave.type}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">From:</span>
                <span class="value">${startDate}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">To:</span>
                <span class="value">${endDate}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">Duration:</span>
                <span class="value">${leave.days} day(s)</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">Status:</span>
                <span class="value" style="text-transform: capitalize; color: #ff9800; font-weight: bold;">${leave.status}</span>
              </p>
              ${leave.purpose ? `
                <p style="margin: 15px 0 5px 0;">
                  <span class="label">Purpose:</span>
                </p>
                <p style="margin: 5px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px;">
                  ${leave.purpose}
                </p>
              ` : ""}
            </div>

            <p style="margin-top: 20px;">
              Please review and approve/reject this leave application at your earliest convenience.
            </p>

            <div class="footer">
              <p>This is an automated notification from the HRMS System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
New Leave Application

Employee: ${employeeName} (${leave.employeeId})
Leave Type: ${leave.type}
From: ${startDate}
To: ${endDate}
Duration: ${leave.days} day(s)
Status: ${leave.status}
${leave.purpose ? `Purpose: ${leave.purpose}` : ""}

Please review and approve/reject this leave application.
    `;

    // Send email to all super admins
    const emailPromises = superAdmins.map(admin => 
      sendMail({
        to: admin.email,
        subject,
        text,
        html
      }).catch(err => {
        console.error(`Failed to send email to ${admin.email}:`, err.message);
      })
    );

    await Promise.all(emailPromises);
    console.log(`Leave notification sent to ${superAdmins.length} super admin(s)`);
    
  } catch (error) {
    console.error("Error sending leave notification:", error);
    // Don't throw - we don't want email failures to block leave creation
  }
}

/**
 * Send email notification when leave status changes
 */
async function notifyLeaveStatusChange(leave, changedByUser) {
  try {
    // Get employee email if they have a mapped user
    const employee = await Employee.findOne(
      { "personal.employeeId": leave.employeeId }
    ).populate("mappedUser", "email name").lean();

    if (!employee?.mappedUser?.email) {
      console.log("No email found for employee");
      return;
    }

    const employeeName = employee.personal?.name || leave.employeeId;
    const changedByName = changedByUser?.name || "Administrator";

    // Format dates
    const startDate = new Date(leave.startDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });
    
    const endDate = new Date(leave.endDate).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric"
    });

    // Status-specific styling
    const statusColors = {
      approved: { bg: "#4CAF50", text: "✅ Approved" },
      rejected: { bg: "#f44336", text: "❌ Rejected" },
      pending: { bg: "#ff9800", text: "⏳ Pending" },
      cancelled: { bg: "#9e9e9e", text: "🚫 Cancelled" }
    };

    const statusInfo = statusColors[leave.status] || { bg: "#2196F3", text: leave.status };

    const subject = `Leave Application ${leave.status.toUpperCase()} - ${startDate} to ${endDate}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: ${statusInfo.bg}; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9f9f9; padding: 20px; border: 1px solid #ddd; border-radius: 0 0 5px 5px; }
          .info-box { background-color: white; padding: 15px; margin: 15px 0; border-left: 4px solid ${statusInfo.bg}; }
          .status-badge { display: inline-block; padding: 8px 16px; background-color: ${statusInfo.bg}; color: white; border-radius: 20px; font-weight: bold; }
          .label { font-weight: bold; color: #555; }
          .value { color: #333; margin-left: 10px; }
          .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 style="margin: 0;">Leave Application Update</h2>
          </div>
          <div class="content">
            <p>Dear ${employeeName},</p>
            <p>Your leave application status has been updated.</p>
            
            <div style="text-align: center; margin: 20px 0;">
              <span class="status-badge">${statusInfo.text}</span>
            </div>

            <div class="info-box">
              <h3 style="margin-top: 0; color: ${statusInfo.bg};">Leave Details</h3>
              <p style="margin: 5px 0;">
                <span class="label">Leave Type:</span>
                <span class="value" style="text-transform: capitalize;">${leave.type}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">From:</span>
                <span class="value">${startDate}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">To:</span>
                <span class="value">${endDate}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">Duration:</span>
                <span class="value">${leave.days} day(s)</span>
              </p>
              ${leave.purpose ? `
                <p style="margin: 15px 0 5px 0;">
                  <span class="label">Purpose:</span>
                </p>
                <p style="margin: 5px 0; padding: 10px; background-color: #f5f5f5; border-radius: 3px;">
                  ${leave.purpose}
                </p>
              ` : ""}
            </div>

            <div class="info-box">
              <p style="margin: 5px 0;">
                <span class="label">Updated By:</span>
                <span class="value">${changedByName}</span>
              </p>
              <p style="margin: 5px 0;">
                <span class="label">Updated At:</span>
                <span class="value">${new Date().toLocaleString("en-GB")}</span>
              </p>
            </div>

            ${leave.status === 'approved' ? `
              <p style="margin-top: 20px; color: #4CAF50; font-weight: bold;">
                Your leave has been approved. Enjoy your time off!
              </p>
            ` : leave.status === 'rejected' ? `
              <p style="margin-top: 20px; color: #f44336;">
                Your leave application has been rejected. Please contact HR for more details.
              </p>
            ` : ""}

            <div class="footer">
              <p>This is an automated notification from the HRMS System.</p>
              <p>Please do not reply to this email.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `;

    const text = `
Leave Application ${leave.status.toUpperCase()}

Employee: ${employeeName}
Leave Type: ${leave.type}
From: ${startDate}
To: ${endDate}
Duration: ${leave.days} day(s)
Status: ${leave.status}

Updated By: ${changedByName}
Updated At: ${new Date().toLocaleString("en-GB")}

${leave.purpose ? `Purpose: ${leave.purpose}` : ""}
    `;

    await sendMail({
      to: employee.mappedUser.email,
      subject,
      text,
      html
    });

    console.log(`Status change notification sent to ${employee.mappedUser.email}`);
    
  } catch (error) {
    console.error("Error sending status change notification:", error);
  }
}

module.exports = {
  notifyLeaveApplication,
  notifyLeaveStatusChange
};