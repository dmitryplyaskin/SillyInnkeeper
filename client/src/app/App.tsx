import "@mantine/core/styles.css";
import {
  MantineProvider,
  Loader,
  Container,
  Center,
  Alert,
} from "@mantine/core";
import { useEffect } from "react";
import { useUnit } from "effector-react";
import { theme } from "@/theme";
import {
  $settings,
  $isLoading,
  $error,
  loadSettingsFx,
} from "@/entities/settings";
import { SettingsForm } from "@/features/settings-form";
import { HomePage } from "@/pages/home";

export default function App() {
  const [settings, isLoading, error] = useUnit([$settings, $isLoading, $error]);

  useEffect(() => {
    loadSettingsFx();
  }, []);

  // Показываем прелоадер при первой загрузке
  if (isLoading && settings === null) {
    return (
      <MantineProvider theme={theme}>
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
        <Container size="md" py="xl">
          <Alert color="red" title="Ошибка загрузки настроек">
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
        <Center h="100vh">
          <SettingsForm />
        </Center>
      </MantineProvider>
    );
  }

  // Иначе показываем главную страницу
  return (
    <MantineProvider theme={theme}>
      <HomePage />
    </MantineProvider>
  );
}
