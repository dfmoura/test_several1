from fastapi import APIRouter

from ..services import external

router = APIRouter(prefix="/api/external", tags=["apis-publicas"])


@router.get("/cnpj/{cnpj}")
async def cnpj(cnpj: str):
    return await external.lookup_cnpj(cnpj)


@router.get("/cep/{cep}")
async def cep(cep: str):
    return await external.lookup_cep(cep)


@router.get("/ncm")
async def ncm(search: str):
    return await external.search_ncm(search)
