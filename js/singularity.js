/**
 * SINGULARITY – Shader-Demo (WebGL2) als eine einzige Eskalation:
 * Lichtpunkt → Stabgitter → Gitterstäbe biegen sich zum Lorenz-Attraktor,
 * der ins Chaos auffächert → Zerfall und Bruch → Würfel-Fraktal mit
 * Endlos-Zoom und Flug durch seine Schächte → schwarzes Loch, dessen Scheibe
 * zu einem flüssigen Acid-Objekt wird → runder Acid-Tunnel → Stille, ein
 * Herzschlag → eine Lichtwelle erfasst das Universum.
 * Erst fast monochrom mit einer wechselnden Akzentfarbe, ab dem Morph-Objekt
 * in vollen Farben. Der Lichtpunkt vom Anfang kehrt in der Atempause, am
 * Tunnelende und vor der Explosion wieder.
 *
 * Ein „Chaos-Regler“ (0…1) aus der Musik (SingularityMusik) steuert Tempo,
 * Kamerawackeln, Farbsäume, Bildstörungen und Schlieren; der Bass verformt
 * die Geometrie. Aufbau pro Bild:
 *   1. Szene per Raymarching in eine Textur (Auflösung passt sich an),
 *      Partikel (Attraktor, Galaxien) additiv darüber
 *   2. Feedback: das vorige Bild wird gezoomt und gedreht untergemischt
 *   3. Nachbearbeitung: Bloom, Farbsäume, Glitch, Körnung, Kinobalken
 */
(function () {
  "use strict";

  var M = SingularityMusik;
  var canvas = document.getElementById("gl");
  var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });

  var VERT = "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}";

  var COMMON = [
    "#version 300 es",
    "precision highp float;",
    "const float PI=3.14159265;",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}"
  ].join("\n");

  var SCENE = COMMON + "\n" + [
    "uniform vec2 uRes;",
    "uniform float uTime,uKick,uSnare,uChaos,uProg,uSub,uCut,uTravel,uRad,uDist,uBass,uDecay,uJit;",
    "uniform vec3 uAccent;",
    "uniform int uScene;",
    "out vec4 outCol;",
    "float gT,gH,gTrap,gS;vec3 gC;",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<4;i++){v+=a*noise(p);p=rot(.5)*p*2.03;a*=.5;}return v;}",
    "float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}",
    "vec3 pal(float t){return .5+.5*cos(6.28318*(t+vec3(0.,.33,.67)));}",

    // ---- Lichtpunkt (Anfang, Atempause, Herzschlag vor dem Finale) ----
    "vec3 punkt(vec2 uv,float pull){",
    "  float r=length(uv);",
    "  float s=.00035*(1.+uKick*2.5)*(1.+2.*uProg*(1.-pull));",
    "  vec3 c=vec3(s/(r*r+.00003));",
    "  c+=vec3(.9,.95,1.)*.004*(1.+uKick)/(abs(uv.y)*60.+.02)*exp(-abs(uv.x)*5.);",
    "  vec2 g=uv*40.,id=floor(g);float h=hash(id);",
    "  vec2 f=fract(g)-.5-(vec2(h,fract(h*7.))-.5)*.6;",
    "  c+=vec3(.5)*step(.93,h)*smoothstep(.06,0.,length(f))*(.5+.5*sin(gT*2.+h*40.))*smoothstep(0.,.3,uProg+pull);",
    "  if(pull>0.)c+=uAccent*.015/(abs(r-.18-.03*sin(gT*2.))*40.+.05)*uProg;",
    "  return c;",
    "}",

    // ---- Stabgitter: Ordnung, die erst zittert (uJit) und dann zerfällt (uDecay) ----
    "float mapGrid(vec3 p){",
    "  vec3 id=floor((p+1.5)/3.),q=mod(p+1.5,3.)-1.5;",
    "  float h=hash(id.xy+id.z*17.3),j=uJit*(.5+h);",
    "  q-=(vec3(h,fract(h*7.13),fract(h*13.7))-.5)*1.5*uDecay;",
    "  q.xy*=rot(j*sin(gT*2.*(.5+h)+h*6.)*.5+uDecay*h*4.);q.yz*=rot(j*cos(gT*1.7*(.5+h))*.5+uDecay*(1.-h)*3.);",
    "  gH=h;",
    "  float d=sdBox(q,vec3(.34+.05*uKick+.05*uBass))-.02,rr=.035*(1.-uDecay);",
    "  if(rr>.003)d=min(d,min(length(q.xy),min(length(q.yz),length(q.xz)))-rr);",
    "  return d*.75;",
    "}",
    "vec3 gridScene(vec2 uv,float t,float dim){",
    "  vec3 ro=vec3(1.5,1.5,t*1.5),rd=normalize(vec3(uv,1.2));",
    "  rd.xy*=rot(t*.05+uCut*.785);rd.xz*=rot(sin(t*.13+uCut)*.12);rd.yz*=rot(cos(t*.11)*.1);",
    "  float d=0.;vec3 p=ro;bool hit=false;",
    "  for(int i=0;i<80;i++){p=ro+rd*d;float h=mapGrid(p);if(h<.003){hit=true;break;}d+=h;if(d>60.)break;}",
    "  if(!hit)return vec3(0.);",
    "  float hh=gH;vec2 e=vec2(.01,0.);",
    "  vec3 n=normalize(vec3(mapGrid(p+e.xyy)-mapGrid(p-e.xyy),mapGrid(p+e.yxy)-mapGrid(p-e.yxy),mapGrid(p+e.yyx)-mapGrid(p-e.yyx)));",
    "  float ndl=max(dot(n,-rd),0.);",
    "  vec3 col=vec3(.03+.4*ndl*ndl)+vec3(.5)*pow(1.-ndl,3.);",
    "  col+=uAccent*step(.9-.55*uDecay,hh)*(.4+uKick*1.6);",
    "  return col*exp(-d*.05)*dim;",
    "}",

    // ---- Bruch: taumelnde Splitter, harte Schnitte ----
    "float mapSh(vec3 p){",
    "  vec3 id=floor(p/2.4),q=mod(p,2.4)-1.2;",
    "  float h=hash(id.xy+id.z*9.1),h2=hash(id.yz+id.x*3.7);",
    "  q.xy*=rot(gT*(h-.5)*2.5+h*6.3);q.xz*=rot(gT*(h2-.5)*2.+h2*6.3);",
    "  gH=h2;return sdBox(q,vec3(.25+.5*h,.025+.03*uBass,.12+.3*h2))*.6;",
    "}",
    "vec3 shardScene(vec2 uv,float t){",
    "  vec3 ro=vec3(1.2+sin(uCut*1.7),1.2+cos(uCut*2.3),t*5.),rd=normalize(vec3(uv,.9));",
    "  rd.xy*=rot(uCut*1.3+t*.25);rd.xz*=rot(sin(uCut*2.1)*.5);rd.yz*=rot(cos(uCut*1.3)*.4);",
    "  float d=.3;vec3 p=ro;bool hit=false;",
    "  for(int i=0;i<72;i++){p=ro+rd*d;float h=mapSh(p);if(h<.004){hit=true;break;}d+=h;if(d>32.)break;}",
    "  vec3 col=vec3(.02)*uSnare;",
    "  if(hit){",
    "    float hh=gH;vec2 e=vec2(.01,0.);",
    "    vec3 n=normalize(vec3(mapSh(p+e.xyy)-mapSh(p-e.xyy),mapSh(p+e.yxy)-mapSh(p-e.yxy),mapSh(p+e.yyx)-mapSh(p-e.yyx)));",
    "    float ndl=abs(dot(n,rd));",
    "    col=vec3(.05+.55*ndl*ndl)+vec3(.8)*pow(1.-ndl,4.);",
    "    col=mix(col,uAccent*(1.2+uKick*2.),step(.72,hh));",
    "    col*=exp(-d*.09);",
    "  }",
    "  return col+uAccent*uSnare*.05;",
    "}",

    // ---- Fraktal-Kathedrale aus Kugelinversionen ----
    // zoom=1 (SELF-SIMILAR): stetiger Zoom in eine Stelle – zoom=0 (INFINITE): Flug mit Schnitten
    "float gZ;",
    "float mapFr(vec3 p){",
    "  float sc=1.,s=1.22+.12*sin(gZ>.5?1.3+uSub*.8:uCut*2.4)+.02*uKick+.02*uBass;gTrap=1e9;",
    "  for(int i=0;i<8;i++){p=-1.+2.*fract(.5*p+.5);float r2=dot(p,p);gTrap=min(gTrap,r2);float k=s/r2;p*=k;sc*=k;}",
    "  return .25*abs(p.y)/sc;",
    "}",
    "vec3 fractalScene(vec2 uv,float t,float zoom){",
    "  gZ=zoom;",
    "  float tt=zoom>.5?.4+uSub*.35:t*.22+uCut*1.7;",
    "  float fl=zoom>.5?1.1*pow(3.2,uSub):1.1-.3*uChaos;",
    "  if(zoom>.5)uv*=rot(uSub*1.2);",
    "  vec3 ro=vec3(2.8*cos(.1+.33*tt),.4+.3*cos(.37*tt),2.8*cos(.5+.35*tt));",
    "  vec3 ta=vec3(1.9*cos(1.2+.41*tt),.4+.1*cos(.27*tt),1.9*cos(2.+.38*tt));",
    "  vec3 ww=normalize(ta-ro),uu=normalize(cross(ww,vec3(sin(.3*tt)*.4,1.,0.))),vv=cross(uu,ww);",
    "  vec3 rd=normalize(uv.x*uu+uv.y*vv+fl*ww);",
    "  float d=.01,steps=0.,eps=.0012*1.1/fl;vec3 p=ro;bool hit=false;",
    "  for(int i=0;i<90;i++){p=ro+rd*d;float h=mapFr(p);steps+=1.;if(h<eps*d){hit=true;break;}d+=h;if(d>12.)break;}",
    "  vec3 col=vec3(0.);",
    "  if(hit){",
    "    float tr=gTrap;vec2 e=vec2(eps*d+.0003,0.);",
    "    vec3 n=normalize(vec3(mapFr(p+e.xyy)-mapFr(p-e.xyy),mapFr(p+e.yxy)-mapFr(p-e.yxy),mapFr(p+e.yyx)-mapFr(p-e.yyx)));",
    "    float ao=1.-steps/90.,ndl=max(dot(n,normalize(vec3(.4,.8,-.3))),0.);",
    "    col=vec3(.9,.95,1.)*ao*ao*(.12+.7*ndl)+vec3(.4,.45,.6)*pow(1.-abs(dot(n,rd)),3.)*ao;",
    "    col+=uAccent*pow(clamp(1.-tr*1.6,0.,1.),2.)*(1.2+uKick*2.);",
    "  }",
    "  col=mix(col,uAccent*.14,1.-exp(-d*(zoom>.5?.2:.45)));",
    "  return col+vec3(uSnare*.04);",
    "}",

    // ---- Ereignishorizont: gebogene Lichtstrahlen; die Scheibe zieht sich am Ende zusammen ----
    "vec3 bgSky(vec3 d){",
    "  float lon=atan(d.z,d.x),lat=asin(clamp(d.y,-1.,1.));",
    "  vec2 g=vec2(lon,lat)*12./PI,f=abs(fract(g)-.5);",
    "  float line=smoothstep(.46,.5,max(f.x,f.y));",
    "  vec3 c=(vec3(.14)+uAccent*.12)*line;",
    "  vec2 sg=vec2(lon,lat)*60.;float h=hash(floor(sg));",
    "  c+=vec3(step(.985,h)*smoothstep(.3,0.,length(fract(sg)-.5))*(.5+h));",
    "  return c+uAccent*.07*fbm(vec2(lon*2.,lat*4.)+3.);",
    "}",
    "vec3 hole(vec2 uv,float t){",
    "  float con=smoothstep(.55,1.,uProg),D=mix(13.,6.,uProg),an=t*.1+1.;",
    "  vec3 ro=vec3(cos(an)*D*.45,D*.9,sin(an)*D*.45);",
    "  vec3 ww=normalize(-ro),uu=normalize(cross(ww,vec3(0.,1.,0.))),vv=cross(uu,ww);",
    "  uv*=rot(.25*sin(t*.2)+uProg*.6);",
    "  vec3 rd=normalize(uv.x*uu+uv.y*vv+1.1*ww);",
    "  vec3 p=ro,v=rd,hc=cross(p,v);float h2=dot(hc,hc),tr=1.,minr=1e9;bool dead=false;",
    "  float rout=mix(9.,2.9,con);",
    "  vec3 col=vec3(0.);",
    "  for(int i=0;i<72;i++){",
    "    float r2=dot(p,p);minr=min(minr,r2);",
    "    if(r2<1.){dead=true;break;}",
    "    float dt=max(.05,.14*sqrt(r2));",
    "    vec3 pn=p+v*dt;",
    "    if(p.y*pn.y<0.){",
    "      float f=p.y/(p.y-pn.y);vec3 c=mix(p,pn,f);float r=length(c.xz);",
    "      if(r>2.4&&r<rout){",
    "        vec2 q=rot(t*5./pow(r,1.5))*c.xz;",
    "        float n=fbm(q*1.2)*.6+.4*fbm(vec2(r*5.,atan(q.y,q.x)*2.));",
    "        float rad=smoothstep(2.4,3.,r)*smoothstep(rout,rout*.55,r);",
    "        float dop=1.+.7*dot(normalize(vec2(-c.z,c.x)),normalize(ro.xz));",
    "        vec3 dc=mix(vec3(1.,.95,.85),vec3(1.,.42,.08),smoothstep(2.4,5.,r));",
    "        dc=mix(dc,vec3(.5,.05,.02),smoothstep(5.,9.,r));",
    "        dc=mix(dc,pal(r*.4+t*.5)*1.3,con);",
    "        float a=rad*(.35+.9*n*n);",
    "        col+=tr*dc*a*max(dop,.2)*(1.6+3.*con)*(1.+uKick*.6);tr*=1.-clamp(a*.7,0.,1.);",
    "      }",
    "    }",
    "    v+=-1.5*h2*p/(r2*r2*sqrt(r2))*dt;",
    "    p=pn;",
    "    if(r2>400.&&dot(p,v)>0.)break;",
    "  }",
    "  if(!dead)col+=tr*bgSky(normalize(v))*(1.-con);",
    "  col+=mix(vec3(1.,.8,.6),pal(t),con)*(.012+.05*con)/(abs(minr-2.25)+.05);",
    "  return col;",
    "}",

    // ---- Acid: Kaleidoskop-Muster, als Spiegelung und Tunnelwand ----
    "vec3 acid(vec2 uv,float t){",
    "  uv*=rot(t*.15);",
    "  float r=length(uv),a=atan(uv.y,uv.x),n=PI/4.;",
    "  a=abs(mod(a,2.*n)-n);",
    "  vec2 p=vec2(cos(a),sin(a))*r,q=p;vec3 col=vec3(0.);",
    "  for(int i=0;i<3;i++){",
    "    q=fract(q*1.6+vec2(.1*sin(t*.4),.1*cos(t*.3)))-.5;",
    "    float d=length(q)*exp(-r*.8);",
    "    d=abs(sin(d*9.+t*1.6)/9.);",
    "    col+=pal(r*.8+float(i)*.35+t*.35)*pow(.011/max(d,1e-4),1.25);",
    "  }",
    "  vec2 w=p*2.5+vec2(t*.2,0.);",
    "  w+=2.*vec2(fbm(w+t*.4),fbm(w.yx-t*.3));",
    "  return mix(col,pal(fbm(w)*1.8+t*.25+r)*1.1,.4);",
    "}",

    // ---- Morph-Objekt: Kugel → Torus → Würfel → Oktaeder, flüssig und schillernd ----
    "float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}",
    "float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*.57735;}",
    "float shapeN(vec3 p,float i){",
    "  if(i<.5)return length(p)-1.;",
    "  if(i<1.5)return sdTorus(p,vec2(.9,.36));",
    "  if(i<2.5)return sdBox(p,vec3(.7))-.07;",
    "  return sdOcta(p,1.3);",
    "}",
    "float mapM(vec3 p){",
    "  p/=gS;",
    "  p.xz*=rot(gT*.5);p.xy*=rot(gT*.31);",
    "  float k=mod(gT*.4,4.),i=floor(k),f=smoothstep(.15,.85,fract(k));",
    "  float d=mix(shapeN(p,i),shapeN(p,mod(i+1.,4.)),f);",
    "  d+=sin(p.x*5.+gT*2.)*sin(p.y*5.+gT*1.7)*sin(p.z*5.+gT*2.3)*.07*(1.+uKick*1.5+uBass);",
    "  return d*.65*gS;",
    "}",
    "float marchObj(vec3 ro,vec3 rd){",
    "  float b=dot(ro,rd),c=dot(ro,ro)-3.6*gS*gS,disc=b*b-c;",
    "  if(disc<0.)return -1.;",
    "  float s=sqrt(disc),d=max(-b-s,0.),dmax=-b+s;",
    "  for(int i=0;i<60;i++){float h=mapM(ro+rd*d);if(h<.002)return d;d+=h;if(d>dmax)return -1.;}",
    "  return -1.;",
    "}",
    "vec3 morphScene(vec2 uv,float t){",
    "  float grow=smoothstep(0.,.1,uProg),dive=smoothstep(.78,1.,uProg);",
    "  gS=(.05+.95*grow)*(1.+.3*uKick*(1.-grow))*(1.+.6*dive);",
    "  vec3 ro=vec3(0.,0.,-4.2+2.6*dive),rd=normalize(vec3(uv,1.5-.8*dive));",
    "  float ca=sin(t*.3)*.5+uCut*.9;ro.xz*=rot(ca);rd.xz*=rot(ca);",
    "  vec3 col=pal(t*.2)*.05/(dot(uv,uv)+.05)*grow+vec3(.0012/(dot(uv,uv)+.0001))*(1.-grow);",
    "  float d=marchObj(ro,rd);",
    "  if(d>0.){",
    "    vec3 pl=ro+rd*d;vec2 e=vec2(.004,-.004);",
    "    vec3 n=normalize(e.xyy*mapM(pl+e.xyy)+e.yyx*mapM(pl+e.yyx)+e.yxy*mapM(pl+e.yxy)+e.xxx*mapM(pl+e.xxx));",
    "    vec3 rf=reflect(rd,n),l=normalize(vec3(.5,.8,-.4));",
    "    float fr=pow(1.-max(dot(n,-rd),0.),3.);",
    "    vec3 irid=pal(dot(n,rd)*1.5+length(pl)*.8+t*.3);",
    "    col=irid*(.2+.5*max(dot(n,l),0.))+acid(rf.xy/(abs(rf.z)+.7),t*.7)*.8*(.3+.7*fr)+vec3(pow(max(dot(rf,l),0.),40.))+irid*fr*.6;",
    "  }",
    "  return col;",
    "}",

    // ---- Tunnel: immer rund, Acid-Farben, immer schneller, am Ende weißes Licht ----
    "vec3 tunnel(vec2 uv,float t){",
    "  float pr=uProg;",
    "  uv*=rot(uTravel*.02+sin(t*.7)*pr*1.2);",
    "  uv+=vec2(sin(t*3.1),cos(t*2.3))*.05*pr;",
    "  float a=atan(uv.y,uv.x),r=length(uv)*(1.+.07*uBass)+1e-3;",
    "  float z=.5/pow(r,1.+pr*.5)+uTravel;",
    "  float tw=a/PI*8.+z*.15*(1.+pr*3.)*sin(t*.2+1.);",
    "  float sw=tw*PI/8.;",
    "  vec2 w=vec2(cos(sw),sin(sw))*2.+vec2(z*.3,0.);",
    "  w+=1.6*vec2(fbm(w+t*.4),fbm(w.yx-t*.3));",
    "  float n=fbm(w),n2=fbm(w*2.3+n*2.-t*.2);",
    "  vec3 col=pal(n*1.7+z*.06+t*.2)*(.35+.65*smoothstep(.25,.75,n2));",
    "  col+=pal(n*3.+z*.1+t*.5)*pow(1.-abs(sin(n*14.+z*.5-t*2.)),7.)*1.3;",   // fließende Adern
    "  col+=pal(z*.15-t)*smoothstep(.55,1.,sin(z*1.3+n*5.))*.45;",           // weiche Wellen statt Ringe
    "  float tile=1.-smoothstep(.04,.42,pr);",
    "  if(tile>0.){",
    "    vec2 g=vec2(tw,z*.8),id=floor(g),f=fract(g)-.5;float h=hash(id),h2=hash(id+7.3);",
    "    float soft=.08+.4*(1.-tile);",                 // die Kachelränder werden immer weicher
    "    float m=max(abs(f.x),abs(f.y)),panel=smoothstep(.5,.5-soft,m);",
    "    col=mix(col,col*(.25+.75*panel*(.35+.65*h2))+pal(h+z*.1+t*.5)*panel*step(.72,h2)*1.2+vec3(smoothstep(.44,.5,m)*.22),tile);",
    "  }",
    "  col*=min(1.,r*2.4)*(1.+uKick*.7);",
    "  col+=vec3(.004/(r*r+.003)*(.5+pr*pr*3.));",
    "  float rw=pow(max(pr-.82,0.)/.18,2.)*1.6;",
    "  if(rw>0.)col=mix(col,vec3(6.),smoothstep(rw,rw*.55,r));",
    "  return col;",
    "}",

    // ---- Lichtwelle: eine Kugel aus Licht wächst schneller, als die Kamera zurückweicht ----
    "vec3 licht(vec2 uv){",
    "  vec3 rd=normalize(vec3(uv*2./1.6,1.)),warm=vec3(1.,.94,.84);",
    "  float D=uDist,R=uRad;",
    "  if(D<R)return vec3(6.);",
    "  float b=D*rd.z,imp2=max(D*D-b*b,1e-9),disc=R*R-imp2;",
    "  vec3 col=warm*pow(min(R*R/imp2,1.),.8)*.6*(1.+uKick);",
    "  if(disc>0.){float k=sqrt(disc)/R;col=mix(warm,vec3(1.),k)*(.8+2.6*k)+vec3(.7,.85,1.)*smoothstep(.3,0.,k)*1.5;}",
    "  return col+vec3(pow(R/D,3.)*2.5);",
    "}",

    "void main(){",
    "  gT=uTime;gS=1.;",
    "  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    "  vec3 col=vec3(0.);",
    "  if(uScene==0)col=punkt(uv,0.);",
    "  else if(uScene==1)col=gridScene(uv,gT,1.);",
    "  else if(uScene==2)col=gridScene(uv,gT*.6,.3);",
    "  else if(uScene==3)col=shardScene(uv,gT);",
    "  else if(uScene==4)col=fractalScene(uv,gT,1.);",
    "  else if(uScene==5)col=punkt(uv,1.);",
    "  else if(uScene==6)col=hole(uv,gT);",
    "  else if(uScene==7)col=tunnel(uv,gT);",
    "  else if(uScene==9)col=licht(uv);",
    "  else if(uScene==10)col=vec3(6.);",
    "  else if(uScene==11)col=gridScene(uv,gT,1.);",
    "  else if(uScene==12)col=fractalScene(uv,gT,0.);",
    "  else if(uScene==13)col=morphScene(uv,gT);",
    "  else if(uScene==14)col=punkt(uv,0.)*(.25+uKick*1.5);",
    "  outCol=vec4(1.-exp(-col*1.2),1.);",
    "}"
  ].join("\n");

  var FEEDBACK = COMMON + "\n" + [
    "uniform sampler2D uCur,uPrev;",
    "uniform vec2 uRes;",
    "uniform float uFb,uZoom,uRotF;",
    "out vec4 outCol;",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;float asp=uRes.x/uRes.y;",
    "  vec2 c=uv-.5;c.x*=asp;c=rot(uRotF)*c/uZoom;c.x/=asp;",
    "  outCol=vec4(max(texture(uCur,uv).rgb,texture(uPrev,c+.5).rgb*uFb),1.);",
    "}"
  ].join("\n");

  var POST = COMMON + "\n" + [
    "uniform sampler2D uTex;",
    "uniform vec2 uRes,uShake;",
    "uniform float uTime,uKick,uGlitch,uFade,uWhite,uCA,uStrobe,uBars;",
    "out vec4 outCol;",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes,suv=uv+uShake;",
    "  float band=floor(suv.y*30.+uTime*37.),h=hash(vec2(band,floor(uTime*24.)));",
    "  suv.x+=(h-.5)*.35*uGlitch*step(.6,h);",
    "  vec2 c=suv-.5;float ca=uCA*(dot(c,c)*3.+.15);",
    "  vec3 col=vec3(texture(uTex,suv+c*ca).r,texture(uTex,suv).g,texture(uTex,suv-c*ca).b);",
    "  vec3 bl=textureLod(uTex,suv,3.).rgb*.5+textureLod(uTex,suv,5.).rgb*.4+textureLod(uTex,suv,7.).rgb*.3;",
    "  col+=bl*bl*(.8+uKick*.6);",
    "  col*=1.-dot(c,c)*1.2;",
    "  col+=(hash(uv*uRes+fract(uTime)*91.)-.5)*.06;",
    "  col=(col+uStrobe)*uFade;",
    "  col=mix(col,vec3(1.),uWhite);",
    "  if(uBars>0.)col*=step(uBars,uv.y)*step(uv.y,1.-uBars);",
    "  outCol=vec4(col,1.);",
    "}"
  ].join("\n");

  var PVERT = [
    "#version 300 es",
    "layout(location=0) in vec4 aPos;",
    "layout(location=1) in vec3 aBase;",
    "layout(location=2) in vec3 aGrid;",
    "uniform mat3 uRot;",
    "uniform float uDist,uAspect,uSize,uTime,uRad,uSpread,uMorph,uJit;",
    "uniform int uMode;",
    "out float vB;out float vW;",
    "void main(){",
    "  vec3 w=aPos.xyz;",
    // Attraktor: Punkte liegen erst auf Gitterstäben, biegen sich zur Bahn, dann fächern die Bahnen auf
    "  if(uMode==0)w=mix(aGrid,mix(aBase,aPos.xyz,uSpread),uMorph)+sin(vec3(aPos.w*911.,aPos.w*577.,aPos.w*331.)+uTime*7.)*uJit;",
    "  vec3 p=uRot*w;p.z+=uDist;",
    "  gl_Position=vec4(p.x*1.6/uAspect,p.y*1.6,0.,p.z);",
    "  vW=0.;",
    "  if(uMode==0){",
    "    float hd=pow(fract(aPos.w*3.-uTime*.22),10.)*uMorph;",
    "    vB=.06+.1*(1.-uMorph)+hd*1.6;gl_PointSize=clamp(uSize*(1.+hd*2.)/max(p.z,.1),1.,40.);",
    "  }else{",                            // Universum: was die Lichtwelle erreicht, leuchtet auf
    "    float r=length(aPos.xyz);",
    "    vW=step(r,uRad)*(.6+2.*smoothstep(uRad*.75,uRad,r));",
    "    vB=aPos.w;gl_PointSize=clamp(uSize*(1.+vW*1.5)/max(p.z,.02),1.6,30.);",
    "  }",
    "}"
  ].join("\n");
  var PFRAG = [
    "#version 300 es",
    "precision highp float;",
    "in float vB;in float vW;",
    "uniform vec3 uColor;",
    "out vec4 outCol;",
    "void main(){float a=smoothstep(.5,.05,length(gl_PointCoord-.5));outCol=vec4((uColor*vB+vec3(1.,.96,.9)*vW)*a,1.);}"
  ].join("\n");

  // ---------- WebGL-Aufbau ----------

  var ok = false, error = "", progScene, progFb, progPost, progPts, vaoTri, vaoLorenz, vaoUni;
  var fboS, texS, fboA, texA, fboB, texB, fbW = 0, fbH = 0;
  var N_LORENZ = 2600, K_LORENZ = 8, N_UNI = 0;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(vert, frag, names) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, vert));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, frag));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {};
    names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { p: p, u: u };
  }
  function pointBuffer(data, stride) {
    var vao = gl.createVertexArray(), buf = gl.createBuffer();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 4, gl.FLOAT, false, stride * 4, 0);
    if (stride > 4) {
      gl.enableVertexAttribArray(1);
      gl.vertexAttribPointer(1, 3, gl.FLOAT, false, stride * 4, 16);
      gl.enableVertexAttribArray(2);
      gl.vertexAttribPointer(2, 3, gl.FLOAT, false, stride * 4, 28);
    }
    return vao;
  }
  function rng(seed) {
    var a = seed >>> 0;
    return function () {
      a = (a + 0x6d2b79f5) >>> 0;
      var t = Math.imul(a ^ (a >>> 15), a | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  /**
   * Acht Lorenz-Bahnen mit verschiedenen Startwerten. Pro Punkt: eigene
   * Position, die Position der ersten Bahn (solange alles „deterministisch“
   * übereinander liegt) und ein Platz auf den Stäben eines Würfelgitters.
   */
  function lorenzData() {
    var d = new Float32Array(N_LORENZ * K_LORENZ * 10), base = [];
    for (var k = 0; k < K_LORENZ; k++) {
      var x = 0.1 + k * 0.37, y = k * 0.2, z = 20, dt = 0.006;
      for (var i = -500; i < N_LORENZ; i++) {
        for (var st = 0; st < 2; st++) {
          var dx = 10 * (y - x), dy = x * (28 - z) - y, dz = x * y - 8 / 3 * z;
          x += dx * dt; y += dy * dt; z += dz * dt;
        }
        if (i < 0) continue;
        var o = (k * N_LORENZ + i) * 10, px = x / 25, py = (z - 25) / 25, pz = y / 25;
        if (k === 0) base.push(px, py, pz);
        d[o] = px; d[o + 1] = py; d[o + 2] = pz; d[o + 3] = i / N_LORENZ;
        d[o + 4] = base[i * 3]; d[o + 5] = base[i * 3 + 1]; d[o + 6] = base[i * 3 + 2];
        // Gitterstab: 27 Linien eines 3×3×3-Gitters
        var u = i / N_LORENZ * 27, line = Math.floor(u), along = (u - line) * 2 - 1, a = (line % 3) - 1, b2 = (Math.floor(line / 3) % 3) - 1, axis = Math.floor(line / 9);
        var g = axis === 0 ? [along, a, b2] : axis === 1 ? [a, along, b2] : [a, b2, along];
        d[o + 7] = g[0] * 0.9; d[o + 8] = g[1] * 0.9; d[o + 9] = g[2] * 0.9;
      }
    }
    return d;
  }
  /** Heimatgalaxie (Spirale) im Ursprung und ein Netz ferner Galaxien. */
  function universeData() {
    var r = rng(4242), pts = [];
    function gauss() { return (r() + r() + r() + r() - 2) * 0.7; }
    for (var i = 0; i < 7000; i++) {
      if (i % 7 === 0) { var br = r() * 0.14; pts.push(gauss() * br, gauss() * br * 0.6, gauss() * br, 0.3 + r() * 0.5); continue; }
      var rad = 0.05 + 0.95 * Math.pow(r(), 0.6), ang = (i % 2) * Math.PI + rad * 5 + gauss() * 0.22 / (rad + 0.25);
      pts.push(Math.cos(ang) * rad + gauss() * 0.02, gauss() * 0.025, Math.sin(ang) * rad + gauss() * 0.02, 0.2 + r() * 0.5);
    }
    for (var g = 0; g < 280; g++) {
      var th = r() * 6.283, ph = Math.acos(2 * r() - 1), dist = 4 + 100 * Math.pow(r(), 0.7), size = 0.3 + r() * 0.9, tilt = r() * 3;
      var cx = Math.sin(ph) * Math.cos(th) * dist, cy = Math.cos(ph) * dist * 0.6, cz = Math.sin(ph) * Math.sin(th) * dist;
      for (var k = 0; k < 28; k++) {
        var px = gauss() * size, py = gauss() * size * 0.25, pz = gauss() * size;
        pts.push(cx + px, cy + py * Math.cos(tilt) - pz * Math.sin(tilt), cz + py * Math.sin(tilt) + pz * Math.cos(tilt), 0.5);
      }
    }
    N_UNI = pts.length / 4;
    return new Float32Array(pts);
  }
  function target() {
    var tex = gl.createTexture(), fbo = gl.createFramebuffer();
    return { tex: tex, fbo: fbo };
  }
  function setup() {
    progScene = program(VERT, SCENE, ["uRes", "uTime", "uKick", "uSnare", "uChaos", "uProg", "uSub", "uCut", "uTravel", "uRad", "uDist", "uBass", "uDecay", "uJit", "uAccent", "uScene"]);
    progFb = program(VERT, FEEDBACK, ["uCur", "uPrev", "uRes", "uFb", "uZoom", "uRotF"]);
    progPost = program(VERT, POST, ["uTex", "uRes", "uShake", "uTime", "uKick", "uGlitch", "uFade", "uWhite", "uCA", "uStrobe", "uBars"]);
    progPts = program(PVERT, PFRAG, ["uRot", "uDist", "uAspect", "uSize", "uTime", "uRad", "uMode", "uColor", "uSpread", "uMorph", "uJit"]);
    vaoTri = gl.createVertexArray();
    vaoLorenz = pointBuffer(lorenzData(), 10);
    vaoUni = pointBuffer(universeData(), 4);
    var s = target(), a = target(), b = target();
    texS = s.tex; fboS = s.fbo; texA = a.tex; fboA = a.fbo; texB = b.tex; fboB = b.fbo;
    fbW = fbH = 0;
  }
  function ensureTargets(w, h) {
    if (w === fbW && h === fbH) return;
    fbW = w; fbH = h;
    [[texS, fboS, gl.LINEAR], [texA, fboA, gl.LINEAR_MIPMAP_LINEAR], [texB, fboB, gl.LINEAR_MIPMAP_LINEAR]].forEach(function (t) {
      gl.bindTexture(gl.TEXTURE_2D, t[0]);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, t[2]);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, t[1]);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, t[0], 0);
      gl.clearColor(0, 0, 0, 1);
      gl.clear(gl.COLOR_BUFFER_BIT);
    });
  }

  var failEl = document.getElementById("fail");
  function fail(msg) {
    ok = false;
    error = msg;
    failEl.hidden = false;
    failEl.querySelector("span").textContent = msg;
  }
  if (!gl) fail("Dein Browser unterstützt kein WebGL2.");
  else {
    try { setup(); ok = true; } catch (e) { fail("Die Grafik konnte nicht gestartet werden: " + String(e.message).slice(0, 300)); }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ok = false; });
    canvas.addEventListener("webglcontextrestored", function () { try { setup(); ok = true; } catch (e) { fail("Grafik verloren."); } });
  }

  // ---------- Ablaufdaten ----------

  var SCENES = { punkt: 0, gitter: 1, lorenz: 2, bruch: 3, fraktal: 4, pause: 5, horizont: 6, morph: 13, tunnel: 7, stille: 8, licht: 9, weiss: 10, ende: 10 };
  var ACCENT = {
    punkt: [0.85, 0.85, 0.9], gitter: [0.9, 0.9, 0.95], lorenz: [0.1, 0.85, 1], bruch: [1, 0.45, 0.05], fraktal: [0.15, 0.5, 1],
    pause: [0.8, 0.8, 0.9], horizont: [0.6, 0.2, 1], morph: [1, 1, 1], tunnel: [1, 1, 1], stille: [1, 1, 1], licht: [1, 0.94, 0.84], weiss: [1, 1, 1], ende: [1, 1, 1]
  };
  var FEEDBACK_AMOUNT = { punkt: 0, gitter: 0, lorenz: 0.6, bruch: 0.4, fraktal: 0.35, pause: 0.8, horizont: 0.6, morph: 0.45, tunnel: 0.55, stille: 0, licht: 0.5, weiss: 0, ende: 0 };
  // kurze Wort-Einblendungen: [Abschnitt, von Schritt, bis Schritt, Text]
  var WORDS = [
    ["punkt", 20, 60, "SINGULARITY"],
    ["gitter", 8, 44, "ORDER"],
    ["lorenz", 8, 36, "DETERMINISTIC"], ["lorenz", 72, 100, "UNPREDICTABLE"],
    ["bruch", 4, 24, "ENTROPY"], ["bruch", 64, 76, "BREAK"],
    ["fraktal", 8, 28, "SELF-SIMILAR"], ["fraktal", 68, 84, "INFINITE"],
    ["pause", 16, 32, "EVENT HORIZON"],
    ["horizont", 8, 28, "NO RETURN"],
    ["tunnel", 48, 56, "FASTER"], ["tunnel", 128, 136, "CLOSER"], ["tunnel", 208, 214, "HOTTER"], ["tunnel", 256, 260, "BRIGHTER"], ["tunnel", 288, 292, "NOW"]
  ];

  /** Szene im Shader; manche Abschnitte haben zwei Hälften mit eigenem Bild. */
  function sceneId(n, a) {
    if (n === "bruch") return a.step < 64 ? 11 : 3;        // ENTROPY: Zerfall – BREAK: Splitter
    if (n === "fraktal") return a.step < 64 ? 4 : 12;      // SELF-SIMILAR: Endlos-Zoom – INFINITE: Schächte
    if (n === "stille") return a.step < 16 ? 8 : 14;       // Schwarz – dann der Herzschlag
    return SCENES[n];
  }
  /** Filterbewegung des Reese-Basses (0…1), damit man den Bass sieht. */
  function bassEnv(step, frac) {
    var now = M.stepTime(step) + frac * M.stepLength(step);
    for (var k = 0; k < 8 && step - k >= 0; k++) {
      var r = M.at(step - k).events.reese;
      if (!r) continue;
      var age = (now - M.stepTime(step - k)) / (M.stepTime(step - k + r.len) - M.stepTime(step - k));
      return age < 1 ? Math.pow(Math.sin(Math.PI * age * (r.wob || 1)), 2) : 0;
    }
    return 0;
  }

  function since(step, frac, keys) {
    var now = M.stepTime(step) + frac * M.stepLength(step);
    for (var k = 0; k < 24 && step - k >= 0; k++) {
      var e = M.at(step - k).events;
      for (var i = 0; i < keys.length; i++) if (e[keys[i]]) return now - M.stepTime(step - k);
    }
    return 9;
  }
  function frac01(x) { return x - Math.floor(x); }
  function hash1(n) { return frac01(Math.sin(n * 127.1) * 43758.5453); }

  var quality = 0.5, calm = false, lastScene = -1, sceneSince = 0, current = { scene: "punkt", index: 0, word: "", progress: 0 };

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.min(1920, Math.round(canvas.clientWidth * dpr)));
    var h = Math.max(2, Math.round(w * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  function drawPoints(vao, first, count, mode, color, rot, dist, size, t, rad, spread, morph, jit) {
    gl.useProgram(progPts.p);
    gl.bindVertexArray(vao);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.ONE, gl.ONE);
    gl.uniformMatrix3fv(progPts.u.uRot, false, rot);
    gl.uniform1f(progPts.u.uDist, dist);
    gl.uniform1f(progPts.u.uAspect, fbW / fbH);
    gl.uniform1f(progPts.u.uSize, size);
    gl.uniform1f(progPts.u.uTime, t);
    gl.uniform1f(progPts.u.uRad, rad);
    gl.uniform1i(progPts.u.uMode, mode);
    gl.uniform1f(progPts.u.uSpread, spread || 0);
    gl.uniform1f(progPts.u.uMorph, morph === undefined ? 1 : morph);
    gl.uniform1f(progPts.u.uJit, jit || 0);
    gl.uniform3f(progPts.u.uColor, color[0], color[1], color[2]);
    gl.drawArrays(gl.POINTS, first, count);
    gl.disable(gl.BLEND);
    gl.bindVertexArray(vaoTri);
  }
  function rotation(yaw, tilt) {
    var ca = Math.cos(yaw), sa = Math.sin(yaw), cb = Math.cos(tilt), sb = Math.sin(tilt);
    return new Float32Array([ca, sb * sa, -cb * sa, 0, cb, sb, sa, -sb * ca, cb * ca]);
  }

  /** Zeichnet das Bild zur Songzeit t (Sekunden). */
  function renderAt(t, q) {
    var pos = M.stepAt(t), step = pos.step, frac = pos.frac, a = M.at(step), n = a.section;
    var sec = M.SECTIONS[a.index], len = sec ? sec.bars * 16 : 1, pr = sec ? (a.step + frac) / len : 1;
    var chaos = sec ? sec.chaos[0] + (sec.chaos[1] - sec.chaos[0]) * pr : 0;
    var word = "";
    WORDS.forEach(function (w) { if (w[0] === n && a.step >= w[1] && a.step < w[2]) word = w[3]; });
    current.scene = n; current.index = a.index; current.word = word; current.progress = pr;
    if (!ok) return n;

    var secT = sec ? t - M.sectionStart(n) : 9, secLen = sec ? M.stepTime(step - a.step + len) - M.sectionStart(n) : 9;
    var kick = Math.exp(-since(step, frac, ["kick", "heart", "timp"]) * 7), snare = Math.exp(-since(step, frac, ["snare"]) * 10);
    var soft = calm ? 0.3 : 1;
    var accent = ACCENT[n], scene = sceneId(n, a);
    if (scene === 12) accent = [0.5, 0.3, 1];
    var time = t * (0.6 + 1.8 * chaos);
    var travel = n === "tunnel" ? secLen * 3 * (Math.exp(3.1 * pr) - 1) / 3.1 : 0;
    // die Lichtkugel überholt die Kamera schon nach der halben Szene
    var rad = 0.01 * Math.exp(12.8 * pr), dist = 0.25 * Math.exp(6.4 * pr);
    var half = len / 2, sub = a.step < half ? (a.step + frac) / half : (a.step + frac - half) / half;
    var bassV = bassEnv(step, frac) * (calm ? 0.4 : 1), smooth = function (x) { x = Math.max(0, Math.min(1, x)); return x * x * (3 - 2 * x); };
    var decay = scene === 11 ? sub : n === "lorenz" ? smooth((pr - 0.55) / 0.45) * 0.7 : 0;
    var jit = scene === 11 ? 0.15 + sub * sub * 5 : Math.max(chaos - 0.07, 0) * 7;

    var w = Math.max(2, Math.round(canvas.width * (q || quality))), h = Math.max(2, Math.round(canvas.height * (q || quality)));
    ensureTargets(w, h);
    gl.bindVertexArray(vaoTri);

    // 1. Szene
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboS);
    gl.viewport(0, 0, w, h);
    gl.useProgram(progScene.p);
    var u = progScene.u;
    gl.uniform2f(u.uRes, w, h);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uKick, kick * (calm ? 0.5 : 1));
    gl.uniform1f(u.uSnare, snare * soft);
    gl.uniform1f(u.uChaos, chaos);
    gl.uniform1f(u.uProg, pr);
    gl.uniform1f(u.uSub, sub);
    gl.uniform1f(u.uBass, bassV);
    gl.uniform1f(u.uDecay, decay);
    gl.uniform1f(u.uJit, jit);
    gl.uniform1f(u.uCut, a.cut);
    gl.uniform1f(u.uTravel, travel);
    gl.uniform1f(u.uRad, rad);
    gl.uniform1f(u.uDist, dist);
    gl.uniform3f(u.uAccent, accent[0], accent[1], accent[2]);
    gl.uniform1i(u.uScene, scene);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (n === "lorenz") {
      // DETERMINISTIC: Gitterstäbe biegen sich zur gemeinsamen Bahn – UNPREDICTABLE: die Bahnen fächern auf
      var rotL = rotation(t * 0.35 + a.cut * 1.3, 0.25 + 0.2 * Math.sin(t * 0.3));
      var morph = smooth((pr - 0.04) / 0.2), spread = smooth((pr - 0.48) / 0.3);
      for (var k = 0; k < K_LORENZ; k++) {
        var mixW = k === 0 ? 1 : 0.15 + 0.5 * ((k * 0.37) % 1);
        var colK = [accent[0] + (1 - accent[0]) * mixW, accent[1] + (1 - accent[1]) * mixW, accent[2] + (1 - accent[2]) * mixW];
        drawPoints(vaoLorenz, k * N_LORENZ, N_LORENZ, 0, colK.map(function (c) { return c * 0.8; }), rotL, 1.5 + 0.35 * spread, 0.012 * h, t, 0, spread, morph, 0.05 * spread * spread);
      }
    } else if (n === "licht") {
      drawPoints(vaoUni, 0, N_UNI, 1, [1.3, 1.35, 1.6], rotation(0.4 + pr * 1.2, 0.95 - pr * 0.5), dist, 0.0022 * h, t, rad);
    }

    // 2. Feedback (Schlieren): A und B wechseln sich als „voriges Bild“ ab
    var fb = FEEDBACK_AMOUNT[n] + (n === "tunnel" ? 0.25 * pr : 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fboA);
    gl.useProgram(progFb.p);
    gl.activeTexture(gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, texB);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, texS);
    gl.uniform1i(progFb.u.uCur, 0);
    gl.uniform1i(progFb.u.uPrev, 1);
    gl.uniform2f(progFb.u.uRes, w, h);
    // beim Szenenwechsel keine Schlieren der alten Szene mitnehmen
    var hardCut = scene === 3 || scene === 8 || scene === 14 || scene === 9 || scene === 10 || scene === 0;
    if (scene !== lastScene) { sceneSince = t; lastScene = scene; }
    var age = Math.max(0, t - sceneSince), fbUse = fb * (calm ? 0.8 : 1);
    if (hardCut) { if (age < 0.02) fbUse = 0; } else if (age < 1) fbUse = Math.max(fbUse, 0.95 * (1 - age));
    gl.uniform1f(progFb.u.uFb, fbUse);
    gl.uniform1f(progFb.u.uZoom, n === "horizont" ? 0.985 : 1.006 + chaos * 0.03);
    gl.uniform1f(progFb.u.uRotF, (0.002 + chaos * 0.012) * (a.cut % 2 ? 1 : -1));
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    // 3. Nachbearbeitung auf den Bildschirm
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, texA);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(progPost.p);
    u = progPost.u;
    // Bildstörung nur noch beim harten Schnitt auf BREAK; alle anderen Wechsel blenden weich über
    var trans = scene === 3 ? Math.max(0, 1 - age / 0.3) : 0;
    var burst = hash1(Math.floor(t * 10)) < chaos * 0.18 ? chaos * 0.45 : 0;
    var shake = (chaos * chaos * 0.012 + kick * 0.004 * chaos) * soft;
    var strobe = calm ? 0 : snare * chaos * chaos * 0.35 + (n === "licht" || n === "morph" ? Math.exp(-secT * 6) * 0.9 : 0);
    var fade = Math.min(1, t / 1.2);
    if (scene === 8) fade = 0;
    var bars = n === "weiss" || n === "ende" ? 0 : n === "licht" ? 0.11 * Math.max(0, 1 - pr * 4) : 0.11;
    gl.uniform1i(u.uTex, 0);
    gl.uniform2f(u.uRes, canvas.width, canvas.height);
    gl.uniform2f(u.uShake, Math.sin(t * 91.7) * shake, Math.cos(t * 77.3) * shake);
    gl.uniform1f(u.uTime, t);
    gl.uniform1f(u.uKick, kick * soft);
    gl.uniform1f(u.uGlitch, Math.max(trans, burst) * soft);
    gl.uniform1f(u.uFade, fade);
    gl.uniform1f(u.uWhite, n === "weiss" || n === "ende" ? 1 : 0);
    gl.uniform1f(u.uCA, 0.003 + (chaos * 0.022 + kick * 0.012 * chaos) * soft);
    gl.uniform1f(u.uStrobe, strobe);
    gl.uniform1f(u.uBars, bars);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    var tmpT = texA, tmpF = fboA;
    texA = texB; fboA = fboB; texB = tmpT; fboB = tmpF;
    return n;
  }

  /** Mittlere Helligkeit der Bildmitte (0…255), für Tests. */
  function brightness() {
    if (!ok) return 0;
    var n = 32, px = new Uint8Array(n * n * 4), sum = 0;
    gl.readPixels(Math.floor(canvas.width / 2 - n / 2), Math.floor(canvas.height / 2 - n / 2), n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (var i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
    return sum / (n * n * 3);
  }

  // ---------- Live-Wiedergabe ----------

  var running = false, withSound = true, clock = 0, last = null, frames = 0, offset = 0, slow = 0, fast = 0, shownWord = null, shownScene = "";
  var wordEl = document.getElementById("word"), partEl = document.getElementById("part"), finalEl = document.getElementById("final");
  var startEl = document.getElementById("start"), soundBtn = document.getElementById("btn-sound"), calmBtn = document.getElementById("btn-calm"), againBtn = document.getElementById("again");
  var NAMES = { punkt: "I · POINT", gitter: "II · ORDER", lorenz: "III · ATTRACTOR", bruch: "IV · ENTROPY", fraktal: "V · FRACTAL", pause: "VI · SILENCE", horizont: "VII · EVENT HORIZON", morph: "VIII · MORPH", tunnel: "IX · TUNNEL", stille: "", licht: "X · LIGHT", weiss: "", ende: "" };

  function songTime() {
    var t = withSound ? M.time() : null;
    return t === null ? clock - offset : t;
  }
  function frame(now) {
    requestAnimationFrame(frame);
    var dt = last === null ? 0 : (now - last) / 1000;
    last = now;
    if (!running) return;
    clock += Math.min(0.1, dt);
    resize();
    var scene = renderAt(songTime());
    frames++;
    // Auflösung an die Geschwindigkeit des Geräts anpassen
    if (dt > 0.024) { slow++; fast = 0; } else if (dt < 0.018) { fast++; slow = 0; }
    if (slow > 8) { quality = Math.max(0.25, quality * 0.85); slow = 0; }
    if (fast > 90) { quality = Math.min(1, quality * 1.1); fast = 0; }
    if (current.word !== shownWord) {
      shownWord = current.word;
      wordEl.textContent = shownWord;
      wordEl.className = "word" + (shownWord ? " show" : "") + (scene === "punkt" ? " title" : "");
    }
    if (scene !== shownScene) {
      shownScene = scene;
      partEl.textContent = NAMES[scene] || "";
    }
    var done = scene === "ende" || (scene === "weiss" && current.progress > 0.12);
    finalEl.classList.toggle("show", done);
    againBtn.hidden = !(scene === "ende" || (scene === "weiss" && current.progress > 0.7));
  }

  function begin(sound) {
    if (M.playing) M.stop();
    withSound = sound;
    if (sound) M.start(0);
    offset = clock;
    running = true;
    startEl.hidden = true;
    finalEl.classList.remove("show");
    againBtn.hidden = true;
    soundBtn.setAttribute("aria-pressed", String(sound));
  }
  ["pointerdown", "touchend"].forEach(function (type) {
    [document.getElementById("play"), againBtn].forEach(function (b) {
      b.addEventListener(type, function () { if (window.Musik) Musik.unlock(); });
    });
  });
  document.getElementById("play").addEventListener("click", function () { begin(true); });
  document.getElementById("play-silent").addEventListener("click", function () { begin(false); });
  againBtn.addEventListener("click", function () { begin(soundBtn.getAttribute("aria-pressed") === "true"); });
  soundBtn.addEventListener("click", function () {
    if (!running) return;
    var t = songTime();
    if (M.playing) {
      M.stop();
      withSound = false;
      offset = clock - t;
    } else {
      // Musik steigt an der aktuellen Stelle wieder ein
      if (window.Musik) Musik.unlock();
      M.start(Math.min(t, M.DURATION));
      withSound = true;
    }
    soundBtn.setAttribute("aria-pressed", String(withSound));
  });
  function setCalm(on) {
    calm = on;
    calmBtn.setAttribute("aria-pressed", String(on));
  }
  calmBtn.addEventListener("click", function () { setCalm(!calm); });
  setCalm(Boolean(window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches));
  document.getElementById("btn-full").addEventListener("click", function () {
    var el = document.getElementById("screen"), req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (document.fullscreenElement || document.webkitFullscreenElement) (document.exitFullscreen || document.webkitExitFullscreen).call(document);
    else if (req) { try { var r = req.call(el); if (r && r.catch) r.catch(function () {}); } catch (e) { /* kein Vollbild */ } }
  });
  document.addEventListener("keydown", function (e) {
    if ((e.key === " " || e.key === "Enter") && !running && e.target.tagName !== "BUTTON") { e.preventDefault(); begin(true); }
  });

  // Standbild hinter dem Startbildschirm: das schwarze Loch
  resize();
  renderAt(M.sectionStart("horizont") + 1.5, 0.5);
  requestAnimationFrame(frame);

  window.singularity = {
    renderAt: function (t, q) { resize(); return renderAt(t, q); },
    brightness: brightness,
    get ok() { return ok; },
    get error() { return error; },
    get scene() { return current.scene; },
    get word() { return current.word; },
    get frames() { return frames; },
    get quality() { return quality; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.DURATION; }
  };
})();
