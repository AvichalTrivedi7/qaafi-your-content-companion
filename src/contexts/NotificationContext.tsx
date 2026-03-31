import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface NotificationContextType {
  rfqBadgeCount: number;
  negotiationBadgeCount: number;
  clearRfqBadge: () => void;
  clearNegotiationBadge: () => void;
}

const NotificationContext = createContext<NotificationContextType>({
  rfqBadgeCount: 0,
  negotiationBadgeCount: 0,
  clearRfqBadge: () => {},
  clearNegotiationBadge: () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { profile, user } = useAuth();
  const companyId = profile?.companyId;
  const location = useLocation();
  const [rfqBadgeCount, setRfqBadgeCount] = useState(0);
  const [negotiationBadgeCount, setNegotiationBadgeCount] = useState(0);
  const companyIdRef = useRef(companyId);
  companyIdRef.current = companyId;

  const clearRfqBadge = useCallback(() => setRfqBadgeCount(0), []);
  const clearNegotiationBadge = useCallback(() => setNegotiationBadgeCount(0), []);

  // Auto-clear when user navigates to the respective page
  useEffect(() => {
    if (location.pathname === '/dashboard/negotiations') {
      // Clear both since RFQs and Negotiations are on same page
      clearRfqBadge();
      clearNegotiationBadge();
    }
  }, [location.pathname, clearRfqBadge, clearNegotiationBadge]);

  useEffect(() => {
    if (!companyId || !user) return;

    const channel = supabase
      .channel('notification-badges')
      // New RFQ in marketplace (INSERT where buyer is not current company)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rfqs' },
        (payload) => {
          const newRfq = payload.new as any;
          // Only increment if the RFQ is from another company (marketplace)
          if (newRfq.buyer_company_id !== companyIdRef.current) {
            setRfqBadgeCount((c) => c + 1);
          }
        }
      )
      // RFQ receives new negotiation (UPDATE on rfqs - reserved_quantity changes)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'rfqs' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          // If reserved_quantity increased on my RFQ, a new negotiation was started
          if (
            updated.buyer_company_id === companyIdRef.current &&
            Number(updated.reserved_quantity) > Number(old.reserved_quantity || 0)
          ) {
            setRfqBadgeCount((c) => c + 1);
          }
        }
      )
      // Negotiation offer events
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'negotiations' },
        (payload) => {
          const updated = payload.new as any;
          const old = payload.old as any;
          // Only notify if the current offer was made by someone else
          const isParticipant =
            updated.buyer_company_id === companyIdRef.current ||
            updated.seller_company_id === companyIdRef.current;
          if (!isParticipant) return;

          const offerChanged = updated.current_offer_by !== old.current_offer_by;
          const statusChanged = updated.status !== old.status;

          // New offer or counter offer from other party
          if (offerChanged && updated.current_offer_by !== user?.id) {
            setNegotiationBadgeCount((c) => c + 1);
          }
          // Status change (accepted/rejected/expired) from other party
          if (
            statusChanged &&
            ['accepted', 'rejected', 'expired'].includes(updated.status) &&
            updated.current_offer_by !== user?.id
          ) {
            setNegotiationBadgeCount((c) => c + 1);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [companyId, user]);

  return (
    <NotificationContext.Provider
      value={{ rfqBadgeCount, negotiationBadgeCount, clearRfqBadge, clearNegotiationBadge }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}
