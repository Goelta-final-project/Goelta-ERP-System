import { createContext, useContext, type ReactNode } from 'react';
import { Alert } from '@mui/material';
import { usePersistentState } from './use-persistent-state';
import { isRecord, validAttributes } from './sales-logic';

export type CatalogItem = { id: string; itemNo: string; type: 'Product' | 'Service'; description: string; category: string; unit: string; rate: number; available: number | null; name: string; price: number; attributes: Record<string, string | number> };

export const catalogSeed: CatalogItem[] = [
  { id: 'PRD-001', itemNo: '1.1', type: 'Product', description: 'Modular workstation', name: 'Modular workstation', category: 'Furniture', unit: 'Item', rate: 1250, price: 1250, available: 18, attributes: {} },
  { id: 'PRD-002', itemNo: '1.2', type: 'Product', description: 'Ergonomic task chair', name: 'Ergonomic task chair', category: 'Furniture', unit: 'Item', rate: 650, price: 650, available: 42, attributes: {} },
  { id: 'SRV-001', itemNo: '2.1', type: 'Service', description: 'Installation service', name: 'Installation service', category: 'Services', unit: 'Item', rate: 350, price: 350, available: null, attributes: {} },
];

export function validCatalog(value: unknown): value is CatalogItem[] {
  if (!Array.isArray(value)) return false;
  if (!value.every(c => isRecord(c) && ['id', 'itemNo', 'description', 'category', 'unit', 'name'].every(k => typeof c[k] === 'string' && String(c[k]).trim()) && typeof c.price === 'number' && Number.isFinite(c.price) && c.price >= 0 && c.price === c.rate && (c.type === 'Service' ? c.available === null : c.type === 'Product' && typeof c.available === 'number' && Number.isFinite(c.available) && c.available >= 0) && validAttributes(c.attributes))) return false;
  return new Set(value.map(c => c.id.toLowerCase())).size === value.length;
}
const CatalogContext = createContext<{ items: CatalogItem[]; replace: (items: CatalogItem[]) => boolean }>({ items: catalogSeed, replace: () => false });
export const useCatalog = () => useContext(CatalogContext);

export function CatalogProvider({ children }: { children: ReactNode }) {
  const { value: items, commit: replace, error } = usePersistentState('goelta.catalog.v1', catalogSeed, validCatalog);
  return <CatalogContext.Provider value={{ items, replace }}>{error && <Alert severity="error">{error}</Alert>}{children}</CatalogContext.Provider>;
}
