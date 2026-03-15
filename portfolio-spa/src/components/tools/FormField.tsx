import type { ChangeEvent } from 'react';
import { cn } from '@/utils/cn';

type InputType = 'text' | 'email' | 'tel' | 'date' | 'number';

interface FormFieldBaseProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  placeholder?: string;
  className?: string;
}

interface InputFieldProps extends FormFieldBaseProps {
  as?: 'input';
  type?: InputType;
}

interface TextareaFieldProps extends FormFieldBaseProps {
  as: 'textarea';
  rows?: number;
}

interface SelectFieldProps extends FormFieldBaseProps {
  as: 'select';
  options: { value: string; label: string }[];
}

type FormFieldProps = InputFieldProps | TextareaFieldProps | SelectFieldProps;

const fieldClass = 'w-full px-3 py-1.5 rounded-lg border border-brown-200 dark:border-brown-700 bg-brown-50/50 dark:bg-brown-800/50 text-brown-800 dark:text-brown-100 text-sm placeholder:text-brown-300 dark:placeholder:text-brown-600 focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent transition-colors';

/** ラベル付きフォーム入力 — browser-native-validation スキル準拠（required 属性でバリデーション） */
export function FormField(props: FormFieldProps) {
  const { label, value, onChange, required, placeholder, className } = props;
  const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    onChange(e.target.value);

  return (
    <div className={cn('space-y-1', className)}>
      <label className="block text-xs font-medium text-brown-500 dark:text-brown-400">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {props.as === 'textarea' ? (
        <textarea
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          rows={props.rows ?? 4}
          className={cn(fieldClass, 'resize-y')}
        />
      ) : props.as === 'select' ? (
        <select
          value={value}
          onChange={handleChange}
          required={required}
          className={cn(fieldClass, 'cursor-pointer')}
        >
          <option value="">{placeholder ?? '選択してください'}</option>
          {props.options.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      ) : (
        <input
          type={props.type ?? 'text'}
          value={value}
          onChange={handleChange}
          required={required}
          placeholder={placeholder}
          className={fieldClass}
        />
      )}
    </div>
  );
}
