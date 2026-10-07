import { useId, useState } from 'react'
import { INPUT_CLASS } from './accountText'

export interface PasswordFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete: 'current-password' | 'new-password'
  describedBy?: string
}

/** Password input with a big show/hide toggle. The value lives only in the form's state. */
export function PasswordField({ label, value, onChange, autoComplete, describedBy }: PasswordFieldProps) {
  const id = useId()
  const [shown, setShown] = useState(false)
  return (
    <div className="flex flex-col gap-1">
      <label htmlFor={id} className="text-lg font-semibold text-ink">
        {label}
      </label>
      <div className="flex items-stretch gap-2">
        <input
          id={id}
          type={shown ? 'text' : 'password'}
          value={value}
          autoComplete={autoComplete}
          maxLength={128}
          spellCheck={false}
          aria-describedby={describedBy}
          onChange={(e) => onChange(e.target.value)}
          className={`${INPUT_CLASS} min-w-0 flex-1`}
        />
        <button
          type="button"
          aria-label={shown ? 'Amaga la contrasenya' : 'Mostra la contrasenya'}
          aria-pressed={shown}
          onClick={() => setShown((s) => !s)}
          className="sticker min-h-16 w-24 shrink-0 rounded-2xl bg-white text-lg font-bold text-brand-dark"
        >
          {shown ? 'Amaga' : 'Mostra'}
        </button>
      </div>
    </div>
  )
}
