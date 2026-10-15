/**
 * Makes Eyes Opener's own test reel: a short drawn film that the two-eye cinema can play when a member has no
 * video of their own at hand. Every frame is drawn by the code below, so the film belongs to the project and
 * carries no outside footage, music or names.
 *
 *   node scripts/make-test-reel.mjs            writes public/films/test-reel.mp4 and test-reel.webm
 *
 * Needs Playwright (with Chromium) and ffmpeg on the machine that runs it. The app itself needs neither:
 * the two files it writes are kept in the repository.
 *
 * The film: one day over a valley, from morning to evening, in 90 seconds. Slow movement everywhere on the
 * screen, strong colours, nothing that flashes.
 */
import { spawn } from "node:child_process";
import { mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const W = 640, H = 360, FPS = 24, SECONDS = 90;
const out = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "films");

/* The drawing runs in the browser page. `t` is seconds from the start; everything is a pure function of it. */
const PAGE = `<!doctype html><canvas id="c" width="${W}" height="${H}"></canvas><script>
const W=${W},H=${H},T=${SECONDS},c=document.getElementById("c"),g=c.getContext("2d");
function rnd(seed){let a=seed>>>0;return()=>{a=(a+0x6d2b79f5)>>>0;let t=a;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296}}
const mix=(a,b,u)=>a+(b-a)*u,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerpC=(a,b,u)=>"rgb("+a.map((v,i)=>Math.round(mix(v,b[i],u))).join(",")+")";
/* sky colours through the day: [top, bottom] at morning, noon, evening */
const SKY=[[[255,170,120],[255,224,170]],[[70,150,235],[190,225,250]],[[60,50,120],[250,140,90]]];
function sky(day){const i=day<.5?0:1,u=day<.5?day*2:(day-.5)*2;return[lerpC(SKY[i][0],SKY[i+1][0],u),lerpC(SKY[i][1],SKY[i+1][1],u)]}
const r1=rnd(7),clouds=Array.from({length:7},()=>({x:r1()*900,y:30+r1()*110,s:.6+r1()*.9,v:6+r1()*10}));
const r2=rnd(11),trees=Array.from({length:26},()=>({x:r2()*W,k:.6+r2()*.8,p:r2()*6.28,row:r2()<.5?0:1}));
const r3=rnd(23),birds=Array.from({length:5},()=>({y:50+r3()*90,v:38+r3()*30,p:r3()*6.28,d:r3()*40}));
const r4=rnd(31),kites=[{x:120,c:"#e5383b"},{x:470,c:"#2a9d8f"},{x:560,c:"#f4a261"}].map(k=>({...k,p:r4()*6.28}));
function hill(y0,amp,len,ph,col,t,v){g.fillStyle=col;g.beginPath();g.moveTo(0,H);for(let x=0;x<=W;x+=8){g.lineTo(x,y0+Math.sin((x+t*v)/len+ph)*amp+Math.sin((x+t*v)/(len*.37)+ph*2)*amp*.35)}g.lineTo(W,H);g.closePath();g.fill()}
function cloud(x,y,s){g.fillStyle="rgba(255,255,255,.92)";for(const[dx,dy,r]of[[0,0,22],[24,-8,26],[52,0,20],[26,8,24]]){g.beginPath();g.arc(x+dx*s,y+dy*s,r*s,0,6.2832);g.fill()}}
function tree(x,y,k,sway){g.fillStyle="#6b4226";g.fillRect(x-2*k,y-18*k,4*k,18*k);g.fillStyle="#2d6a4f";g.beginPath();g.arc(x+sway,y-26*k,13*k,0,6.2832);g.fill();g.fillStyle="#40916c";g.beginPath();g.arc(x+sway-5*k,y-30*k,8*k,0,6.2832);g.fill()}
function balloon(x,y,s){g.strokeStyle="#5b4636";g.lineWidth=1.2;g.beginPath();g.moveTo(x-14*s,y+22*s);g.lineTo(x-6*s,y+44*s);g.moveTo(x+14*s,y+22*s);g.lineTo(x+6*s,y+44*s);g.stroke();const cols=["#e63946","#ffd166","#118ab2","#ffd166","#e63946"];for(let i=0;i<5;i++){g.fillStyle=cols[i];g.beginPath();g.ellipse(x,y,(30-i*6)*s,30*s,0,0,6.2832);g.fill()}g.fillStyle="#8d5524";g.fillRect(x-7*s,y+44*s,14*s,10*s)}
function bird(x,y,flap){g.strokeStyle="#222";g.lineWidth=2;g.beginPath();g.moveTo(x-9,y-flap);g.quadraticCurveTo(x-4,y-6+flap,x,y);g.quadraticCurveTo(x+4,y-6+flap,x+9,y-flap);g.stroke()}
function kite(x0,t,k){const x=x0+Math.sin(t*.5+k.p)*26,y=96+Math.sin(t*.37+k.p*2)*22;g.strokeStyle="rgba(40,40,40,.7)";g.lineWidth=1;g.beginPath();g.moveTo(x0+10,292);g.quadraticCurveTo((x+x0)/2+20,(y+292)/2+30,x,y+14);g.stroke();g.fillStyle=k.c;g.beginPath();g.moveTo(x,y-16);g.lineTo(x+11,y);g.lineTo(x,y+16);g.lineTo(x-11,y);g.closePath();g.fill();g.strokeStyle=k.c;g.lineWidth=2;g.beginPath();g.moveTo(x,y+16);for(let i=1;i<=5;i++)g.lineTo(x+Math.sin(t*2+i+k.p)*5,y+16+i*6);g.stroke()}
function train(t){const x=((t*26)%(W+420))-360,y=268;g.fillStyle="#3a3a3a";g.fillRect(0,y+17,W,3);const cols=["#c1121f","#f1c453","#3a86ff","#06a77d","#f1c453"];for(let i=0;i<5;i++){const cx=x+i*64;g.fillStyle=cols[i];g.fillRect(cx,y-12,56,26);g.fillStyle="#fdfdfd";for(let w=0;w<3;w++)g.fillRect(cx+7+w*16,y-7,10,9);g.fillStyle="#222";g.beginPath();g.arc(cx+12,y+16,5,0,6.2832);g.arc(cx+44,y+16,5,0,6.2832);g.fill()}g.fillStyle="#222";g.fillRect(x+5*64,y-18,30,32);g.fillRect(x+5*64+30,y-4,22,18);g.fillStyle="#c1121f";g.fillRect(x+5*64+36,y-16,8,12)}
function river(t){g.fillStyle="#3a86ff";g.beginPath();g.moveTo(0,330);for(let x=0;x<=W;x+=8)g.lineTo(x,322+Math.sin(x/70+t*.4)*4);g.lineTo(W,H);g.lineTo(0,H);g.closePath();g.fill();g.strokeStyle="rgba(255,255,255,.55)";g.lineWidth=2;for(let i=0;i<9;i++){const x=((i*83+t*22)%(W+60))-30,y=336+(i%3)*7;g.beginPath();g.moveTo(x,y);g.lineTo(x+22,y);g.stroke()}const bx=W-((t*17)%(W+120))+40,by=338+Math.sin(t*1.3)*2;g.fillStyle="#7f4f24";g.beginPath();g.moveTo(bx-22,by);g.lineTo(bx+22,by);g.lineTo(bx+15,by+9);g.lineTo(bx-15,by+9);g.closePath();g.fill();g.fillStyle="#fff";g.beginPath();g.moveTo(bx,by-2);g.lineTo(bx,by-30);g.lineTo(bx+18,by-4);g.closePath();g.fill()}
function draw(t){const day=clamp(t/T,0,1),[top,bot]=sky(day);const gr=g.createLinearGradient(0,0,0,H*.8);gr.addColorStop(0,top);gr.addColorStop(1,bot);g.fillStyle=gr;g.fillRect(0,0,W,H);
/* the sun crosses the sky once */
const sx=mix(60,W-60,day),sy=210-Math.sin(day*Math.PI)*170;g.fillStyle="rgba(255,236,170,.35)";g.beginPath();g.arc(sx,sy,44,0,6.2832);g.fill();g.fillStyle="#ffd43b";g.beginPath();g.arc(sx,sy,26,0,6.2832);g.fill();
for(const c of clouds)cloud(((c.x+t*c.v)%(W+260))-130,c.y,c.s);
hill(214,26,170,0,lerpC([150,190,200],[120,110,150],day),t,3);
hill(240,22,120,2,lerpC([110,170,130],[90,110,110],day),t,6);
balloon(mix(-40,W+40,(t/T*1.15)%1),118+Math.sin(t*.45)*18,1);
for(const b of birds){const x=((t*b.v+b.d*9)%(W+80))-40;bird(x,b.y+Math.sin(t*.9+b.p)*10,Math.sin(t*7+b.p)*4)}
hill(272,16,90,4,lerpC([82,160,96],[60,100,80],day),t,0);
for(const tr of trees.filter(q=>q.row===0))tree(tr.x,268+Math.sin(tr.x/90+4)*16+Math.sin(tr.x/33.3+8)*5.6+4,tr.k*.8,Math.sin(t*1.1+tr.p)*2);
train(t);
hill(300,12,140,1,lerpC([60,140,80],[44,84,66],day),t,0);
for(const tr of trees.filter(q=>q.row===1))tree(tr.x,300+Math.sin(tr.x/140+1)*12+Math.sin(tr.x/51.8+2)*4.2+3,tr.k,Math.sin(t*1.3+tr.p)*3);
for(const k of kites)kite(k.x,t,k);
river(t);
/* a soft evening veil at the very end, and a slow fade in and out */
const edge=Math.min(1,t/1.5,(T-t)/1.5);if(edge<1){g.fillStyle="rgba(0,0,0,"+(1-edge)+")";g.fillRect(0,0,W,H)}}
window.frames=(from,n)=>{const outA=[];for(let i=0;i<n;i++){draw((from+i)/${FPS});outA.push(c.toDataURL("image/jpeg",.93).slice(23))}return outA};
</script>`;

function encoder(file, args) {
  const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-f", "image2pipe", "-framerate", String(FPS), "-c:v", "mjpeg", "-i", "-", ...args, join(out, file)], { stdio: ["pipe", "inherit", "inherit"] });
  return { ff, done: new Promise((ok, fail) => ff.on("close", (code) => (code === 0 ? ok() : fail(new Error(`ffmpeg ${file}: ${code}`))))) };
}

(async () => {
  mkdirSync(out, { recursive: true });
  const browser = await chromium.launch({ executablePath: process.env.CHROMIUM || undefined }).catch(() => chromium.launch({ executablePath: "/opt/pw-browsers/chromium" }));
  const page = await browser.newPage({ viewport: { width: W, height: H } });
  await page.setContent(PAGE);
  const mp4 = encoder("test-reel.mp4", ["-c:v", "libx264", "-preset", "slow", "-crf", "26", "-pix_fmt", "yuv420p", "-profile:v", "main", "-movflags", "+faststart", "-an"]);
  const webm = encoder("test-reel.webm", ["-c:v", "libvpx-vp9", "-b:v", "0", "-crf", "36", "-row-mt", "1", "-pix_fmt", "yuv420p", "-an"]);
  const total = FPS * SECONDS, batch = 24;
  for (let from = 0; from < total; from += batch) {
    const frames = await page.evaluate(([f, n]) => window.frames(f, n), [from, Math.min(batch, total - from)]);
    for (const b64 of frames) {
      const buf = Buffer.from(b64, "base64");
      for (const e of [mp4, webm]) if (!e.ff.stdin.write(buf)) await new Promise((r) => e.ff.stdin.once("drain", r));
    }
    if (from % (batch * 15) === 0) console.log(`frame ${from} of ${total}`);
  }
  mp4.ff.stdin.end();
  webm.ff.stdin.end();
  await Promise.all([mp4.done, webm.done]);
  await browser.close();
  console.log("written to", out);
})().catch((e) => { console.error(e); process.exit(1); });
