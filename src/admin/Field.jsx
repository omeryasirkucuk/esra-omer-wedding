// A labelled form field wrapper used by the panel add/edit forms.
export default function Field({ label, className = '', children }) {
  return (
    <label className={`flex flex-col gap-1 ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  )
}
