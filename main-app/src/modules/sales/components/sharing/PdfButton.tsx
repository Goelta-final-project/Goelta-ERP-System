import { useState } from "react";
import { Button } from "../../../../shared/ui/index";
import type { Document, DocumentKind } from "../../services/pdf";

export function PdfButton({
  document,
  kind,
}: {
  document: Document;
  kind: DocumentKind;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <>
      <Button
        icon="download"
        disabled={busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const pdf = await import("../../services/pdf");
            pdf.downloadBlob(
              pdf.documentPdf(document, kind).output("blob"),
              pdf.pdfFilename(document.number),
            );
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        {busy ? "Preparing…" : "Download PDF"}
      </Button>
      {error && (
        <span role="alert" className="error-text">
          {error}
        </span>
      )}
    </>
  );
}
