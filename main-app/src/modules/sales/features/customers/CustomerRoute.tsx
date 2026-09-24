import { Link, useParams } from "react-router-dom";
import { Empty } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import { CustomerForm } from "./CustomerForm";

export function CustomerRoute() {
  const { id } = useParams();
  const { state } = useWorkspace();
  const customer = state.companies.find((c) => c.id === id);
  if (id !== "new" && !customer)
    return (
      <Empty
        title="Customer not found"
        description="Choose a customer from the list."
        action={<Link to="/sales/customers">Back to customers</Link>}
      />
    );
  return <CustomerForm key={id} initial={customer} />;
}
