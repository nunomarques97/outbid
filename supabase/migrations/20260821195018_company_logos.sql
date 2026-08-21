-- Genuine schema gap: companies had logo_color (the initials-avatar
-- background) but no field for a real uploaded logo image. Additive,
-- nullable — absence means "no logo yet", the frontend falls back to the
-- initials avatar exactly as it already does for every seeded company.
--
-- Stores the storage PATH, not the public URL (the frontend derives the URL
-- via supabase.storage.from('company-logos').getPublicUrl(path) at read
-- time) — this is what makes "replace a logo" clean: each upload gets a
-- fresh random path, so there's no URL-caching ambiguity, and the previous
-- object can be deleted outright once the new path is saved, rather than
-- needing to reason about overwriting a fixed path in place.
alter table public.companies
  add column logo_path text;

-- ---------------------------------------------------------------------------
-- Storage: a public-read bucket for logos. Objects are stored at
-- "<company_id>/<random>.<ext>", which is what the RLS policies below parse
-- to authorize writes — the same is_company_member() helper every other
-- write policy in this project already uses, not a second authorization
-- mechanism.
-- ---------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values ('company-logos', 'company-logos', true)
on conflict (id) do nothing;

create policy "company logos are publicly readable"
  on storage.objects for select
  using (bucket_id = 'company-logos');

create policy "company members can upload their company's logo"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'company-logos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy "company members can replace their company's logo"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );

create policy "company members can remove their company's logo"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'company-logos'
    and public.is_company_member(((storage.foldername(name))[1])::uuid)
  );
