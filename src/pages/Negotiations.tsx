// Negotiations Page - RFQ listing + creation + negotiation sessions
import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { negotiationService } from '@/services/negotiationService';
import { supabase } from '@/integrations/supabase/client';
import type { RFQ, Negotiation } from '@/domain/negotiation.models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, FileText, Handshake, Clock, CheckCircle, XCircle, ArrowRight } from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-info/10 text-info border-info/20',
  negotiating: 'bg-warning/10 text-warning border-warning/20',
  accepted: 'bg-success/10 text-success border-success/20',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  offer_made: 'bg-warning/10 text-warning border-warning/20',
  counter_offered: 'bg-accent text-accent-foreground border-border',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

const Negotiations = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.companyId;

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [form, setForm] = useState({
    sellerCompanyId: '',
    productName: '',
    productDescription: '',
    quantity: '',
    unit: 'meters',
    minPrice: '',
    maxPrice: '',
  });

  const fetchData = useCallback(async () => {
    if (!companyId) return;
    setLoading(true);
    try {
      const [rfqData, negData] = await Promise.all([
        negotiationService.getRFQsByCompany(companyId),
        negotiationService.getNegotiationsByCompany(companyId),
      ]);
      setRfqs(rfqData);
      setNegotiations(negData);
    } catch (err: any) {
      toast({ title: 'Error loading data', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  // Fetch companies for the seller dropdown
  useEffect(() => {
    const fetchCompanies = async () => {
      const { data } = await supabase.from('companies').select('id, name').neq('id', companyId || '');
      setCompanies(data || []);
    };
    if (companyId) fetchCompanies();
  }, [companyId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleCreateRFQ = async () => {
    if (!companyId || !user) return;
    try {
      await negotiationService.createRFQ({
        buyerCompanyId: companyId,
        sellerCompanyId: form.sellerCompanyId,
        productName: form.productName,
        productDescription: form.productDescription || undefined,
        quantity: parseInt(form.quantity),
        unit: form.unit,
        minPrice: parseFloat(form.minPrice),
        maxPrice: parseFloat(form.maxPrice),
        createdBy: user.id,
      });
      toast({ title: 'RFQ created successfully' });
      setCreateOpen(false);
      setForm({ sellerCompanyId: '', productName: '', productDescription: '', quantity: '', unit: 'meters', minPrice: '', maxPrice: '' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed to create RFQ', description: err.message, variant: 'destructive' });
    }
  };

  const handleStartNegotiation = async (rfqId: string) => {
    try {
      const neg = await negotiationService.startNegotiation(rfqId);
      toast({ title: 'Negotiation started' });
      navigate(`/dashboard/negotiations/${neg.id}`);
    } catch (err: any) {
      toast({ title: 'Failed to start negotiation', description: err.message, variant: 'destructive' });
    }
  };

  const openNegotiation = (rfqId: string) => {
    const neg = negotiations.find(n => n.rfqId === rfqId);
    if (neg) navigate(`/dashboard/negotiations/${neg.id}`);
  };

  const isFormValid = form.sellerCompanyId && form.productName && form.quantity && form.minPrice && form.maxPrice &&
    parseFloat(form.maxPrice) > parseFloat(form.minPrice) && parseFloat(form.minPrice) > 0;

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Negotiations</h1>
            <p className="text-muted-foreground">Manage your price negotiations with the meter-based framework</p>
          </div>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button><Plus className="h-4 w-4 mr-2" />New RFQ</Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Create Request for Quotation</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-2">
                <div>
                  <Label>Seller Company</Label>
                  <Select value={form.sellerCompanyId} onValueChange={v => setForm(f => ({ ...f, sellerCompanyId: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select seller" /></SelectTrigger>
                    <SelectContent>
                      {companies.map(c => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Product Name</Label>
                  <Input value={form.productName} onChange={e => setForm(f => ({ ...f, productName: e.target.value }))} placeholder="e.g. Cotton Saree - 6m" />
                </div>
                <div>
                  <Label>Description (optional)</Label>
                  <Textarea value={form.productDescription} onChange={e => setForm(f => ({ ...f, productDescription: e.target.value }))} placeholder="Specifications, quality details..." rows={2} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Quantity</Label>
                    <Input type="number" min={1} value={form.quantity} onChange={e => setForm(f => ({ ...f, quantity: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Unit</Label>
                    <Select value={form.unit} onValueChange={v => setForm(f => ({ ...f, unit: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {['meters', 'pieces', 'kg', 'yards'].map(u => (
                          <SelectItem key={u} value={u}>{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Min Price (₹)</Label>
                    <Input type="number" min={0} step="0.01" value={form.minPrice} onChange={e => setForm(f => ({ ...f, minPrice: e.target.value }))} />
                  </div>
                  <div>
                    <Label>Max Price (₹)</Label>
                    <Input type="number" min={0} step="0.01" value={form.maxPrice} onChange={e => setForm(f => ({ ...f, maxPrice: e.target.value }))} />
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
                <Button onClick={handleCreateRFQ} disabled={!isFormValid}>Create RFQ</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Tabs: RFQs / Active Negotiations */}
        <Tabs defaultValue="rfqs">
          <TabsList>
            <TabsTrigger value="rfqs" className="gap-2"><FileText className="h-4 w-4" />RFQs ({rfqs.length})</TabsTrigger>
            <TabsTrigger value="active" className="gap-2"><Handshake className="h-4 w-4" />Negotiations ({negotiations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rfqs" className="mt-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : rfqs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No RFQs yet. Create one to start negotiating prices.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {rfqs.map(rfq => {
                  const hasNeg = negotiations.some(n => n.rfqId === rfq.id);
                  const isBuyer = rfq.buyerCompanyId === companyId;
                  return (
                    <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">{rfq.productName}</span>
                            <Badge variant="outline" className={STATUS_COLORS[rfq.status]}>{rfq.status}</Badge>
                            <Badge variant="secondary" className="text-xs">{isBuyer ? 'Buyer' : 'Seller'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {rfq.quantity} {rfq.unit} · ₹{rfq.minPrice.toFixed(2)} – ₹{rfq.maxPrice.toFixed(2)}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {rfq.status === 'open' && !hasNeg && !isBuyer && (
                            <Button size="sm" onClick={() => handleStartNegotiation(rfq.id)}>
                              Start Negotiation <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                          {rfq.status === 'negotiating' && hasNeg && (
                            <Button size="sm" variant="outline" onClick={() => openNegotiation(rfq.id)}>
                              Open Meter <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                          {rfq.status === 'accepted' && (
                            <CheckCircle className="h-5 w-5 text-success" />
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>

          <TabsContent value="active" className="mt-4">
            {loading ? (
              <p className="text-muted-foreground text-center py-8">Loading...</p>
            ) : negotiations.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Handshake className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                  <p className="text-muted-foreground">No active negotiations.</p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-3">
                {negotiations.map(neg => {
                  const isBuyer = neg.buyerCompanyId === companyId;
                  const isTerminal = ['accepted', 'expired', 'rejected'].includes(neg.status);
                  return (
                    <Card key={neg.id} className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate(`/dashboard/negotiations/${neg.id}`)}>
                      <CardContent className="py-4 flex items-center justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Handshake className="h-4 w-4 text-primary" />
                            <span className="font-medium">Negotiation</span>
                            <Badge variant="outline" className={STATUS_COLORS[neg.status]}>{neg.status.replace('_', ' ')}</Badge>
                            <Badge variant="secondary" className="text-xs">{isBuyer ? 'Buyer' : 'Seller'}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Range: ₹{neg.minPrice.toFixed(2)} – ₹{neg.maxPrice.toFixed(2)}
                            {neg.currentOfferPrice && ` · Current: ₹${neg.currentOfferPrice.toFixed(2)}`}
                            {neg.acceptedPrice && ` · Agreed: ₹${neg.acceptedPrice.toFixed(2)}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          {neg.status === 'accepted' ? (
                            <CheckCircle className="h-5 w-5 text-success" />
                          ) : neg.status === 'expired' ? (
                            <Clock className="h-5 w-5 text-muted-foreground" />
                          ) : neg.status === 'rejected' ? (
                            <XCircle className="h-5 w-5 text-destructive" />
                          ) : (
                            <Button size="sm" variant="outline">
                              Open Meter <ArrowRight className="h-4 w-4 ml-1" />
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Negotiations;
