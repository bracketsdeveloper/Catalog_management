// ../components/manageopportunities/KanbanView.jsx
import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Helper function: group opportunities by stage
function groupByStage(opportunities, stages) {
  const stageMap = {};
  stages.forEach((stage) => (stageMap[stage] = []));
  opportunities.forEach((op) => {
    const stage = op.opportunityStage || "Other";
    if (stageMap[stage]) {
      stageMap[stage].push(op);
    } else {
      stageMap[stage] = [op];
    }
  });
  return stageMap;
}

export default function KanbanView({ data, stages, formatClosureDate, handleDragEnd }) {
  const stageMap = groupByStage(data, stages);
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex space-x-4 overflow-auto" style={{ minHeight: "70vh" }}>
        {stages.map((stage) => (
          <Droppable droppableId={stage} key={stage}>
            {(provided) => (
              <div
                className="bg-gray-50 rounded-md p-2 w-48 flex-shrink-0"  // Updated width: w-48 (12rem)
                ref={provided.innerRef}
                {...provided.droppableProps}
              >
                <h2 className="text-sm font-bold mb-2 text-gray-700 uppercase">
                  {stage} <span className="ml-2 text-xs text-gray-500">({stageMap[stage].length})</span>
                </h2>
                <div className="space-y-2">
                  {stageMap[stage].map((oppty, index) => (
                    <Draggable key={oppty._id} draggableId={oppty._id} index={index}>
                      {(providedCard) => (
                        <div
                          ref={providedCard.innerRef}
                          {...providedCard.draggableProps}
                          {...providedCard.dragHandleProps}
                          className="bg-white shadow rounded p-2 text-sm border border-gray-200"
                        >
                          <div className="font-semibold text-blue-600">
                            {oppty.opportunityName}
                          </div>
                          <div className="text-xs text-gray-600">{oppty.account}</div>
                          <div className="text-xs text-gray-500">
                            Owner: {oppty.opportunityOwner}
                          </div>
                          <div className="text-xs text-gray-500">
                            Closure: {formatClosureDate(oppty.closureDate)}
                          </div>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              </div>
            )}
          </Droppable>
        ))}
      </div>
    </DragDropContext>
  );
}
