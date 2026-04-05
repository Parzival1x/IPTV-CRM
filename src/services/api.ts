const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:3001/api";

const AUTH_KEYS = ["admin_token", "admin_user"] as const;
const CUSTOMER_AUTH_KEYS = ["customer_token", "customer_user"] as const;

const clearStoredSession = () => {
  for (const key of AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

const clearStoredCustomerSession = () => {
  for (const key of CUSTOMER_AUTH_KEYS) {
    localStorage.removeItem(key);
    sessionStorage.removeItem(key);
  }
};

const notifyAuthChange = (eventName: "auth:changed" | "auth:unauthorized") => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(eventName));
  }
};

export class ApiError extends Error {
  status: number;
  details: unknown;

  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

const getAuthToken = () =>
  localStorage.getItem("admin_token") || sessionStorage.getItem("admin_token");

const getCustomerAuthToken = () =>
  localStorage.getItem("customer_token") || sessionStorage.getItem("customer_token");

const createHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const token = getAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const createCustomerHeaders = (includeAuth = true): HeadersInit => {
  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (includeAuth) {
    const token = getCustomerAuthToken();

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
  }

  return headers;
};

const buildErrorMessage = (status: number, fallback: string) => {
  switch (status) {
    case 400:
      return fallback || "The request could not be processed.";
    case 401:
      return fallback || "Your session has expired. Please sign in again.";
    case 403:
      return fallback || "You do not have permission to perform this action.";
    case 404:
      return fallback || "The requested resource was not found.";
    case 500:
      return fallback || "The server could not complete the request.";
    default:
      return fallback || `Request failed with status ${status}.`;
  }
};

const handleResponse = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    return response.json();
  }

  const errorBody = await response
    .json()
    .catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
  const message = buildErrorMessage(response.status, errorBody.message);

  if (response.status === 401) {
    clearStoredSession();
    notifyAuthChange("auth:changed");
    notifyAuthChange("auth:unauthorized");
  }

  throw new ApiError(message, response.status, errorBody);
};

const handleCustomerResponse = async <T>(response: Response): Promise<T> => {
  if (response.ok) {
    return response.json();
  }

  const errorBody = await response
    .json()
    .catch(() => ({ message: `HTTP ${response.status}: ${response.statusText}` }));
  const message = buildErrorMessage(response.status, errorBody.message);

  if (response.status === 401) {
    clearStoredCustomerSession();
    notifyAuthChange("auth:changed");
  }

  throw new ApiError(message, response.status, errorBody);
};

const handleFetchError = (error: Error): never => {
  if (error instanceof ApiError) {
    throw error;
  }

  if (error.message.includes("fetch") || error.message.includes("Failed to fetch")) {
    throw new Error(
      "The backend could not be reached. Confirm the API server is running, restart Vite after .env changes, and check for a browser CORS block between the frontend origin and VITE_API_BASE_URL."
    );
  }

  if (error.message.includes("NetworkError")) {
    throw new Error("A network error occurred while contacting the server.");
  }

  throw new Error(error.message || "Unexpected request error.");
};

export const authAPI = {
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: createHeaders(false),
        body: JSON.stringify({ email, password }),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async getProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/auth/me`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const adminAPI = {
  async updateProfile(data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/profile`, {
        method: "PUT",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin/change-password`, {
        method: "PUT",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const customersAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async getById(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async create(data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers`, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async update(id: string, data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: "PUT",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async delete(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}`, {
        method: "DELETE",
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async resetPortalPassword(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}/reset-portal-password`, {
        method: "POST",
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async addService(id: string, data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}/services`, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async updateService(id: string, serviceId: string, data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}/services/${serviceId}`, {
        method: "PUT",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async recordPayment(id: string, data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/customers/${id}/payments`, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const healthAPI = {
  async check() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const notificationsAPI = {
  async getStatus() {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/status`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async send(data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/notifications/send`, {
        method: "POST",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const customerAuthAPI = {
  async login(email: string, password: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/customer-auth/login`, {
        method: "POST",
        headers: createCustomerHeaders(false),
        body: JSON.stringify({ email, password }),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async getProfile() {
    try {
      const response = await fetch(`${API_BASE_URL}/customer-auth/me`, {
        headers: createCustomerHeaders(),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async changePassword(data: { currentPassword: string; newPassword: string }) {
    try {
      const response = await fetch(`${API_BASE_URL}/customer-auth/change-password`, {
        method: "PUT",
        headers: createCustomerHeaders(),
        body: JSON.stringify(data),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const portalAPI = {
  async getDashboard() {
    try {
      const response = await fetch(`${API_BASE_URL}/portal/dashboard`, {
        headers: createCustomerHeaders(),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async createServiceRequest(data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/portal/service-requests`, {
        method: "POST",
        headers: createCustomerHeaders(),
        body: JSON.stringify(data),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const serviceRequestsAPI = {
  async getAll(status?: string) {
    try {
      const suffix = status ? `?status=${encodeURIComponent(status)}` : "";
      const response = await fetch(`${API_BASE_URL}/service-requests${suffix}`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async review(id: string, data: unknown) {
    try {
      const response = await fetch(`${API_BASE_URL}/service-requests/${id}/review`, {
        method: "PUT",
        headers: createHeaders(),
        body: JSON.stringify(data),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const adminNotificationsAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-notifications`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async markRead(id: string) {
    try {
      const response = await fetch(`${API_BASE_URL}/admin-notifications/${id}/read`, {
        method: "PUT",
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};

export const plansAPI = {
  async getAll() {
    try {
      const response = await fetch(`${API_BASE_URL}/plans`, {
        headers: createHeaders(),
      });

      return await handleResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },

  async getPortalPlans() {
    try {
      const response = await fetch(`${API_BASE_URL}/plans/portal`, {
        headers: createCustomerHeaders(),
      });

      return await handleCustomerResponse(response);
    } catch (error) {
      return handleFetchError(error as Error);
    }
  },
};
