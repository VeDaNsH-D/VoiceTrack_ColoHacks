import React, { useEffect, useRef } from 'react'
import { motion, useScroll, useTransform, useMotionValue, animate, useInView } from 'framer-motion'
import styles from './Landing.module.css'

interface LandingProps {
  onGetStarted: () => void
  onDemo: () => void
  language: 'EN' | 'HI'
}

const numberVariants = {
  hidden: { opacity: 0, y: 80 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring', stiffness: 60, damping: 12 },
  },
}

interface AnimatedCounterProps {
  from?: number
  to: number
  duration?: number
}

const AnimatedCounter: React.FC<AnimatedCounterProps> = ({ from = 0, to, duration = 2 }) => {
  const count = useMotionValue(from)
  const rounded = useTransform(count, latest => Math.round(latest))
  const ref = useRef<HTMLSpanElement | null>(null)
  const isInView = useInView(ref, { once: true, amount: 0.5 })

  useEffect(() => {
    if (isInView) {
      const controls = animate(count, to, {
        duration,
        ease: 'easeOut',
      })
      return () => controls.stop()
    }
    return undefined
  }, [count, to, duration, isInView])

  return <motion.span ref={ref}>{rounded}</motion.span>
}

export const Landing: React.FC<LandingProps> = ({ onGetStarted, onDemo, language }) => {
  const videoRef = useRef<HTMLDivElement | null>(null)
  const { scrollYProgress: videoScroll } = useScroll({
    target: videoRef,
    offset: ['start 95%', 'start 15%'],
  })
  const scale = useTransform(videoScroll, [0, 0.4, 1], [0.85, 1, 1.2])
  const rotateX = useTransform(videoScroll, [0, 0.4, 1], [15, 0, 0])

  const { scrollY } = useScroll()
  const textY = useTransform(scrollY, [0, 500], [0, -150])
  const textOpacity = useTransform(scrollY, [0, 300], [1, 0])

  return (
    <>
      <nav className={styles.navbar}>
        <div className={styles.logoWrap}>
          <div className={styles.logoMark}>VT</div>
          <span className={styles.logoText}>VoiceTrack</span>
        </div>

        <div className={styles.navLinks}>
          <a href="#features">{language === 'EN' ? 'Features' : 'Features'}</a>
          <a href="#stats">{language === 'EN' ? 'Impact' : 'Impact'}</a>
          <a href="#about">{language === 'EN' ? 'About' : 'About'}</a>
        </div>

        <div className={styles.navActions}>
          <button onClick={onDemo} className={styles.navGhostBtn} type="button">
            {language === 'EN' ? 'Live Demo' : 'Live Demo'}
          </button>
          <button onClick={onGetStarted} className={styles.navPrimaryBtn} type="button">
            {language === 'EN' ? 'Open App' : 'Open App'}
          </button>
        </div>
      </nav>

      <section className={styles.hero_heroSection}>
        <div className={styles.hero_heroContainer}>
          <motion.div className={styles.hero_textContent} style={{ y: textY, opacity: textOpacity }}>
            <motion.h1
              className={styles.hero_headline}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
            >
              {language === 'EN'
                ? 'The AI voice ledger for faster, cleaner business operations'
                : 'The AI voice ledger for faster, cleaner business operations'}
            </motion.h1>

            <motion.p
              className={styles.hero_subtext}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              {language === 'EN'
                ? 'Speak your transactions naturally. VoiceTrack captures sales, updates inventory, and turns daily activity into clear AI insights.'
                : 'Speak your transactions naturally. VoiceTrack captures sales, updates inventory, and turns daily activity into clear AI insights.'}
            </motion.p>

            <motion.div
              className={styles.hero_ctaGroup}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.hero_inputWrapper}>
                <input
                  type="email"
                  placeholder="Enter business email"
                  className={styles.hero_emailInput}
                />
                <button type="button" className={styles.hero_primaryBtn} onClick={onGetStarted}>
                  {language === 'EN' ? 'Start for free' : 'Start for free'}
                </button>
              </div>

              <p className={styles.hero_helperText}>
                By signing up, you agree to VoiceTrack Terms and Privacy Policy.
              </p>
            </motion.div>
          </motion.div>

          <div style={{ position: 'relative', width: '100%', perspective: '1000px' }} ref={videoRef}>
            <div className={styles.hero_glowContainer}>
              <div className={styles.hero_glowBlue} />
              <div className={styles.hero_glowPurple} />
            </div>

            <motion.div
              className={styles.hero_videoWrapper}
              style={{ scale, rotateX, transformOrigin: 'top center' }}
              initial={{ opacity: 0, y: 60 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className={styles.hero_videoInner}>
                <video
                  src="/landing_video.mp4"
                  className={styles.hero_videoObject}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="metadata"
                  aria-label="VoiceTrack hero preview"
                />
              </div>
            </motion.div>

            <div className={styles.heroFloatingGraphics} aria-hidden="true">
              <div className={`${styles.floatChip} ${styles.floatChipTopLeft}`}>
                <span className={styles.floatChipDot} />
                Voice -&gt; Ledger
              </div>
              <div className={`${styles.floatChip} ${styles.floatChipTopRight}`}>
                <span className={styles.floatChipValue}>96</span>
                Transactions synced
              </div>
              <div className={`${styles.floatChip} ${styles.floatChipBottomLeft}`}>
                <div className={styles.floatWave}>
                  <span />
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
                Live voice signal
              </div>
            </div>
          </div>

          <div style={{ height: '140px' }} />
        </div>

        <div className={styles.hero_trustedDivider}>
          <div className={styles.hero_trustedLayout}>
            <p className={styles.hero_trustedText}>TRUSTED BY GROWING TEAMS ACROSS RETAIL AND DISTRIBUTION</p>
            <div className={styles.hero_logoMarqueeContainer}>
              <div className={styles.hero_logoMarquee}>
                {[...Array(2)].map((_, i) => (
                  <div key={i} className={styles.hero_logoTrack}>
                    <div className={styles.hero_brandLogo}>FreshMart</div>
                    <div className={styles.hero_brandLogo}>CityGrocer</div>
                    <div className={styles.hero_brandLogo}>Namma Wholesale</div>
                    <div className={styles.hero_brandLogo}>Metro Traders</div>
                    <div className={styles.hero_brandLogo}>South Agro Chain</div>
                    <div className={styles.hero_brandLogo}>LedgerNext</div>
                    <div className={styles.hero_brandLogo}>Rapid Retail Hub</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        <section id="about" className={styles.about_aboutSection}>
          <div className={styles.about_row}>
            <div className={styles.about_leftCol}>
              <span className={styles.about_label}>ABOUT VOICETRACK</span>
            </div>
            <div className={styles.about_rightCol}>
              <h2 className={styles.about_heading}>
                <span className={styles.about_textDark}>VoiceTrack helps teams run daily operations without manual entry. </span>
                <span className={styles.about_textLight}>From voice capture to ledger updates and analytics, everything stays synced in one intelligent workflow.</span>
              </h2>
            </div>
          </div>

          <div className={styles.about_row} style={{ alignItems: 'flex-start' }}>
            <div className={styles.about_leftCol}>
              <span className={styles.about_label}>WHO WE SERVE</span>
              <h3 className={styles.about_subHeading}>Businesses that need speed and accuracy</h3>
              <p className={styles.about_paragraph}>
                Built for shop owners, distribution teams, and field operators who want to log sales instantly, avoid stock misses, and make decisions with clear AI guidance.
              </p>
            </div>
            <motion.div
              className={styles.about_rightCol}
              initial={{ opacity: 0, scale: 1.15 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
              viewport={{ once: true, amount: 0.2 }}
            >
              <div className={`${styles.abstractVisual} ${styles.abstractAbout}`} aria-hidden="true">
                <div className={styles.abstractOrb} />
                <div className={styles.abstractRing} />
                <div className={styles.abstractWave} />
              </div>
            </motion.div>
          </div>
        </section>

        <section id="features" className={styles.feature_featuresSection}>
          <div className={styles.feature_titleRow}>
            <div className={styles.feature_leftCol}>
              <span className={styles.feature_label}>FEATURES</span>
            </div>
            <div className={styles.feature_rightCol}>
              <h2 className={styles.feature_heading}>Voice-first workflows with AI-native intelligence</h2>
            </div>
          </div>

          <div className={styles.feature_bentoGrid}>
            <div className={`${styles.feature_card} ${styles.feature_card1}`}>
              <div className={styles.feature_card1Content}>
                <h4 className={styles.feature_cardHead}>Log sales with natural speech</h4>
                <p className={styles.feature_cardDesc}>
                  Speak as you work and let VoiceTrack convert narration into structured entries with amount, item, quantity, and payment mode.
                </p>
              </div>
              <div className={styles.feature_card1Mockup}>
                <div className={styles.feature_mockFacebook}>
                  <div className={styles.feature_mockTabs}>
                    <div className={styles.feature_mockTab} style={{ background: '#f1f5f9' }}>Live Transcript</div>
                    <div className={styles.feature_mockTab} style={{ background: 'transparent', color: '#94a3b8' }}>Structured Output</div>
                  </div>
                  <div className={styles.feature_mockContent}>
                    <p style={{ marginBottom: '16px' }}>Detected transaction:</p>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '12px' }}>
                      <span style={{ color: '#94a3b8' }}>Item</span> <b>Tomatoes (8 kg)</b>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ color: '#94a3b8' }}>Value</span> <span>Rs 960 via UPI</span>
                    </div>
                  </div>
                </div>
                <motion.div
                  className={styles.feature_mockChat}
                  animate={{ y: [0, -8, 0] }}
                  transition={{ repeat: Infinity, duration: 4, ease: 'easeInOut' }}
                >
                  "Sold 8 kilos tomatoes and 4 oils, payment by UPI"
                  <div className={styles.feature_mockChatInput}>
                    <span style={{ color: '#cbd5e1' }}>EN | HI | MR</span>
                    <span>mic -&gt;</span>
                  </div>
                </motion.div>
              </div>
            </div>

            <div className={`${styles.feature_card} ${styles.feature_card2}`}>
              <h4 className={styles.feature_cardHead}>AI insights that improve daily decisions</h4>
              <p className={styles.feature_cardDesc}>
                Track trends in product movement, identify frequent customers, and detect unusual drops in inventory before they hurt revenue.
              </p>
              <div className={styles.feature_pillsContainer}>
                {[
                  { text: 'Low Stock: Onion', bg: '#1e293b', color: 'white', bottom: '60px', left: '20px', rot: '-5deg', delay: 0 },
                  { text: 'Best Seller: Rice 5kg', bg: '#fca5a5', color: '#7f1d1d', bottom: '20px', left: '10px', rot: '-10deg', delay: 1 },
                  { text: 'UPI Share +18%', bg: '#60a5fa', color: 'white', bottom: '30px', left: '140px', rot: '-12deg', delay: 0.5 },
                  { text: 'Credit Risk Alert', bg: '#fdba74', color: '#9a3412', bottom: '10px', left: '260px', rot: '-2deg', delay: 1.5 },
                  { text: 'Morning Peak 8-11', bg: '#06b6d4', color: 'white', bottom: '80px', left: '330px', rot: '-15deg', delay: 0.2 },
                  { text: 'Waste Down 14%', bg: '#3b82f6', color: 'white', bottom: '50px', left: '430px', rot: '-10deg', delay: 0.8 },
                ].map((pill, i) => (
                  <motion.div
                    key={i}
                    className={styles.feature_pill}
                    style={{ background: pill.bg, color: pill.color, bottom: pill.bottom, left: pill.left, transform: `rotate(${pill.rot})` }}
                    animate={{ y: [0, -6, 0] }}
                    transition={{ repeat: Infinity, duration: 4, delay: pill.delay, ease: 'easeInOut' }}
                  >
                    {pill.text}
                  </motion.div>
                ))}
              </div>
            </div>

            <div className={`${styles.feature_card} ${styles.feature_card3}`}>
              <h4 className={styles.feature_cardHead}>Real-time voice capture</h4>
              <p className={styles.feature_cardDesc}>
                Capture intent, context, and quantities from live speech with low-latency processing tuned for noisy business environments.
              </p>
              <div className={styles.feature_voiceContainer}>
                <div className={styles.feature_soundwaveWrapper}>
                  <motion.svg
                    width="240"
                    height="60"
                    viewBox="0 0 240 60"
                    fill="none"
                    stroke="url(#gradient)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    animate={{ scaleY: [1, 1.4, 1], opacity: [0.6, 1, 0.6] }}
                    transition={{ repeat: Infinity, duration: 1.5, ease: 'easeInOut' }}
                  >
                    <defs>
                      <linearGradient id="gradient" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#ffffff" stopOpacity="0" />
                        <stop offset="30%" stopColor="#0066ff" stopOpacity="0.5" />
                        <stop offset="50%" stopColor="#0066ff" stopOpacity="1" />
                        <stop offset="70%" stopColor="#0066ff" stopOpacity="0.5" />
                        <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                      </linearGradient>
                    </defs>
                    <path d="M10 30L40 30L55 10L70 50L85 5L100 45L115 15L130 55L145 20L160 40L175 25L190 30L230 30" />
                  </motion.svg>
                </div>
                <div className={styles.feature_micIcon}>
                  <div className={styles.feature_micLine} />
                  <div className={styles.feature_micLine} style={{ width: '32px' }} />
                  <div className={styles.feature_micLine} style={{ width: '24px' }} />
                  <div className={styles.feature_micStand} />
                  <div className={styles.feature_micBase} />
                </div>
              </div>
            </div>

            <div className={`${styles.feature_card} ${styles.feature_card4}`}>
              <h4 className={styles.feature_cardHead}>Best engine for each task</h4>
              <p className={styles.feature_cardDesc}>
                Use specialized AI models for transcription, translation, extraction, and business reasoning in one unified VoiceTrack pipeline.
              </p>
              <div className={styles.feature_modelGrid}>
                <div className={styles.feature_iconSlot}>STT</div>
                <div className={styles.feature_iconSlot} style={{ color: '#3b82f6' }}>NLP</div>
                <div className={styles.feature_iconSlot}>LLM</div>
                <div className={styles.feature_iconSlot} style={{ color: '#ef4444' }}>TTS</div>
                <div className={styles.feature_iconSlot} style={{ color: '#0f172a' }}>ASR</div>
                <div className={styles.feature_iconSlot} style={{ color: '#10b981' }}>UX</div>
                <div className={styles.feature_iconSlot} style={{ color: '#8b5cf6' }}>BI</div>
                <div className={styles.feature_iconSlot} style={{ color: '#f59e0b' }}>API</div>
              </div>
            </div>

            <div className={`${styles.feature_card} ${styles.feature_card5}`}>
              <h4 className={styles.feature_cardHead}>Auto-structured data output</h4>
              <p className={styles.feature_cardDesc}>
                Every voice input is converted into clean records you can use in dashboards, exports, and downstream automation.
              </p>
              <div className={styles.feature_codeWindow}>
                {'{'}<br />
                &nbsp;&nbsp;"timestamp": "2026-03-29T10:42:00Z",<br />
                &nbsp;&nbsp;"type": "sale",<br />
                &nbsp;&nbsp;"items": [{'{'}"name": "onion", "qty": 18, "unit": "kg"{'}'}],<br />
                &nbsp;&nbsp;"amount": 1260,<br />
                &nbsp;&nbsp;"paymentMode": "upi",<br />
                &nbsp;&nbsp;"confidence": 0.96,<br />
                &nbsp;&nbsp;"businessId": "BUS-1024"<br />
                {'}'}
              </div>
            </div>
          </div>
        </section>

        <section id="stats" className={styles.stats_statsSection}>
          <motion.div
            className={styles.stats_grid}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, amount: 0.1 }}
            variants={{
              hidden: {},
              show: { transition: { staggerChildren: 0.2 } },
            }}
          >
            <div className={styles.stats_column}>
              <span className={styles.stats_label}>TRANSACTIONS PROCESSED</span>
              <motion.h2 variants={numberVariants} className={styles.stats_number}>
                <AnimatedCounter to={250} duration={2.5} />K+
              </motion.h2>
              <p className={styles.stats_paragraph}>
                Teams use VoiceTrack daily to convert spoken updates into structured entries, reducing manual bookkeeping and improving record quality.
              </p>
              <div className={`${styles.abstractVisual} ${styles.abstractStatsA}`} aria-hidden="true">
                <div className={styles.abstractGrid} />
                <div className={styles.abstractPulse} />
                <div className={styles.abstractBars}>
                  <span />
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>

            <div className={`${styles.stats_column} ${styles.stats_rightColumn}`}>
              <span className={styles.stats_label}>ACTIVE BUSINESSES</span>
              <motion.h2 variants={numberVariants} className={styles.stats_number}>
                <AnimatedCounter to={1200} duration={2} />+
              </motion.h2>
              <p className={styles.stats_paragraph}>
                From neighborhood stores to fast-scaling distributors, teams rely on VoiceTrack for reliable voice logging, inventory visibility, and AI guidance.
              </p>
              <div className={`${styles.abstractVisual} ${styles.abstractStatsB}`} aria-hidden="true">
                <div className={styles.abstractDiagonal} />
                <div className={styles.abstractNodes}>
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            </div>
          </motion.div>
        </section>
      </section>

      <section className={styles.cta_ctaSection}>
        <h1 className={styles.cta_watermark}>VOICE</h1>

        <div className={styles.cta_content}>
          <h2 className={styles.cta_headline}>Ready to run operations by voice?</h2>
          <p className={styles.cta_subtitle}>
            Launch VoiceTrack to capture every transaction, track inventory in real time, and get daily AI insights your team can act on.
          </p>
          <div className={styles.cta_buttonGroup}>
            <button className={styles.cta_buttonOutline} onClick={onDemo} type="button">Watch demo</button>
            <button className={styles.cta_buttonSolid} onClick={onGetStarted} type="button">Open VoiceTrack</button>
          </div>
        </div>
      </section>
    </>
  )
}
