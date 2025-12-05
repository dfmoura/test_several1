package br.com.trigger.acessodados;

import br.com.sankhya.jape.EntityFacade;
import br.com.sankhya.jape.bmp.PersistentLocalEntity;
import br.com.sankhya.jape.util.FinderWrapper;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.vo.EntityVO;
import br.com.sankhya.modelcore.util.DynamicEntityNames;
import br.com.sankhya.modelcore.util.EntityFacadeFactory;

import java.math.BigDecimal;
import java.util.Collection;

public class EntityFacadeExemplo {


    public void buscarRegistroPelaPK() throws Exception {



        // metodo espera a instancia e a pk da tabela
        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO produtoVO = (DynamicVO) dwfFacade.findEntityByPrimaryKeyAsVO("Produto", new Object[]{BigDecimal.ZERO});
        System.out.println("Produto: "+ produtoVO.asBigDecimal("CODPROD") + " - Nome do produto: "+produtoVO.asString("DESCRPROD"));
        //throw new Exception("Produto: "+ produtoVO.asBigDecimal("CODPROD") + " - Nome do produto: "+produtoVO.asString("DESCRPROD"));
    }

    public void buscarRegistroPelaPKComposta() throws Exception {

        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
        // pk composta
        DynamicVO funcionarioVO = (DynamicVO) dwfFacade.findEntityByPrimaryKeyAsVO("Funcionario", new Object[]{BigDecimal.ONE, new BigDecimal(1)});
//        contexto.setMensagemRetorno("Cód. Empresa: "+ funcionarioVO.asBigDecimal("CODEMP") + " - Funcionário: "+funcionarioVO.asBigDecimal("CODFUNC") +
//                " - Nome do Funcionário: "+funcionarioVO.asString("NOMEFUNC"));
    }

    public void buscarRegistroPorCondicao() throws Exception{

        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
        // pelo criterio
        FinderWrapper finder = new FinderWrapper(DynamicEntityNames.FUNCIONARIO, "this.CODEMP = ?", new Object[]{BigDecimal.ONE});
        finder.setMaxResults(-1);
        finder.setOrderBy("CODFUNC");
        Collection<DynamicVO> funcionariosVO = dwfFacade.findByDynamicFinderAsVO(finder);
        // verifica se a consulta tem informação
        if (!funcionariosVO.isEmpty()){

            for (DynamicVO funcVO: funcionariosVO){
                System.out.println("Cód. Empresa: "+ funcVO.asBigDecimal("CODEMP") + " - Funcionário: "+funcVO.asBigDecimal("CODFUNC") +
                        " - Nome do Funcionário: "+funcVO.asString("NOMEFUNC"));
            }
        } else {
            System.out.println("O array estava vazio!");
        }
    }

    public BigDecimal insercaoDeDados(String nome) throws Exception {
        EntityFacade dwfFacade = EntityFacadeFactory.getDWFFacade();
        DynamicVO acessoVO = (DynamicVO) dwfFacade.getDefaultValueObjectInstance("AD_STAACESSO");
        acessoVO.setProperty("NOME", "TRIGGER DATA");
        PersistentLocalEntity entity = dwfFacade.createEntity("AD_STAACESSO", (EntityVO) acessoVO);
        DynamicVO acessoNovoVO = (DynamicVO) entity.getValueObject();
        return acessoNovoVO.asBigDecimal("SEQUENCIA");

    }




}
