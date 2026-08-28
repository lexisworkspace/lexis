import { NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import os from "os";
import path from "path";
import fs from "fs";
import { localCleanTranscript } from "@/lib/cleanDictation";

export const runtime = "nodejs";
export const maxDuration = 60;

// NVIDIA NIM whisper-large-v3 provisioned for this account (NVCF function).
const WHISPER_FUNCTION_ID = "b702f636-f60c-4a3d-a6f4-f3568c13bd7d";
const WHISPER_VERSION_ID = "a37ce169-8352-48ab-b197-f7c5b02448ff";
const GRPC_HOST = "grpc.nvcf.nvidia.com:443";

// Embedded Riva ASR proto (self-contained). Written to a temp file at runtime
// so proto-loader works on Vercel without relying on file tracing.
const RIVA_ASR_PROTO = `syntax = "proto3";
package nvidia.riva.asr;

enum AudioEncoding {
  ENCODING_UNSPECIFIED = 0;
  LINEAR_PCM = 1;
  FLAC = 2;
  MULAW = 3;
  OGGOPUS = 4;
  ALAW = 20;
}

message SpeechContext {
  repeated string phrases = 1;
  float boost = 4;
}

message RecognitionConfig {
  AudioEncoding encoding = 1;
  int32 sample_rate_hertz = 2;
  string language_code = 3;
  int32 max_alternatives = 4;
  bool profanity_filter = 5;
  repeated SpeechContext speech_contexts = 6;
  int32 audio_channel_count = 7;
  bool enable_word_time_offsets = 8;
  bool enable_automatic_punctuation = 11;
  bool enable_separate_recognition_per_channel = 12;
  string model = 13;
  bool verbatim_transcripts = 14;
}

message RecognizeRequest {
  RecognitionConfig config = 1;
  bytes audio = 2;
}

message SpeechRecognitionAlternative {
  string transcript = 1;
  float confidence = 2;
}

message SpeechRecognitionResult {
  repeated SpeechRecognitionAlternative alternatives = 1;
  int32 channel_tag = 2;
}

message RecognizeResponse {
  repeated SpeechRecognitionResult results = 1;
}

service RivaSpeechRecognition {
  rpc Recognize(RecognizeRequest) returns (RecognizeResponse);
}
`;

let protoFile = "";
let client: grpc.Client | null = null;

function getProtoPath(): string {
  if (protoFile) return protoFile;
  const tmp = path.join(os.tmpdir(), `riva_asr_${process.pid}.proto`);
  fs.writeFileSync(tmp, RIVA_ASR_PROTO);
  protoFile = tmp;
  return protoFile;
}

type RecognizeService = grpc.Client & {
  Recognize: (
    req: unknown,
    md: grpc.Metadata,
    opts: { deadline: Date },
    cb: (err: grpc.ServiceError | null, res: unknown) => void
  ) => void;
};

function getClient(apiKey: string): RecognizeService {
  if (client) return client as RecognizeService;
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
        asr: {
          RivaSpeechRecognition: new (
            address: string,
            creds: grpc.ChannelCredentials,
            opts?: Record<string, unknown>
          ) => grpc.Client;
        };
      };
    };
  };
  client = new proto.nvidia.riva.asr.RivaSpeechRecognition(GRPC_HOST, grpc.credentials.createSsl(), {
    "grpc.max_receive_message_length": 32 * 1024 * 1024,
  });
  return client as RecognizeService;
}

// Map Lexis language code to BCP-47 for the ASR config.
const LANG_MAP: Record<string, string> = {
  en: "en-US",
  es: "es-ES",
  fr: "fr-FR",
  de: "de-DE",
  pt: "pt-PT",
  ar: "ar-SA",
};

export async function POST(req: Request) {
  const denied = guardApi(req, { unlimited: true });
  if (denied) return denied;

  const apiKey = (process.env.NVIDIA_API_KEY || "").trim();
  if (!apiKey) {
    return NextResponse.json({ error: "AI is not configured. Add NVIDIA_API_KEY." }, { status: 500 });
  }

  let body: { audio?: string; language?: string; sampleRate?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { audio, language = "en-US", sampleRate = 16000 } = body ?? {};
  if (!audio || typeof audio !== "string") {
    return NextResponse.json({ error: "audio (base64) is required" }, { status: 400 });
  }
  // Cap the clip size (~4 MB of PCM audio) - large payloads are abuse.
  if (audio.length > 5_600_000) {
    return NextResponse.json({ error: "audio too large" }, { status: 400 });
  }

  try {
    const wavBuffer = Buffer.from(audio, "base64");
    const c = getClient(apiKey);

    const metadata = new grpc.Metadata();
    metadata.set("authorization", "Bearer " + apiKey);
    metadata.set("function-id", WHISPER_FUNCTION_ID);
    metadata.set("function-version-id", WHISPER_VERSION_ID);

    const bcpLang = LANG_MAP[language] || "en-US";
    const sr = typeof sampleRate === "number" && sampleRate >= 8000 && sampleRate <= 48000 ? sampleRate : 16000;

    const request = {
      config: {
        encoding: "LINEAR_PCM",
        sampleRateHertz: sr,
        languageCode: bcpLang,
        maxAlternatives: 1,
        audioChannelCount: 1,
        enableAutomaticPunctuation: true,
        verbatimTranscripts: true,
      },
      audio: wavBuffer,
    };

    const deadline = new Date();
    deadline.setSeconds(deadline.getSeconds() + 50);

    const result = await new Promise<{ results?: { alternatives?: { transcript?: string }[] }[] }>(
      (resolve, reject) => {
        c.Recognize(request, metadata, { deadline }, (err, res) => {
          if (err) reject(err);
          else resolve(res as { results?: { alternatives?: { transcript?: string }[] }[] });
        });
      }
    );

    const transcript = result?.results?.[0]?.alternatives?.[0]?.transcript?.trim() || "";

    // Filler removal only (ums, uhs, stutters) - the user's words are kept
    // exactly as spoken. No LLM, no rewriting, no added content.
    const text = localCleanTranscript(transcript);

    return NextResponse.json({ text });
  } catch (err) {
    console.error("transcribe error:", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: "Transcription failed: " + msg.slice(0, 300) }, { status: 502 });
  }
}
