
-- Create seller_stats table
CREATE TABLE public.seller_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_company_id uuid NOT NULL UNIQUE,
  orders_completed integer NOT NULL DEFAULT 0,
  total_orders integer NOT NULL DEFAULT 0,
  completion_rate numeric NOT NULL DEFAULT 0,
  avg_rating numeric NOT NULL DEFAULT 0,
  negotiation_success_rate numeric NOT NULL DEFAULT 0,
  avg_response_time_minutes numeric NOT NULL DEFAULT 0,
  is_best_seller boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seller_stats ENABLE ROW LEVEL SECURITY;

-- Everyone authenticated can read seller stats (public marketplace data)
CREATE POLICY "Authenticated users can view seller stats"
ON public.seller_stats FOR SELECT TO authenticated
USING (true);

-- Only admins can modify seller stats (recalculation job uses service role)
CREATE POLICY "Admins can manage seller stats"
ON public.seller_stats FOR ALL TO authenticated
USING (has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Block anonymous access
CREATE POLICY "Block anonymous access"
ON public.seller_stats FOR ALL TO anon
USING (false) WITH CHECK (false);

-- Add updated_at trigger
CREATE TRIGGER update_seller_stats_updated_at
  BEFORE UPDATE ON public.seller_stats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.seller_stats;

-- Create recalculation function
CREATE OR REPLACE FUNCTION public.recalculate_seller_stats()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  seller RECORD;
BEGIN
  FOR seller IN
    SELECT DISTINCT seller_company_id FROM negotiations
  LOOP
    INSERT INTO public.seller_stats (seller_company_id, orders_completed, total_orders, completion_rate, avg_rating, negotiation_success_rate, avg_response_time_minutes, is_best_seller)
    SELECT
      seller.seller_company_id,
      COALESCE((SELECT count(*) FROM orders WHERE seller_company_id = seller.seller_company_id AND status IN ('delivered')), 0),
      COALESCE((SELECT count(*) FROM orders WHERE seller_company_id = seller.seller_company_id), 0),
      CASE WHEN (SELECT count(*) FROM orders WHERE seller_company_id = seller.seller_company_id) > 0
        THEN (SELECT count(*) FROM orders WHERE seller_company_id = seller.seller_company_id AND status IN ('delivered'))::numeric / (SELECT count(*) FROM orders WHERE seller_company_id = seller.seller_company_id)::numeric
        ELSE 0 END,
      0, -- avg_rating placeholder (no ratings table yet)
      CASE WHEN (SELECT count(*) FROM negotiations WHERE seller_company_id = seller.seller_company_id) > 0
        THEN (SELECT count(*) FROM negotiations WHERE seller_company_id = seller.seller_company_id AND status = 'accepted')::numeric / (SELECT count(*) FROM negotiations WHERE seller_company_id = seller.seller_company_id)::numeric
        ELSE 0 END,
      COALESCE((
        SELECT AVG(EXTRACT(EPOCH FROM (no2.created_at - no1.created_at)) / 60)
        FROM negotiation_offers no1
        JOIN negotiation_offers no2 ON no1.negotiation_id = no2.negotiation_id
        JOIN negotiations n ON n.id = no1.negotiation_id
        WHERE n.seller_company_id = seller.seller_company_id
          AND no1.offered_by_company_id != seller.seller_company_id
          AND no2.offered_by_company_id = seller.seller_company_id
          AND no2.created_at = (SELECT MIN(created_at) FROM negotiation_offers WHERE negotiation_id = no1.negotiation_id AND offered_by_company_id = seller.seller_company_id AND created_at > no1.created_at)
      ), 0),
      false
    ON CONFLICT (seller_company_id) DO UPDATE SET
      orders_completed = EXCLUDED.orders_completed,
      total_orders = EXCLUDED.total_orders,
      completion_rate = EXCLUDED.completion_rate,
      avg_rating = EXCLUDED.avg_rating,
      negotiation_success_rate = EXCLUDED.negotiation_success_rate,
      avg_response_time_minutes = EXCLUDED.avg_response_time_minutes;
  END LOOP;

  -- Now set is_best_seller based on criteria
  UPDATE public.seller_stats SET is_best_seller = (
    orders_completed >= 50
    AND completion_rate >= 0.90
    AND avg_rating >= 4.5
    AND negotiation_success_rate >= 0.60
    AND avg_response_time_minutes <= 120
  );
END;
$$;
