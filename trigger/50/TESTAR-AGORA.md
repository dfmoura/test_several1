# Pronto para testar — Responsável único (nome + Assumir)

## Abrir agora

**http://localhost:8097/**

| Papel | Usuário | Senha |
|-------|---------|-------|
| Admin | `admin` | `admin123` |
| Consulta | `consulta` | `consulta1` |

**Ctrl+F5** (obrigatório · cache `osb50-90`).  
Se pedir sessão ativa → **Encerrar sessão anterior e entrar**.

Health: http://localhost:8097/api/health → `"status":"ok"`

---

## Checklist — responsável único

### Visão filial · Compras.gov
1. Abrir contratação **sem** responsável → botão **Assumir**.
2. Após assumir: pill **Eu**, meta/campo **Responsável: Você**.
3. Com outro usuário na mesma filial:
   - Grade mostra pill com o **username** (não só “monitorada”).
   - Modal: **Responsável: nome**.
   - **Assumir** pede confirmação e transfere (só 1 responsável).
4. **Deixar de acompanhar** só para quem é o responsável.

### Propostas abertas
1. Pill **Eu** / username do responsável na grade.

### Início
1. KPI **Responsável · Com · sem** continua coerente com a cobertura.

### Regressão
- Filtros Com/Sem responsável e Que eu acompanho.
- Território / Associar município intacto.

---

## Health

http://localhost:8097/api/health
