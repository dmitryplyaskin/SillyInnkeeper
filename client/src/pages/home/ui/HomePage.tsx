import { useState, useEffect } from "react";
import {
  Text,
  Stack,
  Card,
  List,
  Loader,
  Alert,
  Container,
  Image,
  Group,
} from "@mantine/core";
import { getCards } from "@/shared/api/cards";
import { getTags } from "@/shared/api/tags";
import type { CardListItem } from "@/shared/types/cards";
import type { Tag } from "@/shared/types/tags";

export function HomePage() {
  const [cards, setCards] = useState<CardListItem[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        setError(null);
        const [cardsData, tagsData] = await Promise.all([
          getCards(),
          getTags(),
        ]);
        setCards(cardsData);
        setTags(tagsData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Неизвестная ошибка");
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  if (loading) {
    return (
      <Container size="md" py="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Загрузка данных...</Text>
        </Stack>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="md" py="xl">
        <Alert color="red" title="Ошибка">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <Text size="xl" fw={500}>
          Карточки и теги
        </Text>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="lg" fw={500} mb="md">
            Карточки ({cards.length})
          </Text>
          {cards.length === 0 ? (
            <Text c="dimmed">Карточки не найдены</Text>
          ) : (
            <List>
              {cards.map((card) => (
                <List.Item key={card.id}>
                  <Group gap="md" align="flex-start">
                    <Image
                      src={card.avatar_url}
                      alt={card.name || "Миниатюра карточки"}
                      width={100}
                      height={100}
                      fit="cover"
                      radius="md"
                      onError={(e) => {
                        // Обработка ошибки загрузки изображения
                        const target = e.target as HTMLImageElement;
                        target.style.display = "none";
                      }}
                    />
                    <Stack gap="xs">
                      <Text fw={500}>{card.name || "Без названия"}</Text>
                      {card.creator && (
                        <Text size="sm" c="dimmed">
                          Создатель: {card.creator}
                        </Text>
                      )}
                      {card.tags && card.tags.length > 0 && (
                        <Text size="sm" c="dimmed">
                          Теги: {card.tags.join(", ")}
                        </Text>
                      )}
                    </Stack>
                  </Group>
                </List.Item>
              ))}
            </List>
          )}
        </Card>

        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Text size="lg" fw={500} mb="md">
            Теги ({tags.length})
          </Text>
          {tags.length === 0 ? (
            <Text c="dimmed">Теги не найдены</Text>
          ) : (
            <List>
              {tags.map((tag) => (
                <List.Item key={tag.id}>
                  <Text>{tag.name}</Text>
                  {tag.rawName !== tag.name && (
                    <Text size="sm" c="dimmed">
                      ({tag.rawName})
                    </Text>
                  )}
                </List.Item>
              ))}
            </List>
          )}
        </Card>
      </Stack>
    </Container>
  );
}
