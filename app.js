const API_BASE_URL = 'https://sasadomi-system.vercel.app';
const API_KEY = 'sasa_dev_8e08868b29e84896f70078d2dd389878e21b04f7c83e349b'; // 여기에 실제 발급받은 x-api-key 입력

const loginSection = document.getElementById('login-section');
const dashboardSection = document.getElementById('dashboard-section');
const loginForm = document.getElementById('login-form');

// 로그인 폼 제출 이벤트 핸들러
loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();

  // 1. 입력 데이터 추출
  const payload = {
    studentId: document.getElementById('studentId').value,
    studentPw: document.getElementById('studentPw').value,
    grade: document.getElementById('grade').value,
    sclass: document.getElementById('sclass').value,
    number: document.getElementById('number').value,
  };

  try {
    // 2. 사사도미 API 호출
    const response = await fetch(`${API_BASE_URL}/v1/auth/login`, {
      method: 'POST',
      headers: {
        'x-api-key': API_KEY,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error('로그인에 실패했습니다. 학번 또는 비번을 확인하세요.');
    }

    const data = await response.json();
    
    // 3. UI 업데이트 및 대시보드 전환
    renderDashboard(payload.studentId, data);

  } catch (error) {
    alert(error.message);
  }
});

// 대시보드에 상벌점 데이터 매핑 함수
function renderDashboard(studentId, data) {
  // 화면 전환 (로그인 숨기고 대시보드 보이기)
  loginSection.classList.add('hidden');
  dashboardSection.classList.remove('hidden');

  // 학번 및 점수 표시 (가상의 API 응답 구조를 가정하여 작성)
  // * 실제 API 응답 스키마 구조에 맞추어 항목명(data.merit 등)을 수정하셔야 합니다.
  document.getElementById('user-info').innerText = `${studentId} 학생의 상벌점 현황`;
  document.getElementById('merit-score').innerText = `${data.totalMerit || 0}점`;
  document.getElementById('demerit-score').innerText = `${data.totalDemerit || 0}점`;

  // 상세 내역 리스트 렌더링
  const historyList = document.getElementById('history-list');
  historyList.innerHTML = ''; // 초기화

  if (data.history && data.history.length > 0) {
    data.history.forEach(item => {
      const li = document.createElement('li');
      li.className = 'p-4 flex justify-between items-center text-sm';
      
      // 상점/벌점 여부에 따른 디자인 차별화
      const isMerit = item.type === '상점';
      const badgeColor = isMerit ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700';

      li.innerHTML = `
        <div>
          <span class="px-2 py-0.5 rounded text-xs font-bold ${badgeColor}">${item.type}</span>
          <span class="ml-2 text-slate-700 font-medium">${item.reason}</span>
        </div>
        <div class="text-slate-400 text-xs flex flex-col items-end">
          <span class="font-bold ${isMerit ? 'text-green-600' : 'text-red-600'}">${isMerit ? '+' : '-'}${item.score}점</span>
          <span>${item.date}</span>
        </div>
      `;
      historyList.appendChild(li);
    });
  } else {
    historyList.innerHTML = `<li class="p-4 text-center text-slate-400 text-sm">상벌점 부여 내역이 없습니다.</li>`;
  }
}

// 로그아웃(연동해제) 버튼 클릭 시
document.getElementById('logout-btn').addEventListener('click', () => {
  loginForm.reset();
  dashboardSection.classList.add('hidden');
  loginSection.classList.remove('hidden');
});
