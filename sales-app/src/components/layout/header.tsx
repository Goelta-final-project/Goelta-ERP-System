import {Link, NavLink, useLocation} from "react-router-dom";
import {Icon} from "../../ui";
import {useEffect} from "react";

export default function Header() {
    const location = useLocation();

    useEffect(() => {
        window.scrollTo(0, 0);
    }, [location.pathname]);

    const purchase = location.pathname.startsWith("/purchases");
    const invoices = location.pathname.startsWith("/invoices");

    return (
        <>
            <header className="topbar">
                <Link className="brand" to="/quotations">
          <span className="app-icon">
            <Icon name="grid" size={20}/>
          </span>
                    GOELTA
                    <span className="brand-divider"/>
                </Link>
                <span className="app-name">
          {purchase ? "Purchase" : invoices ? "Invoicing" : "Sales"}
        </span>
                <nav aria-label="Main navigation">
                    <NavLink to="/">Dasboard</NavLink>
                    <NavLink
                        to="/orders"
                        // className={
                        //     location.pathname.startsWith("/quotations") ||
                        //     location.pathname === "/orders" ||
                        //     location.pathname === "/to-invoice"
                        //         ? "active"
                        //         : ""
                        // }
                    >
                       Sales Orders
                    </NavLink>
                    <NavLink to="/quotations">Quotations</NavLink>
                    <NavLink to="/customers">Customers</NavLink>
                    {/*TEMPORARILY COMMENTED BECUASE NO IDEA WHAT TO DO HERE AS IN RESPECT TO THE REFERENCE*/}

                    {/*<NavLink to="/products">Products</NavLink>*/}
                    {/*<NavLink to="/purchases">Purchase</NavLink>*/}
                </nav>
                <div className="topbar-right">
                    <span className="workspace-name">GOELTA Workspace</span>
                    <span className="user-avatar" title="Local workspace">
            G
          </span>
                </div>
            </header>
            <div className="subnav">
                <nav aria-label="Sales navigation">
                    {(purchase
                            ? [
                                ["Requests & purchase orders", "/purchases"],
                                ["Products", "/products"],
                            ]
                            : invoices
                                ? [
                                    ["Customer invoices", "/invoices"],
                                    ["Orders to invoice", "/to-invoice"],
                                ]
                                : [
                                    ["Quotations", "/quotations"],
                                    ["Sales orders", "/orders"],
                                    ["Orders to invoice", "/to-invoice"],
                                ]
                    ).map(([label, to]) => (
                        <NavLink key={to} to={to}>
                            {label}
                        </NavLink>
                    ))}
                </nav>
                {/*        <span className="local-indicator">*/}
                {/*  <i/>*/}
                {/*            {state.sales.length && state.sales.every((s) => s.isDemo)*/}
                {/*                ? "Demo workspace"*/}
                {/*                : "Local workspace"}*/}
                {/*</span>*/}
            </div>
        </>

    )
}