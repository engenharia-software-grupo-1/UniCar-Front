export default function Campo({ label, placeholder, icon: IconeCampo }) {
  return (
    <label className="unicar-field">
      <span>{label}</span>
      <div>
        {IconeCampo && <IconeCampo className="icone iconePequeno" />}
        <input placeholder={placeholder} />
      </div>
    </label>
  );
}
