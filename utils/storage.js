/* ============================================
   storage.js - 데이터 저장 및 불러오기 담당
   ============================================
   
   이 파일은 북마크 데이터를 브라우저에 저장하고 불러오는 기능을 담당합니다.
   chrome.storage.sync를 사용하여 구글/마이크로소프트 계정으로 자동 동기화됩니다.
   
   [주요 함수]
   - loadData(): 저장된 데이터 불러오기
   - saveData(): 데이터 저장하기
   - exportData(): JSON 파일로 내보내기
   - importData(): JSON 파일에서 가져오기
*/

// ===== 기본 데이터 구조 =====
// 처음 사용할 때 이 구조로 시작합니다
const DEFAULT_DATA = {
  // 설정값
  settings: {
    theme: 'light',           // 'light' 또는 'dark'
    showFavorites: true,      // 즐겨찾기 표시 여부
    folderRows: 2             // 폴더 줄 수 (1 또는 2)
  },
  
  // 즐겨찾기 목록
  favorites: [],
  
  // 폴더 및 사이트 목록
  folders: []
};

// ===== 샘플 데이터 (처음 설치 시 예시) =====
const SAMPLE_DATA = {
  settings: {
    theme: 'light',
    showFavorites: true,
    folderRows: 2
  },
  
  favorites: [
    { id: 'fav1', name: '네이버', url: 'https://naver.com', memo: '포털 검색' },
    { id: 'fav2', name: '구글', url: 'https://google.com', memo: '검색엔진' },
    { id: 'fav3', name: '유튜브', url: 'https://youtube.com', memo: '동영상' }
  ],
  
  folders: [
    {
      id: 'folder1',
      name: '포털',
      emoji: '🌐',
      sites: [
        { id: 'site1', name: '네이버', url: 'https://naver.com', memo: '국내 포털' },
        { id: 'site2', name: '다음', url: 'https://daum.net', memo: '카카오' },
        { id: 'site3', name: '구글', url: 'https://google.com', memo: '검색' }
      ]
    },
    {
      id: 'folder2',
      name: '소셜',
      emoji: '💬',
      sites: [
        { id: 'site4', name: '인스타그램', url: 'https://instagram.com', memo: 'SNS' },
        { id: 'site5', name: '트위터', url: 'https://twitter.com', memo: 'X' },
        { id: 'site6', name: '페이스북', url: 'https://facebook.com', memo: 'Meta' }
      ]
    },
    {
      id: 'folder3',
      name: '쇼핑',
      emoji: '🛒',
      sites: [
        { id: 'site7', name: '쿠팡', url: 'https://coupang.com', memo: '로켓배송' },
        { id: 'site8', name: '11번가', url: 'https://11st.co.kr', memo: 'SK' }
      ]
    },
    {
      id: 'folder4',
      name: '생산성',
      emoji: '📝',
      sites: [
        { id: 'site9', name: '노션', url: 'https://notion.so', memo: '메모 협업' },
        { id: 'site10', name: '슬랙', url: 'https://slack.com', memo: '업무 채팅' }
      ]
    }
  ]
};

// ===== 데이터 불러오기 =====
// 저장된 북마크 데이터를 불러옵니다
async function loadData() {
  return new Promise((resolve) => {
    // chrome.storage가 있으면 크롬 확장 환경
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['linklogData'], (result) => {
        if (result.linklogData) {
          // 저장된 데이터가 있으면 반환
          resolve(result.linklogData);
        } else {
          // 처음 사용 시 샘플 데이터로 시작
          saveData(SAMPLE_DATA);
          resolve(SAMPLE_DATA);
        }
      });
    } else {
      // 개발/테스트 환경에서는 localStorage 사용
      const saved = localStorage.getItem('linklogData');
      if (saved) {
        resolve(JSON.parse(saved));
      } else {
        localStorage.setItem('linklogData', JSON.stringify(SAMPLE_DATA));
        resolve(SAMPLE_DATA);
      }
    }
  });
}

// ===== 데이터 저장하기 =====
// 북마크 데이터를 브라우저에 저장합니다
async function saveData(data) {
  return new Promise((resolve, reject) => {
    // chrome.storage가 있으면 동기화 저장소 사용
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.set({ linklogData: data }, () => {
        if (chrome.runtime.lastError) {
          // 용량 초과 시 local storage로 폴백
          console.warn('sync storage 용량 초과, local storage 사용');
          chrome.storage.local.set({ linklogData: data }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      // 개발/테스트 환경
      localStorage.setItem('linklogData', JSON.stringify(data));
      resolve();
    }
  });
}

// ===== 설정만 저장하기 =====
// 설정값만 변경할 때 사용
async function saveSettings(settings) {
  const data = await loadData();
  data.settings = { ...data.settings, ...settings };
  await saveData(data);
  return data;
}

// ===== 데이터 내보내기 (백업) =====
// JSON 파일로 다운로드
async function exportData() {
  const data = await loadData();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  
  const a = document.createElement('a');
  a.href = url;
  a.download = `linklog-backup-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  
  URL.revokeObjectURL(url);
}

// ===== 데이터 가져오기 (복원) =====
// JSON 파일에서 데이터 복원
async function importData(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        
        // 데이터 구조 검증
        if (!data.settings || !data.favorites || !data.folders) {
          throw new Error('올바른 LinkLog 백업 파일이 아닙니다.');
        }
        
        await saveData(data);
        resolve(data);
      } catch (error) {
        reject(new Error('파일 형식이 올바르지 않습니다.'));
      }
    };
    
    reader.onerror = () => reject(new Error('파일을 읽을 수 없습니다.'));
    reader.readAsText(file);
  });
}

// ===== 강제 동기화 =====
// 현재 데이터를 다시 저장하여 동기화 트리거
async function forceSync() {
  const data = await loadData();
  await saveData(data);
  return data;
}

// ===== 고유 ID 생성 =====
// 각 항목에 고유한 ID를 부여
function generateId(prefix = 'item') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ===== 즐겨찾기 관리 함수들 =====

// 즐겨찾기 추가
async function addFavorite(favorite) {
  const data = await loadData();
  const newFavorite = {
    id: generateId('fav'),
    name: favorite.name,
    url: favorite.url,
    memo: favorite.memo || ''
  };
  data.favorites.push(newFavorite);
  await saveData(data);
  return newFavorite;
}

// 즐겨찾기 수정
async function updateFavorite(id, updates) {
  const data = await loadData();
  const index = data.favorites.findIndex(f => f.id === id);
  if (index !== -1) {
    data.favorites[index] = { ...data.favorites[index], ...updates };
    await saveData(data);
    return data.favorites[index];
  }
  return null;
}

// 즐겨찾기 삭제
async function deleteFavorite(id) {
  const data = await loadData();
  data.favorites = data.favorites.filter(f => f.id !== id);
  await saveData(data);
}

// 즐겨찾기 순서 변경
async function reorderFavorites(fromIndex, toIndex) {
  const data = await loadData();
  const [moved] = data.favorites.splice(fromIndex, 1);
  data.favorites.splice(toIndex, 0, moved);
  await saveData(data);
}

// ===== 폴더 관리 함수들 =====

// 폴더 추가
async function addFolder(folder) {
  const data = await loadData();
  const newFolder = {
    id: generateId('folder'),
    name: folder.name,
    emoji: folder.emoji || '',
    sites: []
  };
  data.folders.push(newFolder);
  await saveData(data);
  return newFolder;
}

// 폴더 수정
async function updateFolder(id, updates) {
  const data = await loadData();
  const index = data.folders.findIndex(f => f.id === id);
  if (index !== -1) {
    data.folders[index] = { 
      ...data.folders[index], 
      ...updates,
      sites: data.folders[index].sites // sites는 유지
    };
    await saveData(data);
    return data.folders[index];
  }
  return null;
}

// 폴더 삭제
async function deleteFolder(id) {
  const data = await loadData();
  data.folders = data.folders.filter(f => f.id !== id);
  await saveData(data);
}

// 폴더 순서 변경
async function reorderFolders(fromIndex, toIndex) {
  const data = await loadData();
  const [moved] = data.folders.splice(fromIndex, 1);
  data.folders.splice(toIndex, 0, moved);
  await saveData(data);
}

// ===== 사이트 관리 함수들 =====

// 사이트 추가
async function addSite(folderId, site) {
  const data = await loadData();
  const folder = data.folders.find(f => f.id === folderId);
  if (folder) {
    const newSite = {
      id: generateId('site'),
      name: site.name,
      url: site.url,
      memo: site.memo || ''
    };
    folder.sites.push(newSite);
    await saveData(data);
    return newSite;
  }
  return null;
}

// 사이트 수정
async function updateSite(folderId, siteId, updates) {
  const data = await loadData();
  const folder = data.folders.find(f => f.id === folderId);
  if (folder) {
    const index = folder.sites.findIndex(s => s.id === siteId);
    if (index !== -1) {
      folder.sites[index] = { ...folder.sites[index], ...updates };
      await saveData(data);
      return folder.sites[index];
    }
  }
  return null;
}

// 사이트 삭제
async function deleteSite(folderId, siteId) {
  const data = await loadData();
  const folder = data.folders.find(f => f.id === folderId);
  if (folder) {
    folder.sites = folder.sites.filter(s => s.id !== siteId);
    await saveData(data);
  }
}

// 사이트 이동 (폴더 간 이동)
async function moveSite(fromFolderId, toFolderId, siteId, toIndex = -1) {
  const data = await loadData();
  const fromFolder = data.folders.find(f => f.id === fromFolderId);
  const toFolder = data.folders.find(f => f.id === toFolderId);
  
  if (fromFolder && toFolder) {
    const siteIndex = fromFolder.sites.findIndex(s => s.id === siteId);
    if (siteIndex !== -1) {
      const [site] = fromFolder.sites.splice(siteIndex, 1);
      if (toIndex === -1) {
        toFolder.sites.push(site);
      } else {
        toFolder.sites.splice(toIndex, 0, site);
      }
      await saveData(data);
      return site;
    }
  }
  return null;
}

// 사이트 순서 변경 (같은 폴더 내)
async function reorderSites(folderId, fromIndex, toIndex) {
  const data = await loadData();
  const folder = data.folders.find(f => f.id === folderId);
  if (folder) {
    const [moved] = folder.sites.splice(fromIndex, 1);
    folder.sites.splice(toIndex, 0, moved);
    await saveData(data);
  }
}
