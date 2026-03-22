// Negotiation Service - Meter-Based Negotiation Framework
// Handles RFQ creation, negotiation state machine, and atomic acceptance

import { supabase } from '@/integrations/supabase/client';
import type {
  RFQ,
  Negotiation,
  NegotiationOffer,
  Order,
  NegotiationStatus,
  NegotiationWithRFQ,
} from '@/domain/negotiation.models';
import { VALID_NEGOTIATION_TRANSITIONS } from '@/domain/negotiation.models';

// ============================================================================
// Mappers (DB row → Domain model)
// ============================================================================

function mapRfq(row: any): RFQ {
  return {
    id: row.id,
    buyerCompanyId: row.buyer_company_id,
    sellerCompanyId: row.seller_company_id,
    productName: row.product_name,
    productDescription: row.product_description,
    quantity: row.quantity,
    unit: row.unit,
    minPrice: Number(row.min_price),
    maxPrice: Number(row.max_price),
    status: row.status,
    createdBy: row.created_by,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    expiresAt: row.expires_at ? new Date(row.expires_at) : undefined,
  };
}

function mapNegotiation(row: any): Negotiation {
  return {
    id: row.id,
    rfqId: row.rfq_id,
    buyerCompanyId: row.buyer_company_id,
    sellerCompanyId: row.seller_company_id,
    minPrice: Number(row.min_price),
    maxPrice: Number(row.max_price),
    currentOfferPrice: row.current_offer_price ? Number(row.current_offer_price) : undefined,
    currentOfferBy: row.current_offer_by,
    status: row.status,
    acceptedPrice: row.accepted_price ? Number(row.accepted_price) : undefined,
    acceptedAt: row.accepted_at ? new Date(row.accepted_at) : undefined,
    offerExpiryMinutes: row.offer_expiry_minutes,
    currentOfferExpiresAt: row.current_offer_expires_at ? new Date(row.current_offer_expires_at) : undefined,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

function mapOffer(row: any): NegotiationOffer {
  return {
    id: row.id,
    negotiationId: row.negotiation_id,
    action: row.action,
    price: row.price ? Number(row.price) : undefined,
    offeredBy: row.offered_by,
    offeredByCompanyId: row.offered_by_company_id,
    message: row.message,
    createdAt: new Date(row.created_at),
  };
}

function mapOrder(row: any): Order {
  return {
    id: row.id,
    negotiationId: row.negotiation_id,
    rfqId: row.rfq_id,
    buyerCompanyId: row.buyer_company_id,
    sellerCompanyId: row.seller_company_id,
    productName: row.product_name,
    quantity: row.quantity,
    unit: row.unit,
    agreedPrice: Number(row.agreed_price),
    status: row.status,
    shipmentId: row.shipment_id,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
  };
}

// ============================================================================
// Service
// ============================================================================

class NegotiationService {
  // ------ RFQ Operations ------

  async createRFQ(params: {
    buyerCompanyId: string;
    sellerCompanyId: string;
    productName: string;
    productDescription?: string;
    quantity: number;
    unit: string;
    minPrice: number;
    maxPrice: number;
    createdBy: string;
    expiresAt?: Date;
  }): Promise<RFQ> {
    if (params.minPrice <= 0 || params.maxPrice <= params.minPrice) {
      throw new Error('Invalid price range: min must be > 0 and max must be > min');
    }
    if (params.buyerCompanyId === params.sellerCompanyId) {
      throw new Error('Buyer and seller must be different companies');
    }

    const { data, error } = await supabase
      .from('rfqs')
      .insert({
        buyer_company_id: params.buyerCompanyId,
        seller_company_id: params.sellerCompanyId,
        product_name: params.productName,
        product_description: params.productDescription,
        quantity: params.quantity,
        unit: params.unit,
        min_price: params.minPrice,
        max_price: params.maxPrice,
        created_by: params.createdBy,
        expires_at: params.expiresAt?.toISOString(),
      } as any)
      .select()
      .single();

    if (error) throw new Error(`Failed to create RFQ: ${error.message}`);
    return mapRfq(data);
  }

  async getRFQsByCompany(companyId: string): Promise<RFQ[]> {
    const { data, error } = await supabase
      .from('rfqs')
      .select('*')
      .or(`buyer_company_id.eq.${companyId},seller_company_id.eq.${companyId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch RFQs: ${error.message}`);
    return (data || []).map(mapRfq);
  }

  // ------ Negotiation Operations ------

  async startNegotiation(rfqId: string): Promise<Negotiation> {
    // Get the RFQ first
    const { data: rfq, error: rfqError } = await supabase
      .from('rfqs')
      .select('*')
      .eq('id', rfqId)
      .single();

    if (rfqError || !rfq) throw new Error('RFQ not found');
    if (rfq.status !== 'open') throw new Error('RFQ is not open for negotiation');

    // Create negotiation session
    const { data, error } = await supabase
      .from('negotiations')
      .insert({
        rfq_id: rfqId,
        buyer_company_id: rfq.buyer_company_id,
        seller_company_id: rfq.seller_company_id,
        min_price: rfq.min_price,
        max_price: rfq.max_price,
      } as any)
      .select()
      .single();

    if (error) throw new Error(`Failed to start negotiation: ${error.message}`);

    // Update RFQ status
    await supabase.from('rfqs').update({ status: 'negotiating' } as any).eq('id', rfqId);

    return mapNegotiation(data);
  }

  async submitOffer(params: {
    negotiationId: string;
    price?: number;
    action: 'initial_offer' | 'counter_offer' | 'accept' | 'reject';
  }): Promise<{ success: boolean; newStatus: string; price?: number }> {
    const { data, error } = await supabase.rpc('submit_offer', {
      _negotiation_id: params.negotiationId,
      _offer_price: params.price ?? null,
      _action: params.action,
    } as any);

    if (error) throw new Error(`Offer failed: ${error.message}`);
    return { success: data.success, newStatus: data.new_status, price: data.price };
  }

  // Legacy wrappers kept for backward compatibility
  async makeOffer(params: {
    negotiationId: string;
    price: number;
    offeredBy: string;
    offeredByCompanyId: string;
    message?: string;
  }) {
    const neg = await this.getNegotiationWithDetails(params.negotiationId);
    const action = neg.status === 'open' ? 'initial_offer' : 'counter_offer';
    return this.submitOffer({ negotiationId: params.negotiationId, price: params.price, action });
  }

  async acceptOffer(negotiationId: string): Promise<Order> {
    await this.submitOffer({ negotiationId, action: 'accept' });
    // Fetch the created order
    const { data: order, error } = await supabase
      .from('orders')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .single();
    if (error) throw new Error(`Failed to fetch order: ${error.message}`);
    return mapOrder(order);
  }

  async rejectOffer(params: {
    negotiationId: string;
    rejectedBy: string;
    rejectedByCompanyId: string;
    message?: string;
  }): Promise<void> {
    await this.submitOffer({ negotiationId: params.negotiationId, action: 'reject' });
  }

  async acceptOffer(negotiationId: string): Promise<Order> {
    // Use the atomic server-side function
    const { data, error } = await supabase.rpc('accept_negotiation', {
      _negotiation_id: negotiationId,
    });

    if (error) throw new Error(`Failed to accept: ${error.message}`);

    // Fetch the created order
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('id', data)
      .single();

    if (orderError) throw new Error(`Failed to fetch order: ${orderError.message}`);
    return mapOrder(order);
  }

  // ------ Query Operations ------

  async getNegotiationsByCompany(companyId: string): Promise<Negotiation[]> {
    const { data, error } = await supabase
      .from('negotiations')
      .select('*')
      .or(`buyer_company_id.eq.${companyId},seller_company_id.eq.${companyId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch negotiations: ${error.message}`);
    return (data || []).map(mapNegotiation);
  }

  async getNegotiationWithDetails(negotiationId: string): Promise<NegotiationWithRFQ> {
    const { data: neg, error } = await supabase
      .from('negotiations')
      .select('*')
      .eq('id', negotiationId)
      .single();

    if (error || !neg) throw new Error('Negotiation not found');

    const [rfqResult, offersResult] = await Promise.all([
      supabase.from('rfqs').select('*').eq('id', neg.rfq_id).single(),
      supabase.from('negotiation_offers').select('*').eq('negotiation_id', negotiationId).order('created_at', { ascending: true }),
    ]);

    if (rfqResult.error) throw new Error('RFQ not found');

    return {
      ...mapNegotiation(neg),
      rfq: mapRfq(rfqResult.data),
      offers: (offersResult.data || []).map(mapOffer),
    };
  }

  async getOffersByNegotiation(negotiationId: string): Promise<NegotiationOffer[]> {
    const { data, error } = await supabase
      .from('negotiation_offers')
      .select('*')
      .eq('negotiation_id', negotiationId)
      .order('created_at', { ascending: true });

    if (error) throw new Error(`Failed to fetch offers: ${error.message}`);
    return (data || []).map(mapOffer);
  }

  async getOrdersByCompany(companyId: string): Promise<Order[]> {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .or(`buyer_company_id.eq.${companyId},seller_company_id.eq.${companyId}`)
      .order('created_at', { ascending: false });

    if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
    return (data || []).map(mapOrder);
  }

  // ------ Realtime Subscription ------

  subscribeToNegotiation(negotiationId: string, onUpdate: (negotiation: Negotiation) => void) {
    const channel = supabase
      .channel(`negotiation-${negotiationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'negotiations',
          filter: `id=eq.${negotiationId}`,
        },
        (payload) => {
          onUpdate(mapNegotiation(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }

  subscribeToOffers(negotiationId: string, onNewOffer: (offer: NegotiationOffer) => void) {
    const channel = supabase
      .channel(`offers-${negotiationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'negotiation_offers',
          filter: `negotiation_id=eq.${negotiationId}`,
        },
        (payload) => {
          onNewOffer(mapOffer(payload.new));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }
}

export const negotiationService = new NegotiationService();
