-- Expands the AI plant lookup beyond name/species/watering frequency.
-- All four columns are nullable -- a plant added without ever running
-- the lookup (or from before this migration) simply has them unset,
-- same handling as every other optional plant field.
alter table public.plants
  add column light_exposure text check (light_exposure in ('low_light', 'medium_light', 'bright_indirect', 'direct_sun')),
  add column care_difficulty text check (care_difficulty in ('beginner', 'intermediate', 'advanced')),
  add column toxic_to_pets text check (toxic_to_pets in ('yes', 'no', 'unknown')),
  add column toxic_to_humans text check (toxic_to_humans in ('yes', 'no', 'unknown'));
