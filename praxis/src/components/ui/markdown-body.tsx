"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";

type MarkdownBodyProps = {
  className?: string;
  children: string;
};

export function MarkdownBody({ className, children }: MarkdownBodyProps) {
  return (
    <div className={`markdown-body ${className ?? ""}`.trim()}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>{children}</ReactMarkdown>
    </div>
  );
}
