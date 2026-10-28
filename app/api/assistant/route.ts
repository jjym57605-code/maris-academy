
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

const SYSTEM_PROMPT =
  "أنت المرافق الذكي لمنصة MARIS ACADEMY، تساعد تلاميذ بكالوريا الجزائر 2027. أجب باللغة التي يستعملها التلميذ، وبالعربية أو الدارجة الجزائرية عند الحاجة. اشرح بوضوح وبخطوات مناسبة لمستوى البكالوريا. استعمل الرسائل السابقة لفهم سياق الأسئلة ومتابعة الشرح. لا تدّعِ أنك تحققت من معلومة إذا لم تفعل ذلك. إذا لم تكن متأكدًا، وضّح ذلك.";

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "الطلب غير صالح. عاود جرّب." },
      { status: 400 },
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "الطلب غير صالح. عاود جرّب." },
      { status: 400 },
    );
  }

  const data = body as {
    message?: unknown;
    history?: unknown;
  };

  const message = data.message;

  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json(
      { error: "اكتب سؤالك أولًا." },
      { status: 400 },
    );
  }

  if (message.length > 2000) {
    return NextResponse.json(
      { error: "السؤال طويل بزاف، اختصره من فضلك." },
      { status: 400 },
    );
  }

  const validHistory: ChatMessage[] = Array.isArray(data.history)
    ? data.history
        .filter(
          (item): item is ChatMessage =>
            item !== null &&
            typeof item === "object" &&
            ((item as ChatMessage).role === "user" ||
              (item as ChatMessage).role === "assistant") &&
            typeof (item as ChatMessage).content === "string" &&
            (item as ChatMessage).content.trim().length > 0,
        )
        .slice(-10)
        .map((item) => ({
          role: item.role,
          content: item.content.slice(0, 2000),
        }))
    : [];

  const ollamaUrl = (
    process.env.OLLAMA_URL || "http://127.0.0.1:11434"
  ).replace(/\/+$/, "");

  let ollamaResponse: Response;

  try {
    ollamaResponse = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "qwen2.5:3b",
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          ...validHistory,
          { role: "user", content: message.trim() },
        ],
        stream: true,
        options: {
          num_predict: 180,
          temperature: 0.4,
        },
      }),
      signal: AbortSignal.timeout(120000),
      cache: "no-store",
    });
  } catch (error) {
    console.error("MARIS Ollama connection error:", error);

    const isTimeout =
      error instanceof Error && error.name === "TimeoutError";

    return NextResponse.json(
      {
        error: isTimeout
          ? "المرافق راه يتأخر في الإجابة. عاود جرّب."
          : "تعذّر الاتصال بالمرافق. تأكد بلي Ollama راه يخدم.",
      },
      { status: 503 },
    );
  }

  if (!ollamaResponse.ok || !ollamaResponse.body) {
    console.error(
      "Ollama returned status:",
      ollamaResponse.status,
    );

    await ollamaResponse.body?.cancel().catch(() => {});

    return NextResponse.json(
      {
        error:
          "المرافق ما قدرش يجاوب حاليًا. تأكد من النموذج وعاود جرّب.",
      },
      { status: 502 },
    );
  }

  const reader = ollamaResponse.body.getReader();
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      let buffer = "";
      let streamFailed = false;

      try {
        while (true) {
          const { done, value } = await reader.read();

          if (value) {
            buffer += decoder.decode(value, { stream: !done });
          } else if (done) {
            buffer += decoder.decode();
          }

          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.trim()) continue;

            let chunk: {
              error?: string;
              message?: { content?: string };
              done?: boolean;
            };

            try {
              chunk = JSON.parse(line);
            } catch {
              console.error("Invalid Ollama stream chunk");
              continue;
            }

            if (chunk.error) {
              throw new Error(chunk.error);
            }

            const token = chunk.message?.content;

            if (typeof token === "string" && token.length > 0) {
              controller.enqueue(encoder.encode(token));
            }
          }

          if (done) break;
        }

        if (buffer.trim()) {
          try {
            const chunk = JSON.parse(buffer) as {
              error?: string;
              message?: { content?: string };
            };

            if (chunk.error) {
              throw new Error(chunk.error);
            }

            const token = chunk.message?.content;

            if (typeof token === "string" && token.length > 0) {
              controller.enqueue(encoder.encode(token));
            }
          } catch (error) {
            console.error("Invalid final Ollama chunk:", error);
          }
        }

        controller.close();
      } catch (error) {
        streamFailed = true;
        console.error("MARIS streaming error:", error);

        controller.error(error);
      } finally {
        if (!streamFailed) {
          reader.releaseLock();
        } else {
          reader.cancel().catch(() => {});
        }
      }
    },

    async cancel() {
      await reader.cancel().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
