#!/usr/bin/env node
const fs=require("fs");
const path=require("path");
const lines=[];
const rl=require("readline").createInterface({input:process.stdin,terminal:false});
rl.on("line",l=>lines.push(l));
rl.on("close",()=>{fs.writeFileSync(path.join(__dirname,"../src/app/connectors/page.tsx"),lines.join("\n"));console.log("Written",lines.length,"lines");});
