export type Application = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  href?: string;
};

export const applications: readonly Application[] = [
  {
    id: "sales",
    name: "Sales",
    description: "Quotations & orders",
    icon: "cart",
    tone: "green",
    href: "/sales/quotations",
  },
  {
    id: "accounting",
    name: "Accounting",
    description: "Customer invoices",
    icon: "file",
    tone: "teal",
    href: "/sales/invoices",
  },
  {
    id: "projects",
    name: "Projects",
    description: "Tasks & sites",
    icon: "project",
    tone: "blue",
  },
  {
    id: "inventory",
    name: "Inventory",
    description: "Products & stock",
    icon: "box",
    tone: "orange",
    href: "/sales/products",
  },
  {
    id: "hr",
    name: "HR",
    description: "Employees & payroll",
    icon: "users",
    tone: "violet",
  },
  {
    id: "stakeholders",
    name: "Stakeholders",
    description: "Customers & contacts",
    icon: "handshake",
    tone: "plum",
    href: "/sales/customers",
  },
  {
    id: "settings",
    name: "Settings",
    description: "Configuration & access",
    icon: "settings",
    tone: "slate",
  },
];
