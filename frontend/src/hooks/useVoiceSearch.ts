/**
 * useVoiceSearch — Web Speech API hook for Tamil + English voice search
 *
 * Uses the browser's SpeechRecognition API (Chrome/Edge).
 * Supports: en-IN (English India) and ta-IN (Tamil).
 * Falls back gracefully on unsupported browsers.
 */

import { useState, useCallback, useRef, useEffect } from "react";

export type VoiceLang = "en-IN" | "ta-IN";

interface UseVoiceSearchReturn {
  /** Whether the browser supports speech recognition */
  isSupported: boolean;
  /** Whether currently listening for speech */
  isListening: boolean;
  /** Interim text while user speaks */
  interimText: string;
  /** Final recognized text */
  transcript: string;
  /** Current language */
  lang: VoiceLang;
  /** Toggle language between en-IN / ta-IN */
  toggleLang: () => void;
  /** Set language directly */
  setLang: (lang: VoiceLang) => void;
  /** Start listening */
  startListening: () => void;
  /** Stop listening */
  stopListening: () => void;
  /** Error message if any */
  error: string | null;
}

// Get the SpeechRecognition constructor (vendor-prefixed in most browsers)
const SpeechRecognition =
  typeof window !== "undefined"
    ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    : null;

export function useVoiceSearch(
  onResult?: (text: string) => void
): UseVoiceSearchReturn {
  const [isSupported] = useState(() => !!SpeechRecognition);
  const [isListening, setIsListening] = useState(false);
  const [interimText, setInterimText] = useState("");
  const [transcript, setTranscript] = useState("");
  const [lang, setLangState] = useState<VoiceLang>("en-IN");
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const onResultRef = useRef(onResult);

  // Keep callback ref up to date
  useEffect(() => {
    onResultRef.current = onResult;
  }, [onResult]);

  const createRecognition = useCallback(
    (language: VoiceLang) => {
      if (!SpeechRecognition) return null;

      const recognition = new SpeechRecognition();
      recognition.lang = language;
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
        setInterimText("");
      };

      recognition.onresult = (event: any) => {
        let interim = "";
        let final = "";

        for (let i = event.resultIndex; i < event.results.length; i++) {
          const result = event.results[i];
          if (result.isFinal) {
            final += result[0].transcript;
          } else {
            interim += result[0].transcript;
          }
        }

        if (interim) {
          setInterimText(interim);
        }

        if (final) {
          const cleaned = final.trim();
          setTranscript(cleaned);
          setInterimText("");
          onResultRef.current?.(cleaned);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        setInterimText("");

        switch (event.error) {
          case "no-speech":
            setError("No speech detected. Try again.");
            break;
          case "audio-capture":
            setError("Microphone not found.");
            break;
          case "not-allowed":
            setError("Microphone permission denied.");
            break;
          case "aborted":
            // User cancelled — no error needed
            break;
          default:
            setError("Voice recognition error. Try again.");
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      return recognition;
    },
    []
  );

  const startListening = useCallback(() => {
    if (!SpeechRecognition) {
      setError("Voice search not supported in this browser.");
      return;
    }

    // Stop any existing recognition
    if (recognitionRef.current) {
      try {
        recognitionRef.current.abort();
      } catch {}
    }

    setError(null);
    setInterimText("");
    setTranscript("");

    const recognition = createRecognition(lang);
    if (!recognition) return;

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (err) {
      setError("Could not start voice recognition.");
    }
  }, [lang, createRecognition]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch {}
    }
    setIsListening(false);
    setInterimText("");
  }, []);

  const toggleLang = useCallback(() => {
    setLangState((prev) => (prev === "en-IN" ? "ta-IN" : "en-IN"));
  }, []);

  const setLang = useCallback((newLang: VoiceLang) => {
    setLangState(newLang);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.abort();
        } catch {}
      }
    };
  }, []);

  return {
    isSupported,
    isListening,
    interimText,
    transcript,
    lang,
    toggleLang,
    setLang,
    startListening,
    stopListening,
    error,
  };
}
