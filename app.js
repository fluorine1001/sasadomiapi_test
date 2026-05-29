const API_BASE_URL = 'https://sasadomi-system.vercel.app';
const API_KEY = 'YOUR_SASADOMI_API_KEY'; 

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');
const loginBtn = document.getElementById('login-btn');
const studyForm = document.getElementById('study-form');

let currentStudentId = '';
let currentToken = '';

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
  loginBtn.innerText = '기숙사 시스템 동기화 중...';

  try {
    // 1. 로그인 인증 및 토큰 발급
    const loginResponse = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({ studentId, studentPw })
    });
    const loginData = await loginResponse.json();
    if (!loginResponse.ok || !loginData.success) throw new Error(loginData.message || '로그인 실패');

    currentStudentId = studentId;
    currentToken = loginData.sessionToken;

    // 2. ✨ [3개 API 동시 병렬 호출] 상벌점, 신청 폼 선택지, 그리고 신청 목록 내역 가져오기
    const [pointsRes, metaRes, appsRes] = await Promise.all([
      fetch(`${API_BASE_URL}/v1/points?studentId=${currentStudentId}&token=${currentToken}`, { headers: { 'x-api-key': API_KEY } }),
      fetch(`${API_BASE_URL}/v1/meta/options`, { headers: { 'x-api-key': API_KEY } }),
      fetch(`${API_BASE_URL}/v1/applications?studentId=${currentStudentId}&token=${currentToken}`, { headers: { 'x-api-key': API_KEY } })
    ]);

    const pointsData = await pointsRes.json();
    const metaData = await metaRes.json();
    const appsData = await appsRes.json();

    // 3. UI 렌더링 배포
    renderDashboard(currentStudentId, pointsData);
    initLeaveOptions(metaData);
    renderStudyList(appsData.studyList); // ✨ 자율학습 목록 그리기 함수 실행

  } catch (error) {
    alert(error.message);
  } finally {
    loginBtn.disabled = false;
    loginBtn.innerText = '로그인 및 시스템 접속';
  }
});

// ✨ 자율학습 신청 내역 데이터 표출 함수 (명세서의 studyList 기반)
function renderStudyList(studyList) {
  const listBody = document.getElementById('study-list-body');
  listBody.innerHTML = ''; // 초기화

  if (!studyList || studyList.length === 0) {
    listBody.innerHTML = `
      <tr>
        <td colspan="5" class="p-6 text-center text-slate-400 text-xs">신청된 자율학습 내역이 존재하지 않습니다.</td>
      </tr>
    `;
    return;
  }

  // 명세서 규격 필드: { id, no, date, time, place, teacher, detail, applyDate, status }
  studyList.forEach(item => {
    const tr = document.createElement('tr');
    tr.className = 'hover:bg-slate-50 transition border-b border-slate-100 last:border-0 text-xs';

    // 상태값(승인, 대기, 거절)에 따른 배지 색상 스위칭 로직
    let statusClass = 'bg-slate-100 text-slate-600';
    if (item.status === '승인') statusClass = 'bg-green-100 text-green-700 font-bold';
    if (item.status === '거절') statusClass = 'bg-red-100 text-red-700 font-bold';
    if (item.status === '대기') statusClass = 'bg-amber-100 text-amber-700 font-medium';

    tr.innerHTML = `
      <td class="p-3 font-medium text-slate-800">${item.date}</td>
      <td class="p-3">${item.time}</td>
      <td class="p-3"><span class="bg-slate-100 px-1.5 py-0.5 rounded text-slate-600">${item.place}</span></td>
      <td class="p-3">
        <div class="text-slate-700 font-medium">${item.teacher || '-'}</div>
        <div class="text-slate-400 text-2xs mt-0.5">${item.detail || ''}</div>
      </td>
      <td class="p-3 text-center">
        <span class="px-2 py-0.5 rounded text-2xs ${statusClass}">${item.status}</span>
      </td>
    `;
    listBody.appendChild(tr);
  });
}

// 개별 자율학습 내역 실시간 갱신용 서브 함수
async function fetchAndRefreshStudyList() {
  try {
    const res = await fetch(`${API_BASE_URL}/v1/applications?studentId=${currentStudentId}&token=${currentToken}`, {
      headers: { 'x-api-key': API_KEY }
    });
    const data = await res.json();
    if (data.success) {
      renderStudyList(data.studyList);
    }
  } catch (err) {
    console.error('목록 갱신 실패:', err);
  }
}

// 자율학습 신청 처리 (기존 로직 유지 + 신청 성공 시 실시간 목록 리프레시 연계)
studyForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  const dateValue = document.getElementById('study-date').value; 
  const time = document.getElementById('study-time').value;
  const place = document.getElementById('study-place').value;
  const detail = document.getElementById('study-teacher').value;
  const detail_reason = document.getElementById('study-reason').value;

  if (place === '3' && !detail) {
    alert('본관 신청 시 지도교사 선택은 필수입니다.');
    return;
  }

  const localDate = new Date(dateValue + 'T00:00:00'); 
  const dateTimestamp = Math.floor(localDate.getTime() / 1000);

  const submitBtn = document.getElementById('study-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerText = '신청 전송 중...';

  try {
    const response = await fetch(`${API_BASE_URL}/v1/applications/study`, {
      method: 'POST',
      headers: { 'x-api-key': API_KEY, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        studentId: currentStudentId,
        token: currentToken,
        date: dateTimestamp,
        time,
        place,
        detail: place === '3' ? detail : '',
        detail_reason
      })
    });

    const result = await response.json();

    if (response.ok && result.success) {
      alert('자율학습 신청 완료!');
      studyForm.reset();
      document.getElementById('study-date').value = new Date().toISOString().substring(0, 10);
      
      // ✨ 중요: 신청이 정상 완료되면, 하단 목록을 학교 웹에서 크롤링한 최신값으로 리프레시합니다.
      await fetchAndRefreshStudyList();
    } else {
      throw new Error(result.message || '신청 실패');
    }
  } catch (error) {
    alert(error.message);
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerText = '학교 시스템에 신청 보내기';
  }
});

// [아래 코드는 기존의 폼 채우기, 상벌점 출력, 연동 해제 로직으로 동일합니다]
function initLeaveOptions(meta) {
  if (!meta.success) return;
  const timeSelect = document.getElementById('study-time');
  timeSelect.innerHTML = '<option value="">교시 선택</option>';
  meta.studyTimes.forEach(t => timeSelect.innerHTML += `<option value="${t.value}">${t.label}</option>`);
  const placeSelect = document.getElementById('study-place');
  placeSelect.innerHTML = '<option value="">장소 선택</option>';
  meta.studyPlaces.forEach(p => placeSelect.innerHTML += `<option value="${p.value}">${p.label}</option>`);
  const teacherSelect = document.getElementById('study-teacher');
  teacherSelect.innerHTML = '<option value="">지도교사 선택</option>';
  meta.teachers.forEach(t => teacherSelect.innerHTML += `<option value="${t}">${t}</option>`);
}
document.getElementById('study-place').addEventListener('change', (e) => {
  document.getElementById('teacher-required-badge').classList.toggle('hidden', e.target.value !== '3');
});
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
  if (totalList.length === 0) { historyList.innerHTML = `<li class="p-4 text-center text-slate-400 text-xs">내역 없음</li>`; return; }
  totalList.forEach(item => {
    const li = document.createElement('li');
    li.className = 'p-2 flex justify-between items-start text-xs hover:bg-slate-50';
    li.innerHTML = `<div><span class="px-1 py-0.5 rounded text-2xs font-bold ${item.isMerit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}">${item.isMerit ? '상' : '벌'}</span><span class="ml-1 text-slate-700">${item.reason}</span></div><div><span class="font-bold ${item.isMerit ? 'text-green-600' : 'text-red-600'}">${item.isMerit ? '+' : '-'}${item.score}점</span></div>`;
    historyList.appendChild(li);
  });
}
document.getElementById('logout-btn').addEventListener('click', () => {
  loginForm.reset(); studyForm.reset(); currentStudentId = ''; currentToken = '';
  dashboardSection.classList.add('hidden'); loginSection.classList.remove('hidden');
});
