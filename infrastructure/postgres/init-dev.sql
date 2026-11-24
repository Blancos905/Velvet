-- Primo avvio del volume Postgres di sviluppo.
-- Lo schema coincide con il profilo Spring «local» (currentSchema=c1luxury).
CREATE SCHEMA IF NOT EXISTS c1luxury AUTHORIZATION postgres;
CREATE EXTENSION IF NOT EXISTS postgis;
