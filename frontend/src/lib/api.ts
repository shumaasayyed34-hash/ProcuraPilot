import { User, AuthResponse, UploadedDocument } from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000/api/v1";

class ApiService {
  public getToken(): string | null {
    if (typeof window === "undefined") return null;
    return localStorage.getItem("procurapilot_token");
  }

  private setToken(token: string) {
    if (typeof window !== "undefined") {
      localStorage.setItem("procurapilot_token", token);
      document.cookie = `procurapilot_token=${token}; path=/; max-age=86400; SameSite=Lax`;
    }
  }

  public removeToken() {
    if (typeof window !== "undefined") {
      localStorage.removeItem("procurapilot_token");
      document.cookie = "procurapilot_token=; path=/; max-age=0";
    }
  }

  async login(payload: { email: string; password: string }): Promise<AuthResponse> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Invalid email or password" }));
        let msg = "Authentication failed";
        if (typeof errorData.detail === "string") {
          msg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          msg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
        }
        throw new Error(msg);
      }

      const data: AuthResponse = await res.json();
      this.setToken(data.access_token);

      // Fetch user profile from /auth/me with the newly received token
      try {
        const profile = await this.getMe();
        data.user = profile;
      } catch {
        data.user = {
          id: 1,
          email: payload.email,
          full_name: payload.email.split("@")[0],
          role: "buyer",
          is_active: true,
          created_at: new Date().toISOString(),
        };
      }

      return data;
    } catch (err: any) {
      // If backend is offline or network fails, gracefully allow mock dev login for UI testing
      const isNetworkError =
        err instanceof TypeError ||
        (err.message && (err.message.includes("fetch") || err.message.includes("Network")));
      if (isNetworkError) {
        console.warn(`FastAPI backend at ${API_BASE} not reachable. Using dev simulated session.`);
        const mockToken = "mock_jwt_token_for_phase1_testing";
        this.setToken(mockToken);
        return {
          access_token: mockToken,
          token_type: "bearer",
          user: {
            id: 1,
            email: payload.email,
            full_name: payload.email.split("@")[0],
            role: "buyer",
            is_active: true,
            created_at: new Date().toISOString(),
          },
        };
      }
      throw err;
    }
  }

  async register(payload: {
    email: string;
    password: string;
    full_name?: string;
    role?: string;
  }): Promise<User> {
    // Map frontend roles ("buyer", "manager") to backend schema enum ("procurement_manager", "admin", "viewer")
    const roleMapping: Record<string, string> = {
      buyer: "procurement_manager",
      manager: "procurement_manager",
      admin: "admin",
      viewer: "viewer",
    };
    const mappedRole = roleMapping[payload.role || "buyer"] || "procurement_manager";

    const backendPayload = {
      email: payload.email,
      password: payload.password,
      full_name: payload.full_name,
      role: mappedRole,
    };

    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(backendPayload),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({ detail: "Registration failed" }));
        let msg = "Registration failed";
        if (typeof errorData.detail === "string") {
          msg = errorData.detail;
        } else if (Array.isArray(errorData.detail)) {
          msg = errorData.detail.map((d: any) => d.msg || JSON.stringify(d)).join("; ");
        }
        throw new Error(msg);
      }

      const registeredUser: User = await res.json();

      // Automatically log the user in to acquire a real JWT token immediately
      try {
        await this.login({ email: payload.email, password: payload.password });
      } catch (loginErr) {
        console.warn("Auto-login after registration could not obtain token:", loginErr);
      }

      return registeredUser;
    } catch (err: any) {
      const isNetworkError =
        err instanceof TypeError ||
        (err.message && (err.message.includes("fetch") || err.message.includes("Network")));
      if (isNetworkError) {
        console.warn(`FastAPI backend at ${API_BASE} not reachable. Using dev simulated registration.`);
        const mockUser: User = {
          id: Date.now(),
          email: payload.email,
          full_name: payload.full_name || null,
          role: (payload.role as any) || "buyer",
          is_active: true,
          created_at: new Date().toISOString(),
        };
        this.setToken("mock_jwt_token_for_phase1_testing");
        return mockUser;
      }
      throw err;
    }
  }

  async getMe(): Promise<User> {
    const token = this.getToken();
    if (!token) throw new Error("No token found");

    if (token === "mock_jwt_token_for_phase1_testing") {
      return {
        id: 101,
        email: "faisal@procurapilot.ai",
        full_name: "Faisal Sakware",
        role: "admin",
        is_active: true,
        created_at: "2026-09-27T10:00:00Z",
      };
    }

    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      this.removeToken();
      throw new Error("Session expired or invalid");
    }

    return await res.json();
  }

  // Document Upload API call (connects to real Phase 1 extraction endpoint)
  async uploadDocument(
    file: File,
    rfqId?: number,
    supplierId?: number,
    onProgress?: (percent: number) => void
  ): Promise<any> {
    const formData = new FormData();
    formData.append("file", file);
    if (rfqId) {
      formData.append("rfq_id", String(rfqId));
    }
    if (supplierId) {
      formData.append("supplier_id", String(supplierId));
    }
    formData.append("auto_ingest", "true");

    const token = this.getToken();

    const res = await fetch(`${API_BASE}/extraction/upload`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: formData,
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({ detail: "Extraction failed" }));
      const msg =
        typeof errData.detail === "string"
          ? errData.detail
          : errData.detail?.message || "Failed to extract quotation data from document";
      throw new Error(msg);
    }

    return await res.json();
  }

  // RFQ API Methods
  async getRFQOptions(): Promise<{
    suppliers: Array<{ id: number; name: string; email?: string; phone?: string; country?: string; iso_certified: boolean }>;
    categories: string[];
    currencies: string[];
    units: string[];
    payment_terms_options: string[];
    dispatch_methods: string[];
    shipment_types: string[];
  }> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/options`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to load RFQ options");
    return await res.json();
  }

  async createRFQ(payload: any): Promise<any> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: "Failed to create RFQ" }));
      throw new Error(typeof err.detail === "string" ? err.detail : "Failed to create RFQ");
    }
    return await res.json();
  }

  async getRFQs(): Promise<any[]> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error("Failed to fetch RFQs");
    return await res.json();
  }

  async getRFQById(id: number): Promise<any> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/${id}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      cache: "no-store",
    });
    if (!res.ok) throw new Error("RFQ not found");
    return await res.json();
  }

  async generateRFQ(id: number): Promise<any> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/${id}/generate`, {
      method: "POST",
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to generate RFQ");
    return await res.json();
  }

  async downloadRFQPDF(id: number, rfqNumber?: string): Promise<void> {
    const token = this.getToken();
    const res = await fetch(`${API_BASE}/rfqs/${id}/pdf`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error("Failed to download RFQ PDF");
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `RFQ-${rfqNumber || id}.pdf`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  }
}

export const api = new ApiService();

