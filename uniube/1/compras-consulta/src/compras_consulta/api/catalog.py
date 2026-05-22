"""Catálogo de endpoints a partir do OpenAPI (v3/api-docs)."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from urllib.parse import urlencode

from compras_consulta.config import AUTH_PATH_PREFIXES, OPENAPI_PATH


@dataclass(frozen=True)
class Parameter:
    name: str
    location: str
    required: bool
    description: str
    schema_type: str
    example: str | None


@dataclass(frozen=True)
class Endpoint:
    method: str
    path: str
    summary: str
    description: str
    tags: tuple[str, ...]
    parameters: tuple[Parameter, ...]
    requires_auth: bool
    operation_id: str

    @property
    def id(self) -> str:
        return f"{self.method}:{self.path}"

    @property
    def is_public(self) -> bool:
        return not self.requires_auth

    @property
    def is_safe_read(self) -> bool:
        return self.method == "GET" and self.is_public

    @property
    def tag_label(self) -> str:
        return self.tags[0] if self.tags else "Geral"

    @property
    def module_label(self) -> str:
        """Nome amigável do módulo (ex.: Material, Legado)."""
        tag = self.tag_label
        if " - " in tag:
            return tag.split(" - ", 1)[-1].strip()
        return tag


class ApiCatalog:
    def __init__(self, spec_path: Path | None = None) -> None:
        path = spec_path or OPENAPI_PATH
        with path.open(encoding="utf-8") as f:
            self._spec: dict[str, Any] = json.load(f)
        self._endpoints = self._build_endpoints()

    def _operation_requires_auth(self, path: str, operation: dict[str, Any]) -> bool:
        if any(path.startswith(p) for p in AUTH_PATH_PREFIXES):
            return True
        security = operation.get("security", self._spec.get("security"))
        if security is None:
            return False
        if security == []:
            return False
        return bool(security and any(entry for entry in security if entry))

    def _schema_type(self, schema: dict[str, Any] | None) -> str:
        if not schema:
            return "string"
        if "$ref" in schema:
            return "object"
        return schema.get("type", "string")

    def _parse_parameters(self, operation: dict[str, Any]) -> tuple[Parameter, ...]:
        params: list[Parameter] = []
        for raw in operation.get("parameters", []):
            schema = raw.get("schema") or {}
            example = schema.get("example") or schema.get("default")
            if example is not None:
                example = str(example)
            params.append(
                Parameter(
                    name=raw["name"],
                    location=raw.get("in", "query"),
                    required=bool(raw.get("required", False)),
                    description=(raw.get("description") or "").strip(),
                    schema_type=self._schema_type(schema),
                    example=example,
                )
            )
        return tuple(params)

    def _build_endpoints(self) -> list[Endpoint]:
        endpoints: list[Endpoint] = []
        for path, path_item in self._spec.get("paths", {}).items():
            for method, operation in path_item.items():
                if method not in ("get", "post", "put", "delete", "patch"):
                    continue
                method_u = method.upper()
                endpoints.append(
                    Endpoint(
                        method=method_u,
                        path=path,
                        summary=(operation.get("summary") or "").strip(),
                        description=(operation.get("description") or "").strip(),
                        tags=tuple(operation.get("tags") or ("Geral",)),
                        parameters=self._parse_parameters(operation),
                        requires_auth=self._operation_requires_auth(path, operation),
                        operation_id=operation.get("operationId", ""),
                    )
                )
        endpoints.sort(key=lambda e: (e.tag_label, e.path, e.method))
        return endpoints

    @property
    def base_url(self) -> str:
        servers = self._spec.get("servers") or []
        if servers:
            return servers[0]["url"].rstrip("/")
        return "https://dadosabertos.compras.gov.br"

    @property
    def title(self) -> str:
        return (self._spec.get("info") or {}).get("title", "API Compras.gov.br")

    @property
    def version(self) -> str:
        return (self._spec.get("info") or {}).get("version", "2.0")

    @property
    def all_endpoints(self) -> list[Endpoint]:
        return list(self._endpoints)

    @property
    def public_endpoints(self) -> list[Endpoint]:
        return [e for e in self._endpoints if e.is_public]

    @property
    def public_get_endpoints(self) -> list[Endpoint]:
        return [e for e in self._endpoints if e.is_safe_read]

    def get_by_id(self, endpoint_id: str) -> Endpoint | None:
        for ep in self._endpoints:
            if ep.id == endpoint_id:
                return ep
        return None

    def path_param_names(self, path: str) -> list[str]:
        return re.findall(r"\{([^}]+)\}", path)

    def build_url(
        self,
        endpoint: Endpoint,
        path_values: dict[str, str],
        query_values: dict[str, str] | None = None,
    ) -> str:
        url_path = endpoint.path
        for name in self.path_param_names(endpoint.path):
            if name not in path_values or not str(path_values[name]).strip():
                raise ValueError(f"Parâmetro de caminho obrigatório: {name}")
            url_path = url_path.replace(
                "{" + name + "}", str(path_values[name]).strip()
            )
        base = self.base_url + url_path
        if not query_values:
            return base
        filtered = {
            k: v
            for k, v in query_values.items()
            if v is not None and str(v).strip() != ""
        }
        if not filtered:
            return base
        return f"{base}?{urlencode(filtered)}"
