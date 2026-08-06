import ReactMarkdown from "react-markdown";
import { cn } from "@/lib/utils";

// Adam's replies come back as markdown (**bold**, lists, etc.) — render it instead of
// showing the raw asterisks. Kept to a small, chat-bubble-appropriate element set rather than
// pulling in remark-gfm/tables/etc., which this UI has no room to display well anyway.
export function MarkdownMessage({ text, className }: { text: string; className?: string }) {
  return (
    <div className={cn("space-y-1.5 text-sm leading-relaxed break-words", className)}>
      <ReactMarkdown
        components={{
          p: ({ children }) => <p className="whitespace-pre-wrap">{children}</p>,
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          ul: ({ children }) => <ul className="list-disc space-y-1 pl-4">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal space-y-1 pl-4">{children}</ol>,
          li: ({ children }) => <li>{children}</li>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-black/10 px-1 py-0.5 font-mono text-[0.85em] break-all dark:bg-white/10">
              {children}
            </code>
          ),
          h1: ({ children }) => <p className="font-semibold">{children}</p>,
          h2: ({ children }) => <p className="font-semibold">{children}</p>,
          h3: ({ children }) => <p className="font-semibold">{children}</p>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
