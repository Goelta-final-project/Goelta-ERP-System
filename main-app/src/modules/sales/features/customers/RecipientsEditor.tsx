import { useState } from "react";
import { Field } from "../../../../shared/ui/index";
import type { Company, Recipient } from "../../domain/types";
import { profileRecipients, recipientOptions } from "../../domain/workflow";

export function RecipientsEditor({
  company,
  recipients,
  onChange,
}: {
  company?: Company;
  recipients: Recipient[];
  onChange: (r: Recipient[]) => void;
}) {
  const [profile, setProfile] = useState("");
  const to = recipients.find((r) => r.role === "To")?.email || "";
  const cc = recipients
    .filter((r) => r.role === "CC")
    .map((r) => r.email)
    .join(", ");
  return (
    <div className="recipients-editor">
      <div className="form-grid compact">
        <Field label="Recipient profile">
          <select
            value={profile}
            onChange={(e) => {
              setProfile(e.target.value);
              if (company && e.target.value)
                onChange(profileRecipients(company, e.target.value));
            }}
          >
            <option value="">Custom recipients</option>
            {company?.profiles.map((p) => (
              <option value={p.id} key={p.id}>
                {p.name}
                {p.id === company.defaultProfileId ? " (default)" : ""}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Main recipient (To)">
          <input
            list="recipient-emails"
            type="email"
            value={to}
            onChange={(e) => {
              setProfile("");
              onChange([
                ...(e.target.value
                  ? [{ role: "To" as const, email: e.target.value }]
                  : []),
                ...recipients.filter((r) => r.role === "CC"),
              ]);
            }}
          />
          <datalist id="recipient-emails">
            {company &&
              recipientOptions(company).map((o) => (
                <option key={o.id} value={o.email}>
                  {o.name}
                </option>
              ))}
          </datalist>
        </Field>
      </div>
      <Field
        label="CC recipients"
        hint="Separate addresses with commas. Changes apply only to this quotation."
      >
        <input
          value={cc}
          onChange={(e) => {
            setProfile("");
            onChange([
              ...recipients.filter((r) => r.role === "To"),
              ...e.target.value.split(",").map((email) => ({
                role: "CC" as const,
                email: email.trimStart(),
              })),
            ]);
          }}
        />
      </Field>
    </div>
  );
}
