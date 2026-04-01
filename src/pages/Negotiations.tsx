// Negotiations Page - RFQ listing + creation + negotiation sessions
import { useState, useEffect, useCallback, useMemo } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from '@/hooks/use-toast';
import { Plus, FileText, Handshake, Clock, CheckCircle, XCircle, ArrowRight, Lock, ShoppingCart, Store, Search } from 'lucide-react';
import { BestSellerBadge } from '@/components/BestSellerBadge';
import { useSellerStats } from '@/hooks/useSellerStats';

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-info/10 text-info border-info/20',
  negotiating: 'bg-warning/10 text-warning border-warning/20',
  partially_filled: 'bg-accent text-accent-foreground border-border',
  accepted: 'bg-success/10 text-success border-success/20',
  expired: 'bg-muted text-muted-foreground border-border',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
  offer_made: 'bg-warning/10 text-warning border-warning/20',
  counter_offered: 'bg-accent text-accent-foreground border-border',
  rejected: 'bg-destructive/10 text-destructive border-destructive/20',
};

// Countdown helper
function useNow(intervalMs = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

function formatCountdown(expiresAt?: Date, now?: number): string | null {
  if (!expiresAt || !now) return null;
  const diff = Math.max(0, expiresAt.getTime() - now);
  if (diff <= 0) return 'Expired';
  const m = Math.floor(diff / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
}

// Negotiation card used in both Buying and Selling tabs
function NegotiationCard({ neg, role, now, onClick, sellerStats, sellerName }: { neg: Negotiation; role: 'buyer' | 'seller'; now: number; onClick: () => void; sellerStats?: { ordersCompleted: number; completionRate: number; avgRating: number; negotiationSuccessRate: number; avgResponseTimeMinutes: number; isBestSeller: boolean }; sellerName?: string }) {
  const isTerminal = ['accepted', 'expired', 'rejected'].includes(neg.status);
  const countdown = !isTerminal ? formatCountdown(neg.currentOfferExpiresAt, now) : null;
  const isUrgent = neg.currentOfferExpiresAt && !isTerminal && (neg.currentOfferExpiresAt.getTime() - now) < 60000;

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={onClick}>
      <CardContent className="py-4 flex items-center justify-between gap-4">
        <div className="space-y-1.5 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Handshake className="h-4 w-4 text-primary" />
            <span className="font-semibold text-sm">Negotiation</span>
            <Badge variant="outline" className={STATUS_COLORS[neg.status]}>{neg.status.replace('_', ' ')}</Badge>
            <Badge variant="secondary" className="text-xs">{role === 'buyer' ? 'Buying' : 'Selling'}</Badge>
            {sellerStats && <BestSellerBadge stats={sellerStats} />}
          </div>
          {sellerName && (
            <p className="text-xs text-muted-foreground">Seller: {sellerName}</p>
          )}
          <div className="flex items-center gap-3 text-sm text-muted-foreground flex-wrap">
            <span>₹{neg.minPrice.toFixed(2)} – ₹{neg.maxPrice.toFixed(2)}</span>
            {neg.currentOfferPrice && (
              <span className="text-foreground font-medium">Current: ₹{neg.currentOfferPrice.toFixed(2)}</span>
            )}
            {neg.acceptedPrice && (
              <span className="text-success font-medium">Agreed: ₹{neg.acceptedPrice.toFixed(2)}</span>
            )}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>Qty: {Number(neg.negotiationQuantity ?? 0)}</span>
            {countdown && (
              <Badge variant="outline" className={`text-xs gap-1 ${isUrgent ? 'border-destructive text-destructive animate-pulse' : ''}`}>
                <Clock className="h-3 w-3" />
                {countdown}
              </Badge>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
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
}

const Negotiations = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const companyId = profile?.companyId;
  const now = useNow();

  const [rfqs, setRfqs] = useState<RFQ[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [companies, setCompanies] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [marketplaceSearch, setMarketplaceSearch] = useState('');
  const [myRfqSearch, setMyRfqSearch] = useState('');
  const [bestSellerOnly, setBestSellerOnly] = useState(false);

  // Collect unique seller company IDs from RFQs for badge lookups
  const sellerCompanyIds = useMemo(() => {
    const ids = new Set<string>();
    rfqs.forEach(r => {
      if (r.sellerCompanyId) ids.add(r.sellerCompanyId);
    });
    negotiations.forEach(n => {
      if (n.sellerCompanyId) ids.add(n.sellerCompanyId);
    });
    return Array.from(ids);
  }, [rfqs, negotiations]);
  const sellerStatsMap = useSellerStats(sellerCompanyIds);

  // Helper to get company name
  const getCompanyName = useCallback((id: string) => {
    return companies.find(c => c.id === id)?.name || 'Unknown';
  }, [companies]);

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

  // Realtime subscriptions for listing page
  useEffect(() => {
    if (!companyId) return;

    const rfqChannel = supabase
      .channel(`rfqs-list-${companyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rfqs' },
        (payload) => {
          const row = payload.new as any;
          setRfqs(prev => prev.map(r => r.id === row.id ? {
            ...r,
            status: row.status,
            minPrice: Number(row.min_price),
            maxPrice: Number(row.max_price),
            reservedQuantity: Number(row.reserved_quantity ?? 0),
            fulfilledQuantity: Number(row.fulfilled_quantity ?? 0),
            isLocked: row.is_locked ?? false,
          } : r));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rfqs' },
        () => fetchData()
      )
      .subscribe();

    const negChannel = supabase
      .channel(`negotiations-list-${companyId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'negotiations' },
        (payload) => {
          const row = payload.new as any;
          setNegotiations(prev => prev.map(n => n.id === row.id ? {
            ...n,
            status: row.status,
            currentOfferPrice: row.current_offer_price ? Number(row.current_offer_price) : undefined,
            currentOfferBy: row.current_offer_by,
            currentOfferExpiresAt: row.current_offer_expires_at ? new Date(row.current_offer_expires_at) : undefined,
            acceptedPrice: row.accepted_price ? Number(row.accepted_price) : undefined,
          } : n));
        }
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'negotiations' },
        () => fetchData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(rfqChannel);
      supabase.removeChannel(negChannel);
    };
  }, [companyId, fetchData]);

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

  // Split negotiations into buying/selling
  const buyingNegotiations = negotiations.filter(n => n.buyerCompanyId === companyId);
  const sellingNegotiations = negotiations.filter(n => n.sellerCompanyId === companyId);

  // Split RFQs into marketplace (other companies' open RFQs) and my RFQs, with search filtering
  const marketplaceRfqs = rfqs.filter(r =>
    r.buyerCompanyId !== companyId && r.status === 'open' &&
    (!marketplaceSearch || r.productName.toLowerCase().includes(marketplaceSearch.toLowerCase())) &&
    (!bestSellerOnly || sellerStatsMap[r.sellerCompanyId]?.isBestSeller)
  );
  const myRfqs = rfqs.filter(r =>
    r.buyerCompanyId === companyId &&
    (!myRfqSearch || r.productName.toLowerCase().includes(myRfqSearch.toLowerCase()))
  );

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

        {/* Main Tabs: RFQs / Negotiations */}
        <Tabs defaultValue="rfqs">
          <TabsList>
            <TabsTrigger value="rfqs" className="gap-2"><FileText className="h-4 w-4" />RFQs ({rfqs.length})</TabsTrigger>
            <TabsTrigger value="negotiations" className="gap-2"><Handshake className="h-4 w-4" />Negotiations ({negotiations.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="rfqs" className="mt-4">
            <Tabs defaultValue="marketplace">
              <TabsList>
                <TabsTrigger value="marketplace" className="gap-2">
                  <Store className="h-4 w-4" />Marketplace ({marketplaceRfqs.length})
                </TabsTrigger>
                <TabsTrigger value="mine" className="gap-2">
                  <FileText className="h-4 w-4" />My RFQs ({myRfqs.length})
                </TabsTrigger>
              </TabsList>

              {/* Marketplace: other companies' open RFQs */}
              <TabsContent value="marketplace" className="mt-4 space-y-4">
                <div className="flex items-center gap-4">
                  <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search marketplace RFQs by product name..."
                      value={marketplaceSearch}
                      onChange={e => setMarketplaceSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  <label className="flex items-center gap-2 text-sm cursor-pointer whitespace-nowrap">
                    <Checkbox
                      checked={bestSellerOnly}
                      onCheckedChange={(v) => setBestSellerOnly(v === true)}
                    />
                    Show Best Sellers Only
                  </label>
                </div>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : marketplaceRfqs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">
                        {marketplaceSearch ? 'No RFQs match your search.' : 'No open RFQs in the marketplace right now.'}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {marketplaceRfqs.map(rfq => {
                      const hasNeg = negotiations.some(n => n.rfqId === rfq.id);
                      return (
                        <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="py-4 flex items-center justify-between">
                            <div className="space-y-1.5 flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{rfq.productName}</span>
                                <Badge variant="outline" className={STATUS_COLORS[rfq.status]}>{rfq.status}</Badge>
                                {rfq.isLocked && (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                                    <Lock className="h-3 w-3" /> Fully Reserved
                                  </Badge>
                                )}
                              </div>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>Seller: {getCompanyName(rfq.sellerCompanyId)}</span>
                                {sellerStatsMap[rfq.sellerCompanyId] && (
                                  <BestSellerBadge stats={sellerStatsMap[rfq.sellerCompanyId]} />
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {rfq.quantity} {rfq.unit} · ₹{rfq.minPrice.toFixed(2)} – ₹{rfq.maxPrice.toFixed(2)}
                              </p>
                              <div className="flex items-center gap-3 text-xs">
                                <span className="text-success font-medium">
                                  {Math.max(0, rfq.quantity - rfq.reservedQuantity)} {rfq.unit} available
                                </span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 ml-4 shrink-0">
                              {!hasNeg && !rfq.isLocked ? (
                                <Button size="sm" onClick={() => handleStartNegotiation(rfq.id)}>
                                  Negotiate <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              ) : hasNeg ? (
                                <Button size="sm" variant="outline" onClick={() => openNegotiation(rfq.id)}>
                                  Open Meter <ArrowRight className="h-4 w-4 ml-1" />
                                </Button>
                              ) : (
                                <Badge variant="secondary" className="text-xs">Fully Reserved</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </TabsContent>

              {/* My RFQs: created by current company */}
              <TabsContent value="mine" className="mt-4 space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search your RFQs by product name..."
                    value={myRfqSearch}
                    onChange={e => setMyRfqSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : myRfqs.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <FileText className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">
                        {myRfqSearch ? 'No RFQs match your search.' : "You haven't created any RFQs yet."}
                      </p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {myRfqs.map(rfq => {
                      const rfqNegs = negotiations.filter(n => n.rfqId === rfq.id);
                      const activeNegs = rfqNegs.filter(n => !['accepted', 'expired', 'rejected'].includes(n.status));
                      return (
                        <Card key={rfq.id} className="hover:shadow-md transition-shadow">
                          <CardContent className="py-4">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold">{rfq.productName}</span>
                                <Badge variant="outline" className={STATUS_COLORS[rfq.status]}>{rfq.status}</Badge>
                                {rfq.isLocked && (
                                  <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/20 gap-1">
                                    <Lock className="h-3 w-3" /> Locked
                                  </Badge>
                                )}
                              </div>
                              {rfq.status === 'accepted' && <CheckCircle className="h-5 w-5 text-success" />}
                            </div>
                            <p className="text-sm text-muted-foreground mb-2">
                              ₹{rfq.minPrice.toFixed(2)} – ₹{rfq.maxPrice.toFixed(2)}
                            </p>
                            {/* Meter availability */}
                            <div className="flex items-center gap-3 text-xs mb-1">
                              <span className="text-foreground font-medium">{rfq.quantity} {rfq.unit} requested</span>
                              <span className="text-warning">{rfq.reservedQuantity} {rfq.unit} reserved</span>
                              <span className="text-success">{Math.max(0, rfq.quantity - rfq.reservedQuantity)} {rfq.unit} remaining</span>
                            </div>
                            <div className="h-1.5 w-full max-w-xs rounded-full bg-muted overflow-hidden mb-2">
                              <div
                                className="h-full rounded-full bg-warning transition-all duration-300"
                                style={{ width: `${Math.min(100, (rfq.reservedQuantity / rfq.quantity) * 100)}%` }}
                              />
                            </div>
                            {/* Negotiation counts */}
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{rfqNegs.length} negotiation{rfqNegs.length !== 1 ? 's' : ''} total</span>
                              {activeNegs.length > 0 && (
                                <Badge variant="secondary" className="text-xs">{activeNegs.length} active</Badge>
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
          </TabsContent>

          <TabsContent value="negotiations" className="mt-4">
            {/* Buying / Selling sub-tabs */}
            <Tabs defaultValue="buying">
              <TabsList>
                <TabsTrigger value="buying" className="gap-2">
                  <ShoppingCart className="h-4 w-4" />Buying ({buyingNegotiations.length})
                </TabsTrigger>
                <TabsTrigger value="selling" className="gap-2">
                  <Store className="h-4 w-4" />Selling ({sellingNegotiations.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="buying" className="mt-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : buyingNegotiations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <ShoppingCart className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">No buying negotiations yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {buyingNegotiations.map(neg => (
                      <NegotiationCard
                        key={neg.id}
                        neg={neg}
                        role="buyer"
                        now={now}
                        onClick={() => navigate(`/dashboard/negotiations/${neg.id}`)}
                        sellerStats={sellerStatsMap[neg.sellerCompanyId]}
                        sellerName={getCompanyName(neg.sellerCompanyId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="selling" className="mt-4">
                {loading ? (
                  <p className="text-muted-foreground text-center py-8">Loading...</p>
                ) : sellingNegotiations.length === 0 ? (
                  <Card>
                    <CardContent className="py-12 text-center">
                      <Store className="h-12 w-12 mx-auto text-muted-foreground/40 mb-3" />
                      <p className="text-muted-foreground">No selling negotiations yet.</p>
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-3">
                    {sellingNegotiations.map(neg => (
                      <NegotiationCard
                        key={neg.id}
                        neg={neg}
                        role="seller"
                        now={now}
                        onClick={() => navigate(`/dashboard/negotiations/${neg.id}`)}
                        sellerStats={sellerStatsMap[neg.sellerCompanyId]}
                        sellerName={getCompanyName(neg.sellerCompanyId)}
                      />
                    ))}
                  </div>
                )}
              </TabsContent>
            </Tabs>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default Negotiations;
