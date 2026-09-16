import { usePersistentState } from './use-persistent-state';
import { isRecord, validEmail } from './sales-logic';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { Alert, Box, Button, Checkbox, Chip, Collapse, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography, Paper } from '@mui/material';

export type Contact = { id: string; name: string; position: string; email: string; phone: string };
export type Profile = { id: string; name: string; to: string; cc: string[] };
export type Subcontract = { id: string; name: string };
export type Company = { id: string; name: string; email: string; phone: string; address: string; city: string; status: 'Active' | 'Inactive'; contacts: Contact[]; profiles: Profile[]; defaultProfileId: string; subcontracts?: Subcontract[] };
const storageKey = 'goelta.customer-companies.v1';
const seed: Company[] = [
  { id: '1', name: 'Asteria Construction Ltd', email: 'procurement@asteria.example', phone: '+94 11 555 0100', city: 'Colombo', status: 'Active' },
  { id: '2', name: 'Cedar & Co. Holdings', email: 'hello@cedar.example', phone: '+94 77 555 0182', city: 'Kandy', status: 'Active' },
  { id: '3', name: 'Bluehaven Hospitality', email: 'finance@bluehaven.example', phone: '+94 71 555 0124', city: 'Galle', status: 'Inactive' },
].map(c => ({ ...c, status: c.status as Company['status'], address: '', contacts: [], profiles: [], defaultProfileId: '' }));
const Context = createContext<{ companies: Company[]; save: (company: Company) => boolean }>({ companies: [], save: () => false });
export const useCustomers = () => useContext(Context);
export function validCompanies(value: unknown): value is Company[] {
  if (!Array.isArray(value)) return false;
  if (!value.every(c => {
    if (!isRecord(c) || !['id','name','email','phone','address','city','defaultProfileId'].every(k => typeof c[k] === 'string') || !String(c.id) || !String(c.name).trim() || !['Active','Inactive'].includes(String(c.status)) || !Array.isArray(c.contacts) || !Array.isArray(c.profiles)) return false;
      if (c.subcontracts !== undefined && (!Array.isArray(c.subcontracts) || !c.subcontracts.every(s => isRecord(s) && typeof s.id === 'string' && !!s.id && s.id !== 'company' && typeof s.name === 'string' && !!s.name.trim()) || new Set(c.subcontracts.map(s => s.id)).size !== c.subcontracts.length || new Set(c.subcontracts.map(s => s.name.trim().toLowerCase())).size !== c.subcontracts.length)) return false;
    if (c.email && !validEmail(String(c.email))) return false;
    if (!c.contacts.every(p => isRecord(p) && ['id','name','position','email','phone'].every(k => typeof p[k] === 'string') && p.id && p.id !== 'company' && (!p.email || validEmail(String(p.email))))) return false;
    if (new Set(c.contacts.map(p => p.id)).size !== c.contacts.length) return false;
    if (!c.profiles.every(p => isRecord(p) && typeof p.id === 'string' && p.id && typeof p.name === 'string' && p.name.trim() && typeof p.to === 'string' && Array.isArray(p.cc) && p.cc.every(id => typeof id === 'string'))) return false;
    if (new Set(c.profiles.map(p => p.id)).size !== c.profiles.length || new Set(c.profiles.map(p => p.name.trim().toLowerCase())).size !== c.profiles.length) return false;
    if (c.defaultProfileId && !c.profiles.some(p => p.id === c.defaultProfileId)) return false;
    return c.profiles.every(p => { const cleaned = cleanRecipients(c as unknown as Company, p.to, p.cc); return !!cleaned.to && cleaned.cc.length === p.cc.length; });
  })) return false;
  return new Set(value.map(c => c.id)).size === value.length;
}
export function CustomerProvider({ children }: { children: ReactNode }) {
  const { value: companies, commit, error } = usePersistentState(storageKey, seed, validCompanies);
  const save = (company: Company) => commit(current => current.some(c => c.id === company.id) ? current.map(c => c.id === company.id ? company : c) : [...current, company]);
  return <Context.Provider value={{ companies, save }}>{error && <Alert severity="error">{error}</Alert>}{children}</Context.Provider>;
}
const uid = () => crypto.randomUUID();
const emptyCompany = (): Company => ({ id: uid(), name: '', email: '', phone: '', address: '', city: '', status: 'Active', contacts: [], profiles: [], defaultProfileId: '', subcontracts: [] });
const emailValid = (v: string) => !v || validEmail(v);
const phoneValid = (v: string) => !v || (/^[+\d\s().-]+$/.test(v) && v.replace(/\D/g, '').length >= 7);
export function recipientOptions(company: Company) {
  const options = [{ id: 'company', label: 'Company main email', email: company.email }, ...company.contacts.map(c => ({ id: c.id, label: [c.name, c.position].filter(Boolean).join(' · ') || 'Contact', email: c.email }))];
  return options.filter(o => o.email && emailValid(o.email));
}
export function cleanRecipients(company: Company, to: string, cc: string[]) {
  const options = recipientOptions(company);
  const validTo = options.some(o => o.id === to) ? to : '';
  const used = new Set(options.filter(o => o.id === validTo).map(o => o.email.toLowerCase()));
  return { to: validTo, cc: cc.filter(id => { const o = options.find(o => o.id === id); if (!o || used.has(o.email.toLowerCase())) return false; used.add(o.email.toLowerCase()); return true; }) };
}
function Recipients({ company, to, cc, onChange }: { company: Company; to: string; cc: string[]; onChange: (v: { to: string; cc: string[] }) => void }) {
  const options = recipientOptions(company);
  return <Stack spacing={2}>
    {!options.length && <Alert severity="info">Add a company or contact email to select quotation recipients.</Alert>}
    <FormControl fullWidth><InputLabel>Main recipient (To)</InputLabel><Select label="Main recipient (To)" value={to} onChange={e => onChange(cleanRecipients(company, e.target.value, cc))}><MenuItem value="">Select recipient</MenuItem>{options.map(o => <MenuItem key={o.id} value={o.id}>{o.label} — {o.email}</MenuItem>)}</Select></FormControl>
    <FormControl fullWidth><InputLabel>CC recipients</InputLabel><Select multiple label="CC recipients" value={cc} renderValue={ids => ids.map(id => options.find(o => o.id === id)?.email).join(', ')} onChange={e => onChange(cleanRecipients(company, to, typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value))}>{options.map(o => <MenuItem key={o.id} value={o.id} disabled={options.find(v => v.id === to)?.email.toLowerCase() === o.email.toLowerCase()}><Checkbox checked={cc.includes(o.id)} />{o.label} — {o.email}</MenuItem>)}</Select></FormControl>
  </Stack>;
}
export function Customers() {
  const { companies, save } = useCustomers();
  const [search, setSearch] = useState('');
  const [editing, setEditing] = useState<Company | null>(null);
  const [confirm, setConfirm] = useState<Company | null>(null);
  const [notice, setNotice] = useState('');
  return <Box sx={{ p: { xs: 3, md: 5 } }}><Stack direction="row" justifyContent="space-between" spacing={2} sx={{ mb: 3 }}><Box><Typography variant="overline" color="primary">Sales workspace</Typography><Typography variant="h4">Customer companies</Typography><Typography color="text.secondary">Manage company details, contacts and quotation recipient profiles.</Typography></Box><Button variant="contained" onClick={() => setEditing(emptyCompany())}>Add company</Button></Stack>
    {notice && <Alert severity="success" onClose={() => setNotice('')} sx={{ mb: 2 }}>{notice}</Alert>}
    <Paper variant="outlined"><Box sx={{ p: 2 }}><TextField fullWidth size="small" placeholder="Search company, subcontract, contact, email or phone" value={search} onChange={e => setSearch(e.target.value)} /></Box><TableContainer><Table><TableHead><TableRow>{['Company', 'Main contact details', 'Contacts / profiles', 'Status', 'Actions'].map(v => <TableCell key={v}>{v}</TableCell>)}</TableRow></TableHead><TableBody>{companies.filter(c => [c.name, c.email, c.phone, ...(c.subcontracts || []).map(s => s.name), ...c.contacts.flatMap(p => [p.name, p.position, p.email, p.phone])].join(' ').toLowerCase().includes(search.toLowerCase())).map(c => <TableRow key={c.id}><TableCell><Typography fontWeight={700}>{c.name}</Typography>{(c.subcontracts || []).map(subcontract => <Typography key={subcontract.id} variant="body2" color="text.secondary">{subcontract.name}</Typography>)}<Typography variant="body2">{[c.address, c.city].filter(Boolean).join(', ')}</Typography></TableCell><TableCell>{c.email || 'No main email'}<br />{c.phone}</TableCell><TableCell>{c.contacts.length} contacts · {c.profiles.length} profiles</TableCell><TableCell><Chip size="small" label={c.status} /></TableCell><TableCell><Button onClick={() => setEditing(structuredClone(c))}>Manage</Button><Button color={c.status === 'Active' ? 'error' : 'primary'} onClick={() => setConfirm(c)}>{c.status === 'Active' ? 'Deactivate' : 'Activate'}</Button></TableCell></TableRow>)}</TableBody></Table></TableContainer></Paper>
    <Typography variant="caption" color="text.secondary">Customer data is saved in this browser.</Typography>
    {editing && <CompanyEditor initial={editing} onClose={() => setEditing(null)} onSave={c => { if (save(c)) { setEditing(null); setNotice('Company, contacts, subcontracts and recipient profiles saved.'); } }} />}
    <Dialog open={!!confirm} onClose={() => setConfirm(null)}><DialogTitle>{confirm?.status === 'Active' ? 'Deactivate' : 'Activate'} {confirm?.name}?</DialogTitle><DialogContent>Inactive companies cannot be selected for new quotations. Company details and contacts are retained.</DialogContent><DialogActions><Button onClick={() => setConfirm(null)}>Cancel</Button><Button onClick={() => { if (confirm && save({ ...confirm, status: confirm.status === 'Active' ? 'Inactive' : 'Active' })) setConfirm(null); }}>Confirm</Button></DialogActions></Dialog>
  </Box>;
}
function CompanyEditor({ initial, onClose, onSave }: { initial: Company; onClose: () => void; onSave: (c: Company) => void }) {
  const [company, setCompany] = useState(initial);
  const [error, setError] = useState('');
  const [removeProfile, setRemoveProfile] = useState<string | null>(null);
  const [removeContact, setRemoveContact] = useState<string | null>(null);
    const [subcontractName, setSubcontractName] = useState('');
    const [subcontractError, setSubcontractError] = useState('');
  const update = (key: keyof Company, value: unknown) => setCompany(c => ({ ...c, [key]: value }));
  const [contactDraft, setContactDraft] = useState<Contact | null>(null);
  const [contactError, setContactError] = useState('');
  const openContact = (contact: Contact) => { setContactDraft({ ...contact }); setContactError(''); };
  const saveContact = () => {
    if (!contactDraft) return;
    const contact = { ...contactDraft, name: contactDraft.name.trim(), position: contactDraft.position.trim(), email: contactDraft.email.trim(), phone: contactDraft.phone.trim() };
    if (!contact.name && !contact.position && !contact.email && !contact.phone) return setContactError('Add a position, name, email or phone. Names are optional.');
    if (!emailValid(contact.email) || !phoneValid(contact.phone)) return setContactError('Enter a valid email and phone, or leave them empty.');
    update('contacts', company.contacts.some(c => c.id === contact.id) ? company.contacts.map(c => c.id === contact.id ? contact : c) : [...company.contacts, contact]);
    setContactDraft(null);
    setContactError('');
  };
  const profileChange = (id: string, patch: Partial<Profile>) => update('profiles', company.profiles.map(p => p.id === id ? { ...p, ...patch } : p));
    const addSubcontract = () => {
      const name = subcontractName.trim();
      if (!name) return setSubcontractError('Enter a subcontract name.');
      if ((company.subcontracts || []).some(s => s.name.toLowerCase() === name.toLowerCase())) return setSubcontractError('That subcontract already exists.');
      update('subcontracts', [...(company.subcontracts || []), { id: uid(), name }]);
      setSubcontractName('');
      setSubcontractError('');
    };
  const submit = () => {
    const cleaned = { ...company, name: company.name.trim(), email: company.email.trim(), phone: company.phone.trim(), contacts: company.contacts.map(c => ({ ...c, name: c.name.trim(), position: c.position.trim(), email: c.email.trim(), phone: c.phone.trim() })), subcontracts: (company.subcontracts || []).map(s => ({ ...s, name: s.name.trim() })) };
    if (!cleaned.name) return setError('Company name is required.');
    if (![cleaned, ...cleaned.contacts].every(c => emailValid(c.email) && phoneValid(c.phone))) return setError('Enter valid email addresses and phone numbers, or leave them empty.');
    if (cleaned.contacts.some(c => !c.name && !c.position && !c.email && !c.phone)) return setError('Each contact needs a position, name, email or phone. Names are optional.');
      if (cleaned.subcontracts.some(s => !s.name) || new Set(cleaned.subcontracts.map(s => s.name.toLowerCase())).size !== cleaned.subcontracts.length) return setError('Subcontract names must be unique and cannot be empty.');
    if (cleaned.profiles.some(p => !p.name.trim() || !cleanRecipients(cleaned, p.to, p.cc).to)) return setError('Each recipient profile needs a name and a main recipient with an email.');
    if (new Set(cleaned.profiles.map(p => p.name.trim().toLowerCase())).size !== cleaned.profiles.length) return setError('Use a different name for each recipient profile.');
    onSave({ ...cleaned, profiles: cleaned.profiles.map(p => ({ ...p, name: p.name.trim(), ...cleanRecipients(cleaned, p.to, p.cc) })) });
  };
  return <Dialog open fullWidth maxWidth="md" onClose={onClose}><DialogTitle>Manage customer company</DialogTitle><DialogContent><Stack spacing={3} sx={{ pt: 1 }}>
    {error && <Alert severity="error">{error}</Alert>}
    <Typography variant="h6">Company details</Typography><TextField label="Company name" required value={company.name} onChange={e => update('name', e.target.value)} />
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>{(['email', 'phone'] as const).map(key => <TextField fullWidth key={key} label={`Main ${key} (optional)`} value={company[key]} onChange={e => update(key, e.target.value)} />)}</Stack>
    <TextField label="Address (optional)" multiline value={company.address} onChange={e => update('address', e.target.value)} /><TextField label="City (optional)" value={company.city} onChange={e => update('city', e.target.value)} />
    <Box><Typography variant="h6">Company contacts</Typography><Typography color="text.secondary">Names are optional. Add a position, email or phone to identify a contact.</Typography></Box>
    <Paper variant="outlined">
      {company.contacts.length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No contacts yet.</Typography>}
      {company.contacts.map(c => <Stack key={c.id} direction={{ xs: 'column', sm: 'row' }} spacing={1} alignItems={{ sm: 'center' }} sx={{ px: 2, py: 1.25, '& + &': { borderTop: '1px solid', borderColor: 'divider' } }}>
        <Box sx={{ flex: 1, minWidth: 0 }}><Typography fontWeight={600}>{c.name || c.position || c.email || c.phone}</Typography>
          {c.name && c.position && <Typography variant="body2" color="text.secondary">{c.position}</Typography>}
          <Typography variant="body2" color="text.secondary" sx={{ overflowWrap: 'anywhere' }}>{[c.email, c.phone].filter(Boolean).join(' · ') || 'No email or phone'}</Typography>
        </Box>
        <Stack direction="row"><Button size="small" disabled={!!contactDraft} onClick={() => openContact(c)}>Edit</Button><Button size="small" color="error" disabled={!!contactDraft} onClick={() => setRemoveContact(c.id)}>Remove</Button></Stack>
      </Stack>)}
    </Paper>
    <Button variant="outlined" disabled={!!contactDraft} aria-expanded={!!contactDraft} aria-controls="contact-inline-editor" onClick={() => openContact({ id: uid(), name: '', position: '', email: '', phone: '' })}>Add contact</Button>
    <Collapse in={!!contactDraft} unmountOnExit>
      {contactDraft && <Paper id="contact-inline-editor" variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}><Stack spacing={2}>
        <Typography variant="subtitle1" fontWeight={700}>{company.contacts.some(c => c.id === contactDraft.id) ? 'Edit contact' : 'Add contact'}</Typography>
        {contactError && <Alert severity="error">{contactError}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth autoFocus label="Name (optional)" value={contactDraft.name} onChange={e => setContactDraft({ ...contactDraft, name: e.target.value })} />
          <TextField fullWidth label="Position" placeholder="Procurement Manager, Engineer, BA…" value={contactDraft.position} onChange={e => setContactDraft({ ...contactDraft, position: e.target.value })} />
        </Stack>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField fullWidth label="Email (optional)" value={contactDraft.email} onChange={e => setContactDraft({ ...contactDraft, email: e.target.value })} />
          <TextField fullWidth label="Phone (optional)" value={contactDraft.phone} onChange={e => setContactDraft({ ...contactDraft, phone: e.target.value })} />
        </Stack>
        <Stack direction="row" spacing={1}><Button variant="contained" onClick={saveContact}>Done</Button><Button onClick={() => { setContactDraft(null); setContactError(''); }}>Cancel</Button></Stack>
        <Typography variant="caption" color="text.secondary">Click Done to update the list, then Save company to save your changes.</Typography>
      </Stack></Paper>}
    </Collapse>
    <Box><Typography variant="h6">Subcontracts</Typography><Typography color="text.secondary">Add any subcontract or project division that should be selected with this customer.</Typography></Box>
    <Paper variant="outlined">
      {(company.subcontracts || []).length === 0 && <Typography color="text.secondary" sx={{ p: 2 }}>No subcontracts yet.</Typography>}
      {(company.subcontracts || []).map(subcontract => <Stack key={subcontract.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ px: 2, py: 1.25, '& + &': { borderTop: '1px solid', borderColor: 'divider' } }}><Typography>{subcontract.name}</Typography><Button size="small" color="error" onClick={() => update('subcontracts', (company.subcontracts || []).filter(item => item.id !== subcontract.id))}>Remove</Button></Stack>)}
    </Paper>
    {subcontractError && <Alert severity="error">{subcontractError}</Alert>}
    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}><TextField fullWidth label="Subcontract name" value={subcontractName} onChange={e => setSubcontractName(e.target.value)} /><Button variant="outlined" onClick={addSubcontract}>Add subcontract</Button></Stack>
    <Box><Typography variant="h6">Recipient profiles</Typography><Typography color="text.secondary">Save a main recipient and CC list. Set a default to automatically fill new quotations.</Typography></Box>
    <FormControl fullWidth><InputLabel>Default profile</InputLabel><Select label="Default profile" value={company.defaultProfileId} onChange={e => update('defaultProfileId', e.target.value)}><MenuItem value="">No default</MenuItem>{company.profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name || 'Unnamed profile'}</MenuItem>)}</Select></FormControl>
    {company.profiles.map(p => <Paper variant="outlined" sx={{ p: 2 }} key={p.id}><Stack spacing={2}><TextField label="Profile name" required value={p.name} onChange={e => profileChange(p.id, { name: e.target.value })} /><Recipients company={company} {...cleanRecipients(company, p.to, p.cc)} onChange={v => profileChange(p.id, v)} /><Button color="error" onClick={() => setRemoveProfile(p.id)}>Delete profile</Button></Stack></Paper>)}
    <Button variant="outlined" onClick={() => update('profiles', [...company.profiles, { id: uid(), name: '', to: '', cc: [] }])}>Add recipient profile</Button>
  </Stack></DialogContent><DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={!!contactDraft} onClick={submit}>Save company</Button></DialogActions>
    <Dialog open={!!removeContact} onClose={() => setRemoveContact(null)}><DialogTitle>Remove company contact?</DialogTitle><DialogContent>The contact will also be removed from recipient profiles. Choose a replacement for any profile where they are the main recipient before saving.</DialogContent><DialogActions><Button onClick={() => setRemoveContact(null)}>Cancel</Button><Button color="error" onClick={() => { setCompany(c => ({ ...c, contacts: c.contacts.filter(p => p.id !== removeContact), profiles: c.profiles.map(p => ({ ...p, to: p.to === removeContact ? '' : p.to, cc: p.cc.filter(id => id !== removeContact) })) })); setRemoveContact(null); }}>Remove</Button></DialogActions></Dialog>
    <Dialog open={!!removeProfile} onClose={() => setRemoveProfile(null)}><DialogTitle>Delete recipient profile?</DialogTitle><DialogContent>This removes the profile when you save the company.</DialogContent><DialogActions><Button onClick={() => setRemoveProfile(null)}>Cancel</Button><Button color="error" onClick={() => { setCompany(c => ({ ...c, profiles: c.profiles.filter(p => p.id !== removeProfile), defaultProfileId: c.defaultProfileId === removeProfile ? '' : c.defaultProfileId })); setRemoveProfile(null); }}>Delete</Button></DialogActions></Dialog>
  </Dialog>;
}
export function QuotationRecipients({ companyId, onChange, savedRecipients }: { companyId: string; onChange?: (value: { to: string; cc: string[] }) => void; savedRecipients?: { role: 'To' | 'CC'; email: string }[] }) {
  const { companies } = useCustomers();
  const company = companies.find(c => c.id === companyId && c.status === 'Active');
  const initial = company?.profiles.find(p => p.id === company.defaultProfileId);
  const options = company ? recipientOptions(company) : [];
  const recipientId = (email: string) => options.find(option => option.email.toLowerCase() === email.toLowerCase())?.id || '';
  const [profileId, setProfileId] = useState(savedRecipients ? '' : initial?.id || '');
  const [recipients, setRecipients] = useState(() => savedRecipients ? { to: recipientId(savedRecipients.find(r => r.role === 'To')?.email || ''), cc: savedRecipients.filter(r => r.role === 'CC').map(r => recipientId(r.email)).filter(Boolean) } : { to: initial?.to || '', cc: initial?.cc || [] });
  useEffect(() => {
    onChange?.(company ? cleanRecipients(company, recipients.to, recipients.cc) : { to: '', cc: [] });
  }, [company, recipients, onChange]);
  if (!company) return <Alert severity="info" sx={{ mt: 3 }}>Select a customer company to choose quotation recipients.</Alert>;
  return <Stack spacing={2} sx={{ mt: 3 }}><FormControl fullWidth><InputLabel>Recipient profile</InputLabel><Select label="Recipient profile" value={profileId} onChange={e => { setProfileId(e.target.value); const p = company.profiles.find(p => p.id === e.target.value); const next = cleanRecipients(company, p?.to || '', p?.cc || []); setRecipients(next); }}><MenuItem value="">Custom recipients</MenuItem>{company.profiles.map(p => <MenuItem key={p.id} value={p.id}>{p.name}{p.id === company.defaultProfileId ? ' (default)' : ''}</MenuItem>)}</Select></FormControl><Recipients company={company} {...cleanRecipients(company, recipients.to, recipients.cc)} onChange={v => { setRecipients(v); setProfileId(''); }} /><Typography variant="caption" color="text.secondary">Changes here apply only to this quotation. Saved profiles stay unchanged.</Typography></Stack>;
}
