import type { CatalogItem, Company, Line, Sale, Workspace } from "../types/model";
import {
  amountDue,
  dateAfter,
  event,
  invoiceTotal,
  lineFromProduct,
  totals,
  uid,
  validDate,
  validateCompany,
  validateLines,
  validateRecipients,
} from "../types/domain";
import { validExtraColumns } from "../types/schema";

export const storageKey = "goelta.sales-workspace.v1";
const record = (v: unknown): v is Record<string, any> =>
  !!v && typeof v === "object" && !Array.isArray(v);
const strings = (v: Record<string, any>, keys: string[]) =>
  keys.every((k) => typeof v[k] === "string");
const unique = (v: { id: string }[]) =>
  new Set(v.map((x) => x.id.toLowerCase())).size === v.length;
const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);
const attributes = (v: unknown) =>
  record(v) &&
  Object.values(v).every((x) => typeof x === "string" || finite(x));
const history = (v: unknown) =>
  Array.isArray(v) &&
  v.every(
    (e) =>
      record(e) &&
      strings(e, ["id", "date", "message"]) &&
      Number.isFinite(Date.parse(e.date)),
  );
export function validCompany(c: unknown): c is Company {
  try {
    if (
      !record(c) ||
      !strings(c, [
        "id",
        "name",
        "email",
        "phone",
        "address",
        "city",
        "defaultProfileId",
      ]) ||
      !["Active", "Inactive"].includes(c.status)
    )
      return false;
    if (
      !Array.isArray(c.contacts) ||
      !c.contacts.every(
        (p: unknown) =>
          record(p) && strings(p, ["id", "name", "position", "email", "phone"]),
      )
    )
      return false;
    if (
      !Array.isArray(c.profiles) ||
      !c.profiles.every(
        (p: unknown) =>
          record(p) &&
          strings(p, ["id", "name", "to"]) &&
          Array.isArray(p.cc) &&
          p.cc.every((s: unknown) => typeof s === "string"),
      )
    )
      return false;
    validateCompany(c as Company);
    return true;
  } catch {
    return false;
  }
}
export function validProduct(p: unknown): p is CatalogItem {
  return (
    record(p) &&
    strings(p, ["id", "itemNo", "description", "category", "unit", "name"]) &&
    [p.id, p.description, p.unit].every((s) => s.trim()) &&
    finite(p.rate) &&
    p.rate >= 0 &&
    p.rate * 100 <= Number.MAX_SAFE_INTEGER &&
    p.price === p.rate &&
    (p.type === "Service"
      ? p.available === null
      : p.type === "Product" &&
        finite(p.available) &&
        p.available >= 0 &&
        p.available <= Number.MAX_SAFE_INTEGER) &&
    attributes(p.attributes)
  );
}
function validLines(v: unknown): v is Line[] {
  return (
    Array.isArray(v) &&
    v.every(
      (l) =>
        record(l) &&
        strings(l, ["id", "kind", "itemNo", "description", "unit"]) &&
        (l.catalogId === undefined || typeof l.catalogId === "string") &&
        finite(l.quantity) &&
        finite(l.unitPrice) &&
        attributes(l.attributes),
    ) &&
    (() => {
      try {
        validateLines(v);
        return true;
      } catch {
        return false;
      }
    })()
  );
}
export function validWorkspace(value: unknown): value is Workspace {
  try {
    if (
      !record(value) ||
      value.version !== 1 ||
      !["companies", "products", "sales", "invoices", "purchases"].every(
        (k) =>
          Array.isArray(value[k]) &&
          value[k].every(
            (r: unknown) => record(r) && typeof r.id === "string" && !!r.id,
          ) &&
          unique(value[k]),
      )
    )
      return false;
    const s = value as Workspace;
    if (
      !validExtraColumns(s.extraColumns) ||
      !s.companies.every(validCompany) ||
      !s.products.every(validProduct)
    )
      return false;
    for (const collection of [s.sales, s.invoices, s.purchases])
      if (
        collection.some(
          (r) => typeof r.number !== "string" || !r.number.trim(),
        ) ||
        new Set(collection.map((r) => r.number.toLowerCase())).size !==
          collection.length
      )
        return false;
    for (const q of s.sales) {
      if (
        !strings(q, [
          "number",
          "title",
          "description",
          "customerId",
          "customer",
          "customerEmail",
          "customerPhone",
          "customerAddress",
          "date",
          "expiry",
          "notes",
        ]) ||
        ![
          "Draft",
          "Sent",
          "Hold",
          "Accepted",
          "Rejected",
          "Cancelled",
        ].includes(q.status) ||
        !validDate(q.date) ||
        !validDate(q.expiry) ||
        q.expiry < q.date ||
        !validLines(q.lines) ||
        !history(q.history) ||
        !finite(q.discount) ||
        !finite(q.taxRate) ||
        !Array.isArray(q.recipients) ||
        !q.recipients.every((r) => record(r) && strings(r, ["role", "email"]))
      )
        return false;
      validateRecipients(q.recipients);
      totals(q.lines, q.discount, q.taxRate);
    }
    for (const i of s.invoices) {
      if (
        !strings(i, [
          "number",
          "saleId",
          "customer",
          "customerAddress",
          "customerEmail",
          "date",
          "dueDate",
          "notes",
        ]) ||
        !s.sales.some((q) => q.id === i.saleId) ||
        !["Draft", "Posted", "Cancelled"].includes(i.status) ||
        !["regular", "downpayment"].includes(i.kind) ||
        !validDate(i.date) ||
        !validDate(i.dueDate) ||
        i.dueDate < i.date ||
        !validLines(i.lines) ||
        !finite(i.discount) ||
        !finite(i.taxRate) ||
        !finite(i.deduction) ||
        i.deduction < 0 ||
        !finite(i.deductionTax) ||
        i.deductionTax < 0 ||
        i.deductionTax > i.deduction ||
        i.deductionTax > totals(i.lines, i.discount, i.taxRate).tax ||
        !history(i.history) ||
        !Array.isArray(i.payments)
      )
        return false;
      if (
        !i.payments.every(
          (p) =>
            record(p) &&
            strings(p, ["id", "date", "reference"]) &&
            validDate(p.date) &&
            p.date >= i.date &&
            finite(p.amount) &&
            p.amount > 0,
        ) ||
        !unique(i.payments) ||
        (i.status !== "Posted" && i.payments.length) ||
        invoiceTotal(i) < 0 ||
        amountDue(i) < 0
      )
        return false;
    }
    for (const p of s.purchases) {
      if (
        !strings(p, [
          "number",
          "vendor",
          "vendorEmail",
          "date",
          "expectedDate",
          "notes",
        ]) ||
        !p.vendor.trim() ||
        (p.saleId && !s.sales.some((q) => q.id === p.saleId)) ||
        ![
          "RFQ",
          "RFQ Sent",
          "Purchase Order",
          "Received",
          "Cancelled",
        ].includes(p.status) ||
        !validDate(p.date) ||
        !validDate(p.expectedDate) ||
        p.expectedDate < p.date ||
        !validLines(p.lines) ||
        !finite(p.taxRate) ||
        !history(p.history)
      )
        return false;
      totals(p.lines, 0, p.taxRate);
    }
    for (const sale of s.sales) {
      const active = s.invoices.filter(
        (i) => i.saleId === sale.id && i.status !== "Cancelled",
      );
      if (
        active.filter((i) => i.kind === "regular").length > 1 ||
        active.filter((i) => i.status === "Draft").length > 1 ||
        active.reduce((sum, i) => sum + invoiceTotal(i), 0) -
          totals(sale.lines, sale.discount, sale.taxRate).total >
          0.005
      )
        return false;
      if (
        sale.status !== "Accepted" &&
        (active.length ||
          s.purchases.some(
            (p) => p.saleId === sale.id && p.status !== "Cancelled",
          ))
      )
        return false;
      if (
        s.purchases.filter(
          (p) => p.saleId === sale.id && p.status !== "Cancelled",
        ).length > 1
      )
        return false;
    }
    return true;
  } catch {
    return false;
  }
}
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
// Read the previous app only when this new workspace has never been saved.
// Legacy keys remain untouched, including removed subcontract information.
export function initialWorkspace(storage: Pick<Storage, "getItem">): Workspace {
  const seed = seedWorkspace();
  if (storage.getItem(storageKey) !== null) return seed;
  const customers = storage.getItem("goelta.customer-companies.v1");
  const products = storage.getItem("goelta.sales.v1");
  const quotes = storage.getItem("goelta.quotations.v1");
  const extras = storage.getItem("goelta.sales-template.extra-columns.v1");
  if (!customers && !products && !quotes && !extras) return seed;
  if (customers) {
    const data: unknown = JSON.parse(customers);
    if (!Array.isArray(data) || !data.every(validCompany))
      throw Error("Existing customer data cannot be imported.");
    seed.companies = data.map(
      ({
        id,
        name,
        email,
        phone,
        address,
        city,
        status,
        contacts,
        profiles,
        defaultProfileId,
      }) => ({
        id,
        name,
        email,
        phone,
        address,
        city,
        status,
        contacts,
        profiles,
        defaultProfileId,
      }),
    );
  }
  if (products) {
    const data: unknown = JSON.parse(products);
    if (!Array.isArray(data) || !data.every(validProduct))
      throw Error("Existing product data cannot be imported.");
    seed.products = data;
  }
  if (extras) {
    const data: unknown = JSON.parse(extras);
    if (!validExtraColumns(data))
      throw Error("Existing Excel schema cannot be imported.");
    seed.extraColumns = data;
  }
  seed.sales = [];
  if (quotes) {
    const data: unknown = JSON.parse(quotes);
    if (!Array.isArray(data))
      throw Error("Existing quotations cannot be imported.");
    seed.sales = data.map((q) => {
      if (!record(q) || !Array.isArray(q.lines))
        throw Error(
          "An existing quotation has no item breakdown. Original data has been retained.",
        );
      const lines: Line[] = q.lines.map((l: any) => ({
        id: uid(),
        kind: "product",
        catalogId: l.catalogId,
        itemNo: l.itemNo || "",
        description: l.description,
        quantity: l.quantity,
        unit: l.unit || "Item",
        unitPrice: l.unitPrice,
        attributes: l.attributes || {},
      }));
      if (
        Math.abs(
          totals(lines, q.discount || 0, q.taxRate || 0).total - q.total,
        ) > 0.005
      )
        throw Error("An existing quotation has inconsistent totals.");
      return {
        id: uid(),
        number: q.id,
        title: q.title || "",
        description: q.description || "",
        customerId: q.customerId || "",
        customer: q.customer,
        customerEmail: q.customerEmail || "",
        customerPhone: q.customerPhone || "",
        customerAddress: q.customerAddress || "",
        date: q.date,
        expiry: q.expiry,
        status: q.status,
        lines,
        discount: q.discount || 0,
        taxRate: q.taxRate || 0,
        notes: "",
        recipients: q.recipients || [],
        history: [
          ...(q.statusHistory || []).map((h: any) => ({
            id: uid(),
            date: h.date,
            message: `Status changed to ${h.status}`,
          })),
          event("Imported from previous sales workspace"),
        ],
        isDemo: q.isDemo,
      } as Sale;
    });
  }
  if (!validWorkspace(seed))
    throw Error(
      "Existing data could not be imported safely. The original browser data is unchanged.",
    );
  return seed;
}
