--
-- PostgreSQL database dump
--

-- Dumped from database version 16.9
-- Dumped by pg_dump version 16.5

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: drizzle; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA drizzle;


--
-- Name: approval_status; Type: TYPE; Schema: public; Owner: -
--

CREATE TYPE public.approval_status AS ENUM (
    'draft',
    'pending_approval',
    'approved',
    'rejected',
    'superseded'
);


--
-- Name: generate_change_number(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.generate_change_number() RETURNS character varying
    LANGUAGE plpgsql
    AS $$
DECLARE
    next_val BIGINT;
    change_num VARCHAR(20);
BEGIN
    next_val := nextval('change_document_number_seq');
    change_num := 'CHG' || LPAD(next_val::TEXT, 10, '0');
    RETURN change_num;
END;
$$;


--
-- Name: update_module_health(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_module_health() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    INSERT INTO module_health_status (
        module_name, health_score, total_issues, critical_issues,
        resolved_issues, last_check
    )
    SELECT 
        NEW.module,
        CASE 
            WHEN COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END) > 0 THEN 25.0
            WHEN COUNT(CASE WHEN severity = 'HIGH' THEN 1 END) > 5 THEN 50.0
            WHEN COUNT(CASE WHEN severity = 'MEDIUM' THEN 1 END) > 10 THEN 75.0
            ELSE 100.0
        END,
        COUNT(*),
        COUNT(CASE WHEN severity = 'CRITICAL' THEN 1 END),
        COUNT(CASE WHEN status = 'RESOLVED' THEN 1 END),
        CURRENT_TIMESTAMP
    FROM comprehensive_issues_log
    WHERE module = NEW.module
    GROUP BY module
    ON CONFLICT (module_name) DO UPDATE SET
        health_score = EXCLUDED.health_score,
        total_issues = EXCLUDED.total_issues,
        critical_issues = EXCLUDED.critical_issues,
        resolved_issues = EXCLUDED.resolved_issues,
        last_check = EXCLUDED.last_check;
    
    RETURN NEW;
END;
$$;


--
-- Name: update_updated_at_column(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger
    LANGUAGE plpgsql
    AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: __drizzle_migrations; Type: TABLE; Schema: drizzle; Owner: -
--

CREATE TABLE drizzle.__drizzle_migrations (
    id integer NOT NULL,
    hash text NOT NULL,
    created_at bigint
);


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE; Schema: drizzle; Owner: -
--

CREATE SEQUENCE drizzle.__drizzle_migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: __drizzle_migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: drizzle; Owner: -
--

ALTER SEQUENCE drizzle.__drizzle_migrations_id_seq OWNED BY drizzle.__drizzle_migrations.id;


--
-- Name: account_determination; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_determination (
    id integer NOT NULL,
    account_key character varying(3) NOT NULL,
    customer_group character varying(2) DEFAULT '01'::character varying,
    material_group character varying(2) DEFAULT '03'::character varying,
    gl_account character varying(10) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: account_determination_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_determination_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_determination_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_determination_id_seq OWNED BY public.account_determination.id;


--
-- Name: account_determination_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_determination_rules (
    id integer NOT NULL,
    material_category character varying(10) NOT NULL,
    movement_type character varying(10) NOT NULL,
    valuation_class character varying(10) NOT NULL,
    plant character varying(10),
    debit_account character varying(10) NOT NULL,
    credit_account character varying(10) NOT NULL,
    cost_center character varying(10),
    profit_center character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: account_determination_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_determination_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_determination_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_determination_rules_id_seq OWNED BY public.account_determination_rules.id;


--
-- Name: account_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.account_groups (
    id integer NOT NULL,
    chart_id character varying(10) NOT NULL,
    group_name character varying(50) NOT NULL,
    account_range_from character varying(10),
    account_range_to character varying(10),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: account_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.account_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: account_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.account_groups_id_seq OWNED BY public.account_groups.id;


--
-- Name: accounting_document_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_document_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    line_item integer NOT NULL,
    gl_account character varying(10) NOT NULL,
    account_type character varying(1) DEFAULT 'S'::character varying,
    partner_id integer,
    debit_amount numeric(15,2) DEFAULT 0,
    credit_amount numeric(15,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    assignment character varying(20),
    item_text character varying(100),
    tax_code character varying(2),
    due_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: accounting_document_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounting_document_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounting_document_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounting_document_items_id_seq OWNED BY public.accounting_document_items.id;


--
-- Name: accounting_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounting_documents (
    id integer NOT NULL,
    document_number character varying(20) NOT NULL,
    company_code character varying(4) DEFAULT '1000'::character varying,
    fiscal_year integer DEFAULT EXTRACT(year FROM CURRENT_DATE),
    document_type character varying(2) NOT NULL,
    posting_date date NOT NULL,
    document_date date NOT NULL,
    period integer DEFAULT EXTRACT(month FROM CURRENT_DATE),
    reference character varying(50),
    header_text character varying(100),
    total_amount numeric(15,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    source_module character varying(10),
    source_document_id integer,
    source_document_type character varying(20),
    created_by integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: accounting_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounting_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounting_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounting_documents_id_seq OWNED BY public.accounting_documents.id;


--
-- Name: accounts_payable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_payable (
    id integer NOT NULL,
    vendor_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency_id integer,
    company_code_id integer,
    plant_id integer,
    purchase_order_id integer,
    payment_terms character varying(50),
    status character varying(20) DEFAULT 'Open'::character varying,
    payment_date date,
    payment_reference character varying(100),
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    net_amount numeric(15,2) NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: accounts_payable_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_payable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_payable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_payable_id_seq OWNED BY public.accounts_payable.id;


--
-- Name: accounts_receivable; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.accounts_receivable (
    id integer NOT NULL,
    customer_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency_id integer,
    company_code_id integer,
    plant_id integer,
    sales_order_id integer,
    payment_terms character varying(50),
    status character varying(20) DEFAULT 'Open'::character varying,
    payment_date date,
    payment_reference character varying(100),
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    net_amount numeric(15,2) NOT NULL,
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    invoice_amount numeric(15,2) DEFAULT 0,
    tax_rate numeric(5,2) DEFAULT 0,
    payment_amount numeric(15,2) DEFAULT 0
);


--
-- Name: accounts_receivable_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.accounts_receivable_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: accounts_receivable_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.accounts_receivable_id_seq OWNED BY public.accounts_receivable.id;


--
-- Name: activity_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.activity_types (
    id integer NOT NULL,
    activity_type character varying(10) NOT NULL,
    description character varying(100) NOT NULL,
    unit_of_measure character varying(3) NOT NULL,
    category character varying(20) NOT NULL,
    controlling_area character varying(4) NOT NULL,
    allocation_method character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: activity_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.activity_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: activity_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.activity_types_id_seq OWNED BY public.activity_types.id;


--
-- Name: agent_access_controls; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_access_controls (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    agent_id uuid NOT NULL,
    agent_type character varying(20) NOT NULL,
    can_delete_data boolean DEFAULT false NOT NULL,
    can_update_data boolean DEFAULT false NOT NULL,
    can_modify_ui boolean DEFAULT false NOT NULL,
    can_create_tables boolean DEFAULT false NOT NULL,
    restricted_domains jsonb DEFAULT '[]'::jsonb,
    approval_required boolean DEFAULT true NOT NULL,
    last_modified_by character varying(50) NOT NULL,
    modification_reason text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    access_valid_from timestamp without time zone DEFAULT now(),
    access_valid_to timestamp without time zone,
    business_justification text,
    risk_assessment text,
    automatic_revocation boolean DEFAULT false,
    notification_sent boolean DEFAULT false
);


--
-- Name: agent_player_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_player_interactions (
    id character varying NOT NULL,
    initiator_player_id character varying,
    target_player_id character varying,
    interaction_type character varying(50) NOT NULL,
    business_context character varying(100) NOT NULL,
    exchanged_data jsonb,
    status character varying(20) DEFAULT 'pending'::character varying,
    completed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_player_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_player_reports (
    id character varying NOT NULL,
    player_id character varying,
    report_type character varying(50) NOT NULL,
    report_data jsonb,
    compliance_score integer,
    recommended_actions jsonb,
    generated_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_player_validations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_player_validations (
    id character varying NOT NULL,
    player_id character varying,
    configuration_area character varying(100) NOT NULL,
    validation_type character varying(50) NOT NULL,
    validation_rule text NOT NULL,
    expected_value text,
    current_value text,
    compliance_status character varying(20) DEFAULT 'pending'::character varying,
    last_checked timestamp without time zone,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: agent_players; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.agent_players (
    id character varying NOT NULL,
    name character varying(100) NOT NULL,
    business_domain character varying(50) NOT NULL,
    player_type character varying(30) NOT NULL,
    configuration_access jsonb,
    standards_framework jsonb,
    neighbor_domains jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: ai_agent_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_analytics (
    id integer NOT NULL,
    module_type character varying(50) NOT NULL,
    date date DEFAULT CURRENT_DATE,
    total_queries integer DEFAULT 0,
    successful_queries integer DEFAULT 0,
    failed_queries integer DEFAULT 0,
    avg_response_time numeric(10,2),
    total_tokens_used integer DEFAULT 0,
    unique_users integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: ai_agent_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_agent_analytics_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_agent_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_agent_analytics_id_seq OWNED BY public.ai_agent_analytics.id;


--
-- Name: ai_agent_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_configs (
    id integer NOT NULL,
    module_type character varying(50) NOT NULL,
    module_name character varying(100) NOT NULL,
    agent_name character varying(100) NOT NULL,
    role_description text NOT NULL,
    system_prompt text NOT NULL,
    expertise_areas jsonb NOT NULL,
    capabilities jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: ai_agent_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_agent_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_agent_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_agent_configs_id_seq OWNED BY public.ai_agent_configs.id;


--
-- Name: ai_agent_health; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_health (
    id integer NOT NULL,
    check_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    openai_status character varying(20) NOT NULL,
    api_key_status character varying(20) NOT NULL,
    total_agents integer NOT NULL,
    active_agents integer NOT NULL,
    response_time integer,
    error_details jsonb,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ai_agent_health_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_agent_health_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_agent_health_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_agent_health_id_seq OWNED BY public.ai_agent_health.id;


--
-- Name: ai_agent_interventions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_interventions (
    id bigint NOT NULL,
    issue_id uuid NOT NULL,
    agent_name character varying(200) NOT NULL,
    agent_type character varying(50) NOT NULL,
    analysis_result jsonb NOT NULL,
    recommended_actions jsonb NOT NULL,
    confidence_score numeric(3,2),
    execution_status character varying(20) DEFAULT 'PENDING'::character varying,
    execution_start timestamp with time zone,
    execution_end timestamp with time zone,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_agent_interventions_confidence_score_check CHECK (((confidence_score >= (0)::numeric) AND (confidence_score <= (1)::numeric))),
    CONSTRAINT ai_agent_interventions_execution_status_check CHECK (((execution_status)::text = ANY ((ARRAY['PENDING'::character varying, 'EXECUTING'::character varying, 'COMPLETED'::character varying, 'FAILED'::character varying])::text[])))
);


--
-- Name: TABLE ai_agent_interventions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_agent_interventions IS 'Tracks AI agent analysis and intervention attempts for issues';


--
-- Name: ai_agent_interventions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_agent_interventions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_agent_interventions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_agent_interventions_id_seq OWNED BY public.ai_agent_interventions.id;


--
-- Name: ai_agent_performance; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_agent_performance (
    id bigint NOT NULL,
    agent_name character varying(200) NOT NULL,
    agent_type character varying(50) NOT NULL,
    performance_date date DEFAULT CURRENT_DATE NOT NULL,
    total_interventions integer DEFAULT 0,
    successful_interventions integer DEFAULT 0,
    failed_interventions integer DEFAULT 0,
    avg_confidence_score numeric(3,2) DEFAULT 0.00,
    avg_resolution_time integer DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0.00,
    pattern_matches integer DEFAULT 0,
    new_patterns_learned integer DEFAULT 0,
    accuracy_improvement numeric(5,2) DEFAULT 0.00,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE ai_agent_performance; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.ai_agent_performance IS 'Performance tracking and learning metrics for AI agents';


--
-- Name: ai_agent_performance_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_agent_performance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_agent_performance_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_agent_performance_id_seq OWNED BY public.ai_agent_performance.id;


--
-- Name: ai_chat_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_messages (
    id integer NOT NULL,
    session_id uuid NOT NULL,
    message_type character varying(20) NOT NULL,
    content text NOT NULL,
    agent_name character varying(100),
    context_data jsonb,
    api_response_time integer,
    tokens_used integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_chat_messages_message_type_check CHECK (((message_type)::text = ANY ((ARRAY['user'::character varying, 'agent'::character varying])::text[])))
);


--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_chat_messages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_chat_messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_chat_messages_id_seq OWNED BY public.ai_chat_messages.id;


--
-- Name: ai_chat_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_chat_sessions (
    id integer NOT NULL,
    session_id uuid DEFAULT gen_random_uuid(),
    module_type character varying(50) NOT NULL,
    user_id integer,
    user_role character varying(50),
    context_data jsonb,
    session_start timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    session_end timestamp with time zone,
    is_active boolean DEFAULT true,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ai_chat_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_chat_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_chat_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_chat_sessions_id_seq OWNED BY public.ai_chat_sessions.id;


--
-- Name: ai_data_analysis_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_data_analysis_sessions (
    id integer NOT NULL,
    session_id uuid DEFAULT gen_random_uuid(),
    module_type character varying(50) NOT NULL,
    analysis_type character varying(50) NOT NULL,
    input_data jsonb NOT NULL,
    analysis_result text,
    insights jsonb,
    recommendations jsonb,
    user_id integer,
    processing_time integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    completed_at timestamp with time zone,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ai_data_analysis_sessions_status_check CHECK (((status)::text = ANY ((ARRAY['pending'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])))
);


--
-- Name: ai_data_analysis_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ai_data_analysis_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ai_data_analysis_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ai_data_analysis_sessions_id_seq OWNED BY public.ai_data_analysis_sessions.id;


--
-- Name: ap_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_invoices (
    id integer NOT NULL,
    vendor_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    due_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    description text,
    purchase_order_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ap_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ap_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ap_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ap_invoices_id_seq OWNED BY public.ap_invoices.id;


--
-- Name: ap_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ap_payments (
    id integer NOT NULL,
    invoice_id integer,
    amount numeric(15,2) NOT NULL,
    payment_method character varying(20) DEFAULT 'ACH'::character varying,
    status character varying(20) DEFAULT 'pending'::character varying,
    scheduled_date date NOT NULL,
    paid_date date,
    reference_number character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ap_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ap_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ap_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ap_payments_id_seq OWNED BY public.ap_payments.id;


--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.api_keys (
    id integer NOT NULL,
    service_name character varying(100) NOT NULL,
    key_name character varying(100) NOT NULL,
    key_value text NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    last_used timestamp with time zone,
    active boolean DEFAULT true
);


--
-- Name: TABLE api_keys; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.api_keys IS 'Secure storage for API keys and external service credentials';


--
-- Name: COLUMN api_keys.service_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.service_name IS 'Name of the service (e.g., openai, stripe, twilio)';


--
-- Name: COLUMN api_keys.key_name; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.key_name IS 'Environment variable name for the key';


--
-- Name: COLUMN api_keys.key_value; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.key_value IS 'Encrypted API key value';


--
-- Name: COLUMN api_keys.is_active; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.api_keys.is_active IS 'Whether the key is currently active and should be used';


--
-- Name: api_keys_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.api_keys_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: api_keys_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.api_keys_id_seq OWNED BY public.api_keys.id;


--
-- Name: approval_levels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.approval_levels (
    id integer NOT NULL,
    level integer NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    value_limit numeric(15,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: approval_levels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.approval_levels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: approval_levels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.approval_levels_id_seq OWNED BY public.approval_levels.id;


--
-- Name: ar_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_documents (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    invoice_id integer,
    document_type character varying(50) NOT NULL,
    document_name character varying(255) NOT NULL,
    file_path text,
    file_size integer,
    mime_type character varying(100),
    uploaded_by_user_id integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ar_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ar_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ar_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ar_documents_id_seq OWNED BY public.ar_documents.id;


--
-- Name: ar_payment_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ar_payment_applications (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    invoice_id integer NOT NULL,
    applied_amount numeric(15,2) NOT NULL,
    application_date timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text,
    created_by_user_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: ar_payment_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.ar_payment_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: ar_payment_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.ar_payment_applications_id_seq OWNED BY public.ar_payment_applications.id;


--
-- Name: asset_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.asset_master (
    id integer NOT NULL,
    asset_number character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    asset_class character varying(50),
    acquisition_date date,
    acquisition_cost numeric(15,2),
    current_value numeric(15,2),
    depreciation_method character varying(50),
    useful_life_years integer,
    company_code_id integer,
    cost_center_id integer,
    location character varying(100),
    status character varying(20),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: asset_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.asset_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: asset_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.asset_master_id_seq OWNED BY public.asset_master.id;


--
-- Name: assets; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.assets (
    id integer NOT NULL,
    asset_number character varying(12) NOT NULL,
    asset_class character varying(8) NOT NULL,
    description character varying(50) NOT NULL,
    company_code character varying(4) NOT NULL,
    cost_center character varying(10),
    plant character varying(4),
    location character varying(10),
    acquisition_date date,
    acquisition_value numeric(15,2) DEFAULT 0,
    accumulated_depreciation numeric(15,2) DEFAULT 0,
    book_value numeric(15,2) DEFAULT 0,
    useful_life integer,
    depreciation_key character varying(4),
    status character varying(1) DEFAULT 'A'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT check_acquisition_value_positive CHECK ((acquisition_value >= (0)::numeric))
);


--
-- Name: assets_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.assets_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.assets_id_seq OWNED BY public.assets.id;


--
-- Name: bank_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_accounts (
    id integer NOT NULL,
    account_number character varying(50) NOT NULL,
    account_name character varying(100) NOT NULL,
    bank_name character varying(100) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    current_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    available_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    account_type character varying(20) DEFAULT 'checking'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    company_code_id integer NOT NULL,
    gl_account_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    routing_number character varying(20),
    api_enabled boolean DEFAULT false,
    real_account boolean DEFAULT false,
    last_balance_update timestamp without time zone,
    bank_id integer
);


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_accounts_id_seq OWNED BY public.bank_accounts.id;


--
-- Name: bank_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_master (
    id integer NOT NULL,
    bank_key character varying(20) NOT NULL,
    bank_name character varying(100) NOT NULL,
    bank_number character varying(20) NOT NULL,
    swift_code character varying(11),
    country_code character varying(3),
    region character varying(50),
    city character varying(50),
    address text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    api_endpoint character varying(255),
    credentials_encrypted text,
    is_active boolean DEFAULT true
);


--
-- Name: bank_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_master_id_seq OWNED BY public.bank_master.id;


--
-- Name: bank_statement_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statement_items (
    id integer NOT NULL,
    statement_id integer NOT NULL,
    line_number integer NOT NULL,
    value_date date NOT NULL,
    posting_date date NOT NULL,
    amount numeric(15,2) NOT NULL,
    reference character varying(35),
    text character varying(50),
    partner_account character varying(34),
    partner_name character varying(35),
    cleared boolean DEFAULT false,
    document_number character varying(10)
);


--
-- Name: bank_statement_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_statement_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_statement_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_statement_items_id_seq OWNED BY public.bank_statement_items.id;


--
-- Name: bank_statements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_statements (
    id integer NOT NULL,
    statement_number character varying(20) NOT NULL,
    bank_account character varying(18) NOT NULL,
    house_bank character varying(5) NOT NULL,
    company_code character varying(4) NOT NULL,
    statement_date date NOT NULL,
    opening_balance numeric(15,2) NOT NULL,
    closing_balance numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(10) DEFAULT 'Open'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: bank_statements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_statements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_statements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_statements_id_seq OWNED BY public.bank_statements.id;


--
-- Name: bank_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bank_transactions (
    id integer NOT NULL,
    bank_account_id integer NOT NULL,
    transaction_date date NOT NULL,
    value_date date NOT NULL,
    reference_number character varying(50),
    description text NOT NULL,
    amount numeric(15,2) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'cleared'::character varying NOT NULL,
    reconciliation_status character varying(20) DEFAULT 'unmatched'::character varying NOT NULL,
    gl_document_number character varying(50),
    posting_key character varying(10),
    partner_bank character varying(100),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bank_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bank_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bank_transactions_id_seq OWNED BY public.bank_transactions.id;


--
-- Name: batch_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.batch_master (
    id integer NOT NULL,
    batch_number character varying(50) NOT NULL,
    material_id integer,
    plant_id integer,
    production_date date,
    expiry_date date,
    shelf_life_days integer,
    vendor_batch_number character varying(50),
    quality_status character varying(20) DEFAULT 'UNRESTRICTED'::character varying,
    available_quantity numeric(15,3),
    reserved_quantity numeric(15,3),
    blocked_quantity numeric(15,3),
    unit_of_measure character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: batch_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.batch_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: batch_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.batch_master_id_seq OWNED BY public.batch_master.id;


--
-- Name: bill_of_materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bill_of_materials (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    material_id integer NOT NULL,
    description text,
    version character varying(10) DEFAULT '1.0'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bill_of_materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bill_of_materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bill_of_materials_id_seq OWNED BY public.bill_of_materials.id;


--
-- Name: billing_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_documents (
    id integer NOT NULL,
    billing_number character varying(20) NOT NULL,
    billing_type character varying(4) DEFAULT 'F2'::character varying,
    sales_order_id integer,
    delivery_id integer,
    customer_id integer NOT NULL,
    billing_date date NOT NULL,
    due_date date,
    net_amount numeric(15,2) NOT NULL,
    tax_amount numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    posting_status character varying(20) DEFAULT 'OPEN'::character varying,
    accounting_document_number character varying(20),
    created_by integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: billing_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_documents_id_seq OWNED BY public.billing_documents.id;


--
-- Name: billing_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.billing_items (
    id integer NOT NULL,
    billing_id integer NOT NULL,
    line_item integer NOT NULL,
    sales_order_item_id integer,
    delivery_item_id integer,
    material_id integer NOT NULL,
    billing_quantity numeric(13,3) NOT NULL,
    unit character varying(3) DEFAULT 'EA'::character varying,
    unit_price numeric(15,2) NOT NULL,
    net_amount numeric(15,2) NOT NULL,
    tax_code character varying(2) DEFAULT 'V0'::character varying,
    tax_amount numeric(15,2) DEFAULT 0,
    account_key character varying(3) DEFAULT 'ERL'::character varying,
    gl_account character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: billing_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.billing_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: billing_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.billing_items_id_seq OWNED BY public.billing_items.id;


--
-- Name: bom_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.bom_items (
    id integer NOT NULL,
    bom_id integer NOT NULL,
    material_id integer NOT NULL,
    quantity numeric(10,3) NOT NULL,
    unit_cost numeric(15,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: bom_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.bom_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: bom_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.bom_items_id_seq OWNED BY public.bom_items.id;


--
-- Name: calculation_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.calculation_methods (
    id integer NOT NULL,
    method_code character varying(20) NOT NULL,
    method_name character varying(100) NOT NULL,
    calculation_type character varying(50) NOT NULL,
    formula_template text,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: calculation_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.calculation_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: calculation_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.calculation_methods_id_seq OWNED BY public.calculation_methods.id;


--
-- Name: cash_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cash_positions (
    id integer NOT NULL,
    company_code_id integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    cash_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    bank_balance numeric(15,2) DEFAULT 0.00 NOT NULL,
    total_liquidity numeric(15,2) DEFAULT 0.00 NOT NULL,
    last_updated timestamp without time zone DEFAULT now() NOT NULL,
    forecast_period character varying(20) DEFAULT 'daily'::character varying NOT NULL,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: cash_positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cash_positions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cash_positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cash_positions_id_seq OWNED BY public.cash_positions.id;


--
-- Name: categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.categories (
    id integer NOT NULL,
    name text NOT NULL,
    description text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.categories_id_seq OWNED BY public.categories.id;


--
-- Name: change_document_analytics; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_analytics (
    id bigint NOT NULL,
    analysis_date date DEFAULT CURRENT_DATE NOT NULL,
    object_class character varying(50) NOT NULL,
    application_module character varying(50) NOT NULL,
    total_changes integer DEFAULT 0,
    creates_count integer DEFAULT 0,
    updates_count integer DEFAULT 0,
    deletes_count integer DEFAULT 0,
    avg_fields_changed numeric(10,2),
    avg_approval_time interval,
    avg_processing_time interval,
    error_count integer DEFAULT 0,
    reversal_count integer DEFAULT 0,
    quality_score numeric(5,2),
    high_impact_changes integer DEFAULT 0,
    compliance_changes integer DEFAULT 0,
    emergency_changes integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE change_document_analytics; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_analytics IS 'Aggregated analytics and metrics for change document analysis';


--
-- Name: change_document_analytics_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_analytics_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_analytics_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_analytics_id_seq OWNED BY public.change_document_analytics.id;


--
-- Name: change_document_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_approvals (
    id bigint NOT NULL,
    change_document_id uuid NOT NULL,
    approval_level integer NOT NULL,
    approver_role character varying(50) NOT NULL,
    approver_name character varying(100),
    approval_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    approval_comments text,
    approval_timestamp timestamp with time zone,
    delegation_to character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT change_document_approvals_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying, 'DELEGATED'::character varying])::text[])))
);


--
-- Name: TABLE change_document_approvals; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_approvals IS 'Approval workflow tracking for change documents requiring authorization';


--
-- Name: change_document_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_approvals_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_approvals_id_seq OWNED BY public.change_document_approvals.id;


--
-- Name: change_document_attachments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_attachments (
    id bigint NOT NULL,
    change_document_id uuid NOT NULL,
    attachment_type character varying(50) NOT NULL,
    file_name character varying(500) NOT NULL,
    file_path text,
    file_size bigint,
    mime_type character varying(100),
    description text,
    uploaded_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE change_document_attachments; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_attachments IS 'Supporting documents and files related to change documents';


--
-- Name: change_document_attachments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_attachments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_attachments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_attachments_id_seq OWNED BY public.change_document_attachments.id;


--
-- Name: change_document_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_headers (
    id bigint NOT NULL,
    change_document_id uuid DEFAULT gen_random_uuid(),
    object_class character varying(50) NOT NULL,
    object_id character varying(100) NOT NULL,
    change_number character varying(20) DEFAULT public.generate_change_number() NOT NULL,
    user_name character varying(100) NOT NULL,
    user_role character varying(50),
    session_id character varying(100),
    transaction_code character varying(20),
    change_type character varying(20) NOT NULL,
    change_reason character varying(100),
    change_category character varying(50),
    change_date date DEFAULT CURRENT_DATE NOT NULL,
    change_time time without time zone DEFAULT CURRENT_TIME NOT NULL,
    change_timestamp timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    client_ip character varying(45),
    user_agent text,
    application_module character varying(50),
    business_process character varying(100),
    reference_document character varying(100),
    approval_status character varying(20) DEFAULT 'PENDING'::character varying,
    version_number integer DEFAULT 1,
    parent_change_id uuid,
    is_active boolean DEFAULT true,
    is_reversed boolean DEFAULT false,
    reversal_change_id uuid,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT change_document_headers_change_type_check CHECK (((change_type)::text = ANY ((ARRAY['CREATE'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'ACTIVATE'::character varying, 'DEACTIVATE'::character varying])::text[])))
);


--
-- Name: TABLE change_document_headers; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_headers IS 'Main change document table tracking all data modifications across the system';


--
-- Name: change_document_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_headers_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_headers_id_seq OWNED BY public.change_document_headers.id;


--
-- Name: change_document_number_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_number_seq
    START WITH 1000000
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_positions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_positions (
    id bigint NOT NULL,
    change_document_id uuid NOT NULL,
    position_number integer NOT NULL,
    table_name character varying(100) NOT NULL,
    field_name character varying(100) NOT NULL,
    field_label character varying(200),
    data_type character varying(50),
    old_value text,
    new_value text,
    old_value_formatted text,
    new_value_formatted text,
    value_unit character varying(20),
    value_currency character varying(10),
    value_language character varying(10),
    change_indicator character varying(10) NOT NULL,
    change_magnitude numeric(15,4),
    change_percentage numeric(5,2),
    reference_table character varying(100),
    reference_field character varying(100),
    reference_value character varying(200),
    data_quality_score integer,
    validation_status character varying(20) DEFAULT 'VALID'::character varying,
    validation_errors jsonb,
    business_impact character varying(20),
    requires_approval boolean DEFAULT false,
    compliance_flag boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT change_document_positions_business_impact_check CHECK (((business_impact)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT change_document_positions_change_indicator_check CHECK (((change_indicator)::text = ANY ((ARRAY['INSERT'::character varying, 'UPDATE'::character varying, 'DELETE'::character varying, 'MOVE'::character varying])::text[]))),
    CONSTRAINT change_document_positions_data_quality_score_check CHECK (((data_quality_score >= 0) AND (data_quality_score <= 100)))
);


--
-- Name: TABLE change_document_positions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_positions IS 'Detailed field-level changes for each change document';


--
-- Name: change_document_positions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_positions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_positions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_positions_id_seq OWNED BY public.change_document_positions.id;


--
-- Name: change_document_relations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_document_relations (
    id bigint NOT NULL,
    source_change_id uuid NOT NULL,
    target_change_id uuid NOT NULL,
    relation_type character varying(50) NOT NULL,
    relation_strength character varying(20) DEFAULT 'MEDIUM'::character varying,
    business_context text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE change_document_relations; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.change_document_relations IS 'Relationships and dependencies between different change documents';


--
-- Name: change_document_relations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.change_document_relations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: change_document_relations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.change_document_relations_id_seq OWNED BY public.change_document_relations.id;


--
-- Name: change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    requesting_agent_id uuid NOT NULL,
    coach_agent_id uuid NOT NULL,
    request_type character varying(50) NOT NULL,
    business_domain character varying(50) NOT NULL,
    change_description text NOT NULL,
    business_justification text NOT NULL,
    affected_systems jsonb NOT NULL,
    cross_domain_impact jsonb NOT NULL,
    risk_assessment jsonb NOT NULL,
    proposed_implementation text NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    coach_decision text,
    coach_justification text,
    implementation_plan jsonb,
    reviewed_at timestamp without time zone,
    implemented_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: chart_of_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chart_of_accounts (
    id integer NOT NULL,
    chart_id character varying(10) NOT NULL,
    description character varying(255) NOT NULL,
    account_length integer DEFAULT 6,
    maintenance_language character varying(2),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chart_of_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chart_of_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chart_of_accounts_id_seq OWNED BY public.chart_of_accounts.id;


--
-- Name: chief_agent_action_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_action_log (
    id integer NOT NULL,
    agent_id character varying(255) DEFAULT 'chief-agent-001'::character varying NOT NULL,
    action_type character varying(100) NOT NULL,
    entity_type character varying(100) NOT NULL,
    action_description text,
    request_data jsonb,
    success boolean NOT NULL,
    error_message text,
    user_context character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    entity_id character varying(255)
);


--
-- Name: chief_agent_action_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chief_agent_action_log_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chief_agent_action_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chief_agent_action_log_id_seq OWNED BY public.chief_agent_action_log.id;


--
-- Name: chief_agent_change_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_change_requests (
    id text NOT NULL,
    request_type text NOT NULL,
    origin_agent text NOT NULL,
    origin_agent_id text NOT NULL,
    business_domain text NOT NULL,
    title text NOT NULL,
    description text NOT NULL,
    business_justification text NOT NULL,
    change_scope text NOT NULL,
    target_table text,
    target_field text,
    current_value text,
    proposed_value text,
    impact_assessment text,
    urgency text DEFAULT 'medium'::text,
    status text DEFAULT 'pending'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: chief_agent_decision_audit; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_decision_audit (
    id text NOT NULL,
    change_request_id text NOT NULL,
    decision_type text NOT NULL,
    decision_maker text NOT NULL,
    decision text NOT NULL,
    reasoning text NOT NULL,
    business_documentation_reviewed jsonb,
    compliance_checks jsonb,
    risk_assessment jsonb,
    recommendations text,
    "timestamp" timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: chief_agent_human_interactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_human_interactions (
    id text NOT NULL,
    change_request_id text NOT NULL,
    interaction_type text NOT NULL,
    human_manager_id text,
    requested_action text NOT NULL,
    justification text NOT NULL,
    urgency_level text DEFAULT 'medium'::text,
    business_impact text,
    deadline timestamp without time zone,
    status text DEFAULT 'pending'::text NOT NULL,
    response text,
    response_timestamp timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: chief_agent_permissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_permissions (
    id integer NOT NULL,
    agent_id character varying(255) DEFAULT 'chief-agent-001'::character varying NOT NULL,
    can_create_vendors boolean DEFAULT true NOT NULL,
    can_create_customers boolean DEFAULT true NOT NULL,
    can_create_materials boolean DEFAULT true NOT NULL,
    can_create_sales_orders boolean DEFAULT true NOT NULL,
    can_create_fi_postings boolean DEFAULT true NOT NULL,
    can_delete_any_data boolean DEFAULT false NOT NULL,
    can_modify_ui boolean DEFAULT false NOT NULL,
    can_modify_system_config boolean DEFAULT false NOT NULL,
    restriction_level character varying(50) DEFAULT 'CREATE_ONLY'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    agent_role character varying(50) DEFAULT 'chief'::character varying,
    can_create_purchase_orders boolean DEFAULT true,
    can_create_products boolean DEFAULT true,
    can_create_gl_accounts boolean DEFAULT true,
    can_create_cost_centers boolean DEFAULT true,
    can_create_plants boolean DEFAULT true,
    can_create_storage_locations boolean DEFAULT true,
    can_create_company_codes boolean DEFAULT true,
    can_create_business_areas boolean DEFAULT true,
    can_create_profit_centers boolean DEFAULT true,
    can_update_master_data boolean DEFAULT true,
    can_read_all_data boolean DEFAULT true,
    can_modify_permissions boolean DEFAULT false,
    can_access_system_logs boolean DEFAULT false,
    can_modify_database boolean DEFAULT false,
    can_create_employees boolean DEFAULT true,
    can_create_invoices boolean DEFAULT true,
    can_create_journal_entries boolean DEFAULT true,
    can_create_payments boolean DEFAULT true,
    can_create_inventory_transactions boolean DEFAULT true,
    can_create_production_orders boolean DEFAULT true,
    can_create_bom boolean DEFAULT true,
    can_create_work_centers boolean DEFAULT true,
    can_create_receipts boolean DEFAULT true,
    can_view_financial_reports boolean DEFAULT true,
    can_view_dashboards boolean DEFAULT true,
    can_update_vendor_details boolean DEFAULT true,
    can_update_customer_details boolean DEFAULT true,
    can_update_product_details boolean DEFAULT true,
    can_update_order_status boolean DEFAULT true,
    can_update_pricing boolean DEFAULT true,
    can_update_approval_levels boolean DEFAULT true,
    can_update_inventory_levels boolean DEFAULT true,
    can_update_prices boolean DEFAULT true
);


--
-- Name: chief_agent_permissions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.chief_agent_permissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: chief_agent_permissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.chief_agent_permissions_id_seq OWNED BY public.chief_agent_permissions.id;


--
-- Name: chief_agent_system_monitoring; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.chief_agent_system_monitoring (
    id text NOT NULL,
    monitoring_type text NOT NULL,
    business_domain text NOT NULL,
    component text NOT NULL,
    status text NOT NULL,
    health_score integer,
    metrics jsonb,
    alerts jsonb,
    recommendations text,
    created_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: clearing_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clearing_configurations (
    id integer NOT NULL,
    company_code character varying(4) NOT NULL,
    account_type character varying(1) NOT NULL,
    gl_account character varying(10),
    tolerance_group character varying(4),
    sort_criteria character varying(20),
    active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clearing_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clearing_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clearing_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clearing_configurations_id_seq OWNED BY public.clearing_configurations.id;


--
-- Name: clearing_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.clearing_items (
    id integer NOT NULL,
    clearing_number character varying(20) NOT NULL,
    company_code character varying(4) NOT NULL,
    account_number character varying(10) NOT NULL,
    document_number character varying(10) NOT NULL,
    line_item integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(3) NOT NULL,
    clearing_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: clearing_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.clearing_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: clearing_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.clearing_items_id_seq OWNED BY public.clearing_items.id;


--
-- Name: client_DEMO_CLIENT_sd_condition_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_condition_types" (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    condition_class character varying(1) NOT NULL,
    calculation_type character varying(1) NOT NULL,
    access_sequence character varying(4),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_condition_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_condition_types" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_condition_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_distribution_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_distribution_channels" (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_distribution_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_distribution_channels" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_distribution_channels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_divisions" (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_divisions" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_divisions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_document_types" (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    category character varying(10) NOT NULL,
    number_range character varying(2),
    document_flow jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_document_types" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_document_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_pricing_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_pricing_procedures" (
    id integer NOT NULL,
    code character varying(6) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_pricing_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_pricing_procedures" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_pricing_procedures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_sales_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_sales_areas" (
    id integer NOT NULL,
    sales_org_code character varying(4) NOT NULL,
    distribution_channel_code character varying(2) NOT NULL,
    division_code character varying(2) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_sales_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_sales_areas" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_sales_areas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_DEMO_CLIENT_sd_sales_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_DEMO_CLIENT_sd_sales_organizations" (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    company_code_id integer,
    currency character varying(3) NOT NULL,
    region character varying(50),
    distribution_channel character varying(50),
    industry character varying(50),
    address text,
    city character varying(50),
    state character varying(50),
    country character varying(50),
    postal_code character varying(20),
    phone character varying(30),
    email character varying(100),
    manager character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    version integer DEFAULT 1,
    active boolean DEFAULT true,
    custom_fields jsonb
);


--
-- Name: client_DEMO_CLIENT_sd_sales_organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_DEMO_CLIENT_sd_sales_organizations" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_DEMO_CLIENT_sd_sales_organizations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_condition_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_condition_types" (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    condition_class character varying(1) NOT NULL,
    calculation_type character varying(1) NOT NULL,
    access_sequence character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_condition_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_condition_types" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_condition_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_distribution_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_distribution_channels" (
    id integer NOT NULL,
    code character varying(5) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_distribution_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_distribution_channels" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_distribution_channels_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_divisions" (
    id integer NOT NULL,
    code character varying(5) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_divisions" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_divisions_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_document_types" (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(10) NOT NULL,
    number_range character varying(2),
    document_flow jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_document_types" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_document_types_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_pricing_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_pricing_procedures" (
    id integer NOT NULL,
    code character varying(6) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_pricing_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_pricing_procedures" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_pricing_procedures_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_sales_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_sales_areas" (
    id integer NOT NULL,
    sales_org_code character varying(20) NOT NULL,
    distribution_channel_code character varying(5) NOT NULL,
    division_code character varying(5) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_sales_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_sales_areas" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_sales_areas_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: client_TEST_CLIENT_sd_sales_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public."client_TEST_CLIENT_sd_sales_organizations" (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    company_code_id integer,
    currency character varying(3) NOT NULL,
    region character varying(50),
    distribution_channel character varying(50),
    industry character varying(50),
    address text,
    city character varying(50),
    state character varying(50),
    country character varying(50),
    postal_code character varying(20),
    phone character varying(30),
    email character varying(100),
    manager character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_at timestamp without time zone DEFAULT now(),
    updated_by integer,
    version integer DEFAULT 1,
    active boolean DEFAULT true,
    custom_fields jsonb
);


--
-- Name: client_TEST_CLIENT_sd_sales_organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public."client_TEST_CLIENT_sd_sales_organizations" ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public."client_TEST_CLIENT_sd_sales_organizations_id_seq"
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: coach_agents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_agents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(100) NOT NULL,
    role character varying(50) DEFAULT 'system_coach'::character varying NOT NULL,
    responsibilities jsonb NOT NULL,
    oversight_scope jsonb NOT NULL,
    decision_authority jsonb NOT NULL,
    cross_domain_knowledge jsonb NOT NULL,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: coach_decisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.coach_decisions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    coach_agent_id uuid NOT NULL,
    change_request_id uuid,
    decision_type character varying(50) NOT NULL,
    decision_summary text NOT NULL,
    cross_domain_analysis jsonb NOT NULL,
    project_justification text NOT NULL,
    affected_domains jsonb NOT NULL,
    risk_mitigation jsonb,
    implementation_guidance text,
    follow_up_required boolean DEFAULT false NOT NULL,
    follow_up_date timestamp without time zone,
    decision_impact character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: collection_activities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.collection_activities (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    invoice_id integer,
    activity_type character varying(50) NOT NULL,
    activity_date timestamp without time zone NOT NULL,
    description text NOT NULL,
    outcome character varying(100),
    next_action_date timestamp without time zone,
    assigned_to_user_id integer,
    is_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: collection_activities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.collection_activities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: collection_activities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.collection_activities_id_seq OWNED BY public.collection_activities.id;


--
-- Name: companies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.companies (
    id integer NOT NULL,
    company_id character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    address text,
    country character varying(2),
    currency character varying(3),
    language character varying(2),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: companies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.companies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: companies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.companies_id_seq OWNED BY public.companies.id;


--
-- Name: company_code_chart_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_code_chart_assignments (
    id integer NOT NULL,
    company_code_id integer,
    chart_of_accounts_id integer,
    fiscal_year_variant_id integer,
    assigned_date timestamp without time zone DEFAULT now() NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: company_code_chart_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_code_chart_assignments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_code_chart_assignments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_code_chart_assignments_id_seq OWNED BY public.company_code_chart_assignments.id;


--
-- Name: company_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.company_codes (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    city character varying(100),
    country character varying(100),
    currency character varying(3),
    language character varying(50),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    fiscal_year_variant_id integer
);


--
-- Name: company_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.company_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: company_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.company_codes_id_seq OWNED BY public.company_codes.id;


--
-- Name: comprehensive_issues_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.comprehensive_issues_log (
    id bigint NOT NULL,
    issue_id uuid DEFAULT gen_random_uuid(),
    error_message text NOT NULL,
    stack_trace text,
    module character varying(100) NOT NULL,
    operation character varying(200) NOT NULL,
    user_id character varying(100),
    session_id character varying(100),
    request_data jsonb,
    severity character varying(20) NOT NULL,
    category character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'OPEN'::character varying,
    resolved_at timestamp with time zone,
    resolved_by character varying(50),
    additional_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    auto_resolvable boolean DEFAULT false,
    confidence_score numeric(3,2) DEFAULT 0.0,
    pattern_matched jsonb,
    recommended_actions jsonb,
    ai_analysis jsonb,
    business_context text,
    user_impact text,
    resolution_status character varying(20) DEFAULT 'PENDING'::character varying,
    CONSTRAINT comprehensive_issues_log_category_check CHECK (((category)::text = ANY ((ARRAY['MASTER_DATA'::character varying, 'TRANSACTION'::character varying, 'SYSTEM'::character varying, 'API'::character varying, 'DATABASE'::character varying, 'VALIDATION'::character varying])::text[]))),
    CONSTRAINT comprehensive_issues_log_severity_check CHECK (((severity)::text = ANY ((ARRAY['LOW'::character varying, 'MEDIUM'::character varying, 'HIGH'::character varying, 'CRITICAL'::character varying])::text[]))),
    CONSTRAINT comprehensive_issues_log_status_check CHECK (((status)::text = ANY ((ARRAY['OPEN'::character varying, 'IN_PROGRESS'::character varying, 'RESOLVED'::character varying, 'ESCALATED'::character varying])::text[])))
);


--
-- Name: TABLE comprehensive_issues_log; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.comprehensive_issues_log IS 'Central logging for all system issues with comprehensive context tracking';


--
-- Name: comprehensive_issues_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.comprehensive_issues_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: comprehensive_issues_log_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.comprehensive_issues_log_id_seq OWNED BY public.comprehensive_issues_log.id;


--
-- Name: condition_access_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_access_rules (
    id integer NOT NULL,
    condition_type_id integer NOT NULL,
    access_type character varying(50) NOT NULL,
    user_role character varying(100),
    user_id integer,
    plant_id integer,
    sales_org_id integer,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: condition_access_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_access_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_access_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_access_rules_id_seq OWNED BY public.condition_access_rules.id;


--
-- Name: condition_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_categories (
    id integer NOT NULL,
    category_code character varying(20) NOT NULL,
    category_name character varying(100) NOT NULL,
    category_type character varying(50) NOT NULL,
    description text,
    sort_order integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: condition_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_categories_id_seq OWNED BY public.condition_categories.id;


--
-- Name: condition_dependencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_dependencies (
    id integer NOT NULL,
    parent_condition_id integer NOT NULL,
    dependent_condition_id integer NOT NULL,
    dependency_type character varying(50) NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: condition_dependencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_dependencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_dependencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_dependencies_id_seq OWNED BY public.condition_dependencies.id;


--
-- Name: condition_records; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_records (
    id integer NOT NULL,
    condition_type character varying(4) NOT NULL,
    material_id integer,
    customer_id integer,
    sales_organization character varying(4),
    valid_from date DEFAULT CURRENT_DATE,
    valid_to date DEFAULT '2099-12-31'::date,
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    unit character varying(3),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: condition_records_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_records_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_records_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_records_id_seq OWNED BY public.condition_records.id;


--
-- Name: condition_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.condition_types (
    id integer NOT NULL,
    condition_code character varying(20) NOT NULL,
    condition_name character varying(100) NOT NULL,
    condition_category character varying(50) NOT NULL,
    calculation_type character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    company_code_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    default_value numeric(15,4),
    min_value numeric(15,4),
    max_value numeric(15,4),
    sequence_number integer DEFAULT 1,
    is_mandatory boolean DEFAULT false,
    category_id integer,
    calculation_method_id integer,
    tax_jurisdiction_id integer,
    applies_to_line_items boolean DEFAULT true,
    applies_to_header boolean DEFAULT false,
    rounding_rule character varying(20) DEFAULT 'NORMAL'::character varying,
    rounding_precision integer DEFAULT 2,
    is_system_generated boolean DEFAULT false
);


--
-- Name: sd_condition_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_condition_types (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    condition_class character varying(20) NOT NULL,
    calculation_type character varying(20) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: condition_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_types_id_seq OWNED BY public.sd_condition_types.id;


--
-- Name: condition_types_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.condition_types_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: condition_types_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.condition_types_id_seq1 OWNED BY public.condition_types.id;


--
-- Name: copa_actuals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.copa_actuals (
    id integer NOT NULL,
    operating_concern character varying(4) NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    record_type character varying(1) NOT NULL,
    customer character varying(10),
    material character varying(18),
    product_group character varying(10),
    customer_group character varying(5),
    sales_organization character varying(4),
    distribution_channel character varying(2),
    division character varying(2),
    region character varying(10),
    country character varying(3),
    profit_center character varying(10),
    value_field character varying(5) NOT NULL,
    amount numeric(15,2) NOT NULL,
    quantity numeric(15,3) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    unit_of_measure character varying(3),
    posting_date date NOT NULL,
    document_number character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    customer_id integer,
    material_id integer,
    profit_center_id integer,
    sales_org_id integer,
    company_code_id integer,
    currency_id integer,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: copa_actuals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.copa_actuals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: copa_actuals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.copa_actuals_id_seq OWNED BY public.copa_actuals.id;


--
-- Name: sd_copy_control_headers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_copy_control_headers (
    id integer NOT NULL,
    source_doc_type character varying(4) NOT NULL,
    target_doc_type character varying(4) NOT NULL,
    copy_requirements text,
    data_transfer text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: copy_control_headers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.copy_control_headers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: copy_control_headers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.copy_control_headers_id_seq OWNED BY public.sd_copy_control_headers.id;


--
-- Name: sd_copy_control_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_copy_control_items (
    id integer NOT NULL,
    source_doc_type character varying(4) NOT NULL,
    source_item_category character varying(4) NOT NULL,
    target_doc_type character varying(4) NOT NULL,
    target_item_category character varying(4) NOT NULL,
    copy_requirements text,
    data_transfer text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: copy_control_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.copy_control_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: copy_control_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.copy_control_items_id_seq OWNED BY public.sd_copy_control_items.id;


--
-- Name: cost_allocations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_allocations (
    id integer NOT NULL,
    allocation_id character varying(20) NOT NULL,
    allocation_type character varying(20) NOT NULL,
    sender_object_type character varying(20) NOT NULL,
    sender_object character varying(20) NOT NULL,
    receiver_object_type character varying(20) NOT NULL,
    receiver_object character varying(20) NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    allocation_base character varying(20),
    percentage numeric(5,2),
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    posting_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cost_allocations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_allocations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_allocations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_allocations_id_seq OWNED BY public.cost_allocations.id;


--
-- Name: cost_center_actuals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_center_actuals (
    id integer NOT NULL,
    cost_center character varying(10) NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    account character varying(10) NOT NULL,
    activity_type character varying(10),
    actual_amount numeric(15,2) DEFAULT 0,
    actual_quantity numeric(15,3) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    unit_of_measure character varying(3),
    posting_date date NOT NULL,
    document_number character varying(20),
    reference character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cost_center_id integer,
    company_code_id integer,
    currency_id integer,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cost_center_actuals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_center_actuals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_center_actuals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_center_actuals_id_seq OWNED BY public.cost_center_actuals.id;


--
-- Name: cost_center_planning; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_center_planning (
    id integer NOT NULL,
    cost_center character varying(10) NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    version character varying(10) DEFAULT '000'::character varying,
    account character varying(10) NOT NULL,
    activity_type character varying(10),
    planned_amount numeric(15,2) DEFAULT 0,
    planned_quantity numeric(15,3) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    unit_of_measure character varying(3),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cost_center_planning_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_center_planning_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_center_planning_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_center_planning_id_seq OWNED BY public.cost_center_planning.id;


--
-- Name: cost_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_centers (
    id integer NOT NULL,
    cost_center character varying(10) NOT NULL,
    description character varying(100) NOT NULL,
    cost_center_category character varying(20) NOT NULL,
    company_code character varying(4) NOT NULL,
    controlling_area character varying(4) NOT NULL,
    hierarchy_area character varying(20),
    responsible_person character varying(50),
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_code_id integer,
    plant_id integer,
    responsible_person_id integer,
    active boolean DEFAULT true
);


--
-- Name: cost_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_centers_id_seq OWNED BY public.cost_centers.id;


--
-- Name: cost_elements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.cost_elements (
    id integer NOT NULL,
    cost_element_code character varying(50) NOT NULL,
    cost_element_name character varying(255) NOT NULL,
    cost_element_type character varying(20) NOT NULL,
    gl_account character varying(50),
    cost_center character varying(50),
    description text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: cost_elements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.cost_elements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: cost_elements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.cost_elements_id_seq OWNED BY public.cost_elements.id;


--
-- Name: countries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.countries (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(100) NOT NULL,
    region_id integer,
    currency_code character varying(3),
    language_code character varying(5),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: countries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.countries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: countries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.countries_id_seq OWNED BY public.countries.id;


--
-- Name: credit_control_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.credit_control_areas (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    company_code_id integer NOT NULL,
    credit_checking_group character varying(50),
    credit_period integer DEFAULT 30,
    grace_percentage numeric DEFAULT 10,
    blocking_reason character varying(100),
    review_frequency character varying(20) DEFAULT 'monthly'::character varying,
    currency character varying(3) DEFAULT 'USD'::character varying,
    credit_approver character varying(100),
    status character varying(20) DEFAULT 'active'::character varying,
    is_active boolean DEFAULT true,
    notes text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    active boolean DEFAULT true
);


--
-- Name: credit_control_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.credit_control_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: credit_control_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.credit_control_areas_id_seq OWNED BY public.credit_control_areas.id;


--
-- Name: currencies; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currencies (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    symbol text NOT NULL,
    decimal_places text NOT NULL,
    conversion_rate text NOT NULL,
    base_currency boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    notes text,
    active boolean DEFAULT true
);


--
-- Name: currencies_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.currencies_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: currencies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.currencies_id_seq OWNED BY public.currencies.id;


--
-- Name: currency_valuations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.currency_valuations (
    id integer NOT NULL,
    company_code character varying(4) NOT NULL,
    valuation_date date NOT NULL,
    currency character varying(3) NOT NULL,
    exchange_rate numeric(9,5) NOT NULL,
    valuation_method character varying(2),
    gl_account character varying(10),
    valuation_difference numeric(15,2),
    status character varying(10) DEFAULT 'Active'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: currency_valuations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.currency_valuations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: currency_valuations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.currency_valuations_id_seq OWNED BY public.currency_valuations.id;


--
-- Name: custom_reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.custom_reports (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sql_query text NOT NULL,
    chart_config jsonb DEFAULT '{}'::jsonb,
    parameters jsonb DEFAULT '[]'::jsonb,
    category character varying(100) DEFAULT 'custom'::character varying,
    is_shared boolean DEFAULT false,
    created_by character varying(100) DEFAULT 'system'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    active boolean DEFAULT true
);


--
-- Name: custom_reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.custom_reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: custom_reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.custom_reports_id_seq OWNED BY public.custom_reports.id;


--
-- Name: customer_bank_relationships; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_bank_relationships (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    bank_account_id integer NOT NULL,
    relationship_type character varying(20) DEFAULT 'payment_account'::character varying NOT NULL,
    is_default boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: customer_bank_relationships_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_bank_relationships_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_bank_relationships_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_bank_relationships_id_seq OWNED BY public.customer_bank_relationships.id;


--
-- Name: customer_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_contacts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    email character varying(100),
    phone character varying(30),
    mobile character varying(30),
    is_primary boolean DEFAULT false,
    is_billing boolean DEFAULT false,
    is_shipping boolean DEFAULT false,
    is_technical boolean DEFAULT false,
    is_marketing boolean DEFAULT false,
    preferred_language character varying(50) DEFAULT 'English'::character varying,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    active boolean DEFAULT true
);


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_contacts_id_seq OWNED BY public.customer_contacts.id;


--
-- Name: customer_credit_management; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_credit_management (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    credit_limit numeric(15,2) DEFAULT 0 NOT NULL,
    current_balance numeric(15,2) DEFAULT 0 NOT NULL,
    available_credit numeric(15,2) GENERATED ALWAYS AS ((credit_limit - current_balance)) STORED,
    credit_rating character varying(10) DEFAULT 'A'::character varying,
    risk_score integer,
    is_on_credit_hold boolean DEFAULT false,
    credit_hold_reason text,
    last_review_date timestamp without time zone,
    next_review_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT customer_credit_management_risk_score_check CHECK (((risk_score >= 0) AND (risk_score <= 100)))
);


--
-- Name: customer_credit_management_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_credit_management_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_credit_management_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_credit_management_id_seq OWNED BY public.customer_credit_management.id;


--
-- Name: customer_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customer_payments (
    id integer NOT NULL,
    payment_number character varying(20) NOT NULL,
    customer_id integer NOT NULL,
    payment_date date NOT NULL,
    payment_amount numeric(15,2) NOT NULL,
    payment_method character varying(20) DEFAULT 'BANK_TRANSFER'::character varying,
    bank_account character varying(20),
    reference character varying(50),
    posting_status character varying(20) DEFAULT 'OPEN'::character varying,
    accounting_document_number character varying(20),
    created_by integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: customer_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customer_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customer_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customer_payments_id_seq OWNED BY public.customer_payments.id;


--
-- Name: customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.customers (
    id integer NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    phone text NOT NULL,
    address text NOT NULL,
    notes text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true,
    code character varying(20),
    type character varying(50) DEFAULT 'Regular'::character varying,
    company_code_id integer,
    credit_limit numeric(15,2),
    credit_rating character varying(10),
    outstanding_balance numeric(15,2) DEFAULT 0,
    is_active boolean DEFAULT true
);


--
-- Name: customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.customers_id_seq OWNED BY public.customers.id;


--
-- Name: dashboard_configs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dashboard_configs (
    id integer NOT NULL,
    user_id integer NOT NULL,
    config jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dashboard_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dashboard_configs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dashboard_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dashboard_configs_id_seq OWNED BY public.dashboard_configs.id;


--
-- Name: delivery_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_documents (
    id integer NOT NULL,
    delivery_number character varying(20) NOT NULL,
    sales_order_id integer,
    customer_id integer NOT NULL,
    delivery_date date NOT NULL,
    shipping_point character varying(4) DEFAULT '1000'::character varying,
    plant character varying(4) DEFAULT '1000'::character varying,
    pgi_status character varying(20) DEFAULT 'OPEN'::character varying,
    pgi_date date,
    pgi_document_number character varying(20),
    created_by integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: delivery_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_documents_id_seq OWNED BY public.delivery_documents.id;


--
-- Name: delivery_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.delivery_items (
    id integer NOT NULL,
    delivery_id integer NOT NULL,
    sales_order_item_id integer,
    line_item integer NOT NULL,
    material_id integer NOT NULL,
    delivery_quantity numeric(13,3) NOT NULL,
    pgi_quantity numeric(13,3) DEFAULT 0,
    unit character varying(3) DEFAULT 'EA'::character varying,
    storage_location character varying(4) DEFAULT '0001'::character varying,
    batch character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: delivery_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.delivery_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: delivery_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.delivery_items_id_seq OWNED BY public.delivery_items.id;


--
-- Name: designer_agent_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designer_agent_communications (
    id integer NOT NULL,
    analysis_id integer,
    target_agent character varying(50) NOT NULL,
    communication_type character varying(50) NOT NULL,
    message text NOT NULL,
    payload jsonb,
    status character varying(50) DEFAULT 'sent'::character varying,
    sent_at timestamp with time zone DEFAULT now(),
    acknowledged_at timestamp with time zone
);


--
-- Name: designer_agent_communications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designer_agent_communications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designer_agent_communications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designer_agent_communications_id_seq OWNED BY public.designer_agent_communications.id;


--
-- Name: designer_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designer_analysis (
    id integer NOT NULL,
    document_id integer,
    analysis_status character varying(50) DEFAULT 'pending'::character varying,
    existing_tables_analyzed jsonb,
    proposed_table_changes jsonb,
    new_tables_required jsonb,
    relationship_mappings jsonb,
    data_integrity_checks jsonb,
    existing_ui_components jsonb,
    proposed_ui_changes jsonb,
    new_ui_components jsonb,
    mock_data_examples jsonb,
    agent_notifications jsonb,
    implementation_plan jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: designer_analysis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designer_analysis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designer_analysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designer_analysis_id_seq OWNED BY public.designer_analysis.id;


--
-- Name: designer_documents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designer_documents (
    id integer NOT NULL,
    file_name character varying(255) NOT NULL,
    file_type character varying(50) NOT NULL,
    file_size integer NOT NULL,
    upload_path text NOT NULL,
    document_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'uploaded'::character varying,
    uploaded_by character varying(255) NOT NULL,
    uploaded_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);


--
-- Name: designer_documents_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designer_documents_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designer_documents_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designer_documents_id_seq OWNED BY public.designer_documents.id;


--
-- Name: designer_implementations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designer_implementations (
    id integer NOT NULL,
    analysis_id integer,
    implementation_status character varying(50) DEFAULT 'pending'::character varying,
    database_changes_applied jsonb,
    ui_changes_applied jsonb,
    agent_updates_completed jsonb,
    testing_results jsonb,
    validation_checks jsonb,
    rollback_plan jsonb,
    implemented_by character varying(255) NOT NULL,
    started_at timestamp with time zone,
    completed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: designer_implementations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designer_implementations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designer_implementations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designer_implementations_id_seq OWNED BY public.designer_implementations.id;


--
-- Name: designer_reviews; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.designer_reviews (
    id integer NOT NULL,
    analysis_id integer,
    review_status character varying(50) DEFAULT 'pending'::character varying,
    reviewed_by character varying(255) NOT NULL,
    review_comments text,
    screen_specific_feedback jsonb,
    approval_timestamp timestamp with time zone,
    change_requests jsonb,
    change_request_status character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


--
-- Name: designer_reviews_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.designer_reviews_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: designer_reviews_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.designer_reviews_id_seq OWNED BY public.designer_reviews.id;


--
-- Name: distribution_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.distribution_channels (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sales_organization_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sd_distribution_channels; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_distribution_channels (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: distribution_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribution_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribution_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribution_channels_id_seq OWNED BY public.sd_distribution_channels.id;


--
-- Name: distribution_channels_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.distribution_channels_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: distribution_channels_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.distribution_channels_id_seq1 OWNED BY public.distribution_channels.id;


--
-- Name: divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.divisions (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sales_organization_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sd_divisions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_divisions (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: divisions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.divisions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: divisions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.divisions_id_seq OWNED BY public.sd_divisions.id;


--
-- Name: divisions_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.divisions_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: divisions_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.divisions_id_seq1 OWNED BY public.divisions.id;


--
-- Name: document_posting; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_posting (
    id integer NOT NULL,
    document_number character varying(50) NOT NULL,
    document_type character varying(10) NOT NULL,
    posting_date date NOT NULL,
    document_date date,
    reference character varying(255),
    currency character varying(10) DEFAULT 'USD'::character varying,
    exchange_rate numeric(10,4) DEFAULT 1.0,
    company_code character varying(50) NOT NULL,
    fiscal_year character varying(4),
    period character varying(3),
    total_debit numeric(15,2) DEFAULT 0,
    total_credit numeric(15,2) DEFAULT 0,
    status character varying(20) DEFAULT 'posted'::character varying,
    user_created character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: document_posting_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_posting_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_posting_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_posting_id_seq OWNED BY public.document_posting.id;


--
-- Name: document_posting_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_posting_items (
    id integer NOT NULL,
    document_id integer NOT NULL,
    line_number integer NOT NULL,
    gl_account character varying(10) NOT NULL,
    cost_center character varying(10),
    profit_center character varying(10),
    debit_amount numeric(15,2) DEFAULT 0,
    credit_amount numeric(15,2) DEFAULT 0,
    text character varying(50),
    business_area character varying(4),
    functional_area character varying(16),
    assignment character varying(18),
    reference_key character varying(12)
);


--
-- Name: document_posting_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_posting_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_posting_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_posting_items_id_seq OWNED BY public.document_posting_items.id;


--
-- Name: document_posting_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_posting_lines (
    id integer NOT NULL,
    document_id integer,
    line_number integer NOT NULL,
    gl_account character varying(50) NOT NULL,
    cost_center character varying(50),
    profit_center character varying(50),
    debit_amount numeric(15,2) DEFAULT 0,
    credit_amount numeric(15,2) DEFAULT 0,
    description text,
    reference character varying(255),
    assignment character varying(255),
    text character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: document_posting_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_posting_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_posting_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_posting_lines_id_seq OWNED BY public.document_posting_lines.id;


--
-- Name: document_postings; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.document_postings (
    id integer NOT NULL,
    document_number character varying(20) NOT NULL,
    company_code character varying(4) NOT NULL,
    document_type character varying(2) NOT NULL,
    posting_date date NOT NULL,
    document_date date NOT NULL,
    reference character varying(16),
    header_text character varying(25),
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(10) DEFAULT 'Posted'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    fiscal_year integer,
    period integer,
    CONSTRAINT check_total_amount_positive CHECK ((total_amount >= (0)::numeric))
);


--
-- Name: document_postings_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_postings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_postings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_postings_id_seq OWNED BY public.document_postings.id;


--
-- Name: sd_document_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_document_types (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    category character varying(20) NOT NULL,
    number_range character varying(10),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    CONSTRAINT document_types_category_check CHECK (((category)::text = ANY ((ARRAY['ORDER'::character varying, 'DELIVERY'::character varying, 'BILLING'::character varying])::text[])))
);


--
-- Name: document_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.document_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: document_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.document_types_id_seq OWNED BY public.sd_document_types.id;


--
-- Name: dominos_test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dominos_test_results (
    id integer NOT NULL,
    test_number character varying(50) NOT NULL,
    test_name character varying(255) NOT NULL,
    status character varying(20) NOT NULL,
    "timestamp" timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    duration integer DEFAULT 0,
    screenshot text,
    domain character varying(100) NOT NULL,
    description text,
    error_message text,
    test_data jsonb NOT NULL,
    company_code character varying(10) DEFAULT 'DOM01'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    connection_id character varying(50),
    screenshot_folder character varying(255),
    CONSTRAINT dominos_test_results_status_check CHECK (((status)::text = ANY ((ARRAY['passed'::character varying, 'failed'::character varying, 'running'::character varying, 'pending'::character varying])::text[])))
);


--
-- Name: dominos_test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dominos_test_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dominos_test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dominos_test_results_id_seq OWNED BY public.dominos_test_results.id;


--
-- Name: down_payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.down_payments (
    id integer NOT NULL,
    down_payment_number character varying(20) NOT NULL,
    vendor_code character varying(10),
    customer_code character varying(10),
    company_code character varying(4) NOT NULL,
    amount numeric(15,2) NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    request_date date NOT NULL,
    payment_date date,
    clearing_date date,
    gl_account character varying(10) NOT NULL,
    reference character varying(20),
    status character varying(10) DEFAULT 'Requested'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: down_payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.down_payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: down_payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.down_payments_id_seq OWNED BY public.down_payments.id;


--
-- Name: dunning_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dunning_configurations (
    id integer NOT NULL,
    level_number integer NOT NULL,
    days_overdue integer NOT NULL,
    template_name character varying(100) NOT NULL,
    template_content text NOT NULL,
    escalation_action character varying(50),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dunning_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dunning_configurations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dunning_configurations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dunning_configurations_id_seq OWNED BY public.dunning_configurations.id;


--
-- Name: dunning_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dunning_procedures (
    id integer NOT NULL,
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
    CONSTRAINT dunning_procedures_procedure_code_key UNIQUE (procedure_code)
);


--
-- Name: dunning_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dunning_procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dunning_procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dunning_procedures_id_seq OWNED BY public.dunning_procedures.id;


--
-- Name: dunning_history; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.dunning_history (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    dunning_procedure_id integer NOT NULL,
    invoice_id integer,
    dunning_level integer NOT NULL,
    dunning_date date NOT NULL,
    outstanding_amount numeric(15,2) NOT NULL,
    dunning_amount numeric(15,2) NOT NULL,
    interest_amount numeric(15,2) DEFAULT 0.00,
    dunning_status character varying(20) NOT NULL DEFAULT 'sent'::character varying,
    dunning_text text,
    letter_sent boolean DEFAULT false,
    email_sent boolean DEFAULT false,
    response_date date,
    payment_received boolean DEFAULT false,
    escalated_to_legal boolean DEFAULT false,
    created_by character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: dunning_history_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.dunning_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: dunning_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.dunning_history_id_seq OWNED BY public.dunning_history.id;


--
-- Name: edi_trading_partners; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edi_trading_partners (
    id integer NOT NULL,
    partner_name character varying(100) NOT NULL,
    partner_isa_id character varying(15) NOT NULL,
    our_isa_id character varying(15) NOT NULL,
    supported_documents jsonb NOT NULL,
    communication_method character varying(10),
    connection_config text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT edi_trading_partners_communication_method_check CHECK (((communication_method)::text = ANY ((ARRAY['AS2'::character varying, 'SFTP'::character varying, 'VAN'::character varying])::text[])))
);


--
-- Name: edi_trading_partners_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edi_trading_partners_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edi_trading_partners_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edi_trading_partners_id_seq OWNED BY public.edi_trading_partners.id;


--
-- Name: edi_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.edi_transactions (
    id integer NOT NULL,
    edi_transaction_set character varying(10) NOT NULL,
    sender_id character varying(20) NOT NULL,
    receiver_id character varying(20) NOT NULL,
    control_number character varying(20) NOT NULL,
    transaction_date timestamp without time zone NOT NULL,
    document_type character varying(20),
    reference_number character varying(30),
    total_amount numeric(15,2),
    currency_code character varying(3) DEFAULT 'USD'::character varying,
    processing_status character varying(20) DEFAULT 'received'::character varying,
    error_messages jsonb,
    raw_edi_data text,
    parsed_data jsonb,
    related_ar_id integer,
    related_ap_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying,
    CONSTRAINT edi_transactions_document_type_check CHECK (((document_type)::text = ANY ((ARRAY['810_invoice'::character varying, '820_payment_order'::character varying, '997_functional_ack'::character varying, '850_purchase_order'::character varying])::text[])))
);


--
-- Name: edi_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.edi_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: edi_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.edi_transactions_id_seq OWNED BY public.edi_transactions.id;


--
-- Name: employee_master; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employee_master (
    id integer NOT NULL,
    employee_number character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    middle_name character varying(50),
    date_of_birth date,
    gender character varying(10),
    hire_date date NOT NULL,
    employment_type character varying(20),
    employment_status character varying(20) DEFAULT 'ACTIVE'::character varying,
    company_code_id integer,
    cost_center_id integer,
    manager_id integer,
    work_email character varying(100),
    work_phone character varying(20),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: employee_master_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employee_master_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employee_master_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employee_master_id_seq OWNED BY public.employee_master.id;


--
-- Name: employees; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.employees (
    id integer NOT NULL,
    employee_id character varying(20) NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    email character varying(100),
    phone character varying(20),
    department character varying(100),
    "position" character varying(100),
    company_code_id integer,
    cost_center_id integer,
    join_date date,
    manager_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: employees_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.employees_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: employees_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.employees_id_seq OWNED BY public.employees.id;


--
-- Name: environment_config; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.environment_config (
    id integer NOT NULL,
    environment character varying(10) NOT NULL,
    database_url text,
    is_active boolean DEFAULT true,
    last_transport_date timestamp without time zone,
    description text,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: environment_config_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.environment_config_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: environment_config_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.environment_config_id_seq OWNED BY public.environment_config.id;


--
-- Name: erp_customer_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_customer_contacts (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    email character varying(100),
    phone character varying(30),
    mobile character varying(30),
    is_primary boolean DEFAULT false,
    is_billing boolean DEFAULT false,
    is_shipping boolean DEFAULT false,
    is_technical boolean DEFAULT false,
    is_marketing boolean DEFAULT false,
    preferred_language character varying(50) DEFAULT 'English'::character varying,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    active boolean DEFAULT true
);


--
-- Name: erp_customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_customer_contacts_id_seq OWNED BY public.erp_customer_contacts.id;


--
-- Name: erp_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_customers (
    id integer NOT NULL,
    customer_code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    tax_id character varying(50),
    industry character varying(50),
    segment character varying(50),
    address text,
    city character varying(100),
    state character varying(50),
    country character varying(50),
    postal_code character varying(20),
    region character varying(50),
    phone character varying(30),
    alt_phone character varying(30),
    email character varying(100),
    website character varying(255),
    currency character varying(10),
    payment_terms character varying(50),
    payment_method character varying(50),
    credit_limit numeric,
    credit_rating character varying(10),
    discount_group character varying(50),
    price_group character varying(50),
    incoterms character varying(20),
    shipping_method character varying(50),
    delivery_terms character varying(100),
    delivery_route character varying(100),
    sales_rep_id integer,
    parent_customer_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    is_b2b boolean DEFAULT true,
    is_b2c boolean DEFAULT false,
    is_vip boolean DEFAULT false,
    notes text,
    tags text[],
    company_code_id integer NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: erp_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_customers_id_seq OWNED BY public.erp_customers.id;


--
-- Name: erp_vendor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_vendor_contacts (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    email character varying(100),
    phone character varying(30),
    mobile character varying(30),
    is_primary boolean DEFAULT false,
    is_order_contact boolean DEFAULT false,
    is_purchase_contact boolean DEFAULT false,
    is_quality_contact boolean DEFAULT false,
    is_accounts_contact boolean DEFAULT false,
    preferred_language character varying(50) DEFAULT 'English'::character varying,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    active boolean DEFAULT true
);


--
-- Name: erp_vendor_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_vendor_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_vendor_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_vendor_contacts_id_seq OWNED BY public.erp_vendor_contacts.id;


--
-- Name: erp_vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.erp_vendors (
    id integer NOT NULL,
    vendor_code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    tax_id character varying(50),
    industry character varying(50),
    address text,
    city character varying(100),
    state character varying(50),
    country character varying(50),
    postal_code character varying(20),
    region character varying(50),
    phone character varying(30),
    alt_phone character varying(30),
    email character varying(100),
    website character varying(255),
    currency character varying(10),
    payment_terms character varying(50),
    payment_method character varying(50),
    supplier_type character varying(50),
    category character varying(50),
    order_frequency character varying(50),
    minimum_order_value numeric,
    evaluation_score numeric,
    lead_time integer,
    purchasing_group_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    blacklisted boolean DEFAULT false,
    blacklist_reason text,
    notes text,
    tags text[],
    company_code_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: erp_vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.erp_vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: erp_vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.erp_vendors_id_seq OWNED BY public.erp_vendors.id;


--
-- Name: expenses; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.expenses (
    id integer NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    amount double precision NOT NULL,
    category text NOT NULL,
    description text NOT NULL,
    payment_method text NOT NULL,
    reference text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: expenses_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.expenses_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: expenses_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.expenses_id_seq OWNED BY public.expenses.id;


--
-- Name: fiscal_periods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_periods (
    id integer NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    version integer DEFAULT 1,
    year integer NOT NULL,
    period integer NOT NULL,
    name character varying(255) NOT NULL,
    start_date date NOT NULL,
    end_date date NOT NULL,
    status character varying(50) DEFAULT 'Open'::character varying,
    company_code_id integer,
    active boolean DEFAULT true,
    posting_allowed boolean DEFAULT true
);


--
-- Name: fiscal_periods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fiscal_periods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fiscal_periods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fiscal_periods_id_seq OWNED BY public.fiscal_periods.id;


--
-- Name: fiscal_year_variants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.fiscal_year_variants (
    id integer NOT NULL,
    variant_id character varying(10) NOT NULL,
    description character varying(255) NOT NULL,
    posting_periods integer DEFAULT 12,
    special_periods integer DEFAULT 0,
    year_shift integer DEFAULT 0,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: fiscal_year_variants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.fiscal_year_variants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: fiscal_year_variants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.fiscal_year_variants_id_seq OWNED BY public.fiscal_year_variants.id;


--
-- Name: general_ledger_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.general_ledger_accounts (
    id integer NOT NULL,
    account_number character varying(20) NOT NULL,
    account_name character varying(100) NOT NULL,
    account_type character varying(20) NOT NULL,
    account_group character varying(50),
    parent_account_id integer,
    company_code_id integer,
    currency_id integer,
    balance_sheet_item boolean DEFAULT false,
    profit_loss_item boolean DEFAULT false,
    reconciliation_account boolean DEFAULT false,
    tax_relevant boolean DEFAULT false,
    posting_allowed boolean DEFAULT true,
    blocked boolean DEFAULT false,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: general_ledger_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.general_ledger_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: general_ledger_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.general_ledger_accounts_id_seq OWNED BY public.general_ledger_accounts.id;


--
-- Name: gl_accounts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_accounts (
    id integer NOT NULL,
    account_number text NOT NULL,
    account_name text NOT NULL,
    chart_of_accounts_id integer,
    account_type text NOT NULL,
    account_group text,
    balance_sheet_account boolean DEFAULT false NOT NULL,
    pl_account boolean DEFAULT false NOT NULL,
    block_posting boolean DEFAULT false NOT NULL,
    reconciliation_account boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true,
    posting_allowed boolean DEFAULT true,
    balance_type character varying(20) DEFAULT 'debit'::character varying
);


--
-- Name: gl_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gl_accounts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gl_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gl_accounts_id_seq OWNED BY public.gl_accounts.id;


--
-- Name: gl_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.gl_entries (
    id integer NOT NULL,
    document_number character varying(50) NOT NULL,
    gl_account_id integer,
    amount numeric(15,2) NOT NULL,
    debit_credit_indicator character(1) NOT NULL,
    posting_status character varying(20) DEFAULT 'posted'::character varying,
    posting_date date DEFAULT CURRENT_DATE,
    created_at timestamp without time zone DEFAULT now(),
    CONSTRAINT gl_entries_debit_credit_indicator_check CHECK ((debit_credit_indicator = ANY (ARRAY['D'::bpchar, 'C'::bpchar])))
);


--
-- Name: gl_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.gl_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: gl_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.gl_entries_id_seq OWNED BY public.gl_entries.id;


--
-- Name: goods_receipt; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt (
    id integer NOT NULL,
    receipt_number character varying(50) NOT NULL,
    receipt_date date NOT NULL,
    vendor_code character varying(50),
    vendor_name character varying(255),
    purchase_order character varying(50),
    plant_code character varying(50) NOT NULL,
    storage_location character varying(50),
    movement_type character varying(10) DEFAULT '101'::character varying,
    total_quantity numeric(15,3) DEFAULT 0,
    total_value numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'USD'::character varying,
    status character varying(20) DEFAULT 'posted'::character varying,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: goods_receipt_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipt_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipt_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipt_id_seq OWNED BY public.goods_receipt.id;


--
-- Name: goods_receipt_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_items (
    id integer NOT NULL,
    receipt_id integer NOT NULL,
    line_number integer NOT NULL,
    material_code character varying(18) NOT NULL,
    quantity numeric(13,3) NOT NULL,
    unit_of_measure character varying(3) NOT NULL,
    unit_price numeric(11,2),
    storage_location character varying(4),
    batch_number character varying(10),
    expiration_date date,
    vendor_batch character varying(15),
    quality_inspection boolean DEFAULT false
);


--
-- Name: goods_receipt_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipt_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipt_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipt_items_id_seq OWNED BY public.goods_receipt_items.id;


--
-- Name: goods_receipt_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipt_lines (
    id integer NOT NULL,
    receipt_id integer,
    line_number integer NOT NULL,
    material_code character varying(50) NOT NULL,
    material_name character varying(255),
    quantity_received numeric(15,3) NOT NULL,
    unit_price numeric(15,2) DEFAULT 0,
    total_amount numeric(15,2) DEFAULT 0,
    storage_location character varying(50),
    batch_number character varying(50),
    expiry_date date,
    quality_status character varying(20) DEFAULT 'UNRESTRICTED'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: goods_receipt_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipt_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipt_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipt_lines_id_seq OWNED BY public.goods_receipt_lines.id;


--
-- Name: goods_receipts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goods_receipts (
    id integer NOT NULL,
    receipt_number character varying(20) NOT NULL,
    purchase_order character varying(10),
    vendor_code character varying(10) NOT NULL,
    plant_code character varying(4) NOT NULL,
    receipt_date date NOT NULL,
    delivery_note character varying(16),
    bill_of_lading character varying(16),
    total_quantity numeric(13,3) DEFAULT 0 NOT NULL,
    total_amount numeric(15,2) DEFAULT 0 NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying NOT NULL,
    status character varying(10) DEFAULT 'Received'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    created_by character varying(50),
    movement_type character varying(3) DEFAULT '101'::character varying,
    CONSTRAINT check_quantity_positive CHECK ((total_quantity >= (0)::numeric))
);


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.goods_receipts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: goods_receipts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.goods_receipts_id_seq OWNED BY public.goods_receipts.id;


--
-- Name: internal_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.internal_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    order_type character varying(10) NOT NULL,
    description character varying(100) NOT NULL,
    company_code character varying(4) NOT NULL,
    controlling_area character varying(4) NOT NULL,
    responsible_cost_center character varying(10),
    profit_center character varying(10),
    order_status character varying(20) DEFAULT 'CREATED'::character varying,
    planned_costs numeric(15,2) DEFAULT 0,
    actual_costs numeric(15,2) DEFAULT 0,
    committed_costs numeric(15,2) DEFAULT 0,
    budget_amount numeric(15,2) DEFAULT 0,
    start_date date,
    end_date date,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: internal_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.internal_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: internal_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.internal_orders_id_seq OWNED BY public.internal_orders.id;


--
-- Name: inventory_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.inventory_transactions (
    id integer NOT NULL,
    transaction_number character varying(20) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    material_id integer,
    plant_id integer,
    storage_location_id integer,
    movement_type character varying(10) NOT NULL,
    quantity numeric(15,3) NOT NULL,
    unit_of_measure character varying(10),
    unit_price numeric(15,2),
    total_value numeric(15,2),
    batch_number character varying(50),
    serial_number character varying(50),
    reference_document character varying(50),
    posting_date date NOT NULL,
    document_date date NOT NULL,
    cost_center_id integer,
    reason_code character varying(10),
    notes text,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.inventory_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: inventory_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.inventory_transactions_id_seq OWNED BY public.inventory_transactions.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.invoices (
    id integer NOT NULL,
    invoice_number text NOT NULL,
    order_id integer,
    issue_date timestamp without time zone DEFAULT now() NOT NULL,
    due_date timestamp without time zone NOT NULL,
    amount double precision NOT NULL,
    status text DEFAULT 'Due'::text NOT NULL,
    paid_date timestamp without time zone,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: issue_analytics_summary; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_analytics_summary (
    id bigint NOT NULL,
    analysis_date date DEFAULT CURRENT_DATE NOT NULL,
    total_issues integer DEFAULT 0,
    critical_issues integer DEFAULT 0,
    high_issues integer DEFAULT 0,
    medium_issues integer DEFAULT 0,
    low_issues integer DEFAULT 0,
    ai_resolved integer DEFAULT 0,
    auto_resolved integer DEFAULT 0,
    manual_resolved integer DEFAULT 0,
    unresolved integer DEFAULT 0,
    avg_resolution_time integer DEFAULT 0,
    median_resolution_time integer DEFAULT 0,
    fastest_resolution integer DEFAULT 0,
    slowest_resolution integer DEFAULT 0,
    master_data_issues integer DEFAULT 0,
    transaction_issues integer DEFAULT 0,
    system_issues integer DEFAULT 0,
    api_issues integer DEFAULT 0,
    database_issues integer DEFAULT 0,
    validation_issues integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE issue_analytics_summary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_analytics_summary IS 'Daily aggregated analytics for issue trends and patterns';


--
-- Name: issue_analytics_summary_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_analytics_summary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_analytics_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_analytics_summary_id_seq OWNED BY public.issue_analytics_summary.id;


--
-- Name: issue_patterns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_patterns (
    id bigint NOT NULL,
    pattern_name character varying(200) NOT NULL,
    pattern_regex character varying(500) NOT NULL,
    category character varying(20) NOT NULL,
    match_count integer DEFAULT 0,
    success_rate numeric(5,2) DEFAULT 0.00,
    avg_resolution_time integer DEFAULT 0,
    auto_resolvable boolean DEFAULT false,
    resolution_template jsonb,
    confidence_threshold numeric(3,2) DEFAULT 0.80,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: TABLE issue_patterns; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_patterns IS 'Learning database for issue pattern recognition and auto-resolution';


--
-- Name: issue_patterns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_patterns_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_patterns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_patterns_id_seq OWNED BY public.issue_patterns.id;


--
-- Name: issue_resolutions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.issue_resolutions (
    id bigint NOT NULL,
    resolution_id uuid DEFAULT gen_random_uuid(),
    issue_id uuid NOT NULL,
    resolved_by character varying(50) NOT NULL,
    resolution_time integer,
    steps jsonb NOT NULL,
    success boolean NOT NULL,
    additional_notes text,
    validation_checks jsonb,
    rollback_info jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT issue_resolutions_resolved_by_check CHECK (((resolved_by)::text = ANY ((ARRAY['AI_AGENT'::character varying, 'AUTO_RECOVERY'::character varying, 'MANUAL'::character varying, 'SYSTEM'::character varying])::text[])))
);


--
-- Name: TABLE issue_resolutions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.issue_resolutions IS 'Records all resolution attempts and their outcomes';


--
-- Name: issue_resolutions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.issue_resolutions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: issue_resolutions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.issue_resolutions_id_seq OWNED BY public.issue_resolutions.id;


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id integer NOT NULL,
    document_number character varying(20) NOT NULL,
    company_code_id integer,
    document_type character varying(10) NOT NULL,
    posting_date date NOT NULL,
    document_date date NOT NULL,
    fiscal_period character varying(7) NOT NULL,
    fiscal_year integer NOT NULL,
    currency_id integer,
    exchange_rate numeric(10,4) DEFAULT 1.0,
    reference_document character varying(50),
    header_text text,
    total_debit_amount numeric(15,2) NOT NULL,
    total_credit_amount numeric(15,2) NOT NULL,
    created_by integer,
    posted_by integer,
    posting_time timestamp without time zone,
    status character varying(20) DEFAULT 'POSTED'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    entry_date date,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: journal_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.journal_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: journal_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.journal_entries_id_seq OWNED BY public.journal_entries.id;


--
-- Name: leads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.leads (
    id integer NOT NULL,
    first_name character varying(100) NOT NULL,
    last_name character varying(100) NOT NULL,
    company_name character varying(200),
    job_title character varying(100),
    email character varying(200) NOT NULL,
    phone character varying(50),
    status character varying(50) DEFAULT 'New'::character varying NOT NULL,
    source character varying(100),
    industry character varying(100),
    annual_revenue numeric(15,2),
    employee_count integer,
    website character varying(200),
    address text,
    city character varying(100),
    state character varying(100),
    country character varying(100),
    postal_code character varying(20),
    description text,
    last_contacted timestamp without time zone,
    next_followup timestamp without time zone,
    assigned_to integer,
    lead_score integer,
    is_converted boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: leads_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.leads_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: leads_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.leads_id_seq OWNED BY public.leads.id;


--
-- Name: lockbox_processing; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lockbox_processing (
    id integer NOT NULL,
    lockbox_number character varying(20) NOT NULL,
    bank_account_id integer,
    processing_date date NOT NULL,
    deposit_amount numeric(15,2) NOT NULL,
    check_count integer DEFAULT 0,
    ach_count integer DEFAULT 0,
    wire_count integer DEFAULT 0,
    deposit_slip_number character varying(30),
    bank_file_name character varying(100),
    processing_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    processed_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying
);


--
-- Name: lockbox_processing_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lockbox_processing_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lockbox_processing_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lockbox_processing_id_seq OWNED BY public.lockbox_processing.id;


--
-- Name: lockbox_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lockbox_transactions (
    id integer NOT NULL,
    lockbox_id integer,
    check_number character varying(20),
    customer_account character varying(30),
    payment_amount numeric(15,2) NOT NULL,
    currency_code character varying(3) DEFAULT 'USD'::character varying,
    payment_date date NOT NULL,
    deposit_date date NOT NULL,
    micr_data character varying(100),
    remittance_data text,
    invoice_references text[],
    cash_application_status character varying(20) DEFAULT 'pending'::character varying,
    ar_application_id integer,
    exception_reason text,
    manual_review_required boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    applied_at timestamp without time zone,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'pending'::character varying
);


--
-- Name: lockbox_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.lockbox_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: lockbox_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.lockbox_transactions_id_seq OWNED BY public.lockbox_transactions.id;


--
-- Name: material_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.material_categories (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    parent_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: material_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.material_categories_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: material_categories_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.material_categories_id_seq OWNED BY public.material_categories.id;


--
-- Name: materials; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.materials (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    long_description text,
    type character varying(50) NOT NULL,
    uom_id integer NOT NULL,
    category_id integer,
    weight numeric,
    weight_uom_id integer,
    dimensions jsonb,
    base_unit_price numeric,
    cost numeric,
    min_order_qty numeric,
    order_multiple numeric,
    procurement_type character varying(20),
    min_stock numeric DEFAULT 0,
    max_stock numeric,
    reorder_point numeric,
    lead_time integer,
    shelf_life integer,
    lot_size character varying(20),
    mrp_type character varying(30),
    planning_policy character varying(30),
    is_active boolean DEFAULT true,
    is_sellable boolean DEFAULT false,
    is_purchasable boolean DEFAULT false,
    is_manufactured boolean DEFAULT false,
    is_stockable boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true,
    base_uom character varying(10) DEFAULT 'PC'::character varying,
    status character varying(20) DEFAULT 'active'::character varying
);


--
-- Name: materials_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.materials_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: materials_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.materials_id_seq OWNED BY public.materials.id;


--
-- Name: module_health_status; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.module_health_status (
    id bigint NOT NULL,
    module_name character varying(100) NOT NULL,
    health_score numeric(5,2) NOT NULL,
    total_issues integer DEFAULT 0,
    critical_issues integer DEFAULT 0,
    resolved_issues integer DEFAULT 0,
    avg_resolution_time integer DEFAULT 0,
    response_time_avg integer DEFAULT 0,
    error_rate numeric(5,2) DEFAULT 0.00,
    availability_score numeric(5,2) DEFAULT 100.00,
    ai_intervention_count integer DEFAULT 0,
    ai_success_rate numeric(5,2) DEFAULT 0.00,
    last_check timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT module_health_status_health_score_check CHECK (((health_score >= (0)::numeric) AND (health_score <= (100)::numeric)))
);


--
-- Name: TABLE module_health_status; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.module_health_status IS 'Real-time health monitoring for all ERP modules';


--
-- Name: module_health_status_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.module_health_status_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: module_health_status_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.module_health_status_id_seq OWNED BY public.module_health_status.id;


--
-- Name: movement_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.movement_types (
    id integer NOT NULL,
    movement_code character varying(50) NOT NULL,
    movement_name character varying(255) NOT NULL,
    description text,
    movement_category character varying(50),
    debit_credit_indicator character varying(1),
    quantity_update boolean DEFAULT true,
    value_update boolean DEFAULT true,
    reversal_allowed boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    movement_type character varying(3) DEFAULT '000'::character varying NOT NULL
);


--
-- Name: movement_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.movement_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: movement_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.movement_types_id_seq OWNED BY public.movement_types.id;


--
-- Name: sd_number_range_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_number_range_objects (
    id integer NOT NULL,
    object_code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: number_range_objects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.number_range_objects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: number_range_objects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.number_range_objects_id_seq OWNED BY public.sd_number_range_objects.id;


--
-- Name: sd_number_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_number_ranges (
    id integer NOT NULL,
    object_code character varying(10) NOT NULL,
    range_number character varying(2) NOT NULL,
    from_number character varying(20) NOT NULL,
    to_number character varying(20) NOT NULL,
    current_number character varying(20) NOT NULL,
    external boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: number_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.number_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: number_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.number_ranges_id_seq OWNED BY public.sd_number_ranges.id;


--
-- Name: opportunities; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.opportunities (
    id integer NOT NULL,
    name character varying(200) NOT NULL,
    lead_id integer,
    customer_id integer,
    status character varying(50) DEFAULT 'Prospecting'::character varying NOT NULL,
    stage character varying(50) NOT NULL,
    amount numeric(15,2),
    expected_revenue numeric(15,2),
    probability integer,
    close_date timestamp without time zone,
    next_step character varying(200),
    type character varying(100),
    source character varying(100),
    campaign_source character varying(100),
    description text,
    assigned_to integer,
    is_closed boolean DEFAULT false,
    is_won boolean DEFAULT false,
    notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: opportunities_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.opportunities_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: opportunities_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.opportunities_id_seq OWNED BY public.opportunities.id;


--
-- Name: order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.order_items (
    id integer NOT NULL,
    order_id integer,
    product_id integer,
    quantity integer NOT NULL,
    unit_price double precision NOT NULL,
    total double precision NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.order_items_id_seq OWNED BY public.order_items.id;


--
-- Name: orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.orders (
    id integer NOT NULL,
    order_number text NOT NULL,
    customer_id integer,
    date timestamp without time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'Processing'::text NOT NULL,
    total double precision NOT NULL,
    notes text,
    shipping_address text,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.orders_id_seq OWNED BY public.orders.id;


--
-- Name: payment_applications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_applications (
    id integer NOT NULL,
    payment_id integer NOT NULL,
    billing_id integer NOT NULL,
    applied_amount numeric(15,2) NOT NULL,
    created_by integer DEFAULT 1,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_applications_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_applications_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_applications_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_applications_id_seq OWNED BY public.payment_applications.id;


--
-- Name: payment_lines; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_lines (
    id integer NOT NULL,
    payment_id integer,
    line_number integer NOT NULL,
    invoice_number character varying(50),
    original_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    payment_amount numeric(15,2) NOT NULL,
    cash_discount numeric(15,2) DEFAULT 0,
    assignment character varying(255),
    text character varying(255),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_lines_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_lines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_lines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_lines_id_seq OWNED BY public.payment_lines.id;


--
-- Name: payment_methods; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_methods (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: payment_methods_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_methods_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_methods_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_methods_id_seq OWNED BY public.payment_methods.id;


--
-- Name: payment_transactions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payment_transactions (
    id integer NOT NULL,
    customer_payment_id integer NOT NULL,
    bank_account_id integer NOT NULL,
    bank_transaction_id integer,
    ar_invoice_id integer,
    gl_document_number character varying(50),
    transaction_amount numeric(15,2) NOT NULL,
    transaction_type character varying(20) NOT NULL,
    posting_status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    reconciliation_status character varying(20) DEFAULT 'unmatched'::character varying NOT NULL,
    processed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payment_transactions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payment_transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payment_transactions_id_seq OWNED BY public.payment_transactions.id;


--
-- Name: payments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.payments (
    id integer NOT NULL,
    payment_number character varying(50) NOT NULL,
    payment_date date NOT NULL,
    payment_method character varying(50) NOT NULL,
    vendor_code character varying(50),
    vendor_name character varying(255),
    customer_code character varying(50),
    customer_name character varying(255),
    payment_type character varying(20) NOT NULL,
    total_amount numeric(15,2) NOT NULL,
    currency character varying(10) DEFAULT 'USD'::character varying,
    bank_account character varying(100),
    reference character varying(255),
    status character varying(20) DEFAULT 'processed'::character varying,
    cleared_amount numeric(15,2) DEFAULT 0,
    remaining_amount numeric(15,2) DEFAULT 0,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    amount numeric(15,2) DEFAULT 0 NOT NULL
);


--
-- Name: payments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.payments_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: payments_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.payments_id_seq OWNED BY public.payments.id;


--
-- Name: plants; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plants (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    company_code_id integer NOT NULL,
    type text NOT NULL,
    category text,
    address text,
    city text,
    state text,
    country text,
    postal_code text,
    phone text,
    email text,
    manager text,
    timezone text,
    operating_hours text,
    coordinates text,
    status text DEFAULT 'active'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    notes text,
    active boolean DEFAULT true,
    company_code character varying(50)
);


--
-- Name: plants_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.plants_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: plants_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.plants_id_seq OWNED BY public.plants.id;


--
-- Name: player_agent_status_updates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_agent_status_updates (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_agent_id uuid NOT NULL,
    coach_agent_id uuid NOT NULL,
    status_level character varying(10) NOT NULL,
    business_domain character varying(50) NOT NULL,
    status_description text NOT NULL,
    issues_identified jsonb DEFAULT '[]'::jsonb,
    resolution_progress text,
    business_impact character varying(20) DEFAULT 'low'::character varying,
    estimated_resolution_time character varying(50),
    requires_coach_intervention boolean DEFAULT false NOT NULL,
    automatic_update boolean DEFAULT true NOT NULL,
    next_update_due timestamp with time zone,
    last_green_status timestamp with time zone,
    consecutive_red_count integer DEFAULT 0,
    escalation_level integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT player_agent_status_updates_business_impact_check CHECK (((business_impact)::text = ANY ((ARRAY['low'::character varying, 'medium'::character varying, 'high'::character varying, 'critical'::character varying])::text[]))),
    CONSTRAINT player_agent_status_updates_status_level_check CHECK (((status_level)::text = ANY ((ARRAY['green'::character varying, 'amber'::character varying, 'red'::character varying])::text[])))
);


--
-- Name: player_coach_communications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.player_coach_communications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    player_agent_id uuid NOT NULL,
    coach_agent_id uuid NOT NULL,
    communication_type character varying(30) NOT NULL,
    subject character varying(200) NOT NULL,
    message text NOT NULL,
    business_context jsonb NOT NULL,
    urgency_level character varying(20) DEFAULT 'normal'::character varying NOT NULL,
    response_required boolean DEFAULT true NOT NULL,
    coach_response text,
    response_guidance text,
    status character varying(20) DEFAULT 'sent'::character varying NOT NULL,
    read_at timestamp without time zone,
    responded_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: posting_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.posting_rules (
    id integer NOT NULL,
    document_type character varying(20) NOT NULL,
    rule_description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: posting_rules_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.posting_rules_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: posting_rules_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.posting_rules_id_seq OWNED BY public.posting_rules.id;


--
-- Name: pricing_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.pricing_conditions (
    id integer NOT NULL,
    condition_type character varying(4) NOT NULL,
    description character varying(100),
    calculation_type character varying(1) DEFAULT 'A'::character varying,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: pricing_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_conditions_id_seq OWNED BY public.pricing_conditions.id;


--
-- Name: sd_pricing_procedures; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_pricing_procedures (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    steps jsonb,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: pricing_procedures_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.pricing_procedures_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: pricing_procedures_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.pricing_procedures_id_seq OWNED BY public.sd_pricing_procedures.id;


--
-- Name: production_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    material_id integer,
    bom_id integer,
    plant_id integer,
    work_center_id integer,
    order_type character varying(20) NOT NULL,
    planned_quantity numeric(15,3) NOT NULL,
    actual_quantity numeric(15,3) DEFAULT 0,
    scrap_quantity numeric(15,3) DEFAULT 0,
    unit_of_measure character varying(10),
    planned_start_date date NOT NULL,
    planned_end_date date NOT NULL,
    actual_start_date date,
    actual_end_date date,
    priority character varying(10) DEFAULT 'NORMAL'::character varying,
    status character varying(20) DEFAULT 'CREATED'::character varying,
    cost_center_id integer,
    created_by integer,
    released_by integer,
    release_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: production_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_orders_id_seq OWNED BY public.production_orders.id;


--
-- Name: production_work_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.production_work_orders (
    id integer NOT NULL,
    production_order_id integer,
    material_id integer,
    work_center_id integer,
    quantity numeric(15,3),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    status character varying(20) DEFAULT 'planned'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: production_work_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.production_work_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: production_work_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.production_work_orders_id_seq OWNED BY public.production_work_orders.id;


--
-- Name: products; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.products (
    id integer NOT NULL,
    name text NOT NULL,
    sku text NOT NULL,
    description text,
    price double precision NOT NULL,
    cost double precision NOT NULL,
    stock integer DEFAULT 0 NOT NULL,
    min_stock integer DEFAULT 10 NOT NULL,
    category_id integer,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: products_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.products_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: products_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.products_id_seq OWNED BY public.products.id;


--
-- Name: profit_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.profit_centers (
    id integer NOT NULL,
    profit_center character varying(10) NOT NULL,
    description character varying(100) NOT NULL,
    profit_center_group character varying(20),
    company_code character varying(4) NOT NULL,
    controlling_area character varying(4) NOT NULL,
    segment character varying(10),
    hierarchy_area character varying(20),
    responsible_person character varying(50),
    valid_from date NOT NULL,
    valid_to date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    company_code_id integer,
    plant_id integer,
    responsible_person_id integer,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: profit_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.profit_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: profit_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.profit_centers_id_seq OWNED BY public.profit_centers.id;


--
-- Name: purchase_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_groups (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by text,
    updated_by text,
    version integer DEFAULT 1 NOT NULL,
    valid_from timestamp without time zone DEFAULT now() NOT NULL,
    valid_to timestamp without time zone,
    active boolean DEFAULT true
);


--
-- Name: purchase_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_groups_id_seq OWNED BY public.purchase_groups.id;


--
-- Name: purchase_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_order_items (
    id integer NOT NULL,
    purchase_order_id integer,
    line_number integer NOT NULL,
    material_id integer,
    description text,
    quantity numeric(15,3) NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    total_price numeric(15,2) NOT NULL,
    delivery_date date,
    plant_id integer,
    storage_location_id integer,
    tax_code character varying(10),
    discount_percent numeric(5,2),
    received_quantity numeric(15,3) DEFAULT 0,
    invoiced_quantity numeric(15,3) DEFAULT 0,
    status character varying(20) DEFAULT 'OPEN'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_order_items_id_seq OWNED BY public.purchase_order_items.id;


--
-- Name: purchase_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_orders (
    id integer NOT NULL,
    order_number character varying(20) NOT NULL,
    vendor_id integer,
    purchase_organization_id integer,
    company_code_id integer,
    plant_id integer,
    order_date date NOT NULL,
    delivery_date date,
    payment_terms character varying(50),
    currency_id integer,
    exchange_rate numeric(10,4) DEFAULT 1.0,
    total_amount numeric(15,2),
    tax_amount numeric(15,2),
    discount_amount numeric(15,2),
    net_amount numeric(15,2),
    status character varying(20) DEFAULT 'OPEN'::character varying,
    created_by integer,
    approved_by integer,
    approval_date timestamp without time zone,
    notes text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    vendor_name character varying(255)
);


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_orders_id_seq OWNED BY public.purchase_orders.id;


--
-- Name: purchase_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_organizations (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    company_code_id integer NOT NULL,
    currency character varying(3) DEFAULT 'USD'::character varying,
    purchasing_manager character varying(100),
    email character varying(100),
    phone character varying(50),
    address text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    version integer DEFAULT 1,
    valid_from date DEFAULT CURRENT_DATE,
    valid_to date,
    purchasing_group text,
    supply_type text,
    approval_level text,
    city text,
    state text,
    country text,
    postal_code text,
    status text DEFAULT 'active'::text NOT NULL,
    notes text,
    manager text,
    active boolean DEFAULT true
);


--
-- Name: purchase_organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_organizations_id_seq OWNED BY public.purchase_organizations.id;


--
-- Name: purchase_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchase_requests (
    id integer NOT NULL,
    description text NOT NULL,
    amount numeric(15,2),
    priority character varying(20) DEFAULT 'Medium'::character varying,
    cost_center_id integer,
    requester_id integer,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchase_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchase_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchase_requests_id_seq OWNED BY public.purchase_requests.id;


--
-- Name: purchasing_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchasing_groups (
    id integer NOT NULL,
    group_code character varying(50) NOT NULL,
    group_name character varying(255) NOT NULL,
    description text,
    phone character varying(50),
    email character varying(255),
    responsible_person character varying(255),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchasing_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchasing_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchasing_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchasing_groups_id_seq OWNED BY public.purchasing_groups.id;


--
-- Name: purchasing_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.purchasing_organizations (
    id integer NOT NULL,
    org_code character varying(50) NOT NULL,
    org_name character varying(255) NOT NULL,
    description text,
    company_code character varying(50),
    plant_code character varying(50),
    currency character varying(10),
    address text,
    phone character varying(50),
    email character varying(255),
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: purchasing_organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.purchasing_organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: purchasing_organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.purchasing_organizations_id_seq OWNED BY public.purchasing_organizations.id;


--
-- Name: quote_approvals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_approvals (
    id integer NOT NULL,
    quote_id integer,
    requested_by integer NOT NULL,
    requested_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'Pending'::character varying NOT NULL,
    current_approver integer,
    approved_by integer,
    approved_at timestamp without time zone,
    rejected_by integer,
    rejected_at timestamp without time zone,
    rejection_reason text,
    comments text,
    approval_level character varying(50),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: quote_approvals_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_approvals_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_approvals_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_approvals_id_seq OWNED BY public.quote_approvals.id;


--
-- Name: quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quote_items (
    id integer NOT NULL,
    quote_id integer,
    product_id integer,
    description text NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    line_total numeric(15,2) NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quote_items_id_seq OWNED BY public.quote_items.id;


--
-- Name: quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.quotes (
    id integer NOT NULL,
    quote_number character varying(50) NOT NULL,
    opportunity_id integer,
    customer_id integer,
    status character varying(50) DEFAULT 'Draft'::character varying NOT NULL,
    valid_until timestamp without time zone,
    total_amount numeric(15,2) NOT NULL,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    grand_total numeric(15,2) NOT NULL,
    terms text,
    notes text,
    assigned_to integer,
    approval_status character varying(50) DEFAULT 'Pending'::character varying,
    approved_by integer,
    approved_at timestamp without time zone,
    rejected_reason text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.quotes_id_seq OWNED BY public.quotes.id;


--
-- Name: regions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.regions (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: regions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.regions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: regions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.regions_id_seq OWNED BY public.regions.id;


--
-- Name: reports; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.reports (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    sql_query text NOT NULL,
    chart_config jsonb,
    category character varying(100) DEFAULT 'custom'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: reports_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.reports_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: reports_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.reports_id_seq OWNED BY public.reports.id;


--
-- Name: rookie_agent_data_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rookie_agent_data_entries (
    id integer NOT NULL,
    agent_id character varying(255) NOT NULL,
    business_domain character varying(100) NOT NULL,
    entry_type character varying(100) NOT NULL,
    data_content jsonb DEFAULT '{}'::jsonb NOT NULL,
    validation_status character varying(50) DEFAULT 'pending'::character varying NOT NULL,
    validation_results jsonb DEFAULT '{}'::jsonb,
    supervisor_notes text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    status character varying(50) DEFAULT 'pending'::character varying
);


--
-- Name: rookie_agent_data_entries_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rookie_agent_data_entries_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rookie_agent_data_entries_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rookie_agent_data_entries_id_seq OWNED BY public.rookie_agent_data_entries.id;


--
-- Name: rookie_agent_quality_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rookie_agent_quality_checks (
    id integer NOT NULL,
    agent_id character varying(255) NOT NULL,
    business_domain character varying(100) NOT NULL,
    check_type character varying(100) NOT NULL,
    target_data jsonb DEFAULT '{}'::jsonb NOT NULL,
    check_results jsonb DEFAULT '{}'::jsonb,
    quality_score numeric(5,2) DEFAULT 0.00,
    issues_found jsonb DEFAULT '[]'::jsonb,
    recommendations text,
    reviewed_by character varying(255),
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rookie_agent_quality_checks_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rookie_agent_quality_checks_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rookie_agent_quality_checks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rookie_agent_quality_checks_id_seq OWNED BY public.rookie_agent_quality_checks.id;


--
-- Name: rookie_agent_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rookie_agent_sessions (
    id integer NOT NULL,
    agent_id character varying(255) NOT NULL,
    session_type character varying(100) NOT NULL,
    business_domain character varying(100) NOT NULL,
    start_time timestamp without time zone DEFAULT now() NOT NULL,
    end_time timestamp without time zone,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    activities jsonb DEFAULT '{}'::jsonb,
    performance_metrics jsonb DEFAULT '{}'::jsonb,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    screen_name character varying(255)
);


--
-- Name: rookie_agent_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rookie_agent_sessions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rookie_agent_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rookie_agent_sessions_id_seq OWNED BY public.rookie_agent_sessions.id;


--
-- Name: rookie_agent_training; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.rookie_agent_training (
    id integer NOT NULL,
    agent_id character varying(255) NOT NULL,
    business_domain character varying(100) NOT NULL,
    training_module character varying(100) NOT NULL,
    completion_status character varying(50) DEFAULT 'in_progress'::character varying NOT NULL,
    progress_percentage integer DEFAULT 0,
    training_data jsonb DEFAULT '{}'::jsonb,
    assessment_results jsonb DEFAULT '{}'::jsonb,
    mentor_feedback text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL
);


--
-- Name: rookie_agent_training_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.rookie_agent_training_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: rookie_agent_training_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.rookie_agent_training_id_seq OWNED BY public.rookie_agent_training.id;


--
-- Name: sd_sales_areas; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_sales_areas (
    id integer NOT NULL,
    sales_org_code character varying(4) NOT NULL,
    distribution_channel_code character varying(2) NOT NULL,
    division_code character varying(2) NOT NULL,
    name character varying(100) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sales_areas_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_areas_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_areas_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_areas_id_seq OWNED BY public.sd_sales_areas.id;


--
-- Name: sales_customer_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_customer_contacts (
    id integer NOT NULL,
    customer_id integer,
    name character varying(255) NOT NULL,
    "position" character varying(100),
    email character varying(255),
    phone character varying(50),
    is_primary boolean DEFAULT false,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_customer_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_customer_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_customer_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_customer_contacts_id_seq OWNED BY public.sales_customer_contacts.id;


--
-- Name: sales_customers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_customers (
    id integer NOT NULL,
    customer_number character varying(50) NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_person character varying(255),
    email character varying(255),
    phone character varying(50),
    website character varying(255),
    industry character varying(100),
    customer_type character varying(50) DEFAULT 'Business'::character varying,
    billing_address text,
    shipping_address text,
    tax_id character varying(100),
    payment_terms character varying(100),
    credit_limit numeric(15,2),
    status character varying(50) DEFAULT 'Active'::character varying,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_customers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_customers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_customers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_customers_id_seq OWNED BY public.sales_customers.id;


--
-- Name: sales_invoice_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoice_items (
    id integer NOT NULL,
    invoice_id integer,
    product_name character varying(255) NOT NULL,
    description text,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    subtotal numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoice_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoice_items_id_seq OWNED BY public.sales_invoice_items.id;


--
-- Name: sales_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_invoices (
    id integer NOT NULL,
    invoice_number character varying(50) NOT NULL,
    order_id integer,
    customer_name character varying(255) NOT NULL,
    invoice_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    due_date timestamp with time zone,
    status character varying(50) DEFAULT 'Pending'::character varying,
    total_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    grand_total numeric(15,2) DEFAULT 0,
    paid_amount numeric(15,2) DEFAULT 0,
    payment_method character varying(50),
    payment_date timestamp with time zone,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_invoices_id_seq OWNED BY public.sales_invoices.id;


--
-- Name: sales_order_conditions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_conditions (
    id integer NOT NULL,
    sales_order_id integer,
    condition_type_id integer,
    condition_code character varying(10) NOT NULL,
    condition_name character varying(100) NOT NULL,
    calculation_type character varying(20) NOT NULL,
    base_amount numeric(15,2) DEFAULT 0,
    condition_value numeric(15,4) DEFAULT 0,
    condition_amount numeric(15,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    sequence_number integer DEFAULT 1,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    category_id integer,
    calculation_method_id integer,
    calculation_source character varying(50) DEFAULT 'MANUAL'::character varying,
    override_reason text,
    is_locked boolean DEFAULT false
);


--
-- Name: sales_order_conditions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_order_conditions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_order_conditions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_order_conditions_id_seq OWNED BY public.sales_order_conditions.id;


--
-- Name: sales_order_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_order_items (
    id integer NOT NULL,
    order_id integer,
    product_id integer,
    product_name character varying(255),
    quantity integer NOT NULL,
    unit_price numeric(15,2) DEFAULT 0 NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    subtotal numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_order_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_order_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_order_items_id_seq OWNED BY public.sales_order_items.id;


--
-- Name: sales_orders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_orders (
    id integer NOT NULL,
    order_number character varying(50) NOT NULL,
    customer_id integer,
    customer_name character varying(255) NOT NULL,
    order_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    delivery_date timestamp with time zone,
    status character varying(50) DEFAULT 'Pending'::character varying,
    total_amount numeric(15,2) DEFAULT 0,
    payment_status character varying(50) DEFAULT 'Unpaid'::character varying,
    shipping_address text,
    billing_address text,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    plant_id integer,
    sales_org_id integer,
    company_code_id integer,
    currency_id integer,
    active boolean DEFAULT true
);


--
-- Name: sales_orders_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_orders_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_orders_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_orders_id_seq OWNED BY public.sales_orders.id;


--
-- Name: sales_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_organizations (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    company_code_id integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: sd_sales_organizations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_sales_organizations (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name text NOT NULL,
    description text,
    company_code_id integer NOT NULL,
    currency text DEFAULT 'USD'::text,
    region text,
    distribution_channel text,
    industry text,
    address text,
    city text,
    state text,
    country text,
    postal_code text,
    phone text,
    email text,
    manager text,
    status text DEFAULT 'active'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    created_by integer,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: sales_organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_organizations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_organizations_id_seq OWNED BY public.sd_sales_organizations.id;


--
-- Name: sales_organizations_id_seq1; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_organizations_id_seq1
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_organizations_id_seq1; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_organizations_id_seq1 OWNED BY public.sales_organizations.id;


--
-- Name: sales_quote_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quote_items (
    id integer NOT NULL,
    quote_id integer,
    product_name character varying(255) NOT NULL,
    description text,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    discount_percent numeric(5,2) DEFAULT 0,
    tax_percent numeric(5,2) DEFAULT 0,
    subtotal numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_quote_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_quote_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_quote_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_quote_items_id_seq OWNED BY public.sales_quote_items.id;


--
-- Name: sales_quotes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_quotes (
    id integer NOT NULL,
    quote_number character varying(50) NOT NULL,
    opportunity_id integer,
    customer_name character varying(255) NOT NULL,
    quote_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    valid_until timestamp with time zone,
    status character varying(50) DEFAULT 'Draft'::character varying,
    total_amount numeric(15,2) DEFAULT 0,
    discount_amount numeric(15,2) DEFAULT 0,
    tax_amount numeric(15,2) DEFAULT 0,
    grand_total numeric(15,2) DEFAULT 0,
    notes text,
    terms_conditions text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_quotes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_quotes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_quotes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_quotes_id_seq OWNED BY public.sales_quotes.id;


--
-- Name: sales_return_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_return_items (
    id integer NOT NULL,
    return_id integer,
    product_name character varying(255) NOT NULL,
    quantity integer NOT NULL,
    unit_price numeric(15,2) NOT NULL,
    subtotal numeric(15,2) NOT NULL,
    return_reason text,
    condition character varying(50),
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_return_items_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_return_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_return_items_id_seq OWNED BY public.sales_return_items.id;


--
-- Name: sales_returns; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sales_returns (
    id integer NOT NULL,
    return_number character varying(50) NOT NULL,
    order_id integer,
    invoice_id integer,
    customer_name character varying(255) NOT NULL,
    return_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(50) DEFAULT 'Pending'::character varying,
    total_amount numeric(15,2) DEFAULT 0,
    return_reason text,
    notes text,
    created_by integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: sales_returns_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.sales_returns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: sales_returns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.sales_returns_id_seq OWNED BY public.sales_returns.id;


--
-- Name: sd_access_sequences; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_access_sequences (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    condition_type character varying(4) NOT NULL,
    access_order jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_access_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_access_sequences ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_access_sequences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_account_assignment_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_account_assignment_groups (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_account_assignment_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_account_assignment_groups ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_account_assignment_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_client_configurations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_client_configurations (
    id integer NOT NULL,
    client_id character varying(50) NOT NULL,
    table_prefix character varying(100) NOT NULL,
    uses_custom_tables boolean DEFAULT false,
    configuration_status character varying(20) DEFAULT 'standard'::character varying,
    last_customization_date timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_client_configurations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_client_configurations ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_client_configurations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_condition_tables; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_condition_tables (
    id integer NOT NULL,
    table_number character varying(3) NOT NULL,
    name character varying(50) NOT NULL,
    fields jsonb NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_condition_tables_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_condition_tables ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_condition_tables_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_customer_tax_classification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_customer_tax_classification (
    id integer NOT NULL,
    customer_id integer NOT NULL,
    tax_category character varying(4) NOT NULL,
    tax_code character varying(2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_customization_log; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_customization_log (
    id integer NOT NULL,
    client_id character varying(50) NOT NULL,
    table_prefix character varying(100) NOT NULL,
    customization_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    error_message text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_customization_log_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_customization_log ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_customization_log_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_item_categories; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_item_categories (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    document_category character varying(10) NOT NULL,
    item_type character varying(10) NOT NULL,
    delivery_relevant boolean DEFAULT true,
    billing_relevant boolean DEFAULT true,
    pricing_relevant boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_item_categories_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_item_categories ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_item_categories_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_material_tax_classification; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_material_tax_classification (
    id integer NOT NULL,
    material_id integer NOT NULL,
    tax_category character varying(4) NOT NULL,
    tax_code character varying(2) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_output_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_output_types (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    application character varying(2) NOT NULL,
    medium character varying(1) NOT NULL,
    program_name character varying(30),
    form_name character varying(30),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_output_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_output_types ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_output_types_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_partner_functions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_partner_functions (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    mandatory boolean DEFAULT false,
    unique_per_document boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_partner_functions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_partner_functions ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_partner_functions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_revenue_account_rules; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_revenue_account_rules (
    id integer NOT NULL,
    sales_org_code character varying(4) NOT NULL,
    account_assignment_group character varying(2) NOT NULL,
    material_group character varying(9),
    gl_account character varying(10) NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_sales_office_assignments; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_sales_office_assignments (
    id integer NOT NULL,
    sales_office_code character varying(4) NOT NULL,
    sales_area_id integer NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_sales_office_assignments_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_sales_office_assignments ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_sales_office_assignments_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_sales_offices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_sales_offices (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_sales_offices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_sales_offices ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_sales_offices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_shipping_points; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_shipping_points (
    id integer NOT NULL,
    code character varying(4) NOT NULL,
    name character varying(50) NOT NULL,
    plant_code character varying(4) NOT NULL,
    factory_calendar character varying(2),
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: sd_shipping_points_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

ALTER TABLE public.sd_shipping_points ALTER COLUMN id ADD GENERATED ALWAYS AS IDENTITY (
    SEQUENCE NAME public.sd_shipping_points_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
);


--
-- Name: sd_tax_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.sd_tax_codes (
    id integer NOT NULL,
    code character varying(2) NOT NULL,
    name character varying(50) NOT NULL,
    country character varying(3) NOT NULL,
    tax_rate numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: stock_movements; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.stock_movements (
    id integer NOT NULL,
    product_id integer,
    type text NOT NULL,
    quantity integer NOT NULL,
    reason text NOT NULL,
    date timestamp without time zone DEFAULT now() NOT NULL,
    user_id integer,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: stock_movements_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.stock_movements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: stock_movements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.stock_movements_id_seq OWNED BY public.stock_movements.id;


--
-- Name: storage_locations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.storage_locations (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    plant_id integer NOT NULL,
    type text NOT NULL,
    is_mrp_relevant boolean DEFAULT true NOT NULL,
    is_negative_stock_allowed boolean DEFAULT false NOT NULL,
    is_goods_receipt_relevant boolean DEFAULT true NOT NULL,
    is_goods_issue_relevant boolean DEFAULT true NOT NULL,
    is_interim_storage boolean DEFAULT false NOT NULL,
    is_transit_storage boolean DEFAULT false NOT NULL,
    is_restricted_use boolean DEFAULT false NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    notes text,
    active boolean DEFAULT true
);


--
-- Name: storage_locations_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.storage_locations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: storage_locations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.storage_locations_id_seq OWNED BY public.storage_locations.id;


--
-- Name: supply_types; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.supply_types (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by text,
    updated_by text,
    version integer DEFAULT 1 NOT NULL,
    valid_from timestamp without time zone DEFAULT now() NOT NULL,
    valid_to timestamp without time zone,
    active boolean DEFAULT true
);


--
-- Name: supply_types_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.supply_types_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: supply_types_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.supply_types_id_seq OWNED BY public.supply_types.id;


--
-- Name: system_error_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.system_error_logs (
    id integer NOT NULL,
    "timestamp" timestamp with time zone NOT NULL,
    level character varying(10) NOT NULL,
    module character varying(100) NOT NULL,
    message text NOT NULL,
    stack text,
    additional_data jsonb,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: system_error_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.system_error_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: system_error_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.system_error_logs_id_seq OWNED BY public.system_error_logs.id;


--
-- Name: tax_codes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_codes (
    id integer NOT NULL,
    company_code_id integer,
    tax_code character varying(10) NOT NULL,
    description text,
    tax_rate numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tax_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_codes_id_seq OWNED BY public.tax_codes.id;


--
-- Name: tax_jurisdictions; Type: TABLE; Schema: public; Owner: -
--

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


--
-- Name: tax_jurisdictions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_jurisdictions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_jurisdictions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_jurisdictions_id_seq OWNED BY public.tax_jurisdictions.id;


--
-- Name: tax_rates; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tax_rates (
    id integer NOT NULL,
    tax_code_id integer,
    rate_percentage numeric(5,2) NOT NULL,
    effective_date date NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now()
);


--
-- Name: tax_rates_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tax_rates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tax_rates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tax_rates_id_seq OWNED BY public.tax_rates.id;


--
-- Name: test_cases; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_cases (
    id character varying(255) NOT NULL,
    component character varying(255) NOT NULL,
    test_type character varying(50) NOT NULL,
    description text NOT NULL,
    steps jsonb,
    expected_result text,
    status character varying(50) DEFAULT 'pending'::character varying,
    priority character varying(20) DEFAULT 'medium'::character varying,
    domain character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_results; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.test_results (
    id integer NOT NULL,
    test_id character varying(255),
    status character varying(50) NOT NULL,
    duration integer,
    error_message text,
    logs jsonb,
    coverage integer,
    performance jsonb,
    executed_at timestamp with time zone DEFAULT now()
);


--
-- Name: test_results_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.test_results_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: test_results_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.test_results_id_seq OWNED BY public.test_results.id;


--
-- Name: tile_naming_documentation; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tile_naming_documentation (
    id integer NOT NULL,
    alphabetic_prefix text NOT NULL,
    prefix_name text NOT NULL,
    description text NOT NULL,
    number_range text NOT NULL,
    process_logic text,
    customized_prefix text,
    examples jsonb,
    business_justification text,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tile_naming_documentation_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tile_naming_documentation_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tile_naming_documentation_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tile_naming_documentation_id_seq OWNED BY public.tile_naming_documentation.id;


--
-- Name: tile_registry; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tile_registry (
    id integer NOT NULL,
    tile_number text NOT NULL,
    tile_id text NOT NULL,
    title text NOT NULL,
    description text,
    category text NOT NULL,
    route text NOT NULL,
    icon text NOT NULL,
    module_group text NOT NULL,
    required_roles jsonb NOT NULL,
    process_sequence integer,
    alphabetic_prefix text NOT NULL,
    is_customized boolean DEFAULT false,
    base_standard_tile text,
    business_process text,
    functional_area text,
    implementation_notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tile_registry_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tile_registry_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tile_registry_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tile_registry_id_seq OWNED BY public.tile_registry.id;


--
-- Name: tolerance_groups; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.tolerance_groups (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(50) NOT NULL,
    description text,
    company_code character varying(10) NOT NULL,
    user_type character varying(20) NOT NULL,
    upper_amount_limit numeric(15,2),
    percentage_limit numeric(5,2),
    absolute_amount_limit numeric(15,2),
    payment_difference_tolerance numeric(15,2),
    cash_discount_tolerance numeric(15,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: tolerance_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.tolerance_groups_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: tolerance_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.tolerance_groups_id_seq OWNED BY public.tolerance_groups.id;


--
-- Name: transport_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_logs (
    id integer NOT NULL,
    request_id integer,
    environment character varying(10) NOT NULL,
    action character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    message text,
    executed_by character varying(100),
    executed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transport_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transport_logs_id_seq OWNED BY public.transport_logs.id;


--
-- Name: transport_number_ranges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_number_ranges (
    id integer NOT NULL,
    range_prefix character varying(2) NOT NULL,
    range_type character varying(50) NOT NULL,
    description text,
    current_number integer DEFAULT 100000,
    max_number integer DEFAULT 999999,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true
);


--
-- Name: transport_number_ranges_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_number_ranges_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_number_ranges_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transport_number_ranges_id_seq OWNED BY public.transport_number_ranges.id;


--
-- Name: transport_objects; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_objects (
    id integer NOT NULL,
    request_id integer,
    object_type character varying(50) NOT NULL,
    object_name character varying(100) NOT NULL,
    table_name character varying(100) NOT NULL,
    record_id integer,
    action character varying(20) NOT NULL,
    data_snapshot jsonb,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transport_objects_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_objects_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_objects_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transport_objects_id_seq OWNED BY public.transport_objects.id;


--
-- Name: transport_requests; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.transport_requests (
    id integer NOT NULL,
    request_number character varying(20) NOT NULL,
    request_type character varying(20) NOT NULL,
    description text,
    owner character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'CREATED'::character varying,
    source_environment character varying(10) DEFAULT 'DEV'::character varying,
    target_environment character varying(10),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    released_at timestamp without time zone,
    imported_at timestamp without time zone,
    release_notes text,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: transport_requests_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.transport_requests_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: transport_requests_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.transport_requests_id_seq OWNED BY public.transport_requests.id;


--
-- Name: units_of_measure; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.units_of_measure (
    id integer NOT NULL,
    code character varying(10) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true,
    dimension character varying(50),
    conversion_factor numeric(15,5) DEFAULT 1.0,
    base_uom_id integer,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    version integer DEFAULT 1,
    active boolean DEFAULT true
);


--
-- Name: units_of_measure_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.units_of_measure_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: units_of_measure_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.units_of_measure_id_seq OWNED BY public.units_of_measure.id;


--
-- Name: uom; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uom (
    id integer NOT NULL,
    code text NOT NULL,
    name text NOT NULL,
    description text,
    category text NOT NULL,
    is_base boolean DEFAULT false NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    active boolean DEFAULT true
);


--
-- Name: uom_conversions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.uom_conversions (
    id integer NOT NULL,
    from_uom_id integer NOT NULL,
    to_uom_id integer NOT NULL,
    conversion_factor numeric NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    created_by integer,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    notes text,
    active boolean DEFAULT true
);


--
-- Name: uom_conversions_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uom_conversions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uom_conversions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uom_conversions_id_seq OWNED BY public.uom_conversions.id;


--
-- Name: uom_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.uom_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: uom_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.uom_id_seq OWNED BY public.uom.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.users (
    id integer NOT NULL,
    username text NOT NULL,
    password text NOT NULL,
    name text NOT NULL,
    email text NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone DEFAULT now() NOT NULL,
    active boolean DEFAULT true
);


--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.users_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: valuation_classes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.valuation_classes (
    id integer NOT NULL,
    class_code character varying(50) NOT NULL,
    class_name character varying(255) NOT NULL,
    description text,
    valuation_method character varying(50),
    price_control character varying(10),
    moving_price boolean DEFAULT false,
    standard_price boolean DEFAULT false,
    active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: valuation_classes_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.valuation_classes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: valuation_classes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.valuation_classes_id_seq OWNED BY public.valuation_classes.id;


--
-- Name: variance_analysis; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.variance_analysis (
    id integer NOT NULL,
    variance_type character varying(20) NOT NULL,
    object_type character varying(20) NOT NULL,
    object_number character varying(20) NOT NULL,
    fiscal_year integer NOT NULL,
    period integer NOT NULL,
    account character varying(10),
    cost_element character varying(10),
    planned_amount numeric(15,2) DEFAULT 0,
    actual_amount numeric(15,2) DEFAULT 0,
    variance_amount numeric(15,2) DEFAULT 0,
    variance_percentage numeric(5,2) DEFAULT 0,
    currency character varying(3) DEFAULT 'USD'::character varying,
    analysis_date date NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: variance_analysis_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.variance_analysis_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: variance_analysis_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.variance_analysis_id_seq OWNED BY public.variance_analysis.id;


--
-- Name: vendor_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_contacts (
    id integer NOT NULL,
    vendor_id integer NOT NULL,
    first_name character varying(50) NOT NULL,
    last_name character varying(50) NOT NULL,
    "position" character varying(100),
    department character varying(100),
    email character varying(100),
    phone character varying(30),
    mobile character varying(30),
    is_primary boolean DEFAULT false,
    is_order_contact boolean DEFAULT false,
    is_purchase_contact boolean DEFAULT false,
    is_quality_contact boolean DEFAULT false,
    is_accounts_contact boolean DEFAULT false,
    preferred_language character varying(50) DEFAULT 'English'::character varying,
    notes text,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    active boolean DEFAULT true
);


--
-- Name: vendor_contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_contacts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_contacts_id_seq OWNED BY public.vendor_contacts.id;


--
-- Name: vendor_invoices; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendor_invoices (
    id integer NOT NULL,
    vendor_id integer,
    purchase_order_id integer,
    goods_receipt_id integer,
    invoice_number character varying(50) NOT NULL,
    invoice_amount numeric(15,2) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    approval_status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendor_invoices_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendor_invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendor_invoices_id_seq OWNED BY public.vendor_invoices.id;


--
-- Name: vendors; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.vendors (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    type character varying(50) NOT NULL,
    description text,
    tax_id character varying(50),
    industry character varying(50),
    address text,
    city character varying(100),
    state character varying(50),
    country character varying(50),
    postal_code character varying(20),
    region character varying(50),
    phone character varying(30),
    alt_phone character varying(30),
    email character varying(100),
    website character varying(255),
    currency character varying(10),
    payment_terms character varying(50),
    payment_method character varying(50),
    supplier_type character varying(50),
    category character varying(50),
    order_frequency character varying(50),
    minimum_order_value numeric,
    evaluation_score numeric,
    lead_time integer,
    purchasing_group_id integer,
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    blacklisted boolean DEFAULT false,
    blacklist_reason text,
    notes text,
    tags text[],
    company_code_id integer,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now(),
    created_by integer,
    updated_by integer,
    version integer DEFAULT 1 NOT NULL,
    active boolean DEFAULT true,
    bank_account character varying(50),
    vendor_type character varying(50) DEFAULT 'supplier'::character varying
);


--
-- Name: vendors_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.vendors_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: vendors_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.vendors_id_seq OWNED BY public.vendors.id;


--
-- Name: warehouse_bins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.warehouse_bins (
    id integer NOT NULL,
    bin_code character varying(20) NOT NULL,
    bin_name character varying(100),
    storage_location_id integer,
    bin_type character varying(20) NOT NULL,
    zone character varying(20),
    aisle character varying(20),
    shelf character varying(20),
    capacity_volume numeric(10,3),
    capacity_weight numeric(10,3),
    current_volume numeric(10,3) DEFAULT 0,
    current_weight numeric(10,3) DEFAULT 0,
    status character varying(20) DEFAULT 'ACTIVE'::character varying,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP
);


--
-- Name: warehouse_bins_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.warehouse_bins_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: warehouse_bins_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.warehouse_bins_id_seq OWNED BY public.warehouse_bins.id;


--
-- Name: work_centers; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.work_centers (
    id integer NOT NULL,
    code character varying(20) NOT NULL,
    name character varying(100) NOT NULL,
    plant_id integer,
    description text,
    capacity numeric(10,2),
    capacity_unit character varying(20),
    cost_rate numeric(15,2),
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    status character varying(20) DEFAULT 'active'::character varying,
    cost_center_id integer,
    company_code_id integer,
    active boolean DEFAULT true
);


--
-- Name: work_centers_id_seq; Type: SEQUENCE; Schema: public; Owner: -
--

CREATE SEQUENCE public.work_centers_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


--
-- Name: work_centers_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: -
--

ALTER SEQUENCE public.work_centers_id_seq OWNED BY public.work_centers.id;


--
-- Name: __drizzle_migrations id; Type: DEFAULT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations ALTER COLUMN id SET DEFAULT nextval('drizzle.__drizzle_migrations_id_seq'::regclass);


--
-- Name: account_determination id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_determination ALTER COLUMN id SET DEFAULT nextval('public.account_determination_id_seq'::regclass);


--
-- Name: account_determination_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_determination_rules ALTER COLUMN id SET DEFAULT nextval('public.account_determination_rules_id_seq'::regclass);


--
-- Name: account_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_groups ALTER COLUMN id SET DEFAULT nextval('public.account_groups_id_seq'::regclass);


--
-- Name: accounting_document_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_document_items ALTER COLUMN id SET DEFAULT nextval('public.accounting_document_items_id_seq'::regclass);


--
-- Name: accounting_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_documents ALTER COLUMN id SET DEFAULT nextval('public.accounting_documents_id_seq'::regclass);


--
-- Name: accounts_payable id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable ALTER COLUMN id SET DEFAULT nextval('public.accounts_payable_id_seq'::regclass);


--
-- Name: accounts_receivable id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable ALTER COLUMN id SET DEFAULT nextval('public.accounts_receivable_id_seq'::regclass);


--
-- Name: activity_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types ALTER COLUMN id SET DEFAULT nextval('public.activity_types_id_seq'::regclass);


--
-- Name: ai_agent_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_analytics ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_analytics_id_seq'::regclass);


--
-- Name: ai_agent_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_configs ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_configs_id_seq'::regclass);


--
-- Name: ai_agent_health id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_health ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_health_id_seq'::regclass);


--
-- Name: ai_agent_interventions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_interventions ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_interventions_id_seq'::regclass);


--
-- Name: ai_agent_performance id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_performance ALTER COLUMN id SET DEFAULT nextval('public.ai_agent_performance_id_seq'::regclass);


--
-- Name: ai_chat_messages id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_messages_id_seq'::regclass);


--
-- Name: ai_chat_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_sessions ALTER COLUMN id SET DEFAULT nextval('public.ai_chat_sessions_id_seq'::regclass);


--
-- Name: ai_data_analysis_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_data_analysis_sessions ALTER COLUMN id SET DEFAULT nextval('public.ai_data_analysis_sessions_id_seq'::regclass);


--
-- Name: ap_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_invoices ALTER COLUMN id SET DEFAULT nextval('public.ap_invoices_id_seq'::regclass);


--
-- Name: ap_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_payments ALTER COLUMN id SET DEFAULT nextval('public.ap_payments_id_seq'::regclass);


--
-- Name: api_keys id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys ALTER COLUMN id SET DEFAULT nextval('public.api_keys_id_seq'::regclass);


--
-- Name: approval_levels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_levels ALTER COLUMN id SET DEFAULT nextval('public.approval_levels_id_seq'::regclass);


--
-- Name: ar_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_documents ALTER COLUMN id SET DEFAULT nextval('public.ar_documents_id_seq'::regclass);


--
-- Name: ar_payment_applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_payment_applications ALTER COLUMN id SET DEFAULT nextval('public.ar_payment_applications_id_seq'::regclass);


--
-- Name: asset_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master ALTER COLUMN id SET DEFAULT nextval('public.asset_master_id_seq'::regclass);


--
-- Name: assets id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets ALTER COLUMN id SET DEFAULT nextval('public.assets_id_seq'::regclass);


--
-- Name: bank_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts ALTER COLUMN id SET DEFAULT nextval('public.bank_accounts_id_seq'::regclass);


--
-- Name: bank_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_master ALTER COLUMN id SET DEFAULT nextval('public.bank_master_id_seq'::regclass);


--
-- Name: bank_statement_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_items ALTER COLUMN id SET DEFAULT nextval('public.bank_statement_items_id_seq'::regclass);


--
-- Name: bank_statements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements ALTER COLUMN id SET DEFAULT nextval('public.bank_statements_id_seq'::regclass);


--
-- Name: bank_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions ALTER COLUMN id SET DEFAULT nextval('public.bank_transactions_id_seq'::regclass);


--
-- Name: batch_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_master ALTER COLUMN id SET DEFAULT nextval('public.batch_master_id_seq'::regclass);


--
-- Name: bill_of_materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials ALTER COLUMN id SET DEFAULT nextval('public.bill_of_materials_id_seq'::regclass);


--
-- Name: billing_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_documents ALTER COLUMN id SET DEFAULT nextval('public.billing_documents_id_seq'::regclass);


--
-- Name: billing_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items ALTER COLUMN id SET DEFAULT nextval('public.billing_items_id_seq'::regclass);


--
-- Name: bom_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items ALTER COLUMN id SET DEFAULT nextval('public.bom_items_id_seq'::regclass);


--
-- Name: calculation_methods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculation_methods ALTER COLUMN id SET DEFAULT nextval('public.calculation_methods_id_seq'::regclass);


--
-- Name: cash_positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_positions ALTER COLUMN id SET DEFAULT nextval('public.cash_positions_id_seq'::regclass);


--
-- Name: categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories ALTER COLUMN id SET DEFAULT nextval('public.categories_id_seq'::regclass);


--
-- Name: change_document_analytics id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_analytics ALTER COLUMN id SET DEFAULT nextval('public.change_document_analytics_id_seq'::regclass);


--
-- Name: change_document_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_approvals ALTER COLUMN id SET DEFAULT nextval('public.change_document_approvals_id_seq'::regclass);


--
-- Name: change_document_attachments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_attachments ALTER COLUMN id SET DEFAULT nextval('public.change_document_attachments_id_seq'::regclass);


--
-- Name: change_document_headers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers ALTER COLUMN id SET DEFAULT nextval('public.change_document_headers_id_seq'::regclass);


--
-- Name: change_document_positions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_positions ALTER COLUMN id SET DEFAULT nextval('public.change_document_positions_id_seq'::regclass);


--
-- Name: change_document_relations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_relations ALTER COLUMN id SET DEFAULT nextval('public.change_document_relations_id_seq'::regclass);


--
-- Name: chart_of_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts ALTER COLUMN id SET DEFAULT nextval('public.chart_of_accounts_id_seq'::regclass);


--
-- Name: chief_agent_action_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_action_log ALTER COLUMN id SET DEFAULT nextval('public.chief_agent_action_log_id_seq'::regclass);


--
-- Name: chief_agent_permissions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_permissions ALTER COLUMN id SET DEFAULT nextval('public.chief_agent_permissions_id_seq'::regclass);


--
-- Name: clearing_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearing_configurations ALTER COLUMN id SET DEFAULT nextval('public.clearing_configurations_id_seq'::regclass);


--
-- Name: clearing_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearing_items ALTER COLUMN id SET DEFAULT nextval('public.clearing_items_id_seq'::regclass);


--
-- Name: collection_activities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_activities ALTER COLUMN id SET DEFAULT nextval('public.collection_activities_id_seq'::regclass);


--
-- Name: companies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies ALTER COLUMN id SET DEFAULT nextval('public.companies_id_seq'::regclass);


--
-- Name: company_code_chart_assignments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_code_chart_assignments ALTER COLUMN id SET DEFAULT nextval('public.company_code_chart_assignments_id_seq'::regclass);


--
-- Name: company_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes ALTER COLUMN id SET DEFAULT nextval('public.company_codes_id_seq'::regclass);


--
-- Name: comprehensive_issues_log id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprehensive_issues_log ALTER COLUMN id SET DEFAULT nextval('public.comprehensive_issues_log_id_seq'::regclass);


--
-- Name: condition_access_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_access_rules ALTER COLUMN id SET DEFAULT nextval('public.condition_access_rules_id_seq'::regclass);


--
-- Name: condition_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_categories ALTER COLUMN id SET DEFAULT nextval('public.condition_categories_id_seq'::regclass);


--
-- Name: condition_dependencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_dependencies ALTER COLUMN id SET DEFAULT nextval('public.condition_dependencies_id_seq'::regclass);


--
-- Name: condition_records id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_records ALTER COLUMN id SET DEFAULT nextval('public.condition_records_id_seq'::regclass);


--
-- Name: condition_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types ALTER COLUMN id SET DEFAULT nextval('public.condition_types_id_seq1'::regclass);


--
-- Name: copa_actuals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copa_actuals ALTER COLUMN id SET DEFAULT nextval('public.copa_actuals_id_seq'::regclass);


--
-- Name: cost_allocations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_allocations ALTER COLUMN id SET DEFAULT nextval('public.cost_allocations_id_seq'::regclass);


--
-- Name: cost_center_actuals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_actuals ALTER COLUMN id SET DEFAULT nextval('public.cost_center_actuals_id_seq'::regclass);


--
-- Name: cost_center_planning id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_planning ALTER COLUMN id SET DEFAULT nextval('public.cost_center_planning_id_seq'::regclass);


--
-- Name: cost_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers ALTER COLUMN id SET DEFAULT nextval('public.cost_centers_id_seq'::regclass);


--
-- Name: cost_elements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_elements ALTER COLUMN id SET DEFAULT nextval('public.cost_elements_id_seq'::regclass);


--
-- Name: countries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries ALTER COLUMN id SET DEFAULT nextval('public.countries_id_seq'::regclass);


--
-- Name: credit_control_areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_control_areas ALTER COLUMN id SET DEFAULT nextval('public.credit_control_areas_id_seq'::regclass);


--
-- Name: currencies id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies ALTER COLUMN id SET DEFAULT nextval('public.currencies_id_seq'::regclass);


--
-- Name: currency_valuations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency_valuations ALTER COLUMN id SET DEFAULT nextval('public.currency_valuations_id_seq'::regclass);


--
-- Name: custom_reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_reports ALTER COLUMN id SET DEFAULT nextval('public.custom_reports_id_seq'::regclass);


--
-- Name: customer_bank_relationships id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_relationships ALTER COLUMN id SET DEFAULT nextval('public.customer_bank_relationships_id_seq'::regclass);


--
-- Name: customer_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.customer_contacts_id_seq'::regclass);


--
-- Name: customer_credit_management id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_management ALTER COLUMN id SET DEFAULT nextval('public.customer_credit_management_id_seq'::regclass);


--
-- Name: customer_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments ALTER COLUMN id SET DEFAULT nextval('public.customer_payments_id_seq'::regclass);


--
-- Name: customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers ALTER COLUMN id SET DEFAULT nextval('public.customers_id_seq'::regclass);


--
-- Name: dashboard_configs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_configs ALTER COLUMN id SET DEFAULT nextval('public.dashboard_configs_id_seq'::regclass);


--
-- Name: delivery_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_documents ALTER COLUMN id SET DEFAULT nextval('public.delivery_documents_id_seq'::regclass);


--
-- Name: delivery_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items ALTER COLUMN id SET DEFAULT nextval('public.delivery_items_id_seq'::regclass);


--
-- Name: designer_agent_communications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_agent_communications ALTER COLUMN id SET DEFAULT nextval('public.designer_agent_communications_id_seq'::regclass);


--
-- Name: designer_analysis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_analysis ALTER COLUMN id SET DEFAULT nextval('public.designer_analysis_id_seq'::regclass);


--
-- Name: designer_documents id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_documents ALTER COLUMN id SET DEFAULT nextval('public.designer_documents_id_seq'::regclass);


--
-- Name: designer_implementations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_implementations ALTER COLUMN id SET DEFAULT nextval('public.designer_implementations_id_seq'::regclass);


--
-- Name: designer_reviews id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_reviews ALTER COLUMN id SET DEFAULT nextval('public.designer_reviews_id_seq'::regclass);


--
-- Name: distribution_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_channels ALTER COLUMN id SET DEFAULT nextval('public.distribution_channels_id_seq1'::regclass);


--
-- Name: divisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq1'::regclass);


--
-- Name: document_posting id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting ALTER COLUMN id SET DEFAULT nextval('public.document_posting_id_seq'::regclass);


--
-- Name: document_posting_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_items ALTER COLUMN id SET DEFAULT nextval('public.document_posting_items_id_seq'::regclass);


--
-- Name: document_posting_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_lines ALTER COLUMN id SET DEFAULT nextval('public.document_posting_lines_id_seq'::regclass);


--
-- Name: document_postings id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_postings ALTER COLUMN id SET DEFAULT nextval('public.document_postings_id_seq'::regclass);


--
-- Name: dominos_test_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominos_test_results ALTER COLUMN id SET DEFAULT nextval('public.dominos_test_results_id_seq'::regclass);


--
-- Name: down_payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.down_payments ALTER COLUMN id SET DEFAULT nextval('public.down_payments_id_seq'::regclass);


--
-- Name: dunning_configurations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_configurations ALTER COLUMN id SET DEFAULT nextval('public.dunning_configurations_id_seq'::regclass);


--
-- Name: dunning_procedures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_procedures ALTER COLUMN id SET DEFAULT nextval('public.dunning_procedures_id_seq'::regclass);


--
-- Name: dunning_history id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_history ALTER COLUMN id SET DEFAULT nextval('public.dunning_history_id_seq'::regclass);


--
-- Name: edi_trading_partners id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edi_trading_partners ALTER COLUMN id SET DEFAULT nextval('public.edi_trading_partners_id_seq'::regclass);


--
-- Name: edi_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edi_transactions ALTER COLUMN id SET DEFAULT nextval('public.edi_transactions_id_seq'::regclass);


--
-- Name: employee_master id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_master ALTER COLUMN id SET DEFAULT nextval('public.employee_master_id_seq'::regclass);


--
-- Name: employees id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees ALTER COLUMN id SET DEFAULT nextval('public.employees_id_seq'::regclass);


--
-- Name: environment_config id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_config ALTER COLUMN id SET DEFAULT nextval('public.environment_config_id_seq'::regclass);


--
-- Name: erp_customer_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.erp_customer_contacts_id_seq'::regclass);


--
-- Name: erp_customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customers ALTER COLUMN id SET DEFAULT nextval('public.erp_customers_id_seq'::regclass);


--
-- Name: erp_vendor_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendor_contacts ALTER COLUMN id SET DEFAULT nextval('public.erp_vendor_contacts_id_seq'::regclass);


--
-- Name: erp_vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendors ALTER COLUMN id SET DEFAULT nextval('public.erp_vendors_id_seq'::regclass);


--
-- Name: expenses id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses ALTER COLUMN id SET DEFAULT nextval('public.expenses_id_seq'::regclass);


--
-- Name: fiscal_periods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_periods ALTER COLUMN id SET DEFAULT nextval('public.fiscal_periods_id_seq'::regclass);


--
-- Name: fiscal_year_variants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_variants ALTER COLUMN id SET DEFAULT nextval('public.fiscal_year_variants_id_seq'::regclass);


--
-- Name: general_ledger_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger_accounts ALTER COLUMN id SET DEFAULT nextval('public.general_ledger_accounts_id_seq'::regclass);


--
-- Name: gl_accounts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts ALTER COLUMN id SET DEFAULT nextval('public.gl_accounts_id_seq'::regclass);


--
-- Name: gl_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_entries ALTER COLUMN id SET DEFAULT nextval('public.gl_entries_id_seq'::regclass);


--
-- Name: goods_receipt id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_id_seq'::regclass);


--
-- Name: goods_receipt_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_items_id_seq'::regclass);


--
-- Name: goods_receipt_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines ALTER COLUMN id SET DEFAULT nextval('public.goods_receipt_lines_id_seq'::regclass);


--
-- Name: goods_receipts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts ALTER COLUMN id SET DEFAULT nextval('public.goods_receipts_id_seq'::regclass);


--
-- Name: internal_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_orders ALTER COLUMN id SET DEFAULT nextval('public.internal_orders_id_seq'::regclass);


--
-- Name: inventory_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions ALTER COLUMN id SET DEFAULT nextval('public.inventory_transactions_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: issue_analytics_summary id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_analytics_summary ALTER COLUMN id SET DEFAULT nextval('public.issue_analytics_summary_id_seq'::regclass);


--
-- Name: issue_patterns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_patterns ALTER COLUMN id SET DEFAULT nextval('public.issue_patterns_id_seq'::regclass);


--
-- Name: issue_resolutions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_resolutions ALTER COLUMN id SET DEFAULT nextval('public.issue_resolutions_id_seq'::regclass);


--
-- Name: journal_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries ALTER COLUMN id SET DEFAULT nextval('public.journal_entries_id_seq'::regclass);


--
-- Name: leads id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads ALTER COLUMN id SET DEFAULT nextval('public.leads_id_seq'::regclass);


--
-- Name: lockbox_processing id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_processing ALTER COLUMN id SET DEFAULT nextval('public.lockbox_processing_id_seq'::regclass);


--
-- Name: lockbox_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_transactions ALTER COLUMN id SET DEFAULT nextval('public.lockbox_transactions_id_seq'::regclass);


--
-- Name: material_categories id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories ALTER COLUMN id SET DEFAULT nextval('public.material_categories_id_seq'::regclass);


--
-- Name: materials id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials ALTER COLUMN id SET DEFAULT nextval('public.materials_id_seq'::regclass);


--
-- Name: module_health_status id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_health_status ALTER COLUMN id SET DEFAULT nextval('public.module_health_status_id_seq'::regclass);


--
-- Name: movement_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types ALTER COLUMN id SET DEFAULT nextval('public.movement_types_id_seq'::regclass);


--
-- Name: opportunities id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities ALTER COLUMN id SET DEFAULT nextval('public.opportunities_id_seq'::regclass);


--
-- Name: order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items ALTER COLUMN id SET DEFAULT nextval('public.order_items_id_seq'::regclass);


--
-- Name: orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders ALTER COLUMN id SET DEFAULT nextval('public.orders_id_seq'::regclass);


--
-- Name: payment_applications id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_applications ALTER COLUMN id SET DEFAULT nextval('public.payment_applications_id_seq'::regclass);


--
-- Name: payment_lines id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_lines ALTER COLUMN id SET DEFAULT nextval('public.payment_lines_id_seq'::regclass);


--
-- Name: payment_methods id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods ALTER COLUMN id SET DEFAULT nextval('public.payment_methods_id_seq'::regclass);


--
-- Name: payment_transactions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions ALTER COLUMN id SET DEFAULT nextval('public.payment_transactions_id_seq'::regclass);


--
-- Name: payments id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments ALTER COLUMN id SET DEFAULT nextval('public.payments_id_seq'::regclass);


--
-- Name: plants id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plants ALTER COLUMN id SET DEFAULT nextval('public.plants_id_seq'::regclass);


--
-- Name: posting_rules id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rules ALTER COLUMN id SET DEFAULT nextval('public.posting_rules_id_seq'::regclass);


--
-- Name: pricing_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_conditions ALTER COLUMN id SET DEFAULT nextval('public.pricing_conditions_id_seq'::regclass);


--
-- Name: production_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders ALTER COLUMN id SET DEFAULT nextval('public.production_orders_id_seq'::regclass);


--
-- Name: production_work_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_work_orders ALTER COLUMN id SET DEFAULT nextval('public.production_work_orders_id_seq'::regclass);


--
-- Name: products id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products ALTER COLUMN id SET DEFAULT nextval('public.products_id_seq'::regclass);


--
-- Name: profit_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_centers ALTER COLUMN id SET DEFAULT nextval('public.profit_centers_id_seq'::regclass);


--
-- Name: purchase_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_groups ALTER COLUMN id SET DEFAULT nextval('public.purchase_groups_id_seq'::regclass);


--
-- Name: purchase_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items ALTER COLUMN id SET DEFAULT nextval('public.purchase_order_items_id_seq'::regclass);


--
-- Name: purchase_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders ALTER COLUMN id SET DEFAULT nextval('public.purchase_orders_id_seq'::regclass);


--
-- Name: purchase_organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_organizations ALTER COLUMN id SET DEFAULT nextval('public.purchase_organizations_id_seq'::regclass);


--
-- Name: purchase_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests ALTER COLUMN id SET DEFAULT nextval('public.purchase_requests_id_seq'::regclass);


--
-- Name: purchasing_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_groups ALTER COLUMN id SET DEFAULT nextval('public.purchasing_groups_id_seq'::regclass);


--
-- Name: purchasing_organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_organizations ALTER COLUMN id SET DEFAULT nextval('public.purchasing_organizations_id_seq'::regclass);


--
-- Name: quote_approvals id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals ALTER COLUMN id SET DEFAULT nextval('public.quote_approvals_id_seq'::regclass);


--
-- Name: quote_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items ALTER COLUMN id SET DEFAULT nextval('public.quote_items_id_seq'::regclass);


--
-- Name: quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes ALTER COLUMN id SET DEFAULT nextval('public.quotes_id_seq'::regclass);


--
-- Name: regions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions ALTER COLUMN id SET DEFAULT nextval('public.regions_id_seq'::regclass);


--
-- Name: reports id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports ALTER COLUMN id SET DEFAULT nextval('public.reports_id_seq'::regclass);


--
-- Name: rookie_agent_data_entries id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_data_entries ALTER COLUMN id SET DEFAULT nextval('public.rookie_agent_data_entries_id_seq'::regclass);


--
-- Name: rookie_agent_quality_checks id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_quality_checks ALTER COLUMN id SET DEFAULT nextval('public.rookie_agent_quality_checks_id_seq'::regclass);


--
-- Name: rookie_agent_sessions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_sessions ALTER COLUMN id SET DEFAULT nextval('public.rookie_agent_sessions_id_seq'::regclass);


--
-- Name: rookie_agent_training id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_training ALTER COLUMN id SET DEFAULT nextval('public.rookie_agent_training_id_seq'::regclass);


--
-- Name: sales_customer_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customer_contacts ALTER COLUMN id SET DEFAULT nextval('public.sales_customer_contacts_id_seq'::regclass);


--
-- Name: sales_customers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customers ALTER COLUMN id SET DEFAULT nextval('public.sales_customers_id_seq'::regclass);


--
-- Name: sales_invoice_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items ALTER COLUMN id SET DEFAULT nextval('public.sales_invoice_items_id_seq'::regclass);


--
-- Name: sales_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices ALTER COLUMN id SET DEFAULT nextval('public.sales_invoices_id_seq'::regclass);


--
-- Name: sales_order_conditions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions ALTER COLUMN id SET DEFAULT nextval('public.sales_order_conditions_id_seq'::regclass);


--
-- Name: sales_order_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items ALTER COLUMN id SET DEFAULT nextval('public.sales_order_items_id_seq'::regclass);


--
-- Name: sales_orders id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders ALTER COLUMN id SET DEFAULT nextval('public.sales_orders_id_seq'::regclass);


--
-- Name: sales_organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_organizations ALTER COLUMN id SET DEFAULT nextval('public.sales_organizations_id_seq1'::regclass);


--
-- Name: sales_quote_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quote_items ALTER COLUMN id SET DEFAULT nextval('public.sales_quote_items_id_seq'::regclass);


--
-- Name: sales_quotes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotes ALTER COLUMN id SET DEFAULT nextval('public.sales_quotes_id_seq'::regclass);


--
-- Name: sales_return_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items ALTER COLUMN id SET DEFAULT nextval('public.sales_return_items_id_seq'::regclass);


--
-- Name: sales_returns id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns ALTER COLUMN id SET DEFAULT nextval('public.sales_returns_id_seq'::regclass);


--
-- Name: sd_condition_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_condition_types ALTER COLUMN id SET DEFAULT nextval('public.condition_types_id_seq'::regclass);


--
-- Name: sd_copy_control_headers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_headers ALTER COLUMN id SET DEFAULT nextval('public.copy_control_headers_id_seq'::regclass);


--
-- Name: sd_copy_control_items id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_items ALTER COLUMN id SET DEFAULT nextval('public.copy_control_items_id_seq'::regclass);


--
-- Name: sd_distribution_channels id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_distribution_channels ALTER COLUMN id SET DEFAULT nextval('public.distribution_channels_id_seq'::regclass);


--
-- Name: sd_divisions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_divisions ALTER COLUMN id SET DEFAULT nextval('public.divisions_id_seq'::regclass);


--
-- Name: sd_document_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_document_types ALTER COLUMN id SET DEFAULT nextval('public.document_types_id_seq'::regclass);


--
-- Name: sd_number_range_objects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_range_objects ALTER COLUMN id SET DEFAULT nextval('public.number_range_objects_id_seq'::regclass);


--
-- Name: sd_number_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_ranges ALTER COLUMN id SET DEFAULT nextval('public.number_ranges_id_seq'::regclass);


--
-- Name: sd_pricing_procedures id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_pricing_procedures ALTER COLUMN id SET DEFAULT nextval('public.pricing_procedures_id_seq'::regclass);


--
-- Name: sd_sales_areas id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_areas ALTER COLUMN id SET DEFAULT nextval('public.sales_areas_id_seq'::regclass);


--
-- Name: sd_sales_organizations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_organizations ALTER COLUMN id SET DEFAULT nextval('public.sales_organizations_id_seq'::regclass);


--
-- Name: stock_movements id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements ALTER COLUMN id SET DEFAULT nextval('public.stock_movements_id_seq'::regclass);


--
-- Name: storage_locations id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_locations ALTER COLUMN id SET DEFAULT nextval('public.storage_locations_id_seq'::regclass);


--
-- Name: supply_types id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply_types ALTER COLUMN id SET DEFAULT nextval('public.supply_types_id_seq'::regclass);


--
-- Name: system_error_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_error_logs ALTER COLUMN id SET DEFAULT nextval('public.system_error_logs_id_seq'::regclass);


--
-- Name: tax_codes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes ALTER COLUMN id SET DEFAULT nextval('public.tax_codes_id_seq'::regclass);


--
-- Name: tax_jurisdictions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions ALTER COLUMN id SET DEFAULT nextval('public.tax_jurisdictions_id_seq'::regclass);


--
-- Name: tax_rates id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates ALTER COLUMN id SET DEFAULT nextval('public.tax_rates_id_seq'::regclass);


--
-- Name: test_results id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_results ALTER COLUMN id SET DEFAULT nextval('public.test_results_id_seq'::regclass);


--
-- Name: tile_naming_documentation id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_naming_documentation ALTER COLUMN id SET DEFAULT nextval('public.tile_naming_documentation_id_seq'::regclass);


--
-- Name: tile_registry id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_registry ALTER COLUMN id SET DEFAULT nextval('public.tile_registry_id_seq'::regclass);


--
-- Name: tolerance_groups id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tolerance_groups ALTER COLUMN id SET DEFAULT nextval('public.tolerance_groups_id_seq'::regclass);


--
-- Name: transport_logs id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_logs ALTER COLUMN id SET DEFAULT nextval('public.transport_logs_id_seq'::regclass);


--
-- Name: transport_number_ranges id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_number_ranges ALTER COLUMN id SET DEFAULT nextval('public.transport_number_ranges_id_seq'::regclass);


--
-- Name: transport_objects id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_objects ALTER COLUMN id SET DEFAULT nextval('public.transport_objects_id_seq'::regclass);


--
-- Name: transport_requests id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests ALTER COLUMN id SET DEFAULT nextval('public.transport_requests_id_seq'::regclass);


--
-- Name: units_of_measure id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure ALTER COLUMN id SET DEFAULT nextval('public.units_of_measure_id_seq'::regclass);


--
-- Name: uom id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom ALTER COLUMN id SET DEFAULT nextval('public.uom_id_seq'::regclass);


--
-- Name: uom_conversions id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions ALTER COLUMN id SET DEFAULT nextval('public.uom_conversions_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: valuation_classes id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_classes ALTER COLUMN id SET DEFAULT nextval('public.valuation_classes_id_seq'::regclass);


--
-- Name: variance_analysis id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variance_analysis ALTER COLUMN id SET DEFAULT nextval('public.variance_analysis_id_seq'::regclass);


--
-- Name: vendor_contacts id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts ALTER COLUMN id SET DEFAULT nextval('public.vendor_contacts_id_seq'::regclass);


--
-- Name: vendor_invoices id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices ALTER COLUMN id SET DEFAULT nextval('public.vendor_invoices_id_seq'::regclass);


--
-- Name: vendors id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors ALTER COLUMN id SET DEFAULT nextval('public.vendors_id_seq'::regclass);


--
-- Name: warehouse_bins id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_bins ALTER COLUMN id SET DEFAULT nextval('public.warehouse_bins_id_seq'::regclass);


--
-- Name: work_centers id; Type: DEFAULT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers ALTER COLUMN id SET DEFAULT nextval('public.work_centers_id_seq'::regclass);


--
-- Name: __drizzle_migrations __drizzle_migrations_pkey; Type: CONSTRAINT; Schema: drizzle; Owner: -
--

ALTER TABLE ONLY drizzle.__drizzle_migrations
    ADD CONSTRAINT __drizzle_migrations_pkey PRIMARY KEY (id);


--
-- Name: account_determination account_determination_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_determination
    ADD CONSTRAINT account_determination_pkey PRIMARY KEY (id);


--
-- Name: account_determination_rules account_determination_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_determination_rules
    ADD CONSTRAINT account_determination_rules_pkey PRIMARY KEY (id);


--
-- Name: account_groups account_groups_chart_id_group_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_chart_id_group_name_key UNIQUE (chart_id, group_name);


--
-- Name: account_groups account_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.account_groups
    ADD CONSTRAINT account_groups_pkey PRIMARY KEY (id);


--
-- Name: accounting_document_items accounting_document_items_document_id_line_item_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_document_items
    ADD CONSTRAINT accounting_document_items_document_id_line_item_key UNIQUE (document_id, line_item);


--
-- Name: accounting_document_items accounting_document_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_document_items
    ADD CONSTRAINT accounting_document_items_pkey PRIMARY KEY (id);


--
-- Name: accounting_documents accounting_documents_document_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_documents
    ADD CONSTRAINT accounting_documents_document_number_key UNIQUE (document_number);


--
-- Name: accounting_documents accounting_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_documents
    ADD CONSTRAINT accounting_documents_pkey PRIMARY KEY (id);


--
-- Name: accounts_payable accounts_payable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_pkey PRIMARY KEY (id);


--
-- Name: accounts_receivable accounts_receivable_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_pkey PRIMARY KEY (id);


--
-- Name: activity_types activity_types_activity_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_activity_type_key UNIQUE (activity_type);


--
-- Name: activity_types activity_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.activity_types
    ADD CONSTRAINT activity_types_pkey PRIMARY KEY (id);


--
-- Name: agent_access_controls agent_access_controls_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_access_controls
    ADD CONSTRAINT agent_access_controls_pkey PRIMARY KEY (id);


--
-- Name: agent_player_interactions agent_player_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_interactions
    ADD CONSTRAINT agent_player_interactions_pkey PRIMARY KEY (id);


--
-- Name: agent_player_reports agent_player_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_reports
    ADD CONSTRAINT agent_player_reports_pkey PRIMARY KEY (id);


--
-- Name: agent_player_validations agent_player_validations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_validations
    ADD CONSTRAINT agent_player_validations_pkey PRIMARY KEY (id);


--
-- Name: agent_players agent_players_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_players
    ADD CONSTRAINT agent_players_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_analytics ai_agent_analytics_module_type_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_analytics
    ADD CONSTRAINT ai_agent_analytics_module_type_date_key UNIQUE (module_type, date);


--
-- Name: ai_agent_analytics ai_agent_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_analytics
    ADD CONSTRAINT ai_agent_analytics_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_configs ai_agent_configs_module_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_configs
    ADD CONSTRAINT ai_agent_configs_module_type_key UNIQUE (module_type);


--
-- Name: ai_agent_configs ai_agent_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_configs
    ADD CONSTRAINT ai_agent_configs_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_health ai_agent_health_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_health
    ADD CONSTRAINT ai_agent_health_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_interventions ai_agent_interventions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_interventions
    ADD CONSTRAINT ai_agent_interventions_pkey PRIMARY KEY (id);


--
-- Name: ai_agent_performance ai_agent_performance_agent_name_agent_type_performance_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_performance
    ADD CONSTRAINT ai_agent_performance_agent_name_agent_type_performance_date_key UNIQUE (agent_name, agent_type, performance_date);


--
-- Name: ai_agent_performance ai_agent_performance_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_performance
    ADD CONSTRAINT ai_agent_performance_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_messages ai_chat_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_sessions ai_chat_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_chat_sessions ai_chat_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_session_id_key UNIQUE (session_id);


--
-- Name: ai_data_analysis_sessions ai_data_analysis_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_data_analysis_sessions
    ADD CONSTRAINT ai_data_analysis_sessions_pkey PRIMARY KEY (id);


--
-- Name: ai_data_analysis_sessions ai_data_analysis_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_data_analysis_sessions
    ADD CONSTRAINT ai_data_analysis_sessions_session_id_key UNIQUE (session_id);


--
-- Name: ap_invoices ap_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_invoices
    ADD CONSTRAINT ap_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: ap_invoices ap_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_invoices
    ADD CONSTRAINT ap_invoices_pkey PRIMARY KEY (id);


--
-- Name: ap_payments ap_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_payments
    ADD CONSTRAINT ap_payments_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: api_keys api_keys_service_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_service_name_key UNIQUE (service_name);


--
-- Name: approval_levels approval_levels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.approval_levels
    ADD CONSTRAINT approval_levels_pkey PRIMARY KEY (id);


--
-- Name: ar_documents ar_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_documents
    ADD CONSTRAINT ar_documents_pkey PRIMARY KEY (id);


--
-- Name: ar_payment_applications ar_payment_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_payment_applications
    ADD CONSTRAINT ar_payment_applications_pkey PRIMARY KEY (id);


--
-- Name: asset_master asset_master_asset_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT asset_master_asset_number_key UNIQUE (asset_number);


--
-- Name: asset_master asset_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.asset_master
    ADD CONSTRAINT asset_master_pkey PRIMARY KEY (id);


--
-- Name: assets assets_asset_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_asset_number_key UNIQUE (asset_number);


--
-- Name: assets assets_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.assets
    ADD CONSTRAINT assets_pkey PRIMARY KEY (id);


--
-- Name: bank_accounts bank_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_account_number_key UNIQUE (account_number);


--
-- Name: bank_accounts bank_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT bank_accounts_pkey PRIMARY KEY (id);


--
-- Name: bank_master bank_master_bank_key_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_master
    ADD CONSTRAINT bank_master_bank_key_key UNIQUE (bank_key);


--
-- Name: bank_master bank_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_master
    ADD CONSTRAINT bank_master_pkey PRIMARY KEY (id);


--
-- Name: bank_statement_items bank_statement_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_items
    ADD CONSTRAINT bank_statement_items_pkey PRIMARY KEY (id);


--
-- Name: bank_statements bank_statements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_pkey PRIMARY KEY (id);


--
-- Name: bank_statements bank_statements_statement_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statements
    ADD CONSTRAINT bank_statements_statement_number_key UNIQUE (statement_number);


--
-- Name: bank_transactions bank_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_pkey PRIMARY KEY (id);


--
-- Name: batch_master batch_master_batch_number_material_id_plant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_master
    ADD CONSTRAINT batch_master_batch_number_material_id_plant_id_key UNIQUE (batch_number, material_id, plant_id);


--
-- Name: batch_master batch_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_master
    ADD CONSTRAINT batch_master_pkey PRIMARY KEY (id);


--
-- Name: bill_of_materials bill_of_materials_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_code_key UNIQUE (code);


--
-- Name: bill_of_materials bill_of_materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bill_of_materials
    ADD CONSTRAINT bill_of_materials_pkey PRIMARY KEY (id);


--
-- Name: billing_documents billing_documents_billing_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_billing_number_key UNIQUE (billing_number);


--
-- Name: billing_documents billing_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_pkey PRIMARY KEY (id);


--
-- Name: billing_items billing_items_billing_id_line_item_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_billing_id_line_item_key UNIQUE (billing_id, line_item);


--
-- Name: billing_items billing_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_pkey PRIMARY KEY (id);


--
-- Name: bom_items bom_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_pkey PRIMARY KEY (id);


--
-- Name: calculation_methods calculation_methods_method_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculation_methods
    ADD CONSTRAINT calculation_methods_method_code_key UNIQUE (method_code);


--
-- Name: calculation_methods calculation_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.calculation_methods
    ADD CONSTRAINT calculation_methods_pkey PRIMARY KEY (id);


--
-- Name: cash_positions cash_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cash_positions
    ADD CONSTRAINT cash_positions_pkey PRIMARY KEY (id);


--
-- Name: categories categories_name_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_name_unique UNIQUE (name);


--
-- Name: categories categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_pkey PRIMARY KEY (id);


--
-- Name: change_document_analytics change_document_analytics_analysis_date_object_class_applic_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_analytics
    ADD CONSTRAINT change_document_analytics_analysis_date_object_class_applic_key UNIQUE (analysis_date, object_class, application_module);


--
-- Name: change_document_analytics change_document_analytics_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_analytics
    ADD CONSTRAINT change_document_analytics_pkey PRIMARY KEY (id);


--
-- Name: change_document_approvals change_document_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_approvals
    ADD CONSTRAINT change_document_approvals_pkey PRIMARY KEY (id);


--
-- Name: change_document_attachments change_document_attachments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_attachments
    ADD CONSTRAINT change_document_attachments_pkey PRIMARY KEY (id);


--
-- Name: change_document_headers change_document_headers_change_document_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers
    ADD CONSTRAINT change_document_headers_change_document_id_key UNIQUE (change_document_id);


--
-- Name: change_document_headers change_document_headers_change_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers
    ADD CONSTRAINT change_document_headers_change_number_key UNIQUE (change_number);


--
-- Name: change_document_headers change_document_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers
    ADD CONSTRAINT change_document_headers_pkey PRIMARY KEY (id);


--
-- Name: change_document_positions change_document_positions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_positions
    ADD CONSTRAINT change_document_positions_pkey PRIMARY KEY (id);


--
-- Name: change_document_relations change_document_relations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_relations
    ADD CONSTRAINT change_document_relations_pkey PRIMARY KEY (id);


--
-- Name: change_document_relations change_document_relations_source_change_id_target_change_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_relations
    ADD CONSTRAINT change_document_relations_source_change_id_target_change_id_key UNIQUE (source_change_id, target_change_id, relation_type);


--
-- Name: change_requests change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_requests
    ADD CONSTRAINT change_requests_pkey PRIMARY KEY (id);


--
-- Name: chart_of_accounts chart_of_accounts_chart_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_chart_id_key UNIQUE (chart_id);


--
-- Name: chart_of_accounts chart_of_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chart_of_accounts
    ADD CONSTRAINT chart_of_accounts_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_action_log chief_agent_action_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_action_log
    ADD CONSTRAINT chief_agent_action_log_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_change_requests chief_agent_change_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_change_requests
    ADD CONSTRAINT chief_agent_change_requests_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_decision_audit chief_agent_decision_audit_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_decision_audit
    ADD CONSTRAINT chief_agent_decision_audit_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_human_interactions chief_agent_human_interactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_human_interactions
    ADD CONSTRAINT chief_agent_human_interactions_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_permissions chief_agent_permissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_permissions
    ADD CONSTRAINT chief_agent_permissions_pkey PRIMARY KEY (id);


--
-- Name: chief_agent_system_monitoring chief_agent_system_monitoring_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_system_monitoring
    ADD CONSTRAINT chief_agent_system_monitoring_pkey PRIMARY KEY (id);


--
-- Name: clearing_configurations clearing_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearing_configurations
    ADD CONSTRAINT clearing_configurations_pkey PRIMARY KEY (id);


--
-- Name: clearing_items clearing_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.clearing_items
    ADD CONSTRAINT clearing_items_pkey PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_condition_types client_DEMO_CLIENT_sd_condition_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_condition_types"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_condition_types_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_condition_types client_DEMO_CLIENT_sd_condition_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_condition_types"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_condition_types_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_distribution_channels client_DEMO_CLIENT_sd_distribution_channels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_distribution_channels"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_distribution_channels_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_distribution_channels client_DEMO_CLIENT_sd_distribution_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_distribution_channels"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_distribution_channels_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_divisions client_DEMO_CLIENT_sd_divisions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_divisions"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_divisions_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_divisions client_DEMO_CLIENT_sd_divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_divisions"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_divisions_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_document_types client_DEMO_CLIENT_sd_document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_document_types"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_document_types_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_document_types client_DEMO_CLIENT_sd_document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_document_types"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_document_types_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_pricing_procedures client_DEMO_CLIENT_sd_pricing_procedures_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_pricing_procedures"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_pricing_procedures_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_pricing_procedures client_DEMO_CLIENT_sd_pricing_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_pricing_procedures"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_pricing_procedures_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_sales_areas client_DEMO_CLIENT_sd_sales_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_sales_areas"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_sales_areas_pkey" PRIMARY KEY (id);


--
-- Name: client_DEMO_CLIENT_sd_sales_organizations client_DEMO_CLIENT_sd_sales_organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_sales_organizations"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_sales_organizations_code_key" UNIQUE (code);


--
-- Name: client_DEMO_CLIENT_sd_sales_organizations client_DEMO_CLIENT_sd_sales_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_DEMO_CLIENT_sd_sales_organizations"
    ADD CONSTRAINT "client_DEMO_CLIENT_sd_sales_organizations_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_condition_types client_TEST_CLIENT_sd_condition_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_condition_types"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_condition_types_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_condition_types client_TEST_CLIENT_sd_condition_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_condition_types"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_condition_types_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_distribution_channels client_TEST_CLIENT_sd_distribution_channels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_distribution_channels"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_distribution_channels_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_distribution_channels client_TEST_CLIENT_sd_distribution_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_distribution_channels"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_distribution_channels_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_divisions client_TEST_CLIENT_sd_divisions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_divisions"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_divisions_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_divisions client_TEST_CLIENT_sd_divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_divisions"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_divisions_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_document_types client_TEST_CLIENT_sd_document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_document_types"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_document_types_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_document_types client_TEST_CLIENT_sd_document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_document_types"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_document_types_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_pricing_procedures client_TEST_CLIENT_sd_pricing_procedures_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_pricing_procedures"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_pricing_procedures_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_pricing_procedures client_TEST_CLIENT_sd_pricing_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_pricing_procedures"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_pricing_procedures_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_sales_areas client_TEST_CLIENT_sd_sales_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_sales_areas"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_sales_areas_pkey" PRIMARY KEY (id);


--
-- Name: client_TEST_CLIENT_sd_sales_organizations client_TEST_CLIENT_sd_sales_organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_sales_organizations"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_sales_organizations_code_key" UNIQUE (code);


--
-- Name: client_TEST_CLIENT_sd_sales_organizations client_TEST_CLIENT_sd_sales_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public."client_TEST_CLIENT_sd_sales_organizations"
    ADD CONSTRAINT "client_TEST_CLIENT_sd_sales_organizations_pkey" PRIMARY KEY (id);


--
-- Name: coach_agents coach_agents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_agents
    ADD CONSTRAINT coach_agents_pkey PRIMARY KEY (id);


--
-- Name: coach_decisions coach_decisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.coach_decisions
    ADD CONSTRAINT coach_decisions_pkey PRIMARY KEY (id);


--
-- Name: collection_activities collection_activities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_activities
    ADD CONSTRAINT collection_activities_pkey PRIMARY KEY (id);


--
-- Name: companies companies_company_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_company_id_key UNIQUE (company_id);


--
-- Name: companies companies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.companies
    ADD CONSTRAINT companies_pkey PRIMARY KEY (id);


--
-- Name: company_code_chart_assignments company_code_chart_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_code_chart_assignments
    ADD CONSTRAINT company_code_chart_assignments_pkey PRIMARY KEY (id);


--
-- Name: company_codes company_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes
    ADD CONSTRAINT company_codes_pkey PRIMARY KEY (id);


--
-- Name: comprehensive_issues_log comprehensive_issues_log_issue_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprehensive_issues_log
    ADD CONSTRAINT comprehensive_issues_log_issue_id_key UNIQUE (issue_id);


--
-- Name: comprehensive_issues_log comprehensive_issues_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.comprehensive_issues_log
    ADD CONSTRAINT comprehensive_issues_log_pkey PRIMARY KEY (id);


--
-- Name: condition_access_rules condition_access_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_access_rules
    ADD CONSTRAINT condition_access_rules_pkey PRIMARY KEY (id);


--
-- Name: condition_categories condition_categories_category_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_categories
    ADD CONSTRAINT condition_categories_category_code_key UNIQUE (category_code);


--
-- Name: condition_categories condition_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_categories
    ADD CONSTRAINT condition_categories_pkey PRIMARY KEY (id);


--
-- Name: condition_dependencies condition_dependencies_parent_condition_id_dependent_condit_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_dependencies
    ADD CONSTRAINT condition_dependencies_parent_condition_id_dependent_condit_key UNIQUE (parent_condition_id, dependent_condition_id);


--
-- Name: condition_dependencies condition_dependencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_dependencies
    ADD CONSTRAINT condition_dependencies_pkey PRIMARY KEY (id);


--
-- Name: condition_records condition_records_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_records
    ADD CONSTRAINT condition_records_pkey PRIMARY KEY (id);


--
-- Name: sd_condition_types condition_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_condition_types
    ADD CONSTRAINT condition_types_code_key UNIQUE (code);


--
-- Name: condition_types condition_types_condition_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_condition_code_key UNIQUE (condition_code);


--
-- Name: sd_condition_types condition_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_condition_types
    ADD CONSTRAINT condition_types_pkey PRIMARY KEY (id);


--
-- Name: condition_types condition_types_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_pkey1 PRIMARY KEY (id);


--
-- Name: copa_actuals copa_actuals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copa_actuals
    ADD CONSTRAINT copa_actuals_pkey PRIMARY KEY (id);


--
-- Name: sd_copy_control_headers copy_control_headers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_headers
    ADD CONSTRAINT copy_control_headers_pkey PRIMARY KEY (id);


--
-- Name: sd_copy_control_headers copy_control_headers_source_doc_type_target_doc_type_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_headers
    ADD CONSTRAINT copy_control_headers_source_doc_type_target_doc_type_key UNIQUE (source_doc_type, target_doc_type);


--
-- Name: sd_copy_control_items copy_control_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_items
    ADD CONSTRAINT copy_control_items_pkey PRIMARY KEY (id);


--
-- Name: sd_copy_control_items copy_control_items_source_doc_type_source_item_category_tar_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_copy_control_items
    ADD CONSTRAINT copy_control_items_source_doc_type_source_item_category_tar_key UNIQUE (source_doc_type, source_item_category, target_doc_type, target_item_category);


--
-- Name: cost_allocations cost_allocations_allocation_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_allocations
    ADD CONSTRAINT cost_allocations_allocation_id_key UNIQUE (allocation_id);


--
-- Name: cost_allocations cost_allocations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_allocations
    ADD CONSTRAINT cost_allocations_pkey PRIMARY KEY (id);


--
-- Name: cost_center_actuals cost_center_actuals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_actuals
    ADD CONSTRAINT cost_center_actuals_pkey PRIMARY KEY (id);


--
-- Name: cost_center_planning cost_center_planning_cost_center_fiscal_year_period_version_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_planning
    ADD CONSTRAINT cost_center_planning_cost_center_fiscal_year_period_version_key UNIQUE (cost_center, fiscal_year, period, version, account, activity_type);


--
-- Name: cost_center_planning cost_center_planning_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_planning
    ADD CONSTRAINT cost_center_planning_pkey PRIMARY KEY (id);


--
-- Name: cost_centers cost_centers_cost_center_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_cost_center_key UNIQUE (cost_center);


--
-- Name: cost_centers cost_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_centers
    ADD CONSTRAINT cost_centers_pkey PRIMARY KEY (id);


--
-- Name: cost_elements cost_elements_cost_element_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_elements
    ADD CONSTRAINT cost_elements_cost_element_code_key UNIQUE (cost_element_code);


--
-- Name: cost_elements cost_elements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_elements
    ADD CONSTRAINT cost_elements_pkey PRIMARY KEY (id);


--
-- Name: countries countries_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_code_key UNIQUE (code);


--
-- Name: countries countries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_pkey PRIMARY KEY (id);


--
-- Name: credit_control_areas credit_control_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.credit_control_areas
    ADD CONSTRAINT credit_control_areas_pkey PRIMARY KEY (id);


--
-- Name: currencies currencies_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_code_key UNIQUE (code);


--
-- Name: currencies currencies_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currencies
    ADD CONSTRAINT currencies_pkey PRIMARY KEY (id);


--
-- Name: currency_valuations currency_valuations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.currency_valuations
    ADD CONSTRAINT currency_valuations_pkey PRIMARY KEY (id);


--
-- Name: custom_reports custom_reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.custom_reports
    ADD CONSTRAINT custom_reports_pkey PRIMARY KEY (id);


--
-- Name: customer_bank_relationships customer_bank_relationships_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_relationships
    ADD CONSTRAINT customer_bank_relationships_pkey PRIMARY KEY (id);


--
-- Name: customer_contacts customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: customer_credit_management customer_credit_management_customer_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_management
    ADD CONSTRAINT customer_credit_management_customer_id_key UNIQUE (customer_id);


--
-- Name: customer_credit_management customer_credit_management_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_management
    ADD CONSTRAINT customer_credit_management_pkey PRIMARY KEY (id);


--
-- Name: customer_payments customer_payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_payment_number_key UNIQUE (payment_number);


--
-- Name: customer_payments customer_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_payments
    ADD CONSTRAINT customer_payments_pkey PRIMARY KEY (id);


--
-- Name: customers customers_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_code_unique UNIQUE (code);


--
-- Name: customers customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_pkey PRIMARY KEY (id);


--
-- Name: dashboard_configs dashboard_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dashboard_configs
    ADD CONSTRAINT dashboard_configs_pkey PRIMARY KEY (id);


--
-- Name: delivery_documents delivery_documents_delivery_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_documents
    ADD CONSTRAINT delivery_documents_delivery_number_key UNIQUE (delivery_number);


--
-- Name: delivery_documents delivery_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_documents
    ADD CONSTRAINT delivery_documents_pkey PRIMARY KEY (id);


--
-- Name: delivery_items delivery_items_delivery_id_line_item_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_delivery_id_line_item_key UNIQUE (delivery_id, line_item);


--
-- Name: delivery_items delivery_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_pkey PRIMARY KEY (id);


--
-- Name: designer_agent_communications designer_agent_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_agent_communications
    ADD CONSTRAINT designer_agent_communications_pkey PRIMARY KEY (id);


--
-- Name: designer_analysis designer_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_analysis
    ADD CONSTRAINT designer_analysis_pkey PRIMARY KEY (id);


--
-- Name: designer_documents designer_documents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_documents
    ADD CONSTRAINT designer_documents_pkey PRIMARY KEY (id);


--
-- Name: designer_implementations designer_implementations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_implementations
    ADD CONSTRAINT designer_implementations_pkey PRIMARY KEY (id);


--
-- Name: designer_reviews designer_reviews_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_reviews
    ADD CONSTRAINT designer_reviews_pkey PRIMARY KEY (id);


--
-- Name: sd_distribution_channels distribution_channels_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_distribution_channels
    ADD CONSTRAINT distribution_channels_code_key UNIQUE (code);


--
-- Name: distribution_channels distribution_channels_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_channels
    ADD CONSTRAINT distribution_channels_code_key1 UNIQUE (code);


--
-- Name: sd_distribution_channels distribution_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_distribution_channels
    ADD CONSTRAINT distribution_channels_pkey PRIMARY KEY (id);


--
-- Name: distribution_channels distribution_channels_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.distribution_channels
    ADD CONSTRAINT distribution_channels_pkey1 PRIMARY KEY (id);


--
-- Name: sd_divisions divisions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_divisions
    ADD CONSTRAINT divisions_code_key UNIQUE (code);


--
-- Name: divisions divisions_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_code_key1 UNIQUE (code);


--
-- Name: sd_divisions divisions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_divisions
    ADD CONSTRAINT divisions_pkey PRIMARY KEY (id);


--
-- Name: divisions divisions_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.divisions
    ADD CONSTRAINT divisions_pkey1 PRIMARY KEY (id);


--
-- Name: document_posting document_posting_document_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting
    ADD CONSTRAINT document_posting_document_number_key UNIQUE (document_number);


--
-- Name: document_posting_items document_posting_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_items
    ADD CONSTRAINT document_posting_items_pkey PRIMARY KEY (id);


--
-- Name: document_posting_lines document_posting_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_lines
    ADD CONSTRAINT document_posting_lines_pkey PRIMARY KEY (id);


--
-- Name: document_posting document_posting_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting
    ADD CONSTRAINT document_posting_pkey PRIMARY KEY (id);


--
-- Name: document_postings document_postings_document_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_postings
    ADD CONSTRAINT document_postings_document_number_key UNIQUE (document_number);


--
-- Name: document_postings document_postings_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_postings
    ADD CONSTRAINT document_postings_pkey PRIMARY KEY (id);


--
-- Name: sd_document_types document_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_document_types
    ADD CONSTRAINT document_types_code_key UNIQUE (code);


--
-- Name: sd_document_types document_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_document_types
    ADD CONSTRAINT document_types_pkey PRIMARY KEY (id);


--
-- Name: dominos_test_results dominos_test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominos_test_results
    ADD CONSTRAINT dominos_test_results_pkey PRIMARY KEY (id);


--
-- Name: dominos_test_results dominos_test_results_test_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dominos_test_results
    ADD CONSTRAINT dominos_test_results_test_number_key UNIQUE (test_number);


--
-- Name: down_payments down_payments_down_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.down_payments
    ADD CONSTRAINT down_payments_down_payment_number_key UNIQUE (down_payment_number);


--
-- Name: down_payments down_payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.down_payments
    ADD CONSTRAINT down_payments_pkey PRIMARY KEY (id);


--
-- Name: dunning_configurations dunning_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_configurations
    ADD CONSTRAINT dunning_configurations_pkey PRIMARY KEY (id);


--
-- Name: dunning_procedures dunning_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_procedures
    ADD CONSTRAINT dunning_procedures_pkey PRIMARY KEY (id);


--
-- Name: dunning_history dunning_history_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.dunning_history
    ADD CONSTRAINT dunning_history_pkey PRIMARY KEY (id);


--
-- Name: edi_trading_partners edi_trading_partners_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edi_trading_partners
    ADD CONSTRAINT edi_trading_partners_pkey PRIMARY KEY (id);


--
-- Name: edi_transactions edi_transactions_control_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edi_transactions
    ADD CONSTRAINT edi_transactions_control_number_key UNIQUE (control_number);


--
-- Name: edi_transactions edi_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.edi_transactions
    ADD CONSTRAINT edi_transactions_pkey PRIMARY KEY (id);


--
-- Name: employee_master employee_master_employee_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_employee_number_key UNIQUE (employee_number);


--
-- Name: employee_master employee_master_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_pkey PRIMARY KEY (id);


--
-- Name: employees employees_email_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_email_key UNIQUE (email);


--
-- Name: employees employees_employee_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_employee_id_key UNIQUE (employee_id);


--
-- Name: employees employees_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_pkey PRIMARY KEY (id);


--
-- Name: environment_config environment_config_environment_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_config
    ADD CONSTRAINT environment_config_environment_key UNIQUE (environment);


--
-- Name: environment_config environment_config_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.environment_config
    ADD CONSTRAINT environment_config_pkey PRIMARY KEY (id);


--
-- Name: erp_customer_contacts erp_customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customer_contacts
    ADD CONSTRAINT erp_customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: erp_customers erp_customers_customer_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customers
    ADD CONSTRAINT erp_customers_customer_code_key UNIQUE (customer_code);


--
-- Name: erp_customers erp_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customers
    ADD CONSTRAINT erp_customers_pkey PRIMARY KEY (id);


--
-- Name: erp_vendor_contacts erp_vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendor_contacts
    ADD CONSTRAINT erp_vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: erp_vendors erp_vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendors
    ADD CONSTRAINT erp_vendors_pkey PRIMARY KEY (id);


--
-- Name: erp_vendors erp_vendors_vendor_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendors
    ADD CONSTRAINT erp_vendors_vendor_code_key UNIQUE (vendor_code);


--
-- Name: expenses expenses_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_pkey PRIMARY KEY (id);


--
-- Name: fiscal_periods fiscal_periods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_pkey PRIMARY KEY (id);


--
-- Name: fiscal_periods fiscal_periods_year_period_company_code_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_periods
    ADD CONSTRAINT fiscal_periods_year_period_company_code_id_key UNIQUE (year, period, company_code_id);


--
-- Name: fiscal_year_variants fiscal_year_variants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_variants
    ADD CONSTRAINT fiscal_year_variants_pkey PRIMARY KEY (id);


--
-- Name: fiscal_year_variants fiscal_year_variants_variant_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.fiscal_year_variants
    ADD CONSTRAINT fiscal_year_variants_variant_id_key UNIQUE (variant_id);


--
-- Name: general_ledger_accounts general_ledger_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger_accounts
    ADD CONSTRAINT general_ledger_accounts_account_number_key UNIQUE (account_number);


--
-- Name: general_ledger_accounts general_ledger_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger_accounts
    ADD CONSTRAINT general_ledger_accounts_pkey PRIMARY KEY (id);


--
-- Name: gl_accounts gl_accounts_account_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_account_number_key UNIQUE (account_number);


--
-- Name: gl_accounts gl_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_accounts
    ADD CONSTRAINT gl_accounts_pkey PRIMARY KEY (id);


--
-- Name: gl_entries gl_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_entries
    ADD CONSTRAINT gl_entries_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_items goods_receipt_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt_lines goods_receipt_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt goods_receipt_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt
    ADD CONSTRAINT goods_receipt_pkey PRIMARY KEY (id);


--
-- Name: goods_receipt goods_receipt_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt
    ADD CONSTRAINT goods_receipt_receipt_number_key UNIQUE (receipt_number);


--
-- Name: goods_receipts goods_receipts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_pkey PRIMARY KEY (id);


--
-- Name: goods_receipts goods_receipts_receipt_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipts
    ADD CONSTRAINT goods_receipts_receipt_number_key UNIQUE (receipt_number);


--
-- Name: internal_orders internal_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_orders
    ADD CONSTRAINT internal_orders_order_number_key UNIQUE (order_number);


--
-- Name: internal_orders internal_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.internal_orders
    ADD CONSTRAINT internal_orders_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_pkey PRIMARY KEY (id);


--
-- Name: inventory_transactions inventory_transactions_transaction_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_transaction_number_key UNIQUE (transaction_number);


--
-- Name: invoices invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: invoices invoices_invoice_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_invoice_number_unique UNIQUE (invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: issue_analytics_summary issue_analytics_summary_analysis_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_analytics_summary
    ADD CONSTRAINT issue_analytics_summary_analysis_date_key UNIQUE (analysis_date);


--
-- Name: issue_analytics_summary issue_analytics_summary_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_analytics_summary
    ADD CONSTRAINT issue_analytics_summary_pkey PRIMARY KEY (id);


--
-- Name: issue_patterns issue_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_patterns
    ADD CONSTRAINT issue_patterns_pkey PRIMARY KEY (id);


--
-- Name: issue_resolutions issue_resolutions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_resolutions
    ADD CONSTRAINT issue_resolutions_pkey PRIMARY KEY (id);


--
-- Name: issue_resolutions issue_resolutions_resolution_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_resolutions
    ADD CONSTRAINT issue_resolutions_resolution_id_key UNIQUE (resolution_id);


--
-- Name: journal_entries journal_entries_document_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_document_number_key UNIQUE (document_number);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: leads leads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.leads
    ADD CONSTRAINT leads_pkey PRIMARY KEY (id);


--
-- Name: lockbox_processing lockbox_processing_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_processing
    ADD CONSTRAINT lockbox_processing_pkey PRIMARY KEY (id);


--
-- Name: lockbox_transactions lockbox_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_transactions
    ADD CONSTRAINT lockbox_transactions_pkey PRIMARY KEY (id);


--
-- Name: material_categories material_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_code_key UNIQUE (code);


--
-- Name: material_categories material_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_pkey PRIMARY KEY (id);


--
-- Name: materials materials_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_code_key UNIQUE (code);


--
-- Name: materials materials_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT materials_pkey PRIMARY KEY (id);


--
-- Name: module_health_status module_health_status_module_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_health_status
    ADD CONSTRAINT module_health_status_module_name_key UNIQUE (module_name);


--
-- Name: module_health_status module_health_status_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.module_health_status
    ADD CONSTRAINT module_health_status_pkey PRIMARY KEY (id);


--
-- Name: movement_types movement_types_movement_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types
    ADD CONSTRAINT movement_types_movement_code_key UNIQUE (movement_code);


--
-- Name: movement_types movement_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.movement_types
    ADD CONSTRAINT movement_types_pkey PRIMARY KEY (id);


--
-- Name: sd_number_range_objects number_range_objects_object_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_range_objects
    ADD CONSTRAINT number_range_objects_object_code_key UNIQUE (object_code);


--
-- Name: sd_number_range_objects number_range_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_range_objects
    ADD CONSTRAINT number_range_objects_pkey PRIMARY KEY (id);


--
-- Name: sd_number_ranges number_ranges_object_code_range_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_ranges
    ADD CONSTRAINT number_ranges_object_code_range_number_key UNIQUE (object_code, range_number);


--
-- Name: sd_number_ranges number_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_number_ranges
    ADD CONSTRAINT number_ranges_pkey PRIMARY KEY (id);


--
-- Name: opportunities opportunities_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_pkey PRIMARY KEY (id);


--
-- Name: order_items order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_pkey PRIMARY KEY (id);


--
-- Name: orders orders_order_number_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_order_number_unique UNIQUE (order_number);


--
-- Name: orders orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_pkey PRIMARY KEY (id);


--
-- Name: payment_applications payment_applications_payment_id_billing_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_payment_id_billing_id_key UNIQUE (payment_id, billing_id);


--
-- Name: payment_applications payment_applications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_pkey PRIMARY KEY (id);


--
-- Name: payment_lines payment_lines_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_lines
    ADD CONSTRAINT payment_lines_pkey PRIMARY KEY (id);


--
-- Name: payment_methods payment_methods_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_code_key UNIQUE (code);


--
-- Name: payment_methods payment_methods_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_methods
    ADD CONSTRAINT payment_methods_pkey PRIMARY KEY (id);


--
-- Name: payment_transactions payment_transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_pkey PRIMARY KEY (id);


--
-- Name: payments payments_payment_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_payment_number_key UNIQUE (payment_number);


--
-- Name: payments payments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payments
    ADD CONSTRAINT payments_pkey PRIMARY KEY (id);


--
-- Name: plants plants_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_code_key UNIQUE (code);


--
-- Name: plants plants_code_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_code_unique UNIQUE (code);


--
-- Name: plants plants_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plants
    ADD CONSTRAINT plants_pkey PRIMARY KEY (id);


--
-- Name: player_agent_status_updates player_agent_status_updates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_agent_status_updates
    ADD CONSTRAINT player_agent_status_updates_pkey PRIMARY KEY (id);


--
-- Name: player_coach_communications player_coach_communications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.player_coach_communications
    ADD CONSTRAINT player_coach_communications_pkey PRIMARY KEY (id);


--
-- Name: posting_rules posting_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.posting_rules
    ADD CONSTRAINT posting_rules_pkey PRIMARY KEY (id);


--
-- Name: pricing_conditions pricing_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.pricing_conditions
    ADD CONSTRAINT pricing_conditions_pkey PRIMARY KEY (id);


--
-- Name: sd_pricing_procedures pricing_procedures_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_pricing_procedures
    ADD CONSTRAINT pricing_procedures_code_key UNIQUE (code);


--
-- Name: sd_pricing_procedures pricing_procedures_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_pricing_procedures
    ADD CONSTRAINT pricing_procedures_pkey PRIMARY KEY (id);


--
-- Name: production_orders production_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_order_number_key UNIQUE (order_number);


--
-- Name: production_orders production_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_pkey PRIMARY KEY (id);


--
-- Name: production_work_orders production_work_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_work_orders
    ADD CONSTRAINT production_work_orders_pkey PRIMARY KEY (id);


--
-- Name: products products_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_pkey PRIMARY KEY (id);


--
-- Name: products products_sku_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_sku_unique UNIQUE (sku);


--
-- Name: profit_centers profit_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_centers
    ADD CONSTRAINT profit_centers_pkey PRIMARY KEY (id);


--
-- Name: profit_centers profit_centers_profit_center_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.profit_centers
    ADD CONSTRAINT profit_centers_profit_center_key UNIQUE (profit_center);


--
-- Name: purchase_groups purchase_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_groups
    ADD CONSTRAINT purchase_groups_code_key UNIQUE (code);


--
-- Name: purchase_groups purchase_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_groups
    ADD CONSTRAINT purchase_groups_pkey PRIMARY KEY (id);


--
-- Name: purchase_order_items purchase_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_pkey PRIMARY KEY (id);


--
-- Name: purchase_orders purchase_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_order_number_key UNIQUE (order_number);


--
-- Name: purchase_orders purchase_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_pkey PRIMARY KEY (id);


--
-- Name: purchase_organizations purchase_organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_organizations
    ADD CONSTRAINT purchase_organizations_code_key UNIQUE (code);


--
-- Name: purchase_organizations purchase_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_organizations
    ADD CONSTRAINT purchase_organizations_pkey PRIMARY KEY (id);


--
-- Name: purchase_requests purchase_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_requests
    ADD CONSTRAINT purchase_requests_pkey PRIMARY KEY (id);


--
-- Name: purchasing_groups purchasing_groups_group_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_groups
    ADD CONSTRAINT purchasing_groups_group_code_key UNIQUE (group_code);


--
-- Name: purchasing_groups purchasing_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_groups
    ADD CONSTRAINT purchasing_groups_pkey PRIMARY KEY (id);


--
-- Name: purchasing_organizations purchasing_organizations_org_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_organizations
    ADD CONSTRAINT purchasing_organizations_org_code_key UNIQUE (org_code);


--
-- Name: purchasing_organizations purchasing_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchasing_organizations
    ADD CONSTRAINT purchasing_organizations_pkey PRIMARY KEY (id);


--
-- Name: quote_approvals quote_approvals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals
    ADD CONSTRAINT quote_approvals_pkey PRIMARY KEY (id);


--
-- Name: quote_items quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_pkey PRIMARY KEY (id);


--
-- Name: quotes quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: regions regions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_code_key UNIQUE (code);


--
-- Name: regions regions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.regions
    ADD CONSTRAINT regions_pkey PRIMARY KEY (id);


--
-- Name: reports reports_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.reports
    ADD CONSTRAINT reports_pkey PRIMARY KEY (id);


--
-- Name: rookie_agent_data_entries rookie_agent_data_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_data_entries
    ADD CONSTRAINT rookie_agent_data_entries_pkey PRIMARY KEY (id);


--
-- Name: rookie_agent_quality_checks rookie_agent_quality_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_quality_checks
    ADD CONSTRAINT rookie_agent_quality_checks_pkey PRIMARY KEY (id);


--
-- Name: rookie_agent_sessions rookie_agent_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_sessions
    ADD CONSTRAINT rookie_agent_sessions_pkey PRIMARY KEY (id);


--
-- Name: rookie_agent_training rookie_agent_training_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.rookie_agent_training
    ADD CONSTRAINT rookie_agent_training_pkey PRIMARY KEY (id);


--
-- Name: sd_sales_areas sales_areas_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_areas
    ADD CONSTRAINT sales_areas_pkey PRIMARY KEY (id);


--
-- Name: sd_sales_areas sales_areas_sales_org_code_distribution_channel_code_divisi_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_areas
    ADD CONSTRAINT sales_areas_sales_org_code_distribution_channel_code_divisi_key UNIQUE (sales_org_code, distribution_channel_code, division_code);


--
-- Name: sales_customer_contacts sales_customer_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customer_contacts
    ADD CONSTRAINT sales_customer_contacts_pkey PRIMARY KEY (id);


--
-- Name: sales_customers sales_customers_customer_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customers
    ADD CONSTRAINT sales_customers_customer_number_key UNIQUE (customer_number);


--
-- Name: sales_customers sales_customers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customers
    ADD CONSTRAINT sales_customers_pkey PRIMARY KEY (id);


--
-- Name: sales_invoice_items sales_invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_pkey PRIMARY KEY (id);


--
-- Name: sales_invoices sales_invoices_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_invoice_number_key UNIQUE (invoice_number);


--
-- Name: sales_invoices sales_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoices
    ADD CONSTRAINT sales_invoices_pkey PRIMARY KEY (id);


--
-- Name: sales_order_conditions sales_order_conditions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions
    ADD CONSTRAINT sales_order_conditions_pkey PRIMARY KEY (id);


--
-- Name: sales_order_items sales_order_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_pkey PRIMARY KEY (id);


--
-- Name: sales_orders sales_orders_order_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_order_number_key UNIQUE (order_number);


--
-- Name: sales_orders sales_orders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT sales_orders_pkey PRIMARY KEY (id);


--
-- Name: sd_sales_organizations sales_organizations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_organizations
    ADD CONSTRAINT sales_organizations_code_key UNIQUE (code);


--
-- Name: sales_organizations sales_organizations_code_key1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_organizations
    ADD CONSTRAINT sales_organizations_code_key1 UNIQUE (code);


--
-- Name: sd_sales_organizations sales_organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_organizations
    ADD CONSTRAINT sales_organizations_pkey PRIMARY KEY (id);


--
-- Name: sales_organizations sales_organizations_pkey1; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_organizations
    ADD CONSTRAINT sales_organizations_pkey1 PRIMARY KEY (id);


--
-- Name: sales_quote_items sales_quote_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quote_items
    ADD CONSTRAINT sales_quote_items_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_pkey PRIMARY KEY (id);


--
-- Name: sales_quotes sales_quotes_quote_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quotes
    ADD CONSTRAINT sales_quotes_quote_number_key UNIQUE (quote_number);


--
-- Name: sales_return_items sales_return_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_pkey PRIMARY KEY (id);


--
-- Name: sales_returns sales_returns_return_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_returns
    ADD CONSTRAINT sales_returns_return_number_key UNIQUE (return_number);


--
-- Name: sd_access_sequences sd_access_sequences_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_access_sequences
    ADD CONSTRAINT sd_access_sequences_code_key UNIQUE (code);


--
-- Name: sd_access_sequences sd_access_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_access_sequences
    ADD CONSTRAINT sd_access_sequences_pkey PRIMARY KEY (id);


--
-- Name: sd_account_assignment_groups sd_account_assignment_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_account_assignment_groups
    ADD CONSTRAINT sd_account_assignment_groups_code_key UNIQUE (code);


--
-- Name: sd_account_assignment_groups sd_account_assignment_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_account_assignment_groups
    ADD CONSTRAINT sd_account_assignment_groups_pkey PRIMARY KEY (id);


--
-- Name: sd_client_configurations sd_client_configurations_client_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_client_configurations
    ADD CONSTRAINT sd_client_configurations_client_id_key UNIQUE (client_id);


--
-- Name: sd_client_configurations sd_client_configurations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_client_configurations
    ADD CONSTRAINT sd_client_configurations_pkey PRIMARY KEY (id);


--
-- Name: sd_condition_tables sd_condition_tables_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_condition_tables
    ADD CONSTRAINT sd_condition_tables_pkey PRIMARY KEY (id);


--
-- Name: sd_condition_tables sd_condition_tables_table_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_condition_tables
    ADD CONSTRAINT sd_condition_tables_table_number_key UNIQUE (table_number);


--
-- Name: sd_customer_tax_classification sd_customer_tax_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_customer_tax_classification
    ADD CONSTRAINT sd_customer_tax_classification_pkey PRIMARY KEY (id);


--
-- Name: sd_customization_log sd_customization_log_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_customization_log
    ADD CONSTRAINT sd_customization_log_pkey PRIMARY KEY (id);


--
-- Name: sd_item_categories sd_item_categories_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_item_categories
    ADD CONSTRAINT sd_item_categories_code_key UNIQUE (code);


--
-- Name: sd_item_categories sd_item_categories_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_item_categories
    ADD CONSTRAINT sd_item_categories_pkey PRIMARY KEY (id);


--
-- Name: sd_material_tax_classification sd_material_tax_classification_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_material_tax_classification
    ADD CONSTRAINT sd_material_tax_classification_pkey PRIMARY KEY (id);


--
-- Name: sd_output_types sd_output_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_output_types
    ADD CONSTRAINT sd_output_types_code_key UNIQUE (code);


--
-- Name: sd_output_types sd_output_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_output_types
    ADD CONSTRAINT sd_output_types_pkey PRIMARY KEY (id);


--
-- Name: sd_partner_functions sd_partner_functions_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_partner_functions
    ADD CONSTRAINT sd_partner_functions_code_key UNIQUE (code);


--
-- Name: sd_partner_functions sd_partner_functions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_partner_functions
    ADD CONSTRAINT sd_partner_functions_pkey PRIMARY KEY (id);


--
-- Name: sd_revenue_account_rules sd_revenue_account_rules_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_revenue_account_rules
    ADD CONSTRAINT sd_revenue_account_rules_pkey PRIMARY KEY (id);


--
-- Name: sd_sales_office_assignments sd_sales_office_assignments_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_office_assignments
    ADD CONSTRAINT sd_sales_office_assignments_pkey PRIMARY KEY (id);


--
-- Name: sd_sales_offices sd_sales_offices_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_offices
    ADD CONSTRAINT sd_sales_offices_code_key UNIQUE (code);


--
-- Name: sd_sales_offices sd_sales_offices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_sales_offices
    ADD CONSTRAINT sd_sales_offices_pkey PRIMARY KEY (id);


--
-- Name: sd_shipping_points sd_shipping_points_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_shipping_points
    ADD CONSTRAINT sd_shipping_points_code_key UNIQUE (code);


--
-- Name: sd_shipping_points sd_shipping_points_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_shipping_points
    ADD CONSTRAINT sd_shipping_points_pkey PRIMARY KEY (id);


--
-- Name: sd_tax_codes sd_tax_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_tax_codes
    ADD CONSTRAINT sd_tax_codes_code_key UNIQUE (code);


--
-- Name: sd_tax_codes sd_tax_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sd_tax_codes
    ADD CONSTRAINT sd_tax_codes_pkey PRIMARY KEY (id);


--
-- Name: stock_movements stock_movements_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_pkey PRIMARY KEY (id);


--
-- Name: storage_locations storage_locations_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_locations
    ADD CONSTRAINT storage_locations_code_key UNIQUE (code);


--
-- Name: storage_locations storage_locations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_locations
    ADD CONSTRAINT storage_locations_pkey PRIMARY KEY (id);


--
-- Name: supply_types supply_types_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply_types
    ADD CONSTRAINT supply_types_code_key UNIQUE (code);


--
-- Name: supply_types supply_types_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.supply_types
    ADD CONSTRAINT supply_types_pkey PRIMARY KEY (id);


--
-- Name: system_error_logs system_error_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.system_error_logs
    ADD CONSTRAINT system_error_logs_pkey PRIMARY KEY (id);


--
-- Name: tax_codes tax_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT tax_codes_pkey PRIMARY KEY (id);


--
-- Name: tax_jurisdictions tax_jurisdictions_jurisdiction_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_jurisdiction_code_key UNIQUE (jurisdiction_code);


--
-- Name: tax_jurisdictions tax_jurisdictions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_pkey PRIMARY KEY (id);


--
-- Name: tax_rates tax_rates_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_pkey PRIMARY KEY (id);


--
-- Name: test_cases test_cases_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_cases
    ADD CONSTRAINT test_cases_pkey PRIMARY KEY (id);


--
-- Name: test_results test_results_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_results
    ADD CONSTRAINT test_results_pkey PRIMARY KEY (id);


--
-- Name: tile_naming_documentation tile_naming_documentation_alphabetic_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_naming_documentation
    ADD CONSTRAINT tile_naming_documentation_alphabetic_prefix_key UNIQUE (alphabetic_prefix);


--
-- Name: tile_naming_documentation tile_naming_documentation_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_naming_documentation
    ADD CONSTRAINT tile_naming_documentation_pkey PRIMARY KEY (id);


--
-- Name: tile_registry tile_registry_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_registry
    ADD CONSTRAINT tile_registry_pkey PRIMARY KEY (id);


--
-- Name: tile_registry tile_registry_tile_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_registry
    ADD CONSTRAINT tile_registry_tile_id_key UNIQUE (tile_id);


--
-- Name: tile_registry tile_registry_tile_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tile_registry
    ADD CONSTRAINT tile_registry_tile_number_key UNIQUE (tile_number);


--
-- Name: tolerance_groups tolerance_groups_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tolerance_groups
    ADD CONSTRAINT tolerance_groups_code_key UNIQUE (code);


--
-- Name: tolerance_groups tolerance_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tolerance_groups
    ADD CONSTRAINT tolerance_groups_pkey PRIMARY KEY (id);


--
-- Name: transport_logs transport_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_logs
    ADD CONSTRAINT transport_logs_pkey PRIMARY KEY (id);


--
-- Name: transport_number_ranges transport_number_ranges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_number_ranges
    ADD CONSTRAINT transport_number_ranges_pkey PRIMARY KEY (id);


--
-- Name: transport_number_ranges transport_number_ranges_range_prefix_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_number_ranges
    ADD CONSTRAINT transport_number_ranges_range_prefix_key UNIQUE (range_prefix);


--
-- Name: transport_objects transport_objects_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_objects
    ADD CONSTRAINT transport_objects_pkey PRIMARY KEY (id);


--
-- Name: transport_requests transport_requests_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_pkey PRIMARY KEY (id);


--
-- Name: transport_requests transport_requests_request_number_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_requests
    ADD CONSTRAINT transport_requests_request_number_key UNIQUE (request_number);


--
-- Name: chief_agent_permissions unique_agent_id; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.chief_agent_permissions
    ADD CONSTRAINT unique_agent_id UNIQUE (agent_id);


--
-- Name: document_posting_items unique_document_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_items
    ADD CONSTRAINT unique_document_line UNIQUE (document_id, line_number);


--
-- Name: goods_receipt_items unique_receipt_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT unique_receipt_line UNIQUE (receipt_id, line_number);


--
-- Name: bank_statement_items unique_statement_line; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_items
    ADD CONSTRAINT unique_statement_line UNIQUE (statement_id, line_number);


--
-- Name: units_of_measure units_of_measure_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_code_key UNIQUE (code);


--
-- Name: units_of_measure units_of_measure_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_pkey PRIMARY KEY (id);


--
-- Name: uom uom_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_code_key UNIQUE (code);


--
-- Name: uom_conversions uom_conversions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions
    ADD CONSTRAINT uom_conversions_pkey PRIMARY KEY (id);


--
-- Name: uom uom_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom
    ADD CONSTRAINT uom_pkey PRIMARY KEY (id);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_username_unique; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_username_unique UNIQUE (username);


--
-- Name: valuation_classes valuation_classes_class_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_classes
    ADD CONSTRAINT valuation_classes_class_code_key UNIQUE (class_code);


--
-- Name: valuation_classes valuation_classes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.valuation_classes
    ADD CONSTRAINT valuation_classes_pkey PRIMARY KEY (id);


--
-- Name: variance_analysis variance_analysis_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.variance_analysis
    ADD CONSTRAINT variance_analysis_pkey PRIMARY KEY (id);


--
-- Name: vendor_contacts vendor_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT vendor_contacts_pkey PRIMARY KEY (id);


--
-- Name: vendor_invoices vendor_invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_pkey PRIMARY KEY (id);


--
-- Name: vendors vendors_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_code_key UNIQUE (code);


--
-- Name: vendors vendors_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendors
    ADD CONSTRAINT vendors_pkey PRIMARY KEY (id);


--
-- Name: warehouse_bins warehouse_bins_bin_code_storage_location_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT warehouse_bins_bin_code_storage_location_id_key UNIQUE (bin_code, storage_location_id);


--
-- Name: warehouse_bins warehouse_bins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT warehouse_bins_pkey PRIMARY KEY (id);


--
-- Name: work_centers work_centers_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_code_key UNIQUE (code);


--
-- Name: work_centers work_centers_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.work_centers
    ADD CONSTRAINT work_centers_pkey PRIMARY KEY (id);


--
-- Name: company_codes_code_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX company_codes_code_idx ON public.company_codes USING btree (code) WHERE (active = true);


--
-- Name: idx_accounting_docs_posting_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_docs_posting_date ON public.accounting_documents USING btree (posting_date);


--
-- Name: idx_accounting_docs_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounting_docs_source ON public.accounting_documents USING btree (source_module, source_document_id);


--
-- Name: idx_accounts_payable_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_payable_status ON public.accounts_payable USING btree (status);


--
-- Name: idx_accounts_payable_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_payable_vendor_id ON public.accounts_payable USING btree (vendor_id);


--
-- Name: idx_accounts_receivable_customer_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_receivable_customer_id ON public.accounts_receivable USING btree (customer_id);


--
-- Name: idx_accounts_receivable_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_accounts_receivable_status ON public.accounts_receivable USING btree (status);


--
-- Name: idx_ai_interventions_agent_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_interventions_agent_type ON public.ai_agent_interventions USING btree (agent_type);


--
-- Name: idx_ai_interventions_confidence; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_interventions_confidence ON public.ai_agent_interventions USING btree (confidence_score);


--
-- Name: idx_ai_interventions_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ai_interventions_issue_id ON public.ai_agent_interventions USING btree (issue_id);


--
-- Name: idx_ap_invoices_due_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_invoices_due_date ON public.ap_invoices USING btree (due_date);


--
-- Name: idx_ap_invoices_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_invoices_status ON public.ap_invoices USING btree (status);


--
-- Name: idx_ap_invoices_vendor_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_invoices_vendor_id ON public.ap_invoices USING btree (vendor_id);


--
-- Name: idx_ap_payments_invoice_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_payments_invoice_id ON public.ap_payments USING btree (invoice_id);


--
-- Name: idx_ap_payments_scheduled_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_payments_scheduled_date ON public.ap_payments USING btree (scheduled_date);


--
-- Name: idx_ap_payments_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ap_payments_status ON public.ap_payments USING btree (status);


--
-- Name: idx_ar_documents_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_documents_customer ON public.ar_documents USING btree (customer_id);


--
-- Name: idx_ar_documents_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_ar_documents_invoice ON public.ar_documents USING btree (invoice_id);


--
-- Name: idx_assets_company; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_assets_company ON public.assets USING btree (company_code);


--
-- Name: idx_bank_accounts_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_accounts_created_at ON public.bank_accounts USING btree (created_at);


--
-- Name: idx_bank_master_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_master_is_active ON public.bank_master USING btree (is_active);


--
-- Name: idx_bank_statements_account; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_bank_statements_account ON public.bank_statements USING btree (bank_account, statement_date);


--
-- Name: idx_billing_docs_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_billing_docs_customer ON public.billing_documents USING btree (customer_id);


--
-- Name: idx_change_headers_business_process; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_headers_business_process ON public.change_document_headers USING btree (business_process);


--
-- Name: idx_change_headers_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_headers_module ON public.change_document_headers USING btree (application_module, change_type);


--
-- Name: idx_change_headers_object; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_headers_object ON public.change_document_headers USING btree (object_class, object_id);


--
-- Name: idx_change_headers_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_headers_timestamp ON public.change_document_headers USING btree (change_timestamp);


--
-- Name: idx_change_headers_user; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_headers_user ON public.change_document_headers USING btree (user_name, change_date);


--
-- Name: idx_change_positions_change_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_positions_change_id ON public.change_document_positions USING btree (change_document_id);


--
-- Name: idx_change_positions_table_field; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_positions_table_field ON public.change_document_positions USING btree (table_name, field_name);


--
-- Name: idx_change_positions_values; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_positions_values ON public.change_document_positions USING btree (old_value, new_value);


--
-- Name: idx_change_relations_source; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_relations_source ON public.change_document_relations USING btree (source_change_id);


--
-- Name: idx_change_relations_target; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_relations_target ON public.change_document_relations USING btree (target_change_id);


--
-- Name: idx_change_relations_type; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_change_relations_type ON public.change_document_relations USING btree (relation_type);


--
-- Name: idx_collection_activities_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_activities_customer ON public.collection_activities USING btree (customer_id);


--
-- Name: idx_collection_activities_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_collection_activities_date ON public.collection_activities USING btree (activity_date);


--
-- Name: idx_condition_types_company_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_condition_types_company_category ON public.condition_types USING btree (company_code_id, category_id);


--
-- Name: idx_custom_reports_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_reports_category ON public.custom_reports USING btree (category);


--
-- Name: idx_custom_reports_created_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_reports_created_by ON public.custom_reports USING btree (created_by);


--
-- Name: idx_custom_reports_name; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_custom_reports_name ON public.custom_reports USING btree (name);


--
-- Name: idx_delivery_docs_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_delivery_docs_customer ON public.delivery_documents USING btree (customer_id);


--
-- Name: idx_document_postings_company_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_document_postings_company_date ON public.document_postings USING btree (company_code, posting_date);


--
-- Name: idx_edi_trading_partners_is_active; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edi_trading_partners_is_active ON public.edi_trading_partners USING btree (is_active);


--
-- Name: idx_edi_transactions_sender_receiver; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edi_transactions_sender_receiver ON public.edi_transactions USING btree (sender_id, receiver_id);


--
-- Name: idx_edi_transactions_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edi_transactions_status ON public.edi_transactions USING btree (status);


--
-- Name: idx_edi_transactions_transaction_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_edi_transactions_transaction_date ON public.edi_transactions USING btree (transaction_date);


--
-- Name: idx_goods_receipts_vendor_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_goods_receipts_vendor_date ON public.goods_receipts USING btree (vendor_code, receipt_date);


--
-- Name: idx_issues_log_category_severity; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_log_category_severity ON public.comprehensive_issues_log USING btree (category, severity);


--
-- Name: idx_issues_log_created_at; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_log_created_at ON public.comprehensive_issues_log USING btree (created_at);


--
-- Name: idx_issues_log_module_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_log_module_status ON public.comprehensive_issues_log USING btree (module, status);


--
-- Name: idx_issues_log_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_issues_log_resolved_by ON public.comprehensive_issues_log USING btree (resolved_by);


--
-- Name: idx_lockbox_processing_bank_account_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lockbox_processing_bank_account_id ON public.lockbox_processing USING btree (bank_account_id);


--
-- Name: idx_lockbox_processing_status; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lockbox_processing_status ON public.lockbox_processing USING btree (status);


--
-- Name: idx_lockbox_transactions_lockbox_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_lockbox_transactions_lockbox_id ON public.lockbox_transactions USING btree (lockbox_id);


--
-- Name: idx_module_health_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_health_module ON public.module_health_status USING btree (module_name);


--
-- Name: idx_module_health_score; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_module_health_score ON public.module_health_status USING btree (health_score);


--
-- Name: idx_patterns_auto_resolvable; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patterns_auto_resolvable ON public.issue_patterns USING btree (auto_resolvable);


--
-- Name: idx_patterns_category; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_patterns_category ON public.issue_patterns USING btree (category);


--
-- Name: idx_payment_applications_invoice; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_applications_invoice ON public.ar_payment_applications USING btree (invoice_id);


--
-- Name: idx_payment_applications_payment; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payment_applications_payment ON public.ar_payment_applications USING btree (payment_id);


--
-- Name: idx_payments_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_customer ON public.payments USING btree (customer_code);


--
-- Name: idx_payments_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_date ON public.payments USING btree (payment_date);


--
-- Name: idx_payments_vendor; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_payments_vendor ON public.payments USING btree (vendor_code);


--
-- Name: idx_resolutions_issue_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resolutions_issue_id ON public.issue_resolutions USING btree (issue_id);


--
-- Name: idx_resolutions_resolved_by; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resolutions_resolved_by ON public.issue_resolutions USING btree (resolved_by);


--
-- Name: idx_resolutions_success; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_resolutions_success ON public.issue_resolutions USING btree (success);


--
-- Name: idx_sales_order_conditions_order_seq; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_order_conditions_order_seq ON public.sales_order_conditions USING btree (sales_order_id, sequence_number);


--
-- Name: idx_sales_orders_customer; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_customer ON public.sales_orders USING btree (customer_id);


--
-- Name: idx_sales_orders_date; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sales_orders_date ON public.sales_orders USING btree (order_date);


--
-- Name: idx_sd_number_range_object; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd_number_range_object ON public.sd_number_ranges USING btree (object_code, range_number);


--
-- Name: idx_sd_sales_area_combo; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_sd_sales_area_combo ON public.sd_sales_areas USING btree (sales_org_code, distribution_channel_code, division_code);


--
-- Name: idx_system_error_logs_level; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_error_logs_level ON public.system_error_logs USING btree (level);


--
-- Name: idx_system_error_logs_module; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_error_logs_module ON public.system_error_logs USING btree (module);


--
-- Name: idx_system_error_logs_timestamp; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_system_error_logs_timestamp ON public.system_error_logs USING btree ("timestamp" DESC);


--
-- Name: comprehensive_issues_log trigger_update_module_health; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_update_module_health AFTER INSERT OR UPDATE ON public.comprehensive_issues_log FOR EACH ROW EXECUTE FUNCTION public.update_module_health();


--
-- Name: accounts_payable update_accounts_payable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_payable_updated_at BEFORE UPDATE ON public.accounts_payable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounts_receivable update_accounts_receivable_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_accounts_receivable_updated_at BEFORE UPDATE ON public.accounts_receivable FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: activity_types update_activity_types_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_activity_types_updated_at BEFORE UPDATE ON public.activity_types FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_agent_analytics update_ai_agent_analytics_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_agent_analytics_updated_at BEFORE UPDATE ON public.ai_agent_analytics FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_agent_configs update_ai_agent_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_agent_configs_updated_at BEFORE UPDATE ON public.ai_agent_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_agent_health update_ai_agent_health_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_agent_health_updated_at BEFORE UPDATE ON public.ai_agent_health FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_chat_messages update_ai_chat_messages_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_chat_messages_updated_at BEFORE UPDATE ON public.ai_chat_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_chat_sessions update_ai_chat_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_chat_sessions_updated_at BEFORE UPDATE ON public.ai_chat_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_data_analysis_sessions update_ai_data_analysis_sessions_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_ai_data_analysis_sessions_updated_at BEFORE UPDATE ON public.ai_data_analysis_sessions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: api_keys update_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_api_keys_updated_at BEFORE UPDATE ON public.api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: approval_levels update_approval_levels_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_approval_levels_updated_at BEFORE UPDATE ON public.approval_levels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: asset_master update_asset_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_asset_master_updated_at BEFORE UPDATE ON public.asset_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: batch_master update_batch_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_batch_master_updated_at BEFORE UPDATE ON public.batch_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bill_of_materials update_bill_of_materials_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bill_of_materials_updated_at BEFORE UPDATE ON public.bill_of_materials FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: bom_items update_bom_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_bom_items_updated_at BEFORE UPDATE ON public.bom_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: categories update_categories_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON public.categories FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: company_code_chart_assignments update_company_code_chart_assignments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_company_code_chart_assignments_updated_at BEFORE UPDATE ON public.company_code_chart_assignments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: copa_actuals update_copa_actuals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_copa_actuals_updated_at BEFORE UPDATE ON public.copa_actuals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_allocations update_cost_allocations_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_allocations_updated_at BEFORE UPDATE ON public.cost_allocations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_center_actuals update_cost_center_actuals_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_center_actuals_updated_at BEFORE UPDATE ON public.cost_center_actuals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_center_planning update_cost_center_planning_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_center_planning_updated_at BEFORE UPDATE ON public.cost_center_planning FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: cost_centers update_cost_centers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_cost_centers_updated_at BEFORE UPDATE ON public.cost_centers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: countries update_countries_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_countries_updated_at BEFORE UPDATE ON public.countries FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: credit_control_areas update_credit_control_areas_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_credit_control_areas_updated_at BEFORE UPDATE ON public.credit_control_areas FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: currencies update_currencies_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_currencies_updated_at BEFORE UPDATE ON public.currencies FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: custom_reports update_custom_reports_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_custom_reports_updated_at BEFORE UPDATE ON public.custom_reports FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customer_contacts update_customer_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customer_contacts_updated_at BEFORE UPDATE ON public.customer_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: customers update_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON public.customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: dashboard_configs update_dashboard_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_dashboard_configs_updated_at BEFORE UPDATE ON public.dashboard_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employee_master update_employee_master_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employee_master_updated_at BEFORE UPDATE ON public.employee_master FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: employees update_employees_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_employees_updated_at BEFORE UPDATE ON public.employees FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: environment_config update_environment_config_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_environment_config_updated_at BEFORE UPDATE ON public.environment_config FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: erp_customer_contacts update_erp_customer_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_erp_customer_contacts_updated_at BEFORE UPDATE ON public.erp_customer_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: erp_customers update_erp_customers_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_erp_customers_updated_at BEFORE UPDATE ON public.erp_customers FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: erp_vendor_contacts update_erp_vendor_contacts_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_erp_vendor_contacts_updated_at BEFORE UPDATE ON public.erp_vendor_contacts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: erp_vendors update_erp_vendors_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_erp_vendors_updated_at BEFORE UPDATE ON public.erp_vendors FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: comprehensive_issues_log update_issues_log_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_issues_log_updated_at BEFORE UPDATE ON public.comprehensive_issues_log FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: issue_patterns update_patterns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_patterns_updated_at BEFORE UPDATE ON public.issue_patterns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: accounting_document_items accounting_document_items_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounting_document_items
    ADD CONSTRAINT accounting_document_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.accounting_documents(id) ON DELETE CASCADE;


--
-- Name: accounts_payable accounts_payable_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: accounts_payable accounts_payable_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: accounts_payable accounts_payable_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: accounts_payable accounts_payable_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: accounts_payable accounts_payable_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_payable
    ADD CONSTRAINT accounts_payable_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: accounts_receivable accounts_receivable_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: accounts_receivable accounts_receivable_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: accounts_receivable accounts_receivable_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: accounts_receivable accounts_receivable_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: accounts_receivable accounts_receivable_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.accounts_receivable
    ADD CONSTRAINT accounts_receivable_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: agent_player_interactions agent_player_interactions_initiator_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_interactions
    ADD CONSTRAINT agent_player_interactions_initiator_player_id_fkey FOREIGN KEY (initiator_player_id) REFERENCES public.agent_players(id);


--
-- Name: agent_player_interactions agent_player_interactions_target_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_interactions
    ADD CONSTRAINT agent_player_interactions_target_player_id_fkey FOREIGN KEY (target_player_id) REFERENCES public.agent_players(id);


--
-- Name: agent_player_reports agent_player_reports_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_reports
    ADD CONSTRAINT agent_player_reports_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.agent_players(id);


--
-- Name: agent_player_validations agent_player_validations_player_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.agent_player_validations
    ADD CONSTRAINT agent_player_validations_player_id_fkey FOREIGN KEY (player_id) REFERENCES public.agent_players(id);


--
-- Name: ai_agent_analytics ai_agent_analytics_module_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_analytics
    ADD CONSTRAINT ai_agent_analytics_module_type_fkey FOREIGN KEY (module_type) REFERENCES public.ai_agent_configs(module_type);


--
-- Name: ai_agent_interventions ai_agent_interventions_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_agent_interventions
    ADD CONSTRAINT ai_agent_interventions_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.comprehensive_issues_log(issue_id) ON DELETE CASCADE;


--
-- Name: ai_chat_messages ai_chat_messages_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_messages
    ADD CONSTRAINT ai_chat_messages_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.ai_chat_sessions(session_id) ON DELETE CASCADE;


--
-- Name: ai_chat_sessions ai_chat_sessions_module_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_chat_sessions
    ADD CONSTRAINT ai_chat_sessions_module_type_fkey FOREIGN KEY (module_type) REFERENCES public.ai_agent_configs(module_type);


--
-- Name: ai_data_analysis_sessions ai_data_analysis_sessions_module_type_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_data_analysis_sessions
    ADD CONSTRAINT ai_data_analysis_sessions_module_type_fkey FOREIGN KEY (module_type) REFERENCES public.ai_agent_configs(module_type);


--
-- Name: ap_invoices ap_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_invoices
    ADD CONSTRAINT ap_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: ap_payments ap_payments_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ap_payments
    ADD CONSTRAINT ap_payments_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.ap_invoices(id);


--
-- Name: ar_documents ar_documents_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_documents
    ADD CONSTRAINT ar_documents_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: ar_documents ar_documents_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_documents
    ADD CONSTRAINT ar_documents_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: ar_payment_applications ar_payment_applications_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_payment_applications
    ADD CONSTRAINT ar_payment_applications_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: ar_payment_applications ar_payment_applications_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ar_payment_applications
    ADD CONSTRAINT ar_payment_applications_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.customer_payments(id);


--
-- Name: bank_statement_items bank_statement_items_statement_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_statement_items
    ADD CONSTRAINT bank_statement_items_statement_id_fkey FOREIGN KEY (statement_id) REFERENCES public.bank_statements(id) ON DELETE CASCADE;


--
-- Name: bank_transactions bank_transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_transactions
    ADD CONSTRAINT bank_transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: batch_master batch_master_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_master
    ADD CONSTRAINT batch_master_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: batch_master batch_master_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.batch_master
    ADD CONSTRAINT batch_master_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: billing_documents billing_documents_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery_documents(id);


--
-- Name: billing_documents billing_documents_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_documents
    ADD CONSTRAINT billing_documents_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: billing_items billing_items_billing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_billing_id_fkey FOREIGN KEY (billing_id) REFERENCES public.billing_documents(id) ON DELETE CASCADE;


--
-- Name: billing_items billing_items_delivery_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_delivery_item_id_fkey FOREIGN KEY (delivery_item_id) REFERENCES public.delivery_items(id);


--
-- Name: billing_items billing_items_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.billing_items
    ADD CONSTRAINT billing_items_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id);


--
-- Name: bom_items bom_items_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bom_items
    ADD CONSTRAINT bom_items_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bill_of_materials(id);


--
-- Name: categories categories_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.categories
    ADD CONSTRAINT categories_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: change_document_approvals change_document_approvals_change_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_approvals
    ADD CONSTRAINT change_document_approvals_change_document_id_fkey FOREIGN KEY (change_document_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: change_document_attachments change_document_attachments_change_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_attachments
    ADD CONSTRAINT change_document_attachments_change_document_id_fkey FOREIGN KEY (change_document_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: change_document_headers change_document_headers_parent_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers
    ADD CONSTRAINT change_document_headers_parent_change_id_fkey FOREIGN KEY (parent_change_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: change_document_headers change_document_headers_reversal_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_headers
    ADD CONSTRAINT change_document_headers_reversal_change_id_fkey FOREIGN KEY (reversal_change_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: change_document_positions change_document_positions_change_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_positions
    ADD CONSTRAINT change_document_positions_change_document_id_fkey FOREIGN KEY (change_document_id) REFERENCES public.change_document_headers(change_document_id) ON DELETE CASCADE;


--
-- Name: change_document_relations change_document_relations_source_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_relations
    ADD CONSTRAINT change_document_relations_source_change_id_fkey FOREIGN KEY (source_change_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: change_document_relations change_document_relations_target_change_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.change_document_relations
    ADD CONSTRAINT change_document_relations_target_change_id_fkey FOREIGN KEY (target_change_id) REFERENCES public.change_document_headers(change_document_id);


--
-- Name: collection_activities collection_activities_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_activities
    ADD CONSTRAINT collection_activities_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: collection_activities collection_activities_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.collection_activities
    ADD CONSTRAINT collection_activities_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id);


--
-- Name: company_codes company_codes_fiscal_year_variant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.company_codes
    ADD CONSTRAINT company_codes_fiscal_year_variant_id_fkey FOREIGN KEY (fiscal_year_variant_id) REFERENCES public.fiscal_year_variants(id);


--
-- Name: condition_access_rules condition_access_rules_condition_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_access_rules
    ADD CONSTRAINT condition_access_rules_condition_type_id_fkey FOREIGN KEY (condition_type_id) REFERENCES public.condition_types(id) ON DELETE CASCADE;


--
-- Name: condition_access_rules condition_access_rules_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_access_rules
    ADD CONSTRAINT condition_access_rules_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: condition_dependencies condition_dependencies_dependent_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_dependencies
    ADD CONSTRAINT condition_dependencies_dependent_condition_id_fkey FOREIGN KEY (dependent_condition_id) REFERENCES public.condition_types(id) ON DELETE CASCADE;


--
-- Name: condition_dependencies condition_dependencies_parent_condition_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_dependencies
    ADD CONSTRAINT condition_dependencies_parent_condition_id_fkey FOREIGN KEY (parent_condition_id) REFERENCES public.condition_types(id) ON DELETE CASCADE;


--
-- Name: condition_types condition_types_calculation_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_calculation_method_id_fkey FOREIGN KEY (calculation_method_id) REFERENCES public.calculation_methods(id);


--
-- Name: condition_types condition_types_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.condition_categories(id);


--
-- Name: condition_types condition_types_company_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_company_code_id_fkey FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);


--
-- Name: condition_types condition_types_tax_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.condition_types
    ADD CONSTRAINT condition_types_tax_jurisdiction_id_fkey FOREIGN KEY (tax_jurisdiction_id) REFERENCES public.tax_jurisdictions(id);


--
-- Name: countries countries_region_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.countries
    ADD CONSTRAINT countries_region_id_fkey FOREIGN KEY (region_id) REFERENCES public.regions(id);


--
-- Name: customer_bank_relationships customer_bank_relationships_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_relationships
    ADD CONSTRAINT customer_bank_relationships_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: customer_bank_relationships customer_bank_relationships_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_bank_relationships
    ADD CONSTRAINT customer_bank_relationships_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customer_credit_management customer_credit_management_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_credit_management
    ADD CONSTRAINT customer_credit_management_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: customers customers_company_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_company_code_id_fkey FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);


--
-- Name: customers customers_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customers
    ADD CONSTRAINT customers_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: delivery_documents delivery_documents_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_documents
    ADD CONSTRAINT delivery_documents_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id);


--
-- Name: delivery_items delivery_items_delivery_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_delivery_id_fkey FOREIGN KEY (delivery_id) REFERENCES public.delivery_documents(id) ON DELETE CASCADE;


--
-- Name: delivery_items delivery_items_sales_order_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.delivery_items
    ADD CONSTRAINT delivery_items_sales_order_item_id_fkey FOREIGN KEY (sales_order_item_id) REFERENCES public.sales_order_items(id);


--
-- Name: designer_agent_communications designer_agent_communications_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_agent_communications
    ADD CONSTRAINT designer_agent_communications_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.designer_analysis(id);


--
-- Name: designer_analysis designer_analysis_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_analysis
    ADD CONSTRAINT designer_analysis_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.designer_documents(id);


--
-- Name: designer_implementations designer_implementations_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_implementations
    ADD CONSTRAINT designer_implementations_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.designer_analysis(id);


--
-- Name: designer_reviews designer_reviews_analysis_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.designer_reviews
    ADD CONSTRAINT designer_reviews_analysis_id_fkey FOREIGN KEY (analysis_id) REFERENCES public.designer_analysis(id);


--
-- Name: document_posting_items document_posting_items_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_items
    ADD CONSTRAINT document_posting_items_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_postings(id) ON DELETE CASCADE;


--
-- Name: document_posting_lines document_posting_lines_document_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.document_posting_lines
    ADD CONSTRAINT document_posting_lines_document_id_fkey FOREIGN KEY (document_id) REFERENCES public.document_posting(id) ON DELETE CASCADE;


--
-- Name: employee_master employee_master_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employee_master
    ADD CONSTRAINT employee_master_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employee_master(id);


--
-- Name: employees employees_manager_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.employees
    ADD CONSTRAINT employees_manager_id_fkey FOREIGN KEY (manager_id) REFERENCES public.employees(id);


--
-- Name: expenses expenses_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.expenses
    ADD CONSTRAINT expenses_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: bank_accounts fk_bank_accounts_bank_id; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.bank_accounts
    ADD CONSTRAINT fk_bank_accounts_bank_id FOREIGN KEY (bank_id) REFERENCES public.bank_master(id);


--
-- Name: cost_center_actuals fk_cc_actuals_cost_center; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.cost_center_actuals
    ADD CONSTRAINT fk_cc_actuals_cost_center FOREIGN KEY (cost_center_id) REFERENCES public.cost_centers(id);


--
-- Name: copa_actuals fk_copa_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copa_actuals
    ADD CONSTRAINT fk_copa_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: copa_actuals fk_copa_material; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copa_actuals
    ADD CONSTRAINT fk_copa_material FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: copa_actuals fk_copa_profit_center; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.copa_actuals
    ADD CONSTRAINT fk_copa_profit_center FOREIGN KEY (profit_center_id) REFERENCES public.profit_centers(id);


--
-- Name: customer_contacts fk_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.customer_contacts
    ADD CONSTRAINT fk_customer FOREIGN KEY (customer_id) REFERENCES public.customers(id) ON DELETE CASCADE;


--
-- Name: erp_customers fk_customer_company_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customers
    ADD CONSTRAINT fk_customer_company_code FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);


--
-- Name: erp_customer_contacts fk_erp_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customer_contacts
    ADD CONSTRAINT fk_erp_customer FOREIGN KEY (customer_id) REFERENCES public.erp_customers(id) ON DELETE CASCADE;


--
-- Name: erp_vendor_contacts fk_erp_vendor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendor_contacts
    ADD CONSTRAINT fk_erp_vendor FOREIGN KEY (vendor_id) REFERENCES public.erp_vendors(id) ON DELETE CASCADE;


--
-- Name: opportunities fk_opportunity_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT fk_opportunity_customer FOREIGN KEY (customer_id) REFERENCES public.erp_customers(id);


--
-- Name: erp_customers fk_parent_erp_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_customers
    ADD CONSTRAINT fk_parent_erp_customer FOREIGN KEY (parent_customer_id) REFERENCES public.erp_customers(id);


--
-- Name: quotes fk_quote_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT fk_quote_customer FOREIGN KEY (customer_id) REFERENCES public.erp_customers(id);


--
-- Name: sales_orders fk_sales_order_customer; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT fk_sales_order_customer FOREIGN KEY (customer_id) REFERENCES public.erp_customers(id);


--
-- Name: sales_orders fk_sales_order_plant; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT fk_sales_order_plant FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: sales_orders fk_sales_order_sales_org; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_orders
    ADD CONSTRAINT fk_sales_order_sales_org FOREIGN KEY (sales_org_id) REFERENCES public.sd_sales_organizations(id);


--
-- Name: materials fk_uom; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.materials
    ADD CONSTRAINT fk_uom FOREIGN KEY (uom_id) REFERENCES public.uom(id);


--
-- Name: vendor_contacts fk_vendor; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_contacts
    ADD CONSTRAINT fk_vendor FOREIGN KEY (vendor_id) REFERENCES public.vendors(id) ON DELETE CASCADE;


--
-- Name: erp_vendors fk_vendor_company_code; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.erp_vendors
    ADD CONSTRAINT fk_vendor_company_code FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);


--
-- Name: general_ledger_accounts general_ledger_accounts_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger_accounts
    ADD CONSTRAINT general_ledger_accounts_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: general_ledger_accounts general_ledger_accounts_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.general_ledger_accounts
    ADD CONSTRAINT general_ledger_accounts_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES public.general_ledger_accounts(id);


--
-- Name: gl_entries gl_entries_gl_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.gl_entries
    ADD CONSTRAINT gl_entries_gl_account_id_fkey FOREIGN KEY (gl_account_id) REFERENCES public.gl_accounts(id);


--
-- Name: goods_receipt_items goods_receipt_items_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_items
    ADD CONSTRAINT goods_receipt_items_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.goods_receipts(id) ON DELETE CASCADE;


--
-- Name: goods_receipt_lines goods_receipt_lines_receipt_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goods_receipt_lines
    ADD CONSTRAINT goods_receipt_lines_receipt_id_fkey FOREIGN KEY (receipt_id) REFERENCES public.goods_receipt(id) ON DELETE CASCADE;


--
-- Name: inventory_transactions inventory_transactions_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: inventory_transactions inventory_transactions_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: inventory_transactions inventory_transactions_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: inventory_transactions inventory_transactions_storage_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.inventory_transactions
    ADD CONSTRAINT inventory_transactions_storage_location_id_fkey FOREIGN KEY (storage_location_id) REFERENCES public.storage_locations(id);


--
-- Name: invoices invoices_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: invoices invoices_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: issue_resolutions issue_resolutions_issue_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.issue_resolutions
    ADD CONSTRAINT issue_resolutions_issue_id_fkey FOREIGN KEY (issue_id) REFERENCES public.comprehensive_issues_log(issue_id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: journal_entries journal_entries_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: journal_entries journal_entries_posted_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES public.users(id);


--
-- Name: lockbox_processing lockbox_processing_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_processing
    ADD CONSTRAINT lockbox_processing_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: lockbox_transactions lockbox_transactions_lockbox_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lockbox_transactions
    ADD CONSTRAINT lockbox_transactions_lockbox_id_fkey FOREIGN KEY (lockbox_id) REFERENCES public.lockbox_processing(id);


--
-- Name: material_categories material_categories_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.material_categories
    ADD CONSTRAINT material_categories_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.material_categories(id);


--
-- Name: opportunities opportunities_lead_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.opportunities
    ADD CONSTRAINT opportunities_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES public.leads(id);


--
-- Name: order_items order_items_order_id_orders_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_order_id_orders_id_fk FOREIGN KEY (order_id) REFERENCES public.orders(id);


--
-- Name: order_items order_items_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.order_items
    ADD CONSTRAINT order_items_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: orders orders_customer_id_customers_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_customer_id_customers_id_fk FOREIGN KEY (customer_id) REFERENCES public.customers(id);


--
-- Name: orders orders_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.orders
    ADD CONSTRAINT orders_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: payment_applications payment_applications_billing_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_billing_id_fkey FOREIGN KEY (billing_id) REFERENCES public.billing_documents(id);


--
-- Name: payment_applications payment_applications_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_applications
    ADD CONSTRAINT payment_applications_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.customer_payments(id) ON DELETE CASCADE;


--
-- Name: payment_lines payment_lines_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_lines
    ADD CONSTRAINT payment_lines_payment_id_fkey FOREIGN KEY (payment_id) REFERENCES public.payments(id) ON DELETE CASCADE;


--
-- Name: payment_transactions payment_transactions_ar_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_ar_invoice_id_fkey FOREIGN KEY (ar_invoice_id) REFERENCES public.accounts_receivable(id);


--
-- Name: payment_transactions payment_transactions_bank_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_bank_account_id_fkey FOREIGN KEY (bank_account_id) REFERENCES public.bank_accounts(id);


--
-- Name: payment_transactions payment_transactions_bank_transaction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_bank_transaction_id_fkey FOREIGN KEY (bank_transaction_id) REFERENCES public.bank_transactions(id);


--
-- Name: payment_transactions payment_transactions_customer_payment_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.payment_transactions
    ADD CONSTRAINT payment_transactions_customer_payment_id_fkey FOREIGN KEY (customer_payment_id) REFERENCES public.customer_payments(id);


--
-- Name: production_orders production_orders_bom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_bom_id_fkey FOREIGN KEY (bom_id) REFERENCES public.bill_of_materials(id);


--
-- Name: production_orders production_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: production_orders production_orders_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: production_orders production_orders_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: production_orders production_orders_released_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_released_by_fkey FOREIGN KEY (released_by) REFERENCES public.users(id);


--
-- Name: production_orders production_orders_work_center_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.production_orders
    ADD CONSTRAINT production_orders_work_center_id_fkey FOREIGN KEY (work_center_id) REFERENCES public.work_centers(id);


--
-- Name: products products_category_id_categories_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_category_id_categories_id_fk FOREIGN KEY (category_id) REFERENCES public.categories(id);


--
-- Name: products products_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.products
    ADD CONSTRAINT products_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: purchase_order_items purchase_order_items_material_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_material_id_fkey FOREIGN KEY (material_id) REFERENCES public.materials(id);


--
-- Name: purchase_order_items purchase_order_items_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: purchase_order_items purchase_order_items_purchase_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_purchase_order_id_fkey FOREIGN KEY (purchase_order_id) REFERENCES public.purchase_orders(id);


--
-- Name: purchase_order_items purchase_order_items_storage_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_order_items
    ADD CONSTRAINT purchase_order_items_storage_location_id_fkey FOREIGN KEY (storage_location_id) REFERENCES public.storage_locations(id);


--
-- Name: purchase_orders purchase_orders_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id);


--
-- Name: purchase_orders purchase_orders_currency_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_currency_id_fkey FOREIGN KEY (currency_id) REFERENCES public.currencies(id);


--
-- Name: purchase_orders purchase_orders_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: purchase_orders purchase_orders_purchase_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_purchase_organization_id_fkey FOREIGN KEY (purchase_organization_id) REFERENCES public.purchase_organizations(id);


--
-- Name: purchase_orders purchase_orders_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.purchase_orders
    ADD CONSTRAINT purchase_orders_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: quote_approvals quote_approvals_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_approvals
    ADD CONSTRAINT quote_approvals_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quote_items quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quote_items
    ADD CONSTRAINT quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.quotes(id) ON DELETE CASCADE;


--
-- Name: quotes quotes_opportunity_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.quotes
    ADD CONSTRAINT quotes_opportunity_id_fkey FOREIGN KEY (opportunity_id) REFERENCES public.opportunities(id);


--
-- Name: sales_customer_contacts sales_customer_contacts_customer_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_customer_contacts
    ADD CONSTRAINT sales_customer_contacts_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES public.sales_customers(id) ON DELETE CASCADE;


--
-- Name: sales_invoice_items sales_invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_invoice_items
    ADD CONSTRAINT sales_invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.sales_invoices(id) ON DELETE CASCADE;


--
-- Name: sales_order_conditions sales_order_conditions_calculation_method_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions
    ADD CONSTRAINT sales_order_conditions_calculation_method_id_fkey FOREIGN KEY (calculation_method_id) REFERENCES public.calculation_methods(id);


--
-- Name: sales_order_conditions sales_order_conditions_category_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions
    ADD CONSTRAINT sales_order_conditions_category_id_fkey FOREIGN KEY (category_id) REFERENCES public.condition_categories(id);


--
-- Name: sales_order_conditions sales_order_conditions_condition_type_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions
    ADD CONSTRAINT sales_order_conditions_condition_type_id_fkey FOREIGN KEY (condition_type_id) REFERENCES public.condition_types(id);


--
-- Name: sales_order_conditions sales_order_conditions_sales_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_conditions
    ADD CONSTRAINT sales_order_conditions_sales_order_id_fkey FOREIGN KEY (sales_order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_order_items sales_order_items_order_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_order_items
    ADD CONSTRAINT sales_order_items_order_id_fkey FOREIGN KEY (order_id) REFERENCES public.sales_orders(id) ON DELETE CASCADE;


--
-- Name: sales_quote_items sales_quote_items_quote_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_quote_items
    ADD CONSTRAINT sales_quote_items_quote_id_fkey FOREIGN KEY (quote_id) REFERENCES public.sales_quotes(id) ON DELETE CASCADE;


--
-- Name: sales_return_items sales_return_items_return_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.sales_return_items
    ADD CONSTRAINT sales_return_items_return_id_fkey FOREIGN KEY (return_id) REFERENCES public.sales_returns(id) ON DELETE CASCADE;


--
-- Name: stock_movements stock_movements_product_id_products_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_product_id_products_id_fk FOREIGN KEY (product_id) REFERENCES public.products(id);


--
-- Name: stock_movements stock_movements_user_id_users_id_fk; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.stock_movements
    ADD CONSTRAINT stock_movements_user_id_users_id_fk FOREIGN KEY (user_id) REFERENCES public.users(id);


--
-- Name: storage_locations storage_locations_plant_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.storage_locations
    ADD CONSTRAINT storage_locations_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES public.plants(id);


--
-- Name: tax_codes tax_codes_company_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_codes
    ADD CONSTRAINT tax_codes_company_code_id_fkey FOREIGN KEY (company_code_id) REFERENCES public.company_codes(id);


--
-- Name: tax_jurisdictions tax_jurisdictions_parent_jurisdiction_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_jurisdictions
    ADD CONSTRAINT tax_jurisdictions_parent_jurisdiction_id_fkey FOREIGN KEY (parent_jurisdiction_id) REFERENCES public.tax_jurisdictions(id);


--
-- Name: tax_rates tax_rates_tax_code_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.tax_rates
    ADD CONSTRAINT tax_rates_tax_code_id_fkey FOREIGN KEY (tax_code_id) REFERENCES public.tax_codes(id);


--
-- Name: test_results test_results_test_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.test_results
    ADD CONSTRAINT test_results_test_id_fkey FOREIGN KEY (test_id) REFERENCES public.test_cases(id);


--
-- Name: transport_logs transport_logs_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_logs
    ADD CONSTRAINT transport_logs_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.transport_requests(id);


--
-- Name: transport_objects transport_objects_request_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.transport_objects
    ADD CONSTRAINT transport_objects_request_id_fkey FOREIGN KEY (request_id) REFERENCES public.transport_requests(id);


--
-- Name: units_of_measure units_of_measure_base_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.units_of_measure
    ADD CONSTRAINT units_of_measure_base_uom_id_fkey FOREIGN KEY (base_uom_id) REFERENCES public.units_of_measure(id);


--
-- Name: uom_conversions uom_conversions_from_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions
    ADD CONSTRAINT uom_conversions_from_uom_id_fkey FOREIGN KEY (from_uom_id) REFERENCES public.uom(id);


--
-- Name: uom_conversions uom_conversions_to_uom_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.uom_conversions
    ADD CONSTRAINT uom_conversions_to_uom_id_fkey FOREIGN KEY (to_uom_id) REFERENCES public.uom(id);


--
-- Name: vendor_invoices vendor_invoices_vendor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.vendor_invoices
    ADD CONSTRAINT vendor_invoices_vendor_id_fkey FOREIGN KEY (vendor_id) REFERENCES public.vendors(id);


--
-- Name: warehouse_bins warehouse_bins_storage_location_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.warehouse_bins
    ADD CONSTRAINT warehouse_bins_storage_location_id_fkey FOREIGN KEY (storage_location_id) REFERENCES public.storage_locations(id);


--
-- PostgreSQL database dump complete
--

