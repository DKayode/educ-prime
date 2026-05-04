// API configuration and base client
export const API_URL = import.meta.env.VITE_API_URL || '/backend';

const DEFAULT_COUNTRY = 'benin';

// Endpoints the country middleware allowlists — no ?country= needed.
const COUNTRY_FREE_PATHS = [/^\/countries(\/|$)/, /^\/health/];

interface ApiError {
  message: string;
  statusCode: number;
  error?: string;
}

class ApiClient {
  private baseURL: string;
  private token: string | null = null;
  private country: string;
  private isRefreshing: boolean = false;
  private refreshSubscribers: Array<(token: string) => void> = [];

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.token = localStorage.getItem('access_token');
    this.country = localStorage.getItem('country') || DEFAULT_COUNTRY;
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

  setCountry(country: string) {
    this.country = country;
    localStorage.setItem('country', country);
  }

  getCountry(): string {
    return this.country;
  }

  clearCountry() {
    this.country = DEFAULT_COUNTRY;
    localStorage.removeItem('country');
  }

  private isCountryFree(endpoint: string): boolean {
    const path = endpoint.split('?')[0];
    return COUNTRY_FREE_PATHS.some((re) => re.test(path));
  }

  private withCountryQuery(endpoint: string): string {
    if (this.isCountryFree(endpoint)) return endpoint;
    const separator = endpoint.includes('?') ? '&' : '?';
    return `${endpoint}${separator}country=${encodeURIComponent(this.country)}`;
  }

  // For JSON write requests we put pays in the body instead of as a query
  // param; FormData / non-objects fall back to the query path.
  private withCountryBody<T>(data: T, endpoint: string): T {
    if (this.isCountryFree(endpoint)) return data;
    if (data == null || typeof data !== 'object' || Array.isArray(data) || data instanceof FormData) {
      return data;
    }
    return { ...(data as any), pays: this.country } as T;
  }

  private async refreshToken(): Promise<string> {
    const refreshToken = localStorage.getItem('refresh_token');
    if (!refreshToken) {
      throw new Error('No refresh token available');
    }

    const response = await fetch(`${this.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken, pays: this.country }),
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
    return this.request<T>(this.withCountryQuery(endpoint), { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, options?: RequestInit): Promise<T> {
    const isFormData = data instanceof FormData;
    if (isFormData) {
      // Body is multipart — fall back to ?country= so the middleware can pick
      // it up before multer parses the form fields.
      return this.request<T>(this.withCountryQuery(endpoint), {
        method: 'POST',
        body: data,
        ...options,
      });
    }
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(this.withCountryBody(data, endpoint)),
      ...options,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<T> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(this.withCountryBody(data, endpoint)),
    });
  }

  async patch<T>(endpoint: string, data?: any): Promise<T> {
    const isFormData = data instanceof FormData;
    if (isFormData) {
      return this.request<T>(this.withCountryQuery(endpoint), {
        method: 'PATCH',
        body: data,
      });
    }
    return this.request<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(this.withCountryBody(data, endpoint)),
    });
  }

  async delete<T>(endpoint: string): Promise<T> {
    // DELETE targets a resource by id, so the row's pays is implicit. The
    // rare endpoints that delete across rows by name take ?country= in the
    // URL they pass us — we don't auto-append.
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  async download(endpoint: string): Promise<Blob> {
    // Basic download without JSON parsing
    const headers: HeadersInit = {};
    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(`${this.baseURL}${this.withCountryQuery(endpoint)}`, {
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
