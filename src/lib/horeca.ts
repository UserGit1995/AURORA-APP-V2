/**
 * Le 4 categorie trasferite dall'app "Ho.Re.Ca" (aurora-app-nine).
 * Hanno gli STESSI id dell'app di origine, così il trasferimento si può rieseguire
 * senza creare doppioni. Non fanno parte delle "Marche" e hanno una sezione
 * tutta loro nella home.
 */
export const HORECA_CATEGORY_IDS: string[] = [
  '88a99207-fa2d-49cd-a978-bb4433abdcef', // Cassa | Bilancia | POS
  '9b98ba2f-3efe-4085-9247-67487c5d8325', // Ho.Re.Ca | Monouso
  '9e391273-29b8-4375-ae53-a2603df3d379', // Igiene e Pulizia
  '4c48251c-2ba8-4822-8595-a56d401085b0', // Packaging | Delivery - Asporto
];

export const isHorecaCategory = (categoryId?: string | null): boolean =>
  !!categoryId && HORECA_CATEGORY_IDS.includes(categoryId);
