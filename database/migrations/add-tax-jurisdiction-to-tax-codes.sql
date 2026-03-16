-- Migration: Add tax_jurisdiction_id column to tax_codes table
-- This integrates tax jurisdictions with tax codes

-- First, ensure the tax_jurisdictions table exists
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'tax_jurisdictions') THEN
        CREATE TABLE public.tax_jurisdictions (
            id integer NOT NULL,
            jurisdiction_code character varying(20) NOT NULL,
            jurisdiction_name character varying(100) NOT NULL,
            jurisdiction_type character varying(50) NOT NULL,
            parent_jurisdiction_id integer,
            country character varying(3) DEFAULT 'US'::character varying,
            state_province character varying(10),
            county character varying(50),
            city character varying(50),
            postal_code_pattern character varying(20),
            is_active boolean DEFAULT true,
            created_at timestamp without time zone DEFAULT now()
        );

        CREATE SEQUENCE public.tax_jurisdictions_id_seq
            AS integer
            START WITH 1
            INCREMENT BY 1
            NO MINVALUE
            NO MAXVALUE
            CACHE 1;

        ALTER SEQUENCE public.tax_jurisdictions_id_seq OWNED BY public.tax_jurisdictions.id;
        ALTER TABLE public.tax_jurisdictions ALTER COLUMN id SET DEFAULT nextval('public.tax_jurisdictions_id_seq'::regclass);
        ALTER TABLE public.tax_jurisdictions ADD CONSTRAINT tax_jurisdictions_pkey PRIMARY KEY (id);
        
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_country ON public.tax_jurisdictions(country);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_state_province ON public.tax_jurisdictions(state_province);
        CREATE INDEX IF NOT EXISTS idx_tax_jurisdictions_jurisdiction_type ON public.tax_jurisdictions(jurisdiction_type);
    END IF;
END $$;

-- Add tax_jurisdiction_id column to tax_codes table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'tax_codes' 
        AND column_name = 'tax_jurisdiction_id'
    ) THEN
        ALTER TABLE public.tax_codes 
        ADD COLUMN tax_jurisdiction_id integer;
        
        -- Add foreign key constraint
        ALTER TABLE public.tax_codes 
        ADD CONSTRAINT tax_codes_tax_jurisdiction_id_fkey 
        FOREIGN KEY (tax_jurisdiction_id) 
        REFERENCES public.tax_jurisdictions(id);
        
        -- Create index for performance
        CREATE INDEX IF NOT EXISTS idx_tax_codes_tax_jurisdiction_id 
        ON public.tax_codes(tax_jurisdiction_id);
    END IF;
END $$;

COMMENT ON COLUMN public.tax_codes.tax_jurisdiction_id IS 'Foreign key reference to tax_jurisdictions table';

COMMENT ON TABLE public.tax_jurisdictions IS 'Tax jurisdiction master data for hierarchical jurisdiction management';

