import { createContext, useContext, useState, type ReactNode } from 'react';

export type CatalogItem = { id: string; itemNo: string; type: 'Product' | 'Service'; description: string; category: string; unit: string; rate: number; available: number | null; name: string; price: number; attributes: Record<string, string | number> };

export const catalogSeed: CatalogItem[] = [
  { id: 'PRD-001', itemNo: '1.1', type: 'Product', description: 'Modular workstation', name: 'Modular workstation', category: 'Furniture', unit: 'Item', rate: 1250, price: 1250, available: 18, attributes: {} },
  { id: 'PRD-002', itemNo: '1.2', type: 'Product', description: 'Ergonomic task chair', name: 'Ergonomic task chair', category: 'Furniture', unit: 'Item', rate: 650, price: 650, available: 42, attributes: {} },
  { id: 'SRV-001', itemNo: '2.1', type: 'Service', description: 'Installation service', name: 'Installation service', category: 'Services', unit: 'Item', rate: 350, price: 350, available: null, attributes: {} },
];

const CatalogContext = createContext<{ items: CatalogItem[]; replace: (items: CatalogItem[]) => void }>({ items: catalogSeed, replace: () => undefined });
export const useCatalog = () => useContext(CatalogContext);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState(catalogSeed);
  const replace = (next: CatalogItem[]) => { catalogSeed.splice(0, catalogSeed.length, ...next); setItems(next); };
  return <CatalogContext.Provider value={{ items, replace }}>{children}</CatalogContext.Provider>;
}
