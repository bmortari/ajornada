export interface Message {
  id: string;
  role: 'user' | 'bot';
  content: string;
  streaming?: boolean;
  thinking?: string[];
  sources?: Source[];
  webSources?: WebSource[];
}

export interface Source {
  id: string;
  title: string;
  snippet: string;
  similarity: number;
  situacao: string;
  url: string;
}

export interface WebSource {
  title: string;
  url: string;
  snippet: string;
}

export interface ModelOption {
  id: string;
  label: string;
  provider: string;
  free: boolean;
}

export interface ConversationSummary {
  id: string;
  title: string;
  mode: string;
  model?: string;
  message_count: number;
  created_at: string;
  updated_at: string;
}
