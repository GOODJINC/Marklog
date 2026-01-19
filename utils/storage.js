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
   
   [v1.1.0 추가]
   - 배경 설정 (색상, 이미지, 그라데이션)
   - 폴더별 색상 설정
*/

// ===== 기본 데이터 구조 =====
// 처음 사용할 때 이 구조로 시작합니다
const DEFAULT_DATA = {
  // 설정값
  settings: {
    theme: 'light',           // 'light' 또는 'dark'
    showFavorites: true,      // 즐겨찾기 표시 여부
    folderRows: 2,            // 폴더 줄 수 (1 또는 2)
    folderScrollMode: 'fixed', // 폴더 스크롤 모드 ('fixed': 고정 높이, 'auto': 자동 높이)
    language: 'auto',         // 언어 설정 ('auto', 'en', 'ko')
    // v1.1.0 추가: 배경 설정
    background: {
      type: 'color',          // 'color', 'gradient', 'image'
      color: '',              // 단색 배경 (빈 값이면 테마 기본색)
      gradient: '',           // 그라데이션 CSS
      imageUrl: '',           // 이미지 URL
      opacity: 1              // 배경 불투명도 (0~1)
    }
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
    folderRows: 2,
    folderScrollMode: 'fixed',
    language: 'auto',
    background: {
      type: 'color',
      color: '',
      gradient: '',
      imageUrl: '',
      opacity: 1
    }
  },
  
  favorites: [
    { id: 'fav1', name: 'Google', url: 'https://google.com', memo: 'Search Engine' },
    { id: 'fav2', name: 'YouTube', url: 'https://youtube.com', memo: 'Video Platform' },
    { id: 'fav3', name: 'Naver', url: 'https://naver.com', memo: 'Portal Search' }
  ],
  
  folders: [
    {
      id: 'folder1',
      name: 'Search',
      emoji: '🌐',
      color: '',  // v1.1.0: 폴더 색상 (빈 값이면 기본색)
      sites: [
        { id: 'site1', name: 'Google', url: 'https://google.com', memo: 'Search Engine' },
        { id: 'site2', name: 'Duckduckgo', url: 'https://duckduckgo.com/', memo: 'Privacy Search' },
        { id: 'site3', name: 'Naver', url: 'https://naver.com', memo: 'Portal Search' }
      ]
    },
    {
      id: 'folder2',
      name: 'SNS',
      emoji: '💬',
      color: '',
      sites: [
        { id: 'site4', name: 'Instagram', url: 'https://instagram.com', memo: 'SNS' },
        { id: 'site5', name: 'X', url: 'https://x.com/', memo: 'Twitter' },
        { id: 'site6', name: 'Facebook', url: 'https://facebook.com', memo: 'Meta' }
      ]
    },
    {
      id: 'folder3',
      name: 'Productivity',
      emoji: '📝',
      color: '',
      sites: [
        { id: 'site7', name: 'Evernote', url: 'https://evernote.com/', memo: 'Note Taking' },
        { id: 'site8', name: 'Notion', url: 'https://notion.so', memo: 'Note & Collaboration' },
        { id: 'site9', name: 'Slack', url: 'https://slack.com', memo: 'Workplace Chat' }
      ]
    },
    {
      id: 'folder5',
      name: 'AI Tools',
      emoji: '🤖',
      color: '',
      sites: [
        { id: 'site10', name: 'ChatGPT', url: 'https://chatgpt.com', memo: 'Conversational AI Chatbot' },
        { id: 'site11', name: 'Gemini', url: 'https://gemini.google.com', memo: 'Multimodal AI Chatbot' },
        { id: 'site12', name: 'Claude', url: 'https://claude.ai', memo: 'Assistant AI Chatbot' }
     ]
}
  ]
};

// ===== 데이터 마이그레이션 =====
// 이전 버전 데이터를 새 버전 구조로 변환
function migrateData(data) {
  // settings.background가 없으면 추가
  if (!data.settings.background) {
    data.settings.background = {
      type: 'color',
      color: '',
      gradient: '',
      imageUrl: '',
      opacity: 1
    };
  }

  // folderScrollMode가 없으면 추가
  if (!data.settings.folderScrollMode) {
    data.settings.folderScrollMode = 'fixed';
  }

  // language가 없으면 추가
  if (!data.settings.language) {
    data.settings.language = 'auto';
  }

  // 각 폴더에 color 필드가 없으면 추가
  data.folders.forEach(folder => {
    if (folder.color === undefined) {
      folder.color = '';
    }
  });

  return data;
}

// ===== 데이터 불러오기 =====
// 저장된 북마크 데이터를 불러옵니다
async function loadData() {
  return new Promise((resolve) => {
    // chrome.storage가 있으면 크롬 확장 환경
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.sync) {
      chrome.storage.sync.get(['marklogData'], (result) => {
        if (result.marklogData) {
          // 저장된 데이터가 있으면 마이그레이션 후 반환
          resolve(migrateData(result.marklogData));
        } else {
          // 이전 linklogData 확인 (이름 변경 호환성)
          chrome.storage.sync.get(['linklogData'], (oldResult) => {
            if (oldResult.linklogData) {
              const migratedData = migrateData(oldResult.linklogData);
              saveData(migratedData);
              resolve(migratedData);
            } else {
              // 처음 사용 시 샘플 데이터로 시작
              saveData(SAMPLE_DATA);
              resolve(SAMPLE_DATA);
            }
          });
        }
      });
    } else {
      // 개발/테스트 환경에서는 localStorage 사용
      const saved = localStorage.getItem('marklogData') || localStorage.getItem('linklogData');
      if (saved) {
        resolve(migrateData(JSON.parse(saved)));
      } else {
        localStorage.setItem('marklogData', JSON.stringify(SAMPLE_DATA));
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
      chrome.storage.sync.set({ marklogData: data }, () => {
        if (chrome.runtime.lastError) {
          // 용량 초과 시 local storage로 폴백
          console.warn('sync storage 용량 초과, local storage 사용');
          chrome.storage.local.set({ marklogData: data }, () => {
            resolve();
          });
        } else {
          resolve();
        }
      });
    } else {
      // 개발/테스트 환경
      localStorage.setItem('marklogData', JSON.stringify(data));
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

// ===== 배경 설정 저장 =====
async function saveBackground(background) {
  const data = await loadData();
  data.settings.background = { ...data.settings.background, ...background };
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
  a.download = `marklog-backup-${new Date().toISOString().slice(0, 10)}.json`;
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
          throw new Error('올바른 Marklog 백업 파일이 아닙니다.');
        }
        
        // 마이그레이션 적용
        const migratedData = migrateData(data);
        await saveData(migratedData);
        resolve(migratedData);
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
    color: folder.color || '',  // v1.1.0: 폴더 색상
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
