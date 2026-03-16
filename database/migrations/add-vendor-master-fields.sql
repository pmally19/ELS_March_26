-- Migration: Add missing standard vendor master fields
-- This migration adds all missing fields to align with standard vendor master requirements
-- Date: 2025-01-28

-- Add vendor name and identification fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS legal_name character varying(200),
ADD COLUMN IF NOT EXISTS name_2 character varying(100),
ADD COLUMN IF NOT EXISTS name_3 character varying(100),
ADD COLUMN IF NOT EXISTS name_4 character varying(100),
ADD COLUMN IF NOT EXISTS search_term character varying(50),
ADD COLUMN IF NOT EXISTS sort_field character varying(50),
ADD COLUMN IF NOT EXISTS title character varying(20),
ADD COLUMN IF NOT EXISTS account_group character varying(20),
ADD COLUMN IF NOT EXISTS industry_key character varying(10),
ADD COLUMN IF NOT EXISTS industry_classification character varying(50);

-- Add tax information fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS tax_id_2 character varying(50),
ADD COLUMN IF NOT EXISTS tax_id_3 character varying(50),
ADD COLUMN IF NOT EXISTS tax_office character varying(100),
ADD COLUMN IF NOT EXISTS vat_number character varying(50),
ADD COLUMN IF NOT EXISTS fiscal_address text,
ADD COLUMN IF NOT EXISTS registration_number character varying(50);

-- Add extended address fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS address_2 text,
ADD COLUMN IF NOT EXISTS address_3 text,
ADD COLUMN IF NOT EXISTS address_4 text,
ADD COLUMN IF NOT EXISTS address_5 text,
ADD COLUMN IF NOT EXISTS district character varying(100),
ADD COLUMN IF NOT EXISTS po_box character varying(50),
ADD COLUMN IF NOT EXISTS po_box_postal_code character varying(20),
ADD COLUMN IF NOT EXISTS county character varying(100),
ADD COLUMN IF NOT EXISTS time_zone character varying(50),
ADD COLUMN IF NOT EXISTS tax_jurisdiction character varying(50);

-- Add financial and payment fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS alternative_payee character varying(50),
ADD COLUMN IF NOT EXISTS payment_block character varying(10),
ADD COLUMN IF NOT EXISTS house_bank character varying(10),
ADD COLUMN IF NOT EXISTS check_double_invoice boolean DEFAULT false;

-- Add extended banking fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS bank_name character varying(100),
ADD COLUMN IF NOT EXISTS bank_routing_number character varying(50),
ADD COLUMN IF NOT EXISTS swift_code character varying(20),
ADD COLUMN IF NOT EXISTS iban character varying(34),
ADD COLUMN IF NOT EXISTS bank_country character varying(2),
ADD COLUMN IF NOT EXISTS bank_key character varying(50),
ADD COLUMN IF NOT EXISTS account_type character varying(20),
ADD COLUMN IF NOT EXISTS bank_type_key character varying(10);

-- Add authorization and organization fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS authorization_group character varying(20),
ADD COLUMN IF NOT EXISTS corporate_group character varying(50);

-- Add withholding tax fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS withholding_tax_country character varying(2),
ADD COLUMN IF NOT EXISTS withholding_tax_type character varying(10),
ADD COLUMN IF NOT EXISTS withholding_tax_code character varying(10),
ADD COLUMN IF NOT EXISTS withholding_tax_liable boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS exemption_number character varying(50),
ADD COLUMN IF NOT EXISTS exemption_percentage numeric(5,2),
ADD COLUMN IF NOT EXISTS exemption_reason character varying(10),
ADD COLUMN IF NOT EXISTS exemption_from date,
ADD COLUMN IF NOT EXISTS exemption_to date;

-- Add blocking and status management fields
ALTER TABLE public.vendors 
ADD COLUMN IF NOT EXISTS central_posting_block boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS central_deletion_flag boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS posting_block_company_code boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_flag_company_code boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS posting_block_purchasing_org boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS deletion_flag_purchasing_org boolean DEFAULT false;

-- Add comments for documentation
COMMENT ON COLUMN public.vendors.name_2 IS 'Additional vendor name line 2';
COMMENT ON COLUMN public.vendors.name_3 IS 'Additional vendor name line 3';
COMMENT ON COLUMN public.vendors.name_4 IS 'Additional vendor name line 4';
COMMENT ON COLUMN public.vendors.search_term IS 'Search term for vendor lookup';
COMMENT ON COLUMN public.vendors.sort_field IS 'Sort field for vendor lists';
COMMENT ON COLUMN public.vendors.account_group IS 'Account group classification';
COMMENT ON COLUMN public.vendors.industry_key IS 'Industry classification key';
COMMENT ON COLUMN public.vendors.tax_id_2 IS 'Tax ID number 2';
COMMENT ON COLUMN public.vendors.tax_id_3 IS 'Tax ID number 3';
COMMENT ON COLUMN public.vendors.tax_office IS 'Tax office jurisdiction';
COMMENT ON COLUMN public.vendors.fiscal_address IS 'Fiscal/tax address';
COMMENT ON COLUMN public.vendors.address_2 IS 'Street address line 2';
COMMENT ON COLUMN public.vendors.address_3 IS 'Street address line 3';
COMMENT ON COLUMN public.vendors.address_4 IS 'Street address line 4';
COMMENT ON COLUMN public.vendors.address_5 IS 'Street address line 5';
COMMENT ON COLUMN public.vendors.po_box IS 'Post office box';
COMMENT ON COLUMN public.vendors.po_box_postal_code IS 'PO Box postal code';
COMMENT ON COLUMN public.vendors.tax_jurisdiction IS 'Tax jurisdiction code';
COMMENT ON COLUMN public.vendors.alternative_payee IS 'Alternative payee identifier';
COMMENT ON COLUMN public.vendors.payment_block IS 'Payment blocking indicator';
COMMENT ON COLUMN public.vendors.house_bank IS 'House bank identifier';
COMMENT ON COLUMN public.vendors.check_double_invoice IS 'Flag to check for duplicate invoices';
COMMENT ON COLUMN public.vendors.iban IS 'International Bank Account Number';
COMMENT ON COLUMN public.vendors.bank_country IS 'Bank country code';
COMMENT ON COLUMN public.vendors.bank_key IS 'Bank key/identifier';
COMMENT ON COLUMN public.vendors.account_type IS 'Account type (checking, savings, etc.)';
COMMENT ON COLUMN public.vendors.bank_type_key IS 'Bank type classification key';
COMMENT ON COLUMN public.vendors.authorization_group IS 'Authorization group for access control';
COMMENT ON COLUMN public.vendors.corporate_group IS 'Corporate group identifier';
COMMENT ON COLUMN public.vendors.withholding_tax_country IS 'Country code for withholding tax';
COMMENT ON COLUMN public.vendors.withholding_tax_type IS 'Type of withholding tax';
COMMENT ON COLUMN public.vendors.withholding_tax_code IS 'Withholding tax code';
COMMENT ON COLUMN public.vendors.withholding_tax_liable IS 'Withholding tax liable flag';
COMMENT ON COLUMN public.vendors.exemption_number IS 'Tax exemption certificate number';
COMMENT ON COLUMN public.vendors.exemption_percentage IS 'Exemption percentage';
COMMENT ON COLUMN public.vendors.exemption_reason IS 'Reason code for exemption';
COMMENT ON COLUMN public.vendors.exemption_from IS 'Exemption valid from date';
COMMENT ON COLUMN public.vendors.exemption_to IS 'Exemption valid to date';
COMMENT ON COLUMN public.vendors.central_posting_block IS 'Central posting block';
COMMENT ON COLUMN public.vendors.central_deletion_flag IS 'Central deletion flag';
COMMENT ON COLUMN public.vendors.posting_block_company_code IS 'Posting block at company code level';
COMMENT ON COLUMN public.vendors.deletion_flag_company_code IS 'Deletion flag at company code level';
COMMENT ON COLUMN public.vendors.posting_block_purchasing_org IS 'Posting block at purchasing org level';
COMMENT ON COLUMN public.vendors.deletion_flag_purchasing_org IS 'Deletion flag at purchasing org level';

