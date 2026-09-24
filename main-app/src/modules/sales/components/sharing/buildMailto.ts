import { validEmail } from "../../domain/workflow";

export function buildMailto(
  to: string,
  cc: string[],
  subject: string,
  body: string,
) {
  const main = to.trim();
  const copies = [
    ...new Set(cc.map((s) => s.trim().toLowerCase()).filter(Boolean)),
  ].filter((s) => s !== main.toLowerCase());
  if (!validEmail(main) || copies.some((s) => !validEmail(s)))
    throw Error("Enter valid To and CC email addresses.");
  if (!subject.trim() || /[\r\n]/.test(subject))
    throw Error("Enter a subject on a single line.");
  return `mailto:${encodeURIComponent(main)}?cc=${encodeURIComponent(copies.join(","))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
