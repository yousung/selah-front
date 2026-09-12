# Design

## Source of truth

- Status: Active
- Last refreshed: 2026-09-12
- Primary product surfaces: 사용자 PWA, `#/memorize` 주간 양식, 기도문 탭
- Evidence reviewed: `../DESIGN.md`, `../docs/design/00-design-system.md`, `src/index.css`, `src/pages/MemorizePage.tsx`, `docs/architecture.md`

## Brand

- Personality: 차분하고 신뢰할 수 있는 영적 청취·읽기 공간
- Trust signals: 과장 없는 정보 계층, 명확한 날짜와 콘텐츠 출처, 예측 가능한 조작
- Avoid: 과도한 그라데이션, 겹친 카드, 경쟁적인 강조색, 피드형·알고리즘형 시각 언어

## Product goals

- Goals: 성도가 한 주의 양식과 기도문을 짧은 시간 안에 읽고 다음 항목으로 자연스럽게 이동하게 한다.
- Non-goals: 콘텐츠 소비를 자극하는 대시보드, 조회수·완료율 등의 성과 지표를 노출하지 않는다.
- Success signals: 첫 화면에서 주차·항목 유형·본문의 순서를 즉시 파악하고, 큰 글자 설정에서도 읽기 흐름이 무너지지 않는다.

## Personas and jobs

- Primary personas: 모바일에서 짧게 묵상하는 교인, 주간 양식을 확인하는 성도
- User jobs: 이번 주에 읽을 내용을 훑고, 각 항목의 본문과 연결을 편안하게 읽는다.
- Key contexts of use: 예배 전후, 이동 중, 가정에서의 짧은 개인 묵상; 모바일 우선

## Information architecture

- Primary navigation: 5탭 하단 내비게이션의 `양식` → `#/memorize`
- Core routes/screens: 이번 주 양식, 헤더의 이전 양식 버튼, 기도문(일상기도·기도제목·목회기도·대표기도), 기도문 안의 이전 기도문 보기
- Content hierarchy: 주차/기간 → 현재 콘텐츠 → 항목 유형 → 본문·참조 → 이전 콘텐츠 진입
- 이전 목록 진입은 공통 헤더 오른쪽에 둔다. 이번 주 양식은 `이전 양식`, 기도문은 주제명을 포함한 버튼으로 구분한다. 해당 이전 자료가 있을 때만 표시하며 로딩·조회 실패·빈 목록에서는 숨긴다. 이전 보기 중에는 현재 보기로 돌아가는 버튼을 유지한다.
- 기도문 이전 버튼은 선택된 주제에 따라 `이전 일상 기도` / `이전 기도 제목` / `이전 목회 기도` / `이전 대표 기도`로 표시한다. 주제 메뉴 아래에서 제목 목록 → 선택 기간 본문 순으로 이동한다. 날짜는 시작일·종료일 쌍으로 묶고 최근 기간부터 표시한다. 다른 주제를 누르면 선택 날짜를 해제하고 해당 주제의 현재 콘텐츠를 연다.

## Design principles

- 읽기 흐름을 카드 장식보다 우선한다. 한 주의 콘텐츠는 하나의 연속된 편집물로 보인다.
- 강조는 한 번에 하나만 쓴다. 주차와 현재 항목 유형은 색과 무게로, 본문은 여백으로 구분한다.
- 상태는 조용히 드러낸다. 빈·로딩·오류 상태가 레이아웃을 흔들지 않는다.
- Tradeoffs: 정보 구분을 위해 얕은 표면 패널은 허용하되, 항목마다 독립적인 큰 카드를 만들지 않는다.

## Visual language

- Color: 기존 `--surface-*`, `--primary-*`, `--ink-*`, `--divider` 토큰만 사용한다.
- Typography: UI/레이블은 Noto Sans KR, 묵상 본문과 제목은 `--font-serif`를 사용한다.
- Spacing/layout rhythm: 4/8/16/24/32px 기준; 넓은 본문 여백과 가는 구분선을 사용한다.
- Shape/radius/elevation: 평면적 표면, 12–16px radius, 그림자 없이 divider로 경계를 만든다.
- Motion: 탭 전환은 즉시 반응하고, 필요 시 200ms 이내의 낮은 강도 변화만 사용한다.
- Imagery/iconography: 기능을 설명하는 최소 아이콘만 사용한다.

## Components

- 대표기도는 문서별 제목(나라를 위한 기도 등)을 아코디언으로 표시한다. 일상기도와 같은 애니메이션·키보드 동작·기본 접힘을 사용하되 문서 제목 크기와 원문을 유지한다. 현재와 이전 기도문 모두 적용한다.

- 기도 네 종류 모두 선택된 탭 이름을 본문 소제목으로 반복하지 않는다. 실제 기도문 제목은 24px, 기도제목의 하위 일정은 17px 기준으로 글자 설정을 적용해 제목을 가장 크게 유지한다.

- 기도제목은 1부터 이어지는 번호 항목을 펼쳐진 목록으로 보여준다. 번호와 제목을 분리하고 항목 사이에 여백·구분선을 둔다. 하위 일정/설명은 얕은 들여쓰기와 세로선으로 구분하며 원문의 줄바꿈을 보존한다. 번호 구조가 불명확하면 원문 그대로 표시한다. 날짜처럼 보이는 본문을 새 번호나 별도 일정 데이터로 해석하지 않는다.

- 일상기도의 번호별 제목은 처음에 접힌 아코디언으로 표시한다. 여러 항목을 동시에 열 수 있으며 현재·이전 상세에 동일하게 적용한다. 번호 제목 구조가 없는 원문은 그대로 표시한다. 버튼과 aria-expanded/controls로 키보드 조작을 지원한다. 카드 대신 가는 구분선과 최소 56px 제목 행을 사용한다. 펼친 제목은 초록색, 화살표는 180도 회전하며 본문 높이·투명도가 200ms 동안 전환된다. 동작 줄이기 설정에서는 전환을 끈다.

- Existing components to reuse: `fs()` 글자 크기 스케일, 색상 CSS 변수, `ItemList`, 탭의 ARIA 패턴
- New/changed components: 주간 양식은 날짜와 가는 구분선으로 구성하며 카드·번호 배지·장식용 제목을 사용하지 않는다. 넓은 화면은 항목명/본문 두 열, 모바일은 위아래로 정렬한다. 헤더의 이전 양식 버튼을 클릭하면 별도 이전 목록으로 이동한다. 기도문은 카테고리 버튼과 구분선 기반의 읽기 흐름으로 표시하고, 헤더의 이전 기도문 버튼으로 본문 보기를 전환한다.
- Variants and states: 이번 주 양식/기도문 탭, 기도문 4개 카테고리, 로딩, 오류/재시도, 데이터 없음
- Token/component ownership: 토큰은 `src/index.css`, 주간 양식 화면 구성은 `src/pages/MemorizePage.tsx`, 기도문 본문 구성은 `src/components/PrayerContent.tsx`

## Accessibility

- Target standard: WCAG 2.1 AA를 목표로 한다.
- Keyboard/focus behavior: 탭은 버튼과 `tablist`/`tabpanel` 의미를 유지하고, 모든 조작은 키보드로 가능해야 한다.
- Contrast/readability: 본문은 `--ink-0` 또는 `--ink-1`; 비활성 정보만 `--ink-2`를 사용한다.
- Screen-reader semantics: 선택된 탭과 연결 패널을 `aria-selected`, `aria-controls`, `aria-labelledby`로 연결한다.
- Reduced motion and sensory considerations: 필수 기능이 움직임에 의존하지 않는다.

## Responsive behavior

- 기종/물리 해상도가 아닌 CSS viewport 폭으로 전환한다. 600px 미만은 하단 메뉴, 600–1023px은 112px 태블릿 내비게이션 레일, 1024px 이상은 기존 240px 사이드바를 사용한다. 접기·펼치기·회전·분할 화면 전환은 새로고침 없이 반영하며 현재 화면과 글자 설정을 유지한다. 접이식 기기의 정확한 CSS 폭은 브라우저 설정에 따라 달라질 수 있다.

- 전체 사용자 화면은 설정의 1/1.5/2배를 유지한다. 320px·360px 작은 폰을 우선 검증하며 확대 글자를 축소해 맞추지 않는다. 제목·설명은 자연스럽게 줄바꿈하고 조작 행은 필요 시 세로로 재배치한다. 제한 없는 본문에 가로 스크롤·말줄임을 사용하지 않는다.
- 공통 하단 메뉴와 미니 플레이어의 실제 높이를 측정하여 본문 여백과 떠 있는 버튼 위치를 계산한다. 설정의 선택지는 480px 이하·2배에서 한 줄에 하나씩 배치해 모든 옵션을 읽고 원래 크기로 돌아갈 수 있게 한다. 사용자 오버레이도 같은 글자 배율을 상속한다. 관리자 UI는 범위에서 제외한다.

- 기도문 주제 메뉴는 줄바꿈 없이 한 줄을 유지한다. 기본 글자 크기에서는 320px 화면에도 네 버튼이 맞도록 여백을 줄이고 폭을 분배한다. 확대 글자에서는 글자 축소·잘림 대신 메뉴 내부의 가로 스크롤만 허용한다. 버튼 높이는 최소 44px이다.

- 소요리문답 암송은 화면 폭과 관계없이 유형 제목 → 문항/제목 → 본문을 한 열로 배치한다. 본문은 원문의 개행과 빈 줄을 유지한다(사용자 제공 변경 전 이미지 기준).

- Supported breakpoints/devices: 모바일 PWA 우선, 최대 본문 폭 720px의 태블릿/데스크톱 대응
- Layout adaptations: 좁은 화면에서는 기간·레이블이 줄바꿈되어도 본문 폭을 보존한다. 페이지 내부에 viewport 최소 높이를 중복 지정하지 않는다. 하단 메뉴 여백은 공통 Layout이 담당하며, 내용이 화면에 들어오면 스크롤이 없어야 한다.
- Touch/hover differences: 최소 44px에 가까운 탭 조작 영역을 유지하고 hover에 기능을 의존하지 않는다.

## Interaction states

- Loading: 주간 양식 탭 내부에서만 로딩 메시지를 표시한다.
- Empty: 주차 데이터 없음과 카테고리별 기도문 데이터 없음 상태를 각각 설명한다.
- Error: 현재 탭의 실패만 표시하고 다른 탭은 계속 사용할 수 있게 한다.
- Success: 별도 성공 토스트는 필요 없다.
- Disabled: 비활성 조작은 현재 없다.
- Offline/slow network: 서비스 워커가 앱 껍질을 유지하며, API 콘텐츠 실패는 명시적으로 안내한다.

## Content voice

- 기도문은 현재·이전 목록·상세 어디에서도 시작일/종료일을 표시하지 않는다. 이전 목록은 제목으로 식별하며, 기간별 묶음과 정렬은 내부 데이터 기준으로만 유지한다.

- Tone: 담백하고 따뜻하며 종교적 표현을 과장하지 않는다.
- Terminology: `이번 주 양식`, `이전 양식`, `기도문`을 일관되게 사용한다.
- Microcopy rules: 행동을 요구하기보다 현재 상태를 짧고 분명하게 알린다.

## Implementation constraints

- Framework/styling system: React 18, TypeScript strict, inline styles와 기존 CSS 변수
- Design-token constraints: 새 색상·폰트·UI 라이브러리를 추가하지 않는다.
- Performance constraints: 추가 이미지·패키지·무거운 애니메이션을 넣지 않는다.
- Compatibility constraints: PWA, 다크 모드, `--font-scale` 1/1.5/2 배율을 유지한다.
- Test/screenshot expectations: 타입 검사와 프로덕션 빌드; 실제 모바일 폭에서 탭과 긴 본문을 확인한다.

## Open questions

- [ ] 기도문 데이터의 작성 주체·공개 범위 / 제품 담당 / 관리자 설계에 영향
- [ ] 기도문에 저장·공유·낭독 기능이 필요한지 / 제품 담당 / 후속 상호작용 범위에 영향
