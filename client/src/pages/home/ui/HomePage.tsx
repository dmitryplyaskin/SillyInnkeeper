import { useEffect, useState } from "react";
import {
  AppShell,
  Badge,
  Box,
  ActionIcon,
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
import {
  $colorScheme,
  cycleColorScheme,
  ViewSettingsPanel,
} from "@/features/view-settings";
import { CardsGrid } from "@/features/cards-grid";
import { PathsSettingsModal } from "@/features/paths-settings";
import {
  CardsFiltersPanel,
  applyFilters,
  loadCardsFiltersFx,
} from "@/features/cards-filters";
import { CardDetailsDrawer } from "@/features/card-details";

function SunIcon() {
  return (
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
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2" />
      <path d="M12 20v2" />
      <path d="m4.93 4.93 1.41 1.41" />
      <path d="m17.66 17.66 1.41 1.41" />
      <path d="M2 12h2" />
      <path d="M20 12h2" />
      <path d="m6.34 17.66-1.41 1.41" />
      <path d="m19.07 4.93-1.41 1.41" />
    </svg>
  );
}

function MoonIcon() {
  return (
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
      <path d="M12 3a7 7 0 0 0 9 9 9 9 0 1 1-9-9z" />
    </svg>
  );
}

export function HomePage() {
  const { t } = useTranslation();
  const [loadFilters, onApply, colorScheme, cycleScheme] = useUnit([
    loadCardsFiltersFx,
    applyFilters,
    $colorScheme,
    cycleColorScheme,
  ]);
  const [filtersOpened, setFiltersOpened] = useState(false);
  const [pathsOpened, setPathsOpened] = useState(false);

  useEffect(() => {
    loadFilters();
    onApply();
  }, [loadFilters, onApply]);

  const schemeLabel =
    colorScheme === "light"
      ? t("theme.light")
      : colorScheme === "dark"
      ? t("theme.dark")
      : t("theme.auto");

  return (
    <AppShell
      header={{ height: 76 }}
      padding="md"
      styles={{
        header: {
          backdropFilter: "blur(10px)",
          backgroundColor: "var(--mantine-color-body)",
          borderBottom: "1px solid var(--mantine-color-default-border)",
        },
      }}
    >
      <AppShell.Header>
        <Container size="xl" h="100%">
          <Group justify="space-between" h="100%">
            <Stack gap={2}>
              <Group gap="xs" align="center">
                <Title order={3} lh={1.1}>
                  SillyInnkeeper
                </Title>
                <Badge size="sm" variant="light" c="dimmed">
                  v{__APP_VERSION__}
                </Badge>
              </Group>
              <Text size="sm" c="dimmed" lh={1.1}>
                {t("home.subtitle")}
              </Text>
            </Stack>

            <Group gap="sm" style={{ flexShrink: 0 }}>
              <ActionIcon
                variant="light"
                size="lg"
                onClick={() => cycleScheme()}
                aria-label={t("theme.cycleAria", { mode: schemeLabel })}
                title={t("theme.cycleTitle", { mode: schemeLabel })}
              >
                {colorScheme === "dark" ? (
                  <MoonIcon />
                ) : colorScheme === "light" ? (
                  <SunIcon />
                ) : (
                  <Text fw={800} size="sm">
                    A
                  </Text>
                )}
              </ActionIcon>
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
