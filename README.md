# 한손 테트리스

광고, 로그인, 점수 저장 없이 휴대폰에서 실행할 수 있는 설치형 웹앱(PWA)입니다.

## 컴퓨터에서 실행

이 폴더에서 간단한 웹 서버를 실행한 뒤 브라우저로 접속합니다.

```powershell
python -m http.server 8080
```

그다음 `http://localhost:8080`을 엽니다.

## 휴대폰에 설치

이 폴더를 GitHub Pages, Netlify, Cloudflare Pages 같은 HTTPS 웹 호스팅에 올린 뒤 휴대폰으로 주소를 엽니다.

- Android Chrome: 메뉴 → **홈 화면에 추가** 또는 **앱 설치**
- iPhone Safari: 공유 → **홈 화면에 추가**

한 번 실행한 뒤에는 인터넷 없이도 플레이할 수 있습니다.

## GitHub Pages 자동 배포

이 폴더를 공개 GitHub 저장소의 `main` 브랜치에 올리면 포함된 작업 흐름이 자동으로 사이트를 배포합니다. 저장소의 **Settings → Pages → Source**는 **GitHub Actions**로 지정합니다.

## 조작

- 화면 탭: 회전
- 좌우 밀기: 이동
- 아래로 빠르게 밀기: 바로 내리기
- 화면 아래 버튼으로도 조작 가능
