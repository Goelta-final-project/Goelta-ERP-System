import { Link, useParams, useSearchParams } from "react-router-dom";
import { Empty } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import { newPurchase } from "../../domain/workflow";
import { PurchaseDetail } from "./PurchaseDetail";
import { PurchaseForm } from "./PurchaseForm";

export function PurchaseRoute({ edit = false }: { edit?: boolean }) {
  const { id } = useParams();
  const [params] = useSearchParams();
  const { state } = useWorkspace();
  const p = state.purchases.find((p) => p.id === id);
  if (id === "new") {
    try {
      const draft = newPurchase(state, params.get("sale") || undefined);
      return (
        <PurchaseForm key={params.get("sale") || "new"} initial={draft} isNew />
      );
    } catch (e) {
      return (
        <Empty
          title="Cannot create RFQ"
          description={(e as Error).message}
          action={<Link to="/sales/purchases">View purchases</Link>}
        />
      );
    }
  }
  if (!p)
    return (
      <Empty
        title="Purchase not found"
        description="Choose a purchase from the list."
        action={<Link to="/sales/purchases">Back to purchases</Link>}
      />
    );
  if (edit)
    return p.status === "RFQ" ? (
      <PurchaseForm key={p.id} initial={p} />
    ) : (
      <Empty
        title="This purchase is locked"
        description="Only RFQs can be edited."
        action={<Link to={`/sales/purchases/${p.id}`}>Open purchase</Link>}
      />
    );
  return <PurchaseDetail key={p.id} purchase={p} />;
}
