import { createFileRoute, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { getCategories, addCategory } from '../server/categories';

export const Route = createFileRoute('/')({
  loader: () => getCategories(),
  component: CategoriesPage,
});

function CategoriesPage() {
  const categories = Route.useLoaderData();
  const router = useRouter();
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await addCategory({ data: name });
      setName('');
      // Ricarica i dati senza fare il refresh della pagina
      await router.invalidate(); 
    } catch (err: any) {
      setError(err.message || 'Errore imprevisto');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: '2rem', maxWidth: '500px', margin: '0 auto', fontFamily: 'sans-serif' }}>
      <h1>Gestione Categorie</h1>

      {/* Form di inserimento */}
      <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px', marginBottom: '1rem' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome nuova categoria..."
          disabled={loading}
          style={{ flex: 1, padding: '8px' }}
        />
        <button type="submit" disabled={loading || !name.trim()} style={{ padding: '8px 16px' }}>
          {loading ? 'Salvataggio...' : 'Salva'}
        </button>
      </form>

      {/* Messaggio di Errore */}
      {error && <p style={{ color: 'red', fontSize: '14px' }}>{error}</p>}

      {/* Lista Categorie */}
      <h2>Categorie Esistenti</h2>
      <ul>
        {categories.map((cat: any) => (
          <li key={cat.id}>{cat.name}</li>
        ))}
      </ul>
    </div>
  );
}