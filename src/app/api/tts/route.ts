import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import os from "os";
import path from "path";
import fs from "fs";

export const runtime = "nodejs";
export const maxDuration = 30;

// NVIDIA NIM magpie-tts-multilingual provisioned for this account (NVCF function).
const MAGPIE_FUNCTION_ID = "877104f7-e885-42b9-8de8-f6e4c6303969";
const MAGPIE_VERSION_ID = "ae73d297-743f-4ca9-8cfe-2b4a68aae369";
const GRPC_HOST = "grpc.nvcf.nvidia.com:443";
const SAMPLE_RATE = 24000;

// Self-contained Riva TTS proto (flat request shape used by magpie-tts).
// Written to a temp file at runtime so proto-loader works on Vercel.
const RIVA_TTS_PROTO = `syntax = "proto3";
package nvidia.riva.tts;

enum AudioEncoding {
  ENCODING_UNSPECIFIED = 0;
  LINEAR_PCM = 1;
  FLAC = 2;
  MULAW = 3;
  OGGOPUS = 4;
  ALAW = 20;
}

message SynthesizeSpeechRequest {
  string text = 1;
  string language_code = 2;
  AudioEncoding encoding = 3;
  int32 sample_rate_hz = 4;
  string voice_name = 5;
}

message SynthesizeSpeechResponse {
  bytes audio = 1;
}

service RivaSpeechSynthesis {
  rpc Synthesize(SynthesizeSpeechRequest) returns (SynthesizeSpeechResponse);
  rpc SynthesizeOnline(SynthesizeSpeechRequest) returns (stream SynthesizeSpeechResponse);
}
`;

let protoFile = "";
let client: grpc.Client | null = null;

function getProtoPath(): string {
  if (protoFile) return protoFile;
  const tmp = path.join(os.tmpdir(), `riva_tts_${process.pid}.proto`);
  fs.writeFileSync(tmp, RIVA_TTS_PROTO);
  protoFile = tmp;
  return protoFile;
}

type TtsService = grpc.Client & {
  Synthesize: (
    req: unknown,
    md: grpc.Metadata,
    opts: { deadline: Date },
    cb: (err: grpc.ServiceError | null, res: { audio?: Buffer } | null) => void
  ) => void;
};

function getClient(apiKey: string): TtsService {
  if (client) return client as TtsService;
  const pkgDef = protoLoader.loadSync(getProtoPath(), {
    keepCase: false,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  });
  const proto = grpc.loadPackageDefinition(pkgDef) as unknown as {
    nvidia: {
      riva: {
        tts: {
          RivaSpeechSynthesis: new (
            address: string,
            creds: grpc.ChannelCredentials,
            opts?: Record<string, unknown>
          ) => grpc.Client;
        };
      };
    };
  };
  client = new proto.nvidia.riva.tts.RivaSpeechSynthesis(GRPC_HOST, grpc.credentials.createSsl(), {
    "grpc.max_receive_message_length": 64 * 1024 * 1024,
  });
  return client as TtsService;
}

function wavHeader(numSamples: number): Buffer {
  const buffer = Buffer.alloc(44);
  buffer.write("RIFF", 0);
  buffer.writeUInt32LE(36 + numSamples * 2, 4);
  buffer.write("WAVE", 8);
  buffer.write("fmt ", 12);
  buffer.writeUInt32LE(16, 16);
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28);
  buffer.writeUInt16LE(2, 32);
  buffer.writeUInt16LE(16, 34);
  buffer.write("data", 36);
  buffer.writeUInt32LE(numSamples * 2, 40);
  return buffer;
}

/**
 * Neural text-to-speech via NVIDIA NIM magpie-tts-multilingual (gRPC).
 * Returns a WAV (plays everywhere, including iOS Safari).
 */
export async function POST(req: Request) {
  const denied = guardApi(req, { unlimited: true });
  if (denied) return denied;

  const apiKey = (process.env.NVIDIA_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured. Add NVIDIA_API_KEY." }, { status: 500 });
  }

  let body: { text?: string; voice?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const text = typeof body?.text === "string" ? body.text : "";
  if (!text.trim()) {
    return NextResponse.json({ error: "text is required" }, { status: 400 });
  }

  const voice =
    typeof body?.voice === "string" && body.voice.startsWith("Magpie-Multilingual")
      ? body.voice
      : "Magpie-Multilingual.EN-US.Aria";
  // The locale is embedded in the voice name: Magpie-Multilingual.EN-US.Aria
  // Magpie expects it as "en-US" (lowercase language, uppercase region).
  const localeSeg = voice.split(".")[1] || "en-US";
  const [lng, reg] = localeSeg.split("-");
  const languageCode = lng && reg ? `${lng.toLowerCase()}-${reg.toUpperCase()}` : localeSeg;

  try {
    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Bearer " + apiKey);
    metadata.set("function-id", MAGPIE_FUNCTION_ID);
    metadata.set("function-version-id", MAGPIE_VERSION_ID);

    const request = {
      text: text.slice(0, 2000),
      languageCode,
      encoding: "LINEAR_PCM",
      sampleRateHz: SAMPLE_RATE,
      voiceName: voice,
    };

    // Retry once with a fresh connection: the cached gRPC channel can go stale
    // (NVCF idle timeout, transient errors) and would otherwise fail every
    // request until the serverless instance is recycled.
    let result: { audio?: Buffer } | null = null;
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < 2 && !result; attempt++) {
      try {
        const c = getClient(apiKey);
        // Chunks can be up to ~1700 chars (~15s of speech). A 10s deadline
        // was too tight and made large chunks fail server-side, kicking Noor
        // to the robotic device voice mid-reply. Route maxDuration is 30s.
        const deadline = new Date(Date.now() + 22000);
        result = await new Promise<{ audio?: Buffer }>((resolve, reject) => {
          c.Synthesize(request, metadata, { deadline }, (err, res) => {
            if (err) reject(err);
            else resolve(res as { audio?: Buffer });
          });
        });
      } catch (err) {
        lastErr = err;
        if (client) {
          try {
            client.close();
          } catch {
            /* noop */
          }
        }
        client = null; // reconnect on the next attempt / request
      }
    }
    if (!result) throw lastErr;

    const pcm = result?.audio;
    if (!pcm || !pcm.length) {
      return NextResponse.json({ error: "no audio returned" }, { status: 502 });
    }

    const wav = Buffer.concat([wavHeader(pcm.length / 2), pcm]);

    // Deterministic per (text, voice) - let the browser cache it.
    return new NextResponse(new Uint8Array(wav), {
      headers: {
        "Content-Type": "audio/wav",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch (err) {
    console.error("tts error:", err);
    if (client) {
      try {
        client.close();
      } catch {
        /* noop */
      }
    }
    client = null; // never leave a possibly-broken connection cached
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "tts failed: " + msg.slice(0, 200) }, { status: 502 });
  }
}
