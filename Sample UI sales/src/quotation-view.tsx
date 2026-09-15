import { QuotationPdfActions } from './quotation-email';
import { Alert, Box, Breadcrumbs, Button, Chip, Divider, Grid, Menu, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import type { Quote } from './App';

const money = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
function Detail({ label, value }: { label: string; value?: string }) {
  return <Box><Typography variant="caption" color="text.secondary">{label}</Typography><Typography sx={{ overflowWrap: 'anywhere', whiteSpace: 'pre-line' }}>{value || 'Not recorded'}</Typography></Box>;
}
function Amount({ label, value, strong = false }: { label: string; value: number; strong?: boolean }) {
  return <Stack direction="row" justifyContent="space-between" spacing={2}><Typography fontWeight={strong ? 700 : 400}>{label}</Typography><Typography fontWeight={700} color={strong ? 'primary' : 'text.primary'}>{money(value)}</Typography></Stack>;
}
export function QuotationDetails({ quotation, onStatusChange }: { quotation?: Quote; onStatusChange: (id: string, status: Quote['status']) => void }) {
  if (!quotation) return <Box sx={{ p: { xs: 3, md: 5 } }}><Typography variant="h4" gutterBottom>Quotation not found</Typography><Typography color="text.secondary" sx={{ mb: 3 }}>This quotation is unavailable. Return to the list to choose an existing quotation.</Typography><Button component={Link} to="/sales/quotations" variant="contained">Back to quotations</Button></Box>;
  const q = quotation;
  const [statusMenuAnchor, setStatusMenuAnchor] = useState<null | HTMLElement>(null);
  const decisionDate = q.statusDate ? new Date(q.statusDate).toLocaleDateString() : '';
  const subtotal = q.lines?.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0);
  const taxAmount = subtotal === undefined || q.discount === undefined || q.taxRate === undefined ? undefined : Math.max(0, subtotal - q.discount) * q.taxRate / 100;
  const colors = { Draft: 'default', Sent: 'info', Accepted: 'success', Rejected: 'error', Hold: 'warning' } as const;
  return <Box sx={{ p: { xs: 3, md: 5 }, maxWidth: 1400 }}>
    <Breadcrumbs sx={{ mb: 3 }}><Link to="/sales/quotations">Quotations</Link><Typography>{q.id}</Typography></Breadcrumbs>
    <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2} sx={{ mb: 3 }}><Box><Typography variant="overline" color="primary">Quotation details</Typography><Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap"><Typography variant="h4" fontWeight={700}>{q.id}</Typography><Chip label={q.status} color={colors[q.status]} size="small" />{decisionDate && <Typography variant="body2" color="text.secondary">{q.status} on {decisionDate}</Typography>}<Button size="small" variant="outlined" onClick={event => setStatusMenuAnchor(event.currentTarget)}>Set status</Button><Menu anchorEl={statusMenuAnchor} open={!!statusMenuAnchor} onClose={() => setStatusMenuAnchor(null)}><MenuItem disabled={q.status === 'Accepted'} onClick={() => { onStatusChange(q.id, 'Accepted'); setStatusMenuAnchor(null); }}>Accepted</MenuItem><MenuItem disabled={q.status === 'Rejected'} onClick={() => { onStatusChange(q.id, 'Rejected'); setStatusMenuAnchor(null); }}>Rejected</MenuItem><MenuItem disabled={q.status === 'Hold'} onClick={() => { onStatusChange(q.id, 'Hold'); setStatusMenuAnchor(null); }}>Hold</MenuItem></Menu></Stack></Box><Button component={Link} to="/sales/quotations" variant="outlined" sx={{ alignSelf: 'flex-start' }}>Back to quotations</Button></Stack>
    <Box sx={{ mb: 3 }}><QuotationPdfActions key={q.id} quotation={q} onSent={() => onStatusChange(q.id, 'Sent')} /></Box>
    <Alert severity="info" sx={{ mb: 3 }}>Demo quotation. The item breakdown is sample data; email is prepared in your email app.</Alert>
    <Grid container spacing={3}>
      <Grid item xs={12} md={8}><Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h6" gutterBottom>Quotation information</Typography><Grid container spacing={2}><Grid item xs={12} sm={6}><Detail label="Quotation number" value={q.id} /></Grid><Grid item xs={12} sm={6}><Detail label="Status" value={q.status} /></Grid><Grid item xs={12} sm={6}><Detail label="Quotation date" value={q.date} /></Grid><Grid item xs={12} sm={6}><Detail label="Expiry date" value={q.expiry} /></Grid></Grid></Paper>
        <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h6" gutterBottom>Customer company</Typography><Stack spacing={2}><Detail label="Company" value={q.customer} /><Detail label="Address" value={q.customerAddress} /><Grid container spacing={2}><Grid item xs={12} sm={6}><Detail label="Main email" value={q.customerEmail} /></Grid><Grid item xs={12} sm={6}><Detail label="Main phone" value={q.customerPhone} /></Grid></Grid></Stack></Paper>
        <Paper variant="outlined" sx={{ overflow: 'hidden' }}><Typography variant="h6" sx={{ p: 3 }}>Items</Typography>{q.lines?.length ? <TableContainer><Table size="small" aria-label="Quotation items"><TableHead sx={{ bgcolor: 'grey.50' }}><TableRow><TableCell>Item</TableCell><TableCell>Description</TableCell><TableCell align="right">Quantity</TableCell><TableCell align="right">Unit price</TableCell><TableCell align="right">Amount</TableCell></TableRow></TableHead><TableBody>{q.lines.map((line, index) => <TableRow key={index}><TableCell>{index + 1}</TableCell><TableCell sx={{ minWidth: 200, py: 2 }}>{line.description}</TableCell><TableCell align="right">{line.quantity}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{money(line.unitPrice)}</TableCell><TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>{money(line.quantity * line.unitPrice)}</TableCell></TableRow>)}</TableBody></Table></TableContainer> : <Typography sx={{ px: 3, pb: 3 }} color="text.secondary">No item breakdown was recorded.</Typography>}</Paper>
      </Stack></Grid>
      <Grid item xs={12} md={4}><Stack spacing={3}>
        <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h6" gutterBottom>Totals</Typography><Stack spacing={2}>{subtotal !== undefined && <Amount label="Subtotal" value={subtotal} />}{q.discount !== undefined && <Amount label="Discount" value={q.discount} />}{taxAmount !== undefined && <Amount label={`Tax (${q.taxRate}%)`} value={taxAmount} />}<Divider /><Amount label="Total" value={q.total} strong /></Stack></Paper>
        <Paper variant="outlined" sx={{ p: 3 }}><Typography variant="h6" gutterBottom>Email recipients</Typography>{q.recipients?.length ? <Stack spacing={2}>{q.recipients.map((recipient, index) => <Detail key={index} label={recipient.role} value={[recipient.name, recipient.email].filter(Boolean).join(' — ')} />)}</Stack> : <Typography variant="body2" color="text.secondary">No recipients were recorded for this quotation.</Typography>}</Paper>
      </Stack></Grid>
    </Grid>
  </Box>;
}
