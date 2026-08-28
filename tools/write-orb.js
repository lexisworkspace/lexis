const fs = require("fs");
const path = require("path");

const content = `"use client";

import React, { useEffect, useRef, FC } from "react";
import { Renderer, Program, Mesh, Triangle, Vec3 } from "ogl";
import { cn } from "@/lib/utils";

interface VoicePoweredOrbProps {
  className?: string;
  hue?: number;
  enableVoiceControl?: boolean;
  voiceSensitivity?: number;
  maxRotationSpeed?: number;
  maxHoverIntensity?: number;
  onVoiceDetected?: (detected: boolean) => void;
}

export const VoicePoweredOrb: FC<VoicePoweredOrbProps> = ({
  className,
  hue = 0,
  enableVoiceControl = true,
  voiceSensitivity = 1.5,
  maxRotationSpeed = 1.2,
  maxHoverIntensity = 0.8,
  onVoiceDetected,
}) => {
  const ctnDom = useRef<HTMLDivElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const micRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const dataRef = useRef<Uint8Array | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const vert = \`precision highp float;
    attribute vec2 position;
    attribute vec2 uv;
    varying vec2 vUv;
    void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }\`;

  const frag = \`precision highp float;
    uniform float iTime;
    uniform vec3 iResolution;
    uniform float hue;
    uniform float hover;
    uniform float rot;
    uniform float hoverIntensity;
    varying vec2 vUv;

    vec3 rgb2yiq(vec3 c) {
      float y = dot(c, vec3(0.299, 0.587, 0.114));
      float i = dot(c, vec3(0.596, -0.274, -0.322));
      float q = dot(c, vec3(0.211, -0.523, 0.312));
      return vec3(y, i, q);
    }
    vec3 yiq2rgb(vec3 c) {
      float r = c.x + 0.956*c.y + 0.621*c.z;
      float g = c.x - 0.272*c.y - 0.647*c.z;
      float b = c.x - 1.106*c.y + 1.703*c.z;
      return vec3(r, g, b);
    }
    vec3 adjustHue(vec3 color, float hueDeg) {
      float hueRad = hueDeg * 3.14159265 / 180.0;
      vec3 yiq = rgb2yiq(color);
      float cosA = cos(hueRad), sinA = sin(hueRad);
      float ii = yiq.y*cosA - yiq.z*sinA;
      float qq = yiq.y*sinA + yiq.z*cosA;
      yiq.y = ii; yiq.z = qq;
      return yiq2rgb(yiq);
    }
    vec3 hash33(vec3 p3) {
      p3 = fract(p3 * vec3(0.1031, 0.11369, 0.13787));
      p3 += dot(p3, p3.yxz + 19.19);
      return -1.0 + 2.0*fract(vec3(p3.x+p3.y, p3.x+p3.z, p3.y+p3.z)*p3.zyx);
    }
    float snoise3(vec3 p) {
      const float K1 = 0.333333333, K2 = 0.166666667;
      vec3 i = floor(p + (p.x+p.y+p.z)*K1);
      vec3 d0 = p - (i - (i.x+i.y+i.z)*K2);
      vec3 e = step(vec3(0.0), d0 - d0.yzx);
      vec3 i1 = e*(1.0-e.zxy), i2 = 1.0-e.zxy*(1.0-e);
      vec3 d1 = d0-(i1-K2), d2 = d0-(i2-K1), d3 = d0-0.5;
      vec4 h = max(0.6 - vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)), 0.0);
      vec4 n = h*h*h*h * vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0)));
      return dot(vec4(31.316), n);
    }
    vec4 extractAlpha(vec3 c) { float a=max(max(c.r,c.g),c.b); return vec4(c.rgb/(a+1e-5),a); }

    const vec3 bc1 = vec3(0.611765, 0.262745, 0.996078);
    const vec3 bc2 = vec3(0.298039, 0.760784, 0.913725);
    const vec3 bc3 = vec3(0.062745, 0.078431, 0.600000);
    const float innerRadius = 0.6, noiseScale = 0.65;

    vec4 draw(vec2 uv) {
      vec3 c1=adjustHue(bc1,hue), c2=adjustHue(bc2,hue), c3=adjustHue(bc3,hue);
      float ang=atan(uv.y,uv.x), len=length(uv), invLen=len>0.0?1.0/len:0.0;
      float n0=snoise3(vec3(uv*noiseScale, iTime*0.5))*0.5+0.5;
      float r0=mix(mix(innerRadius,1.0,0.4), mix(innerRadius,1.0,0.6), n0);
      float d0=distance(uv, (r0*invLen)*uv);
      float v0=1.0/(1.0+d0*10.0) * smoothstep(r0*1.05,r0,len);
      float cl=cos(ang+iTime*2.0)*0.5+0.5;
      float a=iTime*-1.0;
      vec2 pos=vec2(cos(a),sin(a))*r0;
      float d=distance(uv,pos);
      float v1=1.5/(1.0+d*d*5.0) * 1.0/(1.0+d0*50.0);
      float v2=smoothstep(1.0, mix(innerRadius,1.0,n0*0.5), len);
      float v3=smoothstep(innerRadius, mix(innerRadius,1.0,0.5), len);
      vec3 col=mix(c1,c2,cl);
      col=mix(c3,col,v0);
      col=(col+v1)*v2*v3;
      col=clamp(col,0.0,1.0);
      return extractAlpha(col);
    }

    void main() {
      vec2 center=iResolution.xy*0.5;
      float size=min(iResolution.x,iResolution.y);
      vec2 uv=(vUv*iResolution.xy - center)/size*2.0;
      float s=sin(rot), c=cos(rot);
      uv=vec2(c*uv.x-s*uv.y, s*uv.x+c*uv.y);
      uv.x += hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);
      uv.y += hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);
      vec4 col=draw(uv);
      gl_FragColor = vec4(col.rgb*col.a, col.a);
    }\`;

  const analyzeAudio = () => {
    if (!analyserRef.current || !dataRef.current) return 0;
    analyserRef.current.getByteFrequencyData(dataRef.current);
    let sum = 0;
    for (let i = 0; i < dataRef.current.length; i++) {
      const v = dataRef.current[i] / 255;
      sum += v * v;
    }
    return Math.min(Math.sqrt(sum / dataRef.current.length) * voiceSensitivity * 3.0, 1);
  };

  const stopMic = () => {
    try {
      streamRef.current?.getTracks().forEach(t => t.stop());
      streamRef.current = null;
      micRef.current?.disconnect(); micRef.current = null;
      analyserRef.current?.disconnect(); analyserRef.current = null;
      if (audioCtxRef.current && audioCtxRef.current.state !== "closed") {
        audioCtxRef.current.close();
      }
      audioCtxRef.current = null;
      dataRef.current = null;
    } catch {}
  };

  const startMic = async () => {
    try {
      stopMic();
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
      });
      streamRef.current = stream;
      audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      if (audioCtxRef.current.state === "suspended") await audioCtxRef.current.resume();
      analyserRef.current = audioCtxRef.current.createAnalyser();
      micRef.current = audioCtxRef.current.createMediaStreamSource(stream);
      analyserRef.current.fftSize = 512;
      analyserRef.current.smoothingTimeConstant = 0.3;
      micRef.current.connect(analyserRef.current);
      dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount);
      return true;
    } catch { return false; }
  };

  useEffect(() => {
    const el = ctnDom.current;
    if (!el) return;
    let renderer: Renderer | null = null;
    let gl: any = null;
    let prog: Program | null = null;

    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: false, antialias: true, dpr: window.devicePixelRatio || 1 });
      gl = renderer.gl;
      gl.clearColor(0,0,0,0);
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(gl.canvas);

      const geo = new Triangle(gl);
      prog = new Program(gl, {
        vertex: vert, fragment: frag,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Vec3(gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height) },
          hue: { value: hue },
          hover: { value: 0 },
          rot: { value: 0 },
          hoverIntensity: { value: 0 },
        },
      });
      const mesh = new Mesh(gl, { geometry: geo, program: prog });

      const resize = () => {
        if (!el || !renderer || !gl) return;
        const dpr = window.devicePixelRatio || 1;
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w*dpr, h*dpr);
        gl.canvas.style.width = w+"px";
        gl.canvas.style.height = h+"px";
        if (prog) prog.uniforms.iResolution.value.set(gl.canvas.width, gl.canvas.height, gl.canvas.width/gl.canvas.height);
      };
      window.addEventListener("resize", resize);
      resize();

      let lastTime = 0, rot = 0, micReady = false;
      if (enableVoiceControl) startMic().then(ok => { micReady = ok; });
      else stopMic();

      const update = (t: numbe
