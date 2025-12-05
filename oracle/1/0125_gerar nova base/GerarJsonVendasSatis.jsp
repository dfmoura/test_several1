<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8" %> <%@ page import="java.util.*" %>
<html lang="pt-BR">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Gerar JSON - Vendas SATIS</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>
    <style>
      body {
        background: #f5f7fa;
        min-height: 100vh;
      }
      .card {
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 25px rgba(15, 23, 42, 0.08);
        padding: 24px;
      }
      .btn-primary {
        background: linear-gradient(135deg, #008a70, #00afa0);
        color: #fff;
      }
      .btn-primary:disabled {
        opacity: 0.6;
        cursor: not-allowed;
      }
      .btn-secondary {
        background: #0f172a;
        color: #fff;
      }
      textarea {
        font-family: "Fira Code", "Courier New", monospace;
        font-size: 0.9rem;
        background: #0f172a;
        color: #f8fafc;
        border-radius: 8px;
        padding: 16px;
        min-height: 320px;
        resize: vertical;
      }
    </style>
  </head>
  <body class="flex items-center justify-center p-4">
    <div class="w-full max-w-5xl">
      <div class="mb-6 text-center">
        <h1 class="text-2xl font-bold text-gray-800">
          Gerar JSON da visão `VGF_VENDAS_SATIS`
        </h1>
        <p class="text-gray-600">
          Informe o intervalo de DTNEG e exporte todas as colunas em formato
          JSON.
        </p>
      </div>

      <div class="card space-y-6">
        <form id="filtroForm" class="grid gap-4 md:grid-cols-3">
          <div>
            <label
              for="dataInicial"
              class="block text-sm font-medium text-gray-600"
              >Data inicial (DTNEG)</label
            >
            <input
              type="date"
              id="dataInicial"
              name="dataInicial"
              required
              class="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div>
            <label
              for="dataFinal"
              class="block text-sm font-medium text-gray-600"
              >Data final (DTNEG)</label
            >
            <input
              type="date"
              id="dataFinal"
              name="dataFinal"
              required
              class="mt-1 w-full rounded-md border border-gray-300 p-2 focus:border-teal-500 focus:ring-teal-500"
            />
          </div>
          <div class="flex items-end">
            <button
              type="submit"
              id="gerarBtn"
              class="btn-primary w-full rounded-md py-3 font-semibold shadow"
            >
              Gerar JSON
            </button>
          </div>
        </form>

        <div
          id="alerta"
          class="hidden rounded-md border border-yellow-300 bg-yellow-50 p-4 text-sm text-yellow-900"
        ></div>

        <div
          class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between"
        >
          <p class="text-sm text-gray-500">
            Resultado bruto do `SELECT * FROM VGF_VENDAS_SATIS VGF`.
          </p>
          <button
            id="downloadBtn"
            class="btn-secondary rounded-md px-4 py-2 text-sm font-semibold shadow disabled:opacity-50"
            disabled
          >
            Baixar JSON
          </button>
        </div>

        <textarea
          id="jsonOutput"
          readonly
          placeholder="Nenhum dado carregado ainda..."
        ></textarea>
      </div>
    </div>

    <script>
      let ultimoJson = "";

      document.addEventListener("DOMContentLoaded", () => {
        const hoje = new Date();
        const fim = hoje.toISOString().split("T")[0];
        hoje.setDate(hoje.getDate() - 30);
        const inicio = hoje.toISOString().split("T")[0];

        document.getElementById("dataInicial").value = inicio;
        document.getElementById("dataFinal").value = fim;
      });

      document
        .getElementById("filtroForm")
        .addEventListener("submit", async (event) => {
          event.preventDefault();
          await gerarJson();
        });

      document.getElementById("downloadBtn").addEventListener("click", () => {
        if (!ultimoJson) return;
        const blob = new Blob([ultimoJson], {
          type: "application/json;charset=utf-8",
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        const data = new Date().toISOString().split("T")[0];
        link.download = `vgf_vendas_satis_${data}.json`;
        link.click();
        URL.revokeObjectURL(url);
      });

      function formatarDataSql(valorIso) {
        if (!valorIso) return null;
        const [ano, mes, dia] = valorIso.split("-");
        return `${dia}/${mes}/${ano}`;
      }

      function atualizarMensagem(mensagem, tipo = "info") {
        const alerta = document.getElementById("alerta");
        alerta.textContent = mensagem;
        alerta.classList.remove(
          "hidden",
          "border-yellow-300",
          "bg-yellow-50",
          "text-yellow-900"
        );
        alerta.classList.remove("border-red-300", "bg-red-50", "text-red-900");
        alerta.classList.remove(
          "border-green-300",
          "bg-green-50",
          "text-green-900"
        );

        if (tipo === "erro") {
          alerta.classList.add("border-red-300", "bg-red-50", "text-red-900");
        } else if (tipo === "sucesso") {
          alerta.classList.add(
            "border-green-300",
            "bg-green-50",
            "text-green-900"
          );
        } else {
          alerta.classList.add(
            "border-yellow-300",
            "bg-yellow-50",
            "text-yellow-900"
          );
        }
      }

      async function gerarJson() {
        const btn = document.getElementById("gerarBtn");
        const downloadBtn = document.getElementById("downloadBtn");
        const output = document.getElementById("jsonOutput");

        const dataInicialRaw = document.getElementById("dataInicial").value;
        const dataFinalRaw = document.getElementById("dataFinal").value;

        if (!dataInicialRaw || !dataFinalRaw) {
          atualizarMensagem(
            "Informe as duas datas para realizar a busca.",
            "erro"
          );
          return;
        }

        const dataInicial = formatarDataSql(dataInicialRaw);
        const dataFinal = formatarDataSql(dataFinalRaw);

        const sql = `
          SELECT *
          FROM VGF_VENDAS_SATIS VGF
          WHERE DTNEG BETWEEN TO_DATE('${dataInicial}', 'DD/MM/YYYY')
                         AND TO_DATE('${dataFinal}', 'DD/MM/YYYY')
        `;

        try {
          btn.disabled = true;
          btn.textContent = "Gerando...";
          downloadBtn.disabled = true;
          output.value = "";
          atualizarMensagem("Consultando dados, aguarde...");

          if (typeof JX === "undefined" || !JX.consultar) {
            throw new Error(
              "SankhyaJX não está disponível para executar o SQL."
            );
          }

          // Consulta a visão e transforma o resultado em JSON bonito
          const dados = await JX.consultar(sql);
          ultimoJson = JSON.stringify(dados || [], null, 2);

          output.value = ultimoJson;

          if (!dados || dados.length === 0) {
            atualizarMensagem(
              "Nenhum registro encontrado para o intervalo informado.",
              "info"
            );
            downloadBtn.disabled = true;
          } else {
            atualizarMensagem(
              `Consulta concluída com ${dados.length} registro(s).`,
              "sucesso"
            );
            downloadBtn.disabled = false;
          }
        } catch (erro) {
          console.error("Erro ao gerar JSON:", erro);
          atualizarMensagem(
            `Erro ao gerar JSON: ${
              erro?.message || "verifique os logs e tente novamente."
            }`,
            "erro"
          );
          ultimoJson = "";
          output.value = "";
          downloadBtn.disabled = true;
        } finally {
          btn.disabled = false;
          btn.textContent = "Gerar JSON";
        }
      }
    </script>
  </body>
</html>
