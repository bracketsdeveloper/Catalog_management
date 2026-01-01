import React, { useState, useEffect } from "react";
import { BellIcon, ExclamationCircleIcon, ArrowPathIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import axios from "axios";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchUserTasks = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/tasks/assigned-to-me`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const tasks = response.data.tasks || [];
      const now = new Date();
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      // Filter tasks: Only show today's, future, or reopened future tasks
      const filteredTasks = tasks.filter(task => {
        const dueDate = new Date(task.toBeClosedBy);
        const dueDateOnly = new Date(dueDate);
        dueDateOnly.setHours(0, 0, 0, 0);
        
        // If task is reopened, show it regardless of date
        if (task.reopened) {
          return task.completedOn === "Not Done" && task.isActive !== false;
        }
        
        // Otherwise, only show tasks that are due today or in the future
        const isTodayOrFuture = dueDateOnly >= today;
        return isTodayOrFuture && task.completedOn === "Not Done" && task.isActive !== false;
      });
      
      // Sort by priority: overdue (if within today) > today > upcoming > reopened
      const sortedTasks = filteredTasks.sort((a, b) => {
        const now = new Date();
        const dateA = new Date(a.toBeClosedBy);
        const dateB = new Date(b.toBeClosedBy);
        
        const isAOverdue = dateA < now;
        const isBOverdue = dateB < now;
        
        // Overdue tasks first (but only if they're from today)
        if (isAOverdue && !isBOverdue) return -1;
        if (!isAOverdue && isBOverdue) return 1;
        
        const isAToday = dateA.toDateString() === now.toDateString();
        const isBToday = dateB.toDateString() === now.toDateString();
        
        // Today's tasks next
        if (isAToday && !isBToday) return -1;
        if (!isAToday && isBToday) return 1;
        
        // Reopened tasks have priority over regular future tasks
        if (a.reopened && !b.reopened) return -1;
        if (!a.reopened && b.reopened) return 1;
        
        // Sort by closest due date
        return dateA - dateB;
      });
      
      setNotifications(sortedTasks);
      setUnreadCount(sortedTasks.length);
      
    } catch (error) {
      console.error("Error fetching user tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTasks();
    
    const interval = setInterval(fetchUserTasks, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateOnly = new Date(date);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((dueDateOnly - today) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      if (date < now) {
        const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
        if (diffHours === 0) return "Overdue now";
        return `${diffHours} hour${diffHours > 1 ? 's' : ''} overdue`;
      }
      return "Today";
    }
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const getPriorityColor = (task) => {
    const dueDate = new Date(task.toBeClosedBy);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    const diffDays = Math.floor((dueDateOnly - today) / (1000 * 60 * 60 * 24));
    
    if (task.reopened) return "bg-purple-500"; // Purple for reopened tasks
    
    if (dueDate < now && diffDays === 0) return "bg-red-500"; // Overdue today
    if (diffDays === 0) return "bg-orange-500"; // Due today
    if (diffDays <= 2) return "bg-yellow-500"; // Due in 1-2 days
    return "bg-blue-500"; // Future task
  };

  const getTaskTypeBadge = (task) => {
    if (task.reopened) {
      return {
        text: "Reopened",
        color: "bg-purple-100 text-purple-800 border border-purple-300",
        icon: <ArrowPathIcon className="h-3 w-3 mr-1" />
      };
    }
    
    // Check if task was created recently (within 24 hours)
    const createdDate = new Date(task.createdAt || task.assignedOn);
    const now = new Date();
    const hoursSinceCreation = Math.floor((now - createdDate) / (1000 * 60 * 60));
    
    if (hoursSinceCreation <= 24) {
      return {
        text: "New",
        color: "bg-green-100 text-green-800 border border-green-300",
        icon: <ExclamationCircleIcon className="h-3 w-3 mr-1" />
      };
    }
    
    return null;
  };

  const getFormattedTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const isTaskOverdueToday = (task) => {
    const dueDate = new Date(task.toBeClosedBy);
    const now = new Date();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const dueDateOnly = new Date(dueDate);
    dueDateOnly.setHours(0, 0, 0, 0);
    
    return dueDate < now && dueDateOnly.getTime() === today.getTime();
  };

  if (loading) return null;

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="fixed top-3 right-24 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow hover:bg-white active:scale-[0.98] transition"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6 text-gray-700" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {showNotifications && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setShowNotifications(false)}
          />
          
          <div className="fixed top-16 right-24 z-50 w-96 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100 bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-800">Upcoming Tasks</h3>
                  <p className="text-xs text-gray-500">
                    {notifications.length} task{notifications.length !== 1 ? 's' : ''} due today or later
                  </p>
                </div>
                <Link
                  to="/admin-dashboard/manage-tickets"
                  onClick={() => setShowNotifications(false)}
                  className="text-sm text-blue-600 hover:text-blue-800 font-medium"
                >
                  View All
                </Link>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No upcoming tasks</p>
                  <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((task) => {
                    const taskType = getTaskTypeBadge(task);
                    const isOverdueToday = isTaskOverdueToday(task);
                    
                    return (
                      <Link
                        key={task._id}
                        to="/admin-dashboard/manage-tickets"
                        onClick={() => setShowNotifications(false)}
                        className="block p-4 hover:bg-gray-50 transition-colors border-l-4 border-transparent hover:border-blue-300"
                      >
                        <div className="flex items-start space-x-3">
                          <div className={`h-3 w-3 rounded-full mt-1 flex-shrink-0 ${getPriorityColor(task)}`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between mb-1">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="font-medium text-gray-900 truncate">
                                    {task.ticketName}
                                  </p>
                                  {taskType && (
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${taskType.color}`}>
                                      {taskType.icon}
                                      {taskType.text}
                                    </span>
                                  )}
                                </div>
                                {task.taskDescription && (
                                  <p className="text-sm text-gray-600 line-clamp-2 mb-2">
                                    {task.taskDescription}
                                  </p>
                                )}
                              </div>
                              <div className="text-right flex-shrink-0">
                                <span className={`text-xs font-medium whitespace-nowrap ${isOverdueToday ? 'text-red-600' : 'text-gray-600'}`}>
                                  {formatDate(task.toBeClosedBy)}
                                </span>
                                <div className="text-xs text-gray-400 mt-0.5">
                                  {getFormattedTime(task.toBeClosedBy)}
                                </div>
                              </div>
                            </div>
                            
                            <div className="flex items-center justify-between mt-2">
                              <div className="flex items-center space-x-2">
                                {task.opportunityCode && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    {task.opportunityCode.split(' - ')[0]}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {task.taskRef}
                                </span>
                              </div>
                              <div className="text-right">
                                {task.assignedBy && (
                                  <div className="text-xs text-gray-500">
                                    <span className="font-medium">By:</span> {task.assignedBy.name}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {/* Additional info for reopened tasks */}
                            {task.reopened && task.reopenDescription && (
                              <div className="mt-2 p-2 bg-purple-50 border border-purple-100 rounded text-xs text-purple-800">
                                <div className="font-medium mb-0.5">Reopen Reason:</div>
                                <div className="line-clamp-2">{task.reopenDescription}</div>
                              </div>
                            )}
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="border-t border-gray-100 bg-gray-50">
              <div className="px-4 py-3">
                <div className="flex items-center justify-between text-xs text-gray-500">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-red-500 mr-1.5"></div>
                      <span>Overdue</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-orange-500 mr-1.5"></div>
                      <span>Today</span>
                    </div>
                    <div className="flex items-center">
                      <div className="h-2 w-2 rounded-full bg-purple-500 mr-1.5"></div>
                      <span>Reopened</span>
                    </div>
                  </div>
                  <Link
                    to="/admin-dashboard/manage-tickets?filter=today"
                    onClick={() => setShowNotifications(false)}
                    className="text-blue-600 hover:text-blue-800 font-medium"
                  >
                    Today's Tasks
                  </Link>
                </div>
                <div className="text-xs text-gray-400 mt-2 text-center">
                  Only showing tasks due today or in the future
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;