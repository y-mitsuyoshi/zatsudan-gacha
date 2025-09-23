"use client";

import { IsekaiFormState, Gender, QuestionAnswer, QuestionAnswerWithEmpty } from "@/types";

interface IsekaiStatusFormProps {
  formState: IsekaiFormState;
  setFormState: React.Dispatch<React.SetStateAction<IsekaiFormState>>;
}

// Reusable Input Component
const FormInput = ({ label, name, value, onChange, required = false, type = 'text', maxLength }: {
  label: string;
  name: keyof IsekaiFormState;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  required?: boolean;
  type?: string;
  maxLength?: number;
}) => (
  <div className="mb-6">
    <label htmlFor={name} className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {label} {required && <span className="text-red-500 ml-1">*</span>}
    </label>
    <input
      type={type}
      id={name}
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      maxLength={maxLength}
      className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
    />
  </div>
);

// Reusable Radio Group Component
const RadioGroup = ({ question, name, value, onChange, options }: {
  question: string;
  name: keyof IsekaiFormState;
  value: QuestionAnswerWithEmpty;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  options: { value: QuestionAnswer; label: string }[];
}) => (
  <div className="mb-6">
    <p className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
      {question} <span className="text-red-500 ml-1">*</span>
    </p>
    <div className="space-y-2">
      {options.map(option => (
        <label key={option.value} className="flex items-center p-3 border border-gray-300 dark:border-gray-600 rounded-lg has-[:checked]:bg-indigo-50 dark:has-[:checked]:bg-indigo-900/50 has-[:checked]:border-indigo-500 transition cursor-pointer">
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={value === option.value}
            onChange={onChange}
            className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
          />
          <span className="ml-3 text-sm text-gray-800 dark:text-gray-200">{option.label}</span>
        </label>
      ))}
    </div>
  </div>
);


export const IsekaiStatusForm: React.FC<IsekaiStatusFormProps> = ({ formState, setFormState }) => {
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormState(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  const questions = [
    { name: 'q1', question: '【質問1】巨大なドラゴンの前に立っている。どうする？', options: [{ value: 'A' as QuestionAnswer, label: '勇敢に剣を抜いて戦う' }, { value: 'B' as QuestionAnswer, label: '魔法で一発逆転を狙う' }, { value: 'C' as QuestionAnswer, label: '全力で見えないフリをして逃げる' }] },
    { name: 'q2', question: '【質問2】王様から授けられる褒美は、次のうちどれがいい？', options: [{ value: 'A' as QuestionAnswer, label: '国一番の名誉と称号' }, { value: 'B' as QuestionAnswer, label: '一生遊んで暮らせるだけの金貨' }, { value: 'C' as QuestionAnswer, label: '誰も知らない古代遺跡の地図' }] },
    { name: 'q3', question: '【質問3】仲間がピンチ！あなたは…', options: [{ value: 'A' as QuestionAnswer, label: '自分が盾になってでも仲間を守る' }, { value: 'B' as QuestionAnswer, label: '冷静に状況を分析し、的確な指示を出す' }, { value: 'C' as QuestionAnswer, label: '「後は頼んだ！」と言い残して撤退の準備を始める' }] },
    { name: 'q4', question: '【質問4】手に入れたい最強の能力は？', options: [{ value: 'A' as QuestionAnswer, label: '全てを見通す千里眼' }, { value: 'B' as QuestionAnswer, label: '時を巻き戻す力' }, { value: 'C' as QuestionAnswer, label: 'どんな動物とも話せる能力' }] },
    { name: 'q5', question: '【質問5】長い旅の終わり。あなたは何を求める？', options: [{ value: 'A' as QuestionAnswer, label: 'さらなる強さを求めて修行の旅へ' }, { value: 'B' as QuestionAnswer, label: '静かな場所で平穏な暮らしを始める' }, { value: 'C' as QuestionAnswer, label: '旅の思い出を本にして一儲けを企む' }] },
  ];

  return (
    <form>
      <h3 className="text-lg font-bold mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2">基本情報</h3>
      <FormInput
        label="あなたの名前"
        name="name"
        value={formState.name}
        onChange={handleChange}
        required
        maxLength={15}
      />
      <FormInput
        label="あなたの生年月日"
        name="birthDate"
        value={formState.birthDate}
        onChange={handleChange}
        required
        type="date"
      />
      <div className="mb-6">
        <label htmlFor="gender" className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
          あなたの性別
        </label>
        <select
          id="gender"
          name="gender"
          value={formState.gender}
          onChange={handleChange}
          className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white shadow-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition"
        >
          <option value="male">男性</option>
          <option value="female">女性</option>
          <option value="other">その他</option>
          <option value="none">答えない</option>
        </select>
      </div>

      <h3 className="text-lg font-bold mt-8 mb-4 text-indigo-600 dark:text-indigo-400 border-b pb-2">運命を決める5つの質問</h3>
      {questions.map(q => (
        <RadioGroup
          key={q.name}
          question={q.question}
          name={q.name as keyof IsekaiFormState}
          value={formState[q.name as keyof IsekaiFormState] as QuestionAnswerWithEmpty}
          onChange={handleChange}
          options={q.options}
        />
      ))}
    </form>
  );
};
