import { calculateTotals, roundMoney, stockError, localDate, validDate, validQuotes, insertQuotation, updateDraft, canTransition } from './sales-logic';
import { usePersistentState } from './use-persistent-state';
import { catalogColumns as defaultCatalogColumns, type CatalogColumns, validExtraColumns, parseCatalog, createCatalogTemplate } from './catalog-import';
import { QuotationDetails } from "./quotation-view";
import {
  CustomerProvider,
  Customers,
  QuotationRecipients,
  useCustomers,
  cleanRecipients,
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
  Tooltip,
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
const catalogTemplateStorageKey = "goelta.catalog-template.extra-columns.v1";
export type Quote = {
  id: string;
  title?: string;
  description?: string;
  customerId?: string;
  customer: string;
  subcontractId?: string;
  subcontract?: string;
  date: string;
  expiry: string;
  total: number;
  status: Status;
  statusDate?: string;
  isDemo?: boolean;
  statusHistory?: { status: Status; date: string }[];
  lines?: {
    catalogId?: string;
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
const quotesSeed: Quote[] = ([
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
] as Quote[]).map(q => ({ ...q, isDemo: true }));
const orders = [
  {
    id: "PO-2026-0018",
    customer: "Cedar & Co. Holdings",
    date: "12 Sep 2026",
    total: 8420,
    status: "Processing",
    quote: "SQ-2026-0041",
    invoice: "Pending",
  },
  {
    id: "PO-2026-0017",
    customer: "Asteria Construction Ltd",
    date: "28 Aug 2026",
    total: 5280,
    status: "Completed",
    quote: "SQ-2026-0034",
    invoice: "INV-2026-0091",
  },
  {
    id: "PO-2026-0016",
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
    ["Purchase Orders", "/sales/purchase-orders", <ShoppingCartRoundedIcon />],
    ["Invoices", "/sales/invoices", <ReceiptLongRoundedIcon />],
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
            label="Purchase orders"
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
                    {q.customer}{q.subcontract ? ` · ${q.subcontract}` : ""} · {q.date}
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
              onClick={() => navigate("/sales/purchase-orders")}
              endIcon={<OpenInNewRoundedIcon />}
            >
              View purchase orders
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
  const columns = defaultCatalogColumns;
  const { value: extraColumns, commit: saveExtraColumns, error: templateError } = usePersistentState<string[]>(catalogTemplateStorageKey, [], validExtraColumns);
  const [busy, setBusy] = useState(false);
  const [messageSeverity, setMessageSeverity] = useState<'success' | 'error'>('success');
  const previewColumns = [...new Set([...extraColumns, ...items.flatMap(item => Object.keys(item.attributes || {}))])];
  const [builderOpen, setBuilderOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [message, setMessage] = useState("");
  const [previewOpen, setPreviewOpen] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const importFile = async (file: File) => {
    setMessage(''); setMessageSeverity('error');
    if (!/\.xlsx?$/i.test(file.name)) { setMessage('Choose an .xlsx or .xls file.'); return; }
    setBusy(true);
    try {
      const workbook = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      const sheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!sheet) throw Error('The workbook has no worksheet.');
      const imported = parseCatalog(sheet, extraColumns);
      if (!replace(imported)) throw Error('Import was not saved. Resolve the storage error and try again.');
      setFileName(file.name); setPreviewOpen(true); setMessageSeverity('success');
      setMessage(imported.length + ' catalog records imported and saved in this browser.');
    } catch (error) { setMessage(error instanceof Error ? error.message : 'The workbook could not be read.'); }
    finally { setBusy(false); if (inputRef.current) inputRef.current.value = ''; }
  };
  const downloadTemplate = () => {
    try { XLSX.writeFile(createCatalogTemplate(extraColumns), 'GOELTA-sales-catalog-template.xlsx'); }
    catch { setMessageSeverity('error'); setMessage('Template download failed. Please try again.'); }
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
              <Button disabled={busy || !!templateError} variant="outlined" onClick={() => setBuilderOpen(true)}>Modify template</Button>
              <Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={downloadTemplate}>Download template</Button>
              <Button disabled={busy || !!templateError} variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => inputRef.current?.click()}>Upload Excel</Button>
            </Stack>
          </Stack>
        </Paper>
      ) : (
        <SectionTitle
          eyebrow="Sales workspace"
          title="Products & Services Import"
          description="Import inventory products and services for quotation line items."
          action={<Stack direction={{ xs: "column", sm: "row" }} spacing={1}><Button disabled={busy || !!templateError} variant="outlined" onClick={() => setBuilderOpen(true)}>Build template</Button><Button variant="outlined" startIcon={<DownloadRoundedIcon />} onClick={downloadTemplate}>Download template</Button><Button disabled={busy || !!templateError} variant="contained" startIcon={<CloudUploadRoundedIcon />} onClick={() => inputRef.current?.click()}>Upload Excel</Button></Stack>}
        />
      )}
      {builderOpen && <CatalogTemplateBuilder
        open={builderOpen}
        columns={columns}
        extraColumns={extraColumns}
        onSave={(_, nextExtraColumns) => saveExtraColumns(nextExtraColumns)}
        onClose={() => setBuilderOpen(false)}
      />}
      <input
        ref={inputRef}
        hidden
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])}
      />
      {templateError && <Alert severity="error">{templateError}</Alert>}
      {busy && <Alert severity="info">Reading and validating workbook…</Alert>}
      {message && (
        <Alert
          severity={messageSeverity}
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
        sx={{ mt: 3, borderColor: "#e1e8ee", overflowX: "auto" }}
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
              <TableCell>Product ID</TableCell>
              <TableCell>Category</TableCell>
              <TableCell>Type</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Unit</TableCell>
              <TableCell align="right">Rate</TableCell>
              <TableCell align="right">Available</TableCell>
              {previewColumns.map((column) => <TableCell key={column}>{column}</TableCell>)}
              {onAddItem && <TableCell align="right">Quotation</TableCell>}
            </TableRow>
          </TableHead>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>{item.itemNo}</TableCell>
                <TableCell>{item.id}</TableCell>
                <TableCell>{item.category}</TableCell>
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
                {previewColumns.map((column) => <TableCell key={column}>{String(item.attributes?.[column] ?? "")}</TableCell>)}
                {onAddItem && <TableCell align="right"><Button disabled={busy} size="small" onClick={() => onAddItem(item)}>Add</Button></TableCell>}
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
  onSave: (columns: CatalogColumns, extraColumns: string[]) => boolean;
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
            if (extra.trim()) { setBuilderError('Click Add for the pending heading, or clear it before saving.'); return; }
            if (!onSave(draftColumns, draftExtras)) { setBuilderError('Template was not saved. Resolve the storage error and retry.'); return; }
            try { XLSX.writeFile(createCatalogTemplate(draftExtras), 'GOELTA-sales-catalog-template.xlsx'); onClose(); }
            catch { setBuilderError('Template saved, but download failed. Retry using Download template.'); }
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
}: {
  list: Quote[];
}) {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("All");
  const filtered = list.filter(
    (q) =>
      `${q.id} ${q.title || ""} ${q.description || ""} ${q.customer}`.toLowerCase().includes(search.toLowerCase()) &&
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
                <TableCell sx={{ fontWeight: 700 }}><Typography fontWeight={700}>{q.id}</Typography>{q.title && <Typography variant="body2">{q.title}</Typography>}{q.description && <Typography variant="caption" color="text.secondary" display="block" sx={{ maxWidth: 280 }}>{q.description}</Typography>}</TableCell>
                <TableCell><Typography>{q.customer}</Typography>{q.subcontract && <Typography variant="caption" color="text.secondary" display="block">{q.subcontract}</Typography>}</TableCell>
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
                  {q.status === "Draft" && <Button size="small" onClick={() => navigate(`/sales/quotations/${encodeURIComponent(q.id)}/edit`)}>Edit draft</Button>}
                  <>
                    <Tooltip title={q.status === "Accepted" ? "Create a purchase order" : "Set status to Accepted first"}>
                      <span>
                        <Button size="small" disabled={q.status !== "Accepted"} onClick={() => navigate("/sales/purchase-orders")}>Create PO</Button>
                      </span>
                    </Tooltip>
                    <Tooltip title={q.status === "Accepted" ? "Create an invoice" : "Set status to Accepted first"}>
                      <span>
                        <Button size="small" disabled={q.status !== "Accepted"} onClick={() => navigate("/sales/invoices")}>Create invoice</Button>
                      </span>
                    </Tooltip>
                  </>
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

function QuotationForm({ onSave, initial }: { onSave: (quotation: Quote) => boolean; initial?: Quote }) {
  const navigate = useNavigate();
  const { companies } = useCustomers();
  const { items } = useCatalog();
  const { value: extraColumns } = usePersistentState<string[]>(catalogTemplateStorageKey, [], validExtraColumns);

  const activeCompanies = companies.filter(
    (company) => company.status === "Active",
  );
  const today = localDate();
  const defaultExpiry = localDate(30);
  const [number, setNumber] = useState(() => initial?.id || 'SQ-' + new Date().getFullYear() + '-' + crypto.randomUUID().slice(0, 8).toUpperCase());
  const [title, setTitle] = useState(initial?.title || "");
  const [description, setDescription] = useState(initial?.description || "");
  const [date, setDate] = useState(initial?.date || today);
  const [expiry, setExpiry] = useState(initial?.expiry || defaultExpiry);
  const [customerId, setCustomerId] = useState(initial?.customerId || "");
    const [subcontractId, setSubcontractId] = useState(initial?.subcontractId || "");
  const [profileRecipients, setProfileRecipients] = useState<{
    to: string;
    cc: string[];
  }>({ to: "", cc: [] });
  const [lines, setLines] = useState<DraftQuotationLine[]>(() => (initial?.lines || []).map(line => ({ ...line, id: crypto.randomUUID(), source: line.catalogId ? "catalog" : "manual", itemNo: line.itemNo || "", unit: line.unit || "Item", available: null, attributes: { ...line.attributes } })));
  const [manualLine, setManualLine] = useState<DraftQuotationLine | null>(null);
  const [manualColumns, setManualColumns] = useState<string[]>(extraColumns);
  const [newManualColumn, setNewManualColumn] = useState("");
  const [manualLineError, setManualLineError] = useState("");
  const [discount, setDiscount] = useState(initial?.discount || 0);
  const [taxRate, setTaxRate] = useState(initial?.taxRate || 0);
  const [error, setError] = useState("");
  const customer =
    activeCompanies.find((company) => company.id === customerId) || null;
  const subcontract = customer?.subcontracts?.find(item => item.id === subcontractId) || null;
  let totals = { subtotal: 0, tax: 0, total: 0 }; let totalsError = '';
  try { totals = calculateTotals(lines, discount, taxRate); } catch (e) { totalsError = (e as Error).message; }
  const { subtotal, total } = totals;
  const inventoryError = stockError(lines, items);
  const invalidStock = !!inventoryError;
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
        attributes: { ...item.attributes },
      },
    ]);
  const addManualLine = () => {
    if (!manualLine) return;
    if (!manualLine.description.trim())
      return setManualLineError("Enter a description for the manual line.");
    if (!Number.isFinite(manualLine.quantity) || manualLine.quantity <= 0)
      return setManualLineError("Quantity must be greater than zero.");
    if (!Number.isFinite(manualLine.unitPrice) || manualLine.unitPrice < 0)
      return setManualLineError("Enter a valid, non-negative rate.");
    setLines((current) => [
      ...current,
      { ...manualLine, description: manualLine.description.trim(), unit: manualLine.unit.trim() || "Item" },
    ]);
    setManualLine(null);
    setManualLineError("");
  };
  const updateManualAttribute = (column: string, value: string) => {
    setManualLine(current => current ? { ...current, attributes: { ...current.attributes, [column]: value } } : current);
  };
  const addManualColumn = () => {
    const heading = newManualColumn.trim();
    if (!heading) return setManualLineError("Enter a custom column heading.");
    if (heading.length > 60 || /[\r\n]/.test(heading)) return setManualLineError("Use a single-line heading of 60 characters or fewer.");
    if ([...Object.values(defaultCatalogColumns), ...manualColumns].some(column => column.toLowerCase() === heading.toLowerCase())) return setManualLineError("That column already exists.");
    setManualColumns(current => [...current, heading]);
    setNewManualColumn("");
    setManualLineError("");
  };
  const save = (status: Status) => {
    setError("");
    if (manualLine) return setError("Finish or cancel the manual line before saving.");
    if (totalsError) return setError(totalsError);
    if (lines.some(line => !line.description.trim() || !line.unit.trim())) return setError("Each line needs a description and unit.");
    if (!number.trim() || !title.trim() || !validDate(date) || !validDate(expiry) || !customer || (!!customer.subcontracts?.length && !subcontract) || !lines.length)
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
    const selectedRecipients = cleanRecipients(customer, profileRecipients.to, profileRecipients.cc);
    if (status === "Sent" && !selectedRecipients.to)
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
    const mainRecipient = recipientById(selectedRecipients.to);
    const recipients = [
      ...(mainRecipient?.email
        ? [{ role: "To" as const, ...mainRecipient }]
        : []),
      ...selectedRecipients.cc
        .map(recipientById)
        .filter(
          (recipient): recipient is { email: string; name: string } =>
            !!recipient?.email,
        )
        .map((recipient) => ({ role: "CC" as const, ...recipient })),
    ];
    const saved = onSave({
      ...initial,
      id: number.trim(),
      title: title.trim(),
      description: description.trim(),
      customerId: customer.id,
      customer: customer.name,
      subcontractId: subcontract?.id,
      subcontract: subcontract?.name,
      date,
      expiry,
      total,
      status: "Draft",
      discount: roundMoney(discount),
      taxRate,
      customerEmail: customer.email,
      customerPhone: customer.phone,
      customerAddress: [customer.address, customer.city]
        .filter(Boolean)
        .join(", "),
      recipients,
      lines: lines.map((line) => ({
        catalogId: line.catalogId,
        itemNo: line.itemNo,
        description: line.description,
        quantity: line.quantity,
        unit: line.unit,
        unitPrice: line.unitPrice,
        attributes: line.attributes,
      })),
    });
    if (saved) navigate("/sales/quotations/" + encodeURIComponent(number.trim()) + (status === "Sent" ? "?email=1" : ""));
  };
  return (
    <Box sx={{ p: { xs: 2, sm: 3, md: 5 }, maxWidth: 1320, mx: "auto" }}>
      <Breadcrumbs sx={{ mb: 3 }}>
        <Link to="/sales/quotations" style={{ color: "#71869a" }}>
          Quotations
        </Link>
        <Typography>{initial ? "Edit draft" : "New quotation"}</Typography>
      </Breadcrumbs>
      <SectionTitle
        eyebrow="Quotation workflow"
        title={initial ? "Edit draft quotation" : "Create quotation"}
        description="Enter the customer and dates, confirm the email recipients, then add the quoted items."
        action={<Button component={Link} to="/sales/quotations">Cancel</Button>}
      />
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}
      <Stack spacing={3}>
          {initial && !customer && <Alert severity="warning">The saved customer is unavailable or inactive. Select an active company before saving.</Alert>}
          {initial && customer && customer.id === initial.customerId && initial.recipients?.some(recipient => ![customer.email, ...customer.contacts.map(contact => contact.email)].some(email => email.toLowerCase() === recipient.email.toLowerCase())) && <Alert severity="warning">Some saved recipients are no longer listed under this company. Review and reselect recipients before saving. Previously saved: {initial.recipients.map(recipient => `${recipient.role}: ${recipient.email}`).join('; ')}</Alert>}
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
                <TextField fullWidth required label="Quotation title" value={title} onChange={(event) => setTitle(event.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <TextField fullWidth label="Quotation description" multiline minRows={2} value={description} onChange={(event) => setDescription(event.target.value)} />
              </Grid>
              <Grid item xs={12}>
                <Autocomplete
                  fullWidth
                  options={activeCompanies}
                  value={customer}
                  onChange={(_, company) => {
                    setCustomerId(company?.id || "");
                    setSubcontractId("");
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
                        ...(company.subcontracts || []).map(item => item.name),
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
                  renderOption={(props, company) => <li {...props}><Typography>{company.name}</Typography>{company.subcontracts?.length ? <Typography variant="caption" color="text.secondary">{company.subcontracts.length} subcontract{company.subcontracts.length === 1 ? "" : "s"}</Typography> : null}</li>}
                />
              </Grid>
            </Grid>
            {customer && <Box sx={{ mt: 2, p: 2, borderRadius: 1.5, bgcolor: "#f7f9fb" }}><Typography fontWeight={700}>{customer.name}</Typography><Typography variant="body2" color="text.secondary">{[customer.address, customer.city].filter(Boolean).join(", ") || "No address recorded"}</Typography><Typography variant="body2" color="text.secondary">{[customer.email, customer.phone].filter(Boolean).join(" · ") || "No main contact details recorded"}</Typography>{customer.subcontracts?.length ? <Select fullWidth size="small" sx={{ mt: 2 }} displayEmpty value={subcontractId} onChange={event => setSubcontractId(event.target.value)}><MenuItem value="">Select subcontract</MenuItem>{customer.subcontracts.map(item => <MenuItem key={item.id} value={item.id}>{item.name}</MenuItem>)}</Select> : null}</Box>}
            <Divider sx={{ my: 3 }} />
            <Typography variant="subtitle1" fontWeight={700}>Email recipients</Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: customer ? 0 : 2 }}>Recipients belong to the selected customer company.</Typography>
            {customer ? (
              <QuotationRecipients
                savedRecipients={customerId === initial?.customerId ? initial?.recipients || [] : undefined}
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
                  <Button variant="outlined" startIcon={<AddRoundedIcon />} disabled={!!manualLine} onClick={() => { setManualLine(emptyManualLine()); setManualColumns(extraColumns); setNewManualColumn(""); setManualLineError(""); }}>Add manual line</Button>
                </Stack>
                <Collapse in={!!manualLine} unmountOnExit>
                  {manualLine && <Box sx={{ mt: 3, pt: 3, borderTop: "1px solid", borderColor: "divider" }}>
                    {manualLineError && <Alert severity="error" sx={{ mb: 2 }}>{manualLineError}</Alert>}
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={3}><TextField fullWidth label="Item number (optional)" value={manualLine.itemNo} onChange={(event) => setManualLine({ ...manualLine, itemNo: event.target.value })} /></Grid>
                      <Grid item xs={12} sm={9}><TextField fullWidth required label="Description" value={manualLine.description} onChange={(event) => setManualLine({ ...manualLine, description: event.target.value })} /></Grid>
                      <Grid item xs={6} sm={3}><TextField fullWidth label="Unit" value={manualLine.unit} onChange={(event) => setManualLine({ ...manualLine, unit: event.target.value })} /></Grid>
                      <Grid item xs={6} sm={3}><TextField fullWidth required type="number" label="Quantity" value={manualLine.quantity} onChange={(event) => setManualLine({ ...manualLine, quantity: Number(event.target.value) })} /></Grid>
                      <Grid item xs={12} sm={3}><TextField fullWidth required type="number" label="Rate" value={Number.isNaN(manualLine.unitPrice) ? "" : manualLine.unitPrice} onChange={(event) => setManualLine({ ...manualLine, unitPrice: event.target.value === "" ? NaN : Number(event.target.value) })} /></Grid>
                      <Grid item xs={12} sm={3}><Box sx={{ px: 1, py: 1 }}><Typography variant="caption" color="text.secondary">Line total</Typography><Typography fontWeight={700}>${(manualLine.quantity * manualLine.unitPrice).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</Typography></Box></Grid>
                      {manualColumns.map(column => <Grid item xs={12} sm={4} key={column}><TextField fullWidth label={column} value={String(manualLine.attributes[column] ?? "")} onChange={event => updateManualAttribute(column, event.target.value)} /></Grid>)}
                    </Grid>
                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1} sx={{ mt: 2 }}><TextField size="small" label="New custom column" value={newManualColumn} onChange={event => setNewManualColumn(event.target.value)} /><Button variant="outlined" onClick={addManualColumn}>Add column</Button></Stack>
                    <Stack direction="row" spacing={1} sx={{ mt: 2 }}><Button variant="contained" onClick={addManualLine}>Add to quotation</Button><Button onClick={() => { setManualLine(null); setManualLineError(""); }}>Cancel</Button></Stack>
                  </Box>}
                </Collapse>
              </Paper>
            </Box>
            <Box sx={{ px: { xs: 2, sm: 3 }, pt: 3 }}><Typography variant="subtitle1" fontWeight={700}>Quotation lines</Typography><Typography variant="body2" color="text.secondary">{lines.length ? `${lines.length} line${lines.length === 1 ? "" : "s"} added` : "No lines added yet"}</Typography></Box>
            {!lines.length && <Alert severity="info" sx={{ m: 3 }}>Add rows from the Excel preview or create a manual line.</Alert>}
            {lines.map((line, index) => {
              const available = line.catalogId ? items.find(item => item.id === line.catalogId)?.available : null;
              const combinedQuantity = line.catalogId ? lines.filter(item => item.catalogId === line.catalogId).reduce((sum, item) => sum + item.quantity, 0) : line.quantity;
              const exceeds = available === undefined || (available !== null && combinedQuantity > available);
              return (
                <Box
                  sx={{ px: { xs: 2, sm: 3 }, py: 2.5, borderBottom: index < lines.length - 1 ? "1px solid" : 0, borderColor: "divider" }}
                  key={line.id}
                >
                  <Grid container spacing={2} alignItems="flex-start">
                    <Grid item xs={12} sm="auto"><Box sx={{ width: 28, height: 28, borderRadius: "50%", bgcolor: "#edf5fb", color: "primary.main", display: "grid", placeItems: "center", fontWeight: 700 }}>{index + 1}</Box></Grid>
                    <Grid item xs={12} sm><TextField fullWidth label="Description" value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })} /><Typography variant="caption" color="text.secondary">{line.source === "catalog" ? "Excel/catalog line" : "Manual line"}</Typography></Grid>
                    <Grid item xs={6} sm={2}>
                      <TextField
                        fullWidth
                        label="Quantity"
                        type="number"
                        value={line.quantity}
                        onChange={(event) =>
                            updateLine(line.id, {
                              quantity: Number(event.target.value),
                          })
                        }
                        error={exceeds}
                        helperText={
                          available === undefined ? "Catalog item removed" : available === null
                            ? "No stock limit"
                            : `Available: ${available}; quoted: ${combinedQuantity}`
                        }
                      />
                    </Grid>
                    <Grid item xs={6} sm={2}><Typography variant="caption" color="text.secondary">Unit / rate</Typography><TextField fullWidth size="small" label="Unit" value={line.unit} onChange={event => updateLine(line.id, { unit: event.target.value })} /><TextField fullWidth size="small" sx={{ mt: 1 }} label="Rate" type="number" value={Number.isNaN(line.unitPrice) ? "" : line.unitPrice} onChange={event => updateLine(line.id, { unitPrice: event.target.value === "" ? NaN : Number(event.target.value) })} /></Grid>
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
            {totalsError && <Alert severity="error" sx={{ mb: 2 }}>{totalsError}</Alert>}
            {inventoryError && <Alert severity="error" sx={{ mb: 2 }}>{inventoryError}</Alert>}
            <Grid container spacing={3} alignItems="stretch">
              <Grid item xs={12} md={4}><Paper variant="outlined" sx={{ p: 2.5, height: "100%", bgcolor: "#f7f9fb" }}><Typography variant="subtitle2" color="text.secondary" gutterBottom>Quotation</Typography><Stack spacing={1}><Typography variant="body2"><strong>Customer:</strong> {customer?.name || "Not selected"}</Typography><Typography variant="body2"><strong>Lines:</strong> {lines.length}</Typography><Typography variant="body2"><strong>Valid until:</strong> {expiry || "Not set"}</Typography></Stack></Paper></Grid>
              <Grid item xs={12} sm={6} md={4}><Stack spacing={2}><TextField fullWidth label="Discount" type="number" value={discount} onChange={(event) => setDiscount(Math.max(0, Number(event.target.value)))} /><TextField fullWidth label="Tax %" type="number" value={taxRate} onChange={(event) => setTaxRate(Math.max(0, Number(event.target.value)))} /></Stack></Grid>
              <Grid item xs={12} sm={6} md={4}><Paper variant="outlined" sx={{ p: 2.5, height: "100%" }}><SummaryRow label="Subtotal" value={subtotal} /><Divider sx={{ my: 1.5 }} /><SummaryRow label="Total" value={total} strong /></Paper></Grid>
            </Grid>
            <Stack direction={{ xs: "column-reverse", sm: "row" }} justifyContent="flex-end" spacing={1} sx={{ mt: 3 }}>
              <Button
                variant="outlined"
                disabled={!!manualLine || !!totalsError || invalidStock || !customer || !lines.length}
                onClick={() => save("Draft")}
              >
                {initial ? "Save changes" : "Save as draft"}
              </Button>
              <Button
                variant="contained"
                disabled={
                  !!manualLine || !!totalsError || invalidStock ||
                  !customer ||
                  !lines.length ||
                  !profileRecipients.to
                }
                onClick={() => save("Sent")}
              >
                Save & prepare email
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
        title="Purchase Orders"
        description="Sample purchase orders. Quotation conversion and order processing are not connected yet."
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
              <TableCell>Purchase order number</TableCell>
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

type InvoiceLine = { id: string; description: string; quantity: number; unitPrice: number };

function Invoices() {
  const [number, setNumber] = useState(() => "INV-" + new Date().getFullYear() + "-001");
  const [customer, setCustomer] = useState("");
  const [notes, setNotes] = useState("");
  const [lines, setLines] = useState<InvoiceLine[]>([{ id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  const [saved, setSaved] = useState<{ number: string; customer: string; notes: string; lines: InvoiceLine[] } | null>(null);
  const total = lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const updateLine = (id: string, patch: Partial<InvoiceLine>) => setLines(current => current.map(line => line.id === id ? { ...line, ...patch } : line));
  const addLine = () => setLines(current => [...current, { id: crypto.randomUUID(), description: "", quantity: 1, unitPrice: 0 }]);
  return <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1200 }}>
    <SectionTitle eyebrow="Sales workspace" title="Invoices" description="Create invoices and add customer-facing notes below the products table." />
    <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 }, mb: 3 }}>
      <Grid container spacing={2}>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Invoice number" value={number} onChange={event => setNumber(event.target.value)} /></Grid>
        <Grid item xs={12} sm={6}><TextField fullWidth label="Customer" value={customer} onChange={event => setCustomer(event.target.value)} /></Grid>
      </Grid>
      <Typography variant="h6" sx={{ mt: 3, mb: 1 }}>Products</Typography>
      <Table size="small"><TableHead><TableRow><TableCell>Description</TableCell><TableCell width={120}>Quantity</TableCell><TableCell width={160}>Unit price</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead><TableBody>{lines.map(line => <TableRow key={line.id}><TableCell><TextField fullWidth size="small" label="Product or service" value={line.description} onChange={event => updateLine(line.id, { description: event.target.value })} /></TableCell><TableCell><TextField fullWidth size="small" type="number" inputProps={{ min: 1 }} value={line.quantity} onChange={event => updateLine(line.id, { quantity: Number(event.target.value) })} /></TableCell><TableCell><TextField fullWidth size="small" type="number" inputProps={{ min: 0, step: "0.01" }} value={line.unitPrice} onChange={event => updateLine(line.id, { unitPrice: Number(event.target.value) })} /></TableCell><TableCell align="right">${(line.quantity * line.unitPrice).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table>
      <Button sx={{ mt: 2 }} startIcon={<AddRoundedIcon />} onClick={addLine}>Add product</Button>
      <TextField fullWidth multiline minRows={3} label="Notes" helperText="Shown underneath the products table" value={notes} onChange={event => setNotes(event.target.value)} sx={{ mt: 3 }} />
      <Typography textAlign="right" fontWeight={700} sx={{ mt: 2 }}>Total: ${total.toFixed(2)}</Typography>
      <Button variant="contained" sx={{ mt: 2 }} onClick={() => setSaved({ number: number.trim(), customer: customer.trim(), notes: notes.trim(), lines: lines.map(line => ({ ...line })) })}>Save invoice</Button>
    </Paper>
    {saved && <Paper variant="outlined" sx={{ p: { xs: 2, sm: 3 } }}><Typography variant="h5" gutterBottom>{saved.number || "Invoice"}</Typography><Typography color="text.secondary" gutterBottom>{saved.customer || "Customer not recorded"}</Typography><Table size="small"><TableHead><TableRow><TableCell>Product</TableCell><TableCell>Quantity</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead><TableBody>{saved.lines.map(line => <TableRow key={line.id}><TableCell>{line.description || "Unnamed product"}</TableCell><TableCell>{line.quantity}</TableCell><TableCell align="right">${(line.quantity * line.unitPrice).toFixed(2)}</TableCell></TableRow>)}</TableBody></Table>{saved.notes && <Box sx={{ mt: 2, pt: 2, borderTop: "1px solid", borderColor: "divider" }}><Typography variant="subtitle2">Notes</Typography><Typography sx={{ whiteSpace: "pre-line" }}>{saved.notes}</Typography></Box>}</Paper>}
  </Box>;
}

function QuotationEditRoute({ list, onSave }: { list: Quote[]; onSave: (id: string, quotation: Quote) => boolean }) {
  const { quotationId } = useParams();
  const quotation = list.find(q => q.id === quotationId);
  if (!quotation || quotation.status !== 'Draft') return <Box sx={{ p: 4 }}><Alert severity="warning">{quotation ? 'Only draft quotations can be edited.' : 'Quotation not found.'}</Alert><Button component={Link} to="/sales/quotations">Back to quotations</Button></Box>;
  return <QuotationForm key={quotation.id} initial={quotation} onSave={updated => onSave(quotation.id, updated)} />;
}

function QuotationDetailRoute({
  list,
  onStatusChange,
}: {
  list: Quote[];
  onStatusChange: (id: string, status: Status, recipients?: Quote['recipients']) => boolean;
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
  const { value: quotations, commit: saveQuotations, error: quotationError } = usePersistentState<Quote[]>('goelta.quotations.v1', quotesSeed, validQuotes);
  const addQuotation = (quotation: Quote) => saveQuotations(current => insertQuotation(current, quotation));
  const saveDraft = (id: string, quotation: Quote) => saveQuotations(current => updateDraft(current, id, quotation));
  const updateQuotationStatus = (id: string, status: Status, recipients?: Quote['recipients']) => saveQuotations(current => current.map(q => {
    if (q.id !== id) return q;
    if (!canTransition(q.status, status)) throw Error('That status change is not allowed.');
    const date = new Date().toISOString();
    return { ...q, status, statusDate: date, recipients: recipients ?? q.recipients, statusHistory: [...(q.statusHistory || []), { status, date }] };
  }));
  return (
    <CustomerProvider>
      <CatalogProvider>
        <Shell>
          {quotationError && <Alert severity="error">{quotationError}</Alert>}
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/sales" element={<SalesDashboard />} />
            <Route path="/sales/customers" element={<Customers />} />
            <Route
              path="/sales/quotations"
              element={<Quotations list={quotations} />}
            />
            <Route
              path="/sales/quotations/new"
              element={<QuotationForm key="new" onSave={addQuotation} />}
            />
            <Route
              path="/sales/quotations/:quotationId/edit"
              element={<QuotationEditRoute list={quotations} onSave={saveDraft} />}
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
            <Route path="/sales/purchase-orders" element={<Orders />} />
            <Route path="/sales/invoices" element={<Invoices />} />
            <Route path="*" element={<Home />} />
          </Routes>
        </Shell>
      </CatalogProvider>
    </CustomerProvider>
  );
}
