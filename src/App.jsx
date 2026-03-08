import React, { useState, useEffect } from 'react';

// 초성 검색 함수
const getChosung = (str) => {
  const cho = ['ㄱ','ㄲ','ㄴ','ㄷ','ㄸ','ㄹ','ㅁ','ㅂ','ㅃ','ㅅ','ㅆ','ㅇ','ㅈ','ㅉ','ㅊ','ㅋ','ㅌ','ㅍ','ㅎ'];
  let result = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i) - 44032;
    if (code > -1 && code < 11172) result += cho[Math.floor(code / 588)];
    else result += str.charAt(i);
  }
  return result;
};

const matchSearch = (text, search) => {
  const chosung = getChosung(text);
  return text.toLowerCase().includes(search.toLowerCase()) || 
         chosung.includes(search);
};

const App = () => {
  const [manuals, setManuals] = useState([]);
  const [view, setView] = useState('list');
  const [searchTerms, setSearchTerms] = useState(['', '', '']);
  const [selectedManual, setSelectedManual] = useState(null);
  const [workingData, setWorkingData] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('manualData');
    if (saved) setManuals(JSON.parse(saved));
  }, []);

  const saveManuals = (data) => {
    localStorage.setItem('manualData', JSON.stringify(data));
    setManuals(data);
  };

  const handleImageSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    const imagePromises = files.map(file => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (event) => {
          const img = new Image();
          img.onload = () => {
            resolve({
              id: Date.now() + Math.random(),
              data: event.target.result,
              date: file.lastModifiedDate || new Date(),
              title: '',
              description: ''
            });
          };
          img.src = event.target.result;
        };
        reader.readAsDataURL(file);
      });
    });

    Promise.all(imagePromises).then(images => {
      setWorkingData({ images, currentIndex: 0, groupTitle: '' });
      setView('order');
    });
  };

  const reorderImages = (fromIndex, toIndex) => {
    const newImages = [...workingData.images];
    const [moved] = newImages.splice(fromIndex, 1);
    newImages.splice(toIndex, 0, moved);
    setWorkingData({ ...workingData, images: newImages });
  };

  const saveCurrentItem = (title, description) => {
    const newImages = [...workingData.images];
    newImages[workingData.currentIndex] = {
      ...newImages[workingData.currentIndex],
      title,
      description
    };
    setWorkingData({ ...workingData, images: newImages });
  };

  const nextStep = () => {
    if (workingData.currentIndex < workingData.images.length - 1) {
      setWorkingData({ ...workingData, currentIndex: workingData.currentIndex + 1 });
    } else {
      setView('finalTitle');
    }
  };

  const prevStep = () => {
    if (workingData.currentIndex > 0) {
      setWorkingData({ ...workingData, currentIndex: workingData.currentIndex - 1 });
    }
  };

  const saveFinal = (groupTitle) => {
    const firstDate = workingData.images[0].date;
    const newManual = {
      id: Date.now(),
      groupTitle,
      date: firstDate.toISOString(),
      items: workingData.images.map((img, idx) => ({
        order: idx + 1,
        title: img.title,
        image: img.data,
        description: img.description
      }))
    };
    saveManuals([...manuals, newManual]);
    setWorkingData(null);
    setView('list');
  };

  const deleteManual = (id) => {
    if (!confirm('삭제하시겠습니까?')) return;
    saveManuals(manuals.filter(m => m.id !== id));
    setSelectedManual(null);
    setView('list');
  };

  const filteredManuals = manuals.filter(m => {
    const activeTerms = searchTerms.filter(t => t.trim() !== '');
    if (activeTerms.length === 0) return true;
    return activeTerms.every(term => 
      matchSearch(m.groupTitle, term) ||
      m.items.some(item => matchSearch(item.title, term) || matchSearch(item.description, term))
    );
  });

  if (view === 'order') {
    return <OrderScreen 
      images={workingData.images} 
      onReorder={reorderImages}
      onNext={() => setView('input')}
      onCancel={() => { setWorkingData(null); setView('list'); }}
    />;
  }

  if (view === 'input') {
    return <InputScreen 
      image={workingData.images[workingData.currentIndex]}
      currentIndex={workingData.currentIndex}
      total={workingData.images.length}
      onSave={saveCurrentItem}
      onNext={nextStep}
      onPrev={prevStep}
      onCancel={() => { setWorkingData(null); setView('list'); }}
    />;
  }

  if (view === 'finalTitle') {
    return <FinalTitleScreen 
      date={workingData.images[0].date}
      onSave={saveFinal}
      onCancel={() => setView('input')}
    />;
  }

  if (view === 'detail' && selectedManual) {
    return <DetailScreen 
      manual={selectedManual}
      onBack={() => { setSelectedManual(null); setView('list'); }}
      onDelete={deleteManual}
    />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4 space-y-2">
        {[0, 1, 2].map(idx => (
          <div key={idx} className="flex items-center gap-2">
            <span className="text-gray-500">🔍</span>
            <input
              type="text"
              placeholder={`검색어 ${idx + 1}`}
              className="flex-1 px-4 py-2 border rounded-lg"
              value={searchTerms[idx]}
              onChange={(e) => {
                const newTerms = [...searchTerms];
                newTerms[idx] = e.target.value;
                setSearchTerms(newTerms);
              }}
            />
            {searchTerms[idx] && (
              <button onClick={() => {
                const newTerms = [...searchTerms];
                newTerms[idx] = '';
                setSearchTerms(newTerms);
              }} className="text-gray-400">✕</button>
            )}
          </div>
        ))}
      </div>

      <div className="p-4 space-y-2">
        {filteredManuals.sort((a, b) => new Date(b.date) - new Date(a.date)).map(manual => (
          <div
            key={manual.id}
            onClick={() => { setSelectedManual(manual); setView('detail'); }}
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50"
          >
            <div className="text-sm text-gray-600">
              {new Date(manual.date).toLocaleString('ko-KR')}
            </div>
            <div className="font-semibold">💼 {manual.groupTitle}</div>
          </div>
        ))}
      </div>

      <label className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-2xl cursor-pointer">
        +
        <input
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageSelect}
          className="hidden"
        />
      </label>
    </div>
  );
};

const OrderScreen = ({ images, onReorder, onNext, onCancel }) => {
  const [dragIndex, setDragIndex] = useState(null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-blue-600">← 취소</button>
        <div className="font-bold">순서 조정 ({images.length}장)</div>
        <button onClick={onNext} className="text-blue-600 font-bold">다음</button>
      </div>

      <div className="space-y-2">
        {images.map((img, idx) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => setDragIndex(idx)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragIndex !== null) {
                onReorder(dragIndex, idx);
                setDragIndex(null);
              }
            }}
            className="bg-white p-3 rounded-lg shadow flex items-center gap-3 cursor-move"
          >
            <span className="text-2xl text-gray-400">≡</span>
            <span className="font-bold text-lg">{idx + 1}</span>
            <img src={img.data} alt="" className="w-20 h-20 object-cover rounded" />
          </div>
        ))}
      </div>
    </div>
  );
};

const InputScreen = ({ image, currentIndex, total, onSave, onNext, onPrev, onCancel }) => {
  const [title, setTitle] = useState(image.title || '');
  const [description, setDescription] = useState(image.description || '');

  const handleNext = () => {
    onSave(title, description);
    onNext();
  };

  const handlePrev = () => {
    onSave(title, description);
    onPrev();
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-blue-600">← 취소</button>
        <div className="font-bold">{currentIndex + 1}/{total}</div>
        <div></div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="제목 입력"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <img src={image.data} alt="" className="w-full rounded-lg" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="설명 입력"
            rows={5}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div className="flex gap-2">
          {currentIndex > 0 && (
            <button onClick={handlePrev} className="flex-1 py-3 bg-gray-200 rounded-lg">
              ← 이전
            </button>
          )}
          <button onClick={handleNext} className="flex-1 py-3 bg-blue-600 text-white rounded-lg">
            {currentIndex === total - 1 ? '다음 →' : '다음 →'}
          </button>
        </div>
      </div>
    </div>
  );
};

const FinalTitleScreen = ({ date, onSave, onCancel }) => {
  const [groupTitle, setGroupTitle] = useState('');

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-blue-600">← 뒤로</button>
        <div></div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">전체 제목</label>
          <input
            type="text"
            value={groupTitle}
            onChange={(e) => setGroupTitle(e.target.value)}
            placeholder="예: 냉장고 수리 매뉴얼"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">날짜</label>
          <div className="w-full px-4 py-2 border rounded-lg bg-gray-100">
            📅 {date.toLocaleString('ko-KR')}
          </div>
          <div className="text-xs text-gray-500 mt-1">(이미지 EXIF 기준)</div>
        </div>

        <button
          onClick={() => onSave(groupTitle)}
          className="w-full py-3 bg-blue-600 text-white rounded-lg font-bold"
        >
          저장
        </button>
      </div>
    </div>
  );
};

const DetailScreen = ({ manual, onBack, onDelete }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="sticky top-0 bg-white shadow-sm p-4 flex justify-between items-center">
        <button onClick={onBack} className="text-blue-600">← 뒤로</button>
        <div className="space-x-2">
          <button className="text-blue-600">편집</button>
          <button onClick={() => onDelete(manual.id)} className="text-red-600">삭제</button>
        </div>
      </div>

      <div className="p-4">
        <div className="bg-blue-50 p-3 rounded-lg mb-4">
          <div className="text-sm text-gray-600">
            📅 {new Date(manual.date).toLocaleString('ko-KR')}
          </div>
          <div className="font-bold text-lg">💼 {manual.groupTitle}</div>
        </div>

        <div className="space-y-4">
          {manual.items.map(item => (
            <div key={item.order} className="bg-white p-4 rounded-lg shadow">
              <div className="font-semibold mb-2">{item.order}. {item.title}</div>
              <img src={item.image} alt={item.title} className="w-full rounded-lg mb-2" />
              <div className="text-gray-700 whitespace-pre-wrap">{item.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;
