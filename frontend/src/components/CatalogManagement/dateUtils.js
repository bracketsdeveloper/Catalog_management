import {
    isToday as isTodayFn,
    isYesterday as isYesterdayFn,
    isThisWeek as isThisWeekFn,
    isThisMonth,
    isThisYear
  } from "date-fns";
  
  // For advanced date checks, you can define your own or rely on date-fns
  function isLastWeek(date) {
    const today = new Date();
    const firstDayOfThisWeek = new Date(today);
    firstDayOfThisWeek.setDate(today.getDate() - today.getDay());
    const firstDayOfLastWeek = new Date(firstDayOfThisWeek);
    firstDayOfLastWeek.setDate(firstDayOfThisWeek.getDate() - 7);
    const lastDayOfLastWeek = new Date(firstDayOfThisWeek);
    lastDayOfLastWeek.setDate(firstDayOfThisWeek.getDate() - 1);
    return date >= firstDayOfLastWeek && date <= lastDayOfLastWeek;
  }
  
  function isLastMonth(date) {
    const today = new Date();
    const lastMonth = today.getMonth() === 0 ? 11 : today.getMonth() - 1;
    const year = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear();
    return date.getMonth() === lastMonth && date.getFullYear() === year;
  }
  
  function isLastYear(date) {
    const lastYear = new Date().getFullYear() - 1;
    return date.getFullYear() === lastYear;
  }
  
  /**
   * Group items by relative date category: Today, Yesterday, This Week, Last Week, Last Month, Last Year, Earlier
   */
  export function groupItemsByDate(items) {
    const groups = {
      Today: [],
      Yesterday: [],
      "This Week": [],
      "Last Week": [],
      "Last Month": [],
      "Last Year": [],
      Earlier: [],
    };
  
    items.forEach((item) => {
      const d = new Date(item.createdAt);
      if (isTodayFn(d)) groups["Today"].push(item);
      else if (isYesterdayFn(d)) groups["Yesterday"].push(item);
      else if (isThisWeekFn(d)) groups["This Week"].push(item);
      else if (isLastWeek(d)) groups["Last Week"].push(item);
      else if (isLastMonth(d)) groups["Last Month"].push(item);
      else if (isLastYear(d)) groups["Last Year"].push(item);
      else groups["Earlier"].push(item);
    });
    return groups;
  }
  
  /**
   * Group quotations by time period: Today, Yesterday, This Week, This Month, This Year, or older...
   * Example approach: 
   */
  export function groupQuotationsByTimePeriod(quotations) {
    const grouped = {};
    quotations.forEach((quotation) => {
      const date = new Date(quotation.createdAt);
      let period = "Older";
      if (isTodayFn(date)) period = "Today";
      else if (isYesterdayFn(date)) period = "Yesterday";
      else if (isThisWeekFn(date)) period = "This Week";
      else if (isThisMonth(date)) period = "This Month";
      else if (isThisYear(date)) period = "This Year";
  
      if (!grouped[period]) grouped[period] = [];
      grouped[period].push(quotation);
    });
  
    // Convert to an array of objects if needed
    return Object.entries(grouped).map(([period, quotes]) => ({
      period,
      latest: quotes[0],
      all: quotes,
    }));
  }
  