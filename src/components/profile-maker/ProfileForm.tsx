"use client";

import { useState } from "react";
import { ProfileState } from "@/types";

interface ProfileFormProps {
  profile: ProfileState;
  setProfile: React.Dispatch<React.SetStateAction<ProfileState>>;
}

// Reusable Input Component
const FormInput = ({ label, name, value, onChange, placeholder, required = false, as = 'input' }: {
  label: string;
  name: keyof ProfileState;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  placeholder?: string;
  required?: boolean;
  as?: 'input' | 'textarea';
}) => (
  <div className="mb-6">
    <label htmlFor={name} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    {as === 'input' ? (
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        required={required}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
      />
    ) : (
      <textarea
        id={name}
        name={name}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        rows={3}
        className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
      />
    )}
  </div>
);

export const ProfileForm: React.FC<ProfileFormProps> = ({ profile, setProfile }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setProfile(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageUrl = event.target?.result as string;
        setProfile(prev => ({ ...prev, image: imageUrl }));
      };
      reader.readAsDataURL(file);
    }
  };

  // Dummy handler for now
  const handleLikesChange = (newLikes: string[]) => {
    setProfile(prev => ({ ...prev, likes: newLikes }));
  };

  return (
    <form>
      <h3 className="text-lg font-bold mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2">基本情報</h3>
      <FormInput
        label="推しの名前"
        name="name"
        value={profile.name}
        onChange={handleChange}
        required
      />
      <FormInput
        label="推しの所属・グループ名など"
        name="group"
        value={profile.group}
        onChange={handleChange}
      />
      
      <div className="mb-6">
        <label htmlFor="image" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          推しの画像
        </label>
        <div className="space-y-3">
          <input
            type="file"
            id="image"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
          />
          {profile.image && (
            <div className="flex items-center space-x-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={profile.image}
                alt="推しの画像プレビュー"
                className="w-16 h-16 object-cover rounded-lg border border-gray-300 dark:border-gray-600"
              />
              <button
                type="button"
                onClick={() => setProfile(prev => ({ ...prev, image: '' }))}
                className="text-red-500 hover:text-red-700 text-sm font-medium"
              >
                画像を削除
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="mb-6">
          <label htmlFor="color" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
              担当・イメージカラー
          </label>
          <div className="flex items-center">
              <input
                  type="color"
                  id="color"
                  name="color"
                  value={profile.color}
                  onChange={handleChange}
                  className="w-10 h-10 p-1 border-none rounded-lg cursor-pointer"
              />
              <span className="ml-3 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white text-sm">
                  {profile.color}
              </span>
          </div>
      </div>

      <h3 className="text-lg font-bold mt-8 mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2">推しの&quot;好き&quot;を語る</h3>

      <TagInput
        label="推しの好きなところ（最大3つ）"
        tags={profile.likes}
        setTags={(newLikes) => setProfile(p => ({...p, likes: newLikes}))}
        suggestions={['顔', '声', '性格', 'ダンス', '演技', '面白い', '優しい', '世界観']}
        maxTags={3}
      />

      <FormInput
        label="推しとの出会い（きっかけ）"
        name="episode"
        value={profile.episode}
        onChange={handleChange}
        placeholder="例：「〇〇という作品で一目惚れ」"
      />
      <FormInput
        label="一番好きなビジュアル・衣装"
        name="favoriteVisual"
        value={profile.favoriteVisual}
        onChange={handleChange}
        placeholder="例：「〇〇のライブ衣装」"
      />
      <FormInput
        label="一番好きなセリフ・歌詞"
        name="favoriteQuote"
        value={profile.favoriteQuote}
        onChange={handleChange}
        as="textarea"
      />

      <TagInput
        label="推しを表すオリジナルタグ（最大3つ）"
        tags={profile.customTags}
        setTags={(newTags) => setProfile(p => ({...p, customTags: newTags}))}
        placeholder="例: #存在が尊い"
        maxTags={3}
      />

      <h3 className="text-lg font-bold mt-8 mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2">ステータス・記念日</h3>
      <FormInput
        label="ファン歴"
        name="fanHistory"
        value={profile.fanHistory}
        onChange={handleChange}
        placeholder="例: 約3年 / 2020年から"
      />
      <FormInput
        label="推しへの称号"
        name="title"
        value={profile.title}
        onChange={handleChange}
        placeholder="例: 顔面国宝"
      />
    </form>
  );
};

// --- Sub-components ---

const TagInput = ({ label, tags, setTags, suggestions = [], placeholder = "タグを入力", maxTags }: {
  label: string;
  tags: string[];
  setTags: (tags: string[]) => void;
  suggestions?: string[];
  placeholder?: string;
  maxTags?: number;
}) => {
    const [inputValue, setInputValue] = useState('');

    const addTag = (tag: string) => {
        const newTag = tag.trim();
        if (newTag && !tags.includes(newTag) && (!maxTags || tags.length < maxTags)) {
            setTags([...tags, newTag]);
        }
        setInputValue('');
    };

    const removeTag = (tagToRemove: string) => {
        setTags(tags.filter(tag => tag !== tagToRemove));
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            addTag(inputValue);
        }
    };

    return (
        <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">{label}</label>
            <div className="flex flex-wrap gap-2 mb-2 p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 min-h-[44px]">
                {tags.map(tag => (
                    <span key={tag} className="flex items-center bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200 text-sm font-medium px-2.5 py-1 rounded-full">
                        {tag}
                        <button onClick={() => removeTag(tag)} className="ml-2 text-indigo-500 hover:text-indigo-700 dark:hover:text-indigo-300">
                            &times;
                        </button>
                    </span>
                ))}
                {(!maxTags || tags.length < maxTags) && (
                    <input
                        type="text"
                        value={inputValue}
                        onChange={(e) => setInputValue(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder={tags.length === 0 ? placeholder : ''}
                        className="flex-grow bg-transparent focus:outline-none text-gray-800 dark:text-white"
                    />
                )}
            </div>
            {suggestions.length > 0 && (
                <div className="flex flex-wrap gap-2">
                    {suggestions.map(suggestion => (
                        <button
                            key={suggestion}
                            type="button"
                            onClick={() => addTag(suggestion)}
                            disabled={tags.includes(suggestion) || (maxTags != null && tags.length >= maxTags)}
                            className="px-3 py-1 bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 text-sm rounded-full hover:bg-gray-300 dark:hover:bg-gray-500 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            + {suggestion}
                        </button>
                    ))}
                </div>
            )}
        </div>
    );
}
