import apiService from './api';
import { Contact, CreateContactRequest, UpdateContactRequest, ContactsListRequest, ContactsListResponse, ImportRequest, ImportResponse } from '../types/contacts';

class ContactsService {
  async getContacts(params?: ContactsListRequest): Promise<ContactsListResponse> {
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
    const response = await apiService.getContacts(params);
    return response;
  }

  async getContact(id: number): Promise<{ success: boolean; contact: Contact }> {
    const response = await apiService.getContact(id);
    return response;
  }

  async createContact(contact: CreateContactRequest): Promise<{ success: boolean; contact: Contact; message: string }> {
    const response = await apiService.createContact(contact);
    return response;
  }

  async updateContact(id: number, contact: UpdateContactRequest): Promise<{ success: boolean; contact: Contact; message: string }> {
    const response = await apiService.updateContact(id, contact);
    return response;
  }

  async deleteContact(id: number): Promise<{ success: boolean; message: string }> {
    const response = await apiService.deleteContact(id);
    return response;
  }

  async importContacts(importData: ImportRequest): Promise<ImportResponse> {
    const response = await apiService.importContacts(importData);
    return response.result;
  }

  async validateContact(contact: any): Promise<{ success: boolean; validation: any }> {
    const response = await apiService.validateContact(contact);
    return response;
  }

  // CSV Import methods
  async previewCSV(formData: FormData): Promise<{
    preview: any[];
    totalRows: number;
    columns: string[];
  }> {
    const response = await apiService.previewCSV(formData);
    return response;
  }

  async importCSV(formData: FormData): Promise<{
    message: string;
    results: {
      success: number;
      failed: number;
      duplicates: number;
      errors: Array<{ row: number; error: string; data: any }>;
    };
  }> {
    const response = await apiService.importCSV(formData);
    return response;
  }

  async getContactStats(): Promise<{ success: boolean; stats: any }> {
    const response = await apiService.getContactStats();
    return response;
  }

  // VCF Import methods
  async previewVCF(formData: FormData): Promise<{
    preview: any[];
    totalContacts: number;
    supportedFields: string[];
  }> {
    console.log('VCF preview service not fully implemented yet - trying API call');
    try {
      const response = await apiService.previewVCF(formData);
      return response;
    } catch (error) {
      console.log('VCF preview API not available, throwing error');
      throw error;
    }
  }

  async importVCF(formData: FormData): Promise<{
    message: string;
    results: {
      success: number;
      failed: number;
      duplicates: number;
      errors: Array<{ row: number; error: string; data: any }>;
    };
  }> {
    console.log('VCF import service not fully implemented yet - trying API call');
    try {
      const response = await apiService.importVCF(formData);
      return response;
    } catch (error) {
      console.log('VCF import API not available, throwing error');
      throw error;
    }
  }

  // Phone Contacts Import methods
  async importPhoneContacts(contacts: any[]): Promise<{
    message: string;
    results: {
      success: number;
      failed: number;
      duplicates: number;
      errors: Array<{ row: number; error: string; data: any }>;
    };
  }> {
    console.log('Phone contacts import service not fully implemented yet - trying API call');
    try {
      const response = await apiService.importPhoneContacts(contacts);
      return response;
    } catch (error) {
      console.log('Phone contacts import API not available, throwing error');
      throw error;
    }
  }
}

export const contactsService = new ContactsService();
