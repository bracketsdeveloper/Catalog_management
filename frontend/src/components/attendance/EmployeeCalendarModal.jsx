import React, { useState, useEffect } from 'react';
import { toast } from 'react-toastify';
import { HRMS } from '../../api/hrmsClient';

const EmployeeCalendarModal = ({ employee, month, year, onClose, onMonthChange, onDataUpdate }) => {
  const [calendarData, setCalendarData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [employeeInfo, setEmployeeInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentMonth, setCurrentMonth] = useState(month);
  const [currentYear, setCurrentYear] = useState(year);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  useEffect(() => {
    fetchCalendarData();
  }, [currentMonth, currentYear, employee.employeeId]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await HRMS.getEmployeeCalendar(employee.employeeId, {
        month: currentMonth,
        year: currentYear
      });
      
      setCalendarData(response.data.calendarData || []);
      setSummary(response.data.summary || null);
      setEmployeeInfo(response.data.employee || null);
    } catch (error) {
      console.error('Error fetching calendar:', error);
      toast.error('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  const handlePrevMonth = () => {
    let newMonth = currentMonth - 1;
    let newYear = currentYear;
    if (newMonth < 1) {
      newMonth = 12;
      newYear -= 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const handleNextMonth = () => {
    let newMonth = currentMonth + 1;
    let newYear = currentYear;
    if (newMonth > 12) {
      newMonth = 1;
      newYear += 1;
    }
    setCurrentMonth(newMonth);
    setCurrentYear(newYear);
    if (onMonthChange) onMonthChange(newMonth, newYear);
  };

  const getStatusBadge = (day) => {
    // Priority: Leave > Holiday > Attendance Status
    if (day.leaveInfo) {
      return (
        <div className="flex flex-col items-center">
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Leave
          </span>
          <span className="text-xs text-blue-600 mt-0.5">
            {day.leaveInfo.type}
          </span>
        </div>
      );
    }
    
    if (day.holidayInfo) {
      const isRestricted = day.holidayInfo.type === 'RESTRICTED';
      return (
        <div className="flex flex-col items-center">
          <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${
            isRestricted ? 'bg-purple-100 text-purple-800' : 'bg-indigo-100 text-indigo-800'
          }`}>
            {isRestricted ? 'RH' : 'Holiday'}
          </span>
          <span className={`text-xs mt-0.5 truncate max-w-full ${
            isRestricted ? 'text-purple-600' : 'text-indigo-600'
          }`} title={day.holidayInfo.name}>
            {day.holidayInfo.name.length > 10 
              ? day.holidayInfo.name.substring(0, 10) + '...' 
              : day.holidayInfo.name}
          </span>
        </div>
      );
    }
    
    if (day.attendance) {
      const status = day.attendance.status?.toLowerCase() || '';
      
      if (status.includes('present')) {
        return (
          <div className="flex flex-col items-center">
            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-800">
              Present
            </span>
            {day.attendance.isLateArrival && (
              <span className="text-xs text-orange-600 mt-0.5">
                Late {day.attendance.lateByMinutes}m
              </span>
            )}
          </div>
        );
      }
      
      if (status.includes('absent')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-800">
            Absent
          </span>
        );
      }
      
      if (status.includes('wfh')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 text-purple-800">
            WFH
          </span>
        );
      }
      
      if (status.includes('leave')) {
        return (
          <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
            Leave
          </span>
        );
      }
      
      return (
        <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${day.statusClass}`}>
          {day.status}
        </span>
      );
    }
    
    if (day.isWeekend) {
      return (
        <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-200 text-gray-600">
          Weekend
        </span>
      );
    }
    
    return (
      <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-500">
        Not Marked
      </span>
    );
  };

  const renderTimeInfo = (day) => {
    if (!day.attendance?.inTime && !day.attendance?.outTime) return null;
    
    return (
      <div className="text-xs text-gray-600 mt-1">
        {day.attendance.inTime && (
          <span className={day.attendance.isLateArrival ? 'text-orange-600' : ''}>
            In: {day.attendance.inTime}
          </span>
        )}
        {day.attendance.inTime && day.attendance.outTime && <span> | </span>}
        {day.attendance.outTime && (
          <span className={day.attendance.isEarlyDeparture ? 'text-orange-600' : ''}>
            Out: {day.attendance.outTime}
          </span>
        )}
      </div>
    );
  };

  const renderHoursInfo = (day) => {
    if (!day.attendance?.workHours) return null;
    
    return (
      <div className="text-xs text-gray-500 mt-0.5">
        {day.attendance.workHours.toFixed(1)}h
        {day.attendance.otHours > 0 && (
          <span className="text-green-600 ml-1">
            +{day.attendance.otHours.toFixed(1)}h OT
          </span>
        )}
      </div>
    );
  };

  // Group calendar data into weeks
  const getWeeks = () => {
    if (!calendarData.length) return [];
    
    const weeks = [];
    let currentWeek = [];
    
    // Add empty cells for days before the first of the month
    const firstDay = new Date(currentYear, currentMonth - 1, 1).getDay();
    for (let i = 0; i < firstDay; i++) {
      currentWeek.push(null);
    }
    
    calendarData.forEach((day) => {
      currentWeek.push(day);
      if (currentWeek.length === 7) {
        weeks.push(currentWeek);
        currentWeek = [];
      }
    });
    
    // Add empty cells for remaining days
    while (currentWeek.length > 0 && currentWeek.length < 7) {
      currentWeek.push(null);
    }
    if (currentWeek.length > 0) {
      weeks.push(currentWeek);
    }
    
    return weeks;
  };

  const weeks = getWeeks();

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {employeeInfo?.name || employee.name}
              </h2>
              <p className="text-sm text-gray-600">
                {employeeInfo?.employeeId || employee.employeeId} • {employeeInfo?.role || employee.role} • {employeeInfo?.department || employee.department}
              </p>
              {employeeInfo?.schedule && (
                <p className="text-xs text-gray-500 mt-1">
                  Expected: {employeeInfo.schedule.expectedLoginTime} - {employeeInfo.schedule.expectedLogoutTime}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
        </div>

        {/* Month Navigation */}
        <div className="px-6 py-3 border-b flex items-center justify-between bg-white">
          <button
            onClick={handlePrevMonth}
            className="px-3 py-1 border rounded-md hover:bg-gray-50"
          >
            ← Previous
          </button>
          <h3 className="text-lg font-semibold text-gray-800">
            {monthNames[currentMonth - 1]} {currentYear}
          </h3>
          <button
            onClick={handleNextMonth}
            className="px-3 py-1 border rounded-md hover:bg-gray-50"
          >
            Next →
          </button>
        </div>

        {/* Summary Stats */}
        {summary && (
          <div className="px-6 py-3 bg-gray-50 border-b">
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{summary.presentDays}</div>
                <div className="text-xs text-gray-500">Present</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-red-600">{summary.absentDays}</div>
                <div className="text-xs text-gray-500">Absent</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-blue-600">{summary.leaveDays}</div>
                <div className="text-xs text-gray-500">Leave</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-purple-600">{summary.wfhDays || 0}</div>
                <div className="text-xs text-gray-500">WFH</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-indigo-600">{summary.holidayDays}</div>
                <div className="text-xs text-gray-500">Holidays</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-gray-700">{summary.totalHours?.toFixed(1) || 0}h</div>
                <div className="text-xs text-gray-500">Total Hours</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-semibold text-green-600">{summary.totalOT?.toFixed(1) || 0}h</div>
                <div className="text-xs text-gray-500">OT Hours</div>
              </div>
              <div className="text-center">
                <div className={`text-lg font-semibold ${
                  summary.attendanceRate >= 90 ? 'text-green-600' :
                  summary.attendanceRate >= 75 ? 'text-yellow-600' : 'text-red-600'
                }`}>
                  {summary.attendanceRate}%
                </div>
                <div className="text-xs text-gray-500">Attendance</div>
              </div>
            </div>
            
            {/* Late arrivals and early departures */}
            {(summary.lateArrivals > 0 || summary.earlyDepartures > 0) && (
              <div className="mt-2 pt-2 border-t border-gray-200 flex gap-4 justify-center">
                {summary.lateArrivals > 0 && (
                  <span className="text-xs text-orange-600">
                    ⚠ {summary.lateArrivals} late arrival{summary.lateArrivals > 1 ? 's' : ''}
                  </span>
                )}
                {summary.earlyDepartures > 0 && (
                  <span className="text-xs text-orange-600">
                    ⚠ {summary.earlyDepartures} early departure{summary.earlyDepartures > 1 ? 's' : ''}
                  </span>
                )}
              </div>
            )}
          </div>
        )}

        {/* Calendar */}
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : (
            <div className="min-w-[700px]">
              {/* Day headers */}
              <div className="grid grid-cols-7 gap-1 mb-2">
                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, index) => (
                  <div 
                    key={day} 
                    className={`text-center text-sm font-semibold py-2 ${
                      index === 0 || index === 6 ? 'text-gray-400' : 'text-gray-700'
                    }`}
                  >
                    {day}
                  </div>
                ))}
              </div>

              {/* Calendar grid */}
              {weeks.map((week, weekIndex) => (
                <div key={weekIndex} className="grid grid-cols-7 gap-1 mb-1">
                  {week.map((day, dayIndex) => (
                    <div
                      key={dayIndex}
                      className={`min-h-[100px] p-2 rounded-lg border ${
                        day === null
                          ? 'bg-gray-50 border-gray-100'
                          : day.isWeekend
                          ? 'bg-gray-50 border-gray-200'
                          : day.isHoliday
                          ? 'bg-indigo-50 border-indigo-200'
                          : day.leaveInfo
                          ? 'bg-blue-50 border-blue-200'
                          : day.attendance?.status?.toLowerCase().includes('present')
                          ? 'bg-green-50 border-green-200'
                          : day.attendance?.status?.toLowerCase().includes('absent')
                          ? 'bg-red-50 border-red-200'
                          : 'bg-white border-gray-200'
                      }`}
                    >
                      {day && (
                        <>
                          <div className="flex justify-between items-start mb-1">
                            <span className={`text-sm font-medium ${
                              day.isWeekend ? 'text-gray-400' : 'text-gray-700'
                            }`}>
                              {day.day}
                            </span>
                            <span className="text-xs text-gray-400">
                              {day.dayName}
                            </span>
                          </div>
                          
                          <div className="flex flex-col items-center justify-center">
                            {getStatusBadge(day)}
                            {renderTimeInfo(day)}
                            {renderHoursInfo(day)}
                          </div>
                          
                          {day.attendance?.remarks && (
                            <div className="text-xs text-gray-500 mt-1 truncate" title={day.attendance.remarks}>
                              📝 {day.attendance.remarks}
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Legend */}
        <div className="px-6 py-3 border-t bg-gray-50">
          <div className="flex flex-wrap gap-4 justify-center text-xs">
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-green-100 border border-green-300"></span>
              <span>Present</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-red-100 border border-red-300"></span>
              <span>Absent</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-blue-100 border border-blue-300"></span>
              <span>Leave</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-purple-100 border border-purple-300"></span>
              <span>WFH / Restricted Holiday</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-indigo-100 border border-indigo-300"></span>
              <span>Public Holiday</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-gray-200 border border-gray-300"></span>
              <span>Weekend</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendarModal;