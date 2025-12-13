import { Virtuoso } from "react-virtuoso";
import { useUnit } from "effector-react";
import { useMemo } from "react";
import { Loader, Alert, Text, Stack, Center, Box } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { $cards, $isLoading, $error } from "@/entities/cards";
import { $columnsCount, $isLocalStorageLoaded } from "@/features/view-settings";
import { Card } from "@/entities/cards/ui/Card";

export function CardsGrid() {
  const { t } = useTranslation();
  const [cards, isLoading, error, columnsCount, isLocalStorageLoaded] = useUnit(
    [$cards, $isLoading, $error, $columnsCount, $isLocalStorageLoaded]
  );

  const cardWidth = columnsCount === 3 ? 340 : columnsCount === 5 ? 280 : 240;
  const gap = columnsCount === 7 ? 12 : 16;
  const imageHeight = Math.round(cardWidth * 1.25);
  // Fixed card height to avoid layout shift. Keep it tight to reduce "dead space"
  // between meta row and tags when some fields are missing.
  const cardHeight = imageHeight + 128;

  // Разбиваем карточки на строки для виртуализации
  const rows = useMemo(() => {
    const result: Array<Array<(typeof cards)[0]>> = [];
    for (let i = 0; i < cards.length; i += columnsCount) {
      result.push(cards.slice(i, i + columnsCount));
    }
    return result;
  }, [cards, columnsCount]);

  if (!isLocalStorageLoaded) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>{t("grid.loadingSettings")}</Text>
        </Stack>
      </Center>
    );
  }

  if (isLoading) {
    return (
      <Center h="50vh">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>{t("grid.loadingCards")}</Text>
        </Stack>
      </Center>
    );
  }

  if (error) {
    return (
      <Alert color="red" title={t("errors.generic")}>
        {error}
      </Alert>
    );
  }

  if (cards.length === 0) {
    return (
      <Center h="50vh">
        <Text c="dimmed" size="lg">
          {t("empty.notFoundCards")}
        </Text>
      </Center>
    );
  }

  return (
    <Box
      style={{
        display: "flex",
        justifyContent: "center",
        width: "100%",
      }}
    >
      <Virtuoso
        style={{ width: "100%" }}
        totalCount={rows.length}
        overscan={7}
        useWindowScroll
        itemContent={(index) => {
          const row = rows[index];
          return (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: `repeat(${columnsCount}, ${cardWidth}px)`,
                gap: `${gap}px`,
                marginBottom: `${gap}px`,
                justifyContent: "center",
                ["--card-width" as any]: `${cardWidth}px`,
                ["--card-image-height" as any]: `${imageHeight}px`,
                ["--card-height" as any]: `${cardHeight}px`,
              }}
            >
              {row.map((card) => (
                <Card key={card.id} card={card} />
              ))}
              {/* Заполняем пустые ячейки в последней строке */}
              {row.length < columnsCount &&
                Array.from({ length: columnsCount - row.length }).map(
                  (_, i) => (
                    <div
                      key={`empty-${i}`}
                      style={{ width: `${cardWidth}px` }}
                    />
                  )
                )}
            </div>
          );
        }}
      />
    </Box>
  );
}
