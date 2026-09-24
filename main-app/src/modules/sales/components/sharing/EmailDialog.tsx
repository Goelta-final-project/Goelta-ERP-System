import { useEffect, useState } from "react";
import { Button, Field, Modal } from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Recipient, Sale } from "../../domain/types";
import {
  profileRecipients,
  transitionSale,
  validateRecipients,
} from "../../domain/workflow";
import { buildMailto } from "./buildMailto";

export function EmailDialog({
  sale,
  onClose,
}: {
  sale: Sale;
  onClose: () => void;
}) {
  const { state, transact, error: storeError } = useWorkspace();
  const company = state.companies.find((c) => c.id === sale.customerId);
  const defaults = sale.recipients.length
    ? sale.recipients
    : company
      ? profileRecipients(company)
      : [];
  const [to, setTo] = useState(
    defaults.find((r) => r.role === "To")?.email || sale.customerEmail,
  );
  const [cc, setCc] = useState(
    defaults
      .filter((r) => r.role === "CC")
      .map((r) => r.email)
      .join(", "),
  );
  const [subject, setSubject] = useState(`GOELTA quotation ${sale.number}`);
  const [body, setBody] = useState(
    `Dear ${sale.customer},\n\nPlease find attached our quotation ${sale.number}${sale.title ? ` — ${sale.title}` : ""}.\nThis quotation is valid until ${sale.expiry}.\n\nKind regards,\nGOELTA`,
  );
  const [pdf, setPdf] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [opened, setOpened] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let cancelled = false;
    import("../../services/pdf")
      .then((module) => {
        const file = new File(
          [module.documentPdf(sale, "sale").output("blob")],
          module.pdfFilename(sale.number),
          { type: "application/pdf" },
        );
        if (!cancelled) setPdf(file);
      })
      .catch((e) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [sale, attempt]);
  let mailto = "",
    validation = "";
  try {
    mailto = buildMailto(to, cc.split(","), subject, body);
  } catch (e) {
    validation = (e as Error).message;
  }
  let canShare = false;
  try {
    canShare = !!pdf && !!navigator.canShare?.({ files: [pdf] });
  } catch {
    /* Browser may not support file sharing. */
  }
  return (
    <Modal
      title="Email quotation"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Close</Button>
          <a
            className={`btn primary ${!pdf || validation ? "disabled" : ""}`}
            aria-disabled={!pdf || !!validation}
            href={pdf && !validation ? mailto : undefined}
            onClick={async (e) => {
              if (!pdf || validation) {
                e.preventDefault();
                return;
              }
              const module = await import("../../services/pdf");
              module.downloadBlob(pdf, pdf.name);
              setOpened(true);
            }}
          >
            Download PDF & open email
          </a>
        </>
      }
    >
      <div className="alert info">
        Attach the downloaded PDF to the email draft, then send it in your email
        app.
      </div>
      {company && (
        <Field label="Recipient profile">
          <select
            defaultValue=""
            onChange={(e) => {
              if (!e.target.value) return;
              const list = profileRecipients(company, e.target.value);
              setTo(list.find((r) => r.role === "To")?.email || "");
              setCc(
                list
                  .filter((r) => r.role === "CC")
                  .map((r) => r.email)
                  .join(", "),
              );
            }}
          >
            <option value="">Custom recipients</option>
            {company.profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </Field>
      )}
      <Field label="To" required>
        <input
          type="email"
          value={to}
          onChange={(e) => setTo(e.target.value)}
        />
      </Field>
      <Field label="CC" hint="Separate addresses with commas.">
        <input value={cc} onChange={(e) => setCc(e.target.value)} />
      </Field>
      <Field label="Subject">
        <input value={subject} onChange={(e) => setSubject(e.target.value)} />
      </Field>
      <Field label="Message">
        <textarea
          rows={6}
          value={body}
          onChange={(e) => setBody(e.target.value)}
        />
      </Field>
      <small>
        {pdf
          ? `${pdf.name} · ${Math.ceil(pdf.size / 1024)} KB`
          : "Preparing PDF…"}
      </small>
      {validation && <p className="alert warning">{validation}</p>}
      {(error || storeError) && (
        <p role="alert" className="alert error">
          {error || storeError}
          {!pdf && (
            <Button
              onClick={() => {
                setError("");
                setAttempt((n) => n + 1);
              }}
            >
              Retry
            </Button>
          )}
        </p>
      )}
      {canShare && (
        <Button
          disabled={busy || !!validation}
          onClick={async () => {
            if (!pdf) return;
            setBusy(true);
            try {
              await navigator.share({
                files: [pdf],
                title: subject,
                text: body,
              });
              setOpened(true);
            } catch (e) {
              if ((e as Error).name !== "AbortError")
                setError(
                  "Sharing is unavailable. Download the PDF and open an email draft instead.",
                );
            } finally {
              setBusy(false);
            }
          }}
        >
          Share PDF to an app
        </Button>
      )}
      {opened && (
        <div className="alert info">
          Opening a draft does not confirm delivery. Send the email, then mark
          it as sent below.
        </div>
      )}
      {opened && ["Draft", "Hold"].includes(sale.status) && (
        <Button
          disabled={!!validation}
          onClick={() => {
            const addresses = [
              ...new Set(
                cc
                  .split(",")
                  .map((s) => s.trim().toLowerCase())
                  .filter(Boolean),
              ),
            ].filter((s) => s !== to.trim().toLowerCase());
            const recipients: Recipient[] = [
              { role: "To", email: to.trim() },
              ...addresses.map((email) => ({ role: "CC" as const, email })),
            ];
            if (
              transact((s) => {
                validateRecipients(recipients);
                s.sales.find((q) => q.id === sale.id)!.recipients = recipients;
                transitionSale(s, sale.id, "Sent");
              }, "Quotation marked as sent")
            )
              onClose();
          }}
        >
          I sent this email — mark as sent
        </Button>
      )}
    </Modal>
  );
}
