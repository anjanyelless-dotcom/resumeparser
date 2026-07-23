--
-- PostgreSQL database dump
--

-- Dumped from database version 18.1
-- Dumped by pg_dump version 18.1

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
-- SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: alembic_version; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.alembic_version (
    version_num character varying(32) NOT NULL
);


ALTER TABLE public.alembic_version OWNER TO postgres;

--
-- Name: api_keys; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.api_keys (
    id uuid NOT NULL,
    key_hash character varying(64) NOT NULL,
    role character varying(50) NOT NULL,
    subject character varying(255) NOT NULL,
    created_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone
);


ALTER TABLE public.api_keys OWNER TO postgres;

--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.audit_logs (
    id uuid NOT NULL,
    user_id character varying(255),
    action character varying(100) NOT NULL,
    resource_type character varying(100) NOT NULL,
    resource_id character varying(255),
    ip_address character varying(64),
    details jsonb,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.audit_logs OWNER TO postgres;

--
-- Name: candidate_achievements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.candidate_achievements (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    title text NOT NULL,
    year integer,
    confidence double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


ALTER TABLE public.candidate_achievements OWNER TO postgres;

--
-- Name: correction_patterns; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.correction_patterns (
    id uuid NOT NULL,
    field_name character varying(200) NOT NULL,
    original_value text NOT NULL,
    corrected_value text NOT NULL,
    count integer NOT NULL,
    last_seen_at timestamp with time zone NOT NULL
);


ALTER TABLE public.correction_patterns OWNER TO postgres;

--
-- Name: correction_stats; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.correction_stats (
    field_name character varying(200) NOT NULL,
    correction_count integer NOT NULL
);


ALTER TABLE public.correction_stats OWNER TO postgres;

--
-- Name: corrections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.corrections (
    id uuid NOT NULL,
    candidate_id uuid NOT NULL,
    field_name character varying(200) NOT NULL,
    original_value text,
    corrected_value text,
    corrected_by character varying(255),
    corrected_at timestamp with time zone NOT NULL
);


ALTER TABLE public.corrections OWNER TO postgres;

--
-- Name: revoked_tokens; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.revoked_tokens (
    id uuid NOT NULL,
    jti character varying(64) NOT NULL,
    subject character varying(255) NOT NULL,
    expires_at timestamp with time zone NOT NULL,
    revoked_at timestamp with time zone NOT NULL
);


ALTER TABLE public.revoked_tokens OWNER TO postgres;

--
-- Name: skill_suggestions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.skill_suggestions (
    id uuid NOT NULL,
    skill_name character varying(200) NOT NULL,
    normalized_name character varying(200) NOT NULL,
    source character varying(200),
    notes text,
    created_at timestamp with time zone NOT NULL
);


ALTER TABLE public.skill_suggestions OWNER TO postgres;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(100) NOT NULL,
    value jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO postgres;

--
-- Name: alembic_version alembic_version_pkc; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.alembic_version
    ADD CONSTRAINT alembic_version_pkc PRIMARY KEY (version_num);


--
-- Name: api_keys api_keys_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.api_keys
    ADD CONSTRAINT api_keys_pkey PRIMARY KEY (id);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: candidate_achievements candidate_achievements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_achievements
    ADD CONSTRAINT candidate_achievements_pkey PRIMARY KEY (id);


--
-- Name: correction_patterns correction_patterns_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.correction_patterns
    ADD CONSTRAINT correction_patterns_pkey PRIMARY KEY (id);


--
-- Name: correction_stats correction_stats_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.correction_stats
    ADD CONSTRAINT correction_stats_pkey PRIMARY KEY (field_name);


--
-- Name: corrections corrections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_pkey PRIMARY KEY (id);


--
-- Name: revoked_tokens revoked_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.revoked_tokens
    ADD CONSTRAINT revoked_tokens_pkey PRIMARY KEY (id);


--
-- Name: skill_suggestions skill_suggestions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.skill_suggestions
    ADD CONSTRAINT skill_suggestions_pkey PRIMARY KEY (id);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: ix_api_keys_key_hash; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_api_keys_key_hash ON public.api_keys USING btree (key_hash);


--
-- Name: ix_candidate_achievements_candidate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_candidate_achievements_candidate_id ON public.candidate_achievements USING btree (candidate_id);


--
-- Name: ix_correction_patterns_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_correction_patterns_field_name ON public.correction_patterns USING btree (field_name);


--
-- Name: ix_corrections_candidate_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_corrections_candidate_id ON public.corrections USING btree (candidate_id);


--
-- Name: ix_corrections_field_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_corrections_field_name ON public.corrections USING btree (field_name);


--
-- Name: ix_revoked_tokens_jti; Type: INDEX; Schema: public; Owner: postgres
--

CREATE UNIQUE INDEX ix_revoked_tokens_jti ON public.revoked_tokens USING btree (jti);


--
-- Name: ix_skill_suggestions_normalized_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_skill_suggestions_normalized_name ON public.skill_suggestions USING btree (normalized_name);


--
-- Name: ix_skill_suggestions_skill_name; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX ix_skill_suggestions_skill_name ON public.skill_suggestions USING btree (skill_name);


--
-- Name: candidate_achievements candidate_achievements_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.candidate_achievements
    ADD CONSTRAINT candidate_achievements_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- Name: corrections corrections_candidate_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.corrections
    ADD CONSTRAINT corrections_candidate_id_fkey FOREIGN KEY (candidate_id) REFERENCES public.candidates(id) ON DELETE CASCADE;


--
-- PostgreSQL database dump complete
--
