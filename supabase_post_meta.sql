-- Post meta: run in Supabase SQL Editor (after supabase_community_tables.sql)
-- Stores validation score/badge on cross-posted ideas: { overallScore, badge, validated }
alter table community_posts add column if not exists meta jsonb;
