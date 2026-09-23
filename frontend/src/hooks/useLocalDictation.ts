import { useEffect, useRef, useState } from "react"

type Availability = "available" | "downloadable" | "downloading" | "unavailable"
type RecognitionResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> }
type RecognitionError = { error: string }

interface LocalRecognition {
  lang: string
  processLocally: boolean
  interimResults: boolean
  onresult: ((event: RecognitionResult) => void) | null
  onerror: ((event: RecognitionError) => void) | null
  onend: (() => void) | null
  start: () => void
  stop: () => void
}

interface LocalRecognitionConstructor {
  new (): LocalRecognition
  available: (options: { langs: string[]; processLocally: true; quality: "dictation" }) => Promise<Availability>
  install: (options: { langs: string[]; processLocally: true; quality: "dictation" }) => Promise<boolean>
}

function recognitionConstructor(): LocalRecognitionConstructor | null {
  if (typeof window === "undefined") return null
  const candidate = (window as Window & { SpeechRecognition?: LocalRecognitionConstructor }).SpeechRecognition
  return candidate && typeof candidate.available === "function" && typeof candidate.install === "function"
    ? candidate
    : null
}

export function useLocalDictation(onTranscript: (text: string) => void) {
  const [supported] = useState(() => recognitionConstructor() !== null)
  const [listening, setListening] = useState(false)
  const [preparing, setPreparing] = useState(false)
  const [error, setError] = useState("")
  const recognitionRef = useRef<LocalRecognition | null>(null)
  const transcriptRef = useRef(onTranscript)
  transcriptRef.current = onTranscript

  useEffect(() => () => recognitionRef.current?.stop(), [])

  const stop = () => recognitionRef.current?.stop()

  const toggle = async () => {
    if (recognitionRef.current) {
      stop()
      return
    }
    const Recognition = recognitionConstructor()
    if (!Recognition || preparing) return
    setError("")
    setPreparing(true)
    const lang = navigator.language || "en-US"
    const options = { langs: [lang], processLocally: true as const, quality: "dictation" as const }
    try {
      const availability = await Recognition.available(options)
      if (availability === "unavailable") {
        setError(`On-device dictation is not available for ${lang} in this browser.`)
        return
      }
      if (availability !== "available" && !(await Recognition.install(options))) {
        setError(`Could not install the ${lang} on-device speech pack.`)
        return
      }
      const recognition = new Recognition()
      recognition.lang = lang
      recognition.processLocally = true
      recognition.interimResults = false
      recognition.onresult = (event) => {
        const transcript = Array.from(event.results)
          .map((result) => result[0]?.transcript ?? "")
          .join(" ").trim()
        if (transcript) transcriptRef.current(transcript)
      }
      recognition.onerror = (event) => {
        setError(event.error === "not-allowed" ? "Allow microphone access to dictate." : `Dictation stopped: ${event.error}.`)
      }
      recognition.onend = () => {
        recognitionRef.current = null
        setListening(false)
      }
      recognitionRef.current = recognition
      recognition.start()
      setListening(true)
    } catch {
      recognitionRef.current = null
      setError("On-device dictation could not start in this browser.")
    } finally {
      setPreparing(false)
    }
  }

  return { supported, listening, preparing, error, toggle, stop }
}
