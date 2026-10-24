if (window.H5_DATA_VERSION !== "1024-r10") throw new Error("js/data.js 版本不匹配，请完整替换本次代码包。");
/* 齐云山 H5 · 分幕叙事引擎（七幕完整版） */
const $ = (id) => document.getElementById(id);

const state = { act: 'act1', step: 0, pick: null, flavor: null };
let replyShown = false;
let replyQueue = [];
let dialoguePages = [];
let resultGeneration = 0;
let resultFile = null;
let guideClicks = 0;
let eggTimer;
let eggPhase=0;
let tuneReactionTimer;

function setBg(name) {
  if (!name) return;
  $('scene').style.backgroundImage = `url("assets/scenes/${name}")`;
}

function hideAll() {
  eggPhase=0;
 clearTimeout(tuneReactionTimer);
  $('stage').classList.remove('hotspot-mode');
  dialoguePages = [];
  ['scene-text', 'title-block', 'dialogue', 'choices', 'big-btn', 'end-card', 'hint',
    'transform', 'tune', 'match', 'result', 'act4-char', 'act6-char', 'scene-hotspots', 'easter-note']
    .forEach((id) => $(id).classList.add('hidden'));
}

function showSceneText(t) { const el = $('scene-text'); el.textContent = t; el.classList.remove('hidden'); }
function showTitle(t, s) {
  $('title-block').querySelector('h1').textContent = t;
  $('title-block').querySelector('p').textContent = s;
  $('title-block').classList.remove('hidden');
}
function showDialogue(who, t) {
  // 保留原句，按标点分成短页；过长单句再按字数分段。
  const chunks = String(t).match(/[^。！？…\n]+[。！？…]*|…+/g) || [t];
  const pages = []; let current = '';
  chunks.forEach(chunk => {
    for (let i=0;i<chunk.length;i+=30) {
      const part=chunk.slice(i,i+30);
      if (current.length+part.length>30) { pages.push(current); current=''; }
      current+=part;
    }
  });
  if(current) pages.push(current);
  $('speaker').textContent = who;
  $('text').textContent = pages.shift() || '';
  dialoguePages = pages;
  $('dialogue').classList.remove('hidden');
}
function showHint(t, strong) {
  const el = $('hint');
  el.textContent = t;
  el.classList.toggle('strong', !!strong);
  el.classList.remove('hidden');
}
function showChoices(opts) {
  const c = $('choices');
  c.innerHTML = '';
  opts.forEach((o) => {
    const b = document.createElement('button');
    b.className = 'choice-btn';
    b.innerHTML = `<span class="c-label">${o.label}</span>` +
      (o.sub ? `<span class="c-sub">${o.sub}</span>` : '');
    b.onclick = (e) => { e.stopPropagation(); choose(o); };
    c.appendChild(b);
  });
  c.classList.remove('hidden');
}
function placeHotspots() {
  const stage=$('stage'),layer=$('scene-hotspots');
  const scale=Math.max(stage.clientWidth/768,stage.clientHeight/1376);
  layer.style.width=768*scale+'px';layer.style.height=1376*scale+'px';
}
window.addEventListener('resize',placeHotspots);
function hotspot(label,x,y,w,h,action,visibleLabel) {
  const b=document.createElement('button');b.type='button';b.className='scene-hotspot';
  b.setAttribute('aria-label',label);Object.assign(b.style,{left:x+'%',top:y+'%',width:w+'%',height:h+'%'});
  if(visibleLabel){const t=document.createElement('span');t.textContent=visibleLabel;b.appendChild(t);}
  b.onclick=e=>{e.stopPropagation();action();};$('scene-hotspots').appendChild(b);return b;
}
function eggNote(text) {
  clearTimeout(eggTimer);$('easter-note').textContent=text;$('easter-note').classList.remove('hidden');
  eggTimer=setTimeout(()=>$('easter-note').classList.add('hidden'),4200);
}
function showFruitChoices(options) {
  $('stage').classList.add('hotspot-mode');
  const layer=$('scene-hotspots');layer.innerHTML='';layer.classList.remove('hidden');placeHotspots();
  [[16,27,22,19],[43,22,23,20],[73,16,23,20]].forEach((r,i)=>hotspot(options[i].label,...r,()=>choose(options[i])));
  hotspot('点击小野人，发现彩蛋',48,43,44,38,()=>{
    const lines=['？','……你不会是想选我吧？','行，你眼光确实不错。但本次活动暂不支持拐走向导。'];
    eggNote(lines[Math.min(guideClicks++,2)]);
  },'点点小野人').classList.add('guide-hotspot');
  showHint('点击枝头的一颗果实，选你的口味');
}
function showFork() {
  $('stage').classList.add('hotspot-mode');
  const layer=$('scene-hotspots');layer.innerHTML='';layer.classList.remove('hidden');placeHotspots();
  hotspot('沿石阶继续进山',30,56,28,21,()=>advance(),'沿石阶前进 ↑');
  hotspot('探索左侧岔路',6,49,27,15,()=>eggNote('那边？咱们可能会解锁《荒野求生》支线……咳，还是走石阶这边吧。'),'看看岔路 ↖');
  showHint('点击石阶前进，也可以看看左侧岔路');
}

function showButton(label) { const b = $('big-btn'); b.textContent = label; b.classList.remove('hidden'); }
function showEnd(text) { $('end-card').querySelector('p').textContent = text; $('end-card').classList.remove('hidden'); }

function choose(o) {
  if (o.pick) { state.pick = o.pick; state.flavor = { ...FLAVOR_INIT[o.pick] }; }
  hideAll();
  replyQueue = (o.replyScenes || [{bg: o.replyBg, char: o.replyChar, text: o.reply}]).slice();
  replyShown = true;
  showNextReply();
}

function showNextReply() {
  const frame = replyQueue.shift();
  $('scene-hotspots').classList.add('hidden');
  eggPhase=0;
  setBg(frame.bg);
  if (frame.char) showAct4Char(frame.char);
  showDialogue('小野人', frame.text);
  showHint('点击继续');
  if(frame.egg) showEggOffer();
  updateProgress();
}

function updateProgress() {
 const number=Number(state.act.slice(3));
 $('story-progress').textContent=String(number).padStart(2,'0')+'/'+(state.step+1);
 $('story-progress').setAttribute('aria-label',`第${number}幕，第${state.step+1}步`);
}
function showEggOffer() {
 eggPhase=1;
 const layer=$('scene-hotspots');layer.innerHTML='';layer.classList.remove('hidden');placeHotspots();
 const button=hotspot('丢个鸡蛋',24,60,24,15,()=>{
  if(eggPhase!==1)return;
  eggPhase=2;layer.classList.add('hidden');dialoguePages=[];
  setBg('b5.2.jpg');showDialogue('小野人','……？！');showHint('点击看看他的反应');
 });button.id='throw-egg';
 showHint('点击鸡蛋逗逗他，或点击别处继续');
}

let lastAdvance = 0;
function advance() {
  const now = Date.now();
  if (now - lastAdvance < 200) return; // 连续点击防抖，避免重复跳幕
  lastAdvance = now;
  const steps = SCRIPT[state.act].steps;
  if (state.step + 1 < steps.length) { state.step++; render(); }
}

function enterAct(to, step = 0) {
  state.act = to;
  state.step = step;
  replyShown = false;
  replyQueue = [];
  $('chapter').textContent = SCRIPT[to].title;
  render();
}

function render() {
  let s = SCRIPT[state.act].steps[state.step];
  while(s.only && recommend(state.flavor || FLAVOR_INIT.ripe) !== RECOMMEND[s.only]) { state.step++; s = SCRIPT[state.act].steps[state.step]; }
  hideAll();
  $('stage').dataset.act=state.act;
  $('stage').dataset.stepType=s.type;
  $('scene-leaf').classList.toggle('hidden',!['act4','act6'].includes(state.act));
  updateProgress();
  const isAct5 = state.act === 'act5';
  // 第五幕：隐藏 #scene 的旧背景（避免与 e1.2 画布重复绘制/缩放错位），并隐藏章节胶囊与开发标识
  $('scene').classList.toggle('hidden', isAct5);
  $('chapter').classList.toggle('hidden', isAct5);
  $('badge').classList.toggle('hidden', isAct5);
  if (isAct5) { renderAct5(s); return; }
  if (state.act === 'act4') { renderAct4(s); return; }
  if (state.act === 'act6') { renderAct6(s); return; }
  switch (s.type) {
    case 'scene':  setBg(s.bg); showSceneText(s.text); showHint('继续'); break;
    case 'title':  setBg(s.bg); showTitle(s.title, s.sub); showHint('继续'); break;
    case 'tap':    setBg(s.bg); if(state.act==='act3' && state.step===2) showFork(); else showHint(s.prompt, true); break;
    case 'say':    setBg(s.bg); showDialogue(s.who, s.text); showHint('继续'); break;
    case 'choice': setBg(s.bg); if(state.act==='act2') showFruitChoices(s.options); else showChoices(s.options); break;
    case 'button': setBg(s.bg); showButton(s.label); break;
    case 'transform': setBg(s.bg); showTransform(s); break;
    case 'tune':   setBg(s.bg); showTune(s); break;
    case 'match':  setBg(s.bg); showMatch(s); break;
    case 'result': showResult(s); break;
    case 'end':    showEnd(s.text); break;
    case 'act':    enterAct(s.to); return;
  }
}

// 第五幕：底图 + 人物 + 控件共用一个等比画布坐标系
function renderAct5(s) {
  $('tune').classList.remove('hidden');
  $('tune-bg').src = 'assets/scenes/e1.2.png';
  $('tune-react').classList.remove('is-dialogue');
  if (s.type === 'tune') {
    showTune(s);
  } else if (s.type === 'say') {
    setAct5Controls(false);
    showAct5Char(s.char || 'e2.png');
    showAct5Speech(s.text);
  } else if (s.type === 'scene') {
    setAct5Controls(false);
    showAct5Char(null);
    showAct5Speech('山风吹过石台，轮到你调口味了。');
  } else if (s.type === 'act') {
    enterAct(s.to);
  }
}

// 第四幕：固定背景 d6 + 角色立绘（d1/d2/d4/d5 随台词切换）
function showAct4Char(src) {
  const c = $('act4-char');
  if (src) { c.src = 'assets/scenes/' + src; c.classList.remove('hidden'); }
  else { c.classList.add('hidden'); }
}
function renderAct4(s) {
  setBg(s.bg || 'd6.png');
  showAct4Char(s.char);
  switch (s.type) {
    case 'title':     showTitle(s.title, s.sub); showHint('继续'); break;
    case 'say':       showDialogue(s.who, s.text); showHint('继续'); break;
    case 'choice':    showChoices(s.options); break;
    case 'button':    showButton(s.label); break;
    case 'transform': showTransform(s); break;
    case 'act':       enterAct(s.to); return;
  }
}

// 第六幕：背景、人物、产品分别使用，透明立绘不可作为整屏背景。
function renderAct6(s) {
  setBg('f1.png');
  if(s.type==='match') { showMatch(s); return; }
  const char=$('act6-char');char.src='assets/scenes/'+(s.char || 'e1.1.png');char.classList.remove('hidden');
  showDialogue('小野人',s.text);
  showHint('点击继续');
}

// ---- 第四幕 · 滑动变身 ----
let tfDone = false;
function showTransform(s) {
  const fruitMap = { green: 'fruit-green.png', ripe: 'fruit-ripe.png', overripe: 'fruit-overripe.png' };
  $('tf-fruit').src = 'assets/scenes/' + (fruitMap[state.pick] || 'fruit-ripe.png');
  $('tf-cake').src = 'assets/scenes/cake.png';
  $('tf-product').src = 'assets/products/product-original.png';
  $('tf-caption').textContent = s.text || '从山野果实，到酸甜韧滑的一口好味道。';
  tfDone = false;
  $('tf-tip').textContent = '← 滑动屏幕，见证变身 →';
  $('tf-tip').classList.remove('done');
  $('transform').classList.remove('hidden');
  updateTransform(0);
}
function updateTransform(p) {
  p = Math.max(0, Math.min(1, p));
  const inner = Math.max(1, $('tf-track').clientWidth - 12);
  // 背景已固定为 d6，不再随进度切换；舞台内按 果实→糕体→产品 三段推进（原 d3.jpg 已删除）
  $('tf-fruit').style.opacity = (p < 0.34 ? 1 : 0);
  $('tf-cake').style.opacity = (p >= 0.34 && p < 0.68 ? 1 : 0);
  $('tf-product').style.opacity = (p >= 0.68 ? 1 : 0);
  $('tf-thumb').style.left = (6 + inner * p) + 'px';
  $('tf-fill').style.width = (inner * p) + 'px';
  if (p >= 0.97 && !tfDone) {
    tfDone = true;
    $('tf-tip').textContent = '变身完成，点击继续';
    $('tf-tip').classList.add('done');
  }
}
(function initTransformDrag() {
  const tf = $('transform'), track = $('tf-track');
  let dragging = false;
  const progressFromX = (x) => (x - track.getBoundingClientRect().left - 6) / Math.max(1, track.clientWidth - 12);
  const onStart = (e) => { dragging = true; updateTransform(progressFromX(e.touches ? e.touches[0].clientX : e.clientX)); };
  const onMove = (e) => { if (dragging) updateTransform(progressFromX(e.touches ? e.touches[0].clientX : e.clientX)); };
  const onEnd = () => { dragging = false; };
  tf.addEventListener('touchstart', onStart, { passive: true });
  tf.addEventListener('touchmove', onMove, { passive: true });
  tf.addEventListener('touchend', onEnd);
  tf.addEventListener('mousedown', onStart);
  window.addEventListener('mousemove', onMove);
  window.addEventListener('mouseup', onEnd);
})();

// ---- 第五幕 · 调味（四维滑杆，对齐 e1.2 底图轨道 / 空框 / 木牌）----
// 原图 e1.2 为 938×1677。按原图 0/100 刻度与槽中心测量，所有坐标共用画布。
const IMG_W = 938, IMG_H = 1677;
const DIMS = [
  { key: 'sour', label: '酸', y: 896 / IMG_H * 100, x1: 237 / IMG_W * 100, x2: 724 / IMG_W * 100, bx: 819 / IMG_W * 100, by: 903 / IMG_H * 100 },
  { key: 'sweet', label: '甜', y: 1030 / IMG_H * 100, x1: 237 / IMG_W * 100, x2: 724 / IMG_W * 100, bx: 819 / IMG_W * 100, by: 1038 / IMG_H * 100 },
  { key: 'chewy', label: '韧', y: 1168 / IMG_H * 100, x1: 237 / IMG_W * 100, x2: 724 / IMG_W * 100, bx: 819 / IMG_W * 100, by: 1175 / IMG_H * 100 },
  { key: 'smooth', label: '滑', y: 1308 / IMG_H * 100, x1: 237 / IMG_W * 100, x2: 724 / IMG_W * 100, bx: 819 / IMG_W * 100, by: 1315 / IMG_H * 100 },
];
const THUMB = 28;
const BOX_W = 9.6;

// 控件（滑杆 / 反馈文字 / 木牌按钮）仅在 tune 步显示
function setAct5Controls(on) {
  $('tune-sliders').classList.toggle('hidden', !on);
  $('tune-react').classList.toggle('hidden', !on);
  $('tune-confirm').classList.toggle('hidden', !on);
}

function showTune(s) {
  if (!state.flavor) state.flavor = { ...(FLAVOR_INIT[state.pick] || FLAVOR_INIT.ripe) };
  const f = state.flavor;
  setAct5Controls(true);
  const wrap = $('tune-sliders');
  wrap.innerHTML = '';
  DIMS.forEach((d) => {
    const input = document.createElement('input');
    input.type = 'range';
    input.min = 0; input.max = 100; input.value = f[d.key];
    input.dataset.key = d.key;
    input.className = 'slider-row';
    input.setAttribute('aria-label', d.label + '度');
    input.style.top = d.y + '%';
    // 原生 range 拇指有内缩：value=0 圆心在 left+THUMB/2，value=100 圆心在 left+width-THUMB/2。
    // 为让圆心在 value=0/100 时恰好落在轨道左/右端，把 input 左右各外扩半个拇指。
    input.style.left = `calc(${d.x1}% - ${THUMB / 2}px)`;
    input.style.width = `calc(${d.x2 - d.x1}% + ${THUMB}px)`;

    const val = document.createElement('span');
    val.className = 'slider-val';
    val.dataset.key = d.key;
    val.style.top = d.by + '%';
    val.style.left = (d.bx - BOX_W / 2) + '%';
    val.style.width = BOX_W + '%';
    val.textContent = f[d.key];

    input.addEventListener('input', () => {
      f[d.key] = +input.value;
      val.textContent = input.value;
      setTuneReact(f, d.key);
    });
    wrap.appendChild(input);
    wrap.appendChild(val);
  });
  setTuneReact(f, null);
}

// 唯一的小野人图层：只存在于 #tune-stage 内，右侧留白区（不遮挡标题/装置/滑轨/木牌）
// 按透明图内人物实际边界归一化，不裁改原素材。
const ACT5_BOUNDS = {
'e1.1.png':[1330,1182,135,23,1182,1148],
'e2.png':[1396,1127,237,26,1149,1098],
'e3.png':[1396,1127,283,33,1165,1090],
'e4.png':[1396,1127,324,24,1169,1102],
'e6.png':[1396,1127,333,19,1180,1106],
'e7.png':[1355,1160,232,18,1175,1137],
'e8.png':[1396,1127,315,15,1177,1117],
};

const act5Preloads = Object.keys(ACT5_BOUNDS).map(src => {
  const img = new Image(); img.src = 'assets/scenes/' + src; return img;
});
function showAct5Char(src) {
  const el = $('tune-char');
  if (!src) { el.classList.add('hidden'); return; }
  const [w,h,x1,y1,x2,y2] = ACT5_BOUNDS[src] || ACT5_BOUNDS['e2.png'];
  const scale = 24 / (y2-y1); // 可见人物高：画布高度的24%
  const xScale = scale * IMG_H / IMG_W;
  el.style.width = w * xScale + '%';
  el.style.height = h * scale + '%';
  el.style.left = (75 - (x1+x2)/2*xScale) + '%';
  el.style.top = (47.1-y2*scale) + '%';
  el.src = 'assets/scenes/' + src;
  el.classList.remove('hidden');
}
function showAct5Speech(text) {
  const el = $('tune-react');
  el.textContent = text;
  el.classList.add('is-dialogue');
  el.classList.remove('hidden');
}
// 当前维度优先。首次进入/返回也根据已保存参数显示相应反馈。
function setTuneReact(f, activeKey) {
  const { sour, sweet, chewy, smooth } = f;
  clearTimeout(tuneReactionTimer);
  if (!activeKey) {
    $('tune-react').textContent='来，酸、甜、韧、滑，随你喜欢怎么调。';
    showAct5Char('e1.1.png'); return;
  }
  const key=activeKey;
  let t, expr;
  if (key === 'sour') {
    if (sour >= 95) { t = '……我好像看见，声音了？'; expr = 'e4.png'; }
    else if (sour >= 80) { t = '等等……你这口味有点东西啊。'; expr = 'e4.png'; }
    else if (sour >= 60) { t = '哦？还在往上加？'; expr = 'e2.png'; }
    else { t = '酸一点，还是再收一点？'; expr = 'e1.1.png'; }
  } else if (key === 'sweet') {
    if (Math.abs(sweet-sour) <= 10) { t = '酸甜都想要？懂了，你是来享受的。'; expr = 'e8.png'; }
    else { t = sweet > sour ? '看来你对甜味的偏爱，根本不打算藏。' : '甜一点，还是再收一点？'; expr = sweet > sour ? 'e3.png' : 'e1.1.png'; }
  } else if (key === 'chewy') {
    t = chewy >= 80 ? '这么喜欢有嚼劲的？我想起个东西……' : '喜欢有嚼劲，还是轻松好嚼？';
    expr = chewy >= 80 ? 'e6.png' : 'e1.1.png';
  } else if (key === 'smooth') {
    t = smooth >= 80 ? '刚才想说什么来着……哦，滑过去了。' : '顺口的感觉，也由你来调。';
    expr = smooth >= 80 ? 'e7.png' : 'e1.1.png';
  } else {
    t = '酸甜都想要？懂了，你是来享受的。'; expr = 'e8.png';
  }
  $('tune-react').textContent = t;
  showAct5Char(expr);
  tuneReactionTimer=setTimeout(()=>{
    if(state.act==='act5' && SCRIPT.act5.steps[state.step].type==='tune') {
      showAct5Char('e1.1.png'); $('tune-react').textContent='口味记下了，还可以继续微调。';
    }
  },2000);
}

$('tune-confirm').addEventListener('click', (e) => {
  e.stopPropagation();
  if (state.act === 'act5' && SCRIPT.act5.steps[state.step].type === 'tune') advance();
});

// ---- 第六幕 · 匹配（本命推荐）----
function showMatch(s) {
  if (!state.flavor) state.flavor = { ...(FLAVOR_INIT[state.pick] || FLAVOR_INIT.ripe) };
  const f = state.flavor;
  const r = recommend(f);
  $('match-badge').src = 'assets/result/' + r.badge;
  $('match-title').textContent = '「' + r.title + '」';
  $('match-char').src = 'assets/scenes/e1.1.png';
  const productSrc='assets/products/' + r.img;
  $('match-product').src=productSrc;
  loadProduct(productSrc).then(img=>{if(state.act==='act6' && recommend(state.flavor)===r && img instanceof HTMLCanvasElement) $('match-product').src=img.toDataURL('image/png');}).catch(()=>{});
  $('match-product-name').textContent = '齐云山 · ' + r.product + '南酸枣糕';
  $('match-comment').textContent = r.comment;

  // 韧≥80 彩蛋（产品名严格为「陈皮南酸枣粒」，非「南酸枣糕」）
  if (f.chewy >= 80) {
    $('match-chenpi').classList.remove('hidden');
    $('match-chenpi').innerHTML =
      `<img src="assets/products/product-chenpi.png" alt="陈皮南酸枣粒">` +
      `<span>额外尝鲜 · 陈皮南酸枣粒<br><small>高韧偏好彩蛋，不影响主推荐。</small></span>`;
  } else {
    $('match-chenpi').classList.add('hidden');
  }

  // 次选产品：每个结果各不相同（酸=经典原味/低糖、均衡=低糖、甜=白桃/蓝莓）
  const wrap = $('match-others');
  wrap.innerHTML = '';
  (r.secondary || []).forEach((o) => {
    const b = document.createElement('div');
    b.className = 'match-chip';
    b.innerHTML = `<img src="assets/products/${o.img}" alt="${o.name}"><span>${o.name}</span>`;
    wrap.appendChild(b);
  });

  $('match').classList.remove('hidden');
  $('match').scrollTop=0;
}

$('match-product').setAttribute('tabindex','0');
$('match-product').setAttribute('role','button');
$('match-product').setAttribute('aria-label','查看推荐产品大图');
function openProduct() {
  const r=recommend(state.flavor || FLAVOR_INIT.ripe);
  $('product-large').src='assets/products/'+r.img;$('product-large').alt=r.product+'南酸枣糕';
  $('product-caption').textContent='齐云山 · '+r.product+'南酸枣糕';
  $('product-view').classList.remove('hidden');$('product-close').focus();
}
function closeProduct() {$('product-view').classList.add('hidden');$('match-product').focus();}
$('match-product').addEventListener('click',openProduct);
$('match-product').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();openProduct();}});
$('product-close').addEventListener('click',closeProduct);
$('product-view').addEventListener('click',e=>{if(e.target===$('product-view'))closeProduct();});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('product-view').classList.contains('hidden'))closeProduct();});

$('match-keep').addEventListener('click', () => enterAct('act7'));
$('match-retune').addEventListener('click', () =>
  enterAct('act5', SCRIPT.act5.steps.findIndex((s) => s.type === 'tune')));

// ---- 第七幕 · 分享（Canvas 口味档案）----
function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const timer=setTimeout(()=>reject(new Error('图片加载超时：'+src)),12000);
    img.onload = () => {clearTimeout(timer);resolve(img);};
    img.onerror = () => {clearTimeout(timer);reject(new Error('图片加载失败：'+src));};
    img.src = (window.H5_RESULT_ASSETS||{})[src] || src;
  });
}

// 仅在展示层收紧产品原图的纯白外围，不改动原始素材。
const productImageCache=new Map();
function loadProduct(src) {
 if(productImageCache.has(src)) return productImageCache.get(src);
 const promise=loadImage(src).then(img=>{
  try {
   const scan=document.createElement('canvas');const scale=Math.min(1,900/img.width);scan.width=Math.round(img.width*scale);scan.height=Math.round(img.height*scale);
   const c=scan.getContext('2d',{willReadFrequently:true});c.drawImage(img,0,0,scan.width,scan.height);
   const d=c.getImageData(0,0,scan.width,scan.height).data;let x1=scan.width,y1=scan.height,x2=0,y2=0;
   for(let y=0;y<scan.height;y++)for(let x=0;x<scan.width;x++){const i=(y*scan.width+x)*4;if(d[i+3]>100&&Math.min(d[i],d[i+1],d[i+2])<230){x1=Math.min(x1,x);y1=Math.min(y1,y);x2=Math.max(x2,x);y2=Math.max(y2,y);}}
   if(x2<=x1||y2<=y1)return img;
   x1=Math.max(0,x1-5);y1=Math.max(0,y1-5);x2=Math.min(scan.width,x2+6);y2=Math.min(scan.height,y2+6);
   const out=document.createElement('canvas');out.width=Math.round((x2-x1)/scale);out.height=Math.round((y2-y1)/scale);
   out.getContext('2d').drawImage(img,x1/scale,y1/scale,(x2-x1)/scale,(y2-y1)/scale,0,0,out.width,out.height);return out;
  }catch{return img;}
 }).catch(err=>{productImageCache.delete(src);throw err;});productImageCache.set(src,promise);return promise;
}

function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function wrapCanvasText(ctx, text, x, y, maxWidth, lineHeight) {
  let line='';
  for(const char of text) {
    if(char==='\n' || ctx.measureText(line+char).width>maxWidth) {
      ctx.fillText(line,x,y); y+=lineHeight; line=char==='\n'?'':char;
    } else line+=char;
  }
  if(line) ctx.fillText(line,x,y);
  return y+lineHeight;
}
function containImage(ctx,img,x,y,w,h) {
  if(!img) return;
  const scale=Math.min(w/img.width,h/img.height);
  ctx.drawImage(img,x+(w-img.width*scale)/2,y+(h-img.height*scale)/2,img.width*scale,img.height*scale);
}
function drawResult(ctx,o) {
 const F='"PingFang SC","Microsoft YaHei","Noto Sans CJK SC",sans-serif';
 ctx.fillStyle='#f6f0e3';ctx.fillRect(0,0,750,1334);
 if(o.bg) ctx.drawImage(o.bg,0,0,750,1334);
 ctx.fillStyle='rgba(255,249,235,.97)';roundRect(ctx,42,55,666,1230,24);ctx.fill();
 ctx.strokeStyle='#80916b';ctx.lineWidth=2;roundRect(ctx,54,67,642,1206,18);ctx.stroke();
 containImage(ctx,o.logo,287,78,176,88);
 ctx.textAlign='center';ctx.fillStyle='#354b31';ctx.font=`500 25px ${F}`;ctx.fillText('齐云山 · 山野口味档案',375,193);
 ctx.font=`700 43px ${F}`;ctx.fillText(o.r.title,375,249);
 ctx.fillStyle='#e8ecd9';roundRect(ctx,105,278,540,231,16);ctx.fill();
 containImage(ctx,o.badge,140,318,142,142);
 ctx.save();ctx.beginPath();ctx.rect(318,278,287,231);ctx.clip();containImage(ctx,o.ch,325,285,270,245);ctx.restore();
 ctx.fillStyle='#75865c';ctx.fillRect(105,503,540,6);
 ctx.fillStyle='#354b31';ctx.font=`700 24px ${F}`;ctx.fillText('本命推荐 · '+o.r.product+'南酸枣糕',375,551);
 ctx.fillStyle='#fff';roundRect(ctx,112,570,526,228,12);ctx.fill();containImage(ctx,o.prod,124,579,502,208);
 ctx.font=`400 18px ${F}`;ctx.fillStyle='#657252';ctx.fillText('基于你的口味偏好推荐',375,825);
 [['酸',o.f.sour,'#b76a46'],['甜',o.f.sweet,'#cfaa4c'],['韧',o.f.chewy,'#527449'],['滑',o.f.smooth,'#8e9d70']].forEach(([label,v,color],i)=>{
 const y=849+i*43;ctx.textAlign='left';ctx.font=`700 24px ${F}`;ctx.fillStyle='#354b31';ctx.fillText(label,119,y+23);
 ctx.fillStyle='#e5e6d7';roundRect(ctx,169,y,380,27,13);ctx.fill();ctx.save();roundRect(ctx,169,y,380,27,13);ctx.clip();ctx.fillStyle=color;ctx.fillRect(169,y,380*Math.max(0,Math.min(100,v))/100,27);ctx.restore();ctx.textAlign='right';ctx.fillStyle='#354b31';ctx.fillText(v,630,y+23);
 });
 ctx.textAlign='center';ctx.font=`400 17px ${F}`;ctx.fillStyle='#657252';ctx.fillText('主观口味偏好，不代表产品检测数据',375,1040);
 ctx.font=`400 24px ${F}`;ctx.fillStyle='#354b31';wrapCanvasText(ctx,o.r.comment,375,1091,522,33);
 ctx.strokeStyle='#c5cbb4';ctx.beginPath();ctx.moveTo(120,1185);ctx.lineTo(630,1185);ctx.stroke();
 ctx.font=`700 25px ${F}`;ctx.fillText('从深山来，带着一点野。',375,1222);
 ctx.font=`400 20px ${F}`;ctx.fillText('你的朋友，又会调出怎样的野趣？',375,1256);
}


let resultAssetsPromise;
function ensureResultAssets() {
 if(window.H5_RESULT_ASSETS)return Promise.resolve();
 if(resultAssetsPromise)return resultAssetsPromise;
 resultAssetsPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');script.src='js/result-assets.js?v=1024-r10';
  const timer=setTimeout(()=>{script.remove();resultAssetsPromise=null;reject(new Error('素材加载超时'));},20000);
  script.onload=()=>{clearTimeout(timer);productImageCache.clear();resolve();};
  script.onerror=()=>{clearTimeout(timer);script.remove();resultAssetsPromise=null;reject(new Error('素材加载失败'));};document.head.appendChild(script);
 });return resultAssetsPromise;
}
function showResultFallback(f,r) {
 const panel=$('result-fallback');panel.replaceChildren();
 const title=document.createElement('h2');title.textContent=r.title;panel.append(title);
 const product=document.createElement('img');product.src='assets/products/'+r.img;product.alt=r.product+'南酸枣糕';panel.append(product);
 const name=document.createElement('h3');name.textContent='本命推荐 · '+r.product+'南酸枣糕';panel.append(name);
 const values=document.createElement('p');values.textContent=`酸 ${f.sour} · 甜 ${f.sweet} · 韧 ${f.chewy} · 滑 ${f.smooth}`;panel.append(values);
 const comment=document.createElement('p');comment.textContent=r.comment;panel.append(comment);panel.classList.remove('hidden');
}
async function showResult(s) {
 const generation=++resultGeneration;
 const f={...(state.flavor||(state.flavor={...(FLAVOR_INIT[state.pick]||FLAVOR_INIT.ripe)}))};const r=recommend(f);
 window._resultCanvas=null;resultFile=null;$('result-preview').removeAttribute('src');
 $('result-retry').classList.add('hidden');$('op-save').disabled=true;$('op-invite').disabled=false;
 showResultFallback(f,r);$('result').classList.remove('hidden');$('result-scroll').scrollTop=0;
 $('result-tip').textContent='结果已显示，正在生成可保存的图片……';
 try {
  await ensureResultAssets();
  if(document.fonts)await Promise.race([document.fonts.ready,new Promise(resolve=>setTimeout(resolve,1500))]);
  const paths=['assets/result/g1背景.png','assets/result/g2档案卡底板.png','assets/result/'+r.badge,'assets/result/'+CHARACTER.archive,'assets/products/'+r.img,'assets/logo.png'];
  const images=await Promise.all(paths.map((src,i)=>(i===4?loadProduct(src):loadImage(src)).catch(()=>null)));
  if(generation!==resultGeneration||state.act!=='act7')return;
  if(!images[4])throw new Error('产品图片未加载');
  const canvas=document.createElement('canvas');canvas.width=1500;canvas.height=2668;const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Canvas不可用');ctx.scale(2,2);
  drawResult(ctx,{bg:images[0],card:images[1],badge:images[2],ch:images[3],prod:images[4],logo:images[5],f,r});
  const url=canvas.toDataURL('image/png');$('result-preview').src=url;window._resultCanvas=canvas;
  $('result-fallback').classList.add('hidden');$('op-save').disabled=false;
  $('result-tip').textContent='长按档案图片保存，或点击保存按钮。';
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
  if(generation!==resultGeneration)return;
  if(blob&&typeof File==='function')resultFile=new File([blob],'齐云山口味档案.png',{type:'image/png'});
 } catch(error) {
  if(generation!==resultGeneration||state.act!=='act7')return;
  $('result-tip').textContent='结果已保留，图片生成未完成。请重新生成，或先复制邀请文案。';$('result-retry').classList.remove('hidden');
 }
}

function resultShareText() {
  const r = recommend(state.flavor || FLAVOR_INIT.ripe);
  return `我在「齐云山·山野口味档案」里是「${r.title}」，本命推荐：${r.product}。从深山来，带着一点野。`;
}

function saveResult() {
  const c = window._resultCanvas;
  if (!c) { toast('结果卡还未生成完成'); return; }
  if (/MicroMessenger/i.test(navigator.userAgent)) { toast('请长按上方结果卡，选择保存图片。'); return; }
  try {
    const a = document.createElement('a');
    a.href = c.toDataURL('image/png');
    a.download = '齐云山·山野口味档案.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
    toast('已尝试下载；若没有下载，请长按结果卡保存。');
  } catch (err) {
    // 下载失败或不支持：结果卡 PNG 已展示，提示长按保存
    toast('长按下方图片即可保存到相册');
  }
}

function inviteResult() {
  // 文件在生成卡片时预先准备，保持分享调用发生在点击事件内。
  const data={title:'齐云山 · 山野口味档案',text:resultShareText()};
  if(/^https?:$/.test(location.protocol) && !['localhost','127.0.0.1'].includes(location.hostname)) data.url=location.href.split('#')[0];
  try {
    if(resultFile && navigator.canShare && navigator.canShare({files:[resultFile]})) data.files=[resultFile];
    if(navigator.share && (data.files || data.url)) {
      navigator.share(data).catch(err=>{if(err.name!=='AbortError') showInviteGuide();});
    } else showInviteGuide();
  } catch(err) { showInviteGuide(); }
}

function showInviteGuide() {
  $('invite-char').src = 'assets/result/' + CHARACTER.invite;
  $('share-copy').value=resultShareText();
  $('invite-guide').classList.remove('hidden');
}

async function copyShareText() {
 const el=$('share-copy');el.value=resultShareText();
 try {if(!navigator.clipboard) throw new Error();await navigator.clipboard.writeText(el.value);toast('文案已复制');}
 catch {el.focus();el.select();el.setSelectionRange(0,el.value.length);try {if(document.execCommand('copy')){toast('文案已复制');return;}}catch{}toast('请长按选中文案，手动复制。');}
}

function replayResult() {
  guideClicks=0;clearTimeout(eggTimer);$('easter-note').classList.add('hidden');$('product-view').classList.add('hidden');
  resultGeneration++; resultFile=null; window._resultCanvas=null; dialoguePages=[];
  $('result-preview').removeAttribute('src');
  $('invite-guide').classList.add('hidden');
  state.act = 'act1'; state.step = 0; state.pick = null; state.flavor = null;
  replyShown = false;
  enterAct('act1');
}

$('result-retry').addEventListener('click',()=>showResult(SCRIPT.act7.steps[0]));
$('op-save').addEventListener('click', saveResult);
$('op-invite').addEventListener('click', inviteResult);
$('op-replay').addEventListener('click', replayResult);
$('invite-copy').addEventListener('click', copyShareText);
$('invite-close').addEventListener('click', () => $('invite-guide').classList.add('hidden'));

// ---- 轻提示 ----
let toastTimer;
function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.remove('hidden');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.add('hidden'), 2200);
}

// 点击推进（选项/按钮/交互步除外）
$('stage').addEventListener('click', (e) => {
  if (e.target.closest('.choice-btn') || e.target.closest('.big-btn')) return;
  if (e.target.closest('#match, #result, #product-view, #scene-hotspots')) return;
  if(state.act==='act3' && state.step===2) return;
  if (!$('dialogue').classList.contains('hidden') && dialoguePages.length) { $('text').textContent = dialoguePages.shift(); return; }
  if(eggPhase===2){eggPhase=3;dialoguePages=[];setBg('b5.3.jpg');showDialogue('小野人','好好好，夸自己一句也不行？');showHint('点击继续旅程');return;}
  if(eggPhase===1||eggPhase===3){eggPhase=0;$('scene-hotspots').classList.add('hidden');dialoguePages=[];}
  if (replyShown) { if(replyQueue.length) { showNextReply(); return; } replyShown = false; advance(); return; }
  const s = SCRIPT[state.act].steps[state.step];
  if (s.type === 'transform') { if (tfDone) advance(); return; }
  if (s.type === 'choice' || s.type === 'button' || s.type === 'end') return;
  if (s.type === 'tune' || s.type === 'match' || s.type === 'result') return;
  advance();
});

$('big-btn').addEventListener('click', () => advance());

// 启动
$('chapter').textContent = SCRIPT[state.act].title;
render();

window.H5_READY = true;
if (window.h5FinishBoot) window.h5FinishBoot();
