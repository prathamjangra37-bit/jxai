import React, { useState, useEffect, useRef } from "react";
import { MarkdownView } from "./MarkdownView";

interface TypewriterViewProps {
  text: string;
  isStreaming: boolean;
  onTyped?: () => void;
}

export function TypewriterView({ text, isStreaming, onTyped }: TypewriterViewProps) {
  const [displayedText, setDisplayedText] = useState("");
  const textRef = useRef("");
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Sync displayedText if not streaming or if text changes/decreases dramatically
  useEffect(() => {
    if (!isStreaming) {
      setDisplayedText(text);
      textRef.current = text;
      if (onTyped) onTyped();
      return;
    }

    // If the streaming text is shorter than we have or reset, sync immediately
    if (text.length < textRef.current.length || !text.startsWith(textRef.current)) {
      setDisplayedText(text);
      textRef.current = text;
      if (onTyped) onTyped();
    }
  }, [text, isStreaming]);

  // Handle high-speed typing animation (3x speed boost)
  useEffect(() => {
    if (!isStreaming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    // Interval of 10ms for extremely fast performance
    intervalRef.current = setInterval(() => {
      const currentLen = textRef.current.length;
      const targetLen = text.length;

      if (currentLen < targetLen) {
        // Typing speed: 3x faster. Dynamically add more characters if the stream is far ahead
        const gap = targetLen - currentLen;
        const charsToAdd = gap > 20 ? 6 : (gap > 8 ? 3 : 1);
        const nextText = text.substring(0, currentLen + charsToAdd);
        textRef.current = nextText;
        setDisplayedText(nextText);
        if (onTyped) onTyped();
      } else if (!isStreaming) {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      }
    }, 10);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [text, isStreaming]);

  // Show 3 animated dots if waiting for first chunk of content
  if (isStreaming && !displayedText.trim()) {
    return (
      <div className="flex items-center gap-1.5 py-2">
        <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: "0ms" }} />
        <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
        <span className="w-2.5 h-2.5 rounded-full bg-blue-300 animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
    );
  }

  return (
    <div className="relative">
      <MarkdownView text={displayedText} />
      {isStreaming && (
        <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500/90 animate-pulse rounded-sm align-middle" />
      )}
    </div>
  );
}
