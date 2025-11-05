import { Database } from './connection';

export class Migrations {
  static async createUsersTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
    `;
    
    await Database.query(query);
    console.log('✅ Users table created');
  }

  static async createEmailAccountsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS email_accounts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        provider VARCHAR(100) NOT NULL,
        imap_host VARCHAR(255) NOT NULL,
        imap_port INTEGER NOT NULL DEFAULT 993,
        smtp_host VARCHAR(255) NOT NULL,
        smtp_port INTEGER NOT NULL DEFAULT 587,
        username VARCHAR(255) NOT NULL,
        encrypted_password TEXT NOT NULL,
        is_active BOOLEAN DEFAULT true,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      CREATE INDEX IF NOT EXISTS idx_email_accounts_user_id ON email_accounts(user_id);
      CREATE INDEX IF NOT EXISTS idx_email_accounts_provider ON email_accounts(provider);
    `;
    
    await Database.query(query);
    console.log('✅ Email accounts table created');
  }

  static async createContactsTable(): Promise<void> {
    const query = `
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        email VARCHAR(255) NOT NULL,
        phone VARCHAR(50),
        company VARCHAR(255),
        job_title VARCHAR(255),
        social_link VARCHAR(500),
        tags TEXT[] DEFAULT '{}',
        notes TEXT,
        status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'bounced', 'unsubscribed')),
        subscribed BOOLEAN DEFAULT true,
        source VARCHAR(20) DEFAULT 'manual' CHECK (source IN ('manual', 'csv', 'vcf', 'phone', 'api')),
        
        -- Email marketing metrics
        email_opens INTEGER DEFAULT 0,
        email_clicks INTEGER DEFAULT 0,
        last_email_sent TIMESTAMP,
        
        -- Timestamps
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
      
      -- Indexes
      CREATE INDEX IF NOT EXISTS idx_contacts_user_id ON contacts(user_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email);
      CREATE INDEX IF NOT EXISTS idx_contacts_status ON contacts(status);
      CREATE INDEX IF NOT EXISTS idx_contacts_source ON contacts(source);
      CREATE INDEX IF NOT EXISTS idx_contacts_subscribed ON contacts(subscribed);
      CREATE INDEX IF NOT EXISTS idx_contacts_tags ON contacts USING GIN(tags);
      
      -- Unique constraint for user_id + email
      CREATE UNIQUE INDEX IF NOT EXISTS idx_contacts_user_email ON contacts(user_id, email);
      
      -- Updated at trigger
      CREATE OR REPLACE FUNCTION update_contacts_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = CURRENT_TIMESTAMP;
        RETURN NEW;
      END;
      $$ language 'plpgsql';
      
      DROP TRIGGER IF EXISTS trigger_update_contacts_updated_at ON contacts;
      CREATE TRIGGER trigger_update_contacts_updated_at
        BEFORE UPDATE ON contacts
        FOR EACH ROW
        EXECUTE FUNCTION update_contacts_updated_at();
    `;
    
    await Database.query(query);
    console.log('✅ Contacts table created');
  }

  static async runAll(): Promise<void> {
    console.log('🔄 Running database migrations...');
    try {
      await this.createUsersTable();
      await this.createEmailAccountsTable();
      await this.createContactsTable();
      await this.createCampaignsModule();
      await this.createLLMModule();
      await this.createJobsModule();
      await this.createPersonasTable();
      await this.createEnrichedDataTable();
      await this.createCampaignEmailsTable();
		await this.addSequenceProgressFields();
		await this.addSequenceStartedAt();
		await this.addEmailOpensTracking();
		await this.addPasswordResetFields();
		await this.addEmailVerificationFields();
      console.log('✅ All migrations completed successfully');
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

	/**
	 * Create all Campaigns module tables, constraints, indexes, and triggers.
	 */
	static async createCampaignsModule(): Promise<void> {
		const query = `
		-- ===== campaigns =====
		CREATE TABLE IF NOT EXISTS campaigns (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			name VARCHAR(255) NOT NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','ready','running','paused','completed','cancelled')),
			timezone VARCHAR(64) NOT NULL DEFAULT 'UTC',
			send_window_start TIME NOT NULL DEFAULT '09:00',
			send_window_end TIME NOT NULL DEFAULT '17:00',
			email_subject VARCHAR(255),
			email_body TEXT,
			from_email_account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_campaigns_user_id ON campaigns(user_id);
		CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
		CREATE INDEX IF NOT EXISTS idx_campaigns_status_created_at ON campaigns(status, created_at);

		-- Updated at trigger for campaigns
		CREATE OR REPLACE FUNCTION update_campaigns_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_campaigns_updated_at ON campaigns;
		CREATE TRIGGER trigger_update_campaigns_updated_at
			BEFORE UPDATE ON campaigns
			FOR EACH ROW
			EXECUTE FUNCTION update_campaigns_updated_at();

		-- ===== campaign_contacts =====
		CREATE TABLE IF NOT EXISTS campaign_contacts (
			id SERIAL PRIMARY KEY,
			campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
			contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE RESTRICT,
			persona_id UUID REFERENCES personas(id) ON DELETE SET NULL,
			status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','replied','unsubscribed','failed','bounced')),
			error TEXT,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (campaign_id, contact_id)
		);

		CREATE INDEX IF NOT EXISTS idx_campaign_contacts_campaign_status ON campaign_contacts(campaign_id, status);

		-- Updated at trigger for campaign_contacts
		CREATE OR REPLACE FUNCTION update_campaign_contacts_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_campaign_contacts_updated_at ON campaign_contacts;
		CREATE TRIGGER trigger_update_campaign_contacts_updated_at
			BEFORE UPDATE ON campaign_contacts
			FOR EACH ROW
			EXECUTE FUNCTION update_campaign_contacts_updated_at();

		-- ===== sequence_steps =====
		CREATE TABLE IF NOT EXISTS sequence_steps (
			id SERIAL PRIMARY KEY,
			campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
			step_index INTEGER NOT NULL,
			delay_hours INTEGER NOT NULL CHECK (delay_hours >= 0),
			from_email_account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL,
			subject_template TEXT NOT NULL,
			body_template TEXT NOT NULL,
			prompt_key VARCHAR(100),
			enabled BOOLEAN NOT NULL DEFAULT true,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (campaign_id, step_index)
		);

		CREATE INDEX IF NOT EXISTS idx_sequence_steps_campaign_enabled ON sequence_steps(campaign_id, enabled);

		-- Updated at trigger for sequence_steps
		CREATE OR REPLACE FUNCTION update_sequence_steps_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_sequence_steps_updated_at ON sequence_steps;
		CREATE TRIGGER trigger_update_sequence_steps_updated_at
			BEFORE UPDATE ON sequence_steps
			FOR EACH ROW
			EXECUTE FUNCTION update_sequence_steps_updated_at();

		-- ===== messages =====
		CREATE TABLE IF NOT EXISTS messages (
			id SERIAL PRIMARY KEY,
			campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
			contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
			step_id INTEGER REFERENCES sequence_steps(id) ON DELETE SET NULL,
			direction VARCHAR(10) NOT NULL CHECK (direction IN ('outbound','inbound')),
			smtp_account_id INTEGER REFERENCES email_accounts(id) ON DELETE SET NULL,
			provider_message_id VARCHAR(255),
			status VARCHAR(20) NOT NULL CHECK (status IN ('sent','delivered','bounced','failed','read','replied')),
			timestamps JSONB NOT NULL DEFAULT '{}'::jsonb,
			raw JSONB NOT NULL DEFAULT '{}'::jsonb,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_messages_campaign_contact ON messages(campaign_id, contact_id);
		CREATE INDEX IF NOT EXISTS idx_messages_contact_created_at ON messages(contact_id, created_at);
		CREATE INDEX IF NOT EXISTS idx_messages_status ON messages(status);
		CREATE INDEX IF NOT EXISTS idx_messages_direction ON messages(direction);

		-- Prevent duplicate provider_message_id per smtp_account on outbound
		CREATE UNIQUE INDEX IF NOT EXISTS uidx_messages_outbound_provider ON messages(smtp_account_id, provider_message_id)
		WHERE direction = 'outbound' AND smtp_account_id IS NOT NULL AND provider_message_id IS NOT NULL;

		-- Updated at trigger for messages
		CREATE OR REPLACE FUNCTION update_messages_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_messages_updated_at ON messages;
		CREATE TRIGGER trigger_update_messages_updated_at
			BEFORE UPDATE ON messages
			FOR EACH ROW
			EXECUTE FUNCTION update_messages_updated_at();

		-- ===== events =====
		CREATE TABLE IF NOT EXISTS events (
			id SERIAL PRIMARY KEY,
			campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
			contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
			type VARCHAR(20) NOT NULL CHECK (type IN ('sent','delivered','replied','unsubscribed','bounced')),
			meta JSONB NOT NULL DEFAULT '{}'::jsonb,
			occurred_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_events_campaign_occurred_at ON events(campaign_id, occurred_at);
		CREATE INDEX IF NOT EXISTS idx_events_contact_occurred_at ON events(contact_id, occurred_at);
		CREATE INDEX IF NOT EXISTS idx_events_type_occurred_at ON events(type, occurred_at);
		CREATE UNIQUE INDEX IF NOT EXISTS uidx_events_dedupe ON events(type, campaign_id, contact_id, occurred_at);

		-- ===== unsubscribe_tokens =====
		CREATE TABLE IF NOT EXISTS unsubscribe_tokens (
			token VARCHAR(255) PRIMARY KEY,
			campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
			contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
			expires_at TIMESTAMP NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_expires_at ON unsubscribe_tokens(expires_at);
		CREATE INDEX IF NOT EXISTS idx_unsubscribe_tokens_campaign_contact ON unsubscribe_tokens(campaign_id, contact_id);
		`;

		await Database.query(query);
		console.log('✅ Campaigns module tables created');
	}

	/** Jobs queue (postgres-backed) */
	static async createJobsModule(): Promise<void> {
		const query = `
		CREATE TABLE IF NOT EXISTS jobs (
			id SERIAL PRIMARY KEY,
			queue VARCHAR(100) NOT NULL,
			payload JSONB NOT NULL DEFAULT '{}'::jsonb,
			run_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
			attempts INTEGER NOT NULL DEFAULT 0,
			max_attempts INTEGER NOT NULL DEFAULT 5,
			status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','running','completed','failed')),
			idempotency_key VARCHAR(255),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (idempotency_key)
		);

		CREATE INDEX IF NOT EXISTS idx_jobs_queue_run ON jobs(queue, status, run_at);

		CREATE OR REPLACE FUNCTION update_jobs_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END; $$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_jobs_updated_at ON jobs;
		CREATE TRIGGER trigger_update_jobs_updated_at
			BEFORE UPDATE ON jobs
			FOR EACH ROW
			EXECUTE FUNCTION update_jobs_updated_at();
		`;
		await Database.query(query);
		console.log('✅ Jobs queue table ready');
	}

	/**
	 * Create LLM settings and prompt library tables.
	 */
	static async createLLMModule(): Promise<void> {
		const query = `
		-- ===== user_llm_keys =====
		CREATE TABLE IF NOT EXISTS user_llm_keys (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			provider VARCHAR(50) NOT NULL,
			encrypted_api_key TEXT NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (user_id, provider)
		);

		-- Updated at trigger
		CREATE OR REPLACE FUNCTION update_user_llm_keys_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END; $$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_user_llm_keys_updated_at ON user_llm_keys;
		CREATE TRIGGER trigger_update_user_llm_keys_updated_at
			BEFORE UPDATE ON user_llm_keys
			FOR EACH ROW
			EXECUTE FUNCTION update_user_llm_keys_updated_at();

		-- ===== prompt_library (global defaults) =====
		CREATE TABLE IF NOT EXISTS prompt_library (
			key VARCHAR(100) PRIMARY KEY,
			title VARCHAR(255) NOT NULL,
			content TEXT NOT NULL,
			variables JSONB NOT NULL DEFAULT '[]'::jsonb,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		CREATE OR REPLACE FUNCTION update_prompt_library_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END; $$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_prompt_library_updated_at ON prompt_library;
		CREATE TRIGGER trigger_update_prompt_library_updated_at
			BEFORE UPDATE ON prompt_library
			FOR EACH ROW
			EXECUTE FUNCTION update_prompt_library_updated_at();

		-- ===== user_prompts (per-user overrides) =====
		CREATE TABLE IF NOT EXISTS user_prompts (
			id SERIAL PRIMARY KEY,
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			key VARCHAR(100) NOT NULL,
			content TEXT NOT NULL,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			UNIQUE (user_id, key)
		);

		CREATE OR REPLACE FUNCTION update_user_prompts_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END; $$ language 'plpgsql';

		DROP TRIGGER IF EXISTS trigger_update_user_prompts_updated_at ON user_prompts;
		CREATE TRIGGER trigger_update_user_prompts_updated_at
			BEFORE UPDATE ON user_prompts
			FOR EACH ROW
			EXECUTE FUNCTION update_user_prompts_updated_at();

		-- Seed defaults if not present
		INSERT INTO prompt_library (key, title, content, variables)
		VALUES
		('sequence_subject', 'Sequence Subject', 'Subject: Following up with {{contact.first_name}} about {{company.name}}', '["user","company","contact","persona","campaign"]'::jsonb),
		('sequence_body', 'Sequence Body', 'Hi {{contact.first_name}},\n\nI''m {{user.name}} from {{company.name}}. {{campaign.purpose}}\n\nBest,\n{{user.name}}', '["user","company","contact","persona","campaign"]'::jsonb)
		ON CONFLICT (key) DO NOTHING;
		`;

		await Database.query(query);
		console.log('✅ LLM module tables created and prompts seeded');
	}

	/**
	 * Create personas table for storing detailed persona information.
	 */
	static async createPersonasTable(): Promise<void> {
		const query = `
		-- Personas table migration
		-- This stores detailed persona information for targeted email marketing

		CREATE TABLE IF NOT EXISTS personas (
			id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
			user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
			
			-- Basic persona information
			name TEXT NOT NULL,
			industry TEXT,
			role TEXT,
			company_size TEXT,
			location TEXT,
			description TEXT,
			
			-- Detailed persona characteristics
			current_challenges TEXT,
			change_events TEXT,
			interests_priorities TEXT,
			communication_style TEXT,
			demographics TEXT,
			content_preferences TEXT,
			buying_triggers TEXT,
			geographic_location TEXT,
			
			-- Timestamps
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		);

		-- Indexes for performance
		CREATE INDEX IF NOT EXISTS idx_personas_user_id ON personas(user_id);
		CREATE INDEX IF NOT EXISTS idx_personas_name ON personas(name);
		CREATE INDEX IF NOT EXISTS idx_personas_industry ON personas(industry);
		CREATE INDEX IF NOT EXISTS idx_personas_role ON personas(role);

		-- Trigger to update updated_at
		CREATE OR REPLACE FUNCTION update_personas_updated_at()
		RETURNS TRIGGER AS $$
		BEGIN
			NEW.updated_at = CURRENT_TIMESTAMP;
			RETURN NEW;
		END;
		$$ language 'plpgsql';

		DROP TRIGGER IF EXISTS update_personas_updated_at ON personas;
		CREATE TRIGGER update_personas_updated_at 
			BEFORE UPDATE ON personas 
			FOR EACH ROW 
			EXECUTE FUNCTION update_personas_updated_at();
		`;

		await Database.query(query);
		console.log('✅ Personas table created');
	}

	static async createEnrichedDataTable(): Promise<void> {
		const query = `
			CREATE TABLE IF NOT EXISTS enriched_data (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				contact_id INTEGER UNIQUE NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				
				-- AI-enriched contact information
				professional_context TEXT,
				recent_activity TEXT,
				company_insights TEXT,
				communication_style TEXT,
				personality_summary TEXT,
				engagement_insights TEXT,
				
				-- Structured data fields
				key_quotes_or_posts JSONB,
				enriched_json JSONB,
				
				-- Timestamps
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
			);

			-- Indexes for performance
			CREATE INDEX IF NOT EXISTS idx_enriched_data_contact_id ON enriched_data(contact_id);
			CREATE INDEX IF NOT EXISTS idx_enriched_data_user_id ON enriched_data(user_id);

			-- Trigger to update updated_at
			CREATE OR REPLACE FUNCTION update_enriched_data_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ language 'plpgsql';

			DROP TRIGGER IF EXISTS update_enriched_data_updated_at ON enriched_data;
			CREATE TRIGGER update_enriched_data_updated_at 
				BEFORE UPDATE ON enriched_data 
				FOR EACH ROW 
				EXECUTE FUNCTION update_enriched_data_updated_at();
		`;

		await Database.query(query);
		console.log('✅ Enriched data table created');
	}

	static async createCampaignEmailsTable(): Promise<void> {
		const query = `
			CREATE TABLE IF NOT EXISTS campaign_emails (
				id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
				campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
				user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
				contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
				email_number INTEGER NOT NULL,
				day INTEGER NOT NULL,
				subject TEXT,
				body TEXT,
				created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
				UNIQUE (campaign_id, contact_id, email_number)
			);

			-- Indexes for performance
			CREATE INDEX IF NOT EXISTS idx_campaign_emails_campaign_id ON campaign_emails(campaign_id);
			CREATE INDEX IF NOT EXISTS idx_campaign_emails_contact_id ON campaign_emails(contact_id);
			CREATE INDEX IF NOT EXISTS idx_campaign_emails_user_id ON campaign_emails(user_id);
			CREATE INDEX IF NOT EXISTS idx_campaign_emails_email_number ON campaign_emails(campaign_id, email_number);

			-- Trigger to update updated_at
			CREATE OR REPLACE FUNCTION update_campaign_emails_updated_at()
			RETURNS TRIGGER AS $$
			BEGIN
				NEW.updated_at = CURRENT_TIMESTAMP;
				RETURN NEW;
			END;
			$$ language 'plpgsql';

			DROP TRIGGER IF EXISTS update_campaign_emails_updated_at ON campaign_emails;
			CREATE TRIGGER update_campaign_emails_updated_at 
				BEFORE UPDATE ON campaign_emails 
				FOR EACH ROW 
				EXECUTE FUNCTION update_campaign_emails_updated_at();
		`;

		await Database.query(query);
		console.log('✅ Campaign emails table created');
	}

	/**
	 * Add sequence progress tracking fields to campaign_contacts
	 */
	static async addSequenceProgressFields(): Promise<void> {
		const query = `
			-- Step 1: Drop old constraint first
			ALTER TABLE campaign_contacts 
			DROP CONSTRAINT IF EXISTS campaign_contacts_status_check;

			-- Step 2: Update existing 'sent' status to 'completed' (new status naming)
			UPDATE campaign_contacts SET status = 'completed' WHERE status = 'sent';

			-- Step 3: Add new constraint with updated status values
			ALTER TABLE campaign_contacts
			ADD CONSTRAINT campaign_contacts_status_check 
			CHECK (status IN ('pending', 'in_progress', 'completed', 'replied', 'unsubscribed', 'failed', 'bounced'));

			-- Step 4: Add progress tracking fields
			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS current_email_number INTEGER DEFAULT 1;

			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS total_emails INTEGER DEFAULT 1;

			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS last_email_sent_at TIMESTAMP;

			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS next_email_send_at TIMESTAMP;

			-- Add constraints for progress fields (drop first if exists to avoid errors)
			ALTER TABLE campaign_contacts
			DROP CONSTRAINT IF EXISTS check_current_email_number;
			
			ALTER TABLE campaign_contacts
			ADD CONSTRAINT check_current_email_number 
			CHECK (current_email_number > 0 AND current_email_number <= total_emails + 1);

			ALTER TABLE campaign_contacts
			DROP CONSTRAINT IF EXISTS check_total_emails;
			
			ALTER TABLE campaign_contacts
			ADD CONSTRAINT check_total_emails 
			CHECK (total_emails > 0);

			-- Create index for efficient worker queries
			CREATE INDEX IF NOT EXISTS idx_campaign_contacts_next_send 
			ON campaign_contacts(next_email_send_at) 
			WHERE next_email_send_at IS NOT NULL;
		`;

		await Database.query(query);
		console.log('✅ Sequence progress fields added to campaign_contacts');
	}

	/**
	 * Add sequence_started_at field to campaign_contacts for accurate day calculations
	 */
	static async addSequenceStartedAt(): Promise<void> {
		const query = `
			-- Migration: Add sequence_started_at to campaign_contacts
			-- This field tracks when the email sequence was launched for a contact
			-- It's used for calculating future send dates based on day gaps

			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS sequence_started_at TIMESTAMP;

			-- Add comment for documentation
			COMMENT ON COLUMN campaign_contacts.sequence_started_at IS 'Timestamp when the email sequence was launched for this contact. Used as base for calculating next_email_send_at with day gaps.';

			-- Create index for efficient queries
			CREATE INDEX IF NOT EXISTS idx_campaign_contacts_sequence_started 
			ON campaign_contacts(sequence_started_at) 
			WHERE sequence_started_at IS NOT NULL;
		`;

		await Database.query(query);
		console.log('✅ sequence_started_at field added to campaign_contacts');
	}

	/**
	 * Add email opens tracking table and fields
	 */
	static async addEmailOpensTracking(): Promise<void> {
		const query = `
			-- Create email_opens table for tracking pixel data
			CREATE TABLE IF NOT EXISTS email_opens (
				id SERIAL PRIMARY KEY,
				campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
				contact_id INTEGER NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
				opened_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				user_agent TEXT,
				ip_address INET,
				created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
				UNIQUE(campaign_id, contact_id)
			);

			-- Add index for performance
			CREATE INDEX IF NOT EXISTS idx_email_opens_campaign_id ON email_opens(campaign_id);
			CREATE INDEX IF NOT EXISTS idx_email_opens_contact_id ON email_opens(contact_id);
			CREATE INDEX IF NOT EXISTS idx_email_opens_opened_at ON email_opens(opened_at);

			-- Add last_email_opened_at to campaign_contacts
			ALTER TABLE campaign_contacts 
			ADD COLUMN IF NOT EXISTS last_email_opened_at TIMESTAMP WITH TIME ZONE;
		`;

		await Database.query(query);
		console.log('✅ Email opens tracking added');
	}

	/**
	 * Add password reset fields to users table for forgot password functionality
	 */
	static async addPasswordResetFields(): Promise<void> {
		const query = `
			-- Add password reset token and expiry fields
			ALTER TABLE users 
			ADD COLUMN IF NOT EXISTS reset_token VARCHAR(255) NULL,
			ADD COLUMN IF NOT EXISTS reset_token_expires_at TIMESTAMP NULL;

			-- Create index for faster token lookups (partial index for non-null tokens)
			CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users(reset_token) 
			WHERE reset_token IS NOT NULL;

			-- Add comments for documentation
			COMMENT ON COLUMN users.reset_token IS 'Hashed password reset token used for password reset functionality';
			COMMENT ON COLUMN users.reset_token_expires_at IS 'Expiration timestamp for reset token. Tokens expire after 1 hour.';
		`;

		await Database.query(query);
		console.log('✅ Password reset fields added to users table');
	}

	/**
	 * Add email verification fields to users table for OTP-based registration
	 */
	static async addEmailVerificationFields(): Promise<void> {
		const query = `
			-- Add email verification fields
			ALTER TABLE users 
			ADD COLUMN IF NOT EXISTS verification_code VARCHAR(255) NULL,
			ADD COLUMN IF NOT EXISTS verification_expires_at TIMESTAMP NULL,
			ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT false,
			ADD COLUMN IF NOT EXISTS temp_password_hash VARCHAR(255) NULL;

			-- Create index for faster verification code lookups (partial index for non-null codes)
			CREATE INDEX IF NOT EXISTS idx_users_verification_code ON users(verification_code) 
			WHERE verification_code IS NOT NULL;

			-- Add comments for documentation
			COMMENT ON COLUMN users.verification_code IS 'Hashed 6-digit OTP code used for email verification during registration';
			COMMENT ON COLUMN users.verification_expires_at IS 'Expiration timestamp for verification code. Codes expire after 15 minutes.';
			COMMENT ON COLUMN users.email_verified IS 'Indicates whether the user email has been verified via OTP';
			COMMENT ON COLUMN users.temp_password_hash IS 'Temporary password hash stored during registration until OTP is verified. Moved to password_hash after verification.';
		`;

		await Database.query(query);
		console.log('✅ Email verification fields added to users table');
	}
}
