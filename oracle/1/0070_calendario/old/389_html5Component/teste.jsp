<!DOCTYPE html PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">
<%@ page language="java" contentType="text/html; charset=ISO-8859-1" pageEncoding="UTF-8" isELIgnored="false" %>
<%@ page import="java.util.*" %>
<%@ taglib uri="http://java.sun.com/jstl/core_rt" prefix="c" %>
<%@ taglib prefix="snk" uri="/WEB-INF/tld/sankhyaUtil.tld" %>
<%@ taglib prefix="fmt" uri="http://java.sun.com/jsp/jstl/fmt" %>

<html lang="pt-br">

<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Calendário de Agendamentos</title>

<!-- Bootstrap e FullCalendar CSS -->
<link rel="stylesheet" href="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/css/bootstrap.min.css">
<link href="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.9.0/fullcalendar.min.css" rel="stylesheet" />

<!-- JQuery e FullCalendar JS -->
<script src="https://code.jquery.com/jquery-3.5.1.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/moment.js/2.27.0/moment.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.9.0/fullcalendar.min.js"></script>

<!-- Script para o idioma português -->
<script src="https://cdnjs.cloudflare.com/ajax/libs/fullcalendar/3.9.0/locale/pt-br.js"></script>

<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX/jx.min.js"></script>
<script src="jx.min.js"></script> <!-- Produção -->
<script src="https://cdn.jsdelivr.net/gh/wansleynery/SankhyaJX@main/jx.min.js"></script>

<style>
/* Estilos para o modal */
.modal-dialog {
max-width: 500px; /* Tamanho do modal */
}
.modal-content {
padding: 20px;
}

/* Personalize o estilo do calendário se necessário */
#calendar {
max-width: 900px;
margin: 0 auto;
}

/* Estilos para o campo de data */
.datepicker {
width: 100%;
}

/* Formatando o layout da data para dd/mm/yyyy */
input[type="text"] {
text-align: center;
}
</style>
<snk:load />
</head>



<body>
<snk:query var="parametros_1">
SELECT NOMEUSU FROM TSIUSU 
</snk:query>



<!-- Área de mensagens -->
<div id="mensagem" class="alert" style="display:none;"></div>

<!-- Calendário -->
<div class="container mt-5">
<h1 class="text-center">Calendário de Agendamentos</h1>
<div id="calendar"></div>
</div>

<!-- Modal para o formulário -->
<div class="modal fade" id="formModal" tabindex="-1" role="dialog" aria-labelledby="formModalLabel" aria-hidden="true">
<div class="modal-dialog" role="document">
<div class="modal-content">
<div class="modal-header">
<h5 class="modal-title" id="formModalLabel">Detalhes do Agendamento</h5>
<button type="button" class="close" data-dismiss="modal" aria-label="Close">
<span aria-hidden="true">&times;</span>
</button>
</div>
<div class="modal-body">
<form id="formEvento">
<div class="form-group">
<label for="novoProjeto">Projeto</label>
<input type="text" id="novoProjeto" class="form-control" placeholder="Digite o nome do projeto" list="projetos">
<datalist id="projetos"></datalist>
<span id="novoProjetoSpan" style="display: none;">Não encontrado </span>
<a href="#" id="novoProjetoLink" style="display: none;">Cadastrar</a>
</div>
<div class="form-group">
<label for="novoUsuario">Usuário</label>
<input type="text" id="novoUsuario" class="form-control" placeholder="Digite o usuário" list="usuarios">
<datalist id="usuarios"></datalist>
</div>

<div class="form-group">
<label for="novaData">Data</label>
<input type="text" id="novaData" class="form-control" placeholder="dd/mm/yyyy" readonly />
</div>
<button type="button" id="btnSalvar" class="btn btn-primary">Salvar</button>
<button type="button" class="btn btn-secondary" data-dismiss="modal">Cancelar</button>
</form>
</div>
<div class="modal-footer">
<button type="button" id="btnCancelarEvento" class="btn btn-danger">Cancelar Evento</button>
</div>
</div>
</div>
</div>
<snk-form>


</snk-form>


<script>
// Função para gerar cores aleatórias em formato hexadecimal
function randomColor() {
return '#' + Math.floor(Math.random()*16777215).toString(16);
}

// Inicializa o FullCalendar
$(document).ready(function() {
$('#calendar').fullCalendar({
header: {
left: 'prev,next today',
center: 'title',
right: 'month,agendaWeek,agendaDay'
},
locale: 'pt-br', // Define o idioma para português
events: function(start, end, timezone, callback) {
JX.consultar('SELECT CODIGO, PROJETO, USUARIO, DATA FROM AD_AGENDA').then(function(data) {
var events = [];
data.forEach(function(item) {
var eventDate = moment(item.DATA, "DD/MM/YYYY").format("YYYY-MM-DD");

events.push({
title: item.PROJETO,        // Nome do projeto
start: eventDate,           // Data do evento
description: item.USUARIO,  // Usuário responsável
allDay: true,               // Evento de dia inteiro
id: item.CODIGO,            // Certifique-se de que está utilizando CODIGO como identificador
color: randomColor()        // Define uma cor aleatória para o evento
});
});
callback(events); // Passa os eventos para o calendário
}).catch(function (error) {
showMessage('Erro ao carregar os eventos: ' + error, 'alert-danger');
});
},
dayClick: function(date, jsEvent, view) {
// Exibe o formulário no modal ao clicar em uma data
$('#formModal').modal('show'); // Exibe o modal
var formattedDate = formatDateToDDMMYYYY(date); // Formata a data
$('#novaData').val(formattedDate); // Preenche a data formatada no campo
$('#novoProjeto').val(''); // Limpa o campo de nome do projeto
$('#novoUsuario').val(''); // Limpa o campo de usuário
currentEvent = null; // Limpa o evento atual
},
eventClick: function(event, jsEvent, view) {
// Exibe as informações do evento no modal
$('#formModal').modal('show');
$('#novoProjeto').val(event.title);
$('#novoUsuario').val(event.description);
$('#novaData').val(formatDateToDDMMYYYY(event.start));

currentEvent = event; // Armazena o evento clicado, com o CODIGO
}
});
});

// Função para formatar a data no formato dd/mm/yyyy
function formatDateToDDMMYYYY(date) {
var day = ("0" + date.date()).slice(-2);
var month = ("0" + (date.month() + 1)).slice(-2);
var year = date.year();
return day + '/' + month + '/' + year;
}

// Função para exibir mensagens dentro do HTML
function showMessage(message, alertType) {
const messageDiv = document.getElementById('mensagem');
messageDiv.innerHTML = message;
messageDiv.className = 'alert ' + alertType;  // Define o tipo de alerta (success, danger, etc.)
messageDiv.style.display = 'block';           // Exibe o div

// Esconde a mensagem após 5 segundos
setTimeout(function() {
messageDiv.style.display = 'none';
}, 5000);
}

// Salva o novo registro
document.getElementById('btnSalvar').addEventListener('click', function () {
const projeto = document.getElementById('novoProjeto').value;
const usuario = document.getElementById('novoUsuario').value;
const dateSelected = $('#novaData').val();

const dataagend = moment(dateSelected, "DD/MM/YYYY").format("DD/MM/YYYY");

if (projeto.trim() === '' || usuario.trim() === '' || dataagend.trim() === '') {
showMessage('Por favor, insira o nome do projeto, usuário e selecione uma data.', 'alert-danger');
return;
}

// Salva o novo registro na tabela
JX.salvar({ PROJETO: projeto, USUARIO: usuario, DATA: dataagend }, 'AD_AGENDA').then(function () {
showMessage('Evento agendado com sucesso!', 'alert-success');
$('#formModal').modal('hide'); // Oculta o modal
$('#calendar').fullCalendar('refetchEvents'); // Atualiza o calendário com o novo evento
}).catch(function (error) {
showMessage('Erro ao inserir o registro: ' + error, 'alert-danger');
});
});

// Exclui o evento atual
document.getElementById('btnCancelarEvento').addEventListener('click', function () {
if (currentEvent) {
const eventId = currentEvent.id;  // Recupera o CODIGO do evento selecionado

if (eventId) {
JX.deletar('AD_AGENDA', [{ CODIGO: eventId }]).then(function () {
showMessage('Evento cancelado com sucesso!', 'alert-success');
$('#formModal').modal('hide'); // Oculta o modal
$('#calendar').fullCalendar('refetchEvents'); // Atualiza o calendário sem o evento
}).catch(function (error) {
showMessage('Erro ao excluir o evento: ' + error, 'alert-danger');
});
} else {
showMessage('CODIGO do evento não encontrado.', 'alert-warning');
}
} else {
showMessage('Selecione um evento para excluir.', 'alert-warning');
}
});





</script>
<script>

// Busca usuários na tabela TSIUSU
JX.consultar('SELECT NOMEUSU FROM TSIUSU').then(function(data) {
const usuarioList = document.getElementById('usuarios');
data.forEach(function(item) {
const option = document.createElement('option');
option.value = item.NOMEUSU;
usuarioList.appendChild(option);
});
}).catch(function(error) {
showMessage('Erro ao carregar usuários: ' + error, 'alert-danger');
});

// Atualiza a lista de usuários ao digitar
document.getElementById('novoUsuario').addEventListener('input', function() {
const filter = this.value.toUpperCase();
const usuarioList = document.getElementById('usuarios');
const options = usuarioList.getElementsByTagName('option');
for (let i = 0; i < options.length; i++) {
const option = options[i];
if (option.value.toUpperCase().indexOf(filter) > -1) {
option.style.display = '';
} else {
option.style.display = 'none';
}
}
});


//CADASTRO DE PROJETOS

// Busca projetos na tabela AD_PROJETOS
JX.consultar('SELECT PROJETO FROM AD_PROJETOS').then(function(data) {
const projetoList = document.getElementById('projetos');
data.forEach(function(item) {
const option = document.createElement('option');
option.value = item.PROJETO;
projetoList.appendChild(option);
});
}).catch(function(error) {
showMessage('Erro ao carregar projetos: ' + error, 'alert-danger');
});

// Atualiza a lista de projetos ao digitar
document.getElementById('novoProjeto').addEventListener('input', function() {
this.value = this.value.toUpperCase(); // Converter para caixa alta

const filter = this.value;
const projetoList = document.getElementById('projetos');
const options = projetoList.getElementsByTagName('option');

// Mostra/Esconde opções de acordo com o filtro
for (let i = 0; i < options.length; i++) {
const option = options[i];
if (option.value.indexOf(filter) > -1) {
option.style.display = '';
} else {
option.style.display = 'none';
}
}

// Verifica se o projeto está sendo digitado e não está na lista de opções
const exists = Array.from(options).some(option => option.value === filter);

if (this.value !== '' && !exists) {
document.getElementById('novoProjetoSpan').style.display = 'inline';
document.getElementById('novoProjetoLink').style.display = 'inline';
} else {
document.getElementById('novoProjetoSpan').style.display = 'none';
document.getElementById('novoProjetoLink').style.display = 'none';
}
});







// Cadastra novo projeto
document.getElementById('novoProjetoLink').addEventListener('click', function() {
const novoProjetoNome = document.getElementById('novoProjeto').value;
if (confirm(`Para confirmar o cadastro do projeto clique em OK "${novoProjetoNome}"`)) {
JX.consultar(`SELECT CODPROJETO FROM AD_PROJETOS WHERE PROJETO = '${novoProjetoNome}'`).then(function(data) {
if (data.length === 0) {
JX.salvar({ PROJETO: novoProjetoNome.toUpperCase() }, 'AD_PROJETOS').then(function() {
showMessage('Projeto criado com sucesso!', 'alert-success');
// Atualiza a lista de projetos
JX.consultar('SELECT PROJETO FROM AD_PROJETOS').then(function(data) {
const projetoList = document.getElementById('projetos');
projetoList.innerHTML = '';
data.forEach(function(item) {
const option = document.createElement('option');
option.value = item.PROJETO;
projetoList.appendChild(option);
});
// Selecione o novo projeto no campo de projeto
document.getElementById('novoProjeto').value = novoProjetoNome;
document.getElementById('novoProjetoSpan').style.display = 'none';
document.getElementById('novoProjetoLink').style.display = 'none';
});
}).catch(function(error) {
console.log('Erro ao salvar projeto: ' + error);
showMessage('Erro ao salvar projeto: ' + error, 'alert-danger');
});
} else {
showMessage('Projeto já cadastrado!', 'alert-warning');
}
});
}
});




</script>

<!-- Bootstrap JS -->
<script src="https://stackpath.bootstrapcdn.com/bootstrap/4.5.2/js/bootstrap.min.js"></script>

</body>
</html>