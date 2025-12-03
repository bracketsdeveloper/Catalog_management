import React, { useState, useEffect, useRef } from 'react';
import { toast } from 'react-toastify';
import { HRMS, dateUtils } from '../../api/hrmsClient';

const EmployeeCalendarModal = ({ employee, month: initialMonth, year: initialYear, onClose, onMonthChange, onDataUpdate }) => {
  const [calendarData, setCalendarData] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [month, setMonth] = useState(initialMonth);
  const [year, setYear] = useState(initialYear);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editingStatus, setEditingStatus] = useState(false);
  const [editForm, setEditForm] = useState({
    status: '',
    inTime: '',
    outTime: '',
    remarks: ''
  });
  
  const calendarRef = useRef(null);

  useEffect(() => {
    fetchCalendarData();
  }, [employee.employeeId, month, year]);

  const fetchCalendarData = async () => {
    setLoading(true);
    try {
      const response = await HRMS.getEmployeeCalendar(employee.employeeId, { month, year });
      setCalendarData(response.data.calendarData || []);
      setSummary(response.data.summary || null);
    } catch (error) {
      console.error('Error fetching calendar data:', error);
      toast.error('Failed to load calendar data');
      setCalendarData([]);
      setSummary(null);
    } finally {
      setLoading(false);
    }
  };

  const handleDateClick = (dateData) => {
    if (dateData.isWeekend || dateData.isHoliday) return;
    
    setSelectedDate(dateData);
    setEditForm({
      status: dateData.attendance?.status || '',
      inTime: dateData.attendance?.inTime || '',
      outTime: dateData.attendance?.outTime || '',
      remarks: dateData.attendance?.remarks || ''
    });
    setEditingStatus(true);
  };

  const handleStatusUpdate = async () => {
    if (!selectedDate) return;

    try {
      const data = {
        employeeId: employee.employeeId,
        date: selectedDate.date,
        ...editForm
      };

      await HRMS.manualAttendanceEntry(data);
      
      toast.success('Attendance updated successfully');
      setEditingStatus(false);
      setSelectedDate(null);
      fetchCalendarData();
      onDataUpdate?.();
    } catch (error) {
      toast.error('Failed to update attendance');
    }
  };

  const handleMonthNavigation = (direction) => {
    let newMonth = month;
    let newYear = year;
    
    if (direction === 'prev') {
      if (month === 1) {
        newMonth = 12;
        newYear = year - 1;
      } else {
        newMonth = month - 1;
      }
    } else {
      if (month === 12) {
        newMonth = 1;
        newYear = year + 1;
      } else {
        newMonth = month + 1;
      }
    }
    
    setMonth(newMonth);
    setYear(newYear);
    onMonthChange?.(newMonth, newYear);
  };

  const getDayClass = (dateData) => {
    if (dateData.isHoliday) return 'bg-indigo-100 border-indigo-300';
    if (dateData.isWeekend) return 'bg-gray-100 border-gray-300';
    if (dateData.date === selectedDate?.date) return 'bg-blue-50 border-blue-400 ring-2 ring-blue-300';
    
    // Status-based colors
    const status = dateData.status.toLowerCase();
    if (status.includes('present')) return 'bg-green-100 border-green-300';
    if (status.includes('absent')) return 'bg-red-100 border-red-300';
    if (status.includes('½present') || status.includes('half')) return 'bg-orange-100 border-orange-300';
    if (status.includes('leave')) return 'bg-blue-100 border-blue-300';
    if (status.includes('wfh')) return 'bg-purple-100 border-purple-300';
    if (status.includes('weeklyoff')) return 'bg-yellow-100 border-yellow-300';
    
    return 'bg-gray-50 border-gray-200';
  };

  const getStatusIcon = (status) => {
    if (!status) return '○';
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present')) return '✓';
    if (statusLower.includes('absent')) return '✗';
    if (statusLower.includes('leave')) return 'L';
    if (statusLower.includes('wfh')) return 'W';
    if (statusLower.includes('weeklyoff')) return 'WO';
    if (statusLower.includes('holiday')) return 'H';
    if (statusLower.includes('½present') || statusLower.includes('half')) return '½';
    return '○';
  };

  const getStatusText = (status, isHoliday, isWeekend) => {
    if (isHoliday) return 'Holiday';
    if (isWeekend && !status) return 'Weekend';
    if (!status) return 'Not Marked';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present') && !statusLower.includes('½')) return 'Present';
    if (statusLower.includes('absent')) return 'Absent';
    if (statusLower.includes('leave')) return 'Leave';
    if (statusLower.includes('wfh')) return 'WFH';
    if (statusLower.includes('weeklyoff')) return 'Weekly Off';
    if (statusLower.includes('holiday')) return 'Holiday';
    if (statusLower.includes('½present') || statusLower.includes('half')) return '½ Present';
    if (statusLower.includes('absent (no outpunch)')) return 'Absent (No Out)';
    
    return status;
  };

  const getStatusTextColor = (status, isHoliday, isWeekend) => {
    if (isHoliday) return 'text-indigo-700';
    if (isWeekend && !status) return 'text-gray-500';
    if (!status) return 'text-gray-500';
    
    const statusLower = status.toLowerCase();
    if (statusLower.includes('present') && !statusLower.includes('½')) return 'text-green-700';
    if (statusLower.includes('absent')) return 'text-red-700';
    if (statusLower.includes('leave')) return 'text-blue-700';
    if (statusLower.includes('wfh')) return 'text-purple-700';
    if (statusLower.includes('weeklyoff')) return 'text-yellow-700';
    if (statusLower.includes('holiday')) return 'text-indigo-700';
    if (statusLower.includes('½present') || statusLower.includes('half')) return 'text-orange-700';
    
    return 'text-gray-700';
  };

  // Group calendar data by weeks for proper layout
  const groupByWeeks = () => {
    const weeks = [];
    let currentWeek = [];
    
    // Get the first day of the month
    const firstDate = new Date(year, month - 1, 1);
    const firstDayOfWeek = firstDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Add empty cells for days before the first of the month
    for (let i = 0; i < firstDayOfWeek; i++) {
      currentWeek.push(null);
    }
    
    calendarData.forEach((day, index) => {
      currentWeek.push(day);
      
      // If we've reached the end of a week (Saturday) or it's the last day
      if (currentWeek.length === 7 || index === calendarData.length - 1) {
        weeks.push([...currentWeek]);
        
        // If it's the last day and the week isn't full, fill with nulls
        if (index === calendarData.length - 1 && currentWeek.length < 7) {
          while (currentWeek.length < 7) {
            currentWeek.push(null);
          }
          weeks[weeks.length - 1] = [...currentWeek];
        }
        
        currentWeek = [];
      }
    });
    
    return weeks;
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const statusOptions = [
    'Present',
    'Absent',
    'Leave',
    'WFH',
    'WeeklyOff',
    '½Present',
    'Absent (No OutPunch)'
  ];

  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const weeks = groupByWeeks();

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading calendar...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b bg-gray-50 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-800">
                {employee.name} - Attendance Calendar
              </h2>
              <p className="text-sm text-gray-600">
                {employee.employeeId} • {employee.department} • {employee.role}
              </p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 bg-white border rounded-lg px-3 py-1">
                <button
                  onClick={() => handleMonthNavigation('prev')}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Previous month"
                >
                  ←
                </button>
                <span className="font-medium mx-2">
                  {monthNames[month - 1]} {year}
                </span>
                <button
                  onClick={() => handleMonthNavigation('next')}
                  className="p-1 rounded hover:bg-gray-100"
                  title="Next month"
                >
                  →
                </button>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600 p-2 hover:bg-gray-100 rounded-full"
                title="Close"
              >
                ✕
              </button>
            </div>
          </div>
        </div>

        {/* Summary Bar */}
        {summary && (
          <div className="px-6 py-3 border-b bg-blue-50 flex-shrink-0">
            <div className="grid grid-cols-3 md:grid-cols-7 gap-2 md:gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-600">Working Days</div>
                <div className="text-sm font-semibold">{summary.workingDays}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Present</div>
                <div className="text-sm font-semibold text-green-600">{summary.presentDays}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Absent</div>
                <div className="text-sm font-semibold text-red-600">{summary.absentDays}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Leave</div>
                <div className="text-sm font-semibold text-blue-600">{summary.leaveDays}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Total Hours</div>
                <div className="text-sm font-semibold">{summary.totalHours.toFixed(1)}h</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">OT Hours</div>
                <div className="text-sm font-semibold text-orange-600">{summary.totalOT.toFixed(1)}h</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-600">Attendance</div>
                <div className="text-sm font-semibold">{summary.attendanceRate}%</div>
              </div>
            </div>
          </div>
        )}

        {/* Calendar Grid - Scrollable Area */}
        <div className="flex-1 overflow-auto p-6" ref={calendarRef}>
          {/* Weekday Headers - Fixed Sunday to Saturday */}
          <div className="grid grid-cols-7 gap-2 mb-4 sticky top-0 bg-white z-10 pb-2 border-b">
            {weekDays.map(day => (
              <div key={day} className="text-center font-medium text-gray-600 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Weeks */}
          <div className="space-y-2">
            {weeks.map((week, weekIndex) => (
              <div key={weekIndex} className="grid grid-cols-7 gap-2">
                {week.map((dateData, dayIndex) => (
                  <div key={`${weekIndex}-${dayIndex}`} className="min-h-[120px]">
                    {dateData ? (
                      <div
                        className={`h-full border rounded-lg p-2 flex flex-col transition-all ${getDayClass(dateData)} ${
                          dateData.isWeekend || dateData.isHoliday ? 'opacity-90' : 'cursor-pointer hover:border-blue-400 hover:shadow-sm'
                        }`}
                        onClick={() => handleDateClick(dateData)}
                      >
                        {/* Date and Status */}
                        <div className="flex justify-between items-start mb-1">
                          <div>
                            <div className="font-medium text-gray-900">{dateData.day}</div>
                            <div className="text-xs text-gray-500">{dateData.dayName}</div>
                          </div>
                          <div className={`text-lg font-bold ${getStatusTextColor(dateData.status, dateData.isHoliday, dateData.isWeekend)}`}>
                            {getStatusIcon(dateData.status)}
                          </div>
                        </div>
                        
                        {/* Status Text */}
                        <div className="mt-1 mb-2">
                          <div className={`text-xs font-medium ${getStatusTextColor(dateData.status, dateData.isHoliday, dateData.isWeekend)}`}>
                            {getStatusText(dateData.status, dateData.isHoliday, dateData.isWeekend)}
                          </div>
                        </div>
                        
                        {/* Attendance Details */}
                        {dateData.isHoliday ? (
                          <div className="text-xs text-indigo-600 font-medium truncate mt-auto">
                            {dateData.holidayName}
                          </div>
                        ) : dateData.attendance ? (
                          <div className="text-xs space-y-1 mt-auto">
                            {dateData.attendance.inTime && dateData.attendance.outTime && (
                              <div className="text-gray-600 truncate">
                                {dateData.attendance.inTime} - {dateData.attendance.outTime}
                              </div>
                            )}
                            {dateData.attendance.workHours > 0 && (
                              <div className="text-green-600 font-medium">
                                {dateData.attendance.workHours.toFixed(1)}h
                              </div>
                            )}
                            {dateData.attendance.otHours > 0 && (
                              <div className="text-orange-600">
                                OT: {dateData.attendance.otHours.toFixed(1)}h
                              </div>
                            )}
                            {dateData.attendance.remarks && (
                              <div className="text-gray-500 truncate text-[10px]" title={dateData.attendance.remarks}>
                                {dateData.attendance.remarks}
                              </div>
                            )}
                          </div>
                        ) : dateData.isWeekend ? (
                          <div className="text-xs text-gray-400 mt-auto">Weekend</div>
                        ) : (
                          <div className="text-xs text-gray-400 mt-auto">No Record</div>
                        )}
                      </div>
                    ) : (
                      <div className="h-full border border-transparent rounded-lg p-2 opacity-0">
                        {/* Empty cell */}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* Edit Form */}
        {editingStatus && selectedDate && (
          <div className="px-6 py-4 border-t bg-gray-50 flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-medium text-gray-800">
                  Edit Attendance for {selectedDate.date}
                </h3>
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setSelectedDate(null);
                  }}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({...editForm, status: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Status</option>
                    {statusOptions.map(option => (
                      <option key={option} value={option}>{option}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    In Time
                  </label>
                  <input
                    type="time"
                    value={editForm.inTime}
                    onChange={(e) => setEditForm({...editForm, inTime: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Out Time
                  </label>
                  <input
                    type="time"
                    value={editForm.outTime}
                    onChange={(e) => setEditForm({...editForm, outTime: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Remarks
                  </label>
                  <input
                    type="text"
                    value={editForm.remarks}
                    onChange={(e) => setEditForm({...editForm, remarks: e.target.value})}
                    className="w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Optional remarks"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <button
                  onClick={() => {
                    setEditingStatus(false);
                    setSelectedDate(null);
                  }}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleStatusUpdate}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700"
                >
                  Update Attendance
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="px-6 py-3 border-t bg-gray-50 flex-shrink-0">
          <div className="flex flex-wrap gap-3 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-green-100 border border-green-300"></div>
              <span className="text-green-700">Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-red-100 border border-red-300"></div>
              <span className="text-red-700">Absent</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-orange-100 border border-orange-300"></div>
              <span className="text-orange-700">½ Present</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-blue-100 border border-blue-300"></div>
              <span className="text-blue-700">Leave</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-purple-100 border border-purple-300"></div>
              <span className="text-purple-700">WFH</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-yellow-100 border border-yellow-300"></div>
              <span className="text-yellow-700">Weekly Off</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-indigo-100 border border-indigo-300"></div>
              <span className="text-indigo-700">Holiday</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded bg-gray-100 border border-gray-300"></div>
              <span className="text-gray-700">Not Marked</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmployeeCalendarModal;