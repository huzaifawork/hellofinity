-- Run this query in your Supabase SQL Editor to track payment and pro-plan information

-- 1. Add tracking columns to existing 'profiles' table
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS pro_since TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS pro_plan_name TEXT,
ADD COLUMN IF NOT EXISTS pro_expires_at TIMESTAMP WITH TIME ZONE;

-- 2. Drop the old payments table (if it exists) to cleanly reset the columns (like amount_paid NUMERIC(10,2))
DROP TABLE IF EXISTS public.payments CASCADE;

-- 3. Create a fresh 'payments' table to log all purchases
CREATE TABLE public.payments (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    email TEXT NOT NULL,
    amount_paid NUMERIC(10,2) NOT NULL,
    currency TEXT NOT NULL,
    plan_name TEXT NOT NULL,
    purchased_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '1 month')
);

-- 4. Set up Row Level Security (RLS) for the payments table
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own payments" 
ON public.payments FOR INSERT 
WITH CHECK (
    auth.uid() = user_id OR 
    (auth.uid() IS NULL AND user_id IS NULL) -- Allow anonymous purchases from landing page
);

CREATE POLICY "Users can view their own payments" 
ON public.payments FOR SELECT 
USING (auth.uid() = user_id);

-- 5. Automatically sync any new payment back to the profiles table
CREATE OR REPLACE FUNCTION trigger_sync_payment_to_profile()
RETURNS trigger AS $$
DECLARE
    matching_user_id UUID;
BEGIN
    matching_user_id := NEW.user_id;

    -- If there's no user_id (e.g. they bought from the landing page), try to find by email
    IF matching_user_id IS NULL THEN
        SELECT id INTO matching_user_id FROM auth.users WHERE email = NEW.email;
    END IF;

    -- If we found an associated user profile, automatically upgrade them to Pro!
    IF matching_user_id IS NOT NULL THEN
        UPDATE public.profiles
        SET 
            is_pro = true,
            pro_since = NEW.purchased_at,
            pro_plan_name = NEW.plan_name,
            pro_expires_at = NEW.expires_at
        WHERE id = matching_user_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Fire the trigger anytime a new payment is recorded
DROP TRIGGER IF EXISTS trg_sync_payment_to_profile ON public.payments;
CREATE TRIGGER trg_sync_payment_to_profile
    AFTER INSERT ON public.payments
    FOR EACH ROW
    EXECUTE FUNCTION trigger_sync_payment_to_profile();

-- 6. Trigger for new user registrations: attach previously made landing page payments
CREATE OR REPLACE FUNCTION link_past_payments_on_signup()
RETURNS trigger AS $$
DECLARE
    past_payment RECORD;
    user_email TEXT;
BEGIN
    SELECT email INTO user_email FROM auth.users WHERE id = NEW.id;

    SELECT * INTO past_payment
    FROM public.payments
    WHERE email = user_email AND user_id IS NULL
    ORDER BY purchased_at DESC
    LIMIT 1;

    IF FOUND THEN
        NEW.is_pro := true;
        NEW.pro_since := past_payment.purchased_at;
        NEW.pro_plan_name := past_payment.plan_name;
        NEW.pro_expires_at := past_payment.expires_at;

        UPDATE public.payments SET user_id = NEW.id WHERE id = past_payment.id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_link_past_payments_on_signup ON public.profiles;
CREATE TRIGGER trg_link_past_payments_on_signup
    BEFORE INSERT ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION link_past_payments_on_signup();
