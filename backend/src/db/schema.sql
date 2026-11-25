CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  name VARCHAR(80) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS collections (
  id UUID PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(300) DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS saved_requests (
  id UUID PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  method VARCHAR(10) NOT NULL CHECK (method IN ('GET','POST','PUT','DELETE')),
  url TEXT NOT NULL,
  headers JSONB NOT NULL DEFAULT '{}'::jsonb,
  params JSONB NOT NULL DEFAULT '{}'::jsonb,
  body JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS share_snapshots (
  id UUID PRIMARY KEY,
  collection_id UUID NOT NULL REFERENCES collections(id) ON DELETE CASCADE,
  token VARCHAR(80) UNIQUE NOT NULL,
  snapshot JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  expires_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_collections_user ON collections(user_id);
CREATE INDEX IF NOT EXISTS idx_saved_requests_collection ON saved_requests(collection_id);
CREATE INDEX IF NOT EXISTS idx_share_token ON share_snapshots(token);

CREATE TABLE IF NOT EXISTS relay_store (
  resource_type TEXT NOT NULL, resource_id TEXT NOT NULL, payload JSONB NOT NULL, updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY(resource_type, resource_id)
);
