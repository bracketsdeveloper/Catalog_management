import React from "react";
import { CiBoxList } from "react-icons/ci";
import { BsFillKanbanFill } from "react-icons/bs";

export default function ToggleButtons({ viewMode, setViewMode }) {
  return (
    <div className="flex space-x-1">
      <button
        onClick={() => setViewMode("list")}
        className={`border border-gray-300 rounded px-2 py-1 text-sm group ${
          viewMode === "list" ? "bg-[#Ff8045] text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center space-x-1">
          <CiBoxList className="h-4 w-4 text-gray-500 group-hover:text-[#Ff8045]" />
          <span className="hidden group-hover:inline text-xs">List</span>
        </div>
      </button>
      <button
        onClick={() => setViewMode("kanban")}
        className={`border border-gray-300 rounded px-2 py-1 text-sm group ${
          viewMode === "kanban" ? "bg-purple-600 text-white" : "bg-white hover:bg-gray-100"
        }`}
      >
        <div className="flex items-center space-x-1">
          <BsFillKanbanFill className="h-4 w-4 text-gray-500 group-hover:text-purple-600" />
          <span className="hidden group-hover:inline text-xs">Kanban</span>
        </div>
      </button>
    </div>
  );
}
