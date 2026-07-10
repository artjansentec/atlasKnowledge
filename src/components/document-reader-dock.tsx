import { useEffect, useRef, useState } from 'react'
import { Download, FileText, Maximize2, Minimize2 } from 'lucide-react'
import type { DocumentExportPayload } from '../lib/document-export-types'
import { showToast } from './app-alerts'
import './document-reader-dock.css'

type DocumentReaderDockProps = {
  fullscreen: boolean
  exportPayload: DocumentExportPayload | null
  onToggleFullscreen: () => void
}

export function DocumentReaderDock({ fullscreen, exportPayload, onToggleFullscreen }: DocumentReaderDockProps) {
  const [menuOpen, setMenuOpen] = useState(false)
  const [exporting, setExporting] = useState<'pdf' | 'word' | null>(null)
  const dockRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!menuOpen) return

    function handlePointerDown(event: MouseEvent) {
      if (!dockRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }

    window.addEventListener('mousedown', handlePointerDown)
    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('mousedown', handlePointerDown)
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [menuOpen])

  async function handleExport(format: 'pdf' | 'word') {
    if (!exportPayload || exporting) return

    setMenuOpen(false)
    setExporting(format)

    try {
      if (format === 'pdf') {
        const { exportDocumentAsPdf } = await import('../lib/document-pdf-export')
        await exportDocumentAsPdf(exportPayload)
      } else {
        const { exportDocumentAsWord } = await import('../lib/document-export')
        await exportDocumentAsWord(exportPayload)
      }
      showToast(format === 'pdf' ? 'PDF gerado com sucesso' : 'Documento Word gerado com sucesso')
    } catch {
      showToast('Não foi possível gerar o arquivo', 'error')
    } finally {
      setExporting(null)
    }
  }

  return (
    <div ref={dockRef} className="document-reader-dock" aria-label="Ações do leitor">
      <button
        type="button"
        className="document-reader-dock__button"
        onClick={onToggleFullscreen}
        title={fullscreen ? 'Sair da tela cheia' : 'Tela cheia'}
        aria-label={fullscreen ? 'Sair da tela cheia' : 'Abrir em tela cheia'}
      >
        {fullscreen ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />}
      </button>

      <div className="document-reader-dock__menu-wrap">
        <button
          type="button"
          className="document-reader-dock__button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          disabled={!exportPayload || Boolean(exporting)}
          title="Baixar documento"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <Download size={16} aria-hidden="true" />
        </button>

        {menuOpen && (
          <div className="document-reader-dock__menu" role="menu">
            <button
              type="button"
              role="menuitem"
              disabled={exporting === 'pdf'}
              onClick={() => void handleExport('pdf')}
            >
              <FileText size={14} aria-hidden="true" />
              Baixar PDF
            </button>
            <button
              type="button"
              role="menuitem"
              disabled={exporting === 'word'}
              onClick={() => void handleExport('word')}
            >
              <FileText size={14} aria-hidden="true" />
              Baixar Word (ABNT)
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
