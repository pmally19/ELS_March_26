import React from 'react';

type DesignerDocument = {
  id: number;
  file_name: string;
  file_type: string;
  document_type: string;
  status: string;
  uploaded_at: string;
};

interface StructuredWorkflowProps {
  documents: DesignerDocument[];
  onDocumentSelect: (id: number) => void;
}

export default function StructuredWorkflow({ documents, onDocumentSelect }: StructuredWorkflowProps) {
    return (
    <div className="space-y-4">
      <div className="p-4 border rounded-lg bg-gray-50">
        <h3 className="font-semibold mb-1">Simple Workflow</h3>
        <p className="text-sm text-gray-600">1) Upload → 2) Analyze → 3) Review → 4) Implement</p>
      </div>

      <div className="space-y-2">
        <h4 className="font-medium">Documents</h4>
        {documents.length === 0 ? (
          <div className="text-sm text-gray-500">No documents uploaded yet</div>
        ) : (
          <div className="grid gap-2">
            {documents.map(d => (
              <button
                key={d.id}
                onClick={() => onDocumentSelect(d.id)}
                className="text-left p-3 border rounded hover:bg-gray-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{d.file_name}</div>
                    <div className="text-xs text-gray-500">{d.document_type} • {d.status}</div>
                  </div>
                  <div className="text-xs text-gray-500">{new Date(d.uploaded_at).toLocaleString()}</div>
                </div>
              </button>
            ))}
          </div>
        )}
        </div>
    </div>
  );
}