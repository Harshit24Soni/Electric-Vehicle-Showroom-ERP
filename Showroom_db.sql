--
-- PostgreSQL database dump
--

\restrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

-- Started on 2026-02-14 13:45:43

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

DROP DATABASE IF EXISTS showroom_db;
--
-- TOC entry 6095 (class 1262 OID 24585)
-- Name: showroom_db; Type: DATABASE; Schema: -; Owner: postgres
--

CREATE DATABASE showroom_db WITH TEMPLATE = template0 ENCODING = 'UTF8' LOCALE_PROVIDER = libc LOCALE = 'English_India.1252';


ALTER DATABASE showroom_db OWNER TO postgres;

\unrestrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D
\connect showroom_db
\restrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D

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
-- TOC entry 6096 (class 0 OID 0)
-- Name: showroom_db; Type: DATABASE PROPERTIES; Schema: -; Owner: postgres
--

ALTER DATABASE showroom_db SET "TimeZone" TO 'Asia/Kolkata';


\unrestrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D
\connect showroom_db
\restrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D

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
-- TOC entry 284 (class 1259 OID 25389)
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
-- TOC entry 283 (class 1259 OID 25388)
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
-- TOC entry 6110 (class 0 OID 0)
-- Dependencies: 283
-- Name: insurance_estimate_estimate_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.insurance_estimate_estimate_id_seq OWNED BY billing.insurance_estimate.estimate_id;


--
-- TOC entry 280 (class 1259 OID 25331)
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
-- TOC entry 279 (class 1259 OID 25330)
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
-- TOC entry 6112 (class 0 OID 0)
-- Dependencies: 279
-- Name: invoice_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.invoice_invoice_id_seq OWNED BY billing.invoice.invoice_id;


--
-- TOC entry 282 (class 1259 OID 25364)
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
-- TOC entry 281 (class 1259 OID 25363)
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
-- TOC entry 6114 (class 0 OID 0)
-- Dependencies: 281
-- Name: invoice_line_invoice_line_id_seq; Type: SEQUENCE OWNED BY; Schema: billing; Owner: postgres
--

ALTER SEQUENCE billing.invoice_line_invoice_line_id_seq OWNED BY billing.invoice_line.invoice_line_id;


--
-- TOC entry 234 (class 1259 OID 24697)
-- Name: message_log; Type: TABLE; Schema: communication; Owner: postgres
--

CREATE TABLE communication.message_log (
);


ALTER TABLE communication.message_log OWNER TO postgres;

--
-- TOC entry 233 (class 1259 OID 24694)
-- Name: reminder; Type: TABLE; Schema: communication; Owner: postgres
--

CREATE TABLE communication.reminder (
);


ALTER TABLE communication.reminder OWNER TO postgres;

--
-- TOC entry 346 (class 1259 OID 26369)
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
-- TOC entry 345 (class 1259 OID 26368)
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
-- TOC entry 6116 (class 0 OID 0)
-- Dependencies: 345
-- Name: enquiry_enquiry_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.enquiry_enquiry_id_seq OWNED BY crm.enquiry.enquiry_id;


--
-- TOC entry 352 (class 1259 OID 26427)
-- Name: enquiry_status_master; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.enquiry_status_master (
    status_id integer NOT NULL,
    status_name character varying(50) NOT NULL,
    display_order integer DEFAULT 0
);


ALTER TABLE crm.enquiry_status_master OWNER TO postgres;

--
-- TOC entry 351 (class 1259 OID 26426)
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
-- TOC entry 6118 (class 0 OID 0)
-- Dependencies: 351
-- Name: enquiry_status_master_status_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.enquiry_status_master_status_id_seq OWNED BY crm.enquiry_status_master.status_id;


--
-- TOC entry 312 (class 1259 OID 25832)
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
-- TOC entry 311 (class 1259 OID 25831)
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
-- TOC entry 6120 (class 0 OID 0)
-- Dependencies: 311
-- Name: followup_schedule_followup_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.followup_schedule_followup_id_seq OWNED BY crm.followup_schedule.followup_id;


--
-- TOC entry 306 (class 1259 OID 25746)
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
    created_by_staff_id bigint NOT NULL
);


ALTER TABLE crm.lead OWNER TO postgres;

--
-- TOC entry 310 (class 1259 OID 25804)
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
-- TOC entry 309 (class 1259 OID 25803)
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
-- TOC entry 6123 (class 0 OID 0)
-- Dependencies: 309
-- Name: lead_activity_activity_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_activity_activity_id_seq OWNED BY crm.lead_activity.activity_id;


--
-- TOC entry 316 (class 1259 OID 25911)
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
-- TOC entry 315 (class 1259 OID 25910)
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
-- TOC entry 6125 (class 0 OID 0)
-- Dependencies: 315
-- Name: lead_assignment_history_assignment_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_assignment_history_assignment_id_seq OWNED BY crm.lead_assignment_history.assignment_id;


--
-- TOC entry 305 (class 1259 OID 25745)
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
-- TOC entry 6126 (class 0 OID 0)
-- Dependencies: 305
-- Name: lead_lead_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_lead_id_seq OWNED BY crm.lead.lead_id;


--
-- TOC entry 308 (class 1259 OID 25779)
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
-- TOC entry 307 (class 1259 OID 25778)
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
-- TOC entry 6128 (class 0 OID 0)
-- Dependencies: 307
-- Name: lead_status_history_status_history_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_status_history_status_history_id_seq OWNED BY crm.lead_status_history.status_history_id;


--
-- TOC entry 350 (class 1259 OID 26415)
-- Name: lead_status_master; Type: TABLE; Schema: crm; Owner: postgres
--

CREATE TABLE crm.lead_status_master (
    status_id integer NOT NULL,
    status_name character varying(50) NOT NULL,
    display_order integer DEFAULT 0
);


ALTER TABLE crm.lead_status_master OWNER TO postgres;

--
-- TOC entry 349 (class 1259 OID 26414)
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
-- TOC entry 6130 (class 0 OID 0)
-- Dependencies: 349
-- Name: lead_status_master_status_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.lead_status_master_status_id_seq OWNED BY crm.lead_status_master.status_id;


--
-- TOC entry 314 (class 1259 OID 25880)
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
-- TOC entry 313 (class 1259 OID 25879)
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
-- TOC entry 6132 (class 0 OID 0)
-- Dependencies: 313
-- Name: test_ride_test_ride_id_seq; Type: SEQUENCE OWNED BY; Schema: crm; Owner: postgres
--

ALTER SEQUENCE crm.test_ride_test_ride_id_seq OWNED BY crm.test_ride.test_ride_id;


--
-- TOC entry 336 (class 1259 OID 26194)
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
-- TOC entry 326 (class 1259 OID 26045)
-- Name: expense_category; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.expense_category (
    expense_category_id bigint NOT NULL,
    category_name character varying(150) NOT NULL,
    parent_category_id bigint,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.expense_category OWNER TO postgres;

--
-- TOC entry 338 (class 1259 OID 26222)
-- Name: expense_summary_view; Type: VIEW; Schema: finance; Owner: postgres
--

CREATE VIEW finance.expense_summary_view AS
 SELECT s.salary_month AS expense_month,
    ec.category_name AS expense_category,
    count(s.salary_id) AS entry_count,
    sum(s.gross_amount) AS total_expense
   FROM (hr.salary s
     JOIN master.expense_category ec ON (((ec.category_name)::text = 'SALARY'::text)))
  GROUP BY s.salary_month, ec.category_name;


ALTER VIEW finance.expense_summary_view OWNER TO postgres;

--
-- TOC entry 337 (class 1259 OID 26217)
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
-- TOC entry 342 (class 1259 OID 26304)
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
-- TOC entry 341 (class 1259 OID 26303)
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
-- TOC entry 6138 (class 0 OID 0)
-- Dependencies: 341
-- Name: vehicle_loan_loan_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.vehicle_loan_loan_id_seq OWNED BY finance.vehicle_loan.loan_id;


--
-- TOC entry 344 (class 1259 OID 26328)
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
-- TOC entry 343 (class 1259 OID 26327)
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
-- TOC entry 6140 (class 0 OID 0)
-- Dependencies: 343
-- Name: vehicle_subsidy_subsidy_id_seq; Type: SEQUENCE OWNED BY; Schema: finance; Owner: postgres
--

ALTER SEQUENCE finance.vehicle_subsidy_subsidy_id_seq OWNED BY finance.vehicle_subsidy.subsidy_id;


--
-- TOC entry 334 (class 1259 OID 26168)
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
-- TOC entry 333 (class 1259 OID 26167)
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
-- TOC entry 6142 (class 0 OID 0)
-- Dependencies: 333
-- Name: attendance_attendance_id_seq; Type: SEQUENCE OWNED BY; Schema: hr; Owner: postgres
--

ALTER SEQUENCE hr.attendance_attendance_id_seq OWNED BY hr.attendance.attendance_id;


--
-- TOC entry 335 (class 1259 OID 26193)
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
-- TOC entry 6143 (class 0 OID 0)
-- Dependencies: 335
-- Name: salary_salary_id_seq; Type: SEQUENCE OWNED BY; Schema: hr; Owner: postgres
--

ALTER SEQUENCE hr.salary_salary_id_seq OWNED BY hr.salary.salary_id;


--
-- TOC entry 260 (class 1259 OID 25079)
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
-- TOC entry 259 (class 1259 OID 25078)
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
-- TOC entry 6145 (class 0 OID 0)
-- Dependencies: 259
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE OWNED BY; Schema: insurance; Owner: postgres
--

ALTER SEQUENCE insurance.insurance_company_insurance_company_id_seq OWNED BY insurance.insurance_company.insurance_company_id;


--
-- TOC entry 262 (class 1259 OID 25094)
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
-- TOC entry 261 (class 1259 OID 25093)
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
-- TOC entry 6147 (class 0 OID 0)
-- Dependencies: 261
-- Name: policy_policy_id_seq; Type: SEQUENCE OWNED BY; Schema: insurance; Owner: postgres
--

ALTER SEQUENCE insurance.policy_policy_id_seq OWNED BY insurance.policy.policy_id;


--
-- TOC entry 288 (class 1259 OID 25434)
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
    CONSTRAINT spare_master_dealer_margin_percent_check CHECK ((dealer_margin_percent >= (0)::numeric))
);


ALTER TABLE inventory.spare_master OWNER TO postgres;

--
-- TOC entry 287 (class 1259 OID 25433)
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
-- TOC entry 6149 (class 0 OID 0)
-- Dependencies: 287
-- Name: spare_master_spare_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_master_spare_id_seq OWNED BY inventory.spare_master.spare_id;


--
-- TOC entry 302 (class 1259 OID 25597)
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
    CONSTRAINT spare_serial_source_type_check CHECK (((source_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'WARRANTY_INWARD'::character varying])::text[]))),
    CONSTRAINT spare_serial_status_check CHECK (((status)::text = ANY ((ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'USED_IN_SERVICE'::character varying])::text[])))
);


ALTER TABLE inventory.spare_serial OWNER TO postgres;

--
-- TOC entry 301 (class 1259 OID 25596)
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
-- TOC entry 6151 (class 0 OID 0)
-- Dependencies: 301
-- Name: spare_serial_spare_serial_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_serial_spare_serial_id_seq OWNED BY inventory.spare_serial.spare_serial_id;


--
-- TOC entry 286 (class 1259 OID 25411)
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
    CONSTRAINT chk_spare_stock_movement_type CHECK (((movement_type)::text = ANY ((ARRAY['PURCHASE'::character varying, 'SALE'::character varying, 'SERVICE_PAID'::character varying, 'SERVICE_INSURANCE'::character varying, 'ADJUSTMENT'::character varying])::text[])))
);


ALTER TABLE inventory.spare_stock_movement OWNER TO postgres;

--
-- TOC entry 285 (class 1259 OID 25410)
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
-- TOC entry 6153 (class 0 OID 0)
-- Dependencies: 285
-- Name: spare_stock_movement_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.spare_stock_movement_movement_id_seq OWNED BY inventory.spare_stock_movement.movement_id;


--
-- TOC entry 340 (class 1259 OID 26263)
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
    CONSTRAINT chk_vehicle_movement_type CHECK (((movement_type)::text = ANY ((ARRAY['INWARD'::character varying, 'AVAILABLE'::character varying, 'ALLOCATED'::character varying, 'DELIVERED'::character varying, 'SERVICE_OUT'::character varying, 'SERVICE_IN'::character varying, 'DEMO'::character varying, 'TRANSFER'::character varying, 'SCRAPPED'::character varying])::text[]))),
    CONSTRAINT chk_vehicle_reference_type CHECK (((reference_type)::text = ANY ((ARRAY['PROCUREMENT'::character varying, 'SALE'::character varying, 'SERVICE'::character varying, 'WARRANTY'::character varying, 'INSURANCE'::character varying, 'MANUAL'::character varying])::text[])))
);


ALTER TABLE inventory.vehicle_stock_movement OWNER TO postgres;

--
-- TOC entry 339 (class 1259 OID 26262)
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
-- TOC entry 6155 (class 0 OID 0)
-- Dependencies: 339
-- Name: vehicle_stock_movement_movement_id_seq; Type: SEQUENCE OWNED BY; Schema: inventory; Owner: postgres
--

ALTER SEQUENCE inventory.vehicle_stock_movement_movement_id_seq OWNED BY inventory.vehicle_stock_movement.movement_id;


--
-- TOC entry 354 (class 1259 OID 26439)
-- Name: brand; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.brand (
    brand_id integer NOT NULL,
    brand_name character varying(100) NOT NULL,
    deleted_at timestamp without time zone
);


ALTER TABLE master.brand OWNER TO postgres;

--
-- TOC entry 353 (class 1259 OID 26438)
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
-- TOC entry 6157 (class 0 OID 0)
-- Dependencies: 353
-- Name: brand_brand_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.brand_brand_id_seq OWNED BY master.brand.brand_id;


--
-- TOC entry 232 (class 1259 OID 24595)
-- Name: customer; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.customer (
    customer_type character varying(20),
    name character varying(150),
    guardian_name character varying(150),
    primary_phone character varying(15),
    email character varying(150),
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
    CONSTRAINT chk_customer_type CHECK (((customer_type)::text = ANY ((ARRAY['INDIVIDUAL'::character varying, 'BUSINESS'::character varying])::text[])))
);


ALTER TABLE master.customer OWNER TO postgres;

--
-- TOC entry 235 (class 1259 OID 24713)
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
-- TOC entry 6159 (class 0 OID 0)
-- Dependencies: 235
-- Name: customer_customer_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_customer_id_seq OWNED BY master.customer.customer_id;


--
-- TOC entry 239 (class 1259 OID 24752)
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
-- TOC entry 238 (class 1259 OID 24751)
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
-- TOC entry 6161 (class 0 OID 0)
-- Dependencies: 238
-- Name: customer_document_customer_document_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_document_customer_document_id_seq OWNED BY master.customer_document.customer_document_id;


--
-- TOC entry 237 (class 1259 OID 24729)
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
-- TOC entry 236 (class 1259 OID 24728)
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
-- TOC entry 6163 (class 0 OID 0)
-- Dependencies: 236
-- Name: customer_phone_customer_phone_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.customer_phone_customer_phone_id_seq OWNED BY master.customer_phone.customer_phone_id;


--
-- TOC entry 325 (class 1259 OID 26044)
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
-- TOC entry 6164 (class 0 OID 0)
-- Dependencies: 325
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.expense_category_expense_category_id_seq OWNED BY master.expense_category.expense_category_id;


--
-- TOC entry 328 (class 1259 OID 26065)
-- Name: job_card_category; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.job_card_category (
    job_card_category_id bigint NOT NULL,
    category_code character varying(30) NOT NULL,
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.job_card_category OWNER TO postgres;

--
-- TOC entry 327 (class 1259 OID 26064)
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
-- TOC entry 6166 (class 0 OID 0)
-- Dependencies: 327
-- Name: job_card_category_job_card_category_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.job_card_category_job_card_category_id_seq OWNED BY master.job_card_category.job_card_category_id;


--
-- TOC entry 348 (class 1259 OID 26393)
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
    deleted_at timestamp without time zone
);


ALTER TABLE master.nominee OWNER TO postgres;

--
-- TOC entry 347 (class 1259 OID 26392)
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
-- TOC entry 6168 (class 0 OID 0)
-- Dependencies: 347
-- Name: nominee_nominee_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.nominee_nominee_id_seq OWNED BY master.nominee.nominee_id;


--
-- TOC entry 324 (class 1259 OID 26028)
-- Name: payment_mode; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.payment_mode (
    payment_mode_id bigint NOT NULL,
    mode_code character varying(30) NOT NULL,
    display_name character varying(100) NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);


ALTER TABLE master.payment_mode OWNER TO postgres;

--
-- TOC entry 323 (class 1259 OID 26027)
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
-- TOC entry 6170 (class 0 OID 0)
-- Dependencies: 323
-- Name: payment_mode_payment_mode_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.payment_mode_payment_mode_id_seq OWNED BY master.payment_mode.payment_mode_id;


--
-- TOC entry 369 (class 1259 OID 26747)
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
-- TOC entry 368 (class 1259 OID 26746)
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
-- TOC entry 6172 (class 0 OID 0)
-- Dependencies: 368
-- Name: pin_reset_request_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.pin_reset_request_id_seq OWNED BY master.pin_reset_request.id;


--
-- TOC entry 364 (class 1259 OID 26603)
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
-- TOC entry 363 (class 1259 OID 26602)
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
-- TOC entry 6174 (class 0 OID 0)
-- Dependencies: 363
-- Name: spare_price_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.spare_price_history_history_id_seq OWNED BY master.spare_price_history.history_id;


--
-- TOC entry 304 (class 1259 OID 25700)
-- Name: staff; Type: TABLE; Schema: master; Owner: postgres
--

CREATE TABLE master.staff (
    staff_id bigint NOT NULL,
    full_name character varying(150) NOT NULL,
    mobile_no character varying(20) NOT NULL,
    email character varying(150),
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
    totp_secret character varying(100) DEFAULT NULL::character varying,
    dealer_id bigint,
    joining_date date,
    address_line1 text,
    address_line2 text,
    city character varying(100),
    state character varying(100),
    pincode character varying(10),
    bank_ifsc character varying(20),
    emergency_contact_name character varying(100),
    emergency_contact_no character varying(15)
);


ALTER TABLE master.staff OWNER TO postgres;

--
-- TOC entry 303 (class 1259 OID 25699)
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
-- TOC entry 6176 (class 0 OID 0)
-- Dependencies: 303
-- Name: staff_staff_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.staff_staff_id_seq OWNED BY master.staff.staff_id;


--
-- TOC entry 242 (class 1259 OID 24794)
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
    CONSTRAINT chk_vehicle_dom CHECK (((date_of_manufacture IS NULL) OR (date_of_manufacture <= CURRENT_DATE))),
    CONSTRAINT vehicle_current_status_check CHECK (((current_status)::text = ANY ((ARRAY['IN_STOCK'::character varying, 'SOLD'::character varying, 'SERVICE'::character varying])::text[])))
);


ALTER TABLE master.vehicle OWNER TO postgres;

--
-- TOC entry 241 (class 1259 OID 24777)
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
    deleted_at timestamp without time zone
);


ALTER TABLE master.vehicle_model OWNER TO postgres;

--
-- TOC entry 240 (class 1259 OID 24776)
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
-- TOC entry 6179 (class 0 OID 0)
-- Dependencies: 240
-- Name: vehicle_model_vehicle_model_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vehicle_model_vehicle_model_id_seq OWNED BY master.vehicle_model.vehicle_model_id;


--
-- TOC entry 366 (class 1259 OID 26630)
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
-- TOC entry 365 (class 1259 OID 26629)
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
-- TOC entry 6181 (class 0 OID 0)
-- Dependencies: 365
-- Name: vehicle_price_history_history_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vehicle_price_history_history_id_seq OWNED BY master.vehicle_price_history.history_id;


--
-- TOC entry 244 (class 1259 OID 24864)
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
    CONSTRAINT vendor_vendor_type_check CHECK (((vendor_type)::text = ANY ((ARRAY['OEM'::character varying, 'DEALER'::character varying, 'LOCAL'::character varying])::text[])))
);


ALTER TABLE master.vendor OWNER TO postgres;

--
-- TOC entry 246 (class 1259 OID 24885)
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
-- TOC entry 245 (class 1259 OID 24884)
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
-- TOC entry 6184 (class 0 OID 0)
-- Dependencies: 245
-- Name: vendor_contact_vendor_contact_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_contact_vendor_contact_id_seq OWNED BY master.vendor_contact.vendor_contact_id;


--
-- TOC entry 248 (class 1259 OID 24907)
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
-- TOC entry 247 (class 1259 OID 24906)
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
-- TOC entry 6186 (class 0 OID 0)
-- Dependencies: 247
-- Name: vendor_document_vendor_document_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_document_vendor_document_id_seq OWNED BY master.vendor_document.vendor_document_id;


--
-- TOC entry 243 (class 1259 OID 24863)
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
-- TOC entry 6187 (class 0 OID 0)
-- Dependencies: 243
-- Name: vendor_vendor_id_seq; Type: SEQUENCE OWNED BY; Schema: master; Owner: postgres
--

ALTER SEQUENCE master.vendor_vendor_id_seq OWNED BY master.vendor.vendor_id;


--
-- TOC entry 294 (class 1259 OID 25502)
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
-- TOC entry 293 (class 1259 OID 25501)
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
-- TOC entry 6189 (class 0 OID 0)
-- Dependencies: 293
-- Name: reimbursement_invoice_reimbursement_invoice_id_seq; Type: SEQUENCE OWNED BY; Schema: oem; Owner: postgres
--

ALTER SEQUENCE oem.reimbursement_invoice_reimbursement_invoice_id_seq OWNED BY oem.reimbursement_invoice.reimbursement_invoice_id;


--
-- TOC entry 296 (class 1259 OID 25523)
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
-- TOC entry 295 (class 1259 OID 25522)
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
-- TOC entry 6191 (class 0 OID 0)
-- Dependencies: 295
-- Name: reimbursement_line_reimbursement_line_id_seq; Type: SEQUENCE OWNED BY; Schema: oem; Owner: postgres
--

ALTER SEQUENCE oem.reimbursement_line_reimbursement_line_id_seq OWNED BY oem.reimbursement_line.reimbursement_line_id;


--
-- TOC entry 290 (class 1259 OID 25457)
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
-- TOC entry 292 (class 1259 OID 25476)
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
-- TOC entry 291 (class 1259 OID 25475)
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
-- TOC entry 6194 (class 0 OID 0)
-- Dependencies: 291
-- Name: spare_purchase_item_purchase_item_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.spare_purchase_item_purchase_item_id_seq OWNED BY procurement.spare_purchase_item.purchase_item_id;


--
-- TOC entry 289 (class 1259 OID 25456)
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
-- TOC entry 6195 (class 0 OID 0)
-- Dependencies: 289
-- Name: spare_purchase_spare_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.spare_purchase_spare_purchase_id_seq OWNED BY procurement.spare_purchase.spare_purchase_id;


--
-- TOC entry 250 (class 1259 OID 24929)
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
-- TOC entry 252 (class 1259 OID 24949)
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
-- TOC entry 251 (class 1259 OID 24948)
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
-- TOC entry 6198 (class 0 OID 0)
-- Dependencies: 251
-- Name: vehicle_purchase_detail_vehicle_purchase_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq OWNED BY procurement.vehicle_purchase_detail.vehicle_purchase_detail_id;


--
-- TOC entry 249 (class 1259 OID 24928)
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
-- TOC entry 6199 (class 0 OID 0)
-- Dependencies: 249
-- Name: vehicle_purchase_vehicle_purchase_id_seq; Type: SEQUENCE OWNED BY; Schema: procurement; Owner: postgres
--

ALTER SEQUENCE procurement.vehicle_purchase_vehicle_purchase_id_seq OWNED BY procurement.vehicle_purchase.vehicle_purchase_id;


--
-- TOC entry 367 (class 1259 OID 26739)
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- TOC entry 360 (class 1259 OID 26551)
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
-- TOC entry 359 (class 1259 OID 26550)
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
-- TOC entry 6201 (class 0 OID 0)
-- Dependencies: 359
-- Name: delivery_checklist_checklist_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.delivery_checklist_checklist_id_seq OWNED BY sales.delivery_checklist.checklist_id;


--
-- TOC entry 358 (class 1259 OID 26527)
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
-- TOC entry 357 (class 1259 OID 26526)
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
-- TOC entry 6203 (class 0 OID 0)
-- Dependencies: 357
-- Name: payment_receipt_receipt_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.payment_receipt_receipt_id_seq OWNED BY sales.payment_receipt.receipt_id;


--
-- TOC entry 356 (class 1259 OID 26475)
-- Name: sale; Type: TABLE; Schema: sales; Owner: postgres
--

CREATE TABLE sales.sale (
    sale_id bigint NOT NULL,
    lead_id bigint NOT NULL,
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
    is_service_schedule_generated boolean DEFAULT false
);


ALTER TABLE sales.sale OWNER TO postgres;

--
-- TOC entry 355 (class 1259 OID 26474)
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
-- TOC entry 6205 (class 0 OID 0)
-- Dependencies: 355
-- Name: sale_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.sale_sale_id_seq OWNED BY sales.sale.sale_id;


--
-- TOC entry 362 (class 1259 OID 26574)
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
-- TOC entry 361 (class 1259 OID 26573)
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
-- TOC entry 6207 (class 0 OID 0)
-- Dependencies: 361
-- Name: service_schedule_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.service_schedule_schedule_id_seq OWNED BY sales.service_schedule.schedule_id;


--
-- TOC entry 330 (class 1259 OID 26114)
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
-- TOC entry 332 (class 1259 OID 26138)
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
-- TOC entry 331 (class 1259 OID 26137)
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
-- TOC entry 6210 (class 0 OID 0)
-- Dependencies: 331
-- Name: spare_sale_detail_spare_sale_detail_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.spare_sale_detail_spare_sale_detail_id_seq OWNED BY sales.spare_sale_detail.spare_sale_detail_id;


--
-- TOC entry 329 (class 1259 OID 26113)
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
-- TOC entry 6211 (class 0 OID 0)
-- Dependencies: 329
-- Name: spare_sale_spare_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.spare_sale_spare_sale_id_seq OWNED BY sales.spare_sale.spare_sale_id;


--
-- TOC entry 258 (class 1259 OID 25044)
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
-- TOC entry 257 (class 1259 OID 25043)
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
-- TOC entry 6213 (class 0 OID 0)
-- Dependencies: 257
-- Name: vehicle_payment_vehicle_payment_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_payment_vehicle_payment_id_seq OWNED BY sales.vehicle_payment.vehicle_payment_id;


--
-- TOC entry 318 (class 1259 OID 25958)
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
-- TOC entry 317 (class 1259 OID 25957)
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
-- TOC entry 6215 (class 0 OID 0)
-- Dependencies: 317
-- Name: vehicle_registration_vehicle_registration_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_registration_vehicle_registration_id_seq OWNED BY sales.vehicle_registration.vehicle_registration_id;


--
-- TOC entry 254 (class 1259 OID 24973)
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
-- TOC entry 256 (class 1259 OID 25027)
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
-- TOC entry 255 (class 1259 OID 25026)
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
-- TOC entry 6218 (class 0 OID 0)
-- Dependencies: 255
-- Name: vehicle_sale_finance_vehicle_sale_finance_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_sale_finance_vehicle_sale_finance_id_seq OWNED BY sales.vehicle_sale_finance.vehicle_sale_finance_id;


--
-- TOC entry 253 (class 1259 OID 24972)
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
-- TOC entry 6219 (class 0 OID 0)
-- Dependencies: 253
-- Name: vehicle_sale_vehicle_sale_id_seq; Type: SEQUENCE OWNED BY; Schema: sales; Owner: postgres
--

ALTER SEQUENCE sales.vehicle_sale_vehicle_sale_id_seq OWNED BY sales.vehicle_sale.vehicle_sale_id;


--
-- TOC entry 264 (class 1259 OID 25130)
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
-- TOC entry 263 (class 1259 OID 25129)
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
-- TOC entry 6221 (class 0 OID 0)
-- Dependencies: 263
-- Name: job_card_job_card_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_card_job_card_id_seq OWNED BY service.job_card.job_card_id;


--
-- TOC entry 268 (class 1259 OID 25179)
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
-- TOC entry 267 (class 1259 OID 25178)
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
-- TOC entry 6223 (class 0 OID 0)
-- Dependencies: 267
-- Name: job_labour_job_labour_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_labour_job_labour_id_seq OWNED BY service.job_labour.job_labour_id;


--
-- TOC entry 274 (class 1259 OID 25271)
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
-- TOC entry 273 (class 1259 OID 25270)
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
-- TOC entry 6225 (class 0 OID 0)
-- Dependencies: 273
-- Name: job_spare_job_spare_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_spare_job_spare_id_seq OWNED BY service.job_spare.job_spare_id;


--
-- TOC entry 266 (class 1259 OID 25159)
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
-- TOC entry 265 (class 1259 OID 25158)
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
-- TOC entry 6227 (class 0 OID 0)
-- Dependencies: 265
-- Name: job_work_item_work_item_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.job_work_item_work_item_id_seq OWNED BY service.job_work_item.work_item_id;


--
-- TOC entry 320 (class 1259 OID 25980)
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
-- TOC entry 319 (class 1259 OID 25979)
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
-- TOC entry 6229 (class 0 OID 0)
-- Dependencies: 319
-- Name: service_schedule_service_schedule_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.service_schedule_service_schedule_id_seq OWNED BY service.service_schedule.service_schedule_id;


--
-- TOC entry 270 (class 1259 OID 25199)
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
-- TOC entry 269 (class 1259 OID 25198)
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
-- TOC entry 6231 (class 0 OID 0)
-- Dependencies: 269
-- Name: vehicle_component_change_component_change_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.vehicle_component_change_component_change_id_seq OWNED BY service.vehicle_component_change.component_change_id;


--
-- TOC entry 322 (class 1259 OID 26001)
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
-- TOC entry 321 (class 1259 OID 26000)
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
-- TOC entry 6233 (class 0 OID 0)
-- Dependencies: 321
-- Name: vehicle_service_summary_vehicle_service_summary_id_seq; Type: SEQUENCE OWNED BY; Schema: service; Owner: postgres
--

ALTER SEQUENCE service.vehicle_service_summary_vehicle_service_summary_id_seq OWNED BY service.vehicle_service_summary.vehicle_service_summary_id;


--
-- TOC entry 276 (class 1259 OID 25290)
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
-- TOC entry 275 (class 1259 OID 25289)
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
-- TOC entry 6235 (class 0 OID 0)
-- Dependencies: 275
-- Name: claim_claim_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.claim_claim_id_seq OWNED BY warranty.claim.claim_id;


--
-- TOC entry 298 (class 1259 OID 25557)
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
-- TOC entry 300 (class 1259 OID 25573)
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
-- TOC entry 299 (class 1259 OID 25572)
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
-- TOC entry 6238 (class 0 OID 0)
-- Dependencies: 299
-- Name: inward_item_inward_item_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.inward_item_inward_item_id_seq OWNED BY warranty.inward_item.inward_item_id;


--
-- TOC entry 297 (class 1259 OID 25556)
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
-- TOC entry 6239 (class 0 OID 0)
-- Dependencies: 297
-- Name: inward_warranty_inward_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.inward_warranty_inward_id_seq OWNED BY warranty.inward.warranty_inward_id;


--
-- TOC entry 272 (class 1259 OID 25256)
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
-- TOC entry 278 (class 1259 OID 25308)
-- Name: shipment_item; Type: TABLE; Schema: warranty; Owner: postgres
--

CREATE TABLE warranty.shipment_item (
    shipment_item_id bigint NOT NULL,
    shipment_id bigint NOT NULL,
    claim_id bigint NOT NULL
);


ALTER TABLE warranty.shipment_item OWNER TO postgres;

--
-- TOC entry 277 (class 1259 OID 25307)
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
-- TOC entry 6242 (class 0 OID 0)
-- Dependencies: 277
-- Name: shipment_item_shipment_item_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.shipment_item_shipment_item_id_seq OWNED BY warranty.shipment_item.shipment_item_id;


--
-- TOC entry 271 (class 1259 OID 25255)
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
-- TOC entry 6243 (class 0 OID 0)
-- Dependencies: 271
-- Name: shipment_shipment_id_seq; Type: SEQUENCE OWNED BY; Schema: warranty; Owner: postgres
--

ALTER SEQUENCE warranty.shipment_shipment_id_seq OWNED BY warranty.shipment.shipment_id;


--
-- TOC entry 5296 (class 2604 OID 26662)
-- Name: insurance_estimate estimate_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate ALTER COLUMN estimate_id SET DEFAULT nextval('billing.insurance_estimate_estimate_id_seq'::regclass);


--
-- TOC entry 5289 (class 2604 OID 26663)
-- Name: invoice invoice_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice ALTER COLUMN invoice_id SET DEFAULT nextval('billing.invoice_invoice_id_seq'::regclass);


--
-- TOC entry 5293 (class 2604 OID 26664)
-- Name: invoice_line invoice_line_id; Type: DEFAULT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line ALTER COLUMN invoice_line_id SET DEFAULT nextval('billing.invoice_line_invoice_line_id_seq'::regclass);


--
-- TOC entry 5370 (class 2604 OID 26665)
-- Name: enquiry enquiry_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry ALTER COLUMN enquiry_id SET DEFAULT nextval('crm.enquiry_enquiry_id_seq'::regclass);


--
-- TOC entry 5378 (class 2604 OID 26666)
-- Name: enquiry_status_master status_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master ALTER COLUMN status_id SET DEFAULT nextval('crm.enquiry_status_master_status_id_seq'::regclass);


--
-- TOC entry 5334 (class 2604 OID 26667)
-- Name: followup_schedule followup_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule ALTER COLUMN followup_id SET DEFAULT nextval('crm.followup_schedule_followup_id_seq'::regclass);


--
-- TOC entry 5326 (class 2604 OID 26668)
-- Name: lead lead_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead ALTER COLUMN lead_id SET DEFAULT nextval('crm.lead_lead_id_seq'::regclass);


--
-- TOC entry 5332 (class 2604 OID 26669)
-- Name: lead_activity activity_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity ALTER COLUMN activity_id SET DEFAULT nextval('crm.lead_activity_activity_id_seq'::regclass);


--
-- TOC entry 5338 (class 2604 OID 26670)
-- Name: lead_assignment_history assignment_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history ALTER COLUMN assignment_id SET DEFAULT nextval('crm.lead_assignment_history_assignment_id_seq'::regclass);


--
-- TOC entry 5330 (class 2604 OID 26671)
-- Name: lead_status_history status_history_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history ALTER COLUMN status_history_id SET DEFAULT nextval('crm.lead_status_history_status_history_id_seq'::regclass);


--
-- TOC entry 5376 (class 2604 OID 26672)
-- Name: lead_status_master status_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master ALTER COLUMN status_id SET DEFAULT nextval('crm.lead_status_master_status_id_seq'::regclass);


--
-- TOC entry 5336 (class 2604 OID 26673)
-- Name: test_ride test_ride_id; Type: DEFAULT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride ALTER COLUMN test_ride_id SET DEFAULT nextval('crm.test_ride_test_ride_id_seq'::regclass);


--
-- TOC entry 5365 (class 2604 OID 26674)
-- Name: vehicle_loan loan_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan ALTER COLUMN loan_id SET DEFAULT nextval('finance.vehicle_loan_loan_id_seq'::regclass);


--
-- TOC entry 5368 (class 2604 OID 26675)
-- Name: vehicle_subsidy subsidy_id; Type: DEFAULT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy ALTER COLUMN subsidy_id SET DEFAULT nextval('finance.vehicle_subsidy_subsidy_id_seq'::regclass);


--
-- TOC entry 5359 (class 2604 OID 26676)
-- Name: attendance attendance_id; Type: DEFAULT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance ALTER COLUMN attendance_id SET DEFAULT nextval('hr.attendance_attendance_id_seq'::regclass);


--
-- TOC entry 5361 (class 2604 OID 26677)
-- Name: salary salary_id; Type: DEFAULT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary ALTER COLUMN salary_id SET DEFAULT nextval('hr.salary_salary_id_seq'::regclass);


--
-- TOC entry 5267 (class 2604 OID 26678)
-- Name: insurance_company insurance_company_id; Type: DEFAULT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company ALTER COLUMN insurance_company_id SET DEFAULT nextval('insurance.insurance_company_insurance_company_id_seq'::regclass);


--
-- TOC entry 5270 (class 2604 OID 26679)
-- Name: policy policy_id; Type: DEFAULT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy ALTER COLUMN policy_id SET DEFAULT nextval('insurance.policy_policy_id_seq'::regclass);


--
-- TOC entry 5300 (class 2604 OID 26680)
-- Name: spare_master spare_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master ALTER COLUMN spare_id SET DEFAULT nextval('inventory.spare_master_spare_id_seq'::regclass);


--
-- TOC entry 5318 (class 2604 OID 26681)
-- Name: spare_serial spare_serial_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial ALTER COLUMN spare_serial_id SET DEFAULT nextval('inventory.spare_serial_spare_serial_id_seq'::regclass);


--
-- TOC entry 5298 (class 2604 OID 26682)
-- Name: spare_stock_movement movement_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement ALTER COLUMN movement_id SET DEFAULT nextval('inventory.spare_stock_movement_movement_id_seq'::regclass);


--
-- TOC entry 5363 (class 2604 OID 26683)
-- Name: vehicle_stock_movement movement_id; Type: DEFAULT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement ALTER COLUMN movement_id SET DEFAULT nextval('inventory.vehicle_stock_movement_movement_id_seq'::regclass);


--
-- TOC entry 5380 (class 2604 OID 26684)
-- Name: brand brand_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand ALTER COLUMN brand_id SET DEFAULT nextval('master.brand_brand_id_seq'::regclass);


--
-- TOC entry 5232 (class 2604 OID 26685)
-- Name: customer customer_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer ALTER COLUMN customer_id SET DEFAULT nextval('master.customer_customer_id_seq'::regclass);


--
-- TOC entry 5236 (class 2604 OID 26686)
-- Name: customer_document customer_document_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document ALTER COLUMN customer_document_id SET DEFAULT nextval('master.customer_document_customer_document_id_seq'::regclass);


--
-- TOC entry 5233 (class 2604 OID 26687)
-- Name: customer_phone customer_phone_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone ALTER COLUMN customer_phone_id SET DEFAULT nextval('master.customer_phone_customer_phone_id_seq'::regclass);


--
-- TOC entry 5349 (class 2604 OID 26688)
-- Name: expense_category expense_category_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category ALTER COLUMN expense_category_id SET DEFAULT nextval('master.expense_category_expense_category_id_seq'::regclass);


--
-- TOC entry 5352 (class 2604 OID 26689)
-- Name: job_card_category job_card_category_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category ALTER COLUMN job_card_category_id SET DEFAULT nextval('master.job_card_category_job_card_category_id_seq'::regclass);


--
-- TOC entry 5372 (class 2604 OID 26690)
-- Name: nominee nominee_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee ALTER COLUMN nominee_id SET DEFAULT nextval('master.nominee_nominee_id_seq'::regclass);


--
-- TOC entry 5346 (class 2604 OID 26691)
-- Name: payment_mode payment_mode_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode ALTER COLUMN payment_mode_id SET DEFAULT nextval('master.payment_mode_payment_mode_id_seq'::regclass);


--
-- TOC entry 5394 (class 2604 OID 26750)
-- Name: pin_reset_request id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request ALTER COLUMN id SET DEFAULT nextval('master.pin_reset_request_id_seq'::regclass);


--
-- TOC entry 5386 (class 2604 OID 26692)
-- Name: spare_price_history history_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history ALTER COLUMN history_id SET DEFAULT nextval('master.spare_price_history_history_id_seq'::regclass);


--
-- TOC entry 5320 (class 2604 OID 26693)
-- Name: staff staff_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff ALTER COLUMN staff_id SET DEFAULT nextval('master.staff_staff_id_seq'::regclass);


--
-- TOC entry 5239 (class 2604 OID 26694)
-- Name: vehicle_model vehicle_model_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model ALTER COLUMN vehicle_model_id SET DEFAULT nextval('master.vehicle_model_vehicle_model_id_seq'::regclass);


--
-- TOC entry 5390 (class 2604 OID 26695)
-- Name: vehicle_price_history history_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history ALTER COLUMN history_id SET DEFAULT nextval('master.vehicle_price_history_history_id_seq'::regclass);


--
-- TOC entry 5244 (class 2604 OID 26696)
-- Name: vendor vendor_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor ALTER COLUMN vendor_id SET DEFAULT nextval('master.vendor_vendor_id_seq'::regclass);


--
-- TOC entry 5247 (class 2604 OID 26697)
-- Name: vendor_contact vendor_contact_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact ALTER COLUMN vendor_contact_id SET DEFAULT nextval('master.vendor_contact_vendor_contact_id_seq'::regclass);


--
-- TOC entry 5251 (class 2604 OID 26698)
-- Name: vendor_document vendor_document_id; Type: DEFAULT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document ALTER COLUMN vendor_document_id SET DEFAULT nextval('master.vendor_document_vendor_document_id_seq'::regclass);


--
-- TOC entry 5310 (class 2604 OID 26699)
-- Name: reimbursement_invoice reimbursement_invoice_id; Type: DEFAULT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice ALTER COLUMN reimbursement_invoice_id SET DEFAULT nextval('oem.reimbursement_invoice_reimbursement_invoice_id_seq'::regclass);


--
-- TOC entry 5312 (class 2604 OID 26700)
-- Name: reimbursement_line reimbursement_line_id; Type: DEFAULT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line ALTER COLUMN reimbursement_line_id SET DEFAULT nextval('oem.reimbursement_line_reimbursement_line_id_seq'::regclass);


--
-- TOC entry 5305 (class 2604 OID 26701)
-- Name: spare_purchase spare_purchase_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase ALTER COLUMN spare_purchase_id SET DEFAULT nextval('procurement.spare_purchase_spare_purchase_id_seq'::regclass);


--
-- TOC entry 5308 (class 2604 OID 26702)
-- Name: spare_purchase_item purchase_item_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item ALTER COLUMN purchase_item_id SET DEFAULT nextval('procurement.spare_purchase_item_purchase_item_id_seq'::regclass);


--
-- TOC entry 5254 (class 2604 OID 26703)
-- Name: vehicle_purchase vehicle_purchase_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase ALTER COLUMN vehicle_purchase_id SET DEFAULT nextval('procurement.vehicle_purchase_vehicle_purchase_id_seq'::regclass);


--
-- TOC entry 5257 (class 2604 OID 26704)
-- Name: vehicle_purchase_detail vehicle_purchase_detail_id; Type: DEFAULT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail ALTER COLUMN vehicle_purchase_detail_id SET DEFAULT nextval('procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq'::regclass);


--
-- TOC entry 5384 (class 2604 OID 26705)
-- Name: delivery_checklist checklist_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist ALTER COLUMN checklist_id SET DEFAULT nextval('sales.delivery_checklist_checklist_id_seq'::regclass);


--
-- TOC entry 5383 (class 2604 OID 26706)
-- Name: payment_receipt receipt_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt ALTER COLUMN receipt_id SET DEFAULT nextval('sales.payment_receipt_receipt_id_seq'::regclass);


--
-- TOC entry 5381 (class 2604 OID 26707)
-- Name: sale sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale ALTER COLUMN sale_id SET DEFAULT nextval('sales.sale_sale_id_seq'::regclass);


--
-- TOC entry 5385 (class 2604 OID 26708)
-- Name: service_schedule schedule_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule ALTER COLUMN schedule_id SET DEFAULT nextval('sales.service_schedule_schedule_id_seq'::regclass);


--
-- TOC entry 5355 (class 2604 OID 26709)
-- Name: spare_sale spare_sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale ALTER COLUMN spare_sale_id SET DEFAULT nextval('sales.spare_sale_spare_sale_id_seq'::regclass);


--
-- TOC entry 5357 (class 2604 OID 26710)
-- Name: spare_sale_detail spare_sale_detail_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail ALTER COLUMN spare_sale_detail_id SET DEFAULT nextval('sales.spare_sale_detail_spare_sale_detail_id_seq'::regclass);


--
-- TOC entry 5265 (class 2604 OID 26711)
-- Name: vehicle_payment vehicle_payment_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment ALTER COLUMN vehicle_payment_id SET DEFAULT nextval('sales.vehicle_payment_vehicle_payment_id_seq'::regclass);


--
-- TOC entry 5340 (class 2604 OID 26712)
-- Name: vehicle_registration vehicle_registration_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration ALTER COLUMN vehicle_registration_id SET DEFAULT nextval('sales.vehicle_registration_vehicle_registration_id_seq'::regclass);


--
-- TOC entry 5259 (class 2604 OID 26713)
-- Name: vehicle_sale vehicle_sale_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale ALTER COLUMN vehicle_sale_id SET DEFAULT nextval('sales.vehicle_sale_vehicle_sale_id_seq'::regclass);


--
-- TOC entry 5263 (class 2604 OID 26714)
-- Name: vehicle_sale_finance vehicle_sale_finance_id; Type: DEFAULT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance ALTER COLUMN vehicle_sale_finance_id SET DEFAULT nextval('sales.vehicle_sale_finance_vehicle_sale_finance_id_seq'::regclass);


--
-- TOC entry 5273 (class 2604 OID 26715)
-- Name: job_card job_card_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card ALTER COLUMN job_card_id SET DEFAULT nextval('service.job_card_job_card_id_seq'::regclass);


--
-- TOC entry 5277 (class 2604 OID 26716)
-- Name: job_labour job_labour_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour ALTER COLUMN job_labour_id SET DEFAULT nextval('service.job_labour_job_labour_id_seq'::regclass);


--
-- TOC entry 5283 (class 2604 OID 26717)
-- Name: job_spare job_spare_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare ALTER COLUMN job_spare_id SET DEFAULT nextval('service.job_spare_job_spare_id_seq'::regclass);


--
-- TOC entry 5275 (class 2604 OID 26718)
-- Name: job_work_item work_item_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item ALTER COLUMN work_item_id SET DEFAULT nextval('service.job_work_item_work_item_id_seq'::regclass);


--
-- TOC entry 5342 (class 2604 OID 26719)
-- Name: service_schedule service_schedule_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule ALTER COLUMN service_schedule_id SET DEFAULT nextval('service.service_schedule_service_schedule_id_seq'::regclass);


--
-- TOC entry 5279 (class 2604 OID 26720)
-- Name: vehicle_component_change component_change_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change ALTER COLUMN component_change_id SET DEFAULT nextval('service.vehicle_component_change_component_change_id_seq'::regclass);


--
-- TOC entry 5344 (class 2604 OID 26721)
-- Name: vehicle_service_summary vehicle_service_summary_id; Type: DEFAULT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary ALTER COLUMN vehicle_service_summary_id SET DEFAULT nextval('service.vehicle_service_summary_vehicle_service_summary_id_seq'::regclass);


--
-- TOC entry 5286 (class 2604 OID 26722)
-- Name: claim claim_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim ALTER COLUMN claim_id SET DEFAULT nextval('warranty.claim_claim_id_seq'::regclass);


--
-- TOC entry 5314 (class 2604 OID 26723)
-- Name: inward warranty_inward_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward ALTER COLUMN warranty_inward_id SET DEFAULT nextval('warranty.inward_warranty_inward_id_seq'::regclass);


--
-- TOC entry 5316 (class 2604 OID 26724)
-- Name: inward_item inward_item_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item ALTER COLUMN inward_item_id SET DEFAULT nextval('warranty.inward_item_inward_item_id_seq'::regclass);


--
-- TOC entry 5281 (class 2604 OID 26725)
-- Name: shipment shipment_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment ALTER COLUMN shipment_id SET DEFAULT nextval('warranty.shipment_shipment_id_seq'::regclass);


--
-- TOC entry 5288 (class 2604 OID 26726)
-- Name: shipment_item shipment_item_id; Type: DEFAULT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item ALTER COLUMN shipment_item_id SET DEFAULT nextval('warranty.shipment_item_shipment_item_id_seq'::regclass);


--
-- TOC entry 6006 (class 0 OID 25389)
-- Dependencies: 284
-- Data for Name: insurance_estimate; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 6002 (class 0 OID 25331)
-- Dependencies: 280
-- Data for Name: invoice; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 6004 (class 0 OID 25364)
-- Dependencies: 282
-- Data for Name: invoice_line; Type: TABLE DATA; Schema: billing; Owner: postgres
--



--
-- TOC entry 5956 (class 0 OID 24697)
-- Dependencies: 234
-- Data for Name: message_log; Type: TABLE DATA; Schema: communication; Owner: postgres
--



--
-- TOC entry 5955 (class 0 OID 24694)
-- Dependencies: 233
-- Data for Name: reminder; Type: TABLE DATA; Schema: communication; Owner: postgres
--



--
-- TOC entry 6066 (class 0 OID 26369)
-- Dependencies: 346
-- Data for Name: enquiry; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6072 (class 0 OID 26427)
-- Dependencies: 352
-- Data for Name: enquiry_status_master; Type: TABLE DATA; Schema: crm; Owner: postgres
--

INSERT INTO crm.enquiry_status_master VALUES (1, 'ACTIVE', 1) ON CONFLICT DO NOTHING;
INSERT INTO crm.enquiry_status_master VALUES (2, 'INACTIVE', 2) ON CONFLICT DO NOTHING;
INSERT INTO crm.enquiry_status_master VALUES (3, 'CONVERTED', 3) ON CONFLICT DO NOTHING;
INSERT INTO crm.enquiry_status_master VALUES (4, 'LOST', 4) ON CONFLICT DO NOTHING;


--
-- TOC entry 6034 (class 0 OID 25832)
-- Dependencies: 312
-- Data for Name: followup_schedule; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6028 (class 0 OID 25746)
-- Dependencies: 306
-- Data for Name: lead; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6032 (class 0 OID 25804)
-- Dependencies: 310
-- Data for Name: lead_activity; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6038 (class 0 OID 25911)
-- Dependencies: 316
-- Data for Name: lead_assignment_history; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6030 (class 0 OID 25779)
-- Dependencies: 308
-- Data for Name: lead_status_history; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6070 (class 0 OID 26415)
-- Dependencies: 350
-- Data for Name: lead_status_master; Type: TABLE DATA; Schema: crm; Owner: postgres
--

INSERT INTO crm.lead_status_master VALUES (1, 'NEW', 1) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (2, 'HOT', 2) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (3, 'WARM', 3) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (4, 'COLD', 4) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (5, 'CONVERTED', 5) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (6, 'LOST', 6) ON CONFLICT DO NOTHING;
INSERT INTO crm.lead_status_master VALUES (7, 'DROPPED', 7) ON CONFLICT DO NOTHING;


--
-- TOC entry 6036 (class 0 OID 25880)
-- Dependencies: 314
-- Data for Name: test_ride; Type: TABLE DATA; Schema: crm; Owner: postgres
--



--
-- TOC entry 6062 (class 0 OID 26304)
-- Dependencies: 342
-- Data for Name: vehicle_loan; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6064 (class 0 OID 26328)
-- Dependencies: 344
-- Data for Name: vehicle_subsidy; Type: TABLE DATA; Schema: finance; Owner: postgres
--



--
-- TOC entry 6056 (class 0 OID 26168)
-- Dependencies: 334
-- Data for Name: attendance; Type: TABLE DATA; Schema: hr; Owner: postgres
--



--
-- TOC entry 6058 (class 0 OID 26194)
-- Dependencies: 336
-- Data for Name: salary; Type: TABLE DATA; Schema: hr; Owner: postgres
--



--
-- TOC entry 5982 (class 0 OID 25079)
-- Dependencies: 260
-- Data for Name: insurance_company; Type: TABLE DATA; Schema: insurance; Owner: postgres
--

INSERT INTO insurance.insurance_company VALUES (1, 'ICICI Lombard', '18002661122', 'support@icicilombard.com', true, '2026-01-23 22:10:30.208459') ON CONFLICT DO NOTHING;
INSERT INTO insurance.insurance_company VALUES (2, 'HDFC ERGO', '18002670000', 'support@hdfcergo.com', true, '2026-01-23 22:10:30.208459') ON CONFLICT DO NOTHING;
INSERT INTO insurance.insurance_company VALUES (3, 'Bajaj Allianz', '18002090144', 'support@bajajallianz.co.in', true, '2026-01-23 22:10:30.208459') ON CONFLICT DO NOTHING;


--
-- TOC entry 5984 (class 0 OID 25094)
-- Dependencies: 262
-- Data for Name: policy; Type: TABLE DATA; Schema: insurance; Owner: postgres
--



--
-- TOC entry 6010 (class 0 OID 25434)
-- Dependencies: 288
-- Data for Name: spare_master; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6024 (class 0 OID 25597)
-- Dependencies: 302
-- Data for Name: spare_serial; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6008 (class 0 OID 25411)
-- Dependencies: 286
-- Data for Name: spare_stock_movement; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6060 (class 0 OID 26263)
-- Dependencies: 340
-- Data for Name: vehicle_stock_movement; Type: TABLE DATA; Schema: inventory; Owner: postgres
--



--
-- TOC entry 6074 (class 0 OID 26439)
-- Dependencies: 354
-- Data for Name: brand; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5954 (class 0 OID 24595)
-- Dependencies: 232
-- Data for Name: customer; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5961 (class 0 OID 24752)
-- Dependencies: 239
-- Data for Name: customer_document; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5959 (class 0 OID 24729)
-- Dependencies: 237
-- Data for Name: customer_phone; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6048 (class 0 OID 26045)
-- Dependencies: 326
-- Data for Name: expense_category; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.expense_category VALUES (1, 'SALARY', NULL, true, '2026-01-23 22:08:44.093883') ON CONFLICT DO NOTHING;
INSERT INTO master.expense_category VALUES (2, 'RENT', NULL, true, '2026-01-23 22:08:44.093883') ON CONFLICT DO NOTHING;
INSERT INTO master.expense_category VALUES (3, 'ELECTRICITY', NULL, true, '2026-01-23 22:08:44.093883') ON CONFLICT DO NOTHING;
INSERT INTO master.expense_category VALUES (4, 'INTERNET', NULL, true, '2026-01-23 22:08:44.093883') ON CONFLICT DO NOTHING;
INSERT INTO master.expense_category VALUES (5, 'OFFICE_EXPENSE', NULL, true, '2026-01-23 22:08:44.093883') ON CONFLICT DO NOTHING;


--
-- TOC entry 6050 (class 0 OID 26065)
-- Dependencies: 328
-- Data for Name: job_card_category; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.job_card_category VALUES (1, 'FREE', 'Free Service', true, '2026-01-23 22:08:51.721562') ON CONFLICT DO NOTHING;
INSERT INTO master.job_card_category VALUES (2, 'PAID', 'Paid Service', true, '2026-01-23 22:08:51.721562') ON CONFLICT DO NOTHING;
INSERT INTO master.job_card_category VALUES (3, 'WARRANTY', 'Warranty', true, '2026-01-23 22:08:51.721562') ON CONFLICT DO NOTHING;
INSERT INTO master.job_card_category VALUES (4, 'INSURANCE', 'Insurance', true, '2026-01-23 22:08:51.721562') ON CONFLICT DO NOTHING;
INSERT INTO master.job_card_category VALUES (5, 'MIXED', 'Mixed Service', true, '2026-01-23 22:08:51.721562') ON CONFLICT DO NOTHING;


--
-- TOC entry 6068 (class 0 OID 26393)
-- Dependencies: 348
-- Data for Name: nominee; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6046 (class 0 OID 26028)
-- Dependencies: 324
-- Data for Name: payment_mode; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.payment_mode VALUES (1, 'CASH', 'Cash', true, '2026-01-23 22:08:32.676865') ON CONFLICT DO NOTHING;
INSERT INTO master.payment_mode VALUES (2, 'UPI', 'UPI / QR', true, '2026-01-23 22:08:32.676865') ON CONFLICT DO NOTHING;
INSERT INTO master.payment_mode VALUES (3, 'CARD', 'Debit / Credit Card', true, '2026-01-23 22:08:32.676865') ON CONFLICT DO NOTHING;
INSERT INTO master.payment_mode VALUES (4, 'BANK_TRANSFER', 'Bank Transfer', true, '2026-01-23 22:08:32.676865') ON CONFLICT DO NOTHING;
INSERT INTO master.payment_mode VALUES (5, 'FINANCE', 'Finance', true, '2026-01-23 22:08:32.676865') ON CONFLICT DO NOTHING;


--
-- TOC entry 6089 (class 0 OID 26747)
-- Dependencies: 369
-- Data for Name: pin_reset_request; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.pin_reset_request VALUES (1, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 15:37:40.369494', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.pin_reset_request VALUES (2, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:08:06.095421', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.pin_reset_request VALUES (3, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:11:08.23802', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.pin_reset_request VALUES (4, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:17:18.29892', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.pin_reset_request VALUES (5, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:22:59.33325', NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.pin_reset_request VALUES (6, 3, 'STAFF_FORGOT_PIN', 'APPROVED', '2026-02-12 16:24:33.264426', NULL, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 6084 (class 0 OID 26603)
-- Dependencies: 364
-- Data for Name: spare_price_history; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6026 (class 0 OID 25700)
-- Dependencies: 304
-- Data for Name: staff; Type: TABLE DATA; Schema: master; Owner: postgres
--

INSERT INTO master.staff VALUES (2, 'System Admin', '9999999999', 'admin@showroom.local', 'ADMIN', true, '2026-01-23', '2026-01-23 22:14:28.121998', '000000000000', 'AAAAA0000A', '000000000000', 'N/A', 'N/A', '$argon2id$v=19$m=65536,t=3,p=4$ppSScg4BIISQ0prznjOmdA$34IDd4/LK6kzqQuxFp+hG4hKCFA9ER9aGzmFgLB7x2Q', NULL, false, 0, NULL, NULL, '2026-02-12 15:35:20.687219', NULL, 'VF76TIUUOS5ABZVVAKIDXBG6HVF7X5HQ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;
INSERT INTO master.staff VALUES (5, 'Dealer 1', '9874598745', 'dealer1@gmail.com', 'DEALER', true, '2026-02-12', '2026-02-12 09:22:00.746065', '123456781234', '', '', '', '', '$argon2id$v=19$m=65536,t=3,p=4$5hwDAMA4hzDGWOt9b8259w$+ZtmHs/hTcaMi+pLVlu2g5DO3lviTOxAZNOWDDKCXLM', '', false, 0, NULL, NULL, '2026-02-12 15:39:43.04558', NULL, 'TTRDXCXIEAYVQIKZ6EL5RUWN4PBQXJMU', NULL, NULL, '', NULL, '', '', '', NULL, '', '') ON CONFLICT DO NOTHING;
INSERT INTO master.staff VALUES (3, 'Test Staff One', '9876543210', 'teststaff1@gmail.com', 'STAFF', true, '2026-01-27', '2026-01-28 23:02:00.083443', '123412341234', NULL, NULL, NULL, NULL, '$argon2id$v=19$m=65536,t=3,p=4$aE2pde4955wzpnRujbHW2g$A6Tu1Jj0N5Xx9K3sW8Lr+cF2zLwmIVzrOdP6aB72PT8', 'teststaff@upi', true, 0, NULL, NULL, '2026-02-12 16:26:26.345562', NULL, NULL, 5, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL) ON CONFLICT DO NOTHING;


--
-- TOC entry 5964 (class 0 OID 24794)
-- Dependencies: 242
-- Data for Name: vehicle; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5963 (class 0 OID 24777)
-- Dependencies: 241
-- Data for Name: vehicle_model; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6086 (class 0 OID 26630)
-- Dependencies: 366
-- Data for Name: vehicle_price_history; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5966 (class 0 OID 24864)
-- Dependencies: 244
-- Data for Name: vendor; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5968 (class 0 OID 24885)
-- Dependencies: 246
-- Data for Name: vendor_contact; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 5970 (class 0 OID 24907)
-- Dependencies: 248
-- Data for Name: vendor_document; Type: TABLE DATA; Schema: master; Owner: postgres
--



--
-- TOC entry 6016 (class 0 OID 25502)
-- Dependencies: 294
-- Data for Name: reimbursement_invoice; Type: TABLE DATA; Schema: oem; Owner: postgres
--



--
-- TOC entry 6018 (class 0 OID 25523)
-- Dependencies: 296
-- Data for Name: reimbursement_line; Type: TABLE DATA; Schema: oem; Owner: postgres
--



--
-- TOC entry 6012 (class 0 OID 25457)
-- Dependencies: 290
-- Data for Name: spare_purchase; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6014 (class 0 OID 25476)
-- Dependencies: 292
-- Data for Name: spare_purchase_item; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 5972 (class 0 OID 24929)
-- Dependencies: 250
-- Data for Name: vehicle_purchase; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 5974 (class 0 OID 24949)
-- Dependencies: 252
-- Data for Name: vehicle_purchase_detail; Type: TABLE DATA; Schema: procurement; Owner: postgres
--



--
-- TOC entry 6087 (class 0 OID 26739)
-- Dependencies: 367
-- Data for Name: alembic_version; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO public.alembic_version VALUES ('37956117aba9') ON CONFLICT DO NOTHING;


--
-- TOC entry 6080 (class 0 OID 26551)
-- Dependencies: 360
-- Data for Name: delivery_checklist; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6078 (class 0 OID 26527)
-- Dependencies: 358
-- Data for Name: payment_receipt; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6076 (class 0 OID 26475)
-- Dependencies: 356
-- Data for Name: sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6082 (class 0 OID 26574)
-- Dependencies: 362
-- Data for Name: service_schedule; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6052 (class 0 OID 26114)
-- Dependencies: 330
-- Data for Name: spare_sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6054 (class 0 OID 26138)
-- Dependencies: 332
-- Data for Name: spare_sale_detail; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 5980 (class 0 OID 25044)
-- Dependencies: 258
-- Data for Name: vehicle_payment; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 6040 (class 0 OID 25958)
-- Dependencies: 318
-- Data for Name: vehicle_registration; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 5976 (class 0 OID 24973)
-- Dependencies: 254
-- Data for Name: vehicle_sale; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 5978 (class 0 OID 25027)
-- Dependencies: 256
-- Data for Name: vehicle_sale_finance; Type: TABLE DATA; Schema: sales; Owner: postgres
--



--
-- TOC entry 5986 (class 0 OID 25130)
-- Dependencies: 264
-- Data for Name: job_card; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 5990 (class 0 OID 25179)
-- Dependencies: 268
-- Data for Name: job_labour; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 5996 (class 0 OID 25271)
-- Dependencies: 274
-- Data for Name: job_spare; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 5988 (class 0 OID 25159)
-- Dependencies: 266
-- Data for Name: job_work_item; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6042 (class 0 OID 25980)
-- Dependencies: 320
-- Data for Name: service_schedule; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 5992 (class 0 OID 25199)
-- Dependencies: 270
-- Data for Name: vehicle_component_change; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 6044 (class 0 OID 26001)
-- Dependencies: 322
-- Data for Name: vehicle_service_summary; Type: TABLE DATA; Schema: service; Owner: postgres
--



--
-- TOC entry 5998 (class 0 OID 25290)
-- Dependencies: 276
-- Data for Name: claim; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6020 (class 0 OID 25557)
-- Dependencies: 298
-- Data for Name: inward; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6022 (class 0 OID 25573)
-- Dependencies: 300
-- Data for Name: inward_item; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 5994 (class 0 OID 25256)
-- Dependencies: 272
-- Data for Name: shipment; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6000 (class 0 OID 25308)
-- Dependencies: 278
-- Data for Name: shipment_item; Type: TABLE DATA; Schema: warranty; Owner: postgres
--



--
-- TOC entry 6244 (class 0 OID 0)
-- Dependencies: 283
-- Name: insurance_estimate_estimate_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.insurance_estimate_estimate_id_seq', 1, false);


--
-- TOC entry 6245 (class 0 OID 0)
-- Dependencies: 279
-- Name: invoice_invoice_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.invoice_invoice_id_seq', 1, false);


--
-- TOC entry 6246 (class 0 OID 0)
-- Dependencies: 281
-- Name: invoice_line_invoice_line_id_seq; Type: SEQUENCE SET; Schema: billing; Owner: postgres
--

SELECT pg_catalog.setval('billing.invoice_line_invoice_line_id_seq', 1, false);


--
-- TOC entry 6247 (class 0 OID 0)
-- Dependencies: 345
-- Name: enquiry_enquiry_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.enquiry_enquiry_id_seq', 1, false);


--
-- TOC entry 6248 (class 0 OID 0)
-- Dependencies: 351
-- Name: enquiry_status_master_status_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.enquiry_status_master_status_id_seq', 4, true);


--
-- TOC entry 6249 (class 0 OID 0)
-- Dependencies: 311
-- Name: followup_schedule_followup_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.followup_schedule_followup_id_seq', 1, false);


--
-- TOC entry 6250 (class 0 OID 0)
-- Dependencies: 309
-- Name: lead_activity_activity_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_activity_activity_id_seq', 1, false);


--
-- TOC entry 6251 (class 0 OID 0)
-- Dependencies: 315
-- Name: lead_assignment_history_assignment_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_assignment_history_assignment_id_seq', 1, false);


--
-- TOC entry 6252 (class 0 OID 0)
-- Dependencies: 305
-- Name: lead_lead_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_lead_id_seq', 1, false);


--
-- TOC entry 6253 (class 0 OID 0)
-- Dependencies: 307
-- Name: lead_status_history_status_history_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_status_history_status_history_id_seq', 1, false);


--
-- TOC entry 6254 (class 0 OID 0)
-- Dependencies: 349
-- Name: lead_status_master_status_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.lead_status_master_status_id_seq', 7, true);


--
-- TOC entry 6255 (class 0 OID 0)
-- Dependencies: 313
-- Name: test_ride_test_ride_id_seq; Type: SEQUENCE SET; Schema: crm; Owner: postgres
--

SELECT pg_catalog.setval('crm.test_ride_test_ride_id_seq', 1, false);


--
-- TOC entry 6256 (class 0 OID 0)
-- Dependencies: 341
-- Name: vehicle_loan_loan_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.vehicle_loan_loan_id_seq', 1, false);


--
-- TOC entry 6257 (class 0 OID 0)
-- Dependencies: 343
-- Name: vehicle_subsidy_subsidy_id_seq; Type: SEQUENCE SET; Schema: finance; Owner: postgres
--

SELECT pg_catalog.setval('finance.vehicle_subsidy_subsidy_id_seq', 1, false);


--
-- TOC entry 6258 (class 0 OID 0)
-- Dependencies: 333
-- Name: attendance_attendance_id_seq; Type: SEQUENCE SET; Schema: hr; Owner: postgres
--

SELECT pg_catalog.setval('hr.attendance_attendance_id_seq', 1, false);


--
-- TOC entry 6259 (class 0 OID 0)
-- Dependencies: 335
-- Name: salary_salary_id_seq; Type: SEQUENCE SET; Schema: hr; Owner: postgres
--

SELECT pg_catalog.setval('hr.salary_salary_id_seq', 1, false);


--
-- TOC entry 6260 (class 0 OID 0)
-- Dependencies: 259
-- Name: insurance_company_insurance_company_id_seq; Type: SEQUENCE SET; Schema: insurance; Owner: postgres
--

SELECT pg_catalog.setval('insurance.insurance_company_insurance_company_id_seq', 3, true);


--
-- TOC entry 6261 (class 0 OID 0)
-- Dependencies: 261
-- Name: policy_policy_id_seq; Type: SEQUENCE SET; Schema: insurance; Owner: postgres
--

SELECT pg_catalog.setval('insurance.policy_policy_id_seq', 1, false);


--
-- TOC entry 6262 (class 0 OID 0)
-- Dependencies: 287
-- Name: spare_master_spare_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_master_spare_id_seq', 1, false);


--
-- TOC entry 6263 (class 0 OID 0)
-- Dependencies: 301
-- Name: spare_serial_spare_serial_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_serial_spare_serial_id_seq', 1, false);


--
-- TOC entry 6264 (class 0 OID 0)
-- Dependencies: 285
-- Name: spare_stock_movement_movement_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.spare_stock_movement_movement_id_seq', 1, false);


--
-- TOC entry 6265 (class 0 OID 0)
-- Dependencies: 339
-- Name: vehicle_stock_movement_movement_id_seq; Type: SEQUENCE SET; Schema: inventory; Owner: postgres
--

SELECT pg_catalog.setval('inventory.vehicle_stock_movement_movement_id_seq', 1, false);


--
-- TOC entry 6266 (class 0 OID 0)
-- Dependencies: 353
-- Name: brand_brand_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.brand_brand_id_seq', 1, false);


--
-- TOC entry 6267 (class 0 OID 0)
-- Dependencies: 235
-- Name: customer_customer_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_customer_id_seq', 1, false);


--
-- TOC entry 6268 (class 0 OID 0)
-- Dependencies: 238
-- Name: customer_document_customer_document_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_document_customer_document_id_seq', 1, false);


--
-- TOC entry 6269 (class 0 OID 0)
-- Dependencies: 236
-- Name: customer_phone_customer_phone_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.customer_phone_customer_phone_id_seq', 1, false);


--
-- TOC entry 6270 (class 0 OID 0)
-- Dependencies: 325
-- Name: expense_category_expense_category_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.expense_category_expense_category_id_seq', 5, true);


--
-- TOC entry 6271 (class 0 OID 0)
-- Dependencies: 327
-- Name: job_card_category_job_card_category_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.job_card_category_job_card_category_id_seq', 5, true);


--
-- TOC entry 6272 (class 0 OID 0)
-- Dependencies: 347
-- Name: nominee_nominee_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.nominee_nominee_id_seq', 1, false);


--
-- TOC entry 6273 (class 0 OID 0)
-- Dependencies: 323
-- Name: payment_mode_payment_mode_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.payment_mode_payment_mode_id_seq', 5, true);


--
-- TOC entry 6274 (class 0 OID 0)
-- Dependencies: 368
-- Name: pin_reset_request_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.pin_reset_request_id_seq', 6, true);


--
-- TOC entry 6275 (class 0 OID 0)
-- Dependencies: 363
-- Name: spare_price_history_history_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.spare_price_history_history_id_seq', 1, false);


--
-- TOC entry 6276 (class 0 OID 0)
-- Dependencies: 303
-- Name: staff_staff_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.staff_staff_id_seq', 5, true);


--
-- TOC entry 6277 (class 0 OID 0)
-- Dependencies: 240
-- Name: vehicle_model_vehicle_model_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vehicle_model_vehicle_model_id_seq', 1, false);


--
-- TOC entry 6278 (class 0 OID 0)
-- Dependencies: 365
-- Name: vehicle_price_history_history_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vehicle_price_history_history_id_seq', 1, false);


--
-- TOC entry 6279 (class 0 OID 0)
-- Dependencies: 245
-- Name: vendor_contact_vendor_contact_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_contact_vendor_contact_id_seq', 1, false);


--
-- TOC entry 6280 (class 0 OID 0)
-- Dependencies: 247
-- Name: vendor_document_vendor_document_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_document_vendor_document_id_seq', 1, false);


--
-- TOC entry 6281 (class 0 OID 0)
-- Dependencies: 243
-- Name: vendor_vendor_id_seq; Type: SEQUENCE SET; Schema: master; Owner: postgres
--

SELECT pg_catalog.setval('master.vendor_vendor_id_seq', 1, false);


--
-- TOC entry 6282 (class 0 OID 0)
-- Dependencies: 293
-- Name: reimbursement_invoice_reimbursement_invoice_id_seq; Type: SEQUENCE SET; Schema: oem; Owner: postgres
--

SELECT pg_catalog.setval('oem.reimbursement_invoice_reimbursement_invoice_id_seq', 1, false);


--
-- TOC entry 6283 (class 0 OID 0)
-- Dependencies: 295
-- Name: reimbursement_line_reimbursement_line_id_seq; Type: SEQUENCE SET; Schema: oem; Owner: postgres
--

SELECT pg_catalog.setval('oem.reimbursement_line_reimbursement_line_id_seq', 1, false);


--
-- TOC entry 6284 (class 0 OID 0)
-- Dependencies: 291
-- Name: spare_purchase_item_purchase_item_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.spare_purchase_item_purchase_item_id_seq', 1, false);


--
-- TOC entry 6285 (class 0 OID 0)
-- Dependencies: 289
-- Name: spare_purchase_spare_purchase_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.spare_purchase_spare_purchase_id_seq', 1, false);


--
-- TOC entry 6286 (class 0 OID 0)
-- Dependencies: 251
-- Name: vehicle_purchase_detail_vehicle_purchase_detail_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.vehicle_purchase_detail_vehicle_purchase_detail_id_seq', 1, false);


--
-- TOC entry 6287 (class 0 OID 0)
-- Dependencies: 249
-- Name: vehicle_purchase_vehicle_purchase_id_seq; Type: SEQUENCE SET; Schema: procurement; Owner: postgres
--

SELECT pg_catalog.setval('procurement.vehicle_purchase_vehicle_purchase_id_seq', 1, false);


--
-- TOC entry 6288 (class 0 OID 0)
-- Dependencies: 359
-- Name: delivery_checklist_checklist_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.delivery_checklist_checklist_id_seq', 1, false);


--
-- TOC entry 6289 (class 0 OID 0)
-- Dependencies: 357
-- Name: payment_receipt_receipt_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.payment_receipt_receipt_id_seq', 1, false);


--
-- TOC entry 6290 (class 0 OID 0)
-- Dependencies: 355
-- Name: sale_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.sale_sale_id_seq', 1, false);


--
-- TOC entry 6291 (class 0 OID 0)
-- Dependencies: 361
-- Name: service_schedule_schedule_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.service_schedule_schedule_id_seq', 1, false);


--
-- TOC entry 6292 (class 0 OID 0)
-- Dependencies: 331
-- Name: spare_sale_detail_spare_sale_detail_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.spare_sale_detail_spare_sale_detail_id_seq', 1, false);


--
-- TOC entry 6293 (class 0 OID 0)
-- Dependencies: 329
-- Name: spare_sale_spare_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.spare_sale_spare_sale_id_seq', 1, false);


--
-- TOC entry 6294 (class 0 OID 0)
-- Dependencies: 257
-- Name: vehicle_payment_vehicle_payment_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_payment_vehicle_payment_id_seq', 1, false);


--
-- TOC entry 6295 (class 0 OID 0)
-- Dependencies: 317
-- Name: vehicle_registration_vehicle_registration_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_registration_vehicle_registration_id_seq', 1, false);


--
-- TOC entry 6296 (class 0 OID 0)
-- Dependencies: 255
-- Name: vehicle_sale_finance_vehicle_sale_finance_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_sale_finance_vehicle_sale_finance_id_seq', 1, false);


--
-- TOC entry 6297 (class 0 OID 0)
-- Dependencies: 253
-- Name: vehicle_sale_vehicle_sale_id_seq; Type: SEQUENCE SET; Schema: sales; Owner: postgres
--

SELECT pg_catalog.setval('sales.vehicle_sale_vehicle_sale_id_seq', 1, false);


--
-- TOC entry 6298 (class 0 OID 0)
-- Dependencies: 263
-- Name: job_card_job_card_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_card_job_card_id_seq', 1, false);


--
-- TOC entry 6299 (class 0 OID 0)
-- Dependencies: 267
-- Name: job_labour_job_labour_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_labour_job_labour_id_seq', 1, false);


--
-- TOC entry 6300 (class 0 OID 0)
-- Dependencies: 273
-- Name: job_spare_job_spare_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_spare_job_spare_id_seq', 1, false);


--
-- TOC entry 6301 (class 0 OID 0)
-- Dependencies: 265
-- Name: job_work_item_work_item_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.job_work_item_work_item_id_seq', 1, false);


--
-- TOC entry 6302 (class 0 OID 0)
-- Dependencies: 319
-- Name: service_schedule_service_schedule_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.service_schedule_service_schedule_id_seq', 1, false);


--
-- TOC entry 6303 (class 0 OID 0)
-- Dependencies: 269
-- Name: vehicle_component_change_component_change_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.vehicle_component_change_component_change_id_seq', 1, false);


--
-- TOC entry 6304 (class 0 OID 0)
-- Dependencies: 321
-- Name: vehicle_service_summary_vehicle_service_summary_id_seq; Type: SEQUENCE SET; Schema: service; Owner: postgres
--

SELECT pg_catalog.setval('service.vehicle_service_summary_vehicle_service_summary_id_seq', 1, false);


--
-- TOC entry 6305 (class 0 OID 0)
-- Dependencies: 275
-- Name: claim_claim_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.claim_claim_id_seq', 1, false);


--
-- TOC entry 6306 (class 0 OID 0)
-- Dependencies: 299
-- Name: inward_item_inward_item_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.inward_item_inward_item_id_seq', 1, false);


--
-- TOC entry 6307 (class 0 OID 0)
-- Dependencies: 297
-- Name: inward_warranty_inward_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.inward_warranty_inward_id_seq', 1, false);


--
-- TOC entry 6308 (class 0 OID 0)
-- Dependencies: 277
-- Name: shipment_item_shipment_item_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.shipment_item_shipment_item_id_seq', 1, false);


--
-- TOC entry 6309 (class 0 OID 0)
-- Dependencies: 271
-- Name: shipment_shipment_id_seq; Type: SEQUENCE SET; Schema: warranty; Owner: postgres
--

SELECT pg_catalog.setval('warranty.shipment_shipment_id_seq', 1, false);


--
-- TOC entry 5549 (class 2606 OID 25403)
-- Name: insurance_estimate insurance_estimate_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate
    ADD CONSTRAINT insurance_estimate_pkey PRIMARY KEY (estimate_id);


--
-- TOC entry 5547 (class 2606 OID 25382)
-- Name: invoice_line invoice_line_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line
    ADD CONSTRAINT invoice_line_pkey PRIMARY KEY (invoice_line_id);


--
-- TOC entry 5543 (class 2606 OID 25350)
-- Name: invoice invoice_pkey; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT invoice_pkey PRIMARY KEY (invoice_id);


--
-- TOC entry 5545 (class 2606 OID 25352)
-- Name: invoice uq_billing_invoice_no; Type: CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT uq_billing_invoice_no UNIQUE (invoice_number);


--
-- TOC entry 5663 (class 2606 OID 26385)
-- Name: enquiry enquiry_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT enquiry_pkey PRIMARY KEY (enquiry_id);


--
-- TOC entry 5673 (class 2606 OID 26435)
-- Name: enquiry_status_master enquiry_status_master_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master
    ADD CONSTRAINT enquiry_status_master_pkey PRIMARY KEY (status_id);


--
-- TOC entry 5675 (class 2606 OID 26437)
-- Name: enquiry_status_master enquiry_status_master_status_name_key; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry_status_master
    ADD CONSTRAINT enquiry_status_master_status_name_key UNIQUE (status_name);


--
-- TOC entry 5598 (class 2606 OID 25847)
-- Name: followup_schedule followup_schedule_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT followup_schedule_pkey PRIMARY KEY (followup_id);


--
-- TOC entry 5596 (class 2606 OID 25819)
-- Name: lead_activity lead_activity_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT lead_activity_pkey PRIMARY KEY (activity_id);


--
-- TOC entry 5605 (class 2606 OID 25924)
-- Name: lead_assignment_history lead_assignment_history_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT lead_assignment_history_pkey PRIMARY KEY (assignment_id);


--
-- TOC entry 5592 (class 2606 OID 25762)
-- Name: lead lead_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT lead_pkey PRIMARY KEY (lead_id);


--
-- TOC entry 5594 (class 2606 OID 25792)
-- Name: lead_status_history lead_status_history_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT lead_status_history_pkey PRIMARY KEY (status_history_id);


--
-- TOC entry 5669 (class 2606 OID 26423)
-- Name: lead_status_master lead_status_master_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master
    ADD CONSTRAINT lead_status_master_pkey PRIMARY KEY (status_id);


--
-- TOC entry 5671 (class 2606 OID 26425)
-- Name: lead_status_master lead_status_master_status_name_key; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_master
    ADD CONSTRAINT lead_status_master_status_name_key UNIQUE (status_name);


--
-- TOC entry 5603 (class 2606 OID 25894)
-- Name: test_ride test_ride_pkey; Type: CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT test_ride_pkey PRIMARY KEY (test_ride_id);


--
-- TOC entry 5655 (class 2606 OID 26321)
-- Name: vehicle_loan uq_one_loan_per_sale; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT uq_one_loan_per_sale UNIQUE (sale_id);


--
-- TOC entry 5659 (class 2606 OID 26342)
-- Name: vehicle_subsidy uq_one_subsidy_per_vehicle; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT uq_one_subsidy_per_vehicle UNIQUE (chassis_no);


--
-- TOC entry 5657 (class 2606 OID 26319)
-- Name: vehicle_loan vehicle_loan_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT vehicle_loan_pkey PRIMARY KEY (loan_id);


--
-- TOC entry 5661 (class 2606 OID 26340)
-- Name: vehicle_subsidy vehicle_subsidy_pkey; Type: CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT vehicle_subsidy_pkey PRIMARY KEY (subsidy_id);


--
-- TOC entry 5639 (class 2606 OID 26183)
-- Name: attendance attendance_pkey; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT attendance_pkey PRIMARY KEY (attendance_id);


--
-- TOC entry 5645 (class 2606 OID 26208)
-- Name: salary salary_pkey; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT salary_pkey PRIMARY KEY (salary_id);


--
-- TOC entry 5643 (class 2606 OID 26185)
-- Name: attendance uq_staff_attendance_date; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT uq_staff_attendance_date UNIQUE (staff_id, attendance_date);


--
-- TOC entry 5647 (class 2606 OID 26210)
-- Name: salary uq_staff_salary_month; Type: CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT uq_staff_salary_month UNIQUE (staff_id, salary_month);


--
-- TOC entry 5498 (class 2606 OID 25090)
-- Name: insurance_company insurance_company_pkey; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company
    ADD CONSTRAINT insurance_company_pkey PRIMARY KEY (insurance_company_id);


--
-- TOC entry 5504 (class 2606 OID 25110)
-- Name: policy policy_pkey; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT policy_pkey PRIMARY KEY (policy_id);


--
-- TOC entry 5500 (class 2606 OID 25092)
-- Name: insurance_company uq_insurance_company_name; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.insurance_company
    ADD CONSTRAINT uq_insurance_company_name UNIQUE (company_name);


--
-- TOC entry 5507 (class 2606 OID 25112)
-- Name: policy uq_policy_number; Type: CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT uq_policy_number UNIQUE (policy_number);


--
-- TOC entry 5554 (class 2606 OID 25452)
-- Name: spare_master spare_master_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT spare_master_pkey PRIMARY KEY (spare_id);


--
-- TOC entry 5576 (class 2606 OID 25612)
-- Name: spare_serial spare_serial_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT spare_serial_pkey PRIMARY KEY (spare_serial_id);


--
-- TOC entry 5552 (class 2606 OID 25425)
-- Name: spare_stock_movement spare_stock_movement_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT spare_stock_movement_pkey PRIMARY KEY (movement_id);


--
-- TOC entry 5556 (class 2606 OID 25454)
-- Name: spare_master uq_spare_part_code; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_master
    ADD CONSTRAINT uq_spare_part_code UNIQUE (part_code);


--
-- TOC entry 5578 (class 2606 OID 25614)
-- Name: spare_serial uq_spare_serial; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT uq_spare_serial UNIQUE (serial_no);


--
-- TOC entry 5653 (class 2606 OID 26275)
-- Name: vehicle_stock_movement vehicle_stock_movement_pkey; Type: CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT vehicle_stock_movement_pkey PRIMARY KEY (movement_id);


--
-- TOC entry 5677 (class 2606 OID 26448)
-- Name: brand brand_brand_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT brand_brand_name_key UNIQUE (brand_name);


--
-- TOC entry 5679 (class 2606 OID 26446)
-- Name: brand brand_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.brand
    ADD CONSTRAINT brand_pkey PRIMARY KEY (brand_id);


--
-- TOC entry 5453 (class 2606 OID 24767)
-- Name: customer_document customer_document_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document
    ADD CONSTRAINT customer_document_pkey PRIMARY KEY (customer_document_id);


--
-- TOC entry 5449 (class 2606 OID 24743)
-- Name: customer_phone customer_phone_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT customer_phone_pkey PRIMARY KEY (customer_phone_id);


--
-- TOC entry 5438 (class 2606 OID 24717)
-- Name: customer customer_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT customer_pkey PRIMARY KEY (customer_id);


--
-- TOC entry 5624 (class 2606 OID 26058)
-- Name: expense_category expense_category_category_name_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_category_name_key UNIQUE (category_name);


--
-- TOC entry 5626 (class 2606 OID 26056)
-- Name: expense_category expense_category_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT expense_category_pkey PRIMARY KEY (expense_category_id);


--
-- TOC entry 5628 (class 2606 OID 26079)
-- Name: job_card_category job_card_category_category_code_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_category_code_key UNIQUE (category_code);


--
-- TOC entry 5630 (class 2606 OID 26077)
-- Name: job_card_category job_card_category_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.job_card_category
    ADD CONSTRAINT job_card_category_pkey PRIMARY KEY (job_card_category_id);


--
-- TOC entry 5667 (class 2606 OID 26407)
-- Name: nominee nominee_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT nominee_pkey PRIMARY KEY (nominee_id);


--
-- TOC entry 5620 (class 2606 OID 26042)
-- Name: payment_mode payment_mode_mode_code_key; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_mode_code_key UNIQUE (mode_code);


--
-- TOC entry 5622 (class 2606 OID 26040)
-- Name: payment_mode payment_mode_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.payment_mode
    ADD CONSTRAINT payment_mode_pkey PRIMARY KEY (payment_mode_id);


--
-- TOC entry 5709 (class 2606 OID 26757)
-- Name: pin_reset_request pin_reset_request_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_pkey PRIMARY KEY (id);


--
-- TOC entry 5702 (class 2606 OID 26618)
-- Name: spare_price_history spare_price_history_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5581 (class 2606 OID 25712)
-- Name: staff staff_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT staff_pkey PRIMARY KEY (staff_id);


--
-- TOC entry 5441 (class 2606 OID 24708)
-- Name: customer uq_customer_aadhaar; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_aadhaar UNIQUE (aadhaar_no);


--
-- TOC entry 5443 (class 2606 OID 24712)
-- Name: customer uq_customer_gstin; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_gstin UNIQUE (gstin);


--
-- TOC entry 5445 (class 2606 OID 24710)
-- Name: customer uq_customer_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_pan UNIQUE (pan_no);


--
-- TOC entry 5451 (class 2606 OID 24745)
-- Name: customer_phone uq_customer_phone_number; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT uq_customer_phone_number UNIQUE (phone_number);


--
-- TOC entry 5447 (class 2606 OID 24706)
-- Name: customer uq_customer_primary_phone; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT uq_customer_primary_phone UNIQUE (primary_phone);


--
-- TOC entry 5583 (class 2606 OID 25717)
-- Name: staff uq_staff_aadhaar; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_aadhaar UNIQUE (aadhaar_no);


--
-- TOC entry 5585 (class 2606 OID 25714)
-- Name: staff uq_staff_mobile; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_mobile UNIQUE (mobile_no);


--
-- TOC entry 5587 (class 2606 OID 25719)
-- Name: staff uq_staff_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_pan UNIQUE (pan_no);


--
-- TOC entry 5589 (class 2606 OID 26248)
-- Name: staff uq_staff_upi; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT uq_staff_upi UNIQUE (upi_id);


--
-- TOC entry 5457 (class 2606 OID 24793)
-- Name: vehicle_model uq_vehicle_model_material; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT uq_vehicle_model_material UNIQUE (material_number);


--
-- TOC entry 5463 (class 2606 OID 24881)
-- Name: vendor uq_vendor_gstin; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT uq_vendor_gstin UNIQUE (gstin);


--
-- TOC entry 5465 (class 2606 OID 24883)
-- Name: vendor uq_vendor_pan; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT uq_vendor_pan UNIQUE (pan_no);


--
-- TOC entry 5459 (class 2606 OID 24791)
-- Name: vehicle_model vehicle_model_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_model
    ADD CONSTRAINT vehicle_model_pkey PRIMARY KEY (vehicle_model_id);


--
-- TOC entry 5461 (class 2606 OID 24807)
-- Name: vehicle vehicle_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT vehicle_pkey PRIMARY KEY (chassis_no);


--
-- TOC entry 5705 (class 2606 OID 26644)
-- Name: vehicle_price_history vehicle_price_history_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_pkey PRIMARY KEY (history_id);


--
-- TOC entry 5469 (class 2606 OID 24900)
-- Name: vendor_contact vendor_contact_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact
    ADD CONSTRAINT vendor_contact_pkey PRIMARY KEY (vendor_contact_id);


--
-- TOC entry 5471 (class 2606 OID 24922)
-- Name: vendor_document vendor_document_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document
    ADD CONSTRAINT vendor_document_pkey PRIMARY KEY (vendor_document_id);


--
-- TOC entry 5467 (class 2606 OID 24879)
-- Name: vendor vendor_pkey; Type: CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor
    ADD CONSTRAINT vendor_pkey PRIMARY KEY (vendor_id);


--
-- TOC entry 5562 (class 2606 OID 25519)
-- Name: reimbursement_invoice reimbursement_invoice_pkey; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice
    ADD CONSTRAINT reimbursement_invoice_pkey PRIMARY KEY (reimbursement_invoice_id);


--
-- TOC entry 5566 (class 2606 OID 25537)
-- Name: reimbursement_line reimbursement_line_pkey; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT reimbursement_line_pkey PRIMARY KEY (reimbursement_line_id);


--
-- TOC entry 5568 (class 2606 OID 25539)
-- Name: reimbursement_line uq_labour_claimed_once; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT uq_labour_claimed_once UNIQUE (job_labour_id);


--
-- TOC entry 5564 (class 2606 OID 25521)
-- Name: reimbursement_invoice uq_oem_invoice_no; Type: CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_invoice
    ADD CONSTRAINT uq_oem_invoice_no UNIQUE (oem_invoice_no);


--
-- TOC entry 5560 (class 2606 OID 25489)
-- Name: spare_purchase_item spare_purchase_item_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT spare_purchase_item_pkey PRIMARY KEY (purchase_item_id);


--
-- TOC entry 5558 (class 2606 OID 25469)
-- Name: spare_purchase spare_purchase_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase
    ADD CONSTRAINT spare_purchase_pkey PRIMARY KEY (spare_purchase_id);


--
-- TOC entry 5477 (class 2606 OID 24961)
-- Name: vehicle_purchase_detail uq_vehicle_purchase_detail_chassis; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT uq_vehicle_purchase_detail_chassis UNIQUE (chassis_no);


--
-- TOC entry 5473 (class 2606 OID 24942)
-- Name: vehicle_purchase uq_vehicle_purchase_invoice; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT uq_vehicle_purchase_invoice UNIQUE (vendor_id, invoice_number);


--
-- TOC entry 5479 (class 2606 OID 24959)
-- Name: vehicle_purchase_detail vehicle_purchase_detail_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT vehicle_purchase_detail_pkey PRIMARY KEY (vehicle_purchase_detail_id);


--
-- TOC entry 5475 (class 2606 OID 24940)
-- Name: vehicle_purchase vehicle_purchase_pkey; Type: CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT vehicle_purchase_pkey PRIMARY KEY (vehicle_purchase_id);


--
-- TOC entry 5707 (class 2606 OID 26744)
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- TOC entry 5695 (class 2606 OID 26564)
-- Name: delivery_checklist delivery_checklist_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_pkey PRIMARY KEY (checklist_id);


--
-- TOC entry 5697 (class 2606 OID 26566)
-- Name: delivery_checklist delivery_checklist_sale_id_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_sale_id_key UNIQUE (sale_id);


--
-- TOC entry 5693 (class 2606 OID 26539)
-- Name: payment_receipt payment_receipt_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_pkey PRIMARY KEY (receipt_id);


--
-- TOC entry 5683 (class 2606 OID 26499)
-- Name: sale sale_chassis_no_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_chassis_no_key UNIQUE (chassis_no);


--
-- TOC entry 5685 (class 2606 OID 26503)
-- Name: sale sale_delivery_challan_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_delivery_challan_number_key UNIQUE (delivery_challan_number);


--
-- TOC entry 5687 (class 2606 OID 26501)
-- Name: sale sale_invoice_number_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_invoice_number_key UNIQUE (invoice_number);


--
-- TOC entry 5689 (class 2606 OID 26497)
-- Name: sale sale_lead_id_key; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_lead_id_key UNIQUE (lead_id);


--
-- TOC entry 5691 (class 2606 OID 26495)
-- Name: sale sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_pkey PRIMARY KEY (sale_id);


--
-- TOC entry 5699 (class 2606 OID 26586)
-- Name: service_schedule service_schedule_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule
    ADD CONSTRAINT service_schedule_pkey PRIMARY KEY (schedule_id);


--
-- TOC entry 5637 (class 2606 OID 26153)
-- Name: spare_sale_detail spare_sale_detail_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT spare_sale_detail_pkey PRIMARY KEY (spare_sale_detail_id);


--
-- TOC entry 5634 (class 2606 OID 26126)
-- Name: spare_sale spare_sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT spare_sale_pkey PRIMARY KEY (spare_sale_id);


--
-- TOC entry 5483 (class 2606 OID 24994)
-- Name: vehicle_sale uq_sale_challan; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_challan UNIQUE (delivery_challan_no);


--
-- TOC entry 5485 (class 2606 OID 24996)
-- Name: vehicle_sale uq_sale_chassis; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_chassis UNIQUE (chassis_no);


--
-- TOC entry 5487 (class 2606 OID 24992)
-- Name: vehicle_sale uq_sale_invoice; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT uq_sale_invoice UNIQUE (invoice_number);


--
-- TOC entry 5607 (class 2606 OID 25973)
-- Name: vehicle_registration uq_vehicle_sale_registration; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT uq_vehicle_sale_registration UNIQUE (vehicle_sale_id);


--
-- TOC entry 5496 (class 2606 OID 25060)
-- Name: vehicle_payment vehicle_payment_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT vehicle_payment_pkey PRIMARY KEY (vehicle_payment_id);


--
-- TOC entry 5609 (class 2606 OID 25971)
-- Name: vehicle_registration vehicle_registration_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT vehicle_registration_pkey PRIMARY KEY (vehicle_registration_id);


--
-- TOC entry 5492 (class 2606 OID 25037)
-- Name: vehicle_sale_finance vehicle_sale_finance_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance
    ADD CONSTRAINT vehicle_sale_finance_pkey PRIMARY KEY (vehicle_sale_finance_id);


--
-- TOC entry 5490 (class 2606 OID 24990)
-- Name: vehicle_sale vehicle_sale_pkey; Type: CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT vehicle_sale_pkey PRIMARY KEY (vehicle_sale_id);


--
-- TOC entry 5511 (class 2606 OID 25145)
-- Name: job_card job_card_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT job_card_pkey PRIMARY KEY (job_card_id);


--
-- TOC entry 5519 (class 2606 OID 25192)
-- Name: job_labour job_labour_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour
    ADD CONSTRAINT job_labour_pkey PRIMARY KEY (job_labour_id);


--
-- TOC entry 5528 (class 2606 OID 25283)
-- Name: job_spare job_spare_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT job_spare_pkey PRIMARY KEY (job_spare_id);


--
-- TOC entry 5517 (class 2606 OID 25172)
-- Name: job_work_item job_work_item_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item
    ADD CONSTRAINT job_work_item_pkey PRIMARY KEY (work_item_id);


--
-- TOC entry 5611 (class 2606 OID 25992)
-- Name: service_schedule service_schedule_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT service_schedule_pkey PRIMARY KEY (service_schedule_id);


--
-- TOC entry 5513 (class 2606 OID 25147)
-- Name: job_card uq_job_card_no; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT uq_job_card_no UNIQUE (job_card_no);


--
-- TOC entry 5613 (class 2606 OID 25994)
-- Name: service_schedule uq_variant_service; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT uq_variant_service UNIQUE (vehicle_model_id, service_number);


--
-- TOC entry 5616 (class 2606 OID 26015)
-- Name: vehicle_service_summary uq_vehicle_service; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT uq_vehicle_service UNIQUE (vehicle_sale_id);


--
-- TOC entry 5521 (class 2606 OID 25218)
-- Name: vehicle_component_change vehicle_component_change_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT vehicle_component_change_pkey PRIMARY KEY (component_change_id);


--
-- TOC entry 5618 (class 2606 OID 26013)
-- Name: vehicle_service_summary vehicle_service_summary_pkey; Type: CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT vehicle_service_summary_pkey PRIMARY KEY (vehicle_service_summary_id);


--
-- TOC entry 5530 (class 2606 OID 25301)
-- Name: claim claim_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT claim_pkey PRIMARY KEY (claim_id);


--
-- TOC entry 5574 (class 2606 OID 25585)
-- Name: inward_item inward_item_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT inward_item_pkey PRIMARY KEY (inward_item_id);


--
-- TOC entry 5570 (class 2606 OID 25569)
-- Name: inward inward_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward
    ADD CONSTRAINT inward_pkey PRIMARY KEY (warranty_inward_id);


--
-- TOC entry 5536 (class 2606 OID 25316)
-- Name: shipment_item shipment_item_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT shipment_item_pkey PRIMARY KEY (shipment_item_id);


--
-- TOC entry 5523 (class 2606 OID 25267)
-- Name: shipment shipment_pkey; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment
    ADD CONSTRAINT shipment_pkey PRIMARY KEY (shipment_id);


--
-- TOC entry 5538 (class 2606 OID 25318)
-- Name: shipment_item uq_claim_single_shipment; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT uq_claim_single_shipment UNIQUE (claim_id);


--
-- TOC entry 5525 (class 2606 OID 25269)
-- Name: shipment uq_warranty_docket; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment
    ADD CONSTRAINT uq_warranty_docket UNIQUE (docket_no);


--
-- TOC entry 5572 (class 2606 OID 25571)
-- Name: inward uq_warranty_oem_invoice; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward
    ADD CONSTRAINT uq_warranty_oem_invoice UNIQUE (oem_invoice_no);


--
-- TOC entry 5534 (class 2606 OID 25429)
-- Name: claim uq_warranty_so; Type: CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT uq_warranty_so UNIQUE (so_number);


--
-- TOC entry 5539 (class 1259 OID 26100)
-- Name: idx_billing_invoice_date; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_date ON billing.invoice USING btree (invoice_date);


--
-- TOC entry 5540 (class 1259 OID 26098)
-- Name: idx_billing_invoice_status; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_status ON billing.invoice USING btree (invoice_status);


--
-- TOC entry 5541 (class 1259 OID 26099)
-- Name: idx_billing_invoice_type; Type: INDEX; Schema: billing; Owner: postgres
--

CREATE INDEX idx_billing_invoice_type ON billing.invoice USING btree (invoice_type);


--
-- TOC entry 5599 (class 1259 OID 26229)
-- Name: idx_crm_followup_alerts; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_crm_followup_alerts ON crm.followup_schedule USING btree (scheduled_date) WHERE ((followup_status)::text = ANY ((ARRAY['PENDING'::character varying, 'MISSED'::character varying])::text[]));


--
-- TOC entry 5590 (class 1259 OID 26107)
-- Name: idx_crm_lead_created; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_crm_lead_created ON crm.lead USING btree (created_at);


--
-- TOC entry 5664 (class 1259 OID 26391)
-- Name: idx_enquiry_created; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_enquiry_created ON crm.enquiry USING btree (created_at);


--
-- TOC entry 5600 (class 1259 OID 26108)
-- Name: idx_followup_schedule_date; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_date ON crm.followup_schedule USING btree (scheduled_date);


--
-- TOC entry 5601 (class 1259 OID 26109)
-- Name: idx_followup_schedule_status; Type: INDEX; Schema: crm; Owner: postgres
--

CREATE INDEX idx_followup_schedule_status ON crm.followup_schedule USING btree (followup_status);


--
-- TOC entry 5640 (class 1259 OID 26191)
-- Name: idx_attendance_date; Type: INDEX; Schema: hr; Owner: postgres
--

CREATE INDEX idx_attendance_date ON hr.attendance USING btree (attendance_date);


--
-- TOC entry 5641 (class 1259 OID 26192)
-- Name: idx_attendance_staff; Type: INDEX; Schema: hr; Owner: postgres
--

CREATE INDEX idx_attendance_staff ON hr.attendance USING btree (staff_id);


--
-- TOC entry 5501 (class 1259 OID 26233)
-- Name: idx_insurance_active_policy_expiry; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_active_policy_expiry ON insurance.policy USING btree (policy_end_date) WHERE (is_active = true);


--
-- TOC entry 5502 (class 1259 OID 26105)
-- Name: idx_insurance_policy_expiry; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE INDEX idx_insurance_policy_expiry ON insurance.policy USING btree (policy_end_date) WHERE (is_active = true);


--
-- TOC entry 5505 (class 1259 OID 25128)
-- Name: uq_active_policy_per_vehicle; Type: INDEX; Schema: insurance; Owner: postgres
--

CREATE UNIQUE INDEX uq_active_policy_per_vehicle ON insurance.policy USING btree (chassis_no) WHERE (is_active = true);


--
-- TOC entry 5550 (class 1259 OID 26086)
-- Name: idx_spare_stock_movement_spare; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_spare_stock_movement_spare ON inventory.spare_stock_movement USING btree (spare_id);


--
-- TOC entry 5648 (class 1259 OID 26281)
-- Name: idx_vehicle_movement_chassis; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_chassis ON inventory.vehicle_stock_movement USING btree (chassis_no);


--
-- TOC entry 5649 (class 1259 OID 26283)
-- Name: idx_vehicle_movement_datetime; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_datetime ON inventory.vehicle_stock_movement USING btree (movement_datetime);


--
-- TOC entry 5650 (class 1259 OID 26282)
-- Name: idx_vehicle_movement_type; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE INDEX idx_vehicle_movement_type ON inventory.vehicle_stock_movement USING btree (movement_type);


--
-- TOC entry 5651 (class 1259 OID 26351)
-- Name: uq_active_vehicle_allocation; Type: INDEX; Schema: inventory; Owner: postgres
--

CREATE UNIQUE INDEX uq_active_vehicle_allocation ON inventory.vehicle_stock_movement USING btree (chassis_no) WHERE ((movement_type)::text = 'ALLOCATED'::text);


--
-- TOC entry 5439 (class 1259 OID 26367)
-- Name: idx_customer_created; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_created ON master.customer USING btree (created_at);


--
-- TOC entry 5454 (class 1259 OID 24773)
-- Name: idx_customer_document_customer; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_document_customer ON master.customer_document USING btree (customer_id);


--
-- TOC entry 5455 (class 1259 OID 24774)
-- Name: idx_customer_document_type; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_customer_document_type ON master.customer_document USING btree (document_type);


--
-- TOC entry 5665 (class 1259 OID 26413)
-- Name: idx_nominee_customer; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_nominee_customer ON master.nominee USING btree (customer_id);


--
-- TOC entry 5700 (class 1259 OID 26655)
-- Name: idx_spare_price_history_spare; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_spare_price_history_spare ON master.spare_price_history USING btree (spare_id);


--
-- TOC entry 5579 (class 1259 OID 26254)
-- Name: idx_staff_active_lock; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_staff_active_lock ON master.staff USING btree (staff_id, is_active, locked_until);


--
-- TOC entry 5703 (class 1259 OID 26656)
-- Name: idx_vehicle_price_history_model; Type: INDEX; Schema: master; Owner: postgres
--

CREATE INDEX idx_vehicle_price_history_model ON master.vehicle_price_history USING btree (vehicle_model_id);


--
-- TOC entry 5680 (class 1259 OID 26524)
-- Name: idx_sale_customer; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_customer ON sales.sale USING btree (customer_id);


--
-- TOC entry 5681 (class 1259 OID 26525)
-- Name: idx_sale_lead; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_sale_lead ON sales.sale USING btree (lead_id);


--
-- TOC entry 5631 (class 1259 OID 26165)
-- Name: idx_spare_sale_customer; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_customer ON sales.spare_sale USING btree (customer_id);


--
-- TOC entry 5632 (class 1259 OID 26164)
-- Name: idx_spare_sale_date; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_date ON sales.spare_sale USING btree (sale_date);


--
-- TOC entry 5635 (class 1259 OID 26166)
-- Name: idx_spare_sale_detail_spare; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_spare_sale_detail_spare ON sales.spare_sale_detail USING btree (spare_id);


--
-- TOC entry 5493 (class 1259 OID 26097)
-- Name: idx_vehicle_payment_context; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_context ON sales.vehicle_payment USING btree (payment_context);


--
-- TOC entry 5494 (class 1259 OID 26096)
-- Name: idx_vehicle_payment_date; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_payment_date ON sales.vehicle_payment USING btree (payment_date);


--
-- TOC entry 5480 (class 1259 OID 26094)
-- Name: idx_vehicle_sale_created_at; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_created_at ON sales.vehicle_sale USING btree (created_at);


--
-- TOC entry 5481 (class 1259 OID 26095)
-- Name: idx_vehicle_sale_is_financed; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE INDEX idx_vehicle_sale_is_financed ON sales.vehicle_sale USING btree (is_financed);


--
-- TOC entry 5488 (class 1259 OID 26261)
-- Name: uq_vehicle_sale_lead; Type: INDEX; Schema: sales; Owner: postgres
--

CREATE UNIQUE INDEX uq_vehicle_sale_lead ON sales.vehicle_sale USING btree (lead_id);


--
-- TOC entry 5508 (class 1259 OID 26101)
-- Name: idx_job_card_in_datetime; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_card_in_datetime ON service.job_card USING btree (in_datetime);


--
-- TOC entry 5509 (class 1259 OID 26102)
-- Name: idx_job_card_out_datetime; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_card_out_datetime ON service.job_card USING btree (out_datetime);


--
-- TOC entry 5526 (class 1259 OID 26093)
-- Name: idx_job_spare_spare; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_spare_spare ON service.job_spare USING btree (spare_id);


--
-- TOC entry 5515 (class 1259 OID 26103)
-- Name: idx_job_work_item_type; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_job_work_item_type ON service.job_work_item USING btree (work_type);


--
-- TOC entry 5614 (class 1259 OID 26227)
-- Name: idx_service_due_alert; Type: INDEX; Schema: service; Owner: postgres
--

CREATE INDEX idx_service_due_alert ON service.vehicle_service_summary USING btree (due_status) WHERE ((due_status)::text = ANY ((ARRAY['DUE'::character varying, 'OVERDUE'::character varying])::text[]));


--
-- TOC entry 5514 (class 1259 OID 26357)
-- Name: uq_open_job_per_vehicle; Type: INDEX; Schema: service; Owner: postgres
--

CREATE UNIQUE INDEX uq_open_job_per_vehicle ON service.job_card USING btree (chassis_no) WHERE (out_datetime IS NULL);


--
-- TOC entry 5531 (class 1259 OID 26104)
-- Name: idx_warranty_claim_status; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_warranty_claim_status ON warranty.claim USING btree (claim_status);


--
-- TOC entry 5532 (class 1259 OID 26228)
-- Name: idx_warranty_pending; Type: INDEX; Schema: warranty; Owner: postgres
--

CREATE INDEX idx_warranty_pending ON warranty.claim USING btree (created_at) WHERE ((claim_status)::text = 'RAISED'::text);


--
-- TOC entry 5744 (class 2606 OID 25404)
-- Name: insurance_estimate fk_estimate_job; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.insurance_estimate
    ADD CONSTRAINT fk_estimate_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 5741 (class 2606 OID 25353)
-- Name: invoice fk_invoice_customer; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT fk_invoice_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5742 (class 2606 OID 25358)
-- Name: invoice fk_invoice_job; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice
    ADD CONSTRAINT fk_invoice_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 5743 (class 2606 OID 25383)
-- Name: invoice_line fk_invoice_line_invoice; Type: FK CONSTRAINT; Schema: billing; Owner: postgres
--

ALTER TABLE ONLY billing.invoice_line
    ADD CONSTRAINT fk_invoice_line_invoice FOREIGN KEY (invoice_id) REFERENCES billing.invoice(invoice_id) ON DELETE CASCADE;


--
-- TOC entry 5787 (class 2606 OID 26386)
-- Name: enquiry enquiry_lead_id_fkey; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT enquiry_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5763 (class 2606 OID 25820)
-- Name: lead_activity fk_activity_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT fk_activity_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5764 (class 2606 OID 25825)
-- Name: lead_activity fk_activity_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_activity
    ADD CONSTRAINT fk_activity_staff FOREIGN KEY (performed_by_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5770 (class 2606 OID 25925)
-- Name: lead_assignment_history fk_assignment_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5771 (class 2606 OID 25935)
-- Name: lead_assignment_history fk_assignment_new; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_new FOREIGN KEY (new_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5772 (class 2606 OID 25930)
-- Name: lead_assignment_history fk_assignment_old; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_assignment_history
    ADD CONSTRAINT fk_assignment_old FOREIGN KEY (old_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5788 (class 2606 OID 26469)
-- Name: enquiry fk_enquiry_created_by; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT fk_enquiry_created_by FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 5789 (class 2606 OID 26456)
-- Name: enquiry fk_enquiry_status; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.enquiry
    ADD CONSTRAINT fk_enquiry_status FOREIGN KEY (enquiry_status_id) REFERENCES crm.enquiry_status_master(status_id);


--
-- TOC entry 5765 (class 2606 OID 25848)
-- Name: followup_schedule fk_followup_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT fk_followup_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5766 (class 2606 OID 25853)
-- Name: followup_schedule fk_followup_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.followup_schedule
    ADD CONSTRAINT fk_followup_staff FOREIGN KEY (assigned_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5756 (class 2606 OID 26463)
-- Name: lead fk_lead_created_by; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_created_by FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 5757 (class 2606 OID 25763)
-- Name: lead fk_lead_customer; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5758 (class 2606 OID 25773)
-- Name: lead fk_lead_owner; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_owner FOREIGN KEY (owner_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5759 (class 2606 OID 26450)
-- Name: lead fk_lead_status; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_status FOREIGN KEY (lead_status_id) REFERENCES crm.lead_status_master(status_id);


--
-- TOC entry 5760 (class 2606 OID 25768)
-- Name: lead fk_lead_vehicle_model; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead
    ADD CONSTRAINT fk_lead_vehicle_model FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 5761 (class 2606 OID 25793)
-- Name: lead_status_history fk_status_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT fk_status_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5762 (class 2606 OID 25798)
-- Name: lead_status_history fk_status_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.lead_status_history
    ADD CONSTRAINT fk_status_staff FOREIGN KEY (changed_by_staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5767 (class 2606 OID 25895)
-- Name: test_ride fk_test_ride_lead; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE CASCADE;


--
-- TOC entry 5768 (class 2606 OID 25905)
-- Name: test_ride fk_test_ride_staff; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5769 (class 2606 OID 25900)
-- Name: test_ride fk_test_ride_vehicle; Type: FK CONSTRAINT; Schema: crm; Owner: postgres
--

ALTER TABLE ONLY crm.test_ride
    ADD CONSTRAINT fk_test_ride_vehicle FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 5786 (class 2606 OID 26343)
-- Name: vehicle_subsidy fk_subsidy_vehicle; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_subsidy
    ADD CONSTRAINT fk_subsidy_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5785 (class 2606 OID 26322)
-- Name: vehicle_loan fk_vehicle_loan_sale; Type: FK CONSTRAINT; Schema: finance; Owner: postgres
--

ALTER TABLE ONLY finance.vehicle_loan
    ADD CONSTRAINT fk_vehicle_loan_sale FOREIGN KEY (sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE RESTRICT;


--
-- TOC entry 5782 (class 2606 OID 26186)
-- Name: attendance fk_attendance_staff; Type: FK CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.attendance
    ADD CONSTRAINT fk_attendance_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE CASCADE;


--
-- TOC entry 5783 (class 2606 OID 26211)
-- Name: salary fk_salary_staff; Type: FK CONSTRAINT; Schema: hr; Owner: postgres
--

ALTER TABLE ONLY hr.salary
    ADD CONSTRAINT fk_salary_staff FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE RESTRICT;


--
-- TOC entry 5726 (class 2606 OID 25123)
-- Name: policy fk_policy_insurer; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_insurer FOREIGN KEY (insurance_company_id) REFERENCES insurance.insurance_company(insurance_company_id) ON DELETE RESTRICT;


--
-- TOC entry 5727 (class 2606 OID 25113)
-- Name: policy fk_policy_sale; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE RESTRICT;


--
-- TOC entry 5728 (class 2606 OID 25118)
-- Name: policy fk_policy_vehicle; Type: FK CONSTRAINT; Schema: insurance; Owner: postgres
--

ALTER TABLE ONLY insurance.policy
    ADD CONSTRAINT fk_policy_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5754 (class 2606 OID 25615)
-- Name: spare_serial fk_spare_serial_spare; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_serial
    ADD CONSTRAINT fk_spare_serial_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 5745 (class 2606 OID 26080)
-- Name: spare_stock_movement fk_spare_stock_movement_spare; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.spare_stock_movement
    ADD CONSTRAINT fk_spare_stock_movement_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 5784 (class 2606 OID 26276)
-- Name: vehicle_stock_movement fk_vehicle_movement_vehicle; Type: FK CONSTRAINT; Schema: inventory; Owner: postgres
--

ALTER TABLE ONLY inventory.vehicle_stock_movement
    ADD CONSTRAINT fk_vehicle_movement_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5710 (class 2606 OID 26362)
-- Name: customer customer_lead_reference_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer
    ADD CONSTRAINT customer_lead_reference_id_fkey FOREIGN KEY (lead_reference_id) REFERENCES crm.lead(lead_id) ON DELETE SET NULL;


--
-- TOC entry 5712 (class 2606 OID 24768)
-- Name: customer_document fk_customer_document_customer; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_document
    ADD CONSTRAINT fk_customer_document_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5711 (class 2606 OID 24746)
-- Name: customer_phone fk_customer_phone_customer; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.customer_phone
    ADD CONSTRAINT fk_customer_phone_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5777 (class 2606 OID 26059)
-- Name: expense_category fk_expense_parent; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.expense_category
    ADD CONSTRAINT fk_expense_parent FOREIGN KEY (parent_category_id) REFERENCES master.expense_category(expense_category_id) ON DELETE SET NULL;


--
-- TOC entry 5713 (class 2606 OID 24808)
-- Name: vehicle fk_vehicle_model; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle
    ADD CONSTRAINT fk_vehicle_model FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE RESTRICT;


--
-- TOC entry 5714 (class 2606 OID 24901)
-- Name: vendor_contact fk_vendor_contact_vendor; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_contact
    ADD CONSTRAINT fk_vendor_contact_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE CASCADE;


--
-- TOC entry 5715 (class 2606 OID 24923)
-- Name: vendor_document fk_vendor_document_vendor; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vendor_document
    ADD CONSTRAINT fk_vendor_document_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 5790 (class 2606 OID 26408)
-- Name: nominee nominee_customer_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.nominee
    ADD CONSTRAINT nominee_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE CASCADE;


--
-- TOC entry 5803 (class 2606 OID 26758)
-- Name: pin_reset_request pin_reset_request_processed_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_processed_by_fkey FOREIGN KEY (processed_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 5804 (class 2606 OID 26763)
-- Name: pin_reset_request pin_reset_request_staff_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.pin_reset_request
    ADD CONSTRAINT pin_reset_request_staff_id_fkey FOREIGN KEY (staff_id) REFERENCES master.staff(staff_id) ON DELETE CASCADE;


--
-- TOC entry 5799 (class 2606 OID 26624)
-- Name: spare_price_history spare_price_history_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 5800 (class 2606 OID 26619)
-- Name: spare_price_history spare_price_history_spare_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.spare_price_history
    ADD CONSTRAINT spare_price_history_spare_id_fkey FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id);


--
-- TOC entry 5755 (class 2606 OID 26657)
-- Name: staff staff_dealer_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.staff
    ADD CONSTRAINT staff_dealer_id_fkey FOREIGN KEY (dealer_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 5801 (class 2606 OID 26650)
-- Name: vehicle_price_history vehicle_price_history_created_by_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_created_by_fkey FOREIGN KEY (created_by) REFERENCES master.staff(staff_id);


--
-- TOC entry 5802 (class 2606 OID 26645)
-- Name: vehicle_price_history vehicle_price_history_vehicle_model_id_fkey; Type: FK CONSTRAINT; Schema: master; Owner: postgres
--

ALTER TABLE ONLY master.vehicle_price_history
    ADD CONSTRAINT vehicle_price_history_vehicle_model_id_fkey FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id);


--
-- TOC entry 5749 (class 2606 OID 25540)
-- Name: reimbursement_line fk_reim_line_invoice; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_invoice FOREIGN KEY (reimbursement_invoice_id) REFERENCES oem.reimbursement_invoice(reimbursement_invoice_id) ON DELETE CASCADE;


--
-- TOC entry 5750 (class 2606 OID 25545)
-- Name: reimbursement_line fk_reim_line_job; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE RESTRICT;


--
-- TOC entry 5751 (class 2606 OID 25550)
-- Name: reimbursement_line fk_reim_line_labour; Type: FK CONSTRAINT; Schema: oem; Owner: postgres
--

ALTER TABLE ONLY oem.reimbursement_line
    ADD CONSTRAINT fk_reim_line_labour FOREIGN KEY (job_labour_id) REFERENCES service.job_labour(job_labour_id) ON DELETE RESTRICT;


--
-- TOC entry 5747 (class 2606 OID 25490)
-- Name: spare_purchase_item fk_purchase_item_purchase; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT fk_purchase_item_purchase FOREIGN KEY (spare_purchase_id) REFERENCES procurement.spare_purchase(spare_purchase_id) ON DELETE CASCADE;


--
-- TOC entry 5748 (class 2606 OID 25495)
-- Name: spare_purchase_item fk_purchase_item_spare; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase_item
    ADD CONSTRAINT fk_purchase_item_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 5746 (class 2606 OID 25470)
-- Name: spare_purchase fk_spare_purchase_vendor; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.spare_purchase
    ADD CONSTRAINT fk_spare_purchase_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 5717 (class 2606 OID 24962)
-- Name: vehicle_purchase_detail fk_vehicle_purchase_detail_purchase; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT fk_vehicle_purchase_detail_purchase FOREIGN KEY (vehicle_purchase_id) REFERENCES procurement.vehicle_purchase(vehicle_purchase_id) ON DELETE CASCADE;


--
-- TOC entry 5718 (class 2606 OID 24967)
-- Name: vehicle_purchase_detail fk_vehicle_purchase_detail_vehicle; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase_detail
    ADD CONSTRAINT fk_vehicle_purchase_detail_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5716 (class 2606 OID 24943)
-- Name: vehicle_purchase fk_vehicle_purchase_vendor; Type: FK CONSTRAINT; Schema: procurement; Owner: postgres
--

ALTER TABLE ONLY procurement.vehicle_purchase
    ADD CONSTRAINT fk_vehicle_purchase_vendor FOREIGN KEY (vendor_id) REFERENCES master.vendor(vendor_id) ON DELETE RESTRICT;


--
-- TOC entry 5797 (class 2606 OID 26567)
-- Name: delivery_checklist delivery_checklist_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.delivery_checklist
    ADD CONSTRAINT delivery_checklist_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 5723 (class 2606 OID 25061)
-- Name: vehicle_payment fk_payment_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5724 (class 2606 OID 25071)
-- Name: vehicle_payment fk_payment_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE SET NULL;


--
-- TOC entry 5725 (class 2606 OID 25066)
-- Name: vehicle_payment fk_payment_vehicle; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_payment
    ADD CONSTRAINT fk_payment_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE SET NULL;


--
-- TOC entry 5773 (class 2606 OID 25974)
-- Name: vehicle_registration fk_registration_vehicle_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_registration
    ADD CONSTRAINT fk_registration_vehicle_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 5719 (class 2606 OID 24997)
-- Name: vehicle_sale fk_sale_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_sale_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5722 (class 2606 OID 25038)
-- Name: vehicle_sale_finance fk_sale_finance_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale_finance
    ADD CONSTRAINT fk_sale_finance_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 5720 (class 2606 OID 25002)
-- Name: vehicle_sale fk_sale_vehicle; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_sale_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5778 (class 2606 OID 26127)
-- Name: spare_sale fk_spare_sale_customer; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT fk_spare_sale_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE SET NULL;


--
-- TOC entry 5780 (class 2606 OID 26154)
-- Name: spare_sale_detail fk_spare_sale_detail_sale; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT fk_spare_sale_detail_sale FOREIGN KEY (spare_sale_id) REFERENCES sales.spare_sale(spare_sale_id) ON DELETE CASCADE;


--
-- TOC entry 5781 (class 2606 OID 26159)
-- Name: spare_sale_detail fk_spare_sale_detail_spare; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale_detail
    ADD CONSTRAINT fk_spare_sale_detail_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 5779 (class 2606 OID 26132)
-- Name: spare_sale fk_spare_sale_job_card; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.spare_sale
    ADD CONSTRAINT fk_spare_sale_job_card FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 5721 (class 2606 OID 26256)
-- Name: vehicle_sale fk_vehicle_sale_lead; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.vehicle_sale
    ADD CONSTRAINT fk_vehicle_sale_lead FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id) ON DELETE RESTRICT;


--
-- TOC entry 5795 (class 2606 OID 26545)
-- Name: payment_receipt payment_receipt_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 5796 (class 2606 OID 26540)
-- Name: payment_receipt payment_receipt_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.payment_receipt
    ADD CONSTRAINT payment_receipt_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 5791 (class 2606 OID 26514)
-- Name: sale sale_chassis_no_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_chassis_no_fkey FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no);


--
-- TOC entry 5792 (class 2606 OID 26519)
-- Name: sale sale_created_by_staff_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_created_by_staff_id_fkey FOREIGN KEY (created_by_staff_id) REFERENCES master.staff(staff_id);


--
-- TOC entry 5793 (class 2606 OID 26509)
-- Name: sale sale_customer_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_customer_id_fkey FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id);


--
-- TOC entry 5794 (class 2606 OID 26504)
-- Name: sale sale_lead_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.sale
    ADD CONSTRAINT sale_lead_id_fkey FOREIGN KEY (lead_id) REFERENCES crm.lead(lead_id);


--
-- TOC entry 5798 (class 2606 OID 26587)
-- Name: service_schedule service_schedule_sale_id_fkey; Type: FK CONSTRAINT; Schema: sales; Owner: postgres
--

ALTER TABLE ONLY sales.service_schedule
    ADD CONSTRAINT service_schedule_sale_id_fkey FOREIGN KEY (sale_id) REFERENCES sales.sale(sale_id);


--
-- TOC entry 5733 (class 2606 OID 25219)
-- Name: vehicle_component_change fk_component_job; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 5734 (class 2606 OID 25620)
-- Name: vehicle_component_change fk_component_new_serial; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_new_serial FOREIGN KEY (new_spare_serial_id) REFERENCES inventory.spare_serial(spare_serial_id) ON DELETE RESTRICT;


--
-- TOC entry 5735 (class 2606 OID 25224)
-- Name: vehicle_component_change fk_component_vehicle; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_component_change
    ADD CONSTRAINT fk_component_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5729 (class 2606 OID 25153)
-- Name: job_card fk_job_customer; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT fk_job_customer FOREIGN KEY (customer_id) REFERENCES master.customer(customer_id) ON DELETE RESTRICT;


--
-- TOC entry 5732 (class 2606 OID 25193)
-- Name: job_labour fk_job_labour_work; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_labour
    ADD CONSTRAINT fk_job_labour_work FOREIGN KEY (work_item_id) REFERENCES service.job_work_item(work_item_id) ON DELETE CASCADE;


--
-- TOC entry 5736 (class 2606 OID 26087)
-- Name: job_spare fk_job_spare_spare; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT fk_job_spare_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 5737 (class 2606 OID 25284)
-- Name: job_spare fk_job_spare_work; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_spare
    ADD CONSTRAINT fk_job_spare_work FOREIGN KEY (work_item_id) REFERENCES service.job_work_item(work_item_id) ON DELETE CASCADE;


--
-- TOC entry 5730 (class 2606 OID 25148)
-- Name: job_card fk_job_vehicle; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_card
    ADD CONSTRAINT fk_job_vehicle FOREIGN KEY (chassis_no) REFERENCES master.vehicle(chassis_no) ON DELETE RESTRICT;


--
-- TOC entry 5775 (class 2606 OID 26021)
-- Name: vehicle_service_summary fk_last_job_card; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT fk_last_job_card FOREIGN KEY (last_job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE SET NULL;


--
-- TOC entry 5774 (class 2606 OID 25995)
-- Name: service_schedule fk_schedule_variant; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.service_schedule
    ADD CONSTRAINT fk_schedule_variant FOREIGN KEY (vehicle_model_id) REFERENCES master.vehicle_model(vehicle_model_id) ON DELETE CASCADE;


--
-- TOC entry 5776 (class 2606 OID 26016)
-- Name: vehicle_service_summary fk_service_vehicle_sale; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.vehicle_service_summary
    ADD CONSTRAINT fk_service_vehicle_sale FOREIGN KEY (vehicle_sale_id) REFERENCES sales.vehicle_sale(vehicle_sale_id) ON DELETE CASCADE;


--
-- TOC entry 5731 (class 2606 OID 25173)
-- Name: job_work_item fk_work_item_job; Type: FK CONSTRAINT; Schema: service; Owner: postgres
--

ALTER TABLE ONLY service.job_work_item
    ADD CONSTRAINT fk_work_item_job FOREIGN KEY (job_card_id) REFERENCES service.job_card(job_card_id) ON DELETE CASCADE;


--
-- TOC entry 5738 (class 2606 OID 25302)
-- Name: claim fk_claim_spare; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.claim
    ADD CONSTRAINT fk_claim_spare FOREIGN KEY (job_spare_id) REFERENCES service.job_spare(job_spare_id) ON DELETE CASCADE;


--
-- TOC entry 5739 (class 2606 OID 25324)
-- Name: shipment_item fk_ship_item_claim; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT fk_ship_item_claim FOREIGN KEY (claim_id) REFERENCES warranty.claim(claim_id) ON DELETE CASCADE;


--
-- TOC entry 5740 (class 2606 OID 25319)
-- Name: shipment_item fk_ship_item_shipment; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.shipment_item
    ADD CONSTRAINT fk_ship_item_shipment FOREIGN KEY (shipment_id) REFERENCES warranty.shipment(shipment_id) ON DELETE CASCADE;


--
-- TOC entry 5752 (class 2606 OID 25586)
-- Name: inward_item fk_warranty_inward; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT fk_warranty_inward FOREIGN KEY (warranty_inward_id) REFERENCES warranty.inward(warranty_inward_id) ON DELETE CASCADE;


--
-- TOC entry 5753 (class 2606 OID 25591)
-- Name: inward_item fk_warranty_inward_spare; Type: FK CONSTRAINT; Schema: warranty; Owner: postgres
--

ALTER TABLE ONLY warranty.inward_item
    ADD CONSTRAINT fk_warranty_inward_spare FOREIGN KEY (spare_id) REFERENCES inventory.spare_master(spare_id) ON DELETE RESTRICT;


--
-- TOC entry 6097 (class 0 OID 0)
-- Dependencies: 7
-- Name: SCHEMA billing; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA billing TO app_user;


--
-- TOC entry 6098 (class 0 OID 0)
-- Dependencies: 8
-- Name: SCHEMA crm; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA crm TO app_user;


--
-- TOC entry 6099 (class 0 OID 0)
-- Dependencies: 9
-- Name: SCHEMA finance; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA finance TO app_user;


--
-- TOC entry 6100 (class 0 OID 0)
-- Dependencies: 10
-- Name: SCHEMA hr; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA hr TO app_user;


--
-- TOC entry 6101 (class 0 OID 0)
-- Dependencies: 11
-- Name: SCHEMA insurance; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA insurance TO app_user;


--
-- TOC entry 6102 (class 0 OID 0)
-- Dependencies: 12
-- Name: SCHEMA inventory; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA inventory TO app_user;


--
-- TOC entry 6103 (class 0 OID 0)
-- Dependencies: 13
-- Name: SCHEMA master; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA master TO app_user;


--
-- TOC entry 6104 (class 0 OID 0)
-- Dependencies: 14
-- Name: SCHEMA oem; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA oem TO app_user;


--
-- TOC entry 6105 (class 0 OID 0)
-- Dependencies: 15
-- Name: SCHEMA procurement; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA procurement TO app_user;


--
-- TOC entry 6106 (class 0 OID 0)
-- Dependencies: 16
-- Name: SCHEMA sales; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA sales TO app_user;


--
-- TOC entry 6107 (class 0 OID 0)
-- Dependencies: 17
-- Name: SCHEMA service; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA service TO app_user;


--
-- TOC entry 6108 (class 0 OID 0)
-- Dependencies: 18
-- Name: SCHEMA warranty; Type: ACL; Schema: -; Owner: postgres
--

GRANT USAGE ON SCHEMA warranty TO app_user;


--
-- TOC entry 6109 (class 0 OID 0)
-- Dependencies: 284
-- Name: TABLE insurance_estimate; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.insurance_estimate TO app_user;


--
-- TOC entry 6111 (class 0 OID 0)
-- Dependencies: 280
-- Name: TABLE invoice; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.invoice TO app_user;


--
-- TOC entry 6113 (class 0 OID 0)
-- Dependencies: 282
-- Name: TABLE invoice_line; Type: ACL; Schema: billing; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE billing.invoice_line TO app_user;


--
-- TOC entry 6115 (class 0 OID 0)
-- Dependencies: 346
-- Name: TABLE enquiry; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.enquiry TO app_user;


--
-- TOC entry 6117 (class 0 OID 0)
-- Dependencies: 352
-- Name: TABLE enquiry_status_master; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.enquiry_status_master TO app_user;


--
-- TOC entry 6119 (class 0 OID 0)
-- Dependencies: 312
-- Name: TABLE followup_schedule; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.followup_schedule TO app_user;


--
-- TOC entry 6121 (class 0 OID 0)
-- Dependencies: 306
-- Name: TABLE lead; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead TO app_user;


--
-- TOC entry 6122 (class 0 OID 0)
-- Dependencies: 310
-- Name: TABLE lead_activity; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_activity TO app_user;


--
-- TOC entry 6124 (class 0 OID 0)
-- Dependencies: 316
-- Name: TABLE lead_assignment_history; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_assignment_history TO app_user;


--
-- TOC entry 6127 (class 0 OID 0)
-- Dependencies: 308
-- Name: TABLE lead_status_history; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_status_history TO app_user;


--
-- TOC entry 6129 (class 0 OID 0)
-- Dependencies: 350
-- Name: TABLE lead_status_master; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.lead_status_master TO app_user;


--
-- TOC entry 6131 (class 0 OID 0)
-- Dependencies: 314
-- Name: TABLE test_ride; Type: ACL; Schema: crm; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE crm.test_ride TO app_user;


--
-- TOC entry 6133 (class 0 OID 0)
-- Dependencies: 336
-- Name: TABLE salary; Type: ACL; Schema: hr; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE hr.salary TO app_user;


--
-- TOC entry 6134 (class 0 OID 0)
-- Dependencies: 326
-- Name: TABLE expense_category; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.expense_category TO app_user;


--
-- TOC entry 6135 (class 0 OID 0)
-- Dependencies: 338
-- Name: TABLE expense_summary_view; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.expense_summary_view TO app_user;


--
-- TOC entry 6136 (class 0 OID 0)
-- Dependencies: 337
-- Name: TABLE sales_summary_view; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.sales_summary_view TO app_user;


--
-- TOC entry 6137 (class 0 OID 0)
-- Dependencies: 342
-- Name: TABLE vehicle_loan; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.vehicle_loan TO app_user;


--
-- TOC entry 6139 (class 0 OID 0)
-- Dependencies: 344
-- Name: TABLE vehicle_subsidy; Type: ACL; Schema: finance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE finance.vehicle_subsidy TO app_user;


--
-- TOC entry 6141 (class 0 OID 0)
-- Dependencies: 334
-- Name: TABLE attendance; Type: ACL; Schema: hr; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE hr.attendance TO app_user;


--
-- TOC entry 6144 (class 0 OID 0)
-- Dependencies: 260
-- Name: TABLE insurance_company; Type: ACL; Schema: insurance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE insurance.insurance_company TO app_user;


--
-- TOC entry 6146 (class 0 OID 0)
-- Dependencies: 262
-- Name: TABLE policy; Type: ACL; Schema: insurance; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE insurance.policy TO app_user;


--
-- TOC entry 6148 (class 0 OID 0)
-- Dependencies: 288
-- Name: TABLE spare_master; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_master TO app_user;


--
-- TOC entry 6150 (class 0 OID 0)
-- Dependencies: 302
-- Name: TABLE spare_serial; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_serial TO app_user;


--
-- TOC entry 6152 (class 0 OID 0)
-- Dependencies: 286
-- Name: TABLE spare_stock_movement; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.spare_stock_movement TO app_user;


--
-- TOC entry 6154 (class 0 OID 0)
-- Dependencies: 340
-- Name: TABLE vehicle_stock_movement; Type: ACL; Schema: inventory; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE inventory.vehicle_stock_movement TO app_user;


--
-- TOC entry 6156 (class 0 OID 0)
-- Dependencies: 354
-- Name: TABLE brand; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.brand TO app_user;


--
-- TOC entry 6158 (class 0 OID 0)
-- Dependencies: 232
-- Name: TABLE customer; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer TO app_user;


--
-- TOC entry 6160 (class 0 OID 0)
-- Dependencies: 239
-- Name: TABLE customer_document; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer_document TO app_user;


--
-- TOC entry 6162 (class 0 OID 0)
-- Dependencies: 237
-- Name: TABLE customer_phone; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.customer_phone TO app_user;


--
-- TOC entry 6165 (class 0 OID 0)
-- Dependencies: 328
-- Name: TABLE job_card_category; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.job_card_category TO app_user;


--
-- TOC entry 6167 (class 0 OID 0)
-- Dependencies: 348
-- Name: TABLE nominee; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.nominee TO app_user;


--
-- TOC entry 6169 (class 0 OID 0)
-- Dependencies: 324
-- Name: TABLE payment_mode; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.payment_mode TO app_user;


--
-- TOC entry 6171 (class 0 OID 0)
-- Dependencies: 369
-- Name: TABLE pin_reset_request; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.pin_reset_request TO app_user;


--
-- TOC entry 6173 (class 0 OID 0)
-- Dependencies: 364
-- Name: TABLE spare_price_history; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.spare_price_history TO app_user;


--
-- TOC entry 6175 (class 0 OID 0)
-- Dependencies: 304
-- Name: TABLE staff; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.staff TO app_user;


--
-- TOC entry 6177 (class 0 OID 0)
-- Dependencies: 242
-- Name: TABLE vehicle; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle TO app_user;


--
-- TOC entry 6178 (class 0 OID 0)
-- Dependencies: 241
-- Name: TABLE vehicle_model; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle_model TO app_user;


--
-- TOC entry 6180 (class 0 OID 0)
-- Dependencies: 366
-- Name: TABLE vehicle_price_history; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vehicle_price_history TO app_user;


--
-- TOC entry 6182 (class 0 OID 0)
-- Dependencies: 244
-- Name: TABLE vendor; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor TO app_user;


--
-- TOC entry 6183 (class 0 OID 0)
-- Dependencies: 246
-- Name: TABLE vendor_contact; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor_contact TO app_user;


--
-- TOC entry 6185 (class 0 OID 0)
-- Dependencies: 248
-- Name: TABLE vendor_document; Type: ACL; Schema: master; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE master.vendor_document TO app_user;


--
-- TOC entry 6188 (class 0 OID 0)
-- Dependencies: 294
-- Name: TABLE reimbursement_invoice; Type: ACL; Schema: oem; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE oem.reimbursement_invoice TO app_user;


--
-- TOC entry 6190 (class 0 OID 0)
-- Dependencies: 296
-- Name: TABLE reimbursement_line; Type: ACL; Schema: oem; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE oem.reimbursement_line TO app_user;


--
-- TOC entry 6192 (class 0 OID 0)
-- Dependencies: 290
-- Name: TABLE spare_purchase; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.spare_purchase TO app_user;


--
-- TOC entry 6193 (class 0 OID 0)
-- Dependencies: 292
-- Name: TABLE spare_purchase_item; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.spare_purchase_item TO app_user;


--
-- TOC entry 6196 (class 0 OID 0)
-- Dependencies: 250
-- Name: TABLE vehicle_purchase; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.vehicle_purchase TO app_user;


--
-- TOC entry 6197 (class 0 OID 0)
-- Dependencies: 252
-- Name: TABLE vehicle_purchase_detail; Type: ACL; Schema: procurement; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE procurement.vehicle_purchase_detail TO app_user;


--
-- TOC entry 6200 (class 0 OID 0)
-- Dependencies: 360
-- Name: TABLE delivery_checklist; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.delivery_checklist TO app_user;


--
-- TOC entry 6202 (class 0 OID 0)
-- Dependencies: 358
-- Name: TABLE payment_receipt; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.payment_receipt TO app_user;


--
-- TOC entry 6204 (class 0 OID 0)
-- Dependencies: 356
-- Name: TABLE sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.sale TO app_user;


--
-- TOC entry 6206 (class 0 OID 0)
-- Dependencies: 362
-- Name: TABLE service_schedule; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.service_schedule TO app_user;


--
-- TOC entry 6208 (class 0 OID 0)
-- Dependencies: 330
-- Name: TABLE spare_sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.spare_sale TO app_user;


--
-- TOC entry 6209 (class 0 OID 0)
-- Dependencies: 332
-- Name: TABLE spare_sale_detail; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.spare_sale_detail TO app_user;


--
-- TOC entry 6212 (class 0 OID 0)
-- Dependencies: 258
-- Name: TABLE vehicle_payment; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_payment TO app_user;


--
-- TOC entry 6214 (class 0 OID 0)
-- Dependencies: 318
-- Name: TABLE vehicle_registration; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_registration TO app_user;


--
-- TOC entry 6216 (class 0 OID 0)
-- Dependencies: 254
-- Name: TABLE vehicle_sale; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_sale TO app_user;


--
-- TOC entry 6217 (class 0 OID 0)
-- Dependencies: 256
-- Name: TABLE vehicle_sale_finance; Type: ACL; Schema: sales; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE sales.vehicle_sale_finance TO app_user;


--
-- TOC entry 6220 (class 0 OID 0)
-- Dependencies: 264
-- Name: TABLE job_card; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_card TO app_user;


--
-- TOC entry 6222 (class 0 OID 0)
-- Dependencies: 268
-- Name: TABLE job_labour; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_labour TO app_user;


--
-- TOC entry 6224 (class 0 OID 0)
-- Dependencies: 274
-- Name: TABLE job_spare; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_spare TO app_user;


--
-- TOC entry 6226 (class 0 OID 0)
-- Dependencies: 266
-- Name: TABLE job_work_item; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.job_work_item TO app_user;


--
-- TOC entry 6228 (class 0 OID 0)
-- Dependencies: 320
-- Name: TABLE service_schedule; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.service_schedule TO app_user;


--
-- TOC entry 6230 (class 0 OID 0)
-- Dependencies: 270
-- Name: TABLE vehicle_component_change; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.vehicle_component_change TO app_user;


--
-- TOC entry 6232 (class 0 OID 0)
-- Dependencies: 322
-- Name: TABLE vehicle_service_summary; Type: ACL; Schema: service; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE service.vehicle_service_summary TO app_user;


--
-- TOC entry 6234 (class 0 OID 0)
-- Dependencies: 276
-- Name: TABLE claim; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.claim TO app_user;


--
-- TOC entry 6236 (class 0 OID 0)
-- Dependencies: 298
-- Name: TABLE inward; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.inward TO app_user;


--
-- TOC entry 6237 (class 0 OID 0)
-- Dependencies: 300
-- Name: TABLE inward_item; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.inward_item TO app_user;


--
-- TOC entry 6240 (class 0 OID 0)
-- Dependencies: 272
-- Name: TABLE shipment; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.shipment TO app_user;


--
-- TOC entry 6241 (class 0 OID 0)
-- Dependencies: 278
-- Name: TABLE shipment_item; Type: ACL; Schema: warranty; Owner: postgres
--

GRANT SELECT,INSERT,UPDATE ON TABLE warranty.shipment_item TO app_user;


--
-- TOC entry 2414 (class 826 OID 26239)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: billing; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA billing GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2415 (class 826 OID 26243)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: crm; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA crm GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2416 (class 826 OID 26245)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: finance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA finance GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2417 (class 826 OID 26244)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: hr; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA hr GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2418 (class 826 OID 26242)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: insurance; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA insurance GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2419 (class 826 OID 26236)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: inventory; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA inventory GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2420 (class 826 OID 26235)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: master; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA master GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2421 (class 826 OID 26246)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: oem; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA oem GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2422 (class 826 OID 26237)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: procurement; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA procurement GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2423 (class 826 OID 26238)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: sales; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA sales GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2424 (class 826 OID 26240)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: service; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA service GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


--
-- TOC entry 2425 (class 826 OID 26241)
-- Name: DEFAULT PRIVILEGES FOR TABLES; Type: DEFAULT ACL; Schema: warranty; Owner: postgres
--

ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA warranty GRANT SELECT,INSERT,UPDATE ON TABLES TO app_user;


-- Completed on 2026-02-14 13:45:44

--
-- PostgreSQL database dump complete
--

\unrestrict Ab1ecRPM3nQ0mh8dRyY7189USlEdmh1qCYsbdUwgE1mZT507Y60mRYq4hlMBl3D

