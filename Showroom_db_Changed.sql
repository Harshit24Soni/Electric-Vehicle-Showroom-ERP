--
-- PostgreSQL database dump
--

\restrict s3MACyTvfBO2tCeXhAHQbFjdx7ht7EgpwDS8fcTZeLGdsC17b2o0xxBNy8i5bur

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-02-22 21:44:07

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- TOC entry 21 (class 2615 OID 28049)
-- Name: audit; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA audit;


ALTER SCHEMA audit OWNER TO postgres;

--
-- TOC entry 20 (class 2615 OID 28034)
-- Name: auth; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA auth;


ALTER SCHEMA auth OWNER TO postgres;

--
-- TOC entry 7 (class 2615 OID 25329)
-- Name: billing; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA billing;


ALTER SCHEMA billing OWNER TO postgres;

--
-- TOC entry 6 (class 2615 OID 24594)
-- Name: communication; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA communication;


ALTER SCHEMA communication OWNER TO postgres;

--
-- TOC entry 8 (class 2615 OID 24587)
-- Name: crm; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA crm;


ALTER SCHEMA crm OWNER TO postgres;

--
-- TOC entry 9 (class 2615 OID 24593)
-- Name: finance; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA finance;


ALTER SCHEMA finance OWNER TO postgres;

--
-- TOC entry 10 (class 2615 OID 24592)
-- Name: hr; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA hr;


ALTER SCHEMA hr OWNER TO postgres;

--
-- TOC entry 11 (class 2615 OID 25077)
-- Name: insurance; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA insurance;


ALTER SCHEMA insurance OWNER TO postgres;

--
-- TOC entry 12 (class 2615 OID 24588)
-- Name: inventory; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA inventory;


ALTER SCHEMA inventory OWNER TO postgres;

--
-- TOC entry 13 (class 2615 OID 24586)
-- Name: master; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA master;


ALTER SCHEMA master OWNER TO postgres;

--
-- TOC entry 14 (class 2615 OID 25500)
-- Name: oem; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA oem;


ALTER SCHEMA oem OWNER TO postgres;

--
-- TOC entry 15 (class 2615 OID 25455)
-- Name: procurement; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA procurement;


ALTER SCHEMA procurement OWNER TO postgres;

--
-- TOC entry 19 (class 2615 OID 27877)
-- Name: reports; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA reports;


ALTER SCHEMA reports OWNER TO postgres;

--
-- TOC entry 16 (class 2615 OID 24589)
-- Name: sales; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA sales;


ALTER SCHEMA sales OWNER TO postgres;

--
-- TOC entry 17 (class 2615 OID 24590)
-- Name: service; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA service;


ALTER SCHEMA service OWNER TO postgres;

--
-- TOC entry 18 (class 2615 OID 24591)
-- Name: warranty; Type: SCHEMA; Schema: -; Owner: postgres
--

CREATE SCHEMA warranty;


ALTER SCHEMA warranty OWNER TO postgres;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- TOC entry 398 (class 1259 OID 28051)
-- Name: logs; Type: TABLE; Schema: audit; Owner: postgres
--

CREATE TABLE audit.logs (
    id bigint NOT NULL,
    user_id bigint,
    action character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    resource_id character varying(50),
    details jsonb,
    ip_address inet,
    user_agent text,
    "timestamp" timestamp without time zone DEFAULT now()
);


ALTER TABLE audit.logs OWNER TO postgres;

--
-- TOC entry 397 (class 1259 OID 28050)
-- Name: logs_id_seq; Type: SEQUENCE; Schema: audit; Owner: postgres
--

CREATE SEQUENCE audit.logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE audit.logs_id_seq OWNER TO postgres;

--
-- TOC entry 6592 (class 0 OID 0)
-- Dependencies: 397
-- Name: logs_id_seq; Type: SEQUENCE OWNED BY; Schema: audit; Owner: postgres
--

ALTER SEQUENCE audit.logs_id_seq OWNED BY audit.logs.id;


--
-- TOC entry 396 (class 1259 OID 28035)
-- Name: token_blacklist; Type: TABLE; Schema: auth; Owner: postgres
--

CREATE TABLE auth.token_blacklist (
    jti character varying(36) NOT NULL,
    token_type character varying(10) NOT NULL,
    user_id integer NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone DEFAULT now()
);


ALTER TABLE auth.token_blacklist OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 25389)
-- Name: insurance_estimate; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.insurance_estimate (
    estimate_id bigint NOT NULL,
    job_card_id bigint NOT NULL,
    estimate_amount numeric(14,2) NOT NULL,
    approval_status character varying(30) NOT NULL,
    approved_amount numeric(14,2),
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT insurance_estimate_approval_status_check CHECK (((approval_status)::text = ANY ((ARRAY['PENDING'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE billing.insurance_estimate OWNER TO postgres;

--
-- TOC entry 286 (class 1259 OID 25388)
-- Name: insurance_estimate_estimate_id_seq; Type: SEQUENCE; Schema: billing; Owner: postgres
--

CREATE SEQUENCE billing.insurance_estimate_estimate_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE billing.insurance_estimate_estimate_id_seq OWNER TO postgres;

--
-- TOC entry 6594 (class 0 OID 0)
-- Dependencies: 286
-- Name: insurance_estimate_estimate_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.insurance_estimate_estimate_id_seq OWNED BY billing.insurance_estimate.estimate_id;


--
-- TOC entry 283 (class 1259 OID 25331)
-- Name: invoice; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.invoice (
    invoice_id bigint NOT NULL,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    invoice_type character varying(30) NOT NULL,
    invoice_status character varying(30) DEFAULT 'DRAFT'::character varying NOT NULL,
    customer_id bigint NOT NULL,
    job_card_id bigint,
    total_amount numeric(14,2) NOT NULL,
    finalized_at timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_locked boolean DEFAULT false NOT NULL,
    CONSTRAINT chk_invoice_total CHECK ((total_amount >= (0)::numeric)),
    CONSTRAINT invoice_invoice_status_check CHECK (((invoice_status)::text = ANY ((ARRAY['DRAFT'::character varying, 'FINALIZED'::character varying, 'CANCELLED'::character varying])::text[]))),
    CONSTRAINT invoice_invoice_type_check CHECK (((invoice_type)::text = ANY ((ARRAY['SERVICE'::character varying, 'SPARE'::character varying, 'INSURANCE'::character varying])::text[])))
);


ALTER TABLE billing.invoice OWNER TO postgres;

--
-- TOC entry 282 (class 1259 OID 25330)
-- Name: invoice_invoice_id_seq; Type: SEQUENCE; Schema: billing; Owner: postgres
--

CREATE SEQUENCE billing.invoice_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE billing.invoice_invoice_id_seq OWNER TO postgres;

--
-- TOC entry 6596 (class 0 OID 0)
-- Dependencies: 282
-- Name: invoice_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.invoice_invoice_id_seq OWNED BY billing.invoice.invoice_id;


--
-- TOC entry 285 (class 1259 OID 25364)
-- Name: invoice_line; Type: TABLE; Schema: billing; Owner: postgres
--

CREATE TABLE billing.invoice_line (
    invoice_line_id bigint NOT NULL,
    invoice_id bigint NOT NULL,
    line_type character varying(20) NOT NULL,
    description text NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    rate numeric(12,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT invoice_line_line_type_check CHECK (((line_type)::text = ANY ((ARRAY['LABOUR'::character varying, 'SPARE'::character varying])::text[])))
);


ALTER TABLE billing.invoice_line OWNER TO postgres;

--
-- TOC entry 284 (class 1259 OID 25363)
-- Name: invoice_line_invoice_line_id_seq; Type: SEQUENCE; Schema: billing; Owner: postgres
--

CREATE SEQUENCE billing.invoice_line_invoice_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE billing.invoice_line_invoice_line_id_seq OWNER TO postgres;

--
-- TOC entry 6598 (class 0 OID 0)
-- Dependencies: 284
-- Name: invoice_line_invoice_line_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.invoice_line_invoice_line_id_seq OWNED BY billing.invoice_line.invoice_line_id;


--
-- TOC entry 237 (class 1259 OID 24697)
-- Name: message_log; Type: TABLE; Schema: communication; Owner: postgres
--

CREATE TABLE communication.message_log (
);


ALTER TABLE communication.message_log OWNER TO postgres;

--
-- TOC entry 236 (class 1259 OID 24694)
-- Name: reminder; Type: TABLE; Schema: communication; Owner: postgres
--

CREATE TABLE communication.reminder (
);


ALTER TABLE communication.reminder OWNER TO postgres;

--
-- TOC entry 342 (class 1259 OID 26369)
-- Name: enquiry; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.enquiry (
    enquiry_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    enquiry_source character varying(50) NOT NULL,
    owner_staff_id bigint NOT NULL,
    last_followup_date date,
    last_message_date timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    enquiry_status_id integer NOT NULL,
    deleted_at timestamp without time zone,
    created_by_staff_id bigint NOT NULL
);


ALTER TABLE crm.enquiry OWNER TO postgres;

--
-- TOC entry 341 (class 1259 OID 26368)
-- Name: enquiry_enquiry_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.enquiry_enquiry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.enquiry_enquiry_id_seq OWNER TO postgres;

--
-- TOC entry 6600 (class 0 OID 0)
-- Dependencies: 341
-- Name: enquiry_enquiry_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.enquiry_enquiry_id_seq OWNED BY crm.enquiry.enquiry_id;


--
-- TOC entry 348 (class 1259 OID 26427)
-- Name: enquiry_status_master; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.enquiry_status_master (
    status_id integer NOT NULL,
    status_name character varying(50) NOT NULL,
    display_order integer DEFAULT 0
);


ALTER TABLE crm.enquiry_status_master OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 26426)
-- Name: enquiry_status_master_status_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.enquiry_status_master_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.enquiry_status_master_status_id_seq OWNER TO postgres;

--
-- TOC entry 6602 (class 0 OID 0)
-- Dependencies: 347
-- Name: enquiry_status_master_status_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.enquiry_status_master_status_id_seq OWNED BY crm.enquiry_status_master.status_id;


--
-- TOC entry 315 (class 1259 OID 25832)
-- Name: followup_schedule; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.followup_schedule (
    followup_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    scheduled_date date NOT NULL,
    assigned_staff_id bigint NOT NULL,
    followup_status character varying(30) NOT NULL,
    completed_at timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    CONSTRAINT followup_schedule_followup_status_check CHECK (((followup_status)::text = ANY ((ARRAY['PENDING'::character varying, 'COMPLETED'::character varying, 'MISSED'::character varying])::text[])))
);


ALTER TABLE crm.followup_schedule OWNER TO postgres;

--
-- TOC entry 314 (class 1259 OID 25831)
-- Name: followup_schedule_followup_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.followup_schedule_followup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.followup_schedule_followup_id_seq OWNER TO postgres;

--
-- TOC entry 6604 (class 0 OID 0)
-- Dependencies: 314
-- Name: followup_schedule_followup_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.followup_schedule_followup_id_seq OWNED BY crm.followup_schedule.followup_id;


--
-- TOC entry 309 (class 1259 OID 25746)
-- Name: lead; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead (
    lead_id bigint NOT NULL,
    customer_id bigint,
    vehicle_model_id bigint NOT NULL,
    lead_source character varying(50) NOT NULL,
    owner_staff_id bigint NOT NULL,
    expected_purchase_date date,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    name character varying(150) DEFAULT 'Pending'::character varying NOT NULL,
    phone character varying(15) DEFAULT '0000000000'::character varying NOT NULL,
    email character varying(150),
    lead_status_id integer NOT NULL,
    deleted_at timestamp without time zone,
    created_by_staff_id bigint NOT NULL,
    expected_purchase_days integer,
    next_followup_date date,
    lead_status character varying(20) DEFAULT 'WARM'::character varying,
    visit_date timestamp without time zone DEFAULT now(),
    is_converted boolean DEFAULT false,
    converted_sale_id bigint
);


ALTER TABLE crm.lead OWNER TO postgres;

--
-- TOC entry 313 (class 1259 OID 25804)
-- Name: lead_activity; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_activity (
    activity_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    activity_type character varying(30) NOT NULL,
    activity_time timestamp without time zone NOT NULL,
    performed_by_staff_id bigint NOT NULL,
    outcome text,
    next_action_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT lead_activity_activity_type_check CHECK (((activity_type)::text = ANY ((ARRAY['CALL'::character varying, 'WHATSAPP'::character varying, 'VISIT'::character varying, 'TEST_RIDE'::character varying, 'NEGOTIATION'::character varying, 'FOLLOWUP_ATTEMPT'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE crm.lead_activity OWNER TO postgres;

--
-- TOC entry 312 (class 1259 OID 25803)
-- Name: lead_activity_activity_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_activity_activity_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_activity_activity_id_seq OWNER TO postgres;

--
-- TOC entry 6607 (class 0 OID 0)
-- Dependencies: 312
-- Name: lead_activity_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_activity_activity_id_seq OWNED BY crm.lead_activity.activity_id;


--
-- TOC entry 319 (class 1259 OID 25911)
-- Name: lead_assignment_history; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_assignment_history (
    assignment_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    old_staff_id bigint,
    new_staff_id bigint NOT NULL,
    changed_by_staff_id bigint NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text
);


ALTER TABLE crm.lead_assignment_history OWNER TO postgres;

--
-- TOC entry 318 (class 1259 OID 25910)
-- Name: lead_assignment_history_assignment_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_assignment_history_assignment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_assignment_history_assignment_id_seq OWNER TO postgres;

--
-- TOC entry 6609 (class 0 OID 0)
-- Dependencies: 318
-- Name: lead_assignment_history_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_assignment_history_assignment_id_seq OWNED BY crm.lead_assignment_history.assignment_id;


--
-- TOC entry 367 (class 1259 OID 26774)
-- Name: lead_followup; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_followup (
    lead_followup_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    followup_date timestamp without time zone DEFAULT now() NOT NULL,
    remarks text NOT NULL,
    outcome_status character varying(20) NOT NULL,
    next_followup_date date,
    staff_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE crm.lead_followup OWNER TO postgres;

--
-- TOC entry 366 (class 1259 OID 26773)
-- Name: lead_followup_lead_followup_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_followup_lead_followup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_followup_lead_followup_id_seq OWNER TO postgres;

--
-- TOC entry 6611 (class 0 OID 0)
-- Dependencies: 366
-- Name: lead_followup_lead_followup_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_followup_lead_followup_id_seq OWNED BY crm.lead_followup.lead_followup_id;


--
-- TOC entry 308 (class 1259 OID 25745)
-- Name: lead_lead_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_lead_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_lead_id_seq OWNER TO postgres;

--
-- TOC entry 6612 (class 0 OID 0)
-- Dependencies: 308
-- Name: lead_lead_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_lead_id_seq OWNED BY crm.lead.lead_id;


--
-- TOC entry 311 (class 1259 OID 25779)
-- Name: lead_status_history; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_status_history (
    status_history_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    old_status character varying(30),
    new_status character varying(30) NOT NULL,
    changed_by_staff_id bigint NOT NULL,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text
);


ALTER TABLE crm.lead_status_history OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 25778)
-- Name: lead_status_history_status_history_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_status_history_status_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_status_history_status_history_id_seq OWNER TO postgres;

--
-- TOC entry 6614 (class 0 OID 0)
-- Dependencies: 310
-- Name: lead_status_history_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_status_history_status_history_id_seq OWNED BY crm.lead_status_history.status_history_id;


--
-- TOC entry 346 (class 1259 OID 26415)
-- Name: lead_status_master; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_status_master (
    status_id integer NOT NULL,
    status_name character varying(50) NOT NULL,
    display_order integer DEFAULT 0
);


ALTER TABLE crm.lead_status_master OWNER TO postgres;

--
-- TOC entry 345 (class 1259 OID 26414)
-- Name: lead_status_master_status_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.lead_status_master_status_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.lead_status_master_status_id_seq OWNER TO postgres;

--
-- TOC entry 6616 (class 0 OID 0)
-- Dependencies: 345
-- Name: lead_status_master_status_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_status_master_status_id_seq OWNED BY crm.lead_status_master.status_id;


--
-- TOC entry 317 (class 1259 OID 25880)
-- Name: test_ride; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.test_ride (
    test_ride_id bigint NOT NULL,
    lead_id bigint NOT NULL,
    vehicle_model_id bigint NOT NULL,
    test_ride_date date NOT NULL,
    staff_id bigint NOT NULL,
    customer_feedback text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE crm.test_ride OWNER TO postgres;

--
-- TOC entry 316 (class 1259 OID 25879)
-- Name: test_ride_test_ride_id_seq; Type: SEQUENCE; Schema: crm; Owner: postgres
--

CREATE SEQUENCE crm.test_ride_test_ride_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE crm.test_ride_test_ride_id_seq OWNER TO postgres;

--
-- TOC entry 6618 (class 0 OID 0)
-- Dependencies: 316
-- Name: test_ride_test_ride_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.test_ride_test_ride_id_seq OWNED BY crm.test_ride.test_ride_id;


--
-- TOC entry 400 (class 1259 OID 28069)
-- Name: gl_account; Type: TABLE; Schema: finance; Owner: postgres
--

CREATE TABLE finance.gl_account (
    account_id bigint NOT NULL,
    account_code character varying(20) NOT NULL,
    account_name character varying(100) NOT NULL,
    account_type character varying(20) NOT NULL,
    parent_account_id bigint,
    is_system_account boolean NOT NULL,
    description character varying,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    restored_at timestamp without time zone,
    restored_by bigint,
    deleted_by bigint
);


ALTER TABLE finance.gl_account OWNER TO postgres;

--
-- TOC entry 399 (class 1259 OID 28068)
-- Name: gl_account_account_id_seq; Type: SEQUENCE; Schema: finance; Owner: postgres
--

CREATE SEQUENCE finance.gl_account_account_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE finance.gl_account_account_id_seq OWNER TO postgres;

--
-- TOC entry 6620 (class 0 OID 0)
-- Dependencies: 399
-- Name: gl_account_account_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.gl_account_account_id_seq OWNED BY finance.gl_account.account_id;


--
-- TOC entry 402 (class 1259 OID 28113)
-- Name: gl_journal; Type: TABLE; Schema: finance; Owner: postgres
--

CREATE TABLE finance.gl_journal (
    journal_id bigint NOT NULL,
    journal_date date NOT NULL,
    description character varying NOT NULL,
    reference_type character varying(50),
    reference_id character varying(100),
    is_posted boolean NOT NULL,
    posted_at timestamp without time zone NOT NULL,
    posted_by bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    restored_at timestamp without time zone,
    restored_by bigint,
    deleted_by bigint
);


ALTER TABLE finance.gl_journal OWNER TO postgres;

--
-- TOC entry 404 (class 1259 OID 28156)
-- Name: gl_journal_entry; Type: TABLE; Schema: finance; Owner: postgres
--

CREATE TABLE finance.gl_journal_entry (
    entry_id bigint NOT NULL,
    journal_id bigint NOT NULL,
    account_id bigint NOT NULL,
    debit_amount numeric(14,2) NOT NULL,
    credit_amount numeric(14,2) NOT NULL,
    description character varying
);


ALTER TABLE finance.gl_journal_entry OWNER TO postgres;

--
-- TOC entry 403 (class 1259 OID 28155)
-- Name: gl_journal_entry_entry_id_seq; Type: SEQUENCE; Schema: finance; Owner: postgres
--

CREATE SEQUENCE finance.gl_journal_entry_entry_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE finance.gl_journal_entry_entry_id_seq OWNER TO postgres;

--
-- TOC entry 6623 (class 0 OID 0)
-- Dependencies: 403
-- Name: gl_journal_entry_entry_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.gl_journal_entry_entry_id_seq OWNED BY finance.gl_journal_entry.entry_id;


--
-- TOC entry 401 (class 1259 OID 28112)
-- Name: gl_journal_journal_id_seq; Type: SEQUENCE; Schema: finance; Owner: postgres
--

CREATE SEQUENCE finance.gl_journal_journal_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE finance.gl_journal_journal_id_seq OWNER TO postgres;

--
-- TOC entry 6624 (class 0 OID 0)
-- Dependencies: 401
-- Name: gl_journal_journal_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.gl_journal_journal_id_seq OWNED BY finance.gl_journal.journal_id;


--
-- TOC entry 334 (class 1259 OID 26217)
-- Name: sales_summary_view; Type: VIEW; Schema: finance; Owner: postgres
--

CREATE VIEW finance.sales_summary_view AS
 SELECT invoice_date,
    date_trunc('month'::text, (invoice_date)::timestamp with time zone) AS invoice_month,
    invoice_type,
    count(DISTINCT invoice_id) AS invoice_count,
    sum(total_amount) AS gross_amount,
    sum(
        CASE
            WHEN ((invoice_status)::text = 'FINALIZED'::text) THEN total_amount
            ELSE (0)::numeric
        END) AS finalized_amount,
    sum(
        CASE
            WHEN ((invoice_status)::text = 'CANCELLED'::text) THEN total_amount
            ELSE (0)::numeric
        END) AS cancelled_amount
   FROM billing.invoice i
  GROUP BY invoice_date, (date_trunc('month'::text, (invoice_date)::timestamp with time zone)), invoice_type;


ALTER VIEW finance.sales_summary_view OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 26304)
-- Name: vehicle_loan; Type: TABLE; Schema: finance; Owner: postgres
--

CREATE TABLE finance.vehicle_loan (
    loan_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    financer_name character varying(100) NOT NULL,
    financer_type character varying(20) NOT NULL,
    loan_amount numeric(12,2) NOT NULL,
    down_payment numeric(12,2) DEFAULT 0 NOT NULL,
    approval_status character varying(20) NOT NULL,
    financer_ref_no character varying(100),
    approval_date date,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_loan_status CHECK (((approval_status)::text = ANY ((ARRAY['APPLIED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE finance.vehicle_loan OWNER TO postgres;

--
-- TOC entry 337 (class 1259 OID 26303)
-- Name: vehicle_loan_loan_id_seq; Type: SEQUENCE; Schema: finance; Owner: postgres
--

CREATE SEQUENCE finance.vehicle_loan_loan_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE finance.vehicle_loan_loan_id_seq OWNER TO postgres;

--
-- TOC entry 6627 (class 0 OID 0)
-- Dependencies: 337
-- Name: vehicle_loan_loan_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.vehicle_loan_loan_id_seq OWNED BY finance.vehicle_loan.loan_id;


--
-- TOC entry 340 (class 1259 OID 26328)
-- Name: vehicle_subsidy; Type: TABLE; Schema: finance; Owner: postgres
--

CREATE TABLE finance.vehicle_subsidy (
    subsidy_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    subsidy_customer_id character varying(100),
    portal_name character varying(100),
    application_status character varying(30) NOT NULL,
    docs_uploaded boolean DEFAULT false NOT NULL,
    approval_date date,
    remarks text,
    CONSTRAINT chk_subsidy_status CHECK (((application_status)::text = ANY ((ARRAY['NOT_APPLIED'::character varying, 'APPLIED'::character varying, 'DOCS_UPLOADED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE finance.vehicle_subsidy OWNER TO postgres;

--
-- TOC entry 339 (class 1259 OID 26327)
-- Name: vehicle_subsidy_subsidy_id_seq; Type: SEQUENCE; Schema: finance; Owner: postgres
--

CREATE SEQUENCE finance.vehicle_subsidy_subsidy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE finance.vehicle_subsidy_subsidy_id_seq OWNER TO postgres;

--
-- TOC entry 6629 (class 0 OID 0)
-- Dependencies: 339
-- Name: vehicle_subsidy_subsidy_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.vehicle_subsidy_subsidy_id_seq OWNED BY finance.vehicle_subsidy.subsidy_id;


--
-- TOC entry 331 (class 1259 OID 26168)
-- Name: attendance; Type: TABLE; Schema: hr; Owner: postgres
--

CREATE TABLE hr.attendance (
    attendance_id bigint NOT NULL,
    staff_id bigint NOT NULL,
    attendance_date date NOT NULL,
    attendance_status character varying(20) NOT NULL,
    in_time time without time zone,
    out_time time without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_attendance_status CHECK (((attendance_status)::text = ANY ((ARRAY['PRESENT'::character varying, 'ABSENT'::character varying, 'HALF_DAY'::character varying])::text[]))),
    CONSTRAINT chk_attendance_time CHECK (((in_time IS NULL) OR (out_time IS NULL) OR (out_time >= in_time)))
);


ALTER TABLE hr.attendance OWNER TO postgres;

--
-- TOC entry 330 (class 1259 OID 26167)
-- Name: attendance_attendance_id_seq; Type: SEQUENCE; Schema: hr; Owner: postgres
--

CREATE SEQUENCE hr.attendance_attendance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE hr.attendance_attendance_id_seq OWNER TO postgres;

--
-- TOC entry 6631 (class 0 OID 0)
-- Dependencies: 330
-- Name: attendance_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: hr; Owner: postgres
--

ALTER SEQUENCE hr.attendance_attendance_id_seq OWNED BY hr.attendance.attendance_id;


--
-- TOC entry 333 (class 1259 OID 26194)
-- Name: salary; Type: TABLE; Schema: hr; Owner: postgres
--

CREATE TABLE hr.salary (
    salary_id bigint NOT NULL,
    staff_id bigint NOT NULL,
    salary_month date NOT NULL,
    gross_amount numeric(14,2) NOT NULL,
    payment_date date,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_salary_amount CHECK ((gross_amount > (0)::numeric))
);


ALTER TABLE hr.salary OWNER TO postgres;

--
-- TOC entry 332 (class 1259 OID 26193)
-- Name: salary_salary_id_seq; Type: SEQUENCE; Schema: hr; Owner: postgres
--

CREATE SEQUENCE hr.salary_salary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE hr.salary_salary_id_seq OWNER TO postgres;

--
-- TOC entry 6633 (class 0 OID 0)
-- Dependencies: 332
-- Name: salary_salary_id_seq; Type: SEQUENCE OWNED BY; Schema: hr; Owner: postgres
--

ALTER SEQUENCE hr.salary_salary_id_seq OWNED BY hr.salary.salary_id;


--
-- TOC entry 263 (class 1259 OID 25079)
-- Name: insurance_company; Type: TABLE; Schema: insurance; Owner: postgres
--

CREATE TABLE insurance.insurance_company (
    insurance_company_id bigint NOT NULL,
    company_name character varying(150) NOT NULL,
    contact_phone character varying(15),
    contact_email character varying(150),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE insurance.insurance_company OWNER TO postgres;

--
-- TOC entry 262 (class 1259 OID 25078)
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE; Schema: insurance; Owner: postgres
--

CREATE SEQUENCE insurance.insurance_company_insurance_company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE insurance.insurance_company_insurance_company_id_seq OWNER TO postgres;

--
-- TOC entry 6635 (class 0 OID 0)
-- Dependencies: 262
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE OWNED BY; Schema: insurance; Owner: postgres
--

ALTER SEQUENCE insurance.insurance_company_insurance_company_id_seq OWNED BY insurance.insurance_company.insurance_company_id;


--
-- TOC entry 379 (class 1259 OID 26931)
-- Name: insurance_followup; Type: TABLE; Schema: insurance; Owner: postgres
--

CREATE TABLE insurance.insurance_followup (
    insurance_followup_id bigint NOT NULL,
    policy_id bigint NOT NULL,
    renewal_date date NOT NULL,
    reminder_days_before integer DEFAULT 30,
    is_renewed boolean DEFAULT false,
    renewed_date timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE insurance.insurance_followup OWNER TO postgres;

--
-- TOC entry 378 (class 1259 OID 26930)
-- Name: insurance_followup_insurance_followup_id_seq; Type: SEQUENCE; Schema: insurance; Owner: postgres
--

CREATE SEQUENCE insurance.insurance_followup_insurance_followup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE insurance.insurance_followup_insurance_followup_id_seq OWNER TO postgres;

--
-- TOC entry 6637 (class 0 OID 0)
-- Dependencies: 378
-- Name: insurance_followup_insurance_followup_id_seq; Type: SEQUENCE OWNED BY; Schema: insurance; Owner: postgres
--

ALTER SEQUENCE insurance.insurance_followup_insurance_followup_id_seq OWNED BY insurance.insurance_followup.insurance_followup_id;


--
-- TOC entry 265 (class 1259 OID 25094)
-- Name: policy; Type: TABLE; Schema: insurance; Owner: postgres
--

CREATE TABLE insurance.policy (
    policy_id bigint NOT NULL,
    vehicle_sale_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    insurance_company_id bigint NOT NULL,
    policy_number character varying(100) NOT NULL,
    policy_start_date date NOT NULL,
    policy_end_date date NOT NULL,
    premium_amount numeric(12,2),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_policy_date_valid CHECK ((policy_end_date > policy_start_date))
);


ALTER TABLE insurance.policy OWNER TO postgres;

--
-- TOC entry 264 (class 1259 OID 25093)
-- Name: policy_policy_id_seq; Type: SEQUENCE; Schema: insurance; Owner: postgres
--

CREATE SEQUENCE insurance.policy_policy_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE insurance.policy_policy_id_seq OWNER TO postgres;

--
-- TOC entry 6639 (class 0 OID 0)
-- Dependencies: 264
-- Name: policy_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: insurance; Owner: postgres
--

ALTER SEQUENCE insurance.policy_policy_id_seq OWNED BY insurance.policy.policy_id;


--
-- TOC entry 291 (class 1259 OID 25434)
-- Name: spare_master; Type: TABLE; Schema: inventory; Owner: postgres
--

CREATE TABLE inventory.spare_master (
    spare_id bigint NOT NULL,
    part_code character varying(100) NOT NULL,
    description text NOT NULL,
    dealer_landing_price numeric(12,2) NOT NULL,
    dealer_margin_percent numeric(5,2) NOT NULL,
    gst_percentage numeric(5,2) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    is_temporary boolean DEFAULT false NOT NULL,
    is_verified boolean DEFAULT true NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    restored_at timestamp without time zone,
    restored_by bigint,
    CONSTRAINT spare_master_dealer_margin_percent_check CHECK ((dealer_margin_percent >= (0)::numeric))
);


ALTER TABLE inventory.spare_master OWNER TO postgres;

--
-- TOC entry 290 (class 1259 OID 25433)
-- Name: spare_master_spare_id_seq; Type: SEQUENCE; Schema: inventory; Owner: postgres
--

CREATE SEQUENCE inventory.spare_master_spare_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE inventory.spare_master_spare_id_seq OWNER TO postgres;

--
-- TOC entry 6641 (class 0 OID 0)
-- Dependencies: 290
-- Name: spare_master_spare_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_master_spare_id_seq OWNED BY inventory.spare_master.spare_id;


--
-- TOC entry 305 (class 1259 OID 25597)
-- Name: spare_serial; Type: TABLE; Schema: inventory; Owner: postgres
--

CREATE TABLE inventory.spare_serial (
    spare_serial_id bigint NOT NULL,
    spare_id bigint NOT NULL,
    serial_no character varying(100) NOT NULL,
    status character varying(30) NOT NULL,
    source_type character varying(30) NOT NULL,
    source_item_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    restored_at timestamp without time zone,
    restored_by bigint,
    CONSTRAINT spare_serial_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'WARRANTY_INWARD'::character varying])::text[]))),
    CONSTRAINT spare_serial_status_check CHECK (((status)::text = ANY ((ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'USED_IN_SERVICE'::character varying])::text[])))
);


ALTER TABLE inventory.spare_serial OWNER TO postgres;

--
-- TOC entry 304 (class 1259 OID 25596)
-- Name: spare_serial_spare_serial_id_seq; Type: SEQUENCE; Schema: inventory; Owner: postgres
--

CREATE SEQUENCE inventory.spare_serial_spare_serial_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE inventory.spare_serial_spare_serial_id_seq OWNER TO postgres;

--
-- TOC entry 6643 (class 0 OID 0)
-- Dependencies: 304
-- Name: spare_serial_spare_serial_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_serial_spare_serial_id_seq OWNED BY inventory.spare_serial.spare_serial_id;


--
-- TOC entry 289 (class 1259 OID 25411)
-- Name: spare_stock_movement; Type: TABLE; Schema: inventory; Owner: postgres
--

CREATE TABLE inventory.spare_stock_movement (
    movement_id bigint NOT NULL,
    movement_type character varying(30) NOT NULL,
    quantity integer NOT NULL,
    rate numeric(12,2),
    reference_table character varying(50),
    reference_id bigint,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    spare_id bigint NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT chk_spare_stock_movement_type CHECK (((movement_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'SALE'::character varying, 'SERVICE_PAID'::character varying, 'SERVICE_INSURANCE'::character varying, 'ADJUSTMENT'::character varying])::text[])))
);


ALTER TABLE inventory.spare_stock_movement OWNER TO postgres;

--
-- TOC entry 288 (class 1259 OID 25410)
-- Name: spare_stock_movement_movement_id_seq; Type: SEQUENCE; Schema: inventory; Owner: postgres
--

CREATE SEQUENCE inventory.spare_stock_movement_movement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE inventory.spare_stock_movement_movement_id_seq OWNER TO postgres;

--
-- TOC entry 6645 (class 0 OID 0)
-- Dependencies: 288
-- Name: spare_stock_movement_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_stock_movement_movement_id_seq OWNED BY inventory.spare_stock_movement.movement_id;


--
-- TOC entry 336 (class 1259 OID 26263)
-- Name: vehicle_stock_movement; Type: TABLE; Schema: inventory; Owner: postgres
--

CREATE TABLE inventory.vehicle_stock_movement (
    movement_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    movement_type character varying(30) NOT NULL,
    from_location character varying(100),
    to_location character varying(100),
    reference_type character varying(30),
    reference_id bigint,
    movement_datetime timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now() NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    CONSTRAINT chk_vehicle_movement_type CHECK (((movement_type)::text = ANY ((ARRAY['INWARD'::character varying, 'AVAILABLE'::character varying, 'ALLOCATED'::character varying, 'DELIVERED'::character varying, 'SERVICE_OUT'::character varying, 'SERVICE_IN'::character varying, 'DEMO'::character varying, 'TRANSFER'::character varying, 'SCRAPPED'::character varying])::text[]))),
    CONSTRAINT chk_vehicle_reference_type CHECK (((reference_type)::text = ANY ((ARRAY['PROCUREMENT'::character varying, 'SALE'::character varying, 'SERVICE'::character varying, 'WARRANTY'::character varying, 'INSURANCE'::character varying, 'MANUAL'::character varying])::text[])))
);


ALTER TABLE inventory.vehicle_stock_movement OWNER TO postgres;

--
-- TOC entry 335 (class 1259 OID 26262)
-- Name: vehicle_stock_movement_movement_id_seq; Type: SEQUENCE; Schema: inventory; Owner: postgres
--

CREATE SEQUENCE inventory.vehicle_stock_movement_movement_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE inventory.vehicle_stock_movement_movement_id_seq OWNER TO postgres;

--
-- TOC entry 6647 (class 0 OID 0)
-- Dependencies: 335
-- Name: vehicle_stock_movement_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.vehicle_stock_movement_movement_id_seq OWNED BY inventory.vehicle_stock_movement.movement_id;


--
-- TOC entry 389 (class 1259 OID 27534)
-- Name: bank; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.bank (
    bank_id bigint NOT NULL,
    bank_name character varying(255) NOT NULL,
    branch character varying(255),
    ifsc_code character varying(11) NOT NULL,
    address text,
    contact_number character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.bank OWNER TO postgres;

--
-- TOC entry 388 (class 1259 OID 27533)
-- Name: bank_bank_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.bank_bank_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.bank_bank_id_seq OWNER TO postgres;

--
-- TOC entry 6649 (class 0 OID 0)
-- Dependencies: 388
-- Name: bank_bank_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.bank_bank_id_seq OWNED BY master.bank.bank_id;


--
-- TOC entry 350 (class 1259 OID 26439)
-- Name: brand; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.brand (
    brand_id integer NOT NULL,
    brand_name character varying(100) NOT NULL,
    deleted_at timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.brand OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 26438)
-- Name: brand_brand_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.brand_brand_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.brand_brand_id_seq OWNER TO postgres;

--
-- TOC entry 6651 (class 0 OID 0)
-- Dependencies: 349
-- Name: brand_brand_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.brand_brand_id_seq OWNED BY master.brand.brand_id;


--
-- TOC entry 406 (class 1259 OID 28180)
-- Name: color; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.color (
    color_id bigint NOT NULL,
    color_name character varying(50) NOT NULL,
    color_code character varying(20),
    is_active boolean NOT NULL,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    restored_at timestamp without time zone,
    restored_by bigint,
    deleted_by bigint,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint
);


ALTER TABLE master.color OWNER TO postgres;

--
-- TOC entry 405 (class 1259 OID 28179)
-- Name: color_color_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.color_color_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.color_color_id_seq OWNER TO postgres;

--
-- TOC entry 6653 (class 0 OID 0)
-- Dependencies: 405
-- Name: color_color_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.color_color_id_seq OWNED BY master.color.color_id;


--
-- TOC entry 235 (class 1259 OID 24595)
-- Name: customer; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.customer (
    customer_type character varying(20),
    name character varying(150),
    guardian_name character varying(150),
    primary_phone_backup character varying(15),
    email_backup character varying(150),
    address_line1 text,
    address_line2 text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    aadhaar_no character(12),
    pan_no character(10),
    gstin character(15),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    is_active boolean DEFAULT true,
    customer_id bigint NOT NULL,
    lead_reference_id bigint,
    deleted_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint,
    primary_phone_enc text,
    primary_phone_hash character varying(255),
    email_enc text,
    email_hash character varying(255),
    CONSTRAINT chk_customer_type CHECK (((customer_type)::text = ANY ((ARRAY['INDIVIDUAL'::character varying, 'BUSINESS'::character varying])::text[])))
);


ALTER TABLE master.customer OWNER TO postgres;

--
-- TOC entry 238 (class 1259 OID 24713)
-- Name: customer_customer_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.customer_customer_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.customer_customer_id_seq OWNER TO postgres;

--
-- TOC entry 6655 (class 0 OID 0)
-- Dependencies: 238
-- Name: customer_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_customer_id_seq OWNED BY master.customer.customer_id;


--
-- TOC entry 242 (class 1259 OID 24752)
-- Name: customer_document; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.customer_document (
    customer_document_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(50),
    file_path text NOT NULL,
    file_name character varying(255),
    mime_type character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.customer_document OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 24751)
-- Name: customer_document_customer_document_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.customer_document_customer_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.customer_document_customer_document_id_seq OWNER TO postgres;

--
-- TOC entry 6657 (class 0 OID 0)
-- Dependencies: 241
-- Name: customer_document_customer_document_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_document_customer_document_id_seq OWNED BY master.customer_document.customer_document_id;


--
-- TOC entry 240 (class 1259 OID 24729)
-- Name: customer_phone; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.customer_phone (
    customer_phone_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    phone_number character varying(15) NOT NULL,
    phone_type character varying(20) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    contact_name character varying(100),
    contact_relation character varying(100),
    CONSTRAINT customer_phone_phone_type_check CHECK (((phone_type)::text = ANY ((ARRAY['PRIMARY'::character varying, 'ALTERNATE'::character varying, 'OTHER'::character varying])::text[])))
);


ALTER TABLE master.customer_phone OWNER TO postgres;

--
-- TOC entry 239 (class 1259 OID 24728)
-- Name: customer_phone_customer_phone_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.customer_phone_customer_phone_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.customer_phone_customer_phone_id_seq OWNER TO postgres;

--
-- TOC entry 6659 (class 0 OID 0)
-- Dependencies: 239
-- Name: customer_phone_customer_phone_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_phone_customer_phone_id_seq OWNED BY master.customer_phone.customer_phone_id;


--
-- TOC entry 391 (class 1259 OID 27559)
-- Name: document_type; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.document_type (
    document_type_id integer NOT NULL,
    type_name character varying(100) NOT NULL,
    description text,
    applicable_to character varying(20),
    is_mandatory boolean DEFAULT false NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.document_type OWNER TO postgres;

--
-- TOC entry 390 (class 1259 OID 27558)
-- Name: document_type_document_type_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.document_type_document_type_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.document_type_document_type_id_seq OWNER TO postgres;

--
-- TOC entry 6661 (class 0 OID 0)
-- Dependencies: 390
-- Name: document_type_document_type_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.document_type_document_type_id_seq OWNED BY master.document_type.document_type_id;


--
-- TOC entry 383 (class 1259 OID 27456)
-- Name: expense_category; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.expense_category (
    expense_category_id bigint NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.expense_category OWNER TO postgres;

--
-- TOC entry 382 (class 1259 OID 27455)
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.expense_category_expense_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.expense_category_expense_category_id_seq OWNER TO postgres;

--
-- TOC entry 6663 (class 0 OID 0)
-- Dependencies: 382
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.expense_category_expense_category_id_seq OWNED BY master.expense_category.expense_category_id;


--
-- TOC entry 387 (class 1259 OID 27508)
-- Name: insurance_company; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.insurance_company (
    insurance_company_id bigint NOT NULL,
    company_name character varying(255) NOT NULL,
    contact_person character varying(255),
    contact_number character varying(20),
    email character varying(255),
    address text,
    gstin character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.insurance_company OWNER TO postgres;

--
-- TOC entry 386 (class 1259 OID 27507)
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.insurance_company_insurance_company_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.insurance_company_insurance_company_id_seq OWNER TO postgres;

--
-- TOC entry 6665 (class 0 OID 0)
-- Dependencies: 386
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.insurance_company_insurance_company_id_seq OWNED BY master.insurance_company.insurance_company_id;


--
-- TOC entry 385 (class 1259 OID 27482)
-- Name: job_card_category; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.job_card_category (
    job_card_category_id bigint NOT NULL,
    category_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.job_card_category OWNER TO postgres;

--
-- TOC entry 384 (class 1259 OID 27481)
-- Name: job_card_category_job_card_category_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.job_card_category_job_card_category_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.job_card_category_job_card_category_id_seq OWNER TO postgres;

--
-- TOC entry 6667 (class 0 OID 0)
-- Dependencies: 384
-- Name: job_card_category_job_card_category_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.job_card_category_job_card_category_id_seq OWNED BY master.job_card_category.job_card_category_id;


--
-- TOC entry 344 (class 1259 OID 26393)
-- Name: nominee; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.nominee (
    nominee_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    nominee_name character varying(150) NOT NULL,
    nominee_dob date NOT NULL,
    relation character varying(100) NOT NULL,
    is_primary boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.nominee OWNER TO postgres;

--
-- TOC entry 343 (class 1259 OID 26392)
-- Name: nominee_nominee_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.nominee_nominee_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.nominee_nominee_id_seq OWNER TO postgres;

--
-- TOC entry 6669 (class 0 OID 0)
-- Dependencies: 343
-- Name: nominee_nominee_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.nominee_nominee_id_seq OWNED BY master.nominee.nominee_id;


--
-- TOC entry 381 (class 1259 OID 27430)
-- Name: payment_mode; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.payment_mode (
    payment_mode_id bigint NOT NULL,
    mode_name character varying(100) NOT NULL,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_at timestamp without time zone,
    deleted_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.payment_mode OWNER TO postgres;

--
-- TOC entry 380 (class 1259 OID 27429)
-- Name: payment_mode_payment_mode_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.payment_mode_payment_mode_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.payment_mode_payment_mode_id_seq OWNER TO postgres;

--
-- TOC entry 6671 (class 0 OID 0)
-- Dependencies: 380
-- Name: payment_mode_payment_mode_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.payment_mode_payment_mode_id_seq OWNED BY master.payment_mode.payment_mode_id;


--
-- TOC entry 365 (class 1259 OID 26747)
-- Name: pin_reset_request; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.pin_reset_request (
    id bigint NOT NULL,
    staff_id bigint NOT NULL,
    request_type character varying(50) NOT NULL,
    status character varying(20) NOT NULL,
    requested_at timestamp without time zone NOT NULL,
    processed_at timestamp without time zone,
    processed_by bigint
);


ALTER TABLE master.pin_reset_request OWNER TO postgres;

--
-- TOC entry 364 (class 1259 OID 26746)
-- Name: pin_reset_request_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.pin_reset_request_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.pin_reset_request_id_seq OWNER TO postgres;

--
-- TOC entry 6673 (class 0 OID 0)
-- Dependencies: 364
-- Name: pin_reset_request_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.pin_reset_request_id_seq OWNED BY master.pin_reset_request.id;


--
-- TOC entry 360 (class 1259 OID 26603)
-- Name: spare_price_history; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.spare_price_history (
    history_id bigint NOT NULL,
    spare_id bigint NOT NULL,
    price numeric(12,2) NOT NULL,
    margin numeric(5,2) NOT NULL,
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.spare_price_history OWNER TO postgres;

--
-- TOC entry 359 (class 1259 OID 26602)
-- Name: spare_price_history_history_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.spare_price_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.spare_price_history_history_id_seq OWNER TO postgres;

--
-- TOC entry 6675 (class 0 OID 0)
-- Dependencies: 359
-- Name: spare_price_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.spare_price_history_history_id_seq OWNED BY master.spare_price_history.history_id;


--
-- TOC entry 307 (class 1259 OID 25700)
-- Name: staff; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.staff (
    staff_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    mobile_no_backup character varying(20) CONSTRAINT staff_mobile_no_not_null NOT NULL,
    email_backup character varying(150),
    designation character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    joined_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    aadhaar_no character varying(20) NOT NULL,
    pan_no character varying(20),
    bank_account_no character varying(30),
    bank_name character varying(100),
    ifsc_code character varying(20),
    pin_hash text,
    upi_id character varying(100),
    is_pin_reset_required boolean DEFAULT true NOT NULL,
    failed_attempts integer DEFAULT 0 NOT NULL,
    last_failed_at timestamp without time zone,
    locked_until timestamp without time zone,
    last_pin_changed_at timestamp without time zone,
    deleted_at timestamp without time zone,
    totp_secret character varying(255) DEFAULT NULL::character varying,
    dealer_id bigint,
    joining_date date,
    address_line1 text,
    address_line2 text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    bank_ifsc character varying(20),
    emergency_contact_name character varying(100),
    emergency_contact_no character varying(15),
    is_deleted boolean DEFAULT false NOT NULL,
    deleted_by bigint,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    salary_details jsonb,
    restored_at timestamp without time zone,
    restored_by bigint,
    mobile_no_enc text,
    mobile_no_hash character varying(255),
    email_enc text,
    email_hash character varying(255)
);


ALTER TABLE master.staff OWNER TO postgres;

--
-- TOC entry 306 (class 1259 OID 25699)
-- Name: staff_staff_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.staff_staff_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.staff_staff_id_seq OWNER TO postgres;

--
-- TOC entry 6677 (class 0 OID 0)
-- Dependencies: 306
-- Name: staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.staff_staff_id_seq OWNED BY master.staff.staff_id;


--
-- TOC entry 245 (class 1259 OID 24794)
-- Name: vehicle; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vehicle (
    chassis_no character varying(50) NOT NULL,
    vehicle_model_id bigint NOT NULL,
    motor_serial_no character varying(100),
    convertor_serial_no character varying(100),
    charger_serial_no character varying(100),
    controller_serial_no character varying(100),
    battery_serial_no character varying(100),
    date_of_manufacture date,
    current_status character varying(30) DEFAULT 'IN_STOCK'::character varying NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint,
    CONSTRAINT chk_vehicle_dom CHECK (((date_of_manufacture IS NULL) OR (date_of_manufacture <= CURRENT_DATE))),
    CONSTRAINT vehicle_current_status_check CHECK (((current_status)::text = ANY ((ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'SERVICE'::character varying])::text[])))
);


ALTER TABLE master.vehicle OWNER TO postgres;

--
-- TOC entry 244 (class 1259 OID 24777)
-- Name: vehicle_model; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vehicle_model (
    vehicle_model_id bigint NOT NULL,
    model_name character varying(100) NOT NULL,
    material_number character varying(100) NOT NULL,
    colour character varying(50) NOT NULL,
    battery_type character varying(50),
    laden_weight numeric(10,2),
    unladen_weight numeric(10,2),
    hsn_code character varying(20),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    brand_id bigint,
    restored_at timestamp without time zone,
    restored_by bigint
);


ALTER TABLE master.vehicle_model OWNER TO postgres;

--
-- TOC entry 243 (class 1259 OID 24776)
-- Name: vehicle_model_vehicle_model_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.vehicle_model_vehicle_model_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.vehicle_model_vehicle_model_id_seq OWNER TO postgres;

--
-- TOC entry 6680 (class 0 OID 0)
-- Dependencies: 243
-- Name: vehicle_model_vehicle_model_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vehicle_model_vehicle_model_id_seq OWNED BY master.vehicle_model.vehicle_model_id;


--
-- TOC entry 362 (class 1259 OID 26630)
-- Name: vehicle_price_history; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vehicle_price_history (
    history_id bigint NOT NULL,
    vehicle_model_id bigint NOT NULL,
    price numeric(12,2) NOT NULL,
    effective_from timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    effective_to timestamp without time zone,
    is_active boolean DEFAULT true NOT NULL,
    created_by bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.vehicle_price_history OWNER TO postgres;

--
-- TOC entry 361 (class 1259 OID 26629)
-- Name: vehicle_price_history_history_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.vehicle_price_history_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.vehicle_price_history_history_id_seq OWNER TO postgres;

--
-- TOC entry 6682 (class 0 OID 0)
-- Dependencies: 361
-- Name: vehicle_price_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vehicle_price_history_history_id_seq OWNED BY master.vehicle_price_history.history_id;


--
-- TOC entry 247 (class 1259 OID 24864)
-- Name: vendor; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vendor (
    vendor_id bigint NOT NULL,
    vendor_name character varying(150) NOT NULL,
    vendor_type character varying(50) NOT NULL,
    gstin character(15),
    pan_no character(10),
    address_line1 text,
    address_line2 text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    deleted_at timestamp without time zone,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint,
    restored_at timestamp without time zone,
    restored_by bigint,
    CONSTRAINT vendor_vendor_type_check CHECK (((vendor_type)::text = ANY ((ARRAY['OEM'::character varying, 'DEALER'::character varying, 'LOCAL'::character varying])::text[])))
);


ALTER TABLE master.vendor OWNER TO postgres;

--
-- TOC entry 249 (class 1259 OID 24885)
-- Name: vendor_contact; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vendor_contact (
    vendor_contact_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    contact_name character varying(150) NOT NULL,
    designation character varying(100),
    department character varying(100),
    phone character varying(15),
    email character varying(150),
    is_primary boolean DEFAULT false,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.vendor_contact OWNER TO postgres;

--
-- TOC entry 248 (class 1259 OID 24884)
-- Name: vendor_contact_vendor_contact_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.vendor_contact_vendor_contact_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.vendor_contact_vendor_contact_id_seq OWNER TO postgres;

--
-- TOC entry 6685 (class 0 OID 0)
-- Dependencies: 248
-- Name: vendor_contact_vendor_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_contact_vendor_contact_id_seq OWNED BY master.vendor_contact.vendor_contact_id;


--
-- TOC entry 251 (class 1259 OID 24907)
-- Name: vendor_document; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.vendor_document (
    vendor_document_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(50),
    file_path text NOT NULL,
    file_name character varying(255),
    mime_type character varying(100),
    is_active boolean DEFAULT true NOT NULL,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.vendor_document OWNER TO postgres;

--
-- TOC entry 250 (class 1259 OID 24906)
-- Name: vendor_document_vendor_document_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.vendor_document_vendor_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.vendor_document_vendor_document_id_seq OWNER TO postgres;

--
-- TOC entry 6687 (class 0 OID 0)
-- Dependencies: 250
-- Name: vendor_document_vendor_document_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_document_vendor_document_id_seq OWNED BY master.vendor_document.vendor_document_id;


--
-- TOC entry 246 (class 1259 OID 24863)
-- Name: vendor_vendor_id_seq; Type: SEQUENCE; Schema: master; Owner: postgres
--

CREATE SEQUENCE master.vendor_vendor_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE master.vendor_vendor_id_seq OWNER TO postgres;

--
-- TOC entry 6688 (class 0 OID 0)
-- Dependencies: 246
-- Name: vendor_vendor_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_vendor_id_seq OWNED BY master.vendor.vendor_id;


--
-- TOC entry 297 (class 1259 OID 25502)
-- Name: reimbursement_invoice; Type: TABLE; Schema: oem; Owner: postgres
--

CREATE TABLE oem.reimbursement_invoice (
    reimbursement_invoice_id bigint NOT NULL,
    oem_invoice_no character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    period_start_date date NOT NULL,
    period_end_date date NOT NULL,
    total_claim_amount numeric(14,2) NOT NULL,
    status character varying(30) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT reimbursement_invoice_status_check CHECK (((status)::text = ANY ((ARRAY['DRAFT'::character varying, 'SUBMITTED'::character varying, 'SETTLED'::character varying])::text[])))
);


ALTER TABLE oem.reimbursement_invoice OWNER TO postgres;

--
-- TOC entry 296 (class 1259 OID 25501)
-- Name: reimbursement_invoice_reimbursement_invoice_id_seq; Type: SEQUENCE; Schema: oem; Owner: postgres
--

CREATE SEQUENCE oem.reimbursement_invoice_reimbursement_invoice_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE oem.reimbursement_invoice_reimbursement_invoice_id_seq OWNER TO postgres;

--
-- TOC entry 6690 (class 0 OID 0)
-- Dependencies: 296
-- Name: reimbursement_invoice_reimbursement_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: oem; Owner: postgres
--

ALTER SEQUENCE oem.reimbursement_invoice_reimbursement_invoice_id_seq OWNED BY oem.reimbursement_invoice.reimbursement_invoice_id;


--
-- TOC entry 299 (class 1259 OID 25523)
-- Name: reimbursement_line; Type: TABLE; Schema: oem; Owner: postgres
--

CREATE TABLE oem.reimbursement_line (
    reimbursement_line_id bigint NOT NULL,
    reimbursement_invoice_id bigint NOT NULL,
    job_card_id bigint,
    job_labour_id bigint,
    claim_type character varying(30) NOT NULL,
    claim_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    vehicle_count integer,
    CONSTRAINT chk_oem_claim_logic CHECK (((((claim_type)::text = 'FREE_SERVICE'::text) AND (vehicle_count IS NOT NULL) AND (job_card_id IS NULL) AND (job_labour_id IS NULL)) OR (((claim_type)::text = 'WARRANTY_LABOUR'::text) AND (vehicle_count IS NULL) AND (job_labour_id IS NOT NULL)))),
    CONSTRAINT reimbursement_line_claim_type_check CHECK (((claim_type)::text = ANY ((ARRAY['FREE_SERVICE'::character varying, 'WARRANTY_LABOUR'::character varying])::text[])))
);


ALTER TABLE oem.reimbursement_line OWNER TO postgres;

--
-- TOC entry 298 (class 1259 OID 25522)
-- Name: reimbursement_line_reimbursement_line_id_seq; Type: SEQUENCE; Schema: oem; Owner: postgres
--

CREATE SEQUENCE oem.reimbursement_line_reimbursement_line_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE oem.reimbursement_line_reimbursement_line_id_seq OWNER TO postgres;

--
-- TOC entry 6692 (class 0 OID 0)
-- Dependencies: 298
-- Name: reimbursement_line_reimbursement_line_id_seq; Type: SEQUENCE OWNED BY; Schema: oem; Owner: postgres
--

ALTER SEQUENCE oem.reimbursement_line_reimbursement_line_id_seq OWNED BY oem.reimbursement_line.reimbursement_line_id;


--
-- TOC entry 293 (class 1259 OID 25457)
-- Name: spare_purchase; Type: TABLE; Schema: procurement; Owner: postgres
--

CREATE TABLE procurement.spare_purchase (
    spare_purchase_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    vendor_invoice_no character varying(100),
    vendor_invoice_date date,
    purchase_date date NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    include_in_accounting boolean DEFAULT true NOT NULL
);


ALTER TABLE procurement.spare_purchase OWNER TO postgres;

--
-- TOC entry 295 (class 1259 OID 25476)
-- Name: spare_purchase_item; Type: TABLE; Schema: procurement; Owner: postgres
--

CREATE TABLE procurement.spare_purchase_item (
    purchase_item_id bigint NOT NULL,
    spare_purchase_id bigint NOT NULL,
    spare_id bigint NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(12,2) NOT NULL,
    gst_percentage numeric(5,2),
    total_cost numeric(14,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT spare_purchase_item_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE procurement.spare_purchase_item OWNER TO postgres;

--
-- TOC entry 294 (class 1259 OID 25475)
-- Name: spare_purchase_item_purchase_item_id_seq; Type: SEQUENCE; Schema: procurement; Owner: postgres
--

CREATE SEQUENCE procurement.spare_purchase_item_purchase_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE procurement.spare_purchase_item_purchase_item_id_seq OWNER TO postgres;

--
-- TOC entry 6695 (class 0 OID 0)
-- Dependencies: 294
-- Name: spare_purchase_item_purchase_item_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.spare_purchase_item_purchase_item_id_seq OWNED BY procurement.spare_purchase_item.purchase_item_id;


--
-- TOC entry 292 (class 1259 OID 25456)
-- Name: spare_purchase_spare_purchase_id_seq; Type: SEQUENCE; Schema: procurement; Owner: postgres
--

CREATE SEQUENCE procurement.spare_purchase_spare_purchase_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE procurement.spare_purchase_spare_purchase_id_seq OWNER TO postgres;

--
-- TOC entry 6696 (class 0 OID 0)
-- Dependencies: 292
-- Name: spare_purchase_spare_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.spare_purchase_spare_purchase_id_seq OWNED BY procurement.spare_purchase.spare_purchase_id;


--
-- TOC entry 253 (class 1259 OID 24929)
-- Name: vehicle_purchase; Type: TABLE; Schema: procurement; Owner: postgres
--

CREATE TABLE procurement.vehicle_purchase (
    vehicle_purchase_id bigint NOT NULL,
    vendor_id bigint NOT NULL,
    invoice_number character varying(100) NOT NULL,
    invoice_date date NOT NULL,
    invoice_amount numeric(14,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    include_in_accounting boolean DEFAULT true NOT NULL
);


ALTER TABLE procurement.vehicle_purchase OWNER TO postgres;

--
-- TOC entry 255 (class 1259 OID 24949)
-- Name: vehicle_purchase_detail; Type: TABLE; Schema: procurement; Owner: postgres
--

CREATE TABLE procurement.vehicle_purchase_detail (
    vehicle_purchase_detail_id bigint NOT NULL,
    vehicle_purchase_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    cost_price numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE procurement.vehicle_purchase_detail OWNER TO postgres;

--
-- TOC entry 254 (class 1259 OID 24948)
-- Name: vehicle_purchase_detail_vehicle_purchase_detail_id_seq; Type: SEQUENCE; Schema: procurement; Owner: postgres
--

CREATE SEQUENCE procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq OWNER TO postgres;

--
-- TOC entry 6699 (class 0 OID 0)
-- Dependencies: 254
-- Name: vehicle_purchase_detail_vehicle_purchase_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq OWNED BY procurement.vehicle_purchase_detail.vehicle_purchase_detail_id;


--
-- TOC entry 252 (class 1259 OID 24928)
-- Name: vehicle_purchase_vehicle_purchase_id_seq; Type: SEQUENCE; Schema: procurement; Owner: postgres
--

CREATE SEQUENCE procurement.vehicle_purchase_vehicle_purchase_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE procurement.vehicle_purchase_vehicle_purchase_id_seq OWNER TO postgres;

--
-- TOC entry 6700 (class 0 OID 0)
-- Dependencies: 252
-- Name: vehicle_purchase_vehicle_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.vehicle_purchase_vehicle_purchase_id_seq OWNED BY procurement.vehicle_purchase.vehicle_purchase_id;


--
-- TOC entry 363 (class 1259 OID 26739)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- TOC entry 393 (class 1259 OID 27879)
-- Name: report; Type: TABLE; Schema: reports; Owner: postgres
--

CREATE TABLE reports.report (
    report_id bigint NOT NULL,
    report_name character varying(100) NOT NULL,
    description text,
    report_type character varying(50) NOT NULL,
    config jsonb,
    allowed_roles jsonb,
    is_active boolean,
    created_at timestamp without time zone NOT NULL,
    updated_at timestamp without time zone,
    created_by bigint,
    updated_by bigint
);


ALTER TABLE reports.report OWNER TO postgres;

--
-- TOC entry 395 (class 1259 OID 27904)
-- Name: report_execution; Type: TABLE; Schema: reports; Owner: postgres
--

CREATE TABLE reports.report_execution (
    execution_id bigint NOT NULL,
    report_id bigint NOT NULL,
    requested_by bigint NOT NULL,
    requested_at timestamp without time zone NOT NULL,
    parameters jsonb,
    status character varying(20) NOT NULL,
    file_path character varying(255),
    file_size_bytes bigint,
    completed_at timestamp without time zone,
    error_message text
);


ALTER TABLE reports.report_execution OWNER TO postgres;

--
-- TOC entry 394 (class 1259 OID 27903)
-- Name: report_execution_execution_id_seq; Type: SEQUENCE; Schema: reports; Owner: postgres
--

CREATE SEQUENCE reports.report_execution_execution_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE reports.report_execution_execution_id_seq OWNER TO postgres;

--
-- TOC entry 6701 (class 0 OID 0)
-- Dependencies: 394
-- Name: report_execution_execution_id_seq; Type: SEQUENCE OWNED BY; Schema: reports; Owner: postgres
--

ALTER SEQUENCE reports.report_execution_execution_id_seq OWNED BY reports.report_execution.execution_id;


--
-- TOC entry 392 (class 1259 OID 27878)
-- Name: report_report_id_seq; Type: SEQUENCE; Schema: reports; Owner: postgres
--

CREATE SEQUENCE reports.report_report_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE reports.report_report_id_seq OWNER TO postgres;

--
-- TOC entry 6702 (class 0 OID 0)
-- Dependencies: 392
-- Name: report_report_id_seq; Type: SEQUENCE OWNED BY; Schema: reports; Owner: postgres
--

ALTER SEQUENCE reports.report_report_id_seq OWNED BY reports.report.report_id;


--
-- TOC entry 356 (class 1259 OID 26551)
-- Name: delivery_checklist; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.delivery_checklist (
    checklist_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    insurance_completed boolean NOT NULL,
    subsidy_completed boolean NOT NULL,
    rto_completed boolean NOT NULL,
    celex_plate_ordered boolean NOT NULL,
    celex_subsidy_completed boolean NOT NULL,
    plate_fixation_date date,
    updated_at timestamp without time zone NOT NULL,
    insurance_details text,
    subsidy_details text,
    rto_details text,
    celex_details text
);


ALTER TABLE sales.delivery_checklist OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 26550)
-- Name: delivery_checklist_checklist_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.delivery_checklist_checklist_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.delivery_checklist_checklist_id_seq OWNER TO postgres;

--
-- TOC entry 6704 (class 0 OID 0)
-- Dependencies: 355
-- Name: delivery_checklist_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.delivery_checklist_checklist_id_seq OWNED BY sales.delivery_checklist.checklist_id;


--
-- TOC entry 354 (class 1259 OID 26527)
-- Name: payment_receipt; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.payment_receipt (
    receipt_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    amount numeric(12,2) NOT NULL,
    payment_mode character varying(20) NOT NULL,
    transaction_ref character varying(100),
    receipt_date date NOT NULL,
    created_by_staff_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE sales.payment_receipt OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 26526)
-- Name: payment_receipt_receipt_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.payment_receipt_receipt_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.payment_receipt_receipt_id_seq OWNER TO postgres;

--
-- TOC entry 6706 (class 0 OID 0)
-- Dependencies: 353
-- Name: payment_receipt_receipt_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.payment_receipt_receipt_id_seq OWNED BY sales.payment_receipt.receipt_id;


--
-- TOC entry 352 (class 1259 OID 26475)
-- Name: sale; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale (
    sale_id bigint NOT NULL,
    lead_id bigint,
    customer_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    sale_date date NOT NULL,
    total_amount numeric(12,2) NOT NULL,
    sale_status character varying(20) NOT NULL,
    invoice_number character varying(50),
    pay_receipt_number character varying(50),
    delivery_challan_number character varying(50),
    is_invoice_generated boolean NOT NULL,
    is_receipt_generated boolean NOT NULL,
    is_challan_generated boolean NOT NULL,
    is_insurance_generated boolean NOT NULL,
    remarks text,
    created_by_staff_id bigint NOT NULL,
    created_at timestamp without time zone NOT NULL,
    deleted_at timestamp without time zone,
    is_service_schedule_generated boolean DEFAULT false,
    sale_stage character varying(50) DEFAULT 'ENQUIRY'::character varying,
    stage_updated_at timestamp without time zone,
    is_direct_sale boolean DEFAULT false
);


ALTER TABLE sales.sale OWNER TO postgres;

--
-- TOC entry 373 (class 1259 OID 26853)
-- Name: sale_document; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale_document (
    sale_document_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    document_type character varying(50) NOT NULL,
    document_number character varying(50) NOT NULL,
    generated_date timestamp without time zone DEFAULT now() NOT NULL,
    generated_by_staff_id bigint NOT NULL,
    is_printed boolean DEFAULT false,
    print_count integer DEFAULT 0,
    last_printed_at timestamp without time zone
);


ALTER TABLE sales.sale_document OWNER TO postgres;

--
-- TOC entry 372 (class 1259 OID 26852)
-- Name: sale_document_sale_document_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.sale_document_sale_document_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.sale_document_sale_document_id_seq OWNER TO postgres;

--
-- TOC entry 6709 (class 0 OID 0)
-- Dependencies: 372
-- Name: sale_document_sale_document_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_document_sale_document_id_seq OWNED BY sales.sale_document.sale_document_id;


--
-- TOC entry 371 (class 1259 OID 26825)
-- Name: sale_payment; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale_payment (
    sale_payment_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    payment_type character varying(20) NOT NULL,
    payment_mode character varying(20) NOT NULL,
    amount numeric(12,2) NOT NULL,
    reference_number character varying(100),
    payment_date timestamp without time zone DEFAULT now() NOT NULL,
    bank_name character varying(100),
    remarks text,
    created_by_staff_id bigint NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE sales.sale_payment OWNER TO postgres;

--
-- TOC entry 370 (class 1259 OID 26824)
-- Name: sale_payment_sale_payment_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.sale_payment_sale_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.sale_payment_sale_payment_id_seq OWNER TO postgres;

--
-- TOC entry 6711 (class 0 OID 0)
-- Dependencies: 370
-- Name: sale_payment_sale_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_payment_sale_payment_id_seq OWNED BY sales.sale_payment.sale_payment_id;


--
-- TOC entry 375 (class 1259 OID 26881)
-- Name: sale_portal_tracking; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale_portal_tracking (
    portal_tracking_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    insurance_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    insurance_completed_date timestamp without time zone,
    insurance_policy_number character varying(100),
    subsidy_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    subsidy_completed_date timestamp without time zone,
    subsidy_reference character varying(100),
    rto_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    rto_completed_date timestamp without time zone,
    registration_number character varying(20),
    celex_status character varying(20) DEFAULT 'PENDING'::character varying NOT NULL,
    celex_completed_date timestamp without time zone,
    number_plate_ordered_date date,
    number_plate_fixed_date date,
    form_20_generated boolean DEFAULT false,
    helmet_invoice_generated boolean DEFAULT false,
    all_portals_completed boolean DEFAULT false,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone
);


ALTER TABLE sales.sale_portal_tracking OWNER TO postgres;

--
-- TOC entry 374 (class 1259 OID 26880)
-- Name: sale_portal_tracking_portal_tracking_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.sale_portal_tracking_portal_tracking_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.sale_portal_tracking_portal_tracking_id_seq OWNER TO postgres;

--
-- TOC entry 6713 (class 0 OID 0)
-- Dependencies: 374
-- Name: sale_portal_tracking_portal_tracking_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_portal_tracking_portal_tracking_id_seq OWNED BY sales.sale_portal_tracking.portal_tracking_id;


--
-- TOC entry 351 (class 1259 OID 26474)
-- Name: sale_sale_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.sale_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.sale_sale_id_seq OWNER TO postgres;

--
-- TOC entry 6714 (class 0 OID 0)
-- Dependencies: 351
-- Name: sale_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_sale_id_seq OWNED BY sales.sale.sale_id;


--
-- TOC entry 369 (class 1259 OID 26801)
-- Name: sale_stage_history; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale_stage_history (
    stage_history_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    from_stage character varying(50),
    to_stage character varying(50) NOT NULL,
    changed_by_staff_id bigint NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE sales.sale_stage_history OWNER TO postgres;

--
-- TOC entry 368 (class 1259 OID 26800)
-- Name: sale_stage_history_stage_history_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.sale_stage_history_stage_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.sale_stage_history_stage_history_id_seq OWNER TO postgres;

--
-- TOC entry 6716 (class 0 OID 0)
-- Dependencies: 368
-- Name: sale_stage_history_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_stage_history_stage_history_id_seq OWNED BY sales.sale_stage_history.stage_history_id;


--
-- TOC entry 358 (class 1259 OID 26574)
-- Name: service_schedule; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.service_schedule (
    schedule_id bigint NOT NULL,
    sale_id bigint NOT NULL,
    service_number integer NOT NULL,
    service_type character varying(20) NOT NULL,
    due_date date NOT NULL,
    status character varying(20) NOT NULL,
    created_at timestamp without time zone NOT NULL
);


ALTER TABLE sales.service_schedule OWNER TO postgres;

--
-- TOC entry 357 (class 1259 OID 26573)
-- Name: service_schedule_schedule_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.service_schedule_schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.service_schedule_schedule_id_seq OWNER TO postgres;

--
-- TOC entry 6718 (class 0 OID 0)
-- Dependencies: 357
-- Name: service_schedule_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.service_schedule_schedule_id_seq OWNED BY sales.service_schedule.schedule_id;


--
-- TOC entry 327 (class 1259 OID 26114)
-- Name: spare_sale; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.spare_sale (
    spare_sale_id bigint NOT NULL,
    sale_date date NOT NULL,
    customer_id bigint,
    job_card_id bigint,
    total_amount numeric(14,2) NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE sales.spare_sale OWNER TO postgres;

--
-- TOC entry 329 (class 1259 OID 26138)
-- Name: spare_sale_detail; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.spare_sale_detail (
    spare_sale_detail_id bigint NOT NULL,
    spare_sale_id bigint NOT NULL,
    spare_id bigint NOT NULL,
    quantity integer NOT NULL,
    rate numeric(12,2) NOT NULL,
    amount numeric(14,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_spare_sale_amount CHECK ((amount >= (0)::numeric)),
    CONSTRAINT chk_spare_sale_quantity CHECK ((quantity > 0))
);


ALTER TABLE sales.spare_sale_detail OWNER TO postgres;

--
-- TOC entry 328 (class 1259 OID 26137)
-- Name: spare_sale_detail_spare_sale_detail_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.spare_sale_detail_spare_sale_detail_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.spare_sale_detail_spare_sale_detail_id_seq OWNER TO postgres;

--
-- TOC entry 6721 (class 0 OID 0)
-- Dependencies: 328
-- Name: spare_sale_detail_spare_sale_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.spare_sale_detail_spare_sale_detail_id_seq OWNED BY sales.spare_sale_detail.spare_sale_detail_id;


--
-- TOC entry 326 (class 1259 OID 26113)
-- Name: spare_sale_spare_sale_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.spare_sale_spare_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.spare_sale_spare_sale_id_seq OWNER TO postgres;

--
-- TOC entry 6722 (class 0 OID 0)
-- Dependencies: 326
-- Name: spare_sale_spare_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.spare_sale_spare_sale_id_seq OWNED BY sales.spare_sale.spare_sale_id;


--
-- TOC entry 261 (class 1259 OID 25044)
-- Name: vehicle_payment; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.vehicle_payment (
    vehicle_payment_id bigint NOT NULL,
    customer_id bigint NOT NULL,
    chassis_no character varying(50),
    payment_context character varying(30) NOT NULL,
    payment_mode character varying(30) NOT NULL,
    payment_amount numeric(14,2) NOT NULL,
    payment_date date NOT NULL,
    reference_no character varying(100),
    remarks text,
    vehicle_sale_id bigint,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_vehicle_payment_amount CHECK ((payment_amount > (0)::numeric)),
    CONSTRAINT vehicle_payment_payment_context_check CHECK (((payment_context)::text = ANY ((ARRAY['BOOKING'::character varying, 'SALE'::character varying, 'ADJUSTMENT'::character varying])::text[])))
);


ALTER TABLE sales.vehicle_payment OWNER TO postgres;

--
-- TOC entry 260 (class 1259 OID 25043)
-- Name: vehicle_payment_vehicle_payment_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.vehicle_payment_vehicle_payment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.vehicle_payment_vehicle_payment_id_seq OWNER TO postgres;

--
-- TOC entry 6724 (class 0 OID 0)
-- Dependencies: 260
-- Name: vehicle_payment_vehicle_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_payment_vehicle_payment_id_seq OWNED BY sales.vehicle_payment.vehicle_payment_id;


--
-- TOC entry 321 (class 1259 OID 25958)
-- Name: vehicle_registration; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.vehicle_registration (
    vehicle_registration_id bigint NOT NULL,
    vehicle_sale_id bigint NOT NULL,
    registration_no character varying(50),
    number_plate_status character varying(40) NOT NULL,
    front_plate_image text,
    rear_plate_image text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone,
    CONSTRAINT vehicle_registration_number_plate_status_check CHECK (((number_plate_status)::text = ANY ((ARRAY['NOT_ORDERED'::character varying, 'ORDERED'::character varying, 'IN_TRANSIT'::character varying, 'AVAILABLE_AT_SHOWROOM'::character varying, 'ATTACHED_TO_VEHICLE'::character varying])::text[])))
);


ALTER TABLE sales.vehicle_registration OWNER TO postgres;

--
-- TOC entry 320 (class 1259 OID 25957)
-- Name: vehicle_registration_vehicle_registration_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.vehicle_registration_vehicle_registration_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.vehicle_registration_vehicle_registration_id_seq OWNER TO postgres;

--
-- TOC entry 6726 (class 0 OID 0)
-- Dependencies: 320
-- Name: vehicle_registration_vehicle_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_registration_vehicle_registration_id_seq OWNED BY sales.vehicle_registration.vehicle_registration_id;


--
-- TOC entry 257 (class 1259 OID 24973)
-- Name: vehicle_sale; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.vehicle_sale (
    vehicle_sale_id bigint NOT NULL,
    invoice_number character varying(50) NOT NULL,
    invoice_date date NOT NULL,
    delivery_challan_no character varying(50) NOT NULL,
    delivery_challan_date date,
    customer_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    sale_price numeric(14,2) NOT NULL,
    discount_amount numeric(14,2) DEFAULT 0,
    is_financed boolean DEFAULT false NOT NULL,
    sale_channel character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    lead_id bigint NOT NULL
);


ALTER TABLE sales.vehicle_sale OWNER TO postgres;

--
-- TOC entry 259 (class 1259 OID 25027)
-- Name: vehicle_sale_finance; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.vehicle_sale_finance (
    vehicle_sale_finance_id bigint NOT NULL,
    vehicle_sale_id bigint NOT NULL,
    financer_name character varying(150) NOT NULL,
    loan_amount numeric(14,2),
    down_payment numeric(14,2),
    finance_reference_no character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE sales.vehicle_sale_finance OWNER TO postgres;

--
-- TOC entry 258 (class 1259 OID 25026)
-- Name: vehicle_sale_finance_vehicle_sale_finance_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.vehicle_sale_finance_vehicle_sale_finance_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.vehicle_sale_finance_vehicle_sale_finance_id_seq OWNER TO postgres;

--
-- TOC entry 6729 (class 0 OID 0)
-- Dependencies: 258
-- Name: vehicle_sale_finance_vehicle_sale_finance_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_sale_finance_vehicle_sale_finance_id_seq OWNED BY sales.vehicle_sale_finance.vehicle_sale_finance_id;


--
-- TOC entry 256 (class 1259 OID 24972)
-- Name: vehicle_sale_vehicle_sale_id_seq; Type: SEQUENCE; Schema: sales; Owner: postgres
--

CREATE SEQUENCE sales.vehicle_sale_vehicle_sale_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE sales.vehicle_sale_vehicle_sale_id_seq OWNER TO postgres;

--
-- TOC entry 6730 (class 0 OID 0)
-- Dependencies: 256
-- Name: vehicle_sale_vehicle_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_sale_vehicle_sale_id_seq OWNED BY sales.vehicle_sale.vehicle_sale_id;


--
-- TOC entry 267 (class 1259 OID 25130)
-- Name: job_card; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.job_card (
    job_card_id bigint NOT NULL,
    job_card_no character varying(50) NOT NULL,
    chassis_no character varying(50) NOT NULL,
    customer_id bigint NOT NULL,
    in_datetime timestamp without time zone NOT NULL,
    out_datetime timestamp without time zone,
    opening_km integer NOT NULL,
    next_service_date date,
    next_service_km integer,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT chk_job_card_datetime CHECK (((out_datetime IS NULL) OR (out_datetime >= in_datetime))),
    CONSTRAINT chk_job_card_km CHECK ((opening_km >= 0))
);


ALTER TABLE service.job_card OWNER TO postgres;

--
-- TOC entry 266 (class 1259 OID 25129)
-- Name: job_card_job_card_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.job_card_job_card_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.job_card_job_card_id_seq OWNER TO postgres;

--
-- TOC entry 6732 (class 0 OID 0)
-- Dependencies: 266
-- Name: job_card_job_card_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_card_job_card_id_seq OWNED BY service.job_card.job_card_id;


--
-- TOC entry 271 (class 1259 OID 25179)
-- Name: job_labour; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.job_labour (
    job_labour_id bigint NOT NULL,
    work_item_id bigint NOT NULL,
    description text NOT NULL,
    labour_amount numeric(12,2) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE service.job_labour OWNER TO postgres;

--
-- TOC entry 270 (class 1259 OID 25178)
-- Name: job_labour_job_labour_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.job_labour_job_labour_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.job_labour_job_labour_id_seq OWNER TO postgres;

--
-- TOC entry 6734 (class 0 OID 0)
-- Dependencies: 270
-- Name: job_labour_job_labour_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_labour_job_labour_id_seq OWNED BY service.job_labour.job_labour_id;


--
-- TOC entry 277 (class 1259 OID 25271)
-- Name: job_spare; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.job_spare (
    job_spare_id bigint NOT NULL,
    work_item_id bigint NOT NULL,
    quantity integer DEFAULT 1 NOT NULL,
    rate numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    spare_id bigint NOT NULL
);


ALTER TABLE service.job_spare OWNER TO postgres;

--
-- TOC entry 276 (class 1259 OID 25270)
-- Name: job_spare_job_spare_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.job_spare_job_spare_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.job_spare_job_spare_id_seq OWNER TO postgres;

--
-- TOC entry 6736 (class 0 OID 0)
-- Dependencies: 276
-- Name: job_spare_job_spare_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_spare_job_spare_id_seq OWNED BY service.job_spare.job_spare_id;


--
-- TOC entry 269 (class 1259 OID 25159)
-- Name: job_work_item; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.job_work_item (
    work_item_id bigint NOT NULL,
    job_card_id bigint NOT NULL,
    work_type character varying(30) NOT NULL,
    description text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT job_work_item_work_type_check CHECK (((work_type)::text = ANY ((ARRAY['PAID'::character varying, 'WARRANTY'::character varying, 'INSURANCE'::character varying, 'FREE'::character varying])::text[])))
);


ALTER TABLE service.job_work_item OWNER TO postgres;

--
-- TOC entry 268 (class 1259 OID 25158)
-- Name: job_work_item_work_item_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.job_work_item_work_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.job_work_item_work_item_id_seq OWNER TO postgres;

--
-- TOC entry 6738 (class 0 OID 0)
-- Dependencies: 268
-- Name: job_work_item_work_item_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_work_item_work_item_id_seq OWNED BY service.job_work_item.work_item_id;


--
-- TOC entry 377 (class 1259 OID 26911)
-- Name: service_followup; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.service_followup (
    service_followup_id bigint NOT NULL,
    job_card_id bigint NOT NULL,
    service_type character varying(50) NOT NULL,
    next_service_date date NOT NULL,
    km_at_service integer,
    next_service_km integer,
    is_completed boolean DEFAULT false,
    completed_date timestamp without time zone,
    remarks text,
    created_at timestamp without time zone DEFAULT now()
);


ALTER TABLE service.service_followup OWNER TO postgres;

--
-- TOC entry 376 (class 1259 OID 26910)
-- Name: service_followup_service_followup_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.service_followup_service_followup_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.service_followup_service_followup_id_seq OWNER TO postgres;

--
-- TOC entry 6740 (class 0 OID 0)
-- Dependencies: 376
-- Name: service_followup_service_followup_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.service_followup_service_followup_id_seq OWNED BY service.service_followup.service_followup_id;


--
-- TOC entry 323 (class 1259 OID 25980)
-- Name: service_schedule; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.service_schedule (
    service_schedule_id bigint NOT NULL,
    vehicle_model_id bigint NOT NULL,
    service_number integer NOT NULL,
    month_interval integer,
    km_interval integer,
    service_type character varying(20) NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT service_schedule_service_type_check CHECK (((service_type)::text = ANY ((ARRAY['FREE'::character varying, 'PAID'::character varying])::text[])))
);


ALTER TABLE service.service_schedule OWNER TO postgres;

--
-- TOC entry 322 (class 1259 OID 25979)
-- Name: service_schedule_service_schedule_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.service_schedule_service_schedule_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.service_schedule_service_schedule_id_seq OWNER TO postgres;

--
-- TOC entry 6742 (class 0 OID 0)
-- Dependencies: 322
-- Name: service_schedule_service_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.service_schedule_service_schedule_id_seq OWNED BY service.service_schedule.service_schedule_id;


--
-- TOC entry 273 (class 1259 OID 25199)
-- Name: vehicle_component_change; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.vehicle_component_change (
    component_change_id bigint NOT NULL,
    job_card_id bigint NOT NULL,
    chassis_no character varying(50) NOT NULL,
    component_type character varying(50) NOT NULL,
    old_serial_no character varying(100) NOT NULL,
    new_serial_no character varying(100) NOT NULL,
    replacement_reason character varying(30) NOT NULL,
    change_date date NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    new_spare_serial_id bigint,
    CONSTRAINT vehicle_component_change_component_type_check CHECK (((component_type)::text = ANY ((ARRAY['MOTOR'::character varying, 'BATTERY'::character varying, 'CONTROLLER'::character varying, 'CHARGER'::character varying])::text[]))),
    CONSTRAINT vehicle_component_change_replacement_reason_check CHECK (((replacement_reason)::text = ANY ((ARRAY['WARRANTY'::character varying, 'PAID'::character varying, 'INSURANCE'::character varying])::text[])))
);


ALTER TABLE service.vehicle_component_change OWNER TO postgres;

--
-- TOC entry 272 (class 1259 OID 25198)
-- Name: vehicle_component_change_component_change_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.vehicle_component_change_component_change_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.vehicle_component_change_component_change_id_seq OWNER TO postgres;

--
-- TOC entry 6744 (class 0 OID 0)
-- Dependencies: 272
-- Name: vehicle_component_change_component_change_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.vehicle_component_change_component_change_id_seq OWNED BY service.vehicle_component_change.component_change_id;


--
-- TOC entry 325 (class 1259 OID 26001)
-- Name: vehicle_service_summary; Type: TABLE; Schema: service; Owner: postgres
--

CREATE TABLE service.vehicle_service_summary (
    vehicle_service_summary_id bigint NOT NULL,
    vehicle_sale_id bigint NOT NULL,
    last_job_card_id bigint,
    last_service_no integer,
    last_service_date date,
    last_service_km integer,
    next_service_no integer NOT NULL,
    next_due_date date,
    next_due_km integer,
    due_status character varying(20) NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT vehicle_service_summary_due_status_check CHECK (((due_status)::text = ANY ((ARRAY['UPCOMING'::character varying, 'DUE'::character varying, 'OVERDUE'::character varying])::text[])))
);


ALTER TABLE service.vehicle_service_summary OWNER TO postgres;

--
-- TOC entry 324 (class 1259 OID 26000)
-- Name: vehicle_service_summary_vehicle_service_summary_id_seq; Type: SEQUENCE; Schema: service; Owner: postgres
--

CREATE SEQUENCE service.vehicle_service_summary_vehicle_service_summary_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE service.vehicle_service_summary_vehicle_service_summary_id_seq OWNER TO postgres;

--
-- TOC entry 6746 (class 0 OID 0)
-- Dependencies: 324
-- Name: vehicle_service_summary_vehicle_service_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.vehicle_service_summary_vehicle_service_summary_id_seq OWNED BY service.vehicle_service_summary.vehicle_service_summary_id;


--
-- TOC entry 279 (class 1259 OID 25290)
-- Name: claim; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.claim (
    claim_id bigint NOT NULL,
    job_spare_id bigint NOT NULL,
    claim_status character varying(30) NOT NULL,
    portal_ref_no character varying(100),
    approval_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    so_number character varying(100) NOT NULL,
    remarks text,
    CONSTRAINT claim_claim_status_check CHECK (((claim_status)::text = ANY ((ARRAY['RAISED'::character varying, 'APPROVED'::character varying, 'REJECTED'::character varying])::text[])))
);


ALTER TABLE warranty.claim OWNER TO postgres;

--
-- TOC entry 278 (class 1259 OID 25289)
-- Name: claim_claim_id_seq; Type: SEQUENCE; Schema: warranty; Owner: postgres
--

CREATE SEQUENCE warranty.claim_claim_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE warranty.claim_claim_id_seq OWNER TO postgres;

--
-- TOC entry 6748 (class 0 OID 0)
-- Dependencies: 278
-- Name: claim_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.claim_claim_id_seq OWNED BY warranty.claim.claim_id;


--
-- TOC entry 301 (class 1259 OID 25557)
-- Name: inward; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.inward (
    warranty_inward_id bigint NOT NULL,
    oem_invoice_no character varying(100) NOT NULL,
    oem_invoice_date date NOT NULL,
    remarks text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE warranty.inward OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 25573)
-- Name: inward_item; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.inward_item (
    inward_item_id bigint NOT NULL,
    warranty_inward_id bigint NOT NULL,
    spare_id bigint NOT NULL,
    quantity integer NOT NULL,
    unit_cost numeric(12,2),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    CONSTRAINT inward_item_quantity_check CHECK ((quantity > 0))
);


ALTER TABLE warranty.inward_item OWNER TO postgres;

--
-- TOC entry 302 (class 1259 OID 25572)
-- Name: inward_item_inward_item_id_seq; Type: SEQUENCE; Schema: warranty; Owner: postgres
--

CREATE SEQUENCE warranty.inward_item_inward_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE warranty.inward_item_inward_item_id_seq OWNER TO postgres;

--
-- TOC entry 6751 (class 0 OID 0)
-- Dependencies: 302
-- Name: inward_item_inward_item_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.inward_item_inward_item_id_seq OWNED BY warranty.inward_item.inward_item_id;


--
-- TOC entry 300 (class 1259 OID 25556)
-- Name: inward_warranty_inward_id_seq; Type: SEQUENCE; Schema: warranty; Owner: postgres
--

CREATE SEQUENCE warranty.inward_warranty_inward_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE warranty.inward_warranty_inward_id_seq OWNER TO postgres;

--
-- TOC entry 6752 (class 0 OID 0)
-- Dependencies: 300
-- Name: inward_warranty_inward_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.inward_warranty_inward_id_seq OWNED BY warranty.inward.warranty_inward_id;


--
-- TOC entry 275 (class 1259 OID 25256)
-- Name: shipment; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.shipment (
    shipment_id bigint NOT NULL,
    courier_name character varying(100) NOT NULL,
    docket_no character varying(100) NOT NULL,
    dispatch_date date NOT NULL,
    received_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE warranty.shipment OWNER TO postgres;

--
-- TOC entry 281 (class 1259 OID 25308)
-- Name: shipment_item; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.shipment_item (
    shipment_item_id bigint NOT NULL,
    shipment_id bigint NOT NULL,
    claim_id bigint NOT NULL
);


ALTER TABLE warranty.shipment_item OWNER TO postgres;

--
-- TOC entry 280 (class 1259 OID 25307)
-- Name: shipment_item_shipment_item_id_seq; Type: SEQUENCE; Schema: warranty; Owner: postgres
--

CREATE SEQUENCE warranty.shipment_item_shipment_item_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE warranty.shipment_item_shipment_item_id_seq OWNER TO postgres;

--
-- TOC entry 6755 (class 0 OID 0)
-- Dependencies: 280
-- Name: shipment_item_shipment_item_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.shipment_item_shipment_item_id_seq OWNED BY warranty.shipment_item.shipment_item_id;


--
-- TOC entry 274 (class 1259 OID 25255)
-- Name: shipment_shipment_id_seq; Type: SEQUENCE; Schema: warranty; Owner: postgres
--

CREATE SEQUENCE warranty.shipment_shipment_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE warranty.shipment_shipment_id_seq OWNER TO postgres;

--
-- TOC entry 6756 (class 0 OID 0)
-- Dependencies: 274
-- Name: shipment_shipment_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.shipment_shipment_id_seq OWNED BY warranty.shipment.shipment_id;


--
-- TOC entry 5542 (class 2604 OID 28054)
-- Name: logs id; Type: DEFAULT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.logs ALTER COLUMN id SET DEFAULT nextval('audit.logs_id_seq'::regclass);


--
-- TOC entry 5384 (class 2604 OID 26662)
-- Name: insurance_estimate estimate_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate ALTER COLUMN estimate_id SET DEFAULT nextval('billing.insurance_estimate_estimate_id_seq'::regclass);


--
-- TOC entry 5377 (class 2604 OID 26663)
-- Name: invoice invoice_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice ALTER COLUMN invoice_id SET DEFAULT nextval('billing.invoice_invoice_id_seq'::regclass);


--
-- TOC entry 5381 (class 2604 OID 26664)
-- Name: invoice_line invoice_line_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line ALTER COLUMN invoice_line_id SET DEFAULT nextval('billing.invoice_line_invoice_line_id_seq'::regclass);


--
-- TOC entry 5456 (class 2604 OID 26665)
-- Name: enquiry enquiry_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry ALTER COLUMN enquiry_id SET DEFAULT nextval('crm.enquiry_enquiry_id_seq'::regclass);


--
-- TOC entry 5464 (class 2604 OID 26666)
-- Name: enquiry_status_master status_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master ALTER COLUMN status_id SET DEFAULT nextval('crm.enquiry_status_master_status_id_seq'::regclass);


--
-- TOC entry 5428 (class 2604 OID 26667)
-- Name: followup_schedule followup_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule ALTER COLUMN followup_id SET DEFAULT nextval('crm.followup_schedule_followup_id_seq'::regclass);


--
-- TOC entry 5417 (class 2604 OID 26668)
-- Name: lead lead_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead ALTER COLUMN lead_id SET DEFAULT nextval('crm.lead_lead_id_seq'::regclass);


--
-- TOC entry 5426 (class 2604 OID 26669)
-- Name: lead_activity activity_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity ALTER COLUMN activity_id SET DEFAULT nextval('crm.lead_activity_activity_id_seq'::regclass);


--
-- TOC entry 5432 (class 2604 OID 26670)
-- Name: lead_assignment_history assignment_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history ALTER COLUMN assignment_id SET DEFAULT nextval('crm.lead_assignment_history_assignment_id_seq'::regclass);


--
-- TOC entry 5486 (class 2604 OID 26777)
-- Name: lead_followup lead_followup_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_followup ALTER COLUMN lead_followup_id SET DEFAULT nextval('crm.lead_followup_lead_followup_id_seq'::regclass);


--
-- TOC entry 5424 (class 2604 OID 26671)
-- Name: lead_status_history status_history_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history ALTER COLUMN status_history_id SET DEFAULT nextval('crm.lead_status_history_status_history_id_seq'::regclass);


--
-- TOC entry 5462 (class 2604 OID 26672)
-- Name: lead_status_master status_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master ALTER COLUMN status_id SET DEFAULT nextval('crm.lead_status_master_status_id_seq'::regclass);


--
-- TOC entry 5430 (class 2604 OID 26673)
-- Name: test_ride test_ride_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride ALTER COLUMN test_ride_id SET DEFAULT nextval('crm.test_ride_test_ride_id_seq'::regclass);


--
-- TOC entry 5544 (class 2604 OID 28072)
-- Name: gl_account account_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account ALTER COLUMN account_id SET DEFAULT nextval('finance.gl_account_account_id_seq'::regclass);


--
-- TOC entry 5546 (class 2604 OID 28116)
-- Name: gl_journal journal_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal ALTER COLUMN journal_id SET DEFAULT nextval('finance.gl_journal_journal_id_seq'::regclass);


--
-- TOC entry 5548 (class 2604 OID 28159)
-- Name: gl_journal_entry entry_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal_entry ALTER COLUMN entry_id SET DEFAULT nextval('finance.gl_journal_entry_entry_id_seq'::regclass);


--
-- TOC entry 5451 (class 2604 OID 26674)
-- Name: vehicle_loan loan_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan ALTER COLUMN loan_id SET DEFAULT nextval('finance.vehicle_loan_loan_id_seq'::regclass);


--
-- TOC entry 5454 (class 2604 OID 26675)
-- Name: vehicle_subsidy subsidy_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy ALTER COLUMN subsidy_id SET DEFAULT nextval('finance.vehicle_subsidy_subsidy_id_seq'::regclass);


--
-- TOC entry 5444 (class 2604 OID 26676)
-- Name: attendance attendance_id; Type: DEFAULT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance ALTER COLUMN attendance_id SET DEFAULT nextval('hr.attendance_attendance_id_seq'::regclass);


--
-- TOC entry 5446 (class 2604 OID 26677)
-- Name: salary salary_id; Type: DEFAULT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary ALTER COLUMN salary_id SET DEFAULT nextval('hr.salary_salary_id_seq'::regclass);


--
-- TOC entry 5355 (class 2604 OID 26678)
-- Name: insurance_company insurance_company_id; Type: DEFAULT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company ALTER COLUMN insurance_company_id SET DEFAULT nextval('insurance.insurance_company_insurance_company_id_seq'::regclass);


--
-- TOC entry 5510 (class 2604 OID 26934)
-- Name: insurance_followup insurance_followup_id; Type: DEFAULT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_followup ALTER COLUMN insurance_followup_id SET DEFAULT nextval('insurance.insurance_followup_insurance_followup_id_seq'::regclass);


--
-- TOC entry 5358 (class 2604 OID 26679)
-- Name: policy policy_id; Type: DEFAULT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy ALTER COLUMN policy_id SET DEFAULT nextval('insurance.policy_policy_id_seq'::regclass);


--
-- TOC entry 5388 (class 2604 OID 26680)
-- Name: spare_master spare_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master ALTER COLUMN spare_id SET DEFAULT nextval('inventory.spare_master_spare_id_seq'::regclass);


--
-- TOC entry 5407 (class 2604 OID 26681)
-- Name: spare_serial spare_serial_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial ALTER COLUMN spare_serial_id SET DEFAULT nextval('inventory.spare_serial_spare_serial_id_seq'::regclass);


--
-- TOC entry 5386 (class 2604 OID 26682)
-- Name: spare_stock_movement movement_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement ALTER COLUMN movement_id SET DEFAULT nextval('inventory.spare_stock_movement_movement_id_seq'::regclass);


--
-- TOC entry 5448 (class 2604 OID 26683)
-- Name: vehicle_stock_movement movement_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement ALTER COLUMN movement_id SET DEFAULT nextval('inventory.vehicle_stock_movement_movement_id_seq'::regclass);


--
-- TOC entry 5530 (class 2604 OID 27537)
-- Name: bank bank_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank ALTER COLUMN bank_id SET DEFAULT nextval('master.bank_bank_id_seq'::regclass);


--
-- TOC entry 5466 (class 2604 OID 26684)
-- Name: brand brand_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand ALTER COLUMN brand_id SET DEFAULT nextval('master.brand_brand_id_seq'::regclass);


--
-- TOC entry 5549 (class 2604 OID 28183)
-- Name: color color_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color ALTER COLUMN color_id SET DEFAULT nextval('master.color_color_id_seq'::regclass);


--
-- TOC entry 5320 (class 2604 OID 26685)
-- Name: customer customer_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer ALTER COLUMN customer_id SET DEFAULT nextval('master.customer_customer_id_seq'::regclass);


--
-- TOC entry 5324 (class 2604 OID 26686)
-- Name: customer_document customer_document_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document ALTER COLUMN customer_document_id SET DEFAULT nextval('master.customer_document_customer_document_id_seq'::regclass);


--
-- TOC entry 5321 (class 2604 OID 26687)
-- Name: customer_phone customer_phone_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone ALTER COLUMN customer_phone_id SET DEFAULT nextval('master.customer_phone_customer_phone_id_seq'::regclass);


--
-- TOC entry 5534 (class 2604 OID 27562)
-- Name: document_type document_type_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type ALTER COLUMN document_type_id SET DEFAULT nextval('master.document_type_document_type_id_seq'::regclass);


--
-- TOC entry 5518 (class 2604 OID 27459)
-- Name: expense_category expense_category_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category ALTER COLUMN expense_category_id SET DEFAULT nextval('master.expense_category_expense_category_id_seq'::regclass);


--
-- TOC entry 5526 (class 2604 OID 27511)
-- Name: insurance_company insurance_company_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company ALTER COLUMN insurance_company_id SET DEFAULT nextval('master.insurance_company_insurance_company_id_seq'::regclass);


--
-- TOC entry 5522 (class 2604 OID 27485)
-- Name: job_card_category job_card_category_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category ALTER COLUMN job_card_category_id SET DEFAULT nextval('master.job_card_category_job_card_category_id_seq'::regclass);


--
-- TOC entry 5458 (class 2604 OID 26690)
-- Name: nominee nominee_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee ALTER COLUMN nominee_id SET DEFAULT nextval('master.nominee_nominee_id_seq'::regclass);


--
-- TOC entry 5514 (class 2604 OID 27433)
-- Name: payment_mode payment_mode_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode ALTER COLUMN payment_mode_id SET DEFAULT nextval('master.payment_mode_payment_mode_id_seq'::regclass);


--
-- TOC entry 5485 (class 2604 OID 26750)
-- Name: pin_reset_request id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request ALTER COLUMN id SET DEFAULT nextval('master.pin_reset_request_id_seq'::regclass);


--
-- TOC entry 5477 (class 2604 OID 26692)
-- Name: spare_price_history history_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history ALTER COLUMN history_id SET DEFAULT nextval('master.spare_price_history_history_id_seq'::regclass);


--
-- TOC entry 5410 (class 2604 OID 26693)
-- Name: staff staff_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff ALTER COLUMN staff_id SET DEFAULT nextval('master.staff_staff_id_seq'::regclass);


--
-- TOC entry 5327 (class 2604 OID 26694)
-- Name: vehicle_model vehicle_model_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model ALTER COLUMN vehicle_model_id SET DEFAULT nextval('master.vehicle_model_vehicle_model_id_seq'::regclass);


--
-- TOC entry 5481 (class 2604 OID 26695)
-- Name: vehicle_price_history history_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history ALTER COLUMN history_id SET DEFAULT nextval('master.vehicle_price_history_history_id_seq'::regclass);


--
-- TOC entry 5332 (class 2604 OID 26696)
-- Name: vendor vendor_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor ALTER COLUMN vendor_id SET DEFAULT nextval('master.vendor_vendor_id_seq'::regclass);


--
-- TOC entry 5335 (class 2604 OID 26697)
-- Name: vendor_contact vendor_contact_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact ALTER COLUMN vendor_contact_id SET DEFAULT nextval('master.vendor_contact_vendor_contact_id_seq'::regclass);


--
-- TOC entry 5339 (class 2604 OID 26698)
-- Name: vendor_document vendor_document_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document ALTER COLUMN vendor_document_id SET DEFAULT nextval('master.vendor_document_vendor_document_id_seq'::regclass);


--
-- TOC entry 5399 (class 2604 OID 26699)
-- Name: reimbursement_invoice reimbursement_invoice_id; Type: DEFAULT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice ALTER COLUMN reimbursement_invoice_id SET DEFAULT nextval('oem.reimbursement_invoice_reimbursement_invoice_id_seq'::regclass);


--
-- TOC entry 5401 (class 2604 OID 26700)
-- Name: reimbursement_line reimbursement_line_id; Type: DEFAULT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line ALTER COLUMN reimbursement_line_id SET DEFAULT nextval('oem.reimbursement_line_reimbursement_line_id_seq'::regclass);


--
-- TOC entry 5394 (class 2604 OID 26701)
-- Name: spare_purchase spare_purchase_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase ALTER COLUMN spare_purchase_id SET DEFAULT nextval('procurement.spare_purchase_spare_purchase_id_seq'::regclass);


--
-- TOC entry 5397 (class 2604 OID 26702)
-- Name: spare_purchase_item purchase_item_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item ALTER COLUMN purchase_item_id SET DEFAULT nextval('procurement.spare_purchase_item_purchase_item_id_seq'::regclass);


--
-- TOC entry 5342 (class 2604 OID 26703)
-- Name: vehicle_purchase vehicle_purchase_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase ALTER COLUMN vehicle_purchase_id SET DEFAULT nextval('procurement.vehicle_purchase_vehicle_purchase_id_seq'::regclass);


--
-- TOC entry 5345 (class 2604 OID 26704)
-- Name: vehicle_purchase_detail vehicle_purchase_detail_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail ALTER COLUMN vehicle_purchase_detail_id SET DEFAULT nextval('procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq'::regclass);


--
-- TOC entry 5539 (class 2604 OID 27882)
-- Name: report report_id; Type: DEFAULT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report ALTER COLUMN report_id SET DEFAULT nextval('reports.report_report_id_seq'::regclass);


--
-- TOC entry 5540 (class 2604 OID 27907)
-- Name: report_execution execution_id; Type: DEFAULT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report_execution ALTER COLUMN execution_id SET DEFAULT nextval('reports.report_execution_execution_id_seq'::regclass);


--
-- TOC entry 5475 (class 2604 OID 26705)
-- Name: delivery_checklist checklist_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist ALTER COLUMN checklist_id SET DEFAULT nextval('sales.delivery_checklist_checklist_id_seq'::regclass);


--
-- TOC entry 5474 (class 2604 OID 26706)
-- Name: payment_receipt receipt_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt ALTER COLUMN receipt_id SET DEFAULT nextval('sales.payment_receipt_receipt_id_seq'::regclass);


--
-- TOC entry 5470 (class 2604 OID 26707)
-- Name: sale sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale ALTER COLUMN sale_id SET DEFAULT nextval('sales.sale_sale_id_seq'::regclass);


--
-- TOC entry 5494 (class 2604 OID 26856)
-- Name: sale_document sale_document_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_document ALTER COLUMN sale_document_id SET DEFAULT nextval('sales.sale_document_sale_document_id_seq'::regclass);


--
-- TOC entry 5491 (class 2604 OID 26828)
-- Name: sale_payment sale_payment_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_payment ALTER COLUMN sale_payment_id SET DEFAULT nextval('sales.sale_payment_sale_payment_id_seq'::regclass);


--
-- TOC entry 5498 (class 2604 OID 26884)
-- Name: sale_portal_tracking portal_tracking_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_portal_tracking ALTER COLUMN portal_tracking_id SET DEFAULT nextval('sales.sale_portal_tracking_portal_tracking_id_seq'::regclass);


--
-- TOC entry 5489 (class 2604 OID 26804)
-- Name: sale_stage_history stage_history_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_stage_history ALTER COLUMN stage_history_id SET DEFAULT nextval('sales.sale_stage_history_stage_history_id_seq'::regclass);


--
-- TOC entry 5476 (class 2604 OID 26708)
-- Name: service_schedule schedule_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule ALTER COLUMN schedule_id SET DEFAULT nextval('sales.service_schedule_schedule_id_seq'::regclass);


--
-- TOC entry 5440 (class 2604 OID 26709)
-- Name: spare_sale spare_sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale ALTER COLUMN spare_sale_id SET DEFAULT nextval('sales.spare_sale_spare_sale_id_seq'::regclass);


--
-- TOC entry 5442 (class 2604 OID 26710)
-- Name: spare_sale_detail spare_sale_detail_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail ALTER COLUMN spare_sale_detail_id SET DEFAULT nextval('sales.spare_sale_detail_spare_sale_detail_id_seq'::regclass);


--
-- TOC entry 5353 (class 2604 OID 26711)
-- Name: vehicle_payment vehicle_payment_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment ALTER COLUMN vehicle_payment_id SET DEFAULT nextval('sales.vehicle_payment_vehicle_payment_id_seq'::regclass);


--
-- TOC entry 5434 (class 2604 OID 26712)
-- Name: vehicle_registration vehicle_registration_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration ALTER COLUMN vehicle_registration_id SET DEFAULT nextval('sales.vehicle_registration_vehicle_registration_id_seq'::regclass);


--
-- TOC entry 5347 (class 2604 OID 26713)
-- Name: vehicle_sale vehicle_sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale ALTER COLUMN vehicle_sale_id SET DEFAULT nextval('sales.vehicle_sale_vehicle_sale_id_seq'::regclass);


--
-- TOC entry 5351 (class 2604 OID 26714)
-- Name: vehicle_sale_finance vehicle_sale_finance_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance ALTER COLUMN vehicle_sale_finance_id SET DEFAULT nextval('sales.vehicle_sale_finance_vehicle_sale_finance_id_seq'::regclass);


--
-- TOC entry 5361 (class 2604 OID 26715)
-- Name: job_card job_card_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card ALTER COLUMN job_card_id SET DEFAULT nextval('service.job_card_job_card_id_seq'::regclass);


--
-- TOC entry 5365 (class 2604 OID 26716)
-- Name: job_labour job_labour_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour ALTER COLUMN job_labour_id SET DEFAULT nextval('service.job_labour_job_labour_id_seq'::regclass);


--
-- TOC entry 5371 (class 2604 OID 26717)
-- Name: job_spare job_spare_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare ALTER COLUMN job_spare_id SET DEFAULT nextval('service.job_spare_job_spare_id_seq'::regclass);


--
-- TOC entry 5363 (class 2604 OID 26718)
-- Name: job_work_item work_item_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item ALTER COLUMN work_item_id SET DEFAULT nextval('service.job_work_item_work_item_id_seq'::regclass);


--
-- TOC entry 5507 (class 2604 OID 26914)
-- Name: service_followup service_followup_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_followup ALTER COLUMN service_followup_id SET DEFAULT nextval('service.service_followup_service_followup_id_seq'::regclass);


--
-- TOC entry 5436 (class 2604 OID 26719)
-- Name: service_schedule service_schedule_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule ALTER COLUMN service_schedule_id SET DEFAULT nextval('service.service_schedule_service_schedule_id_seq'::regclass);


--
-- TOC entry 5367 (class 2604 OID 26720)
-- Name: vehicle_component_change component_change_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change ALTER COLUMN component_change_id SET DEFAULT nextval('service.vehicle_component_change_component_change_id_seq'::regclass);


--
-- TOC entry 5438 (class 2604 OID 26721)
-- Name: vehicle_service_summary vehicle_service_summary_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary ALTER COLUMN vehicle_service_summary_id SET DEFAULT nextval('service.vehicle_service_summary_vehicle_service_summary_id_seq'::regclass);


--
-- TOC entry 5374 (class 2604 OID 26722)
-- Name: claim claim_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim ALTER COLUMN claim_id SET DEFAULT nextval('warranty.claim_claim_id_seq'::regclass);


--
-- TOC entry 5403 (class 2604 OID 26723)
-- Name: inward warranty_inward_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward ALTER COLUMN warranty_inward_id SET DEFAULT nextval('warranty.inward_warranty_inward_id_seq'::regclass);


--
-- TOC entry 5405 (class 2604 OID 26724)
-- Name: inward_item inward_item_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item ALTER COLUMN inward_item_id SET DEFAULT nextval('warranty.inward_item_inward_item_id_seq'::regclass);


--
-- TOC entry 5369 (class 2604 OID 26725)
-- Name: shipment shipment_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment ALTER COLUMN shipment_id SET DEFAULT nextval('warranty.shipment_shipment_id_seq'::regclass);


--
-- TOC entry 5376 (class 2604 OID 26726)
-- Name: shipment_item shipment_item_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item ALTER COLUMN shipment_item_id SET DEFAULT nextval('warranty.shipment_item_shipment_item_id_seq'::regclass);


--
-- TOC entry 6566 (class 0 OID 28051)
-- Dependencies: 398
-- Data for Name: logs; Type: TABLE DATA; Schema: audit; Owner: postgres
--

INSERT INTO audit.logs VALUES (1, 1, 'TEST_ACTION_184835', 'TEST', '123', '{"foo": "bar"}', '127.0.0.1', NULL, '2026-02-18 13:18:35.781537');


--
-- TOC entry 6564 (class 0 OID 28035)
-- Dependencies: 396
-- Data for Name: token_blacklist; Type: TABLE DATA; Schema: auth; Owner: postgres
--

INSERT INTO auth.token_blacklist VALUES ('cf0e0cfb-22e9-4837-a4d9-45a1247dfd5e', 'REFRESH', 3, '2026-02-24 16:56:49+05:30', '2026-02-17 22:26:53.941701+05:30');
INSERT INTO auth.token_blacklist VALUES ('e40eba8a-afea-4220-938a-fbd299307f57', 'ACCESS', 3, '2026-02-17 20:56:53+05:30', '2026-02-17 22:26:58.075708+05:30');
INSERT INTO auth.token_blacklist VALUES ('3210f5cd-6b3e-47b4-a328-bf0036dd5ae2', 'REFRESH', 3, '2026-02-24 16:56:53+05:30', '2026-02-17 22:26:58.075708+05:30');
INSERT INTO auth.token_blacklist VALUES ('328a9b92-b80a-40bc-bfd6-d032ecf2b83b', 'REFRESH', 3, '2026-02-24 16:58:03+05:30', '2026-02-17 22:28:07.396134+05:30');
INSERT INTO auth.token_blacklist VALUES ('c312b490-b801-4399-b020-426ace81012f', 'ACCESS', 3, '2026-02-17 20:58:07+05:30', '2026-02-17 22:28:11.504474+05:30');
INSERT INTO auth.token_blacklist VALUES ('a1324b3f-5a98-48a1-80da-5addfd806f8e', 'REFRESH', 3, '2026-02-24 16:58:07+05:30', '2026-02-17 22:28:11.504474+05:30');
INSERT INTO auth.token_blacklist VALUES ('ce44b2c3-dc40-4065-9f97-dec375fa234c', 'REFRESH', 3, '2026-02-24 16:59:13+05:30', '2026-02-17 22:29:17.417243+05:30');
INSERT INTO auth.token_blacklist VALUES ('0cea5237-0536-4be9-a232-58841bcd5e98', 'ACCESS', 3, '2026-02-17 20:59:17+05:30', '2026-02-17 22:29:21.536904+05:30');
INSERT INTO auth.token_blacklist VALUES ('ce3ba213-6e53-43c8-990b-dcc785f16d78', 'REFRESH', 3, '2026-02-24 16:59:17+05:30', '2026-02-17 22:29:21.536904+05:30');
INSERT INTO auth.token_blacklist VALUES ('4cdd111d-8ac3-4d96-a091-025001acb47d', 'REFRESH', 3, '2026-02-24 17:01:58+05:30', '2026-02-17 22:32:02.75732+05:30');
INSERT INTO auth.token_blacklist VALUES ('f7b8c6ef-9ff7-461c-b93f-0c7c96c57faa', 'ACCESS', 3, '2026-02-17 21:02:02+05:30', '2026-02-17 22:32:06.838835+05:30');
INSERT INTO auth.token_blacklist VALUES ('aa111d05-efdf-4693-a768-5a6d477acfeb', 'REFRESH', 3, '2026-02-24 17:02:02+05:30', '2026-02-17 22:32:06.838835+05:30');


--
-- TOC entry 6456 (class 0 OID 25389)
-- Dependencies: 287
-- Data for Name: insurance_estimate; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 6452 (class 0 OID 25331)
-- Dependencies: 283
-- Data for Name: invoice; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 6454 (class 0 OID 25364)
-- Dependencies: 285
-- Data for Name: invoice_line; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 6406 (class 0 OID 24697)
-- Dependencies: 237
-- Data for Name: message_log; Type: TABLE DATA; Schema: communication; Owner: postgres
--



--
-- TOC entry 6405 (class 0 OID 24694)
-- Dependencies: 236
-- Data for Name: reminder; Type: TABLE DATA; Schema: communication; Owner: postgres
--



--
-- TOC entry 6510 (class 0 OID 26369)
-- Dependencies: 342
-- Data for Name: enquiry; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6516 (class 0 OID 26427)
-- Dependencies: 348
-- Data for Name: enquiry_status_master; Type: TABLE DATA; Schema: crm; Owner: postgres
--

INSERT INTO crm.enquiry_status_master VALUES (1, 'ACTIVE', 1);
INSERT INTO crm.enquiry_status_master VALUES (2, 'INACTIVE', 2);
INSERT INTO crm.enquiry_status_master VALUES (3, 'CONVERTED', 3);
INSERT INTO crm.enquiry_status_master VALUES (4, 'LOST', 4);


--
-- TOC entry 6484 (class 0 OID 25832)
-- Dependencies: 315
-- Data for Name: followup_schedule; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6478 (class 0 OID 25746)
-- Dependencies: 309
-- Data for Name: lead; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6482 (class 0 OID 25804)
-- Dependencies: 313
-- Data for Name: lead_activity; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6488 (class 0 OID 25911)
-- Dependencies: 319
-- Data for Name: lead_assignment_history; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6535 (class 0 OID 26774)
-- Dependencies: 367
-- Data for Name: lead_followup; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6480 (class 0 OID 25779)
-- Dependencies: 311
-- Data for Name: lead_status_history; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6514 (class 0 OID 26415)
-- Dependencies: 346
-- Data for Name: lead_status_master; Type: TABLE DATA; Schema: crm; Owner: postgres
--

INSERT INTO crm.lead_status_master VALUES (1, 'NEW', 1);
INSERT INTO crm.lead_status_master VALUES (2, 'HOT', 2);
INSERT INTO crm.lead_status_master VALUES (3, 'WARM', 3);
INSERT INTO crm.lead_status_master VALUES (4, 'COLD', 4);
INSERT INTO crm.lead_status_master VALUES (5, 'CONVERTED', 5);
INSERT INTO crm.lead_status_master VALUES (6, 'LOST', 6);
INSERT INTO crm.lead_status_master VALUES (7, 'DROPPED', 7);


--
-- TOC entry 6486 (class 0 OID 25880)
-- Dependencies: 317
-- Data for Name: test_ride; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6568 (class 0 OID 28069)
-- Dependencies: 400
-- Data for Name: gl_account; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6570 (class 0 OID 28113)
-- Dependencies: 402
-- Data for Name: gl_journal; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6572 (class 0 OID 28156)
-- Dependencies: 404
-- Data for Name: gl_journal_entry; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6506 (class 0 OID 26304)
-- Dependencies: 338
-- Data for Name: vehicle_loan; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6508 (class 0 OID 26328)
-- Dependencies: 340
-- Data for Name: vehicle_subsidy; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6500 (class 0 OID 26168)
-- Dependencies: 331
-- Data for Name: attendance; Type: TABLE DATA; Schema: hr; Owner: postgres
--



--
-- TOC entry 6502 (class 0 OID 26194)
-- Dependencies: 333
-- Data for Name: salary; Type: TABLE DATA; Schema: hr; Owner: postgres
--



--
-- TOC entry 6432 (class 0 OID 25079)
-- Dependencies: 263
-- Data for Name: insurance_company; Type: TABLE DATA; Schema: insurance; Owner: postgres
--

INSERT INTO insurance.insurance_company VALUES (1, 'ICICI Lombard', '18002661122', 'support@icicilombard.com', true, '2026-01-23 22:10:30.208459');
INSERT INTO insurance.insurance_company VALUES (2, 'HDFC ERGO', '18002670000', 'support@hdfcergo.com', true, '2026-01-23 22:10:30.208459');
INSERT INTO insurance.insurance_company VALUES (3, 'Bajaj Allianz', '18002090144', 'support@bajajallianz.co.in', true, '2026-01-23 22:10:30.208459');


--
-- TOC entry 6547 (class 0 OID 26931)
-- Dependencies: 379
-- Data for Name: insurance_followup; Type: TABLE DATA; Schema: insurance; Owner: postgres
--



--
-- TOC entry 6434 (class 0 OID 25094)
-- Dependencies: 265
-- Data for Name: policy; Type: TABLE DATA; Schema: insurance; Owner: postgres
--



--
-- TOC entry 6460 (class 0 OID 25434)
-- Dependencies: 291
-- Data for Name: spare_master; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6474 (class 0 OID 25597)
-- Dependencies: 305
-- Data for Name: spare_serial; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6458 (class 0 OID 25411)
-- Dependencies: 289
-- Data for Name: spare_stock_movement; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6504 (class 0 OID 26263)
-- Dependencies: 336
-- Data for Name: vehicle_stock_movement; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6557 (class 0 OID 27534)
-- Dependencies: 389
-- Data for Name: bank; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6518 (class 0 OID 26439)
-- Dependencies: 350
-- Data for Name: brand; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.brand VALUES (19, 'RegBrand_5WR6LX_Upd', '2026-02-17 00:47:23.367515', false, '2026-02-17 00:47:23.218444', '2026-02-17 00:47:23.240581', 2, 2, true, 2, NULL, NULL);
INSERT INTO master.brand VALUES (20, 'RegBrand_1ECXMT_Upd', '2026-02-17 00:48:15.379892', false, '2026-02-17 00:48:15.168889', '2026-02-17 00:48:15.181923', 2, 2, true, 2, NULL, NULL);
INSERT INTO master.brand VALUES (21, 'RegBrand_RWF0Q8_Upd', '2026-02-17 00:59:21.378268', false, '2026-02-17 00:59:21.16048', '2026-02-17 00:59:21.17421', 2, 2, true, 2, NULL, NULL);
INSERT INTO master.brand VALUES (18, 'RegBrand_EDOWOR_Upd', '2026-02-17 01:02:43.600851', false, '2026-02-17 00:45:01.853885', '2026-02-17 00:45:01.866997', 2, 2, true, 2, NULL, NULL);
INSERT INTO master.brand VALUES (16, 'RegBrand_0LCEB9_Upd', '2026-02-17 01:02:46.492875', false, '2026-02-17 00:31:06.62606', '2026-02-17 00:31:06.654926', 2, 2, true, 2, NULL, NULL);


--
-- TOC entry 6574 (class 0 OID 28180)
-- Dependencies: 406
-- Data for Name: color; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6404 (class 0 OID 24595)
-- Dependencies: 235
-- Data for Name: customer; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.customer VALUES ('INDIVIDUAL', 'Reg Customer 0LCEB9', NULL, '4400659585', NULL, 'Test Address', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-16 19:01:06.70863', true, 1, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLQwwiMvIq5j3YrI_-XyHzS2_UTtYDTwO60BJHHA3gezOJFevHNIbsngE6vhjjqJgJu8cOagCeqXa2J7ubHm8Xfw==', '3c1ce408cb8b0ec333d22f8cf90e5d38c95c64f21d157633274b1980113fef4e', NULL, NULL);
INSERT INTO master.customer VALUES ('INDIVIDUAL', 'Reg Customer EDOWOR', NULL, '7067166544', NULL, 'Test Address', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-16 19:15:01.902513', true, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLpiv-rLAbj4HuzLtf7qRC-EOqPSuUCQTs5yq0hPaAar4-lxNVgjS3V_4XQWUq6gk2eD-FZGpu7AC9I26aA_uX_Q==', '3089de4a9bc83431941a0ee888c0f9c12fdc53229ee03e713c6cc2331f600b2e', NULL, NULL);
INSERT INTO master.customer VALUES ('INDIVIDUAL', 'Reg Customer 5WR6LX', NULL, '7867919059', NULL, 'Test Address', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-16 19:17:23.295189', true, 3, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLWro_Rt02KbEHs-RGgY39PfZzkducUS0aWTi3wElwAhK_kPsKKzvSqvwRT8I_7VpGsmNcLGNzS7sR3dUISPByBg==', 'e09d2471b0032d0a2c5a9c0639506cc39e0ca2494f767ae0d6a6519ecb640ae0', NULL, NULL);
INSERT INTO master.customer VALUES ('INDIVIDUAL', 'Reg Customer 1ECXMT', NULL, '9045842129', NULL, 'Test Address', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-16 19:18:15.218192', true, 4, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLUUb5Wn7BnxwpPiJT_RlaYE2NqTO2qF_TjU86JtHDDX1R5zb9ZOIZHBdZxszBZd-A8I6NVKl0Bh79lqzRaQ6SXw==', '9234b6a685e6be1645892480cc2259adc276c54fb6816a5fc97668d418c970b8', NULL, NULL);
INSERT INTO master.customer VALUES ('INDIVIDUAL', 'Reg Customer RWF0Q8', NULL, '4873779679', NULL, 'Test Address', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '2026-02-16 19:29:21.213414', true, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLVisFQV0trgtLHM75sITTDom4Syymo0vPw1MxNP9nlYJy9mH8uuOT96sNJL4JOW9UaLLy5gK0haD_cSW-WVuJDA==', 'e6b29b72e1784e0912b0f07775852515c32c2d881431e73aa9c0998dda588fb0', NULL, NULL);


--
-- TOC entry 6411 (class 0 OID 24752)
-- Dependencies: 242
-- Data for Name: customer_document; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6409 (class 0 OID 24729)
-- Dependencies: 240
-- Data for Name: customer_phone; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6559 (class 0 OID 27559)
-- Dependencies: 391
-- Data for Name: document_type; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6551 (class 0 OID 27456)
-- Dependencies: 383
-- Data for Name: expense_category; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6555 (class 0 OID 27508)
-- Dependencies: 387
-- Data for Name: insurance_company; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6553 (class 0 OID 27482)
-- Dependencies: 385
-- Data for Name: job_card_category; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6512 (class 0 OID 26393)
-- Dependencies: 344
-- Data for Name: nominee; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.nominee VALUES (1, 1, 'Nominee 1', '2000-01-01', 'Spouse', true, true, '2026-02-16 19:01:06.74391', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.nominee VALUES (2, 2, 'Nominee 1', '2000-01-01', 'Spouse', true, true, '2026-02-16 19:15:01.927801', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.nominee VALUES (3, 3, 'Nominee 1', '2000-01-01', 'Spouse', true, true, '2026-02-16 19:17:23.331962', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.nominee VALUES (4, 4, 'Nominee 1', '2000-01-01', 'Spouse', true, true, '2026-02-16 19:18:15.244208', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.nominee VALUES (5, 5, 'Nominee 1', '2000-01-01', 'Spouse', true, true, '2026-02-16 19:29:21.23669', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 6549 (class 0 OID 27430)
-- Dependencies: 381
-- Data for Name: payment_mode; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.payment_mode VALUES (4, 'UPI', NULL, true, '2026-02-17 00:35:52.739117', NULL, 2, NULL, false, NULL, NULL, NULL, NULL);
INSERT INTO master.payment_mode VALUES (5, 'Cash', NULL, true, '2026-02-17 00:35:59.5954', NULL, 2, NULL, false, NULL, NULL, NULL, NULL);
INSERT INTO master.payment_mode VALUES (6, 'Card', NULL, true, '2026-02-17 00:36:05.138048', NULL, 2, NULL, false, NULL, NULL, NULL, NULL);


--
-- TOC entry 6533 (class 0 OID 26747)
-- Dependencies: 365
-- Data for Name: pin_reset_request; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.pin_reset_request VALUES (1, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 15:37:40.369494', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (2, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:08:06.095421', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (3, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:11:08.23802', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (4, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:17:18.29892', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (5, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:22:59.33325', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (6, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:24:33.264426', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (7, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-16 13:29:25.717972', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (8, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-16 16:21:08.869387', NULL, NULL);
INSERT INTO master.pin_reset_request VALUES (9, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-18 16:16:09.447733', NULL, NULL);


--
-- TOC entry 6528 (class 0 OID 26603)
-- Dependencies: 360
-- Data for Name: spare_price_history; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6476 (class 0 OID 25700)
-- Dependencies: 307
-- Data for Name: staff; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.staff VALUES (2, 'System Admin', '9999999999', 'admin@showroom.local', 'ADMIN', true, '2026-01-23', '2026-01-23 22:14:28.121998', '000000000000', 'AAAAA0000A', '000000000000', 'N/A', 'N/A', '$argon2id$v=19$m=65536,t=3,p=4$uHfu3ZvT2luL0Rqj1LoXYg$Q8JlpQMtR+HvUvWyVsVL3LKpEKshXqYWwRx1213JjJg', NULL, false, 0, NULL, NULL, '2026-02-16 16:20:51.347172', NULL, 'gAAAAABplZ5puDCqkK39Y4wNa8e65xK26FqMFWuoUMWrf2MN9fV8YpGO6keDcgchbapBryY8ru-1kZ1Eu7Oz6fOr2MGgcexCuYHgMuZUBVM2BFD3klqlri96I_fUcqtqr5L_gekDdS0H', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLaU3DuBJ0cqgQ_yMlAgTy4xpHKVxtJuVEVHIOkOzED3LYqp8TDlgPKAxQVVV0sYrH8eB3L1sqzco2gajzxNQL0Q==', 'ce3a598687c8d2e5aa6bedad20e059b4a78cca0adad7e563b07998d5cd226b8c', 'gAAAAABplcHL6PrGuAYQe-yEB7HADZWYJvb0HLv071QS_8fT36dcBieNgB65_8URLmDVo6yPNCrgZifcPgOO8qI7Y0uYPHMeTMbmr1B5strhzp0xGLJAeH8=', 'b77f40288014e799ff7fc95b0763b7d9a23a7bff3ffbb09c4099d11238647e07');
INSERT INTO master.staff VALUES (10, 'Reg Staff RWF0Q8', '2816552590', 'staffRWF0Q8@test.com', 'STAFF', false, '2026-02-01', '2026-02-16 19:29:21.343664', '322279049218', NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$4Nxba20NIQQgZGwNAUBIaQ$TlDveFcjacl17MsJpm3jZtVvwkE+IO1vW42SpVY8yj8', NULL, true, 0, NULL, NULL, NULL, '2026-02-16 19:33:03.922293', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 2, '2026-02-16 19:33:03.924845', NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLOQ23aTyJP1ou3vrB3t1QV1jXkbuS8y4qexRx6viikPnqT8QOA6mQ5Hv_bmAarULrsxduYq5DBRaOD68LeFk0lw==', '58735df0b136f28a2c01c36de37433420f46ceb6a2d04be10c328495985c7288', 'gAAAAABplcHL5ppJ4pnvc-TzrIMvsX2k3cpjwHyBCZW1Zgo7tYDh2bGK72FGg-3kLmu_owy05C-PgbUJ4BdW95JMSrTgaJpKbM0IhkalcQIw0ZfUjOPWToY=', '4bf5a83de47cf909adc1eac34c6fe15fe3161d3e1ef52e6c6e597c13af4ef81e');
INSERT INTO master.staff VALUES (9, 'Reg Staff 1ECXMT', '3542944398', 'staff1ECXMT@test.com', 'STAFF', false, '2026-02-01', '2026-02-16 19:18:15.344613', '673866174334', NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$SYlxbi2F8J4TYgyhVMp5zw$6durwIvzuY6K46xHZRCCkP47QcXoPWWFvJ5kQwnICCM', NULL, true, 0, NULL, NULL, NULL, '2026-02-17 08:43:34.173236', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 2, '2026-02-17 08:43:34.174572', NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLcDjFZP7Q3e5eO-Weod7RfNBoci0cMfSUJYPfr2AhZGX-SO1F9GSdhXx58dFudFZBamtm0Xubcs3Az0d6sz0gxQ==', 'a8720a386aa287148783acf4c55db74c45e154df5d579b53dfde7857f58ce175', 'gAAAAABplcHLu-jrBRTqkXK5V1atmrKdjX7PsWGUGCn7MdPrrhuTHBQsfCgBvm9FRMX7rLCEBG4TP82rnhKFo6K3Rkz_lDIa6ekQ8acH6CIQ30HMefOYI2s=', 'b9480238cfbb517e8464f5618033499f08f2a066262d73945cdc2a31652a13e4');
INSERT INTO master.staff VALUES (3, 'Test Staff One', '9876543210', 'teststaff1@gmail.com', 'STAFF', true, '2026-01-27', '2026-01-28 23:02:00.083443', '123412341234', NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$MeZ8j9G6d85Zq1WqdW7NGQ$vruMrGthAYEHaeY0F4E+W2cTD7Pikma/pJaCZTa4DRE', 'teststaff@upi', true, 0, NULL, NULL, '2026-02-18 16:17:15.332246', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'gAAAAABplcHLQdtFEXZZvcHREkrYfua4-tv53VnuhEmXM2Fg1Y-nFOaaUL430t4-999K0QYIz0uBUxvBlCfUees5qOio91JC0g==', '7619ee8cea49187f309616e30ecf54be072259b43760f1f550a644945d5572f2', 'gAAAAABplcHLw_cgz7zCR_1BC-IhR61_DA0XcCjoNpHknpyrCo65mR2Op11H7zydweIZmcJrt23CVMUSYVzOeQu4bS6LhBtoyjO9D6s68ZAwNmS-uP16VGU=', '404c011e52c785e945347f8c123a98e3ae2b2d2c8420630661dd06a38e6ea871');
INSERT INTO master.staff VALUES (5, 'Dealer 1', '9874598745', 'dealer1@gmail.com', 'DEALER', true, '2026-02-12', '2026-02-12 09:22:00.746065', '123456781234', '', '', '', '', '$argon2id$v=19$m=65536,t=3,p=4$J+Q8h/C+N0aI0ZrT2tt7zw$fgHTgp3mIezxcAQ+maIvwVnEbcPCLSrmbbYjdv8n2Nw', '', false, 0, NULL, NULL, '2026-02-17 01:03:45.963782', '2026-02-18 10:33:07.913035', 'gAAAAABplZ5p8KoBdfvrPfljYr0IOsHgiFgFQIW21opkAIJeVe6f88nMAT_yMs69b6-oBiQxcH94ElzR_IHo_jwVYVm2bpnfIYSgU6kltNWRD1lPceO-NswJSaeLyoVIRniAANPcIgvX', NULL, NULL, '', NULL, '', '', '', NULL, '', '', false, 2, '2026-02-18 10:33:11.438979', NULL, NULL, NULL, '2026-02-18 10:33:11.437334', 2, 'gAAAAABplcHLs3jb-HtDcmau_aiLTpvg_Nv6_poBoz8TPopthSXRiVDCzqy1BdwHe41fzQCgBa6cPdsavg_fj3lNe1okRppitg==', '65d235f941ffc88d2b786c5b9217a84f8279b07617ea85f4c366b839b8df37fc', 'gAAAAABplcHLzKVD5F42YeEd-lzla4gDyB48uKjWAaWorRvzmw3O180ba_J1-_qWGAGgyH2alynGxJDuktxoP0XL0edN8KxtlM_p2KwhpYRd-UGqH7JrTSU=', '5a51d42e75f41612b76608a525e8719e53adeb971be827e983ce3273b4cd3775');
INSERT INTO master.staff VALUES (36, 'Encryption Test User', '9988776655', 'enc_test@example.com', 'STAFF', false, NULL, '2026-02-17 18:00:16.285517', '123456789012', NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$SklJybnXmjNmjFFqzZlTyg$QJdW/2ylmUISKRk280sjP0uesFunrYOd/LPANFB2ON4', NULL, true, 0, NULL, NULL, NULL, '2026-02-17 18:00:16.318901', NULL, 10, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, true, 10, '2026-02-17 18:00:16.32265', 10, NULL, '{"_enc": "gAAAAABplKywcOb3LCGV8_6UxH3YFm6wC2UKOcAFxbJ0mP8sTOXiFrAnqMjbI0U_MN-fBXPEXAPb3k7zmJfzBwrejI__PdZRD8ifYQAaatIJJ66K1xTcTRAHZETWZkdVJWmqahwpU5_DS2l8SYj3K9dh9S5W21VnFcwnK8mLkjCywASeOKxCJwh577ukA4Odm8GqgH_B4d2OR0JhmUJQf6fTT1j5K_6VUCGRibxxD6fP22LLKSGTXxVjrVUrk6hfEA7QsdZS28WhNKlxkD6gn89SreSOowEjhDo0wjZyFEKC7rWQzBcKH7U="}', NULL, NULL, 'gAAAAABplcHLHQAPjOTAbL7wdcT4jFELSEjcQDv9_w_oi5tKhUU-7_REY5OATsZcKMTwTxdVp55NR6n9U6DM6m4NB_qwu5zJcA==', '0b940fdc24ec51a1e8e0d374324eb1ae36c8dd28309926f2bd97133da7f6523b', 'gAAAAABplcHLDP_cz_8IcUMrETboHVY5f1nut0c33VjElZmk6kj6TH9Fm6d7jdU3UWtI2jZq2z832_cfC3y0VAEll0IBxeO-wLd1Sjaao_6-I7ld7UL_wTQ=', 'd40ec404aedecffcaa71f240b01b32c269626c19a9a3d6f4f11df285ea6649ef');


--
-- TOC entry 6414 (class 0 OID 24794)
-- Dependencies: 245
-- Data for Name: vehicle; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.vehicle VALUES ('REG-CH-0LCEB9', 2, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'IN_STOCK', '2026-02-16 19:01:06.677801', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.vehicle VALUES ('REG-CH-EDOWOR', 3, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'IN_STOCK', '2026-02-16 19:15:01.882253', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.vehicle VALUES ('REG-CH-5WR6LX', 4, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'IN_STOCK', '2026-02-16 19:17:23.264608', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.vehicle VALUES ('REG-CH-1ECXMT', 5, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'IN_STOCK', '2026-02-16 19:18:15.197912', NULL, NULL, NULL, NULL, NULL, NULL);
INSERT INTO master.vehicle VALUES ('REG-CH-RWF0Q8', 6, NULL, NULL, NULL, NULL, NULL, '2026-01-01', 'IN_STOCK', '2026-02-16 19:29:21.192378', NULL, NULL, NULL, NULL, NULL, NULL);


--
-- TOC entry 6413 (class 0 OID 24777)
-- Dependencies: 244
-- Data for Name: vehicle_model; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.vehicle_model VALUES (2, 'RegModel_0LCEB9', 'MAT-0LCEB9', 'Red', 'Li-Ion', NULL, NULL, NULL, true, '2026-02-16 19:01:06.661527', NULL, NULL, NULL, NULL, 16, NULL, NULL);
INSERT INTO master.vehicle_model VALUES (3, 'RegModel_EDOWOR', 'MAT-EDOWOR', 'Red', 'Li-Ion', NULL, NULL, NULL, true, '2026-02-16 19:15:01.872235', NULL, NULL, NULL, NULL, 18, NULL, NULL);
INSERT INTO master.vehicle_model VALUES (4, 'RegModel_5WR6LX', 'MAT-5WR6LX', 'Red', 'Li-Ion', NULL, NULL, NULL, true, '2026-02-16 19:17:23.247125', NULL, NULL, NULL, NULL, 19, NULL, NULL);
INSERT INTO master.vehicle_model VALUES (5, 'RegModel_1ECXMT', 'MAT-1ECXMT', 'Red', 'Li-Ion', NULL, NULL, NULL, true, '2026-02-16 19:18:15.187015', NULL, NULL, NULL, NULL, 20, NULL, NULL);
INSERT INTO master.vehicle_model VALUES (6, 'RegModel_RWF0Q8', 'MAT-RWF0Q8', 'Red', 'Li-Ion', NULL, NULL, NULL, true, '2026-02-16 19:29:21.179724', NULL, NULL, NULL, NULL, 21, NULL, NULL);


--
-- TOC entry 6530 (class 0 OID 26630)
-- Dependencies: 362
-- Data for Name: vehicle_price_history; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6416 (class 0 OID 24864)
-- Dependencies: 247
-- Data for Name: vendor; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6418 (class 0 OID 24885)
-- Dependencies: 249
-- Data for Name: vendor_contact; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6420 (class 0 OID 24907)
-- Dependencies: 251
-- Data for Name: vendor_document; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6466 (class 0 OID 25502)
-- Dependencies: 297
-- Data for Name: reimbursement_invoice; Type: TABLE DATA; Schema: oem; Owner: postgres
--



--
-- TOC entry 6468 (class 0 OID 25523)
-- Dependencies: 299
-- Data for Name: reimbursement_line; Type: TABLE DATA; Schema: oem; Owner: postgres
--



--
-- TOC entry 6462 (class 0 OID 25457)
-- Dependencies: 293
-- Data for Name: spare_purchase; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6464 (class 0 OID 25476)
-- Dependencies: 295
-- Data for Name: spare_purchase_item; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6422 (class 0 OID 24929)
-- Dependencies: 253
-- Data for Name: vehicle_purchase; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6424 (class 0 OID 24949)
-- Dependencies: 255
-- Data for Name: vehicle_purchase_detail; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6531 (class 0 OID 26739)
-- Dependencies: 363
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.alembic_version VALUES ('493f5cd5953e');


--
-- TOC entry 6561 (class 0 OID 27879)
-- Dependencies: 393
-- Data for Name: report; Type: TABLE DATA; Schema: reports; Owner: postgres
--



--
-- TOC entry 6563 (class 0 OID 27904)
-- Dependencies: 395
-- Data for Name: report_execution; Type: TABLE DATA; Schema: reports; Owner: postgres
--



--
-- TOC entry 6524 (class 0 OID 26551)
-- Dependencies: 356
-- Data for Name: delivery_checklist; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6522 (class 0 OID 26527)
-- Dependencies: 354
-- Data for Name: payment_receipt; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6520 (class 0 OID 26475)
-- Dependencies: 352
-- Data for Name: sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6541 (class 0 OID 26853)
-- Dependencies: 373
-- Data for Name: sale_document; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6539 (class 0 OID 26825)
-- Dependencies: 371
-- Data for Name: sale_payment; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6543 (class 0 OID 26881)
-- Dependencies: 375
-- Data for Name: sale_portal_tracking; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6537 (class 0 OID 26801)
-- Dependencies: 369
-- Data for Name: sale_stage_history; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6526 (class 0 OID 26574)
-- Dependencies: 358
-- Data for Name: service_schedule; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6496 (class 0 OID 26114)
-- Dependencies: 327
-- Data for Name: spare_sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6498 (class 0 OID 26138)
-- Dependencies: 329
-- Data for Name: spare_sale_detail; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6430 (class 0 OID 25044)
-- Dependencies: 261
-- Data for Name: vehicle_payment; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6490 (class 0 OID 25958)
-- Dependencies: 321
-- Data for Name: vehicle_registration; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6426 (class 0 OID 24973)
-- Dependencies: 257
-- Data for Name: vehicle_sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6428 (class 0 OID 25027)
-- Dependencies: 259
-- Data for Name: vehicle_sale_finance; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6436 (class 0 OID 25130)
-- Dependencies: 267
-- Data for Name: job_card; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6440 (class 0 OID 25179)
-- Dependencies: 271
-- Data for Name: job_labour; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6446 (class 0 OID 25271)
-- Dependencies: 277
-- Data for Name: job_spare; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6438 (class 0 OID 25159)
-- Dependencies: 269
-- Data for Name: job_work_item; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6545 (class 0 OID 26911)
-- Dependencies: 377
-- Data for Name: service_followup; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6492 (class 0 OID 25980)
-- Dependencies: 323
-- Data for Name: service_schedule; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6442 (class 0 OID 25199)
-- Dependencies: 273
-- Data for Name: vehicle_component_change; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6494 (class 0 OID 26001)
-- Dependencies: 325
-- Data for Name: vehicle_service_summary; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6448 (class 0 OID 25290)
-- Dependencies: 279
-- Data for Name: claim; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6470 (class 0 OID 25557)
-- Dependencies: 301
-- Data for Name: inward; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6472 (class 0 OID 25573)
-- Dependencies: 303
-- Data for Name: inward_item; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6444 (class 0 OID 25256)
-- Dependencies: 275
-- Data for Name: shipment; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6450 (class 0 OID 25308)
-- Dependencies: 281
-- Data for Name: shipment_item; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6757 (class 0 OID 0)
-- Dependencies: 397
-- Name: logs_id_seq; Type: SEQUENCE SET; Schema: audit; Owner: postgres
--

SELECT pg_catalog.setval('audit.logs_id_seq', 1, true);


--
-- TOC entry 6758 (class 0 OID 0)
-- Dependencies: 286
-- Name: insurance_estimate_estimate_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.insurance_estimate_estimate_id_seq', 1, false);


--
-- TOC entry 6759 (class 0 OID 0)
-- Dependencies: 282
-- Name: invoice_invoice_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.invoice_invoice_id_seq', 1, false);


--
-- TOC entry 6760 (class 0 OID 0)
-- Dependencies: 284
-- Name: invoice_line_invoice_line_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.invoice_line_invoice_line_id_seq', 1, false);


--
-- TOC entry 6761 (class 0 OID 0)
-- Dependencies: 341
-- Name: enquiry_enquiry_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.enquiry_enquiry_id_seq', 1, false);


--
-- TOC entry 6762 (class 0 OID 0)
-- Dependencies: 347
-- Name: enquiry_status_master_status_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.enquiry_status_master_status_id_seq', 4, true);


--
-- TOC entry 6763 (class 0 OID 0)
-- Dependencies: 314
-- Name: followup_schedule_followup_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.followup_schedule_followup_id_seq', 1, false);


--
-- TOC entry 6764 (class 0 OID 0)
-- Dependencies: 312
-- Name: lead_activity_activity_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_activity_activity_id_seq', 1, false);


--
-- TOC entry 6765 (class 0 OID 0)
-- Dependencies: 318
-- Name: lead_assignment_history_assignment_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_assignment_history_assignment_id_seq', 1, false);


--
-- TOC entry 6766 (class 0 OID 0)
-- Dependencies: 366
-- Name: lead_followup_lead_followup_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_followup_lead_followup_id_seq', 1, false);


--
-- TOC entry 6767 (class 0 OID 0)
-- Dependencies: 308
-- Name: lead_lead_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_lead_id_seq', 1, false);


--
-- TOC entry 6768 (class 0 OID 0)
-- Dependencies: 310
-- Name: lead_status_history_status_history_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_status_history_status_history_id_seq', 1, false);


--
-- TOC entry 6769 (class 0 OID 0)
-- Dependencies: 345
-- Name: lead_status_master_status_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_status_master_status_id_seq', 7, true);


--
-- TOC entry 6770 (class 0 OID 0)
-- Dependencies: 316
-- Name: test_ride_test_ride_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.test_ride_test_ride_id_seq', 1, false);


--
-- TOC entry 6771 (class 0 OID 0)
-- Dependencies: 399
-- Name: gl_account_account_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.gl_account_account_id_seq', 45, true);


--
-- TOC entry 6772 (class 0 OID 0)
-- Dependencies: 403
-- Name: gl_journal_entry_entry_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.gl_journal_entry_entry_id_seq', 1, false);


--
-- TOC entry 6773 (class 0 OID 0)
-- Dependencies: 401
-- Name: gl_journal_journal_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.gl_journal_journal_id_seq', 1, false);


--
-- TOC entry 6774 (class 0 OID 0)
-- Dependencies: 337
-- Name: vehicle_loan_loan_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.vehicle_loan_loan_id_seq', 1, false);


--
-- TOC entry 6775 (class 0 OID 0)
-- Dependencies: 339
-- Name: vehicle_subsidy_subsidy_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.vehicle_subsidy_subsidy_id_seq', 1, false);


--
-- TOC entry 6776 (class 0 OID 0)
-- Dependencies: 330
-- Name: attendance_attendance_id_seq; Type: SEQUENCE SET; Schema: hr; Owner: postgres
--

SELECT pg_catalog.setval('hr.attendance_attendance_id_seq', 1, false);


--
-- TOC entry 6777 (class 0 OID 0)
-- Dependencies: 332
-- Name: salary_salary_id_seq; Type: SEQUENCE SET; Schema: hr; Owner: postgres
--

SELECT pg_catalog.setval('hr.salary_salary_id_seq', 1, false);


--
-- TOC entry 6778 (class 0 OID 0)
-- Dependencies: 262
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE SET; Schema: insurance; Owner: postgres
--

SELECT pg_catalog.setval('insurance.insurance_company_insurance_company_id_seq', 3, true);


--
-- TOC entry 6779 (class 0 OID 0)
-- Dependencies: 378
-- Name: insurance_followup_insurance_followup_id_seq; Type: SEQUENCE SET; Schema: insurance; Owner: postgres
--

SELECT pg_catalog.setval('insurance.insurance_followup_insurance_followup_id_seq', 1, false);


--
-- TOC entry 6780 (class 0 OID 0)
-- Dependencies: 264
-- Name: policy_policy_id_seq; Type: SEQUENCE SET; Schema: insurance; Owner: postgres
--

SELECT pg_catalog.setval('insurance.policy_policy_id_seq', 1, false);


--
-- TOC entry 6781 (class 0 OID 0)
-- Dependencies: 290
-- Name: spare_master_spare_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_master_spare_id_seq', 1, false);


--
-- TOC entry 6782 (class 0 OID 0)
-- Dependencies: 304
-- Name: spare_serial_spare_serial_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_serial_spare_serial_id_seq', 1, false);


--
-- TOC entry 6783 (class 0 OID 0)
-- Dependencies: 288
-- Name: spare_stock_movement_movement_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_stock_movement_movement_id_seq', 1, false);


--
-- TOC entry 6784 (class 0 OID 0)
-- Dependencies: 335
-- Name: vehicle_stock_movement_movement_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.vehicle_stock_movement_movement_id_seq', 1, false);


--
-- TOC entry 6785 (class 0 OID 0)
-- Dependencies: 388
-- Name: bank_bank_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.bank_bank_id_seq', 3, true);


--
-- TOC entry 6786 (class 0 OID 0)
-- Dependencies: 349
-- Name: brand_brand_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.brand_brand_id_seq', 21, true);


--
-- TOC entry 6787 (class 0 OID 0)
-- Dependencies: 405
-- Name: color_color_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.color_color_id_seq', 1, false);


--
-- TOC entry 6788 (class 0 OID 0)
-- Dependencies: 238
-- Name: customer_customer_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_customer_id_seq', 5, true);


--
-- TOC entry 6789 (class 0 OID 0)
-- Dependencies: 241
-- Name: customer_document_customer_document_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_document_customer_document_id_seq', 1, false);


--
-- TOC entry 6790 (class 0 OID 0)
-- Dependencies: 239
-- Name: customer_phone_customer_phone_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_phone_customer_phone_id_seq', 1, false);


--
-- TOC entry 6791 (class 0 OID 0)
-- Dependencies: 390
-- Name: document_type_document_type_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.document_type_document_type_id_seq', 3, true);


--
-- TOC entry 6792 (class 0 OID 0)
-- Dependencies: 382
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.expense_category_expense_category_id_seq', 3, true);


--
-- TOC entry 6793 (class 0 OID 0)
-- Dependencies: 386
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.insurance_company_insurance_company_id_seq', 3, true);


--
-- TOC entry 6794 (class 0 OID 0)
-- Dependencies: 384
-- Name: job_card_category_job_card_category_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.job_card_category_job_card_category_id_seq', 3, true);


--
-- TOC entry 6795 (class 0 OID 0)
-- Dependencies: 343
-- Name: nominee_nominee_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.nominee_nominee_id_seq', 5, true);


--
-- TOC entry 6796 (class 0 OID 0)
-- Dependencies: 380
-- Name: payment_mode_payment_mode_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.payment_mode_payment_mode_id_seq', 6, true);


--
-- TOC entry 6797 (class 0 OID 0)
-- Dependencies: 364
-- Name: pin_reset_request_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.pin_reset_request_id_seq', 9, true);


--
-- TOC entry 6798 (class 0 OID 0)
-- Dependencies: 359
-- Name: spare_price_history_history_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.spare_price_history_history_id_seq', 1, false);


--
-- TOC entry 6799 (class 0 OID 0)
-- Dependencies: 306
-- Name: staff_staff_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.staff_staff_id_seq', 40, true);


--
-- TOC entry 6800 (class 0 OID 0)
-- Dependencies: 243
-- Name: vehicle_model_vehicle_model_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vehicle_model_vehicle_model_id_seq', 6, true);


--
-- TOC entry 6801 (class 0 OID 0)
-- Dependencies: 361
-- Name: vehicle_price_history_history_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vehicle_price_history_history_id_seq', 1, false);


--
-- TOC entry 6802 (class 0 OID 0)
-- Dependencies: 248
-- Name: vendor_contact_vendor_contact_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_contact_vendor_contact_id_seq', 1, false);


--
-- TOC entry 6803 (class 0 OID 0)
-- Dependencies: 250
-- Name: vendor_document_vendor_document_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_document_vendor_document_id_seq', 1, false);


--
-- TOC entry 6804 (class 0 OID 0)
-- Dependencies: 246
-- Name: vendor_vendor_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_vendor_id_seq', 1, false);


--
-- TOC entry 6805 (class 0 OID 0)
-- Dependencies: 296
-- Name: reimbursement_invoice_reimbursement_invoice_id_seq; Type: SEQUENCE SET; Schema: oem; Owner: postgres
--

SELECT pg_catalog.setval('oem.reimbursement_invoice_reimbursement_invoice_id_seq', 1, false);


--
-- TOC entry 6806 (class 0 OID 0)
-- Dependencies: 298
-- Name: reimbursement_line_reimbursement_line_id_seq; Type: SEQUENCE SET; Schema: oem; Owner: postgres
--

SELECT pg_catalog.setval('oem.reimbursement_line_reimbursement_line_id_seq', 1, false);


--
-- TOC entry 6807 (class 0 OID 0)
-- Dependencies: 294
-- Name: spare_purchase_item_purchase_item_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.spare_purchase_item_purchase_item_id_seq', 1, false);


--
-- TOC entry 6808 (class 0 OID 0)
-- Dependencies: 292
-- Name: spare_purchase_spare_purchase_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.spare_purchase_spare_purchase_id_seq', 1, false);


--
-- TOC entry 6809 (class 0 OID 0)
-- Dependencies: 254
-- Name: vehicle_purchase_detail_vehicle_purchase_detail_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq', 1, false);


--
-- TOC entry 6810 (class 0 OID 0)
-- Dependencies: 252
-- Name: vehicle_purchase_vehicle_purchase_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.vehicle_purchase_vehicle_purchase_id_seq', 1, false);


--
-- TOC entry 6811 (class 0 OID 0)
-- Dependencies: 394
-- Name: report_execution_execution_id_seq; Type: SEQUENCE SET; Schema: reports; Owner: postgres
--

SELECT pg_catalog.setval('reports.report_execution_execution_id_seq', 1, false);


--
-- TOC entry 6812 (class 0 OID 0)
-- Dependencies: 392
-- Name: report_report_id_seq; Type: SEQUENCE SET; Schema: reports; Owner: postgres
--

SELECT pg_catalog.setval('reports.report_report_id_seq', 1, false);


--
-- TOC entry 6813 (class 0 OID 0)
-- Dependencies: 355
-- Name: delivery_checklist_checklist_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.delivery_checklist_checklist_id_seq', 1, false);


--
-- TOC entry 6814 (class 0 OID 0)
-- Dependencies: 353
-- Name: payment_receipt_receipt_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.payment_receipt_receipt_id_seq', 1, false);


--
-- TOC entry 6815 (class 0 OID 0)
-- Dependencies: 372
-- Name: sale_document_sale_document_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_document_sale_document_id_seq', 1, false);


--
-- TOC entry 6816 (class 0 OID 0)
-- Dependencies: 370
-- Name: sale_payment_sale_payment_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_payment_sale_payment_id_seq', 1, false);


--
-- TOC entry 6817 (class 0 OID 0)
-- Dependencies: 374
-- Name: sale_portal_tracking_portal_tracking_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_portal_tracking_portal_tracking_id_seq', 1, false);


--
-- TOC entry 6818 (class 0 OID 0)
-- Dependencies: 351
-- Name: sale_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_sale_id_seq', 1, false);


--
-- TOC entry 6819 (class 0 OID 0)
-- Dependencies: 368
-- Name: sale_stage_history_stage_history_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_stage_history_stage_history_id_seq', 1, false);


--
-- TOC entry 6820 (class 0 OID 0)
-- Dependencies: 357
-- Name: service_schedule_schedule_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.service_schedule_schedule_id_seq', 1, false);


--
-- TOC entry 6821 (class 0 OID 0)
-- Dependencies: 328
-- Name: spare_sale_detail_spare_sale_detail_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.spare_sale_detail_spare_sale_detail_id_seq', 1, false);


--
-- TOC entry 6822 (class 0 OID 0)
-- Dependencies: 326
-- Name: spare_sale_spare_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.spare_sale_spare_sale_id_seq', 1, false);


--
-- TOC entry 6823 (class 0 OID 0)
-- Dependencies: 260
-- Name: vehicle_payment_vehicle_payment_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_payment_vehicle_payment_id_seq', 1, false);


--
-- TOC entry 6824 (class 0 OID 0)
-- Dependencies: 320
-- Name: vehicle_registration_vehicle_registration_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_registration_vehicle_registration_id_seq', 1, false);


--
-- TOC entry 6825 (class 0 OID 0)
-- Dependencies: 258
-- Name: vehicle_sale_finance_vehicle_sale_finance_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_sale_finance_vehicle_sale_finance_id_seq', 1, false);


--
-- TOC entry 6826 (class 0 OID 0)
-- Dependencies: 256
-- Name: vehicle_sale_vehicle_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_sale_vehicle_sale_id_seq', 1, false);


--
-- TOC entry 6827 (class 0 OID 0)
-- Dependencies: 266
-- Name: job_card_job_card_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_card_job_card_id_seq', 1, false);


--
-- TOC entry 6828 (class 0 OID 0)
-- Dependencies: 270
-- Name: job_labour_job_labour_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_labour_job_labour_id_seq', 1, false);


--
-- TOC entry 6829 (class 0 OID 0)
-- Dependencies: 276
-- Name: job_spare_job_spare_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_spare_job_spare_id_seq', 1, false);


--
-- TOC entry 6830 (class 0 OID 0)
-- Dependencies: 268
-- Name: job_work_item_work_item_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_work_item_work_item_id_seq', 1, false);


--
-- TOC entry 6831 (class 0 OID 0)
-- Dependencies: 376
-- Name: service_followup_service_followup_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.service_followup_service_followup_id_seq', 1, false);


--
-- TOC entry 6832 (class 0 OID 0)
-- Dependencies: 322
-- Name: service_schedule_service_schedule_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.service_schedule_service_schedule_id_seq', 1, false);


--
-- TOC entry 6833 (class 0 OID 0)
-- Dependencies: 272
-- Name: vehicle_component_change_component_change_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.vehicle_component_change_component_change_id_seq', 1, false);


--
-- TOC entry 6834 (class 0 OID 0)
-- Dependencies: 324
-- Name: vehicle_service_summary_vehicle_service_summary_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.vehicle_service_summary_vehicle_service_summary_id_seq', 1, false);


--
-- TOC entry 6835 (class 0 OID 0)
-- Dependencies: 278
-- Name: claim_claim_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.claim_claim_id_seq', 1, false);


--
-- TOC entry 6836 (class 0 OID 0)
-- Dependencies: 302
-- Name: inward_item_inward_item_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.inward_item_inward_item_id_seq', 1, false);


--
-- TOC entry 6837 (class 0 OID 0)
-- Dependencies: 300
-- Name: inward_warranty_inward_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.inward_warranty_inward_id_seq', 1, false);


--
-- TOC entry 6838 (class 0 OID 0)
-- Dependencies: 280
-- Name: shipment_item_shipment_item_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.shipment_item_shipment_item_id_seq', 1, false);


--
-- TOC entry 6839 (class 0 OID 0)
-- Dependencies: 274
-- Name: shipment_shipment_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.shipment_shipment_id_seq', 1, false);


--
-- TOC entry 6060 (class 2606 OID 28062)
-- Name: logs logs_pkey; Type: CONSTRAINT; Schema: audit; Owner: postgres
--

ALTER TABLE ONLY audit.logs
    ADD CONSTRAINT logs_pkey PRIMARY KEY (id);


--
-- TOC entry 6058 (class 2606 OID 28044)
-- Name: token_blacklist token_blacklist_pkey; Type: CONSTRAINT; Schema: auth; Owner: postgres
--

ALTER TABLE ONLY auth.token_blacklist
    ADD CONSTRAINT token_blacklist_pkey PRIMARY KEY (jti);


--
-- TOC entry 5746 (class 2606 OID 25403)
-- Name: insurance_estimate insurance_estimate_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate
    ADD CONSTRAINT insurance_estimate_pkey PRIMARY KEY (estimate_id);


--
-- TOC entry 5743 (class 2606 OID 25382)
-- Name: invoice_line invoice_line_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line
    ADD CONSTRAINT invoice_line_pkey PRIMARY KEY (invoice_line_id);


--
-- TOC entry 5738 (class 2606 OID 25350)
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (invoice_id);


--
-- TOC entry 5740 (class 2606 OID 25352)
-- Name: invoice uq_billing_invoice_no; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT uq_billing_invoice_no UNIQUE (invoice_number);


--
-- TOC entry 5895 (class 2606 OID 26385)
-- Name: enquiry enquiry_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT enquiry_pkey PRIMARY KEY (enquiry_id);


--
-- TOC entry 5911 (class 2606 OID 26435)
-- Name: enquiry_status_master enquiry_status_master_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master
    ADD CONSTRAINT enquiry_status_master_pkey PRIMARY KEY (status_id);


--
-- TOC entry 5913 (class 2606 OID 26437)
-- Name: enquiry_status_master enquiry_status_master_status_name_key; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master
    ADD CONSTRAINT enquiry_status_master_status_name_key UNIQUE (status_name);


--
-- TOC entry 5829 (class 2606 OID 25847)
-- Name: followup_schedule followup_schedule_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT followup_schedule_pkey PRIMARY KEY (followup_id);


--
-- TOC entry 5827 (class 2606 OID 25819)
-- Name: lead_activity lead_activity_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT lead_activity_pkey PRIMARY KEY (activity_id);


--
-- TOC entry 5844 (class 2606 OID 25924)
-- Name: lead_assignment_history lead_assignment_history_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT lead_assignment_history_pkey PRIMARY KEY (assignment_id);


--
-- TOC entry 5964 (class 2606 OID 26789)
-- Name: lead_followup lead_followup_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_followup
    ADD CONSTRAINT lead_followup_pkey PRIMARY KEY (lead_followup_id);


--
-- TOC entry 5819 (class 2606 OID 25762)
-- Name: lead lead_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT lead_pkey PRIMARY KEY (lead_id);


--
-- TOC entry 5823 (class 2606 OID 25792)
-- Name: lead_status_history lead_status_history_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT lead_status_history_pkey PRIMARY KEY (status_history_id);


--
-- TOC entry 5907 (class 2606 OID 26423)
-- Name: lead_status_master lead_status_master_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master
    ADD CONSTRAINT lead_status_master_pkey PRIMARY KEY (status_id);


--
-- TOC entry 5909 (class 2606 OID 26425)
-- Name: lead_status_master lead_status_master_status_name_key; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master
    ADD CONSTRAINT lead_status_master_status_name_key UNIQUE (status_name);


--
-- TOC entry 5839 (class 2606 OID 25894)
-- Name: test_ride test_ride_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT test_ride_pkey PRIMARY KEY (test_ride_id);


--
-- TOC entry 6062 (class 2606 OID 28086)
-- Name: gl_account gl_account_account_code_key; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_account_code_key UNIQUE (account_code);


--
-- TOC entry 6064 (class 2606 OID 28084)
-- Name: gl_account gl_account_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_pkey PRIMARY KEY (account_id);


--
-- TOC entry 6068 (class 2606 OID 28168)
-- Name: gl_journal_entry gl_journal_entry_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal_entry
    ADD CONSTRAINT gl_journal_entry_pkey PRIMARY KEY (entry_id);


--
-- TOC entry 6066 (class 2606 OID 28129)
-- Name: gl_journal gl_journal_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_pkey PRIMARY KEY (journal_id);


--
-- TOC entry 5887 (class 2606 OID 26321)
-- Name: vehicle_loan uq_one_loan_per_sale; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT uq_one_loan_per_sale UNIQUE (sale_id);


--
-- TOC entry 5891 (class 2606 OID 26342)
-- Name: vehicle_subsidy uq_one_subsidy_per_vehicle; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT uq_one_subsidy_per_vehicle UNIQUE (chassis_no);


--
-- TOC entry 5889 (class 2606 OID 26319)
-- Name: vehicle_loan vehicle_loan_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT vehicle_loan_pkey PRIMARY KEY (loan_id);


--
-- TOC entry 5893 (class 2606 OID 26340)
-- Name: vehicle_subsidy vehicle_subsidy_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT vehicle_subsidy_pkey PRIMARY KEY (subsidy_id);


--
-- TOC entry 5869 (class 2606 OID 26183)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id);


--
-- TOC entry 5875 (class 2606 OID 26208)
-- Name: salary salary_pkey; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT salary_pkey PRIMARY KEY (salary_id);


--
-- TOC entry 5873 (class 2606 OID 26185)
-- Name: attendance uq_staff_attendance_date; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT uq_staff_attendance_date UNIQUE (staff_id, attendance_date);


--
-- TOC entry 5877 (class 2606 OID 26210)
-- Name: salary uq_staff_salary_month; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT uq_staff_salary_month UNIQUE (staff_id, salary_month);


--
-- TOC entry 5680 (class 2606 OID 25090)
-- Name: insurance_company insurance_company_pkey; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company
    ADD CONSTRAINT insurance_company_pkey PRIMARY KEY (insurance_company_id);


--
-- TOC entry 5992 (class 2606 OID 26944)
-- Name: insurance_followup insurance_followup_pkey; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_followup
    ADD CONSTRAINT insurance_followup_pkey PRIMARY KEY (insurance_followup_id);


--
-- TOC entry 5688 (class 2606 OID 25110)
-- Name: policy policy_pkey; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT policy_pkey PRIMARY KEY (policy_id);


--
-- TOC entry 5682 (class 2606 OID 25092)
-- Name: insurance_company uq_insurance_company_name; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company
    ADD CONSTRAINT uq_insurance_company_name UNIQUE (company_name);


--
-- TOC entry 5691 (class 2606 OID 25112)
-- Name: policy uq_policy_number; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT uq_policy_number UNIQUE (policy_number);


--
-- TOC entry 5756 (class 2606 OID 25452)
-- Name: spare_master spare_master_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT spare_master_pkey PRIMARY KEY (spare_id);


--
-- TOC entry 5787 (class 2606 OID 25612)
-- Name: spare_serial spare_serial_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT spare_serial_pkey PRIMARY KEY (spare_serial_id);


--
-- TOC entry 5751 (class 2606 OID 25425)
-- Name: spare_stock_movement spare_stock_movement_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT spare_stock_movement_pkey PRIMARY KEY (movement_id);


--
-- TOC entry 5758 (class 2606 OID 25454)
-- Name: spare_master uq_spare_part_code; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT uq_spare_part_code UNIQUE (part_code);


--
-- TOC entry 5789 (class 2606 OID 25614)
-- Name: spare_serial uq_spare_serial; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT uq_spare_serial UNIQUE (serial_no);


--
-- TOC entry 5885 (class 2606 OID 26275)
-- Name: vehicle_stock_movement vehicle_stock_movement_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT vehicle_stock_movement_pkey PRIMARY KEY (movement_id);


--
-- TOC entry 6030 (class 2606 OID 27547)
-- Name: bank bank_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank
    ADD CONSTRAINT bank_pkey PRIMARY KEY (bank_id);


--
-- TOC entry 5915 (class 2606 OID 26448)
-- Name: brand brand_brand_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT brand_brand_name_key UNIQUE (brand_name);


--
-- TOC entry 5917 (class 2606 OID 26446)
-- Name: brand brand_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT brand_pkey PRIMARY KEY (brand_id);


--
-- TOC entry 6070 (class 2606 OID 28193)
-- Name: color color_color_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_color_name_key UNIQUE (color_name);


--
-- TOC entry 6072 (class 2606 OID 28191)
-- Name: color color_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_pkey PRIMARY KEY (color_id);


--
-- TOC entry 5616 (class 2606 OID 24767)
-- Name: customer_document customer_document_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document
    ADD CONSTRAINT customer_document_pkey PRIMARY KEY (customer_document_id);


--
-- TOC entry 5611 (class 2606 OID 24743)
-- Name: customer_phone customer_phone_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT customer_phone_pkey PRIMARY KEY (customer_phone_id);


--
-- TOC entry 5594 (class 2606 OID 24717)
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (customer_id);


--
-- TOC entry 6037 (class 2606 OID 27573)
-- Name: document_type document_type_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT document_type_pkey PRIMARY KEY (document_type_id);


--
-- TOC entry 6039 (class 2606 OID 27575)
-- Name: document_type document_type_type_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT document_type_type_name_key UNIQUE (type_name);


--
-- TOC entry 6003 (class 2606 OID 27470)
-- Name: expense_category expense_category_category_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_category_name_key UNIQUE (category_name);


--
-- TOC entry 6005 (class 2606 OID 27468)
-- Name: expense_category expense_category_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_pkey PRIMARY KEY (expense_category_id);


--
-- TOC entry 6026 (class 2606 OID 27522)
-- Name: insurance_company insurance_company_company_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT insurance_company_company_name_key UNIQUE (company_name);


--
-- TOC entry 6028 (class 2606 OID 27520)
-- Name: insurance_company insurance_company_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT insurance_company_pkey PRIMARY KEY (insurance_company_id);


--
-- TOC entry 6017 (class 2606 OID 27496)
-- Name: job_card_category job_card_category_category_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_category_name_key UNIQUE (category_name);


--
-- TOC entry 6019 (class 2606 OID 27494)
-- Name: job_card_category job_card_category_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_pkey PRIMARY KEY (job_card_category_id);


--
-- TOC entry 5905 (class 2606 OID 26407)
-- Name: nominee nominee_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT nominee_pkey PRIMARY KEY (nominee_id);


--
-- TOC entry 5999 (class 2606 OID 27444)
-- Name: payment_mode payment_mode_mode_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_mode_name_key UNIQUE (mode_name);


--
-- TOC entry 6001 (class 2606 OID 27442)
-- Name: payment_mode payment_mode_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_pkey PRIMARY KEY (payment_mode_id);


--
-- TOC entry 5960 (class 2606 OID 26757)
-- Name: pin_reset_request pin_reset_request_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_pkey PRIMARY KEY (id);


--
-- TOC entry 5950 (class 2606 OID 26618)
-- Name: spare_price_history spare_price_history_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5800 (class 2606 OID 25712)
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (staff_id);


--
-- TOC entry 5603 (class 2606 OID 24708)
-- Name: customer uq_customer_aadhaar; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_aadhaar UNIQUE (aadhaar_no);


--
-- TOC entry 5605 (class 2606 OID 24712)
-- Name: customer uq_customer_gstin; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_gstin UNIQUE (gstin);


--
-- TOC entry 5607 (class 2606 OID 24710)
-- Name: customer uq_customer_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_pan UNIQUE (pan_no);


--
-- TOC entry 5614 (class 2606 OID 24745)
-- Name: customer_phone uq_customer_phone_number; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT uq_customer_phone_number UNIQUE (phone_number);


--
-- TOC entry 5609 (class 2606 OID 24706)
-- Name: customer uq_customer_primary_phone; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_primary_phone UNIQUE (primary_phone_backup);


--
-- TOC entry 5802 (class 2606 OID 25717)
-- Name: staff uq_staff_aadhaar; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_aadhaar UNIQUE (aadhaar_no);


--
-- TOC entry 5804 (class 2606 OID 25714)
-- Name: staff uq_staff_mobile; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_mobile UNIQUE (mobile_no_backup);


--
-- TOC entry 5806 (class 2606 OID 25719)
-- Name: staff uq_staff_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_pan UNIQUE (pan_no);


--
-- TOC entry 5808 (class 2606 OID 26248)
-- Name: staff uq_staff_upi; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_upi UNIQUE (upi_id);


--
-- TOC entry 5624 (class 2606 OID 24793)
-- Name: vehicle_model uq_vehicle_model_material; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT uq_vehicle_model_material UNIQUE (material_number);


--
-- TOC entry 5637 (class 2606 OID 24881)
-- Name: vendor uq_vendor_gstin; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT uq_vendor_gstin UNIQUE (gstin);


--
-- TOC entry 5639 (class 2606 OID 24883)
-- Name: vendor uq_vendor_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT uq_vendor_pan UNIQUE (pan_no);


--
-- TOC entry 5626 (class 2606 OID 24791)
-- Name: vehicle_model vehicle_model_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT vehicle_model_pkey PRIMARY KEY (vehicle_model_id);


--
-- TOC entry 5632 (class 2606 OID 24807)
-- Name: vehicle vehicle_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT vehicle_pkey PRIMARY KEY (chassis_no);


--
-- TOC entry 5954 (class 2606 OID 26644)
-- Name: vehicle_price_history vehicle_price_history_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5644 (class 2606 OID 24900)
-- Name: vendor_contact vendor_contact_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact
    ADD CONSTRAINT vendor_contact_pkey PRIMARY KEY (vendor_contact_id);


--
-- TOC entry 5647 (class 2606 OID 24922)
-- Name: vendor_document vendor_document_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document
    ADD CONSTRAINT vendor_document_pkey PRIMARY KEY (vendor_document_id);


--
-- TOC entry 5641 (class 2606 OID 24879)
-- Name: vendor vendor_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (vendor_id);


--
-- TOC entry 5767 (class 2606 OID 25519)
-- Name: reimbursement_invoice reimbursement_invoice_pkey; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice
    ADD CONSTRAINT reimbursement_invoice_pkey PRIMARY KEY (reimbursement_invoice_id);


--
-- TOC entry 5771 (class 2606 OID 25537)
-- Name: reimbursement_line reimbursement_line_pkey; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT reimbursement_line_pkey PRIMARY KEY (reimbursement_line_id);


--
-- TOC entry 5773 (class 2606 OID 25539)
-- Name: reimbursement_line uq_labour_claimed_once; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT uq_labour_claimed_once UNIQUE (job_labour_id);


--
-- TOC entry 5769 (class 2606 OID 25521)
-- Name: reimbursement_invoice uq_oem_invoice_no; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice
    ADD CONSTRAINT uq_oem_invoice_no UNIQUE (oem_invoice_no);


--
-- TOC entry 5765 (class 2606 OID 25489)
-- Name: spare_purchase_item spare_purchase_item_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT spare_purchase_item_pkey PRIMARY KEY (purchase_item_id);


--
-- TOC entry 5761 (class 2606 OID 25469)
-- Name: spare_purchase spare_purchase_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase
    ADD CONSTRAINT spare_purchase_pkey PRIMARY KEY (spare_purchase_id);


--
-- TOC entry 5654 (class 2606 OID 24961)
-- Name: vehicle_purchase_detail uq_vehicle_purchase_detail_chassis; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT uq_vehicle_purchase_detail_chassis UNIQUE (chassis_no);


--
-- TOC entry 5649 (class 2606 OID 24942)
-- Name: vehicle_purchase uq_vehicle_purchase_invoice; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT uq_vehicle_purchase_invoice UNIQUE (vendor_id, invoice_number);


--
-- TOC entry 5656 (class 2606 OID 24959)
-- Name: vehicle_purchase_detail vehicle_purchase_detail_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT vehicle_purchase_detail_pkey PRIMARY KEY (vehicle_purchase_detail_id);


--
-- TOC entry 5651 (class 2606 OID 24940)
-- Name: vehicle_purchase vehicle_purchase_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT vehicle_purchase_pkey PRIMARY KEY (vehicle_purchase_id);


--
-- TOC entry 5956 (class 2606 OID 26744)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 6054 (class 2606 OID 27916)
-- Name: report_execution report_execution_pkey; Type: CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report_execution
    ADD CONSTRAINT report_execution_pkey PRIMARY KEY (execution_id);


--
-- TOC entry 6048 (class 2606 OID 27890)
-- Name: report report_pkey; Type: CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report
    ADD CONSTRAINT report_pkey PRIMARY KEY (report_id);


--
-- TOC entry 6050 (class 2606 OID 27892)
-- Name: report report_report_name_key; Type: CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report
    ADD CONSTRAINT report_report_name_key UNIQUE (report_name);


--
-- TOC entry 5941 (class 2606 OID 26564)
-- Name: delivery_checklist delivery_checklist_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_pkey PRIMARY KEY (checklist_id);


--
-- TOC entry 5943 (class 2606 OID 26566)
-- Name: delivery_checklist delivery_checklist_sale_id_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_sale_id_key UNIQUE (sale_id);


--
-- TOC entry 5939 (class 2606 OID 26539)
-- Name: payment_receipt payment_receipt_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_pkey PRIMARY KEY (receipt_id);


--
-- TOC entry 5927 (class 2606 OID 26499)
-- Name: sale sale_chassis_no_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_chassis_no_key UNIQUE (chassis_no);


--
-- TOC entry 5929 (class 2606 OID 26503)
-- Name: sale sale_delivery_challan_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_delivery_challan_number_key UNIQUE (delivery_challan_number);


--
-- TOC entry 5976 (class 2606 OID 26869)
-- Name: sale_document sale_document_document_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_document
    ADD CONSTRAINT sale_document_document_number_key UNIQUE (document_number);


--
-- TOC entry 5978 (class 2606 OID 26867)
-- Name: sale_document sale_document_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_document
    ADD CONSTRAINT sale_document_pkey PRIMARY KEY (sale_document_id);


--
-- TOC entry 5931 (class 2606 OID 26501)
-- Name: sale sale_invoice_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_invoice_number_key UNIQUE (invoice_number);


--
-- TOC entry 5933 (class 2606 OID 26497)
-- Name: sale sale_lead_id_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_lead_id_key UNIQUE (lead_id);


--
-- TOC entry 5972 (class 2606 OID 26841)
-- Name: sale_payment sale_payment_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_payment
    ADD CONSTRAINT sale_payment_pkey PRIMARY KEY (sale_payment_id);


--
-- TOC entry 5935 (class 2606 OID 26495)
-- Name: sale sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_pkey PRIMARY KEY (sale_id);


--
-- TOC entry 5980 (class 2606 OID 26900)
-- Name: sale_portal_tracking sale_portal_tracking_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_portal_tracking
    ADD CONSTRAINT sale_portal_tracking_pkey PRIMARY KEY (portal_tracking_id);


--
-- TOC entry 5982 (class 2606 OID 26904)
-- Name: sale_portal_tracking sale_portal_tracking_registration_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_portal_tracking
    ADD CONSTRAINT sale_portal_tracking_registration_number_key UNIQUE (registration_number);


--
-- TOC entry 5984 (class 2606 OID 26902)
-- Name: sale_portal_tracking sale_portal_tracking_sale_id_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_portal_tracking
    ADD CONSTRAINT sale_portal_tracking_sale_id_key UNIQUE (sale_id);


--
-- TOC entry 5968 (class 2606 OID 26813)
-- Name: sale_stage_history sale_stage_history_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_stage_history
    ADD CONSTRAINT sale_stage_history_pkey PRIMARY KEY (stage_history_id);


--
-- TOC entry 5946 (class 2606 OID 26586)
-- Name: service_schedule service_schedule_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule
    ADD CONSTRAINT service_schedule_pkey PRIMARY KEY (schedule_id);


--
-- TOC entry 5867 (class 2606 OID 26153)
-- Name: spare_sale_detail spare_sale_detail_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT spare_sale_detail_pkey PRIMARY KEY (spare_sale_detail_id);


--
-- TOC entry 5863 (class 2606 OID 26126)
-- Name: spare_sale spare_sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT spare_sale_pkey PRIMARY KEY (spare_sale_id);


--
-- TOC entry 5661 (class 2606 OID 24994)
-- Name: vehicle_sale uq_sale_challan; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_challan UNIQUE (delivery_challan_no);


--
-- TOC entry 5663 (class 2606 OID 24996)
-- Name: vehicle_sale uq_sale_chassis; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_chassis UNIQUE (chassis_no);


--
-- TOC entry 5665 (class 2606 OID 24992)
-- Name: vehicle_sale uq_sale_invoice; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_invoice UNIQUE (invoice_number);


--
-- TOC entry 5846 (class 2606 OID 25973)
-- Name: vehicle_registration uq_vehicle_sale_registration; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT uq_vehicle_sale_registration UNIQUE (vehicle_sale_id);


--
-- TOC entry 5678 (class 2606 OID 25060)
-- Name: vehicle_payment vehicle_payment_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT vehicle_payment_pkey PRIMARY KEY (vehicle_payment_id);


--
-- TOC entry 5848 (class 2606 OID 25971)
-- Name: vehicle_registration vehicle_registration_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT vehicle_registration_pkey PRIMARY KEY (vehicle_registration_id);


--
-- TOC entry 5671 (class 2606 OID 25037)
-- Name: vehicle_sale_finance vehicle_sale_finance_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance
    ADD CONSTRAINT vehicle_sale_finance_pkey PRIMARY KEY (vehicle_sale_finance_id);


--
-- TOC entry 5668 (class 2606 OID 24990)
-- Name: vehicle_sale vehicle_sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT vehicle_sale_pkey PRIMARY KEY (vehicle_sale_id);


--
-- TOC entry 5696 (class 2606 OID 25145)
-- Name: job_card job_card_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT job_card_pkey PRIMARY KEY (job_card_id);


--
-- TOC entry 5706 (class 2606 OID 25192)
-- Name: job_labour job_labour_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour
    ADD CONSTRAINT job_labour_pkey PRIMARY KEY (job_labour_id);


--
-- TOC entry 5719 (class 2606 OID 25283)
-- Name: job_spare job_spare_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT job_spare_pkey PRIMARY KEY (job_spare_id);


--
-- TOC entry 5703 (class 2606 OID 25172)
-- Name: job_work_item job_work_item_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item
    ADD CONSTRAINT job_work_item_pkey PRIMARY KEY (work_item_id);


--
-- TOC entry 5988 (class 2606 OID 26924)
-- Name: service_followup service_followup_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_followup
    ADD CONSTRAINT service_followup_pkey PRIMARY KEY (service_followup_id);


--
-- TOC entry 5850 (class 2606 OID 25992)
-- Name: service_schedule service_schedule_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT service_schedule_pkey PRIMARY KEY (service_schedule_id);


--
-- TOC entry 5698 (class 2606 OID 25147)
-- Name: job_card uq_job_card_no; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT uq_job_card_no UNIQUE (job_card_no);


--
-- TOC entry 5852 (class 2606 OID 25994)
-- Name: service_schedule uq_variant_service; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT uq_variant_service UNIQUE (vehicle_model_id, service_number);


--
-- TOC entry 5856 (class 2606 OID 26015)
-- Name: vehicle_service_summary uq_vehicle_service; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT uq_vehicle_service UNIQUE (vehicle_sale_id);


--
-- TOC entry 5711 (class 2606 OID 25218)
-- Name: vehicle_component_change vehicle_component_change_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT vehicle_component_change_pkey PRIMARY KEY (component_change_id);


--
-- TOC entry 5858 (class 2606 OID 26013)
-- Name: vehicle_service_summary vehicle_service_summary_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT vehicle_service_summary_pkey PRIMARY KEY (vehicle_service_summary_id);


--
-- TOC entry 5721 (class 2606 OID 25301)
-- Name: claim claim_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT claim_pkey PRIMARY KEY (claim_id);


--
-- TOC entry 5781 (class 2606 OID 25585)
-- Name: inward_item inward_item_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT inward_item_pkey PRIMARY KEY (inward_item_id);


--
-- TOC entry 5775 (class 2606 OID 25569)
-- Name: inward inward_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward
    ADD CONSTRAINT inward_pkey PRIMARY KEY (warranty_inward_id);


--
-- TOC entry 5729 (class 2606 OID 25316)
-- Name: shipment_item shipment_item_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT shipment_item_pkey PRIMARY KEY (shipment_item_id);


--
-- TOC entry 5713 (class 2606 OID 25267)
-- Name: shipment shipment_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment
    ADD CONSTRAINT shipment_pkey PRIMARY KEY (shipment_id);


--
-- TOC entry 5731 (class 2606 OID 25318)
-- Name: shipment_item uq_claim_single_shipment; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT uq_claim_single_shipment UNIQUE (claim_id);


--
-- TOC entry 5715 (class 2606 OID 25269)
-- Name: shipment uq_warranty_docket; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment
    ADD CONSTRAINT uq_warranty_docket UNIQUE (docket_no);


--
-- TOC entry 5777 (class 2606 OID 25571)
-- Name: inward uq_warranty_oem_invoice; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward
    ADD CONSTRAINT uq_warranty_oem_invoice UNIQUE (oem_invoice_no);


--
-- TOC entry 5726 (class 2606 OID 25429)
-- Name: claim uq_warranty_so; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT uq_warranty_so UNIQUE (so_number);


--
-- TOC entry 6055 (class 1259 OID 28045)
-- Name: ix_auth_token_blacklist_jti; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX ix_auth_token_blacklist_jti ON auth.token_blacklist USING btree (jti);


--
-- TOC entry 6056 (class 1259 OID 28046)
-- Name: ix_auth_token_blacklist_user_id; Type: INDEX; Schema: auth; Owner: postgres
--

CREATE INDEX ix_auth_token_blacklist_user_id ON auth.token_blacklist USING btree (user_id);


--
-- TOC entry 5732 (class 1259 OID 26100)
-- Name: idx_billing_invoice_date; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_date ON billing.invoice USING btree (invoice_date);


--
-- TOC entry 5733 (class 1259 OID 26098)
-- Name: idx_billing_invoice_status; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_status ON billing.invoice USING btree (invoice_status);


--
-- TOC entry 5734 (class 1259 OID 26099)
-- Name: idx_billing_invoice_type; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_type ON billing.invoice USING btree (invoice_type);


--
-- TOC entry 5744 (class 1259 OID 27994)
-- Name: idx_insurance_estimate_job_card_id; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_insurance_estimate_job_card_id ON billing.insurance_estimate USING btree (job_card_id);


--
-- TOC entry 5735 (class 1259 OID 27996)
-- Name: idx_invoice_customer_id; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_invoice_customer_id ON billing.invoice USING btree (customer_id);


--
-- TOC entry 5736 (class 1259 OID 27997)
-- Name: idx_invoice_job_card_id; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_invoice_job_card_id ON billing.invoice USING btree (job_card_id);


--
-- TOC entry 5741 (class 1259 OID 27995)
-- Name: idx_invoice_line_invoice_id; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_invoice_line_invoice_id ON billing.invoice_line USING btree (invoice_id);


--
-- TOC entry 5830 (class 1259 OID 26229)
-- Name: idx_crm_followup_alerts; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_crm_followup_alerts ON crm.followup_schedule USING btree (scheduled_date) WHERE ((followup_status)::text = ANY ((ARRAY['PENDING'::character varying, 'MISSED'::character varying])::text[]));


--
-- TOC entry 5809 (class 1259 OID 26107)
-- Name: idx_crm_lead_created; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_crm_lead_created ON crm.lead USING btree (created_at);


--
-- TOC entry 5896 (class 1259 OID 26391)
-- Name: idx_enquiry_created; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_enquiry_created ON crm.enquiry USING btree (created_at);


--
-- TOC entry 5897 (class 1259 OID 28007)
-- Name: idx_enquiry_created_by_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_enquiry_created_by_staff_id ON crm.enquiry USING btree (created_by_staff_id);


--
-- TOC entry 5898 (class 1259 OID 28008)
-- Name: idx_enquiry_enquiry_status_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_enquiry_enquiry_status_id ON crm.enquiry USING btree (enquiry_status_id);


--
-- TOC entry 5899 (class 1259 OID 28006)
-- Name: idx_enquiry_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_enquiry_lead_id ON crm.enquiry USING btree (lead_id);


--
-- TOC entry 5831 (class 1259 OID 28010)
-- Name: idx_followup_schedule_assigned_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_assigned_staff_id ON crm.followup_schedule USING btree (assigned_staff_id);


--
-- TOC entry 5832 (class 1259 OID 26108)
-- Name: idx_followup_schedule_date; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_date ON crm.followup_schedule USING btree (scheduled_date);


--
-- TOC entry 5833 (class 1259 OID 28009)
-- Name: idx_followup_schedule_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_lead_id ON crm.followup_schedule USING btree (lead_id);


--
-- TOC entry 5834 (class 1259 OID 26109)
-- Name: idx_followup_schedule_status; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_status ON crm.followup_schedule USING btree (followup_status);


--
-- TOC entry 5824 (class 1259 OID 28001)
-- Name: idx_lead_activity_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_activity_lead_id ON crm.lead_activity USING btree (lead_id);


--
-- TOC entry 5825 (class 1259 OID 28002)
-- Name: idx_lead_activity_performed_by_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_activity_performed_by_staff_id ON crm.lead_activity USING btree (performed_by_staff_id);


--
-- TOC entry 5840 (class 1259 OID 28003)
-- Name: idx_lead_assignment_history_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_assignment_history_lead_id ON crm.lead_assignment_history USING btree (lead_id);


--
-- TOC entry 5841 (class 1259 OID 28004)
-- Name: idx_lead_assignment_history_new_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_assignment_history_new_staff_id ON crm.lead_assignment_history USING btree (new_staff_id);


--
-- TOC entry 5842 (class 1259 OID 28005)
-- Name: idx_lead_assignment_history_old_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_assignment_history_old_staff_id ON crm.lead_assignment_history USING btree (old_staff_id);


--
-- TOC entry 5810 (class 1259 OID 28013)
-- Name: idx_lead_created_by_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_created_by_staff_id ON crm.lead USING btree (created_by_staff_id);


--
-- TOC entry 5811 (class 1259 OID 28014)
-- Name: idx_lead_customer_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_customer_id ON crm.lead USING btree (customer_id);


--
-- TOC entry 5961 (class 1259 OID 26953)
-- Name: idx_lead_followup_lead; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_followup_lead ON crm.lead_followup USING btree (lead_id);


--
-- TOC entry 5962 (class 1259 OID 28018)
-- Name: idx_lead_followup_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_followup_staff_id ON crm.lead_followup USING btree (staff_id);


--
-- TOC entry 5812 (class 1259 OID 26952)
-- Name: idx_lead_is_converted; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_is_converted ON crm.lead USING btree (is_converted);


--
-- TOC entry 5813 (class 1259 OID 26951)
-- Name: idx_lead_lead_status; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_lead_status ON crm.lead USING btree (lead_status);


--
-- TOC entry 5814 (class 1259 OID 28016)
-- Name: idx_lead_lead_status_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_lead_status_id ON crm.lead USING btree (lead_status_id);


--
-- TOC entry 5815 (class 1259 OID 26950)
-- Name: idx_lead_next_followup; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_next_followup ON crm.lead USING btree (next_followup_date);


--
-- TOC entry 5816 (class 1259 OID 28015)
-- Name: idx_lead_owner_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_owner_staff_id ON crm.lead USING btree (owner_staff_id);


--
-- TOC entry 5820 (class 1259 OID 28012)
-- Name: idx_lead_status_history_changed_by_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_status_history_changed_by_staff_id ON crm.lead_status_history USING btree (changed_by_staff_id);


--
-- TOC entry 5821 (class 1259 OID 28011)
-- Name: idx_lead_status_history_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_status_history_lead_id ON crm.lead_status_history USING btree (lead_id);


--
-- TOC entry 5817 (class 1259 OID 28017)
-- Name: idx_lead_vehicle_model_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_lead_vehicle_model_id ON crm.lead USING btree (vehicle_model_id);


--
-- TOC entry 5835 (class 1259 OID 27998)
-- Name: idx_test_ride_lead_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_test_ride_lead_id ON crm.test_ride USING btree (lead_id);


--
-- TOC entry 5836 (class 1259 OID 27999)
-- Name: idx_test_ride_staff_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_test_ride_staff_id ON crm.test_ride USING btree (staff_id);


--
-- TOC entry 5837 (class 1259 OID 28000)
-- Name: idx_test_ride_vehicle_model_id; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_test_ride_vehicle_model_id ON crm.test_ride USING btree (vehicle_model_id);


--
-- TOC entry 5870 (class 1259 OID 26191)
-- Name: idx_attendance_date; Type: INDEX; Schema: hr; Owner: postgres
--

CREATE INDEX idx_attendance_date ON hr.attendance USING btree (attendance_date);


--
-- TOC entry 5871 (class 1259 OID 26192)
-- Name: idx_attendance_staff; Type: INDEX; Schema: hr; Owner: postgres
--

CREATE INDEX idx_attendance_staff ON hr.attendance USING btree (staff_id);


--
-- TOC entry 5683 (class 1259 OID 26233)
-- Name: idx_insurance_active_policy_expiry; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_active_policy_expiry ON insurance.policy USING btree (policy_end_date) WHERE (is_active = true);


--
-- TOC entry 5989 (class 1259 OID 26958)
-- Name: idx_insurance_followup_date; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_followup_date ON insurance.insurance_followup USING btree (renewal_date);


--
-- TOC entry 5990 (class 1259 OID 28029)
-- Name: idx_insurance_followup_policy_id; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_followup_policy_id ON insurance.insurance_followup USING btree (policy_id);


--
-- TOC entry 5684 (class 1259 OID 26105)
-- Name: idx_insurance_policy_expiry; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_policy_expiry ON insurance.policy USING btree (policy_end_date) WHERE (is_active = true);


--
-- TOC entry 5685 (class 1259 OID 28027)
-- Name: idx_policy_insurance_company_id; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_policy_insurance_company_id ON insurance.policy USING btree (insurance_company_id);


--
-- TOC entry 5686 (class 1259 OID 28028)
-- Name: idx_policy_vehicle_sale_id; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_policy_vehicle_sale_id ON insurance.policy USING btree (vehicle_sale_id);


--
-- TOC entry 5689 (class 1259 OID 25128)
-- Name: uq_active_policy_per_vehicle; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE UNIQUE INDEX uq_active_policy_per_vehicle ON insurance.policy USING btree (chassis_no) WHERE (is_active = true);


--
-- TOC entry 5752 (class 1259 OID 27965)
-- Name: idx_spare_master_created_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_master_created_by ON inventory.spare_master USING btree (created_by);


--
-- TOC entry 5753 (class 1259 OID 27966)
-- Name: idx_spare_master_restored_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_master_restored_by ON inventory.spare_master USING btree (restored_by);


--
-- TOC entry 5754 (class 1259 OID 27967)
-- Name: idx_spare_master_updated_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_master_updated_by ON inventory.spare_master USING btree (updated_by);


--
-- TOC entry 5782 (class 1259 OID 27960)
-- Name: idx_spare_serial_created_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_serial_created_by ON inventory.spare_serial USING btree (created_by);


--
-- TOC entry 5783 (class 1259 OID 27961)
-- Name: idx_spare_serial_restored_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_serial_restored_by ON inventory.spare_serial USING btree (restored_by);


--
-- TOC entry 5784 (class 1259 OID 27959)
-- Name: idx_spare_serial_spare_id; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_serial_spare_id ON inventory.spare_serial USING btree (spare_id);


--
-- TOC entry 5785 (class 1259 OID 27962)
-- Name: idx_spare_serial_updated_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_serial_updated_by ON inventory.spare_serial USING btree (updated_by);


--
-- TOC entry 5747 (class 1259 OID 27963)
-- Name: idx_spare_stock_movement_created_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_stock_movement_created_by ON inventory.spare_stock_movement USING btree (created_by);


--
-- TOC entry 5748 (class 1259 OID 26086)
-- Name: idx_spare_stock_movement_spare; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_stock_movement_spare ON inventory.spare_stock_movement USING btree (spare_id);


--
-- TOC entry 5749 (class 1259 OID 27964)
-- Name: idx_spare_stock_movement_updated_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_stock_movement_updated_by ON inventory.spare_stock_movement USING btree (updated_by);


--
-- TOC entry 5878 (class 1259 OID 26281)
-- Name: idx_vehicle_movement_chassis; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_chassis ON inventory.vehicle_stock_movement USING btree (chassis_no);


--
-- TOC entry 5879 (class 1259 OID 26283)
-- Name: idx_vehicle_movement_datetime; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_datetime ON inventory.vehicle_stock_movement USING btree (movement_datetime);


--
-- TOC entry 5880 (class 1259 OID 26282)
-- Name: idx_vehicle_movement_type; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_type ON inventory.vehicle_stock_movement USING btree (movement_type);


--
-- TOC entry 5881 (class 1259 OID 27968)
-- Name: idx_vehicle_stock_movement_created_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_stock_movement_created_by ON inventory.vehicle_stock_movement USING btree (created_by);


--
-- TOC entry 5882 (class 1259 OID 27969)
-- Name: idx_vehicle_stock_movement_updated_by; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_stock_movement_updated_by ON inventory.vehicle_stock_movement USING btree (updated_by);


--
-- TOC entry 5883 (class 1259 OID 26351)
-- Name: uq_active_vehicle_allocation; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE UNIQUE INDEX uq_active_vehicle_allocation ON inventory.vehicle_stock_movement USING btree (chassis_no) WHERE ((movement_type)::text = 'ALLOCATED'::text);


--
-- TOC entry 6031 (class 1259 OID 27590)
-- Name: idx_bank_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_bank_active ON master.bank USING btree (is_active);


--
-- TOC entry 6032 (class 1259 OID 27686)
-- Name: idx_bank_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_bank_created_by ON master.bank USING btree (created_by);


--
-- TOC entry 6033 (class 1259 OID 27931)
-- Name: idx_bank_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_bank_deleted_by ON master.bank USING btree (deleted_by);


--
-- TOC entry 6034 (class 1259 OID 27932)
-- Name: idx_bank_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_bank_restored_by ON master.bank USING btree (restored_by);


--
-- TOC entry 6035 (class 1259 OID 27687)
-- Name: idx_bank_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_bank_updated_by ON master.bank USING btree (updated_by);


--
-- TOC entry 5918 (class 1259 OID 27599)
-- Name: idx_brand_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_brand_created_by ON master.brand USING btree (created_by);


--
-- TOC entry 5919 (class 1259 OID 27947)
-- Name: idx_brand_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_brand_deleted_by ON master.brand USING btree (deleted_by);


--
-- TOC entry 5920 (class 1259 OID 27948)
-- Name: idx_brand_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_brand_restored_by ON master.brand USING btree (restored_by);


--
-- TOC entry 5921 (class 1259 OID 27605)
-- Name: idx_brand_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_brand_updated_by ON master.brand USING btree (updated_by);


--
-- TOC entry 5595 (class 1259 OID 26367)
-- Name: idx_customer_created; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_created ON master.customer USING btree (created_at);


--
-- TOC entry 5596 (class 1259 OID 27659)
-- Name: idx_customer_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_created_by ON master.customer USING btree (created_by);


--
-- TOC entry 5617 (class 1259 OID 24773)
-- Name: idx_customer_document_customer; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_document_customer ON master.customer_document USING btree (customer_id);


--
-- TOC entry 5618 (class 1259 OID 24774)
-- Name: idx_customer_document_type; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_document_type ON master.customer_document USING btree (document_type);


--
-- TOC entry 5597 (class 1259 OID 28066)
-- Name: idx_customer_email_hash; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_email_hash ON master.customer USING btree (email_hash);


--
-- TOC entry 5598 (class 1259 OID 27927)
-- Name: idx_customer_lead_reference_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_lead_reference_id ON master.customer USING btree (lead_reference_id);


--
-- TOC entry 5612 (class 1259 OID 27933)
-- Name: idx_customer_phone_customer_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_phone_customer_id ON master.customer_phone USING btree (customer_id);


--
-- TOC entry 5599 (class 1259 OID 28065)
-- Name: idx_customer_primary_phone_hash; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_primary_phone_hash ON master.customer USING btree (primary_phone_hash);


--
-- TOC entry 5600 (class 1259 OID 27928)
-- Name: idx_customer_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_restored_by ON master.customer USING btree (restored_by);


--
-- TOC entry 5601 (class 1259 OID 27665)
-- Name: idx_customer_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_updated_by ON master.customer USING btree (updated_by);


--
-- TOC entry 6040 (class 1259 OID 27591)
-- Name: idx_document_type_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_document_type_active ON master.document_type USING btree (is_active);


--
-- TOC entry 6041 (class 1259 OID 27693)
-- Name: idx_document_type_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_document_type_created_by ON master.document_type USING btree (created_by);


--
-- TOC entry 6042 (class 1259 OID 27957)
-- Name: idx_document_type_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_document_type_deleted_by ON master.document_type USING btree (deleted_by);


--
-- TOC entry 6043 (class 1259 OID 27958)
-- Name: idx_document_type_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_document_type_restored_by ON master.document_type USING btree (restored_by);


--
-- TOC entry 6044 (class 1259 OID 27699)
-- Name: idx_document_type_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_document_type_updated_by ON master.document_type USING btree (updated_by);


--
-- TOC entry 6006 (class 1259 OID 27587)
-- Name: idx_expense_category_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_expense_category_active ON master.expense_category USING btree (is_active);


--
-- TOC entry 6007 (class 1259 OID 27680)
-- Name: idx_expense_category_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_expense_category_created_by ON master.expense_category USING btree (created_by);


--
-- TOC entry 6008 (class 1259 OID 27953)
-- Name: idx_expense_category_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_expense_category_deleted_by ON master.expense_category USING btree (deleted_by);


--
-- TOC entry 6009 (class 1259 OID 27954)
-- Name: idx_expense_category_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_expense_category_restored_by ON master.expense_category USING btree (restored_by);


--
-- TOC entry 6010 (class 1259 OID 27681)
-- Name: idx_expense_category_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_expense_category_updated_by ON master.expense_category USING btree (updated_by);


--
-- TOC entry 6020 (class 1259 OID 27589)
-- Name: idx_insurance_company_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_insurance_company_active ON master.insurance_company USING btree (is_active);


--
-- TOC entry 6021 (class 1259 OID 27684)
-- Name: idx_insurance_company_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_insurance_company_created_by ON master.insurance_company USING btree (created_by);


--
-- TOC entry 6022 (class 1259 OID 27929)
-- Name: idx_insurance_company_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_insurance_company_deleted_by ON master.insurance_company USING btree (deleted_by);


--
-- TOC entry 6023 (class 1259 OID 27930)
-- Name: idx_insurance_company_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_insurance_company_restored_by ON master.insurance_company USING btree (restored_by);


--
-- TOC entry 6024 (class 1259 OID 27685)
-- Name: idx_insurance_company_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_insurance_company_updated_by ON master.insurance_company USING btree (updated_by);


--
-- TOC entry 6011 (class 1259 OID 27588)
-- Name: idx_job_card_category_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_job_card_category_active ON master.job_card_category USING btree (is_active);


--
-- TOC entry 6012 (class 1259 OID 27682)
-- Name: idx_job_card_category_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_job_card_category_created_by ON master.job_card_category USING btree (created_by);


--
-- TOC entry 6013 (class 1259 OID 27955)
-- Name: idx_job_card_category_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_job_card_category_deleted_by ON master.job_card_category USING btree (deleted_by);


--
-- TOC entry 6014 (class 1259 OID 27956)
-- Name: idx_job_card_category_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_job_card_category_restored_by ON master.job_card_category USING btree (restored_by);


--
-- TOC entry 6015 (class 1259 OID 27683)
-- Name: idx_job_card_category_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_job_card_category_updated_by ON master.job_card_category USING btree (updated_by);


--
-- TOC entry 5900 (class 1259 OID 27671)
-- Name: idx_nominee_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_nominee_created_by ON master.nominee USING btree (created_by);


--
-- TOC entry 5901 (class 1259 OID 26413)
-- Name: idx_nominee_customer; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_nominee_customer ON master.nominee USING btree (customer_id);


--
-- TOC entry 5902 (class 1259 OID 27941)
-- Name: idx_nominee_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_nominee_restored_by ON master.nominee USING btree (restored_by);


--
-- TOC entry 5903 (class 1259 OID 27677)
-- Name: idx_nominee_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_nominee_updated_by ON master.nominee USING btree (updated_by);


--
-- TOC entry 5993 (class 1259 OID 27586)
-- Name: idx_payment_mode_active; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_payment_mode_active ON master.payment_mode USING btree (is_active);


--
-- TOC entry 5994 (class 1259 OID 27678)
-- Name: idx_payment_mode_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_payment_mode_created_by ON master.payment_mode USING btree (created_by);


--
-- TOC entry 5995 (class 1259 OID 27951)
-- Name: idx_payment_mode_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_payment_mode_deleted_by ON master.payment_mode USING btree (deleted_by);


--
-- TOC entry 5996 (class 1259 OID 27952)
-- Name: idx_payment_mode_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_payment_mode_restored_by ON master.payment_mode USING btree (restored_by);


--
-- TOC entry 5997 (class 1259 OID 27679)
-- Name: idx_payment_mode_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_payment_mode_updated_by ON master.payment_mode USING btree (updated_by);


--
-- TOC entry 5957 (class 1259 OID 27949)
-- Name: idx_pin_reset_request_processed_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_pin_reset_request_processed_by ON master.pin_reset_request USING btree (processed_by);


--
-- TOC entry 5958 (class 1259 OID 27950)
-- Name: idx_pin_reset_request_staff_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_pin_reset_request_staff_id ON master.pin_reset_request USING btree (staff_id);


--
-- TOC entry 5947 (class 1259 OID 27945)
-- Name: idx_spare_price_history_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_spare_price_history_created_by ON master.spare_price_history USING btree (created_by);


--
-- TOC entry 5948 (class 1259 OID 26655)
-- Name: idx_spare_price_history_spare; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_spare_price_history_spare ON master.spare_price_history USING btree (spare_id);


--
-- TOC entry 5790 (class 1259 OID 26254)
-- Name: idx_staff_active_lock; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_active_lock ON master.staff USING btree (staff_id, is_active, locked_until);


--
-- TOC entry 5791 (class 1259 OID 27611)
-- Name: idx_staff_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_created_by ON master.staff USING btree (created_by);


--
-- TOC entry 5792 (class 1259 OID 27944)
-- Name: idx_staff_dealer_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_dealer_id ON master.staff USING btree (dealer_id);


--
-- TOC entry 5793 (class 1259 OID 27942)
-- Name: idx_staff_deleted_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_deleted_by ON master.staff USING btree (deleted_by);


--
-- TOC entry 5794 (class 1259 OID 28064)
-- Name: idx_staff_email_hash; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_email_hash ON master.staff USING btree (email_hash);


--
-- TOC entry 5795 (class 1259 OID 27592)
-- Name: idx_staff_is_deleted; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_is_deleted ON master.staff USING btree (is_deleted);


--
-- TOC entry 5796 (class 1259 OID 28063)
-- Name: idx_staff_mobile_no_hash; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_mobile_no_hash ON master.staff USING btree (mobile_no_hash);


--
-- TOC entry 5797 (class 1259 OID 27943)
-- Name: idx_staff_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_restored_by ON master.staff USING btree (restored_by);


--
-- TOC entry 5798 (class 1259 OID 27617)
-- Name: idx_staff_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_updated_by ON master.staff USING btree (updated_by);


--
-- TOC entry 5627 (class 1259 OID 27635)
-- Name: idx_vehicle_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_created_by ON master.vehicle USING btree (created_by);


--
-- TOC entry 5619 (class 1259 OID 27934)
-- Name: idx_vehicle_model_brand_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_model_brand_id ON master.vehicle_model USING btree (brand_id);


--
-- TOC entry 5620 (class 1259 OID 27623)
-- Name: idx_vehicle_model_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_model_created_by ON master.vehicle_model USING btree (created_by);


--
-- TOC entry 5621 (class 1259 OID 27935)
-- Name: idx_vehicle_model_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_model_restored_by ON master.vehicle_model USING btree (restored_by);


--
-- TOC entry 5622 (class 1259 OID 27629)
-- Name: idx_vehicle_model_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_model_updated_by ON master.vehicle_model USING btree (updated_by);


--
-- TOC entry 5951 (class 1259 OID 27946)
-- Name: idx_vehicle_price_history_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_price_history_created_by ON master.vehicle_price_history USING btree (created_by);


--
-- TOC entry 5952 (class 1259 OID 26656)
-- Name: idx_vehicle_price_history_model; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_price_history_model ON master.vehicle_price_history USING btree (vehicle_model_id);


--
-- TOC entry 5628 (class 1259 OID 27939)
-- Name: idx_vehicle_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_restored_by ON master.vehicle USING btree (restored_by);


--
-- TOC entry 5629 (class 1259 OID 27641)
-- Name: idx_vehicle_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_updated_by ON master.vehicle USING btree (updated_by);


--
-- TOC entry 5630 (class 1259 OID 27938)
-- Name: idx_vehicle_vehicle_model_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_vehicle_model_id ON master.vehicle USING btree (vehicle_model_id);


--
-- TOC entry 5642 (class 1259 OID 27937)
-- Name: idx_vendor_contact_vendor_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vendor_contact_vendor_id ON master.vendor_contact USING btree (vendor_id);


--
-- TOC entry 5633 (class 1259 OID 27647)
-- Name: idx_vendor_created_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vendor_created_by ON master.vendor USING btree (created_by);


--
-- TOC entry 5645 (class 1259 OID 27940)
-- Name: idx_vendor_document_vendor_id; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vendor_document_vendor_id ON master.vendor_document USING btree (vendor_id);


--
-- TOC entry 5634 (class 1259 OID 27936)
-- Name: idx_vendor_restored_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vendor_restored_by ON master.vendor USING btree (restored_by);


--
-- TOC entry 5635 (class 1259 OID 27653)
-- Name: idx_vendor_updated_by; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vendor_updated_by ON master.vendor USING btree (updated_by);


--
-- TOC entry 5762 (class 1259 OID 28022)
-- Name: idx_spare_purchase_item_spare_id; Type: INDEX; Schema: procurement; Owner: postgres
--

CREATE INDEX idx_spare_purchase_item_spare_id ON procurement.spare_purchase_item USING btree (spare_id);


--
-- TOC entry 5763 (class 1259 OID 28021)
-- Name: idx_spare_purchase_item_spare_purchase_id; Type: INDEX; Schema: procurement; Owner: postgres
--

CREATE INDEX idx_spare_purchase_item_spare_purchase_id ON procurement.spare_purchase_item USING btree (spare_purchase_id);


--
-- TOC entry 5759 (class 1259 OID 28020)
-- Name: idx_spare_purchase_vendor_id; Type: INDEX; Schema: procurement; Owner: postgres
--

CREATE INDEX idx_spare_purchase_vendor_id ON procurement.spare_purchase USING btree (vendor_id);


--
-- TOC entry 5652 (class 1259 OID 28019)
-- Name: idx_vehicle_purchase_detail_vehicle_purchase_id; Type: INDEX; Schema: procurement; Owner: postgres
--

CREATE INDEX idx_vehicle_purchase_detail_vehicle_purchase_id ON procurement.vehicle_purchase_detail USING btree (vehicle_purchase_id);


--
-- TOC entry 6045 (class 1259 OID 28030)
-- Name: idx_report_created_by; Type: INDEX; Schema: reports; Owner: postgres
--

CREATE INDEX idx_report_created_by ON reports.report USING btree (created_by);


--
-- TOC entry 6051 (class 1259 OID 28032)
-- Name: idx_report_execution_report_id; Type: INDEX; Schema: reports; Owner: postgres
--

CREATE INDEX idx_report_execution_report_id ON reports.report_execution USING btree (report_id);


--
-- TOC entry 6052 (class 1259 OID 28033)
-- Name: idx_report_execution_requested_by; Type: INDEX; Schema: reports; Owner: postgres
--

CREATE INDEX idx_report_execution_requested_by ON reports.report_execution USING btree (requested_by);


--
-- TOC entry 6046 (class 1259 OID 28031)
-- Name: idx_report_updated_by; Type: INDEX; Schema: reports; Owner: postgres
--

CREATE INDEX idx_report_updated_by ON reports.report USING btree (updated_by);


--
-- TOC entry 5936 (class 1259 OID 27974)
-- Name: idx_payment_receipt_created_by_staff_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_payment_receipt_created_by_staff_id ON sales.payment_receipt USING btree (created_by_staff_id);


--
-- TOC entry 5937 (class 1259 OID 27975)
-- Name: idx_payment_receipt_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_payment_receipt_sale_id ON sales.payment_receipt USING btree (sale_id);


--
-- TOC entry 5922 (class 1259 OID 27980)
-- Name: idx_sale_created_by_staff_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_created_by_staff_id ON sales.sale USING btree (created_by_staff_id);


--
-- TOC entry 5923 (class 1259 OID 26524)
-- Name: idx_sale_customer; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_customer ON sales.sale USING btree (customer_id);


--
-- TOC entry 5973 (class 1259 OID 27984)
-- Name: idx_sale_document_generated_by_staff_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_document_generated_by_staff_id ON sales.sale_document USING btree (generated_by_staff_id);


--
-- TOC entry 5974 (class 1259 OID 26956)
-- Name: idx_sale_document_sale; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_document_sale ON sales.sale_document USING btree (sale_id);


--
-- TOC entry 5924 (class 1259 OID 26525)
-- Name: idx_sale_lead; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_lead ON sales.sale USING btree (lead_id);


--
-- TOC entry 5969 (class 1259 OID 27983)
-- Name: idx_sale_payment_created_by_staff_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_payment_created_by_staff_id ON sales.sale_payment USING btree (created_by_staff_id);


--
-- TOC entry 5970 (class 1259 OID 26955)
-- Name: idx_sale_payment_sale; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_payment_sale ON sales.sale_payment USING btree (sale_id);


--
-- TOC entry 5925 (class 1259 OID 26954)
-- Name: idx_sale_sale_stage; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_sale_stage ON sales.sale USING btree (sale_stage);


--
-- TOC entry 5965 (class 1259 OID 27981)
-- Name: idx_sale_stage_history_changed_by_staff_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_stage_history_changed_by_staff_id ON sales.sale_stage_history USING btree (changed_by_staff_id);


--
-- TOC entry 5966 (class 1259 OID 27982)
-- Name: idx_sale_stage_history_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_stage_history_sale_id ON sales.sale_stage_history USING btree (sale_id);


--
-- TOC entry 5944 (class 1259 OID 27976)
-- Name: idx_service_schedule_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_service_schedule_sale_id ON sales.service_schedule USING btree (sale_id);


--
-- TOC entry 5859 (class 1259 OID 26165)
-- Name: idx_spare_sale_customer; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_customer ON sales.spare_sale USING btree (customer_id);


--
-- TOC entry 5860 (class 1259 OID 26164)
-- Name: idx_spare_sale_date; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_date ON sales.spare_sale USING btree (sale_date);


--
-- TOC entry 5864 (class 1259 OID 26166)
-- Name: idx_spare_sale_detail_spare; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_detail_spare ON sales.spare_sale_detail USING btree (spare_id);


--
-- TOC entry 5865 (class 1259 OID 27971)
-- Name: idx_spare_sale_detail_spare_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_detail_spare_sale_id ON sales.spare_sale_detail USING btree (spare_sale_id);


--
-- TOC entry 5861 (class 1259 OID 27970)
-- Name: idx_spare_sale_job_card_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_job_card_id ON sales.spare_sale USING btree (job_card_id);


--
-- TOC entry 5672 (class 1259 OID 27979)
-- Name: idx_vehicle_payment_chassis_no; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_chassis_no ON sales.vehicle_payment USING btree (chassis_no);


--
-- TOC entry 5673 (class 1259 OID 26097)
-- Name: idx_vehicle_payment_context; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_context ON sales.vehicle_payment USING btree (payment_context);


--
-- TOC entry 5674 (class 1259 OID 27977)
-- Name: idx_vehicle_payment_customer_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_customer_id ON sales.vehicle_payment USING btree (customer_id);


--
-- TOC entry 5675 (class 1259 OID 26096)
-- Name: idx_vehicle_payment_date; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_date ON sales.vehicle_payment USING btree (payment_date);


--
-- TOC entry 5676 (class 1259 OID 27978)
-- Name: idx_vehicle_payment_vehicle_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_vehicle_sale_id ON sales.vehicle_payment USING btree (vehicle_sale_id);


--
-- TOC entry 5657 (class 1259 OID 26094)
-- Name: idx_vehicle_sale_created_at; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_created_at ON sales.vehicle_sale USING btree (created_at);


--
-- TOC entry 5658 (class 1259 OID 27972)
-- Name: idx_vehicle_sale_customer_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_customer_id ON sales.vehicle_sale USING btree (customer_id);


--
-- TOC entry 5669 (class 1259 OID 27973)
-- Name: idx_vehicle_sale_finance_vehicle_sale_id; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_finance_vehicle_sale_id ON sales.vehicle_sale_finance USING btree (vehicle_sale_id);


--
-- TOC entry 5659 (class 1259 OID 26095)
-- Name: idx_vehicle_sale_is_financed; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_is_financed ON sales.vehicle_sale USING btree (is_financed);


--
-- TOC entry 5666 (class 1259 OID 26261)
-- Name: uq_vehicle_sale_lead; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE UNIQUE INDEX uq_vehicle_sale_lead ON sales.vehicle_sale USING btree (lead_id);


--
-- TOC entry 5692 (class 1259 OID 27985)
-- Name: idx_job_card_customer_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_card_customer_id ON service.job_card USING btree (customer_id);


--
-- TOC entry 5693 (class 1259 OID 26101)
-- Name: idx_job_card_in_datetime; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_card_in_datetime ON service.job_card USING btree (in_datetime);


--
-- TOC entry 5694 (class 1259 OID 26102)
-- Name: idx_job_card_out_datetime; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_card_out_datetime ON service.job_card USING btree (out_datetime);


--
-- TOC entry 5704 (class 1259 OID 27986)
-- Name: idx_job_labour_work_item_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_labour_work_item_id ON service.job_labour USING btree (work_item_id);


--
-- TOC entry 5716 (class 1259 OID 26093)
-- Name: idx_job_spare_spare; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_spare_spare ON service.job_spare USING btree (spare_id);


--
-- TOC entry 5717 (class 1259 OID 27987)
-- Name: idx_job_spare_work_item_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_spare_work_item_id ON service.job_spare USING btree (work_item_id);


--
-- TOC entry 5700 (class 1259 OID 27992)
-- Name: idx_job_work_item_job_card_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_work_item_job_card_id ON service.job_work_item USING btree (job_card_id);


--
-- TOC entry 5701 (class 1259 OID 26103)
-- Name: idx_job_work_item_type; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_work_item_type ON service.job_work_item USING btree (work_type);


--
-- TOC entry 5853 (class 1259 OID 26227)
-- Name: idx_service_due_alert; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_service_due_alert ON service.vehicle_service_summary USING btree (due_status) WHERE ((due_status)::text = ANY ((ARRAY['DUE'::character varying, 'OVERDUE'::character varying])::text[]));


--
-- TOC entry 5985 (class 1259 OID 26957)
-- Name: idx_service_followup_date; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_service_followup_date ON service.service_followup USING btree (next_service_date);


--
-- TOC entry 5986 (class 1259 OID 27993)
-- Name: idx_service_followup_job_card_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_service_followup_job_card_id ON service.service_followup USING btree (job_card_id);


--
-- TOC entry 5707 (class 1259 OID 27990)
-- Name: idx_vehicle_component_change_chassis_no; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_vehicle_component_change_chassis_no ON service.vehicle_component_change USING btree (chassis_no);


--
-- TOC entry 5708 (class 1259 OID 27988)
-- Name: idx_vehicle_component_change_job_card_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_vehicle_component_change_job_card_id ON service.vehicle_component_change USING btree (job_card_id);


--
-- TOC entry 5709 (class 1259 OID 27989)
-- Name: idx_vehicle_component_change_new_spare_serial_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_vehicle_component_change_new_spare_serial_id ON service.vehicle_component_change USING btree (new_spare_serial_id);


--
-- TOC entry 5854 (class 1259 OID 27991)
-- Name: idx_vehicle_service_summary_last_job_card_id; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_vehicle_service_summary_last_job_card_id ON service.vehicle_service_summary USING btree (last_job_card_id);


--
-- TOC entry 5699 (class 1259 OID 26357)
-- Name: uq_open_job_per_vehicle; Type: INDEX; Schema: service; Owner: postgres
--

CREATE UNIQUE INDEX uq_open_job_per_vehicle ON service.job_card USING btree (chassis_no) WHERE (out_datetime IS NULL);


--
-- TOC entry 5722 (class 1259 OID 28023)
-- Name: idx_claim_job_spare_id; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_claim_job_spare_id ON warranty.claim USING btree (job_spare_id);


--
-- TOC entry 5778 (class 1259 OID 28025)
-- Name: idx_inward_item_spare_id; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_inward_item_spare_id ON warranty.inward_item USING btree (spare_id);


--
-- TOC entry 5779 (class 1259 OID 28024)
-- Name: idx_inward_item_warranty_inward_id; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_inward_item_warranty_inward_id ON warranty.inward_item USING btree (warranty_inward_id);


--
-- TOC entry 5727 (class 1259 OID 28026)
-- Name: idx_shipment_item_shipment_id; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_shipment_item_shipment_id ON warranty.shipment_item USING btree (shipment_id);


--
-- TOC entry 5723 (class 1259 OID 26104)
-- Name: idx_warranty_claim_status; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_warranty_claim_status ON warranty.claim USING btree (claim_status);


--
-- TOC entry 5724 (class 1259 OID 26228)
-- Name: idx_warranty_pending; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_warranty_pending ON warranty.claim USING btree (created_at) WHERE ((claim_status)::text = 'RAISED'::text);


--
-- TOC entry 6120 (class 2606 OID 25404)
-- Name: insurance_estimate fk_estimate_job; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate
    ADD CONSTRAINT fk_estimate_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 6117 (class 2606 OID 25353)
-- Name: invoice fk_invoice_customer; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6118 (class 2606 OID 25358)
-- Name: invoice fk_invoice_job; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT fk_invoice_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 6119 (class 2606 OID 25383)
-- Name: invoice_line fk_invoice_line_invoice; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line
    ADD CONSTRAINT fk_invoice_line_invoice FOREIGN KEY (invoice_id) REFERENCES billing.invoice(invoice_id) ON DELETE CASCADE;


--
-- TOC entry 6176 (class 2606 OID 26386)
-- Name: enquiry enquiry_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT enquiry_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6151 (class 2606 OID 25820)
-- Name: lead_activity fk_activity_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT fk_activity_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6152 (class 2606 OID 25825)
-- Name: lead_activity fk_activity_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT fk_activity_staff FOREIGN KEY (performed_by_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6158 (class 2606 OID 25925)
-- Name: lead_assignment_history fk_assignment_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6159 (class 2606 OID 25935)
-- Name: lead_assignment_history fk_assignment_new; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_new FOREIGN KEY (new_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6160 (class 2606 OID 25930)
-- Name: lead_assignment_history fk_assignment_old; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_old FOREIGN KEY (old_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6177 (class 2606 OID 26469)
-- Name: enquiry fk_enquiry_created_by; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT fk_enquiry_created_by FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6178 (class 2606 OID 26456)
-- Name: enquiry fk_enquiry_status; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT fk_enquiry_status FOREIGN KEY (enquiry_status_id) REFERENCES crm.enquiry_status_master(status_id);


--
-- TOC entry 6153 (class 2606 OID 25848)
-- Name: followup_schedule fk_followup_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT fk_followup_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6154 (class 2606 OID 25853)
-- Name: followup_schedule fk_followup_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT fk_followup_staff FOREIGN KEY (assigned_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6144 (class 2606 OID 26463)
-- Name: lead fk_lead_created_by; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_created_by FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6145 (class 2606 OID 25763)
-- Name: lead fk_lead_customer; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6146 (class 2606 OID 25773)
-- Name: lead fk_lead_owner; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_owner FOREIGN KEY (owner_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6147 (class 2606 OID 26450)
-- Name: lead fk_lead_status; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_status FOREIGN KEY (lead_status_id) REFERENCES crm.lead_status_master(status_id);


--
-- TOC entry 6148 (class 2606 OID 25768)
-- Name: lead fk_lead_vehicle_model; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_vehicle_model FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 6149 (class 2606 OID 25793)
-- Name: lead_status_history fk_status_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT fk_status_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6150 (class 2606 OID 25798)
-- Name: lead_status_history fk_status_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT fk_status_staff FOREIGN KEY (changed_by_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6155 (class 2606 OID 25895)
-- Name: test_ride fk_test_ride_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6156 (class 2606 OID 25905)
-- Name: test_ride fk_test_ride_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6157 (class 2606 OID 25900)
-- Name: test_ride fk_test_ride_vehicle; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_vehicle FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 6201 (class 2606 OID 26790)
-- Name: lead_followup lead_followup_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_followup
    ADD CONSTRAINT lead_followup_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 6202 (class 2606 OID 26795)
-- Name: lead_followup lead_followup_staff_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_followup
    ADD CONSTRAINT lead_followup_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6175 (class 2606 OID 26343)
-- Name: vehicle_subsidy fk_subsidy_vehicle; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT fk_subsidy_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6174 (class 2606 OID 26322)
-- Name: vehicle_loan fk_vehicle_loan_sale; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT fk_vehicle_loan_sale FOREIGN KEY (sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE RESTRICT;


--
-- TOC entry 6240 (class 2606 OID 28087)
-- Name: gl_account gl_account_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6241 (class 2606 OID 28092)
-- Name: gl_account gl_account_deleted_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6242 (class 2606 OID 28097)
-- Name: gl_account gl_account_parent_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_parent_account_id_fkey FOREIGN KEY (parent_account_id) REFERENCES finance.gl_account(account_id);


--
-- TOC entry 6243 (class 2606 OID 28102)
-- Name: gl_account gl_account_restored_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6244 (class 2606 OID 28107)
-- Name: gl_account gl_account_updated_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_account
    ADD CONSTRAINT gl_account_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6245 (class 2606 OID 28130)
-- Name: gl_journal gl_journal_created_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6246 (class 2606 OID 28135)
-- Name: gl_journal gl_journal_deleted_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6250 (class 2606 OID 28169)
-- Name: gl_journal_entry gl_journal_entry_account_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal_entry
    ADD CONSTRAINT gl_journal_entry_account_id_fkey FOREIGN KEY (account_id) REFERENCES finance.gl_account(account_id) ON DELETE RESTRICT;


--
-- TOC entry 6251 (class 2606 OID 28174)
-- Name: gl_journal_entry gl_journal_entry_journal_id_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal_entry
    ADD CONSTRAINT gl_journal_entry_journal_id_fkey FOREIGN KEY (journal_id) REFERENCES finance.gl_journal(journal_id) ON DELETE CASCADE;


--
-- TOC entry 6247 (class 2606 OID 28140)
-- Name: gl_journal gl_journal_posted_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_posted_by_fkey FOREIGN KEY (posted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6248 (class 2606 OID 28145)
-- Name: gl_journal gl_journal_restored_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6249 (class 2606 OID 28150)
-- Name: gl_journal gl_journal_updated_by_fkey; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.gl_journal
    ADD CONSTRAINT gl_journal_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6169 (class 2606 OID 26186)
-- Name: attendance fk_attendance_staff; Type: FK CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT fk_attendance_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE CASCADE;


--
-- TOC entry 6170 (class 2606 OID 26211)
-- Name: salary fk_salary_staff; Type: FK CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT fk_salary_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 6102 (class 2606 OID 25123)
-- Name: policy fk_policy_insurer; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_insurer FOREIGN KEY (insurance_company_id) REFERENCES insurance.insurance_company(insurance_company_id) ON DELETE RESTRICT;


--
-- TOC entry 6103 (class 2606 OID 25113)
-- Name: policy fk_policy_sale; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE RESTRICT;


--
-- TOC entry 6104 (class 2606 OID 25118)
-- Name: policy fk_policy_vehicle; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6211 (class 2606 OID 26945)
-- Name: insurance_followup insurance_followup_policy_id_fkey; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_followup
    ADD CONSTRAINT insurance_followup_policy_id_fkey FOREIGN KEY (policy_id) REFERENCES insurance.policy(policy_id) ON DELETE CASCADE;


--
-- TOC entry 6135 (class 2606 OID 25615)
-- Name: spare_serial fk_spare_serial_spare; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT fk_spare_serial_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6121 (class 2606 OID 26080)
-- Name: spare_stock_movement fk_spare_stock_movement_spare; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT fk_spare_stock_movement_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6171 (class 2606 OID 26276)
-- Name: vehicle_stock_movement fk_vehicle_movement_vehicle; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT fk_vehicle_movement_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6124 (class 2606 OID 27821)
-- Name: spare_master spare_master_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT spare_master_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6125 (class 2606 OID 27833)
-- Name: spare_master spare_master_restored_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT spare_master_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6126 (class 2606 OID 27826)
-- Name: spare_master spare_master_updated_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT spare_master_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6136 (class 2606 OID 27838)
-- Name: spare_serial spare_serial_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT spare_serial_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6137 (class 2606 OID 27850)
-- Name: spare_serial spare_serial_restored_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT spare_serial_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6138 (class 2606 OID 27843)
-- Name: spare_serial spare_serial_updated_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT spare_serial_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6122 (class 2606 OID 27867)
-- Name: spare_stock_movement spare_stock_movement_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT spare_stock_movement_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6123 (class 2606 OID 27872)
-- Name: spare_stock_movement spare_stock_movement_updated_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT spare_stock_movement_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6172 (class 2606 OID 27857)
-- Name: vehicle_stock_movement vehicle_stock_movement_created_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT vehicle_stock_movement_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6173 (class 2606 OID 27862)
-- Name: vehicle_stock_movement vehicle_stock_movement_updated_by_fkey; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT vehicle_stock_movement_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6228 (class 2606 OID 27548)
-- Name: bank bank_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank
    ADD CONSTRAINT bank_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6229 (class 2606 OID 27553)
-- Name: bank bank_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank
    ADD CONSTRAINT bank_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6252 (class 2606 OID 28194)
-- Name: color color_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6253 (class 2606 OID 28199)
-- Name: color color_deleted_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_deleted_by_fkey FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6254 (class 2606 OID 28204)
-- Name: color color_restored_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_restored_by_fkey FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6255 (class 2606 OID 28209)
-- Name: color color_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.color
    ADD CONSTRAINT color_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id) ON DELETE SET NULL;


--
-- TOC entry 6073 (class 2606 OID 26362)
-- Name: customer customer_lead_reference_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT customer_lead_reference_id_fkey FOREIGN KEY (lead_reference_id) REFERENCES crm.lead(lead_id) ON DELETE SET NULL;


--
-- TOC entry 6216 (class 2606 OID 27471)
-- Name: expense_category expense_category_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6217 (class 2606 OID 27476)
-- Name: expense_category expense_category_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6230 (class 2606 OID 27744)
-- Name: bank fk_bank_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank
    ADD CONSTRAINT fk_bank_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6231 (class 2606 OID 27811)
-- Name: bank fk_bank_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.bank
    ADD CONSTRAINT fk_bank_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6183 (class 2606 OID 27594)
-- Name: brand fk_brand_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT fk_brand_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6184 (class 2606 OID 27709)
-- Name: brand fk_brand_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT fk_brand_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6185 (class 2606 OID 27771)
-- Name: brand fk_brand_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT fk_brand_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6186 (class 2606 OID 27600)
-- Name: brand fk_brand_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT fk_brand_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6074 (class 2606 OID 27654)
-- Name: customer fk_customer_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT fk_customer_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6078 (class 2606 OID 24768)
-- Name: customer_document fk_customer_document_customer; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document
    ADD CONSTRAINT fk_customer_document_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6077 (class 2606 OID 24746)
-- Name: customer_phone fk_customer_phone_customer; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT fk_customer_phone_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6075 (class 2606 OID 27756)
-- Name: customer fk_customer_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT fk_customer_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6076 (class 2606 OID 27660)
-- Name: customer fk_customer_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT fk_customer_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6232 (class 2606 OID 27688)
-- Name: document_type fk_document_type_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT fk_document_type_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6233 (class 2606 OID 27751)
-- Name: document_type fk_document_type_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT fk_document_type_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6234 (class 2606 OID 27816)
-- Name: document_type fk_document_type_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT fk_document_type_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6235 (class 2606 OID 27694)
-- Name: document_type fk_document_type_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.document_type
    ADD CONSTRAINT fk_document_type_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6218 (class 2606 OID 27723)
-- Name: expense_category fk_expense_category_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT fk_expense_category_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6219 (class 2606 OID 27796)
-- Name: expense_category fk_expense_category_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT fk_expense_category_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6224 (class 2606 OID 27737)
-- Name: insurance_company fk_insurance_company_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT fk_insurance_company_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6225 (class 2606 OID 27806)
-- Name: insurance_company fk_insurance_company_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT fk_insurance_company_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6220 (class 2606 OID 27730)
-- Name: job_card_category fk_job_card_category_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT fk_job_card_category_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6221 (class 2606 OID 27801)
-- Name: job_card_category fk_job_card_category_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT fk_job_card_category_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6179 (class 2606 OID 27666)
-- Name: nominee fk_nominee_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT fk_nominee_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6180 (class 2606 OID 27761)
-- Name: nominee fk_nominee_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT fk_nominee_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6181 (class 2606 OID 27672)
-- Name: nominee fk_nominee_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT fk_nominee_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6212 (class 2606 OID 27716)
-- Name: payment_mode fk_payment_mode_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT fk_payment_mode_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6213 (class 2606 OID 27791)
-- Name: payment_mode fk_payment_mode_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT fk_payment_mode_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6139 (class 2606 OID 27606)
-- Name: staff fk_staff_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT fk_staff_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6140 (class 2606 OID 27578)
-- Name: staff fk_staff_deleted_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT fk_staff_deleted_by FOREIGN KEY (deleted_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6141 (class 2606 OID 27766)
-- Name: staff fk_staff_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT fk_staff_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6142 (class 2606 OID 27612)
-- Name: staff fk_staff_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT fk_staff_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6083 (class 2606 OID 27630)
-- Name: vehicle fk_vehicle_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT fk_vehicle_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6084 (class 2606 OID 24808)
-- Name: vehicle fk_vehicle_model; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT fk_vehicle_model FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 6079 (class 2606 OID 27700)
-- Name: vehicle_model fk_vehicle_model_brand; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT fk_vehicle_model_brand FOREIGN KEY (brand_id) REFERENCES master.brand(brand_id);


--
-- TOC entry 6080 (class 2606 OID 27618)
-- Name: vehicle_model fk_vehicle_model_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT fk_vehicle_model_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6081 (class 2606 OID 27776)
-- Name: vehicle_model fk_vehicle_model_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT fk_vehicle_model_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6082 (class 2606 OID 27624)
-- Name: vehicle_model fk_vehicle_model_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT fk_vehicle_model_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6085 (class 2606 OID 27781)
-- Name: vehicle fk_vehicle_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT fk_vehicle_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6086 (class 2606 OID 27636)
-- Name: vehicle fk_vehicle_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT fk_vehicle_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6090 (class 2606 OID 24901)
-- Name: vendor_contact fk_vendor_contact_vendor; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact
    ADD CONSTRAINT fk_vendor_contact_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE CASCADE;


--
-- TOC entry 6087 (class 2606 OID 27642)
-- Name: vendor fk_vendor_created_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT fk_vendor_created_by FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6091 (class 2606 OID 24923)
-- Name: vendor_document fk_vendor_document_vendor; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document
    ADD CONSTRAINT fk_vendor_document_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 6088 (class 2606 OID 27786)
-- Name: vendor fk_vendor_restored_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT fk_vendor_restored_by FOREIGN KEY (restored_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6089 (class 2606 OID 27648)
-- Name: vendor fk_vendor_updated_by; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT fk_vendor_updated_by FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6226 (class 2606 OID 27523)
-- Name: insurance_company insurance_company_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT insurance_company_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6227 (class 2606 OID 27528)
-- Name: insurance_company insurance_company_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.insurance_company
    ADD CONSTRAINT insurance_company_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6222 (class 2606 OID 27497)
-- Name: job_card_category job_card_category_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6223 (class 2606 OID 27502)
-- Name: job_card_category job_card_category_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6182 (class 2606 OID 26408)
-- Name: nominee nominee_customer_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT nominee_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE CASCADE;


--
-- TOC entry 6214 (class 2606 OID 27445)
-- Name: payment_mode payment_mode_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6215 (class 2606 OID 27450)
-- Name: payment_mode payment_mode_updated_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6199 (class 2606 OID 26758)
-- Name: pin_reset_request pin_reset_request_processed_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6200 (class 2606 OID 26763)
-- Name: pin_reset_request pin_reset_request_staff_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE CASCADE;


--
-- TOC entry 6195 (class 2606 OID 26624)
-- Name: spare_price_history spare_price_history_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6196 (class 2606 OID 26619)
-- Name: spare_price_history spare_price_history_spare_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_spare_id_fkey FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id);


--
-- TOC entry 6143 (class 2606 OID 26657)
-- Name: staff staff_dealer_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT staff_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6197 (class 2606 OID 26650)
-- Name: vehicle_price_history vehicle_price_history_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6198 (class 2606 OID 26645)
-- Name: vehicle_price_history vehicle_price_history_vehicle_model_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_vehicle_model_id_fkey FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id);


--
-- TOC entry 6130 (class 2606 OID 25540)
-- Name: reimbursement_line fk_reim_line_invoice; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_invoice FOREIGN KEY (reimbursement_invoice_id) REFERENCES oem.reimbursement_invoice(reimbursement_invoice_id) ON DELETE CASCADE;


--
-- TOC entry 6131 (class 2606 OID 25545)
-- Name: reimbursement_line fk_reim_line_job; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE RESTRICT;


--
-- TOC entry 6132 (class 2606 OID 25550)
-- Name: reimbursement_line fk_reim_line_labour; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_labour FOREIGN KEY (job_labour_id) REFERENCES service.job_labour(job_labour_id) ON DELETE RESTRICT;


--
-- TOC entry 6128 (class 2606 OID 25490)
-- Name: spare_purchase_item fk_purchase_item_purchase; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT fk_purchase_item_purchase FOREIGN KEY (spare_purchase_id) REFERENCES procurement.spare_purchase(spare_purchase_id) ON DELETE CASCADE;


--
-- TOC entry 6129 (class 2606 OID 25495)
-- Name: spare_purchase_item fk_purchase_item_spare; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT fk_purchase_item_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6127 (class 2606 OID 25470)
-- Name: spare_purchase fk_spare_purchase_vendor; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase
    ADD CONSTRAINT fk_spare_purchase_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 6093 (class 2606 OID 24962)
-- Name: vehicle_purchase_detail fk_vehicle_purchase_detail_purchase; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT fk_vehicle_purchase_detail_purchase FOREIGN KEY (vehicle_purchase_id) REFERENCES procurement.vehicle_purchase(vehicle_purchase_id) ON DELETE CASCADE;


--
-- TOC entry 6094 (class 2606 OID 24967)
-- Name: vehicle_purchase_detail fk_vehicle_purchase_detail_vehicle; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT fk_vehicle_purchase_detail_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6092 (class 2606 OID 24943)
-- Name: vehicle_purchase fk_vehicle_purchase_vendor; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT fk_vehicle_purchase_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 6236 (class 2606 OID 27893)
-- Name: report report_created_by_fkey; Type: FK CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report
    ADD CONSTRAINT report_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6238 (class 2606 OID 27917)
-- Name: report_execution report_execution_report_id_fkey; Type: FK CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report_execution
    ADD CONSTRAINT report_execution_report_id_fkey FOREIGN KEY (report_id) REFERENCES reports.report(report_id);


--
-- TOC entry 6239 (class 2606 OID 27922)
-- Name: report_execution report_execution_requested_by_fkey; Type: FK CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report_execution
    ADD CONSTRAINT report_execution_requested_by_fkey FOREIGN KEY (requested_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6237 (class 2606 OID 27898)
-- Name: report report_updated_by_fkey; Type: FK CONSTRAINT; Schema: reports; Owner: postgres
--

ALTER TABLE ONLY reports.report
    ADD CONSTRAINT report_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 6193 (class 2606 OID 26567)
-- Name: delivery_checklist delivery_checklist_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 6099 (class 2606 OID 25061)
-- Name: vehicle_payment fk_payment_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6100 (class 2606 OID 25071)
-- Name: vehicle_payment fk_payment_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE SET NULL;


--
-- TOC entry 6101 (class 2606 OID 25066)
-- Name: vehicle_payment fk_payment_vehicle; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE SET NULL;


--
-- TOC entry 6161 (class 2606 OID 25974)
-- Name: vehicle_registration fk_registration_vehicle_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT fk_registration_vehicle_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 6095 (class 2606 OID 24997)
-- Name: vehicle_sale fk_sale_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6098 (class 2606 OID 25038)
-- Name: vehicle_sale_finance fk_sale_finance_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance
    ADD CONSTRAINT fk_sale_finance_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 6096 (class 2606 OID 25002)
-- Name: vehicle_sale fk_sale_vehicle; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_sale_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6165 (class 2606 OID 26127)
-- Name: spare_sale fk_spare_sale_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT fk_spare_sale_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE SET NULL;


--
-- TOC entry 6167 (class 2606 OID 26154)
-- Name: spare_sale_detail fk_spare_sale_detail_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT fk_spare_sale_detail_sale FOREIGN KEY (spare_sale_id) REFERENCES sales.spare_sale(spare_sale_id) ON DELETE CASCADE;


--
-- TOC entry 6168 (class 2606 OID 26159)
-- Name: spare_sale_detail fk_spare_sale_detail_spare; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT fk_spare_sale_detail_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6166 (class 2606 OID 26132)
-- Name: spare_sale fk_spare_sale_job_card; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT fk_spare_sale_job_card FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 6097 (class 2606 OID 26256)
-- Name: vehicle_sale fk_vehicle_sale_lead; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_vehicle_sale_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE RESTRICT;


--
-- TOC entry 6191 (class 2606 OID 26545)
-- Name: payment_receipt payment_receipt_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6192 (class 2606 OID 26540)
-- Name: payment_receipt payment_receipt_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 6187 (class 2606 OID 26514)
-- Name: sale sale_chassis_no_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_chassis_no_fkey FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no);


--
-- TOC entry 6188 (class 2606 OID 26519)
-- Name: sale sale_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6189 (class 2606 OID 26509)
-- Name: sale sale_customer_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id);


--
-- TOC entry 6207 (class 2606 OID 26875)
-- Name: sale_document sale_document_generated_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_document
    ADD CONSTRAINT sale_document_generated_by_staff_id_fkey FOREIGN KEY (generated_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6208 (class 2606 OID 26870)
-- Name: sale_document sale_document_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_document
    ADD CONSTRAINT sale_document_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id) ON DELETE CASCADE;


--
-- TOC entry 6190 (class 2606 OID 26504)
-- Name: sale sale_lead_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id);


--
-- TOC entry 6205 (class 2606 OID 26847)
-- Name: sale_payment sale_payment_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_payment
    ADD CONSTRAINT sale_payment_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6206 (class 2606 OID 26842)
-- Name: sale_payment sale_payment_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_payment
    ADD CONSTRAINT sale_payment_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id) ON DELETE CASCADE;


--
-- TOC entry 6209 (class 2606 OID 26905)
-- Name: sale_portal_tracking sale_portal_tracking_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_portal_tracking
    ADD CONSTRAINT sale_portal_tracking_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id) ON DELETE CASCADE;


--
-- TOC entry 6203 (class 2606 OID 26819)
-- Name: sale_stage_history sale_stage_history_changed_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_stage_history
    ADD CONSTRAINT sale_stage_history_changed_by_staff_id_fkey FOREIGN KEY (changed_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 6204 (class 2606 OID 26814)
-- Name: sale_stage_history sale_stage_history_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale_stage_history
    ADD CONSTRAINT sale_stage_history_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id) ON DELETE CASCADE;


--
-- TOC entry 6194 (class 2606 OID 26587)
-- Name: service_schedule service_schedule_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule
    ADD CONSTRAINT service_schedule_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 6109 (class 2606 OID 25219)
-- Name: vehicle_component_change fk_component_job; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 6110 (class 2606 OID 25620)
-- Name: vehicle_component_change fk_component_new_serial; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_new_serial FOREIGN KEY (new_spare_serial_id) REFERENCES inventory.spare_serial(spare_serial_id) ON DELETE RESTRICT;


--
-- TOC entry 6111 (class 2606 OID 25224)
-- Name: vehicle_component_change fk_component_vehicle; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6105 (class 2606 OID 25153)
-- Name: job_card fk_job_customer; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT fk_job_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 6108 (class 2606 OID 25193)
-- Name: job_labour fk_job_labour_work; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour
    ADD CONSTRAINT fk_job_labour_work FOREIGN KEY (work_item_id) REFERENCES service.job_work_item(work_item_id) ON DELETE CASCADE;


--
-- TOC entry 6112 (class 2606 OID 26087)
-- Name: job_spare fk_job_spare_spare; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT fk_job_spare_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6113 (class 2606 OID 25284)
-- Name: job_spare fk_job_spare_work; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT fk_job_spare_work FOREIGN KEY (work_item_id) REFERENCES service.job_work_item(work_item_id) ON DELETE CASCADE;


--
-- TOC entry 6106 (class 2606 OID 25148)
-- Name: job_card fk_job_vehicle; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT fk_job_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 6163 (class 2606 OID 26021)
-- Name: vehicle_service_summary fk_last_job_card; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT fk_last_job_card FOREIGN KEY (last_job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 6162 (class 2606 OID 25995)
-- Name: service_schedule fk_schedule_variant; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT fk_schedule_variant FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE CASCADE;


--
-- TOC entry 6164 (class 2606 OID 26016)
-- Name: vehicle_service_summary fk_service_vehicle_sale; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT fk_service_vehicle_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 6107 (class 2606 OID 25173)
-- Name: job_work_item fk_work_item_job; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item
    ADD CONSTRAINT fk_work_item_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 6210 (class 2606 OID 26925)
-- Name: service_followup service_followup_job_card_id_fkey; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_followup
    ADD CONSTRAINT service_followup_job_card_id_fkey FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 6114 (class 2606 OID 25302)
-- Name: claim fk_claim_spare; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT fk_claim_spare FOREIGN KEY (job_spare_id) REFERENCES service.job_spare(job_spare_id) ON DELETE CASCADE;


--
-- TOC entry 6115 (class 2606 OID 25324)
-- Name: shipment_item fk_ship_item_claim; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT fk_ship_item_claim FOREIGN KEY (claim_id) REFERENCES warranty.claim(claim_id) ON DELETE CASCADE;


--
-- TOC entry 6116 (class 2606 OID 25319)
-- Name: shipment_item fk_ship_item_shipment; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT fk_ship_item_shipment FOREIGN KEY (shipment_id) REFERENCES warranty.shipment(shipment_id) ON DELETE CASCADE;


--
-- TOC entry 6133 (class 2606 OID 25586)
-- Name: inward_item fk_warranty_inward; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT fk_warranty_inward FOREIGN KEY (warranty_inward_id) REFERENCES warranty.inward(warranty_inward_id) ON DELETE CASCADE;


--
-- TOC entry 6134 (class 2606 OID 25591)
-- Name: inward_item fk_warranty_inward_spare; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT fk_warranty_inward_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6580 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA billing; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA billing TO app_user;


--
-- TOC entry 6581 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA crm; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA crm TO app_user;


--
-- TOC entry 6582 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA finance; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA finance TO app_user;


--
-- TOC entry 6583 (class 0 OID 0)
-- Dependencies: 10
-- Name: SCHEMA hr; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA hr TO app_user;


--
-- TOC entry 6584 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA insurance; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA insurance TO app_user;


--
-- TOC entry 6585 (class 0 OID 0)
-- Dependencies: 12
-- Name: SCHEMA inventory; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA inventory TO app_user;


--
-- TOC entry 6586 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA master; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA master TO app_user;


--
-- TOC entry 6587 (class 0 OID 0)
-- Dependencies: 14
-- Name: SCHEMA oem; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA oem TO app_user;


--
-- TOC entry 6588 (class 0 OID 0)
-- Dependencies: 15
-- Name: SCHEMA procurement; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA procurement TO app_user;


--
-- TOC entry 6589 (class 0 OID 0)
-- Dependencies: 16
-- Name: SCHEMA sales; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA sales TO app_user;


--
-- TOC entry 6590 (class 0 OID 0)
-- Dependencies: 17
-- Name: SCHEMA service; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA service TO app_user;


--
-- TOC entry 6591 (class 0 OID 0)
-- Dependencies: 18
-- Name: SCHEMA warranty; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA warranty TO app_user;


--
-- TOC entry 6593 (class 0 OID 0)
-- Dependencies: 287
-- Name: TABLE insurance_estimate; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.insurance_estimate TO app_user;


--
-- TOC entry 6595 (class 0 OID 0)
-- Dependencies: 283
-- Name: TABLE invoice; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.invoice TO app_user;


--
-- TOC entry 6597 (class 0 OID 0)
-- Dependencies: 285
-- Name: TABLE invoice_line; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.invoice_line TO app_user;


--
-- TOC entry 6599 (class 0 OID 0)
-- Dependencies: 342
-- Name: TABLE enquiry; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.enquiry TO app_user;


--
-- TOC entry 6601 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE enquiry_status_master; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.enquiry_status_master TO app_user;


--
-- TOC entry 6603 (class 0 OID 0)
-- Dependencies: 315
-- Name: TABLE followup_schedule; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.followup_schedule TO app_user;


--
-- TOC entry 6605 (class 0 OID 0)
-- Dependencies: 309
-- Name: TABLE lead; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead TO app_user;


--
-- TOC entry 6606 (class 0 OID 0)
-- Dependencies: 313
-- Name: TABLE lead_activity; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_activity TO app_user;


--
-- TOC entry 6608 (class 0 OID 0)
-- Dependencies: 319
-- Name: TABLE lead_assignment_history; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_assignment_history TO app_user;


--
-- TOC entry 6610 (class 0 OID 0)
-- Dependencies: 367
-- Name: TABLE lead_followup; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_followup TO app_user;


--
-- TOC entry 6613 (class 0 OID 0)
-- Dependencies: 311
-- Name: TABLE lead_status_history; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_status_history TO app_user;


--
-- TOC entry 6615 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE lead_status_master; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_status_master TO app_user;


--
-- TOC entry 6617 (class 0 OID 0)
-- Dependencies: 317
-- Name: TABLE test_ride; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.test_ride TO app_user;


--
-- TOC entry 6619 (class 0 OID 0)
-- Dependencies: 400
-- Name: TABLE gl_account; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.gl_account TO app_user;


--
-- TOC entry 6621 (class 0 OID 0)
-- Dependencies: 402
-- Name: TABLE gl_journal; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.gl_journal TO app_user;


--
-- TOC entry 6622 (class 0 OID 0)
-- Dependencies: 404
-- Name: TABLE gl_journal_entry; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.gl_journal_entry TO app_user;


--
-- TOC entry 6625 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE sales_summary_view; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.sales_summary_view TO app_user;


--
-- TOC entry 6626 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE vehicle_loan; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.vehicle_loan TO app_user;


--
-- TOC entry 6628 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE vehicle_subsidy; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.vehicle_subsidy TO app_user;


--
-- TOC entry 6630 (class 0 OID 0)
-- Dependencies: 331
-- Name: TABLE attendance; Type: ACL; Schema: hr; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE hr.attendance TO app_user;


--
-- TOC entry 6632 (class 0 OID 0)
-- Dependencies: 333
-- Name: TABLE salary; Type: ACL; Schema: hr; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE hr.salary TO app_user;


--
-- TOC entry 6634 (class 0 OID 0)
-- Dependencies: 263
-- Name: TABLE insurance_company; Type: ACL; Schema: insurance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE insurance.insurance_company TO app_user;


--
-- TOC entry 6636 (class 0 OID 0)
-- Dependencies: 379
-- Name: TABLE insurance_followup; Type: ACL; Schema: insurance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE insurance.insurance_followup TO app_user;


--
-- TOC entry 6638 (class 0 OID 0)
-- Dependencies: 265
-- Name: TABLE policy; Type: ACL; Schema: insurance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE insurance.policy TO app_user;


--
-- TOC entry 6640 (class 0 OID 0)
-- Dependencies: 291
-- Name: TABLE spare_master; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_master TO app_user;


--
-- TOC entry 6642 (class 0 OID 0)
-- Dependencies: 305
-- Name: TABLE spare_serial; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_serial TO app_user;


--
-- TOC entry 6644 (class 0 OID 0)
-- Dependencies: 289
-- Name: TABLE spare_stock_movement; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_stock_movement TO app_user;


--
-- TOC entry 6646 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE vehicle_stock_movement; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.vehicle_stock_movement TO app_user;


--
-- TOC entry 6648 (class 0 OID 0)
-- Dependencies: 389
-- Name: TABLE bank; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.bank TO app_user;


--
-- TOC entry 6650 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE brand; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.brand TO app_user;


--
-- TOC entry 6652 (class 0 OID 0)
-- Dependencies: 406
-- Name: TABLE color; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.color TO app_user;


--
-- TOC entry 6654 (class 0 OID 0)
-- Dependencies: 235
-- Name: TABLE customer; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer TO app_user;


--
-- TOC entry 6656 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE customer_document; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer_document TO app_user;


--
-- TOC entry 6658 (class 0 OID 0)
-- Dependencies: 240
-- Name: TABLE customer_phone; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer_phone TO app_user;


--
-- TOC entry 6660 (class 0 OID 0)
-- Dependencies: 391
-- Name: TABLE document_type; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.document_type TO app_user;


--
-- TOC entry 6662 (class 0 OID 0)
-- Dependencies: 383
-- Name: TABLE expense_category; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.expense_category TO app_user;


--
-- TOC entry 6664 (class 0 OID 0)
-- Dependencies: 387
-- Name: TABLE insurance_company; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.insurance_company TO app_user;


--
-- TOC entry 6666 (class 0 OID 0)
-- Dependencies: 385
-- Name: TABLE job_card_category; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.job_card_category TO app_user;


--
-- TOC entry 6668 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE nominee; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.nominee TO app_user;


--
-- TOC entry 6670 (class 0 OID 0)
-- Dependencies: 381
-- Name: TABLE payment_mode; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.payment_mode TO app_user;


--
-- TOC entry 6672 (class 0 OID 0)
-- Dependencies: 365
-- Name: TABLE pin_reset_request; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.pin_reset_request TO app_user;


--
-- TOC entry 6674 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE spare_price_history; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.spare_price_history TO app_user;


--
-- TOC entry 6676 (class 0 OID 0)
-- Dependencies: 307
-- Name: TABLE staff; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.staff TO app_user;


--
-- TOC entry 6678 (class 0 OID 0)
-- Dependencies: 245
-- Name: TABLE vehicle; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle TO app_user;


--
-- TOC entry 6679 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE vehicle_model; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle_model TO app_user;


--
-- TOC entry 6681 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE vehicle_price_history; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle_price_history TO app_user;


--
-- TOC entry 6683 (class 0 OID 0)
-- Dependencies: 247
-- Name: TABLE vendor; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor TO app_user;


--
-- TOC entry 6684 (class 0 OID 0)
-- Dependencies: 249
-- Name: TABLE vendor_contact; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor_contact TO app_user;


--
-- TOC entry 6686 (class 0 OID 0)
-- Dependencies: 251
-- Name: TABLE vendor_document; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor_document TO app_user;


--
-- TOC entry 6689 (class 0 OID 0)
-- Dependencies: 297
-- Name: TABLE reimbursement_invoice; Type: ACL; Schema: oem; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE oem.reimbursement_invoice TO app_user;


--
-- TOC entry 6691 (class 0 OID 0)
-- Dependencies: 299
-- Name: TABLE reimbursement_line; Type: ACL; Schema: oem; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE oem.reimbursement_line TO app_user;


--
-- TOC entry 6693 (class 0 OID 0)
-- Dependencies: 293
-- Name: TABLE spare_purchase; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.spare_purchase TO app_user;


--
-- TOC entry 6694 (class 0 OID 0)
-- Dependencies: 295
-- Name: TABLE spare_purchase_item; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.spare_purchase_item TO app_user;


--
-- TOC entry 6697 (class 0 OID 0)
-- Dependencies: 253
-- Name: TABLE vehicle_purchase; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.vehicle_purchase TO app_user;


--
-- TOC entry 6698 (class 0 OID 0)
-- Dependencies: 255
-- Name: TABLE vehicle_purchase_detail; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.vehicle_purchase_detail TO app_user;


--
-- TOC entry 6703 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE delivery_checklist; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.delivery_checklist TO app_user;


--
-- TOC entry 6705 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE payment_receipt; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.payment_receipt TO app_user;


--
-- TOC entry 6707 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale TO app_user;


--
-- TOC entry 6708 (class 0 OID 0)
-- Dependencies: 373
-- Name: TABLE sale_document; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale_document TO app_user;


--
-- TOC entry 6710 (class 0 OID 0)
-- Dependencies: 371
-- Name: TABLE sale_payment; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale_payment TO app_user;


--
-- TOC entry 6712 (class 0 OID 0)
-- Dependencies: 375
-- Name: TABLE sale_portal_tracking; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale_portal_tracking TO app_user;


--
-- TOC entry 6715 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE sale_stage_history; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale_stage_history TO app_user;


--
-- TOC entry 6717 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE service_schedule; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.service_schedule TO app_user;


--
-- TOC entry 6719 (class 0 OID 0)
-- Dependencies: 327
-- Name: TABLE spare_sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.spare_sale TO app_user;


--
-- TOC entry 6720 (class 0 OID 0)
-- Dependencies: 329
-- Name: TABLE spare_sale_detail; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.spare_sale_detail TO app_user;


--
-- TOC entry 6723 (class 0 OID 0)
-- Dependencies: 261
-- Name: TABLE vehicle_payment; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_payment TO app_user;


--
-- TOC entry 6725 (class 0 OID 0)
-- Dependencies: 321
-- Name: TABLE vehicle_registration; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_registration TO app_user;


--
-- TOC entry 6727 (class 0 OID 0)
-- Dependencies: 257
-- Name: TABLE vehicle_sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_sale TO app_user;


--
-- TOC entry 6728 (class 0 OID 0)
-- Dependencies: 259
-- Name: TABLE vehicle_sale_finance; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_sale_finance TO app_user;


--
-- TOC entry 6731 (class 0 OID 0)
-- Dependencies: 267
-- Name: TABLE job_card; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_card TO app_user;


--
-- TOC entry 6733 (class 0 OID 0)
-- Dependencies: 271
-- Name: TABLE job_labour; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_labour TO app_user;


--
-- TOC entry 6735 (class 0 OID 0)
-- Dependencies: 277
-- Name: TABLE job_spare; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_spare TO app_user;


--
-- TOC entry 6737 (class 0 OID 0)
-- Dependencies: 269
-- Name: TABLE job_work_item; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_work_item TO app_user;


--
-- TOC entry 6739 (class 0 OID 0)
-- Dependencies: 377
-- Name: TABLE service_followup; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.service_followup TO app_user;


--
-- TOC entry 6741 (class 0 OID 0)
-- Dependencies: 323
-- Name: TABLE service_schedule; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.service_schedule TO app_user;


--
-- TOC entry 6743 (class 0 OID 0)
-- Dependencies: 273
-- Name: TABLE vehicle_component_change; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.vehicle_component_change TO app_user;


--
-- TOC entry 6745 (class 0 OID 0)
-- Dependencies: 325
-- Name: TABLE vehicle_service_summary; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.vehicle_service_summary TO app_user;


--
-- TOC entry 6747 (class 0 OID 0)
-- Dependencies: 279
-- Name: TABLE claim; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.claim TO app_user;


--
-- TOC entry 6749 (class 0 OID 0)
-- Dependencies: 301
-- Name: TABLE inward; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.inward TO app_user;


--
-- TOC entry 6750 (class 0 OID 0)
-- Dependencies: 303
-- Name: TABLE inward_item; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.inward_item TO app_user;


--
-- TOC entry 6753 (class 0 OID 0)
-- Dependencies: 275
-- Name: TABLE shipment; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.shipment TO app_user;


--
-- TOC entry 6754 (class 0 OID 0)
-- Dependencies: 281
-- Name: TABLE shipment_item; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.shipment_item TO app_user;


--
-- TOC entry 2502 (class 826 OID 26239)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: billing; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA billing GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2503 (class 826 OID 26243)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: crm; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2504 (class 826 OID 26245)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: finance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finance GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2505 (class 826 OID 26244)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: hr; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA hr GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2506 (class 826 OID 26242)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: insurance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA insurance GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2507 (class 826 OID 26236)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: inventory; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA inventory GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2508 (class 826 OID 26235)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: master; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA master GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2509 (class 826 OID 26246)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: oem; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA oem GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2510 (class 826 OID 26237)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: procurement; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA procurement GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2511 (class 826 OID 26238)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: sales; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sales GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2512 (class 826 OID 26240)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: service; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA service GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2513 (class 826 OID 26241)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: warranty; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA warranty GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


-- Completed on 2026-02-22 21:44:08

--
-- PostgreSQL database dump complete
--

\unrestrict s3MACyTvfBO2tCeXhAHQbFjdx7ht7EgpwDS8fcTZeLGdsC17b2o0xxBNy8i5bur

