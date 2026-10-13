#!/bin/sh
# Prueba la migración y la seguridad en un Postgres local (puerto 5499).
set -e
cd "$(dirname "$0")/../.."
psql -h /tmp -p 5499 -U postgres -d postgres -q -c "drop database if exists pyp" -c "create database pyp"
psql -h /tmp -p 5499 -U postgres -d pyp -q -f tests/db/stub_supabase.sql 2>/dev/null || true
psql -h /tmp -p 5499 -U postgres -d pyp -q -v ON_ERROR_STOP=1 -f supabase/migrations/20261013000000_base.sql
psql -h /tmp -p 5499 -U postgres -d pyp -q -v ON_ERROR_STOP=1 -f tests/db/rls_test.sql 2>&1 | grep -E "NOTICE|FALLO|TERMINARON|ERROR|esperado" 
