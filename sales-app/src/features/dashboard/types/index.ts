export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';
export type MovementType = 'receipt' | 'delivery' | 'internal' | 'adjustment';

export interface InventoryItem {
    id: string;
    sku: string;
    name: string;
    category: string;
    warehouse: string;
    quantityOnHand: number;
    reserved: number;
    freeToUse: number;
    minThreshold: number;
    unitCost: number;
    unitPrice: number;
    unit: string;
    status: StockStatus;
    lastRestocked: string;
}

export interface StockMovement {
    id: string;
    ref: string;
    date: string;
    itemName: string;
    sku: string;
    fromLocation: string;
    toLocation: string;
    quantity: number;
    type: MovementType;
    status: 'completed' | 'pending' | 'draft';
    operator: string;
}