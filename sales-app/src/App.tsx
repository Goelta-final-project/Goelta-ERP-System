import {useEffect} from "react";
import {
    Route,
    Routes,
} from "react-router-dom";
import Header from "./components/layout/header";
import Footer from "./components/layout/footer";
import DashboardPage from "./features/dashboard/pages/dashboard-page";
import {useWorkspace, WorkspaceProvider} from "./store/store";
import {SaleRoute, SalesList} from "./features/sales/routes/sales";
import {CustomerList, CustomerRoute} from "./features/customers/routes/customers";
import {Products} from "./features/products/routes/products";
import {InvoiceList, InvoiceRoute} from "./features/invoices/routes/invoices";
import {PurchaseList, PurchaseRoute} from "./features/purchases/routes/purchases";
import {MdClose} from "react-icons/md";


function Shell() {
    const {state, error, notice, clearNotice} = useWorkspace();

    useEffect(() => {
        if (!notice) return;
        const timeout = setTimeout(clearNotice, 4000);
        return () => clearTimeout(timeout);
    }, [notice, clearNotice]);


    return (
        <>
            <Header/>

            <main id="main" tabIndex={-1}>

                <Routes>
                    <Route path="/" element={<DashboardPage/>}/>
                    <Route path="/quotations" element={<SalesList/>}/>
                    <Route
                        path="/orders"
                        element={<SalesList key="orders" mode="orders"/>}
                    />
                    <Route
                        path="/to-invoice"
                        element={<SalesList key="to-invoice" mode="to-invoice"/>}
                    />
                    <Route path="/quotations/:id" element={<SaleRoute/>}/>
                    <Route path="/quotations/:id/edit" element={<SaleRoute edit/>}/>
                    <Route path="/customers" element={<CustomerList/>}/>
                    <Route path="/customers/:id" element={<CustomerRoute/>}/>
                    <Route path="/products" element={<Products/>}/>
                    <Route path="/invoices" element={<InvoiceList/>}/>
                    <Route path="/invoices/:id" element={<InvoiceRoute/>}/>
                    <Route path="/purchases" element={<PurchaseList/>}/>
                    <Route path="/purchases/:id" element={<PurchaseRoute/>}/>
                    <Route path="/purchases/:id/edit" element={<PurchaseRoute edit/>}/>
                    <Route
                        path="*"
                        element={
                            <p>page not found</p>
                        }
                    />
                </Routes>
            </main>
            {notice && (
                <div className="toast" role="status">

                    <button aria-label="Dismiss notification" onClick={clearNotice}>
                        <MdClose size={16}/>
                    </button>
                </div>
            )}
            <Footer/>
        </>
    );
}

export default function App() {
    return (
        <WorkspaceProvider>
            <Shell/>
        </WorkspaceProvider>
    );
}
