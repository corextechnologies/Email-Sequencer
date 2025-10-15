"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContactsService = void 0;
const csv_parser_1 = __importDefault(require("csv-parser"));
const stream_1 = require("stream");
class ContactsService {
    constructor(db) {
        this.db = db;
    }
    // Create a new contact
    async createContact(userId, data) {
        const query = `
      INSERT INTO contacts (
        user_id, first_name, last_name, email, phone, company, job_title, 
        social_link, tags, notes, subscribed, source
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;
        const values = [
            userId,
            data.first_name || null,
            data.last_name || null,
            data.email,
            data.phone || null,
            data.company || null,
            data.job_title || null,
            data.social_link || null,
            data.tags || [],
            data.notes || null,
            data.subscribed !== false, // Default to true unless explicitly false
            'manual'
        ];
        const result = await this.db.query(query, values);
        return result.rows[0];
    }
    // Get contacts with filtering and pagination
    async getContacts(userId, params) {
        const { page = 1, limit = 20, search, status, source, tags, sort = 'created_at', order = 'desc' } = params;
        const offset = (page - 1) * limit;
        let whereConditions = ['user_id = $1'];
        let queryParams = [userId];
        let paramIndex = 2;
        // Build WHERE conditions
        if (search) {
            whereConditions.push(`(
        first_name ILIKE $${paramIndex} OR 
        last_name ILIKE $${paramIndex} OR 
        email ILIKE $${paramIndex} OR
        company ILIKE $${paramIndex}
      )`);
            queryParams.push(`%${search}%`);
            paramIndex++;
        }
        if (status) {
            whereConditions.push(`status = $${paramIndex}`);
            queryParams.push(status);
            paramIndex++;
        }
        if (source) {
            whereConditions.push(`source = $${paramIndex}`);
            queryParams.push(source);
            paramIndex++;
        }
        if (tags && tags.length > 0) {
            whereConditions.push(`tags && $${paramIndex}`);
            queryParams.push(tags);
            paramIndex++;
        }
        const whereClause = whereConditions.join(' AND ');
        // Count query
        const countQuery = `SELECT COUNT(*) FROM contacts WHERE ${whereClause}`;
        const countResult = await this.db.query(countQuery, queryParams);
        const total = parseInt(countResult.rows[0].count);
        // Data query
        const dataQuery = `
      SELECT * FROM contacts 
      WHERE ${whereClause}
      ORDER BY ${sort} ${order.toUpperCase()}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;
        queryParams.push(limit, offset);
        const dataResult = await this.db.query(dataQuery, queryParams);
        return {
            contacts: dataResult.rows,
            pagination: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit)
            }
        };
    }
    // Get single contact
    async getContact(userId, contactId) {
        const query = 'SELECT * FROM contacts WHERE id = $1 AND user_id = $2';
        const result = await this.db.query(query, [contactId, userId]);
        return result.rows[0] || null;
    }
    // Update contact
    async updateContact(userId, contactId, data) {
        const fields = [];
        const values = [];
        let paramIndex = 1;
        // Build dynamic update query
        Object.entries(data).forEach(([key, value]) => {
            if (value !== undefined) {
                fields.push(`${key} = $${paramIndex}`);
                values.push(value);
                paramIndex++;
            }
        });
        if (fields.length === 0) {
            throw new Error('No fields to update');
        }
        values.push(contactId, userId);
        const query = `
      UPDATE contacts 
      SET ${fields.join(', ')} 
      WHERE id = $${paramIndex} AND user_id = $${paramIndex + 1}
      RETURNING *
    `;
        const result = await this.db.query(query, values);
        return result.rows[0] || null;
    }
    // Delete contact
    async deleteContact(userId, contactId) {
        const query = 'DELETE FROM contacts WHERE id = $1 AND user_id = $2';
        const result = await this.db.query(query, [contactId, userId]);
        return (result.rowCount || 0) > 0;
    }
    // Validate contact data
    validateContact(data) {
        const errors = [];
        const warnings = [];
        // Email validation
        if (!data.email) {
            errors.push('Email is required');
        }
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
            errors.push('Invalid email format');
        }
        // Phone validation
        if (data.phone && !/^[\+]?[\d\s\-\(\)]{7,}$/.test(data.phone)) {
            warnings.push('Phone number format may be invalid');
        }
        // Name validation
        if (!data.first_name && !data.last_name) {
            warnings.push('No name provided - email will be used for display');
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
            data: errors.length === 0 ? data : undefined
        };
    }
    // Check for duplicate email
    async checkDuplicate(userId, email) {
        const query = 'SELECT * FROM contacts WHERE user_id = $1 AND email = $2';
        const result = await this.db.query(query, [userId, email]);
        return result.rows[0] || null;
    }
    // Bulk import contacts
    async importContacts(userId, importData) {
        const response = {
            imported: 0,
            skipped: 0,
            errors: 0,
            duplicates: 0,
            details: []
        };
        for (let i = 0; i < importData.contacts.length; i++) {
            const contactData = importData.contacts[i];
            const row = i + 1;
            try {
                // Validate contact
                const validation = this.validateContact(contactData);
                if (!validation.valid) {
                    response.errors++;
                    response.details.push({
                        row,
                        status: 'error',
                        message: validation.errors.join(', ')
                    });
                    continue;
                }
                // Check for duplicates
                const existingContact = await this.checkDuplicate(userId, contactData.email);
                if (existingContact) {
                    if (importData.skip_duplicates) {
                        response.duplicates++;
                        response.details.push({
                            row,
                            status: 'duplicate',
                            message: 'Email already exists',
                            contact: existingContact
                        });
                        continue;
                    }
                    else if (importData.update_existing) {
                        // Update existing contact
                        const updatedContact = await this.updateContact(userId, existingContact.id, {
                            first_name: contactData.first_name,
                            last_name: contactData.last_name,
                            phone: contactData.phone,
                            company: contactData.company,
                            job_title: contactData.job_title,
                            social_link: contactData.social_link,
                            tags: contactData.tags,
                            notes: contactData.notes
                        });
                        response.imported++;
                        response.details.push({
                            row,
                            status: 'imported',
                            message: 'Updated existing contact',
                            contact: updatedContact
                        });
                        continue;
                    }
                }
                // Create new contact
                const newContact = await this.createContact(userId, {
                    ...contactData,
                    subscribed: true
                });
                // Update source
                await this.updateContact(userId, newContact.id, { source: contactData.source });
                response.imported++;
                response.details.push({
                    row,
                    status: 'imported',
                    contact: newContact
                });
            }
            catch (error) {
                response.errors++;
                response.details.push({
                    row,
                    status: 'error',
                    message: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        }
        return response;
    }
    // CSV Import functionality
    async importFromCSV(userId, csvData) {
        const results = [];
        const errors = [];
        return new Promise((resolve, reject) => {
            const stream = stream_1.Readable.from(csvData.toString());
            let rowNumber = 0;
            stream
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                rowNumber++;
                results.push({ ...data, rowNumber });
            })
                .on('end', async () => {
                try {
                    let success = 0;
                    let failed = 0;
                    let duplicates = 0;
                    for (const row of results) {
                        try {
                            // Validate and clean data
                            const contactData = this.validateCSVRow(row);
                            // Check for duplicates
                            const existing = await this.findByEmail(userId, contactData.email);
                            if (existing) {
                                duplicates++;
                                continue;
                            }
                            // Create contact
                            await this.createContact(userId, contactData);
                            success++;
                        }
                        catch (error) {
                            failed++;
                            errors.push({
                                row: row.rowNumber,
                                error: error instanceof Error ? error.message : 'Unknown error',
                                data: row
                            });
                        }
                    }
                    resolve({ success, failed, duplicates, errors });
                }
                catch (error) {
                    reject(error);
                }
            })
                .on('error', reject);
        });
    }
    async previewCSV(csvData) {
        const results = [];
        return new Promise((resolve, reject) => {
            const stream = stream_1.Readable.from(csvData.toString());
            let rowCount = 0;
            stream
                .pipe((0, csv_parser_1.default)())
                .on('data', (data) => {
                if (rowCount < 10) {
                    results.push(data);
                }
                rowCount++;
            })
                .on('end', () => {
                const columns = Object.keys(results[0] || {});
                resolve({
                    preview: results,
                    totalRows: rowCount,
                    columns
                });
            })
                .on('error', reject);
        });
    }
    validateCSVRow(row) {
        // Map common CSV column names to our fields
        const emailFields = ['email', 'Email', 'EMAIL', 'email_address', 'Email Address'];
        const firstNameFields = ['first_name', 'First Name', 'firstname', 'FirstName', 'given_name', 'name'];
        const lastNameFields = ['last_name', 'Last Name', 'lastname', 'LastName', 'family_name', 'surname'];
        const phoneFields = ['phone', 'Phone', 'phone_number', 'Phone Number', 'mobile', 'Mobile'];
        const companyFields = ['company', 'Company', 'organization', 'Organization', 'employer'];
        const email = this.findFieldValue(row, emailFields);
        if (!email || !this.isValidEmail(email)) {
            throw new Error('Invalid or missing email address');
        }
        return {
            email: email.toLowerCase().trim(),
            first_name: this.findFieldValue(row, firstNameFields)?.trim() || undefined,
            last_name: this.findFieldValue(row, lastNameFields)?.trim() || undefined,
            phone: this.findFieldValue(row, phoneFields)?.trim() || undefined,
            company: this.findFieldValue(row, companyFields)?.trim() || undefined,
            subscribed: true
        };
    }
    findFieldValue(row, fieldNames) {
        for (const fieldName of fieldNames) {
            if (row[fieldName] && typeof row[fieldName] === 'string') {
                return row[fieldName];
            }
        }
        return undefined;
    }
    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }
    async findByEmail(userId, email) {
        const query = `
      SELECT * FROM contacts 
      WHERE user_id = $1 AND email = $2
      LIMIT 1
    `;
        const result = await this.db.query(query, [userId, email.toLowerCase()]);
        return result.rows[0] || null;
    }
    // Get contact statistics
    async getContactStats(userId) {
        const query = `
      SELECT 
        COUNT(*) as total,
        COUNT(*) FILTER (WHERE status = 'active') as active,
        COUNT(*) FILTER (WHERE status = 'inactive') as inactive,
        COUNT(*) FILTER (WHERE subscribed = true) as subscribed,
        COUNT(*) FILTER (WHERE source = 'csv') as from_csv,
        COUNT(*) FILTER (WHERE source = 'vcf') as from_vcf,
        COUNT(*) FILTER (WHERE source = 'phone') as from_phone,
        COUNT(*) FILTER (WHERE source = 'manual') as manual
      FROM contacts 
      WHERE user_id = $1
    `;
        const result = await this.db.query(query, [userId]);
        return result.rows[0];
    }
    // VCF Import functionality
    async previewVCF(vcfData) {
        console.log('VCF preview service not fully implemented yet - basic parsing only');
        const vcfContent = vcfData.toString();
        const contacts = this.parseVCFContent(vcfContent);
        return {
            contacts: contacts.slice(0, 5), // Return first 5 for preview
            totalContacts: contacts.length,
            supportedFields: ['FN', 'N', 'EMAIL', 'TEL', 'ORG', 'TITLE', 'NOTE']
        };
    }
    async importFromVCF(userId, vcfData) {
        console.log('VCF import service not fully implemented yet - using mock import');
        const vcfContent = vcfData.toString();
        const contacts = this.parseVCFContent(vcfContent);
        const errors = [];
        let success = 0;
        let failed = 0;
        let duplicates = 0;
        for (let i = 0; i < contacts.length; i++) {
            try {
                const contactData = this.convertVCFToContact(contacts[i]);
                if (!contactData.email) {
                    failed++;
                    errors.push({
                        row: i + 1,
                        error: 'No email address found',
                        data: contacts[i]
                    });
                    continue;
                }
                // Check for duplicates
                const existing = await this.findByEmail(userId, contactData.email);
                if (existing) {
                    duplicates++;
                    continue;
                }
                // Create contact
                await this.createContact(userId, contactData);
                success++;
            }
            catch (error) {
                failed++;
                errors.push({
                    row: i + 1,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: contacts[i]
                });
            }
        }
        return { success, failed, duplicates, errors };
    }
    parseVCFContent(content) {
        console.log('VCF parsing not fully implemented yet - basic parsing only');
        const contacts = [];
        const lines = content.split('\n');
        let currentContact = {};
        let contactStarted = false;
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === 'BEGIN:VCARD') {
                contactStarted = true;
                currentContact = { rawData: '' };
            }
            else if (line === 'END:VCARD' && contactStarted) {
                if (currentContact.fn || currentContact.email?.length) {
                    contacts.push(currentContact);
                }
                contactStarted = false;
                currentContact = {};
            }
            else if (contactStarted && line) {
                currentContact.rawData += line + '\n';
                // Basic parsing of common VCF fields
                if (line.startsWith('FN:')) {
                    currentContact.fn = line.substring(3);
                }
                else if (line.startsWith('N:')) {
                    const nameParts = line.substring(2).split(';');
                    currentContact.n = nameParts;
                }
                else if (line.startsWith('EMAIL') || line.includes('EMAIL')) {
                    const emailMatch = line.match(/EMAIL[^:]*:(.+)/);
                    if (emailMatch) {
                        if (!currentContact.email)
                            currentContact.email = [];
                        currentContact.email.push(emailMatch[1]);
                    }
                }
                else if (line.startsWith('TEL') || line.includes('TEL')) {
                    const telMatch = line.match(/TEL[^:]*:(.+)/);
                    if (telMatch) {
                        if (!currentContact.tel)
                            currentContact.tel = [];
                        currentContact.tel.push(telMatch[1]);
                    }
                }
                else if (line.startsWith('ORG:')) {
                    currentContact.org = line.substring(4);
                }
                else if (line.startsWith('TITLE:')) {
                    currentContact.title = line.substring(6);
                }
                else if (line.startsWith('NOTE:')) {
                    currentContact.note = line.substring(5);
                }
            }
        }
        return contacts;
    }
    convertVCFToContact(vcfContact) {
        console.log('VCF to contact conversion not fully implemented yet');
        const firstName = vcfContact.n ? vcfContact.n[1] || '' : '';
        const lastName = vcfContact.n ? vcfContact.n[0] || '' : '';
        const fullName = vcfContact.fn || `${firstName} ${lastName}`.trim();
        return {
            first_name: firstName,
            last_name: lastName,
            email: vcfContact.email?.[0] || '',
            phone: vcfContact.tel?.[0] || undefined,
            company: vcfContact.org || undefined,
            job_title: vcfContact.title || undefined,
            notes: vcfContact.note || undefined,
            subscribed: true,
            source: 'vcf'
        };
    }
    // Phone Contacts Import functionality
    async importPhoneContacts(userId, contacts) {
        console.log('Phone contacts import service not fully implemented yet - basic processing only');
        const errors = [];
        let success = 0;
        let failed = 0;
        let duplicates = 0;
        for (let i = 0; i < contacts.length; i++) {
            try {
                const contactData = contacts[i];
                // Validate required fields
                if (!contactData.email) {
                    failed++;
                    errors.push({
                        row: i + 1,
                        error: 'No email address provided',
                        data: contactData
                    });
                    continue;
                }
                // Validate email format
                if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactData.email)) {
                    failed++;
                    errors.push({
                        row: i + 1,
                        error: 'Invalid email format',
                        data: contactData
                    });
                    continue;
                }
                // Check for duplicates
                const existing = await this.findByEmail(userId, contactData.email);
                if (existing) {
                    duplicates++;
                    continue;
                }
                // Create contact
                const contactToCreate = {
                    first_name: contactData.first_name || '',
                    last_name: contactData.last_name || '',
                    email: contactData.email,
                    phone: contactData.phone || undefined,
                    company: contactData.company || undefined,
                    job_title: contactData.job_title || undefined,
                    subscribed: true,
                    source: 'phone'
                };
                await this.createContact(userId, contactToCreate);
                success++;
            }
            catch (error) {
                failed++;
                errors.push({
                    row: i + 1,
                    error: error instanceof Error ? error.message : 'Unknown error',
                    data: contacts[i]
                });
            }
        }
        console.log(`Phone import completed: ${success} success, ${failed} failed, ${duplicates} duplicates`);
        return { success, failed, duplicates, errors };
    }
}
exports.ContactsService = ContactsService;
//# sourceMappingURL=contactsService.js.map