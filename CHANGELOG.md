# Changelog

All notable changes to Marklog will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-16

### Added

#### 핵심 기능
- **새 탭 대체**: 브라우저 새 탭을 Marklog 대시보드로 대체
- **즐겨찾기 영역**: 자주 사용하는 사이트 8개씩 페이지별 관리
- **폴더 기반 북마크**: 폴더별로 사이트 분류 및 관리 (4열 × 2행 그리드)
- **사이트 관리**: 각 폴더 내 사이트 추가/수정/삭제

#### 검색 기능
- **통합 검색**: 사이트 이름, URL, 메모에서 검색
- **초성 검색**: 한글 초성으로 검색 가능 (예: "ㄴㅇㅂ" → "네이버")
- **키보드 네비게이션**: 화살표 키로 검색 결과 이동, Enter로 바로 접속

#### UI/UX
- **검색창 가운데 정렬**: 상단 중앙에 검색창 배치
- **설정 버튼**: 우측 상단 설정 접근
- **파비콘 자동 표시**: Google Favicon API 활용
- **폴더 이모지**: 각 폴더에 이모지 아이콘 설정 가능
- **반응형 디자인**: 다양한 화면 크기 지원

#### 페이지네이션
- **즐겨찾기**: 8개 초과 시 페이지 전환 (좌우 화살표)
- **폴더**: 8개 초과 시 페이지 전환 (좌우 화살표)
- **페이지 인디케이터**: 현재 페이지 / 전체 페이지 표시

#### 설정
- **테마**: 라이트/다크 모드 전환
- **즐겨찾기 표시**: 즐겨찾기 영역 숨기기/표시 설정
- **폴더 줄 수**: 1줄 또는 2줄 선택
- **강제 동기화**: 수동 동기화 버튼
- **데이터 백업/복원**: JSON 파일로 내보내기/가져오기

#### 편의 기능
- **클릭 옵션**: 
  - 일반 클릭: 현재 탭에서 열기
  - Ctrl+클릭: 새 탭에서 열기
  - Shift+클릭: 새 창에서 열기
- **키보드 단축키**:
  - `/`: 검색창으로 이동
  - `Esc`: 모달/검색 닫기
  - `↑↓`: 검색 결과 이동
  - `Enter`: 선택한 사이트 열기
- **드래그앤드롭**: 즐겨찾기, 사이트 순서 변경 및 폴더 간 이동
- **길게 누르기**: 즐겨찾기 항목 수정 모달 열기

#### 데이터 관리
- **Chrome Storage Sync**: 구글/마이크로소프트 계정 동기화 지원
- **LocalStorage 폴백**: 개발/테스트 환경 지원
- **샘플 데이터**: 첫 설치 시 예시 데이터 제공

### Technical Details
- **Manifest Version**: 3 (최신 Chrome Extension 표준)
- **지원 브라우저**: Chrome, Edge (Chromium 기반)
- **외부 의존성**: 없음 (순수 HTML/CSS/JavaScript)

---

## Roadmap (예정)

### [1.1.0] - 예정
- [ ] 방향키로 즐겨찾기/폴더/사이트 간 이동
- [ ] 폴더 드래그앤드롭 순서 변경

### [1.2.0] - 예정
- [ ] 사용자 정의 배경 이미지/색상
- [ ] 위젯 추가 (시계, 날씨 등)
- [ ] 다국어 지원

---

## Links
- **GitHub**: https://github.com/GOODJINC/Marklog
- **Issues**: https://github.com/GOODJINC/Marklog/issues
