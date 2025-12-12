import { createEvent, sample } from "effector";
import { createEventsClient, type EventsClient } from "@/shared/api/events";
import type { CardsResyncedEvent } from "@/shared/types/events";
import { applyFilters, loadCardsFiltersFx } from "@/features/cards-filters";
import { notifications } from "@mantine/notifications";

export const startLiveSync = createEvent<void>();
export const stopLiveSync = createEvent<void>();

const cardsResynced = createEvent<CardsResyncedEvent>();
const connected = createEvent<void>();

let client: EventsClient | null = null;

startLiveSync.watch(() => {
  if (client) return;
  client = createEventsClient({
    onHello: () => connected(),
    onResynced: (evt) => cardsResynced(evt),
    onError: () => {
      // браузер сам переподключается; лог/UX добавим позже при необходимости
    },
  });
});

stopLiveSync.watch(() => {
  client?.close();
  client = null;
});

// На resync: перезагружаем фильтры (опции) и карточки с текущими фильтрами
sample({
  clock: cardsResynced,
  target: loadCardsFiltersFx,
});

sample({
  clock: cardsResynced,
  target: applyFilters,
});

// При подключении: один раз синхронизируем UI (важно, если стартовый scan прошёл до подключения SSE)
sample({
  clock: connected,
  target: loadCardsFiltersFx,
});

sample({
  clock: connected,
  target: applyFilters,
});

cardsResynced.watch((evt) => {
  if (evt.addedCards <= 0 && evt.removedCards <= 0) return;
  notifications.show({
    title: "Данные обновлены",
    message: `+${evt.addedCards} / −${evt.removedCards}`,
  });
});

export const cardsResyncedEvent = cardsResynced;


