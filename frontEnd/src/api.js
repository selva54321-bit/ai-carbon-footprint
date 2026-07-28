const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

async function apiGet(path) {
  const response = await fetch(`${API_BASE_URL}${path}`);
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `API request failed: ${response.status}`);
  }
  return response.json();
}

function query(params) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null) search.set(key, value);
  });
  return search.toString();
}

export function fetchDashboard({ dayIndex, solar, bus, led }) {
  return apiGet(`/api/dashboard?${query({ day_index: dayIndex, solar, bus, led })}`);
}

export function reportUrl(reportType, dayIndex) {
  return `${API_BASE_URL}/api/reports/${reportType}?${query({ day_index: dayIndex })}`;
}
