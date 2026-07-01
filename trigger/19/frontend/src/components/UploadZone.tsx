import { CheckCircle2, FileSpreadsheet, Loader2 } from "lucide-react";
import { ImportResult } from "../api";

interface Props {
  isUploading: boolean;
  result?: ImportResult;
  error?: string;
}

export function UploadZone({ isUploading, result, error }: Props) {
  if (!isUploading && !result && !error) return null;

  return (
    <div className="mb-6">
      {isUploading && (
        <div className="flex items-center gap-3 rounded-2xl border border-accent/20 bg-accent/10 px-5 py-4 text-accent-glow">
          <Loader2 className="animate-spin" size={18} />
          Processando arquivo B3...
        </div>
      )}

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-4 text-red-200">
          {error}
        </div>
      )}

      {result && !isUploading && (
        <div className="flex flex-wrap items-center gap-4 rounded-2xl border border-accent/20 bg-surface-800 px-5 py-4">
          <CheckCircle2 className="text-accent" size={20} />
          <div className="flex items-center gap-2 text-sm text-slate-300">
            <FileSpreadsheet size={16} />
            <span>
              {result.imported === 0 && result.duplicates > 0 ? (
                <>
                  Nenhuma movimentação nova —{" "}
                  <strong className="text-white">{result.duplicates}</strong>{" "}
                  já existiam na base
                </>
              ) : (
                <>
                  <strong className="text-white">{result.imported}</strong> novas
                  movimentações ·{" "}
                  <strong className="text-white">{result.duplicates}</strong>{" "}
                  duplicadas ignoradas
                </>
              )}{" "}
              ·{" "}
              <strong className="text-white">{result.tickers.length}</strong>{" "}
              tickers identificados
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
