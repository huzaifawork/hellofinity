export default function LoadingOverlay({ visible }) {
  if (!visible) return null
  return (
    <div className="loading-overlay">
      <div className="loading-logo">
        Hello<span>Finity</span>
      </div>
      <div className="loading-spinner" />
    </div>
  )
}
