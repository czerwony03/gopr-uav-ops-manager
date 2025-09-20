export interface ChecklistItem {
  id: string;
  topic: string;
  image?: string; // URL to uploaded image
  content: string;
  number: number; // order/sequence number
  link?: string; // external link
  file?: string; // URL to uploaded file
}

export interface ProcedureChecklist {
  id: string;
  title: string;
  description?: string;
  items: ChecklistItem[];
  categories?: string[]; // array of category IDs this procedure belongs to
  createdBy: string; // user ID who created it
  updatedBy?: string; // user ID who last updated it
  isDeleted?: boolean; // soft-delete flag
  deletedAt?: Date; // timestamp when deleted
  createdAt?: Date; // timestamp when created
  updatedAt?: Date; // timestamp when last updated
}

// Form data interface for easier form handling
export interface ProcedureChecklistFormData {
  title: string;
  description: string;
  items: ChecklistItemFormData[];
  categories?: string[]; // array of category IDs
}

export interface ChecklistItemFormData {
  id: string;
  topic: string;
  image?: string; // URL or base64 for new images
  content: string;
  number: number;
  link?: string; // Optional to match ChecklistItem
  file?: string; // URL or file reference
}