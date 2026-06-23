export default function Field({ label, placeholder, icon: FieldIcon }) {
  return (
    <label className="unicar-field">
      <span>{label}</span>
      <div>
        {FieldIcon && <FieldIcon className="unicar-icon unicar-icon--small" />}
        <input placeholder={placeholder} />
      </div>
    </label>
  );
}
