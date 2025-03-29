import React, { useState, useEffect } from "react";
import axios from "axios";

const PROXY_API_URL = "http://localhost:5000/api/erp/users";

const UserSuggestionInput = ({ value, onChange, placeholder, label, onUserSelect }) => {
  const [allUsers, setAllUsers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Function to fetch all users (only the name field)
  const fetchUsers = async () => {
    try {
      const res = await axios.get(PROXY_API_URL, {
        params: {
          fields: '["name"]'
        }
      });
      setAllUsers(res.data.data);
    } catch (error) {
      console.error("Error fetching users from ERPNext:", error);
    }
  };

  // When the input is focused, fetch all users if not already loaded
  const handleFocus = () => {
    if (allUsers.length === 0) {
      fetchUsers();
    }
    setShowSuggestions(true);
  };

  // Filter the user list based on input value
  useEffect(() => {
    if (value) {
      const filtered = allUsers.filter((user) =>
        user.name.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered);
    } else {
      setSuggestions(allUsers);
    }
  }, [value, allUsers]);

  const handleSelect = (user) => {
    onChange(user.name);
    setShowSuggestions(false);
    if (onUserSelect) {
      onUserSelect(user);
    }
  };

  return (
    <div className="relative">
      {label && (
        <label className="block mb-1 font-medium text-purple-700">
          {label}
        </label>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={handleFocus}
        placeholder={placeholder}
        className="border border-purple-300 rounded w-full p-2"
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute bg-white border border-gray-300 rounded shadow-lg mt-1 w-full z-10">
          {suggestions.map((user) => (
            <div
              key={user.name}
              className="p-2 cursor-pointer hover:bg-gray-100"
              onClick={() => handleSelect(user)}
            >
              {user.name}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default UserSuggestionInput;
