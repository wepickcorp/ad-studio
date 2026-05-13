// app/api/research/route.js
const API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `당신은 빼기(BBAEGI) 광고 소재 자동 제작 에이전트의 자료조사 모듈입니다.

빼기(BBAEGI)는 위픽코퍼레이션의 AI 마케팅 자동화 강의 플랫폼입니다.
- 슬로건: "1강의 = 1자동화"
- 주요 도구: ChatGPT, Make, n8n
- 타겟: 실무 마케터 + 프리랜서
- 브랜드 컬러: #FF2D55 (핫 핑크)
- 차별점: 단순 이론이 아닌, 위픽 캠페인팀이 실무에서 매일 돌리는 자동화 워크플로우 공개

당신의 역할:
주제(강의명)을 받아서, 해당 강의를 광고하기 위한 마케팅 트렌드/소구점 3가지를 빼기 브랜드 톤에 맞게 분석합니다.
- "월 300만원 부수입" 같은 부업 톤은 빼기 브랜드와 안 맞음
- "반복 업무 자동화로 실무 효율" 톤이 맞음
- 빼기 슬로건 "1강의 = 1자동화"를 활용한 메시지 일관성 강조

응답은 반드시 다음 JSON 형식으로만:
{
  "summary": "전체 요약 (2-3문장)",
  "points": [
    "소구점 1: ... (한 줄 요약)",
    "소구점 2: ...",
    "소구점 3: ..."
  ]
}

JSON 외 다른 텍스트, 마크다운 코드블록도 절대 포함하지 마세요. 순수 JSON만 출력.`

export async function POST(request) {
  if (!API_KEY) {
    return new Response('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.', { status: 500 })
  }

  try {
    const { courseName, target, tone, referenceUrl } = await request.json()

    if (!courseName || !courseName.trim()) {
      return new Response('courseName은 필수입니다.', { status: 400 })
    }

    const userPrompt = `강의 정보:
- 강의명/주제: ${courseName}
- 타겟: ${target || '미지정'}
- 톤앤매너: ${tone || '미지정'}
- 레퍼런스 URL: ${referenceUrl || '없음'}

이 강의 광고용 마케팅 트렌드/소구점 3가지를 빼기 브랜드 톤에 맞게 분석해주세요.`

    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 2000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      return new Response(`Claude API 호출 실패: ${errText}`, { status: response.status })
    }

    const data = await response.json()
    const text = data.content?.[0]?.text || ''
    const cleaned = text.replace(/```json\n?|```\n?/g, '').trim()

    try {
      const parsed = JSON.parse(cleaned)
      return Response.json(parsed)
    } catch {
      return Response.json({ summary: text, points: [] })
    }
  } catch (e) {
    return new Response('자료조사 실행 중 오류: ' + e.message, { status: 500 })
  }
}
