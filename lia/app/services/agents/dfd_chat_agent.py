"""
Sistema LIA - Agente DFD Conversacional
=======================================
Agente que conversa com o usuário para coletar informações
e gerar o Documento de Formalização da Demanda.

O agente age como um TUTOR: guia o usuário campo a campo,
oferece sugestões com base no contexto do PAC e só sinaliza
geração quando todas as informações essenciais foram coletadas.

Autor: Equipe TRE-GO
Data: Fevereiro 2026
"""

import json
from typing import Dict, Any, List

from .conversational_agent import ConversationalAgent, ChatContext, Message


# Campos obrigatórios para o DFD, na ordem sugerida de coleta
CAMPOS_REQUERIDOS_DFD = {
    "data_limite": "Data pretendida para contratação",
    "gestor": "Gestor do contrato sugerido",
    "fiscal": "Fiscal do contrato sugerido",
    "descricao_detalhada": "Descrição detalhada do objeto",
    "problema": "Problema ou necessidade que motiva a contratação",
    "justificativa": "Justificativa da essencialidade da contratação",
}


class DFDChatAgent(ConversationalAgent):
    """
    Agente conversacional para Documento de Formalização da Demanda.
    
    Age como tutor: guia o usuário para coletar os 6 campos essenciais
    antes de sinalizar a geração do documento.
    """
    
    agent_type = "dfd"
    
    nome_artefato = "DFD"
    
    temperature_chat = 0.7
    temperature_generate = 0.6
    
    dados_necessarios = [label for label in CAMPOS_REQUERIDOS_DFD.values()]
    
    campos_dfd = [
        "justificativa_tecnica",
        "descricao_objeto_padronizada",
        "id_item_pca",
        "prioridade_sugerida",
        "analise_alinhamento",
        "data_pretendida",
        "responsavel_gestor",
        "responsavel_fiscal",
    ]

    def get_mensagem_inicial(self, context: ChatContext) -> str:
        """Mensagem inicial proativa: já começa perguntando o primeiro campo com sugestões."""

        user_nome = context.user_nome or "Usuário"

        # Construir info sobre itens PAC
        pac_info = ""
        pac_descs: list[str] = []
        if context.itens_pac:
            for item in context.itens_pac[:3]:
                desc = item.get('descricao', item.get('objeto', 'Item'))[:80]
                pac_descs.append(desc)
            if len(context.itens_pac) == 1:
                pac_info = f"\n\n📋 Item do PAC vinculado: **{pac_descs[0]}**"
            else:
                pac_info = (
                    f"\n\n📋 **{len(context.itens_pac)} itens do PAC** vinculados:\n"
                    + "\n".join(f"  - {n}" for n in pac_descs)
                    + (" ..." if len(context.itens_pac) > 3 else "")
                )

        # Build contextual suggestions for "problema"
        sugestoes = []
        for item in (context.itens_pac or [])[:3]:
            desc = item.get('descricao', item.get('objeto', ''))[:100]
            if desc:
                sugestoes.append(f"Necessidade de aquisição de {desc.lower()} para atender às demandas operacionais do setor.")
        if not sugestoes:
            titulo = context.projeto_titulo or "itens do projeto"
            sugestoes = [
                f"Necessidade de contratação de {titulo.lower()} para garantir a continuidade dos serviços.",
                f"Demanda operacional identificada para {titulo.lower()}, essencial ao funcionamento do setor.",
                f"Insuficiência ou inexistência de {titulo.lower()}, comprometendo a eficiência administrativa.",
            ]
        # Pad to 3
        while len(sugestoes) < 3:
            sugestoes.append(f"Necessidade de {context.projeto_titulo or 'recursos'} para manter o funcionamento adequado do setor.")

        sugestoes_txt = "\n".join(f"{i+1}. {s}" for i, s in enumerate(sugestoes[:3]))

        return f"""👋 Olá, **{user_nome}**! Sou a **LIA**, sua assistente para elaboração do **DFD**.

📁 Projeto: **{context.projeto_titulo}**{pac_info}

Vou te guiar passo a passo. Preciso de apenas **3 informações** para gerar o DFD — vamos lá!

⚠️ **Qual é o problema ou necessidade que motivou este projeto?**

**Sugestões** (escolha, combine ou escreva a sua própria):
{sugestoes_txt}"""

    def build_chat_system_prompt(self, context: ChatContext) -> str:
        """
        System prompt tutor específico para o DFD.
        Substitui o genérico do ConversationalAgent.
        """
        import logging
        logger = logging.getLogger(__name__)

        dc = context.dados_coletados or {}

        # ----- Dados do sistema (preenchidos automaticamente) -----
        user_nome = context.user_nome or "Usuário"
        user_setor = context.user_setor or context.setor_usuario or "Unidade Requisitante"

        # Itens PAC como contexto rico
        pac_ctx = ""
        pac_ids_txt = ""
        if context.itens_pac:
            linhas = []
            ids_list = []
            for item in context.itens_pac[:5]:
                desc = item.get('descricao', item.get('objeto', ''))[:120]
                val = item.get('valor_previsto', 0)
                vid = item.get('id', '?')
                vpi = item.get('valor_por_item', 0)
                qty = item.get('quantidade', 0)
                obj = item.get('objetivo', '')
                ids_list.append(str(vid))
                linhas.append(f"  - ID {vid}: {desc} | Qtd: {qty} | Valor total: R$ {val:,.2f} | Valor unit.: R$ {vpi:,.2f} | Objetivo: {obj}")
            pac_ctx = "\n\nITENS DO PAC VINCULADOS (use para fazer sugestões ao usuário):\n" + "\n".join(linhas)
            pac_ids_txt = ", ".join(ids_list)

        # Skills
        skills_txt = ""
        if context.skills:
            skills_txt = "\n\n========== HABILIDADES ATIVAS ==========\n"
            for skill in context.skills:
                skills_txt += f"\n--- {skill.get('nome', 'Skill')} ---\n"
                skills_txt += f"{skill.get('instrucoes', '')}\n"
            skills_txt += "\n========== FIM DAS HABILIDADES =========="
            logger.info(f"[DFDChatAgent] {len(context.skills)} skill(s) injetada(s) no prompt")

        # Attachments
        att_txt = ""
        if context.attachments:
            att_txt = "\n\nBASE DE CONHECIMENTO (arquivos do usuário):\n"
            for att in context.attachments:
                if att.get("extracted_text"):
                    att_txt += f"\n--- {att.get('filename', 'arquivo')} ---\n{att['extracted_text'][:2000]}\n"

        prompt = f"""Você é a **LIA**, assistente especialista de contratações públicas do TRE-GO, atuando como **TUTORA** na elaboração do **DFD (Documento de Formalização da Demanda)** conforme a Lei 14.133/2021.

🌐 **IDIOMA OBRIGATÓRIO:** Sempre pense, raciocine e responda em **português brasileiro**.

===== DADOS DO SISTEMA (PREENCHIDOS AUTOMATICAMENTE — não pergunte ao usuário) =====
- Responsável pela Demanda: {user_nome}
- Setor Requisitante: {user_setor}
- Itens PAC vinculados: {pac_ids_txt or 'nenhum'}
===== FIM DADOS DO SISTEMA =====

PROJETO EM ELABORAÇÃO:
- Título: {context.projeto_titulo}
- Setor: {user_setor}
- Itens PAC: {len(context.itens_pac)} item(ns){pac_ctx}
{skills_txt}{att_txt}

===== CAMPOS QUE VOCÊ PRECISA COLETAR COM O USUÁRIO (apenas 3) =====
Nos campos abaixo, a IA precisa conversar com o usuário para coletar:

1. **problema**: Problema ou necessidade que motiva a contratação
2. **justificativa**: Justificativa da essencialidade da contratação
3. **descricao_detalhada**: Descrição detalhada do objeto a ser contratado

Os demais campos (data, gestor, fiscal) podem ser mencionados pelo usuário durante a conversa. Se ele informar, registre. Senão, pergunte ao final, de forma rápida.

===== INSTRUÇÕES DE COMPORTAMENTO (TUTOR PROATIVO) =====

1. **Guie passo a passo.** Pergunte UM campo por vez na ordem: problema → justificativa → descrição detalhada. Após esses 3, se data/gestor/fiscal não tiverem sido mencionados, pergunte rapidamente.

2. **SEMPRE ofereça sugestões prontas NA MESMA MENSAGEM da pergunta.** Formato obrigatório:

   Pergunta do campo aqui?

   **Sugestões** (escolha, combine ou escreva a sua própria):
   1. [sugestão contextualizada com dados do PAC]
   2. [sugestão alternativa]
   3. [sugestão mais detalhada]

   As sugestões devem ser ESPECÍFICAS ao projeto (usar descrição dos itens PAC, valores, contexto). NUNCA genéricas.

3. **Quando o usuário responde (qualquer texto que não seja "gere" ou "gerar"):**
   - Interprete como RESPOSTA ao campo sendo coletado
   - Se disser "item 1", "item 2", "coloque todas", "essa", etc. → use a(s) sugestão(ões) correspondente(s)
   - Confirme brevemente (1 frase) e PASSE IMEDIATAMENTE para o próximo campo com sugestões
   - NUNCA repita a lista de campos faltantes — apenas pergunte o PRÓXIMO

4. **Reformule em linguagem técnica.** Se o usuário usar linguagem informal, reformule em tom formal de contratação e confirme rapidamente.

5. **Quando TODOS os campos estiverem coletados** (os 3 principais + opcionais se disponíveis):
   - Faça um RESUMO COMPLETO dos dados coletados
   - Pergunte: "Posso gerar o DFD agora? 📄"
   - Só chame `generate_artifact` se o usuário confirmar ("sim", "pode gerar", "gera", "beleza", etc.)

6. **Quando o usuário pede para gerar ("gere", "gera o DFD", "pode gerar"):**
   - SE já coletou os 3 campos principais → gere imediatamente (chame `generate_artifact`)
   - SE faltam campos → diga BREVEMENTE quais faltam e OFEREÇA SUGESTÕES para o próximo campo. Exemplo:
     "Ainda preciso da **justificativa**. Quer usar uma destas?"
     NÃO entre em loop repetindo "faltam N campos" — sempre ofereça a solução (sugestão).
   - Se o usuário INSISTIR mesmo faltando campos → respeite e chame `generate_artifact`

7. **NUNCA entre em loop.** Se o usuário repete a mesma coisa ou insiste, PROGRIDA. Nunca repita a mesma lista de campos faltantes duas vezes seguidas. Se já listou os campos faltantes, na próxima mensagem já pergunte diretamente o primeiro campo faltante com sugestões.

8. **NUNCA mencione JSON, schemas, generate_artifact ou detalhes técnicos.** Conversa 100% natural.

9. **Respostas do usuário são respostas de campo — NÃO são pedidos de geração.** "coloque todas", "use essas", "pode colocar", "item 3" = aceitando sugestão do campo atual. Registre e passe ao próximo.

10. **Seja ágil.** Confirme em 1 frase, passe para o próximo. Sem pausas, sem reflexões em voz alta.
"""
        logger.info(f"[DFDChatAgent] System prompt tutor construído.")
        return prompt

    def build_generate_prompt(self, context: ChatContext, conversa_resumo: str) -> str:
        """Prompt específico para geração do DFD, incluindo dados_coletados."""
        
        itens_pac_str = json.dumps(context.itens_pac, ensure_ascii=False, indent=2)
        
        # Dados do formulário "Informações Adicionais" (preenchidos pelo usuário na UI)
        dc = context.dados_coletados or {}
        dados_form = []
        if dc.get("data_pretendida"):
            dados_form.append(f"- Data pretendida para contratação: {dc['data_pretendida']}")
        if dc.get("responsavel_gestor"):
            dados_form.append(f"- Gestor do contrato: {dc['responsavel_gestor']}")
        if dc.get("responsavel_fiscal"):
            dados_form.append(f"- Fiscal do contrato: {dc['responsavel_fiscal']}")
        
        dados_form_txt = "\n".join(dados_form) if dados_form else "(nenhum dado preenchido no formulário)"
        
        return f"""PROJETO: {context.projeto_titulo}
SETOR REQUISITANTE: {context.setor_usuario}

ITENS DO PAC VINCULADOS:
{itens_pac_str}

DADOS PREENCHIDOS NO FORMULÁRIO (ALTA PRIORIDADE - use diretamente nos campos equivalentes):
{dados_form_txt}

INFORMAÇÕES COLETADAS NA CONVERSA COM O USUÁRIO:
{conversa_resumo}

Com base em TODAS as informações acima, gere o DFD completo.

INSTRUÇÕES IMPORTANTES:
- PRIORIZE os dados do formulário para os campos correspondentes (data_pretendida, responsavel_gestor, responsavel_fiscal)
- Use a conversa para preencher justificativa_tecnica, descricao_objeto_padronizada e analise_alinhamento
- A justificativa deve ser formal, demonstrar essencialidade e alinhamento com a Lei 14.133/2021
- O id_item_pca DEVE ser um dos IDs listados na seção "ITENS DO PAC VINCULADOS" acima — escolha o mais relevante
- descricao_objeto_padronizada deve incluir unidade de medida quando aplicável
- Retorne APENAS o JSON puro, sem markdown, sem explicações

SCHEMA:
{{
  "justificativa_tecnica": "string — justificativa técnica formal e detalhada",
  "descricao_objeto_padronizada": "string — descrição precisa com quantidade e unidade de medida",
  "id_item_pca": number — ID do item PAC mais relevante (OBRIGATÓRIO, use um dos IDs fornecidos),
  "prioridade_sugerida": "Alta" | "Média" | "Baixa",
  "analise_alinhamento": "string — como esta contratação se alinha ao planejamento (PAC)",
  "data_pretendida": "string ISO 8601 ou null",
  "responsavel_gestor": "string ou null",
  "responsavel_fiscal": "string ou null"
}}"""
