export default function SectionHeader({ title, text }) {
  return (
    <div className="unicar-section-header">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
