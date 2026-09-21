-- Better Auth
CREATE TABLE IF NOT EXISTS "user" (
  id text PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL UNIQUE,
  email_verified boolean NOT NULL,
  image text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS session (
  id text PRIMARY KEY,
  expires_at timestamptz NOT NULL,
  token text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL,
  ip_address text,
  user_agent text,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS account (
  id text PRIMARY KEY,
  account_id text NOT NULL,
  provider_id text NOT NULL,
  user_id text NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
  access_token text,
  refresh_token text,
  id_token text,
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  scope text,
  password text,
  created_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL
);

CREATE TABLE IF NOT EXISTS verification (
  id text PRIMARY KEY,
  identifier text NOT NULL,
  value text NOT NULL,
  expires_at timestamptz NOT NULL,
  created_at timestamptz,
  updated_at timestamptz
);

-- App documents (Firestore-shaped JSON)
CREATE TABLE IF NOT EXISTS documents (
  collection text NOT NULL,
  id text NOT NULL,
  data jsonb NOT NULL DEFAULT '{}'::jsonb,
  PRIMARY KEY (collection, id)
);

CREATE INDEX IF NOT EXISTS documents_collection_idx ON documents (collection);
CREATE INDEX IF NOT EXISTS documents_data_gin ON documents USING gin (data);

CREATE TABLE IF NOT EXISTS files (
  path text PRIMARY KEY,
  content_type text NOT NULL,
  is_public boolean NOT NULL DEFAULT false,
  bytes bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
