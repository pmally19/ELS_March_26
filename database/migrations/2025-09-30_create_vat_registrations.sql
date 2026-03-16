-- VAT Registrations table (based on VATRegistration UI)
-- Safeguard: create table only if it doesn't already exist

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'vat_registrations'
  ) THEN
    CREATE TABLE public.vat_registrations (
      id                   SERIAL PRIMARY KEY,
      registration_key     VARCHAR(20) NOT NULL,
      company_code_id      INTEGER NULL REFERENCES public.company_codes(id) ON UPDATE CASCADE ON DELETE SET NULL,
      country              VARCHAR(3) NOT NULL,
      vat_number           VARCHAR(20) NOT NULL,
      tax_type             VARCHAR(20) NOT NULL DEFAULT 'VAT',
      valid_from           DATE NOT NULL,
      valid_to             DATE NULL,
      tax_office           VARCHAR(50) NULL,
      tax_officer_name     VARCHAR(50) NULL,
      exemption_certificate VARCHAR(20) NULL,
      active_status        BOOLEAN NOT NULL DEFAULT TRUE,
      created_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW(),
      updated_at           TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT NOW()
    );

    -- Uniqueness: a registration key should be unique
    CREATE UNIQUE INDEX vat_registrations_registration_key_key 
      ON public.vat_registrations (registration_key);

    -- Prevent duplicate VAT numbers per company and country
    CREATE UNIQUE INDEX vat_registrations_company_country_vat_uniq
      ON public.vat_registrations (COALESCE(company_code_id, -1), country, vat_number);

    -- Helpful lookups
    CREATE INDEX vat_registrations_company_idx ON public.vat_registrations (company_code_id);
    CREATE INDEX vat_registrations_country_idx ON public.vat_registrations (country);
  END IF;
END $$;


