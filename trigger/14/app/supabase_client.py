from typing import Any

import httpx


class SupabaseClient:
    def __init__(self, url: str, service_role_key: str):
        self.base_url = url.rstrip("/")
        self.headers = {
            "apikey": service_role_key,
            "Authorization": f"Bearer {service_role_key}",
            "Content-Type": "application/json",
        }

    def _rest_url(self, table: str) -> str:
        return f"{self.base_url}/rest/v1/{table}"

    async def get_openapi(self) -> dict[str, Any]:
        headers = {**self.headers, "Accept": "application/openapi+json"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(f"{self.base_url}/rest/v1/", headers=headers)
            response.raise_for_status()
            return response.json()

    async def list_rows(
        self,
        table: str,
        limit: int = 50,
        offset: int = 0,
        order: str | None = None,
    ) -> list[dict[str, Any]]:
        params: dict[str, str] = {"select": "*", "limit": str(limit), "offset": str(offset)}
        if order:
            params["order"] = order
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.get(self._rest_url(table), headers=self.headers, params=params)
            response.raise_for_status()
            return response.json()

    async def count_rows(self, table: str) -> int:
        headers = {**self.headers, "Prefer": "count=exact"}
        params = {"select": "*", "limit": "1"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.head(self._rest_url(table), headers=headers, params=params)
            response.raise_for_status()
            content_range = response.headers.get("content-range", "")
            if "/" in content_range:
                total = content_range.split("/")[-1]
                if total.isdigit():
                    return int(total)
            return 0

    async def create_row(self, table: str, data: dict[str, Any]) -> list[dict[str, Any]]:
        headers = {**self.headers, "Prefer": "return=representation"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.post(self._rest_url(table), headers=headers, json=data)
            response.raise_for_status()
            return response.json()

    async def update_row(
        self,
        table: str,
        pk_column: str,
        row_id: str,
        data: dict[str, Any],
    ) -> list[dict[str, Any]]:
        headers = {**self.headers, "Prefer": "return=representation"}
        params = {pk_column: f"eq.{row_id}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.patch(self._rest_url(table), headers=headers, params=params, json=data)
            response.raise_for_status()
            return response.json()

    async def delete_row(self, table: str, pk_column: str, row_id: str) -> None:
        params = {pk_column: f"eq.{row_id}"}
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.delete(self._rest_url(table), headers=self.headers, params=params)
            response.raise_for_status()

    async def test_connection(self) -> bool:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.get(f"{self.base_url}/rest/v1/", headers=self.headers)
            return response.status_code < 500
