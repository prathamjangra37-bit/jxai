export interface Attachment {
  name: string;
  type: "image" | "file";
  data: string; // Base64 representation (data URL for images, text content or data URL for files)
  mimeType?: string;
  size?: number;
  url?: string;
}

export interface Message {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  attachments?: Attachment[];
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: Date;
}

export interface Suggestion {
  id: string;
  title: string;
  text: string;
  icon: string;
}

export interface DeveloperNote {
  title: string;
  description: string;
}

