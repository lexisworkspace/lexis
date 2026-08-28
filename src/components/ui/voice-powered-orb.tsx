"use client";

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
  const dataRef = useRef<Uint8Array<ArrayBuffer> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  const vert = /* glsl */ `precision highp float;
attribute vec2 position;
attribute vec2 uv;
varying vec2 vUv;
void main() { vUv = uv; gl_Position = vec4(position, 0.0, 1.0); }`;

  const frag = /* glsl */ `precision highp float;
uniform float iTime;
uniform vec3 iResolution;
uniform float hue;
uniform float hover;
uniform float rot;
uniform float hoverIntensity;
varying vec2 vUv;
vec3 rgb2yiq(vec3 c){float y=dot(c,vec3(0.299,0.587,0.114));float i=dot(c,vec3(0.596,-0.274,-0.322));float q=dot(c,vec3(0.211,-0.523,0.312));return vec3(y,i,q);}
vec3 yiq2rgb(vec3 c){return vec3(c.x+0.956*c.y+0.621*c.z,c.x-0.272*c.y-0.647*c.z,c.x-1.106*c.y+1.703*c.z);}
vec3 adjustHue(vec3 color,float hueDeg){float rad=hueDeg*3.14159265/180.0;vec3 yiq=rgb2yiq(color);float cA=cos(rad),sA=sin(rad);return yiq2rgb(vec3(yiq.x,yiq.y*cA-yiq.z*sA,yiq.y*sA+yiq.z*cA));}
vec3 hash33(vec3 p){p=fract(p*vec3(0.1031,0.11369,0.13787));p+=dot(p,p.yxz+19.19);return -1.0+2.0*fract(vec3(p.x+p.y,p.x+p.z,p.y+p.z)*p.zyx);}
float snoise3(vec3 p){const float K1=0.333333333,K2=0.166666667;vec3 i=floor(p+(p.x+p.y+p.z)*K1);vec3 d0=p-(i-(i.x+i.y+i.z)*K2);vec3 e=step(vec3(0.0),d0-d0.yzx);vec3 i1=e*(1.0-e.zxy),i2=1.0-e.zxy*(1.0-e);vec3 d1=d0-(i1-K2),d2=d0-(i2-K1),d3=d0-0.5;vec4 h=max(0.6-vec4(dot(d0,d0),dot(d1,d1),dot(d2,d2),dot(d3,d3)),0.0);return dot(vec4(31.316),h*h*h*h*vec4(dot(d0,hash33(i)),dot(d1,hash33(i+i1)),dot(d2,hash33(i+i2)),dot(d3,hash33(i+1.0))));}
vec4 extractAlpha(vec3 c){float a=max(max(c.r,c.g),c.b);return vec4(c.rgb/(a+1e-5),a);}
const vec3 bc1=vec3(0.611765,0.262745,0.996078);const vec3 bc2=vec3(0.298039,0.760784,0.913725);const vec3 bc3=vec3(0.062745,0.078431,0.6);const float innerRadius=0.6,noiseScale=0.65;
vec4 draw(vec2 uv){vec3 c1=adjustHue(bc1,hue),c2=adjustHue(bc2,hue),c3=adjustHue(bc3,hue);float ang=atan(uv.y,uv.x),len=length(uv),invLen=len>0.0?1.0/len:0.0;float n0=snoise3(vec3(uv*noiseScale,iTime*0.5))*0.5+0.5;float r0=mix(mix(innerRadius,1.0,0.4),mix(innerRadius,1.0,0.6),n0);float d0=distance(uv,(r0*invLen)*uv);float v0=1.0/(1.0+d0*10.0)*smoothstep(r0*1.05,r0,len);float cl=cos(ang+iTime*2.0)*0.5+0.5;float a=iTime*-1.0;vec2 pos=vec2(cos(a),sin(a))*r0;float d=distance(uv,pos);float v1=1.5/(1.0+d*d*5.0)*1.0/(1.0+d0*50.0);float v2=smoothstep(1.0,mix(innerRadius,1.0,n0*0.5),len);float v3=smoothstep(innerRadius,mix(innerRadius,1.0,0.5),len);vec3 col=mix(c1,c2,cl);col=mix(c3,col,v0);col=(col+v1)*v2*v3;col=clamp(col,0.0,1.0);return extractAlpha(col);}
void main(){vec2 center=iResolution.xy*0.5;float sz=min(iResolution.x,iResolution.y);vec2 uv=(vUv*iResolution.xy-center)/sz*2.0;float s=sin(rot),c=cos(rot);uv=vec2(c*uv.x-s*uv.y,s*uv.x+c*uv.y);uv.x+=hover*hoverIntensity*0.1*sin(uv.y*10.0+iTime);uv.y+=hover*hoverIntensity*0.1*sin(uv.x*10.0+iTime);vec4 col=draw(uv);gl_FragColor=vec4(col.rgb*col.a,col.a);}`;
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
    } catch { /* cleanup */ }
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
      dataRef.current = new Uint8Array(analyserRef.current.frequencyBinCount) as Uint8Array<ArrayBuffer>;
      return true;
    } catch { return false; }
  };

  useEffect(() => {
    const el = ctnDom.current;
    if (!el) return;
    let renderer: Renderer | null = null;
    let glCtx: any = null;
    let prog: Program | null = null;

    try {
      renderer = new Renderer({ alpha: true, premultipliedAlpha: false, antialias: true, dpr: window.devicePixelRatio || 1 });
      glCtx = renderer.gl;
      glCtx.clearColor(0,0,0,0);
      glCtx.enable(glCtx.BLEND);
      glCtx.blendFunc(glCtx.SRC_ALPHA, glCtx.ONE_MINUS_SRC_ALPHA);
      while (el.firstChild) el.removeChild(el.firstChild);
      el.appendChild(glCtx.canvas);

      const geo = new Triangle(glCtx);
      prog = new Program(glCtx, {
        vertex: vert, fragment: frag,
        uniforms: {
          iTime: { value: 0 },
          iResolution: { value: new Vec3(glCtx.canvas.width, glCtx.canvas.height, glCtx.canvas.width/glCtx.canvas.height) },
          hue: { value: hue },
          hover: { value: 0 },
          rot: { value: 0 },
          hoverIntensity: { value: 0 },
        },
      });
      const mesh = new Mesh(glCtx, { geometry: geo, program: prog });

      const resize = () => {
        if (!el || !renderer || !glCtx) return;
        const dpr = window.devicePixelRatio || 1;
        const w = el.clientWidth, h = el.clientHeight;
        if (!w || !h) return;
        renderer.setSize(w*dpr, h*dpr);
        glCtx.canvas.style.width = w+"px";
        glCtx.canvas.style.height = h+"px";
        if (prog) prog.uniforms.iResolution.value.set(glCtx.canvas.width, glCtx.canvas.height, glCtx.canvas.width/glCtx.canvas.height);
      };
      window.addEventListener("resize", resize);
      resize();

      let lastTime = 0, rotation = 0, micReady = false;
      if (enableVoiceControl) startMic().then(ok => { micReady = ok; });
      else stopMic();

      const update = (t: number) => {
        rafRef.current = requestAnimationFrame(update);
        if (!prog) return;
        const dt = (t - lastTime) * 0.001;
        lastTime = t;
        prog.uniforms.iTime.value = t * 0.001;
        prog.uniforms.hue.value = hue;

        if (enableVoiceControl && micReady) {
          const lvl = analyzeAudio();
          if (onVoiceDetected) onVoiceDetected(lvl > 0.1);
          if (lvl > 0.05) rotation += dt * (0.3 + lvl * maxRotationSpeed * 2.0);
          prog.uniforms.hover.value = Math.min(lvl * 2.0, 1.0);
          prog.uniforms.hoverIntensity.value = Math.min(lvl * maxHoverIntensity * 0.8, maxHoverIntensity);
        } else {
          prog.uniforms.hover.value = 0;
          prog.uniforms.hoverIntensity.value = 0;
          if (onVoiceDetected) onVoiceDetected(false);
        }
        prog.uniforms.rot.value = rotation;
        if (renderer && glCtx) {
          glCtx.clear(glCtx.COLOR_BUFFER_BIT | glCtx.DEPTH_BUFFER_BIT);
          renderer.render({ scene: mesh });
        }
      };
      rafRef.current = requestAnimationFrame(update);

      return () => {
        cancelAnimationFrame(rafRef.current);
        window.removeEventListener("resize", resize);
        if (el && glCtx?.canvas && el.contains(glCtx.canvas)) el.removeChild(glCtx.canvas);
        stopMic();
        glCtx?.getExtension("WEBGL_lose_context")?.loseContext();
      };
    } catch { return () => {}; }
  }, [hue, enableVoiceControl, voiceSensitivity, maxRotationSpeed, maxHoverIntensity, onVoiceDetected]);

  useEffect(() => {
    if (enableVoiceControl) startMic(); else stopMic();
  }, [enableVoiceControl]);

  return <div ref={ctnDom} className={cn("w-full h-full relative", className)} />;
};
