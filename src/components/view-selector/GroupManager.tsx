"use client";

import { useState } from "react";
import { useSessionStore } from "@/store/sessionStore";
import type { ViewGroup } from "@/types";

interface GroupManagerProps {
  onClose: () => void;
  viewId: string;
  viewName: string;
}

const COLORS = [
  "#60A5FA",
  "#34D399",
  "#F472B6",
  "#FBBF24",
  "#A78BFA",
  "#FB7185",
  "#22D3EE",
  "#8B5CF6",
];

export function GroupManager({ viewId, viewName, onClose }: GroupManagerProps) {
  const view = useSessionStore((s) =>
    s.customViews.find((v) => v.id === viewId)
  );
  const addViewGroup = useSessionStore((s) => s.addViewGroup);
  const updateViewGroup = useSessionStore((s) => s.updateViewGroup);
  const deleteViewGroup = useSessionStore((s) => s.deleteViewGroup);

  const [newGroupName, setNewGroupName] = useState("");
  const [selectedColor, setSelectedColor] = useState(COLORS[0]);
  const [editingGroup, setEditingGroup] = useState<ViewGroup | null>(null);
  const [editName, setEditName] = useState("");
  const [confirmDeleteGroupId, setConfirmDeleteGroupId] = useState<
    string | null
  >(null);

  const handleAddGroup = async () => {
    if (!newGroupName.trim()) {
      return;
    }
    await addViewGroup(viewId, newGroupName.trim(), selectedColor);
    setNewGroupName("");
    setSelectedColor(COLORS[0]);
  };

  const handleEditGroup = async () => {
    if (!(editingGroup && editName.trim())) {
      return;
    }
    await updateViewGroup(viewId, editingGroup.id, { title: editName.trim() });
    setEditingGroup(null);
    setEditName("");
  };

  const handleConfirmDelete = (groupId: string) => {
    setConfirmDeleteGroupId(groupId);
  };

  const handleCancelDelete = () => {
    setConfirmDeleteGroupId(null);
  };

  const handleDeleteGroup = async () => {
    if (!confirmDeleteGroupId) {
      return;
    }
    await deleteViewGroup(viewId, confirmDeleteGroupId);
    setConfirmDeleteGroupId(null);
  };

  const handleColorChange = async (groupId: string, color: string) => {
    await updateViewGroup(viewId, groupId, { color });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="max-h-[80vh] w-full max-w-md overflow-hidden rounded-xl bg-gray-900 shadow-2xl">
        <div className="flex items-center justify-between border-gray-700 border-b p-4">
          <h2 className="font-bold text-white text-xl">
            管理分组 - {viewName}
          </h2>
          <button
            className="text-gray-400 transition-colors hover:text-white"
            onClick={onClose}
            type="button"
          >
            ✕
          </button>
        </div>

        <div className="border-gray-700 border-b p-4">
          <h3 className="mb-3 font-medium text-gray-400 text-sm">创建新分组</h3>
          <div className="flex gap-2">
            <input
              className="flex-1 rounded-lg border border-gray-600 bg-gray-800 px-3 py-2 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none"
              onChange={(e) => setNewGroupName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAddGroup()}
              placeholder="分组名称..."
              type="text"
              value={newGroupName}
            />
            <button
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-500"
              onClick={handleAddGroup}
              type="button"
            >
              添加
            </button>
          </div>
          <div className="mt-2 flex gap-2">
            {COLORS.map((color) => (
              <button
                className={`h-6 w-6 rounded-full border-2 transition-transform hover:scale-110 ${
                  selectedColor === color
                    ? "scale-110 border-white"
                    : "border-transparent"
                }`}
                key={color}
                onClick={() => setSelectedColor(color)}
                style={{ backgroundColor: color }}
                type="button"
              />
            ))}
          </div>
        </div>

        <div className="max-h-[50vh] overflow-y-auto p-4">
          <h3 className="mb-3 font-medium text-gray-400 text-sm">现有分组</h3>
          {(view?.viewGroups || []).length === 0 ? (
            <div className="py-8 text-center text-gray-500">暂无分组</div>
          ) : (
            <div className="space-y-2">
              {(view?.viewGroups || []).map((group) => (
                <div
                  className="flex items-center justify-between rounded-lg bg-gray-800 p-3"
                  key={group.id}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className="h-4 w-4 rounded-full"
                      style={{ backgroundColor: group.color }}
                    />
                    {editingGroup?.id === group.id ? (
                      <input
                        autoFocus
                        className="rounded border border-gray-600 bg-gray-700 px-2 py-1 text-sm text-white focus:border-blue-500 focus:outline-none"
                        onChange={(e) => setEditName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            handleEditGroup();
                          }
                          if (e.key === "Escape") {
                            setEditingGroup(null);
                          }
                        }}
                        type="text"
                        value={editName}
                      />
                    ) : (
                      <span className="text-white">{group.title}</span>
                    )}
                    <span className="text-gray-500 text-xs">
                      ({group.nodeIds.length} 个节点)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {COLORS.map((color) => (
                        <button
                          className={`h-4 w-4 rounded-full border ${
                            group.color === color
                              ? "border-white"
                              : "border-transparent"
                          } transition-transform hover:scale-110`}
                          key={color}
                          onClick={() => handleColorChange(group.id, color)}
                          style={{ backgroundColor: color }}
                          type="button"
                        />
                      ))}
                    </div>
                    {editingGroup?.id === group.id ? (
                      <>
                        <button
                          className="text-green-400 text-sm hover:text-green-300"
                          onClick={handleEditGroup}
                          type="button"
                        >
                          ✓
                        </button>
                        <button
                          className="text-gray-400 text-sm hover:text-gray-300"
                          onClick={() => setEditingGroup(null)}
                          type="button"
                        >
                          ✕
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          className="text-gray-400 text-sm hover:text-blue-400"
                          onClick={() => {
                            setEditingGroup(group);
                            setEditName(group.title);
                          }}
                          type="button"
                        >
                          编辑
                        </button>
                        <button
                          className="text-gray-400 text-sm hover:text-red-400"
                          onClick={() => handleConfirmDelete(group.id)}
                          type="button"
                        >
                          删除
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {confirmDeleteGroupId && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/60">
            <div className="rounded-lg bg-gray-800 p-6 shadow-xl">
              <h3 className="mb-4 font-bold text-white">确认删除</h3>
              <p className="mb-6 text-gray-400">确定要删除这个分组吗？</p>
              <div className="flex gap-3">
                <button
                  className="flex-1 rounded-lg border border-gray-600 px-4 py-2 text-gray-300 transition-colors hover:bg-gray-700"
                  onClick={handleCancelDelete}
                  type="button"
                >
                  取消
                </button>
                <button
                  className="flex-1 rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-500"
                  onClick={handleDeleteGroup}
                  type="button"
                >
                  删除
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
