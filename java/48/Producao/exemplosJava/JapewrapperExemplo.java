package br.com.trigger.acessodados;

import br.com.sankhya.jape.core.JapeSession;
import br.com.sankhya.jape.vo.DynamicVO;
import br.com.sankhya.jape.wrapper.JapeFactory;
import br.com.sankhya.jape.wrapper.JapeWrapper;
import br.com.sankhya.modelcore.MGEModelException;
import br.com.sankhya.modelcore.util.DynamicEntityNames;
import com.sankhya.util.BigDecimalUtil;
import com.sankhya.util.TimeUtils;

import java.math.BigDecimal;
import java.util.Collection;

public class JapewrapperExemplo {

    public void buscarPelaPK() throws MGEModelException {

        JapeSession.SessionHandle hnd = null;
        try {
            hnd = JapeSession.open();
            JapeWrapper dao = JapeFactory.dao(DynamicEntityNames.PARCEIRO);
            DynamicVO parceiroVO = dao.findByPK(BigDecimal.ZERO);
            System.out.println(parceiroVO.asString("TIPPESSOA"));

            throw new Exception("Tipo de Pessoa: "+parceiroVO.asString("TIPPESSOA"));

        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }
    }


    public void buscarPelaNossaCondicao() throws MGEModelException {

        JapeSession.SessionHandle hnd = null;
        try {
            hnd = JapeSession.open();
            JapeWrapper dao = JapeFactory.dao(DynamicEntityNames.PARCEIRO);
            DynamicVO parceiroVO = dao.findOne("this.TIPPESSOA = ?", new Object[]{"F"});
            throw new Exception("Cód. Parceiro: "+parceiroVO.asBigDecimal("CODPARC"));


        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }
    }


    public void buscarPelaNossaCondicaoUmaArrayDeDados() throws MGEModelException {

        JapeSession.SessionHandle hnd = null;
        try {
            hnd = JapeSession.open();
            JapeWrapper dao = JapeFactory.dao(DynamicEntityNames.PARCEIRO);
            Collection<DynamicVO> parceirosVO = dao.find("this.TIPPESSOA = ?", new Object[]{"F"});
            if (parceirosVO.isEmpty()){
                for ( DynamicVO parceiroVO:parceirosVO){
                    System.out.println("Cód. Parceiro: "+parceiroVO.asBigDecimal("CODPARC")+ " Data Alteração: "+parceiroVO.asTimestamp("DTALTER"));
                }
            }
        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }
    }

    public BigDecimal inserirDados(String nome) throws MGEModelException{
        BigDecimal sequencia = BigDecimal.ZERO;
        JapeSession.SessionHandle hnd = null;
		try {
        hnd = JapeSession.open();
        JapeWrapper dao = JapeFactory.dao("AD_STAACESSO");
        DynamicVO acessoVO = dao.create()
                .set("NOME", nome)
                .set("DATA", TimeUtils.getNow())
                .set("VALOR", BigDecimalUtil.valueOf(1000))
                .save();
        sequencia = acessoVO.asBigDecimalOrZero("SEQUENCIA");

        } catch (Exception e) {
            MGEModelException.throwMe(e);
        } finally {
            JapeSession.close(hnd);
        }
        return sequencia;
    }


}
