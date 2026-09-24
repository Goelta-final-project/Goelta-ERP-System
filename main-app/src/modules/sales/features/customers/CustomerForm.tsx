import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Badge,
  Button,
  Field,
  Icon,
  PageHeader,
  Tabs,
} from "../../../../shared/ui/index";
import { useWorkspace } from "../../data/WorkspaceProvider";
import type { Company } from "../../domain/types";
import {
  cleanRecipients,
  recipientOptions,
  uid,
  validateCompany,
} from "../../domain/workflow";

export function CustomerForm({ initial }: { initial?: Company }) {
  const { state, transact } = useWorkspace();
  const navigate = useNavigate();
  const [company, setCompany] = useState<Company>(() =>
    structuredClone(
      initial || {
        id: uid(),
        name: "",
        email: "",
        phone: "",
        address: "",
        city: "",
        status: "Active",
        contacts: [],
        profiles: [],
        defaultProfileId: "",
      },
    ),
  );
  const [tab, setTab] = useState("contacts");
  const [error, setError] = useState("");
  const update = (patch: Partial<Company>) =>
    setCompany((c) => ({ ...c, ...patch }));
  const save = () => {
    try {
      const cleaned = {
        ...company,
        name: company.name.trim(),
        email: company.email.trim(),
        phone: company.phone.trim(),
        profiles: company.profiles.map((p) => ({ ...p, name: p.name.trim() })),
      };
      validateCompany(cleaned);
      if (
        transact((s) => {
          s.companies = s.companies.some((c) => c.id === cleaned.id)
            ? s.companies.map((c) => (c.id === cleaned.id ? cleaned : c))
            : [...s.companies, cleaned];
        }, "Customer saved")
      )
        navigate("/sales/customers");
    } catch (e) {
      setError((e as Error).message);
    }
  };
  return (
    <>
      <PageHeader
        title={initial?.name || "New customer"}
        crumbs={[{ label: "Customers", to: "/sales/customers" }]}
        actions={
          <>
            <Button variant="primary" icon="check" onClick={save}>
              Save
            </Button>
            <Link className="btn secondary" to="/sales/customers">
              Discard
            </Link>
          </>
        }
      />
      {error && (
        <div className="alert error" role="alert">
          {error}
        </div>
      )}
      <div className="record-sheet customer-sheet">
        <div className="customer-heading">
          <div className="company-avatar large">
            {company.name.slice(0, 2).toUpperCase() || (
              <Icon name="users" size={32} />
            )}
          </div>
          <div>
            <span className="eyebrow">Company</span>
            <input
              className="title-input"
              aria-label="Company name"
              placeholder="Company name"
              value={company.name}
              onChange={(e) => update({ name: e.target.value })}
            />
            <Badge status={company.status} />
          </div>
          <div className="customer-smart">
            <Link to={`/sales/quotations?customer=${company.id}`}>
              <strong>
                {state.sales.filter((s) => s.customerId === company.id).length}
              </strong>{" "}
              Sales documents <Icon name="chevron" size={14} />
            </Link>
          </div>
        </div>
        <div className="form-grid">
          <Field label="Email">
            <input
              type="email"
              value={company.email}
              onChange={(e) => update({ email: e.target.value })}
            />
          </Field>
          <Field label="Phone">
            <input
              type="tel"
              value={company.phone}
              onChange={(e) => update({ phone: e.target.value })}
            />
          </Field>
          <Field label="Address">
            <textarea
              rows={2}
              value={company.address}
              onChange={(e) => update({ address: e.target.value })}
            />
          </Field>
          <div className="field-stack">
            <Field label="City">
              <input
                value={company.city}
                onChange={(e) => update({ city: e.target.value })}
              />
            </Field>
            <Field
              label="Status"
              hint="Inactive customers cannot be used for new quotations."
            >
              <select
                value={company.status}
                onChange={(e) =>
                  update({ status: e.target.value as Company["status"] })
                }
              >
                <option>Active</option>
                <option>Inactive</option>
              </select>
            </Field>
          </div>
        </div>
        <Tabs
          tabs={[
            {
              id: "contacts",
              label: "Contacts",
              count: company.contacts.length,
            },
            {
              id: "profiles",
              label: "Quotation recipients",
              count: company.profiles.length,
            },
          ]}
          value={tab}
          onChange={setTab}
        />
        <div className="tab-panel">
          {tab === "contacts" ? (
            <>
              <div className="panel-heading">
                <div>
                  <h3>Company contacts</h3>
                  <p>
                    Names are optional. A position, email or phone can identify
                    a contact.
                  </p>
                </div>
                <Button
                  icon="plus"
                  onClick={() =>
                    update({
                      contacts: [
                        ...company.contacts,
                        {
                          id: uid(),
                          name: "",
                          position: "",
                          email: "",
                          phone: "",
                        },
                      ],
                    })
                  }
                >
                  Add contact
                </Button>
              </div>
              {!company.contacts.length && (
                <div className="subtle-empty">
                  No contacts yet. Add the people you work with at this company.
                </div>
              )}
              {company.contacts.map((p, idx) => (
                <div className="contact-editor" key={p.id}>
                  <div className="contact-editor-head">
                    <span>Contact {idx + 1}</span>
                    <Button
                      variant="ghost"
                      icon="trash"
                      onClick={() =>
                        update({
                          contacts: company.contacts.filter(
                            (c) => c.id !== p.id,
                          ),
                          profiles: company.profiles.map((r) => ({
                            ...r,
                            to: r.to === p.id ? "" : r.to,
                            cc: r.cc.filter((id) => id !== p.id),
                          })),
                        })
                      }
                    >
                      Remove
                    </Button>
                  </div>
                  <div className="form-grid compact">
                    {(["name", "position", "email", "phone"] as const).map(
                      (key) => (
                        <Field
                          key={key}
                          label={
                            key === "name"
                              ? "Name (optional)"
                              : key[0].toUpperCase() + key.slice(1)
                          }
                        >
                          <input
                            value={p[key]}
                            type={key === "email" ? "email" : "text"}
                            onChange={(e) =>
                              update({
                                contacts: company.contacts.map((c) =>
                                  c.id === p.id
                                    ? { ...c, [key]: e.target.value }
                                    : c,
                                ),
                              })
                            }
                          />
                        </Field>
                      ),
                    )}
                  </div>
                </div>
              ))}
            </>
          ) : (
            <>
              <div className="panel-heading">
                <div>
                  <h3>Recipient profiles</h3>
                  <p>Save a main recipient and CC list for your quotations.</p>
                </div>
                <Button
                  icon="plus"
                  onClick={() =>
                    update({
                      profiles: [
                        ...company.profiles,
                        { id: uid(), name: "", to: "", cc: [] },
                      ],
                    })
                  }
                >
                  Add profile
                </Button>
              </div>
              <Field label="Default profile">
                <select
                  value={company.defaultProfileId}
                  onChange={(e) => update({ defaultProfileId: e.target.value })}
                >
                  <option value="">No default profile</option>
                  {company.profiles.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name || "Unnamed profile"}
                    </option>
                  ))}
                </select>
              </Field>
              {company.profiles.map((p) => {
                const opts = recipientOptions(company);
                const patch = (v: Partial<typeof p>) =>
                  update({
                    profiles: company.profiles.map((r) =>
                      r.id === p.id ? { ...r, ...v } : r,
                    ),
                  });
                return (
                  <div className="contact-editor" key={p.id}>
                    <div className="contact-editor-head">
                      <strong>{p.name || "New profile"}</strong>
                      <Button
                        variant="ghost"
                        icon="trash"
                        onClick={() =>
                          update({
                            profiles: company.profiles.filter(
                              (r) => r.id !== p.id,
                            ),
                            defaultProfileId:
                              company.defaultProfileId === p.id
                                ? ""
                                : company.defaultProfileId,
                          })
                        }
                      >
                        Remove
                      </Button>
                    </div>
                    <div className="form-grid compact">
                      <Field label="Profile name" required>
                        <input
                          value={p.name}
                          onChange={(e) => patch({ name: e.target.value })}
                        />
                      </Field>
                      <Field label="Main recipient (To)" required>
                        <select
                          value={p.to}
                          onChange={(e) =>
                            patch(
                              cleanRecipients(company, e.target.value, p.cc),
                            )
                          }
                        >
                          <option value="">Select a recipient</option>
                          {opts.map((o) => (
                            <option key={o.id} value={o.id}>
                              {o.name} · {o.email}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                    <div className="cc-options">
                      <span>CC recipients</span>
                      {opts.map((o) => (
                        <label key={o.id}>
                          <input
                            type="checkbox"
                            checked={p.cc.includes(o.id)}
                            disabled={
                              opts
                                .find((r) => r.id === p.to)
                                ?.email.toLowerCase() === o.email.toLowerCase()
                            }
                            onChange={(e) =>
                              patch(
                                cleanRecipients(
                                  company,
                                  p.to,
                                  e.target.checked
                                    ? [...p.cc, o.id]
                                    : p.cc.filter((id) => id !== o.id),
                                ),
                              )
                            }
                          />
                          {o.name}
                          <small>{o.email}</small>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>
    </>
  );
}
