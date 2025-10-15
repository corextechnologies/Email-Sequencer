-- Personas table migration
-- This stores detailed persona information for targeted email marketing

CREATE TABLE personas (
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
CREATE INDEX idx_personas_user_id ON personas(user_id);
CREATE INDEX idx_personas_name ON personas(name);
CREATE INDEX idx_personas_industry ON personas(industry);
CREATE INDEX idx_personas_role ON personas(role);

-- Trigger to update updated_at
CREATE OR REPLACE FUNCTION update_personas_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_personas_updated_at 
    BEFORE UPDATE ON personas 
    FOR EACH ROW 
    EXECUTE FUNCTION update_personas_updated_at();
