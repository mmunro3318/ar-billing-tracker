const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

function createApiUrl(pathname) {
  return `${API_BASE_URL}${pathname}`;
}

export async function fetchJson(pathname) {
  const response = await fetch(createApiUrl(pathname));

  if (!response.ok) {
    throw new Error(`Request failed for ${pathname}: ${response.status}`);
  }

  return response.json();
}
