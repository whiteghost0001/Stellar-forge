#!/bin/bash

# Setup Stellar CLI environment
# This script installs Rust, Stellar CLI, and configures the environment

set -e

echo "Setting up Stellar CLI environment..."

# Install Rust if not present
if ! command -v rustc &> /dev/null; then
    echo "Installing Rust..."
    curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh -s -- -y
    source "$HOME/.cargo/env"
fi

# Add wasm32 target
rustup target add wasm32-unknown-unknown

# Install Stellar CLI (replaces the old soroban-cli crate)
if ! command -v stellar &> /dev/null; then
    echo "Installing Stellar CLI..."
    cargo install stellar-cli --features opt
fi

# Verify stellar CLI is available
if ! command -v stellar &> /dev/null; then
    echo "ERROR: stellar CLI installation failed. Please install manually:"
    echo "  cargo install stellar-cli --features opt"
    exit 1
fi
echo "stellar CLI version: $(stellar --version)"

# Configure testnet
stellar network add testnet \
  --rpc-url https://soroban-testnet.stellar.org \
  --network-passphrase "Test SDF Network ; September 2015"

echo "Stellar CLI environment setup complete!"
echo "You can now build and deploy contracts."
