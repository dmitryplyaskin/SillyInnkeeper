import { useUnit } from "effector-react";
import { Alert, Stack } from "@mantine/core";
import { useTranslation } from "react-i18next";
import { $filtersError } from "../model";
import { ActionsSection } from "./sections/ActionsSection";
import { SearchAndSortSection } from "./sections/SearchAndSortSection";
import { SourceSection } from "./sections/SourceSection";
import { HiddenSection } from "./sections/HiddenSection";
import { FavoritesSection } from "./sections/FavoritesSection";
import { TextSearchSection } from "./sections/TextSearchSection";
import { MetaSection } from "./sections/MetaSection";
import { CreatedAtSection } from "./sections/CreatedAtSection";
import { TokensSection } from "./sections/TokensSection";
import { AltGreetingsSection } from "./sections/AltGreetingsSection";
import { FieldsPresenceSection } from "./sections/FieldsPresenceSection";
import { ChatsSection } from "./sections/ChatsSection";

export function CardsFiltersPanel() {
  const { t } = useTranslation();
  const [filtersError] = useUnit([$filtersError]);

  return (
    <Stack gap="md">
      <ActionsSection />

      {filtersError && (
        <Alert color="red" title={t("errors.loadFiltersTitle")}>
          {filtersError}
        </Alert>
      )}

      <SearchAndSortSection />
      <SourceSection />
      <ChatsSection />
      <HiddenSection />
      <FavoritesSection />
      <TextSearchSection />
      <MetaSection />
      <CreatedAtSection />
      <TokensSection />
      <AltGreetingsSection />
      <FieldsPresenceSection />
    </Stack>
  );
}
