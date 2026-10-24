window.H5_DATA_VERSION = "1024-r11";
/* 齐云山 H5 · 剧情数据（七幕完整版，V3.0 文案）
 * 步骤 type：
 *   scene     —— 切换背景 + 场景文字
 *   title     —— 大标题 + 副文案
 *   tap       —— 等待点击（提示语）
 *   say       —— 对话气泡（who: 小野人）
 *   choice    —— 玩家选项（option.pick 记录选果；option.reply 为小野人回应）
 *   button    —— 主按钮，点击推进
 *   transform —— 滑动变身（第四幕：果实→糕体→产品）
 *   tune      —— 第五幕调味（四维滑杆：酸/甜/韧/滑）
 *   match     —— 第六幕匹配（本命推荐 + 彩蛋 + 其他尝鲜）
 *   result    —— 第七幕分享（Canvas 口味档案 + 保存/邀请/重玩）
 *   act       —— 切换到下一幕
 *   end       —— 预览结束占位
 *
 * bg 使用上色后的场景图（assets/scenes/ 下）。
 * 说明：按人物动作与剧情语义映射；素材编号不代表播放顺序。
 */

const FLAVOR_INIT = {
  green:    { sour: 80, sweet: 30, chewy: 60, smooth: 40 }, // 青果：偏酸、偏韧
  ripe:     { sour: 50, sweet: 55, chewy: 50, smooth: 60 }, // 熟果：酸甜均衡
  overripe: { sour: 25, sweet: 80, chewy: 40, smooth: 70 }, // 熟透：偏甜、偏滑
};

// 第六幕推荐：甜度倾向 = 甜 − 酸，严格三段（0 与 30 含入均衡段）。
// 主推荐只用酸/甜差值，韧、滑不参与；韧≥80 额外触发陈皮彩蛋。
// 徽章 g6-g8 与三种称号的对应已按配色核对：绿=酸劲探索家、黄=酸甜掌控者、橙红=甜味冒险王。
// 人物 g3-g5 与称号无关，按动作使用（收好档案/邀请好友/重复点击彩蛋）。
const CHARACTER = {
  archive: 'g4人物.webp', // 收好档案（匹配卡与结果卡默认姿态）
  invite:  'g3人物.webp', // 邀请好友
  easter:  'g5人物.webp', // 重复点击彩蛋
};

const RECOMMEND = {
  acid: {
    title: '酸劲探索家',
    product: '柠檬味',
    img: 'product-lemon.webp',
    badge: 'g6徽章.webp',
    secondary: [
      { name: '经典原味', img: 'product-original.webp' },
      { name: '低糖', img: 'product-lowsugar.webp' },
    ],
    comment: '你这一口，像山风一样带劲。\n敢把酸拉到这一步的人，本来就不多。',
  },
  balance: {
    title: '酸甜掌控者',
    product: '经典原味',
    img: 'product-original.webp',
    badge: 'g7徽章.webp',
    secondary: [
      { name: '低糖', img: 'product-lowsugar.webp' },
    ],
    comment: '酸甜之间，你摸到了自己的平衡点。\n稳，是一种本事。',
  },
  sweet: {
    title: '甜味冒险王',
    product: '芒果味',
    img: 'product-mango.webp',
    badge: 'g8徽章.webp',
    secondary: [
      { name: '白桃', img: 'product-peach.webp' },
      { name: '蓝莓', img: 'product-blueberry.webp' },
    ],
    comment: '甜得嚣张一点，有什么不好？\n日子嘛，总得有点甜头。',
  },
};

function recommend(flavor) {
  const d = flavor.sweet - flavor.sour;
  if (d < 0) return RECOMMEND.acid;   // 差值为负：酸劲探索家
  if (d > 30) return RECOMMEND.sweet; // 差值 > 30：甜味冒险王
  return RECOMMEND.balance;           // 0 ~ 30（含两端）：酸甜掌控者
}

const SCRIPT = {
  act1: {
    title: '01｜遇见',
    steps: [
      { type: 'scene', bg: 'a1.webp', text: '山林深处，树影摇晃。一颗南酸枣从枝叶间探出，随着微风轻轻晃动。' },
      { type: 'title', bg: 'a1.webp', title: '从深山来，带着一点野。', sub: '听说，山里有颗南酸枣，最近有点不太安分。\n至于它在折腾什么……不如亲自看看？' },
      { type: 'tap', bg: 'a1.webp', prompt: '点击果实，开启奇遇' },
      { type: 'say', bg: 'a3.webp', who: '小野人', text: '等等！这颗我先发现的！' },
      { type: 'scene', bg: 'a4.webp', text: '小野人低头看看手里的果子，又抬头看向你。' },
      { type: 'say', bg: 'a5.webp', who: '小野人', text: '……你谁？' },
      { type: 'say', bg: 'a6.webp', who: '小野人', text: '算了，来都来了。' },
      { type: 'say', bg: 'a7.webp', who: '小野人', text: '要不要跟我去看点有意思的？' },
      { type: 'choice', bg: 'a7.webp', options: [
          { label: '什么好东西？', reply: '好问题。但提前告诉你，不就少了一半乐趣？' },
          { label: '你先说清楚。', reply: '这么谨慎？放心，我又不会把你卖给山里的猴子。……山里应该没有猴子吧？' },
      ]},
      { type: 'say', bg: 'a8.webp', who: '小野人', text: '跟上，别掉队！' },
      { type: 'act', to: 'act2' },
    ],
  },

  act2: {
    title: '02｜寻果',
    steps: [
      { type: 'scene', bg: 'b1.webp', text: '小野人带你来到一棵南酸枣树下，枝头挂着不同成熟程度的果实。' },
      { type: 'say', bg: 'b2.webp', who: '小野人', text: '到了！你看，这三颗南酸枣，长得不一样，味道也各有特点。来，挑一颗。' },
      { type: 'choice', bg: 'b3.webp', options: [
          { label: '青果｜酸得很有态度', sub: '还带着青涩劲儿，光看着就有点酸。', pick: 'green', replyBg: 'b4.webp', reply: '这颗还青着呢。你确定？……行，我现在有点好奇你的口味了。' },
          { label: '熟果｜酸甜刚刚好', sub: '酸一点，甜一点，谁也不抢谁的风头。', pick: 'ripe', replyBg: 'b4.webp', reply: '嗯？选了个稳妥的？……你这算盘打得，我在山那头都听见了。' },
          { label: '熟透果｜甜得有点嚣张', sub: '成熟度拉满，甜味也开始有自己的主意。', pick: 'overripe', replyScenes: [
            { bg: 'b4.webp', text: '哦——原来你喜欢这一款。成熟的果子确实有魅力。' },
            { bg: 'b5.1.webp', text: '比如我。', egg: true },
          ] },
      ]},
      { type: 'say', bg: 'b4.webp', who: '小野人', text: '果子选好了？先别急着下结论。走，带你看看它从哪儿来。' },
      { type: 'button', bg: 'b4.webp', label: '出发，进山！' },
      { type: 'act', to: 'act3' },
    ],
  },

  act3: {
    title: '03｜入山',
    steps: [
      { type: 'scene', bg: 'c1.webp', text: '山脚。山路向前延伸，枝叶在风里轻轻晃动。' },
      { type: 'say', bg: 'c1.webp', who: '小野人', text: '跟紧我，这条路我熟得很。' },
      { type: 'tap', bg: 'c2.webp', prompt: '点击前方小径，继续前进' },
      { type: 'scene', bg: 'c3.webp', text: '山腰。阳光从树叶间落下，山风吹过。' },
      { type: 'say', bg: 'c3.webp', who: '小野人', text: '怎么样？这地方不错吧？我平时最喜欢在这儿待着。尤其是没人跟我抢果子的时候。' },
      { type: 'tap', bg: 'c3.webp', prompt: '继续前行' },
      { type: 'scene', bg: 'c4.webp', text: '果树下。镜头穿过树冠，停在枝头的南酸枣上。' },
      { type: 'say', bg: 'c4.webp', who: '小野人', text: '看，就是它。你刚才选的那颗，也来自这样的地方。' },
      { type: 'say', bg: 'c5.webp', who: '小野人', text: '不过，要是它只能待在树上……那可就太可惜了。' },
      { type: 'button', bg: 'c5.webp', label: '接下来呢？' },
      { type: 'say', bg: 'c6.webp', who: '小野人', text: '接下来？当然是给它换个出场方式。' },
      { type: 'act', to: 'act4' },
    ],
  },

  act4: {
    title: '04｜变身',
    steps: [
      { type: 'title', bg: 'd6.webp', char: 'd1.webp', title: '一颗南酸枣的第二种打开方式。', sub: '' },
      { type: 'say', bg: 'd6.webp', char: 'd1.webp', who: '小野人', text: '准备好了吗？\n接下来，请欣赏——' },
      { type: 'say', bg: 'd6.webp', char: 'd2.webp', who: '小野人', text: '南酸枣的华丽变身！' },
      { type: 'transform', bg: 'd6.webp', char: 'd2.webp', text: '从山野果实，到酸甜韧滑的一口好味道。' },
      { type: 'say', bg: 'd6.webp', char: 'd2.webp', who: '小野人', text: '锵锵！\n怎么样？是不是有点东西？' },
      { type: 'choice', bg: 'd6.webp', char: 'd2.webp', options: [
          { label: '确实有点东西。', replyChar: 'd5.webp', reply: '那当然！\n我的眼光，什么时候出过问题？' },
          { label: '还能再变吗？', replyChar: 'd4.webp', reply: '你还真敢想。\n……不过，好像也不是不行。' },
      ]},
      { type: 'say', bg: 'd6.webp', char: 'd4.webp', who: '小野人', text: '说起来，同样是南酸枣糕——\n有人喜欢酸一点，有人喜欢甜一点。\n至于口感嘛，也各有各的讲究。' },
      { type: 'say', bg: 'd6.webp', char: 'd5.webp', who: '小野人', text: '诶，我有个想法！' },
      { type: 'button', bg: 'd6.webp', char: 'd5.webp', label: '展开说说？' },
      { type: 'say', bg: 'd6.webp', char: 'd1.webp', who: '小野人', text: '与其让我猜你喜欢什么……\n不如你自己来调！' },
      { type: 'act', to: 'act5' },
    ],
  },

  act5: {
    title: '05｜调味',
    steps: [
      { type: 'scene', bg: 'e1.2.webp', text: '山腰。小野人把你带到一块被山风磨得发亮的石台前。' },
      { type: 'say', bg: 'e1.2.webp', who: '小野人', text: '酸、甜、韧、滑，四个方向。', char: 'e2.webp' },
      { type: 'say', bg: 'e1.2.webp', who: '小野人', text: '想多酸就多酸，想多甜就多甜。', char: 'e2.webp' },
      { type: 'say', bg: 'e1.2.webp', who: '小野人', text: '怎么调，你说了算。', char: 'e2.webp' },
      { type: 'tune', bg: 'e1.2.webp', text: '拖动滑杆，调出你心里的那一口。' },
      { type: 'say', bg: 'e1.2.webp', who: '小野人', text: '好了？让我看看哪款适合你先尝尝。', char: 'e1.1.webp' },
      { type: 'act', to: 'act6' },
    ],
  },

  act6: {
    title: '06｜匹配',
    steps: [
      { type: 'say', bg: 'f1.webp', char: 'e1.1.webp', who: '小野人', text: '嗯……有的有的！' },
      { type: 'say', bg: 'f1.webp', char: 'e1.1.webp', who: '小野人', text: '根据你刚才的选择，我找到一款值得你试试的了。' },
      { type: 'say', bg: 'f1.webp', char: 'f4.webp', only: 'balance', who: '小野人', text: '作为一名山野人，已经没有什么能让我睁眼了。' },
      { type: 'say', bg: 'f1.webp', char: 'f5.webp', only: 'balance', who: '小野人', text: '什么？我最爱的经典味！' },
      { type: 'match', bg: 'f3.webp' },
    ],
  },

  act7: {
    title: '07｜分享',
    steps: [
      { type: 'result', bg: 'g1背景.webp' },
    ],
  },
};
