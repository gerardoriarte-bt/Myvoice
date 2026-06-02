import { ChannelSpec } from "./types.js";
import { instagramPost } from "./specs/instagramPost.js";
import { instagramHistoria } from "./specs/instagramHistoria.js";
import { instagramCarrusel } from "./specs/instagramCarrusel.js";
import { instagramReel } from "./specs/instagramReel.js";
import { tiktok } from "./specs/tiktok.js";
import { youtube } from "./specs/youtube.js";
import { cunaRadio } from "./specs/cunaRadio.js";
import { googleAds } from "./specs/googleAds.js";
import { googleDisplay } from "./specs/googleDisplay.js";
import { richMedia } from "./specs/richMedia.js";
import { popUp } from "./specs/popUp.js";
import { pushNotification } from "./specs/pushNotification.js";
import { email } from "./specs/email.js";
import { whatsapp } from "./specs/whatsapp.js";

const ALL: ChannelSpec[] = [
  instagramPost,
  instagramHistoria,
  instagramCarrusel,
  instagramReel,
  tiktok,
  youtube,
  cunaRadio,
  googleAds,
  googleDisplay,
  richMedia,
  popUp,
  pushNotification,
  email,
  whatsapp,
];

export const CHANNEL_REGISTRY: Map<string, ChannelSpec> = new Map(
  ALL.map(c => [c.id, c])
);

export const getChannelSpec = (id: string): ChannelSpec | undefined =>
  CHANNEL_REGISTRY.get(id);

export const listChannels = (): ChannelSpec[] => ALL;
