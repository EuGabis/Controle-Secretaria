'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  Lock, Mail, Eye, EyeOff, Loader2,
  Shield, Sparkles, Activity, CheckCircle2, ArrowRight
} from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [emailFocused, setEmailFocused] = useState(false)
  const [passFocused, setPassFocused] = useState(false)
  const [capsLock, setCapsLock] = useState(false)
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })

  const router = useRouter()
  const supabase = createClient()

  // Move sutil do gradient com o mouse (paralaxe)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      setMousePos({
        x: (e.clientX / window.innerWidth) * 100,
        y: (e.clientY / window.innerHeight) * 100,
      })
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const { error: authError } = await supabase.auth.signInWithPassword({ email, password })

    if (authError) {
      setError(authError.message.includes('Invalid login')
        ? 'E-mail ou senha incorretos. Tente novamente.'
        : authError.message)
      setLoading(false)
      return
    }

    setSuccess(true)
    setTimeout(() => {
      router.push('/dashboard')
      router.refresh()
    }, 600)
  }

  return (
    <div className="login-shell">
      {/* === BACKGROUND ANIMADO === */}
      <div className="bg-layer">
        {/* Gradient base + paralaxe com mouse */}
        <div
          className="bg-radial"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(79,124,255,0.15) 0%, transparent 50%)`
          }}
        />

        {/* Orbs flutuantes */}
        <div className="orb orb-blue"   />
        <div className="orb orb-purple" />
        <div className="orb orb-cyan"   />
        <div className="orb orb-pink"   />

        {/* Grid pattern */}
        <div className="grid-pattern" />

        {/* Partículas estáticas */}
        <div className="particles">
          {Array.from({ length: 28 }).map((_, i) => (
            <span key={i} className={`star s${(i % 4) + 1}`} style={{
              top: `${(i * 37) % 100}%`,
              left: `${(i * 73) % 100}%`,
              animationDelay: `${(i * 0.3) % 6}s`
            }} />
          ))}
        </div>

        {/* Linhas de scan */}
        <div className="scanlines" />
      </div>

      {/* === CARD CENTRAL === */}
      <main className="card-wrap">
        {/* Mini badges no topo */}
        <div className="top-badges">
          <div className="badge-online">
            <span className="dot-online" />
            Sistema online
          </div>
          <div className="badge-secure">
            <Shield size={11} />
            Conexão segura
          </div>
        </div>

        <div className="card glass-card">
          {/* Glow atrás do card */}
          <div className="card-glow" />

          {/* Logo / cabeçalho */}
          <div className="brand">
            <div className="logo-ring">
              <div className="logo-inner">
                <Lock size={26} color="#fff" />
              </div>
              <div className="logo-pulse" />
              <div className="logo-pulse delay" />
            </div>
            <h1 className="brand-title">
              Lito <span className="gradient-text">Academy</span>
              <Sparkles size={16} className="title-sparkle" />
            </h1>
            <p className="brand-sub">
              Plataforma interna de gestão & produtividade
            </p>
          </div>

          {/* Divisor com texto */}
          <div className="divider">
            <span>Entre com suas credenciais</span>
          </div>

          {/* Formulário */}
          <form onSubmit={handleLogin} className={`form ${error ? 'shake' : ''}`}>
            {/* E-mail */}
            <div className={`field ${emailFocused ? 'focused' : ''} ${email ? 'filled' : ''}`}>
              <label>E-mail</label>
              <div className="input-wrap">
                <Mail size={15} className="field-icon" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                  placeholder=" "
                />
                <span className="field-line" />
              </div>
            </div>

            {/* Senha */}
            <div className={`field ${passFocused ? 'focused' : ''} ${password ? 'filled' : ''}`}>
              <label>
                Senha
                {capsLock && <span className="caps-warn">⚠ Caps Lock</span>}
              </label>
              <div className="input-wrap">
                <Lock size={15} className="field-icon" />
                <input
                  type={showPass ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setPassFocused(true)}
                  onBlur={() => setPassFocused(false)}
                  onKeyDown={e => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
                  onKeyUp={e => setCapsLock(e.getModifierState && e.getModifierState('CapsLock'))}
                  placeholder=" "
                />
                <button
                  type="button"
                  className="toggle-pass"
                  onClick={() => setShowPass(s => !s)}
                  tabIndex={-1}
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
                <span className="field-line" />
              </div>
            </div>

            {/* Erro */}
            <div className={`error-box ${error ? 'show' : ''}`}>
              {error && <><span className="err-dot" /> {error}</>}
            </div>

            {/* Botão Entrar */}
            <button
              type="submit"
              className={`submit ${loading ? 'loading' : ''} ${success ? 'success' : ''}`}
              disabled={loading || success}
            >
              <span className="submit-content">
                {success ? (
                  <>
                    <CheckCircle2 size={17} />
                    Entrando…
                  </>
                ) : loading ? (
                  <>
                    <Loader2 size={16} className="spin" />
                    Autenticando
                  </>
                ) : (
                  <>
                    Entrar no Painel
                    <ArrowRight size={16} className="arrow" />
                  </>
                )}
              </span>
              <span className="submit-shine" />
            </button>
          </form>

          {/* Rodapé do card */}
          <div className="card-footer">
            <div className="footer-stats">
              <span><Activity size={11} /> Stable</span>
              <span className="dot-sep" />
              <span>v1.0.0</span>
              <span className="dot-sep" />
              <span>Build {new Date().getFullYear()}</span>
            </div>
            <div className="footer-copy">
              © {new Date().getFullYear()} Lito Academy — todos os direitos reservados
            </div>
          </div>
        </div>

        {/* Hint embaixo do card */}
        <div className="card-hint">
          🔐 Esta plataforma é restrita. Em caso de dúvidas, contate seu administrador.
        </div>
      </main>

      {/* === STYLES === */}
      <style jsx>{`
        .login-shell {
          min-height: 100vh;
          width: 100%;
          position: relative;
          overflow: hidden;
          background: #05060a;
          color: #fff;
          font-family: 'Inter', system-ui, sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 24px;
        }

        /* ============ BACKGROUND ============ */
        .bg-layer {
          position: fixed;
          inset: 0;
          pointer-events: none;
          z-index: 0;
          overflow: hidden;
        }
        .bg-radial {
          position: absolute; inset: 0;
          transition: background 0.6s ease;
        }
        .grid-pattern {
          position: absolute; inset: 0;
          background-image:
            linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
          background-size: 60px 60px;
          mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
          -webkit-mask-image: radial-gradient(ellipse at center, black 30%, transparent 75%);
        }
        .scanlines {
          position: absolute; inset: 0;
          background: repeating-linear-gradient(0deg, rgba(255,255,255,0.012) 0px, rgba(255,255,255,0.012) 1px, transparent 1px, transparent 3px);
          pointer-events: none;
        }

        /* Orbs flutuantes coloridos */
        .orb {
          position: absolute;
          border-radius: 50%;
          filter: blur(80px);
          opacity: 0.55;
          will-change: transform;
        }
        .orb-blue {
          width: 480px; height: 480px;
          background: radial-gradient(circle, #4f7cff 0%, transparent 70%);
          top: -120px; left: -120px;
          animation: floatA 18s ease-in-out infinite;
        }
        .orb-purple {
          width: 520px; height: 520px;
          background: radial-gradient(circle, #8b5cf6 0%, transparent 70%);
          bottom: -160px; right: -140px;
          animation: floatB 22s ease-in-out infinite;
        }
        .orb-cyan {
          width: 360px; height: 360px;
          background: radial-gradient(circle, #06b6d4 0%, transparent 70%);
          top: 40%; right: 12%;
          animation: floatC 25s ease-in-out infinite;
          opacity: 0.35;
        }
        .orb-pink {
          width: 300px; height: 300px;
          background: radial-gradient(circle, #ec4899 0%, transparent 70%);
          bottom: 18%; left: 8%;
          animation: floatD 28s ease-in-out infinite;
          opacity: 0.3;
        }

        @keyframes floatA {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(60px,80px) scale(1.1); }
        }
        @keyframes floatB {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-80px,-60px) scale(0.95); }
        }
        @keyframes floatC {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(-40px,50px) scale(1.05); }
        }
        @keyframes floatD {
          0%,100% { transform: translate(0,0) scale(1); }
          50%     { transform: translate(70px,-40px) scale(1.08); }
        }

        /* Estrelas / partículas */
        .particles { position: absolute; inset: 0; }
        .star {
          position: absolute;
          background: #fff;
          border-radius: 50%;
          opacity: 0;
          animation: twinkle 5s ease-in-out infinite;
        }
        .star.s1 { width: 1px; height: 1px; }
        .star.s2 { width: 2px; height: 2px; }
        .star.s3 { width: 1px; height: 1px; box-shadow: 0 0 4px rgba(79,124,255,0.8); }
        .star.s4 { width: 2px; height: 2px; box-shadow: 0 0 6px rgba(139,92,246,0.8); }
        @keyframes twinkle {
          0%,100% { opacity: 0; transform: scale(0.5); }
          50%     { opacity: 0.9; transform: scale(1.2); }
        }

        /* ============ CARD ============ */
        .card-wrap {
          position: relative;
          z-index: 1;
          width: 100%;
          max-width: 440px;
          animation: appear 0.7s ease-out;
        }
        @keyframes appear {
          from { opacity: 0; transform: translateY(20px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }

        .top-badges {
          display: flex;
          justify-content: center;
          gap: 8px;
          margin-bottom: 18px;
          animation: slideDown 0.6s ease-out 0.1s both;
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateY(-10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .badge-online, .badge-secure {
          display: inline-flex; align-items: center; gap: 6px;
          background: rgba(255,255,255,0.04);
          border: 1px solid rgba(255,255,255,0.08);
          backdrop-filter: blur(10px);
          color: #9aa6bb;
          font-size: 11px; font-weight: 600;
          padding: 5px 11px; border-radius: 999px;
        }
        .badge-online { color: #10d98c; border-color: rgba(16,217,140,0.25); }
        .dot-online {
          width: 6px; height: 6px; border-radius: 50%;
          background: #10d98c;
          box-shadow: 0 0 0 0 rgba(16,217,140,0.6);
          animation: pulseDot 2s ease-out infinite;
        }
        @keyframes pulseDot {
          0%   { box-shadow: 0 0 0 0 rgba(16,217,140,0.7); }
          70%  { box-shadow: 0 0 0 8px rgba(16,217,140,0); }
          100% { box-shadow: 0 0 0 0 rgba(16,217,140,0); }
        }

        .card {
          position: relative;
          background: rgba(12, 14, 22, 0.7);
          backdrop-filter: blur(30px) saturate(150%);
          -webkit-backdrop-filter: blur(30px) saturate(150%);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 24px;
          padding: 38px 36px 28px;
          box-shadow:
            0 30px 80px rgba(0,0,0,0.5),
            0 0 0 1px rgba(255,255,255,0.02) inset,
            0 1px 0 rgba(255,255,255,0.06) inset;
          overflow: hidden;
        }
        .card-glow {
          position: absolute;
          inset: -2px;
          background: linear-gradient(135deg, rgba(79,124,255,0.4), rgba(139,92,246,0.4), rgba(6,182,212,0.4));
          border-radius: 24px;
          opacity: 0;
          z-index: -1;
          filter: blur(20px);
          animation: glowSoft 8s ease-in-out infinite;
        }
        @keyframes glowSoft {
          0%,100% { opacity: 0.2; }
          50%     { opacity: 0.5; }
        }

        /* Brand / logo */
        .brand {
          text-align: center;
          margin-bottom: 24px;
        }
        .logo-ring {
          position: relative;
          width: 72px; height: 72px;
          margin: 0 auto 18px;
        }
        .logo-inner {
          position: absolute; inset: 0;
          background: linear-gradient(135deg, #4f7cff, #8b5cf6);
          border-radius: 20px;
          display: flex; align-items: center; justify-content: center;
          box-shadow: 0 12px 36px rgba(79,124,255,0.4);
          z-index: 2;
          transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
        .logo-ring:hover .logo-inner { transform: rotate(8deg) scale(1.06); }
        .logo-pulse {
          position: absolute; inset: 0;
          border: 2px solid rgba(79,124,255,0.4);
          border-radius: 20px;
          animation: ringPulse 2.4s ease-out infinite;
        }
        .logo-pulse.delay { animation-delay: 1.2s; }
        @keyframes ringPulse {
          0%   { transform: scale(1);   opacity: 1; }
          100% { transform: scale(1.7); opacity: 0; }
        }
        .brand-title {
          font-size: 26px; font-weight: 800;
          margin: 0 0 6px;
          letter-spacing: -0.02em;
          display: inline-flex; align-items: center; gap: 8px;
        }
        .gradient-text {
          background: linear-gradient(135deg, #4f7cff 0%, #8b5cf6 50%, #06b6d4 100%);
          background-size: 200% 200%;
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
          animation: gradientShift 6s ease-in-out infinite;
        }
        @keyframes gradientShift {
          0%,100% { background-position: 0% 50%; }
          50%     { background-position: 100% 50%; }
        }
        .title-sparkle {
          color: #fbbf24;
          animation: sparkle 2s ease-in-out infinite;
        }
        @keyframes sparkle {
          0%,100% { transform: rotate(0) scale(1);   opacity: 1; }
          50%     { transform: rotate(20deg) scale(1.2); opacity: 0.7; }
        }
        .brand-sub {
          color: #6b7589;
          font-size: 13px;
          margin: 0;
        }

        /* Divisor */
        .divider {
          position: relative;
          text-align: center;
          margin: 24px 0 22px;
        }
        .divider::before, .divider::after {
          content: '';
          position: absolute; top: 50%; width: 30%; height: 1px;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.1));
        }
        .divider::before { left: 0; }
        .divider::after { right: 0; background: linear-gradient(90deg, rgba(255,255,255,0.1), transparent); }
        .divider span {
          color: #555f74;
          font-size: 11px;
          text-transform: uppercase;
          letter-spacing: 0.1em;
          font-weight: 600;
          background: transparent;
          padding: 0 12px;
          position: relative;
        }

        /* Formulário */
        .form { display: flex; flex-direction: column; gap: 18px; }
        .form.shake { animation: shake 0.5s ease-in-out; }
        @keyframes shake {
          0%,100% { transform: translateX(0); }
          20%,60% { transform: translateX(-7px); }
          40%,80% { transform: translateX(7px); }
        }

        .field { display: flex; flex-direction: column; gap: 7px; }
        .field label {
          font-size: 12px; font-weight: 600;
          color: #9aa6bb;
          letter-spacing: 0.02em;
          transition: color 0.25s;
          display: flex; align-items: center; justify-content: space-between;
        }
        .field.focused label { color: #4f7cff; }
        .caps-warn {
          font-size: 10px; font-weight: 700;
          color: #f59e0b;
          animation: blink 1s infinite;
        }
        @keyframes blink { 50% { opacity: 0.5; } }

        .input-wrap {
          position: relative;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.06);
          border-radius: 12px;
          transition: all 0.25s;
          overflow: hidden;
        }
        .input-wrap:hover { background: rgba(255,255,255,0.045); border-color: rgba(255,255,255,0.1); }
        .field.focused .input-wrap {
          background: rgba(79,124,255,0.06);
          border-color: rgba(79,124,255,0.5);
          box-shadow: 0 0 0 4px rgba(79,124,255,0.08);
        }
        .field-icon {
          position: absolute; left: 14px; top: 50%;
          transform: translateY(-50%);
          color: #555f74;
          pointer-events: none;
          transition: color 0.25s;
        }
        .field.focused .field-icon { color: #4f7cff; }
        .field.filled .field-icon  { color: #9aa6bb; }
        .input-wrap input {
          width: 100%;
          padding: 14px 42px 14px 40px;
          background: transparent;
          border: none;
          outline: none;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 500;
        }
        .input-wrap input::placeholder { color: #3d4459; }
        .toggle-pass {
          position: absolute; right: 12px; top: 50%;
          transform: translateY(-50%);
          background: none; border: none; cursor: pointer;
          color: #555f74; padding: 6px;
          display: flex; align-items: center; justify-content: center;
          border-radius: 6px;
          transition: all 0.2s;
        }
        .toggle-pass:hover { color: #fff; background: rgba(255,255,255,0.06); }
        .field-line {
          position: absolute; bottom: 0; left: 0;
          height: 2px; width: 0;
          background: linear-gradient(90deg, #4f7cff, #8b5cf6);
          transition: width 0.35s ease;
        }
        .field.focused .field-line { width: 100%; }

        /* Erro */
        .error-box {
          max-height: 0;
          opacity: 0;
          overflow: hidden;
          transition: all 0.35s ease;
          background: rgba(255,77,106,0.08);
          border: 1px solid rgba(255,77,106,0);
          border-radius: 10px;
          color: #ff4d6a;
          font-size: 12px;
          display: flex; align-items: center; gap: 8px;
          padding: 0 12px;
        }
        .error-box.show {
          max-height: 60px;
          padding: 10px 12px;
          opacity: 1;
          border-color: rgba(255,77,106,0.3);
        }
        .err-dot {
          width: 6px; height: 6px; border-radius: 50%;
          background: #ff4d6a;
          flex-shrink: 0;
          animation: pulseDot 2s infinite;
        }

        /* Botão submit */
        .submit {
          position: relative;
          background: linear-gradient(135deg, #4f7cff 0%, #8b5cf6 100%);
          border: none;
          border-radius: 12px;
          padding: 15px;
          color: #fff;
          font-family: inherit;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          overflow: hidden;
          transition: all 0.25s;
          box-shadow: 0 8px 24px rgba(79,124,255,0.35);
          margin-top: 4px;
        }
        .submit:hover:not(:disabled) {
          transform: translateY(-2px);
          box-shadow: 0 12px 32px rgba(79,124,255,0.5);
        }
        .submit:active:not(:disabled) { transform: translateY(0); }
        .submit:disabled { cursor: not-allowed; opacity: 0.85; }
        .submit.success {
          background: linear-gradient(135deg, #10d98c, #059669);
          box-shadow: 0 8px 24px rgba(16,217,140,0.4);
        }
        .submit-content {
          position: relative; z-index: 2;
          display: flex; align-items: center; justify-content: center; gap: 8px;
        }
        .submit-shine {
          position: absolute; top: 0; left: -100%;
          width: 100%; height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25), transparent);
          animation: shine 3s ease-in-out infinite;
        }
        @keyframes shine {
          0%,100% { left: -100%; }
          50%     { left: 100%; }
        }
        .arrow { transition: transform 0.3s; }
        .submit:hover .arrow { transform: translateX(4px); }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }

        /* Rodapé do card */
        .card-footer {
          margin-top: 22px;
          padding-top: 18px;
          border-top: 1px solid rgba(255,255,255,0.04);
          text-align: center;
        }
        .footer-stats {
          display: flex; align-items: center; justify-content: center;
          gap: 8px;
          font-size: 10px;
          color: #555f74;
          font-weight: 600;
          letter-spacing: 0.04em;
          margin-bottom: 6px;
        }
        .footer-stats span { display: inline-flex; align-items: center; gap: 4px; }
        .dot-sep {
          width: 3px; height: 3px; border-radius: 50%;
          background: #555f74 !important;
        }
        .footer-copy { font-size: 10px; color: #3d4459; }

        .card-hint {
          margin-top: 18px;
          font-size: 11px;
          color: #6b7589;
          text-align: center;
          animation: appear 1s ease-out 0.4s both;
        }

        /* Responsividade */
        @media (max-width: 480px) {
          .card { padding: 28px 24px 20px; }
          .brand-title { font-size: 22px; }
          .top-badges { flex-wrap: wrap; }
          .orb { filter: blur(60px); }
        }
      `}</style>
    </div>
  )
}
