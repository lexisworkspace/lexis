import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function GET() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0a0a0a",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Gradient orbs */}
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(120,40,200,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-100px",
            left: "-100px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(80,20,180,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Content */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1,
          }}
        >
          <div
            style={{
              fontSize: "72px",
              fontWeight: "700",
              color: "white",
              fontFamily: "sans-serif",
              letterSpacing: "-0.04em",
              marginBottom: "16px",
            }}
          >
            Orleia.
          </div>
          <div
            style={{
              fontSize: "24px",
              color: "rgba(255,255,255,0.6)",
              fontFamily: "sans-serif",
              textAlign: "center",
              maxWidth: "600px",
              lineHeight: "1.4",
            }}
          >
            Free. Local-first. AI-powered productivity.
          </div>
          <div
            style={{
              display: "flex",
              gap: "12px",
              marginTop: "32px",
            }}
          >
            {["Habits", "Notes", "Journal", "Tasks", "AI"].map((label) => (
              <div
                key={label}
                style={{
                  padding: "8px 20px",
                  borderRadius: "999px",
                  border: "1px solid rgba(255,255,255,0.15)",
                  background: "rgba(255,255,255,0.05)",
                  color: "rgba(255,255,255,0.7)",
                  fontSize: "14px",
                  fontFamily: "sans-serif",
                }}
              >
                {label}
              </div>
            ))}
          </div>
        </div>

        {/* URL */}
        <div
          style={{
            position: "absolute",
            bottom: "32px",
            fontSize: "16px",
            color: "rgba(255,255,255,0.3)",
            fontFamily: "sans-serif",
          }}
        >
          orleia.app
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
    }
  );
}
