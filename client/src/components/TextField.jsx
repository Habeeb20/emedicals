export default function TextField({ label, icon: Icon, error, hint, right, className = '', ...props }) {
  return (
    <div className={className}>
      {label && <label htmlFor={props.id} className="label">{label}</label>}
      <div className="relative">
        {Icon && (
          <Icon className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        )}
        <input
          {...props}
          aria-invalid={Boolean(error)}
          className={`input ${Icon ? 'pl-10' : ''} ${right ? 'pr-11' : ''} ${
            error ? 'border-danger focus:border-danger focus:ring-danger/20' : ''
          }`}
        />
        {right && <div className="absolute right-1.5 top-1/2 -translate-y-1/2">{right}</div>}
      </div>
      {error ? (
        <p className="mt-1.5 text-xs text-danger">{error}</p>
      ) : hint ? (
        <p className="mt-1.5 text-xs text-gray-500">{hint}</p>
      ) : null}
    </div>
  );
}
