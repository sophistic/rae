import React, { useState } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
  [key: string]: any; // Allow additional props
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  className,
  inline,
  ...props
}) => {
  const [copied, setCopied] = useState(false);

  // Extract language from className (format: language-javascript)
  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "text";

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  // For inline code, return simple styled span
  if (inline) {
    return (
      <code className="bg-zinc-800 text-zinc-100 px-1.5 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  // For code blocks, return syntax highlighted version with copy button
  return (
    <div className="relative group my-4 w-full">
      <div className="flex items-center justify-between bg-zinc-800 px-4 py-2 rounded-t-lg">
        <span className="text-zinc-300 text-sm font-medium">
          {language !== "text" ? language : "code"}
        </span>
        <button
          onClick={copyToClipboard}
          className={`p-1.5 rounded transition-all duration-200 ${
            copied
              ? "bg-green-600 text-green-100 hover:bg-green-500"
              : "bg-zinc-700 hover:bg-zinc-600 text-zinc-300 hover:text-white"
          }`}
          title={copied ? "Copied!" : "Copy code"}
        >
          {copied ? <Check size={12} /> : <Copy size={12} />}
        </button>
      </div>
      <SyntaxHighlighter
        style={vscDarkPlus}
        language={language}
        PreTag="div"
        className="!mt-0 !rounded-t-none !rounded-b-lg"
        customStyle={{
          margin: 0,
          borderTopLeftRadius: 0,
          borderTopRightRadius: 0,
        }}
      >
        {children}
      </SyntaxHighlighter>
    </div>
  );
};

export default CodeBlock;
