export default function TituloSecao({ title, text }) {
  return (
    <div className="tituloSecao">
      <h2>{title}</h2>
      {text && <p>{text}</p>}
    </div>
  );
}
