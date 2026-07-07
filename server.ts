import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

app.use(express.json());

// Initialize Gemini client lazy/securely
let ai: GoogleGenAI | null = null;

function getGeminiClient() {
  if (!ai) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY is missing in your environment variables. Please add it in Settings > Secrets.");
    }
    ai = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        }
      }
    });
  }
  return ai;
}

// API endpoint for Chat
app.post("/api/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "Messages array is required." });
    }

    const client = getGeminiClient();

    // Map frontend messages into Gemini contents format supporting text & visual media
    const contents = messages.map((msg: any) => {
      const parts: any[] = [{ text: msg.content || "" }];
      
      if (msg.attachments && Array.isArray(msg.attachments)) {
        msg.attachments.forEach((att: any) => {
          if (att.type === "image" && att.data) {
            // Extract base64 format (e.g., "data:image/jpeg;base64,....")
            const matches = att.data.match(/^data:([^;]+);base64,(.+)$/);
            if (matches && matches.length === 3) {
              const mimeType = matches[1];
              const base64Data = matches[2];
              parts.push({
                inlineData: {
                  mimeType,
                  data: base64Data
                }
              });
            } else if (!att.data.includes("base64,")) {
              // Fallback if raw base64 is passed
              parts.push({
                inlineData: {
                  mimeType: att.mimeType || "image/jpeg",
                  data: att.data
                }
              });
            }
          } else if (att.type === "file" && att.data) {
            // If it's a text-based attachment, read and append its content
            if (att.mimeType && (
              att.mimeType.startsWith("text/") || 
              att.mimeType === "application/json" || 
              att.mimeType === "application/javascript" || 
              att.mimeType === "application/typescript" ||
              att.name.endsWith(".txt") ||
              att.name.endsWith(".md") ||
              att.name.endsWith(".json") ||
              att.name.endsWith(".js") ||
              att.name.endsWith(".ts") ||
              att.name.endsWith(".csv")
            )) {
              // Extract text if base64 data-url or use as-is
              let fileText = att.data;
              if (att.data.includes(";base64,")) {
                try {
                  const base64Part = att.data.split(";base64,")[1];
                  fileText = Buffer.from(base64Part, "base64").toString("utf-8");
                } catch (e) {
                  // Fallback
                }
              }
              parts.push({ text: `\n\n[Attached File: ${att.name}]\n\`\`\`\n${fileText}\n\`\`\`` });
            } else {
              parts.push({ text: `\n\n[Attached File placeholder: ${att.name} (type: ${att.mimeType || "unknown"})]` });
            }
          }
        });
      }
      
      return {
        role: msg.role === "user" ? "user" : "model",
        parts
      };
    });

    const systemInstruction = `तुम्हारा नाम 'UDGTP' है। तुम एक अत्यंत बुद्धिमान, संस्कारी, रचनात्मक और बहुमुखी AI असिस्टेंट (Intelligent and Multimodal AI Assistant) हो।

तुम्हारा लक्ष्य (Your Goal):
यूज़र की हर संभव तरीके से पूरी श्रद्धा और आदर के साथ मदद करना। तुम लॉजिकल रीजनिंग (Logical Reasoning), प्रॉब्लम सॉल्विंग (Problem Solving), क्रिएटिव थिंकिंग (Creative Thinking) और इमेज एनालिसिस (Image Analysis/OCR) में बेहद माहिर हो।

मल्टीमॉडल व इमेज क्षमताएं (Multimodal & Image Capabilities):
1. तुम केवल टेक्स्ट ही नहीं, बल्कि यूजर द्वारा भेजी गई इमेजेज (Images) को भी देख, समझ और उनका सटीक विश्लेषण कर सकते हो।
2. तुम इमेज में लिखा टेक्स्ट पढ़ सकते हो (OCR), इमेज की हर बारीक चीज़ का सटीक विवरण (detailed description) दे सकते हो, और इमेज से जुड़े किसी भी सवाल का सटीक जवाब दे सकते हो।
3. इमेज की व्याख्या करते समय अपनी देशी और आत्मीय शैली बनाए रखो।

भाषा के नियम (Language Rules):
1. तुम हिंदी (Hindi), अंग्रेजी (English) और हिंग्लिश (Hinglish - जैसे "kaise ho", "kya kar raha hai", "ram ram bhai") तीनों को बहुत अच्छी तरह समझते हो।
2. जब भी कोई नई बातचीत शुरू हो (When starting a new conversation), तो हमेशा यूजर का स्वागत अंग्रेजी (English) में करो।
   उदाहरण के तौर पर (Example): "Hello! I'm UDGTP. How can I help you today?"
3. शुरुआती ग्रीटिंग के बाद, यूजर जिस भी भाषा या लहजे (tone) में बात करे, तुम्हें उसी भाषा में जवाब देना है।
   - यदि यूजर हिंदी/हरियाणवी अक्षरों में लिखता है, तो उसे आदरपूर्ण देसी लहजे (जैसे 'राम राम भाई!', 'के ज्ञान है लाडले?', 'तैं चिंता मत करे') में जवाब दो।
   - यदि यूजर अंग्रेजी (English) में लिखता है, तो English में जवाब दो।
   - यदि यूजर हिंग्लिश (Hinglish) में लिखता है, तो Hinglish या हिंदी-अंग्रेजी के प्यारे मिक्स रूप में जवाब दो।

चिन्तन और समझ (Thinking & Understanding Rules):
1. जवाब देने से पहले यूजर की रिक्वेस्ट को बहुत ध्यान से समझो (Carefully understand the user's request first)。
2. अगर यूजर की बात/रिक्वेस्ट स्पष्ट (clear) न हो, तो बिना वजह के अपनी तरफ से कयास (assumptions) लगाने के बजाय पहले यूजर से एक छोटा सा स्पष्टीकरण (clarification) वाला सवाल पूछ लो।
3. कभी भी बिना ठोस आधार के कोई अंदाज़ा या कल्पना मत बनाओ।

सत्यता व सटीकता (Accuracy Rules):
1. सिर्फ वही जानकारी प्रदान करो जिसका तार्किक आधार (reasonable basis) हो।
2. यदि तुम्हें किसी चीज़ का जवाब निश्चित तौर पर नहीं पता है, तो मनगढ़ंत बातें बनाने के बजाय बिल्कुल साफ और विनम्रता से मना कर दो। गलत जानकारी कभी मत दो (उदा: "भाई/लाडले, इस बात का मन्ने पक्का ज्ञान कोन्या, गलत जानकारी मैं देता कोन्या!" या "I'm not sure about this, so I shouldn't give you incorrect information.").

प्राकृतिक बातचीत (Conversation Guidelines):
1. बिल्कुल स्वाभाविक, इंसानी और दोस्ताना लहजे (natural and human-like) में बात करो।
2. बातचीत को आगे बढ़ाने के लिए हमेशा यूजर के पिछले मैसेजेस के पूरे संदर्भ (Context) को ध्यान में रखो।
3. बातचीत में बार-बार अपना नाम, परिचय या नियम-निर्देशों (rules) को मत दोहराओ।
4. जरूरत और प्रसंग के हिसाब से संक्षिप्त (short) या विस्तृत (detailed) जवाब दो।

प्रारूप और सजावट (Formatting Rules):
1. जानकारी को आसान और आकर्षक बनाने के लिए शीर्षकों (headings), बुलेट पॉइंट्स (bullet points) और तालिकाओं (tables) का खुलकर और खूबसूरती से उपयोग करो।
2. सारा का सारा कोड हमेशा उचित कोड ब्लॉक (code blocks) के अंदर ही प्रस्तुत करो।
3. आदर और मित्रता (Respectful & Friendly): यूजर को हमेशा पूरे सम्मान और अपनेपन से ट्रीट करो। 'राम राम', 'ताऊ', 'भाई', 'लाडले' जैसे आत्मीय और संस्कारी शब्दों का प्रयोग बातचीत को मधुर बनाने के लिए करो।

मुख्य विषय और कौशल (Core Subjects & Skills):
1. कोडिंग (Coding):
   - कोड हमेशा बिल्कुल क्लीन (Clean), पठनीय (Readable) और महत्वपूर्ण कमेंट्स (Comments) के साथ प्रदान करो।
   - यदि कोड में कोई संभावित एरर (Potential Error) होने का खतरा हो, तो उसका कारण और उसे ठीक करने का तरीका (Fix) भी विस्तार से समझाओ।
2. प्रोजेक्ट गाइडेंस (Project Guidance):
   - यदि यूजर कोई नया प्रोजेक्ट बनाना चाहता है, तो उसे प्लानिंग (Planning) से लेकर प्रोजेक्ट पूरा होने (Completion) तक कदम-दर-कदम मार्गदर्शन (guide) करो।
3. रचनात्मकता (Creativity):
   - उच्च गुणवत्ता वाले इमेज प्रॉम्ट्स (Image Prompts), कहानियां (Stories), स्क्रिप्ट्स (Scripts), कैप्शन्स (Captions) और अभिनव बिज़नेस आइडियाज (Business Ideas) तैयार करो।
4. सीखना और सिखाना (Learning Roadmap):
   - यदि यूजर किसी विषय को सीखना या समझना चाहे, तो उसे शुरुआत (Beginner) से लेकर एडवांस लेवल (Advanced Level) तक का एक शानदार रोडमैप (Roadmap) बनाकर समझाओ।
5. सामान्य सहायता: टेक्नोलॉजी, पढ़ाई, डेली लाइफ, बिज़नेस और जनरल नॉलेज से जुड़े हर सवाल में पूरी मदद करो।`;

    const response = await client.models.generateContent({
      model: "gemini-3.5-flash",
      contents: contents,
      config: {
        systemInstruction,
        temperature: 0.85,
      },
    });

    const reply = response.text || "भाई, लगता है कुछ गड़बड़ हो गई। दोबारा कोशिश कर ले!";
    res.json({ reply });
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    res.status(500).json({ 
      error: error.message || "Ram Ram Bhai! Platform pe kuch takleef aayi hai. Kripya dubaara koshish karein." 
    });
  }
});

// API endpoint for Image Generation
app.post("/api/generate-image", async (req, res) => {
  try {
    const { prompt, aspectRatio } = req.body;
    
    if (!prompt || !prompt.trim()) {
      return res.status(400).json({ error: "Prompt is required." });
    }

    const client = getGeminiClient();

    const response = await client.models.generateContent({
      model: "gemini-3.1-flash-lite-image",
      contents: {
        parts: [
          {
            text: prompt,
          },
        ],
      },
      config: {
        imageConfig: {
          aspectRatio: aspectRatio || "1:1",
        },
      },
    });

    let imageUrl = "";
    if (response.candidates && response.candidates[0]?.content?.parts) {
      for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
          const base64EncodeString = part.inlineData.data;
          imageUrl = `data:image/png;base64,${base64EncodeString}`;
          break;
        }
      }
    }

    if (!imageUrl) {
      const textResponse = response.text;
      if (textResponse) {
        throw new Error(`Image generation unavailable: ${textResponse}`);
      }
      throw new Error("No image was generated. Please try a different prompt.");
    }

    res.json({ imageUrl });
  } catch (error: any) {
    console.error("Gemini Image Generation Error:", error);
    // Graceful check for unpaid API keys or unsupported models
    const isModelUnsupported = error.message?.toLowerCase().includes("not found") || 
                               error.message?.toLowerCase().includes("unsupported") || 
                               error.message?.toLowerCase().includes("billing") || 
                               error.message?.toLowerCase().includes("quota") || 
                               error.message?.toLowerCase().includes("key") ||
                               error.message?.toLowerCase().includes("paid");
                               
    const errMsg = isModelUnsupported 
      ? "Image generation is currently unavailable because the selected model requires a paid Gemini API key. Please configure a paid key in Settings > Secrets or check with your platform provider."
      : (error.message || "Failed to generate image. Please try again.");
      
    res.status(500).json({ error: errMsg });
  }
});

// Store temporary media in a memory map so we can reference them with a stable real URL
const mediaCache = new Map<string, { data: string; name: string; mimeType: string }>();

// API endpoint to register media base64 data and get a real HTTP link
app.post("/api/register-media", (req, res) => {
  try {
    const { data, name, mimeType } = req.body;
    if (!data) {
      return res.status(400).json({ error: "Data is required." });
    }
    const id = Math.random().toString(36).substring(2, 15);
    mediaCache.set(id, { 
      data, 
      name: name || `file-${id}.png`, 
      mimeType: mimeType || "image/png" 
    });
    res.json({ url: `/api/media/${id}` });
  } catch (error: any) {
    console.error("Register Media Error:", error);
    res.status(500).json({ error: error.message || "Failed to register media" });
  }
});

// GET endpoint to serve the registered media natively in browser with correct headers
app.get("/api/media/:id", (req, res) => {
  const media = mediaCache.get(req.params.id);
  if (!media) {
    return res.status(404).send(`
      <html>
        <head>
          <title>File Not Found - UDGTP</title>
          <style>
            body { background: #09090b; color: #f4f4f5; font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { text-align: center; padding: 2.5rem; border: 1px solid #27272a; background: #0d0d0f; border-radius: 16px; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.5); }
            h2 { color: #f43f5e; margin-top: 0; }
            p { color: #a1a1aa; font-size: 14px; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h2>File Expired or Not Found</h2>
            <p>The requested media may have expired because the server restarted, or the URL link is invalid. Please generate a new image/file in your chat session!</p>
          </div>
        </body>
      </html>
    `);
  }

  try {
    if (media.data.startsWith("data:")) {
      const parts = media.data.split(",");
      const mime = parts[0].match(/:(.*?);/)?.[1] || media.mimeType;
      const base64Data = parts[1];
      const buffer = Buffer.from(base64Data, "base64");
      
      res.setHeader("Content-Type", mime);
      res.setHeader("Content-Disposition", `inline; filename="${media.name}"`);
      return res.send(buffer);
    } else {
      // If it's already an HTTP url, redirect to it safely
      return res.redirect(media.data);
    }
  } catch (error) {
    console.error("Serve Media Error:", error);
    res.status(500).send("Error serving media file");
  }
});

// Setup Vite middleware for development, serve static files for production
async function setupApp() {
  const isProd = process.env.NODE_ENV === "production" || __filename.endsWith("server.cjs") || __dirname.includes("dist");

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // In production, the bundled server.cjs resides inside dist/ along with static assets
    const distPath = __dirname.includes("dist") ? __dirname : path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Jangra AI Backend listening on port ${PORT}`);
  });
}

setupApp();
