import type { CatalogItem, Company, Sale, Workspace } from "../domain/types";
import { dateAfter, event, lineFromProduct, uid } from "../domain/workflow";

export function seedWorkspace(): Workspace {
  const companies: Company[] = [
    {
      id: "1",
      name: "Asteria Construction Ltd",
      email: "procurement@asteria.example",
      phone: "+94 11 555 0100",
      address: "42 Park Street",
      city: "Colombo",
      status: "Active",
      contacts: [
        {
          id: "c1",
          name: "Nimal Perera",
          position: "Procurement Manager",
          email: "nimal@asteria.example",
          phone: "+94 77 555 0100",
        },
      ],
      profiles: [
        { id: "r1", name: "Procurement team", to: "c1", cc: ["company"] },
      ],
      defaultProfileId: "r1",
    },
    {
      id: "2",
      name: "Cedar & Co. Holdings",
      email: "hello@cedar.example",
      phone: "+94 77 555 0182",
      address: "18 Temple Road",
      city: "Kandy",
      status: "Active",
      contacts: [],
      profiles: [],
      defaultProfileId: "",
    },
    {
      id: "3",
      name: "Bluehaven Hospitality",
      email: "finance@bluehaven.example",
      phone: "+94 71 555 0124",
      address: "7 Lighthouse Street",
      city: "Galle",
      status: "Inactive",
      contacts: [],
      profiles: [],
      defaultProfileId: "",
    },
  ];
  const products: CatalogItem[] = [
    {
      id: "PRD-001",
      itemNo: "1.1",
      type: "Product",
      description: "Modular workstation",
      category: "Office furniture",
      unit: "Item",
      rate: 1250,
      available: 18,
    },
    {
      id: "PRD-002",
      itemNo: "1.2",
      type: "Product",
      description: "Ergonomic task chair",
      category: "Office furniture",
      unit: "Item",
      rate: 650,
      available: 42,
    },
    {
      id: "SRV-001",
      itemNo: "2.1",
      type: "Service",
      description: "Installation service",
      category: "Services",
      unit: "Item",
      rate: 350,
      available: null,
    },
    {
      id: "PRD-003",
      itemNo: "1.3",
      type: "Product",
      description: "Meeting table · oak finish",
      category: "Office furniture",
      unit: "Item",
      rate: 1800,
      available: 8,
    },
  ].map((p) => ({
    ...p,
    type: p.type as CatalogItem["type"],
    name: p.description,
    price: p.rate,
    attributes: {},
  }));
  const specs = [
    ["S00042", "Workspace fit-out · Phase 02", "1", "Draft", 8, 8],
    ["S00041", "Meeting room furniture", "2", "Sent", 2, 6],
    ["S00040", "Head office refurbishment", "1", "Accepted", 4, 4],
    ["S00039", "Reception & guest seating", "2", "Draft", 1, 4],
    ["S00038", "Office expansion", "1", "Hold", 6, 6],
    ["S00037", "Executive office furniture", "2", "Accepted", 2, 2],
  ] as const;
  const sales: Sale[] = specs.map(
    ([number, title, customerId, status, desks, chairs], idx) => {
      const c = companies.find((c) => c.id === customerId)!;
      return {
        id: uid(),
        number,
        title,
        description:
          "Supply and installation of office furniture, including on-site assembly and final inspection.",
        customerId,
        customer: c.name,
        customerEmail: c.email,
        customerPhone: c.phone,
        customerAddress: `${c.address}, ${c.city}`,
        date: dateAfter(-idx * 2),
        expiry: dateAfter(30 - idx * 2),
        status,
        lines: [
          { ...lineFromProduct(products[0]), quantity: desks },
          { ...lineFromProduct(products[1]), quantity: chairs },
          lineFromProduct(products[2]),
        ],
        discount: 0,
        taxRate: 0,
        notes:
          "Please reference the order number with your payment.\nThank you for choosing GOELTA.",
        recipients: [{ role: "To", email: c.email }],
        history: [event("Demo quotation created")],
        isDemo: true,
      };
    },
  );
  return {
    version: 1,
    companies,
    products,
    extraColumns: [],
    sales,
    invoices: [],
    purchases: [],
  };
}
