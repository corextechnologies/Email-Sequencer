import axios, { AxiosInstance, AxiosError } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  LoginRequest,
  RegisterRequest,
  AuthResponse,
  ApiResponse,
  User,
  EmailAccount,
  CreateEmailAccountRequest
} from '../types';

// For development - use your computer's IP address instead of localhost
// You can find your IP by running: ipconfig (Windows) or ifconfig (Mac/Linux)
const getBaseURL = () => {
  // Check if running on Expo Go or development
  if (__DEV__) {
    // Use your computer's IP address for mobile development
    return 'http://192.168.100.131:3000/api';
  }
  // For production, use your deployed API URL
  return 'https://your-api-domain.com/api';
};

 const BASE_URL = getBaseURL();

// const BASE_URL = 'http://localhost:3000/api';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: BASE_URL,
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.api.interceptors.request.use(async (config) => {
      const token = await AsyncStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    });

    // Response interceptor for error handling
    this.api.interceptors.response.use(
      (response) => {
        console.log('✅ API Response:', response.config.url, response.status);
        return response;
      },
      (error: AxiosError) => {
        console.error('❌ API Error:', {
          url: error.config?.url,
          method: error.config?.method,
          status: error.response?.status,
          message: error.message,
          code: error.code
        });

        if (error.response?.status === 401) {
          // Token expired or invalid, clear storage
          console.log('🔐 401 Unauthorized - clearing auth data');
          AsyncStorage.removeItem('authToken');
          AsyncStorage.removeItem('user');

          // You might want to emit an event or use a callback here
          // to notify the AuthContext that the user should be logged out
        }
        return Promise.reject(error);
      }
    );
  }

  // Generic HTTP helpers (for new modules like campaigns)
  async get(url: string, config?: any): Promise<any> {
    return this.api.get(url, config);
  }

  async post(url: string, data?: any, config?: any): Promise<any> {
    return this.api.post(url, data, config);
  }

  async put(url: string, data?: any, config?: any): Promise<any> {
    return this.api.put(url, data, config);
  }

  async patch(url: string, data?: any, config?: any): Promise<any> {
    return this.api.patch(url, data, config);
  }

  async delete(url: string, config?: any): Promise<any> {
    return this.api.delete(url, config);
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/login', credentials);
    return response.data.data;
  }

  async register(userData: RegisterRequest): Promise<AuthResponse> {
    const response = await this.api.post<ApiResponse<AuthResponse>>('/auth/register', userData);
    return response.data.data;
  }

  async getMe(): Promise<User> {
    const response = await this.api.get<ApiResponse<{ user: User }>>('/auth/me');
    return response.data.data.user;
  }

  // Email account endpoints
  async getEmailAccounts(): Promise<EmailAccount[]> {
    const response = await this.api.get<ApiResponse<EmailAccount[]>>('/email-accounts');
    return response.data.data;
  }

  async createEmailAccount(accountData: CreateEmailAccountRequest): Promise<EmailAccount> {
    const response = await this.api.post<ApiResponse<EmailAccount>>('/email-accounts', accountData);
    return response.data.data;
  }

  async updateEmailAccount(id: number, accountData: Partial<CreateEmailAccountRequest>): Promise<EmailAccount> {
    const response = await this.api.put<ApiResponse<EmailAccount>>(`/email-accounts/${id}`, accountData);
    return response.data.data;
  }

  async deleteEmailAccount(id: number): Promise<void> {
    await this.api.delete(`/email-accounts/${id}`);
  }

  async toggleEmailAccountStatus(id: number): Promise<EmailAccount> {
    const response = await this.api.patch<ApiResponse<EmailAccount>>(`/email-accounts/${id}/toggle-status`);
    return response.data.data;
  }

  // Contacts endpoints
  async getContacts(params?: any): Promise<any> {
    const queryParams = new URLSearchParams();

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          if (Array.isArray(value)) {
            queryParams.append(key, value.join(','));
          } else {
            queryParams.append(key, value.toString());
          }
        }
      });
    }

    const url = `/contacts${queryParams.toString() ? `?${queryParams.toString()}` : ''}`;
    const response = await this.api.get<any>(url);
    return response.data;
  }

  async getContact(id: number): Promise<any> {
    const response = await this.api.get<any>(`/contacts/${id}`);
    return response.data;
  }

  async createContact(contact: any): Promise<any> {
    const response = await this.api.post<any>('/contacts', contact);
    return response.data;
  }

  async updateContact(id: number, contact: any): Promise<any> {
    const response = await this.api.put<any>(`/contacts/${id}`, contact);
    return response.data;
  }

  async deleteContact(id: number): Promise<any> {
    const response = await this.api.delete<any>(`/contacts/${id}`);
    return response.data;
  }

  async importContacts(importData: any): Promise<any> {
    const response = await this.api.post<any>('/contacts/import', importData);
    return response.data;
  }

  async validateContact(contact: any): Promise<any> {
    const response = await this.api.post<any>('/contacts/validate', contact);
    return response.data;
  }

  async getContactStats(): Promise<any> {
    const response = await this.api.get<any>('/contacts/stats');
    return response.data;
  }

  // VCF Import methods
  async previewVCF(formData: FormData): Promise<any> {
    console.log('VCF preview API - calling backend endpoint');
    const response = await this.api.post('/contacts/import-vcf/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async importVCF(formData: FormData): Promise<any> {
    console.log('VCF import API - calling backend endpoint');
    const response = await this.api.post('/contacts/import-vcf', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // Phone Contacts Import methods
  async importPhoneContacts(contacts: any[]): Promise<any> {
    console.log('Phone contacts import API - calling backend endpoint');
    const response = await this.api.post('/contacts/import-phone', { contacts });
    return response.data;
  }

  // CSV Import methods
  async previewCSV(formData: FormData): Promise<any> {
    const response = await this.api.post('/contacts/import-csv/preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async importCSV(formData: FormData): Promise<any> {
    const response = await this.api.post('/contacts/import-csv', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  // LLM key endpoints
  async testLlmKey(provider: string, apiKey: string): Promise<{ valid: boolean; error?: string }> {
    const response = await this.api.post('/llm/testKey', { provider, apiKey });
    // backend success => { success: true, data: { valid: true } }
    if (response.data?.data?.valid) {
      return { valid: true };
    }
    return { valid: false, error: response.data?.error?.message || 'Invalid key' };
  }

  async saveLlmKey(provider: string, apiKey: string): Promise<{ success: boolean }> {
    console.log('🔑 Saving LLM key:', { provider, apiKeyLength: apiKey.length });
    try {
      const response = await this.api.post('/llm/saveKey', { provider, apiKey });
      console.log('✅ Save response:', response.data);
      return { success: Boolean(response.data?.success) };
    } catch (error: any) {
      console.error('❌ Save key error:', error.response?.data || error.message);
      throw error;
    }
  }

  async getSavedLlmProviders(): Promise<string[]> {
    const response = await this.api.get('/settings/llm-keys');
    return response.data?.data?.providers || [];
  }

  async getSavedLlmKeys(): Promise<{ provider: string; hasKey: boolean; updatedAt: string }[]> {
    console.log('🔍 Fetching saved LLM keys...');
    try {
      const response = await this.api.get('/settings/llm-keys/detailed');
      console.log('📋 Keys response:', response.data);
      return response.data?.data?.keys || [];
    } catch (error: any) {
      console.error('❌ Error fetching keys:', error.response?.data || error.message);
      throw error;
    }
  }

  async updateLlmKey(provider: string, apiKey: string): Promise<{ success: boolean }> {
    const response = await this.api.put('/settings/llm-keys', { provider, api_key: apiKey });
    return { success: Boolean(response.data?.success) };
  }

  async deleteLlmKey(provider: string): Promise<{ success: boolean }> {
    const response = await this.api.delete(`/settings/llm-keys/${provider}`);
    return { success: Boolean(response.data?.success) };
  }

  // Persona generation endpoints
  async generatePersonas(data: {
    provider?: string; // Optional - will auto-detect if not provided
    questionnaireData: {
      companyName: string;
      industry: string;
      description: string;
      products: string;
      targetAudience: string;
      challenges: string;
      valueProposition: string;
    };
    options: {
      generateMultiple: boolean;
      enhanceWithIndustryInsights: boolean;
    };
  }): Promise<{ personaIds: string[]; count: number }> {
    console.log('🎯 Generating personas with data:', data);
    try {
      const response = await this.api.post('/personas/generate', data);
      console.log('✅ Persona generation response:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Persona generation error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Persona CRUD operations
  async getPersonas(params?: { page?: number; limit?: number }): Promise<{ personas: any[]; count: number }> {
    console.log('📋 Fetching personas...');
    try {
      const query = new URLSearchParams();
      if (params?.page !== undefined) query.append('page', String(params.page));
      if (params?.limit !== undefined) query.append('limit', String(params.limit));
      const url = `/personas${query.toString() ? `?${query.toString()}` : ''}`;
      const response = await this.api.get(url);
      console.log('✅ Personas fetched:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error fetching personas:', error.response?.data || error.message);
      throw error;
    }
  }

  // Persona suggestion for a contact
  async suggestPersonaForContact(contactId: number, opts?: { provider?: string; apiKey?: string }): Promise<any> {
    try {
      const response = await this.api.post(`/contacts/${contactId}/suggest-persona`, opts || {});
      return response.data;
    } catch (error: any) {
      console.error('❌ Suggest persona error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Generate email sequence for a contact
  async generateEmailSequence(contactId: number, sequenceParams: {
    numberOfEmails: number;
    schedule: string[];
    primaryGoal: string;
  }): Promise<any> {
    try {
      console.log('📧 Generating email sequence for contact:', contactId);
      const response = await this.api.post(`/contacts/${contactId}/generate-email-sequence`, {
        sequenceParams
      });
      console.log('✅ Email sequence generated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Email sequence generation error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Save email sequence to campaign_emails table
  async saveCampaignEmailSequence(campaignId: number, contactId: number, emails: any[]): Promise<any> {
    try {
      console.log('💾 Saving email sequence to campaign:', campaignId, 'contact:', contactId);
      const response = await this.api.post(`/campaigns/${campaignId}/emails/save-sequence`, {
        contactId,
        emails
      });
      console.log('✅ Email sequence saved:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Save email sequence error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Get saved email sequence for a contact in a campaign
  async getCampaignEmailSequence(campaignId: number, contactId: number): Promise<any> {
    try {
      console.log('📧 Fetching saved emails for campaign:', campaignId, 'contact:', contactId);
      const response = await this.api.get(`/campaigns/${campaignId}/emails/contact/${contactId}`);
      console.log('✅ Saved emails fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Get saved emails error:', error.response?.data || error.message);
      throw error;
    }
  }

  // Update persona for a contact in a campaign
  async updateCampaignContactPersona(campaignId: number, contactId: number, personaId: string): Promise<any> {
    try {
      console.log('💾 Updating persona for campaign contact:', campaignId, contactId, personaId);
      const response = await this.api.patch(`/campaigns/${campaignId}/contacts/${contactId}/persona`, {
        personaId
      });
      console.log('✅ Persona updated:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Update persona error:', error.response?.data || error.message);
      throw error;
    }
  }


  async getPersona(id: string): Promise<any> {
    console.log('👤 Fetching persona:', id);
    try {
      const response = await this.api.get(`/personas/${id}`);
      console.log('✅ Persona fetched:', response.data);
      return response.data.data.persona;
    } catch (error: any) {
      console.error('❌ Error fetching persona:', error.response?.data || error.message);
      throw error;
    }
  }

  async updatePersona(id: string, data: any): Promise<any> {
    console.log('✏️ Updating persona:', id, data);
    try {
      const response = await this.api.put(`/personas/${id}`, data);
      console.log('✅ Persona updated:', response.data);
      return response.data.data.persona;
    } catch (error: any) {
      console.error('❌ Error updating persona:', error.response?.data || error.message);
      throw error;
    }
  }

  async deletePersona(id: string): Promise<{ message: string; deletedId: string }> {
    console.log('🗑️ Deleting persona:', id);
    try {
      const response = await this.api.delete(`/personas/${id}`);
      console.log('✅ Persona deleted:', response.data);
      return response.data.data;
    } catch (error: any) {
      console.error('❌ Error deleting persona:', error.response?.data || error.message);
      throw error;
    }
  }

  // ApiService class ke andar add karo
  async scanWebsite(url: string): Promise<any> {
    console.log('🔍 Calling website scan API with URL:', url);
    const response = await this.post('/website/scan', { url }); // /website/scan route call ho raha hai
    return response.data; // backend se aaya hua JSON return
  }

  // Enrich contact endpoint
  async enrichContact(
    contactId: number, 
    options?: { 
      provider?: string; 
      apiKey?: string;
    }
  ): Promise<any> {
    console.log('🔍 Enriching contact:', contactId);
    try {
      // Send optional provider and apiKey in body
      // If not provided, backend will auto-detect from saved keys
      const response = await this.api.post(`/contacts/${contactId}/enrich`, options || {});
      console.log('✅ Contact enriched successfully:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error enriching contact:', error.response?.data || error.message);
      console.error('❌ Full error details:', JSON.stringify(error.response?.data, null, 2));
      throw error;
    }
  }

  // Get enriched data for a contact
  async getEnrichedData(contactId: number): Promise<any> {
    console.log('📋 Fetching enriched data for contact:', contactId);
    try {
      const response = await this.api.get(`/contacts/${contactId}/enriched-data`);
      console.log('✅ Enriched data fetched:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Error fetching enriched data:', error.response?.data || error.message);
      throw error;
    }
  }

}

export default new ApiService();
