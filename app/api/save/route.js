// app/api/save/route.js
const NOTION_TOKEN = process.env.NOTION_TOKEN
const NOTION_DB_ID = process.env.NOTION_AD_STUDIO_DB_ID || '2f44ead4561e40188d3e8c99657a00fa'
const GITHUB_TOKEN = process.env.GITHUB_TOKEN
const GITHUB_REPO = process.env.GITHUB_AD_STUDIO_REPO || 'wepickcorp/heypick'
const GITHUB_BASE_PATH = process.env.GITHUB_AD_STUDIO_PATH || 'public/ad-studio-assets'

function timestamp() {
  const now = new Date()
  const pad = (n) => String(n).padStart(2, '0')
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
}

function slugify(text) {
  return (text || 'untitled')
    .toLowerCase()
    .replace(/[^\w가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
}

async function uploadToGitHub(base64Data, filename) {
  if (!GITHUB_TOKEN) throw new Error('GITHUB_TOKEN 미설정')

  const path = `${GITHUB_BASE_PATH}/${filename}`
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${path}`

  let sha = null
  try {
    const existing = await fetch(url, {
      headers: { Authorization: `token ${GITHUB_TOKEN}` },
    })
    if (existing.ok) {
      const data = await existing.json()
      sha = data.sha
    }
  } catch {}

  const body = {
    message: `Add ad-studio asset: ${filename}`,
    content: base64Data,
    branch: 'main',
  }
  if (sha) body.sha = sha

  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      Authorization: `token ${GITHUB_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`GitHub 업로드 실패 (${res.status}): ${errText.slice(0, 200)}`)
  }

  const data = await res.json()
  // heypick에 저장 시 Vercel 공개 URL 변환
  if (GITHUB_REPO === 'wepickcorp/heypick' && path.startsWith('public/')) {
    const publicPath = path.replace(/^public\//, '')
    return {
      githubUrl: data.content.html_url,
      publicUrl: `https://heypick.vercel.app/${publicPath}`,
    }
  }
  return {
    githubUrl: data.content.html_url,
    publicUrl: data.content.download_url,
  }
}

async function createNotionPage({ form, research, copy, imageUrls }) {
  if (!NOTION_TOKEN) throw new Error('NOTION_TOKEN 미설정')

  const today = new Date().toISOString().slice(0, 10)
  const title = `${form.courseName} 광고소재 (${today})`

  const properties = {
    제목: { title: [{ text: { content: title } }] },
    강의명: { rich_text: [{ text: { content: String(form.courseName || '').slice(0, 2000) } }] },
    타겟: { rich_text: [{ text: { content: String(form.target || '').slice(0, 2000) } }] },
    톤앤매너: { rich_text: [{ text: { content: String(form.tone || '').slice(0, 2000) } }] },
    생성일: { date: { start: today } },
    카피_헤드라인: { rich_text: [{ text: { content: String(copy.headline || '').slice(0, 2000) } }] },
    카피_Figma_JSON: {
      rich_text: [{ text: { content: JSON.stringify(copy.figmaJson || {}, null, 2).slice(0, 2000) } }],
    },
    자료조사: { rich_text: [{ text: { content: String(research.summary || '').slice(0, 2000) } }] },
    이미지_비율: { select: { name: form.ratio || '1:1' } },
    주요_모델: { select: { name: 'Gemini' } },
    상태: { select: { name: 'Draft' } },
  }

  if (imageUrls.length > 0) {
    properties.이미지_Gemini = { url: imageUrls[0] }
    properties.이미지_파일 = {
      files: imageUrls.map((url, i) => ({
        type: 'external',
        name: `ad-studio-${i + 1}.png`,
        external: { url },
      })),
    }
    properties.GitHub_링크 = { url: imageUrls[0] }
  }

  const res = await fetch('https://api.notion.com/v1/pages', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${NOTION_TOKEN}`,
      'Content-Type': 'application/json',
      'Notion-Version': '2022-06-28',
    },
    body: JSON.stringify({
      parent: { database_id: NOTION_DB_ID },
      properties,
    }),
  })

  if (!res.ok) {
    const errText = await res.text()
    throw new Error(`Notion 페이지 생성 실패 (${res.status}): ${errText.slice(0, 300)}`)
  }

  const data = await res.json()
  return { recordId: data.id, url: data.url }
}

export async function POST(request) {
  try {
    const { form, research, copy, image } = await request.json()

    const errors = []
    const ts = timestamp()
    const slug = slugify(form.courseName)
    const imageUrls = []
    const githubLinks = []

    if (GITHUB_TOKEN && image?.images?.length > 0) {
      for (let i = 0; i < image.images.length; i++) {
        const img = image.images[i]
        const filename = `${ts}-${slug}-${i + 1}.png`
        try {
          const { githubUrl, publicUrl } = await uploadToGitHub(img.base64, filename)
          imageUrls.push(publicUrl)
          githubLinks.push(githubUrl)
        } catch (e) {
          errors.push(`GitHub 업로드 ${i + 1}: ${e.message}`)
        }
      }
    } else if (!GITHUB_TOKEN) {
      errors.push('GITHUB_TOKEN 없음 — GitHub 업로드 스킵')
    }

    let notionResult = null
    if (NOTION_TOKEN) {
      try {
        notionResult = await createNotionPage({ form, research, copy, imageUrls })
      } catch (e) {
        errors.push(`Notion 저장: ${e.message}`)
      }
    } else {
      errors.push('NOTION_TOKEN 없음 — Notion 저장 스킵')
    }

    return Response.json({
      recordId: notionResult?.recordId || null,
      notionUrl: notionResult?.url || null,
      githubUrls: githubLinks,
      imageUrls,
      errors: errors.length > 0 ? errors : null,
    })
  } catch (e) {
    return new Response('저장 중 오류: ' + e.message, { status: 500 })
  }
}
