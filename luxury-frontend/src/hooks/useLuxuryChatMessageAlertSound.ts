import { useEffect, useRef } from "react";
import { emitInAppSound } from "../lib/luxuryInAppSoundBus";

type UseLuxuryChatMessageAlertSoundOptions = {
  enabled: boolean;
  clientUnread: number;
  ownerUnread: number;
  /** Cliente B2C: suono su `clientUnread`. */
  playClientUnread: boolean;
  /** Titolare/staff salone: suono su `ownerUnread`. */
  playOwnerUnread: boolean;
};

/**
 * Suono chat da contatore unread (`GET /chat/unread-count`).
 * Messaggi nel thread aperto: `SalonLuxuryChatPage` via bus con dedupe per message id.
 */
export function useLuxuryChatMessageAlertSound({
  enabled,
  clientUnread,
  ownerUnread,
  playClientUnread,
  playOwnerUnread,
}: UseLuxuryChatMessageAlertSoundOptions): void {
  const baselinedRef = useRef(false);
  const prevClientUnreadRef = useRef(0);
  const prevOwnerUnreadRef = useRef(0);
  const playFlagsRef = useRef(`${playClientUnread}:${playOwnerUnread}`);

  useEffect(() => {
    const flags = `${playClientUnread}:${playOwnerUnread}`;
    if (playFlagsRef.current !== flags) {
      playFlagsRef.current = flags;
      baselinedRef.current = false;
    }
  }, [playClientUnread, playOwnerUnread]);

  useEffect(() => {
    if (!enabled) return;

    if (!baselinedRef.current) {
      prevClientUnreadRef.current = clientUnread;
      prevOwnerUnreadRef.current = ownerUnread;
      baselinedRef.current = true;
      return;
    }

    if (playClientUnread && clientUnread > prevClientUnreadRef.current) {
      emitInAppSound({
        kind: "chime",
        source: "chat",
        dedupeKey: `chat-unread:client:${clientUnread}`,
      });
    }

    if (playOwnerUnread && ownerUnread > prevOwnerUnreadRef.current) {
      emitInAppSound({
        kind: "chime",
        source: "chat",
        dedupeKey: `chat-unread:owner:${ownerUnread}`,
      });
    }

    prevClientUnreadRef.current = clientUnread;
    prevOwnerUnreadRef.current = ownerUnread;
  }, [clientUnread, enabled, ownerUnread, playClientUnread, playOwnerUnread]);
}
