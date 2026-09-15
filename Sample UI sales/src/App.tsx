import { QuotationDetails } from "./quotation-view";
import {
  CustomerProvider,
  Customers,
  QuotationRecipients,
  useCustomers,
} from "./customers";
import {
  CatalogProvider,
  catalogSeed,
  useCatalog,
  type CatalogItem,
} from "./catalog";
import { useRef, useState } from "react";
import {
  Link,
  Route,
  Routes,
  useLocation,
  useNavigate,
  useParams,
} from "react-router-dom";
import * as XLSX from "xlsx";
import {
  Alert,
  AppBar,
  Autocomplete,
  Avatar,
  Box,
  Breadcrumbs,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Collapse,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  Drawer,
  FormControl,
  Grid,
  InputLabel,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Snackbar,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Toolbar,
  Typography,
} from "@mui/material";
import DashboardRoundedIcon from "@mui/icons-material/DashboardRounded";
import PointOfSaleRoundedIcon from "@mui/icons-material/PointOfSaleRounded";
import GroupsRoundedIcon from "@mui/icons-material/GroupsRounded";
import Inventory2RoundedIcon from "@mui/icons-material/Inventory2Rounded";
import AccountTreeRoundedIcon from "@mui/icons-material/AccountTreeRounded";
import AccountBalanceRoundedIcon from "@mui/icons-material/AccountBalanceRounded";
import ReceiptLongRoundedIcon from "@mui/icons-material/ReceiptLongRounded";
import ShoppingCartRoundedIcon from "@mui/icons-material/ShoppingCartRounded";
import CloudUploadRoundedIcon from "@mui/icons-material/CloudUploadRounded";
import AddRoundedIcon from "@mui/icons-material/AddRounded";
import EditRoundedIcon from "@mui/icons-material/EditRounded";
import DownloadRoundedIcon from "@mui/icons-material/DownloadRounded";
import OpenInNewRoundedIcon from "@mui/icons-material/OpenInNewRounded";

type Status = "Draft" | "Sent" | "Accepted" | "Rejected" | "Hold";
type CatalogColumns = {
  itemNo: string;
  id: string;
  type: string;
  description: string;
  category: string;
  unit: string;
  rate: string;
  available: string;
};
const defaultCatalogColumns: CatalogColumns = {
  itemNo: "Item No.",
  id: "Product ID",
  type: "Type",
  description: "Description",
  category: "Category",
  unit: "Unit",
  rate: "Rate",
  available: "Available Quantity",
};
const catalogTemplateStorageKey = "goelta.catalog-template.extra-columns.v1";
const loadExtraCatalogColumns = () => {
  if (typeof localStorage === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(catalogTemplateStorageKey) || "[]");
    return Array.isArray(stored) && stored.every((value) => typeof value === "string")
      ? stored
      : [];
  } catch {
    return [];
  }
};
const productsSeed = catalogSeed.map((item) => ({
  ...item,
  available: item.available ?? Number.MAX_SAFE_INTEGER,
}));
export type Quote = {
  id: string;
  customerId?: string;
  customer: string;
  date: string;
  expiry: string;
  total: number;
  status: Status;
  statusDate?: string;
  lines?: {
    itemNo?: string;
    description: string;
    quantity: number;
    unit?: string;
    unitPrice: number;
    attributes?: Record<string, string | number>;
  }[];
  discount?: number;
  taxRate?: number;
  customerEmail?: string;
  customerPhone?: string;
  customerAddress?: string;
  recipients?: { role: "To" | "CC"; email: string; name?: string }[];
};
const quotesSeed: Quote[] = [
  {
    id: "SQ-2026-0042",
    customerId: "1",
    customer: "Asteria Construction Ltd",
    date: "14 Sep 2026",
    expiry: "14 Oct 2026",
    total: 3150,
    status: "Sent",
    customerEmail: "procurement@asteria.example",
    customerPhone: "+94 11 555 0100",
    discount: 0,
    taxRate: 0,
    lines: [
      { description: "Modular workstation", quantity: 2, unitPrice: 1250 },
      { description: "Ergonomic task chair", quantity: 1, unitPrice: 650 },
    ],
  },
  {
    id: "SQ-2026-0041",
    customerId: "2",
    customer: "Cedar & Co. Holdings",
    date: "11 Sep 2026",
    expiry: "11 Oct 2026",
    total: 8420,
    status: "Accepted",
    customerEmail: "hello@cedar.example",
    customerPhone: "+94 77 555 0182",
    discount: 0,
    taxRate: 0,
    lines: [
      { description: "Modular workstation", quantity: 4, unitPrice: 1250 },
      { description: "Ergonomic task chair", quantity: 4, unitPrice: 650 },
      { description: "Installation service", quantity: 1, unitPrice: 820 },
    ],
  },
  {
    id: "SQ-2026-0040",
    customerId: "3",
    customer: "Bluehaven Hospitality",
    date: "08 Sep 2026",
    expiry: "08 Oct 2026",
    total: 2250,
    status: "Draft",
    customerEmail: "finance@bluehaven.example",
    customerPhone: "+94 71 555 0124",
    discount: 0,
    taxRate: 0,
    lines: [
      { description: "Ergonomic task chair", quantity: 2, unitPrice: 650 },
      { description: "Installation service", quantity: 1, unitPrice: 950 },
    ],
  },
  {
    id: "SQ-2026-0039",
    customerId: "1",
    customer: "Asteria Construction Ltd",
    date: "03 Sep 2026",
    expiry: "03 Oct 2026",
    total: 11900,
    status: "Rejected",
    customerEmail: "procurement@asteria.example",
    customerPhone: "+94 11 555 0100",
    discount: 0,
    taxRate: 0,
    lines: [
      { description: "Modular workstation", quantity: 8, unitPrice: 1250 },
      { description: "Ergonomic task chair", quantity: 2, unitPrice: 650 },
      { description: "Installation service", quantity: 1, unitPrice: 600 },
    ],
  },
];
const orders = [
  {
    id: "SO-2026-0018",
    customer: "Cedar & Co. Holdings",
    date: "12 Sep 2026",
    total: 8420,
    status: "Processing",
    quote: "SQ-2026-0041",
    invoice: "Pending",
  },
  {
    id: "SO-2026-0017",
    customer: "Asteria Construction Ltd",
    date: "28 Aug 2026",
    total: 5280,
    status: "Completed",
    quote: "SQ-2026-0034",
    invoice: "INV-2026-0091",
  },
  {
    id: "SO-2026-0016",
    customer: "Bluehaven Hospitality",
    date: "21 Aug 2026",
    total: 3100,
    status: "Confirmed",
    quote: "SQ-2026-0031",
    invoice: "Pending",
  },
];
const moduleCards = [
  {
    name: "Sales",
    desc: "Quotes, orders, and customer relationships",
    color: "#1264a3",
    icon: PointOfSaleRoundedIcon,
  },
  {
    name: "HR",
    desc: "People, payroll, and employee operations",
    color: "#ad5c2b",
    icon: GroupsRoundedIcon,
  },
  {
    name: "Inventory",
    desc: "Stock, warehouses, and product movements",
    color: "#25866a",
    icon: Inventory2RoundedIcon,
  },
  {
    name: "Projects",
    desc: "Plan work, teams, and project delivery",
    color: "#7555a5",
    icon: AccountTreeRoundedIcon,
  },
  {
    name: "Accounting",
    desc: "Financial control and reporting",
    color: "#b8831a",
    icon: AccountBalanceRoundedIcon,
  },
  {
    name: "Invoicing",
    desc: "Create, send, and track invoices",
    color: "#3d718c",
    icon: ReceiptLongRoundedIcon,
  },
];

function Shell({ children }: { children: React.ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const sales = location.pathname.startsWith("/sales");
  const nav = [
    ["Dashboard", "/sales", <DashboardRoundedIcon />],
    ["Customers", "/sales/customers", <GroupsRoundedIcon />],
    ["Quotations", "/sales/quotations", <ReceiptLongRoundedIcon />],
    ["Sales Orders", "/sales/orders", <ShoppingCartRoundedIcon />],
  ] as const;
  return (
    <Box className="app-shell">
      <AppBar
        position="static"
        elevation={0}
        sx={{
          bgcolor: "#fff",
          color: "#172b4d",
          borderBottom: "1px solid #e5eaf0",
        }}
      >
        <Toolbar sx={{ minHeight: 72 }}>
          <Box
            component={Link}
            to="/"
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.4,
              color: "inherit",
              textDecoration: "none",
            }}
          >
            <Avatar
              sx={{
                bgcolor: "#1264a3",
                width: 38,
                height: 38,
                borderRadius: 1.5,
                fontWeight: 700,
              }}
            >
              N
            </Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, lineHeight: 1 }}>
                GOELTA
              </Typography>
              <Typography
                variant="caption"
                sx={{ color: "#7890a4", letterSpacing: 1.2 }}
              >
                ERP PLATFORM
              </Typography>
            </Box>
          </Box>
          <Box sx={{ flex: 1 }} />
          {sales && (
            <Chip
              label="Demo workspace"
              size="small"
              sx={{ bgcolor: "#edf5fb", color: "#1264a3", fontWeight: 600 }}
            />
          )}
          <Avatar
            sx={{
              ml: 2,
              bgcolor: "#e4edf4",
              color: "#1264a3",
              width: 34,
              height: 34,
            }}
          >
            AM
          </Avatar>
        </Toolbar>
      </AppBar>
      {sales ? (
        <Box sx={{ display: "flex", minHeight: "calc(100vh - 72px)" }}>
          <Drawer
            variant="permanent"
            sx={{
              width: 236,
              flexShrink: 0,
              "& .MuiDrawer-paper": {
                width: 236,
                position: "relative",
                border: 0,
                borderRight: "1px solid #e5eaf0",
                bgcolor: "#fbfcfd",
                p: 1.5,
              },
            }}
          >
            <Typography
              variant="overline"
              sx={{ color: "#7890a4", px: 1.5, pt: 1.5, letterSpacing: 1.2 }}
            >
              Sales workspace
            </Typography>
            <List>
              {nav.map(([label, path, icon]) => (
                <ListItemButton
                  key={label}
                  selected={
                    location.pathname === path ||
                    (label === "Quotations" &&
                      location.pathname.includes("quotation"))
                  }
                  onClick={() => navigate(path)}
                  sx={{
                    borderRadius: 1.5,
                    mb: 0.5,
                    "&.Mui-selected": { bgcolor: "#e7f2fa", color: "#1264a3" },
                  }}
                >
                  <ListItemIcon sx={{ minWidth: 38, color: "inherit" }}>
                    {icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={label}
                    primaryTypographyProps={{ fontWeight: 600, fontSize: 13 }}
                  />
                </ListItemButton>
              ))}
            </List>
            <Box
              sx={{ mt: "auto", p: 1.5, bgcolor: "#eef5f8", borderRadius: 2 }}
            >
              <Typography
                variant="caption"
                sx={{ color: "#1264a3", fontWeight: 700 }}
              >
                WORKSPACE STATUS
              </Typography>
              <Typography variant="body2" sx={{ mt: 0.5, color: "#516b80" }}>
                Local demo mode
              </Typography>
            </Box>
          </Drawer>
          <Box component="main" sx={{ flex: 1, minWidth: 0 }}>
            {children}
          </Box>
        </Box>
      ) : (
        children
      )}
    </Box>
  );
}

function SectionTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
        gap: 2,
        mb: 4,
        flexWrap: "wrap",
      }}
    >
      <Box>
        <Typography
          variant="overline"
          sx={{ color: "#1264a3", fontWeight: 700, letterSpacing: 1.2 }}
        >
          {eyebrow}
        </Typography>
        <Typography
          variant="h4"
          sx={{ mt: 0.5, fontWeight: 700, letterSpacing: -0.7 }}
        >
          {title}
        </Typography>
        {description && (
          <Typography sx={{ color: "#71869a", mt: 1 }}>
            {description}
          </Typography>
        )}
      </Box>
      {action}
    </Box>
  );
}
function StatusChip({ status }: { status: string }) {
  const colors: Record<string, string> = {
    Draft: "#71869a",
    Sent: "#1264a3",
    Accepted: "#25866a",
    Rejected: "#c44d45",
    Hold: "#b8831a",
    Confirmed: "#b8831a",
    Processing: "#ad5c2b",
    Completed: "#25866a",
  };
  return (
    <Chip
      label={status}
      size="small"
      sx={{
        color: colors[status] || "#71869a",
        bgcolor: `${colors[status] || "#71869a"}14`,
        fontWeight: 700,
      }}
    />
  );
}
function Home() {
  const navigate = useNavigate();
  return (
    <Box
      className="hero-grid"
      sx={{
        minHeight: "calc(100vh - 72px)",
        px: { xs: 2.5, md: 8 },
        py: { xs: 6, md: 10 },
      }}
    >
      <Box sx={{ maxWidth: 1180, mx: "auto" }}>
        <Chip
          icon={<DashboardRoundedIcon />}
          label="OPERATIONS HUB"
          sx={{
            bgcolor: "#e6f1f8",
            color: "#1264a3",
            fontWeight: 700,
            letterSpacing: 0.8,
          }}
        />
        <Typography
          variant="h1"
          sx={{
            fontSize: { xs: 42, md: 64 },
            maxWidth: 680,
            mt: 3,
            lineHeight: 1.05,
            letterSpacing: -2,
          }}
        >
          Everything your business needs, in one clear view.
        </Typography>
        <Typography
          sx={{
            maxWidth: 560,
            color: "#61788d",
            fontSize: 18,
            mt: 2.5,
            lineHeight: 1.6,
          }}
        >
          A calm command center for the work that keeps your business moving.
          Choose a workspace to get started.
        </Typography>
        <Grid container spacing={2.2} sx={{ mt: 5 }}>
          {moduleCards.map(({ name, desc, color, icon: Icon }, i) => (
            <Grid item xs={12} sm={6} md={4} key={name}>
              <Card
                className="module-card"
                variant="outlined"
                sx={{ height: "100%", borderColor: "#dfe7ed" }}
              >
                <CardActionArea
                  disabled={i !== 0}
                  onClick={() => navigate("/sales")}
                  sx={{ height: "100%", p: 1 }}
                >
                  <CardContent sx={{ p: 2.5 }}>
                    <Avatar
                      sx={{
                        bgcolor: `${color}15`,
                        color,
                        width: 48,
                        height: 48,
                        borderRadius: 1.5,
                      }}
                    >
                      <Icon />
                    </Avatar>
                    <Typography variant="h6" sx={{ mt: 3, fontWeight: 700 }}>
                      {name}
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{ mt: 0.75, color: "#71869a", lineHeight: 1.5 }}
                    >
                      {desc}
                    </Typography>
                    <Chip
                      label={i === 0 ? "Open workspace" : "Coming soon"}
                      size="small"
                      sx={{
                        mt: 2,
                        color: i === 0 ? color : "#7890a4",
                        bgcolor: i === 0 ? `${color}12` : "#f4f6f8",
                      }}
                    />
                  </CardContent>
                </CardActionArea>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Box>
  );
}
function Stat({
  label,
  value,
  detail,
  color,
}: {
  label: string;
  value: string;
  detail: string;
  color: string;
}) {
  return (
    <Paper variant="outlined" sx={{ p: 2.5, borderColor: "#e1e8ee" }}>
      <Typography variant="body2" sx={{ color: "#71869a" }}>
        {label}
      </Typography>
      <Typography variant="h4" sx={{ fontWeight: 700, mt: 1, color }}>
        {value}
      </Typography>
      <Typography variant="caption" sx={{ color: "#71869a" }}>
        {detail}
      </Typography>
    </Paper>
  );
}
function SalesDashboard() {
  const navigate = useNavigate();
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <SectionTitle
        eyebrow="Sales overview"
        title="Good morning, Alex"
        description="A live view of your customer, quotation and order activity."
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              startIcon={<GroupsRoundedIcon />}
              onClick={() => navigate("/sales/customers")}
            >
              Add customer
            </Button>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate("/sales/quotations/new")}
            >
              New quotation
            </Button>
          </Stack>
        }
      />
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6} md={3}>
          <Stat
            label="Total quotations"
            value="28"
            detail="12 currently open"
            color="#1264a3"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat
            label="Accepted quotations"
            value="9"
            detail="34% conversion rate"
            color="#25866a"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat
            label="Sales orders"
            value="18"
            detail="3 processing now"
            color="#ad5c2b"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Stat
            label="Pipeline value"
            value="$48,260"
            detail="+12.4% this month"
            color="#7555a5"
          />
        </Grid>
      </Grid>
      <Grid container spacing={3} sx={{ mt: 1 }}>
        <Grid item xs={12} lg={7}>
          <Paper variant="outlined" sx={{ p: 3, borderColor: "#e1e8ee" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Recent quotations
            </Typography>
            {quotesSeed.slice(0, 3).map((q) => (
              <Box
                key={q.id}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  py: 1.5,
                  borderTop: "1px solid #edf1f4",
                }}
              >
                <Box>
                  <Typography sx={{ fontWeight: 700 }}>{q.id}</Typography>
                  <Typography variant="body2" sx={{ color: "#71869a" }}>
                    {q.customer} · {q.date}
                  </Typography>
                </Box>
                <Stack direction="row" spacing={2} alignItems="center">
                  <Typography sx={{ fontWeight: 700 }}>
                    ${q.total.toLocaleString()}
                  </Typography>
                  <StatusChip status={q.status} />
                </Stack>
              </Box>
            ))}
            <Button
              sx={{ mt: 2 }}
              onClick={() => navigate("/sales/quotations")}
              endIcon={<OpenInNewRoundedIcon />}
            >
              View all quotations
            </Button>
          </Paper>
        </Grid>
        <Grid item xs={12} lg={5}>
          <Paper variant="outlined" sx={{ p: 3, borderColor: "#e1e8ee" }}>
            <Typography variant="h6" sx={{ fontWeight: 700, mb: 2 }}>
              Orders by status
            </Typography>
            {[
              ["Confirmed", 4],
              ["Processing", 3],
              ["Completed", 11],
            ].map(([status, count]) => (
              <Box
                key={String(status)}
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  py: 1.5,
                  borderTop: "1px solid #edf1f4",
                }}
              >
                <StatusChip status={String(status)} />
                <Typography sx={{ fontWeight: 700 }}>{count}</Typography>
              </Box>
            ))}
            <Button
              sx={{ mt: 2 }}
              onClick={() => navigate("/sales/orders")}
              endIcon={<OpenInNewRoundedIcon />}
            >
              View sales orders
            </Button>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

function ProductImport({
  embedded = false,
  onAddItem,
}: {
  embedded?: boolean;
  onAddItem?: (item: CatalogItem) => void;
}) {
  const { items, replace } = useCatalog();
  const [columns, setColumns] = useState<CatalogColumns>(defaultCatalogColumns);
  const [extraColumns, setExtraColumns] = useState<string[]>(loadExtraCatalogColumns);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const importFile = (file: File) => {
    if (!file.name.match(/\.xlsx?$/i)) {
      setMessage(
        "Unsupported file format. Please choose an .xlsx or .xls file.",
      );
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const workbook = XLSX.read(event.target?.result, { type: "array" });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
          header: 1,
          defval: "",
        });
        const expectedHeaders = Object.values(columns).concat(extraColumns);
        const candidates = matrix.slice(0, 20).map((row, index) => ({
          index,
          headers: row.map((cell) => String(cell).trim()).filter(Boolean),
          matches: row.filter((cell) => expectedHeaders.includes(String(cell).trim())).length,
        }));
        const candidate = candidates.sort((a, b) => b.matches - a.matches)[0];
        const headerRow = candidate?.matches ? candidate.index : -1;
        if (headerRow < 0)
          throw new Error("The workbook header row could not be identified.");
        const actualHeaders = candidate.headers;
        const duplicateHeaders = actualHeaders.filter(
          (header, index) => actualHeaders.indexOf(header) !== index,
        );
        const missingHeaders = expectedHeaders.filter(
          (header) => !actualHeaders.includes(header),
        );
        const unknownHeaders = actualHeaders.filter(
          (header) => !expectedHeaders.includes(header),
        );
        if (duplicateHeaders.length || missingHeaders.length || unknownHeaders.length) {
          const problems = [
            duplicateHeaders.length ? `Duplicate: ${[...new Set(duplicateHeaders)].join(", ")}` : "",
            missingHeaders.length ? `Missing: ${missingHeaders.join(", ")}` : "",
            unknownHeaders.length ? `Unknown: ${unknownHeaders.join(", ")}` : "",
          ].filter(Boolean);
          throw new Error(`Excel columns do not match the active template. ${problems.join(". ")}.`);
        }
        const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
          range: headerRow,
          defval: "",
        });
        const imported = rows
          .filter((row) => Object.values(row).some((value) => String(value).trim()))
          .map((row, index) => {
            const value = (key: keyof CatalogColumns) => row[columns[key]];
            const description = String(value("description") || "").trim();
            const rate = Number(value("rate"));
            const rawType = String(value("type") || "").trim().toLowerCase();
            if (!description) throw new Error(`Row ${headerRow + index + 2}: Description is required.`);
            if (!Number.isFinite(rate) || rate < 0) throw new Error(`Row ${headerRow + index + 2}: Rate must be zero or greater.`);
            if (rawType !== "product" && rawType !== "service") throw new Error(`Row ${headerRow + index + 2}: Type must be Product or Service.`);
            const type = rawType === "service" ? ("Service" as const) : ("Product" as const);
            const availableValue = value("available");
            const available = type === "Service" ? null : Number(availableValue);
            if (type === "Product" && (!Number.isFinite(available) || Number(available) < 0)) throw new Error(`Row ${headerRow + index + 2}: Available Quantity must be zero or greater for products.`);
            return {
              id: String(value("id") || `ITEM-${index + 1}`),
              itemNo: String(value("itemNo") || index + 1),
              type,
              description,
              name: description,
              category: String(value("category") || "Uncategorized"),
              unit: String(value("unit") || "Item"),
              rate,
              price: rate,
              available,
              attributes: Object.fromEntries(
                extraColumns.map((header) => {
                  const attribute = row[header];
                  return [
                    header,
                    typeof attribute === "number"
                      ? attribute
                      : String(attribute ?? ""),
                  ];
                }),
              ),
            };
          })
        if (!imported.length) throw new Error("The workbook does not contain any product or service rows.");
        replace(imported);
        setFileName(file.name);
        setMessage(
          `${imported.length} valid catalog records ready. Import confirmed locally.`,
        );
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "The workbook could not be read. Check its columns and try again.");
      }
    };
    reader.readAsArrayBuffer(file);
  };
  const downloadTemplate = () => {
    const headers = Object.values(columns).concat(extraColumns);
    const rows = [
      ["GOELTA SALES CATALOG TEMPLATE"],
      [],
      headers,
      [
        "1.1",
        "PRD-001",
        "Product",
        "Example material or stock item",
        "Materials",
        "Sq.Ft",
        0,
        0,
        ...extraColumns.map(() => ""),
      ],
      [
        "2.1",
        "SRV-001",
        "Service",
        "Example installation or labour service",
        "Services",
        "Item",
        0,
        "",
        ...extraColumns.map(() => ""),
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = headers.map((header) => ({
      wch: Math.max(14, Math.min(42, header.length + 4)),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Catalog");
    XLSX.writeFile(book, "GOELTA-sales-catalog-template.xlsx");
  };
  return (
    <Box sx={{ p: embedded ? 0 : { xs: 3, md: 5 } }}>
      {embedded ? (
        <Paper variant="outlined" sx={{ p: 3, mb: 3, bgcolor: "#fbfdff" }}>
          <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>Import from Excel</Typography>
              <Typography variant="body2" color="text.secondary">Upload a product and service list, then add the required rows to this quotation.</Typography>
            </Box>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="outlined" onClick={() => setBuilderOpen(true)}>Modify template</Button>
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={downloadTemplate}>Download template</Button>
              <Button variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => inputRef.current?.click()}>Upload Excel</Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <SectionTitle
          eyebrow="Sales workspace"
          title="Products & Services Import"
          description="Import inventory products and services for quotation line items."
          action={<Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button variant="outlined" onClick={() => setBuilderOpen(true)}>Build template</Button><Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={downloadTemplate}>Download template</Button><Button variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => inputRef.current?.click()}>Upload Excel</Button></Stack>}
        />
      )}
      {builderOpen && <CatalogTemplateBuilder
        open={builderOpen}
        columns={columns}
        extraColumns={extraColumns}
        onSave={(nextColumns, nextExtraColumns) => {
          setColumns(nextColumns);
          setExtraColumns(nextExtraColumns);
          try {
            localStorage.setItem(
              catalogTemplateStorageKey,
              JSON.stringify(nextExtraColumns),
            );
          } catch {
            setMessage("The template was updated for this session but could not be saved in browser storage.");
          }
          setBuilderOpen(false);
        }}
        onClose={() => setBuilderOpen(false)}
      />}
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
      />
      {message && (
        <Alert
          severity={message.includes("valid") ? "success" : "error"}
          sx={{ mt: 2 }}
        >
          {message}
        </Alert>
      )}
      {!embedded && <Button size="small" onClick={() => setPreviewOpen(open => !open)} sx={{ mb: 1 }}>
        {previewOpen ? "Hide import preview" : `Show import preview${fileName ? ` · ${fileName}` : ""}`}
      </Button>}
      {previewOpen && <Paper
        variant="outlined"
        sx={{ mt: 3, borderColor: "#e1e8ee", overflow: "hidden" }}
      >
        <Box sx={{ p: 2.5 }}>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            Import preview{" "}
            <Chip label={`${items.length} items`} size="small" sx={{ ml: 1 }} />
          </Typography>
        </Box>
        <Table>
          <TableHead sx={{ bgcolor: "#f7f9fb" }}>
            <TableRow>
              <TableCell>Item No.</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Available</TableCell>
              {extraColumns.map((column) => <TableCell key={column}>{column}</TableCell>)}
              {onAddItem && <TableCell align="right">Quotation</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.itemNo}</TableCell>
                <TableCell>{item.type}</TableCell>
                <TableCell sx={{ fontWeight: 600 }}>
                  {item.description}
                </TableCell>
                <TableCell>{item.unit}</TableCell>
                <TableCell align="right">
                  ${item.rate.toLocaleString()}
                </TableCell>
                <TableCell align="right">
                  {item.available === null ? "N/A" : item.available}
                </TableCell>
                {extraColumns.map((column) => <TableCell key={column}>{String(item.attributes?.[column] ?? "")}</TableCell>)}
                {onAddItem && <TableCell align="right"><Button size="small" onClick={() => onAddItem(item)}>Add</Button></TableCell>}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>}
    </Box>
  );
}

function CatalogTemplateBuilder({
  open,
  columns,
  extraColumns,
  onSave,
  onClose,
}: {
  open: boolean;
  columns: CatalogColumns;
  extraColumns: string[];
  onSave: (columns: CatalogColumns, extraColumns: string[]) => void;
  onClose: () => void;
}) {
  const draftColumns = columns;
  const [draftExtras, setDraftExtras] = useState(extraColumns);
  const [extra, setExtra] = useState("");
  const [builderError, setBuilderError] = useState("");
  const fields: [keyof CatalogColumns, string][] = [
    ["itemNo", "Item number"],
    ["id", "Item ID"],
    ["type", "Type"],
    ["description", "Description"],
    ["category", "Category"],
    ["unit", "Unit"],
    ["rate", "Rate"],
    ["available", "Available quantity"],
  ];
  const download = () => {
    const headers = fields
      .map(([key]) => draftColumns[key])
      .concat(draftExtras);
    const rows = [
      ["GOELTA SALES CATALOG TEMPLATE"],
      [],
      headers,
      [
        "1.1",
        "PRD-001",
        "Product",
        "Example material or stock item",
        "Materials",
        "Sq.Ft",
        0,
        0,
        ...draftExtras.map(() => ""),
      ],
      [
        "2.1",
        "SRV-001",
        "Service",
        "Example installation or labour service",
        "Services",
        "Item",
        0,
        "",
        ...draftExtras.map(() => ""),
      ],
    ];
    const sheet = XLSX.utils.aoa_to_sheet(rows);
    sheet["!cols"] = headers.map((header) => ({
      wch: Math.max(14, Math.min(42, header.length + 4)),
    }));
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, "Catalog");
    XLSX.writeFile(book, "GOELTA-sales-catalog-template.xlsx");
  };
  return (
    <Dialog open={open} fullWidth maxWidth="md" onClose={onClose}>
      <DialogTitle>Build product data template</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          The required headings are fixed. Add approved extra headings, then
          download and use the updated template. Uploads must match it exactly.
        </Typography>
        <Stack spacing={2}>
          <Box><Typography variant="subtitle2" gutterBottom>Required columns</Typography><Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">{fields.map(([key]) => <Chip key={key} label={draftColumns[key]} size="small" />)}</Stack></Box>
          <Divider />
          <Typography variant="subtitle2">Extra columns</Typography>
          {builderError && <Alert severity="error">{builderError}</Alert>}
          <Stack direction="row" spacing={1}>
            <TextField
              fullWidth
              label="Additional column"
              value={extra}
              onChange={(event) => setExtra(event.target.value)}
            />
            <Button
              variant="outlined"
              onClick={() => {
                const heading = extra.trim();
                const allHeadings = [...Object.values(draftColumns), ...draftExtras];
                if (!heading) return setBuilderError("Enter a column heading.");
                if (heading.length > 60 || /[\r\n]/.test(heading)) return setBuilderError("Use a single-line heading of 60 characters or fewer.");
                if (allHeadings.some((column) => column.toLowerCase() === heading.toLowerCase())) return setBuilderError("That column already exists in the template.");
                setDraftExtras([...draftExtras, heading]);
                setExtra("");
                setBuilderError("");
              }}
            >
              Add
            </Button>
          </Stack>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            {draftExtras.map((column) => (
              <Chip
                key={column}
                label={column}
                onDelete={() =>
                  setDraftExtras(draftExtras.filter((item) => item !== column))
                }
              />
            ))}
          </Stack>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            download();
            onSave(draftColumns, draftExtras);
          }}
          variant="contained"
          startIcon={<DownloadRoundedIcon />}
        >
          Save & download template
        </Button>
      </DialogActions>
    </Dialog>
  );
}

function Quotations({
  list,
  setList,
}: {
  list: Quote[];
  setList: React.Dispatch<React.SetStateAction<Quote[]>>;
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = list.filter(
    (q) =>
      `${q.id} ${q.customer}`.toLowerCase().includes(search.toLowerCase()) &&
      (status === "All" || q.status === status),
  );
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <SectionTitle
        eyebrow="Sales workspace"
        title="Quotations"
        description="Create, track, send and convert customer quotations."
        action={
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              startIcon={<AddRoundedIcon />}
              onClick={() => navigate("/sales/quotations/new")}
            >
              New quotation
            </Button>
          </Stack>
        }
      />
      <Paper
        variant="outlined"
        sx={{ borderColor: "#e1e8ee", overflow: "hidden" }}
      >
        <Box sx={{ p: 2.5, display: "flex", gap: 2, flexWrap: "wrap" }}>
          <TextField
            size="small"
            sx={{ minWidth: 260, flex: 1 }}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search quotation or customer"
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Status</InputLabel>
            <Select
              value={status}
              label="Status"
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="All">All statuses</MenuItem>
              {["Draft", "Sent", "Accepted", "Rejected", "Hold"].map((s) => (
                <MenuItem key={s} value={s}>
                  {s}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
        <Table>
          <TableHead sx={{ bgcolor: "#f7f9fb" }}>
            <TableRow>
              <TableCell>Quotation</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Date</TableCell>
              <TableCell>Expiry date</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="right">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((q) => (
              <TableRow key={q.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{q.id}</TableCell>
                <TableCell>{q.customer}</TableCell>
                <TableCell>{q.date}</TableCell>
                <TableCell>{q.expiry}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ${q.total.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusChip status={q.status} />
                </TableCell>
                <TableCell align="right">
                  <Button
                    size="small"
                    onClick={() =>
                      navigate(`/sales/quotations/${encodeURIComponent(q.id)}`)
                    }
                  >
                    View
                  </Button>
                  {q.status === "Draft" && (
                    <Button
                      size="small"
                      onClick={() =>
                        setList(
                          list.map((item) =>
                            item.id === q.id
                              ? { ...item, status: "Sent" }
                              : item,
                          ),
                        )
                      }
                    >
                      Send
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

type DraftQuotationLine = {
  id: string;
  source: "catalog" | "manual";
  catalogId?: string;
  itemNo: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  available: number | null;
  attributes: Record<string, string | number>;
};

const emptyManualLine = (): DraftQuotationLine => ({
  id: crypto.randomUUID(),
  source: "manual",
  itemNo: "",
  description: "",
  quantity: 1,
  unit: "Item",
  unitPrice: 0,
  available: null,
  attributes: {},
});

function QuotationForm({ onSave }: { onSave: (quotation: Quote) => void }) {
  const navigate = useNavigate();
  const { companies } = useCustomers();
  const { items } = useCatalog();
  const catalogItems = items.length ? items : productsSeed;
  const activeCompanies = companies.filter(
    (company) => company.status === "Active",
  );
  const today = new Date().toISOString().slice(0, 10);
  const defaultExpiry = new Date(Date.now() + 30 * 86400000)
    .toISOString()
    .slice(0, 10);
  const [number, setNumber] = useState(
    `SQ-${new Date().getFullYear()}-${String(Date.now()).slice(-4)}`,
  );
  const [date, setDate] = useState(today);
  const [expiry, setExpiry] = useState(defaultExpiry);
  const [customerId, setCustomerId] = useState("");
  const [profileRecipients, setProfileRecipients] = useState<{
    to: string;
    cc: string[];
  }>({ to: "", cc: [] });
  const [lines, setLines] = useState<DraftQuotationLine[]>([]);
  const [manualLine, setManualLine] = useState<DraftQuotationLine | null>(null);
  const [manualLineError, setManualLineError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [error, setError] = useState("");
  const customer =
    activeCompanies.find((company) => company.id === customerId) || null;
  const subtotal = lines.reduce(
    (sum, line) => sum + line.unitPrice * line.quantity,
    0,
  );
  const total = Math.max(0, subtotal - discount) * (1 + taxRate / 100);
  const invalidStock = lines.some(
    (line) => line.available !== null && line.quantity > line.available,
  );
  const updateLine = (
    id: string,
    patch: Partial<DraftQuotationLine>,
  ) =>
    setLines((current) =>
      current.map((line) => (line.id === id ? { ...line, ...patch } : line)),
    );
  const addCatalogItem = (item: CatalogItem) =>
    setLines((current) => [
      ...current,
      {
        id: crypto.randomUUID(),
        source: "catalog",
        catalogId: item.id,
        itemNo: item.itemNo,
        description: item.description,
        quantity: 1,
        unit: item.unit,
        unitPrice: item.price,
        available: item.available,
        attributes: item.attributes,
      },
    ]);
  const addManualLine = () => {
    if (!manualLine) return;
    if (!manualLine.description.trim())
      return setManualLineError("Enter a description for the manual line.");
    if (!Number.isFinite(manualLine.quantity) || manualLine.quantity <= 0)
      return setManualLineError("Quantity must be greater than zero.");
    if (!Number.isFinite(manualLine.unitPrice) || manualLine.unitPrice < 0)
      return setManualLineError("Rate cannot be negative.");
    setLines((current) => [
      ...current,
      { ...manualLine, description: manualLine.description.trim(), unit: manualLine.unit.trim() || "Item" },
    ]);
    setManualLine(null);
    setManualLineError("");
  };
  const save = (status: Status) => {
    setError("");
    if (!number.trim() || !date || !expiry || !customer || !lines.length)
      return setError(
        "Enter quotation details, select an active customer, and add at least one item.",
      );
    if (new Date(expiry) < new Date(date))
      return setError("Expiry date cannot be before the quotation date.");
    if (
      lines.some(
        (line) => !Number.isFinite(line.quantity) || line.quantity <= 0,
      ) ||
      invalidStock
    )
      return setError("Check item quantities against the available inventory.");
    if (status === "Sent" && !profileRecipients.to)
      return setError("Choose a main email recipient before sending the quotation.");
    const recipientById = (id: string) => {
      if (!customer) return null;
      if (id === "company")
        return { email: customer.email, name: customer.name };
      const contact = customer.contacts.find((entry) => entry.id === id);
      return contact
        ? {
            email: contact.email,
            name: contact.name || contact.position,
          }
        : null;
    };
    const mainRecipient = recipientById(profileRecipients.to);
    const recipients = [
      ...(mainRecipient?.email
        ? [{ role: "To" as const, ...mainRecipient }]
        : []),
      ...profileRecipients.cc
        .map(recipientById)
        .filter(
          (recipient): recipient is { email: string; name: string } =>
            !!recipient?.email,
        )
        .map((recipient) => ({ role: "CC" as const, ...recipient })),
    ];
    onSave({
      id: number.trim(),
      customerId: customer.id,
      customer: customer.name,
      date,
      expiry,
      total,
      status,
      discount,
      taxRate,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: [customer.address, customer.city]
        .filter(Boolean)
        .join(", "),
      recipients,
      lines: lines.map((line) => ({
        itemNo: line.itemNo,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        attributes: line.attributes,
      })),
    });
    navigate("/sales/quotations");
  };
  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 5 }, maxWidth: 1320, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/sales/quotations" style={{ color: "#71869a" }}>
          Quotations
        </Link>
        <Typography>New quotation</Typography>
      </Breadcrumbs>
      <SectionTitle
        eyebrow="Quotation workflow"
        title="Create quotation"
        description="Enter the customer and dates, confirm the email recipients, then add the quoted items."
        action={<Button component={Link} to="/sales/quotations">Cancel</Button>}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 2.5 }}>
              <Chip label="1" color="primary" size="small" />
              <Box><Typography variant="h6" fontWeight={700}>Quotation and customer</Typography><Typography variant="body2" color="text.secondary">Basic details used on the quotation document.</Typography></Box>
            </Stack>
            <Grid container spacing={2}>
              <Grid item xs={12} sm={6}>
                <TextField
                  fullWidth
                  required
                  label="Quotation number"
                  value={number}
                  onChange={(event) => setNumber(event.target.value)}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  required
                  label="Quotation date"
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12} sm={3}>
                <TextField
                  fullWidth
                  required
                  label="Expiry date"
                  type="date"
                  value={expiry}
                  onChange={(event) => setExpiry(event.target.value)}
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={activeCompanies}
                  value={customer}
                  onChange={(_, company) => {
                    setCustomerId(company?.id || "");
                    setProfileRecipients({ to: "", cc: [] });
                  }}
                  getOptionLabel={(company) => company.name}
                  isOptionEqualToValue={(option, value) =>
                    option.id === value.id
                  }
                  filterOptions={(options, state) =>
                    options.filter((company) =>
                      [
                        company.name,
                        company.email,
                        company.phone,
                        company.address,
                        company.city,
                      ]
                        .join(" ")
                        .toLowerCase()
                        .includes(state.inputValue.toLowerCase()),
                    )
                  }
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      required
                      label="Customer company"
                      placeholder="Search company"
                    />
                  )}
                />
              </Grid>
            </Grid>
            {customer && <Box sx={{ mt: 2, p: 2, borderRadius: 1.5, bgcolor: "#f7f9fb" }}><Typography fontWeight={700}>{customer.name}</Typography><Typography variant="body2" color="text.secondary">{[customer.address, customer.city].filter(Boolean).join(", ") || "No address recorded"}</Typography><Typography variant="body2" color="text.secondary">{[customer.email, customer.phone].filter(Boolean).join(" · ") || "No main contact details recorded"}</Typography></Box>}
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" fontWeight={700}>Email recipients</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: customer ? 0 : 2 }}>Recipients belong to the selected customer company.</Typography>
            {customer ? (
              <QuotationRecipients
                key={customer.id}
                companyId={customer.id}
                onChange={setProfileRecipients}
              />
            ) : <Alert severity="info">Select a customer company before choosing recipients.</Alert>}
          </Paper>

          <Paper variant="outlined" sx={{ overflow: "hidden" }}>
            <Stack
              direction={{ xs: "column", sm: "row" }}
              justifyContent="space-between"
              alignItems={{ sm: "center" }}
              spacing={2}
              sx={{ p: { xs: 2, sm: 3 }, borderBottom: "1px solid", borderColor: "divider" }}
            >
              <Stack direction="row" spacing={1.5} alignItems="center"><Chip label="2" color="primary" size="small" /><Box><Typography variant="h6" fontWeight={700}>Products and services</Typography><Typography variant="body2" color="text.secondary">Import from Excel or enter a quotation line manually.</Typography></Box></Stack>
            </Stack>
            <Box sx={{ p: { xs: 2, sm: 3 }, bgcolor: "#f7f9fb", borderBottom: "1px solid", borderColor: "divider" }}>
              <ProductImport embedded onAddItem={addCatalogItem} />
              <Paper variant="outlined" sx={{ p: 3, bgcolor: "#fff" }}>
                <Stack direction={{ xs: "column", sm: "row" }} justifyContent="space-between" alignItems={{ sm: "center" }} spacing={2}>
                  <Box><Typography variant="subtitle1" fontWeight={700}>Add a line manually</Typography><Typography variant="body2" color="text.secondary">Use this for a custom product, service or BOQ line that is not in the Excel list.</Typography></Box>
                  <Button variant="outlined" startIcon={<AddRoundedIcon />} disabled={!!manualLine} onClick={() => { setManualLine(emptyManualLine()); setManualLineError(""); }}>Add manual line</Button>
                </Stack>
                <Collapse in={!!manualLine} unmountOnExit>
                  {manualLine && <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                    {manualLineError && <Alert severity="error" sx={{ mb: 2 }}>{manualLineError}</Alert>}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}><TextField fullWidth label="Item number (optional)" value={manualLine.itemNo} onChange={(event) => setManualLine({ ...manualLine, itemNo: event.target.value })} /></Grid>
                      <Grid item xs={12} sm={9}><TextField fullWidth required label="Description" value={manualLine.description} onChange={(event) => setManualLine({ ...manualLine, description: event.target.value })} /></Grid>
                      <Grid item xs={6} sm={3}><TextField fullWidth label="Unit" value={manualLine.unit} onChange={(event) => setManualLine({ ...manualLine, unit: event.target.value })} /></Grid>
                      <Grid item xs={6} sm={3}><TextField fullWidth required type="number" label="Quantity" value={manualLine.quantity} onChange={(event) => setManualLine({ ...manualLine, quantity: Number(event.target.value) })} /></Grid>
                      <Grid item xs={12} sm={3}><TextField fullWidth required type="number" label="Rate" value={manualLine.unitPrice} onChange={(event) => setManualLine({ ...manualLine, unitPrice: Number(event.target.value) })} /></Grid>
                      <Grid item xs={12} sm={3}><Box sx={{ px: 1, py: 1 }}><Typography variant="caption" color="text.secondary">Line total</Typography><Typography fontWeight={700}>${(manualLine.quantity * manualLine.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box></Grid>
                    </Grid>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}><Button variant="contained" onClick={addManualLine}>Add to quotation</Button><Button onClick={() => { setManualLine(null); setManualLineError(""); }}>Cancel</Button></Stack>
                  </Box>}
                </Collapse>
              </Paper>
            </Box>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3 }}><Typography variant="subtitle1" fontWeight={700}>Quotation lines</Typography><Typography variant="body2" color="text.secondary">{lines.length ? `${lines.length} line${lines.length === 1 ? "" : "s"} added` : "No lines added yet"}</Typography></Box>
            {!lines.length && <Alert severity="info" sx={{ m: 3 }}>Add rows from the Excel preview or create a manual line.</Alert>}
            {lines.map((line, index) => {
              const exceeds =
                line.available !== null && line.quantity > line.available;
              return (
                <Box
                  sx={{ px: { xs: 2, sm: 3 }, py: 2.5, borderBottom: index < lines.length - 1 ? "1px solid" : 0, borderColor: "divider" }}
                  key={`${line.catalogId}-${index}`}
                >
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} sm="auto"><Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#edf5fb", color: "primary.main", display: "grid", placeItems: "center", fontWeight: 700 }}>{index + 1}</Box></Grid>
                    <Grid item xs={12} sm><Typography fontWeight={600}>{line.itemNo ? `${line.itemNo} · ` : ""}{line.description}</Typography><Typography variant="caption" color="text.secondary">{line.source === "catalog" ? "Excel/catalog line" : "Manual line"}</Typography></Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={line.quantity}
                        onChange={(event) =>
                            updateLine(line.id, {
                              quantity: Math.max(1, Number(event.target.value)),
                          })
                        }
                        error={exceeds}
                        helperText={
                          line.available === null
                            ? "No stock limit"
                            : `Available: ${line.available}`
                        }
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}><Typography variant="caption" color="text.secondary">Unit / rate</Typography><Typography fontWeight={600}>{line.unit || "-"}</Typography><Typography variant="body2" color="text.secondary">${line.unitPrice.toLocaleString()}</Typography></Grid>
                    <Grid item xs={12} sm={2}><Typography variant="caption" color="text.secondary">Line total</Typography><Typography fontWeight={700}>${(line.unitPrice * line.quantity).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography>
                      <Button color="error" size="small" sx={{ mt: 0.5, minWidth: 0 }} onClick={() => setLines((current) => current.filter((entry) => entry.id !== line.id))}>Remove</Button>
                    </Grid>
                  </Grid>
                </Box>
              );
            })}
          </Paper>

          <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}>
            <Stack direction="row" spacing={1.5} alignItems="center" sx={{ mb: 3 }}><Chip label="3" color="primary" size="small" /><Box><Typography variant="h6" fontWeight={700}>Summary and actions</Typography><Typography variant="body2" color="text.secondary">Review the quotation total before saving or sending.</Typography></Box></Stack>
            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={4}><Paper variant="outlined" sx={{ p: 2.5, height: "100%", bgcolor: "#f7f9fb" }}><Typography variant="subtitle2" color="text.secondary" gutterBottom>Quotation</Typography><Stack spacing={1}><Typography variant="body2"><strong>Customer:</strong> {customer?.name || "Not selected"}</Typography><Typography variant="body2"><strong>Lines:</strong> {lines.length}</Typography><Typography variant="body2"><strong>Valid until:</strong> {expiry || "Not set"}</Typography></Stack></Paper></Grid>
              <Grid item xs={12} sm={6} md={4}><Stack spacing={2}><TextField fullWidth label="Discount" type="number" value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} /><TextField fullWidth label="Tax %" type="number" value={taxRate} onChange={(event) => setTaxRate(Math.max(0, Number(event.target.value)))} /></Stack></Grid>
              <Grid item xs={12} sm={6} md={4}><Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}><SummaryRow label="Subtotal" value={subtotal} /><Divider sx={{ my: 1.5 }} /><SummaryRow label="Total" value={total} strong /></Paper></Grid>
            </Grid>
            <Stack direction={{ xs: "column-reverse", sm: "row" }} justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                disabled={invalidStock || !customer || !lines.length}
                onClick={() => save("Draft")}
              >
                Save as draft
              </Button>
              <Button
                variant="contained"
                disabled={
                  invalidStock ||
                  !customer ||
                  !lines.length ||
                  !profileRecipients.to
                }
                onClick={() => save("Sent")}
              >
                Save & send
              </Button>
              </Stack>
          </Paper>
      </Stack>
    </Box>
  );
}
function SummaryRow({
  label,
  value,
  strong,
}: {
  label: string;
  value: number;
  strong?: boolean;
}) {
  return (
    <Box sx={{ display: "flex", justifyContent: "space-between", py: 0.7 }}>
      <Typography sx={{ fontWeight: strong ? 700 : 400 }}>{label}</Typography>
      <Typography
        sx={{ fontWeight: 700, color: strong ? "#1264a3" : "inherit" }}
      >
        $
        {value.toLocaleString(undefined, {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2,
        })}
      </Typography>
    </Box>
  );
}

function Orders() {
  const [search, setSearch] = useState("");
  const filtered = orders.filter((o) =>
    `${o.id} ${o.customer}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <Box sx={{ p: { xs: 3, md: 5 } }}>
      <SectionTitle
        eyebrow="Sales workspace"
        title="Sales Orders"
        description="Track accepted quotations through confirmation, processing and completion."
      />
      <Paper
        variant="outlined"
        sx={{ borderColor: "#e1e8ee", overflow: "hidden" }}
      >
        <Box sx={{ p: 2.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Search order or customer"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Box>
        <Table>
          <TableHead sx={{ bgcolor: "#f7f9fb" }}>
            <TableRow>
              <TableCell>Order number</TableCell>
              <TableCell>Customer</TableCell>
              <TableCell>Order date</TableCell>
              <TableCell>Quotation</TableCell>
              <TableCell align="right">Total</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Invoice reference</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filtered.map((o) => (
              <TableRow key={o.id} hover>
                <TableCell sx={{ fontWeight: 700 }}>{o.id}</TableCell>
                <TableCell>{o.customer}</TableCell>
                <TableCell>{o.date}</TableCell>
                <TableCell>{o.quote}</TableCell>
                <TableCell align="right" sx={{ fontWeight: 700 }}>
                  ${o.total.toLocaleString()}
                </TableCell>
                <TableCell>
                  <StatusChip status={o.status} />
                </TableCell>
                <TableCell>
                  {o.invoice === "Pending" ? (
                    <Chip label="Pending" size="small" variant="outlined" />
                  ) : (
                    o.invoice
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

function QuotationDetailRoute({
  list,
  onStatusChange,
}: {
  list: Quote[];
  onStatusChange: (id: string, status: Status) => void;
}) {
  const { quotationId } = useParams();
  return (
    <QuotationDetails
      quotation={list.find((q) => q.id === quotationId)}
      onStatusChange={onStatusChange}
    />
  );
}

export default function App() {
  const [quotations, setQuotations] = useState(quotesSeed);
  const addQuotation = (quotation: Quote) =>
    setQuotations((current) => [
      quotation,
      ...current.filter((existing) => existing.id !== quotation.id),
    ]);
  const updateQuotationStatus = (id: string, status: Status) =>
    setQuotations((current) =>
      current.map((quotation) =>
        quotation.id === id
          ? {
              ...quotation,
              status,
              statusDate:
                status === "Accepted" || status === "Rejected"
                  ? new Date().toISOString()
                  : undefined,
            }
          : quotation,
      ),
    );
  return (
    <CustomerProvider>
      <CatalogProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/sales/customers" element={<Customers />} />
            <Route
              path="/sales/quotations"
              element={<Quotations list={quotations} setList={setQuotations} />}
            />
            <Route
              path="/sales/quotations/new"
              element={<QuotationForm onSave={addQuotation} />}
            />
            <Route
              path="/sales/quotations/:quotationId"
              element={
                <QuotationDetailRoute
                  list={quotations}
                  onStatusChange={updateQuotationStatus}
                />
              }
            />
            <Route path="/sales/orders" element={<Orders />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Shell>
      </CatalogProvider>
    </CustomerProvider>
  );
}
