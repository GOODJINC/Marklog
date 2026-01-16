/* ============================================
   search.js - 검색 기능 담당
   ============================================
   
   이 파일은 북마크 검색 기능을 담당합니다.
   한글 초성 검색을 지원하여 "ㄴㅇㅂ"로 "네이버"를 검색할 수 있습니다.
   
   [주요 함수]
   - searchItems(): 북마크 검색
   - getChosung(): 한글 문자열의 초성 추출
   - matchChosung(): 초성 패턴 매칭
*/

// ===== 한글 초성 테이블 =====
// 가~힣 범위의 한글에서 초성을 추출하기 위한 테이블
const CHOSUNG_LIST = [
  'ㄱ', 'ㄲ', 'ㄴ', 'ㄷ', 'ㄸ', 'ㄹ', 'ㅁ', 'ㅂ', 'ㅃ', 'ㅅ',
  'ㅆ', 'ㅇ', 'ㅈ', 'ㅉ', 'ㅊ', 'ㅋ', 'ㅌ', 'ㅍ', 'ㅎ'
];

// ===== 초성 추출 함수 =====
// 한글 문자열에서 초성만 추출합니다
// 예: "네이버" → "ㄴㅇㅂ"
function getChosung(str) {
  let result = '';
  
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    
    // 한글 범위 체크 (가: 44032, 힣: 55203)
    if (code >= 44032 && code <= 55203) {
      // 초성 인덱스 계산
      // 한글 = 초성(19) * 21 * 28 + 중성(21) * 28 + 종성(28)
      const chosungIndex = Math.floor((code - 44032) / (21 * 28));
      result += CHOSUNG_LIST[chosungIndex];
    } else {
      // 한글이 아니면 그대로 추가
      result += str[i];
    }
  }
  
  return result;
}

// ===== 초성 패턴 매칭 함수 =====
// 검색어가 초성인지 확인하고 매칭 여부를 반환
// 예: matchChosung("네이버", "ㄴㅇㅂ") → true
function matchChosung(text, pattern) {
  // 패턴이 초성으로만 구성되어 있는지 확인
  const isChosungPattern = /^[ㄱ-ㅎ]+$/.test(pattern);
  
  if (isChosungPattern) {
    // 초성 패턴이면 텍스트의 초성과 비교
    const textChosung = getChosung(text);
    return textChosung.includes(pattern);
  }
  
  return false;
}

// ===== 메인 검색 함수 =====
// 즐겨찾기와 폴더의 사이트를 검색합니다
// 이름, URL, 메모에서 검색어를 찾습니다
function searchItems(data, query) {
  if (!query || query.trim() === '') {
    return [];
  }
  
  const results = [];
  const lowerQuery = query.toLowerCase().trim();
  
  // ===== 즐겨찾기에서 검색 =====
  data.favorites.forEach(favorite => {
    if (matchItem(favorite, lowerQuery)) {
      results.push({
        type: 'favorite',
        item: favorite,
        folderId: null,
        folderName: '즐겨찾기'
      });
    }
  });
  
  // ===== 폴더의 사이트에서 검색 =====
  data.folders.forEach(folder => {
    folder.sites.forEach(site => {
      if (matchItem(site, lowerQuery)) {
        results.push({
          type: 'site',
          item: site,
          folderId: folder.id,
          folderName: folder.name
        });
      }
    });
  });
  
  return results;
}

// ===== 개별 항목 매칭 함수 =====
// 항목이 검색어와 매칭되는지 확인
function matchItem(item, query) {
  const name = item.name.toLowerCase();
  const url = item.url.toLowerCase();
  const memo = (item.memo || '').toLowerCase();
  
  // 1. 일반 텍스트 매칭 (이름, URL, 메모)
  if (name.includes(query) || url.includes(query) || memo.includes(query)) {
    return true;
  }
  
  // 2. 초성 매칭 (한글 이름과 메모에서)
  if (matchChosung(item.name, query) || matchChosung(item.memo || '', query)) {
    return true;
  }
  
  return false;
}

// ===== 검색 결과 하이라이트 =====
// 검색어에 해당하는 부분을 강조 표시
function highlightMatch(text, query) {
  if (!text || !query) return text;
  
  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const index = lowerText.indexOf(lowerQuery);
  
  if (index !== -1) {
    const before = text.substring(0, index);
    const match = text.substring(index, index + query.length);
    const after = text.substring(index + query.length);
    return `${before}<mark>${match}</mark>${after}`;
  }
  
  return text;
}
