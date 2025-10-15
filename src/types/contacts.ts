// Contact-related TypeScript interfaces and types

// Base types
export type ContactStatus = 'active' | 'inactive' | 'bounced' | 'unsubscribed';
export type ContactSource = 'manual' | 'csv' | 'vcf' | 'phone' | 'api';

export interface Contact {
  id: number;
  user_id: number;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  social_link?: string;
  tags?: string[];
  notes?: string;
  status: 'active' | 'inactive' | 'bounced' | 'unsubscribed';
  source: 'manual' | 'csv' | 'vcf' | 'phone' | 'api';
  subscribed: boolean;
  last_email_sent?: Date;
  email_opens: number;
  email_clicks: number;
  created_at: Date;
  updated_at: Date;
}

export interface CreateContactRequest {
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  social_link?: string;
  tags?: string[];
  notes?: string;
  subscribed?: boolean;
}

export interface UpdateContactRequest {
  first_name?: string;
  last_name?: string;
  email?: string;
  phone?: string;
  company?: string;
  job_title?: string;
  social_link?: string;
  tags?: string[];
  notes?: string;
  status?: 'active' | 'inactive' | 'bounced' | 'unsubscribed';
  subscribed?: boolean;
  source?: ContactSource;
}

export interface ContactsListRequest {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  source?: string;
  tags?: string[];
  sort?: 'name' | 'email' | 'created_at' | 'updated_at';
  order?: 'asc' | 'desc';
}

export interface ContactsListResponse {
  contacts: Contact[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

// Import related interfaces
export interface ImportContactData {
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
  company?: string;
  job_title?: string;
  social_link?: string;
  tags?: string[];
  notes?: string;
  source: 'csv' | 'vcf' | 'phone';
}

export interface ImportValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  data?: ImportContactData;
}

export interface ImportPreviewResponse {
  total_contacts: number;
  valid_contacts: number;
  invalid_contacts: number;
  duplicates: number;
  preview: Array<{
    row: number;
    contact: ImportContactData;
    validation: ImportValidationResult;
  }>;
}

export interface ImportRequest {
  contacts: ImportContactData[];
  skip_duplicates?: boolean;
  update_existing?: boolean;
}

export interface ImportResponse {
  imported: number;
  skipped: number;
  errors: number;
  duplicates: number;
  details: Array<{
    row: number;
    status: 'imported' | 'skipped' | 'error' | 'duplicate';
    message?: string;
    contact?: Contact;
  }>;
}

// Phone contacts (from device)
export interface PhoneContact {
  id: string;
  name?: string;
  firstName?: string;
  lastName?: string;
  phoneNumbers?: Array<{
    label: string;
    number: string;
  }>;
  emails?: Array<{
    label: string;
    email: string;
  }>;
  company?: string;
  jobTitle?: string;
}

// VCF (vCard) contact
export interface VCFContact {
  fn?: string; // Full name
  n?: string[]; // Name components [Last, First, Middle, Prefix, Suffix]
  email?: string[];
  tel?: string[];
  org?: string;
  title?: string;
  note?: string;
}
