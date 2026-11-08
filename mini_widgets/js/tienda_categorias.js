import { ref, onValue, set } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';

export const CATEGORIAS_BASE = [
  { key: 'comida', nombre: 'Comidas', emoji: '🫓' },
  { key: 'bebida', nombre: 'Bebidas', emoji: '☕' },
  { key: 'postre', nombre: 'Postres', emoji: '🍰' },
  { key: 'especial', nombre: 'Especiales', emoji: '⭐' },
  { key: 'recurso', nombre: 'Recursos', emoji: '🐺' }
];

export function resolverCategorias(guardadas = [], items = []) {
  const categorias = new Map(CATEGORIAS_BASE.map(c => [c.key, { ...c }]));
  for (const item of items) {
    const key = item.categoria || 'comida';
    if (!categorias.has(key)) categorias.set(key, { key, nombre: key, emoji: '🏷️' });
  }
  for (const categoria of guardadas) {
    if (categoria?.key && categoria.key !== 'todos' && categoria.nombre) {
      categorias.set(categoria.key, { key: categoria.key, nombre: String(categoria.nombre), emoji: String(categoria.emoji || '🏷️') });
    }
  }
  return [...categorias.values()];
}

export function escucharCategorias(db, callback, onError = console.warn) {
  return onValue(ref(db.rtdb, 'stream/tienda/categorias'), snap => {
    const value = snap.val() || {};
    callback(Object.entries(value).map(([key, categoria]) => ({ ...categoria, key })));
  }, onError);
}

export async function guardarCategoria(db, categoria) {
  if (!/^[a-z0-9_-]+$/.test(categoria.key) || categoria.key === 'todos') throw new Error('Categoría no válida.');
  const nombre = categoria.nombre.trim();
  const emoji = categoria.emoji.trim() || '🏷️';
  if (!nombre || nombre.length > 50 || emoji.length > 16) throw new Error('Revisa el nombre y el ícono de la categoría.');
  await set(ref(db.rtdb, `stream/tienda/categorias/${categoria.key}`), { nombre, emoji });
}
