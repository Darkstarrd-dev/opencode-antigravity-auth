#!/bin/bash
set -e

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Opencode Raspberry Pi Runner Setup ===${NC}"

# 1. System Updates & Dependencies
echo -e "${GREEN}[1/5] Installing system dependencies...${NC}"
sudo apt-get update
sudo apt-get install -y curl jq git libdigest-sha-perl

# 2. Install Node.js (LTS)
echo -e "${GREEN}[2/5] Installing Node.js (LTS)...${NC}"
if ! command -v node &> /dev/null; then
    curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    echo "Node.js is already installed."
fi

# 3. Install GitHub CLI (gh)
echo -e "${GREEN}[3/5] Installing GitHub CLI...${NC}"
if ! command -v gh &> /dev/null; then
    (type -p wget >/dev/null || (sudo apt update && sudo apt-get install wget -y)) \
    && sudo mkdir -p -m 755 /etc/apt/keyrings \
    && wget -qO- https://cli.github.com/packages/githubcli-archive-keyring.gpg | sudo tee /etc/apt/keyrings/githubcli-archive-keyring.gpg > /dev/null \
    && sudo chmod go+r /etc/apt/keyrings/githubcli-archive-keyring.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/githubcli-archive-keyring.gpg] https://cli.github.com/packages stable main" | sudo tee /etc/apt/sources.list.d/github-cli.list > /dev/null \
    && sudo apt update \
    && sudo apt install gh -y
else
    echo "GitHub CLI is already installed."
fi

# 4. Setup Actions Runner
echo -e "${GREEN}[4/5] Setting up GitHub Actions Runner...${NC}"
mkdir -p actions-runner && cd actions-runner

# Detect architecture
ARCH=$(dpkg --print-architecture)
if [ "$ARCH" == "arm64" ]; then
    RUNNER_ARCH="arm64"
elif [ "$ARCH" == "armhf" ]; then
    RUNNER_ARCH="arm"
else
    RUNNER_ARCH="x64"
fi

echo "Detected architecture: $RUNNER_ARCH"

# Fetch latest runner version
LATEST_VERSION=$(curl -s https://api.github.com/repos/actions/runner/releases/latest | jq -r .tag_name | sed 's/v//')
echo "Downloading runner version $LATEST_VERSION..."

curl -o actions-runner-linux-${RUNNER_ARCH}-${LATEST_VERSION}.tar.gz -L https://github.com/actions/runner/releases/download/v${LATEST_VERSION}/actions-runner-linux-${RUNNER_ARCH}-${LATEST_VERSION}.tar.gz

echo "Extracting..."
tar xzf ./actions-runner-linux-${RUNNER_ARCH}-${LATEST_VERSION}.tar.gz

# 5. Configuration Prompt
echo -e "${BLUE}=== Configuration Needed ===${NC}"
echo "You need your Runner Token from GitHub."
echo "Go to: Settings > Actions > Runners > New self-hosted runner"
echo "Enter your Repo URL and Token below."

read -p "Repository URL (e.g., https://github.com/user/repo): " REPO_URL
read -p "Runner Token: " RUNNER_TOKEN

echo -e "${GREEN}Configuring runner...${NC}"
./config.sh --url "$REPO_URL" --token "$RUNNER_TOKEN" --name "pi-triage-runner" --work "_work" --labels "self-hosted,pi" --unattended --replace

echo -e "${GREEN}Installing service...${NC}"
sudo ./svc.sh install
sudo ./svc.sh start

echo -e "${BLUE}=== Setup Complete! ===${NC}"
echo "Your Pi is now listening for jobs."
