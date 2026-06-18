from __future__ import annotations

import json
import time
import traceback
from datetime import datetime

from app.collector import LicitacoesCollector
from app.config import EMPRESAS, settings
from app.portal import PortalBlockedError, PortalError
from app.repository import SessionLocal, SyncJob, claim_pending_job, upsert_record


def process_job(job_id: int) -> None:
    session = SessionLocal()
    job = session.get(SyncJob, job_id)
    if not job:
        session.close()
        return

    logs: list[str] = []

    def on_progress(msg: str) -> None:
        logs.append(msg)
        print(msg, flush=True)

    try:
        anos = json.loads(job.anos or "[2026]")
        empresas = json.loads(job.empresas) if job.empresas else list(EMPRESAS.keys())

        collector = LicitacoesCollector(on_progress=on_progress)
        records = collector.collect(
            anos=anos,
            empresas=empresas,
            coletar_detalhes=job.coletar_detalhes,
        )

        novos = atualizados = detalhes = 0
        for record in records:
            result = upsert_record(session, record)
            if result == "new":
                novos += 1
            else:
                atualizados += 1
            if record.detalhe_coletado:
                detalhes += 1

        job.status = "ok"
        job.total_coletados = len(records)
        job.novos = novos
        job.atualizados = atualizados
        job.detalhes_coletados = detalhes
        job.mensagem = f"Coleta concluída: {len(records)} registros"
        job.log = "\n".join(logs)
        job.finalizado_em = datetime.utcnow()
        session.commit()
    except PortalBlockedError as exc:
        job.status = "error"
        job.mensagem = str(exc)
    except PortalError as exc:
        job.status = "error"
        job.mensagem = str(exc)
    except Exception as exc:
        job.status = "error"
        job.mensagem = str(exc)
        job.log = "\n".join(logs) + "\n" + traceback.format_exc()
        job.finalizado_em = datetime.utcnow()
        session.commit()
        print(f"Erro no job {job_id}: {exc}", flush=True)
    finally:
        session.close()


def run_loop() -> None:
    print("Worker iniciado — aguardando jobs de sincronização…", flush=True)
    while True:
        session = SessionLocal()
        try:
            job = claim_pending_job(session)
            if job:
                session.close()
                print(f"Processando job #{job.id}", flush=True)
                process_job(job.id)
            else:
                session.close()
                time.sleep(settings.scraper_poll_interval_sec)
        except Exception as exc:
            session.close()
            print(f"Erro no loop: {exc}", flush=True)
            time.sleep(settings.scraper_poll_interval_sec)


if __name__ == "__main__":
    run_loop()
