import { useCallback, useEffect, useRef, useState } from "react";
const MAX_SSH_TRANSCRIPT_CHARS = 200_000;
const TRANSCRIPT_FLUSH_MS = 120;
const TRANSCRIPT_PERSIST_MS = 180;

export function sshTerminalWorkspaceKey(siteId: string | null) {
  return ["sites", "ssh-terminal-workspace", siteId] as const;
}

export function useSiteSshTerminalWorkspace(siteId: string | null) {
  const [keepConnected, setKeepConnectedState] = useState(() =>
    loadKeepConnectedPreference(siteId),
  );
  const [restoredTranscript, setRestoredTranscript] = useState(() =>
    loadTranscript(siteId),
  );
  const pendingTranscriptRef = useRef("");
  const flushTimerRef = useRef<number | null>(null);
  const persistTimerRef = useRef<number | null>(null);
  const transcriptRef = useRef(restoredTranscript);
  const keepConnectedRef = useRef(keepConnected);

  const flushTranscript = useCallback(() => {
    if (!siteId) {
      pendingTranscriptRef.current = "";
      return;
    }

    const chunk = pendingTranscriptRef.current;
    if (chunk.length === 0) {
      return;
    }

    pendingTranscriptRef.current = "";
    transcriptRef.current = normalizeTranscript(`${transcriptRef.current}${chunk}`);
    if (!keepConnectedRef.current) {
      return;
    }
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
    }
    persistTimerRef.current = window.setTimeout(() => {
      persistTimerRef.current = null;
      saveTranscript(siteId, transcriptRef.current);
    }, TRANSCRIPT_PERSIST_MS);
  }, [siteId]);

  const scheduleTranscriptFlush = useCallback(() => {
    if (flushTimerRef.current !== null) {
      return;
    }

    flushTimerRef.current = window.setTimeout(() => {
      flushTimerRef.current = null;
      flushTranscript();
    }, TRANSCRIPT_FLUSH_MS);
  }, [flushTranscript]);

  const appendTranscript = useCallback(
    (chunk: string) => {
      if (chunk.length === 0) {
        return;
      }

      pendingTranscriptRef.current = `${pendingTranscriptRef.current}${chunk}`;
      if (pendingTranscriptRef.current.length >= 16_384) {
        if (flushTimerRef.current !== null) {
          window.clearTimeout(flushTimerRef.current);
          flushTimerRef.current = null;
        }
        flushTranscript();
        return;
      }

      scheduleTranscriptFlush();
    },
    [flushTranscript, scheduleTranscriptFlush],
  );

  const clearTranscript = useCallback(() => {
    pendingTranscriptRef.current = "";
    transcriptRef.current = "";
    setRestoredTranscript("");
    if (!siteId) {
      return;
    }
    if (persistTimerRef.current !== null) {
      window.clearTimeout(persistTimerRef.current);
      persistTimerRef.current = null;
    }
    clearTranscriptStorage(siteId);
  }, [siteId]);

  const setKeepConnected = useCallback(
    (value: boolean) => {
      keepConnectedRef.current = value;
      setKeepConnectedState(value);
      if (!siteId) {
        return;
      }
      saveKeepConnectedPreference(siteId, value);
      if (!value) {
        if (persistTimerRef.current !== null) {
          window.clearTimeout(persistTimerRef.current);
          persistTimerRef.current = null;
        }
        clearTranscriptStorage(siteId);
      } else {
        saveTranscript(siteId, transcriptRef.current);
      }
    },
    [siteId],
  );

  useEffect(
    () => () => {
      if (flushTimerRef.current !== null) {
        window.clearTimeout(flushTimerRef.current);
        flushTimerRef.current = null;
      }
      if (persistTimerRef.current !== null) {
        window.clearTimeout(persistTimerRef.current);
        persistTimerRef.current = null;
      }
      flushTranscript();
      if (siteId && keepConnectedRef.current) {
        saveTranscript(siteId, transcriptRef.current);
      }
    },
    [flushTranscript, siteId],
  );

  return {
    keepConnected,
    transcript: restoredTranscript,
    appendTranscript,
    clearTranscript,
    setKeepConnected,
  };
}

function storageKey(siteId: string) {
  return `g5-admin:ssh-terminal-workspace:${siteId}:keep-connected`;
}

function transcriptStorageKey(siteId: string) {
  return `g5-admin:ssh-terminal-workspace:${siteId}:transcript`;
}

function loadKeepConnectedPreference(siteId: string | null) {
  if (typeof window === "undefined" || siteId === null) {
    return false;
  }

  return window.localStorage.getItem(storageKey(siteId)) === "true";
}

function saveKeepConnectedPreference(siteId: string, keepConnected: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(storageKey(siteId), keepConnected ? "true" : "false");
}

function loadTranscript(siteId: string | null) {
  if (typeof window === "undefined" || siteId === null) {
    return "";
  }

  if (!loadKeepConnectedPreference(siteId)) {
    return "";
  }

  return normalizeTranscript(
    window.localStorage.getItem(transcriptStorageKey(siteId)) ?? "",
  );
}

function saveTranscript(siteId: string, transcript: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(
    transcriptStorageKey(siteId),
    normalizeTranscript(transcript),
  );
}

function clearTranscriptStorage(siteId: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(transcriptStorageKey(siteId));
}

function normalizeTranscript(transcript: string) {
  if (transcript.length <= MAX_SSH_TRANSCRIPT_CHARS) {
    return transcript;
  }

  return transcript.slice(-MAX_SSH_TRANSCRIPT_CHARS);
}
