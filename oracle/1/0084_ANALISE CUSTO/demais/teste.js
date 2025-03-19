var query = getQuery();
query.nativeSelect("SELECT 'teste novo' AS a FROM dual");


if (query.next()) {
    var message = query.getString("a"); 
    var nunota = getParam("NUNOTA"); 

    mensagem = message + " - Nota: " + nunota;
}