-- Enriched Data table migration
-- This stores AI-enriched information about each contact

CREATE TABLE enriched_data (
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
CREATE INDEX idx_enriched_data_contact_id ON enriched_data(contact_id);
CREATE INDEX idx_enriched_data_user_id ON enriched_data(user_id);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_enriched_data_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_enriched_data_updated_at 
    BEFORE UPDATE ON enriched_data 
    FOR EACH ROW 
    EXECUTE FUNCTION update_enriched_data_updated_at();

