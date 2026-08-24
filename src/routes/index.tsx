import { createFileRoute } from '@tanstack/react-router';
import { getProducts } from '../lib/products.functions';

export const Route = createFileRoute('/')({
  loader: () => getProducts(),
  component: IndexComponent,
});

function IndexComponent() {
  const products = Route.useLoaderData();

  return (
    <div style={{ padding: '20px', fontFamily: 'sans-serif' }}>
      <h1>Prodotti</h1>
      {Array.isArray(products) && products.length > 0 ? (
        <ul>
          {products.map((item: any) => (
            <li key={item.id}>{item.name || JSON.stringify(item)}</li>
          ))}
        </ul>
      ) : (
        <p>Nessun prodotto trovato.</p>
      )}
    </div>
  );
}
