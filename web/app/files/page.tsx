'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, Upload, Files as FilesIcon } from 'lucide-react'
import { Button } from '@/components/ui'
import { FileUpload } from '@/components/Files/FileUpload'
import { FilesList } from '@/components/Files/FilesList'
import RequireAuth from '@/components/RequireAuth'

function FilesPageContent() {
  const [showUpload, setShowUpload] = useState(false)

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Files</h1>
            <p className="text-gray-600 mt-1">
              Manage documents, images, and attachments
            </p>
          </div>
        </div>
        <Button onClick={() => setShowUpload(!showUpload)}>
          <Upload className="h-4 w-4 mr-2" />
          {showUpload ? 'Hide Upload' : 'Upload Files'}
        </Button>
      </div>

      {/* Info Card */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <h3 className="font-medium text-blue-900 mb-2">About Files</h3>
        <ul className="space-y-1 text-sm text-blue-800">
          <li>• <strong>Upload documents</strong> - PDFs, images, spreadsheets, and more</li>
          <li>• <strong>Organize files</strong> - Filter by category and tag</li>
          <li>• <strong>Attach to contacts</strong> - Link files to specific contacts</li>
          <li>• <strong>Quick access</strong> - Download and preview files instantly</li>
        </ul>
      </div>

      {/* Upload Section */}
      {showUpload && (
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload Files</h2>
          <FileUpload onUploadComplete={() => setShowUpload(false)} />
        </div>
      )}

      {/* Files List */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Your Files</h2>
          <FilesIcon className="h-5 w-5 text-gray-400" />
        </div>
        <FilesList />
      </div>

      {/* File Type Guide */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-6">
        <h3 className="font-medium text-gray-900 mb-4">Supported File Types</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm">
          <div>
            <div className="font-medium text-gray-900 mb-2">📄 Documents</div>
            <div className="text-gray-600">
              .doc, .docx, .txt, .rtf, .odt
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-2">🖼️ Images</div>
            <div className="text-gray-600">
              .jpg, .png, .gif, .svg, .webp
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-2">📕 PDFs</div>
            <div className="text-gray-600">
              .pdf
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-2">📊 Spreadsheets</div>
            <div className="text-gray-600">
              .xls, .xlsx, .csv, .ods
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-2">📽️ Presentations</div>
            <div className="text-gray-600">
              .ppt, .pptx, .odp
            </div>
          </div>
          <div>
            <div className="font-medium text-gray-900 mb-2">📎 Other</div>
            <div className="text-gray-600">
              Additional file types supported
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function FilesPage() {
  return (
    <RequireAuth>
      <FilesPageContent />
    </RequireAuth>
  )
}
