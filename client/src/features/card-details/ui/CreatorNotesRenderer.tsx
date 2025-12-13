import { useEffect, useMemo, useRef, useState } from "react";
import {
  Group,
  Paper,
  ScrollArea,
  SegmentedControl,
  Spoiler,
  Text,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import DOMPurify from "dompurify";

type Mode = "text" | "markdown" | "html";

function guessMode(value: string): Mode {
  const v = value.trim();
  if (v.length === 0) return "text";
  if (/<\w+[^>]*>/.test(v)) return "html";
  if (/^\s{0,3}#{1,6}\s|```|\*\*|\n-\s/m.test(v)) return "markdown";
  return "text";
}

function buildSandboxDoc(html: string): string {
  // Isolated from app styles; allow author CSS inside the iframe only.
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <base target="_blank" rel="noopener noreferrer" />
    <style>
      :root { color-scheme: light; }
      html, body { margin: 0; padding: 0; }
      body { font: 14px/1.55 system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; color: #111; }
      img, video { max-width: 100%; height: auto; }
      pre, code { white-space: pre-wrap; word-break: break-word; }
      a { color: #1c7ed6; }
    </style>
  </head>
  <body>
    ${html}
  </body>
</html>`;
}

export function CreatorNotesRenderer({
  value,
  defaultMaxHeight = 160,
}: {
  value: string | null | undefined;
  defaultMaxHeight?: number;
}) {
  const { t } = useTranslation();
  const raw = (value ?? "").toString();
  const [mode, setMode] = useState<Mode>(() => guessMode(raw));
  const [expanded, setExpanded] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [iframeContentHeight, setIframeContentHeight] = useState<number>(420);

  useEffect(() => {
    // When card changes, reset mode based on content.
    setMode(guessMode(raw));
    setExpanded(false);
  }, [raw]);

  const sanitizedHtmlDoc = useMemo(() => {
    // Allow author styles, but keep scripts/handlers out.
    const sanitized = DOMPurify.sanitize(raw, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["style"],
      ADD_ATTR: ["style", "target", "rel"],
    });
    return buildSandboxDoc(sanitized);
  }, [raw]);

  const isEmpty = raw.trim().length === 0;

  // Auto-size iframe to its content (works because we use srcDoc + allow-same-origin).
  useEffect(() => {
    if (mode !== "html") return;
    const iframe = iframeRef.current;
    if (!iframe) return;

    let ro: ResizeObserver | null = null;
    let raf = 0;

    const compute = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        try {
          const doc = iframe.contentDocument;
          const body = doc?.body;
          const root = doc?.documentElement;
          if (!body || !root) return;
          const h = Math.max(
            body.scrollHeight,
            body.offsetHeight,
            root.scrollHeight,
            root.offsetHeight
          );
          if (Number.isFinite(h) && h > 0) {
            setIframeContentHeight(Math.min(Math.max(120, h), 5000));
          }
        } catch {
          // ignore (shouldn't happen with allow-same-origin, but be safe)
        }
      });
    };

    const onLoad = () => {
      compute();
      try {
        const doc = iframe.contentDocument;
        const body = doc?.body;
        if (!body) return;
        ro = new ResizeObserver(() => compute());
        ro.observe(body);
      } catch {
        // ignore
      }
    };

    iframe.addEventListener("load", onLoad);
    // In case 'load' already fired (fast), compute anyway.
    compute();

    return () => {
      iframe.removeEventListener("load", onLoad);
      ro?.disconnect();
      ro = null;
      cancelAnimationFrame(raf);
    };
  }, [mode, sanitizedHtmlDoc]);

  const effectiveHeight = expanded
    ? iframeContentHeight
    : Math.min(iframeContentHeight, defaultMaxHeight);

  return (
    <Paper p="md" style={{ minHeight: 110 }}>
      <Group justify="space-between" align="center" mb={8} wrap="nowrap">
        <Text size="sm" fw={600}>
          {t("creatorNotes.title")}
        </Text>
        <SegmentedControl
          size="xs"
          value={mode}
          onChange={(v) => {
            setMode(v as Mode);
            setExpanded(false);
          }}
          data={[
            { label: t("creatorNotes.modeText"), value: "text" },
            { label: t("creatorNotes.modeMd"), value: "markdown" },
            { label: t("creatorNotes.modeHtml"), value: "html" },
          ]}
        />
      </Group>

      {isEmpty ? (
        <Text c="dimmed">{t("empty.dash")}</Text>
      ) : mode === "text" ? (
        <Spoiler
          maxHeight={defaultMaxHeight}
          showLabel={t("actions.show")}
          hideLabel={t("actions.hide")}
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <Text style={{ whiteSpace: "pre-wrap" }}>{raw}</Text>
        </Spoiler>
      ) : mode === "markdown" ? (
        <Spoiler
          maxHeight={defaultMaxHeight}
          showLabel={t("actions.show")}
          hideLabel={t("actions.hide")}
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <ScrollArea type="auto" offsetScrollbars>
            <div style={{ paddingRight: 8 }}>
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                components={{
                  a: ({ children, ...props }) => (
                    <a {...props} target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                  pre: ({ children, ...props }) => (
                    <pre {...props} style={{ whiteSpace: "pre-wrap" }}>
                      {children}
                    </pre>
                  ),
                }}
              >
                {raw}
              </ReactMarkdown>
            </div>
          </ScrollArea>
        </Spoiler>
      ) : (
        <Spoiler
          maxHeight={defaultMaxHeight}
          showLabel={t("actions.show")}
          hideLabel={t("actions.hide")}
          expanded={expanded}
          onExpandedChange={setExpanded}
        >
          <div style={{ borderRadius: 8, overflow: "hidden" }}>
            <iframe
              ref={iframeRef}
              title="creator-notes"
              srcDoc={sanitizedHtmlDoc}
              sandbox="allow-same-origin allow-popups"
              referrerPolicy="no-referrer"
              style={{
                width: "100%",
                height: effectiveHeight,
                border: "1px solid rgba(0,0,0,0.08)",
                borderRadius: 8,
                background: "#fff",
              }}
            />
          </div>
        </Spoiler>
      )}
    </Paper>
  );
}
