#!/usr/bin/env bash
# ============================================
# setup:cf — Print Cloudflare resource creation steps
# ============================================
# This script does NOT make any changes — it prints the exact commands you
# need to run to provision the Cloudflare resources referenced by
# wrangler.toml placeholders.
#
# Prerequisites:
#   1. `npm install` (installs wrangler)
#   2. `wrangler login` — browser opens, you authenticate
#
# Run: `bash setup:cf.sh` or `npm run setup:cf`

set -e

# Colors for terminal output
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m' # No Color

cat <<'BANNER'
========================================================================
            Djuniors - Cloudflare Setup Helper (setup:cf)
========================================================================

This script PRINTS the commands you need to run, then we walk through the
results together. Nothing is created or modified automatically — you stay
in control.

You will need:
  • A Cloudflare account (free tier is fine)
  • Logged in via `wrangler login` (one-time)

BANNER

# Sanity check: is wrangler installed?
if ! command -v wrangler &> /dev/null && ! npx wrangler --version &> /dev/null 2>&1; then
    echo -e "${RED}ERROR:${NC} wrangler CLI not found. Run 'npm install' first."
    exit 1
fi

echo
echo -e "${BOLD}Step 0: Login to Cloudflare${NC}"
echo -e "  ${CYAN}wrangler login${NC}"
echo
echo "  → Opens your browser to Cloudflare's auth page. Approve, then return."
echo
echo -e "${YELLOW}Press Enter when logged in...${NC}"
read -r

echo
echo -e "${BOLD}Step 1: Create D1 database${NC}"
echo "  Running: ${CYAN}wrangler d1 create djuniors-db${NC}"
echo
D1_OUTPUT=$(npx wrangler d1 create djuniors-db 2>&1 || true)
echo "$D1_OUTPUT"
echo

# Extract the database_id from output (look for the line that contains the UUID-shaped string
# after `database_id =` or under a `id` heading).
D1_ID=$(echo "$D1_OUTPUT" | grep -oE '"[a-f0-9-]{30,}"' | tr -d '"' | head -1 || true)

if [ -n "$D1_ID" ]; then
    echo -e "${GREEN}✓ Detected database_id:${NC} $D1_ID"
    echo -e "  → Update ${BOLD}wrangler.toml${NC}: replace \`<YOUR_D1_DATABASE_ID>\` with: ${CYAN}$D1_ID${NC}"
else
    echo -e "${YELLOW}Could not auto-detect the database_id.${NC}"
    echo "  Look above for the line containing 'database_id' (UUID-like) and paste it into wrangler.toml."
    echo
    echo -e "${YELLOW}Press Enter after you've updated wrangler.toml...${NC}"
    read -r
fi

echo
echo -e "${BOLD}Step 2: Create R2 bucket${NC}"
echo "  Running: ${CYAN}wrangler r2 bucket create djuniors-files${NC}"
echo
R2_OUTPUT=$(npx wrangler r2 bucket create djuniors-files 2>&1 || true)
echo "$R2_OUTPUT"

echo
echo -e "${BOLD}Step 3: Create KV namespace${NC}"
echo "  Running: ${CYAN}wrangler kv namespace create DJUNIORS_KV${NC}"
echo
KV_OUTPUT=$(npx wrangler kv namespace create DJUNIORS_KV 2>&1 || true)
echo "$KV_OUTPUT"

# Same auto-detect for KV
KV_ID=$(echo "$KV_OUTPUT" | grep -oE '"[a-f0-9]{32}"' | tr -d '"' | head -1 || true)

if [ -n "$KV_ID" ]; then
    echo -e "${GREEN}✓ Detected KV namespace id:${NC} $KV_ID"
    echo -e "  → Update ${BOLD}wrangler.toml${NC}: replace \`<YOUR_KV_NAMESPACE_ID>\` with: ${CYAN}$KV_ID${NC}"
else
    echo -e "${YELLOW}Could not auto-detect the namespace id.${NC}"
    echo "  Look above for 'id = \"...\"' line and paste it into wrangler.toml."
fi
echo

cat <<'NEXT'

========================================================================
Next: Apply schema, deploy, set secrets
========================================================================

After wrangler.toml has real IDs:

  1. Apply schema + seed to REMOTE D1:
       npm run db:init:remote
       npm run db:seed:remote    # only if your D1 is empty

   2. Set secrets (you'll be prompted for each value):
        wrangler secret put TURNSTILE_SECRET
        # Optional: wrangler secret put JWT_SECRET (auto-generated in D1 if omitted)
        # Note: Fonnte token can be configured in dashboard Settings → WhatsApp Gateway

  3. Build the dashboard:
       npm run dashboard:build

  4. Deploy everything:
       npm run deploy:all

See DEPLOY.md for the full step-by-step.

NEXT
