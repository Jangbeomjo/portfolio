# Portfolio — Inline Editor CMS

정적 포트폴리오 + GitHub JSON 기반 인라인 편집 시스템

## 사용 방법

1. `data/cms-config.json`에 GitHub OAuth App Client ID와 저장소 정보를 설정합니다.
2. 사이트 우측 상단 **편집** 버튼을 클릭합니다.
3. GitHub OAuth(Device Flow)로 로그인합니다.
4. 저장소 쓰기 권한이 있는 계정만 편집 모드가 활성화됩니다.
5. 텍스트·이미지·프로젝트·스킬 등을 현재 페이지에서 직접 수정합니다.
6. **저장** 버튼을 누르면 JSON 파일이 GitHub에 Commit되고 Vercel이 자동 재배포합니다.

## Vercel 배포 (404 NOT_FOUND 해결)

이 프로젝트는 **빌드 없는 정적 HTML** 사이트입니다. Jekyll/Next.js가 **아닙니다**.

### Vercel 대시보드 설정 (중요)

1. [vercel.com](https://vercel.com) → 프로젝트 **portfolio** → **Settings** → **General**
2. 아래처럼 맞춥니다:

| 항목 | 값 |
|------|-----|
| Framework Preset | **Other** |
| Root Directory | *(비움 — 저장소 루트)* |
| Build Command | *(비움)* |
| Output Directory | **`.`** 또는 *(비움)* |
| Install Command | *(비움)* |

3. **잘못된 설정 예** (이렇게 되어 있으면 404):
   - Output Directory: `_site`, `public`, `dist`, `build`
   - Framework: Next.js, Jekyll, Create React App

4. **Deployments** → 최신 배포 → **Redeploy** (Use existing Build Cache **끄기**)

5. 배포 URL 확인: `https://<프로젝트명>.vercel.app/`  
   - `portfolio-main.vercel.app` 은 **다른 사람 프로젝트**일 수 있습니다.  
   - Vercel 대시보드 **Domains** 탭에 표시된 **본인 프로젝트 URL**을 사용하세요.

6. `data/seo.json`의 `sitemap.baseUrl`을 실제 Vercel URL로 수정하세요.

### Git push 후 자동 배포

```bash
git add vercel.json
git commit -m "Fix Vercel static deployment config"
git push origin main
```

`vercel.json`이 저장소 루트에 있으면 Vercel이 정적 파일을 올바르게 서빙합니다.

## GitHub OAuth App 설정

1. GitHub → Settings → Developer settings → OAuth Apps → New OAuth App
2. Application name: `Portfolio CMS`
3. Homepage URL: 배포 URL (예: `https://your-site.vercel.app`)
4. **Enable Device Flow** 체크
5. 생성된 Client ID를 `data/cms-config.json`의 `github.clientId`에 입력

## 데이터 구조

```
data/
  profile.json      — 프로필, 연락처, 링크
  projects.json     — 프로젝트 목록
  skills.json       — 기술스택
  education.json    — 학력
  experience.json   — 경력/활동
  certificates.json — 자격증
  training.json     — 교육
  seo.json          — SEO 메타
  theme.json        — 테마/색상
  cms-config.json   — GitHub OAuth·저장소 설정
```

## 아키텍처

- 백엔드 서버 없음 — GitHub REST API를 브라우저에서 직접 호출
- 데이터베이스 없음 — 모든 콘텐츠는 JSON 파일로 관리
- 관리자 페이지 없음 — 현재 페이지에서 인라인 편집
