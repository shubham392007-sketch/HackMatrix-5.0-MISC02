import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

// Server-side round-robin counter for key rotation
let rotationIndex = 0;

function getServerGeminiKeyPool(): string[] {
  const rawList: string[] = [];

  if (process.env.GEMINI_API_KEYS) {
    rawList.push(
      ...process.env.GEMINI_API_KEYS.split(",")
        .map((k) => k.trim())
        .filter(Boolean)
    );
  }

  const singleVars = [
    process.env.GEMINI_API_KEY,
    process.env.GEMINI_API_KEY_1,
    process.env.GEMINI_API_KEY_2,
    process.env.GEMINI_API_KEY_3,
    process.env.GEMINI_API_KEY_4,
    process.env.GEMINI_API_KEY_5,
    process.env.GOOGLE_API_KEY,
    process.env.NEXT_PUBLIC_GEMINI_API_KEY,
  ];

  for (const val of singleVars) {
    if (val && val.trim()) {
      rawList.push(val.trim());
    }
  }

  return Array.from(new Set(rawList));
}

/**
 * POST /api/gemini/token
 * Mints a short-lived Gemini Live API ephemeral token (`authTokens.create`) using the server-side
 * GEMINI_API_KEYS pool (with automatic multi-key rotation & failover across all configured keys)
 * so the browser can connect to `gemini-3.8-live` over WebSockets.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const clientProvidedKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
    const preferredKeyIndex =
      typeof body.keyIndex === "number" && body.keyIndex >= 0 ? body.keyIndex : null;

    const serverPool = getServerGeminiKeyPool();
    const candidates: string[] = [];

    if (clientProvidedKey) {
      candidates.push(clientProvidedKey);
    }

    if (serverPool.length > 0) {
      const startIdx =
        preferredKeyIndex !== null
          ? preferredKeyIndex % serverPool.length
          : rotationIndex++ % serverPool.length;

      for (let i = 0; i < serverPool.length; i++) {
        const candidate = serverPool[(startIdx + i) % serverPool.length];
        if (!candidates.includes(candidate)) {
          candidates.push(candidate);
        }
      }
    }

    if (candidates.length === 0) {
      return NextResponse.json(
        {
          error: "MISSING_API_KEY",
          message:
            "No Gemini API key found. Set GEMINI_API_KEY / GEMINI_API_KEYS in .env.local or enter your Gemini API key in the Voice Module settings.",
        },
        { status: 400 }
      );
    }

    const expireTime = new Date(Date.now() + 30 * 60 * 1000).toISOString();
    const newSessionExpireTime = new Date(Date.now() + 2 * 60 * 1000).toISOString();

    // Try minting an ephemeral token across the key pool in order
    for (let idx = 0; idx < candidates.length; idx++) {
      const candidateKey = candidates[idx];
      try {
        const client = new GoogleGenAI({
          apiKey: candidateKey,
          httpOptions: { apiVersion: "v1alpha" },
        });

        const token = await client.authTokens.create({
          config: {
            uses: 3,
            expireTime,
            newSessionExpireTime,
          },
        });

        if (token?.name) {
          return NextResponse.json({
            token: token.name,
            isEphemeral: true,
            expiresAt: expireTime,
            keyPoolSize: serverPool.length || 1,
            activeKeySlot: idx + 1,
            backupTokens: candidates.filter((k) => k !== candidateKey),
          });
        }
      } catch (ephemeralErr: any) {
        console.warn(
          `[Gemini Voice Token] Key slot ${idx + 1} ephemeral token fallback:`,
          ephemeralErr?.message || ephemeralErr
        );
      }
    }

    // Fallback: return primary key + backup rotation keys for direct Live WebSocket connection
    return NextResponse.json({
      token: candidates[0],
      isEphemeral: false,
      keyPoolSize: serverPool.length || 1,
      activeKeySlot: 1,
      backupTokens: candidates.slice(1),
    });
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "TOKEN_ERROR",
        message: err?.message || "Failed to initialize Gemini Live session credentials.",
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  const pool = getServerGeminiKeyPool();
  return NextResponse.json({
    configured: pool.length > 0,
    keyCount: pool.length,
    defaultModel: "gemini-3.8-live",
    supportedModels: ["gemini-3.8-live", "gemini-3.8-live-extended-thinking"],
  });
}
