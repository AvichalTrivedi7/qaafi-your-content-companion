// NegotiationSession - Full real-time negotiation view with meter
import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { AdminLayout } from '@/components/AdminLayout';
import { useAuth } from '@/contexts/AuthContext';
import { negotiationService } from '@/services/negotiationService';
import { NegotiationMeter } from '@/components/negotiation/NegotiationMeter';
import type { NegotiationWithRFQ, NegotiationOffer } from '@/domain/negotiation.models';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { toast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  Send,
  CheckCircle,
  XCircle,
  Clock,
  Lock,
  MessageSquare,
  User,
  Building2,
} from 'lucide-react';

const NegotiationSession = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { profile, user } = useAuth();
  const companyId = profile?.companyId;

  const [data, setData] = useState<NegotiationWithRFQ | null>(null);
  const [loading, setLoading] = useState(true);
  const [offerPrice, setOfferPrice] = useState<number | null>(null);
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const offersEndRef = useRef<HTMLDivElement>(null);

  const fetchData = useCallback(async () => {
    if (!id) return;
    try {
      const result = await negotiationService.getNegotiationWithDetails(id);
      setData(result);
      if (!offerPrice && result.currentOfferPrice) {
        setOfferPrice(result.currentOfferPrice);
      } else if (!offerPrice) {
        setOfferPrice(result.minPrice + (result.maxPrice - result.minPrice) / 2);
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Real-time subscriptions (negotiations UPDATE, offers INSERT, rfqs UPDATE)
  useEffect(() => {
    if (!id || !data?.rfqId) return;
    const rfqId = data.rfqId;

    // 1. Negotiation UPDATE — status, currentOfferPrice, expiry
    const unsubNeg = negotiationService.subscribeToNegotiation(id, (updated) => {
      setData(prev => prev ? { ...prev, ...updated } : null);
    });

    // 2. Offers INSERT — new offer history entries
    const unsubOffers = negotiationService.subscribeToOffers(id, (newOffer) => {
      setData(prev => {
        if (!prev) return null;
        // Deduplicate by id
        if (prev.offers.some(o => o.id === newOffer.id)) return prev;
        return { ...prev, offers: [...prev.offers, newOffer] };
      });
      setTimeout(() => offersEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    });

    // 3. RFQ UPDATE — reserved_quantity, is_locked changes
    const rfqChannel = supabase
      .channel(`rfq-${rfqId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'rfqs',
          filter: `id=eq.${rfqId}`,
        },
        (payload) => {
          const row = payload.new as any;
          setData(prev => prev ? {
            ...prev,
            rfq: {
              ...prev.rfq,
              status: row.status,
              reservedQuantity: Number(row.reserved_quantity),
              isLocked: row.is_locked,
            },
          } : null);
        }
      )
      .subscribe();

    return () => {
      unsubNeg();
      unsubOffers();
      supabase.removeChannel(rfqChannel);
    };
  }, [id, data?.rfqId]);

  // Client-side expiry countdown + lazy expiry check
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check if offer expired client-side and trigger server expiry
  useEffect(() => {
    if (!data || !data.currentOfferExpiresAt) return;
    const isActive = ['open', 'offer_made', 'counter_offered'].includes(data.status);
    if (isActive && data.currentOfferExpiresAt.getTime() < Date.now()) {
      // Trigger server-side expiry check
      supabase.rpc('expire_negotiations').then(() => fetchData());
    }
  }, [now, data?.currentOfferExpiresAt, data?.status]);

  if (loading || !data) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-64">
          <p className="text-muted-foreground">Loading negotiation...</p>
        </div>
      </AdminLayout>
    );
  }

  const isBuyer = data.buyerCompanyId === companyId;
  const role = isBuyer ? 'buyer' : 'seller';
  const isTerminal = ['accepted', 'expired', 'rejected'].includes(data.status);
  const isMyTurn = data.status === 'open' || (data.currentOfferBy && data.currentOfferBy !== user?.id);
  const canMakeOffer = !isTerminal && isMyTurn;
  const canAccept = !isTerminal && data.currentOfferBy && data.currentOfferBy !== user?.id &&
    (data.status === 'offer_made' || data.status === 'counter_offered');
  const canReject = canAccept;

  // Determine who made the current offer
  const currentOfferByRole = data.currentOfferBy
    ? (data.currentOfferBy === user?.id ? role : (role === 'buyer' ? 'seller' : 'buyer'))
    : undefined;

  const handleMakeOffer = async () => {
    if (!id || !user || !companyId || offerPrice === null) return;
    setSubmitting(true);
    try {
      const action = data.status === 'open' ? 'initial_offer' : 'counter_offer';
      await negotiationService.submitOffer({
        negotiationId: id,
        price: offerPrice,
        action: action as 'initial_offer' | 'counter_offer',
      });
      setMessage('');
      toast({ title: 'Offer sent!' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAccept = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await negotiationService.submitOffer({ negotiationId: id, action: 'accept' });
      toast({ title: 'Deal accepted!', description: `Price locked at ₹${data.currentOfferPrice?.toFixed(2)}` });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed to accept', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!id) return;
    setSubmitting(true);
    try {
      await negotiationService.submitOffer({ negotiationId: id, action: 'reject' });
      toast({ title: 'Offer rejected' });
      fetchData();
    } catch (err: any) {
      toast({ title: 'Failed', description: err.message, variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  // Expiry countdown (reactive via `now` state)
  const expiresAt = data?.currentOfferExpiresAt;
  const timeLeft = expiresAt ? Math.max(0, expiresAt.getTime() - now) : null;
  const countdownLabel = timeLeft !== null && timeLeft > 0
    ? (Math.floor(timeLeft / 60000) > 0
      ? `${Math.floor(timeLeft / 60000)}m ${Math.floor((timeLeft % 60000) / 1000)}s`
      : `${Math.floor((timeLeft % 60000) / 1000)}s`)
    : null;

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard/negotiations')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-foreground">{data.rfq.productName}</h1>
            <p className="text-sm text-muted-foreground">
              {data.rfq.quantity} {data.rfq.unit} · You are the <strong>{role}</strong>
            </p>
          </div>
          <Badge variant="outline" className={`text-sm ${
            data.status === 'accepted' ? 'bg-success/10 text-success border-success/20' :
            isTerminal ? 'bg-muted text-muted-foreground' :
            'bg-warning/10 text-warning border-warning/20'
          }`}>
            {data.status === 'accepted' && <Lock className="h-3 w-3 mr-1" />}
            {data.status.replace('_', ' ').toUpperCase()}
          </Badge>
        </div>

        {/* Accepted banner */}
        {data.status === 'accepted' && data.acceptedPrice && (
          <Card className="border-success/30 bg-success/5">
            <CardContent className="py-6 text-center">
              <CheckCircle className="h-10 w-10 text-success mx-auto mb-2" />
              <p className="text-lg font-bold text-foreground">Deal Closed at ₹{data.acceptedPrice.toFixed(2)}</p>
              <p className="text-sm text-muted-foreground">Price is permanently locked. Order has been created.</p>
              <Button className="mt-4" onClick={() => navigate('/dashboard/orders')}>
                View Orders
              </Button>
            </CardContent>
          </Card>
        )}

        {/* The Meter */}
        {!isTerminal && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                Price Meter
                {countdownLabel && (
                  <Badge variant="outline" className={cn("ml-auto text-xs", timeLeft && timeLeft < 60000 && "border-destructive text-destructive animate-pulse")}>
                    <Clock className="h-3 w-3 mr-1" />
                    {countdownLabel} left
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4">
              <NegotiationMeter
                minPrice={data.minPrice}
                maxPrice={data.maxPrice}
                currentOffer={data.currentOfferPrice}
                isReadOnly={!canMakeOffer}
                onOfferChange={setOfferPrice}
                role={role}
                currentOfferBy={currentOfferByRole}
              />
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        {!isTerminal && (
          <Card>
            <CardContent className="py-4 space-y-3">
              <Textarea
                value={message}
                onChange={e => setMessage(e.target.value)}
                placeholder="Add a message (optional)..."
                rows={2}
                className="resize-none"
              />
              <div className="flex items-center gap-2 flex-wrap">
                {canMakeOffer && (
                  <Button onClick={handleMakeOffer} disabled={submitting || offerPrice === null}>
                    <Send className="h-4 w-4 mr-2" />
                    {data.status === 'open' ? 'Make Offer' : 'Counter Offer'} — ₹{offerPrice?.toFixed(2)}
                  </Button>
                )}
                {canAccept && (
                  <Button variant="outline" className="border-success text-success hover:bg-success/10" onClick={handleAccept} disabled={submitting}>
                    <CheckCircle className="h-4 w-4 mr-2" />Accept ₹{data.currentOfferPrice?.toFixed(2)}
                  </Button>
                )}
                {canReject && (
                  <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10" onClick={handleReject} disabled={submitting}>
                    <XCircle className="h-4 w-4 mr-2" />Reject
                  </Button>
                )}
                {!canMakeOffer && !canAccept && (
                  <p className="text-sm text-muted-foreground">Waiting for the other party to respond...</p>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Offer History (Audit Log) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <MessageSquare className="h-4 w-4" />
              Negotiation History
              <Badge variant="secondary" className="ml-auto text-xs">Immutable Audit Log</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.offers.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">No offers yet. Make the first move!</p>
            ) : (
              <div className="space-y-3">
                {data.offers.map((offer, i) => {
                  const isMe = offer.offeredBy === user?.id;
                  return (
                    <div key={offer.id} className={cn('flex gap-3', isMe ? 'flex-row-reverse' : '')}>
                      <div className={cn(
                        'w-8 h-8 rounded-full flex items-center justify-center shrink-0',
                        isMe ? 'bg-primary/10' : 'bg-secondary'
                      )}>
                        {isMe ? <User className="h-4 w-4 text-primary" /> : <Building2 className="h-4 w-4 text-muted-foreground" />}
                      </div>
                      <div className={cn(
                        'rounded-lg px-3 py-2 max-w-[70%] border',
                        isMe ? 'bg-primary/5 border-primary/10' : 'bg-card border-border',
                        offer.action === 'accept' && 'bg-success/5 border-success/20',
                        offer.action === 'reject' && 'bg-destructive/5 border-destructive/20',
                      )}>
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-medium capitalize">{offer.action.replace('_', ' ')}</span>
                          {offer.price && <span className="text-xs font-bold">₹{offer.price.toFixed(2)}</span>}
                        </div>
                        {offer.message && <p className="text-sm text-foreground">{offer.message}</p>}
                        <p className="text-[10px] text-muted-foreground mt-1">
                          {offer.createdAt.toLocaleString()}
                        </p>
                      </div>
                    </div>
                  );
                })}
                <div ref={offersEndRef} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default NegotiationSession;
