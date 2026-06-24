#!/usr/bin/env bash
# Grava ssh_command no state enquanto a VM nao existe (Out of host capacity).
# Uso: ./sync-outputs.sh

set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$DIR"

PENDING='(VM ainda nao criada — aguarde ./retry-apply.sh ou rode ./status.sh)'

python3 <<'PY'
import json, subprocess, sys

pending = "(VM ainda nao criada — aguarde ./retry-apply.sh ou rode ./status.sh)"

state = json.loads(subprocess.check_output(["terraform", "state", "pull"], text=True))

has_vm = any(
    r.get("type") == "oci_core_instance" and r.get("name") == "licitacoes_app"
    for r in state.get("resources", [])
)

outputs = state.setdefault("outputs", {})

if has_vm:
    print("VM encontrada no state — atualizando outputs via refresh-only...")
    subprocess.run(["terraform", "apply", "-auto-approve", "-refresh-only"], check=True)
else:
    print("VM ainda nao existe — gravando outputs informativos no state...")
    outputs["ssh_command"] = {"value": pending, "type": "string"}
    outputs["instance_public_ip"] = {"value": None, "type": "dynamic"}
    outputs["instance_ocid"] = {"value": None, "type": "dynamic"}
    state["serial"] = int(state.get("serial", 0)) + 1
    push = subprocess.run(
        ["terraform", "state", "push", "-force", "-"],
        input=json.dumps(state),
        text=True,
        capture_output=True,
    )
    if push.returncode != 0:
        print(push.stderr, file=sys.stderr)
        sys.exit(push.returncode)

print("")
print("ssh_command:")
subprocess.run(["terraform", "output", "-raw", "ssh_command"], check=False)
print("")
PY
