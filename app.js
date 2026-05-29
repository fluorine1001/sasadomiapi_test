const API_BASE_URL = 'https://sasadomi-system.vercel.app';
const API_KEY = 'sasa_dev_8e08868b29e84896f70078d2dd389878e21b04f7c83e349b'; 

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const studyForm = document.getElementById('study-form');

let currentStudentId = '';
let currentToken = '';

// 기본 날짜 인풋에 '오늘' 날짜 기본 설정 기능
document.getElementById('study-date').value = new Date().toISOString().substring(0, 10);

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const studentId = document.getElementById('studentId').value.trim();
  const studentPw = document.getElementById('studentPw').value;

  if (studentId.length !== 11 || !studentId.startsWith('s')) {
    alert('올바른 학번 형식으로 입력해주세요.');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.innerText = '접속 중...';

  try {
    // 1. 로그인
    const loginResponse = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentPw })
    });
    const loginData = await loginResponse.json();
    if (!loginResponse.ok || !loginData.success) throw new Error(loginData.message || '로그인 실패');

    const token = loginData.sessionToken;
    currentStudentId = studentId;
    currentToken = token;

    // 2. 상벌점 데이터 조회 & 메타데이터 옵션 조회를 병렬(동시) 처리하여 효율화
    const [pointsRes, metaRes] = await Promise.all([
      fetch(`${API_BASE_URL}/v1/points?studentId=${studentId}&token=${token}`, { headers: { 'x-api-key': API_KEY } }),
      fetch(`${API_BASE_URL}/v1/meta/options`, { headers: { 'x-api-key': API_KEY } })
    ]);

    const pointsData = await pointsRes.json();
    const metaData = await metaRes.json();

    // UI 그리기 및 메타데이터 셀렉트 박스 채우기
    renderDashboard(studentId, pointsData);
    initLeaveOptions(metaData);

  } catch (error) {
    alert(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = '로그인 및 시스템 접속';
  }
});

// 상벌점 UI 렌더링 (기존 로직 유지)
function renderDashboard(studentId, data) {
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');

  const grade = parseInt(studentId.substring(5, 7), 10);
  const sclass = parseInt(studentId.substring(7, 9), 10);
  const number = parseInt(studentId.substring(9, 11), 10);
  document.getElementById('user-info').innerText = `${grade}학년 ${sclass}반 ${number}번 학생 현황`;

  document.getElementById('merit-score').innerText = `${data.totalReward || '0'}점`;
  document.getElementById('demerit-score').innerText = `${data.totalPenalty || '0'}점`;

  const historyList = document.getElementById('history-list');
  historyList.innerHTML = '';

  const totalList = [];
  if (data.rewardList) data.rewardList.forEach(item => totalList.push({ ...item, isMerit: true }));
  if (data.penaltyList) data.penaltyList.forEach(item => totalList.push({ ...item, isMerit: false }));

  if (totalList.length === 0) {
    historyList.innerHTML = `<li class="p-4 text-center text-slate-400 text-sm">내역이 없습니다.</li>`;
    return;
  }

  totalList.forEach(item => {
    const li = document.createElement('li');
    li.className = 'p-3 flex justify-between items-start text-xs hover:bg-slate-50';
    li.innerHTML = `
      <div>
        <span class="px-1.5 py-0.5 rounded text-2xs font-bold ${item.isMerit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${item.isMerit ? '상점' : '벌점'}</span>
        <span class="ml-1 text-slate-700 font-medium">${item.reason}</span>
      </div>
      <div class="text-right">
        <span class="font-bold ${item.isMerit ? 'text-green-600' : 'text-red-600'}">${item.isMerit ? '+' : '-'}${item.score}점</span>
      </div>
    `;
    historyList.appendChild(li);
  });
}

// 폼 로드 시 서버 샐렉트박스 옵션 채워넣기 기능
function initLeaveOptions(meta) {
  if (!meta.success) return;

  // 교시 세팅
  const timeSelect = document.getElementById('study-time');
  timeSelect.innerHTML = '<option value="">교시를 선택하세요</option>';
  meta.studyTimes.forEach(t => {
    timeSelect.innerHTML += `<option value="${t.value}">${t.label}</option>`;
  });

  // 장소 세팅
  const placeSelect = document.getElementById('study-place');
  placeSelect.innerHTML = '<option value="">장소를 선택하세요</option>';
  meta.studyPlaces.forEach(p => {
    placeSelect.innerHTML += `<option value="${p.value}">${p.label}</option>`;
  });

  // 지도교사 세팅
  const teacherSelect = document.getElementById('study-teacher');
  teacherSelect.innerHTML = '<option value="">지도교사를 선택하세요</option>';
  meta.teachers.forEach(t => {
    teacherSelect.innerHTML += `<option value="${t}">${t}</option>`;
  });
}

// 💡 장소가 본관('3')일 때 지도교사 필수 마킹 동적 제어 로직
document.getElementById('study-place').addEventListener('change', (e) => {
  const badge = document.getElementById('teacher-required-badge');
  if (e.target.value === '3') {
    badge.classList.remove('hidden');
  } else {
    badge.classList.add('hidden');
  }
});

// ✨ 자율학습 대행 신청 폼 전송 이벤트
studyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const dateValue = document.getElementById('study-date').value; // 예: "2026-05-29"
  const time = document.getElementById('study-time').value;
  const place = document.getElementById('study-place').value;
  const detail = document.getElementById('study-teacher').value;
  const detail_reason = document.getElementById('study-reason').value;

  // 🔴 장소가 본관('3')인데 교사를 안 고른 경우 예외 차단 (명세서 400 조건 반영)
  if (place === '3' && !detail) {
    alert('본관 신청 시 지도교사 선택은 필수입니다.');
    return;
  }

  // 🔴 [시간 계산 중요] 명세서 스펙에 맞춘 KST 00:00:00초 자정 기준 초 단위 Timestamp 연산
  const localDate = new Date(dateValue + 'T00:00:00'); 
  const dateTimestamp = Math.floor(localDate.getTime() / 1000);

  const submitBtn = document.getElementById('study-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = '학교 원격 서버로 신청 접수 중...';

  try {
    const response = await fetch(`${API_BASE_URL}/v1/applications/study`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        studentId: currentStudentId,
        token: currentToken,
        date: dateTimestamp, // 숫자가 정수형(Integer)으로 들어감
        time,
        place,
        detail: place === '3' ? detail : '', // 본관 아니면 명세서 가이드대로 빈값 처리
        detail_reason
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('자율학습 대행 신청이 정상적으로 완료되었습니다!');
      studyForm.reset();
      document.getElementById('study-date').value = new Date().toISOString().substring(0, 10);
    } else {
      throw new Error(result.message || '신청 대행 중 학교 시스템 에러가 발생했습니다.');
    }
  } catch (error) {
    alert(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '학교 시스템에 신청 보내기';
  }
});

// 연동해제 (기존 동일)
document.getElementById('logout-btn').addEventListener('click', () => {
  loginForm.reset();
  studyForm.reset();
  currentStudentId = '';
  currentToken = '';
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});
