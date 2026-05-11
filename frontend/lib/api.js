const API_URL = process.env.NEXT_PUBLIC_API_URL || "";

export function getToken() {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem("icit_token");
}

// ตรวจสอบว่า Backend เปิดใช้งานหรือไม่
function isBackendEnabled() {
  return API_URL && API_URL !== "";
}

export function setToken(token) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem("icit_token", token);
  }
}

export function clearToken() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem("icit_token");
  }
}

export async function apiFetch(path, options = {}) {
  if (!isBackendEnabled()) {
    console.warn("[API] Backend is disabled. Skipping API call.");
    return null;
  }

  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  if (token) headers.Authorization = `Bearer ${token}`;

  try {
    const response = await fetch(`${API_URL}${path}`, {
      ...options,
      headers,
    });

    const contentType = response.headers.get("content-type") || "";
    const body = contentType.includes("application/json")
      ? await response.json()
      : await response.text();

    if (!response.ok) {
      throw new Error(body?.message || "Request failed");
    }

    return body;
  } catch (err) {
    if (err.message === "Failed to fetch") {
      console.error("[API] Backend server not available at:", API_URL);
      throw new Error(
        "ไม่สามารถเชื่อมต่อกับเซิร์ฟเวอร์ได้ กรุณาตรวจสอบว่า backend กำลังทำงานอยู่",
      );
    }
    throw err;
  }
}

export async function downloadCsv(path, filename) {
  const token = getToken();
  const response = await fetch(`${API_URL}${path}`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });

  if (!response.ok) {
    const body = await response.json().catch(() => null);
    throw new Error(body?.message || "CSV export failed");
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
