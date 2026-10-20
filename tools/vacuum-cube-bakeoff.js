import { drawGarbageCube } from '../src/sprites/vacuum-compactor.js';

const ink = '#20353b';
function poly(c, points, fill, width = .38) {
  c.beginPath();
  points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.closePath(); c.fillStyle = fill; c.fill();
  if (width) { c.strokeStyle = ink; c.lineWidth = width; c.stroke(); }
}
function line(c, points, color, width = .4) {
  c.beginPath(); points.forEach(([x, y], i) => i ? c.lineTo(x, y) : c.moveTo(x, y));
  c.strokeStyle = color; c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.stroke();
}
function shell(c, fill) {
  poly(c,[[-5.5,-5.4],[-2.7,-5.5],[.4,-5.3],[3,-5.5],[5.5,-5.3],[5.5,-2],[5.3,1],[5.5,5.4],[2.3,5.5],[-1,5.3],[-5.5,5.5],[-5.4,2],[-5.5,-1]],fill,.55/1.5);
}
function pressedPaper(c) {
  shell(c,'#b6a686');
  poly(c,[[-5,-4.8],[-1.6,-5],[.6,-3.5],[4.9,-4.7],[4.8,-1.4],[1,-1.9],[-1, -.7],[-4.8,-1.9]],'#e7d2a7',.35);
  poly(c,[[-4.7,-.9],[-1.9,.2],[.5,-.7],[4.8,.1],[4.8,2.9],[1.8,2.2],[-1,3.4],[-4.8,2.5]],'#aebbb6',.35);
  poly(c,[[-4.8,3.2],[-2.5,2.8],[-.6,4],[2,3.2],[4.8,3.6],[4.7,5],[-4.9,5]],'#d1a77d',.3);
  line(c,[[-3.5,-3.8],[-1.4,-2.7],[.1,-3.3]],'#9b8969',.38);
  line(c,[[1.2,1.1],[3.6,1.5]],'#eef0d9',.45);
}
function strappedBale(c) {
  shell(c,'#b4b9a4');
  poly(c,[[-4.9,-4.8],[-.6,-4.7],[-1.5,-1.1],[-4.9,-1.7]],'#dfcca0',.3);
  poly(c,[[.2,-4.6],[4.8,-4.8],[4.7,-.8],[1.4,-1.6]],'#839da0',.3);
  poly(c,[[-4.8,.7],[-1.4,.2],[1.4,1.6],[4.8,.8],[4.8,4.9],[-4.8,4.9]],'#d0a37d',.3);
  // Two dark binding straps make the silhouette unmistakably square.
  poly(c,[[-3.8,-5.15],[-2.9,-5.15],[-2.9,5.15],[-3.8,5.15]],'#526469',.3);
  poly(c,[[2.9,-5.15],[3.8,-5.15],[3.8,5.15],[2.9,5.15]],'#526469',.3);
  line(c,[[-1.8,-2.7],[.5,-2.1],[1.4,-2.9]],'#f5e3b6',.42);
  line(c,[[-1.5,3],[.2,3.6],[1.5,3.1]],'#715e55',.4);
}
function scrapTile(c) {
  shell(c,'#a5b5ad');
  poly(c,[[-4.8,-4.7],[-.2,-4.8],[.5,-1.3],[-3.1,-.7],[-4.8,-1.9]],'#ead4aa',.3);
  poly(c,[[1,-4.7],[4.7,-4.7],[4.7,-.9],[2.4,-1.3]],'#c78f6d',.3);
  poly(c,[[-4.8,-.4],[-2.7,.3],[-1.5,4.8],[-4.8,4.8]],'#89999b',.3);
  poly(c,[[-1.1,.5],[1.6,-1.1],[4.8,.1],[4.8,4.8],[.8,4.8]],'#dcc8a6',.3);
  poly(c,[[-1.4,-.2],[.7,-1.8],[2.5,.6],[.3,2.1]],'#72939a',.3);
  line(c,[[1.5,3.5],[3.8,2.8]],'#fff0c8',.45);
  line(c,[[-3.2,-2.9],[-1,-3.4]],'#8a765b',.4);
}
function chip(c, points, fill) { poly(c,points,fill,.22); }
function bolt(c,x,y) {
  c.beginPath();c.arc(x,y,.55,0,Math.PI*2);c.fillStyle='#e7ddbe';c.fill();
  c.strokeStyle=ink;c.lineWidth=.22;c.stroke();
  line(c,[[x-.28,y],[x+.28,y]],'#627679',.18);
}
function confettiPress(c) {
  shell(c,'#82948f');
  chip(c,[[-4.9,-4.8],[-2.4,-4.9],[-1.9,-2.8],[-3,-1.7],[-4.9,-2.4]],'#ead4aa');
  chip(c,[[-2.1,-4.9],[.5,-4.8],[1.2,-3.2],[-.4,-2],[-1.6,-2.7]],'#94abb0');
  chip(c,[[.8,-4.8],[4.8,-4.8],[4.8,-2.8],[2.8,-2.1],[1.6,-3.2]],'#c78f6d');
  chip(c,[[-4.8,-2],[-3.1,-1.3],[-3.4,.6],[-4.8,1.2]],'#b3b4a3');
  chip(c,[[-2.7,-1.3],[-.2,-1.8],[.8,-.1],[-.8,1.4],[-3.1,.9]],'#d9c6a1');
  chip(c,[[1.1,-1.9],[3.1,-1.8],[4.8,-2.2],[4.8,.7],[2.2,1.3],[.9,-.3]],'#728f97');
  chip(c,[[-4.8,1.6],[-3.1,1.3],[-1.7,3.1],[-2.2,4.8],[-4.8,4.8]],'#d1a47e');
  chip(c,[[-2.8,1.5],[-.6,1.8],[.7,3.4],[-.8,4.8],[-1.8,4.8]],'#8ea3a0');
  chip(c,[[.9,1.7],[2.4,1.4],[4.8,1.1],[4.8,3.4],[2.8,4.8],[.1,4.8]],'#e4d0aa');
  bolt(c,3.2,2.7);
  line(c,[[-3.9,-3.7],[-3,-3.3]],'#9a8465',.28);
}
function salvagePress(c) {
  shell(c,'#a6a48f');
  chip(c,[[-4.9,-4.8],[-2,-4.8],[-3,-2.2],[-4.8,-2.5]],'#e6d4af');
  chip(c,[[-1.7,-4.8],[1.1,-4.8],[.4,-2.9],[-2.5,-1.9]],'#90a8a7');
  chip(c,[[1.5,-4.8],[4.8,-4.8],[4.8,-3.3],[2.5,-2.3],[.8,-2.8]],'#c48d70');
  chip(c,[[-4.8,-2.1],[-3.2,-1.9],[-2.6,-.6],[-4.8,.3]],'#b2b7a7');
  chip(c,[[-2.9,-1.6],[-1.1,-2.5],[.5,-1.5],[-.8,.2],[-2.3,-.2]],'#e9d8b2');
  chip(c,[[.9,-2.2],[3,-1.9],[4.8,-2.8],[4.8,-.7],[2.8,.2],[.3,-.9]],'#7b9298');
  chip(c,[[-4.8,.8],[-2.7,.1],[-1.5,1.5],[-2.4,2.6],[-4.8,2.3]],'#c89779');
  chip(c,[[-2.2,.5],[-.4,-.3],[1.1,.8],[.4,2.8],[-1.9,2.4]],'#b6c2b8');
  chip(c,[[1.5,.5],[3.1,.6],[4.8,-.2],[4.8,2],[3.3,2.9],[.9,2.5]],'#e2cba3');
  chip(c,[[-4.8,2.8],[-2.7,3],[-1.4,4.8],[-4.8,4.8]],'#829c9d');
  chip(c,[[-2.1,2.9],[.5,3.2],[1.8,4.8],[-.9,4.8]],'#d8ad87');
  chip(c,[[1.2,3],[3.5,3.1],[4.8,2.6],[4.8,4.8],[2.2,4.8]],'#d8d0b4');
  bolt(c,-.3,-1.2);bolt(c,3.4,3.8);
  line(c,[[-3.7,1.5],[-2.8,1.3]],'#eee0bc',.28);
}

const options = [
  {name:'F / CRUSHED MIX — SELECTED', note:'Live cube art: plain, screw and bolt details are mixed across drops.',
    draw:(c,s,variant)=>drawGarbageCube(c,0,0,s,variant)},
  {name:'D / SCRAP TILE', note:'Original mosaic direction: five broad fragments.', draw:(c,s)=>{c.scale(s,s);scrapTile(c);}},
  {name:'E / CONFETTI PRESS', note:'Ten smaller pieces with paper, metal and one visible bolt.', draw:(c,s)=>{c.scale(s,s);confettiPress(c);}},
  {name:'G / SALVAGE PRESS', note:'Mixed paper and metal shards with two embedded bolts.', draw:(c,s)=>{c.scale(s,s);salvagePress(c);}},
  {name:'B / PRESSED PAPER', note:'One square block with compressed paper folds.', draw:(c,s)=>{c.scale(s,s);pressedPaper(c);}},
  {name:'C / STRAPPED BALE', note:'Rubbish held together by two visible binding straps.', draw:(c,s)=>{c.scale(s,s);strappedBale(c);}},
];

for (const [i, option] of options.entries()) {
  const card = document.createElement('article');
  card.innerHTML = `<h2>${option.name}</h2><canvas aria-label="${option.name} shown close up and at gameplay size"></canvas><p>${option.note}</p>`;
  document.querySelector('main').append(card);
  const canvas = card.querySelector('canvas');
  canvas.width = 1200; canvas.height = 800;
  const c = canvas.getContext('2d'); c.scale(2,2);
  const sky = c.createLinearGradient(0,0,0,400);
  sky.addColorStop(0,'#14342f'); sky.addColorStop(1,'#42735d');
  c.fillStyle = sky; c.fillRect(0,0,600,400);
  c.fillStyle = '#23493f';
  c.beginPath(); c.moveTo(0,262); c.lineTo(110,212); c.lineTo(240,270); c.lineTo(350,211); c.lineTo(600,264); c.lineTo(600,400); c.lineTo(0,400); c.fill();
  c.fillStyle='#1a3835'; c.fillRect(0,326,600,74);
  const rail=c.createLinearGradient(0,349,0,372);
  rail.addColorStop(0,'#e9f39b');rail.addColorStop(.32,'#fffcc1');rail.addColorStop(.58,'#a5b873');rail.addColorStop(1,'#24373d');
  c.fillStyle=rail;c.fillRect(0,349,600,23);
  c.strokeStyle='#20353b';c.lineWidth=3;
  for(const x of [150,300,450]){c.beginPath();c.moveTo(x,349);c.lineTo(x,372);c.stroke();}
  c.save();c.translate(300,166);option.draw(c,12.5,4);c.restore();
  c.fillStyle='#e9e6c7';c.font='bold 16px system-ui';c.fillText('CLOSE UP',20,35);
  c.fillText(option.name.startsWith('F /') ? 'RUNNING SIZE  ·  PLAIN / SCREW / BOLT' :
    'RUNNING SIZE  ·  SAME 17 × 17 FOOTPRINT',20,278);
  for(const [j,x] of [145,300,455].entries()) {
    c.save();c.translate(x,326);option.draw(c,4.15,[0,3,4][j]);c.restore();
  }
}
