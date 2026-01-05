import React, { useState, useEffect } from "react";
import { BellIcon, ExclamationCircleIcon, ArrowPathIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { Link } from "react-router-dom";
import axios from "axios";

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [replyNotifications, setReplyNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `${process.env.REACT_APP_BACKEND_URL}/api/admin/tasks/notifications`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      
      const data = response.data;
      if (data.success) {
        setNotifications(data.tasks || []);
        setReplyNotifications(data.replyNotifications || []);
        setUnreadCount(data.totalNotifications || 0);
      }
      
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    
    const interval = setInterval(fetchNotifications, 5 * 60 * 1000);
    
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
    
    if (task.reopened) return "bg-purple-500";
    if (dueDate < now && diffDays === 0) return "bg-red-500";
    if (diffDays === 0) return "bg-orange-500";
    if (diffDays <= 2) return "bg-yellow-500";
    return "bg-blue-500";
  };

  const getTaskTypeBadge = (task) => {
    if (task.reopened) {
      return {
        text: "Reopened",
        color: "bg-purple-100 text-purple-800 border border-purple-300",
        icon: <ArrowPathIcon className="h-3 w-3 mr-1" />
      };
    }
    
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

  const formatReplyTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 60) {
      return `${diffMins} min${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric' 
      });
    }
  };

  if (loading) return null;

  const totalNotifications = notifications.length + replyNotifications.length;

  return (
    <div className="relative">
      <button
        onClick={handleBellClick}
        className="fixed top-3 right-24 z-50 inline-flex items-center justify-center h-12 w-12 rounded-full bg-white/90 backdrop-blur border border-gray-200 shadow hover:bg-white active:scale-[0.98] transition"
        aria-label="Notifications"
      >
        <BellIcon className="h-6 w-6 text-gray-700" />
        {totalNotifications > 0 && (
          <span className="absolute -top-1 -right-1 flex items-center justify-center h-5 w-5 bg-red-500 text-white text-xs font-bold rounded-full">
            {totalNotifications > 9 ? '9+' : totalNotifications}
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
                  <h3 className="font-semibold text-gray-800">Notifications</h3>
                  <p className="text-xs text-gray-500">
                    {totalNotifications} notification{totalNotifications !== 1 ? 's' : ''}
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
              {totalNotifications === 0 ? (
                <div className="p-6 text-center text-gray-500">
                  <BellIcon className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                  <p>No notifications</p>
                  <p className="text-xs text-gray-400 mt-1">You're all caught up!</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-100">
                  {/* Reply Notifications */}
                  {replyNotifications.length > 0 && (
                    <div className="p-3 bg-blue-50 border-b border-blue-100">
                      <div className="flex items-center text-sm font-medium text-blue-800 mb-2">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 mr-2" />
                        New Replies ({replyNotifications.length})
                      </div>
                      {replyNotifications.map((notification, index) => (
                        <Link
                          key={`reply-${index}`}
                          to="/admin-dashboard/manage-tickets"
                          onClick={() => setShowNotifications(false)}
                          className="block p-3 mb-2 bg-white rounded-lg border border-blue-100 hover:border-blue-300 transition-colors"
                        >
                          <div className="flex items-start space-x-3">
                            <div className="bg-blue-100 p-2 rounded-full">
                              <ChatBubbleLeftRightIcon className="h-4 w-4 text-blue-600" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start justify-between mb-1">
                                <p className="font-medium text-gray-900 truncate">
                                  New reply on: {notification.ticketName}
                                </p>
                                <span className="text-xs text-gray-500 whitespace-nowrap">
                                  {formatReplyTime(notification.replyTime)}
                                </span>
                              </div>
                              <div className="mb-2">
                                <span className="text-xs text-gray-600">
                                  From: <span className="font-medium">{notification.replyFrom}</span>
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 line-clamp-2 bg-gray-50 p-2 rounded border border-gray-100">
                                "{notification.replyMessage}"
                              </p>
                              <div className="flex items-center justify-between mt-2">
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                  {notification.taskRef}
                                </span>
                                {notification.unreadCount > 1 && (
                                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                                    +{notification.unreadCount - 1} more
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </Link>
                      ))}
                    </div>
                  )}
                  
                  {/* Task Notifications */}
                  {notifications.length > 0 && (
                    <>
                      <div className="p-3 bg-gray-50 border-b border-gray-100">
                        <div className="flex items-center text-sm font-medium text-gray-800 mb-2">
                          <ExclamationCircleIcon className="h-4 w-4 mr-2" />
                          Upcoming Tasks ({notifications.length})
                        </div>
                      </div>
                      {notifications.map((task) => {
                        const taskType = getTaskTypeBadge(task);
                        const isOverdueToday = new Date(task.toBeClosedBy) < new Date() && 
                          new Date(task.toBeClosedBy).toDateString() === new Date().toDateString();
                        
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
                    </>
                  )}
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
                  Includes task reminders and new reply notifications
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