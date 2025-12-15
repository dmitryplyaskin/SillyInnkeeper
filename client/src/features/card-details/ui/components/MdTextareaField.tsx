import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  ActionIcon,
  Group,
  Modal,
  Paper,
  SegmentedControl,
  Stack,
  Text,
  Textarea,
  Tooltip,
  type TextareaProps,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import ReactMarkdown from "react-markdown";
import { createPortal } from "react-dom";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import DOMPurify from "dompurify";

type Mode = "edit" | "preview";

function IframeMarkdownPreview({
  source,
  autoHeight,
  height,
}: {
  source: string;
  autoHeight: boolean;
  height?: string | number;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [mountNode, setMountNode] = useState<HTMLElement | null>(null);
  const [measuredHeight, setMeasuredHeight] = useState<number>(180);

  const ensureDoc = () => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc) return;

    if (!doc.documentElement) return;
    if (!doc.body) {
      doc.open();
      doc.write("<!doctype html><html><head></head><body></body></html>");
      doc.close();
    }

    // Base styles for readability; author's <style> can override.
    const baseStyleId = "__md_preview_base__";
    if (!doc.getElementById(baseStyleId)) {
      const style = doc.createElement("style");
      style.id = baseStyleId;
      style.textContent = `
        :root { color-scheme: light dark; }
        html, body { margin: 0; padding: 0; }
        body {
          padding: 12px;
          font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif;
          line-height: 1.5;
        }
        img { max-width: 100%; height: auto; }
        pre { white-space: pre-wrap; }
        code { white-space: pre-wrap; }
      `;
      doc.head.appendChild(style);
    }

    setMountNode(doc.body);
  };

  // Ensure iframe document exists and has base styles.
  useEffect(() => {
    ensureDoc();
  }, []);

  // Auto-height: track body size and resize iframe.
  useLayoutEffect(() => {
    if (!autoHeight) return;
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    const body = doc?.body;
    if (!iframe || !doc || !body) return;

    const measure = () => {
      // scrollHeight is the most stable for content height.
      const next = Math.max(120, body.scrollHeight);
      setMeasuredHeight(next);
    };

    measure();

    const ro = new ResizeObserver(() => measure());
    ro.observe(body);
    // Also observe documentElement to catch some layout cases.
    if (doc.documentElement) ro.observe(doc.documentElement);

    return () => ro.disconnect();
  }, [autoHeight, source]);

  return (
    <>
      <iframe
        ref={iframeRef}
        title="preview"
        sandbox="allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation"
        onLoad={() => ensureDoc()}
        style={{
          width: "100%",
          border: 0,
          display: "block",
          height: autoHeight ? measuredHeight : height ?? 520,
        }}
      />

      {mountNode
        ? createPortal(
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                a: ({ children, ...props }) => (
                  <a {...props} target="_blank" rel="noopener noreferrer">
                    {children}
                  </a>
                ),
                img: ({ ...props }) => (
                  <img
                    {...props}
                    style={{ maxWidth: "100%", height: "auto" }}
                    alt={(props as any).alt ?? ""}
                  />
                ),
                pre: ({ children, ...props }) => (
                  <pre {...props} style={{ whiteSpace: "pre-wrap" }}>
                    {children}
                  </pre>
                ),
              }}
            >
              {source}
            </ReactMarkdown>,
            mountNode
          )
        : null}
    </>
  );
}

export function MdTextareaField({
  label,
  value,
  onChange,
  placeholder,
  minRows = 6,
  resetKey,
  extraActions,
  textareaKey,
  textareaProps,
}: {
  label: string;
  value?: string;
  onChange?: (next: string) => void;
  placeholder?: string;
  minRows?: number;
  resetKey?: string | number;
  extraActions?: ReactNode;
  textareaKey?: string;
  textareaProps?: Omit<TextareaProps, "value" | "defaultValue" | "onChange"> & {
    value?: string;
    defaultValue?: string;
    onChange?: TextareaProps["onChange"];
  };
}) {
  const { t } = useTranslation();
  const [mode, setMode] = useState<Mode>("edit");
  const [collapsed, setCollapsed] = useState(false);
  const [modalOpened, setModalOpened] = useState(false);
  const mainRef = useRef<HTMLTextAreaElement | null>(null);
  const modalRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    setMode("edit");
    setCollapsed(false);
    setModalOpened(false);
  }, [resetKey]);

  const currentValue =
    (modalOpened ? modalRef.current?.value : mainRef.current?.value) ??
    mainRef.current?.value ??
    modalRef.current?.value ??
    textareaProps?.value ??
    textareaProps?.defaultValue ??
    value ??
    "";
  const isEmpty = currentValue.trim().length === 0;
  const collapsedPreviewText = useMemo(() => {
    if (isEmpty) return t("empty.dash");
    return currentValue.split("\n")[0]?.trim() || t("empty.dash");
  }, [currentValue, isEmpty, t]);

  // Разрешаем HTML в предпросмотре (часто встречается в карточках),
  // но обязательно санитизируем.
  const previewSource = useMemo(() => {
    // Важно: это тяжёлая операция. Не запускаем её в режиме edit.
    if (mode !== "preview") return "";
    // Если основной блок свернут (1 строка), предпросмотр не показываем,
    // но в модалке он должен работать.
    if (collapsed && !modalOpened) return "";
    if (isEmpty) return "";

    // Allow author styles, but keep scripts/handlers out.
    return DOMPurify.sanitize(currentValue, {
      USE_PROFILES: { html: true },
      ADD_TAGS: ["style", "img"],
      ADD_ATTR: [
        "style",
        "target",
        "rel",
        "src",
        "alt",
        "title",
        "width",
        "height",
        "loading",
      ],
    });
  }, [collapsed, currentValue, isEmpty, mode, modalOpened]);

  return (
    <>
      <Paper p="md" style={{ minHeight: 110 }}>
        <Group justify="space-between" align="center" mb={8} wrap="nowrap">
          <Text size="sm" fw={600}>
            {label}
          </Text>

          <Group gap={8} wrap="nowrap">
            {extraActions}
            <SegmentedControl
              size="xs"
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              data={[
                { label: t("cardDetails.edit"), value: "edit" },
                { label: t("cardDetails.preview"), value: "preview" },
              ]}
            />

            <Tooltip
              label={
                collapsed
                  ? t("cardDetails.expandOneLine")
                  : t("cardDetails.collapseOneLine")
              }
              withArrow
            >
              <ActionIcon
                variant="light"
                aria-label={
                  collapsed
                    ? t("cardDetails.expandOneLine")
                    : t("cardDetails.collapseOneLine")
                }
                onClick={() => setCollapsed((v) => !v)}
              >
                {collapsed ? (
                  // Chevron down (expand)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                ) : (
                  // Chevron up (collapse)
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M18 15l-6-6-6 6" />
                  </svg>
                )}
              </ActionIcon>
            </Tooltip>

            <Tooltip label={t("cardDetails.openInModal")} withArrow>
              <ActionIcon
                variant="light"
                aria-label={t("cardDetails.openInModal")}
                onClick={() => setModalOpened(true)}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M14 3h7v7" />
                  <path d="M10 14L21 3" />
                  <path d="M21 14v7h-7" />
                  <path d="M14 21L3 10" />
                  <path d="M3 14v7h7" />
                  <path d="M10 21L3 14" />
                  <path d="M3 10V3h7" />
                  <path d="M3 10l7-7" />
                </svg>
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {mode === "edit" ? (
          <Textarea
            key={textareaKey}
            ref={mainRef}
            placeholder={placeholder}
            autosize
            minRows={collapsed ? 1 : minRows}
            maxRows={collapsed ? 1 : 18}
            {...textareaProps}
            value={textareaProps?.value ?? value}
            defaultValue={textareaProps?.defaultValue}
            onChange={(e) => {
              textareaProps?.onChange?.(e);
              onChange?.(e.currentTarget.value);
            }}
          />
        ) : collapsed ? (
          <Text c={isEmpty ? "dimmed" : undefined} lineClamp={1}>
            {collapsedPreviewText}
          </Text>
        ) : (
          <div>
            {isEmpty ? (
              <Text c="dimmed">{t("empty.dash")}</Text>
            ) : (
              <IframeMarkdownPreview source={previewSource} autoHeight />
            )}
          </div>
        )}
      </Paper>

      <Modal
        opened={modalOpened}
        onClose={() => setModalOpened(false)}
        centered
        size={1024}
        styles={{
          content: {
            width: "70vw",
            maxWidth: 1024,
            height: "90vh",
            maxHeight: "90vh",
          },
          body: {
            height: "calc(90vh - 61px)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          },
        }}
        title={label}
      >
        <Stack gap="md" style={{ height: "100%", flex: 1, minHeight: 0 }}>
          <Group justify="space-between" align="center" wrap="nowrap">
            <Text size="sm" fw={600}>
              {label}
            </Text>
            <SegmentedControl
              size="sm"
              value={mode}
              onChange={(v) => setMode(v as Mode)}
              data={[
                { label: t("cardDetails.edit"), value: "edit" },
                { label: t("cardDetails.preview"), value: "preview" },
              ]}
            />
          </Group>

          {mode === "edit" ? (
            <Textarea
              key={textareaKey ? `${textareaKey}:modal` : undefined}
              ref={modalRef}
              placeholder={placeholder}
              autosize={false}
              style={{ flex: 1, minHeight: 0 }}
              styles={{
                input: { height: "100%", resize: "none" },
                wrapper: { height: "100%" },
              }}
              {...textareaProps}
              value={textareaProps?.value ?? value}
              defaultValue={textareaProps?.defaultValue}
              onChange={(e) => {
                textareaProps?.onChange?.(e);
                onChange?.(e.currentTarget.value);
              }}
            />
          ) : (
            <div style={{ flex: 1, minHeight: 0 }}>
              {isEmpty ? (
                <Text c="dimmed">{t("empty.dash")}</Text>
              ) : (
                <IframeMarkdownPreview
                  source={previewSource}
                  autoHeight={false}
                  height={"100%"}
                />
              )}
            </div>
          )}
        </Stack>
      </Modal>
    </>
  );
}
