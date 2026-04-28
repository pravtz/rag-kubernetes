#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
GREEN='\033[0;32m'
RED='\033[0;31m'
CYAN='\033[0;36m'
NC='\033[0m'
PASS=0
FAIL=0

header() { echo -e "\n${CYAN}━━━ $1 ━━━${NC}"; }

check() {
  local name="$1" status="$2" expected="$3"
  if [[ "$status" -eq "$expected" ]]; then
    echo -e "  ${GREEN}✔ ${name}${NC}  (HTTP ${status})"
    ((PASS++))
  else
    echo -e "  ${RED}✘ ${name}${NC}  (HTTP ${status}, esperado ${expected})"
    ((FAIL++))
  fi
}

# ── Health & Status ──────────────────────────────────────────
header "Health Check"
status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/health")
check "GET /health" "$status" 200

header "API Status"
status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/rag/status")
check "GET /api/rag/status" "$status" 200

header "Readiness Probe"
status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/rag/ready")
check "GET /api/rag/ready" "$status" 200

header "Qdrant Info"
status=$(curl -s -o /dev/null -w "%{http_code}" "${BASE_URL}/api/rag/qdrant-info")
check "GET /api/rag/qdrant-info" "$status" 200

# ── Ingest PDFs ──────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PDF1="${SCRIPT_DIR}/artigo_ia_desenvolvimento_software.pdf"
PDF2="${SCRIPT_DIR}/kubernetes-control-plane-manual.pdf"

header "Ingest PDF 1 → docs_padronizacao"
response=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@${PDF1}" \
  -F "collection=docs_padronizacao" \
  "${BASE_URL}/api/rag/ingest")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/rag/ingest (artigo_ia)" "$status" 200
echo "  Response: ${body}"

header "Ingest PDF 2 → docs_gerais"
response=$(curl -s -w "\n%{http_code}" -X POST \
  -F "file=@${PDF2}" \
  -F "collection=docs_gerais" \
  "${BASE_URL}/api/rag/ingest")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/rag/ingest (kubernetes)" "$status" 200
echo "  Response: ${body}"

# ── Query ────────────────────────────────────────────────────
header "Query (routing automático)"
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é RAG e como funciona?"}' \
  "${BASE_URL}/api/rag/query")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/rag/query" "$status" 200
echo "  Resposta (trecho): $(echo "$body" | head -c 200)..."

header "Query (forçar collection)"
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"O que é o control plane do Kubernetes?","forceCollections":["docs_gerais"]}' \
  "${BASE_URL}/api/rag/query")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/rag/query (forceCollections)" "$status" 200
echo "  Resposta (trecho): $(echo "$body" | head -c 200)..."

header "Query via alias /pergunta"
response=$(curl -s -w "\n%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{"question":"Quais componentes fazem parte do control plane?"}' \
  "${BASE_URL}/api/rag/pergunta")
body=$(echo "$response" | head -n -1)
status=$(echo "$response" | tail -n 1)
check "POST /api/rag/pergunta" "$status" 200
echo "  Resposta (trecho): $(echo "$body" | head -c 200)..."

# ── Validação de erro ────────────────────────────────────────
header "Validação: query sem question"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -H "Content-Type: application/json" \
  -d '{}' \
  "${BASE_URL}/api/rag/query")
check "POST /api/rag/query (sem question → 400)" "$status" 400

header "Validação: ingest sem arquivo"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  "${BASE_URL}/api/rag/ingest")
check "POST /api/rag/ingest (sem file → 400)" "$status" 400

header "Validação: collection inválida"
status=$(curl -s -o /dev/null -w "%{http_code}" -X POST \
  -F "file=@${PDF1}" \
  -F "collection=inexistente" \
  "${BASE_URL}/api/rag/ingest")
check "POST /api/rag/ingest (collection inválida → 400)" "$status" 400

# ── Resultado ────────────────────────────────────────────────
header "Resultado"
TOTAL=$((PASS + FAIL))
echo -e "  ${GREEN}${PASS} passou${NC} / ${RED}${FAIL} falhou${NC} / ${TOTAL} total"

if [[ "$FAIL" -gt 0 ]]; then
  exit 1
fi
