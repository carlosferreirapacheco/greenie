-- BMC's webhook envelope's event_id identifies the delivery, not the
-- underlying payment -- a donation.created delivery and the later
-- donation.refunded delivery for the same payment carry different
-- event_ids. bmc_payment_id (BMC's own payment id, data.id) is the
-- real correlation key shared by both deliveries for one payment.
-- Deliberately not unique: the created and refunded rows for one
-- payment are two separate rows sharing this value, by design.
alter table public.bmc_donations
  add column bmc_payment_id bigint;

-- Stamped on the ORIGINAL credited row once a matching refund is
-- processed, so a redelivered/duplicate refund can't double-subtract.
alter table public.bmc_donations
  add column reversed_at timestamptz;

create index if not exists bmc_donations_payment_id_idx
  on public.bmc_donations (bmc_payment_id);
