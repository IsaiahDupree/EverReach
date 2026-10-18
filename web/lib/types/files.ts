// File Types

export type FileCategory = 'document' | 'image' | 'spreadsheet' | 'presentation' | 'pdf' | 'other'

export interface UploadedFile {
  id: string
  user_id: string
  contact_id?: string
  filename: string
  original_filename: string
  mime_type: string
  size_bytes: number
  category: FileCategory
  storage_path: string
  public_url?: string
  thumbnail_url?: string
  tags?: string[]
  description?: string
  uploaded_at: string
  created_at: string
}

export const FILE_CATEGORIES: Record<FileCategory, {
  label: string
  icon: string
  extensions: string[]
}> = {
  document: {
    label: 'Document',
    icon: '📄',
    extensions: ['.doc', '.docx', '.txt', '.rtf', '.odt'],
  },
  image: {
    label: 'Image',
    icon: '🖼️',
    extensions: ['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.bmp'],
  },
  spreadsheet: {
    label: 'Spreadsheet',
    icon: '📊',
    extensions: ['.xls', '.xlsx', '.csv', '.ods'],
  },
  presentation: {
    label: 'Presentation',
    icon: '📽️',
    extensions: ['.ppt', '.pptx', '.odp'],
  },
  pdf: {
    label: 'PDF',
    icon: '📕',
    extensions: ['.pdf'],
  },
  other: {
    label: 'Other',
    icon: '📎',
    extensions: [],
  },
}

export function getCategoryFromMimeType(mimeType: string): FileCategory {
  if (mimeType.startsWith('image/')) return 'image'
  if (mimeType === 'application/pdf') return 'pdf'
  if (mimeType.includes('word') || mimeType.includes('text')) return 'document'
  if (mimeType.includes('sheet') || mimeType.includes('csv')) return 'spreadsheet'
  if (mimeType.includes('presentation')) return 'presentation'
  return 'other'
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
}

export function getFileExtension(filename: string): string {
  const parts = filename.split('.')
  return parts.length > 1 ? `.${parts[parts.length - 1]?.toLowerCase() ?? ''}` : ''
}
