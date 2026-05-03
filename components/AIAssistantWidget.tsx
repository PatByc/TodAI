"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import {
  Bot,
  Circle,
  CircleSlash,
  Clock3,
  Loader2,
  Lock,
  Menu,
  MessageCircle,
  Minus,
  Plus,
  Send,
  Settings,
  Sparkles,
  Timer,
  X,
} from "lucide-react";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
  createdAt: string;
  durationLabel?: string;
  usedMock?: boolean;
};

type ChatResponse = {
  reply?: string;
  error?: string;
  durationMs?: number;
  durationLabel?: string;
  model?: string;
  usedMock?: boolean;
};

type CustomWidget = {
  id: string;
  type: "spare" | "timer";
  label: string;
};

const starterPrompts = [
  "How am I doing this week?",
  "What is taking most of my time?",
  "What should I improve tomorrow?",
];

const maxRailWidgets = 10;
const realRailWidgets = 2;
const widgetHeightPx = 56;
const widgetGapPx = 20;
const controlHeightPx = 56;
const viewportBottomPx = 20;

function formatDuration(durationMs?: number) {
  if (typeof durationMs !== "number") {
    return undefined;
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(durationMs >= 10000 ? 1 : 2)}s`;
}

function formatMessageTimestamp(value: string) {
  const date = new Date(value);
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(date.getDate()).padStart(2, "0");
  const month = months[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");

  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

function createMessage(
  role: ChatMessage["role"],
  content: string,
  metadata?: Pick<ChatMessage, "durationLabel" | "usedMock">,
): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
    role,
    content,
    createdAt: new Date().toISOString(),
    ...metadata,
  };
}

export function AIAssistantWidget() {
  // The side widget rail is visible and pinned by default so dashboard tools are immediately available.
  const [isRailOpen, setIsRailOpen] = useState(true);
  const [isRailPinned, setIsRailPinned] = useState(true);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);
  const [customWidgets, setCustomWidgets] = useState<CustomWidget[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    createMessage(
      "assistant",
      "I can read your local TodAI data and help you spot time patterns, goal progress, and small adjustments for tomorrow.",
    ),
  ]);
  const railRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const customWidgetLimit = maxRailWidgets - realRailWidgets;
  const canAddWidget = customWidgets.length < customWidgetLimit;
  const railItemCount = 1 + customWidgets.length + (isSettingsOpen && canAddWidget ? 1 : 0);
  const railOffsetPx =
    viewportBottomPx + controlHeightPx + widgetGapPx + railItemCount * widgetHeightPx + railItemCount * widgetGapPx;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("todai-widget-rail-change", {
        detail: {
          isOpen: isRailOpen,
          railOffsetPx,
        },
      }),
    );
  }, [isRailOpen, railOffsetPx]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      const target = event.target;

      if (!isRailOpen || isRailPinned || !(target instanceof Element)) {
        return;
      }

      if (target.closest("[data-todai-widget-rail]")) {
        return;
      }

      closeRail();
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, [isRailOpen, isRailPinned]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, isLoading, isVisible]);

  function closeRail() {
    setIsRailOpen(false);
    setIsSettingsOpen(false);
    setIsPickerOpen(false);
    closeWidget();
  }

  function openWidget() {
    setIsRailOpen(true);
    setIsMounted(true);
    window.setTimeout(() => setIsVisible(true), 10);
  }

  function closeWidget() {
    setIsVisible(false);
    window.setTimeout(() => setIsMounted(false), 220);
  }

  function addCustomWidget(type: CustomWidget["type"]) {
    if (!canAddWidget) {
      return;
    }

    setCustomWidgets((current) => [
      ...current,
      {
        id: `${type}-${Date.now()}-${Math.random().toString(16).slice(2)}`,
        type,
        label: type === "timer" ? "Timer slot" : "Spare widget",
      },
    ]);
    setIsPickerOpen(false);
  }

  function removeCustomWidget(id: string) {
    setCustomWidgets((current) => current.filter((widget) => widget.id !== id));
  }

  async function sendMessage(content: string) {
    const trimmed = content.trim();

    if (!trimmed || isLoading) {
      return;
    }

    setInput("");
    setIsLoading(true);
    setMessages((current) => [...current, createMessage("user", trimmed)]);

    try {
      const response = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });
      const data = (await response.json()) as ChatResponse;

      if (!response.ok) {
        throw new Error(data.error ?? "Assistant request failed");
      }

      setMessages((current) => [
        ...current,
        createMessage("assistant", data.reply?.trim() || "I received an empty response. Please try again.", {
          durationLabel: data.durationLabel ?? formatDuration(data.durationMs),
          usedMock: data.usedMock,
        }),
      ]);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Something went wrong.";
      setMessages((current) => [
        ...current,
        createMessage("assistant", `I couldn't answer that yet: ${message}`),
      ]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage(input);
  }

  return (
    <div ref={railRef} data-todai-widget-rail className="fixed bottom-5 right-4 z-50 sm:right-6">
      {isMounted ? (
        <section
          className={`mb-3 flex h-[min(680px,calc(100vh-2rem))] w-[calc(100vw-2rem)] origin-bottom-right flex-col overflow-hidden rounded-[1.75rem] border border-white/80 bg-white shadow-2xl shadow-gray-400/40 transition-all duration-200 ease-out sm:w-[380px] ${
            isVisible ? "translate-y-0 scale-100 opacity-100" : "translate-y-3 scale-[0.96] opacity-0"
          }`}
        >
          <header className="border-b border-gray-100 bg-gray-950 p-4 text-white">
            <div className="flex items-center gap-3">
              <div className="grid size-10 place-items-center rounded-2xl bg-emerald-400 text-gray-950">
                <Sparkles size={19} />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="font-black">Tod AI Assistant</h2>
                <p className="truncate text-xs text-white/60">Daily optimization coach</p>
              </div>
              <button
                type="button"
                onClick={closeWidget}
                className="grid size-9 place-items-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
                title="Minimize assistant"
              >
                <Minus size={18} />
              </button>
            </div>
          </header>

          <div className="flex-1 overflow-y-auto bg-slate-50 p-4">
            <div className="space-y-3">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                >
                  {message.role === "user" ? (
                    <p className="mb-1 max-w-[86%] px-2 text-xs font-medium text-gray-400">
                      {formatMessageTimestamp(message.createdAt)}
                    </p>
                  ) : null}
                  <div
                    className={`max-w-[86%] rounded-3xl px-4 py-3 text-sm leading-6 shadow-sm ${
                      message.role === "user"
                        ? "bg-gray-950 text-white"
                        : "border border-white bg-white text-gray-800"
                    }`}
                  >
                    {message.content}
                  </div>
                  {message.role === "assistant" && (message.durationLabel || message.usedMock) ? (
                    <p className="mt-1 max-w-[86%] px-2 text-xs font-medium text-gray-400">
                      {message.durationLabel ? `Answered in ${message.durationLabel}` : null}
                      {message.durationLabel && message.usedMock ? " - " : null}
                      {message.usedMock ? "Mock response" : null}
                    </p>
                  ) : null}
                </div>
              ))}

              {isLoading ? (
                <div className="flex justify-start">
                  <div className="inline-flex items-center gap-2 rounded-3xl border border-white bg-white px-4 py-3 text-sm font-semibold text-gray-500 shadow-sm">
                    <Loader2 className="animate-spin" size={16} />
                    Reading your day
                  </div>
                </div>
              ) : null}

              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="border-t border-gray-100 bg-white p-3">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
              {starterPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => void sendMessage(prompt)}
                  disabled={isLoading}
                  className="shrink-0 rounded-full border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-600 transition hover:bg-gray-100 disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
            <form onSubmit={handleSubmit} className="flex items-center gap-2">
              <input
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="Ask about your time..."
                className="min-w-0 flex-1 rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm outline-none transition focus:border-gray-400 focus:bg-white"
              />
              <button
                type="submit"
                disabled={isLoading || input.trim().length === 0}
                className="grid size-12 shrink-0 place-items-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-200 transition hover:bg-emerald-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:shadow-none"
                title="Send message"
              >
                {isLoading ? <Loader2 className="animate-spin" size={19} /> : <Send size={19} />}
              </button>
            </form>
          </div>
        </section>
      ) : null}

      <div className="flex flex-col items-end gap-3">
        <div
          className={`flex flex-col items-end gap-5 transition-all duration-200 ease-out ${
            isRailOpen ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0"
          }`}
        >
          {isSettingsOpen && canAddWidget ? (
            <div className="relative">
              {isPickerOpen ? (
                <div className="absolute right-[calc(100%+0.75rem)] top-1/2 flex -translate-y-1/2 items-center gap-2">
                  {[0, 1, 2, 3].map((item) => (
                    <button
                      key={item}
                      type="button"
                      onClick={() => addCustomWidget("spare")}
                      className="grid size-11 place-items-center rounded-full border border-dashed border-gray-300 bg-white/95 text-gray-400 shadow-lg transition hover:scale-105 hover:border-gray-400 hover:text-gray-600"
                      title="Add spare widget"
                    >
                      <Circle size={17} />
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => addCustomWidget("timer")}
                    className="grid size-11 place-items-center rounded-full border border-dashed border-emerald-300 bg-emerald-50 text-emerald-600 shadow-lg transition hover:scale-105"
                    title="Add timer widget"
                  >
                    <Timer size={18} />
                  </button>
                </div>
              ) : null}
              <button
                type="button"
                onClick={() => setIsPickerOpen((current) => !current)}
                className="flex h-14 w-[calc(100vw-2rem)] max-w-[220px] items-center gap-3 rounded-full border-2 border-dashed border-gray-300 bg-white/80 p-2 text-gray-500 shadow-xl shadow-gray-300/30 transition hover:border-gray-400 hover:bg-white sm:max-w-[190px]"
                title="Add new widget"
              >
                <span className="grid size-10 place-items-center rounded-full bg-gray-100">
                  <Plus size={19} />
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-sm font-black">Add widget</span>
              </button>
            </div>
          ) : null}

          {isSettingsOpen
            ? customWidgets.map((widget) => (
                <div key={widget.id} className="relative">
                  <button
                    type="button"
                    onClick={() => removeCustomWidget(widget.id)}
                    className="absolute -top-3 right-3 grid size-7 place-items-center rounded-full border border-dashed border-gray-300 bg-white text-gray-400 shadow-sm transition hover:border-rose-300 hover:text-rose-500"
                    title={`Remove ${widget.label}`}
                  >
                    <X size={14} />
                  </button>
                  <div className="flex h-14 w-[calc(100vw-2rem)] max-w-[220px] items-center gap-3 rounded-full border-2 border-dashed border-gray-300 bg-white/75 p-2 text-gray-500 shadow-xl shadow-gray-300/30 sm:max-w-[190px]">
                    <span className="grid size-10 place-items-center rounded-full bg-gray-100">
                      {widget.type === "timer" ? <Clock3 size={18} /> : <Circle size={17} />}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-left text-sm font-black">{widget.label}</span>
                  </div>
                </div>
              ))
            : null}

          {!isMounted ? (
            <button
              type="button"
              onClick={openWidget}
              className="flex w-[calc(100vw-2rem)] max-w-[220px] items-center gap-3 rounded-full bg-gray-950 p-2 text-white shadow-2xl shadow-gray-400/50 transition hover:-translate-y-0.5 hover:bg-gray-900 sm:max-w-[190px]"
              title="Open Tod AI Assistant"
            >
              <span className="grid size-10 place-items-center rounded-full bg-emerald-400 text-gray-950">
                <Bot size={20} />
              </span>
              <span className="min-w-0 flex-1 truncate text-left text-sm font-black">Ask Tod</span>
              <MessageCircle className="mr-2 shrink-0" size={18} />
            </button>
          ) : null}
        </div>

        <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/90 p-1.5 shadow-2xl shadow-gray-400/40 backdrop-blur">
          {isRailOpen ? (
            <>
              <button
                type="button"
                onClick={() => setIsRailPinned((current) => !current)}
                className={`grid size-11 place-items-center rounded-full transition ${
                  isRailPinned ? "bg-gray-950 text-white" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title={isRailPinned ? "Unpin widget rail" : "Pin widget rail open"}
              >
                {isRailPinned ? <Lock size={19} /> : <CircleSlash size={20} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen((current) => !current);
                  setIsPickerOpen(false);
                }}
                className={`grid size-11 place-items-center rounded-full transition ${
                  isSettingsOpen ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                }`}
                title="Widget rail settings"
              >
                <Settings size={19} />
              </button>
            </>
          ) : null}
          <button
            type="button"
            onClick={() => (isRailOpen ? closeRail() : setIsRailOpen(true))}
            className="grid size-12 place-items-center rounded-full bg-gray-950 text-white shadow-lg transition hover:scale-105"
            title={isRailOpen ? "Hide widget rail" : "Open widget rail"}
          >
            <Menu size={22} />
          </button>
        </div>
      </div>
    </div>
  );
}
