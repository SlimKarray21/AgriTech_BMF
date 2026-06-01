-- Fix existing created_by values: replace user_id references with profile.id references
UPDATE profiles p
SET created_by = creator.id
FROM profiles creator
WHERE p.created_by = creator.user_id
AND p.created_by IS NOT NULL;