-- ============================================================================
-- ANNULLA il trasferimento Ho.Re.Ca: rimuove SOLO i prodotti, le sottocategorie e le
-- categorie aggiunte da trasferimento_horeca.sql. I tuoi prodotti di prima non si toccano.
-- ============================================================================
begin;
delete from public.products where extra_data->>'source' = 'horeca-2026-09-30';
delete from public.subcategories where category_id in ('4c48251c-2ba8-4822-8595-a56d401085b0', '88a99207-fa2d-49cd-a978-bb4433abdcef', '9b98ba2f-3efe-4085-9247-67487c5d8325', '9e391273-29b8-4375-ae53-a2603df3d379');
delete from public.categories where id in ('4c48251c-2ba8-4822-8595-a56d401085b0', '88a99207-fa2d-49cd-a978-bb4433abdcef', '9b98ba2f-3efe-4085-9247-67487c5d8325', '9e391273-29b8-4375-ae53-a2603df3d379');
commit;
select count(*) as prodotti_horeca_rimasti from public.products where extra_data->>'source' = 'horeca-2026-09-30';
