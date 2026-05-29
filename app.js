const API_BASE_URL = 'https://sasadomi-system.vercel.app';
const API_KEY = 'YOUR_SASADOMI_API_KEY'; // 발급받은 실제 x-api-key 입력

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');

// 전역 상태 변수 (연동 해제 시 사용)
let currentStudentId = '';
let currentToken = '';

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('studentId').value.trim();
  const studentPw = document.getElementById('studentPw').value;

  // 학번 간단 규격 벨리데이션 (명세서의 11자리 체크 반영)
  if (studentId.length !== 11 || !studentId.startsWith('s')) {
    alert('올바른 학번 형식(s+숫자 10자리)으로 입력해주세요.');
    return;
  }

  // 로딩 상태 표시
  loginBtn.disabled = true;
  loginBtn.innerText = '학교 기숙사 시스템 인증 중...';

  try {
    // [단계 1] 학교 계정 로그인 및 세션 토큰 발급
    const loginResponse = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ studentId, studentPw })
    });

    const loginData = await loginResponse.json();

    if (!loginResponse.ok || !loginData.success) {
      throw new Error(loginData.message || '학교 로그인에 실패했습니다.');
    }

    // 명세서에 명시된 sessionToken 추출
    const token = loginData.sessionToken;
    currentStudentId = studentId;
    currentToken = token;

    // [단계 2] 획득한 토큰으로 상벌점 데이터 가져오기 (GET 쿼리 스트링 방식)
    const pointsResponse = await fetch(`${API_BASE_URL}/v1/points?studentId=${studentId}&token=${token}`, {
      method: 'GET',
      headers: {
        'x-api-key': API_KEY
      }
    });

    const pointsData = await pointsResponse.json();

    if (!pointsResponse.ok || !pointsData.success) {
      throw new Error(pointsData.message || '상벌점 내역을 조회할 수 없습니다.');
    }

    // [단계 3] 깔끔한 UI 화면에 렌더링 시작
    renderDashboard(studentId, pointsData);

  } catch (error) {
    alert(error.message);
  } finally {
    // 버튼 상태 원복
    loginBtn.disabled = false;
    loginBtn.innerText = '로그인 및 상벌점 조회';
  }
});

// 명세서 규격 맞춤 렌더링 함수
function renderDashboard(studentId, data) {
  // 화면 섹션 전환
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');

  // UI용 학년/반/번호 정보 파싱 (학번 문자열 분석)
  // s 2026(입학년도) 01(학년) 07(반) 01(번호) 구조 파싱
  const grade = parseInt(studentId.substring(5, 7), 10);
  const sclass = parseInt(studentId.substring(7, 9), 10);
  const number = parseInt(studentId.substring(9, 11), 10);
  document.getElementById('user-info').innerText = `${grade}학년 ${sclass}반 ${number}번 학생 현황`;

  // 명세서 필드 매핑 (totalReward, totalPenalty)
  document.getElementById('merit-score').innerText = `${data.totalReward || '0'}점`;
  document.getElementById('demerit-score').innerText = `${data.totalPenalty || '0'}점`;

  const historyList = document.getElementById('history-list');
  historyList.innerHTML = ''; // 초기화

  // 상점 리스트(rewardList)와 벌점 리스트(penaltyList) 통합 및 정렬
  // 명세서 상의 항목 구조: { no, score, reason, comment, date }
  const totalList = [];
  
  if (data.rewardList) {
    data.rewardList.forEach(item => totalList.push({ ...item, isMerit: true }));
  }
  if (data.penaltyList) {
    data.penaltyList.forEach(item => totalList.push({ ...item, isMerit: false }));
  }

  // 내역이 비어있을 때 처리
  if (totalList.length === 0) {
    historyList.innerHTML = `<li class="p-4 text-center text-slate-400 text-sm">부여된 상벌점 내역이 없습니다.</li>`;
    return;
  }

  // 통합된 리스트를 화면에 동적 드로잉
  totalList.forEach(item => {
    const li = document.createElement('li');
    li.className = 'p-4 flex justify-between items-start gap-4 text-sm hover:bg-slate-50 transition';
    
    const badgeColor = item.isMerit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';
    const scoreSign = item.isMerit ? '+' : '-';
    const scoreColor = item.isMerit ? 'text-green-600' : 'text-red-600';

    li.innerHTML = `
      <div class="space-y-1">
        <div class="flex items-center gap-2 flex-wrap">
          <span class="px-2 py-0.5 rounded text-xs font-bold ${badgeColor}">${item.isMerit ? '상점' : '벌점'}</span>
          <span class="text-slate-700 font-semibold">${item.reason}</span>
        </div>
        ${item.comment ? `<p class="text-xs text-slate-400 pl-1">💬 ${item.comment}</p>` : ''}
      </div>
      <div class="text-right shrink-0">
        <span class="font-black text-base ${scoreColor}">${scoreSign}${item.score}점</span>
        <p class="text-slate-400 text-2xs mt-0.5">${item.date}</p>
      </div>
    `;
    historyList.appendChild(li);
  });
}

// 연동 해제 및 데이터 파기 기능 구현 (/v1/auth/disconnect 연동)
document.getElementById('logout-btn').addEventListener('click', async () => {
  if (!confirm('정말 계정 연동을 해제하고 서버에서 데이터를 파기하시겠습니까?')) return;

  try {
    await fetch(`${API_BASE_URL}/v1/auth/disconnect`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: currentStudentId,
        token: currentToken
      })
    });
  } catch (e) {
    console.error('서버 데이터 파기 요청 실패:', e);
  } finally {
    // 서버 처리 성공 여부와 무관하게 클라이언트 UI는 무조건 초기화하여 보안 확보
    loginForm.reset();
    currentStudentId = '';
    currentToken = '';
    dashboardSection.classList.add('hidden');
    loginSection.classList.remove('hidden');
  }
});
