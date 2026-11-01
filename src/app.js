import { PRESETS, ENDINGS } from './data.js?v=1.1.0';
import { choosePreset, normalizeNickname, createRun, getScene, advance, finishEnding } from './engine.js?v=1.1.0';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const assets = new URL('../assets/', import.meta.url);
const asset = name => new URL(name, assets).href;
const h = value => String(value ?? '').replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const paragraphs = text => String(text).split(/\n\n/).map(t=>`<p>${h(t).replace(/\n/g,'<br>')}</p>`).join('');
const state = { screen:'home', mode:'winner', gender:'male', nickname:'', presets:{}, run:null, sound:false, reduced:matchMedia('(prefers-reduced-motion: reduce)').matches, busy:false, epoch:0 };
const icons = {
 ticket:'M5 5h22v7a4 4 0 0 0 0 8v7H5v-7a4 4 0 0 0 0-8V5zm9 4v14m5-14v14',
 arrow:'M6 16h19M18 8l8 8-8 8', check:'M6 17l7 7L27 8', home:'M4 15L16 4l12 11M8 12v16h7v-9h6v9h4V12',
 phone:'M9 3h14v26H9zM14 25h4', bag:'M6 10h20v18H6zM11 10V5h10v5', close:'M7 7l18 18M25 7L7 25',
 info:'M16 14v10m0-17v1M29 16a13 13 0 1 1-26 0 13 13 0 0 1 26 0',
 sound:'M5 12h6l8-7v22l-8-7H5zM24 10c5 4 5 8 0 12', muted:'M5 12h6l8-7v22l-8-7H5zM24 12l6 8m0-8-6 8',
 moon:'M25 22A13 13 0 0 1 10 4a13 13 0 1 0 15 18', clock:'M16 8v9l6 3M29 16a13 13 0 1 1-26 0 13 13 0 0 1 26 0',
 download:'M16 3v18m-7-7 7 7 7-7M5 23v6h22v-6', star:'m16 3 4 9 10 1-8 7 2 10-8-5-8 5 2-10-8-7 10-1z',
 car:'M5 14l3-8h16l3 8M4 14h24v11H4zM8 25v4m16-4v4M8 19h3m10 0h3',
 heart:'M16 27 4 15C-3 5 10-2 16 7c6-9 19-2 12 8z', plane:'m3 15 11-2 6-10h5l-5 10 9 3v3l-10-1-4 10h-4l2-11-10 1z',
 coin:'M29 16a13 13 0 1 1-26 0 13 13 0 0 1 26 0M21 9H12v7h8v7h-9m5-18v22',
 briefcase:'M3 10h26v18H3zM10 10V4h12v6M3 17h26m-15 0v4h4v-4',
 book:'M3 5h11l2 3 2-3h11v23H18l-2 2-2-2H3zM16 8v20',
 cup:'M5 5h17v17H5zM22 8h6v10h-6M3 27h23', plant:'M16 19V9m0 9C3 18 2 3 4 3c10 0 12 7 12 15m0-4C27 14 30 2 28 2c-9 0-12 6-12 12M9 21h14l-2 9H11z',
 palette:'M27 18C36 4 7-5 3 12c-3 12 10 19 15 17 6-2-3-8 1-10 2-1 5 1 8-1M9 9h1m7-3h1m6 5h1M7 17h1',
 gift:'M3 12h26v7H3zm3 7v11h20V19M16 12v18m0-18C1 14 5-2 12 4l4 8m0 0C31 14 27-2 20 4l-4 8',
 peace:'M8 16h16M16 5v22M16 3a13 13 0 1 1-1 0M16 16 6 24m10-8 10 8',
 restart:'M6 11a12 12 0 1 1-1 12M6 3v10h10', envelope:'M3 6h26v21H3zM3 6l13 12L29 6',
 cloud:'M8 25a7 7 0 0 1-1-14 10 10 0 0 1 19 3 6 6 0 0 1-1 11z'
};
const icon = (name, cls='') => `<svg class="icon ${cls}" viewBox="0 0 32 32" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2.3" stroke-linecap="square" stroke-linejoin="miter"><path d="${icons[name]||icons.star}"/></svg>`;
const endIcon = ['home','check','coin','home','gift','car','plane','cup','palette','book','briefcase','clock','cup','plant','palette','heart','heart','gift','cup','peace'];

function preset(id) { return PRESETS.find(p=>p.id===id) || PRESETS[0]; }
function avatar(id, extra='') {
 const p=preset(id),i=p.atlasIndex ?? Number(p.id.slice(1))-1;
 return `<div class="avatar ${extra}" data-preset="${h(p.id)}" role="img" aria-label="${h(p.hair+' · '+p.outfit)}" style="--avatar-image:url('${asset(`characters-${p.gender}.webp`)}');--avatar-x:${(i%5)*25}%;--avatar-y:${Math.floor(i/5)*100}%"></div>`;
}
function environment(index) { return `background-image:url('${asset('endings.webp')}');background-size:500% 400%;background-position:${(index%5)*25}% ${Math.floor(index/5)*100/3}%`; }
function sceneStyle(background,ending) {
 if(ending) return environment(ending.atlasIndex ?? ENDINGS.indexOf(ending));
 if(background==='park')return environment(11);
 return `background-image:url('${asset(({room:'room',street:'street',bank:'bank',ending:'room'}[background]||'street')+'.webp')}')`;
}
function speak(text) { announcer.textContent='';queueMicrotask(()=>announcer.textContent=text); }
let audio;
function chime(positive=false) {
 if(!state.sound)return;
 try {
  audio ||= new (window.AudioContext||window.webkitAudioContext)();audio.resume().catch(()=>{});
  const now=audio.currentTime;
  (positive?[523,659,784]:[480]).forEach((freq,i)=>{const oscillator=audio.createOscillator(),gain=audio.createGain();oscillator.type='triangle';oscillator.frequency.value=freq;gain.gain.setValueAtTime(0,now+i*.075);gain.gain.linearRampToValueAtTime(.045,now+i*.075+.01);gain.gain.exponentialRampToValueAtTime(.001,now+i*.075+.14);oscillator.connect(gain).connect(audio.destination);oscillator.start(now+i*.075);oscillator.stop(now+i*.075+.15);});
 }catch{/* Audio is optional; story is always usable without it. */}
}
function header() {
 const active=state.run && !['home','setup'].includes(state.screen);
 return `<header class="topbar"><button class="brand" data-action="home" aria-label="로또 라이프 처음으로">${icon('ticket')}<span><b>로또</b> 라이프</span></button><div class="top-tools"><span class="fiction-label">가상 체험</span>${active?`<span class="mode-label">${state.mode==='winner'?'1등 체험':'시뮬레이션'}</span>`:''}<button class="tool-button" data-action="sound" aria-label="${state.sound?'효과음 끄기':'효과음 켜기'}" aria-pressed="${state.sound}" title="효과음">${icon(state.sound?'sound':'muted')}</button><button class="tool-button" data-action="motion" aria-label="모션 줄이기" aria-pressed="${state.reduced}" title="모션 줄이기">${icon('moon')}</button><button class="tool-button" data-action="info" aria-label="게임 안내">${icon('info')}</button></div></header>`;
}
function bottom(note='닉네임과 진행 내용은 저장되지 않아요.') { return `<footer class="small-footer">${icon('ticket')}<span>혼자 플레이</span><i>·</i><span>로그인 없이</span><i>·</i><span>${note}</span></footer>`; }

function home() {
 return `<main id="main" class="home-screen" data-screen="home"><div class="home-backdrop" aria-hidden="true"></div><div class="home-content"><div class="eyebrow"><span></span> TODAY IS YOUR DAY</div><h1 class="home-title"><span>로또</span> 라이프<sup>＋</sup></h1><p class="home-subtitle">오늘은 어떤 하루를 살아볼까요?</p><div class="mode-grid"><button class="mode-card winner-mode" data-action="select-mode" data-mode="winner" data-testid="mode-winner"><div class="mode-heading"><span class="mode-number">01</span><span class="tiny-label">성공 보장 모드</span></div><h2>무조건 <strong>1등</strong>이<br>되고 싶어요</h2><p>여기서라도 인생 역전 해보고 싶어요.</p><div class="mode-art"><div class="art-rays"></div>${avatar('M01','home-avatar')}<div class="winning-ticket" aria-hidden="true"><small>LOTTO LIFE</small><b>1등</b><span>당첨!</span></div><span class="spark s1">＋</span><span class="spark s2">✦</span></div><div class="mode-detail"><span>${icon('clock')} 약 5~7분</span><span>번호 확인부터 수령, 그다음까지</span></div><div class="mode-cta">1등 체험 시작 ${icon('arrow')}</div></button><button class="mode-card random-mode" data-action="select-mode" data-mode="random" data-testid="mode-random"><div class="mode-heading"><span class="mode-number">02</span><span class="tiny-label">랜덤 사건 모드</span></div><h2>로또<br><strong>시뮬레이션 게임</strong></h2><p>1등 표 확률 <b>1.5%</b> · 매 판 독립 추첨</p><div class="mode-art"><div class="art-city"></div>${avatar('F04','home-avatar')}<div class="question-block" aria-hidden="true">?</div><span class="paper-bit paper-1"></span><span class="paper-bit paper-2"></span></div><div class="mode-detail"><span>${icon('clock')} 약 2~10분</span><span>랜덤 사건과 내 선택으로 달라지는 하루</span></div><div class="mode-cta">게임 시작 ${icon('arrow')}</div></button></div><p class="home-note">카메라도, 가입도 필요 없어요. 다음을 눌러 내 이야기를 만나 보세요.</p>${bottom()}</div></main>`;
}
function setup() {
 if(!state.presets[state.gender])state.presets[state.gender]=choosePreset(state.gender).id;
 return `<main id="main" class="setup-screen" data-screen="setup"><div class="home-backdrop" aria-hidden="true"></div><div class="setup-wrap"><button class="back-button" data-action="back-mode">← 모드 다시 고르기</button><div class="section-heading"><span class="eyebrow">MY LITTLE CHARACTER</span><h1 tabindex="-1">어떤 모습으로 시작할까요?</h1><p>성별과 닉네임만 정하면 준비 끝.</p></div><div class="setup-panel pixel-panel"><div class="character-preview"><div class="character-light"></div>${avatar(state.presets[state.gender],'setup-avatar')}<div class="character-plinth"></div><span class="preview-caption">랜덤으로 만난 나의 모습</span></div><div class="setup-fields"><fieldset class="gender-field"><legend>성별 선택</legend><div class="gender-options"><button type="button" data-action="gender" data-gender="male" data-testid="gender-male" class="gender-button ${state.gender==='male'?'selected':''}" aria-pressed="${state.gender==='male'}">${icon('star')} 남자</button><button type="button" data-action="gender" data-gender="female" data-testid="gender-female" class="gender-button ${state.gender==='female'?'selected':''}" aria-pressed="${state.gender==='female'}">${icon('star')} 여자</button></div></fieldset><p class="field-help">선택한 성별의 준비된 모습 10종 중 하나가 정해져요.</p><label class="input-label" for="nickname">닉네임</label><input id="nickname" data-testid="nickname" type="text" maxlength="10" autocomplete="off" spellcheck="false" placeholder="예: 감자" value="${h(state.nickname)}" aria-describedby="nickname-help"><p id="nickname-help" class="field-help">10자까지 · 비워 두면 ‘행운이’로 시작해요.</p><button class="primary-button start-button" data-action="start" data-testid="start-run">이 모습으로 시작 ${icon('arrow')}</button><p class="setup-privacy">닉네임과 진행 내용은 저장되지 않아요.</p></div></div>${bottom()}</div></main>`;
}
function numberTiles(numbers,draw=null,bonus=null) {return numbers.map(n=>`<span class="number-tile ${draw?.includes(n)?'matched':bonus===n?'bonus-matched':''}">${n}</span>`).join('');}
function ticketMarkup(compact=false) {
 const run=state.run,known=run.verifiedRank!==null;
 return `<div class="ticket-paper ${compact?'compact-ticket':''}"><div class="ticket-top"><span>${icon('ticket')} 로또 라이프</span><b>가상표</b></div><div class="ticket-round">제 ${run.ticket.ticketDrawId} 회</div><div class="ticket-numbers">${numberTiles(run.ticket.numbers,known?run.ticket.drawNumbers:null,known?run.ticket.bonus:null)}</div><div class="ticket-divider"></div><div class="ticket-bottom"><span>${known?(run.verifiedRank?`${run.verifiedRank}등 확인`:(run.scenarioId==='wrong-draw'?'회차 확인 필요':'미당첨 확인')):'당첨 확인 전'}</span><span class="faux-barcode" aria-hidden="true"></span></div></div>`;
}
function phoneMarkup() {
 const run=state.run,known=run.verifiedRank!==null;
 const scene=getScene(run);
 if(scene.id==='response'&&run.reaction!=='quiet'){
  const who=run.reaction==='family'?'가족 단톡방':'친구';
  const messages=run.reaction==='family'?['밥은 먹었어? 표부터 잘 챙겨!','진짜야? 축하해!!! 🎉','오늘 잠은 다 잤네 ㅋㅋ']:['야 이거 진짜야??','일단 표부터 챙겨 ㅋㅋ','오늘 저녁 시간 되냐?'];
  return `<button class="phone-prop chat-phone" data-action="phone" aria-label="축하 메시지 자세히 보기"><span class="phone-notch"></span><span class="phone-time">20:45</span><b>${who}</b><span class="phone-line">새 메시지 3개</span><span class="phone-chats">${messages.map(m=>`<span>${h(m)}</span>`).join('')}</span><span class="phone-foot">이야기 속 대화</span></button>`;
 }
 if(scene.id==='scan'){
  const pattern='1111111010001010111010101000101111101000001110101010001111111010101000101111111';
  return `<button class="phone-prop scan-phone" data-action="phone" aria-label="게임 속 번호 확인"><span class="phone-notch"></span><span class="phone-time">20:45</span><b>${run.checkMethod==='qr'?'내 표 읽는 중':'번호 불러오기'}</b><span class="phone-line">오늘의 작은 종이 한 장</span><span class="pretend-qr" aria-hidden="true">${Array.from(pattern).slice(0,81).map((v,i)=>`<i class="${v==='1'?'ink':''}"></i>`).join('')}<i class="scan-beam"></i></span><span class="phone-result">확인해 볼까요?</span><span class="phone-foot">가상 QR · 실제 스캔 아님</span></button>`;
 }
 return `<button class="phone-prop" data-action="phone" aria-label="게임 속 휴대폰 자세히 보기"><span class="phone-notch"></span><span class="phone-time">20:45</span><b>내 표 확인</b><span class="phone-line">${known?'번호 확인 완료':'QR로 불러온 내 번호'}</span><span class="phone-numbers">${numberTiles(run.ticket.numbers,known?run.ticket.drawNumbers:null,known?run.ticket.bonus:null)}</span><span class="phone-result ${known?'is-known':''}">${known?(run.verifiedRank?`${run.verifiedRank}등`:(run.scenarioId==='wrong-draw'?'회차를 확인해요':'이번엔 미당첨')):'확인 중…'}</span><span class="phone-foot">로또 라이프 · 가상 화면</span></button>`;
}
const ticketNames={held:'안전하게 보관 중',lost:'표를 찾는 중',damaged:'훼손된 표',recovered:'다시 찾은 표',expired:'수령하지 못한 표'};
function sidebar(scene) {
 const r=state.run;
 const progress=Math.round(scene.progress*100);
 const steps=state.mode==='winner'?['표 한 장 받기','번호와 회차 확인','당첨의 기쁨','수령 준비','창구에서 확인','그다음, 나의 선택']:['표 한 장','확인과 사건','내 선택','최종 결과'];
 const at=Math.min(steps.length-1,Math.floor(scene.progress*(steps.length-.2)));
 return `<aside class="my-day" aria-label="내 진행 상황"><div class="sidebar-title">${icon('book')}<h2>내 하루</h2><span>${progress}%</span></div><div class="progress-track" role="progressbar" aria-valuenow="${progress}" aria-valuemin="0" aria-valuemax="100" aria-label="이야기 진행률"><span style="width:${progress}%"></span></div><ol class="step-list">${steps.map((s,i)=>`<li class="${i<at?'done':i===at?'current':''}"><span>${i<at?'✓':String(i+1).padStart(2,'0')}</span>${h(s)}${i===at?'<b>지금</b>':''}</li>`).join('')}</ol><div class="my-ticket-info"><small>지금 내 표는</small><b>${h(ticketNames[r.ticketStatus]||'확인하는 중')}</b><div class="verified-rank ${r.verifiedRank===1?'first':''}">${r.verifiedRank===null?'결과 미확인':r.verifiedRank===0?(r.scenarioId==='wrong-draw'?'회차가 달라요':'이번엔 미당첨'):`${r.verifiedRank}등 확인`}</div>${r.verifiedRank?`<span class="prize-label">${h(r.prizeLabel)}<small>이야기 속 수령액</small></span>`:''}${r.claimed?`<span class="claim-stamp">${icon('check')} 수령 완료</span>`:''}</div><div class="inventory"><h3>내 소지품</h3><div><button data-action="ticket" aria-label="가상표 보기">${icon('ticket')}<span>가상표</span></button><button data-action="phone" aria-label="휴대폰 보기">${icon('phone')}<span>휴대폰</span></button><button data-action="bag" aria-label="준비물 보기">${icon('bag')}<span>가방</span></button></div></div><p class="local-note">다른 플레이어 없이<br>나만의 속도로 진행해요.</p></aside>`;
}
function story() {
 const r=state.run,scene=getScene(r);
 if(scene.stage==='ending-choice'){state.screen='endings';return endingChoices();}
 if(scene.stage==='ending'){state.screen='result';return result();}
 const room=scene.background==='room',bank=scene.background==='bank',street=scene.background==='street';
 const location={street:'동네 골목',room:'내 작은 방',bank:'수령 창구',park:'은행 앞 공원'}[scene.background]||'내 이야기';
 return `<main id="main" class="play-screen" data-screen="story"><div class="play-heading"><div><span class="eyebrow">${state.mode==='winner'?'A DAY AS A WINNER':'A TICKET, MANY STORIES'}</span><h1 tabindex="-1">${h(scene.title)}</h1></div><span class="chapter-tag">${icon('clock')} ${h(location)}</span></div><div class="play-layout"><div class="story-column"><section class="scene-frame pixel-panel" aria-label="${h(location)} 장면"><div class="scene-environment" style="${sceneStyle(scene.background)}"></div><div class="scene-shade"></div><span class="scene-location">${icon(room?'home':bank?'coin':'plant')} ${h(location)}</span><div class="actor-player">${avatar(r.presetId,'scene-avatar')}<span class="actor-name">${h(r.nickname)}</span></div>${bank||street?`<div class="actor-npc">${avatar(bank?'M07':'F08','npc-avatar')}<span class="actor-name">${bank?'확인 직원':'가게 사장님'}</span></div>`:''}${scene.phone?phoneMarkup():''}${scene.ticket&&!scene.phone?`<button class="floating-ticket" data-action="ticket" aria-label="지금 내 가상표 확인">${icon('ticket')}<span>내 표 보기</span></button>`:''}<div class="scene-caption">${r.claimed?'내 인생에 이런 하루도.':r.verifiedRank===1?'여섯 개가 전부 맞았다.':'이 작은 종이 한 장이, 어디로 데려갈까?'}</div></section><section class="dialogue pixel-panel" aria-label="이야기와 선택"><div class="speaker-label">${h(scene.speaker)}</div><div class="dialogue-top"><span class="dialogue-mark">“</span><div id="scene-content" class="dialogue-text" data-testid="scene-content">${paragraphs(scene.text)}</div></div><div class="choice-list ${scene.choices.length>1?'multiple':''}">${scene.choices.map((c,i)=>`<button class="choice-button ${i===0?'primary-choice':''}" data-action="choice" data-choice-id="${h(c.id)}"><span class="choice-number">${scene.choices.length>1?String(i+1).padStart(2,'0'):icon('arrow')}</span><span><b>${h(c.label)}</b>${c.hint?`<small>${h(c.hint)}</small>`:''}</span>${icon('arrow','choice-arrow')}</button>`).join('')}</div><div class="dialogue-hint">${scene.choices.length===1?'Enter 또는 Space로 다음':'숫자 키로도 선택할 수 있어요'}<span>잠깐 멈춰도 괜찮아요.</span></div></section></div>${sidebar(scene)}</div>${bottom()}</main>`;
}
function endingChoices() {
 const r=state.run;
 return `<main id="main" class="endings-screen" data-screen="endings"><div class="ending-choice-intro"><div>${avatar(r.presetId,'choice-avatar')}<span class="achievement">${icon('check')} 1등 수령 완료</span></div><div><span class="eyebrow">YOUR NEXT CHAPTER</span><h1 tabindex="-1">이제, 가장 먼저 뭘 할까?</h1><p>스무 가지 중 마음이 가는 <strong>하나</strong>를 골라 주세요.<br>다음 장면은 ${h(r.nickname)} 님의 선택으로 정해져요.</p></div></div><div class="ending-options">${ENDINGS.map((end,i)=>`<button class="ending-option" data-action="select-ending" data-ending="${h(end.id)}" data-testid="ending-option-${h(end.id)}"><div class="ending-thumbnail" style="${environment(end.atlasIndex??i)}"><span>${icon(endIcon[i])}</span></div><div class="ending-option-label"><small>${String(i+1).padStart(2,'0')}</small><b>${h(end.choice)}</b>${icon('arrow')}</div></button>`).join('')}</div><p class="ending-choice-note">다 해내야 하는 목록이 아니에요. 지금 가장 하고 싶은 일 하나면 충분해요.</p>${bottom()}</main>`;
}
function vignette() {
 const r=state.run,end=ENDINGS.find(e=>e.id===r.endingId);
 return `<main id="main" class="vignette-screen" data-screen="vignette"><div class="section-heading"><span class="eyebrow">MY FIRST CHOICE</span><h1 tabindex="-1">${h(end.choice)}</h1><p>${h(r.nickname)} 님의 다음 장면</p></div><section class="vignette-scene pixel-panel"><div class="scene-environment" style="${environment(end.atlasIndex)}"></div><div class="scene-shade"></div><div class="vignette-player">${avatar(r.presetId,'scene-avatar')}</div><div class="vignette-quote"><span>${icon(endIcon[end.atlasIndex])}</span><b>“${h(end.line)}”</b></div></section><section class="vignette-story pixel-panel">${paragraphs(end.text||end.scene_beats)}<button class="primary-button" data-action="finish-vignette" data-testid="finish-vignette">내 엔딩 카드 보기 ${icon('arrow')}</button></section>${bottom()}</main>`;
}
function result() {
 const r=state.run,scene=getScene(r),end=scene.ending,card=scene.result;
 const title=end?.title||card?.title||scene.title;
 const copy=end?.card_text||card?.text||scene.text;
 return `<main id="main" class="result-screen" data-screen="result"><div class="result-intro"><span class="eyebrow">TODAY'S LITTLE ENDING</span><h1 tabindex="-1">${h(r.nickname)} 님의 하루</h1><p>${r.claimed?'축하해요. 오늘의 이야기를 한 장에 담았어요.':'오늘의 이야기가 한 장의 카드로 남았어요.'}</p></div><div class="result-layout"><article class="ending-card pixel-panel" data-testid="ending-card"><div class="card-top"><span>${icon('ticket')} LOTTO LIFE</span><b>${r.verifiedRank?`${r.verifiedRank}등 이야기`:'나의 이야기'}</b></div><div class="card-art"><div class="scene-environment" style="${end?environment(end.atlasIndex):sceneStyle('room')}"></div><div class="card-vignette"></div>${avatar(r.presetId,'card-avatar')}<span class="card-quote">${end?'“'+h(end.line)+'”':r.claimed?'끝까지 확인한 나의 행운.':'종이 한 장에서 시작된 이야기.'}</span></div><div class="card-copy"><span class="card-nickname">${h(r.nickname)} 님의 ${end?'첫 선택':'이야기'}</span><h2 class="ending-title">${h(title)}</h2><p>${h(copy).split('\n')[0]}</p></div><div class="card-bottom"><span>가상 당첨 체험</span><span>${h(end?.id||'MY STORY')} · ${r.mode==='winner'?'1등 체험':'시뮬레이션'}</span></div></article><div class="result-actions"><div class="result-stamp">${icon(r.claimed?'check':'book')}</div><h2>${end?'내가 고른 첫 장면.':r.claimed?'확인하고, 웃고, 끝까지.':'다음 이야기는 또 다를 거예요.'}</h2><p>${end?'당첨 다음에도 내 취향은 그대로니까요.':r.claimed?'처음의 예상과 달라도 오늘의 이야기는 내 것이에요.':'원한다면 새 표 한 장으로 다시 시작할 수 있어요.'}</p><button class="primary-button" data-action="download" data-testid="download-card">${icon('download')} 엔딩 카드 내려받기</button><button class="secondary-button" data-action="restart" data-testid="restart">${icon('restart')} 다른 하루 살아보기</button><p id="download-status" class="download-status" role="status"></p><small>카드는 누를 때만 이미지로 내려받아요.<br>닉네임과 진행 내용은 사이트에 남지 않아요.</small></div></div>${bottom()}</main>`;
}

function render(focus=false) {
 state.epoch++;
 document.documentElement.classList.toggle('reduce-motion',state.reduced);
 const body=({home,setup,story,endings:endingChoices,vignette,result}[state.screen]||home)();
 app.innerHTML=header()+body;
 document.title=state.screen==='home'?'로또 라이프 — 오늘, 내 인생에 생긴 일':`${state.screen==='setup'?'나의 캐릭터':state.run?.nickname+' 님의 하루'} · 로또 라이프`;
 if(focus){window.scrollTo({top:0,behavior:'instant'});app.querySelector('h1[tabindex]')?.focus({preventScroll:true});}
}
function rememberNickname() {const input=document.querySelector('#nickname');if(input)state.nickname=input.value;}
function dismissDialog() {document.querySelector('dialog')?.close();}
function dialog(title,content,buttons='<button class="primary-button" data-dialog="close">알겠어요</button>') {
 dismissDialog();
 const node=document.createElement('dialog');node.className='game-dialog pixel-panel';node.setAttribute('aria-label',title);
 node.innerHTML=`<button class="dialog-close tool-button" data-dialog="close" aria-label="닫기">${icon('close')}</button><h2>${h(title)}</h2><div class="dialog-content">${content}</div><div class="dialog-buttons">${buttons}</div>`;
 document.body.append(node);
 node.addEventListener('close',()=>node.remove(),{once:true});
 node.addEventListener('click',e=>{if(e.target===node){const r=node.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)dismissDialog();}const button=e.target.closest('[data-dialog]');if(button){const action=button.dataset.dialog;dismissDialog();if(action==='reset')reset();}});
 node.showModal();
}
function info() {
 dialog('이 작은 하루를 즐기는 방법',`<p><b>1등 체험</b>은 번호 확인부터 수령과 첫 선택까지 기분 좋은 하루를 끝까지 경험해요.</p><p><b>시뮬레이션</b>은 꽝·소액 당첨·뜻밖의 사건이 나와요. 1등 표 확률은 <b>1.5%</b>이며 분실·세탁기·다수 당첨 사건의 1등까지 모두 포함한 값이에요. 각 판은 독립 추첨이고 누적 보정은 없어요. 실제 로또 확률과 다른 게임 설정이에요.</p><p>다음과 선택지를 누르며 약 2~10분. Enter·Space는 다음, 숫자 키는 선택, Esc는 열린 창 닫기예요.</p><p class="info-note">복권·앱·연락·수령액은 모두 이야기 속 설정이에요. 실제 구매·예측·송금이나 세후 금액 계산을 하지 않아요. 로그인과 진행 저장은 없고, 새로고침하면 처음부터 시작해요.</p><div class="official-links"><a href="https://www.dhlottery.co.kr/guide/wnrGuide" target="_blank" rel="noopener noreferrer">한국 로또 공식 수령 안내 ↗</a></div>`);
}
function reset() {
 state.screen='home';state.mode='winner';state.gender='male';state.nickname='';state.presets={};state.run=null;state.busy=false;state.lastActionKind='';state.lastActionAt=0;render(true);
}
function requestHome() {
 if(!state.run || state.screen==='result'){reset();return;}
 dialog('처음으로 돌아갈까요?',`<p>지금까지의 이야기는 저장되지 않아요.<br>계속할 수도, 새 하루를 시작할 수도 있어요.</p>`,`<button class="secondary-button" data-dialog="close">계속할래요</button><button class="primary-button" data-dialog="reset" data-testid="confirm-home">처음으로</button>`);
}
function openTicket() {
 if(!state.run)return;
 const r=state.run,known=r.verifiedRank!==null;
 dialog('내 종이 가상표',ticketMarkup()+`<p class="ticket-status-copy">${h(ticketNames[r.ticketStatus]||'보관 중')}</p>${known?`<div class="comparison"><h3>확인한 제 ${r.ticket.drawId} 회 결과</h3><div class="ticket-numbers">${numberTiles(r.ticket.drawNumbers)}</div><p>보너스 <b class="bonus-number">${r.ticket.bonus}</b></p><strong>${r.verifiedRank===0?(r.scenarioId==='wrong-draw'?'표에 적힌 회차와 달라요.':'이번 표는 미당첨이에요.'):`${r.verifiedRank}등으로 확인했어요.`}</strong></div>`:'<p>아직 결과 확인 전이에요. 이야기를 따라 번호와 회차를 확인해 보세요.</p>'}`);
}
function openPhone() {
 if(!state.run)return;
 const r=state.run;
 if(getScene(r).id==='response'&&r.reaction!=='quiet'){
  const who=r.reaction==='family'?'가족':'친구';
  dialog(`${who}에게 온 축하 메시지`,`<div class="phone-modal-header">${icon('phone')} ${who} 대화방</div><div class="phone-message">${paragraphs(getScene(r).text)}</div><p class="info-note">실제 연락을 보내지 않는 이야기 속 대화예요.</p>`);return;
 }
 dialog('게임 속 휴대폰',`<div class="phone-modal-header">${icon('phone')} 로또 라이프 확인 앱</div>${ticketMarkup(true)}<div class="phone-message"><small>내 알림</small><p>${r.claimed?`수령 확인이 도착했어요. ${h(r.nickname)} 님, 오늘의 첫 계획은 뭔가요?`:r.verifiedRank===1?'여섯 숫자 모두 일치! 표와 준비물을 잘 챙겨 주세요.':r.verifiedRank===null?'가상표 한 장이 준비되어 있어요. 오늘의 이야기를 이어가 보세요.':r.verifiedRank===0?(r.scenarioId==='wrong-draw'?'확인 중인 회차와 표에 적힌 회차를 다시 살펴봐 주세요.':'이번 표는 미당첨이에요. 오늘 밤의 마지막 선택을 골라 보세요.'):`일반번호와 보너스를 구분해 ${r.verifiedRank}등으로 확인했어요.`}</p></div>`);
}
function openBag() {
 if(!state.run)return;
 const r=state.run,ready=getScene(r).progress>=.5;
 dialog('내 가방',`<ul class="bag-list"><li>${icon('ticket')}<span>종이 가상표<small>${h(ticketNames[r.ticketStatus]||'확인 중')}</small></span></li><li>${icon('book')}<span>게임용 신분 확인 카드<small>${ready?'챙겼어요':'수령 준비 장면에서 챙겨요'}</small></span></li><li>${icon('coin')}<span>게임용 계좌 카드<small>실제 계좌번호 입력은 필요 없어요.</small></span></li></ul>`);
}
function lockAction(fn,kind) {
 const guarded=['choice','select-ending','finish-vignette'].includes(kind);
 const now=performance.now();
 if(guarded&&state.lastActionKind===kind&&now-state.lastActionAt<180)return;
 if(guarded){state.lastActionKind=kind;state.lastActionAt=now;}
 fn();
}
app.addEventListener('input',e=>{if(e.target.id==='nickname')state.nickname=e.target.value;});
app.addEventListener('click',e=>{
 const b=e.target.closest('button[data-action]');if(!b||b.disabled)return;
 if(e.detail>1)return;
 const action=b.dataset.action;
 if(action==='sound'){rememberNickname();state.sound=!state.sound;chime(true);render();app.querySelector('[data-action="sound"]')?.focus();return;}
 if(action==='motion'){rememberNickname();state.reduced=!state.reduced;render();app.querySelector('[data-action="motion"]')?.focus();speak(state.reduced?'움직임을 줄였어요.':'기본 움직임으로 바꿨어요.');return;}
 if(action==='info'){info();return;}
 if(action==='home'){rememberNickname();requestHome();return;}
 if(action==='ticket'){openTicket();return;}if(action==='phone'){openPhone();return;}if(action==='bag'){openBag();return;}
 if(action==='download'){downloadCard(b);return;}
 lockAction(()=>{
  if(action==='select-mode'){state.mode=b.dataset.mode;state.screen='setup';state.nickname='';state.presets={};render(true);}
  else if(action==='back-mode'){state.screen='home';state.run=null;render(true);}
  else if(action==='gender'){rememberNickname();state.gender=b.dataset.gender;render();document.querySelector(`[data-gender="${state.gender}"]`)?.focus();}
  else if(action==='start'){rememberNickname();state.run=createRun({mode:state.mode,gender:state.gender,nickname:normalizeNickname(state.nickname),presetId:state.presets[state.gender]});state.screen='story';chime(true);render(true);}
  else if(action==='choice'&&state.run&&state.screen==='story'){const next=advance(state.run,b.dataset.choiceId);if(next!==state.run){state.run=next;chime();render(true);}}
  else if(action==='select-ending'&&state.screen==='endings'){const next=finishEnding(state.run,b.dataset.ending);if(next!==state.run){state.run=next;state.screen='vignette';chime(true);render(true);}}
  else if(action==='finish-vignette'){state.screen='result';render(true);}
  else if(action==='restart'){reset();}
 },action);
});
document.addEventListener('keydown',e=>{
 if(e.defaultPrevented||e.altKey||e.ctrlKey||e.metaKey||document.querySelector('dialog[open]')||['INPUT','TEXTAREA','SELECT'].includes(e.target.tagName)||e.target.isContentEditable)return;
 if(e.repeat)return;
 if(state.screen==='story'){
  const choices=[...app.querySelectorAll('[data-choice-id]')];
  if(/^[1-9]$/.test(e.key)&&choices[Number(e.key)-1]){e.preventDefault();choices[Number(e.key)-1].click();}
  else if((e.key==='Enter'||e.key===' ')&&choices.length===1&&e.target.tagName!=='BUTTON'){e.preventDefault();choices[0].click();}
 }
});
document.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='nickname'){e.preventDefault();app.querySelector('[data-action="start"]')?.click();}});

const imageCache=new Map();
function loadImage(name) {
 if(!imageCache.has(name))imageCache.set(name,new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=()=>{imageCache.delete(name);reject(Error('이미지를 불러오지 못했어요.'));};image.src=asset(name);}));
 return imageCache.get(name);
}
function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=4) {
 let line='',lines=0;
 for(const c of Array.from(text)){
  if(ctx.measureText(line+c).width>maxWidth&&line){ctx.fillText(line,x,y);y+=lineHeight;lines++;line='';if(lines>=maxLines)return y;}
  line+=c;
 }
 if(line){ctx.fillText(line,x,y);y+=lineHeight;}
 return y;
}
async function downloadCard(button) {
 const r=state.run;if(!r||!r.completed)return;
 const scene=getScene(r),end=scene.ending,entry=preset(r.presetId),status=document.querySelector('#download-status');
 button.disabled=true;button.setAttribute('aria-busy','true');status.textContent='카드를 그리고 있어요…';
 try {
  const [background,characters]=await Promise.all([loadImage(end?'endings.webp':'room.webp'),loadImage(`characters-${entry.gender}.webp`)]);
  const canvas=document.createElement('canvas');canvas.width=900;canvas.height=1200;const ctx=canvas.getContext('2d');
  ctx.fillStyle='#152b42';ctx.fillRect(0,0,900,1200);ctx.fillStyle='#f6f0dc';ctx.fillRect(24,24,852,1152);
  ctx.fillStyle='#f7ce51';ctx.fillRect(24,24,852,90);ctx.fillStyle='#152b42';ctx.font='900 28px "Malgun Gothic", sans-serif';ctx.fillText('LOTTO LIFE',56,82);ctx.font='700 22px "Malgun Gothic", sans-serif';ctx.textAlign='right';ctx.fillText(r.verifiedRank?`${r.verifiedRank}등 이야기`:'나의 이야기',844,82);ctx.textAlign='left';
  if(end){const index=end.atlasIndex,sw=background.width/5,sh=background.height/4;ctx.drawImage(background,index%5*sw,Math.floor(index/5)*sh,sw,sh,44,134,812,570);}else ctx.drawImage(background,0,0,background.width,background.height,44,134,812,570);
  const shade=ctx.createLinearGradient(0,500,0,705);shade.addColorStop(0,'rgba(21,43,66,0)');shade.addColorStop(1,'rgba(21,43,66,.65)');ctx.fillStyle=shade;ctx.fillRect(44,400,812,305);
  const index=entry.atlasIndex??Number(entry.id.slice(1))-1,sw=characters.width/5,sh=characters.height/2;ctx.drawImage(characters,index%5*sw,Math.floor(index/5)*sh,sw,sh,220,170,460,690);
  ctx.fillStyle='#f6f0dc';ctx.fillRect(44,728,812,360);ctx.fillStyle='#456071';ctx.font='700 25px "Malgun Gothic", sans-serif';ctx.fillText(`${r.nickname} 님의 ${end?'첫 선택':'이야기'}`,62,782);
  ctx.fillStyle='#152b42';ctx.font='900 47px "Malgun Gothic", sans-serif';const y=wrapText(ctx,end?.title||scene.title,62,850,776,62,2);
  ctx.font='500 26px "Malgun Gothic", sans-serif';ctx.fillStyle='#476071';wrapText(ctx,end?.card_text||scene.result.text.split('\n')[0],62,y+27,776,43,3);
  ctx.strokeStyle='#152b42';ctx.lineWidth=3;ctx.strokeRect(24,24,852,1152);ctx.fillStyle='#152b42';ctx.fillRect(24,1100,852,76);ctx.fillStyle='#f6f0dc';ctx.font='700 21px "Malgun Gothic", sans-serif';ctx.fillText('가상 당첨 체험 · 혼자 살아본 작은 하루',54,1147);ctx.textAlign='right';ctx.fillText(end?.id||'MY STORY',844,1147);
  const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));if(!blob)throw Error('이미지 저장을 준비하지 못했어요.');
  const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`로또라이프_${r.nickname.replace(/[\\/:*?"<>|]/g,'_')}_${end?.id||'이야기'}.png`;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
  status.textContent='내려받기를 시작했어요. 오늘의 카드가 완성됐어요.';
 }catch(error){status.textContent='이미지를 준비하지 못했어요. 잠시 후 다시 눌러 주세요.';console.error(error);}finally{button.disabled=false;button.removeAttribute('aria-busy');}
}
window.addEventListener('pageshow',event=>{if(event.persisted){reset();}});
render();
