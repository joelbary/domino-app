export default function Notice({ state }: { state: { error?: string; ok?: string; details?: string[] } }) {
  if (state.error) return <div className="notice bad" role="alert">{state.error}</div>;
  if (state.ok)
    return (
      <div className="notice ok" role="status">
        {state.ok}
        {state.details && state.details.length > 0 && (
          <ul>{state.details.map((d, i) => <li key={i}>{d}</li>)}</ul>
        )}
      </div>
    );
  return null;
}
