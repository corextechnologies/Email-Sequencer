export interface Persona {
    id: string;
    user_id: number;
    name: string;
    industry?: string;
    role?: string;
    company_size?: string;
    location?: string;
    description?: string;
    current_challenges?: string;
    change_events?: string;
    interests_priorities?: string;
    communication_style?: string;
    demographics?: string;
    content_preferences?: string;
    buying_triggers?: string;
    geographic_location?: string;
    created_at: Date;
    updated_at: Date;
}
export interface CreatePersonaRequest {
    name: string;
    industry?: string;
    role?: string;
    company_size?: string;
    location?: string;
    description?: string;
    current_challenges?: string;
    change_events?: string;
    interests_priorities?: string;
    communication_style?: string;
    demographics?: string;
    content_preferences?: string;
    buying_triggers?: string;
    geographic_location?: string;
}
export interface UpdatePersonaRequest {
    name?: string;
    industry?: string;
    role?: string;
    company_size?: string;
    location?: string;
    description?: string;
    current_challenges?: string;
    change_events?: string;
    interests_priorities?: string;
    communication_style?: string;
    demographics?: string;
    content_preferences?: string;
    buying_triggers?: string;
    geographic_location?: string;
}
//# sourceMappingURL=personas.d.ts.map