export type Application = {
  id: string;
  name: string;
  description: string;
  icon: string;
  tone: string;
  href?: string;
};

// A tile is enabled only when it has an href. Keep planned modules in this
// list without an href so the launcher can show them as intentionally locked.
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
  },
];
