-- Add amount_paid column to reminders table
ALTER TABLE reminders ADD COLUMN amount_paid numeric(10,2);
