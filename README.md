# Mist Atelier · 공개 원문 자료실

[사이트 열기](https://idtenev.github.io/mist-atelier-public/) · [출처·범위·데이터 처리](https://idtenev.github.io/mist-atelier-public/policy/) · [정정 문의](https://github.com/IDTenev/mist-atelier-public/issues)

이 저장소는 승인된 한국어 MCU 안내 4개, 필요한 라이선스 고지, 사이트 디자인 자산, 아래 승인 원문과 정적 파일을 담습니다. 개발 저장소와 Git 이력은 분리되어 있으며 사내 원문·비공개 수집 영수증·개발 문서는 포함하지 않습니다.

## 이용 안내

사이트에서 보드·SDK·본문 검색, 안내 HTML·Markdown·JSON, 출처와 변경 이력을 볼 수 있습니다. 검색·이력 필터에는 JavaScript가 필요하며 본문은 JavaScript 없이 읽을 수 있습니다. JSON은 배포 시점의 정적 자료이며 서버 검색 API가 아닙니다. 실기 검증·전체 임베디드 원문 공개·AI 학습 허가를 의미하지 않습니다.

## 권리와 디자인

문서별 출처·판본·라이선스는 각 안내와 guide-files/licenses/ 고지를 확인하세요. 로고는 운영자 제공 자산, 배경은 생성형 이미지로 만든 장식입니다. 사이트 전체나 자산에 대한 별도 일반 재사용 라이선스는 부여하지 않습니다.

## 배포 구조

main 브랜치의 루트를 GitHub Pages에서 제공합니다. .nojekyll로 Jekyll 변환을 하지 않습니다. pages_manifest.json은 파일별 SHA-256과 크기를 기록합니다. 수정은 비공개 개발 프로젝트에서 승인·생성·검증 후 이 저장소에 일반 commit/push로 반영합니다. 개발 저장소 전체를 복사하거나 이곳에 원문을 직접 추가하지 마세요.

HTML은 noindex 요청 중이지만 공개 접근 보호가 아닙니다. 철회 후에도 과거 Git 이력·복사본·호스팅 캐시에 내용이 남을 수 있습니다. 운영 계정은 IDTenev이며 민감정보를 공개 이슈에 올리지 마세요.

## 권리 확인 원문 공개

추가로 고정 원문 36,654개를 공개합니다. 6,875개는 권리·민감정보 검토 사유로 보류합니다. source-files/는 SHA-256 기준 중복 제거한 바이트 동일 텍스트 원문(PDF 제외), source-licenses/는 라이선스 전문, api/sources/는 공개 원문만 포함한 분할 색인입니다. 원문 파일과 고지를 함께 읽으세요. 원문의 이용은 해당 라이선스가 정하며 사이트 디자인 정책으로 추가 제한하지 않습니다. 자료실 검색은 저장소·파일명·자료 유형·라이선스 검색이며 본문 전체 검색은 아닙니다. 상세 뷰어에는 JavaScript가 필요하고 저장소별 HTML 목록의 원문 텍스트 링크는 JavaScript 없이 동작합니다.

자료별 Hits는 텍스트 또는 데이터시트 가공 본문 표시에서만 요청합니다. 검색·목록·통계 방문은 증가시키지 않습니다. 기존 페이지 조회수와 별도이며 고유 방문자나 독서 완료 수가 아닙니다. 통계는 수집·배포 시점 스냅샷입니다. 미집계·일부 확인을 0이나 전체로 바꾸지 않습니다. 자세한 기준과 개인정보는 statistics/와 policy/를 확인하세요.

## 열람 통계

[전체·분류별 통계](https://idtenev.github.io/mist-atelier-public/statistics/) · [자료별 전체 목록](https://idtenev.github.io/mist-atelier-public/statistics/documents/1/)

자동 실시간 갱신은 아닙니다. 공개 승인 자료만 합산하고 태그 중복은 전체에 더하지 않습니다.

## 데이터시트 재구성

공개 승인 가공본 2개 / 8쪽을 datasheets/와 api/datasheets/에서 제공합니다. 원저작자·원본 해시·변경·CC BY-SA 4.0 조건을 표시합니다. 제조사 전문 가공본은 공개 권한 확인 전까지 로컬에만 보관합니다. 본문·표 후보·청크는 자동 구조화 결과이며 그래프·도식·수식의 의미 전사와 전수 기술 검증은 미완료입니다. PDF는 이 빌드에서 제공하지 않습니다. 원본 로컬 파일과 과거 공개 저장소 이력·캐시의 파일은 삭제하지 않습니다.

## ESP 탐색

[전체 계열](https://idtenev.github.io/mist-atelier-public/esp/) · [보드·도구](https://idtenev.github.io/mist-atelier-public/esp/boards/) · [모듈·SiP](https://idtenev.github.io/mist-atelier-public/esp/modules/)

15계열, 55개 품번, 보드·도구 47개, 모듈 자료 46개를 고정 보유 목록에서 연결합니다. 전 SKU 목록·최신 SDK 지원·전문 공개를 뜻하지 않습니다.
