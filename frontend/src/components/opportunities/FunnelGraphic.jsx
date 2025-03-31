// ../components/opportunities/FunnelGraphic.jsx
import React from "react";

export default function FunnelGraphic({
  selectedStage = "",
  onStageSelect = () => {},
}) {
  const funnelStages = [
    { label: "Lead", width: 200 },
    { label: "Qualified", width: 180 },
    { label: "Proposal Sent", width: 160 },
    { label: "Negotiation", width: 140 },
    { label: "Commit", width: 120 },
    { label: "Won/Lost/Discontinued", width: 100 },
  ];

  // A small helper to scale down text on narrower stages
  const getFontSize = (width) => {
    if (width >= 180) return "text-sm";
    if (width >= 140) return "text-xs";
    return "text-[10px]";
  };

  return (
    <div className="flex flex-col items-center">
      <label className="text-sm font-semibold text-gray-700 mb-2 text-center">
        Opportunity Stage <span className="text-red-500">*</span>
      </label>

      {funnelStages.map((stage) => {
        const isSelected = stage.label === selectedStage;
        const fontSizeClass = getFontSize(stage.width);

        return (
          <div
            key={stage.label}
            onClick={() => onStageSelect(stage.label)}
            className={`cursor-pointer mb-2 flex items-center justify-center ${fontSizeClass} font-medium rounded transition-colors px-2 text-center leading-tight break-words ${
              isSelected ? "bg-purple-600" : "bg-gray-400 hover:bg-gray-500"
            } text-white`}
            style={{
              width: `${stage.width}px`,
              height: "60px",
              whiteSpace: "normal",
              textAlign: "center",
            }}
          >
            {stage.label}
          </div>
        );
      })}
    </div>
  );
}
