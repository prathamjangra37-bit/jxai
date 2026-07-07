import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Trash2, 
  Laugh, 
  Briefcase, 
  Sprout, 
  Utensils, 
  Menu, 
  X, 
  Clock, 
  Sparkles, 
  MessageSquare, 
  RotateCcw, 
  AlertCircle,
  Plus,
  Settings as SettingsIcon,
  User as UserIcon,
  Copy,
  Check,
  StopCircle,
  Moon,
  Sun,
  Globe,
  Compass,
  Info,
  Search,
  Pencil,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Download
} from "lucide-react";
import { SUGGESTIONS, PRINCIPLES } from "./data";
import { Message, Conversation, Attachment } from "./types";
import { MarkdownView } from "./components/MarkdownView";
import { motion, AnimatePresence } from "motion/react";

export default function App() {
  // Navigation / Tabs: "chat" | "profile" | "settings"
  const [activeTab, setActiveTab] = useState<"chat" | "profile" | "settings">("chat");

  // Multi-session State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string>("");

  // Search & Rename States
  const [searchQuery, setSearchQuery] = useState("");
  const [editingConvId, setEditingConvId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  // Voice States
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // File Upload & Attachment States
  const [stagedAttachments, setStagedAttachments] = useState<Attachment[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);

  // Input & Engine states
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState("");
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);

  // User Profile States
  const [userName, setUserName] = useState("Pratham Jangra");
  const [userEmail, setUserEmail] = useState("prathamjangra37@gmail.com");

  // Settings states
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  const [language, setLanguage] = useState<"English" | "Hinglish" | "Hindi">("Hinglish");

  // Copy states
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Image Generation States
  const [isGenerateImageMode, setIsGenerateImageMode] = useState(false);
  const [imageAspectRatio, setImageAspectRatio] = useState<"1:1" | "16:9" | "4:3" | "9:16">("1:1");

  // References
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Load state from LocalStorage on mount
  useEffect(() => {
    // 1. Theme loading
    const savedTheme = localStorage.getItem("udgtp_theme") as "dark" | "light";
    if (savedTheme) {
      setTheme(savedTheme);
    }

    // 2. Language loading
    const savedLang = localStorage.getItem("udgtp_lang") as "English" | "Hinglish" | "Hindi";
    if (savedLang) {
      setLanguage(savedLang);
    }

    // 3. Profile loading
    const savedProfileName = localStorage.getItem("udgtp_profile_name");
    if (savedProfileName) {
      setUserName(savedProfileName);
    }

    // 4. Conversations loading
    const savedConversations = localStorage.getItem("udgtp_conversations_v3");
    if (savedConversations) {
      try {
        const parsed = JSON.parse(savedConversations);
        if (Array.isArray(parsed)) {
          const loaded = parsed
            .map((c: any) => {
              if (!c || typeof c !== "object") return null;
              return {
                id: c.id || Math.random().toString(36).substring(7),
                title: c.title || "Welcome Session",
                createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
                messages: Array.isArray(c.messages)
                  ? c.messages
                      .map((m: any) => {
                        if (!m || typeof m !== "object") return null;
                        return {
                          id: m.id || Math.random().toString(36).substring(7),
                          role: m.role || "user",
                          content: m.content || "",
                          timestamp: m.timestamp ? new Date(m.timestamp) : new Date(),
                          attachments: Array.isArray(m.attachments) ? m.attachments : undefined
                        };
                      })
                      .filter(Boolean)
                  : []
              };
            })
            .filter(Boolean) as Conversation[];

          if (loaded.length > 0) {
            setConversations(loaded);
            setActiveId(loaded[0].id);
          } else {
            const defaultId = Math.random().toString(36).substring(7);
            const defaultConv: Conversation = {
              id: defaultId,
              title: "Welcome Session",
              messages: [],
              createdAt: new Date()
            };
            setConversations([defaultConv]);
            setActiveId(defaultId);
          }
        } else {
          const defaultId = Math.random().toString(36).substring(7);
          const defaultConv: Conversation = {
            id: defaultId,
            title: "Welcome Session",
            messages: [],
            createdAt: new Date()
          };
          setConversations([defaultConv]);
          setActiveId(defaultId);
        }
      } catch (e) {
        console.error("Failed to load conversation history:", e);
        const defaultId = Math.random().toString(36).substring(7);
        const defaultConv: Conversation = {
          id: defaultId,
          title: "Welcome Session",
          messages: [],
          createdAt: new Date()
        };
        setConversations([defaultConv]);
        setActiveId(defaultId);
      }
    } else {
      // Create a default first conversation if empty
      const defaultId = Math.random().toString(36).substring(7);
      const defaultConv: Conversation = {
        id: defaultId,
        title: "Welcome Session",
        messages: [],
        createdAt: new Date()
      };
      setConversations([defaultConv]);
      setActiveId(defaultId);
    }

    // Live clock update
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }));
    };
    updateTime();
    const timer = setInterval(updateTime, 1000);
    return () => clearInterval(timer);
  }, []);

  // Sync conversations to LocalStorage when changed
  useEffect(() => {
    if (conversations.length > 0) {
      localStorage.setItem("udgtp_conversations_v3", JSON.stringify(conversations));
    } else {
      localStorage.removeItem("udgtp_conversations_v3");
    }
    scrollToBottom();
  }, [conversations]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  // Switch to or retrieve current conversation messages
  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation ? activeConversation.messages : [];

  // Filter conversations based on search query (searches title or individual message content)
  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const titleMatch = (conv.title || "").toLowerCase().includes(q);
    const messagesMatch = conv.messages.some((m) => (m.content || "").toLowerCase().includes(q));
    return titleMatch || messagesMatch;
  });

  const handleShowNotification = (text: string) => {
    setNotification(text);
    setTimeout(() => {
      setNotification((curr) => (curr === text ? null : curr));
    }, 3500);
  };

  // Create a brand new empty chat session
  const handleNewChat = () => {
    const newId = Math.random().toString(36).substring(7);
    const newConv: Conversation = {
      id: newId,
      title: `Session #${conversations.length + 1}`,
      messages: [],
      createdAt: new Date()
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newId);
    setActiveTab("chat");
    setError(null);
    setIsSidebarOpen(false);
    handleShowNotification("Started a new chat session.");
  };

  // Delete a specific conversation session
  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (conversations.length <= 1) {
      // Just clear current messages instead of deleting the last session
      setConversations([{
        id: activeId,
        title: "New Session",
        messages: [],
        createdAt: new Date()
      }]);
      setError(null);
      handleShowNotification("Cleared conversation messages.");
      return;
    }

    const filtered = conversations.filter((c) => c.id !== id);
    setConversations(filtered);
    if (activeId === id) {
      setActiveId(filtered[0].id);
    }
    handleShowNotification("Deleted conversation session.");
  };

  // Stop current AI Response Generation
  const handleStopGenerating = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      setLoading(false);
      handleShowNotification("Stopped response generation.");
    }
  };

  // --- VOICE SPEECH TO TEXT & TEXT TO SPEECH ---
  const startListening = () => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      handleShowNotification("Speech recognition is not supported in this browser.");
      return;
    }
    
    // Stop speaking if active
    if (speakingMessageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
    }

    const rec = new SpeechRecognition();
    rec.continuous = false;
    rec.interimResults = false;
    rec.lang = language === "Hindi" ? "hi-IN" : "en-US";
    
    rec.onstart = () => {
      setIsListening(true);
      handleShowNotification("Listening... Speak now.");
    };
    
    rec.onerror = (e: any) => {
      console.error(e);
      setIsListening(false);
      handleShowNotification("Voice input error. Try again.");
    };
    
    rec.onend = () => {
      setIsListening(false);
    };
    
    rec.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      if (transcript) {
        setInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    };
    
    recognitionRef.current = rec;
    rec.start();
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleSpeak = (messageId: string, text: string) => {
    if (speakingMessageId === messageId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }
    
    window.speechSynthesis.cancel(); // Stop any ongoing speech
    
    // Clean text from markdown patterns (e.g. asterisks, code blocks, hashes)
    const cleanText = text
      .replace(/\*\*?/g, "") // bold/italic
      .replace(/#+\s/g, "") // headers
      .replace(/```[\s\S]*?```/g, "[code block omitted]") // skip code blocks
      .replace(/`([^`]+)`/g, "$1") // inline code
      .trim();
      
    const utterance = new SpeechSynthesisUtterance(cleanText);
    
    const hasHindiChars = /[\u0900-\u097F]/.test(cleanText);
    utterance.lang = hasHindiChars ? "hi-IN" : "en-US";
    
    utterance.onend = () => {
      setSpeakingMessageId(null);
    };
    utterance.onerror = () => {
      setSpeakingMessageId(null);
    };
    
    setSpeakingMessageId(messageId);
    window.speechSynthesis.speak(utterance);
  };

  // --- DRAG AND DROP & FILE UPLOADS ---
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, forceType?: "image" | "file") => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      handleShowNotification("File size is too large. Please select a file smaller than 10MB.");
      return;
    }

    const isImage = file.type.startsWith("image/");
    const type = forceType || (isImage ? "image" : "file");

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const newAttachment: Attachment = {
        name: file.name,
        type: type,
        data: result,
        mimeType: file.type,
        size: file.size
      };
      setStagedAttachments((prev) => [...prev, newAttachment]);
      handleShowNotification(`Attached ${file.name}`);
    };

    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      const file = files[0];
      const isImage = file.type.startsWith("image/");
      const type = isImage ? "image" : "file";
      
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        const newAttachment: Attachment = {
          name: file.name,
          type: type,
          data: result,
          mimeType: file.type,
          size: file.size
        };
        setStagedAttachments((prev) => [...prev, newAttachment]);
        handleShowNotification(`Attached ${file.name}`);
      };
      reader.readAsDataURL(file);
    }
  };

  // --- INLINE CONVERSATION RENAMING ---
  const handleStartRename = (id: string, currentTitle: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingConvId(id);
    setEditingTitle(currentTitle);
  };

  const handleSaveRename = (id: string) => {
    if (!editingTitle.trim()) {
      setEditingConvId(null);
      return;
    }
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: editingTitle.trim() } : c))
    );
    setEditingConvId(null);
    handleShowNotification("Conversation renamed.");
  };

  const handleCancelRename = () => {
    setEditingConvId(null);
  };

  // Clear current active chat messages only
  const handleClearChat = () => {
    if (window.confirm("Are you sure you want to clear this chat history?")) {
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages: [] } : c))
      );
      setError(null);
      handleShowNotification("Chat cleared successfully.");
    }
  };

  // Send message
  const handleSendMessage = async (textToSend?: string) => {
    const rawMessageText = textToSend || input;
    const trimmed = rawMessageText.trim();
    if (!trimmed && stagedAttachments.length === 0) return;

    if (!textToSend) {
      setInput("");
    }
    setError(null);
    setLoading(true);

    // Ensure we have an active conversation
    let currentId = activeId;
    let currentConversations = [...conversations];

    if (!currentId) {
      currentId = Math.random().toString(36).substring(7);
      const newConv: Conversation = {
        id: currentId,
        title: "Auto Session",
        messages: [],
        createdAt: new Date()
      };
      currentConversations = [newConv, ...currentConversations];
      setConversations(currentConversations);
      setActiveId(currentId);
    }

    const userMsg: Message = {
      id: Math.random().toString(36).substring(7),
      role: "user",
      content: isGenerateImageMode 
        ? `Generate image prompt: "${trimmed}" (Aspect Ratio: ${imageAspectRatio})` 
        : (trimmed || (stagedAttachments.length > 0 ? `Attached ${stagedAttachments.length} media file(s)` : "")),
      timestamp: new Date(),
      attachments: stagedAttachments.length > 0 ? stagedAttachments : undefined
    };
    const wasGenerateImageMode = isGenerateImageMode;
    // Turn off image mode after submitting
    setIsGenerateImageMode(false);
    setStagedAttachments([]);

    // Update messages in local state
    let targetConv = currentConversations.find((c) => c.id === currentId);
    if (!targetConv) return;

    const newMessagesList = [...targetConv.messages, userMsg];

    // If it is the first message, auto-title the session based on the text
    const shouldUpdateTitle = targetConv.messages.length === 0;
    const autoTitle = shouldUpdateTitle
      ? (trimmed ? trimmed.split(" ").slice(0, 4).join(" ") + (trimmed.split(" ").length > 4 ? "..." : "") : "New Session with Media")
      : targetConv.title;

    setConversations((prev) =>
      prev.map((c) =>
        c.id === currentId
          ? { ...c, title: autoTitle, messages: newMessagesList }
          : c
      )
    );

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (wasGenerateImageMode) {
        // Trigger Image Generation API
        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: trimmed, aspectRatio: imageAspectRatio }),
          signal: controller.signal
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Image generation failed. Please check your model support or parameters.");
        }

        const data = await res.json();

        // Add model message containing the generated image as an attachment
        const modelMsg: Message = {
          id: Math.random().toString(36).substring(7),
          role: "model",
          content: `मैंने आपके लिए प्रॉम्ट **"${trimmed}"** पर एक सुंदर एआई इमेज बनाई है! (Here is the generated image for your prompt!)`,
          timestamp: new Date(),
          attachments: [
            {
              name: `ai-generated-${Date.now()}.png`,
              type: "image",
              data: data.imageUrl,
              mimeType: "image/png"
            }
          ]
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentId
              ? { ...c, messages: [...newMessagesList, modelMsg] }
              : c
          )
        );
      } else {
        // Filter payload structure
        const payload = newMessagesList.map((m) => ({
          role: m.role,
          content: m.content,
          attachments: m.attachments
        }));

        // Inject active language settings into prompt dynamically
        if (payload.length > 0) {
          const lastIndex = payload.length - 1;
          payload[lastIndex].content += ` [User Preference: Respond nicely keeping settings language in mind: ${language}]`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload }),
          signal: controller.signal
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "The server failed to respond. Please try again.");
        }

        const data = await res.json();

        const modelMsg: Message = {
          id: Math.random().toString(36).substring(7),
          role: "model",
          content: data.reply,
          timestamp: new Date()
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === currentId
              ? { ...c, messages: [...newMessagesList, modelMsg] }
              : c
          )
        );
      }
    } catch (err: any) {
      if (err.name === "AbortError") {
        console.log("Fetch aborted");
        return;
      }
      console.error(err);
      setError(err.message || "An unexpected error occurred. Please check your internet connection.");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Regenerate Response
  const handleRegenerateResponse = async () => {
    if (messages.length === 0 || loading) return;

    // Check if the last message is model, if so remove it
    let workingMessages = [...messages];
    const lastMsg = workingMessages[workingMessages.length - 1];

    if (lastMsg.role === "model") {
      workingMessages.pop(); // Remove latest assistant reply
    }

    // Also verify if there is a remaining user message to request on
    if (workingMessages.length === 0) return;

    setConversations((prev) =>
      prev.map((c) => (c.id === activeId ? { ...c, messages: workingMessages } : c))
    );

    setError(null);
    setLoading(true);

    const lastUserMsg = workingMessages[workingMessages.length - 1];
    const isRegenImage = lastUserMsg && lastUserMsg.content.startsWith("Generate image prompt: ");

    try {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      if (isRegenImage) {
        // Extract the original prompt and aspect ratio
        const match = lastUserMsg.content.match(/Generate image prompt: "([\s\S]*?)" \(Aspect Ratio: (.*?)\)/);
        const originalPrompt = match ? match[1] : lastUserMsg.content;
        const ratio = match ? match[2] : "1:1";

        const res = await fetch("/api/generate-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ prompt: originalPrompt, aspectRatio: ratio }),
          signal: controller.signal
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Image generation failed.");
        }

        const data = await res.json();

        const modelMsg: Message = {
          id: Math.random().toString(36).substring(7),
          role: "model",
          content: `मैंने आपके लिए प्रॉम्ट **"${originalPrompt}"** पर फिर से एक नई इमेज बनाई है! (Here is the newly generated image for your prompt!)`,
          timestamp: new Date(),
          attachments: [
            {
              name: `ai-generated-${Date.now()}.png`,
              type: "image",
              data: data.imageUrl,
              mimeType: "image/png"
            }
          ]
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, messages: [...workingMessages, modelMsg] } : c
          )
        );
      } else {
        const payload = workingMessages.map((m) => ({
          role: m.role,
          content: m.content
        }));

        // Inject language instructions
        if (payload.length > 0) {
          const lastIndex = payload.length - 1;
          payload[lastIndex].content += ` [User Preference: Respond nicely in ${language}]`;
        }

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ messages: payload }),
          signal: controller.signal
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "The server failed to respond.");
        }

        const data = await res.json();

        const modelMsg: Message = {
          id: Math.random().toString(36).substring(7),
          role: "model",
          content: data.reply,
          timestamp: new Date()
        };

        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeId ? { ...c, messages: [...workingMessages, modelMsg] } : c
          )
        );
      }
      handleShowNotification("Response regenerated successfully.");
    } catch (err: any) {
      if (err.name === "AbortError") return;
      console.error(err);
      setError(err.message || "Failed to regenerate response.");
    } finally {
      setLoading(false);
      abortControllerRef.current = null;
    }
  };

  // Copy AI response to clipboard
  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    handleShowNotification("Copied response to clipboard!");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleDownloadAttachment = (data: string, name: string) => {
    try {
      if (data.startsWith("data:")) {
        const parts = data.split(",");
        const mime = parts[0].match(/:(.*?);/)?.[1] || "image/png";
        const bstr = atob(parts[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) {
          u8arr[n] = bstr.charCodeAt(n);
        }
        const blob = new Blob([u8arr], { type: mime });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        handleShowNotification("Image download started!");
      } else {
        const a = document.createElement("a");
        a.href = data;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        handleShowNotification("File download started!");
      }
    } catch (error) {
      console.error("Download failed:", error);
      handleShowNotification("Download failed, opening image in new tab instead.");
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  const handleOpenAttachmentProperly = async (att: Attachment, index: number, msgId: string) => {
    if (att.url) {
      window.open(att.url, "_blank");
      return;
    }

    handleShowNotification("Generating proper direct link...");
    try {
      const res = await fetch("/api/register-media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data: att.data,
          name: att.name,
          mimeType: att.mimeType || "image/png"
        })
      });

      if (!res.ok) throw new Error("Failed to register with server");
      const data = await res.json();
      const httpUrl = data.url;

      // Update the attachment's url in local state active conversation so we don't have to re-register
      setConversations((prev) =>
        prev.map((c) => {
          if (c.id !== activeId) return c;
          return {
            ...c,
            messages: c.messages.map((m) => {
              if (m.id !== msgId) return m;
              if (!m.attachments) return m;
              return {
                ...m,
                attachments: m.attachments.map((a, i) =>
                  i === index ? { ...a, url: httpUrl } : a
                )
              };
            })
          };
        })
      );

      // Open the clean, proper new link!
      window.open(httpUrl, "_blank");
      handleShowNotification("Opened proper link successfully!");
    } catch (err) {
      console.error("Failed to generate direct link dynamically:", err);
      handleShowNotification("Link generation failed. Opening fallback in new window...");
      const win = window.open();
      if (win) {
        win.document.write(`<iframe src="${att.data}" frameborder="0" style="border:0; top:0px; left:0px; bottom:0px; right:0px; width:100%; height:100%;" allowfullscreen></iframe>`);
      }
    }
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem("udgtp_profile_name", userName);
    handleShowNotification("Profile updated successfully!");
  };

  const handleSaveSettings = (newTheme: "dark" | "light", newLang: "English" | "Hinglish" | "Hindi") => {
    setTheme(newTheme);
    setLanguage(newLang);
    localStorage.setItem("udgtp_theme", newTheme);
    localStorage.setItem("udgtp_lang", newLang);
    handleShowNotification("Settings updated successfully!");
  };

  const getSuggestionIcon = (iconName: string) => {
    switch (iconName) {
      case "Laugh":
        return <Laugh className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />;
      case "Briefcase":
        return <Briefcase className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />;
      case "Sprout":
        return <Sprout className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />;
      case "Utensils":
        return <Utensils className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />;
      default:
        return <Sparkles className="w-4 h-4 text-zinc-400 group-hover:text-zinc-200 transition-colors shrink-0" />;
    }
  };

  // Determine styles dynamically based on light/dark mode
  const isDark = theme === "dark";
  const bgClass = isDark ? "bg-[#09090b] text-zinc-100" : "bg-[#f4f4f5] text-zinc-900";
  const sidebarClass = isDark ? "bg-[#0c0c0e] border-zinc-800/40" : "bg-white border-zinc-200/80 shadow-md";
  const cardClass = isDark ? "bg-[#121215]/80 border-zinc-800/80" : "bg-white border-zinc-250 shadow-sm";
  const hoverCardClass = isDark ? "hover:border-zinc-700/60 hover:bg-[#15151a]" : "hover:border-zinc-300 hover:bg-zinc-50/50";
  const headerClass = isDark ? "bg-[#0d0d0f] border-zinc-800/40" : "bg-white border-zinc-200/80 shadow-sm";
  const bubbleUserClass = isDark ? "bg-zinc-800/80 text-white border-zinc-750" : "bg-zinc-900 text-white border-zinc-850";
  const bubbleModelClass = isDark ? "bg-[#0d0d0f] text-zinc-100 border-zinc-800" : "bg-white text-zinc-900 border-zinc-200 shadow-sm";
  const inputBgClass = isDark ? "bg-zinc-900 hover:bg-zinc-900/80 text-zinc-100 placeholder:text-zinc-500 border-zinc-800 focus:border-zinc-700" : "bg-white text-zinc-900 placeholder:text-zinc-400 border-zinc-300 focus:border-zinc-400";
  const textMutedClass = isDark ? "text-zinc-400" : "text-zinc-500";
  const subBorderClass = isDark ? "border-zinc-800/50" : "border-zinc-200";

  return (
    <div className={`flex h-screen w-full overflow-hidden font-sans transition-colors duration-200 ${bgClass}`}>
      
      {/* LEFT SIDEBAR - Desktop & Always Present */}
      <aside className={`hidden lg:flex w-72 shrink-0 flex-col h-full border-r transition-all duration-200 ${sidebarClass}`}>
        
        {/* Brand Header */}
        <div className={`p-5 flex items-center justify-between border-b ${subBorderClass}`}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-black border border-zinc-800 text-white flex items-center justify-center font-bold text-lg shadow-[0_0_8px_rgba(255,255,255,0.15)]">
              U
            </div>
            <div>
              <h2 className="text-base font-bold tracking-tight text-white">UDGTP</h2>
              <span className="text-[10px] text-zinc-400 font-semibold flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-blue-500 rounded-full animate-pulse" />
                Active v3.5
              </span>
            </div>
          </div>
        </div>

        {/* Action: New Chat Button */}
        <div className="p-4 shrink-0 pb-2">
          <button
            onClick={handleNewChat}
            className="w-full py-3 px-4 rounded-xl border border-dashed text-sm font-semibold transition-all duration-150 active:scale-95 flex items-center justify-center gap-2 cursor-pointer bg-zinc-850/40 hover:bg-zinc-850/80 text-zinc-200 border-zinc-800 hover:border-zinc-700"
          >
            <Plus className="w-4 h-4 text-blue-400" />
            <span>New Chat Session</span>
          </button>
        </div>

        {/* Search Previous Chats */}
        <div className="px-4 pb-2 pt-1 shrink-0">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search previous chats..."
              className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                isDark 
                  ? "bg-zinc-900/50 border-zinc-800/80 text-zinc-200 focus:border-zinc-700 placeholder:text-zinc-500" 
                  : "bg-zinc-100 border-zinc-200 text-zinc-850 focus:border-zinc-350 placeholder:text-zinc-400"
              }`}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 p-0.5 rounded-full hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors"
              >
                <X className="w-2.5 h-2.5" />
              </button>
            )}
          </div>
        </div>

        {/* Scrollable Chat History Sessions */}
        <div className="flex-1 overflow-y-auto px-3 space-y-1 py-1">
          <div className="px-3 py-1.5 text-[10px] font-bold text-zinc-500 uppercase tracking-wider">
            Conversations History
          </div>
          {filteredConversations.length === 0 ? (
            <p className="text-xs text-zinc-500 italic px-3 py-2">
              {searchQuery ? "No matches found" : "No history yet"}
            </p>
          ) : (
            filteredConversations.map((conv) => {
              const isActive = conv.id === activeId;
              const isEditing = editingConvId === conv.id;

              if (isEditing) {
                return (
                  <div
                    key={conv.id}
                    onClick={(e) => e.stopPropagation()}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs border ${
                      isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-300"
                    }`}
                  >
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveRename(conv.id);
                        if (e.key === "Escape") handleCancelRename();
                      }}
                      className="flex-1 bg-transparent border-none focus:outline-none text-xs font-semibold text-zinc-200"
                      autoFocus
                    />
                    <button
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 rounded hover:bg-zinc-800 hover:text-blue-400 text-zinc-400 transition-all"
                      title="Save Title"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={handleCancelRename}
                      className="p-1 rounded hover:bg-zinc-800 hover:text-red-400 text-zinc-400 transition-all"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={conv.id}
                  onClick={() => {
                    setActiveId(conv.id);
                    setActiveTab("chat");
                  }}
                  className={`group relative w-full flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                    isActive
                      ? isDark
                        ? "bg-zinc-900/90 text-white border border-zinc-800"
                        : "bg-zinc-900 text-white border border-zinc-800"
                      : isDark
                        ? "hover:bg-[#121215] text-zinc-400 hover:text-zinc-200 border border-transparent"
                        : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900 border border-transparent"
                  }`}
                >
                  <MessageSquare className={`w-4 h-4 shrink-0 ${isActive ? "text-blue-400" : "text-zinc-500 group-hover:text-zinc-400"}`} />
                  <span className="flex-1 truncate pr-12 text-left">{conv.title || "Untitled Session"}</span>
                  
                  <div className="absolute right-2 opacity-0 group-hover:opacity-100 flex items-center gap-0.5">
                    {/* Rename button */}
                    <button
                      onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 transition-colors"
                      title="Rename Chat"
                    >
                      <Pencil className="w-3 h-3" />
                    </button>

                    {/* Delete session button */}
                    <button
                      onClick={(e) => handleDeleteSession(conv.id, e)}
                      className="p-1 rounded hover:bg-zinc-800 text-zinc-400 hover:text-red-400 transition-colors"
                      title="Delete Conversation"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Navigation Sidebar Footer Tabs */}
        <div className={`p-3 shrink-0 border-t space-y-1.5 ${subBorderClass}`}>
          <button
            onClick={() => {
              setActiveTab("chat");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "chat"
                ? "bg-zinc-800/80 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <MessageSquare className="w-4 h-4" />
            <span>AI Assistant Workspace</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("profile");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "profile"
                ? "bg-zinc-800/80 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <UserIcon className="w-4 h-4" />
            <span>Your Profile</span>
          </button>

          <button
            onClick={() => {
              setActiveTab("settings");
              setIsSidebarOpen(false);
            }}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
              activeTab === "settings"
                ? "bg-zinc-800/80 text-white"
                : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
            }`}
          >
            <SettingsIcon className="w-4 h-4" />
            <span>Settings Panel</span>
          </button>
        </div>
      </aside>

      {/* MOBILE DRAWER SIDEBAR */}
      <AnimatePresence>
        {isSidebarOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.5 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsSidebarOpen(false)}
              className="fixed inset-0 bg-black/85 z-40 lg:hidden"
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className={`fixed inset-y-0 left-0 w-72 z-50 flex flex-col h-full border-r ${sidebarClass}`}
            >
              {/* Mobile Sidebar Header */}
              <div className={`p-4 flex justify-between items-center border-b ${subBorderClass}`}>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-black border border-zinc-800 text-white flex items-center justify-center font-bold font-sans shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                    U
                  </div>
                  <span className="font-bold text-sm text-white">UDGTP v3.5</span>
                </div>
                <button
                  onClick={() => setIsSidebarOpen(false)}
                  className="p-2 rounded-lg bg-zinc-900 text-zinc-400 hover:text-white cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Action: New Chat */}
              <div className="p-3 shrink-0 pb-1">
                <button
                  onClick={handleNewChat}
                  className="w-full py-2.5 px-4 rounded-xl bg-zinc-850/40 hover:bg-zinc-850/80 text-zinc-200 border border-zinc-800 text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-blue-400" />
                  <span>New Chat Session</span>
                </button>
              </div>

              {/* Mobile Search Previous Chats */}
              <div className="px-3 pb-2 pt-1 shrink-0">
                <div className="relative flex items-center">
                  <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-500" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search previous chats..."
                    className={`w-full pl-8 pr-7 py-2 rounded-xl text-xs border focus:outline-none transition-all ${
                      isDark 
                        ? "bg-zinc-900/50 border-zinc-800/80 text-zinc-200 focus:border-zinc-700 placeholder:text-zinc-500" 
                        : "bg-zinc-100 border-zinc-200 text-zinc-850 focus:border-zinc-350 placeholder:text-zinc-400"
                    }`}
                  />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2.5 p-0.5 rounded-full hover:bg-zinc-800 hover:text-white text-zinc-400 transition-colors"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Scrollable Chat History Sessions */}
              <div className="flex-1 overflow-y-auto px-3 space-y-1">
                <div className="px-3 py-1.5 text-[9px] font-bold text-zinc-500 uppercase tracking-wider">
                  Conversations History
                </div>
                {filteredConversations.length === 0 ? (
                  <p className="text-xs text-zinc-500 italic px-3 py-2">
                    {searchQuery ? "No matches found" : "No history yet"}
                  </p>
                ) : (
                  filteredConversations.map((conv) => {
                    const isActive = conv.id === activeId;
                    const isEditing = editingConvId === conv.id;

                    if (isEditing) {
                      return (
                        <div
                          key={conv.id}
                          onClick={(e) => e.stopPropagation()}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs border ${
                            isDark ? "bg-zinc-900 border-zinc-800" : "bg-white border-zinc-300"
                          }`}
                        >
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") handleSaveRename(conv.id);
                              if (e.key === "Escape") handleCancelRename();
                            }}
                            className="flex-1 bg-transparent border-none focus:outline-none text-xs font-semibold text-zinc-200"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-0.5 rounded hover:bg-zinc-800 text-blue-400"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={handleCancelRename}
                            className="p-0.5 rounded hover:bg-zinc-800 text-zinc-400"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      );
                    }

                    return (
                      <div
                        key={conv.id}
                        onClick={() => {
                          setActiveId(conv.id);
                          setActiveTab("chat");
                          setIsSidebarOpen(false);
                        }}
                        className={`relative w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                          conv.id === activeId
                            ? isDark
                              ? "bg-zinc-800/70 text-white border border-zinc-700/80"
                              : "bg-zinc-900 text-white border border-zinc-800"
                            : isDark
                              ? "hover:bg-[#121215] text-zinc-400 hover:text-zinc-200"
                              : "hover:bg-zinc-100 text-zinc-600 hover:text-zinc-900"
                        }`}
                      >
                        <MessageSquare className={`w-3.5 h-3.5 ${conv.id === activeId ? "text-blue-400" : "text-zinc-500"}`} />
                        <span className="truncate flex-1 text-left pr-10">{conv.title}</span>
                        
                        <div className="absolute right-2 flex items-center gap-1">
                          <button
                            onClick={(e) => handleStartRename(conv.id, conv.title, e)}
                            className="p-1 text-zinc-500 hover:text-zinc-200 transition-colors"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                          <button
                            onClick={(e) => handleDeleteSession(conv.id, e)}
                            className="p-1 text-zinc-500 hover:text-red-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Mobile Sidebar Footer */}
              <div className={`p-3 shrink-0 border-t space-y-1 ${subBorderClass}`}>
                <button
                  onClick={() => {
                    setActiveTab("chat");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    activeTab === "chat" ? "bg-zinc-800 text-white" : "text-zinc-400"
                  }`}
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>AI Assistant Workspace</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("profile");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    activeTab === "profile" ? "bg-zinc-800 text-white" : "text-zinc-400"
                  }`}
                >
                  <UserIcon className="w-4 h-4" />
                  <span>Your Profile</span>
                </button>
                <button
                  onClick={() => {
                    setActiveTab("settings");
                    setIsSidebarOpen(false);
                  }}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer ${
                    activeTab === "settings" ? "bg-zinc-800 text-white" : "text-zinc-400"
                  }`}
                >
                  <SettingsIcon className="w-4 h-4" />
                  <span>Settings Panel</span>
                </button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>

      {/* MAIN WORKSPACE AREA */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        
        {/* TOP HEADER */}
        <header className={`flex items-center justify-between px-4 md:px-6 py-4 border-b shrink-0 z-30 transition-colors ${headerClass}`}>
          <div className="flex items-center gap-3">
            {/* Sidebar Toggle (Mobile) */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 -ml-1 rounded-xl bg-zinc-900/40 border border-zinc-800/40 text-zinc-400 hover:text-white lg:hidden cursor-pointer transition-all"
            >
              <Menu className="w-4 h-4" />
            </button>
            
            {/* Tab Title Indicator */}
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-zinc-400 animate-pulse" />
              <h1 className="text-sm md:text-base font-bold tracking-tight">
                {activeTab === "chat" && (activeConversation?.title || "AI Workspace")}
                {activeTab === "profile" && "Pratham's Profile Profile"}
                {activeTab === "settings" && "General Settings"}
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Live Clock HUD */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900/60 text-zinc-400 border border-zinc-800/60 text-xs font-mono">
              <Clock className="w-3.5 h-3.5 text-zinc-500" />
              <span>{currentTime || "12:00 PM"}</span>
            </div>

            {/* Clear Chat Button (only visible in active chat view with content) */}
            {activeTab === "chat" && messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-400 hover:text-red-300 bg-red-500/10 hover:bg-red-500/15 border border-red-500/15 cursor-pointer transition-all"
                title="Clear current log"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Log</span>
              </button>
            )}

            {/* Return To Chat Quick Button */}
            {activeTab !== "chat" && (
              <button
                onClick={() => setActiveTab("chat")}
                className="px-3 py-1.5 rounded-xl text-xs font-bold bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:text-white transition-all cursor-pointer shadow-md"
              >
                Return to Chat
              </button>
            )}
          </div>
        </header>

        {/* GLOBAL TEMPORARY FLOATING NOTIFICATIONS */}
        <AnimatePresence>
          {notification && (
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              className="absolute top-18 left-1/2 -translate-x-1/2 bg-zinc-900 text-zinc-100 px-5 py-3 rounded-2xl shadow-2xl border border-zinc-800 z-50 text-xs md:text-sm font-semibold max-w-sm text-center flex items-center justify-center gap-2.5"
            >
              <Sparkles className="w-4 h-4 text-zinc-400 shrink-0" />
              <span>{notification}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* VIEW 1: CHAT WORKSPACE CONTAINER */}
        {activeTab === "chat" && (
          <div className="flex-1 overflow-y-auto px-4 py-6 md:px-6 md:py-8 space-y-6">
            
            {/* ZERO-STATE: Dynamic Welcome & Sugesstion Pills */}
            {messages.length === 0 ? (
              <div className="max-w-2xl mx-auto space-y-8 py-6 md:py-12">
                
                {/* Brand Visual Intro */}
                <div className="text-center space-y-3.5">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-black border border-zinc-800 text-white text-3xl font-extrabold mb-1 shadow-[0_0_15px_rgba(255,255,255,0.15)]">
                    U
                  </div>
                  <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight animate-fade-in">
                    Hello! I'm UDGTP. How can I help you today?
                  </h2>
                  <p className="text-xs md:text-sm text-zinc-400 max-w-md mx-auto leading-relaxed">
                    I am highly optimized to support coding roadmaps, technical guidance, organic agriculture steps, and traditional Indian advice. Let's begin!
                  </p>
                </div>

                {/* Suggestions Pills Grid */}
                <div className="space-y-4">
                  <h3 className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest text-center">
                    Choose a suggested prompt to start
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {SUGGESTIONS.map((sug) => (
                      <button
                        key={sug.id}
                        onClick={() => handleSendMessage(sug.text)}
                        className={`group flex items-start gap-3.5 p-4 rounded-2xl border text-left cursor-pointer transition-all duration-150 ${cardClass} ${hoverCardClass}`}
                      >
                        <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 shrink-0">
                          {getSuggestionIcon(sug.icon)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="block text-xs md:text-sm font-semibold text-zinc-200 group-hover:text-white truncate">
                            {sug.title}
                          </span>
                          <span className="block text-[11px] text-zinc-400 font-normal line-clamp-1 mt-0.5">
                            {sug.text}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Micro Help Footer Info */}
                <div className="flex items-center justify-center gap-1.5 text-[10px] text-zinc-500 italic">
                  <Compass className="w-3.5 h-3.5 text-zinc-600" />
                  <span>Preferences set to {language} dialect mode</span>
                </div>

              </div>
            ) : (
              
              /* CHAT MESSAGES LOG */
              <div className="max-w-3xl mx-auto space-y-6 pb-24">
                {messages.map((msg, idx) => {
                  const isUser = msg.role === "user";
                  return (
                    <div
                      key={msg.id}
                      className={`flex gap-3 md:gap-4 ${isUser ? "justify-end" : "justify-start"}`}
                    >
                      {/* Avatar Indicator - Left */}
                      {!isUser && (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-black border border-zinc-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                          U
                        </div>
                      )}

                      {/* Chat Bubble Body */}
                      <div className={`max-w-[85%] rounded-2xl px-4 py-3.5 md:px-5 md:py-4 border transition-all ${
                        isUser ? bubbleUserClass : bubbleModelClass
                      }`}>
                        
                        {/* Text Content */}
                        {isUser ? (
                          <div className="space-y-3">
                            <p className="text-sm md:text-[15px] leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                            
                            {/* Render User Attached Media/Files */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-2.5 pt-1">
                                {msg.attachments.map((att, attIdx) => {
                                  if (att.type === "image") {
                                    return (
                                      <div key={attIdx} className="relative group max-w-sm">
                                        <img
                                          src={att.data}
                                          alt={att.name}
                                          referrerPolicy="no-referrer"
                                          className="max-h-48 md:max-h-64 rounded-xl border border-zinc-700/80 object-contain bg-zinc-950 shadow-md"
                                        />
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={attIdx}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs shadow-md"
                                      >
                                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <div className="text-left min-w-0">
                                          <p className="font-semibold truncate max-w-[140px] text-zinc-200">{att.name}</p>
                                          <p className="text-[10px] text-zinc-500 font-mono">
                                            {att.size ? (att.size / 1024).toFixed(1) : "0"} KB
                                          </p>
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <MarkdownView text={msg.content} />
                            
                            {/* Render Model Attached/Generated Images with Download Option */}
                            {msg.attachments && msg.attachments.length > 0 && (
                              <div className="flex flex-wrap gap-3 pt-1">
                                {msg.attachments.map((att, attIdx) => {
                                  if (att.type === "image") {
                                    return (
                                      <div key={attIdx} className="relative group max-w-lg mt-2">
                                        <img
                                          src={att.data}
                                          alt={att.name}
                                          referrerPolicy="no-referrer"
                                          className="max-h-96 w-full rounded-xl border border-zinc-700/85 object-contain bg-zinc-950 shadow-lg"
                                        />
                                        {/* Hover download button overlay */}
                                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5">
                                          <button
                                            onClick={() => handleOpenAttachmentProperly(att, attIdx, msg.id)}
                                            className="bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-white cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-emerald-400"
                                            title="Open link properly without redirect warnings"
                                          >
                                            <Globe className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
                                            <span>Open proper link</span>
                                          </button>
                                          <button
                                            onClick={() => handleDownloadAttachment(att.data, att.name)}
                                            className="bg-zinc-950/90 hover:bg-zinc-950 border border-zinc-800 p-2 rounded-xl text-white cursor-pointer shadow-md flex items-center gap-1.5 text-xs font-semibold transition-colors hover:text-blue-400"
                                          >
                                            <Download className="w-3.5 h-3.5 text-blue-400" />
                                            <span>Download</span>
                                          </button>
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div
                                        key={attIdx}
                                        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 text-xs shadow-md mt-2"
                                      >
                                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                                        <div className="text-left min-w-0">
                                          <p className="font-semibold truncate max-w-[140px] text-zinc-200">{att.name}</p>
                                        </div>
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            )}
                            
                            {/* Action Bar inside AI Response */}
                            <div className="flex items-center gap-2 pt-2 border-t border-zinc-800/40 text-xs text-zinc-500">
                              {/* Copy response */}
                              <button
                                onClick={() => handleCopyText(msg.id, msg.content)}
                                className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1.5 rounded-lg border border-zinc-800"
                                title="Copy response text"
                              >
                                {copiedId === msg.id ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-zinc-300" />
                                    <span className="text-zinc-300 font-medium">Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3.5 h-3.5" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>

                              {/* Voice Output Player (Read Aloud) */}
                              <button
                                onClick={() => handleSpeak(msg.id, msg.content)}
                                className={`flex items-center gap-1 hover:text-white transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1.5 rounded-lg border border-zinc-800 ${
                                  speakingMessageId === msg.id ? "text-blue-400 border-blue-500/35 font-semibold bg-zinc-850" : ""
                                }`}
                                title={speakingMessageId === msg.id ? "Stop voice player" : "Listen to answer"}
                              >
                                {speakingMessageId === msg.id ? (
                                  <>
                                    <VolumeX className="w-3.5 h-3.5 text-blue-400 animate-pulse" />
                                    <span>Stop listening</span>
                                  </>
                                ) : (
                                  <>
                                    <Volume2 className="w-3.5 h-3.5" />
                                    <span>Listen</span>
                                  </>
                                )}
                              </button>

                              {/* Regenerate Response (available on latest message) */}
                              {idx === messages.length - 1 && (
                                <button
                                  onClick={handleRegenerateResponse}
                                  className="flex items-center gap-1 hover:text-white transition-colors cursor-pointer bg-zinc-900 hover:bg-zinc-850 px-2.5 py-1.5 rounded-lg border border-zinc-800"
                                  title="Regenerate this response"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                  <span>Regenerate</span>
                                </button>
                              )}
                            </div>
                          </div>
                        )}

                        {/* Timestamp indicator */}
                        <div className="flex justify-between items-center text-[9px] text-zinc-500 mt-2">
                          <span className="font-mono">
                            {msg.timestamp.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>

                      </div>

                      {/* Avatar Indicator - Right */}
                      {isUser && (
                        <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-zinc-800 text-zinc-300 font-bold text-xs flex items-center justify-center shrink-0 border border-zinc-700">
                          {userName.charAt(0) || "Y"}
                        </div>
                      )}

                    </div>
                  );
                })}

                {/* Generating Loading States */}
                {loading && (
                  <div className="flex gap-3 md:gap-4 justify-start">
                    <div className="w-8 h-8 md:w-9 md:h-9 rounded-full bg-black border border-zinc-800 text-white font-extrabold text-sm flex items-center justify-center shrink-0 shadow-[0_0_8px_rgba(255,255,255,0.15)]">
                      U
                    </div>
                    <div className={`rounded-2xl rounded-tl-none border px-5 py-4 shadow-sm space-y-2.5 ${bubbleModelClass}`}>
                      <div className="flex items-center gap-1.5 text-xs text-zinc-400 font-semibold italic">
                        <Sparkles className="w-3.5 h-3.5 text-zinc-400 animate-spin" />
                        <span>UDGTP is looking up info...</span>
                      </div>
                      <div className="flex gap-1.5 py-1">
                        <span className="w-2 h-2 rounded-full bg-zinc-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                        <span className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "150ms" }} />
                        <span className="w-2 h-2 rounded-full bg-zinc-600 animate-bounce" style={{ animationDelay: "300ms" }} />
                      </div>
                    </div>
                  </div>
                )}

                {/* Error Box */}
                {error && (
                  <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3 max-w-xl mx-auto">
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-red-300 space-y-1">
                      <p className="font-bold">An error occurred:</p>
                      <p>{error}</p>
                      <button 
                        onClick={() => handleSendMessage()} 
                        className="mt-2 text-[11px] font-semibold text-red-400 underline flex items-center gap-1 cursor-pointer hover:text-red-300"
                      >
                        <RotateCcw className="w-3 h-3" /> Retry sending last prompt
                      </button>
                    </div>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

          </div>
        )}

        {/* VIEW 2: PROFILE PAGE */}
        {activeTab === "profile" && (
          <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 max-w-3xl mx-auto w-full space-y-6">
            <div className={`p-6 md:p-8 rounded-2xl border ${cardClass}`}>
              
              <div className="flex flex-col md:flex-row items-center gap-6 border-b pb-6 mb-6 border-zinc-800/40">
                <div className="w-20 h-20 rounded-full bg-black border border-zinc-800 flex items-center justify-center font-bold text-3xl text-white shadow-[0_0_15px_rgba(255,255,255,0.15)] shrink-0">
                  {userName.charAt(0) || "P"}
                </div>
                <div className="text-center md:text-left">
                  <h2 className="text-xl font-bold">{userName}</h2>
                  <p className="text-xs text-zinc-500 font-mono mt-0.5">{userEmail}</p>
                  <p className="text-[11px] bg-zinc-800/40 text-zinc-300 border border-zinc-700/50 px-2.5 py-0.5 rounded-full inline-block mt-2 font-semibold">
                    Developer tier membership
                  </p>
                </div>
              </div>

              {/* Form editing profile details */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <h3 className="text-sm font-bold text-zinc-300 uppercase tracking-widest flex items-center gap-2">
                  Edit Personal Info
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Display Name</label>
                    <input
                      type="text"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      className={`w-full p-3 rounded-xl border text-sm ${inputBgClass}`}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-zinc-400">Primary Email Address</label>
                    <input
                      type="email"
                      value={userEmail}
                      onChange={(e) => setUserEmail(e.target.value)}
                      className={`w-full p-3 rounded-xl border text-sm ${inputBgClass}`}
                      required
                    />
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-100 hover:bg-zinc-800 hover:text-white text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-md"
                  >
                    Save profile changes
                  </button>
                </div>
              </form>

            </div>

            {/* AI stats metrics */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border ${cardClass} text-center space-y-1`}>
                <span className="text-xs text-zinc-500">Conversations</span>
                <p className="text-2xl font-black text-white">{conversations.length}</p>
              </div>
              <div className={`p-4 rounded-xl border ${cardClass} text-center space-y-1`}>
                <span className="text-xs text-zinc-500">API Calls Speed</span>
                <p className="text-2xl font-black text-zinc-300">~0.7s (Fast)</p>
              </div>
              <div className={`p-4 rounded-xl border ${cardClass} text-center space-y-1`}>
                <span className="text-xs text-zinc-500">Billing Usage</span>
                <p className="text-2xl font-black text-white">$0.00 (Free Trial)</p>
              </div>
            </div>
          </div>
        )}

        {/* VIEW 3: SETTINGS PAGE */}
        {activeTab === "settings" && (
          <div className="flex-1 overflow-y-auto px-4 py-8 md:px-8 max-w-3xl mx-auto w-full space-y-6">
            
            <div className={`p-6 md:p-8 rounded-2xl border ${cardClass} space-y-6`}>
              
              <h2 className="text-lg font-bold border-b pb-4 border-zinc-800/40 flex items-center gap-2">
                <SettingsIcon className="w-5 h-5 text-zinc-400" />
                Customize Workspace Settings
              </h2>

              {/* Theme Settings */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Moon className="w-4 h-4 text-zinc-500" />
                  Visual Workspace Theme
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Toggle between eye-safe Dark Theme and High-Contrast Light Theme.
                </p>
                <div className="flex items-center gap-2.5 pt-1.5">
                  <button
                    type="button"
                    onClick={() => handleSaveSettings("dark", language)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theme === "dark"
                        ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    <span>Eye-safe Dark Mode</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSaveSettings("light", language)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                      theme === "light"
                        ? "bg-zinc-100 text-zinc-900 border-zinc-300"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400"
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    <span>High-Contrast Light Mode</span>
                  </button>
                </div>
              </div>

              {/* Language Preference Settings */}
              <div className="space-y-2 pt-3">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Globe className="w-4 h-4 text-zinc-500" />
                  AI Companion Language
                </h3>
                <p className="text-xs text-zinc-500 leading-relaxed">
                  Adjust default conversation system prompts response style.
                </p>
                <div className="flex flex-wrap items-center gap-2.5 pt-1.5">
                  {(["English", "Hinglish", "Hindi"] as const).map((lang) => (
                    <button
                      key={lang}
                      type="button"
                      onClick={() => handleSaveSettings(theme, lang)}
                      className={`px-4 py-2 rounded-xl border text-xs font-semibold cursor-pointer transition-all ${
                        language === lang
                          ? isDark
                            ? "bg-zinc-800 text-zinc-100 border-zinc-700"
                            : "bg-zinc-150 text-zinc-900 border-zinc-300"
                          : "bg-zinc-900 border-zinc-800 text-zinc-400"
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
              </div>

              {/* About Section */}
              <div className="space-y-3 pt-4 border-t border-zinc-800/40">
                <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-widest flex items-center gap-2">
                  <Info className="w-4 h-4 text-zinc-500" />
                  About UDGTP Platform
                </h3>
                <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                  UDGTP (Ultra-Dynamic Guidance Text Platform) is built on Google Gemini 3.5 Flash server-side engine APIs. It serves fully persistent chat sessions, supports rich nested rendering with custom copy controllers, and obeys localized cultural instructions.
                </p>
                
                {/* Core Principles */}
                <div className="space-y-2.5 pt-2">
                  {PRINCIPLES.map((principle, index) => (
                    <div key={index} className="p-3 rounded-xl bg-zinc-900/40 border border-zinc-800/40">
                      <span className="text-xs font-bold text-zinc-200 block">✦ {principle.title}</span>
                      <span className="text-[11px] text-zinc-500 leading-relaxed block mt-0.5">{principle.description}</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

          </div>
        )}

        {/* BOTTOM INPUT FOOTER BAR */}
        {activeTab === "chat" && (
          <div className={`p-4 border-t shrink-0 z-20 ${headerClass}`}>
            <div className="max-w-3xl mx-auto">
              
              {/* Staged Attachments Preview bar */}
              {stagedAttachments.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3 p-2.5 rounded-xl bg-zinc-950/40 border border-zinc-800/40 max-h-24 overflow-y-auto">
                  {stagedAttachments.map((att, idx) => (
                    <div
                      key={idx}
                      className="relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 shadow-sm"
                    >
                      {att.type === "image" ? (
                        <img
                          src={att.data}
                          alt={att.name}
                          className="w-5 h-5 rounded object-cover border border-zinc-700/50"
                        />
                      ) : (
                        <FileText className="w-4 h-4 text-zinc-400 shrink-0" />
                      )}
                      <span className="max-w-[120px] truncate text-[11px] font-medium">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => setStagedAttachments((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-0.5 rounded-full hover:bg-zinc-800 text-zinc-500 hover:text-red-400 transition-colors cursor-pointer"
                        title="Remove file"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Dynamic Action Buttons above text-box */}
              <div className="flex justify-between items-center gap-2 mb-2">
                {/* Left side: Stop generating OR Generate image mode toggle */}
                {loading ? (
                  <button
                    type="button"
                    onClick={handleStopGenerating}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 cursor-pointer animate-pulse"
                  >
                    <StopCircle className="w-3.5 h-3.5" />
                    <span>Stop Generating</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsGenerateImageMode(!isGenerateImageMode)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border cursor-pointer transition-all ${
                      isGenerateImageMode
                        ? "bg-blue-500/15 border-blue-500/40 text-blue-400 font-bold shadow-[0_0_12px_rgba(59,130,246,0.15)]"
                        : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50"
                    }`}
                    title="Toggle एआई इमेज जनरेशन मोड (AI Image Generation Mode)"
                  >
                    <Sparkles className={`w-3.5 h-3.5 ${isGenerateImageMode ? "text-blue-400 animate-pulse" : "text-zinc-400"}`} />
                    <span>{isGenerateImageMode ? "Generate Image: ON" : "Generate Image Mode"}</span>
                  </button>
                )}

                {/* Regenerate Response button when model completed */}
                {!loading && messages.length > 0 && messages[messages.length - 1].role === "model" && (
                  <button
                    type="button"
                    onClick={handleRegenerateResponse}
                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-semibold text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Regenerate Response</span>
                  </button>
                )}
              </div>

              {/* Aspect Ratio Picker when in Generate Image mode */}
              {isGenerateImageMode && (
                <div className="flex items-center gap-2.5 mb-2.5 p-2 rounded-xl bg-blue-950/15 border border-blue-900/35 text-xs">
                  <span className="text-blue-400 font-medium ml-1">Aspect Ratio:</span>
                  {(["1:1", "16:9", "4:3", "9:16"] as const).map((ratio) => (
                    <button
                      key={ratio}
                      type="button"
                      onClick={() => setImageAspectRatio(ratio)}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all cursor-pointer ${
                        imageAspectRatio === ratio
                          ? "bg-blue-500 text-white shadow-sm"
                          : "bg-zinc-900 text-zinc-400 hover:text-zinc-200 border border-zinc-800"
                      }`}
                    >
                      {ratio}
                    </button>
                  ))}
                  <span className="text-zinc-500 text-[10px] ml-auto font-mono">Powered by Google Imagen</span>
                </div>
              )}

              {/* Main Submit Form with integrated voice and attachment tools */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendMessage();
                }}
                className="relative flex items-center"
              >
                {/* Hidden File Input */}
                <input
                  type="file"
                  id="chat-file-upload"
                  multiple
                  onChange={(e) => handleFileChange(e)}
                  className="hidden"
                  accept="image/*,text/*,.pdf,.doc,.docx,.json,.js,.ts"
                />

                {/* Hidden Image Input */}
                <input
                  type="file"
                  id="chat-image-upload"
                  onChange={(e) => handleFileChange(e, "image")}
                  className="hidden"
                  accept="image/*"
                />

                {/* Left Side 1: Attachment Paperclip Icon */}
                <button
                  type="button"
                  onClick={() => document.getElementById("chat-file-upload")?.click()}
                  disabled={loading}
                  className="absolute left-3 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all cursor-pointer disabled:opacity-40"
                  title="Attach any file"
                >
                  <Paperclip className="w-4 h-4" />
                </button>

                {/* Left Side 2: Dedicated Upload Image Button */}
                <button
                  type="button"
                  onClick={() => document.getElementById("chat-image-upload")?.click()}
                  disabled={loading}
                  className="absolute left-11 p-2 rounded-xl text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40 transition-all cursor-pointer disabled:opacity-40"
                  title="Upload Image"
                >
                  <ImageIcon className="w-4 h-4 text-emerald-500" />
                </button>

                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={
                    isGenerateImageMode 
                      ? "Describe the image you want UDGTP to generate..." 
                      : "Message UDGTP..."
                  }
                  disabled={loading}
                  className={`w-full pl-[76px] pr-24 py-3.5 rounded-2xl border focus:outline-none transition-all text-sm md:text-base disabled:opacity-50 ${
                    isGenerateImageMode 
                      ? "border-blue-500/50 bg-blue-950/5 shadow-[0_0_15px_rgba(59,130,246,0.15)] placeholder:text-blue-300/40" 
                      : inputBgClass
                  }`}
                />

                {/* Right Side Inner: Voice mic and Send trigger */}
                <div className="absolute right-2.5 flex items-center gap-1.5">
                  {/* Speech-to-text recording mic */}
                  <button
                    type="button"
                    onClick={isListening ? stopListening : startListening}
                    disabled={loading}
                    className={`p-2 rounded-xl transition-all cursor-pointer ${
                      isListening 
                        ? "bg-red-500/10 text-red-400 border border-red-500/30 animate-pulse" 
                        : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/40"
                    }`}
                    title={isListening ? "Voice typing active... click to pause" : "Voice typing typing input"}
                  >
                    {isListening ? (
                      <MicOff className="w-4 h-4 text-red-400 animate-bounce" />
                    ) : (
                      <Mic className="w-4 h-4" />
                    )}
                  </button>

                  <button
                    type="submit"
                    disabled={loading || (!input.trim() && stagedAttachments.length === 0)}
                    className="p-2 rounded-xl bg-zinc-950 border border-zinc-800/80 hover:bg-[#121215] disabled:opacity-35 transition-all flex items-center justify-center cursor-pointer disabled:cursor-not-allowed active:scale-95 shadow-md"
                    title={isGenerateImageMode ? "Generate AI Image" : "Send Message"}
                  >
                    {isGenerateImageMode ? (
                      <Sparkles className="w-4 h-4 text-[#3b82f6]" />
                    ) : (
                      <Send className="w-4 h-4 text-[#3b82f6]" />
                    )}
                  </button>
                </div>
              </form>
              
              <p className="text-[10px] text-zinc-500 text-center mt-2.5 font-normal">
                UDGTP may provide helpful summaries and step-by-step guidance. Confirm important facts.
              </p>
            </div>
          </div>
        )}

      </main>
    </div>
  );
}
