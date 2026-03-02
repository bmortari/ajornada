-- ============================================
-- ChatDatajud — Índices de Performance
-- ============================================

-- CN
CREATE INDEX idx_cn_tribunal_periodo ON cn(tribunal, ano, mes);
CREATE INDEX idx_cn_uf ON cn(uf);
CREATE INDEX idx_cn_procedimento ON cn(procedimento);
CREATE INDEX idx_cn_classe ON cn(nome_ultima_classe);
CREATE INDEX idx_cn_data_ref ON cn(data_referencia);

-- SENT
CREATE INDEX idx_sent_tribunal_periodo ON sent(tribunal, ano, mes);
CREATE INDEX idx_sent_uf ON sent(uf);
CREATE INDEX idx_sent_data_ref ON sent(data_referencia);

-- TBAIX
CREATE INDEX idx_tbaix_tribunal_periodo ON tbaix(tribunal, ano, mes);
CREATE INDEX idx_tbaix_uf ON tbaix(uf);
CREATE INDEX idx_tbaix_data_ref ON tbaix(data_referencia);
CREATE INDEX idx_tbaix_data_inicio ON tbaix(data_inicio);

-- CPL
CREATE INDEX idx_cpl_tribunal_periodo ON cpl(tribunal, ano, mes);
CREATE INDEX idx_cpl_dias ON cpl(dias_antiguidade);
CREATE INDEX idx_cpl_liquido ON cpl(liquido);

-- DATAMART
CREATE INDEX idx_dm_tribunal ON datamart(sigla_tribunal);
CREATE INDEX idx_dm_ramo ON datamart(ramo_justica);
CREATE INDEX idx_dm_uf ON datamart(uf_oj);
CREATE INDEX idx_dm_situacao ON datamart(situacao);
CREATE INDEX idx_dm_ajuizamento ON datamart(data_ajuizamento);
CREATE INDEX idx_dm_classe ON datamart(classe);
CREATE INDEX idx_dm_competencia ON datamart(competencia_grupo);
