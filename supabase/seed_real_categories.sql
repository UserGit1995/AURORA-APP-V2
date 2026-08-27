-- Le 7 categorie "di esempio" già presenti nell'app avevano ID finti tipo
-- "igiene-casa" invece di UUID veri: per questo ogni prodotto assegnato a una
-- di queste categorie veniva rifiutato dal database (category_id non valido).
-- Questa query le crea davvero, con UUID reali, mantenendo lo stesso nome/slug.
insert into public.categories (name, slug, description, sort_order, active)
values
  ('Igiene Casa', 'igiene-casa', 'Detergenti multiuso, igienizzanti e prodotti per superfici dure, bagni e cucine.', 1, true),
  ('Igiene Corpo', 'igiene-corpo', 'Saponi liquidi, bagnoschiuma professionali, shampoo e cura della persona.', 2, true),
  ('Detersivi', 'detersivi', 'Detersivi per lavatrice, polveri concentrate, ammorbidenti e smacchiatori.', 3, true),
  ('Casa', 'casa', 'Articoli e soluzioni complete per la cura, pulizia e accoglienza della casa.', 4, true),
  ('Accessori Pulizia', 'accessori-pulizia', 'Mop professionali, secchi industriali, panni microfibra, spugne abrasive.', 5, true),
  ('Carta e Monouso', 'carta-monouso', 'Carta igienica maxi rotoli, asciugamani piegati a V/Z, tovaglioli e bobine.', 6, true),
  ('Profumatori', 'profumatori', 'Diffusori a bastoncino, spray essenziali persistenti per ambienti e tessuti.', 7, true)
on conflict (slug) do nothing;
