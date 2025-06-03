/**
 * Centralized date utilities for consistent date handling across the application
 */

// Get the current date that should be used throughout the application
export function getCurrentDate() {
  return new Date();
}

// Get the date 8 months ago from current date
export function getEightMonthsAgo() {
  const date = getCurrentDate();
  date.setMonth(date.getMonth() - 8);
  return date;
}

// Format a date to ISO string without time
export function formatDateISO(date) {
  return date.toISOString().split('T')[0];
}

// Calculate days between two dates
export function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}