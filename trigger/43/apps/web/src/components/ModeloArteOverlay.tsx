import {
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ChangeEvent,
  type DragEvent,
  type KeyboardEvent,
} from 'react';
import { createPortal } from 'react-dom';
import { api, getToken, getEmpresaId } from '../lib/api';
import { isSaidaEtiqueta } from '../lib/saidaEtiqueta';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';

type Props = {
  open: boolean;
  onClose: () => void;
  titulo: string;
  arteUrl: string | null | undefined;
  /** Eco discreto do item (Medida). Ausente = overlay inalterado. */
  caption?: string | null;
  /** Código da saída na bobina — desenho canônico + rótulo. */
  saidaEtiqueta?: string | null;
  editable?: boolean;
  onChange?: (next: { arte_url: string | null; preview_url?: string | null }) => void;
};

function isHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function isInternalRef(value: string): boolean {
  return value.startsWith('orc-arte:');
}

function isPublicArtePath(value: string): boolean {
  return value.includes('/publico/orcamentos/') && value.includes('/arte/');
}

function isAuthArtePath(value: string): boolean {
  return (
    value.startsWith('/api/v1/orc-arte-modelos/') || value.startsWith('/orc-arte-modelos/')
  );
}

function parseInternalRef(ref: string): { empresa: number; arquivo: string } | null {
  const m = /^orc-arte:(\d+)\/([0-9a-f-]+\.(?:svg|png|jpe?g|webp))$/i.exec(ref.trim());
  if (!m) return null;
  return { empresa: Number(m[1]), arquivo: m[2].toLowerCase() };
}

function looksLikeSvg(url: string, contentType?: string | null): boolean {
  if (/\.svg(\?|#|$)/i.test(url) || url.includes('image/svg')) return true;
  if ((contentType ?? '').includes('svg')) return true;
  return false;
}

/** Remove scripts / handlers; SVG de arte comercial (Corel etc.). */
function sanitizeSvgMarkup(raw: string): string {
  let s = raw.replace(/<!DOCTYPE[^>]*>/gi, '');
  s = s.replace(/<\?xml[^>]*\?>/gi, '');
  s = s.replace(/<script[\s\S]*?<\/script>/gi, '');
  s = s.replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '');
  s = s.replace(/javascript:/gi, '');
  return s.trim();
}

function authFetchHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    Accept: 'image/svg+xml,image/*,application/octet-stream,*/*',
  };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  const emp = getEmpresaId();
  if (emp) headers['X-Empresa-Id'] = String(emp);
  return headers;
}

function toFetchUrl(pathOrUrl: string): string {
  if (isHttpUrl(pathOrUrl) || pathOrUrl.startsWith('/api/')) return pathOrUrl;
  if (pathOrUrl.startsWith('/')) return `/api/v1${pathOrUrl}`;
  return `/api/v1/${pathOrUrl}`;
}

type ResolvedArte =
  | { kind: 'svg'; markup: string }
  | { kind: 'raster'; src: string; revoke: boolean };

async function resolveArte(url: string | null | undefined): Promise<ResolvedArte | null> {
  const raw = (url ?? '').trim();
  if (!raw) return null;

  let fetchUrl: string | null = null;
  let skipAuth = false;

  if (isHttpUrl(raw) || isPublicArtePath(raw)) {
    fetchUrl = raw.startsWith('/') ? raw : raw;
    skipAuth = isPublicArtePath(raw) || isHttpUrl(raw);
  } else if (isInternalRef(raw)) {
    const parsed = parseInternalRef(raw);
    if (!parsed) return null;
    fetchUrl = `/api/v1/orc-arte-modelos/${parsed.empresa}/${parsed.arquivo}`;
  } else if (isAuthArtePath(raw)) {
    fetchUrl = toFetchUrl(raw);
  } else {
    return null;
  }

  const response = await fetch(toFetchUrl(fetchUrl), {
    headers: skipAuth ? { Accept: '*/*' } : authFetchHeaders(),
  });
  if (!response.ok) throw new Error(`Erro ${response.status}`);

  const ctype = response.headers.get('content-type');
  const isSvg = looksLikeSvg(fetchUrl, ctype) || looksLikeSvg(raw, ctype);

  if (isSvg) {
    const text = await response.text();
    if (!text.toLowerCase().includes('<svg')) {
      const blob = new Blob([text], { type: ctype ?? 'image/svg+xml' });
      return { kind: 'raster', src: URL.createObjectURL(blob), revoke: true };
    }
    return { kind: 'svg', markup: sanitizeSvgMarkup(text) };
  }

  const blob = await response.blob();
  return { kind: 'raster', src: URL.createObjectURL(blob), revoke: true };
}

function contentBBox(svg: SVGSVGElement): { x: number; y: number; width: number; height: number } | null {
  const vb = svg.viewBox.baseVal;
  const pageW = vb && vb.width > 0 ? vb.width : 0;
  const pageH = vb && vb.height > 0 ? vb.height : 0;

  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  let found = false;

  // Ignora retângulos de fundo A4; une path/texto/etc. (arte real).
  const nodes = svg.querySelectorAll(
    'path, polygon, polyline, circle, ellipse, text, tspan, use, image',
  );
  nodes.forEach((node) => {
    if (!(node instanceof SVGGraphicsElement)) return;
    try {
      const b = node.getBBox();
      if (!(b.width > 0 && b.height > 0) || !Number.isFinite(b.x)) return;
      if (pageW > 0 && pageH > 0 && b.width >= pageW * 0.82 && b.height >= pageH * 0.82) {
        return;
      }
      found = true;
      minX = Math.min(minX, b.x);
      minY = Math.min(minY, b.y);
      maxX = Math.max(maxX, b.x + b.width);
      maxY = Math.max(maxY, b.y + b.height);
    } catch {
      // ignore
    }
  });

  if (found && maxX > minX && maxY > minY) {
    return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
  }

  try {
    const b = svg.getBBox();
    if (b.width > 0 && b.height > 0) {
      return { x: b.x, y: b.y, width: b.width, height: b.height };
    }
  } catch {
    // ignore
  }
  return null;
}

function fitSvgToContent(svg: SVGSVGElement): void {
  const bbox = contentBBox(svg);
  if (bbox) {
    const pad = Math.max(bbox.width, bbox.height) * 0.08;
    svg.setAttribute(
      'viewBox',
      `${bbox.x - pad} ${bbox.y - pad} ${bbox.width + 2 * pad} ${bbox.height + 2 * pad}`,
    );
  }
  svg.removeAttribute('width');
  svg.removeAttribute('height');
  svg.style.width = '100%';
  svg.style.height = '100%';
  svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');
}

const ZOOM_STEPS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4];

export function ModeloArteOverlay({
  open,
  onClose,
  titulo,
  arteUrl,
  caption,
  saidaEtiqueta,
  editable = false,
  onChange,
}: Props) {
  const [rasterSrc, setRasterSrc] = useState<string | null>(null);
  const [svgMarkup, setSvgMarkup] = useState<string | null>(null);
  const [zoom, setZoom] = useState(1);
  const [busy, setBusy] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const captionId = useId();
  const captionText = (caption ?? '').trim();
  const saidaOk = isSaidaEtiqueta(saidaEtiqueta);
  const hasCaption = Boolean(captionText || saidaOk);
  const blobRef = useRef<string | null>(null);
  const svgHostRef = useRef<HTMLDivElement>(null);

  const clearBlob = () => {
    if (blobRef.current) {
      URL.revokeObjectURL(blobRef.current);
      blobRef.current = null;
    }
  };

  const resolvePreview = useCallback(async (url: string | null | undefined) => {
    clearBlob();
    setRasterSrc(null);
    setSvgMarkup(null);
    setZoom(1);
    try {
      const resolved = await resolveArte(url);
      if (!resolved) return;
      if (resolved.kind === 'svg') {
        setSvgMarkup(resolved.markup);
      } else {
        if (resolved.revoke) blobRef.current = resolved.src;
        setRasterSrc(resolved.src);
      }
    } catch {
      setRasterSrc(null);
      setSvgMarkup(null);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    setErro(null);
    void resolvePreview(arteUrl);
    queueMicrotask(() => closeRef.current?.focus());
    return () => clearBlob();
  }, [open, arteUrl, resolvePreview]);

  useLayoutEffect(() => {
    if (!open || !svgMarkup || !svgHostRef.current) return;
    const host = svgHostRef.current;
    host.innerHTML = svgMarkup;
    const svg = host.querySelector('svg');
    if (!(svg instanceof SVGSVGElement)) return;
    // Dois frames: layout + bbox estável (Corel / A4).
    requestAnimationFrame(() => {
      fitSvgToContent(svg);
      requestAnimationFrame(() => fitSvgToContent(svg));
    });
  }, [open, svgMarkup]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
      if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        setZoom((z) => ZOOM_STEPS.find((s) => s > z + 0.01) ?? z);
      }
      if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01) ?? z);
      }
    };
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  const uploadFile = async (file: File) => {
    if (!editable || !onChange) return;
    setBusy(true);
    setErro(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await api.postForm<{
        data: { arte_url: string; preview_url: string };
      }>('/orc-arte-modelos', fd);
      onChange({ arte_url: res.data.arte_url, preview_url: res.data.preview_url });
      await resolvePreview(res.data.arte_url);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao enviar a arte.');
    } finally {
      setBusy(false);
    }
  };

  const onFileInput = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (file) void uploadFile(file);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) void uploadFile(file);
  };

  const limpar = () => {
    if (!editable || !onChange) return;
    clearBlob();
    setRasterSrc(null);
    setSvgMarkup(null);
    onChange({ arte_url: null, preview_url: null });
  };

  const zoomIn = () => setZoom((z) => ZOOM_STEPS.find((s) => s > z + 0.01) ?? z);
  const zoomOut = () =>
    setZoom((z) => [...ZOOM_STEPS].reverse().find((s) => s < z - 0.01) ?? z);
  const zoomReset = () => setZoom(1);

  const hasPreview = Boolean(svgMarkup || rasterSrc);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="modelo-arte-preview"
      role="dialog"
      aria-modal="true"
      aria-labelledby={titleId}
      aria-describedby={hasCaption ? captionId : undefined}
    >
      <button
        type="button"
        className="modelo-arte-preview__backdrop"
        aria-label="Fechar"
        onClick={onClose}
      />
      <div className="modelo-arte-preview__panel">
        <div className="modelo-arte-preview__head">
          <div className="modelo-arte-preview__title">
            <h2 id={titleId}>{titulo.trim() || 'Arte do modelo'}</h2>
            {hasCaption ? (
              <div id={captionId} className="form-hint modelo-arte-preview__caption">
                {captionText ? <span>{captionText}</span> : null}
                {saidaOk ? (
                  <SaidaEtiquetaBadge
                    code={saidaEtiqueta}
                    variant="dense"
                    className="modelo-arte-preview__saida"
                  />
                ) : null}
              </div>
            ) : null}
          </div>
          <div className="modelo-arte-preview__zoom">
            <button type="button" className="btn btn-ghost" onClick={zoomOut} title="Diminuir">
              −
            </button>
            <button
              type="button"
              className="btn btn-ghost modelo-arte-preview__zoom-val"
              onClick={zoomReset}
              title="Ajustar à arte"
            >
              {Math.round(zoom * 100)}%
            </button>
            <button type="button" className="btn btn-ghost" onClick={zoomIn} title="Ampliar">
              +
            </button>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="btn btn-ghost modelo-arte-preview__close"
            onClick={onClose}
          >
            Fechar
          </button>
        </div>

        <div className="modelo-arte-preview__body">
          {hasPreview ? (
            <div className="modelo-arte-preview__frame">
              <div
                className="modelo-arte-preview__stage"
                style={{ transform: `scale(${zoom})` }}
              >
                {svgMarkup ? (
                  <div ref={svgHostRef} className="modelo-arte-preview__svg-host" />
                ) : (
                  <img
                    src={rasterSrc!}
                    alt={titulo.trim() || 'Arte do modelo'}
                    className="modelo-arte-preview__img"
                  />
                )}
              </div>
            </div>
          ) : (
            <div
              className={`modelo-arte-preview__empty${dragOver ? ' is-drag' : ''}${
                editable ? ' is-editable' : ''
              }`}
              onDragOver={
                editable
                  ? (e) => {
                      e.preventDefault();
                      setDragOver(true);
                    }
                  : undefined
              }
              onDragLeave={editable ? () => setDragOver(false) : undefined}
              onDrop={editable ? onDrop : undefined}
            >
              {editable
                ? 'Arraste um SVG/PNG aqui ou use Buscar arquivo'
                : 'Sem arte anexada neste modelo'}
            </div>
          )}

          {editable ? (
            <div
              className={`modelo-arte-preview__drop${dragOver ? ' is-drag' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                setDragOver(true);
              }}
              onDragLeave={() => setDragOver(false)}
              onDrop={onDrop}
            >
              <input
                ref={fileRef}
                type="file"
                accept=".svg,.png,.jpg,.jpeg,.webp,image/svg+xml,image/png,image/jpeg,image/webp"
                className="sr-only"
                onChange={onFileInput}
              />
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => fileRef.current?.click()}
              >
                {busy ? 'Enviando…' : 'Buscar arquivo'}
              </button>
              {hasPreview ? (
                <button type="button" className="btn btn-ghost" disabled={busy} onClick={limpar}>
                  Remover arte
                </button>
              ) : null}
              <p className="form-hint modelo-arte-preview__hint">
                SVG, PNG, JPG ou WebP · até 2&nbsp;MB · opcional · use +/− para zoom
              </p>
            </div>
          ) : null}

          {erro ? <p className="form-error">{erro}</p> : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

type TriggerProps = {
  nome: string;
  arteUrl: string | null | undefined;
  previewSrc?: string | null;
  caption?: string | null;
  saidaEtiqueta?: string | null;
  editable?: boolean;
  onChange?: (next: { arte_url: string | null }) => void;
  dense?: boolean;
};

async function resolveThumbSrc(url: string): Promise<{ src: string | null; revoke: boolean }> {
  const raw = url.trim();
  if (!raw) return { src: null, revoke: false };
  if (isHttpUrl(raw) || isPublicArtePath(raw)) {
    return { src: raw, revoke: false };
  }
  try {
    const resolved = await resolveArte(raw);
    if (!resolved) return { src: null, revoke: false };
    if (resolved.kind === 'raster') {
      return { src: resolved.src, revoke: resolved.revoke };
    }
    // Thumb SVG: blob a partir do markup (miniatura simples).
    const blob = new Blob([resolved.markup], { type: 'image/svg+xml' });
    return { src: URL.createObjectURL(blob), revoke: true };
  } catch {
    return { src: null, revoke: false };
  }
}

export function ModeloArteTrigger({
  nome,
  arteUrl,
  previewSrc: previewSrcProp,
  caption,
  saidaEtiqueta,
  editable = false,
  onChange,
  dense = false,
}: TriggerProps) {
  const [open, setOpen] = useState(false);
  const [thumb, setThumb] = useState<string | null>(null);
  const blobRef = useRef<string | null>(null);
  const hasArt = Boolean((arteUrl ?? '').trim() || (previewSrcProp ?? '').trim());

  useEffect(() => {
    let cancelled = false;
    const clear = () => {
      if (blobRef.current) {
        URL.revokeObjectURL(blobRef.current);
        blobRef.current = null;
      }
    };
    clear();
    const source = (previewSrcProp ?? arteUrl ?? '').trim();
    if (!source) {
      setThumb(null);
      return;
    }
    void resolveThumbSrc(source).then(({ src, revoke }) => {
      if (cancelled) {
        if (revoke && src) URL.revokeObjectURL(src);
        return;
      }
      if (revoke && src) blobRef.current = src;
      setThumb(src);
    });
    return () => {
      cancelled = true;
      clear();
    };
  }, [arteUrl, previewSrcProp]);

  const onTriggerKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setOpen(true);
    }
  };

  const label = hasArt
    ? `Ver arte: ${nome || 'modelo'}`
    : editable
      ? `Anexar arte: ${nome || 'modelo'}`
      : `Sem arte: ${nome || 'modelo'}`;

  return (
    <>
      <button
        type="button"
        className={`modelo-arte-trigger${dense ? ' modelo-arte-trigger--dense' : ''}${
          hasArt ? ' has-art' : ''
        }`}
        onClick={() => setOpen(true)}
        onKeyDown={onTriggerKey}
        title={hasArt ? 'Ampliar arte' : editable ? 'Anexar arte' : 'Sem arte'}
        aria-label={label}
      >
        {thumb ? (
          <img src={thumb} alt="" className="modelo-arte-trigger__img" />
        ) : (
          <span className="modelo-arte-trigger__placeholder" aria-hidden>
            {editable ? '+' : '·'}
          </span>
        )}
      </button>
      <ModeloArteOverlay
        open={open}
        onClose={() => setOpen(false)}
        titulo={nome}
        arteUrl={arteUrl || previewSrcProp}
        caption={caption}
        saidaEtiqueta={saidaEtiqueta}
        editable={editable}
        onChange={
          onChange
            ? (next) => {
                onChange({ arte_url: next.arte_url });
              }
            : undefined
        }
      />
    </>
  );
}
