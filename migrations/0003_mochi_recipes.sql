ALTER TABLE mochi ADD COLUMN recipe TEXT CHECK (recipe IS NULL OR (json_valid(recipe) AND length(CAST(recipe AS BLOB)) <= 16384));
