import { adminAPI, authAPI, ApiError } from "./api";

const TOKEN_KEY = "admin_token";
const USER_KEY = "admin_user";

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

const persistAuthState = (user: AdminUser, token: string, rememberMe: boolean) => {
  clearAllAuthState();

  const storage = getStorage(rememberMe ? "local" : "session");
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(USER_KEY, JSON.stringify(user));
  emitAuthChanged();
};

const updatePersistedUser = (user: AdminUser, emitChange = false) => {
  const storage = getActiveStorage();

  if (!storage) {
    return;
  }

  storage.setItem(USER_KEY, JSON.stringify(user));

  if (emitChange) {
    emitAuthChanged();
  }
};

export interface AdminUser {
  id: string;
  name: string;
  email: string;
  role: "super-admin" | "admin" | "moderator";
  avatar?: string;
  isActive: boolean;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthResult {
  success: boolean;
  user?: AdminUser;
  token?: string;
  error?: string;
}

type LoginResponse = {
  success: boolean;
  message?: string;
  token: string;
  admin: AdminUser;
};

type ProfileResponse = {
  success: boolean;
  message?: string;
  admin?: AdminUser;
};

type ChangePasswordResponse = {
  success: boolean;
  message?: string;
};

export const authService = {
  async signIn(
    email: string,
    password: string,
    rememberMe = false
  ): Promise<AuthResult> {
    try {
      const response = (await authAPI.login(email, password)) as LoginResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.message || "Login failed.",
        };
      }

      const { token, admin } = response;
      persistAuthState(admin, token, rememberMe);

      return {
        success: true,
        user: admin,
        token,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "An unexpected error occurred during sign in.",
      };
    }
  },

  signOut(): void {
    clearAllAuthState();
    emitAuthChanged();
  },

  getCurrentUser(): AdminUser | null {
    const storage = getActiveStorage();

    if (!storage) {
      return null;
    }

    const userString = storage.getItem(USER_KEY);

    if (!userString) {
      return null;
    }

    try {
      return JSON.parse(userString);
    } catch {
      clearAllAuthState();
      emitAuthChanged();
      return null;
    }
  },

  getCurrentToken(): string | null {
    return localStorage.getItem(TOKEN_KEY) || sessionStorage.getItem(TOKEN_KEY);
  },

  isAuthenticated(): boolean {
    return Boolean(this.getCurrentToken() && this.getCurrentUser());
  },

  async validateSession(): Promise<boolean> {
    if (!this.getCurrentToken()) {
      return false;
    }

    try {
      const response = (await authAPI.getProfile()) as ProfileResponse;

      if (!response?.success || !response.admin) {
        this.signOut();
        return false;
      }

      updatePersistedUser(response.admin, false);
      return true;
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        this.signOut();
        return false;
      }

      return this.isAuthenticated();
    }
  },

  async updateProfile(updates: Partial<AdminUser>): Promise<AuthResult> {
    try {
      const currentUser = this.getCurrentUser();

      if (!currentUser) {
        return {
          success: false,
          error: "No authenticated user found.",
        };
      }

      const response = (await adminAPI.updateProfile(updates)) as ProfileResponse;

      if (!response.success || !response.admin) {
        return {
          success: false,
          error: response.message || "Unable to update profile.",
        };
      }

      updatePersistedUser(response.admin, true);

      return {
        success: true,
        user: response.admin,
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to update profile at the moment.",
      };
    }
  },

  async changePassword(
    currentPassword: string,
    newPassword: string
  ): Promise<{ success: boolean; error?: string }> {
    try {
      const response = (await adminAPI.changePassword({
        currentPassword,
        newPassword,
      })) as ChangePasswordResponse;

      if (!response.success) {
        return {
          success: false,
          error: response.message || "Unable to change password.",
        };
      }

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to change password at the moment.",
      };
    }
  },
};
