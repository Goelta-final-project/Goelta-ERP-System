import { Link, useParams } from "react-router-dom";
import { Empty } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import { SaleDetail } from "./SaleDetail";
import { SaleForm } from "./SaleForm";

export function SaleRoute({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const { state } = useWorkspace();
  const sale = state.sales.find((s) => s.id === id);
  if (id === "new") return <SaleForm key="new" />;
  if (!sale)
    return (
      <Empty
        title="Quotation not found"
        description="This record may have been removed."
        action={<Link to="/sales/quotations">Back to quotations</Link>}
      />
    );
  if (edit)
    return sale.status === "Draft" ? (
      <SaleForm key={sale.id} initial={sale} />
    ) : (
      <Empty
        title="This quotation is locked"
        description="Only draft quotations can be edited."
        action={<Link to={`/sales/quotations/${sale.id}`}>Open record</Link>}
      />
    );
  return <SaleDetail key={sale.id} sale={sale} />;
}
