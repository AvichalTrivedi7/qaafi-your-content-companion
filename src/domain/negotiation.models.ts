// Domain Models for Meter-Based Negotiation Framework

// ============================================================================
// Enums & Union Types
// ============================================================================

export const RFQ_STATUSES = ['open', 'negotiating', 'accepted', 'expired', 'cancelled'] as const;
export type RfqStatus = typeof RFQ_STATUSES[number];

export const NEGOTIATION_STATUSES = ['open', 'offer_made', 'counter_offered', 'accepted', 'expired', 'rejected'] as const;
export type NegotiationStatus = typeof NEGOTIATION_STATUSES[number];

export const OFFER_ACTIONS = ['initial_offer', 'counter_offer', 'accept', 'reject'] as const;
export type OfferAction = typeof OFFER_ACTIONS[number];

export const ORDER_STATUSES = ['confirmed', 'in_production', 'shipped', 'delivered', 'cancelled'] as const;
export type OrderStatus = typeof ORDER_STATUSES[number];

// State machine: valid transitions
export const VALID_NEGOTIATION_TRANSITIONS: Record<NegotiationStatus, NegotiationStatus[]> = {
  open: ['offer_made'],
  offer_made: ['counter_offered', 'accepted', 'expired', 'rejected'],
  counter_offered: ['offer_made', 'accepted', 'expired', 'rejected'],
  accepted: [], // terminal
  expired: [],  // terminal
  rejected: [], // terminal
};

// ============================================================================
// Core Entities
// ============================================================================

export interface RFQ {
  id: string;
  buyerCompanyId: string;
  sellerCompanyId: string;
  productName: string;
  productDescription?: string;
  quantity: number;
  unit: string;
  minPrice: number;
  maxPrice: number;
  status: RfqStatus;
  reservedQuantity: number;
  isLocked: boolean;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  expiresAt?: Date;
}

export interface Negotiation {
  id: string;
  rfqId: string;
  buyerCompanyId: string;
  sellerCompanyId: string;
  minPrice: number;
  maxPrice: number;
  currentOfferPrice?: number;
  currentOfferBy?: string;
  status: NegotiationStatus;
  acceptedPrice?: number;
  acceptedAt?: Date;
  offerExpiryMinutes: number;
  currentOfferExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface NegotiationOffer {
  id: string;
  negotiationId: string;
  action: OfferAction;
  price?: number;
  offeredBy: string;
  offeredByCompanyId: string;
  message?: string;
  createdAt: Date;
}

export interface Order {
  id: string;
  negotiationId: string;
  rfqId: string;
  buyerCompanyId: string;
  sellerCompanyId: string;
  productName: string;
  quantity: number;
  unit: string;
  agreedPrice: number;
  status: OrderStatus;
  shipmentId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ============================================================================
// Computed / View Types
// ============================================================================

export interface NegotiationWithRFQ extends Negotiation {
  rfq: RFQ;
  offers: NegotiationOffer[];
}

export interface NegotiationStats {
  totalNegotiations: number;
  activeCount: number;
  acceptedCount: number;
  expiredCount: number;
  rejectedCount: number;
  averageAcceptedPrice?: number;
}
