define("TelaTeste.controller", [], function () {
  "use strict";

  /**
   * Controlador básico da tela de teste, responsável por inicializar o modelo
   * e tratar o evento do botão de saudação.
   */
  return {
    onCreateView: function ($scope) {
      // Modelo simples utilizado para armazenar o nome informado e a mensagem exibida.
      const vm = ($scope.viewModel = {
        nome: "",
        mensagem:
          'Informe seu nome e clique em "Saudar" para visualizar a mensagem.',
      });

      /**
       * Evento associado ao botão principal da tela. Atualiza a mensagem com o nome informado.
       */
      $scope.onSaudar = function () {
        const saudacao =
          vm.nome && vm.nome.trim().length > 0 ? vm.nome.trim() : "Sankhya";
        vm.mensagem =
          "Olá, " +
          saudacao +
          "! Seja bem-vindo ao exemplo do Sankhya Generator.";
      };
    },
  };
});
