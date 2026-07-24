-- Clean up skill names by removing unwanted suffixes
-- Pattern: skillname_<candidate_id>_<random_string>

-- Update skills table to use skill_name if available, otherwise extract base name from name
UPDATE skills 
SET name = CASE 
    WHEN skill_name IS NOT NULL AND skill_name != '' THEN skill_name
    WHEN name ~ '_[a-f0-9]{8}_[a-z0-9]+$' THEN 
        -- Extract base name before the suffix pattern
        SUBSTRING(name FROM '^(.+?)_[a-f0-9]{8}_[a-z0-9]+$')
    ELSE name
END
WHERE name ~ '_[a-f0-9]{8}_[a-z0-9]+$';

-- Also update the skill_name field to match the cleaned name for consistency
UPDATE skills 
SET skill_name = name 
WHERE skill_name IS NULL OR skill_name = '';

-- Log the cleanup
DO $$
DECLARE 
    cleaned_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO cleaned_count FROM skills WHERE name NOT LIKE '%_%_%' OR skill_name IS NOT NULL;
    RAISE NOTICE 'Cleaned up % skills', cleaned_count;
END $$;
