# Raspberry Pi Runner Setup

Use your Raspberry Pi as a persistent, self-hosted runner for Opencode Triage. This enables the use of `gh copilot` and other tools without re-authenticating on every run.

## Prerequisites
- A Raspberry Pi (3, 4, or 5) running Raspberry Pi OS (64-bit recommended) or Ubuntu.
- Internet connection.
- SSH access.

## Step 1: Get your Token
1. Go to your GitHub Repository.
2. Navigate to **Settings** > **Actions** > **Runners**.
3. Click **New self-hosted runner**.
4. Select **Linux** and **ARM64**.
5. Copy the **Token** shown in the "Configure" section (you'll need it in Step 2).

## Step 2: Run the Setup Script
Copy the `scripts/` folder to your Pi (or just copy-paste the content).

```bash
# On your Pi
mkdir -p ~/opencode-setup
cd ~/opencode-setup
# (Copy scripts/setup-pi-runner.sh here)
chmod +x setup-pi-runner.sh
./setup-pi-runner.sh
```

Follow the prompts to enter your Repo URL and Token.

## Step 3: Authenticate Tools
To enable `gh copilot` and other AI tools, run the auth helper:

```bash
# (Copy scripts/auth-pi-tools.sh here)
chmod +x auth-pi-tools.sh
./auth-pi-tools.sh
```
Follow the interactive login flows.

## Step 4: Update Workflow
Once your runner is "Idle" (green) in GitHub Settings, update your `.github/workflows/issue-triage.yml`:

```yaml
runs-on: self-hosted
# or specifically:
# runs-on: [self-hosted, pi]
```
