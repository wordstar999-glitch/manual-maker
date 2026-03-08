import React, { useState, useEffect } from 'react';

const App = () => {
  const [groups, setGroups] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);

  useEffect(() => {
    const saved = localStorage.getItem('manualData');
    if (saved) setGroups(JSON.parse(saved));
  }, []);

  const saveData = (data) => {
    localStorage.setItem('manualData', JSON.stringify(data));
    setGroups(data);
  };

  const addNewGroup = () => {
    setEditingGroup({ date: new Date().toISOString().split('T')[0], title: '', items: [] });
  };

  const saveGroup = (groupData) => {
    const updated = editingGroup.id 
      ? groups.map(g => g.id === editingGroup.id ? groupData : g)
      : [...groups, { ...groupData, id: Date.now() }];
    saveData(updated);
    setEditingGroup(null);
  };

  const addItemToGroup = (groupId) => {
    setEditingItem({ groupId, title: '', description: '', image: null, order: 0 });
  };

  const saveItem = (itemData) => {
    const updated = groups.map(group => {
      if (group.id === itemData.groupId) {
        const items = editingItem.id
          ? group.items.map(i => i.id === editingItem.id ? itemData : i)
          : [...group.items, { ...itemData, id: Date.now(), order: group.items.length + 1 }];
        return { ...group, items };
      }
      return group;
    });
    saveData(updated);
    setEditingItem(null);
  };

  const deleteItem = (groupId, itemId) => {
    if (!confirm('삭제하시겠습니까?')) return;
    const updated = groups.map(g => 
      g.id === groupId ? { ...g, items: g.items.filter(i => i.id !== itemId) } : g
    );
    saveData(updated);
  };

  const deleteGroup = (groupId) => {
    if (!confirm('전체 그룹을 삭제하시겠습니까?')) return;
    saveData(groups.filter(g => g.id !== groupId));
  };

  const handleImageUpload = (e, callback) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => callback(event.target.result);
    reader.readAsDataURL(file);
  };

  const filteredGroups = groups.filter(g => 
    g.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    g.items.some(i => 
      i.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      i.description.toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  if (editingGroup) {
    return <GroupEditor group={editingGroup} onSave={saveGroup} onCancel={() => setEditingGroup(null)} />;
  }

  if (editingItem) {
    return <ItemEditor item={editingItem} onSave={saveItem} onCancel={() => setEditingItem(null)} handleImageUpload={handleImageUpload} />;
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      <div className="sticky top-0 bg-white shadow-sm z-10 p-4">
        <input
          type="text"
          placeholder="🔍 검색"
          className="w-full px-4 py-2 border rounded-lg"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      <div className="p-4 space-y-6">
        {filteredGroups.sort((a, b) => b.date.localeCompare(a.date)).map(group => (
          <div key={group.id} className="space-y-3">
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div>
                <div className="text-sm text-gray-600">📅 {group.date}</div>
                <div className="font-bold text-lg">💼 {group.title}</div>
              </div>
              <div className="space-x-2">
                <button onClick={() => setEditingGroup(group)} className="text-blue-600">편집</button>
                <button onClick={() => deleteGroup(group.id)} className="text-red-600">삭제</button>
              </div>
            </div>

            {group.items.sort((a, b) => a.order - b.order).map(item => (
              <div key={item.id} className="bg-white p-4 rounded-lg shadow">
                <div className="font-semibold mb-2">{item.order}. {item.title}</div>
                {item.image && (
                  <img src={item.image} alt={item.title} className="w-full rounded-lg mb-2" />
                )}
                <div className="text-gray-700 whitespace-pre-wrap">{item.description}</div>
                <div className="flex justify-end space-x-2 mt-2">
                  <button onClick={() => setEditingItem({ ...item, groupId: group.id })} className="text-blue-600 text-sm">편집</button>
                  <button onClick={() => deleteItem(group.id, item.id)} className="text-red-600 text-sm">삭제</button>
                </div>
              </div>
            ))}

            <button
              onClick={() => addItemToGroup(group.id)}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500"
            >
              + 항목 추가
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addNewGroup}
        className="fixed bottom-4 right-4 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg text-2xl"
      >
        +
      </button>
    </div>
  );
};

const GroupEditor = ({ group, onSave, onCancel }) => {
  const [title, setTitle] = useState(group.title || '');
  const [date, setDate] = useState(group.date || new Date().toISOString().split('T')[0]);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-blue-600">← 취소</button>
        <button onClick={() => onSave({ ...group, title, date })} className="text-blue-600 font-bold">저장</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">날짜</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">전체 제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 냉장고 수리 매뉴얼"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

const ItemEditor = ({ item, onSave, onCancel, handleImageUpload }) => {
  const [title, setTitle] = useState(item.title || '');
  const [description, setDescription] = useState(item.description || '');
  const [image, setImage] = useState(item.image || null);

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="flex justify-between items-center mb-4">
        <button onClick={onCancel} className="text-blue-600">← 취소</button>
        <button onClick={() => onSave({ ...item, title, description, image })} className="text-blue-600 font-bold">저장</button>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1">제목</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="예: 압축기 위치 확인"
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">이미지</label>
          {image && <img src={image} alt="preview" className="w-full rounded-lg mb-2" />}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => handleImageUpload(e, setImage)}
            className="w-full"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1">설명</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="상세 설명 입력"
            rows={5}
            className="w-full px-4 py-2 border rounded-lg"
          />
        </div>
      </div>
    </div>
  );
};

export default App;
