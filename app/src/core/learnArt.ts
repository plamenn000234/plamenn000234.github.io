// @ts-nocheck
// Lesson diagrams drawn in SVG (ported from 2.x as is). Each returns an HTML string for {@html}; the content is our own, not user input.
const ART={};
const artFig=(t,sub,body,cap)=>`<figure class="lart"><figcaption><b>${t}</b><small>${sub}</small></figcaption>${body}${cap?`<p class="lcap">${cap}</p>`:""}</figure>`;
function shadeHex(hex,k){const n=parseInt(hex.slice(1),16);return `rgb(${[n>>16,n>>8&255,n&255].map(v=>Math.min(255,Math.round(v*k))).join(",")})`}
ART["standard-cuts"]=()=>{const S=2.1,ax=Math.cos(Math.PI/6);
  const box=(w,h,d,col)=>{const W=w*S,H=h*S,Dd=d*S,P=(x,y,z)=>[x*ax-z*ax,x*.5+z*.5-y];
    const pts=[[0,0,0],[W,0,0],[W,0,Dd],[0,0,Dd],[0,H,0],[W,H,0],[W,H,Dd],[0,H,Dd]].map(p=>P(...p));
    const xs=pts.map(p=>p[0]),ys=pts.map(p=>p[1]),mx=Math.min(...xs),my=Math.min(...ys);
    const f=i=>(pts[i][0]-mx+3).toFixed(1)+","+(pts[i][1]-my+3).toFixed(1);
    const poly=(ix,c)=>`<polygon points="${ix.map(f).join(" ")}" fill="${c}" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`;
    return {w:Math.max(...xs)-mx+6,h:Math.max(...ys)-my+6,s:poly([4,5,6,7],shadeHex(col,1.18))+poly([1,2,6,5],shadeHex(col,.82))+poly([2,3,7,6],col)}};
  const cuts=[["Brunoise","3 × 3 × 3 mm","Garnish, sauces",[3,3,3],"#F2B84B"],["Small dice","5 × 5 × 5 mm","Soups, risotto base",[5,5,5],"#E98A3A"],["Medium dice","12 × 12 × 12 mm","Roast veg, ragout",[12,12,12],"#E2552B"],["Large dice","20 × 20 × 20 mm","Stews, stocks",[20,20,20],"#B9431F"],
    ["Julienne","3 × 3 × 50 mm","Salads, stir-fry",[3,3,50],"#6BAF5B"],["Bâtonnet","6 × 6 × 60 mm","Crudités, sides",[6,6,60],"#3E8E5A"],["Paysanne","12 × 12 × 3 mm","Soups",[12,3,12],"#E8A317"],["Chiffonade","1–2 mm ribbons","Basil, spinach",null,"#21875A"]];
  const it=cuts.map(([n,sz,use,dim,col])=>{let svg;
    if(dim){const b=box(dim[0],dim[1],dim[2],col),cnt=dim[0]<=3&&dim[2]<=3?5:dim[0]<=6&&dim[2]<=6?3:1;let inner="";
      for(let i=0;i<cnt;i++){const ox=(i%3)*b.w*.62+Math.floor(i/3)*b.w*.3,oy=Math.floor(i/3)*-b.h*.55+(cnt>3?b.h*.55:0);inner+=`<g transform="translate(${ox.toFixed(1)},${oy.toFixed(1)})">${b.s}</g>`}
      const W=cnt>1?b.w*2.3+(cnt>3?b.w*.3:0):b.w,H=b.h*(cnt>3?1.55:1);svg=`<svg viewBox="0 0 ${W.toFixed(1)} ${H.toFixed(1)}" width="${W.toFixed(0)}" height="${H.toFixed(0)}">${inner}</svg>`}
    else svg=`<svg viewBox="0 0 120 60" width="110" height="55">${[0,1,2,3,4,5].map(i=>`<path d="M${10+i*4} ${50-i*7} q30 -${10+i} 60 0 t40 -4" fill="none" stroke="${shadeHex(col,1-i*.05)}" stroke-width="5" stroke-linecap="round"/>`).join("")}</svg>`;
    return `<div class="ci"><div class="pic">${svg}</div><b>${n}</b><span>${sz}</span><small>${use}</small></div>`}).join("");
  let tk="";for(let mm=0;mm<=40;mm++){const x=(4+mm*S*ax).toFixed(1);tk+=`<line x1="${x}" x2="${x}" y1="2" y2="${mm%10===0?16:mm%5===0?11:7}"/>`}
  return artFig("Classic cuts","All pieces drawn at the same scale.",`<div class="cg">${it}</div><div style="display:flex;align-items:center;gap:10px;margin-top:10px;font-size:12px;color:var(--muted)"><svg width="82" height="20" viewBox="0 0 82 20"><g stroke="currentColor" stroke-width="1.2">${tk}</g></svg>40 mm at the same scale</div>`)};
ART["protein-texture"]=()=>{const G="#E2552B",Ro="#F2B84B",B="#8C5A3C";
  const parts=[["Chuck",B,"60,50 90,40 120,42 120,100 60,100",88,74],["Rib",Ro,"120,42 160,44 160,100 120,100",140,74],["Striploin",G,"160,44 200,45 200,100 160,100",180,68],["Sirloin",G,"200,45 235,44 235,100 200,100",217,74],
    ["Round",Ro,"235,44 275,42 292,56 290,100 282,130 235,130",260,90],["Brisket",B,"60,100 110,100 110,128 85,132 64,121",86,116],["Plate",B,"110,100 175,100 175,132 110,128",142,118],["Flank",G,"175,100 235,100 235,130 175,132",205,118],
    ["Shank",B,"76,129 105,130 103,166 86,166",94,152],["Shank",B,"240,130 272,130 268,166 250,166",257,152]];
  const sv=`<svg viewBox="0 0 310 172" width="310"><polygon points="60,50 30,50 12,62 14,82 32,93 60,100" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/><circle cx="34" cy="64" r="2.4" fill="currentColor"/><path d="M291 58 q12 18 6 40" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
    ${parts.map(([n,c,pts])=>`<polygon points="${pts}" fill="${c}" fill-opacity=".85" stroke="currentColor" stroke-width="1.2" stroke-linejoin="round"/>`).join("")}
    ${parts.map(([n,c,pts,x,y])=>`<text x="${x}" y="${y}" text-anchor="middle" font-size="${n==="Shank"?7.5:n.length>7?8.5:9.5}" font-weight="800" ${c===B?'style="fill:#fff"':""}>${n}</text>`).join("")}
    <text x="180" y="88" text-anchor="middle" font-size="7.5" font-weight="700" style="fill:#fff">+ fillet</text></svg>`;
  return artFig("Beef: match the method to the cut","Muscles that work hard have more collagen and need time.",sv+`<div class="lg"><span><i style="background:${G}"></i>Grill, sear, short</span><span><i style="background:${Ro}"></i>Roast, slice thin</span><span><i style="background:${B}"></i>Braise, long and slow</span></div>`)};
ART["fish-prep"]=()=>{const A="var(--accent)";
  const sv=`<svg viewBox="0 0 320 150" width="320"><path d="M18 75 C60 22 200 18 252 60 L302 28 L292 75 L302 122 L252 90 C200 132 60 128 18 75 Z" fill="#9DB7C9" stroke="currentColor" stroke-width="1.4"/>
    <path d="M120 33 L150 10 L190 30" fill="#7F9DB2" stroke="currentColor" stroke-width="1.2"/><path d="M150 118 L170 138 L195 116" fill="#7F9DB2" stroke="currentColor" stroke-width="1.2"/>
    <path d="M90 96 C130 112 200 110 240 92" fill="#F6E3D6" fill-opacity=".8" stroke="none"/><circle cx="46" cy="66" r="5" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/><circle cx="46" cy="66" r="2" fill="currentColor"/>
    <path d="M80 36 Q68 75 80 114" fill="none" stroke="${A}" stroke-width="2.4" stroke-dasharray="5 4"/><path d="M84 75 L250 75" fill="none" stroke="${A}" stroke-width="2.4" stroke-dasharray="5 4"/>
    <g stroke="currentColor" stroke-width="1.2">${[0,1,2,3,4,5,6].map(i=>`<line x1="${100+i*9}" y1="60" x2="${103+i*9}" y2="70"/>`).join("")}</g>
    ${[[80,26,1],[160,86,2],[127,50,3],[168,106,4]].map(([x,y,n])=>`<circle cx="${x}" cy="${y}" r="8" fill="${A}"/><text x="${x}" y="${y+3.5}" text-anchor="middle" font-size="10" font-weight="800" style="fill:#fff">${n}</text>`).join("")}</svg>`;
  return artFig("Round fish: four cuts","Sea bass, sea bream, trout. Blue board, sharp flexible knife.",sv+`<ol><li>Cut behind the head and gills, down to the bone.</li><li>Fillet along the backbone, tail to head, knife flat on the bones.</li><li>Pull pin bones with tweezers, against the grain.</li><li>Trim the belly flap and fins; bones go to fumet.</li></ol>
    <div class="yb"><span style="width:42%;background:var(--accent);color:#fff">Fillets 40–45 %</span><span style="flex:1;background:var(--surface);color:var(--muted)">Head, frame, skin, trim</span></div>`)};
ART["five-rules"]=()=>{const y=t=>250-(t+20)*2.3;
  const band=(a,b,c,lab,sub,mt)=>{const m=mt!=null?y(mt):(y(a)+y(b))/2;return `<rect x="40" y="${y(b)}" width="26" height="${y(a)-y(b)}" fill="${c}"/><line x1="66" x2="104" y1="${m}" y2="${m}" stroke="${c}" stroke-width="2"/><text x="110" y="${m-2}" font-size="11" font-weight="800">${lab}</text><text x="110" y="${m+11}" font-size="9.5" opacity=".7">${sub}</text>`};
  let tk="";for(let t=-20;t<=80;t+=10)tk+=`<line x1="30" x2="40" y1="${y(t)}" y2="${y(t)}" stroke="currentColor"/><text x="26" y="${y(t)+3}" font-size="8.5" text-anchor="end" opacity=".7">${t}</text>`;
  const sv=`<svg viewBox="0 0 320 290" width="320"><rect x="40" y="${y(80)}" width="26" height="${y(-20)-y(80)}" rx="13" fill="var(--surface)" stroke="currentColor" stroke-width="1.2"/>
    ${band(-20,-18,"#4C7BD9","Freezer","−18 °C or colder")}${band(0,4,"#7DB7E8","Fridge","0–4 °C, record twice per shift")}${band(5,62,"#F0A08A","Danger zone","5–63 °C: bacteria grow fast")}${band(63,80,"#F2B84B","Hot holding","63 °C or above",67)}
    <line x1="40" x2="318" y1="${y(75)}" y2="${y(75)}" stroke="#C8341C" stroke-width="2" stroke-dasharray="5 3"/><text x="318" y="${y(75)-4}" text-anchor="end" font-size="10" font-weight="800" style="fill:#C8341C">Cook / reheat 75 °C core</text>
    <line x1="40" x2="318" y1="${y(10)}" y2="${y(10)}" stroke="#4C7BD9" stroke-width="1.6" stroke-dasharray="3 3"/><text x="318" y="${y(10)-4}" text-anchor="end" font-size="10" font-weight="800" style="fill:#4C7BD9">Cool below 10 °C within 2 h</text>
    <circle cx="53" cy="${y(-20)+12}" r="16" fill="#C8341C" stroke="currentColor" stroke-width="1.2"/>${tk}</svg>`;
  return artFig("Temperature zones","Keep food out of the danger zone, or move it through fast.",sv)};
ART["core-temps"]=ART["five-rules"];
ART["mise-en-place"]=()=>{const k=.25,W=530*k,H=325*k;
  const frame=(ox,oy,cols,rows,lab,dim)=>{let r="";const cw=W/cols,rh=H/rows;for(let i=0;i<cols;i++)for(let j=0;j<rows;j++)r+=`<rect x="${(ox+i*cw+1.5).toFixed(1)}" y="${(oy+j*rh+1.5).toFixed(1)}" width="${(cw-3).toFixed(1)}" height="${(rh-3).toFixed(1)}" rx="3" fill="var(--surface)" stroke="currentColor" stroke-width="1.1"/>`;
    return `<rect x="${ox-3}" y="${oy-3}" width="${W+6}" height="${H+6}" rx="5" fill="none" stroke="var(--accent)" stroke-width="1.6"/>${r}<text x="${ox}" y="${oy+H+16}" font-size="11" font-weight="800">${lab}</text><text x="${ox+W}" y="${oy+H+16}" font-size="9" text-anchor="end" opacity=".7">${dim}</text>`};
  const sv=`<svg viewBox="0 0 310 230" width="310">${frame(6,6,2,1,"GN 1/2 × 2","325 × 265")}${frame(168,6,3,1,"GN 1/3 × 3","325 × 176")}${frame(6,124,3,2,"GN 1/6 × 6","176 × 162")}${frame(168,124,3,3,"GN 1/9 × 9","176 × 108")}</svg>`;
  return artFig("Gastronorm layout","Every pan fits the 1/1 frame: 530 × 325 mm. Drawn to scale.",sv+`<div class="lg"><span>1/9 herbs, garnish</span><span>1/6 sauces, dressings</span><span>1/3 proteins, veg</span><span>1/2 and 1/1 batches</span></div>`,"Depths: 20 · 40 · 65 · 100 · 150 · 200 mm. Shallow pans chill faster.")};
export { ART };
