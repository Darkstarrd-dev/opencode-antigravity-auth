#!/bin/bash
set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Authenticating Development Tools ===${NC}"
echo "This script establishes the persistent sessions for your AI tools."

# 1. GitHub & Copilot
echo -e "${GREEN}[1/2] Authenticating GitHub & Copilot...${NC}"
echo "Follow the browser login steps..."
gh auth login -h github.com -p https -w

echo "Installing Copilot extension..."
gh extension install github/gh-copilot || true

echo -e "${BLUE}NOTE: Copilot might require a separate auth step.${NC}"
echo "Running a test command. If prompted, please authenticate."
gh copilot explain "echo hello" || true

# 2. Google Cloud (Optional)
echo -e "${GREEN}[2/2] Authenticating Google Cloud (Optional)...${NC}"
if command -v gcloud &> /dev/null; then
    gcloud auth login
    gcloud auth application-default login
else
    echo "gcloud CLI not found. Skipping."
    echo "To install: curl https://sdk.cloud.google.com | bash"
fi

echo -e "${BLUE}=== Authentication Complete ===${NC}"
echo "Your credentials are saved in ~/.config/"
echo "The Runner service runs as 'root' or your user depending on setup."
echo "Check that the runner user has access to these credentials."
