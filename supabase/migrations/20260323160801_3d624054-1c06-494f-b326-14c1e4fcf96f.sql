UPDATE public.negotiations n
SET negotiation_quantity = r.quantity
FROM public.rfqs r
WHERE n.rfq_id = r.id AND n.negotiation_quantity = 0;