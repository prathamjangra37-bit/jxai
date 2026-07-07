import React, { useState } from "react";
import { Copy, Check } from "lucide-react";

interface MarkdownViewProps {
  text: string;
}

interface Block {
  type: "code" | "markdown";
  content: string;
  language?: string;
}

export function MarkdownView({ text }: MarkdownViewProps) {
  const blocks: Block[] = [];
  const lines = text.split("\n");
  
  let currentBlockType: "code" | "markdown" = "markdown";
  let currentContent: string[] = [];
  let currentLanguage = "";

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.trim().startsWith("```")) {
      // Toggle block type
      if (currentBlockType === "markdown") {
        if (currentContent.length > 0) {
          blocks.push({ type: "markdown", content: currentContent.join("\n") });
        }
        currentBlockType = "code";
        currentLanguage = line.trim().substring(3).trim();
        currentContent = [];
      } else {
        blocks.push({ type: "code", content: currentContent.join("\n"), language: currentLanguage || "code" });
        currentBlockType = "markdown";
        currentContent = [];
        currentLanguage = "";
      }
    } else {
      currentContent.push(line);
    }
  }

  if (currentContent.length > 0) {
    blocks.push({
      type: currentBlockType,
      content: currentContent.join("\n"),
      language: currentLanguage
    });
  }

  return (
    <div className="space-y-3">
      {blocks.map((block, bIdx) => {
        if (block.type === "code") {
          return <CodeBlock key={bIdx} code={block.content} language={block.language || "code"} />;
        }

        const blockLines = block.content.split("\n");
        return (
          <div key={bIdx} className="space-y-2 text-sm md:text-[15px] leading-relaxed text-zinc-300 font-sans">
            {blockLines.map((line, idx) => {
              const trimmed = line.trim();

              // Empty lines
              if (!trimmed) {
                return <div key={idx} className="h-1.5" />;
              }

              // Headers: ### Header
              if (trimmed.startsWith("###")) {
                const headerText = trimmed.replace(/^###\s*/, "");
                return (
                  <h4 key={idx} className="text-sm font-bold text-zinc-100 pt-3 pb-1 border-b border-zinc-800/60 font-display">
                    {parseInlineElements(headerText)}
                  </h4>
                );
              }
              if (trimmed.startsWith("##")) {
                const headerText = trimmed.replace(/^##\s*/, "");
                return (
                  <h3 key={idx} className="text-base font-bold text-zinc-50 pt-4 pb-1 border-b border-zinc-800 font-display">
                    {parseInlineElements(headerText)}
                  </h3>
                );
              }
              if (trimmed.startsWith("#")) {
                const headerText = trimmed.replace(/^#\s*/, "");
                return (
                  <h2 key={idx} className="text-lg font-black text-white pt-5 pb-2 border-b border-zinc-700 font-display">
                    {parseInlineElements(headerText)}
                  </h2>
                );
              }

              // Bullet lists: - item or * item
              if (trimmed.startsWith("-") || trimmed.startsWith("*")) {
                const content = trimmed.replace(/^[-*]\s*/, "");
                return (
                  <div key={idx} className="flex items-start gap-2 pl-2 my-1">
                    <span className="text-zinc-500 font-bold mt-1.5 text-[8px]">●</span>
                    <span className="flex-1 text-zinc-300">{parseInlineElements(content)}</span>
                  </div>
                );
              }

              // Numbered lists/steps: 1. item
              const numMatch = trimmed.match(/^(\d+)\.\s*(.*)/);
              if (numMatch) {
                const num = numMatch[1];
                const content = numMatch[2];
                return (
                  <div key={idx} className="flex items-start gap-3 pl-1 my-2 bg-zinc-900/40 p-3 rounded-xl border-l-4 border-zinc-700">
                    <span className="flex items-center justify-center bg-zinc-800 text-zinc-300 text-[10px] font-bold w-5 h-5 rounded-full shrink-0 font-display border border-zinc-700">
                      {num}
                    </span>
                    <span className="flex-1 text-zinc-200 font-medium">{parseInlineElements(content)}</span>
                  </div>
                );
              }

              // Regular line
              return (
                <p key={idx} className="text-zinc-300 leading-relaxed">
                  {parseInlineElements(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// Custom code block renderer with Copy button
interface CodeBlockProps {
  code: string;
  language: string;
  key?: React.Key;
}

function CodeBlock({ code, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-4 rounded-xl overflow-hidden border border-zinc-850 bg-[#0d0d0f] shadow-lg">
      <div className="flex items-center justify-between px-4 py-2 bg-[#141416] border-b border-zinc-850 text-xs font-mono text-zinc-400">
        <span className="text-zinc-500 font-semibold">{language || "code"}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 hover:text-white transition-all cursor-pointer bg-zinc-900/80 hover:bg-zinc-800 px-2.5 py-1 rounded-lg border border-zinc-800"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-zinc-300" />
              <span className="text-zinc-300 text-[11px] font-sans">Copied</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5 text-zinc-500" />
              <span className="text-zinc-400 text-[11px] font-sans">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-xs md:text-[13px] font-mono text-zinc-200 leading-relaxed bg-[#050507]">
        <code>{code}</code>
      </pre>
    </div>
  );
}

// Helper to parse inline bold, inline code, and markdown links
function parseInlineElements(text: string): React.ReactNode[] {
  // First, parse markdown links: [text](url)
  const linkRegex = /(\[[^\]]+\]\([^)]+\))/g;
  const parts = text.split(linkRegex);

  return parts.flatMap((part, i) => {
    if (part.match(/^\[[^\]]+\]\([^)]+\)$/)) {
      const match = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      if (match) {
        const linkText = match[1];
        const linkUrl = match[2];
        return (
          <a
            key={`a-${i}`}
            href={linkUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => {
              e.preventDefault();
              try {
                const win = window.open(linkUrl, "_blank", "noopener,noreferrer");
                if (win) win.focus();
              } catch (err) {
                console.error("Direct open failed:", err);
                // Fallback to simple link href
                window.open(linkUrl, "_blank");
              }
            }}
            className="text-blue-400 hover:text-blue-300 underline font-semibold transition-colors inline-flex items-center gap-0.5 cursor-pointer"
          >
            {parseBoldAndCode(linkText)}
          </a>
        );
      }
    }
    return parseBoldAndCode(part);
  });
}

function parseBoldAndCode(text: string): React.ReactNode[] {
  const parts = text.split(/(\*\*.*?\*\*)/);
  
  return parts.flatMap((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      const boldText = part.slice(2, -2);
      return <strong key={`b-${i}`} className="font-extrabold text-zinc-100">{parseInlineCode(boldText)}</strong>;
    }
    return parseInlineCode(part);
  });
}

function parseInlineCode(text: string): React.ReactNode[] {
  const parts = text.split(/(`.*?`)/);
  return parts.map((part, i) => {
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code key={`c-${i}`} className="bg-zinc-850 text-zinc-200 px-1.5 py-0.5 rounded font-mono text-xs border border-zinc-750">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}
