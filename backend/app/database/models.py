# Supabase manages the schema directly via PostgreSQL.
# Run the following SQL once in the Supabase SQL Editor to create the table:
#
# CREATE TABLE hairstyles (
#   id          BIGSERIAL PRIMARY KEY,
#   name        TEXT        NOT NULL,
#   image_path  TEXT        NOT NULL,   -- Supabase Storage public URL
#   preview_path TEXT,
#   created_at  TIMESTAMPTZ DEFAULT NOW()
# );
#
# Storage bucket (create in Supabase Dashboard → Storage):
#   Bucket name : hairstyles
#   Public      : true   (so images are served via public CDN URL)
