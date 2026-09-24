import { validEmail } from "./common";
import type { Company, Recipient } from "./types";

export function recipientOptions(c: Company) {
  return [
    { id: "company", name: c.name, email: c.email },
    ...c.contacts.map((p) => ({
      id: p.id,
      name: p.name || p.position || "Contact",
      email: p.email,
    })),
  ].filter((p) => validEmail(p.email));
}

export function cleanRecipients(c: Company, to: string, cc: string[]) {
  const opts = recipientOptions(c);
  const main = opts.find((p) => p.id === to);
  const seen = new Set(main ? [main.email.toLowerCase()] : []);
  return {
    to: main?.id || "",
    cc: cc.filter((id) => {
      const p = opts.find((p) => p.id === id);
      if (!p || seen.has(p.email.toLowerCase())) return false;
      seen.add(p.email.toLowerCase());
      return true;
    }),
  };
}

export function profileRecipients(
  c: Company,
  profileId = c.defaultProfileId,
): Recipient[] {
  const profile = c.profiles.find((p) => p.id === profileId);
  const ids = cleanRecipients(
    c,
    profile?.to || (c.email ? "company" : ""),
    profile?.cc || [],
  );
  return recipientOptions(c)
    .filter((p) => p.id === ids.to || ids.cc.includes(p.id))
    .map((p) => ({
      role: p.id === ids.to ? "To" : "CC",
      email: p.email,
      name: p.name,
    }));
}

export function validateCompany(c: Company) {
  if (!c.id || !c.name.trim()) throw Error("Company name is required.");
  for (const p of [c, ...c.contacts]) {
    if (p.email && !validEmail(p.email))
      throw Error("Enter a valid email address or leave it empty.");
    if (
      p.phone &&
      (!/^[+\d\s().-]+$/.test(p.phone) || p.phone.replace(/\D/g, "").length < 7)
    )
      throw Error("Enter a valid phone number or leave it empty.");
  }
  if (
    c.contacts.some(
      (p) => ![p.name, p.position, p.email, p.phone].some((s) => s.trim()),
    )
  )
    throw Error("Each contact needs a name, position, email or phone.");
  if (
    new Set(c.contacts.map((p) => p.id)).size !== c.contacts.length ||
    c.contacts.some((p) => !p.id || p.id === "company")
  )
    throw Error("Contact IDs must be unique.");
  if (
    new Set(c.profiles.map((p) => p.id)).size !== c.profiles.length ||
    new Set(c.profiles.map((p) => p.name.trim().toLowerCase())).size !==
      c.profiles.length
  )
    throw Error("Recipient profiles must have unique names.");
  if (
    c.profiles.some(
      (p) =>
        !p.id ||
        !p.name.trim() ||
        !cleanRecipients(c, p.to, p.cc).to ||
        cleanRecipients(c, p.to, p.cc).cc.length !== p.cc.length,
    )
  )
    throw Error(
      "Each profile needs a name, a valid main recipient, and unique CC recipients.",
    );
  if (
    c.defaultProfileId &&
    !c.profiles.some((p) => p.id === c.defaultProfileId)
  )
    throw Error("Select a valid default recipient profile.");
}
