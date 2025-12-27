import {
  ActionIcon,
  AppShell,
  Box,
  Divider,
  Paper,
  Group,
  NavLink,
  ScrollArea,
  Stack,
  Text,
  Tooltip,
} from "@mantine/core";
import { IconBraces, IconDownload, IconMenu2 } from "@tabler/icons-react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { openImportModal } from "@/features/cards-import";
import { openPatternRulesModal } from "@/features/pattern-rules";

export interface AppSidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
}

export function AppSidebar({ collapsed, onToggleCollapsed }: AppSidebarProps) {
  const { t } = useTranslation();
  const [openImport, openPatterns] = useUnit([
    openImportModal,
    openPatternRulesModal,
  ]);

  const rail = (
    <Stack gap="xs" align="center" py="xs">
      <Tooltip
        label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        withArrow
        position="right"
      >
        <ActionIcon
          variant="subtle"
          color="gray"
          onClick={onToggleCollapsed}
          aria-label={collapsed ? t("sidebar.expand") : t("sidebar.collapse")}
        >
          <IconMenu2 size={18} />
        </ActionIcon>
      </Tooltip>

      <Divider w="100%" my={2} />

      <Tooltip label={t("cardsImport.openTooltip")} withArrow position="right">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => openImport()}
          aria-label={t("cardsImport.openAria")}
        >
          <IconDownload size={18} />
        </ActionIcon>
      </Tooltip>

      <Tooltip label={t("patternRules.openTooltip")} withArrow position="right">
        <ActionIcon
          variant="subtle"
          color="gray"
          size="lg"
          onClick={() => openPatterns()}
          aria-label={t("patternRules.openAria")}
        >
          <IconBraces size={18} />
        </ActionIcon>
      </Tooltip>
    </Stack>
  );

  const expandedPanel = (
    <Paper
      radius={0}
      withBorder
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 300,
        zIndex: 50,
        borderTop: 0,
      }}
    >
      <Box p="xs">
        <Group justify="space-between" align="center" gap="xs">
          <Text fw={700} size="sm">
            {t("sidebar.title")}
          </Text>
          <Tooltip label={t("sidebar.collapse")} withArrow position="right">
            <ActionIcon
              variant="subtle"
              color="gray"
              onClick={onToggleCollapsed}
              aria-label={t("sidebar.collapse")}
            >
              <IconMenu2 size={18} />
            </ActionIcon>
          </Tooltip>
        </Group>
      </Box>

      <Divider />

      <ScrollArea scrollbarSize={6} style={{ height: "calc(100% - 49px)" }}>
        <Box p="xs" pt="sm">
          <Stack gap={4}>
            <NavLink
              leftSection={<IconDownload size={18} />}
              label={t("cardsImport.openTooltip")}
              description={t("sidebar.importDescription")}
              onClick={() => openImport()}
            />
            <NavLink
              leftSection={<IconBraces size={18} />}
              label={t("patternRules.openTooltip")}
              description={t("sidebar.patternsDescription")}
              onClick={() => openPatterns()}
            />
          </Stack>
        </Box>
      </ScrollArea>
    </Paper>
  );

  return (
    <AppShell.Navbar p={0} style={{ overflow: "visible" }}>
      <Box w={76}>{rail}</Box>
      {!collapsed ? expandedPanel : null}
    </AppShell.Navbar>
  );
}
