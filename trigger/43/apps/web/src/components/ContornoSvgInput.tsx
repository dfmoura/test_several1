import { useCallback, useId, useRef, useState, type DragEvent } from 'react';
import {
  CONTORNO_SVG_MAX_BYTES,
  contornoSvgJaIncluiColunas,
  importContornoSvg,
  marcarContornoSvgColsCompleto,
  parseColunasMapa,
  type FacaSilhuetaInput,
} from '../lib/facaSilhueta';
import { FacaSilhuetaReal } from './FacaSilhuetaReal';

type ContornoSvgInputProps = {
  value: string;
  onChange: (value: string) => void;
  preview: FacaSilhuetaInput;
  disabled?: boolean;
  /** Tamanho da miniatura na prévia */
  previewSize?: number;
};

function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  return `${(n / 1024).toFixed(n >= 10240 ? 0 : 1)} KB`;
}

export function ContornoSvgInput({
  value,
  onChange,
  preview,
  disabled = false,
  previewSize = 56,
}: ContornoSvgInputProps) {
  const inputId = useId();
  const completoId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const pasteRef = useRef<HTMLTextAreaElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [fileMeta, setFileMeta] = useState<{ name: string; bytes: number } | null>(null);
  const [showPaste, setShowPaste] = useState(false);

  const cols = parseColunasMapa(preview.colunasMapa);
  const jaCompleto = contornoSvgJaIncluiColunas(value);

  const applyImport = useCallback(
    (raw: string, source: 'file' | 'paste', meta?: { name: string; bytes: number }) => {
      const result = importContornoSvg(raw, source);
      if (!result.ok) {
        setErro(result.error);
        return;
      }
      setErro(null);
      setFileMeta(meta ?? null);
      // Novo arquivo = unidade (padrão). Flag "completo" só via checkbox.
      onChange(marcarContornoSvgColsCompleto(result.svg, false));
    },
    [onChange],
  );

  const onFile = useCallback(
    (file: File | null | undefined) => {
      if (!file || disabled) return;

      const name = file.name.toLowerCase();
      if (!name.endsWith('.svg') && file.type !== 'image/svg+xml') {
        setErro('Selecione um arquivo .svg exportado do Corel (contorno de corte).');
        return;
      }
      if (file.size > CONTORNO_SVG_MAX_BYTES) {
        setErro(`Arquivo grande demais (${formatBytes(file.size)}). Máx. ${formatBytes(CONTORNO_SVG_MAX_BYTES)}.`);
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === 'string' ? reader.result : '';
        applyImport(text, 'file', { name: file.name, bytes: file.size });
      };
      reader.onerror = () => setErro('Não foi possível ler o arquivo SVG.');
      reader.readAsText(file);
    },
    [applyImport, disabled],
  );

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragOver(false);
      if (disabled) return;
      const file = e.dataTransfer.files?.[0];
      onFile(file);
    },
    [disabled, onFile],
  );

  const limpar = () => {
    setErro(null);
    setFileMeta(null);
    onChange('');
    if (fileRef.current) fileRef.current.value = '';
  };

  const hasSvg = value.trim().length > 0;

  return (
    <div className="contorno-svg-input">
      <div
        className={`contorno-svg-dropzone${dragOver ? ' is-dragover' : ''}${hasSvg ? ' has-content' : ''}${disabled ? ' is-disabled' : ''}`}
        onClick={(e) => {
          if (disabled) return;
          const t = e.target as HTMLElement;
          if (t.closest('button, label, textarea, a, input')) return;
          fileRef.current?.click();
        }}
        onKeyDown={(e) => {
          if (disabled) return;
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            fileRef.current?.click();
          }
        }}
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label="Importar contorno SVG"
        onDragEnter={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragOver(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setDragOver(false);
        }}
        onDrop={onDrop}
      >
        <input
          ref={fileRef}
          id={inputId}
          type="file"
          className="contorno-svg-file"
          accept=".svg,image/svg+xml"
          disabled={disabled}
          onChange={(e) => onFile(e.target.files?.[0])}
        />

        <div className="contorno-svg-dropzone-body">
          {hasSvg ? (
            <div className="contorno-svg-dropzone-preview" aria-label="Prévia do contorno">
              <FacaSilhuetaReal
                {...preview}
                contornoSvg={value}
                size={previewSize}
                variant="featured"
                showColunasBadge
              />
            </div>
          ) : (
            <div className="contorno-svg-dropzone-icon" aria-hidden>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none">
                <path
                  d="M12 16V4m0 0 7 7m-7-7L5 11M4 18v2a1 1 0 001 1h14a1 1 0 001-1v-2"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          )}

          <div className="contorno-svg-dropzone-copy">
            <strong>{hasSvg ? 'Contorno carregado' : 'Arraste o arquivo .svg aqui'}</strong>
            <span>
              {hasSvg && fileMeta
                ? `${fileMeta.name} · ${formatBytes(fileMeta.bytes)}`
                : 'ou clique para escolher — export Corel (contorno de uma via)'}
            </span>
            <span className="hint">
              {hasSvg
                ? jaCompleto
                  ? 'Arquivo tratado como faca completa — não repete pelas colunas do cadastro.'
                  : cols > 1
                    ? `Prévia: ${cols}× vias (colunas do cadastro). Exporte preferencialmente uma via.`
                    : 'Exporte o contorno de uma via; se cadastrar mais colunas, a silhueta repete automaticamente.'
                : 'Exporte o contorno de uma via. As colunas do cadastro repetem a silhueta nas telas e fichas.'}
            </span>
          </div>
        </div>

        <div className="contorno-svg-dropzone-actions">
          <label htmlFor={inputId} className={`btn btn-secondary btn-sm${disabled ? ' is-disabled' : ''}`}>
            {hasSvg ? 'Trocar arquivo' : 'Escolher .svg'}
          </label>
          {hasSvg ? (
            <button type="button" className="btn btn-ghost btn-sm" disabled={disabled} onClick={limpar}>
              Limpar
            </button>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            disabled={disabled}
            onClick={() => setShowPaste((v) => !v)}
          >
            {showPaste ? 'Ocultar colagem' : 'Colar código'}
          </button>
        </div>
      </div>

      {hasSvg ? (
        <label className="contorno-svg-cols-opt" htmlFor={completoId}>
          <input
            id={completoId}
            type="checkbox"
            checked={jaCompleto}
            disabled={disabled}
            onChange={(e) => {
              onChange(marcarContornoSvgColsCompleto(value, e.target.checked));
            }}
          />
          <span>
            O SVG já inclui todas as colunas — não repetir
            <em> (só se o arquivo vier com as {cols > 1 ? `${cols} vias` : 'vias'} juntas)</em>
          </span>
        </label>
      ) : null}

      {showPaste ? (
        <label className="contorno-svg-paste">
          <span className="sr-only">Colar código SVG</span>
          <textarea
            ref={pasteRef}
            className="mapa-facas-svg-input"
            value={value}
            disabled={disabled}
            onChange={(e) => {
              setFileMeta(null);
              setErro(null);
              onChange(e.target.value);
            }}
            onBlur={(e) => {
              const t = e.target.value.trim();
              if (t) applyImport(t, 'paste');
            }}
            onPaste={() => {
              window.setTimeout(() => {
                const t = pasteRef.current?.value.trim();
                if (t) applyImport(t, 'paste');
              }, 0);
            }}
            rows={4}
            placeholder="Cole o SVG de uma via exportado do Corel."
          />
        </label>
      ) : null}

      {erro ? <p className="contorno-svg-erro">{erro}</p> : null}
    </div>
  );
}
