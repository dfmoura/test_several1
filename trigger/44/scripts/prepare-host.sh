#!/usr/bin/env bash
# Prepara um Ubuntu (Lightsail/EC2) para hospedar o ZapVia: swap, firewall, Docker.
# Rode como root ou com sudo, uma vez, na máquina vazia.
set -euo pipefail

if [[ "${EUID}" -ne 0 ]]; then
  echo "Rode com sudo: sudo $0" >&2
  exit 1
fi

echo "==> Swap 2G (se ainda não existir)"
if ! swapon --show | grep -q .; then
  if [[ ! -f /swapfile ]]; then
    fallocate -l 2G /swapfile || dd if=/dev/zero of=/swapfile bs=1M count=2048
    chmod 600 /swapfile
    mkswap /swapfile
  fi
  swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
  sysctl vm.swappiness=10 >/dev/null
  grep -q vm.swappiness /etc/sysctl.conf || echo 'vm.swappiness=10' >> /etc/sysctl.conf
  echo "    swap ativo"
else
  echo "    swap já presente — ok"
fi

echo "==> Unattended upgrades"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y unattended-upgrades ufw fail2ban
dpkg-reconfigure -f noninteractive unattended-upgrades >/dev/null 2>&1 || true

echo "==> Firewall UFW (22, 80, 443)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "==> Docker"
if ! command -v docker >/dev/null 2>&1; then
  apt-get install -y ca-certificates curl
  install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
  chmod 0644 /etc/apt/keyrings/docker.asc
  # shellcheck disable=SC1091
  . /etc/os-release
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
    > /etc/apt/sources.list.d/docker.list
  apt-get update -y
  apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
fi
systemctl enable --now docker

if id ubuntu >/dev/null 2>&1; then
  usermod -aG docker ubuntu || true
fi

echo
echo "Host pronto. Firewall Lightsail: libere 22 (seu IP), 80 e 443. Resto fechado."
echo "Depois, como usuário normal:"
echo "  ./scripts/new-prod-env.sh zap.seudominio.com voce@seudominio.com"
echo "  ./scripts/up-production.sh"
