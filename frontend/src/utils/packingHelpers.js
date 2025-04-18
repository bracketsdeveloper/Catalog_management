export function splitOpenClosed(rawRows) {
    const groups = {};
    rawRows.forEach((r) => {
      groups[r.jobSheetNumber] = groups[r.jobSheetNumber] || [];
      groups[r.jobSheetNumber].push(r);
    });
  
    const closedJS = new Set(
      Object.entries(groups)
        .filter(([_, arr]) => arr.every((i) => i.status === "Completed"))
        .map(([num]) => num)
    );
  
    return {
      closed: rawRows.filter((r) => closedJS.has(r.jobSheetNumber)),
      open: rawRows.filter((r) => !closedJS.has(r.jobSheetNumber)),
    };
  }
  