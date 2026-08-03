#!/usr/bin/env python3
"""Gera listagem TXT dos NCMs encontrados nos XMLs da pasta nfe_venda."""
import xml.etree.ElementTree as ET
import glob
import os
from datetime import datetime

NS = {'n': 'http://www.portalfiscal.inf.br/nfe'}
PASTA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'nfe_venda')
SAIDA = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'LISTAGEM_NCM_NFE_VENDA.txt')

# Descrições oficiais da tabela NCM (TIPI)
DESCRICOES_NCM = {
    '39191090': 'Chapas, folhas, tiras, fitas, películas e outras formas planas, '
                'autoadesivas, de plásticos, em rolos de largura <= 20 cm - Outras',
    '48114190': 'Papel e cartão gomados ou adesivos - Autoadesivos - Outros',
    '96121000': 'Fitas impressoras para máquinas de escrever e fitas impressoras '
                'semelhantes, tintadas ou preparadas de outro modo para imprimir (ribbons)',
}


def fmt_ncm(ncm):
    return f'{ncm[:4]}.{ncm[4:6]}.{ncm[6:]}' if len(ncm) == 8 else ncm


def main():
    ncms = {}  # ncm -> lista de itens
    arquivos = sorted(glob.glob(os.path.join(PASTA, '*.xml')))

    for arq in arquivos:
        root = ET.parse(arq).getroot()
        dest = root.find('.//n:dest/n:xNome', NS)
        nnf = root.find('.//n:ide/n:nNF', NS)
        cliente = dest.text if dest is not None else '?'
        num_nf = nnf.text if nnf is not None else '?'
        for det in root.findall('.//n:det', NS):
            ncm = det.find('.//n:NCM', NS).text
            prod = ' '.join(det.find('.//n:xProd', NS).text.split())
            ncms.setdefault(ncm, []).append((prod, cliente, num_nf))

    linhas = []
    linhas.append('=' * 100)
    linhas.append('LISTAGEM DE NCM - XMLs DA PASTA nfe_venda')
    linhas.append(f'Gerado em: {datetime.now().strftime("%d/%m/%Y %H:%M")}')
    linhas.append(f'Arquivos XML processados: {len(arquivos)}')
    linhas.append(f'NCMs distintos encontrados: {len(ncms)}')
    linhas.append('=' * 100)
    linhas.append('')

    # Resumo
    linhas.append('RESUMO')
    linhas.append('-' * 100)
    for ncm in sorted(ncms):
        desc = DESCRICOES_NCM.get(ncm, 'Descrição não catalogada')
        linhas.append(f'{fmt_ncm(ncm)}  |  {desc}')
    linhas.append('')

    # Detalhamento
    linhas.append('DETALHAMENTO POR NCM')
    linhas.append('=' * 100)
    for ncm in sorted(ncms):
        itens = ncms[ncm]
        linhas.append('')
        linhas.append(f'NCM: {fmt_ncm(ncm)}')
        linhas.append(f'Descrição: {DESCRICOES_NCM.get(ncm, "Descrição não catalogada")}')
        linhas.append(f'Ocorrências (itens de NF): {len(itens)}')
        linhas.append('Produtos:')
        vistos = set()
        for prod, cliente, num_nf in sorted(itens):
            chave = (prod, cliente, num_nf)
            if chave in vistos:
                continue
            vistos.add(chave)
            linhas.append(f'  - {prod}')
            linhas.append(f'      Cliente: {cliente} | NF: {num_nf}')
        linhas.append('-' * 100)

    with open(SAIDA, 'w', encoding='utf-8') as f:
        f.write('\n'.join(linhas) + '\n')
    print(f'Arquivo gerado: {SAIDA}')


if __name__ == '__main__':
    main()
