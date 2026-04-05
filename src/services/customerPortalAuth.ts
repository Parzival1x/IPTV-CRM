import { ApiError, customerAuthAPI } from "./api";
import type { CustomerPaymentSummary, CustomerSubscription } from "../data/customersDB";

const TOKEN_KEY = "customer_token";
const USER_KEY = "customer_user";

type StoragePreference = "local" | "session";

const emitAuthChanged = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("auth:changed"));
  }
};

const getStorage = (preference: StoragePreference) =>
  preference === "local" ? localStorage : sessionStorage;

const getActiveStorage = (): Storage | null => {
  if (localStorage.getItem(TOKEN_KEY)) {
    return localStorage;
  }

  if (sessionStorage.getItem(TOKEN_KEY)) {
    return sessionStorage;
  }

  return null;
};

const clearAllAuthState = () => {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  sessionStorage.removeItem(TOKEN_KEY);
  sessionStorage.removeItem(USER_KEY);
};

const persistAuthState = (user: PortalCustomer, token: string, rememberMe: boolean) => {
  clearAllAuthState();
  const storage = getStorage(rememberMe ? "local" : "session");
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChanged();
};

const updatePersistedUser = (user: PortalCustomer, emitChange = false) => {
  const storage = getActiveStorage();

  if (!storage) {
    return;
  }

  storage.setItem(USER_KEY, JSON.stringify(user));

  if (emitChange) {
    emitAuthChanged();
  }
};

export interface PortalCustomer {
  id: string;
  name: string;
  email: string;
  customerCode: string;
  serviceId: string;
  phone?: string;
  whatsappNumber?: string;
  portalLastLogin?: string | null;
  portalResetRequired?: boolean;
  subscriptions: CustomerSubscription[];
  paymentSummary?: CustomerPaymentSummary;
}

type LoginResponse = {
  success: boolean;
  token: string;
  customer: PortalCustomer;
  message?: string;
};

type ProfileResponse = {
  success: boolean;
  customer?: PortalCustomer;
  message?: string;
};

export const customerPortalAuthService = {
  async signIn(email: string, password: string, rememberMe = false) {
    try {
      const response = (await customerAuthAPI.login(email, password)) as LoginResponse;

      if (!response.success || !response.customer || !response.token) {
        return {
          success: false,
          error: response.message || "Portal login failed.",
        };
      }

      persistAuthState(response.customer, response.token, rememberMe);
      return {
        success: true,
        customer: response.customer,
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Portal login failed.",
      };
    }
  },

  signOut() {
    clearAllAuthState();
    emitAuthChanged();
  },

  getCurrentCustomer(): PortalCustomer | null {
    const storage = getActiveStorage();

    if (!storage) {
      return null;
    }

    const value = storage.getItem(USER_KEY);

    if (!value) {
      return null;
    }

    try {
      return JSON.parse(value);
    } catch {
      clearAllAuthState();
      return null;
    }
  },

  isAuthenticated() {
    return Boolean(
      (localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY)) &&
        this.getCurrentCustomer()
    );
  },

  async validateSession() {
    if (!(localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY))) {
      return false;
    }

    try {
      const response = (await customerAuthAPI.getProfile()) as ProfileResponse;

      if (!response.success || !response.customer) {
        this.signOut();
        return false;
      }

      updatePersistedUser(response.customer, false);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.signOut();
        return false;
      }

      return this.isAuthenticated();
    }
  },

  async changePassword(currentPassword: string, newPassword: string) {
    try {
      const response = (await customerAuthAPI.changePassword({
        currentPassword,
        newPassword,
      })) as ProfileResponse;

      if (!response.success || !response.customer) {
        return {
          success: false,
          error: response.message || "Unable to change password.",
        };
      }

      updatePersistedUser(response.customer, true);
      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unable to change password.",
      };
    }
  },
};
