/** Immagini "vere" di prodotto: esclude i segnaposto (logo Aurora, icona vuota). */
export function hasRealImage(image?: string | null): boolean {
  if (!image) return false;
  if (image.endsWith('/logo-login.png')) return false;
  if (image.startsWith('data:image/svg')) return false;
  return true;
}
