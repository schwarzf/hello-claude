/**
 * HYPERFLUX – moderne Shader-Demo (WebGL2). Sechs Szenen, die der Musik
 * (NeonMusik) folgen: Daten-Tunnel, 3D-Landschaft, Ozean, Acid-Kaleidoskop,
 * morphendes Flüssig-Objekt und ein Finale mit allem zusammen.
 *
 * Aufbau: Die Szene wird per Raymarching in eine kleinere Textur gerechnet
 * (Auflösung passt sich der Geschwindigkeit des Geräts an), ein zweiter
 * Durchgang legt Bloom, Farbsäume, Glitch, Vignette und Körnung darüber.
 */
(function () {
  "use strict";

  var M = NeonMusik, STEP = M.STEP;
  var canvas = document.getElementById("gl");
  var gl = canvas.getContext("webgl2", { antialias: false, alpha: false, powerPreference: "high-performance" });

  var VERT = "#version 300 es\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}";

  var SCENE = [
    "#version 300 es",
    "precision highp float;",
    "uniform vec2 uRes;",
    "uniform float uTime,uKick,uSnare,uAcid;",
    "uniform int uScene;",
    "out vec4 outCol;",
    "const float PI=3.14159265;",
    "float gT; float gK; vec3 gC;",
    "mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);",
    "  return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}",
    "float fbm(vec2 p){float a=.5,v=0.;for(int i=0;i<5;i++){v+=a*noise(p);p=rot(.5)*p*2.03;a*=.5;}return v;}",
    "vec3 pal(float t){return .5+.5*cos(6.28318*(t+vec3(0.,.33,.67)));}",

    // ---- Acid: Kaleidoskop aus verschachtelten Ringen plus verzerrtes Rauschen ----
    "vec3 acid(vec2 uv,float t){",
    "  uv*=1.+.12*sin(t*.7)-.1*gK+uAcid*.25;",
    "  uv*=rot(t*.15);",
    "  float r=length(uv),a=atan(uv.y,uv.x),n=PI/4.;",
    "  a=abs(mod(a,2.*n)-n);",
    "  vec2 p=vec2(cos(a),sin(a))*r,q=p;vec3 col=vec3(0.);",
    "  for(int i=0;i<4;i++){",
    "    q=fract(q*1.6+vec2(.1*sin(t*.4),.1*cos(t*.3)))-.5;",
    "    float d=length(q)*exp(-r*.8);",
    "    d=abs(sin(d*9.+t*1.6)/9.);",
    "    col+=pal(r*.8+float(i)*.35+t*.35)*pow(.011/max(d,1e-4),1.25);",
    "  }",
    "  vec2 w=p*2.5+vec2(t*.2,0.);",
    "  w+=2.*vec2(fbm(w+t*.4),fbm(w.yx-t*.3));",
    "  return mix(col,pal(fbm(w)*1.8+t*.25+r)*1.1,.4);",
    "}",

    // ---- Technologie: Flug durch einen Daten-Tunnel aus Leiterbahnen ----
    "vec3 tech(vec2 uv,float t){",
    "  uv*=rot(sin(t*.3)*.4);",
    "  uv+=.08*vec2(sin(t*.9),cos(t*.7));",
    "  float r=length(uv)+1e-3,a=atan(uv.y,uv.x);",
    "  float z=.6/r+t*3.;",
    "  vec2 g=vec2(a/PI*10.+sin(z*.25)*1.5,z*1.5);",
    "  vec2 id=floor(g),f=fract(g)-.5;",
    "  float h=hash(id),h2=hash(id+31.7);",
    "  vec3 base=mix(vec3(0.,.85,1.),vec3(1.,.15,.75),step(.5,h2));",
    "  float edge=smoothstep(.42,.5,max(abs(f.x),abs(f.y)));",
    "  float lit=step(.78,fract(h+floor(t*6.+h2*4.)*.137));",
    "  float trace=smoothstep(.07,0.,abs(f.y-(h-.5)*.5))*step(.45,h)+smoothstep(.07,0.,abs(f.x-(h2-.5)*.5))*step(h,.3);",
    "  float dotp=smoothstep(.12,.06,length(f-vec2(h-.5,h2-.5)*.5));",
    "  vec3 col=base*(edge*.5+lit*.9*(.5+.5*sin(t*30.*h))+trace*.6)+vec3(.9,1.,.6)*dotp*lit;",
    "  col*=smoothstep(0.,.5,r)*(1.+gK*.8);",
    "  float rr=(1.-gK)*1.3;",
    "  col+=vec3(.6,.9,1.)*smoothstep(.05,0.,abs(r-rr))*gK*1.5;",
    "  col+=vec3(.4,.7,1.)*.012/(r*r+.004)*(.6+gK);",
    "  return col;",
    "}",

    // ---- 3D-Landschaft: Neon-Gitter über Bergen, die im Takt wachsen ----
    "float th(vec2 p){",
    "  float m=smoothstep(.6,5.,abs(p.x+sin(p.y*.15)*1.5));",
    "  return (noise(p*.22)*3.2+noise(p*.5)*1.2)*m*(1.+gK*.25)-.2;",
    "}",
    "vec3 skyT(vec3 rd,float t){",
    "  float y=max(rd.y,0.);",
    "  vec3 c=mix(vec3(1.,.25,.6),vec3(.03,.02,.15),pow(y,.45));",
    "  vec3 sd=normalize(vec3(0.,.16,1.));float s=dot(rd,sd);",
    "  float disc=smoothstep(.985,.988,s);",
    "  float bands=step(0.,sin((rd.y-.02)*140.)+(rd.y-.1)*14.);",
    "  c=mix(c,mix(vec3(1.,.9,.3),vec3(1.,.2,.5),clamp((.26-rd.y)*5.,0.,1.))*1.6,disc*bands);",
    "  c+=vec3(1.,.4,.5)*pow(max(s,0.),12.)*.5;",
    "  float au=fbm(vec2(rd.x*4.+t*.1,rd.y*10.-t*.2));",
    "  c+=pal(au+t*.05+rd.x)*smoothstep(.45,.9,au)*smoothstep(.05,.5,rd.y)*.6;",
    "  vec2 sp=rd.xy/(rd.z+1.2)*60.;",
    "  c+=step(.992,hash(floor(sp)))*smoothstep(.2,.6,rd.y);",
    "  return c;",
    "}",
    "vec3 terrain(vec2 uv,float t){",
    "  vec3 ro=vec3(sin(t*.3)*.5,1.7+sin(t*.5)*.3,t*5.);",
    "  ro.y=max(ro.y,th(ro.xz)+1.);",
    "  vec3 rd=normalize(vec3(uv,1.3));",
    "  rd.yz*=rot(.1);rd.xy*=rot(sin(t*.4)*.12);",
    "  float d=.2;bool hit=false;vec3 p=ro;",
    "  for(int i=0;i<72;i++){p=ro+rd*d;float h=p.y-th(p.xz);if(h<.004*d){hit=true;break;}if(d>70.)break;d+=h*.55+.02;}",
    "  vec3 sky=skyT(rd,t);if(!hit)return sky;",
    "  vec2 e=vec2(.06+.003*d,0.);",
    "  vec3 n=normalize(vec3(th(p.xz-e.xy)-th(p.xz+e.xy),2.*e.x,th(p.xz-e.yx)-th(p.xz+e.yx)));",
    "  vec2 gq=abs(fract(p.xz)-.5);",
    "  float ln=min(.5-gq.x,.5-gq.y),w=.025+.004*d;",
    "  float grid=smoothstep(w,0.,ln)*exp(-d*.035);",
    "  vec3 gcol=mix(vec3(0.,.9,1.),vec3(1.,.1,.8),smoothstep(0.,3.,p.y));",
    "  vec3 col=vec3(.02,.01,.06)+vec3(.2,.03,.3)*max(dot(n,normalize(vec3(.2,.5,-.8))),0.);",
    "  col+=gcol*grid*(1.2+gK*1.5);",
    "  float scan=smoothstep(.9,1.,fract((p.z-ro.z)*.03-t*.6));",
    "  col+=gcol*scan*.35;",
    "  return mix(col,vec3(1.,.25,.6)*.8,1.-exp(-d*d*.0006));",
    "}",

    // ---- Morph-Objekt: Kugel → Torus → Würfel → Oktaeder, flüssig verformt ----
    "float sdBox(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}",
    "float sdTorus(vec3 p,vec2 t){vec2 q=vec2(length(p.xz)-t.x,p.y);return length(q)-t.y;}",
    "float sdOcta(vec3 p,float s){p=abs(p);return (p.x+p.y+p.z-s)*.57735;}",
    "float shapeN(vec3 p,float i){",
    "  if(i<.5)return length(p)-1.;",
    "  if(i<1.5)return sdTorus(p,vec2(.9,.36));",
    "  if(i<2.5)return sdBox(p,vec3(.7))-.07;",
    "  return sdOcta(p,1.3);",
    "}",
    "float map(vec3 p){",
    "  p.xz*=rot(gT*.5);p.xy*=rot(gT*.31);",
    "  float k=mod(gT*.35,4.),i=floor(k),f=smoothstep(.15,.85,fract(k));",
    "  float d=mix(shapeN(p,i),shapeN(p,mod(i+1.,4.)),f);",
    "  d+=sin(p.x*5.+gT*2.)*sin(p.y*5.+gT*1.7)*sin(p.z*5.+gT*2.3)*.07*(1.+gK*1.8);",
    "  float lat=smoothstep(.55,.8,sin(gT*.45));",
    "  float gy=abs(dot(sin(p*5.+gT),cos(p.zxy*5.)))/5.-.05;",
    "  d=mix(d,max(d,gy),lat);",
    "  return d*.65;",
    "}",
    "float marchObj(vec3 ro,vec3 rd){",
    "  vec3 oc=ro-gC;float b=dot(oc,rd),c=dot(oc,oc)-3.6,disc=b*b-c;",
    "  if(disc<0.)return -1.;",
    "  float s=sqrt(disc),d=max(-b-s,0.),dmax=-b+s;",
    "  for(int i=0;i<60;i++){float h=map(ro+rd*d-gC);if(h<.002)return d;d+=h;if(d>dmax)return -1.;}",
    "  return -1.;",
    "}",
    "vec3 shadeObj(vec3 pl,vec3 rd,float t){",
    "  vec2 e=vec2(.004,-.004);",
    "  vec3 n=normalize(e.xyy*map(pl+e.xyy)+e.yyx*map(pl+e.yyx)+e.yxy*map(pl+e.yxy)+e.xxx*map(pl+e.xxx));",
    "  vec3 rf=reflect(rd,n),l=normalize(vec3(.5,.8,-.4));",
    "  float fr=pow(1.-max(dot(n,-rd),0.),3.);",
    "  vec3 env=acid(rf.xy/(abs(rf.z)+.7),t*.7)*.8;",
    "  vec3 irid=pal(dot(n,rd)*1.5+length(pl)*.8+t*.3);",
    "  return irid*(.2+.5*max(dot(n,l),0.))+env*(.3+.7*fr)+vec3(1.)*pow(max(dot(rf,l),0.),40.)+irid*fr*.6;",
    "}",
    "vec3 morphScene(vec2 uv,float t){",
    "  vec3 ro=vec3(0.,0.,-4.2),rd=normalize(vec3(uv,1.5));",
    "  ro.xz*=rot(sin(t*.3)*.5);rd.xz*=rot(sin(t*.3)*.5);",
    "  gC=vec3(0.);",
    "  vec3 col=acid(uv*.9,t*.5)*.16+pal(t*.2)*.05/(dot(uv,uv)+.06);",
    "  float d=marchObj(ro,rd);",
    "  if(d>0.)col=shadeObj(ro+rd*d,rd,t);",
    "  return col;",
    "}",

    // ---- Wasser: Ozean mit Spiegelung, Sonnenglitzern und leuchtenden Kämmen ----
    "float wave(vec2 p,float t,int oct){",
    "  float h=0.,a=.42,f=.35;vec2 d=vec2(.8,.6);",
    "  for(int i=0;i<oct;i++){",
    "    float ph=dot(p,d)*f+t*(1.2+float(i)*.35);",
    "    h+=a*(1.-abs(sin(ph)));",
    "    p+=d*cos(ph)*a*.6;d=rot(1.3)*d;f*=1.75;a*=.5;",
    "  }",
    "  return h*(1.+gK*.12);",
    "}",
    "vec3 skyO(vec3 rd,float t,float trip){",
    "  float y=max(rd.y,0.);",
    "  vec3 c=mix(vec3(1.,.4,.2),vec3(.04,.03,.24),pow(y,.42));",
    "  c=mix(c,vec3(.9,.15,.55),exp(-y*7.)*.55);",
    "  vec3 sd=normalize(vec3(0.,.12,1.));float s=max(dot(rd,sd),0.);",
    "  c+=vec3(1.,.8,.5)*(smoothstep(.994,.996,s)*2.+pow(s,40.)*.35+pow(s,6.)*.12)*(1.-.65*trip);",
    "  float cl=fbm(rd.xz/(rd.y+.15)*1.2+vec2(t*.05,0.));",
    "  c=mix(c,vec3(1.,.6,.7)*(.6+.6*cl),smoothstep(.5,.9,cl)*smoothstep(0.,.3,rd.y)*.6);",
    "  if(trip>0.){vec3 ac=acid(rd.xy/(abs(rd.z)+.6)*1.2,t);c=mix(c,ac*.9,trip*smoothstep(-.05,.25,rd.y)*.85);}",
    "  return c;",
    "}",
    "vec3 ocean(vec2 uv,float t,float trip,bool obj){",
    "  vec3 ro=vec3(0.,1.5+.2*sin(t*.6),t*2.5);",
    "  vec3 rd=normalize(vec3(uv,1.4));",
    "  rd.yz*=rot(obj?-.06:.1);rd.xy*=rot(sin(t*.35)*.08);",
    "  gC=ro+vec3(sin(t*.5)*.6,1.5+.25*sin(t*.9),7.);",
    "  float dObj=obj?marchObj(ro,rd):-1.;",
    "  vec3 col=skyO(rd,t,trip);",
    "  if(rd.y<0.){",
    "    float d=(ro.y-.9)/(-rd.y);vec3 p=ro+rd*d;",
    "    for(int i=0;i<40;i++){p=ro+rd*d;float h=p.y-wave(p.xz,t,4);if(h<.003*d||d>90.)break;d+=h*.7+.01;}",
    "    if(dObj<0.||d<dObj){",
    "      float ee=.02+.004*d;",
    "      float h0=wave(p.xz,t,6);",
    "      vec3 n=normalize(vec3(h0-wave(p.xz+vec2(ee,0.),t,6),ee,h0-wave(p.xz+vec2(0.,ee),t,6)));",
    "      vec3 rf=reflect(rd,n);rf.y=abs(rf.y);",
    "      float fr=.04+.96*pow(1.-max(dot(n,-rd),0.),5.);",
    "      vec3 deep=mix(vec3(.0,.03,.1),vec3(.0,.45,.5),smoothstep(.3,.9,h0));",
    "      vec3 w=mix(deep,skyO(rf,t,trip),fr);",
    "      w+=vec3(.1,1.,.9)*smoothstep(.6,.84,h0)*.6*(1.+gK);",
    "      if(obj){vec2 q=p.xz-gC.xz;w+=pal(t*.3)*.5/(dot(q,q)*.6+1.);}",
    "      col=mix(w,col,1.-exp(-d*d*.00025));",
    "      dObj=-1.;",
    "    }",
    "  }",
    "  if(dObj>0.)col=shadeObj(ro+rd*dObj-gC,rd,t);",
    "  return col;",
    "}",

    "void main(){",
    "  gT=uTime;gK=uKick;gC=vec3(0.);",
    "  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;",
    "  vec3 col;",
    "  if(uScene==0)col=tech(uv,gT);",
    "  else if(uScene==1)col=terrain(uv,gT);",
    "  else if(uScene==2)col=ocean(uv,gT,0.,false);",
    "  else if(uScene==3)col=acid(uv*1.3,gT)*.9;",
    "  else if(uScene==4)col=morphScene(uv,gT);",
    "  else col=ocean(uv,gT,1.,true);",
    "  col=1.-exp(-col*1.15);",
    "  outCol=vec4(pow(col,vec3(.9)),1.);",
    "}"
  ].join("\n");

  var POST = [
    "#version 300 es",
    "precision highp float;",
    "uniform sampler2D uTex;",
    "uniform vec2 uRes;",
    "uniform float uTime,uKick,uTrans,uFade;",
    "out vec4 outCol;",
    "float hash(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}",
    "void main(){",
    "  vec2 uv=gl_FragCoord.xy/uRes;",
    // Glitch beim Szenenwechsel: waagerechte Streifen springen zur Seite
    "  float band=floor(uv.y*26.+uTime*31.),h=hash(vec2(band,floor(uTime*24.)));",
    "  uv.x+=(h-.5)*.3*uTrans*step(.55,h);",
    "  vec2 c=uv-.5;",
    "  float ca=(.004+.02*uKick+.06*uTrans)*dot(c,c)*3.+.0015;",
    "  vec3 col=vec3(texture(uTex,uv+c*ca).r,texture(uTex,uv).g,texture(uTex,uv-c*ca).b);",
    // Bloom aus den verkleinerten Stufen der Textur
    "  vec3 bl=textureLod(uTex,uv,3.).rgb*.5+textureLod(uTex,uv,5.).rgb*.4+textureLod(uTex,uv,7.).rgb*.3;",
    "  col+=bl*bl*(.8+uKick*.7);",
    "  col*=1.-dot(c,c)*1.15;",
    "  col+=(hash(uv*uRes+fract(uTime)*91.)-.5)*.045;",
    "  col+=uTrans*.08;",
    "  outCol=vec4(col*uFade,1.);",
    "}"
  ].join("\n");

  // ---------- WebGL-Aufbau ----------

  var ok = false, error = "", progScene, progPost, uni = {}, fbo, tex, fbW = 0, fbH = 0;

  function compile(type, src) {
    var s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
    return s;
  }
  function program(fragSrc, names) {
    var p = gl.createProgram();
    gl.attachShader(p, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, compile(gl.FRAGMENT_SHADER, fragSrc));
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
    var u = {};
    names.forEach(function (n) { u[n] = gl.getUniformLocation(p, n); });
    return { p: p, u: u };
  }
  function setup() {
    progScene = program(SCENE, ["uRes", "uTime", "uKick", "uSnare", "uAcid", "uScene"]);
    progPost = program(POST, ["uTex", "uRes", "uTime", "uKick", "uTrans", "uFade"]);
    gl.bindVertexArray(gl.createVertexArray());
    tex = gl.createTexture();
    fbo = gl.createFramebuffer();
    fbW = fbH = 0;
  }
  function ensureTarget(w, h) {
    if (w === fbW && h === fbH) return;
    fbW = w; fbH = h;
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA8, w, h, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex, 0);
  }

  var failEl = document.getElementById("fail");
  function fail(msg) {
    ok = false;
    error = msg;
    if (failEl) { failEl.hidden = false; failEl.querySelector("span").textContent = msg; }
  }
  if (!gl) fail("Dein Browser unterstützt kein WebGL2.");
  else {
    try { setup(); ok = true; } catch (e) { fail("Die Grafik konnte nicht gestartet werden: " + String(e.message).slice(0, 300)); }
    canvas.addEventListener("webglcontextlost", function (e) { e.preventDefault(); ok = false; });
    canvas.addEventListener("webglcontextrestored", function () { try { setup(); ok = true; } catch (e) { fail("Grafik verloren."); } });
  }

  // ---------- Takt-Informationen ----------

  function since(step, frac, key, noLoop) {
    for (var k = 0; k < 20 && step - k >= 0; k++) if (M.at(step - k, noLoop).events[key]) return (k + frac) * STEP;
    return 9;
  }

  var quality = 0.5, calm = false, current = { scene: "boot", index: 0 };

  function resize() {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var w = Math.max(2, Math.min(1920, Math.round(canvas.clientWidth * dpr)));
    var h = Math.max(2, Math.round(w * canvas.clientHeight / Math.max(1, canvas.clientWidth)));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
  }

  /** Zeichnet das Bild zur Songzeit t. noLoop: Song endet nach dem Finale. */
  function renderAt(t, noLoop, q) {
    var stepF = t / STEP, step = Math.floor(stepF), frac = stepF - step, a = M.at(step, noLoop);
    current.scene = a.section;
    current.index = a.index;
    if (!ok) return a.section;
    var sk = since(step, frac, "kick", noLoop), ss = since(step, frac, "clap", noLoop);
    var kick = Math.exp(-sk * 7), snare = Math.exp(-ss * 9);
    var secLen = a.section === "ende" ? 999 : M.SECTIONS[a.index].bars * M.BAR * STEP, ts = (a.step + frac) * STEP;
    var trans = Math.max(0, 1 - ts / 0.35, a.section === "ende" ? 0 : 1 - (secLen - ts) / 0.18);
    var fade = Math.min(1, t / 0.8);
    if (a.section === "ende") fade = Math.max(0, 1 - ts / 3.2);
    var soft = calm ? 0.3 : 1;

    var w = Math.max(2, Math.round(canvas.width * (q || quality))), h = Math.max(2, Math.round(canvas.height * (q || quality)));
    ensureTarget(w, h);
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.viewport(0, 0, w, h);
    gl.useProgram(progScene.p);
    gl.uniform2f(progScene.u.uRes, w, h);
    gl.uniform1f(progScene.u.uTime, t);
    gl.uniform1f(progScene.u.uKick, kick * (calm ? 0.5 : 1));
    gl.uniform1f(progScene.u.uSnare, snare);
    gl.uniform1f(progScene.u.uAcid, a.acidCut);
    gl.uniform1i(progScene.u.uScene, a.index);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.useProgram(progPost.p);
    gl.uniform1i(progPost.u.uTex, 0);
    gl.uniform2f(progPost.u.uRes, canvas.width, canvas.height);
    gl.uniform1f(progPost.u.uTime, t);
    gl.uniform1f(progPost.u.uKick, kick * soft);
    gl.uniform1f(progPost.u.uTrans, trans * soft);
    gl.uniform1f(progPost.u.uFade, fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    return a.section;
  }

  /** Mittlere Helligkeit des Bildes (0…255), für Tests. */
  function brightness() {
    if (!ok) return 0;
    var n = 16, px = new Uint8Array(n * n * 4), sum = 0;
    gl.readPixels(Math.floor(canvas.width / 2 - n / 2), Math.floor(canvas.height / 2 - n / 2), n, n, gl.RGBA, gl.UNSIGNED_BYTE, px);
    for (var i = 0; i < px.length; i += 4) sum += px[i] + px[i + 1] + px[i + 2];
    return sum / (n * n * 3);
  }

  // ---------- Live-Wiedergabe ----------

  var TITLES = { boot: "SYSTEM BOOT", terrain: "TERRAFORM", ocean: "DEEP BLUE", acid: "ACID", morph: "MORPH", final: "OVERDRIVE", ende: "" };
  var running = false, withSound = true, clock = 0, last = null, frames = 0, offset = 0, slow = 0, fast = 0, shownScene = "";
  var titleEl = document.getElementById("title"), partEl = document.getElementById("part");

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
    // Auflösung an die Geschwindigkeit anpassen
    if (dt > 0.024) { slow++; fast = 0; } else if (dt < 0.018) { fast++; slow = 0; }
    if (slow > 8) { quality = Math.max(0.25, quality * 0.85); slow = 0; }
    if (fast > 90) { quality = Math.min(1, quality * 1.1); fast = 0; }
    if (scene !== shownScene) {
      shownScene = scene;
      if (titleEl) {
        titleEl.textContent = TITLES[scene] || "";
        titleEl.setAttribute("data-text", TITLES[scene] || "");
        titleEl.classList.remove("show");
        void titleEl.offsetWidth;
        titleEl.classList.add("show");
      }
      if (partEl) partEl.textContent = (current.index + 1) + " / 6 · " + (TITLES[scene] || "");
    }
  }

  var startEl = document.getElementById("start"), soundBtn = document.getElementById("btn-sound"), calmBtn = document.getElementById("btn-calm");
  function begin(sound) {
    withSound = sound;
    if (sound) M.start();
    offset = clock;
    running = true;
    startEl.hidden = true;
    soundBtn.setAttribute("aria-pressed", String(sound));
  }
  ["pointerdown", "touchend"].forEach(function (type) {
    document.getElementById("play").addEventListener(type, function () { if (window.Musik) Musik.unlock(); });
  });
  document.getElementById("play").addEventListener("click", function () { begin(true); });
  document.getElementById("play-silent").addEventListener("click", function () { begin(false); });
  soundBtn.addEventListener("click", function () {
    if (!running) return;
    if (M.playing) {
      var t = M.time();
      M.stop();
      withSound = false;
      offset = clock - t;
    } else {
      // Musik startet am Songanfang neu, die Grafik springt mit
      if (window.Musik) Musik.unlock();
      M.start();
      withSound = true;
    }
    soundBtn.setAttribute("aria-pressed", String(withSound));
  });
  function setCalm(on) {
    calm = on;
    calmBtn.setAttribute("aria-pressed", String(on));
    document.body.classList.toggle("calm", on);
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

  // Standbild hinter dem Startbildschirm
  resize();
  renderAt(M.SECTIONS[0].bars * M.BAR * STEP * 4 + 3, false, 0.5);
  requestAnimationFrame(frame);

  window.neon = {
    renderAt: function (t, noLoop, q) { resize(); return renderAt(t, noLoop, q); },
    brightness: brightness,
    get ok() { return ok; },
    get error() { return error; },
    get scene() { return current.scene; },
    get frames() { return frames; },
    get quality() { return quality; },
    setTime: function (t) { withSound = false; if (M.playing) M.stop(); offset = clock - t; },
    duration: function () { return M.SONG_STEPS * STEP + 3.3; }
  };
})();
