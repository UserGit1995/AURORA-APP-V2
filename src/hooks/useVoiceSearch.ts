import { useEffect, useRef, useState } from "react";

export function useVoiceSearch(onResult: (text: string) => void) {
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  const isSupported =
    typeof window !== "undefined" && ("SpeechRecognition" in window || "webkitSpeechRecognition" in window);

  const playBeep = (freq: number, duration: number) => {
    try {
      const AudioCtx = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.12, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration + 0.01);
    } catch {
      // AudioContext non disponibile o bloccato: non blocchiamo la ricerca vocale per questo
    }
  };

  const stop = () => {
    try {
      recognitionRef.current?.stop();
    } catch {
      // già fermato
    }
    setIsListening(false);
  };

  const start = () => {
    setError(null);
    if (!isSupported) {
      setError("Ricerca vocale non supportata da questo browser.");
      window.setTimeout(() => setError(null), 4000);
      return;
    }
    try {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();
      recognitionRef.current = recognition;
      recognition.lang = "it-IT";
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        setIsListening(true);
        playBeep(750, 0.12);
        if (navigator.vibrate) navigator.vibrate(60);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0]?.[0]?.transcript?.trim();
        if (transcript) {
          onResult(transcript);
          playBeep(950, 0.15);
        }
      };

      recognition.onerror = (event: any) => {
        setIsListening(false);
        if (event.error === "not-allowed" || event.error === "service-not-allowed") {
          setError("Accesso al microfono negato. Controlla i permessi del browser.");
        } else if (event.error === "no-speech") {
          setError("Nessun comando vocale rilevato. Riprova.");
        } else {
          setError("Errore nella ricerca vocale.");
        }
        window.setTimeout(() => setError(null), 4000);
      };

      recognition.onend = () => setIsListening(false);
      recognition.start();
    } catch {
      setIsListening(false);
      setError("Impossibile avviare la ricerca vocale.");
      window.setTimeout(() => setError(null), 4000);
    }
  };

  const toggle = () => (isListening ? stop() : start());

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.abort();
      } catch {
        // no-op
      }
    };
  }, []);

  return { isListening, isSupported, error, toggle };
}
