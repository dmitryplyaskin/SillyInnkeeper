import { useState } from "react";
import {
  Card as MantineCard,
  Image,
  Text,
  Stack,
  Group,
  Badge,
  Tooltip,
  Modal,
  ActionIcon,
  Box,
  useMantineTheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import type { CardListItem } from "@/shared/types/cards";

interface CardProps {
  card: CardListItem;
  isCensored: boolean;
  isSelectionMode?: boolean;
  isSelected?: boolean;
  onToggleSelected?: (id: string) => void;
  onOpen?: (id: string) => void;
}

function formatTokensEstimate(value: unknown): string {
  const n = typeof value === "number" && Number.isFinite(value) ? value : 0;
  if (n <= 0) return "≈ 0";

  if (n < 1000) {
    const rounded = Math.max(0, Math.round(n / 100) * 100);
    return `≈ ${rounded}`;
  }

  const k = n / 1000;
  const roundedK = Math.round(k * 10) / 10;
  const label = Number.isInteger(roundedK)
    ? String(roundedK)
    : String(roundedK).replace(/\.0$/, "");
  return `≈ ${label}k`;
}

export function Card({
  card,
  isCensored,
  isSelectionMode = false,
  isSelected = false,
  onToggleSelected,
  onOpen,
}: CardProps) {
  const { t, i18n } = useTranslation();
  const [opened, setOpened] = useState(false);
  const theme = useMantineTheme();

  const checkboxBg = isSelected ? theme.colors.blue[6] : "rgba(255,255,255,0.75)";
  const checkboxColor = isSelected ? theme.white : theme.colors.gray[7];

  const tags = card.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
  const hiddenTags = hiddenTagsCount > 0 ? tags.slice(visibleTags.length) : [];

  const createdAtLabel = (() => {
    const t = Number((card as any).created_at);
    if (!Number.isFinite(t) || t <= 0) return null;
    const locale = i18n.language === "ru" ? "ru-RU" : "en-US";
    return new Date(t).toLocaleDateString(locale);
  })();

  const greetingsCount = Number((card as any).alternate_greetings_count) || 0;
  const hasBook = Boolean((card as any).has_character_book);
  const tokensEstimate = formatTokensEstimate((card as any).prompt_tokens_est);

  return (
    <>
      <MantineCard
        padding="md"
        style={{
          width: "var(--card-width, 300px)",
          height: "var(--card-height, 520px)",
          display: "flex",
          flexDirection: "column",
          transition: "transform 160ms ease, box-shadow 160ms ease",
          overflow: "hidden",
          cursor: "pointer",
          border: isSelected
            ? `2px solid ${theme.colors.blue[6]}`
            : `1px solid var(--mantine-color-default-border)`,
          boxShadow: isSelected ? theme.shadows.md : undefined,
        }}
        role="button"
        tabIndex={0}
        onClick={() => {
          if (isSelectionMode) {
            onToggleSelected?.(card.id);
            return;
          }
          onOpen?.(card.id);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            if (isSelectionMode) {
              onToggleSelected?.(card.id);
              return;
            }
            onOpen?.(card.id);
          }
        }}
      >
        <MantineCard.Section style={{ position: "relative" }}>
          <Box
            style={{
              position: "relative",
              height: "var(--card-image-height, 320px)",
              overflow: "hidden",
            }}
          >
            <Image
              src={card.avatar_url}
              alt={card.name || t("card.thumbnailAltFallback")}
              fit="cover"
              loading="lazy"
              fallbackSrc="/favicon.svg"
              style={{
                height: "100%",
                width: "100%",
                filter: isCensored ? "blur(18px)" : "none",
                transition: "filter 0.3s ease",
              }}
            />
          </Box>

          {isSelectionMode && (
            <Box
              style={{
                position: "absolute",
                top: "8px",
                left: "8px",
                zIndex: 12,
                width: "22px",
                height: "22px",
                borderRadius: "999px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                border: `1px solid var(--mantine-color-default-border)`,
                background: checkboxBg,
                color: checkboxColor,
                backdropFilter: "blur(6px)",
              }}
              aria-hidden
            >
              {isSelected ? (
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M20 6 9 17l-5-5" />
                </svg>
              ) : null}
            </Box>
          )}

          <ActionIcon
            variant="light"
            size="lg"
            radius="md"
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              zIndex: 10,
              background: "rgba(255,255,255,0.75)",
              backdropFilter: "blur(6px)",
            }}
            onClick={(e) => {
              e.stopPropagation();
              setOpened(true);
            }}
            title={t("card.fullscreenTitle")}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" />
            </svg>
          </ActionIcon>
        </MantineCard.Section>

        <Stack gap={6} mt="sm" style={{ flex: 1, overflow: "hidden" }}>
          <Text fw={600} size="lg" lineClamp={1}>
            {card.name || t("card.untitled")}
          </Text>

          {card.creator && (
            <Text size="sm" c="dimmed" lineClamp={1}>
              {t("card.creatorPrefix", { creator: card.creator })}
            </Text>
          )}

          <Group gap={6} wrap="nowrap" style={{ overflow: "hidden" }}>
            {hasBook && (
              <Tooltip label={t("card.hasBook")} withArrow>
                <Badge size="sm" color="gray" variant="light">
                  Book
                </Badge>
              </Tooltip>
            )}
            {greetingsCount > 0 && (
              <Tooltip label={t("card.altGreetingsCount")} withArrow>
                <Badge size="sm" color="gray" variant="light">
                  G:{greetingsCount}
                </Badge>
              </Tooltip>
            )}
            <Tooltip label={t("card.tokensEstimateTip")} withArrow>
              <Badge size="sm" color="gray" variant="light">
                {tokensEstimate} tok
              </Badge>
            </Tooltip>
            {createdAtLabel && (
              <Tooltip label={t("card.createdAtTip")} withArrow>
                <Text size="xs" c="dimmed" style={{ whiteSpace: "nowrap" }}>
                  {createdAtLabel}
                </Text>
              </Tooltip>
            )}
          </Group>

          <Group gap={6} wrap="nowrap" style={{ overflow: "hidden" }}>
            {visibleTags.map((tag, idx) => (
              <Tooltip key={tag} label={tag} withArrow>
                <Badge
                  size="sm"
                  variant="light"
                  color={idx === 0 ? "indigo" : "blue"}
                  styles={{
                    label: {
                      maxWidth: 140,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    },
                  }}
                >
                  {tag}
                </Badge>
              </Tooltip>
            ))}
            {hiddenTagsCount > 0 && (
              <Tooltip
                label={hiddenTags.slice(0, 20).join(", ")}
                withArrow
                multiline
                maw={320}
              >
                <Badge size="sm" variant="light" color="gray">
                  +{hiddenTagsCount}
                </Badge>
              </Tooltip>
            )}
          </Group>
        </Stack>
      </MantineCard>

      <Modal
        opened={opened}
        onClose={() => setOpened(false)}
        size="xl"
        title={card.name || t("card.imageTitleFallback")}
      >
        <Box
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Image
            src={`/api/image/${card.id}`}
            alt={card.name || t("card.imageTitleFallback")}
            fit="contain"
            fallbackSrc="/favicon.svg"
            style={{
              maxWidth: "100%",
              maxHeight: "80vh",
              filter: isCensored ? "blur(12px)" : "none",
            }}
          />
        </Box>
      </Modal>
    </>
  );
}
