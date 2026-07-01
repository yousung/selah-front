import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'

const sections = [
  {
    title: '1. 개인정보의 처리 목적',
    body: [
      '‘감성개발자’는 다음의 목적을 위하여 개인정보를 처리하고 있으며, 다음의 목적 이외의 용도로는 이용하지 않습니다.',
      '고객 가입의사 확인, 고객에 대한 서비스 제공에 따른 본인 식별·인증, 회원자격 유지·관리, 물품 또는 서비스 공급에 따른 금액 결제, 물품 또는 서비스의 공급·배송 등',
    ],
  },
  {
    title: '2. 개인정보의 처리 및 보유 기간',
    body: [
      '‘감성개발자’는 정보주체로부터 개인정보를 수집할 때 동의 받은 개인정보 보유·이용기간 또는 법령에 따른 개인정보 보유·이용기간 내에서 개인정보를 처리·보유합니다.',
      '고객 가입 및 관리: 서비스 이용계약 또는 회원가입 해지시까지, 다만 채권·채무관계 잔존시에는 해당 채권·채무관계 정산시까지',
      '전자상거래에서의 계약·청약철회, 대금결제, 재화 등 공급기록: 5년',
    ],
  },
  {
    title: '3. 개인정보의 제3자 제공',
    body: [
      '‘감성개발자’는 정보주체의 별도 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우 외에는 개인정보를 제3자에게 제공하지 않습니다.',
    ],
  },
  {
    title: '4. 개인정보처리 위탁',
    body: [
      '‘감성개발자’는 원활한 개인정보 업무처리를 위하여 다음과 같이 개인정보 처리업무를 위탁하고 있습니다.',
      '위탁받는 자(수탁자): 안유성',
      '위탁하는 업무의 내용: 구매 및 요금 결제, 물품배송 또는 청구서 등 발송, 본인인증, 요금추심, 회원제 서비스 이용에 따른 본인확인, 불만처리 등 민원처리, 고지사항 전달, 신규 서비스 개발 및 맞춤 서비스 제공, 이벤트 및 광고성 정보 제공 및 참여기회 제공, 영상정보처리기기 운영',
      '위탁기간: 지체없이 파기',
    ],
  },
  {
    title: '5. 정보주체의 권리, 의무 및 그 행사방법',
    body: [
      '이용자는 개인정보주체로서 개인정보 열람요구, 오류 등이 있을 경우 정정 요구, 삭제요구, 처리정지 요구를 행사할 수 있습니다.',
    ],
  },
  {
    title: '6. 처리하는 개인정보의 항목',
    body: [
      '필수항목: 비밀번호, 로그인ID, 이름, 이메일',
      '선택항목: 휴대전화번호, 전화번호',
    ],
  },
  {
    title: '7. 개인정보의 파기',
    body: [
      '‘감성개발자’는 원칙적으로 개인정보 처리목적이 달성된 경우에는 지체없이 해당 개인정보를 파기합니다.',
      '파기절차: 이용자가 입력한 정보는 목적 달성 후 별도의 DB에 옮겨져 내부 방침 및 기타 관련 법령에 따라 일정기간 저장된 후 혹은 즉시 파기됩니다. 이 때, DB로 옮겨진 개인정보는 법률에 의한 경우가 아니고서는 다른 목적으로 이용되지 않습니다.',
      '파기기한: 이용자의 개인정보는 개인정보의 보유기간이 경과된 경우에는 보유기간의 종료일로부터 5일 이내에, 개인정보의 처리 목적 달성, 해당 서비스의 폐지, 사업의 종료 등 개인정보가 불필요하게 되었을 때에는 그 처리가 불필요한 것으로 인정되는 날로부터 5일 이내에 파기합니다.',
    ],
  },
  {
    title: '8. 안전성 확보 조치',
    body: [
      '‘감성개발자’는 개인정보보호법 제29조에 따라 안전성 확보에 필요한 기술적·관리적 및 물리적 조치를 하고 있습니다.',
      '개인정보 취급 직원의 최소화 및 교육, 정기적인 자체 감사 실시, 내부관리계획의 수립 및 시행, 개인정보의 암호화, 해킹 등에 대비한 기술적 대책, 개인정보에 대한 접근 제한, 접속기록의 보관 및 위변조 방지 등을 시행하고 있습니다.',
    ],
  },
  {
    title: '9. 개인정보 보호책임자',
    body: [
      '‘감성개발자’는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 개인정보 보호책임자를 지정하고 있습니다.',
      '개인정보 보호책임자: 안유성',
      '연락처: private@lovizu.com, 010-9898-0929',
    ],
  },
  {
    title: '10. 처리방침 변경',
    body: [
      '이 개인정보처리방침은 시행일로부터 적용됩니다.',
      '법령 및 방침에 따른 변경내용의 추가, 삭제 및 정정이 있는 경우에는 변경사항의 시행 7일 전부터 공지사항을 통하여 고지할 것입니다.',
    ],
  },
]

export default function PrivacyPage() {
  const navigate = useNavigate()

  return (
    <div style={{ background: 'var(--surface-0)', minHeight: '100dvh' }}>
      <header
        className="sticky top-0 z-10 safe-top"
        style={{ background: 'var(--surface-0)', borderBottom: '1px solid var(--divider)' }}
      >
        <div style={{ minHeight: 56, padding: '0 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="뒤로가기"
            style={{
              width: 40,
              height: 40,
              borderRadius: 10,
              border: 'none',
              background: 'transparent',
              color: 'var(--ink-1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.1} strokeLinecap="round" strokeLinejoin="round">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
          <h1 style={{ fontSize: fs(18), fontWeight: 700, color: 'var(--ink-0)' }}>개인정보 처리방침</h1>
        </div>
      </header>

      <main style={{ padding: '20px 16px 96px' }}>
        <section style={{ maxWidth: 720, margin: '0 auto' }}>
          <div style={{ marginBottom: 22 }}>
            <p style={{ fontSize: fs(14), lineHeight: 1.75, color: 'var(--ink-1)' }}>
              감성개발자는 개인정보 보호 관련 법령에 따라 이용자의 개인정보를 보호하고 권익을 보호하기 위하여 아래와 같이 개인정보 처리방침을 안내합니다.
            </p>
            <p style={{ marginTop: 8, fontSize: fs(12), color: 'var(--ink-3)' }}>
              시행일: 2026년 7월 1일
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {sections.map((section) => (
              <article
                key={section.title}
                style={{
                  borderTop: '1px solid var(--divider)',
                  paddingTop: 16,
                }}
              >
                <h2 style={{ fontSize: fs(15), fontWeight: 700, color: 'var(--primary-700)', marginBottom: 8 }}>
                  {section.title}
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                  {section.body.map((paragraph) => (
                    <p key={paragraph} style={{ fontSize: fs(13), lineHeight: 1.75, color: 'var(--ink-1)' }}>
                      {paragraph}
                    </p>
                  ))}
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
