-- Migration: Create Dunning Management Tables
-- Description: Creates dunning_procedures and dunning_history tables for payment reminder management
-- Date: 2025-01-28

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS public.dunning_history CASCADE;
DROP TABLE IF EXISTS public.dunning_procedures CASCADE;
DROP SEQUENCE IF EXISTS public.dunning_procedures_id_seq CASCADE;
DROP SEQUENCE IF EXISTS public.dunning_history_id_seq CASCADE;

-- Create sequence for dunning_procedures
CREATE SEQUENCE public.dunning_procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create dunning_procedures table
CREATE TABLE public.dunning_procedures (
    id integer NOT NULL DEFAULT nextval('public.dunning_procedures_id_seq'::regclass),
    procedure_code character varying(10) NOT NULL,
    procedure_name character varying(100) NOT NULL,
    level1_days integer NOT NULL DEFAULT 7,
    level2_days integer NOT NULL DEFAULT 14,
    level3_days integer NOT NULL DEFAULT 21,
    final_notice_days integer NOT NULL DEFAULT 30,
    blocking_days integer NOT NULL DEFAULT 45,
    legal_action_days integer NOT NULL DEFAULT 60,
    minimum_amount numeric(15,2) DEFAULT 0.00,
    interest_rate numeric(5,2) DEFAULT 0.00,
    dunning_fee numeric(15,2) DEFAULT 0.00,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dunning_procedures_pkey PRIMARY KEY (id),
    CONSTRAINT dunning_procedures_procedure_code_key UNIQUE (procedure_code)
);

-- Set sequence ownership
ALTER SEQUENCE public.dunning_procedures_id_seq OWNED BY public.dunning_procedures.id;

-- Create sequence for dunning_history
CREATE SEQUENCE public.dunning_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;

-- Create dunning_history table
CREATE TABLE public.dunning_history (
    id integer NOT NULL DEFAULT nextval('public.dunning_history_id_seq'::regclass),
    customer_id integer NOT NULL,
    dunning_procedure_id integer NOT NULL,
    invoice_id integer,
    dunning_level integer NOT NULL,
    dunning_date date NOT NULL,
    outstanding_amount numeric(15,2) NOT NULL,
    dunning_amount numeric(15,2) NOT NULL,
    interest_amount numeric(15,2) DEFAULT 0.00,
    dunning_status character varying(20) NOT NULL DEFAULT 'sent',
    dunning_text text,
    letter_sent boolean DEFAULT false,
    email_sent boolean DEFAULT false,
    response_date date,
    payment_received boolean DEFAULT false,
    escalated_to_legal boolean DEFAULT false,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT dunning_history_pkey PRIMARY KEY (id)
);

-- Set sequence ownership
ALTER SEQUENCE public.dunning_history_id_seq OWNED BY public.dunning_history.id;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_dunning_history_customer ON public.dunning_history(customer_id);
CREATE INDEX IF NOT EXISTS idx_dunning_history_procedure ON public.dunning_history(dunning_procedure_id);
CREATE INDEX IF NOT EXISTS idx_dunning_history_status ON public.dunning_history(dunning_status);
CREATE INDEX IF NOT EXISTS idx_dunning_history_level ON public.dunning_history(dunning_level);
CREATE INDEX IF NOT EXISTS idx_dunning_history_date ON public.dunning_history(dunning_date);
CREATE INDEX IF NOT EXISTS idx_dunning_history_invoice ON public.dunning_history(invoice_id) WHERE invoice_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_dunning_procedures_active ON public.dunning_procedures(is_active) WHERE is_active = true;

-- Add foreign key constraints (if referenced tables exist)
-- Note: These will only be added if the referenced tables exist
DO $$
BEGIN
    -- Add foreign key to customers table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'erp_customers') THEN
        ALTER TABLE public.dunning_history
        ADD CONSTRAINT fk_dunning_history_customer
        FOREIGN KEY (customer_id) REFERENCES public.erp_customers(id)
        ON DELETE RESTRICT ON UPDATE CASCADE;
    END IF;

    -- Add foreign key to dunning_procedures
    ALTER TABLE public.dunning_history
    ADD CONSTRAINT fk_dunning_history_procedure
    FOREIGN KEY (dunning_procedure_id) REFERENCES public.dunning_procedures(id)
    ON DELETE RESTRICT ON UPDATE CASCADE;

    -- Add foreign key to invoices table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'ar_invoices') THEN
        ALTER TABLE public.dunning_history
        ADD CONSTRAINT fk_dunning_history_invoice
        FOREIGN KEY (invoice_id) REFERENCES public.ar_invoices(id)
        ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if constraints already exist or tables don't exist
        RAISE NOTICE 'Some foreign key constraints could not be added: %', SQLERRM;
END $$;

-- Add comments for documentation
COMMENT ON TABLE public.dunning_procedures IS 'Payment reminder procedures defining escalation rules and timing';
COMMENT ON TABLE public.dunning_history IS 'History of payment reminder notices sent to customers';

COMMENT ON COLUMN public.dunning_procedures.procedure_code IS 'Unique code identifying the procedure';
COMMENT ON COLUMN public.dunning_procedures.procedure_name IS 'Descriptive name of the procedure';
COMMENT ON COLUMN public.dunning_procedures.level1_days IS 'Days overdue before first reminder';
COMMENT ON COLUMN public.dunning_procedures.level2_days IS 'Days overdue before second reminder';
COMMENT ON COLUMN public.dunning_procedures.level3_days IS 'Days overdue before third reminder';
COMMENT ON COLUMN public.dunning_procedures.final_notice_days IS 'Days overdue before final notice';
COMMENT ON COLUMN public.dunning_procedures.blocking_days IS 'Days overdue before account blocking';
COMMENT ON COLUMN public.dunning_procedures.legal_action_days IS 'Days overdue before legal action';
COMMENT ON COLUMN public.dunning_procedures.minimum_amount IS 'Minimum outstanding amount to trigger reminder';
COMMENT ON COLUMN public.dunning_procedures.interest_rate IS 'Annual interest rate percentage';
COMMENT ON COLUMN public.dunning_procedures.dunning_fee IS 'Fee charged per reminder notice';

COMMENT ON COLUMN public.dunning_history.customer_id IS 'Reference to customer receiving the reminder';
COMMENT ON COLUMN public.dunning_history.dunning_procedure_id IS 'Reference to procedure used for this reminder';
COMMENT ON COLUMN public.dunning_history.invoice_id IS 'Reference to specific invoice (optional)';
COMMENT ON COLUMN public.dunning_history.dunning_level IS 'Reminder level (1=first, 2=second, 3=third, 4=final)';
COMMENT ON COLUMN public.dunning_history.dunning_date IS 'Date the reminder was generated';
COMMENT ON COLUMN public.dunning_history.outstanding_amount IS 'Outstanding amount at time of reminder';
COMMENT ON COLUMN public.dunning_history.dunning_amount IS 'Total amount including interest and fees';
COMMENT ON COLUMN public.dunning_history.interest_amount IS 'Interest amount calculated';
COMMENT ON COLUMN public.dunning_history.dunning_status IS 'Status: sent, acknowledged, paid, escalated';
COMMENT ON COLUMN public.dunning_history.dunning_text IS 'Text content of the reminder notice';
COMMENT ON COLUMN public.dunning_history.letter_sent IS 'Whether physical letter was sent';
COMMENT ON COLUMN public.dunning_history.email_sent IS 'Whether email was sent';
COMMENT ON COLUMN public.dunning_history.payment_received IS 'Whether payment has been received';
COMMENT ON COLUMN public.dunning_history.escalated_to_legal IS 'Whether case has been escalated to legal';

