// app/api/image/route.js
const GEMINI_API_KEY = process.env.GEMINI_API_KEY
const CLAUDE_API_KEY = process.env.ANTHROPIC_API_KEY

const PROMPT_BUILDER_SYSTEM = `당신은 광고 소재 이미지 생성을 위한 영문 프롬프트 빌더입니다.

주어진 강의 정보 + 카피를 바탕으로, 이미지 생성 모델(Gemini Nano Banana)에 줄 영문 프롬프트를 작성합니다.

규칙:
1. 빼기(BBAEGI) 브랜드 톤: 깔끔한 강의 플랫폼 느낌, 모던, 신뢰감
2. 브랜드 컬러 #FF2D55 (hot pink) 활용
3. 화이트 배경 메인, 한국어 텍스트 가독성 중요
4. "1강의 = 1자동화" 워크플로우 다이어그램이나 ChatGPT/Make/n8n 노드 시각화 포함 가능
5. 사진 같은 사실주의는 피하고, 프리미엄 ed-tech 평면 디자인 + subtle 3D depth
6. 카피 텍스트는 정확한 한국어로 명확히 명시

응답은 영문 프롬프트 단 한 줄만 반환 (JSON 아님, 설명 아님). 약 100-200 단어.`

const RATIO_MAP = {
  '1:1': '1:1 square ratio',
  '9:16': '9:16 portrait vertical ratio',
  '16:9': '16:9 landscape horizontal ratio',
  '4:5': '4:5 portrait ratio',
}

async function buildPrompt({ form, copy }) {
  if (!CLAUDE_API_KEY) return buildSimplePrompt({ form, copy })

  const userPrompt = `강의 정보:
- 강의명: ${form.courseName}
- 타겟: ${form.target || '미지정'}
- 톤앤매너: ${form.tone || '강의 플랫폼 톤'}
- 비율: ${form.ratio}
- 이미지에 카피 포함: ${form.includeCopy ? '예' : '아니오 (텍스트 없는 베이스)'}

카피:
- 헤드라인: ${copy.headline}
- 서브텍스트: ${copy.subtext || ''}
- CTA: ${copy.cta || ''}

위 정보로 Gemini Nano Banana 이미지 생성 프롬프트를 영문으로 작성해주세요.`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': CLAUDE_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        system: PROMPT_BUILDER_SYSTEM,
        messages: [{ role: 'user', content: userPrompt }],
      }),
    })
    if (!response.ok) return buildSimplePrompt({ form, copy })
    const data = await response.json()
    return data.content?.[0]?.text || buildSimplePrompt({ form, copy })
  } catch {
    return buildSimplePrompt({ form, copy })
  }
}

function buildSimplePrompt({ form, copy }) {
  const ratio = RATIO_MAP[form.ratio] || '1:1 square ratio'
  const textPart = form.includeCopy && copy.headline
    ? `Include bold Korean headline text "${copy.headline}" prominently in the image with perfect Korean typography rendering.`
    : 'Do not include any text in the image (clean base for designer to add typography later).'

  return `Korean online course advertisement thumbnail for "${form.courseName}" (BBAEGI/빼기 platform), ${ratio}. Premium modern minimalist design like Inflearn or ClassU course thumbnail. Clean white background. Composition: workflow automation diagram showing ChatGPT, Make, and blog/output nodes connected with hot pink #FF2D55 flow lines. ${textPart} Color palette: white background, hot pink #FF2D55 accent, deep neutral text. Style: premium Korean ed-tech aesthetic, high readability, generous white space, sharp typography, subtle shadows, no clutter, 4K quality, professional course platform feel. Target audience: ${form.target || 'marketers and professionals'}.`
}

export async function POST(request) {
  if (!GEMINI_API_KEY) {
    return new Response('GEMINI_API_KEY 환경변수가 설정되지 않았습니다. Vercel에 등록하세요.', { status: 500 })
  }

  try {
    const { form, copy } = await request.json()
    const count = Math.min(Math.max(Number(form.imageCount) || 2, 1), 4)
    const prompt = await buildPrompt({ form, copy })

    const images = []
    const errors = []

    for (let i = 0; i < count; i++) {
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image-preview:generateContent?key=${GEMINI_API_KEY}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseModalities: ['IMAGE'] },
            }),
          }
        )

        if (!res.ok) {
          const errText = await res.text()
          errors.push(`이미지 ${i + 1}: ${res.status} ${errText.slice(0, 200)}`)
          continue
        }

        const data = await res.json()
        const parts = data.candidates?.[0]?.content?.parts || []
        const imagePart = parts.find((p) => p.inlineData?.data)
        if (imagePart) {
          images.push({
            base64: imagePart.inlineData.data,
            mimeType: imagePart.inlineData.mimeType || 'image/png',
          })
        } else {
          errors.push(`이미지 ${i + 1}: 응답에 이미지 데이터 없음`)
        }
      } catch (e) {
        errors.push(`이미지 ${i + 1}: ${e.message}`)
      }
    }

    if (images.length === 0) {
      return new Response(
        `이미지를 한 장도 생성하지 못했습니다.\n${errors.join('\n')}\n\n무료 한도 초과 가능성이 있습니다.`,
        { status: 500 }
      )
    }

    return Response.json({
      images,
      prompt,
      warning: errors.length > 0 ? `${errors.length}장 실패: ${errors[0]}` : null,
    })
  } catch (e) {
    return new Response('이미지 생성 중 오류: ' + e.message, { status: 500 })
  }
}
