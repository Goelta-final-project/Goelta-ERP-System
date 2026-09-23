import TitleHeader from "../../../components/shared/title-header";
import {Link, useNavigate} from "react-router-dom";
import {SalesTrendChart} from "../components/sales-trend-chart";
import {GoArrowRight, GoPackage} from "react-icons/go";
import {INITIAL_INVENTORY, INITIAL_MOVEMENTS} from "../../../constants";
import {useState} from "react";
import {InventoryItem, StockMovement} from "../types";

export default function DashboardPage() {
    const navigate = useNavigate();
    const [inventory, setInventory] = useState<InventoryItem[]>(INITIAL_INVENTORY);
    const [movements, setMovements] = useState<StockMovement[]>(INITIAL_MOVEMENTS);
    const [adjustStockItemId, setAdjustStockItemId] = useState<string | undefined>(undefined);
    const [isAdjustStockOpen, setIsAdjustStockOpen] = useState(false);

    const [toastMessage, setToastMessage] = useState<string | null>(null);

    const showToast = (msg: string) => {
        setToastMessage(msg);
        setTimeout(() => {
            setToastMessage(null);
        }, 3500);
    };

    const handleStockAdjust = (updatedItem: InventoryItem, movement: StockMovement) => {
        setInventory((prev) => prev.map((item) => (item.id === updatedItem.id ? updatedItem : item)));
        setMovements([movement, ...movements]);
        showToast(`Stock updated: ${updatedItem.name} (${updatedItem.quantityOnHand} ${updatedItem.unit} on hand)`);
    }

    const handleOpenAdjustStock = (itemId?: string) => {
        setAdjustStockItemId(itemId);
        setIsAdjustStockOpen(true);
    };

    return (
        <>
            <TitleHeader
                title={"Goelta Integrated Operations Hub"}
                subtitle={"Real-time synchronization between sales agreements, warehouse inventory, and site task execution."}
            />

            {/*overview grid*/}
            <div className="summary-strip">
                <div>
                    <span>Total Sales Revenue</span>
                    <strong>
                        LKR 8,450,000
                    </strong>
                    <small>
                        +14.2% from last month</small>
                </div>
                <div>
                    <span>Active Quotations</span>
                    <strong>
                        12 Pending
                    </strong>
                    <small>
                        Value: LKR 1,820,000
                    </small>
                </div>
                <div>
                    <span>Orders To Invoice</span>
                    <strong>
                        5 Ready
                    </strong>
                    <small>
                        Requires Billing Action
                    </small>
                </div>
                <div>
                    <span>Conversion Rate</span>
                    <strong>
                        68.5%
                    </strong>
                    <small>
                        Quotations → Confirmed Orders
                    </small>
                </div>
            </div>

            {/* Sales & Operational Trend */}
            <div className="lg:col-span-2 bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Revenue & Job Flow Trajectory</h3>
                        <p className="text-xs text-slate-500">Commercial orders & fulfillment velocity across 2026</p>
                    </div>
                    <button
                        onClick={() => navigate('sales')}
                        className="text-xs text-sky-600 hover:text-sky-700 font-semibold flex items-center gap-1 cursor-pointer"
                    >
                        <span>Sales Module</span>
                        <GoArrowRight className="w-3 h-3"/>
                    </button>
                </div>

                <SalesTrendChart/>
            </div>

            {/* Stock Reorder Radar Widget */}
            <div
                className="bg-white rounded-2xl p-6 border border-slate-200/80 shadow-xs flex flex-col justify-between">
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <h3 className="text-base font-bold text-slate-900">Stock Threshold Watch</h3>
                        <button
                            onClick={() => navigate('inventory')}
                            className="text-xs text-amber-600 hover:text-amber-700 font-semibold cursor-pointer"
                        >
                            All Stock &rarr;
                        </button>
                    </div>
                    <p className="text-xs text-slate-500 mb-4">Live inventory below or near safety reorder minimums</p>

                    <div className="space-y-3.5">
                        {INITIAL_INVENTORY.slice(0, 4).map((item) => {
                            const ratio = Math.min(100, Math.round((item.quantityOnHand / (item.minThreshold * 2)) * 100));
                            return (
                                <div key={item.id} className="text-xs">
                                    <div className="flex justify-between items-center mb-1">
                      <span className="font-semibold text-slate-800 truncate max-w-[170px]" title={item.name}>
                        {item.name}
                      </span>
                                        <span className={`font-mono font-bold ${
                                            item.status === 'in_stock'
                                                ? 'text-emerald-600'
                                                : item.status === 'low_stock'
                                                    ? 'text-amber-600'
                                                    : 'text-rose-600'
                                        }`}>
                        {item.quantityOnHand} {item.unit}
                      </span>
                                    </div>

                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className={`h-full rounded-full ${
                                                item.status === 'in_stock'
                                                    ? 'bg-emerald-500'
                                                    : item.status === 'low_stock'
                                                        ? 'bg-amber-500'
                                                        : 'bg-rose-500'
                                            }`}
                                            style={{width: `${Math.max(8, ratio)}%`}}
                                        ></div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100">
                    <button
                        onClick={() => handleOpenAdjustStock}
                        className="w-full py-2 bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-semibold rounded-xl border border-amber-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                    >
                        <GoPackage className="w-3.5 h-3.5 text-amber-600"/>
                        <span>Record Stock Replenishment</span>
                    </button>
                </div>
            </div>
        </>
    )
}