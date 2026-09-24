export function Badge({ status }: { status: string }) {
  const tone = [
    "Accepted",
    "Sales Order",
    "Paid",
    "Received",
    "Active",
    "Invoiced",
  ].includes(status)
    ? "green"
    : [
          "Sent",
          "Posted",
          "Purchase Order",
          "RFQ Sent",
          "Partially paid",
        ].includes(status)
      ? "blue"
      : ["Hold", "To invoice", "Down payment", "Draft invoice"].includes(status)
        ? "amber"
        : ["Rejected", "Cancelled", "Inactive"].includes(status)
          ? "muted"
          : "purple";
  return (
    <span className={`badge ${tone}`}>
      <i />
      {status === "Accepted" ? "Sales Order" : status}
    </span>
  );
}
