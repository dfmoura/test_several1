<!DOCTYPE html>
<%@ page language="java" contentType="text/html; charset=UTF-8"
pageEncoding="UTF-8"%> <%@ page import="java.util.*" %> <%@ taglib
uri="http://java.sun.com/jstl/core_rt" prefix="c" %> <%@ taglib prefix="snk"
uri="/WEB-INF/tld/sankhyaUtil.tld" %> <%@ taglib prefix="fmt"
uri="http://java.sun.com/jsp/jstl/fmt" %>
<html lang="pt">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Template Base</title>
    <link
      href="https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css"
      rel="stylesheet"
    />
    <link
      rel="stylesheet"
      href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/5.15.4/css/all.min.css"
    />
    <link
      rel="stylesheet"
      href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css"
    />
    <script src="https://code.jquery.com/jquery-3.5.1.slim.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/@popperjs/core@2.9.2/dist/umd/popper.min.js"></script>
    <script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>
    <!-- Biblioteca SankhyaJX para comunicação com o sistema Sankhya -->
    <script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

    <style>
      /* Estilos para o body */
      body {
        margin: 0;
        padding: 0;
        font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif;
        background-color: #f8f9fa;
        padding-top: 50px !important;
      }

      /* Fixed header styles */
      .fixed-header {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 50px;
        background: linear-gradient(135deg, #008a70, #00695e);
        box-shadow: 0 2px 8px rgba(0, 138, 112, 0.2);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 0 20px;
      }

      .header-logo {
        position: absolute;
        left: 20px;
        display: flex;
        align-items: center;
      }

      .header-logo img {
        width: 35px;
        height: auto;
        filter: brightness(0) invert(1);
        transition: transform 0.3s ease;
      }

      .header-logo img:hover {
        transform: scale(1.1);
      }

      .header-title {
        color: white;
        font-size: 1.5rem;
        font-weight: bold;
        margin: 0;
        text-align: center;
        text-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
      }

      /* Responsividade */
      @media (max-width: 768px) {
        .header-title {
          font-size: 1.2rem;
        }

        .header-logo {
          left: 10px;
        }

        .header-logo img {
          width: 30px;
        }

        .fixed-header {
          height: 45px;
          padding: 0 10px;
        }

        body {
          padding-top: 45px !important;
        }
      }
    </style>
  </head>

  <body class="bg-light">
    <!-- Fixed Header -->
    <div class="fixed-header">
      <div class="header-logo">
        <a
          href="https://neuon.com.br/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <img
            src="https://neuon.com.br/wp-content/uploads/2025/07/Logotipo-16.svg"
            alt="Neuon Logo"
          />
        </a>
      </div>
      <h1 class="header-title">Teste Acionar Botão</h1>
    </div>

    <!-- Container principal -->
    <div class="container mt-5 pt-5">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <h2 class="card-title mb-4 text-center">
                Teste de Execução do Botão de Ação
              </h2>

              <div class="alert alert-info mb-4" role="alert">
                <strong>Informações do teste:</strong><br />
                • IDIPROC: <strong>561</strong><br />
                • Tipo: <strong>JAVA</strong><br />
                • ID Botão: <strong>288</strong><br />
                • Módulo: <strong>IniciarProducaoBT1.java</strong>
              </div>

              <!-- Botão para executar o método JX.acionarBotao -->
              <div class="text-center">
                <button
                  id="btnExecutarAcao"
                  type="button"
                  class="btn btn-primary btn-lg px-5 py-3"
                  onclick="executarAcaoBotao()"
                  style="
                    background: linear-gradient(135deg, #008a70, #00695e);
                    border: none;
                    border-radius: 8px;
                    font-weight: 600;
                    font-size: 1.1rem;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 12px rgba(0, 138, 112, 0.3);
                  "
                  onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 6px 16px rgba(0, 138, 112, 0.4)'"
                  onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 4px 12px rgba(0, 138, 112, 0.3)'"
                >
                  <i class="fas fa-play-circle mr-2"></i>
                  Executar Iniciar Produção
                </button>
              </div>

              <!-- Área de resultado -->
              <div id="resultadoArea" class="mt-4" style="display: none">
                <div class="alert" id="resultadoMensagem" role="alert"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <script>
      /**
       * Função para executar o botão de ação usando SankhyaJX
       * Executa o método JX.acionarBotao para chamar o módulo Java IniciarProducaoBT1
       */
      function executarAcaoBotao() {
        // Verificar se SankhyaJX está disponível
        if (typeof JX === "undefined" || !JX.acionarBotao) {
          mostrarResultado(
            "Erro: Biblioteca SankhyaJX não está disponível. Verifique se a biblioteca foi carregada corretamente.",
            "danger"
          );
          console.error("SankhyaJX não está disponível");
          return;
        }

        // Desabilitar o botão durante a execução
        const btn = document.getElementById("btnExecutarAcao");
        const btnOriginalText = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML =
          '<i class="fas fa-spinner fa-spin mr-2"></i> Executando...';

        // Limpar resultado anterior
        document.getElementById("resultadoArea").style.display = "none";

        // Preparar parâmetros
        const parametros = {
          PARAMETRO_A: "561", // IDIPROC como string (o sistema converte para BigDecimal no Java)
        };

        // Preparar configurações do botão
        const configuracoes = {
          tipo: "JAVA", // Tipo do botão de ação: JS, JAVA ou SQL
          idBotao: 288, // ID do botão de ação configurado no Sankhya
        };

        console.log("Iniciando execução do botão de ação...");
        console.log("Parâmetros:", parametros);
        console.log("Configurações:", configuracoes);

        // Executar o botão de ação usando SankhyaJX
        JX.acionarBotao(parametros, configuracoes)
          .then(function (resultado) {
            console.log("Botão de ação executado com sucesso:", resultado);

            // Reabilitar o botão
            btn.disabled = false;
            btn.innerHTML = btnOriginalText;

            // Mostrar resultado de sucesso
            let mensagemSucesso = "Botão de ação executado com sucesso!\n\n";

            if (resultado && resultado.mensagem) {
              mensagemSucesso += resultado.mensagem;
            } else if (resultado && typeof resultado === "string") {
              mensagemSucesso += resultado;
            } else {
              mensagemSucesso += "IDIPROC: 561\n";
              mensagemSucesso += "Módulo: IniciarProducaoBT1.java\n";
              mensagemSucesso += "Status: Executado com sucesso";
            }

            mostrarResultado(mensagemSucesso, "success");
          })
          .catch(function (erro) {
            console.error("Erro ao executar botão de ação:", erro);

            // Reabilitar o botão
            btn.disabled = false;
            btn.innerHTML = btnOriginalText;

            // Preparar mensagem de erro
            let mensagemErro = "Erro ao executar o botão de ação:\n\n";

            if (erro && erro.message) {
              mensagemErro += erro.message;
            } else if (erro && typeof erro === "string") {
              mensagemErro += erro;
            } else if (erro && erro.toString) {
              mensagemErro += erro.toString();
            } else {
              mensagemErro +=
                "Erro desconhecido. Verifique o console para mais detalhes.";
            }

            mostrarResultado(mensagemErro, "danger");
          });
      }

      /**
       * Função auxiliar para mostrar o resultado da execução
       */
      function mostrarResultado(mensagem, tipo) {
        const resultadoArea = document.getElementById("resultadoArea");
        const resultadoMensagem = document.getElementById("resultadoMensagem");

        resultadoMensagem.className = "alert alert-" + tipo;
        resultadoMensagem.innerHTML = mensagem.replace(/\n/g, "<br>");
        resultadoArea.style.display = "block";

        // Scroll suave para o resultado
        resultadoArea.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }

      // Verificar se SankhyaJX está carregado quando a página carrega
      window.addEventListener("load", function () {
        if (typeof JX === "undefined") {
          console.warn(
            "SankhyaJX ainda não foi carregado. Verifique se a biblioteca está sendo carregada corretamente."
          );
        } else {
          console.log(
            "SankhyaJX carregado com sucesso. Versão disponível:",
            JX
          );
        }
      });
    </script>
  </body>
</html>
