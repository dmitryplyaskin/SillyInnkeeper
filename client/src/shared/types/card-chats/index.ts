export interface CardChatSummary {
  id: string; // file basename, e.g. "Foo.jsonl"
  title: string;
  messages_count: number;
  last_message_at: number; // ms timestamp
}

export interface CardChatMessage {
  name: string;
  is_user: boolean;
  is_system: boolean;
  mes: string;
  swipes?: string[];
  swipe_id?: number;
  send_date: string | number | null;
  send_date_ms: number;
}

export interface CardChatDetails {
  id: string;
  title: string;
  meta: {
    user_name?: string;
    character_name?: string;
  };
  messages: CardChatMessage[];
}


