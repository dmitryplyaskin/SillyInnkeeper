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
} from "@mantine/core";
import { useUnit } from "effector-react";
import type { CardListItem } from "@/shared/types/cards";
import { $isCensored } from "@/features/view-settings";

interface CardProps {
  card: CardListItem;
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

export function Card({ card }: CardProps) {
  const [isCensored] = useUnit([$isCensored]);
  const [opened, setOpened] = useState(false);

  const tags = card.tags ?? [];
  const visibleTags = tags.slice(0, 2);
  const hiddenTagsCount = Math.max(0, tags.length - visibleTags.length);
  const hiddenTags = hiddenTagsCount > 0 ? tags.slice(visibleTags.length) : [];

  const createdAtLabel = (() => {
    const t = Number((card as any).created_at);
    if (!Number.isFinite(t) || t <= 0) return null;
    return new Date(t).toLocaleDateString("ru-RU");
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
              alt={card.name || "Миниатюра карточки"}
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
            title="Открыть в полный экран"
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
            {card.name || "Без названия"}
          </Text>

          {card.creator && (
            <Text size="sm" c="dimmed" lineClamp={1}>
              Создатель: {card.creator}
            </Text>
          )}

          <Group gap={6} wrap="nowrap" style={{ overflow: "hidden" }}>
            {hasBook && (
              <Tooltip label="У карточки есть Character Book" withArrow>
                <Badge size="sm" color="gray" variant="light">
                  Book
                </Badge>
              </Tooltip>
            )}
            {greetingsCount > 0 && (
              <Tooltip label="Альтернативные приветствия (кол-во)" withArrow>
                <Badge size="sm" color="gray" variant="light">
                  G:{greetingsCount}
                </Badge>
              </Tooltip>
            )}
            <Tooltip label="Оценка токенов (примерно)" withArrow>
              <Badge size="sm" color="gray" variant="light">
                {tokensEstimate} tok
              </Badge>
            </Tooltip>
            {createdAtLabel && (
              <Tooltip label="Дата создания (по файлу)" withArrow>
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
        title={card.name || "Изображение карточки"}
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
            alt={card.name || "Изображение карточки"}
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
