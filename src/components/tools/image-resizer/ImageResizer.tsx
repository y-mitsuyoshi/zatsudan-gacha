"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
} from "react";

type OutputFormat = "image/jpeg" | "image/png" | "image/webp";

const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
const ACCEPTED_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"] as const;
const ACCEPT_ATTRIBUTE = [...ACCEPTED_TYPES, ...ACCEPTED_EXTENSIONS].join(",");
const MAX_FILE_BYTES = 20 * 1024 * 1024;
const MAX_CANVAS_SIDE = 8192;
const MAX_CANVAS_PIXELS = 16_777_216;

const EXTENSION_TYPE: Record<string, OutputFormat> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

const OUTPUT_FORMATS: {
  value: OutputFormat;
  label: string;
  extension: string;
  hint: string;
}[] = [
  { value: "image/jpeg", label: "JPEG", extension: "jpg", hint: "写真向け。透過は白背景になります。" },
  { value: "image/png", label: "PNG", extension: "png", hint: "可逆圧縮。透過を保ったまま保存します。" },
  { value: "image/webp", label: "WebP", extension: "webp", hint: "高圧縮。透過にも対応します。" },
];

const FORMAT_LABEL: Record<OutputFormat, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

function normalizeImageType(value: string): OutputFormat | null {
  const type = value.split(";")[0].trim().toLowerCase();
  if (type === "image/jpeg" || type === "image/jpg" || type === "image/pjpeg") {
    return "image/jpeg";
  }
  if (type === "image/png") return "image/png";
  if (type === "image/webp") return "image/webp";
  return null;
}

function getFileExtension(name: string): string {
  const match = /\.([^./\\]+)$/.exec(name);
  return match ? match[1].toLowerCase() : "";
}

function getAcceptedImageType(file: File): OutputFormat | null {
  const declaredType = normalizeImageType(file.type);
  if (declaredType) return declaredType;

  const normalizedMime = file.type.split(";")[0].trim().toLowerCase();
  if (normalizedMime === "" || normalizedMime === "application/octet-stream") {
    return EXTENSION_TYPE[getFileExtension(file.name)] ?? null;
  }

  return null;
}

type SourceImage = {
  name: string;
  width: number;
  height: number;
  size: number;
  previewUrl: string;
};

type ResizeResult = {
  url: string;
  width: number;
  height: number;
  size: number;
  format: OutputFormat;
  filename: string;
  canvasLimited: boolean;
};

type TargetSize = {
  width: number;
  height: number;
  scale: number;
  canvasLimited: boolean;
};

function parseDimension(value: string): number | null {
  const trimmed = value.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const parsed = Number(trimmed);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_CANVAS_SIDE) {
    return null;
  }
  return parsed;
}

function calculateTargetSize(
  sourceWidth: number,
  sourceHeight: number,
  maxWidth: number,
  maxHeight: number,
): TargetSize {
  if (sourceWidth <= 0 || sourceHeight <= 0) {
    return { width: 0, height: 0, scale: 1, canvasLimited: false };
  }

  let scale = Math.min(1, maxWidth / sourceWidth, maxHeight / sourceHeight);
  let canvasLimited = false;

  const sideScale = Math.min(
    1,
    MAX_CANVAS_SIDE / (sourceWidth * scale),
    MAX_CANVAS_SIDE / (sourceHeight * scale),
  );
  if (sideScale < 1) {
    scale *= sideScale;
    canvasLimited = true;
  }

  const pixelScale = Math.min(
    1,
    Math.sqrt(MAX_CANVAS_PIXELS / (sourceWidth * sourceHeight * scale * scale)),
  );
  if (pixelScale < 1) {
    scale *= pixelScale;
    canvasLimited = true;
  }

  let width = Math.max(1, Math.round(sourceWidth * scale));
  let height = Math.max(1, Math.round(sourceHeight * scale));

  if (width * height > MAX_CANVAS_PIXELS) {
    const correction = Math.sqrt(MAX_CANVAS_PIXELS / (width * height));
    width = Math.max(1, Math.floor(width * correction));
    height = Math.max(1, Math.floor(height * correction));
    canvasLimited = true;
  }

  return { width, height, scale, canvasLimited };
}

function formatBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kilobytes = bytes / 1024;
  if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;
  return `${(kilobytes / 1024).toFixed(2)} MB`;
}

function buildOutputFilename(
  originalName: string,
  width: number,
  height: number,
  format: OutputFormat,
): string {
  const sanitized = originalName
    .replace(/\.[^./\\]+$/, "")
    .replace(
      /[\\/:*?"<>|\u0000-\u001f\u007f-\u009f\u202a-\u202e\u2066-\u2069]/g,
      "-",
    )
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^[-.]+|[-.]+$/g, "");
  const base =
    Array.from(sanitized)
      .slice(0, 80)
      .join("")
      .replace(/[-.]+$/g, "") || "image";
  const extension =
    OUTPUT_FORMATS.find((item) => item.value === format)?.extension ?? "jpg";
  return `${base}-${width}x${height}.${extension}`;
}

export function ImageResizer() {
  const [source, setSource] = useState<SourceImage | null>(null);
  const [maxWidthInput, setMaxWidthInput] = useState("1920");
  const [maxHeightInput, setMaxHeightInput] = useState("1920");
  const [format, setFormat] = useState<OutputFormat>("image/jpeg");
  const [quality, setQuality] = useState(85);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [fileError, setFileError] = useState("");
  const [actionError, setActionError] = useState("");
  const [status, setStatus] = useState("");
  const [result, setResult] = useState<ResizeResult | null>(null);

  const sourceImageRef = useRef<HTMLImageElement | null>(null);
  const outputUrlRef = useRef<string | null>(null);
  const readerRef = useRef<FileReader | null>(null);
  const requestIdRef = useRef(0);
  const mountedRef = useRef(true);
  const processingRef = useRef(false);

  const maxWidth = parseDimension(maxWidthInput);
  const maxHeight = parseDimension(maxHeightInput);
  const sizeValid = maxWidth !== null && maxHeight !== null;

  const target = useMemo(() => {
    if (!source || maxWidth === null || maxHeight === null) return null;
    return calculateTargetSize(source.width, source.height, maxWidth, maxHeight);
  }, [source, maxWidth, maxHeight]);

  const invalidateResult = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = null;
    }
    setResult(null);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      requestIdRef.current += 1;
      readerRef.current?.abort();
      readerRef.current = null;
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
        outputUrlRef.current = null;
      }
      sourceImageRef.current = null;
    };
  }, []);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    setFileError("");
    setActionError("");
    setStatus("");
    invalidateResult();

    if (!getAcceptedImageType(file)) {
      requestIdRef.current += 1;
      readerRef.current?.abort();
      readerRef.current = null;
      sourceImageRef.current = null;
      setSource(null);
      setIsLoading(false);
      setFileError("JPEG・PNG・WebP形式の画像を選択してください。");
      return;
    }

    if (file.size > MAX_FILE_BYTES) {
      requestIdRef.current += 1;
      readerRef.current?.abort();
      readerRef.current = null;
      sourceImageRef.current = null;
      setSource(null);
      setIsLoading(false);
      setFileError(
        `ファイルサイズが大きすぎます。20MB以下の画像を選択してください。（選択したファイル: ${formatBytes(file.size)}）`,
      );
      return;
    }

    if (file.size === 0) {
      requestIdRef.current += 1;
      readerRef.current?.abort();
      readerRef.current = null;
      sourceImageRef.current = null;
      setSource(null);
      setIsLoading(false);
      setFileError("空のファイルは読み込めません。別の画像を選択してください。");
      return;
    }

    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;
    readerRef.current?.abort();
    sourceImageRef.current = null;
    setSource(null);
    setIsLoading(true);
    setStatus("画像を読み込んでいます。");

    const reader = new FileReader();
    readerRef.current = reader;

    reader.onload = () => {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      const dataUrl = typeof reader.result === "string" ? reader.result : "";
      if (!dataUrl) {
        setIsLoading(false);
        setStatus("");
        setFileError("画像の読み込みに失敗しました。別のファイルを選択してください。");
        return;
      }

      const image = new Image();
      image.onload = () => {
        if (requestId !== requestIdRef.current || !mountedRef.current) return;
        if (!image.naturalWidth || !image.naturalHeight) {
          setIsLoading(false);
          setStatus("");
          setFileError("画像のサイズを取得できませんでした。別のファイルを選択してください。");
          return;
        }

        sourceImageRef.current = image;
        setSource({
          name: file.name,
          width: image.naturalWidth,
          height: image.naturalHeight,
          size: file.size,
          previewUrl: dataUrl,
        });
        setIsLoading(false);
        setStatus(
          `${file.name} を読み込みました。元のサイズは ${image.naturalWidth} × ${image.naturalHeight} ピクセルです。`,
        );
      };

      image.onerror = () => {
        if (requestId !== requestIdRef.current || !mountedRef.current) return;
        sourceImageRef.current = null;
        setIsLoading(false);
        setStatus("");
        setFileError(
          "画像をデコードできませんでした。ファイルが破損しているか、対応していない形式の可能性があります。",
        );
      };

      image.src = dataUrl;
    };

    reader.onerror = () => {
      if (requestId !== requestIdRef.current || !mountedRef.current) return;
      setIsLoading(false);
      setStatus("");
      setFileError("ファイルの読み込みに失敗しました。もう一度お試しください。");
    };

    try {
      reader.readAsDataURL(file);
    } catch {
      if (readerRef.current === reader) readerRef.current = null;
      setIsLoading(false);
      setStatus("");
      setFileError("ファイルの読み込みに失敗しました。もう一度お試しください。");
    }
  };

  const handleFormatChange = (nextFormat: OutputFormat) => {
    setFormat(nextFormat);
    setActionError("");
    invalidateResult();
  };

  const handleMaxWidthChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMaxWidthInput(event.target.value);
    setActionError("");
    invalidateResult();
  };

  const handleMaxHeightChange = (event: ChangeEvent<HTMLInputElement>) => {
    setMaxHeightInput(event.target.value);
    setActionError("");
    invalidateResult();
  };

  const handleQualityChange = (event: ChangeEvent<HTMLInputElement>) => {
    setQuality(Number(event.target.value));
    setActionError("");
    invalidateResult();
  };

  const handleResize = async () => {
    if (processingRef.current) return;

    const image = sourceImageRef.current;
    if (!image || !source) {
      setActionError("先に画像を選択してください。");
      return;
    }
    if (maxWidth === null || maxHeight === null) {
      setActionError("最大幅と最大高さは1〜8192の整数で入力してください。");
      return;
    }

    const planned = calculateTargetSize(
      source.width,
      source.height,
      maxWidth,
      maxHeight,
    );
    if (!planned.width || !planned.height) {
      setActionError("出力サイズを計算できませんでした。入力値を確認してください。");
      return;
    }

    processingRef.current = true;
    const runId = requestIdRef.current;
    setActionError("");
    setIsProcessing(true);
    setStatus("画像を処理しています。");

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => resolve());
      });

      if (!mountedRef.current || runId !== requestIdRef.current) return;

      const canvas = document.createElement("canvas");
      canvas.width = planned.width;
      canvas.height = planned.height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("canvas-unavailable");

      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";

      if (format === "image/jpeg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, planned.width, planned.height);
      }

      context.drawImage(image, 0, 0, planned.width, planned.height);

      const lossyQuality =
        format === "image/png"
          ? undefined
          : Math.min(1, Math.max(0.1, quality / 100));

      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob(resolve, format, lossyQuality);
      });

      canvas.width = 0;
      canvas.height = 0;

      if (!mountedRef.current || runId !== requestIdRef.current) return;
      if (!blob || blob.size === 0) throw new Error("encode-failed");
      if (normalizeImageType(blob.type) !== format) {
        throw new Error("format-unsupported");
      }

      const url = URL.createObjectURL(blob);
      if (outputUrlRef.current) {
        URL.revokeObjectURL(outputUrlRef.current);
      }
      outputUrlRef.current = url;

      const filename = buildOutputFilename(
        source.name,
        planned.width,
        planned.height,
        format,
      );

      setResult({
        url,
        width: planned.width,
        height: planned.height,
        size: blob.size,
        format,
        filename,
        canvasLimited: planned.canvasLimited,
      });
      setStatus(
        `処理が完了しました。${planned.width} × ${planned.height} ピクセル、${formatBytes(blob.size)} の画像をダウンロードできます。`,
      );
    } catch (error) {
      if (!mountedRef.current) return;
      const message = error instanceof Error ? error.message : "";
      if (message === "canvas-unavailable") {
        setActionError(
          "Canvasを初期化できませんでした。ブラウザを再読み込みして再度お試しください。",
        );
      } else if (message === "format-unsupported") {
        setActionError(
          "このブラウザは選択した出力形式に対応していません。JPEGまたはPNGを選んでください。",
        );
      } else {
        setActionError(
          "画像の書き出しに失敗しました。ファイルサイズを小さくするか、別の形式を選んでお試しください。",
        );
      }
      setStatus("");
    } finally {
      processingRef.current = false;
      if (mountedRef.current) setIsProcessing(false);
    }
  };

  const busy = isLoading || isProcessing;
  const selectedFormatHint =
    OUTPUT_FORMATS.find((item) => item.value === format)?.hint ?? "";
  const sizeRatio =
    result && source && source.size > 0
      ? Math.round((result.size / source.size) * 100)
      : null;

  return (
    <div className="min-w-0">
      <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">
        {status}
      </p>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <section
          className="paper-panel min-w-0 p-4 sm:p-5"
          aria-labelledby="image-upload-heading"
        >
          <p className="font-label text-[9px] text-[var(--accent)]">Step 01</p>
          <h2
            id="image-upload-heading"
            className="font-editorial mt-1 text-lg sm:text-xl"
          >
            画像を選ぶ
          </h2>
          <p className="mt-2 text-xs leading-6 text-[var(--ink-soft)]">
            JPEG・PNG・WebPに対応。1ファイル20MBまでです。
          </p>

          <div className="mt-4 rounded-sm border border-dashed border-[var(--line-strong)] bg-[var(--paper)] p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold text-[var(--ink)]">
                  端末の画像を選択
                </p>
                <p
                  id="file-help"
                  className="mt-1 text-xs leading-6 text-[var(--ink-soft)]"
                >
                  選択した画像はこのブラウザ内だけで処理されます。
                </p>
              </div>
              <div className="shrink-0">
                <input
                  id="image-file"
                  type="file"
                  accept={ACCEPT_ATTRIBUTE}
                  onChange={handleFileChange}
                  disabled={busy}
                  aria-describedby={`file-help${fileError ? " file-error" : ""}`}
                  className="peer sr-only"
                />
                <label
                  htmlFor="image-file"
                  className={`paper-button w-full rounded-sm px-4 py-2.5 text-xs peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] sm:w-auto ${
                    busy ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }`}
                >
                  {isLoading ? "読み込み中…" : "画像を選択"}
                </label>
              </div>
            </div>
          </div>

          {fileError && (
            <p
              id="file-error"
              role="alert"
              className="mt-3 rounded-sm border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs leading-6 text-[var(--accent)]"
            >
              {fileError}
            </p>
          )}

          {source && (
            <div className="mt-4 grid gap-3 sm:grid-cols-[112px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--paper)]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={source.previewUrl}
                  alt={`選択した画像 ${source.name} のプレビュー`}
                  className="h-24 w-full object-contain sm:h-28"
                />
              </div>
              <dl className="min-w-0 text-xs leading-6">
                <div className="flex items-start justify-between gap-3">
                  <dt className="shrink-0 text-[var(--ink-soft)]">ファイル名</dt>
                  <dd className="min-w-0 truncate text-right font-medium" title={source.name}>
                    {source.name}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[var(--line)]">
                  <dt className="text-[var(--ink-soft)]">元のサイズ</dt>
                  <dd className="font-medium">
                    {source.width} × {source.height} px
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3 border-t border-[var(--line)]">
                  <dt className="text-[var(--ink-soft)]">ファイルサイズ</dt>
                  <dd className="font-medium">{formatBytes(source.size)}</dd>
                </div>
              </dl>
            </div>
          )}
        </section>

        <section
          className="paper-panel min-w-0 p-4 sm:p-5"
          aria-labelledby="image-settings-heading"
        >
          <p className="font-label text-[9px] text-[var(--accent)]">Step 02</p>
          <h2
            id="image-settings-heading"
            className="font-editorial mt-1 text-lg sm:text-xl"
          >
            サイズと形式を決める
          </h2>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="min-w-0">
              <label htmlFor="max-width" className="text-xs font-bold text-[var(--ink)]">
                最大幅 <span className="font-normal text-[var(--ink-soft)]">px</span>
              </label>
              <input
                id="max-width"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CANVAS_SIDE}
                step={1}
                value={maxWidthInput}
                onChange={handleMaxWidthChange}
                disabled={isProcessing}
                aria-invalid={maxWidth === null}
                aria-describedby={`size-help${maxWidth === null ? " size-error" : ""}`}
                className="field-paper mt-1.5 rounded-sm px-3 py-2 text-sm"
              />
            </div>
            <div className="min-w-0">
              <label htmlFor="max-height" className="text-xs font-bold text-[var(--ink)]">
                最大高さ <span className="font-normal text-[var(--ink-soft)]">px</span>
              </label>
              <input
                id="max-height"
                type="number"
                inputMode="numeric"
                min={1}
                max={MAX_CANVAS_SIDE}
                step={1}
                value={maxHeightInput}
                onChange={handleMaxHeightChange}
                disabled={isProcessing}
                aria-invalid={maxHeight === null}
                aria-describedby={`size-help${maxHeight === null ? " size-error" : ""}`}
                className="field-paper mt-1.5 rounded-sm px-3 py-2 text-sm"
              />
            </div>
          </div>

          <p id="size-help" className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
            縦横比を保ったまま、指定した範囲に収まるサイズへ縮小します（拡大はしません）。1〜{MAX_CANVAS_SIDE}の整数で入力してください。
          </p>
          {(maxWidth === null || maxHeight === null) && (
            <p id="size-error" role="alert" className="mt-1 text-[11px] leading-5 text-[var(--accent)]">
              最大幅・最大高さは1〜{MAX_CANVAS_SIDE}の整数で入力してください。
            </p>
          )}

          <fieldset className="mt-4" aria-describedby="format-hint">
            <legend className="text-xs font-bold text-[var(--ink)]">出力形式</legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {OUTPUT_FORMATS.map((item) => {
                const selected = format === item.value;
                return (
                  <div key={item.value}>
                    <input
                      id={`format-${item.extension}`}
                      type="radio"
                      name="output-format"
                      value={item.value}
                      checked={selected}
                      onChange={() => handleFormatChange(item.value)}
                      disabled={isProcessing}
                      className="peer sr-only"
                    />
                    <label
                      htmlFor={`format-${item.extension}`}
                      className={`${
                        selected ? "paper-chip paper-chip-active" : "paper-chip"
                      } flex w-full cursor-pointer items-center justify-center rounded-sm px-2 py-2 text-xs font-bold peer-focus-visible:outline peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--accent)] ${
                        isProcessing ? "pointer-events-none opacity-50" : ""
                      }`}
                    >
                      {item.label}
                    </label>
                  </div>
                );
              })}
            </div>
            <p id="format-hint" className="mt-2 text-[11px] leading-5 text-[var(--ink-soft)]">
              {selectedFormatHint}
            </p>
          </fieldset>

          {format !== "image/png" ? (
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3">
                <label htmlFor="quality" className="text-xs font-bold text-[var(--ink)]">
                  品質
                </label>
                <output htmlFor="quality" className="font-label text-[10px] text-[var(--accent)]">
                  {quality}%
                </output>
              </div>
              <input
                id="quality"
                type="range"
                min={30}
                max={100}
                step={5}
                value={quality}
                onChange={handleQualityChange}
                disabled={isProcessing}
                aria-describedby="quality-help"
                className="mt-2 w-full accent-[var(--accent)]"
              />
              <p id="quality-help" className="text-[11px] leading-5 text-[var(--ink-soft)]">
                数値を下げるほどファイルサイズを小さくできます。品質と見た目のバランスを見ながら調整してください。
              </p>
            </div>
          ) : (
            <p id="quality-help" className="mt-4 text-[11px] leading-5 text-[var(--ink-soft)]">
              PNGは可逆圧縮のため、品質スライダーはありません。
            </p>
          )}

          {source && target && (
            <div className="mt-4 rounded-sm border border-[var(--line)] bg-[var(--paper)] px-3 py-2 text-xs leading-6">
              <p>
                <span className="font-bold">出力予定:</span> {target.width} ×{" "}
                {target.height} px（元の {Math.round(target.scale * 100)}%）
              </p>
              {target.canvasLimited && (
                <p className="mt-1 text-[var(--accent)]">
                  端末の描画上限に合わせて、最大 {MAX_CANVAS_SIDE}px・約
                  {Math.floor(MAX_CANVAS_PIXELS / 1_000_000)}MPに収まるサイズへ縮小します。
                </p>
              )}
              {target.scale === 1 && (
                <p className="mt-1 text-[var(--ink-soft)]">
                  元画像が指定サイズ内のため、原寸のまま出力します。
                </p>
              )}
            </div>
          )}

          <button
            type="button"
            onClick={handleResize}
            disabled={!source || !sizeValid || busy}
            aria-busy={isProcessing}
            className="paper-button-primary mt-4 w-full rounded-sm px-4 py-3 text-sm"
          >
            {isProcessing ? "処理中…" : "リサイズ・圧縮する"}
          </button>
        </section>
      </div>

      <section
        className="paper-panel-flat mt-5 min-w-0 p-4 sm:p-5"
        aria-labelledby="image-result-heading"
        aria-busy={isProcessing}
      >
        <p className="font-label text-[9px] text-[var(--accent)]">Step 03</p>
        <h2
          id="image-result-heading"
          className="font-editorial mt-1 text-lg sm:text-xl"
        >
          結果を確認して保存
        </h2>

        {actionError && (
          <p
            role="alert"
            className="mt-3 rounded-sm border border-[var(--accent)] bg-[var(--accent-soft)] px-3 py-2 text-xs leading-6 text-[var(--accent)]"
          >
            {actionError}
          </p>
        )}

        {result ? (
          <div className="mt-4 grid min-w-0 gap-4 md:grid-cols-[minmax(0,1fr)_220px] md:items-start">
            <div className="min-w-0">
              <dl className="grid grid-cols-2 gap-3 text-xs">
                <div className="min-w-0 rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3">
                  <dt className="text-[var(--ink-soft)]">出力サイズ</dt>
                  <dd className="font-editorial mt-1 text-base">
                    {result.width} × {result.height} px
                  </dd>
                </div>
                <div className="min-w-0 rounded-sm border border-[var(--line)] bg-[var(--paper)] p-3">
                  <dt className="text-[var(--ink-soft)]">ファイルサイズ</dt>
                  <dd className="font-editorial mt-1 text-base">
                    {formatBytes(result.size)}
                  </dd>
                  {sizeRatio !== null && (
                    <dd className="mt-0.5 text-[10px] text-[var(--ink-soft)]">
                      元画像の {sizeRatio}%
                    </dd>
                  )}
                </div>
              </dl>

              <p className="mt-2 break-words text-[11px] leading-5 text-[var(--ink-soft)]">
                形式: {FORMAT_LABEL[result.format]} / ファイル名: {result.filename}
              </p>

              {sizeRatio !== null && sizeRatio > 100 && (
                <p className="mt-1 text-[11px] leading-5 text-[var(--accent)]">
                  設定により元画像より大きくなっています。品質を下げるか、WebPを選ぶと軽くなる場合があります。
                </p>
              )}
              {result.canvasLimited && (
                <p className="mt-1 text-[11px] leading-5 text-[var(--accent)]">
                  端末の描画上限に合わせて、出力サイズを自動調整しました。
                </p>
              )}

              <a
                href={result.url}
                download={result.filename}
                className="paper-button-primary mt-4 w-full rounded-sm px-4 py-3 text-sm sm:w-auto"
              >
                リサイズ後の画像をダウンロード
              </a>
            </div>

            <div className="order-first min-w-0 overflow-hidden rounded-sm border border-[var(--line)] bg-[var(--paper)] md:order-last">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={result.url}
                alt="リサイズ・圧縮後の画像プレビュー"
                className="max-h-52 w-full object-contain"
              />
            </div>
          </div>
        ) : (
          !actionError && (
            <p className="mt-3 text-sm leading-7 text-[var(--ink-soft)]">
              設定を決めて「リサイズ・圧縮する」を押すと、ここに出力サイズとファイルサイズ、ダウンロードボタンが表示されます。
            </p>
          )
        )}

        <div className="mt-5 border-t border-[var(--line)] pt-4 text-xs leading-6 text-[var(--ink-soft)]">
          <p className="font-bold text-[var(--ink)]">
            メタデータは出力時に削除されます
          </p>
          <p className="mt-1">
            Canvasに描き直して再エンコードするため、撮影日時・GPS位置情報・カメラ機種などのExif情報は出力画像に含まれません。画像はサーバーへ送信されず、ブラウザ内だけで処理されます。
          </p>
        </div>
      </section>
    </div>
  );
}
