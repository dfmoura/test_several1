from fastapi import APIRouter

from app.api.routes import admin, contacts, health, metrics, webhook

api_router = APIRouter()
api_router.include_router(health.router, tags=["health"])
api_router.include_router(metrics.router, tags=["metrics"])
api_router.include_router(webhook.router, tags=["webhook"])
api_router.include_router(contacts.router)
api_router.include_router(admin.router)
