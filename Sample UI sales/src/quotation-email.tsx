import { useSearchParams } from 'react-router-dom';
import { validEmail, canTransition } from './sales-logic';
import { useEffect, useState } from 'react';
import { Alert, Autocomplete, Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import DownloadRoundedIcon from '@mui/icons-material/DownloadRounded';
import MailOutlineRoundedIcon from '@mui/icons-material/MailOutlineRounded';
import type { Quote } from './App';
import { cleanRecipients, recipientOptions, useCustomers } from './customers';

type PdfModule = typeof import('./quotation-pdf');
type PreparedPdf = { file: File; download: PdfModule['downloadPdf'] };
async function preparePdf(q: Quote): Promise<PreparedPdf> {
  const pdf = await import('./quotation-pdf');
  return { file: new File([pdf.createQuotationPdf(q).output('blob')], pdf.quotationFilename(q.id), { type: 'application/pdf' }), download: pdf.downloadPdf };
}
export function buildQuotationMailto(to: string, cc: string[], subject: string, body: string) {
  const main = to.trim();
  const copies = [...new Set(cc.map(email => email.trim().toLowerCase()).filter(Boolean))].filter(email => email !== main.toLowerCase());
  if (!validEmail(main) || copies.some(email => !validEmail(email))) throw new Error('Enter a valid main recipient and valid CC email addresses.');
  if (!subject.trim() || /[\r\n]/.test(subject)) throw new Error('Enter a subject on a single line.');
  return `mailto:${encodeURIComponent(main)}?cc=${encodeURIComponent(copies.join(','))}&subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
export function QuotationPdfActions({ quotation, onSent }: { quotation: Quote; onSent: (recipients: NonNullable<Quote['recipients']>) => boolean }) {
  const [params, setParams] = useSearchParams();
  const [emailOpen, setEmailOpen] = useState(params.get('email') === '1');
  const closeEmail = () => { setEmailOpen(false); if (params.has('email')) { const next = new URLSearchParams(params); next.delete('email'); setParams(next, { replace: true }); } };
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const download = async () => {
    setBusy(true); setError(''); setNotice('');
    try { const pdf = await preparePdf(quotation); pdf.download(pdf.file); setNotice('PDF download started.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Unable to create PDF. Please try again.'); }
    finally { setBusy(false); }
  };
  return <Stack spacing={1} alignItems={{ sm: 'flex-end' }}><Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap><Button variant="outlined" startIcon={<DownloadRoundedIcon />} disabled={busy} onClick={download}>{busy ? 'Preparing PDF…' : 'Download PDF'}</Button><Button variant="contained" startIcon={<MailOutlineRoundedIcon />} onClick={() => setEmailOpen(true)}>Email PDF</Button></Stack>{error && <Alert severity="error">{error}</Alert>}{notice && <Typography variant="caption" role="status">{notice}</Typography>}{emailOpen && <QuotationEmailDialog quotation={quotation} onClose={closeEmail} onSent={onSent} />}</Stack>;
}
function QuotationEmailDialog({ quotation: q, onClose, onSent }: { quotation: Quote; onClose: () => void; onSent: (recipients: NonNullable<Quote['recipients']>) => boolean }) {
  const { companies } = useCustomers();
  const company = companies.find(c => c.id === q.customerId);
  const options = company ? recipientOptions(company) : [];
  const profile = company?.profiles.find(p => p.id === company.defaultProfileId);
  const defaults = profile && company ? cleanRecipients(company, profile.to, profile.cc) : undefined;
  const [profileId, setProfileId] = useState(q.recipients?.length ? '' : profile?.id || '');
  const [to, setTo] = useState(q.recipients?.length ? q.recipients.find(r => r.role === 'To')?.email || '' : options.find(o => o.id === defaults?.to)?.email || q.customerEmail || '');
  const [cc, setCc] = useState<string[]>(q.recipients?.length ? q.recipients.filter(r => r.role === 'CC').map(r => r.email) : options.filter(o => defaults?.cc.includes(o.id)).map(o => o.email));
  const [ccInput, setCcInput] = useState('');
  const [draftOpened, setDraftOpened] = useState(false);
  const [subject, setSubject] = useState(`GOELTA quotation ${q.id}`);
  const [body, setBody] = useState(`Dear ${q.customer},\n\nPlease find attached quotation ${q.id}, dated ${q.date}, for your review.\nThis quotation is valid until ${q.expiry}.\n\nKind regards,\nGOELTA`);
  const [pdf, setPdf] = useState<PreparedPdf | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [sharing, setSharing] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { let cancelled = false; setError(''); setPdf(null); preparePdf(q).then(result => { if (!cancelled) setPdf(result); }).catch(e => { if (!cancelled) setError(e instanceof Error ? e.message : 'Unable to create PDF.'); }); return () => { cancelled = true; }; }, [q, attempt]);
  let mailto = ''; let validation = '';
  try { mailto = buildQuotationMailto(to, cc, subject, body); } catch (e) { validation = (e as Error).message; }
  if (ccInput.trim()) validation = 'Press Enter to add the pending CC address, or clear it.';
  let canShare = false;
  try { canShare = !!pdf && typeof navigator !== 'undefined' && typeof navigator.canShare === 'function' && typeof navigator.share === 'function' && navigator.canShare({ files: [pdf.file] }); } catch { /* Download remains available when native sharing is blocked. */ }
  const chooseProfile = (id: string) => {
    setProfileId(id); setCcInput('');
    if (!company || !id) return;
    const p = company.profiles.find(p => p.id === id);
    const selected = cleanRecipients(company, p?.to || '', p?.cc || []);
    setTo(options.find(o => o.id === selected.to)?.email || '');
    setCc(options.filter(o => selected.cc.includes(o.id)).map(o => o.email));
  };
  const share = async () => {
    if (!pdf) return;
    setSharing(true); setError(''); setNotice('');
    try { await navigator.share({ files: [pdf.file], title: subject, text: body }); setDraftOpened(true); setNotice('PDF handed to the selected app. Review recipients and complete sending there.'); }
    catch (e) { if ((e as Error).name !== 'AbortError') setError('Sharing is unavailable. Use Download PDF & open email instead.'); }
    finally { setSharing(false); }
  };
  return <Dialog open fullWidth maxWidth="sm" onClose={sharing ? undefined : onClose}><DialogTitle>Email quotation PDF</DialogTitle><DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
    <Alert severity="info">Download the PDF and open an email draft with these recipients. Attach the downloaded PDF before sending.</Alert>
    {company && <TextField select label="Recipient profile" value={profileId} onChange={e => chooseProfile(e.target.value)}><MenuItem value="">Custom recipients</MenuItem>{company.profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name}{p.id === company.defaultProfileId ? ' (default)' : ''}</MenuItem>)}</TextField>}
    <Autocomplete freeSolo options={[...new Set(options.map(o => o.email))]} inputValue={to} value={to} onChange={(_, value) => { setTo(value || ''); setProfileId(''); }} onInputChange={(_, value, reason) => { if (reason === 'reset') return; setTo(value); setProfileId(''); setCc(copies => copies.filter(c => c.toLowerCase() !== value.trim().toLowerCase())); }} renderOption={(props, email) => <li {...props}>{options.find(o => o.email === email)?.label} — {email}</li>} renderInput={params => <TextField {...params} label="To" required />} />
    <Autocomplete multiple freeSolo inputValue={ccInput} onInputChange={(_, value) => setCcInput(value)} options={[...new Set(options.map(o => o.email))].filter(email => email.toLowerCase() !== to.trim().toLowerCase())} value={cc} onChange={(_, values) => { setCc([...new Set(values.map(v => v.trim().toLowerCase()))].filter(v => v !== to.trim().toLowerCase())); setProfileId(''); }} renderInput={params => <TextField {...params} label="CC" helperText="Select contacts or type an email and press Enter." />} />
    <TextField label="Subject" required value={subject} onChange={e => setSubject(e.target.value)} inputProps={{ maxLength: 150 }} />
    <TextField label="Message" multiline minRows={6} value={body} onChange={e => setBody(e.target.value)} inputProps={{ maxLength: 1500 }} />
    <Typography variant="body2" role="status">{pdf ? `PDF ready: ${pdf.file.name} (${Math.ceil(pdf.file.size / 1024)} KB)` : error ? 'PDF unavailable.' : 'Preparing PDF…'}</Typography>
    {validation && <Alert severity="warning">{validation}</Alert>}{error && <Alert severity="error" action={!pdf && <Button onClick={() => setAttempt(a => a + 1)}>Retry</Button>}>{error}</Alert>}{notice && <Alert severity="info">{notice}</Alert>}
    {canShare && <><Button variant="outlined" disabled={sharing || !!validation} onClick={share}>{sharing ? 'Sharing…' : 'Share PDF to an app'}</Button><Typography variant="caption" color="text.secondary">Choose an email app to share the attachment. The app may require you to enter To/CC and the message again.</Typography></>}
    <Typography variant="caption" color="text.secondary">Opening a draft does not confirm delivery. Mark it as sent only after you send it in your email app.</Typography>
  {draftOpened && canTransition(q.status, 'Sent') && <Button variant="outlined" disabled={!!validation || sharing} onClick={() => {
      const recipients: NonNullable<Quote['recipients']> = [{ role: 'To', email: to.trim() }, ...[...new Set(cc.map(email => email.trim().toLowerCase()))].filter(email => email && email !== to.trim().toLowerCase()).map(email => ({ role: 'CC' as const, email }))];
      if (onSent(recipients)) onClose(); else setError('Sent status could not be saved. Resolve the storage error and try again.');
    }}>I sent this email — mark as sent</Button>}
  </Stack></DialogContent><DialogActions sx={{ px: 3, pb: 2, flexWrap: 'wrap', gap: 1 }}><Button disabled={sharing} onClick={onClose}>Close</Button><Button component="a" href={pdf && !validation ? mailto : undefined} variant="contained" disabled={!pdf || !!validation || sharing} onClick={e => { if (!pdf || validation) { e.preventDefault(); return; } try { pdf.download(pdf.file); setDraftOpened(true); setNotice('Download started and an email draft was requested. Attach the PDF and send it in your email app.'); } catch { e.preventDefault(); setError('The PDF could not be downloaded. Please try again.'); } }}>Download PDF &amp; open email</Button></DialogActions></Dialog>;
}
