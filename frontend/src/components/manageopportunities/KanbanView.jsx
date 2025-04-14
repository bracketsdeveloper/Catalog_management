import React from "react";
import { DragDropContext, Droppable, Draggable } from "react-beautiful-dnd";

// Helper function: Group opportunities by their specific status
// for those opportunities that have the stage "Won/Lost/Discontinued".
function groupByStatus(opportunities) {
  const statusGroups = { Won: [], Lost: [], Discontinued: [] };
  opportunities.forEach((op) => {
    // Fallback to "Won" if status is missing; adjust as necessary.
    const status = op.opportunityStatus || "Won";
    if (statusGroups[status]) {
      statusGroups[status].push(op);
    }
  });
  return statusGroups;
}

export default function KanbanView({ data, stages, formatClosureDate, handleDragEnd }) {
  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      {/* Outer container: Arrange each stage as a column */}
      <div className="flex space-x-4 overflow-auto" style={{ minHeight: "70vh" }}>
        {stages.map((stage) => {
          if (stage === "Won/Lost/Discontinued") {
            // Filter out opportunities assigned to the special stage.
            const specialItems = data.filter(op => op.opportunityStage === "Won/Lost/Discontinued");
            const statusGroups = groupByStatus(specialItems);
            return (
              <div key={stage} className="bg-gray-50 rounded-md p-2 w-96 flex-shrink-0">
                <h2 className="text-sm font-bold mb-2 text-gray-700 uppercase">
                  {stage}
                </h2>
                {/* Render sub-sections in a row */}
                <div className="flex flex-row space-x-2">
                  {["Won", "Lost", "Discontinued"].map((status) => (
                    <Droppable droppableId={status} key={status}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          // Each droppable takes about one-third of the container width
                          className="bg-gray-100 p-2 rounded w-1/3 min-w-[120px]"
                        >
                          <h3 className="text-xs font-semibold text-gray-600 text-center">
                            {status} ({(statusGroups[status] || []).length})
                          </h3>
                          <div className="space-y-2">
                            {(statusGroups[status] || []).map((oppty, index) => (
                              <Draggable key={oppty._id} draggableId={oppty._id} index={index}>
                                {(providedCard) => (
                                  <div
                                    ref={providedCard.innerRef}
                                    {...providedCard.draggableProps}
                                    {...providedCard.dragHandleProps}
                                    className="bg-white shadow rounded p-2 text-sm border border-gray-200 w-full break-words"
                                  >
                                    <div className="font-semibold text-blue-600">
                                      {oppty.opportunityName}
                                    </div>
                                    <div className="text-xs text-gray-600">
                                      {oppty.account}
                                    </div>
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
              </div>
            );
          } else {
            // For all other stages, display opportunities in a simple column.
            const stageItems = data.filter(op => op.opportunityStage === stage);
            return (
              <Droppable droppableId={stage} key={stage}>
                {(provided) => (
                  <div
                    className="bg-gray-50 rounded-md p-2 w-56 flex-shrink-0" // Increased width if needed
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                  >
                    <h2 className="text-sm font-bold mb-2 text-gray-700 uppercase">
                      {stage}{" "}
                      <span className="ml-2 text-xs text-gray-500">
                        ({stageItems.length})
                      </span>
                    </h2>
                    <div className="space-y-2">
                      {stageItems.map((oppty, index) => (
                        <Draggable key={oppty._id} draggableId={oppty._id} index={index}>
                          {(providedCard) => (
                            <div
                              ref={providedCard.innerRef}
                              {...providedCard.draggableProps}
                              {...providedCard.dragHandleProps}
                              className="bg-white shadow rounded p-2 text-sm border border-gray-200 w-full break-words"
                            >
                              <div className="font-semibold text-blue-600">
                                {oppty.opportunityName}
                              </div>
                              <div className="text-xs text-gray-600">
                                {oppty.account}
                              </div>
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
            );
          }
        })}
      </div>
    </DragDropContext>
  );
}
