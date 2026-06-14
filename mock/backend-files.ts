import geobPdfUrl from './CT_GEOB_XXIV_2018_10.pdf?url'

export type MockBackendFileRecord = {
  id: string
  name: string
  type: string
  mimeType: string
  size: string
  uploadedAt: string
  url: string
}

export const mockBackendFiles = {
  geobExamPdf: {
    id: 'file-geob-xxiv-2018-10',
    name: 'CT_GEOB_XXIV_2018_10.pdf',
    type: 'pdf',
    mimeType: 'application/pdf',
    size: '6.3 MB',
    uploadedAt: '2026-06-13',
    url: geobPdfUrl,
  },
} satisfies Record<string, MockBackendFileRecord>
