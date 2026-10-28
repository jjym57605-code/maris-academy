
"use client";

import { useEffect, useRef, useState } from "react";

const WELCOME_MESSAGE =
  "السلام عليكم! 👋 أنا المرافق الذكي نتاعك في MARIS ACADEMY. راني هنا باش نعاونك في تحضيرات بكالوريا 2027، ونشرحلك الدروس خطوة بخطوة. واش حاب تقرا اليوم؟ 🌊";

type Message = {
  id: number;
  role: "assistant" | "user";
  content: string;
};

export default function MarisAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { id: 1, role: "assistant", content: WELCOME_MESSAGE },
  ]);

  const nextId = useRef(2);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isOpen, isLoading]);

  async function handleSend(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const content = input.trim();
    if (!content || isLoading) return;

    const history = messages
      .filter((message) => message.content.trim())
      .slice(-10)
      .map((message) => ({
        role: message.role,
        content: message.content,
      }));

    const userMessageId = nextId.current++;
    const assistantMessageId = nextId.current++;

    setMessages((current) => [
      ...current,
      { id: userMessageId, role: "user", content },
      { id: assistantMessageId, role: "assistant", content: "" },
    ]);

    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({ message: content, history }),
      });

      if (!response.ok || !response.body) {
        let errorMessage = "ما قدرناش نجيبو الإجابة. عاود جرّب.";

        try {
          const data = await response.json();
          if (typeof data?.error === "string") {
            errorMessage = data.error;
          }
        } catch {
          // نستعمل رسالة الخطأ الافتراضية إذا الرد ما كانش JSON.
        }

        throw new Error(errorMessage);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          reply += decoder.decode(value, { stream: true });

          setMessages((current) =>
            current.map((message) =>
              message.id === assistantMessageId
                ? { ...message, content: reply }
                : message,
            ),
          );
        }

        // نفرّغ أي بايتات متبقية في الـ decoder.
        reply += decoder.decode();

        setMessages((current) =>
          current.map((message) =>
            message.id === assistantMessageId
              ? {
                  ...message,
                  content: reply.trim()
                    ? reply
                    : "ما وصلنيش رد صالح من النموذج. عاود جرّب.",
                }
              : message,
          ),
        );
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "صار خطأ غير متوقع. عاود جرّب.";

      setMessages((current) =>
        current.map((message) =>
          message.id === assistantMessageId
            ? {
                ...message,
                content: `سمحلي، ما قدرتش نجيب الإجابة. 🌊\n${errorMessage}`,
              }
            : message,
        ),
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div
      dir="rtl"
      className="fixed bottom-5 left-5 z-[80] flex flex-col items-start gap-3 sm:bottom-6 sm:left-6"
    >
      {isOpen && (
        <section
          aria-label="المرافق الذكي MARIS"
          className="flex h-[min(560px,75vh)] w-[min(360px,calc(100vw-32px))] flex-col overflow-hidden rounded-3xl border border-cyan-300/20 bg-[#061426]/95 text-white shadow-[0_20px_80px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
        >
          <header className="flex items-center gap-3 border-b border-white/10 bg-gradient-to-l from-cyan-500/15 to-blue-500/10 p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border border-cyan-200/40 bg-[#082c4c] text-2xl shadow-[0_0_25px_rgba(34,211,238,0.2)]">
              🐋
            </div>

            <div className="min-w-0 flex-1">
              <h2 className="font-bold text-cyan-100">
                مرافق MARIS الذكي
              </h2>
              <p className="mt-1 text-xs text-cyan-200/65">
                {isLoading
                  ? "راني نكتبلك الإجابة..."
                  : "مساعدك في بكالوريا 2027"}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsOpen(false)}
              aria-label="إغلاق المحادثة"
              className="flex h-9 w-9 items-center justify-center rounded-xl text-xl text-white/60 transition hover:bg-white/10 hover:text-white"
            >
              ×
            </button>
          </header>

          <div
            aria-live="polite"
            aria-relevant="additions text"
            className="flex-1 space-y-4 overflow-y-auto p-4"
          >
            {messages.map((message) => (
              <div
                key={message.id}
                className={`flex ${
                  message.role === "user"
                    ? "justify-start"
                    : "justify-end"
                }`}
              >
                <div
                  className={`max-w-[90%] whitespace-pre-wrap break-words rounded-2xl px-3.5 py-3 text-sm leading-7 ${
                    message.role === "user"
                      ? "rounded-tl-sm bg-cyan-500/15 text-cyan-50"
                      : "rounded-tr-sm border border-white/10 bg-white/[0.06] text-slate-100"
                  }`}
                >
                  {message.content}
                  {isLoading &&
                    message.role === "assistant" &&
                    message.id === messages[messages.length - 1]?.id &&
                    !message.content && (
                      <span className="text-cyan-200/60">
                        الإجابة راهي تتولّد... 🌊
                      </span>
                    )}
                </div>
              </div>
            ))}

            <div ref={messagesEndRef} />
          </div>

          <form
            onSubmit={handleSend}
            className="border-t border-white/10 p-3"
          >
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-black/20 p-2 focus-within:border-cyan-300/40">
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (
                    event.key === "Enter" &&
                    !event.shiftKey &&
                    !event.nativeEvent.isComposing
                  ) {
                    event.preventDefault();
                    event.currentTarget.form?.requestSubmit();
                  }
                }}
                placeholder="اكتب سؤالك هنا..."
                aria-label="اكتب سؤالك"
                rows={1}
                maxLength={2000}
                disabled={isLoading}
                className="max-h-28 min-h-10 flex-1 resize-y bg-transparent px-2 py-2 text-sm text-white outline-none placeholder:text-white/35 disabled:opacity-60"
              />

              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                aria-label="إرسال الرسالة"
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-cyan-500 text-lg text-[#031323] transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {isLoading ? "…" : "↑"}
              </button>
            </div>

            <p className="mt-2 text-center text-[10px] text-white/35">
              MARIS ACADEMY · BAC 2027
            </p>
          </form>
        </section>
      )}

      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-label={
          isOpen ? "إغلاق المرافق الذكي" : "فتح المرافق الذكي"
        }
        aria-expanded={isOpen}
        className="group relative flex h-[62px] w-[62px] items-center justify-center rounded-full border border-cyan-200/50 bg-gradient-to-br from-[#0b4265] via-[#075985] to-[#082c4c] text-3xl shadow-[0_0_30px_rgba(34,211,238,0.25)] transition duration-300 hover:scale-105 hover:shadow-[0_0_40px_rgba(34,211,238,0.4)] active:scale-95"
      >
        <span
          aria-hidden="true"
          className="absolute inset-1 rounded-full border border-cyan-100/15"
        />
        <span aria-hidden="true" className="relative">
          {isOpen ? "×" : "🐋"}
        </span>

        {!isOpen && (
          <span className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-[#061426] bg-emerald-400" />
        )}
      </button>
    </div>
  );
}
