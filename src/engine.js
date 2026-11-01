import { PRESETS, ENDINGS, SCENARIOS } from './data.js?v=1.1.0';

const freeze = value => {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.values(value).forEach(freeze);
    Object.freeze(value);
  }
  return value;
};

const randomUnit = random => {
  const value = Number(random());
  return Number.isFinite(value) ? Math.min(Math.max(value, 0), 1 - Number.EPSILON) : 0;
};

export function normalizeNickname(value) {
  const clean = String(value ?? '').normalize('NFC')
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2060-\u206f\ufeff]/g, '')
    .replace(/\s+/gu, ' ').trim();
  return Array.from(clean).slice(0, 10).join('') || '행운이';
}

export function choosePreset(gender, random = Math.random) {
  const pool = PRESETS.filter(preset => preset.gender === (gender === 'female' ? 'female' : 'male'));
  return pool[Math.floor(randomUnit(random) * pool.length)];
}

const validNumbers = values => Array.isArray(values) && values.length === 6 &&
  new Set(values).size === 6 && values.every(value => Number.isInteger(value) && value >= 1 && value <= 45);

export function matchingRank(numbers, draw, bonus) {
  if (!validNumbers(numbers) || !validNumbers(draw) || !Number.isInteger(bonus) || bonus < 1 || bonus > 45 || draw.includes(bonus)) return 0;
  const count = numbers.filter(number => draw.includes(number)).length;
  if (count === 6) return 1;
  if (count === 5) return numbers.includes(bonus) ? 2 : 3;
  return count === 4 ? 4 : count === 3 ? 5 : 0;
}

function createTicket(scenarioId, random) {
  const bag = Array.from({ length: 45 }, (_, index) => index + 1);
  for (let index = bag.length - 1; index > 0; index--) {
    const swap = Math.floor(randomUnit(random) * (index + 1));
    [bag[index], bag[swap]] = [bag[swap], bag[index]];
  }
  const drawNumbers = bag.slice(0, 6).sort((a, b) => a - b);
  const bonus = bag[6];
  let numbers = [...drawNumbers];
  if (scenarioId === 'second') numbers = [...drawNumbers.slice(0, 5), bonus];
  if (scenarioId === 'third') numbers = [...drawNumbers.slice(0, 5), bag[7]];
  if (scenarioId === 'fourth') numbers = [...drawNumbers.slice(0, 4), bag[7], bag[8]];
  if (scenarioId === 'fifth') numbers = [...drawNumbers.slice(0, 3), bag[7], bag[8], bag[9]];
  if (scenarioId === 'blank') numbers = bag.slice(8, 14);
  return freeze({
    numbers: numbers.sort((a, b) => a - b), drawNumbers, bonus,
    drawId: 1408, ticketDrawId: scenarioId === 'wrong-draw' ? 1407 : 1408,
    ticketDrawNumbers: scenarioId === 'wrong-draw' ? bag.slice(8, 14).sort((a, b) => a - b) : [...drawNumbers],
    ticketBonus: scenarioId === 'wrong-draw' ? bag[14] : bonus,
    fictional: true,
  });
}

function chooseScenario(random) {
  let roll = randomUnit(random) * SCENARIOS.reduce((sum, scenario) => sum + scenario.weight, 0);
  for (const scenario of SCENARIOS) {
    roll -= scenario.weight;
    if (roll < 0) return scenario.id;
  }
  return SCENARIOS[SCENARIOS.length - 1].id;
}

export function createRun({ mode = 'winner', gender = 'male', nickname = '', presetId, random = Math.random, scenarioId } = {}) {
  const safeMode = mode === 'random' ? 'random' : 'winner';
  const safeGender = gender === 'female' ? 'female' : 'male';
  const preset = PRESETS.find(item => item.id === presetId && item.gender === safeGender) ?? choosePreset(safeGender, random);
  const scenario = safeMode === 'winner' ? 'normal' : SCENARIOS.some(item => item.id === scenarioId)
    ? scenarioId : chooseScenario(random);
  return freeze({
    sceneId: 'arrival', mode: safeMode, gender: safeGender, scenarioId: scenario,
    nickname: normalizeNickname(nickname), presetId: preset.id,
    ticket: createTicket(scenario, random), verifiedRank: null,
    claimed: false, endingId: null, history: [], reaction: null, checkMethod: null,
    outcome: null, completed: false, ticketStatus: 'held', grossPrize: '미확인 가상 상금',
    prizeLabel: '미확인', expectedPrizeLabel: '20억 원', result: null,
  });
}

const narrativeOrder = ['arrival', 'ticket', 'evening', 'scan', 'compare', 'verification', 'reaction', 'response', 'protect', 'checklist', 'next-day', 'commute', 'lobby', 'desk', 'confirm', 'receipt', 'breathe', 'future'];
const ranks = { 1: '1등', 2: '2등', 3: '3등', 4: '4등', 5: '5등', 0: '미당첨' };
const action = (id, label, hint) => ({ id, label, ...(hint ? { hint } : {}) });

function story(run) {
  const name = run.nickname;
  const rank = ranks[run.verifiedRank] ?? '당첨';
  const receiptPlace = run.verifiedRank === 1 ? '은행 본점' : '당첨금 창구';
  const shared = run.scenarioId === 'crowded';
  const scenes = {
    arrival: {
      background: 'street', speaker: '동네 가게 사장님', title: '늘 걷던 길에서',
      text: `“${name} 씨! 오늘 행사 마지막 한 장이에요.”\n\n라면 사러 들어간 가게에서 행운표를 받았다. 사장님은 괜히 목소리를 낮춘다. “크게 되면 우리 가게 간판부터 바꿔 줘요.” 벌써 견적을 내는 표정이다.\n\n라면 봉투에 인생 역전 후보가 동봉됐다. 일단 면 불기 전에 집에 가자.`,
      choices: [action('next', '표를 받아 든다')],
    },
    ticket: {
      background: 'street', speaker: name, title: '손에 쥔 여섯 숫자', ticket: true,
      text: `종이 위에 제${run.ticket.ticketDrawId}회, 여섯 숫자, 작은 QR 무늬가 찍혀 있다. 괜히 빛에 한 번 비춰 본다.\n\n“지금부터 너는 영수증이랑 다른 대우다.”\n\n꾸깃한 영수증은 왼쪽 주머니, 이 표는 오른쪽 주머니. 벌써부터 특별 관리 대상이다. 물론 아직 아무 일도 일어나진 않았다.`,
      choices: [action('next', '표를 챙겨 집으로 간다')],
    },
    evening: {
      background: 'room', speaker: name, title: '확인해 볼까?',
      text: '라면은 다 먹었고 설거지는 잠깐 미뤄 뒀다. 외투를 걸다가 주머니의 표가 생각난다.\n\n휴대폰 확인 앱을 켜자 QR 버튼이 반짝인다. 숫자를 하나씩 맞춰 볼 수도 있다.\n\n“당첨이면 설거지는… 그래도 내가 해야겠지?” 기대에 찬 손가락이 화면 위에서 멈춘다.',
      choices: [action('qr', 'QR로 빠르게 확인'), action('numbers', '번호를 직접 대조한다')],
    },
    scan: {
      background: 'room', speaker: '확인 앱', title: run.checkMethod === 'numbers' ? '한 칸씩 천천히' : '작은 네모 안의 행운', phone: true, ticket: true,
      text: run.scenarioId === 'wrong-draw'
        ? '제1408회 결과가 열린다. 내 표의 숫자가 화면에 줄줄이 있다. 하나, 둘… 여섯?\n\n“잠깐. 나 지금 부자 된 거야?”\n\n의자에서 벌떡 일어났다 다시 앉는다. 이런 건 앉아서 봐야 한다. 숫자 아래 작은 회차 표시가 눈에 들어온다. 종이와 화면을 붙여 놓고 한 번 더 보자.'
        : ['fourth', 'fifth', 'blank'].includes(run.scenarioId)
          ? '앱이 표의 여섯 숫자를 읽는다. 아직 결과가 뜨기도 전에 집 평면도부터 떠올린다.\n\n“일단 번호부터 보자. 거실 소파는 나중에.”\n\n종이와 결과를 나란히 놓는다. 작은 화면에 내 하루가 달려 있는 것 같지만, 라면 그릇도 옆에서 조용히 기다리고 있다.'
          : '숫자가 하나씩 나타난다. 아는 숫자가 자꾸 보인다. 분명 아까까지는 설거지가 걱정이었는데 지금은 손이 떨린다.\n\n“잠깐. 방금 뭐라고 떴지?”\n\n휴대폰을 내려놓고 눈을 비빈다. 화면 밝기도 올린다. 밝기를 올린다고 등수가 올라가진 않겠지만, 일단 잘 보이긴 한다.',
      choices: [action('next', '종이와 화면을 나란히 놓는다')],
    },
    compare: {
      background: 'room', speaker: name, title: '숫자보다 먼저 회차', phone: true, ticket: true,
      text: `표는 제${run.ticket.ticketDrawId}회, 화면은 제${run.ticket.drawId}회. 종이 모서리를 펴고 손가락으로 한 칸씩 짚는다.\n\n일반번호 여섯 개와 보너스는 따로 봐야 한다. 흥분한 내 눈을 믿기에는 방금 라면 봉지를 냉장고에 넣을 뻔했다.\n\n“회차부터. 그다음 숫자. 이번엔 진짜 천천히.”`,
      choices: [action('verify', '회차와 보너스까지 재대조한다')],
    },
    verification: verificationScene(run),
    reaction: {
      background: 'room', speaker: name, title: '누군가에게 말하고 싶은 밤',
      text: `${rank}이다. 확인한 금액은 ${run.prizeLabel}. 방 안을 세 바퀴 돌았는데 아직도 앉을 자리를 못 정했다.\n\n이걸 누구한테 먼저 말하지? 가족에게는 침착한 척, 친구에게는 안 침착한 척 말할 수 있다.\n\n아니면 오늘만 혼자 입꼬리 관리에 실패해 볼까. 휴대폰이 괜히 무겁다.`,
      choices: [action('family', '가족에게 말한다'), action('friend', '친구에게 말한다'), action('quiet', '오늘 밤은 혼자 간직한다')],
    },
    response: {
      background: 'room', speaker: run.reaction === 'quiet' ? name : '휴대폰 대화', title: '돌아온 한마디', phone: run.reaction !== 'quiet',
      text: run.reaction === 'family'
        ? '“밥은 먹었어?”\n\n당첨됐다고 했는데 첫 질문이 이거다. 라면 먹었다고 하니 축하보다 먼저 잔소리가 온다. “부자가 밥을 그렇게 먹니!”\n\n조금 뒤 가족 대화방 이름이 ‘우리 집 경사’로 바뀐다. 그리고 다시 한 줄. “표는 잘 챙겨. 냉장고에 넣지는 말고.” 역시 나를 잘 안다.'
        : run.reaction === 'friend'
          ? '“축하한다!!! 근데 너 사칭 아니지? 지난주에 빌린 충전기 무슨 색?”\n\n흰색이라고 답하자 축하 이모티콘이 스무 개 온다. 이어서 “일단 표 챙겨. 파티는 네가 말을 정상 속도로 할 때 하자.”\n\n음성 메시지를 다시 들어 보니 정말 말이 두 배속이다. 친구가 괜히 친구가 아니다.'
          : '휴대폰을 뒤집고 거울을 본다. 침착한 부자 표정을 연습했는데 자꾸 치아가 보인다.\n\n물 한 잔을 마시고 다시 도전한다. 실패. 이번엔 어깨까지 들썩인다.\n\n“아무도 모르게 행동하기, 생각보다 어렵네.” 오늘 밤은 혼자 축하하기로 한다. 설거지도 이상하게 경쾌하게 끝났다.',
      choices: [action('next', '다음으로 할 일을 정리한다')],
    },
    'event-lost': {
      background: 'room', speaker: name, title: '어디에 두었더라?',
      text: '봉투를 가져왔는데 정작 표가 없다. 방금까지 손에 있었는데? 주머니를 세 번 뒤져도 영수증만 나온다.\n\n소파에서 책을 보다가 물을 마셨던 기억이 난다. 침착하게 동선을 되짚어 볼까?\n\n“이런 때 기억력이 좋아져야 하는 거 아냐?” 영수증은 대답 없이 구겨진다.',
      choices: [action('recover', '지나온 동선을 차근차근 되짚는다', '소파와 책 사이를 확인해요'), action('leave', '이번 표 찾기를 그만둔다', '표 없이 수령할 수 없어 미수령으로 끝나요')],
    },
    'event-laundry': {
      background: 'room', speaker: name, title: '주머니가 비어 있었나?',
      text: '들뜬 김에 밀린 빨래까지 하기로 했다. 외투를 넣고 시작 버튼에 손가락을 올린 순간, 주머니에서 종이 모서리가 보인다.\n\n“설마 저게…?”\n\n아직 물은 들어오지 않았다. 주머니를 확인하면 딱 한 번 손이 더 간다. 귀찮음과 수상한 종이 한 장이 세탁기 앞에서 맞붙는다.',
      choices: [action('recover', '시작 전에 주머니를 확인한다'), action('leave', '확인하지 않고 세탁한다', '표가 훼손되어 미수령으로 끝나요')],
    },
    'event-recovered': {
      background: 'room', speaker: name, title: '작은 종이의 제자리', ticket: true,
      text: run.scenarioId === 'lost'
        ? '책을 펼치자 표가 책갈피처럼 꽂혀 있다. 범인은 아까의 나였다. 하필 책 제목은 ‘정리의 기술’이다.\n\n“내용보다 실습이 먼저였네.”\n\n표를 꺼내 봉투에 넣는다. 봉투 앞에는 크게 ‘절대 버리지 말 것’이라고 썼다. 쓰고 나니 너무 수상해서 서랍 안쪽으로 밀어 넣는다.'
        : '주머니에서 표를 꺼낸다. 아직 바삭바삭하다. 외투만 세탁기로 돌려보내고 종이는 두 손으로 모신다.\n\n“빨래보다 먼저 한 일, 올해 최고의 결정.”\n\n안전한 봉투를 가져와 표를 넣는다. 세탁기에서 맑은 시작음이 울린다. 오늘은 유난히 축하 음악처럼 들린다.',
      choices: [action('next', '표를 안전하게 보관한다')],
    },
    protect: {
      background: 'room', speaker: name, title: '내일의 나를 위해', ticket: true,
      text: '표를 봉투에 반듯하게 넣고 서랍을 닫는다. 휴대폰으로 사진도 한 장 찍는다. 물론 수령할 때는 사진 대신 원본을 가져가야 한다.\n\n“지갑, 열쇠, 휴대폰, 그리고 너.”\n\n내일 외출 점검 명단에 새 식구가 생겼다. 괜히 서랍을 한 번 더 열었다 닫는다. 잘 있다.',
      choices: [action('next', '준비물 메모를 펼친다')],
    },
    checklist: {
      background: 'room', speaker: '내 준비 메모', title: '준비는 단출하게',
      text: `원본 표, 신분 확인 카드, 수령 계좌 카드. 세 칸에 체크하고 ${receiptPlace} 위치도 확인했다.\n\n양복을 꺼냈다가 다시 넣는다. 당첨금 받으러 가는 데 면접 복장은 좀 과하다. 결국 평소 옷으로 결정.\n\n메모 맨 아래에 제일 중요한 한 줄을 적는다. “봉투 놓고 나가지 않기.”`,
      choices: [action('next', '다음 은행 영업일 아침으로')],
    },
    'next-day': {
      background: 'room', speaker: name, title: '아침은 평소처럼',
      text: `알람이 울린다. 어제 일을 떠올리는 데 딱 1초가 걸렸다. 이불을 걷는 속도가 평소와 다르다.\n\n밥을 먹고 신발을 신는다. 현관에서 가방을 열어 봉투를 확인한다. 한 번. 문을 열다가 다시 한 번.\n\n“이 정도면 봉투도 부담스럽겠다.” 오늘의 첫 일정은 ${receiptPlace} 방문이다.`,
      choices: [action('next', '봉투를 챙겨 나선다')],
    },
    commute: {
      background: 'street', speaker: name, title: '같은 거리, 다른 기분',
      text: '버스 창밖으로 늘 보던 빵집이 지나간다. 평소엔 빵 가격을 봤는데 오늘은 건물부터 봤다.\n\n“아직 받지도 않았는데 진정하자.”\n\n옆자리 승객이 쳐다봐서 아무 일 없는 척 창밖을 본다. 하차 벨을 너무 일찍 누를 뻔했다. 오늘의 난 침착함이 조금 부족하다.',
      choices: [action('next', `${receiptPlace}에 도착한다`)],
    },
    lobby: {
      background: 'bank', speaker: '은행 안내 직원', title: '문을 밀고 들어가다',
      text: `“무슨 일로 오셨어요?”\n\n준비한 말을 작은 목소리로 꺼낸다. “저… ${rank} 수령이요.” 직원이 웃으며 자리를 안내한다. 혼자만 비밀 요원처럼 움직이고 있었다. 손바닥에 땀이 조금 난다.\n\n번호표를 꼭 쥐고 앉자 곧 내 차례가 뜬다. 이제 괜히 물 마시는 척할 필요도 없다.`,
      choices: [action('next', '안내받은 창구에 앉는다')],
    },
    desk: {
      background: 'bank', speaker: '은행 직원', title: '원본을 다시 확인합니다', ticket: true,
      text: `직원이 봉투에서 원본을 꺼내 번호와 회차를 확인한다. 내가 열 번 본 종이를 직원은 차분하게 한 번 본다. 서류도 한 번에 쓱 정리한다.\n\n“제${run.ticket.ticketDrawId}회 ${rank}, 맞습니다. 준비물도 잘 챙겨 오셨네요.”\n\n${shared ? '이번 회차 확정 수령액 5억 원도 다시 확인했다. 머릿속 계산기는 아직 바쁘지만 입꼬리는 이미 올라가 있다.' : '칭찬 한마디에 괜히 자세가 반듯해진다. 어제 메모를 만든 보람이 있다.'}`,
      choices: [action('next', '가상 수령 안내를 듣는다')],
    },
    confirm: {
      background: 'bank', speaker: '은행 직원', title: '마지막으로 확인해 주세요',
      text: `“본인 확인과 지급 절차를 마쳤어요. ${rank}, 수령액 ${run.prizeLabel}. 확인해 주세요.”\n\n화면을 읽는데 숫자 사이 쉼표까지 예뻐 보인다. 이름을 확인하고 금액을 또 확인한다.\n\n“네. 맞습니다.” 연습한 적도 없는데 오늘의 가장 또렷한 목소리가 나왔다. 이제 마지막 확인만 남았다.`,
      choices: [action('claim', '확인하고 수령한다')],
    },
    receipt: {
      background: 'bank', speaker: '은행 직원', title: `${run.prizeLabel} 수령 완료!`,
      text: `“${name} 님, ${run.prizeLabel} 수령 완료입니다. 축하드려요!”\n\n확인서를 두 손으로 받는다. 얇은 종이인데 묘하게 묵직하다. 가방 지퍼를 끝까지 잠그고 나서야 숨이 나온다. 끝까지 잘 해냈다. 만세는 밖에서 하자.\n\n${run.verifiedRank === 1 ? '“나 지금… 진짜 신났네.” 자동문이 열리기도 전에 얼굴에서 티가 난다.' : '예상과 다른 등수여도 기쁜 건 기쁜 거다. 오늘 저녁 메뉴는 확실히 업그레이드다.'}`,
      choices: [action('next', '확인서를 챙겨 밖으로 나온다')],
    },
    breathe: {
      background: 'park', speaker: name, title: '잠깐, 벤치에 앉아서',
      text: '은행 앞 공원 벤치에 앉았다. 자판기 음료를 뽑다가 동전 하나를 떨어뜨려 열심히 주웠다. 부자가 되어도 이건 아깝다.\n\n이제 뭘 먼저 하지? 집? 여행? 퇴사? 아니면 밀린 잠부터?\n\n휴대폰 메모를 켜니 하고 싶은 일이 줄줄이 나온다. 드디어 오늘 가장 즐거운 고민이 시작됐다.',
      choices: [action('next', run.verifiedRank === 1 ? '가장 먼저 할 일을 고른다' : '오늘의 이야기를 마친다')],
    },
    'small-prize': {
      background: 'street', speaker: '가게 사장님', title: '동네에서 챙기는 작은 행운', progress: 0.85, ticket: true,
      text: run.verifiedRank === 4
        ? '“네 개 맞았네요. 5만 원이에요!” 사장님이 표를 확인한다.\n\n은행에 갈 필요 없이 동네에서 가상 수령을 마친다. 머릿속 대저택은 접었지만, 오늘 저녁 배달 메뉴는 한 단계 올릴 수 있다.\n\n“가게 간판은 못 바꿔 드려도 라면 두 개는 더 살게요.” 사장님도 웃는다.'
        : '“세 개 맞았네. 5천 원!” 사장님이 웃으며 알려 준다.\n\n큰돈은 아니어도 표를 확인한 보람은 있다. 진열대의 간식을 보다가 아까 먹은 라면이 떠오른다. 계란을 넣을 걸 그랬다.\n\n“오늘의 인생 역전은… 간식 예산부터.” 작은 행운도 일단 챙기자.',
      choices: [action('claim', `${run.prizeLabel} 가상 수령하고 마무리한다`)],
    },
    future: {
      background: 'park', speaker: name, title: '당첨 다음, 나의 첫 선택', stage: 'ending-choice',
      text: `수령 완료, ${run.prizeLabel}. 이제 내 첫 번째 큰 결정을 내릴 시간이다. 메모를 보니 사고 싶은 것과 하고 싶은 일, 보고 싶은 얼굴이 뒤섞여 있다.\n\n인생 계획서를 오늘 다 쓸 필요는 없다. 딱 하나, 가장 먼저 하고 싶은 일부터.\n\n“스무 가지나 되네. 이런 고민은 환영이지.”`,
      choices: [],
    },
  };
  return scenes[run.sceneId];
}

function verificationScene(run) {
  const common = { background: 'room', speaker: '확인 앱', title: '다시 확인한 결과', ticket: true, phone: true, choices: [action('next', '확인한 결과를 받아들인다')] };
  if (run.scenarioId === 'blank') return { ...common,
    text: '이번 표는 미당첨이다. 휴대폰을 살짝 기울여 본다. 각도를 바꿔도 결과는 그대로다.\n\n“아까 상상 속 집에 소파까지 들여놨는데.”\n\n싱크대에는 현실의 라면 그릇이 남아 있다. 인생 계획 대신 오늘 밤 계획부터 다시 정하자.',
    choices: [action('dishes', '현실의 설거지부터 끝내기'), action('snack', '남은 라면 맛있게 먹기'), action('dream', '상상 속 집들이만 마무리하기')],
  };
  if (run.verifiedRank === 0) return { ...common, text: `“어? 내 표는 제1407회잖아.” 숫자는 제1408회와 같지만 회차가 다르다. 지난 결과를 찾아보니 ${run.ticket.ticketDrawNumbers.join('·')}, 보너스 ${run.ticket.ticketBonus}. 내 표는 미당첨이다.\n\n잠깐 부자였던 나는 다시 의자에 털썩 앉는다. 번호 아래 작은 글씨가 오늘따라 유난히 크게 보인다.\n\n“다음엔 회차부터. 제발 회차부터.”` };
  if (run.verifiedRank === 4) return { ...common, text: '일반번호 네 개 일치. 4등, 5만 원!\n\n“부자는 아니지만 오늘 저녁은 바꿀 수 있겠다.” 머릿속 집 평면도를 지우고 배달 앱 메뉴판을 떠올린다.\n\n원본 표를 챙겨 동네 가게에서 가상 수령을 마치자. 이번에는 은행까지 갈 필요는 없다.' };
  if (run.verifiedRank === 5) return { ...common, text: '일반번호 세 개 일치. 5등, 5천 원이다.\n\n“아까 라면에 계란 넣을까 말까 고민했는데.” 큰 꿈에서 작은 행복으로 계획을 수정한다.\n\n멀리 갈 필요는 없다. 표를 챙겨 동네 가게에서 가상 수령하고 오늘의 간식부터 골라 보자.' };
  if (run.verifiedRank === 2) return { ...common, text: '일반번호 다섯 개와 보너스 일치. 보너스를 여섯 번째 일반번호로 셌다! 정확한 결과는 2등, 7,000만 원이다.\n\n“아… 20억은 아니구나.” 잠깐 조용해졌다가 금액을 다시 본다.\n\n“그런데 7,000만 원도 엄청나잖아?” 입꼬리가 다시 올라간다. 머릿속 장바구니를 조금 현실적으로 고쳐 쓴다.' };
  if (run.verifiedRank === 3) return { ...common, text: '일반번호 다섯 개 일치. 마지막 숫자는 모양이 비슷했을 뿐이고, 보너스도 다르다. 정확한 결과는 3등, 150만 원이다.\n\n“아까 머릿속에서 집까지 샀는데.” 가구 배치까지 끝낸 나 자신이 조금 민망하다.\n\n그래도 150만 원. 오늘 라면에 계란만 넣은 게 갑자기 아쉬워진다. 이 정도면 좋은 날이다.' };
  return { ...common, text: run.scenarioId === 'crowded'
    ? '일반번호 여섯 개 일치! 그런데 이번 회차 1등은 무려 20명. 총 100억 원을 나누니 내 확정 금액은 5억 원이다. 예상했던 20억에서 5억으로 계획을 줄인다.\n\n“전 국민이 나랑 같은 꿈 꿨나?”\n\n잠깐 아쉽다가 다시 숫자를 본다. 5억도 5억이다. 아직 입꼬리는 내려올 생각이 없다.'
    : '회차도 같고 일반번호 여섯 개도 전부 일치. 보너스는 볼 필요도 없다. 1등, 20억 원!\n\n표를 다시 보고 화면도 다시 본다. 정답은 계속 같다. 계산기에 20억을 찍어 봤다가 0을 세는 데만 시간이 걸린다.\n\n“이제 라면 두 개 먹어도 되나?” 인생 첫 부자 발언치고는 상당히 소박하다.' };
}

function resultScene(run) {
  let title; let text;
  if (run.outcome === 'lost') {
    title = '행운표의 빈자리';
    text = '찾기를 멈추고 소파에 앉는다. 원본 표가 없으니 수령하러 갈 수 없다. 머릿속 번호만큼은 유난히 또렷한데, 오늘은 그걸로 할 수 있는 일이 없다.\n\n“정리의 기술… 그 책부터 정독할걸.”\n\n이번 이야기는 미수령으로 끝난다. 다음 판의 나는 봉투부터 준비해 두기로 한다.';
  } else if (run.outcome === 'laundry') {
    title = '주머니 확인은 다음부터';
    text = '세탁이 끝났다. 외투는 깨끗해졌고 표는 읽을 수 없게 흩어졌다. 원본이 훼손되어 수령할 수 없다. 섬유유연제 향이 이렇게 얄미운 건 처음이다.\n\n“우리 집에서 제일 비싼 빨래였네.”\n\n이번 이야기는 미수령으로 끝난다. 다음에는 세제보다 주머니 확인이 먼저다.';
  } else if (run.scenarioId === 'blank') {
    const variants = {
      'blank-dishes': ['당첨 대신 설거지', '로또는 꽝이었고 싱크대는 깨끗해졌다. 오늘의 확실한 성과는 반짝이는 라면 그릇이다.\n\n“인생 역전은 미뤘고 집안일은 하나 줄였다.”\n\n휴대폰을 내려놓고 그릇을 엎어 둔다. 평범한 하루도 이렇게 한 칸 정리됐다.'],
      'blank-snack': ['라면은 배신하지 않는다', '당첨 알림은 없었지만 남은 라면은 있었다. 따뜻하게 데워 한 입 먹는다. 번호 여섯 개보다 지금은 이 한 젓가락이 확실하다.\n\n“오늘의 수령품은 맛있는 야식.”\n\n배를 두드리고 휴대폰을 내려놓는다. 꽝이어도 저녁까지 망칠 필요는 없다.'],
      'blank-dream': ['상상 속 집들이 종료', '아까 머릿속으로 산 집의 손님들을 정중히 배웅했다. 이사도, 가구 배송도 상상이라 취소 수수료가 없다는 게 다행이다.\n\n“좋은 집이었어. 거실 채광이 특히.”\n\n상상 속 현관문을 닫고 현실의 작은 방에서 기지개를 켠다.'],
    };
    [title, text] = variants[run.outcome] || variants['blank-dishes'];
  } else if (run.verifiedRank === 0) {
    title = '회차까지 봐야 한 장의 표';
    text = '지난 회차 표를 이번 결과와 맞춰 봤으니, 숫자가 같아도 당첨은 아니다. 오늘의 결과는 미당첨. 창밖을 보며 부자였던 30초를 조용히 보내 준다.\n\n상상 속 집들이 메뉴까지 정했는데 취소해야겠다. 설거지는 아직 싱크대에 그대로다.\n\n“일단 저것부터 치우자. 회차는 다음부터 크게 보기.”';
  } else if (run.verifiedRank === 4 || run.verifiedRank === 5) {
    title = run.verifiedRank === 4 ? '오늘 저녁은 업그레이드' : '계란 추가는 가능';
    text = run.verifiedRank === 4
      ? '4등, 5만 원 가상 수령 완료! 집을 사는 대신 오늘 먹고 싶던 저녁을 골랐다. 큰 계획은 접었지만 작은 행운까지 놓치지는 않았다.\n\n“사이드 메뉴도 하나 추가.” 오늘의 사치는 딱 이 정도다.'
      : '5등, 5천 원 가상 수령 완료! 간식 하나를 골라 봉투에 담는다. 표 한 장이 대저택 대신 작은 야식을 데려왔다.\n\n“인생은 그대로고 간식은 생겼다.” 나쁘지 않은 마무리다.';
  } else {
    title = run.verifiedRank === 2 ? '보너스가 데려온 2등' : '다섯 숫자의 3등';
    text = `${ranks[run.verifiedRank]}, ${run.prizeLabel} 수령 완료! ${run.verifiedRank === 2 ? '일반번호 다섯 개와 보너스 하나가 오늘 일을 냈다.' : '일반번호 다섯 개가 오늘 저녁 메뉴를 바꿨다.'}\n\n처음 머릿속에 지었던 대저택은 일단 접어 둔다. 그래도 집으로 돌아가는 길에 먹고 싶었던 음식을 망설임 없이 주문했다.\n\n“축하는 축하니까.” 오늘은 작은 영수증까지 왠지 기념품 같다.`;
  }
  return { id: 'result', background: 'ending', speaker: run.nickname, title, text, stage: 'ending', progress: 1, choices: [], result: { title, text, rank: run.verifiedRank, claimed: run.claimed, scenarioId: run.scenarioId } };
}

export function getScene(run) {
  if (run.sceneId === 'result') return resultScene(run);
  if (run.sceneId === 'ending') {
    const ending = ENDINGS.find(item => item.id === run.endingId);
    return { id: 'ending', background: ending.background, speaker: run.nickname, title: ending.title,
      text: `${ending.text}\n\n“${ending.line}”\n\n${ending.card_text}`, choices: [], stage: 'ending', progress: 1,
      ending, result: { title: ending.title, text: ending.card_text, rank: 1, claimed: true, scenarioId: run.scenarioId } };
  }
  const authored = story(run);
  if (!authored) throw new TypeError('알 수 없는 이야기 장면입니다.');
  const position = narrativeOrder.indexOf(run.sceneId);
  return {
    id: run.sceneId, stage: 'story', progress: position < 0 ? 0.43 : position / (narrativeOrder.length - 1),
    ...authored, choices: authored.choices.map(choice => ({ ...choice, id: `${run.sceneId}:${choice.id}` })),
  };
}

export function advance(run, choiceId) {
  if (!run || run.completed || typeof choiceId !== 'string') return run;
  const scene = getScene(run);
  if (scene.stage !== 'story' || !scene.choices.some(choice => choice.id === choiceId)) return run;
  const selected = choiceId.slice(run.sceneId.length + 1);
  let sceneId = narrativeOrder[narrativeOrder.indexOf(run.sceneId) + 1];
  const updates = {};
  if (run.sceneId === 'evening') updates.checkMethod = selected;
  if (run.sceneId === 'compare') {
    updates.verifiedRank = run.ticket.ticketDrawId === run.ticket.drawId
      ? matchingRank(run.ticket.numbers, run.ticket.drawNumbers, run.ticket.bonus) : 0;
    updates.grossPrize = updates.verifiedRank ? `가상 ${ranks[updates.verifiedRank]} 상금${run.scenarioId === 'crowded' ? ' · 다수 당첨 회차' : ''}` : '가상 미당첨 · 수령 없음';
    updates.prizeLabel = updates.verifiedRank === 0 ? '수령 없음'
      : updates.verifiedRank === 2 ? '7,000만 원'
        : updates.verifiedRank === 3 ? '150만 원'
          : updates.verifiedRank === 4 ? '5만 원'
            : updates.verifiedRank === 5 ? '5천 원'
          : run.scenarioId === 'crowded' ? '5억 원' : '20억 원';
  }
  if (run.sceneId === 'verification' && run.verifiedRank === 0) {
    sceneId = 'result'; updates.completed = true;
    updates.outcome = run.scenarioId === 'blank' ? `blank-${selected}` : 'wrong-draw';
    if (run.scenarioId === 'wrong-draw') updates.ticketStatus = 'expired';
  }
  if (run.sceneId === 'verification' && [4, 5].includes(run.verifiedRank)) sceneId = 'small-prize';
  if (run.sceneId === 'small-prize') {
    if (run.claimed || ![4, 5].includes(run.verifiedRank)) return run;
    sceneId = 'result'; updates.claimed = true; updates.completed = true; updates.outcome = 'small-prize';
  }
  if (run.sceneId === 'reaction') updates.reaction = selected;
  if (run.sceneId === 'response' && ['lost', 'laundry'].includes(run.scenarioId)) {
    sceneId = `event-${run.scenarioId}`;
    if (run.scenarioId === 'lost') updates.ticketStatus = 'lost';
  }
  if (run.sceneId.startsWith('event-')) {
    if (run.sceneId === 'event-recovered') sceneId = 'protect';
    else if (selected === 'recover') { sceneId = 'event-recovered'; updates.ticketStatus = 'recovered'; }
    else { sceneId = 'result'; updates.completed = true; updates.outcome = run.scenarioId; updates.ticketStatus = run.scenarioId === 'lost' ? 'lost' : 'damaged'; }
  }
  if (run.sceneId === 'confirm') {
    if (run.claimed || ![1, 2, 3].includes(run.verifiedRank)) return run;
    updates.claimed = true;
  }
  if (run.sceneId === 'breathe' && run.verifiedRank !== 1) { sceneId = 'result'; updates.completed = true; }
  const next = { ...run, ...updates, sceneId, history: [...run.history, { sceneId: run.sceneId, choiceId }] };
  if (sceneId === 'result') next.result = resultScene(next).result;
  return freeze(next);
}

export function finishEnding(run, endingId) {
  if (!run || run.completed || run.sceneId !== 'future' || run.verifiedRank !== 1 || !run.claimed || !ENDINGS.some(ending => ending.id === endingId)) return run;
  const ending = ENDINGS.find(item => item.id === endingId);
  return freeze({ ...run, sceneId: 'ending', endingId, completed: true,
    result: { title: ending.title, text: ending.card_text, rank: 1, claimed: true, scenarioId: run.scenarioId },
    history: [...run.history, { sceneId: 'future', choiceId: endingId }] });
}
