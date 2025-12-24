// API configuration and base client
export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('access_token', token);
  }

  clearToken() {
    this.token = null;
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!response.ok) {
      this.clearToken();
      window.location.href = '/login';
      throw new Error('Token refresh failed');
    }

    const data = await response.json();
    this.setToken(data.access_token);
    localStorage.setItem('refresh_token', data.refresh_token);
    console.log('[Auth] ✓ Token rafraîchi');
    return data.access_token;
  }

  private onTokenRefreshed(token: string) {
    this.refreshSubscribers.forEach(callback => callback(token));
    this.refreshSubscribers = [];
  }

  private addRefreshSubscriber(callback: (token: string) => void) {
    this.refreshSubscribers.push(callback);
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    isRetry: boolean = false
  ): Promise<T> {
    const isFormData = options.body instanceof FormData;

    // Don't set Content-Type for FormData - browser will set it with boundary
    const headers: HeadersInit = isFormData
      ? { ...options.headers }
      : {
        'Content-Type': 'application/json',
        ...options.headers,
      };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const url = `${this.baseURL}${endpoint}`;
    const method = options.method || 'GET';

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      if (!response.ok) {
        // Handle 401 Unauthorized - token expired
        if (response.status === 401 && !isRetry && endpoint !== '/auth/refresh') {
          if (this.isRefreshing) {
            // Wait for token refresh to complete
            return new Promise((resolve, reject) => {
              this.addRefreshSubscriber((token: string) => {
                // Retry with new token
                this.request<T>(endpoint, options, true)
                  .then(resolve)
                  .catch(reject);
              });
            });
          }

          this.isRefreshing = true;
          try {
            const newToken = await this.refreshToken();
            this.isRefreshing = false;
            this.onTokenRefreshed(newToken);
            // Retry original request with new token
            return this.request<T>(endpoint, options, true);
          } catch (error) {
            this.isRefreshing = false;
            throw error;
          }
        }

        const error: ApiError = await response.json().catch(() => ({
          message: 'Une erreur est survenue',
          statusCode: response.status,
        }));
        console.error(`[API] ${method} ${endpoint} - Erreur ${response.status}`);
        throw error;
      }

      if (response.status === 204) {
        return null as T;
      }

      const data = await response.json();
      const count = Array.isArray(data) ? ` (${data.length} items)` : '';
      console.log(`[API] ${method} ${endpoint} - ${response.status}${count}`);
      return data;
    } catch (error) {
      if (error instanceof Error && !(error as any).statusCode) {
        console.error(`[API] ${method} ${endpoint} - Échec réseau`);
      }
      throw error;
    }
  }

  async get<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const isFormData = data instanceof FormData;

    return this.request<T>(endpoint, {
      method: 'POST',
      body: isFormData ? data : JSON.stringify(data),
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async download(endpoint: string): Promise<Blob> {
    // Basic download without JSON parsing
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${endpoint}`, {
      method: 'GET',
      headers,
    });

    if (!response.ok) {
      throw new Error(`Download failed: ${response.statusText}`);
    }

    return response.blob();
  }
}

export const api = new ApiClient(API_URL);
