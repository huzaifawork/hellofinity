import { useEffect, useRef } from 'react'

const CONF = ['#F5C842','#FAE18E','#A8D5B5','#7AAAC8','#C4614A','#FAFAF8','#550000','#D4A8E8']

// Exported singleton
let _launch = null
export function launchConfetti(count = 40) {
  if (_launch) _launch(count)
}

export default function Confetti() {
  const wrapRef = useRef(null)

  useEffect(() => {
    _launch = (count) => {
      const wrap = wrapRef.current
      if (!wrap) return
      for (let i = 0; i < count; i++) {
        const p = document.createElement('div')
        const color = CONF[Math.floor(Math.random() * CONF.length)]
        p.style.cssText = `
          position:fixed;
          top:${-10 + Math.random() * 30}%;
          left:${Math.random() * 100}%;
          width:${6 + Math.random() * 6}px;
          height:${6 + Math.random() * 6}px;
          background:${color};
          border-radius:${Math.random() > 0.5 ? '50%' : '2px'};
          transform:rotate(${Math.random() * 360}deg);
          animation:confetti-fall ${1.5 + Math.random() * 2}s ease-in forwards;
          animation-delay:${Math.random() * 0.6}s;
          pointer-events:none;
          z-index:9999;
        `
        wrap.appendChild(p)
        p.addEventListener('animationend', () => p.remove())
      }
    }
    return () => { _launch = null }
  }, [])

  return <div ref={wrapRef} className="confetti-wrap" />
}
