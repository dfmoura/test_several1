


utilização da tsiata para seguir com anexo das listas de requisição
preparação do jar para pegar o NUNOTA do cabeçalho da requisição, e mostrar em tela.
criar botão de ação na tgfite para executar este primeiro jar que mostra o nunota capturado.
continuando na atulização do jar, para tratrar o csv salvo no anexo de documentos do portal,
colocado no select que vai filtrar o documento anexado na tabela tsiata pelo nome 'lista', e 
para teste apresentado as informações tratadas no csv em tela.
continuando a atualização no jar, o csv contempla 3 colunas que sao tratada, a terceira coluna foi tratado
o valor substinuindo o decimal de . por ,
criamos uma tabela adincional contendo os campos codigo,perfil,material,qtdneg,nunota. No jar continuamos a atualização
no codigo para pegar as informações do csv tratado para incluir no nesta nova tabela adicional.
continuando nesta tabela adicional incluimos o campo codprod. No jar continuamos a atualização do codigo para que com os valores 
armazenados para os campo 'PERFIL' e 'MATERIAL', efeutemos uma pesquisa na tabela 'TGFPRO' com os campos 'AD_PERFIL' e 'AD_MATERIAL' 
obtendo o retorno do valor de 'CODPROD' para cada campo junto com o insert de modo que o valor nao encontrar retorne 0


efetuar uma verificação se caso nao encontre um codprod para na correlação de 'PERFIL' e 'MATERIAL' com 'AD_PERFIL' e 'AD_MATERIAL',
interrompa o processo e demonstra que 'PERFIL' e 'MATERIAL' não esta(ão) associados a um produto no cadastro de produtos.
mostrar em mensagem todas correlações nao encontradas, com o valor de perfil e material.


salva
