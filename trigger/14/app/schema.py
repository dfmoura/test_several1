import re
from dataclasses import dataclass
from datetime import datetime, timezone
from typing import Any, Literal

ATIVADA_EM_FORMAT = "AAAA-MM-DDTHH:MM:SS.mmm+00:00"
ATIVADA_EM_EXAMPLE = "2026-06-09T01:04:52.836+00:00"
DEFAULT_PLANO = "mensal"
LICENSE_AUTO_ON_CREATE = frozenset(
    {"license_key", "implantacao_paga", "ativa", "valido_ate", "plano"}
)
PAGADOR_COLUMNS = frozenset(
    {
        "pagador_nome",
        "pagador_endereco",
        "pagador_cidade",
        "pagador_uf",
        "pagador_cep",
    }
)
PAGADOR_MIGRATION = "migrations/20260609100000_license_pagador.sql"


def supabase_error_hint(response_text: str) -> str | None:
    if "PGRST204" not in response_text:
        return None
    if any(col in response_text for col in PAGADOR_COLUMNS):
        return (
            f"Colunas de pagador ausentes em licenses. Execute no Supabase SQL Editor: "
            f"{PAGADOR_MIGRATION}"
        )
    return "Coluna ausente no Supabase. Verifique se todas as migrations foram aplicadas."

UUID_RE = re.compile(
    r"^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$",
    re.IGNORECASE,
)

READONLY_ON_CREATE = {"created_at", "updated_at", "deleted_at"}
READONLY_ON_UPDATE = {"id", "created_at"}


@dataclass
class ColumnSchema:
    name: str
    type: str
    format: str
    required: bool
    read_only: bool
    description: str = ""

    @property
    def input_type(self) -> str:
        if self.name == "ativada_em":
            return "datetime_offset"
        fmt = self.format.lower()
        if self.type == "boolean":
            return "boolean"
        if fmt in {"integer", "bigint", "smallint"} or self.type == "integer":
            return "integer"
        if fmt in {"numeric", "real", "double precision", "double"} or self.type == "number":
            return "number"
        if fmt == "date":
            return "date"
        if "timestamp" in fmt:
            return "datetime"
        if fmt in {"json", "jsonb"}:
            return "json"
        if fmt == "uuid":
            return "uuid"
        return "text"


@dataclass
class TableSchema:
    name: str
    columns: list[ColumnSchema]
    primary_key: str

    def editable_columns(self, mode: Literal["create", "update"]) -> list[ColumnSchema]:
        if mode == "create":
            return [
                c
                for c in self.columns
                if c.name not in READONLY_ON_CREATE and not (c.read_only and c.name == "id")
            ]
        return [c for c in self.columns if c.name not in READONLY_ON_UPDATE]

    def to_dict(self) -> dict[str, Any]:
        return {
            "name": self.name,
            "primary_key": self.primary_key,
            "columns": [
                {
                    "name": c.name,
                    "type": c.type,
                    "format": c.format,
                    "required": c.required,
                    "read_only": c.read_only,
                    "input_type": c.input_type,
                    "description": c.description,
                    "format_pattern": ATIVADA_EM_EXAMPLE if c.name == "ativada_em" else "",
                }
                for c in self.columns
            ],
        }


def schema_column_names(schema: TableSchema) -> set[str]:
    return {c.name for c in schema.columns}


def filter_to_schema(data: dict[str, Any], schema: TableSchema) -> dict[str, Any]:
    allowed = schema_column_names(schema)
    return {key: value for key, value in data.items() if key in allowed}


def schema_has_pagador_columns(schema: TableSchema) -> bool:
    return PAGADOR_COLUMNS.issubset(schema_column_names(schema))


class ValidationError(Exception):
    def __init__(self, errors: list[str]):
        self.errors = errors
        super().__init__("; ".join(errors))


def _find_definition(openapi: dict[str, Any], table: str) -> dict[str, Any] | None:
    definitions = openapi.get("definitions") or openapi.get("components", {}).get("schemas", {})
    for key, value in definitions.items():
        if key.lower() == table.lower():
            return value
    return None


def _detect_primary_key(table: str, properties: dict[str, Any]) -> str:
    if "id" in properties:
        return "id"
    for name, meta in properties.items():
        fmt = (meta.get("format") or "").lower()
        if fmt == "uuid" and name.endswith("_id"):
            return name
    for name in properties:
        if name.endswith("_id"):
            return name
    return "id"


def _is_read_only(name: str, meta: dict[str, Any]) -> bool:
    if name in READONLY_ON_CREATE:
        return True
    desc = (meta.get("description") or "").lower()
    if "primary key" in desc or "identity" in desc:
        return name == "id" or name.endswith("_id")
    fmt = (meta.get("format") or "").lower()
    if name == "id" and fmt in {"integer", "bigint", "uuid"}:
        return True
    return False


def parse_table_schema(openapi: dict[str, Any], table: str) -> TableSchema:
    definition = _find_definition(openapi, table)
    if not definition:
        raise ValueError(f"Tabela '{table}' não encontrada no schema do Supabase.")

    properties = definition.get("properties", {})
    required = set(definition.get("required", []))
    columns: list[ColumnSchema] = []

    for name, meta in properties.items():
        columns.append(
            ColumnSchema(
                name=name,
                type=meta.get("type", "string"),
                format=meta.get("format", ""),
                required=name in required,
                read_only=_is_read_only(name, meta),
                description=meta.get("description") or "",
            )
        )

    return TableSchema(
        name=table,
        columns=columns,
        primary_key=_detect_primary_key(table, properties),
    )


def list_tables(openapi: dict[str, Any]) -> list[str]:
    paths = openapi.get("paths", {})
    tables = []
    for path in paths:
        name = path.strip("/").split("/")[0]
        if name and name not in tables and not name.startswith("rpc/"):
            tables.append(name)
    definitions = openapi.get("definitions") or openapi.get("components", {}).get("schemas", {})
    for name in definitions:
        if name not in tables:
            tables.append(name)
    return sorted(set(tables))


def _empty_allowed(col: ColumnSchema) -> bool:
    return not col.required


def now_ativada_em() -> str:
    now = datetime.now(timezone.utc)
    ms = now.microsecond // 1000
    return now.strftime(f"%Y-%m-%dT%H:%M:%S.{ms:03d}+00:00")


def _parse_ativada_em(raw: Any) -> str:
    if isinstance(raw, datetime):
        dt = raw.astimezone(timezone.utc)
    else:
        value = str(raw).strip().replace(" ", "T")
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        try:
            dt = datetime.fromisoformat(value)
        except ValueError as exc:
            raise ValueError(
                f"'ativada_em' deve estar no formato {ATIVADA_EM_EXAMPLE}."
            ) from exc
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        else:
            dt = dt.astimezone(timezone.utc)
    ms = dt.microsecond // 1000
    return dt.strftime(f"%Y-%m-%dT%H:%M:%S.{ms:03d}+00:00")


def _parse_value(col: ColumnSchema, raw: Any) -> Any:
    if raw is None or raw == "":
        if _empty_allowed(col):
            return None
        raise ValueError(f"'{col.name}' é obrigatório.")

    input_type = col.input_type

    if input_type == "boolean":
        if isinstance(raw, bool):
            return raw
        if isinstance(raw, str):
            lowered = raw.strip().lower()
            if lowered in {"true", "1", "sim", "yes"}:
                return True
            if lowered in {"false", "0", "nao", "não", "no"}:
                return False
        raise ValueError(f"'{col.name}' deve ser verdadeiro ou falso.")

    if input_type == "integer":
        try:
            return int(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"'{col.name}' deve ser um número inteiro.") from exc

    if input_type == "number":
        try:
            return float(raw)
        except (TypeError, ValueError) as exc:
            raise ValueError(f"'{col.name}' deve ser um número.") from exc

    if input_type == "date":
        value = str(raw).strip()
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", value):
            raise ValueError(f"'{col.name}' deve estar no formato AAAA-MM-DD.")
        return value

    if input_type == "datetime_offset" or col.name == "ativada_em":
        return _parse_ativada_em(raw)

    if input_type == "datetime":
        value = str(raw).strip().replace(" ", "T")
        if value.endswith("Z"):
            value = value[:-1]
        if len(value) == 16:
            value += ":00"
        return value

    if input_type == "uuid":
        value = str(raw).strip()
        if not UUID_RE.match(value):
            raise ValueError(f"'{col.name}' deve ser um UUID válido.")
        return value

    if input_type == "json":
        if isinstance(raw, (dict, list)):
            return raw
        try:
            import json

            return json.loads(str(raw))
        except Exception as exc:
            raise ValueError(f"'{col.name}' deve ser um JSON válido.") from exc

    return str(raw).strip()


def validate_row(
    schema: TableSchema,
    data: dict[str, Any],
    mode: Literal["create", "update"],
) -> dict[str, Any]:
    errors: list[str] = []
    allowed = {c.name: c for c in schema.editable_columns(mode)}
    cleaned: dict[str, Any] = {}

    for key in data:
        if key not in allowed:
            errors.append(f"Campo '{key}' não pode ser alterado nesta operação.")
            continue
        col = allowed[key]
        if col.read_only and mode == "update" and key in READONLY_ON_UPDATE:
            continue
        try:
            value = _parse_value(col, data[key])
            if value is not None:
                cleaned[key] = value
        except ValueError as exc:
            errors.append(str(exc))

    if mode == "create":
        is_licenses = schema.name.lower() == "licenses"
        # ativada_em só deve ser preenchido quando o app chama license-activate.
        if not is_licenses:
            if "ativada_em" in allowed and "ativada_em" not in cleaned:
                cleaned["ativada_em"] = now_ativada_em()
        if "plano" in allowed and "plano" not in cleaned:
            cleaned["plano"] = DEFAULT_PLANO
        if is_licenses:
            from app.license_helpers import apply_license_create_defaults

            cleaned = apply_license_create_defaults(cleaned)
        for col in schema.columns:
            if col.required and col.name in allowed and col.name not in cleaned:
                if is_licenses and col.name in LICENSE_AUTO_ON_CREATE:
                    continue
                errors.append(f"'{col.name}' é obrigatório.")

    if errors:
        raise ValidationError(errors)

    return cleaned
