-- Script de criação do banco de dados para o Sistema de Solicitações
-- Execute este script no PostgreSQL para configurar o banco

-- Criar banco de dados
-- CREATE DATABASE sistema_solicitacoes;

-- Conectar ao banco criado
-- \c sistema_solicitacoes;

-- Criar tabela de empresas
CREATE TABLE empresas (
    id SERIAL PRIMARY KEY,
    nome VARCHAR(255) NOT NULL,
    cnpj VARCHAR(18) UNIQUE NOT NULL,
    email VARCHAR(255) NOT NULL,
    telefone VARCHAR(20) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de usuários
CREATE TABLE usuarios (
    id SERIAL PRIMARY KEY,
    empresa_id INTEGER REFERENCES empresas(id) ON DELETE CASCADE,
    nome VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    login VARCHAR(50) UNIQUE NOT NULL,
    senha VARCHAR(255) NOT NULL,
    tipo VARCHAR(20) NOT NULL CHECK (tipo IN ('solicitante', 'executante')),
    ativo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de solicitações
CREATE TABLE solicitacoes (
    id SERIAL PRIMARY KEY,
    titulo VARCHAR(255) NOT NULL,
    descricao TEXT NOT NULL,
    prioridade VARCHAR(20) NOT NULL CHECK (prioridade IN ('baixa', 'media', 'alta', 'urgente')),
    area VARCHAR(100) NOT NULL,
    solicitante_id INTEGER REFERENCES usuarios(id) ON DELETE CASCADE,
    executante_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_aprovacao TIMESTAMP,
    data_inicio_execucao TIMESTAMP,
    data_conclusao TIMESTAMP,
    status VARCHAR(20) DEFAULT 'pendente' CHECK (status IN ('pendente', 'aprovada', 'rejeitada', 'em-execucao', 'concluida')),
    custo DECIMAL(10,2),
    prazo INTEGER,
    observacoes TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar tabela de histórico de alterações
CREATE TABLE historico_solicitacoes (
    id SERIAL PRIMARY KEY,
    solicitacao_id INTEGER REFERENCES solicitacoes(id) ON DELETE CASCADE,
    usuario_id INTEGER REFERENCES usuarios(id) ON DELETE SET NULL,
    acao VARCHAR(50) NOT NULL,
    descricao TEXT,
    dados_anteriores JSONB,
    dados_novos JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Criar índices para melhor performance
CREATE INDEX idx_usuarios_empresa ON usuarios(empresa_id);
CREATE INDEX idx_usuarios_tipo ON usuarios(tipo);
CREATE INDEX idx_solicitacoes_solicitante ON solicitacoes(solicitante_id);
CREATE INDEX idx_solicitacoes_executante ON solicitacoes(executante_id);
CREATE INDEX idx_solicitacoes_status ON solicitacoes(status);
CREATE INDEX idx_solicitacoes_prioridade ON solicitacoes(prioridade);
CREATE INDEX idx_historico_solicitacao ON historico_solicitacoes(solicitacao_id);

-- Criar função para atualizar timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_empresas_updated_at BEFORE UPDATE ON empresas FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_usuarios_updated_at BEFORE UPDATE ON usuarios FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_solicitacoes_updated_at BEFORE UPDATE ON solicitacoes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Inserir dados de exemplo
INSERT INTO empresas (nome, cnpj, email, telefone) VALUES
('Empresa A', '12.345.678/0001-90', 'contato@empresaa.com', '(11) 1234-5678'),
('Empresa B', '98.765.432/0001-10', 'contato@empresab.com', '(11) 8765-4321'),
('Tech Solutions', '11.222.333/0001-44', 'contato@techsolutions.com', '(11) 9999-8888');

INSERT INTO usuarios (empresa_id, nome, email, login, senha, tipo) VALUES
(1, 'João Silva', 'joao@empresaa.com', 'joao', '123456', 'solicitante'),
(1, 'Maria Santos', 'maria@empresaa.com', 'maria', '123456', 'executante'),
(2, 'Pedro Costa', 'pedro@empresab.com', 'pedro', '123456', 'solicitante'),
(2, 'Ana Oliveira', 'ana@empresab.com', 'ana', '123456', 'executante'),
(3, 'Carlos Lima', 'carlos@techsolutions.com', 'carlos', '123456', 'solicitante'),
(3, 'Fernanda Rocha', 'fernanda@techsolutions.com', 'fernanda', '123456', 'executante');

INSERT INTO solicitacoes (titulo, descricao, prioridade, area, solicitante_id, status) VALUES
('Sistema de Gestão de Vendas', 'Desenvolvimento de um sistema completo para gestão de vendas com relatórios e dashboards.', 'alta', 'Vendas', 1, 'pendente'),
('App Mobile para Clientes', 'Criação de aplicativo mobile para clientes acessarem seus dados e fazerem pedidos.', 'urgente', 'TI', 3, 'aprovada'),
('Portal de E-commerce', 'Desenvolvimento de portal completo de e-commerce com integração de pagamentos.', 'media', 'Comércio', 5, 'pendente');

-- Atualizar solicitação aprovada com custo e prazo
UPDATE solicitacoes SET 
    custo = 15000.00,
    prazo = 45,
    data_aprovacao = CURRENT_TIMESTAMP
WHERE id = 2;

-- Criar views úteis
CREATE VIEW vw_solicitacoes_completas AS
SELECT 
    s.id,
    s.titulo,
    s.descricao,
    s.prioridade,
    s.area,
    s.status,
    s.custo,
    s.prazo,
    s.data_criacao,
    s.data_aprovacao,
    s.data_inicio_execucao,
    s.data_conclusao,
    e.nome as empresa_nome,
    u_sol.nome as solicitante_nome,
    u_sol.email as solicitante_email,
    u_exe.nome as executante_nome,
    u_exe.email as executante_email
FROM solicitacoes s
JOIN usuarios u_sol ON s.solicitante_id = u_sol.id
JOIN empresas e ON u_sol.empresa_id = e.id
LEFT JOIN usuarios u_exe ON s.executante_id = u_exe.id;

CREATE VIEW vw_solicitacoes_por_status AS
SELECT 
    status,
    COUNT(*) as quantidade,
    AVG(custo) as custo_medio,
    AVG(prazo) as prazo_medio
FROM solicitacoes
GROUP BY status;

-- Criar função para calcular estatísticas
CREATE OR REPLACE FUNCTION get_estatisticas_solicitacoes()
RETURNS TABLE (
    total_solicitacoes INTEGER,
    solicitacoes_pendentes INTEGER,
    solicitacoes_aprovadas INTEGER,
    solicitacoes_em_execucao INTEGER,
    solicitacoes_concluidas INTEGER,
    custo_total DECIMAL,
    prazo_medio DECIMAL
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(*)::INTEGER as total_solicitacoes,
        COUNT(CASE WHEN status = 'pendente' THEN 1 END)::INTEGER as solicitacoes_pendentes,
        COUNT(CASE WHEN status = 'aprovada' THEN 1 END)::INTEGER as solicitacoes_aprovadas,
        COUNT(CASE WHEN status = 'em-execucao' THEN 1 END)::INTEGER as solicitacoes_em_execucao,
        COUNT(CASE WHEN status = 'concluida' THEN 1 END)::INTEGER as solicitacoes_concluidas,
        COALESCE(SUM(custo), 0) as custo_total,
        COALESCE(AVG(prazo), 0) as prazo_medio
    FROM solicitacoes;
END;
$$ LANGUAGE plpgsql;

-- Criar função para buscar solicitações por usuário
CREATE OR REPLACE FUNCTION get_solicitacoes_usuario(p_usuario_id INTEGER)
RETURNS TABLE (
    id INTEGER,
    titulo VARCHAR(255),
    descricao TEXT,
    prioridade VARCHAR(20),
    area VARCHAR(100),
    status VARCHAR(20),
    custo DECIMAL(10,2),
    prazo INTEGER,
    data_criacao TIMESTAMP
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id,
        s.titulo,
        s.descricao,
        s.prioridade,
        s.area,
        s.status,
        s.custo,
        s.prazo,
        s.data_criacao
    FROM solicitacoes s
    WHERE s.solicitante_id = p_usuario_id OR s.executante_id = p_usuario_id
    ORDER BY s.data_criacao DESC;
END;
$$ LANGUAGE plpgsql;

-- Criar função para aprovar solicitação
CREATE OR REPLACE FUNCTION aprovar_solicitacao(
    p_solicitacao_id INTEGER,
    p_usuario_id INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_solicitacao solicitacoes%ROWTYPE;
BEGIN
    -- Buscar a solicitação
    SELECT * INTO v_solicitacao 
    FROM solicitacoes 
    WHERE id = p_solicitacao_id;
    
    -- Verificar se a solicitação existe e está pendente
    IF v_solicitacao.id IS NULL THEN
        RAISE EXCEPTION 'Solicitação não encontrada';
    END IF;
    
    IF v_solicitacao.status != 'pendente' THEN
        RAISE EXCEPTION 'Solicitação não está pendente';
    END IF;
    
    -- Verificar se o usuário é o solicitante
    IF v_solicitacao.solicitante_id != p_usuario_id THEN
        RAISE EXCEPTION 'Usuário não autorizado para aprovar esta solicitação';
    END IF;
    
    -- Aprovar a solicitação
    UPDATE solicitacoes 
    SET 
        status = 'aprovada',
        data_aprovacao = CURRENT_TIMESTAMP,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_solicitacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_solicitacoes (solicitacao_id, usuario_id, acao, descricao)
    VALUES (p_solicitacao_id, p_usuario_id, 'APROVACAO', 'Solicitação aprovada pelo solicitante');
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Criar função para definir custo e prazo
CREATE OR REPLACE FUNCTION definir_custo_prazo(
    p_solicitacao_id INTEGER,
    p_executante_id INTEGER,
    p_custo DECIMAL(10,2),
    p_prazo INTEGER
)
RETURNS BOOLEAN AS $$
DECLARE
    v_solicitacao solicitacoes%ROWTYPE;
BEGIN
    -- Buscar a solicitação
    SELECT * INTO v_solicitacao 
    FROM solicitacoes 
    WHERE id = p_solicitacao_id;
    
    -- Verificar se a solicitação existe e está pendente
    IF v_solicitacao.id IS NULL THEN
        RAISE EXCEPTION 'Solicitação não encontrada';
    END IF;
    
    IF v_solicitacao.status != 'pendente' THEN
        RAISE EXCEPTION 'Solicitação não está pendente';
    END IF;
    
    -- Verificar se o usuário é executante
    IF NOT EXISTS (SELECT 1 FROM usuarios WHERE id = p_executante_id AND tipo = 'executante') THEN
        RAISE EXCEPTION 'Usuário não é executante';
    END IF;
    
    -- Definir custo e prazo
    UPDATE solicitacoes 
    SET 
        custo = p_custo,
        prazo = p_prazo,
        executante_id = p_executante_id,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = p_solicitacao_id;
    
    -- Registrar no histórico
    INSERT INTO historico_solicitacoes (solicitacao_id, usuario_id, acao, descricao, dados_novos)
    VALUES (p_solicitacao_id, p_executante_id, 'DEFINIR_CUSTO_PRAZO', 
            'Custo e prazo definidos pelo executante', 
            jsonb_build_object('custo', p_custo, 'prazo', p_prazo));
    
    RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Comentários nas tabelas
COMMENT ON TABLE empresas IS 'Tabela de empresas cadastradas no sistema';
COMMENT ON TABLE usuarios IS 'Tabela de usuários do sistema (solicitantes e executantes)';
COMMENT ON TABLE solicitacoes IS 'Tabela principal de solicitações de desenvolvimento';
COMMENT ON TABLE historico_solicitacoes IS 'Tabela de histórico de alterações nas solicitações';

-- Permissões (ajustar conforme necessário)
GRANT ALL PRIVILEGES ON DATABASE sistema_solicitacoes TO postgres;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;

-- Mensagem de conclusão
SELECT 'Banco de dados sistema_solicitacoes criado com sucesso!' as resultado; 