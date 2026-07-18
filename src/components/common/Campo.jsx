export default function Campo({
  label,
  placeholder,
  icon: IconeCampo,
  value,
  onChange,
  type = 'text',
  name,
}) {
  return (
    <label className="unicar-field">
      <span>{label}</span>
      <div>
        {IconeCampo && <IconeCampo className="icone iconePequeno" />}
        <input
          type={type}
          name={name}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
        />
      </div>
    </label>
  );
}
