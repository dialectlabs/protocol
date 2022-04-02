# Rust 1.57.0 base
FROM rust:1.57

RUN rustc --version

# Install Solana 1.8.16
RUN sh -c "$(curl -sSfL https://release.solana.com/v1.8.16/install)"
ENV PATH="/root/.local/share/solana/install/releases/1.8.16/solana-release/bin:${PATH}"

RUN solana --version

# Install nodjs & npm
RUN apt update
RUN apt install -y nodejs npm

RUN node --version
RUN npm --version

# Install Anchor CLI
RUN npm install -g @project-serum/anchor-cli@0.18.2

# Copy Anchor project
WORKDIR /home/dialect/
# COPY package files & source
# TODO: DON'T COPY target/deploy/dialect-keypair.json AS THIS IS INSECURE!!!
COPY Anchor.toml Cargo.toml Cargo.lock ./
COPY programs ./programs
# COPY target ./target

# Create deployment keypair
RUN solana-keygen new --no-bip39-passphrase -o /root/.config/solana/id.json

# Build to pre-load BPF
RUN anchor build

CMD ["anchor", "localnet"]
