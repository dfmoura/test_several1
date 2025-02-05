// Importe a biblioteca do Supabase corretamente
const { createClient } = supabase;

// Inicialize o cliente Supabase
const supabaseUrl = 'https://db.jdmgcvhcaulyllydvcob.supabase.co'; // Substitua pelo seu URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpkbWdjdmhjYXVseWxseWR2Y29iIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxNTcyOTIsImV4cCI6MjA1MjczMzI5Mn0.fMOtAH7BKFBjDz-wxi4KZidgeIUX26zxyK21YxLZcKA'; // Substitua pela sua chave pública
const supabaseClient = createClient(supabaseUrl, supabaseKey);

// Adicione o evento de submit ao formulário
document.getElementById('insertForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    const nome = document.getElementById('nome').value;

    try {
        // Verifique se o nome foi preenchido
        if (!nome) {
            throw new Error('Por favor, insira um nome.');
        }

        // Obter o último ID
        const { data: lastRecord, error: lastError } = await supabaseClient
            .from('data_test')
            .select('id')
            .order('id', { ascending: false })
            .limit(1);

        if (lastError) {
            throw lastError;
        }

        let newId = 1;
        if (lastRecord && lastRecord.length > 0) {
            newId = lastRecord[0].id + 1;
        }

        // Inserir novo registro
        const { data, error } = await supabaseClient
            .from('data_test')
            .insert([{ id: newId, nome: nome }]);

        if (error) {
            throw error;
        }

        document.getElementById('message').textContent = 'Registro inserido com sucesso!';
        document.getElementById('message').style.color = 'green';
        document.getElementById('insertForm').reset();
    } catch (error) {
        document.getElementById('message').textContent = 'Erro ao inserir registro: ' + error.message;
        document.getElementById('message').style.color = 'red';
        console.error(error); // Exibe o erro no console para depuração
    }
});