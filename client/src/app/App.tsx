import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import {
  MantineProvider,
  Loader,
  Container,
  Center,
  Alert,
} from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { Suspense, lazy, useEffect } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { theme } from "@/theme";
import i18n from "@/shared/i18n/i18n";
import {
  $settings,
  $isLoading,
  $error,
  loadSettingsFx,
} from "@/entities/settings";

const PathsSetupScreen = lazy(() =>
  import("@/features/paths-settings").then((m) => ({
    default: m.PathsSetupScreen,
  }))
);
const HomePage = lazy(() =>
  import("@/pages/home").then((m) => ({ default: m.HomePage }))
);

function ChunkFallback() {
  return (
    <Center h="100vh">
      <Loader size="lg" />
    </Center>
  );
}

export default function App() {
  const [settings, isLoading, error] = useUnit([$settings, $isLoading, $error]);
  const { t } = useTranslation();

  useEffect(() => {
    loadSettingsFx();
  }, []);

  useEffect(() => {
    // Apply language from persisted settings only after first-run.
    // First-run screen manages language immediately from the form.
    if (!settings) return;
    if (settings.cardsFolderPath === null) return;
    if (i18n.language !== settings.language) {
      void i18n.changeLanguage(settings.language);
    }
  }, [settings?.language, settings?.cardsFolderPath]);

  useEffect(() => {
    let stop: (() => void) | undefined;
    void import("@/features/cards-live-sync").then((m) => {
      m.startLiveSync();
      stop = () => m.stopLiveSync();
    });

    return () => stop?.();
  }, []);

  // Показываем прелоадер при первой загрузке
  if (isLoading && settings === null) {
    return (
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <Center h="100vh">
          <Loader size="lg" />
        </Center>
      </MantineProvider>
    );
  }

  // Показываем ошибку загрузки
  if (error && settings === null) {
    return (
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <Container size="md" py="xl">
          <Alert color="red" title={t("errors.loadSettingsTitle")}>
            {error}
          </Alert>
        </Container>
      </MantineProvider>
    );
  }

  // Если cardsFolderPath не установлен, показываем форму настроек
  if (settings?.cardsFolderPath === null) {
    return (
      <MantineProvider theme={theme}>
        <Notifications position="top-right" />
        <Suspense fallback={<ChunkFallback />}>
          <PathsSetupScreen />
        </Suspense>
      </MantineProvider>
    );
  }

  // Иначе показываем главную страницу
  return (
    <MantineProvider theme={theme}>
      <Notifications position="top-right" />
      <Suspense fallback={<ChunkFallback />}>
        <HomePage />
      </Suspense>
    </MantineProvider>
  );
}
