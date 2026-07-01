import { useNavigate } from 'react-router-dom'
import { fs } from '@/lib/fontScale'

const sections = [
  {
    title: '1. 개인정보의 처리 목적',
    body: [
      'Lovizu는 셀라 서비스 제공, 앱 이용 환경 유지, 오류 확인 및 서비스 개선을 위하여 필요한 범위에서 개인정보를 처리합니다.',
      '처리한 개인정보는 위 목적 이외의 용도로 이용하지 않습니다.',
    ],
  },
  {
    title: '2. 개인정보의 처리 및 보유 기간',
    body: [
      'Lovizu는 개인정보 수집 시 동의 받은 보유·이용기간 또는 관계 법령에 따른 보유기간 내에서 개인정보를 처리·보유합니다.',
      '서비스 이용 기록 및 오류 확인 정보는 서비스 제공과 개선에 필요한 기간 동안 보유하며, 목적 달성 후 지체 없이 파기합니다.',
      '관계 법령에 따라 보존이 필요한 경우에는 해당 법령에서 정한 기간 동안 보관할 수 있습니다.',
    ],
  },
  {
    title: '3. 개인정보의 제3자 제공',
    body: [
      'Lovizu는 정보주체의 별도 동의가 있거나 법률에 특별한 규정이 있는 경우를 제외하고 개인정보를 제3자에게 제공하지 않습니다.',
    ],
  },
  {
    title: '4. 외부 서비스 이용',
    body: [
      '셀라는 서비스 제공을 위해 YouTube 관련 미디어 및 썸네일, 카카오 공유 기능, 서비스 이용 통계 확인을 위한 분석 도구 등을 사용할 수 있습니다.',
      '외부 서비스는 각 제공자의 정책에 따라 별도 정보를 처리할 수 있습니다.',
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
      '셀라는 일반 이용자의 회원가입을 제공하지 않으며, 일반 이용자의 아이디, 비밀번호, 휴대전화번호를 수집하지 않습니다.',
      '서비스 이용 과정에서 접속 정보, 기기 및 브라우저 정보, 쿠키, 서비스 이용 기록, 오류 정보가 생성될 수 있습니다.',
      '내 재생목록, 최근 재생, 이어듣기 위치, 앱 설정, 오프라인 저장 콘텐츠 정보는 주로 사용자의 기기 안에 저장됩니다.',
    ],
  },
  {
    title: '7. 개인정보의 파기',
    body: [
      'Lovizu는 개인정보 처리목적이 달성되거나 보유기간이 경과한 경우 지체 없이 해당 개인정보를 파기합니다.',
      '전자 파일은 복구가 어려운 방식으로 삭제하며, 종이 문서는 분쇄 또는 소각합니다.',
    ],
  },
  {
    title: '8. 안전성 확보 조치',
    body: [
      'Lovizu는 개인정보보호법 제29조에 따라 안전성 확보에 필요한 기술적·관리적 조치를 하고 있습니다.',
      '접근 권한 제한, 개인정보 암호화 또는 이에 준하는 보호 조치, 접속기록 관리, 보안 점검 등을 통해 개인정보가 안전하게 처리되도록 노력합니다.',
    ],
  },
  {
    title: '9. 개인정보 보호책임자',
    body: [
      'Lovizu는 개인정보 처리에 관한 업무를 책임지고, 개인정보 처리와 관련한 문의 및 권리 행사를 처리하기 위하여 개인정보 보호책임자를 지정하고 있습니다.',
      '개인정보 보호책임자: Lovizu',
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
              Lovizu는 개인정보 보호 관련 법령에 따라 이용자의 개인정보를 보호하고 권익을 보호하기 위하여 아래와 같이 개인정보 처리방침을 안내합니다.
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
