import { useEffect, useState } from "react";
import {
  AppShell,
  Box,
  Button,
  Container,
  Drawer,
  Group,
  Stack,
  Text,
  Title,
} from "@mantine/core";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { loadFromApiFx } from "@/features/view-settings";
import { ViewSettingsPanel } from "@/features/view-settings";
import { CardsGrid } from "@/features/cards-grid";
import { PathsSettingsModal } from "@/features/paths-settings";
import {
  CardsFiltersPanel,
  applyFilters,
  loadCardsFiltersFx,
} from "@/features/cards-filters";
import { CardDetailsDrawer } from "@/features/card-details";

export function HomePage() {
  const { t } = useTranslation();
  const [loadSettings, loadFilters, onApply] = useUnit([
    loadFromApiFx,
    loadCardsFiltersFx,
    applyFilters,
  ]);
  const [filtersOpened, setFiltersOpened] = useState(false);
  const [pathsOpened, setPathsOpened] = useState(false);

  useEffect(() => {
    loadSettings();
    loadFilters();
    onApply();
  }, [loadFilters, loadSettings, onApply]);

  return (
    <AppShell
      header={{ height: 76 }}
      padding="md"
      styles={{
        header: {
          backdropFilter: "blur(10px)",
          background: "rgba(255,255,255,0.85)",
        },
      }}
    >
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Stack gap={2}>
              <Title order={3} lh={1.1}>
                SillyInnkeeper
              </Title>
              <Text size="sm" c="dimmed" lh={1.1}>
                {t("home.subtitle")}
              </Text>
            </Stack>

            <Group gap="sm" style={{ flexShrink: 0 }}>
              <ViewSettingsPanel />
              <Button
                variant="light"
                onClick={() => setPathsOpened(true)}
                style={{ whiteSpace: "nowrap" }}
              >
                {t("home.settingsButton")}
              </Button>
              <Button
                variant="light"
                onClick={() => setFiltersOpened(true)}
                style={{ whiteSpace: "nowrap" }}
              >
                {t("home.filtersButton")}
              </Button>
            </Group>
          </Group>
        </Container>
      </AppShell.Header>

      <AppShell.Main>
        <Box style={{ width: "100%" }}>
          <CardsGrid />
        </Box>
      </AppShell.Main>

      <Drawer
        opened={filtersOpened}
        onClose={() => setFiltersOpened(false)}
        position="right"
        size="md"
        title={t("home.filtersDrawerTitle")}
      >
        <CardsFiltersPanel />
      </Drawer>

      <PathsSettingsModal
        opened={pathsOpened}
        onClose={() => setPathsOpened(false)}
      />

      <CardDetailsDrawer />
    </AppShell>
  );
}
