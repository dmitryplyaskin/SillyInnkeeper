import { useEffect, useState } from "react";
import { useUnit } from "effector-react";
import { useTranslation } from "react-i18next";
import { Grid, Title, Image, Modal } from "@mantine/core";
import { $details, $error, $isLoading, $openedId, closeCard } from "../model";
import { $isCensored } from "@/features/view-settings";
import { CardDetailsActionsPanel } from "./components/CardDetailsActionsPanel";
import { CardDetailsTabs } from "./components/CardDetailsTabs";

export function CardDetailsDrawer() {
  const { t } = useTranslation();
  const [openedId, details, isLoading, error, isCensored] = useUnit([
    $openedId,
    $details,
    $isLoading,
    $error,
    $isCensored,
  ]);

  const opened = Boolean(openedId);
  const [imgOpened, setImgOpened] = useState(false);

  const imageSrc = openedId ? `/api/image/${openedId}` : undefined;

  useEffect(() => {
    if (!opened) setImgOpened(false);
  }, [opened]);

  return (
    <>
      <Modal
        opened={opened}
        onClose={() => closeCard()}
        centered
        size={"100%"}
        xOffset={0}
        closeOnClickOutside={false}
        zIndex={200}
        overlayProps={{ zIndex: 199 }}
        title={
          <Title order={4} lineClamp={1}>
            {details?.name || t("cardDetails.detailsTitleFallback")}
          </Title>
        }
        styles={{
          content: {
            width: "100%",
            maxWidth: 1920,
            height: "100%",
          },
        }}
      >
        {opened ? (
          <Grid gutter="md" columns={24}>
            {/* Left pane */}
            <Grid.Col span={{ base: 24, md: 18, lg: 19 }}>
              <CardDetailsTabs
                openedId={openedId}
                details={details}
                isLoading={isLoading}
                error={error}
                isCensored={isCensored}
                imageSrc={imageSrc}
                onOpenImage={() => setImgOpened(true)}
              />
            </Grid.Col>

            {/* Right pane */}
            <Grid.Col span={{ base: 24, md: 6, lg: 5 }}>
              <CardDetailsActionsPanel details={details} />
            </Grid.Col>
          </Grid>
        ) : null}
      </Modal>

      <Modal
        opened={imgOpened}
        onClose={() => setImgOpened(false)}
        size="xl"
        zIndex={400}
        overlayProps={{ zIndex: 399 }}
        title={details?.name || t("cardDetails.imageAltFallback")}
      >
        <Image
          src={imageSrc}
          alt={details?.name || t("cardDetails.imageAltFallback")}
          fit="contain"
          fallbackSrc="/favicon.svg"
          style={{
            maxWidth: "100%",
            maxHeight: "80vh",
            filter: isCensored ? "blur(12px)" : "none",
          }}
        />
      </Modal>
    </>
  );
}
