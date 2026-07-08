-- Lets an owner set a personal nickname for a plant, separate from its
-- common name (plants.name) and Latin species.
alter table public.plants add column nickname text;
