// User types matching the FastAPI User model
export interface User {
  id: number;
  email: string;
  nome: string;
  cargo: string | null;
  setor: string | null;
  grupo: string | null;
  perfil: "admin" | "operador" | "visualizador";
  is_active: boolean;
  is_superuser: boolean;
  is_verified: boolean;
}

// Project types
export interface Projeto {
  id: number;
  nome: string;
  descricao: string | null;
  objeto: string | null;
  status: string;
  modalidade: string | null;
  valor_estimado: number | null;
  unidade_requisitante: string | null;
  setor_responsavel: string | null;
  created_at: string;
  updated_at: string;
  usuario_id: number;
  // PAC fields
  intra_pac_id: number | null;
  intra_pac_nome: string | null;
  itens_pac?: PacItem[];
}

// PAC item
export interface PacItem {
  id: number;
  ano: number;
  tipo_pac: string | null;
  iniciativa: string | null;
  objetivo: string | null;
  unidade_tecnica: string | null;
  unidade_administrativa: string | null;
  detalhamento: string | null;
  descricao: string | null;
  quantidade: number | null;
  unidade: string | null;
  frequencia: string | null;
  valor_previsto: string | null;
  justificativa: string | null;
  prioridade: number | null;
  catmat_catser: string | null;
  tipo_contratacao: string | null;
  fase: string | null;
  valor_por_item?: number | null;
}

// Artifact types
export interface Artefato {
  tipo: string;
  nome: string;
  status: "pendente" | "rascunho" | "aprovado" | "publicado";
  dados: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

// Artifact configuration
export interface ArtefatoConfig {
  tipo: string;
  nome: string;
  descricao: string;
  campos: CampoConfig[];
  icone?: string;
}

export interface CampoConfig {
  nome: string;
  label: string;
  tipo: "text" | "textarea" | "select" | "number" | "date" | "table";
  obrigatorio?: boolean;
  opcoes?: string[];
}

// Chat types
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  reasoning?: string;
  timestamp: Date;
  attachments?: FileAttachment[];
  metadata?: Record<string, any>;
}

export interface FileAttachment {
  id: string;
  nome: string;
  tipo: string;
  tamanho: number;
  url?: string;
}

// AI Model
export interface IAModel {
  id: string;
  name: string;
  description?: string;
  tier?: string;
  icon?: string;
  provider?: string;
  context_length?: number;
}

export interface IAModelsResponse {
  models: IAModel[];
  default: string;
  tiers: Record<string, { name: string; color: string }>;
}

// Skill
export interface Skill {
  id: number;
  nome: string;
  descricao: string | null;
  instrucoes: string | null;
  ativa: boolean;
  escopo?: "system" | "user";
  tools: Record<string, unknown> | null;
  textos_base: string | null;
  created_at: string;
  updated_at: string;
  usuario_id: number;
}

// File upload
export interface UploadedFile {
  file_id: string;
  filename: string;
  content_type: string;
  size: number;
  url?: string;
  extracted_text?: string;
}

// Artifact config from /api/config/artefatos
export interface ArtefatoConfigMap {
  [tipo: string]: ArtefatoRemoteConfig;
}

export interface ArtefatoRemoteConfig {
  tipo: string;
  titulo: string;
  sigla: string;
  icone: string;
  cor: string;
  requer: string[];
  ordem: number;
  fluxo?: string;
  virtual?: boolean;
  condicional?: string;
  campos_config: Record<string, CampoRemoteConfig>;
}

export interface CampoRemoteConfig {
  label: string;
  tipo: "A" | "B" | "user" | "U" | string;
  descricao: string;
  placeholder?: string;
  readonly?: boolean;
  fonte?: string;
  input_type?: string;
  input_usuario?: boolean;
  campo_ia?: string;
}

// Chat init response
export interface ChatInitResponse {
  mensagem_inicial?: string;
  projeto_nome?: string;
  campos_config?: Record<string, CampoRemoteConfig>;
  dfd_data?: Record<string, any>;
}

// Artifact field in workspace
export interface ArtifactField {
  key: string;
  label: string;
  icon: string;
  type: "auto" | "ia" | "user";
  rows: number;
  value: string;
}

// Dashboard stats
export interface DashboardStats {
  total_projetos: number;
  total_artefatos: number;
  artefatos_ia: number;
  taxa_ia: number;
  projetos_em_andamento: number;
  projetos_concluidos: number;
  distribuicao_artefatos: Record<string, number>;
  projetos_recentes: Projeto[];
  atividades_recentes: AtividadeRecente[];
}

export interface AtividadeRecente {
  tipo: string;
  descricao: string;
  data: string;
  projeto_id?: number;
  projeto_nome?: string;
}

// News
export interface Noticia {
  id: number;
  titulo: string;
  resumo: string;
  conteudo: string;
  data: string;
  categoria: string;
}

// Fluxo (workflow)
export interface FluxoEtapa {
  tipo: string;
  nome: string;
  status: "bloqueado" | "disponivel" | "em_andamento" | "concluido";
  dependencias: string[];
}
