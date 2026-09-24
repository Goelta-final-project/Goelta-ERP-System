import { Link, useParams } from "react-router-dom";
import { Empty } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import { InvoiceDetail } from "./InvoiceDetail";

export function InvoiceRoute() {
  const { id } = useParams();
  const { state } = useWorkspace();
  const invoice = state.invoices.find((i) => i.id === id);
  return invoice ? (
    <InvoiceDetail key={`${id}-${invoice.status}`} invoice={invoice} />
  ) : (
    <Empty
      title="Invoice not found"
      description="Choose an invoice from the list."
      action={<Link to="/sales/invoices">Back to invoices</Link>}
    />
  );
}
