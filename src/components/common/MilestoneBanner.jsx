import { useState, useRef } from 'react'

// Exported singleton controller so ChallengeScreen can trigger it
let _show = null
export function showMilestoneBanner(title, sub, showShare = false, onShare = null) {
  if (_show) _show({ title, sub, showShare, onShare })
}

export default function MilestoneBanner() {
  const [data, setData] = useState(null)
  const timerRef = useRef(null)

  _show = ({ title, sub, showShare, onShare }) => {
    clearTimeout(timerRef.current)
    setData({ title, sub, showShare, onShare, visible: true })
    timerRef.current = setTimeout(() => setData(null), showShare ? 10000 : 3800)
  }

  function close() {
    clearTimeout(timerRef.current)
    setData(null)
  }

  if (!data?.visible) return null

  return (
    <div className={`milestone-banner show`}>
      <div className="mb-inner">
        <div className="mb-left">
          <div className="mb-title">{data.title}</div>
          <div className="mb-sub">{data.sub}</div>
        </div>
        {data.showShare && (
          <button className="mb-share-btn" onClick={() => { close(); data.onShare?.() }}>Share →</button>
        )}
        <button onClick={close} className="mb-close">✕</button>
      </div>
    </div>
  )
}
