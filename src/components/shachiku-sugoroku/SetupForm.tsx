"use client";

import React from 'react';
import { SetupFormState, Job } from '@/types/sugoroku';
import { JOBS } from '@/lib/sugoroku-logic';

interface SetupFormProps {
  formState: SetupFormState;
  setFormState: React.Dispatch<React.SetStateAction<SetupFormState>>;
  onSubmit: () => void;
}

export const SetupForm: React.FC<SetupFormProps> = ({ formState, setFormState, onSubmit }) => {
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prevState => ({
      ...prevState,
      [name]: value,
    }));
  };

  const isSubmitDisabled = !formState.name.trim();

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-lg h-fit">
      <h2 className="text-2xl font-bold mb-6 text-gray-800 dark:text-gray-200">
        まずは君のことを教えてくれ
      </h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!isSubmitDisabled) {
            onSubmit();
          }
        }}
        className="space-y-6"
      >
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            名前
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formState.name}
            onChange={handleInputChange}
            placeholder="例: 山田 太郎"
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
            required
          />
        </div>
        <div>
          <label htmlFor="job" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
            職業 (ジョブ)
          </label>
          <select
            id="job"
            name="job"
            value={formState.job}
            onChange={handleInputChange}
            className="w-full px-4 py-3 bg-slate-100 dark:bg-slate-700 text-gray-800 dark:text-gray-200 border border-slate-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
          >
            {JOBS.map(job => (
              <option key={job} value={job}>{job}</option>
            ))}
          </select>
        </div>
        <div className="pt-6 border-t border-gray-200 dark:border-gray-600">
          <button
            type="submit"
            disabled={isSubmitDisabled}
            className="w-full bg-gradient-to-r from-blue-500 to-green-600 hover:from-blue-600 hover:to-green-700 disabled:from-gray-400 disabled:to-gray-500 text-white font-bold py-4 px-6 rounded-lg text-xl transition-all duration-300 shadow-lg hover:shadow-xl disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center"
          >
            すごろくを開始する
          </button>
        </div>
      </form>
    </div>
  );
};
