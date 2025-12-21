export interface LorebookSummary {
  id: string;
  name: string | null;
  description: string | null;
  spec: string;
  created_at: number;
  updated_at: number;
  cards_count?: number;
}

export interface LorebookLinkedCard {
  id: string;
  name: string | null;
}

export interface LorebookDetails {
  id: string;
  name: string | null;
  description: string | null;
  spec: string;
  created_at: number;
  updated_at: number;
  data: unknown;
  cards: LorebookLinkedCard[];
}

// Lorebook Entry types according to SPEC_V3.md
export interface LorebookEntry {
  keys: string[];
  content: string;
  extensions: Record<string, any>;
  enabled: boolean;
  insertion_order: number;
  scan_depth?: number;
  case_sensitive?: boolean;
  use_regex: boolean;
  constant?: boolean;
  // Optional fields
  name?: string;
  priority?: number;
  id?: number | string;
  comment?: string;
  selective?: boolean;
  secondary_keys?: string[];
  position?: "before_char" | "after_char";
}

// Lorebook structure according to SPEC_V3.md
export interface Lorebook {
  name?: string;
  description?: string;
  scan_depth?: number;
  token_budget?: number;
  recursive_scanning?: boolean;
  extensions: Record<string, any>;
  entries: LorebookEntry[];
}


