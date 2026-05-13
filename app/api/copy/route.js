// app/api/copy/route.js
const API_KEY = process.env.ANTHROPIC_API_KEY

const SYSTEM_PROMPT = `당신은 빼기(BBAEGI) 광고 소재 카피라이터입니다.

브랜드 톤:
- "1강의 = 1자동화" 슬로건 활용 가능
- 실무 마케터 대상 (부업 톤은 피하고 실무 효율 톤으로)
- 신뢰감 있고 모던한 강의 플랫폼 분위기
- 브랜드 컬러: #FF2D55

당신의 역할:
주어진 강의 정보 + 자료조사 결과를 바탕으로:
1. 강력한 헤드라인 (1줄, 임팩트 있게, 한국어)
2. 서브텍스트 (1-2줄)
3. CTA 버튼 텍스트 (3-6자)
4. Figma 레이어에 즉시 매핑 가능한 JSON 데이터

응답은 반드시 다음 JSON 형식으로만 (코드블록 없이 순수 JSON):
{
  "headline": "강력한 한 줄 헤드라인",
  "subtext": "헤드라인을 뒷받침하는 서브텍스트",
  "cta": "강의 신청하기",
  "figmaJson": {
    "Hero_Section": {
      "Badge": "1강의 = 1자동화",
      "Title": "...",
      "Subtext": "...",
      "Button": "..."
    },
    "Brand_Color": {
      "Primary": "#FF2D55",
      "Background": "#FFFFFF",
      "Text_Main": "#0A0A0A",
      "Text_Sub": "#6B7280"
    },
    "Sub_Benefits": {
      "Point_01": "...",
      "Point_02": "...",
      "Point_03": "..."
    }
  }
}`

export async function POST(request) {
  if (!API_KEY) {
    return new Response('ANTHROPIC_API_KEY 환경변수가 설정되지 않았습니다.', { status: 500 })
  }

  try {
    const { form, research } = await request.json()

    const userPrompt = `강의 정보:
- 강의명/주제: ${form.courseName}
- 타겟: ${form.target || '미지정'}
- 톤앤매너: ${form.tone || '강의 플랫폼 톤, 신뢰감'}

자료조사 결과:
${research || '(자료조사 결과 없음)'}

위 정보로 광고 소재 카피와 Figma JSON을 생성해주세요.`

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
      return new Response('카피 응답 파싱 실패. 원본: ' + text.slice(0, 300), { status: 500 })
    }
  } catch (e) {
    return new Response('카피 생성 중 오류: ' + e.message, { status: 500 })
  }
}
