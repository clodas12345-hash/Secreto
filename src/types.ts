export type AuthState = 'unauthenticated' | 'authenticated' | 'duress';

export interface Folder {
  id: string;
  name: string;
  password?: string;
  tabType?: 'passwords' | 'documents';
}

export interface PasswordEntry {
  id: string;
  title: string;
  username: string;
  password?: string;
  accessPassword?: string;
  transactionPassword?: string;
  alphanumericPassword?: string;
  notes?: string;
  folderId?: string | null;
  website?: string;
  updatedAt?: string;
}

export interface DocumentEntry {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  folderId?: string | null;
  fileData?: string | null;
  fileType?: 'image' | 'pdf' | 'other' | null;
}

export interface AccessAttempt {
  id: string;
  timestamp: string;
  pinUsed: string;
  success: boolean;
  photoBase64: string | null;
}
