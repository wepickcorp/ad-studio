# ad-studio

빼기(BBAEGI) 광고 소재 자동 제작 에이전트.

## 워크플로우

```
입력 폼 (강의명, 타겟, 톤앤매너, 비율 등)
  ↓
1. 자료조사 (Claude API + 빼기 브랜드 컨텍스트)
  ↓
2. 카피 + Figma JSON 생성 (Claude API)
  ↓
3. 이미지 생성 (Google Gemini 2.5 Flash Image - Nano Banana, 무료 티어)
  ↓
4. 저장 (Notion DB + GitHub repo)
```

## 환경변수 (Vercel에 등록)

| 변수명 | 용도 | 발급 위치 |
|---|---|---|
| `ANTHROPIC_API_KEY` | Claude API (자료조사, 카피) | https://console.anthropic.com |
| `GEMINI_API_KEY` | Gemini 이미지 생성 | https://aistudio.google.com/app/apikey |
| `NOTION_TOKEN` | Notion DB 적재 | https://www.notion.so/profile/integrations |
| `NOTION_AD_STUDIO_DB_ID` | Notion DB ID | (DB 만든 후 URL에서 추출) |
| `GITHUB_TOKEN` | 이미지 영구 저장 | https://github.com/settings/tokens |
| `GITHUB_AD_STUDIO_REPO` | GitHub 저장소 (예: wepickcorp/heypick) | - |
| `GITHUB_AD_STUDIO_PATH` | 저장 경로 (예: public/ad-studio-assets) | - |

## 개발

```bash
npm install
npm run dev
# http://localhost:3000
```

## 배포

Vercel에 연결하면 자동 배포.
