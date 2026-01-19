-- Chatbot Query History Table
-- Tracks user queries for personalization
CREATE TABLE IF NOT EXISTS chatbot_query_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    query TEXT NOT NULL,
    intent TEXT,
    route TEXT,
    context JSONB,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_query_history_user ON chatbot_query_history(user_id);
CREATE INDEX IF NOT EXISTS idx_query_history_created ON chatbot_query_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_query_history_route ON chatbot_query_history(route);

-- Chatbot Button Analytics Table
-- Tracks button clicks for optimization
CREATE TABLE IF NOT EXISTS chatbot_button_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
    button_label TEXT NOT NULL,
    button_query TEXT NOT NULL,
    button_category TEXT,
    route TEXT,
    clicked_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_button_analytics_user ON chatbot_button_analytics(user_id);
CREATE INDEX IF NOT EXISTS idx_button_analytics_route ON chatbot_button_analytics(route);

-- Enable Row Level Security
ALTER TABLE chatbot_query_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE chatbot_button_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for chatbot_query_history
CREATE POLICY "Users can view own query history"
    ON chatbot_query_history FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own query history"
    ON chatbot_query_history FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- RLS Policies for chatbot_button_analytics
CREATE POLICY "Users can view own button analytics"
    ON chatbot_button_analytics FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own button analytics"
    ON chatbot_button_analytics FOR INSERT
    WITH CHECK (auth.uid() = user_id);
