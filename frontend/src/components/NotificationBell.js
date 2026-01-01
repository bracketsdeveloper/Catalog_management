// components/NotificationBell.js
import React, { useState, useEffect } from "react";
import { BellIcon } from "@heroicons/react/24/outline";
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
      
      // Filter for open/active tasks assigned to the user
      const activeTasks = tasks.filter(task => 
        task.completedOn === "Not Done" && 
        task.isActive !== false &&
        new Date(task.toBeClosedBy) >= new Date()
      );
      
      setNotifications(activeTasks);
      setUnreadCount(activeTasks.length);
      
      // Mark tasks as read if needed
      const unreadTasks = activeTasks.filter(task => !task.notificationRead);
      if (unreadTasks.length > 0) {
        // Optional: You can call an endpoint to mark notifications as read
        // await markNotificationsAsRead(unreadTasks.map(t => t._id));
      }
      
    } catch (error) {
      console.error("Error fetching user tasks:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUserTasks();
    
    // Refresh notifications every 5 minutes
    const interval = setInterval(fetchUserTasks, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  const handleBellClick = () => {
    setShowNotifications(!showNotifications);
    if (!showNotifications && unreadCount > 0) {
      // Mark all as read when opening
      setUnreadCount(0);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return "Today";
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
    const diffDays = Math.floor((dueDate - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays < 0) return "bg-red-500"; // Overdue
    if (diffDays === 0) return "bg-orange-500"; // Due today
    if (diffDays <= 2) return "bg-yellow-500"; // Due in 1-2 days
    return "bg-blue-500"; // Future task
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
          
          <div className="fixed top-16 left-3 z-50 w-80 bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden">
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800">Your Tasks ({notifications.length})</h3>
                <Link
                  to="/admin-dashboard/manage-tasks"
                  onClick={() => setShowNotifications(false)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  View All
                </Link>
              </div>
            </div>
            
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No active tasks assigned to you</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {notifications.map((task) => (
                    <Link
                      key={task._id}
                      to="/admin-dashboard/manage-tasks"
                      onClick={() => setShowNotifications(false)}
                      className="block p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start space-x-3">
                        <div className={`h-3 w-3 rounded-full mt-1 ${getPriorityColor(task)}`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-medium text-gray-900 truncate">
                              {task.ticketName}
                            </p>
                            <span className="text-xs text-gray-500 whitespace-nowrap">
                              {formatDate(task.toBeClosedBy)}
                            </span>
                          </div>
                          {task.taskDescription && (
                            <p className="text-sm text-gray-600 truncate">
                              {task.taskDescription}
                            </p>
                          )}
                          <div className="flex items-center justify-between mt-2">
                            <div className="flex items-center space-x-2">
                              {task.opportunityCode && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                  {task.opportunityCode.split(' - ')[0]}
                                </span>
                              )}
                              <span className="text-xs text-gray-500">
                                {task.taskRef}
                              </span>
                            </div>
                            {task.assignedBy && (
                              <span className="text-xs text-gray-500">
                                By: {task.assignedBy.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </div>
            
            <div className="p-3 border-t border-gray-100 bg-gray-50">
              <Link
                to="/admin-dashboard/manage-tasks"
                onClick={() => setShowNotifications(false)}
                className="block w-full text-center text-sm font-medium text-blue-600 hover:text-blue-800 py-2"
              >
                Go to Task Manager →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;