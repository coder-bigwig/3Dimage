import { useCallback, useEffect, useRef, useState } from 'react'
import { loadAnnotations, saveAnnotations } from '../../../api/annotations'
import type { AnnotationContent, AnnotationDocument } from './types'

const empty = (): AnnotationContent => ({ drawings: [], models: [] })
export function useAnnotations(resultId: string, token?: string) {
  const [content, setContent] = useState<AnnotationContent>(empty)
  const [restored, setRestored] = useState<AnnotationContent | null>(null)
  const [status, setStatus] = useState('正在加载标注…')
  const [ready, setReady] = useState(false)
  const [error, setError] = useState(false)
  const version = useRef(0), saved = useRef(''), latest = useRef(content), busy = useRef(false)
  const mounted = useRef(true), timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)
  const key = `viewer-annotations:${resultId}`
  const load = useCallback(async () => {
    setReady(false); setError(false); setStatus('正在加载标注…')
    try {
      const document: AnnotationDocument = token ? await loadAnnotations(token) : JSON.parse(localStorage.getItem(key) ?? '{"version":0,"drawings":[],"models":[]}')
      if (!mounted.current) return
      const value = { drawings: document.drawings, models: document.models }
      version.current = document.version; saved.current = JSON.stringify(value); latest.current = value
      setContent(value); setRestored(value); setReady(true)
      setStatus(token ? '标注已同步' : '本机标注（公开数据未连接云端）')
    } catch (reason) { if (mounted.current) { setError(true); setStatus(`加载失败：${(reason as Error).message}`) } }
  }, [key, token])
  useEffect(() => {
    mounted.current = true
    void Promise.resolve().then(() => { if (mounted.current) return load() })
    return () => { mounted.current = false; clearTimeout(timer.current) }
  }, [load])
  const flush = useCallback(async () => {
    if (!ready || busy.current || saved.current === JSON.stringify(latest.current)) return
    busy.current = true; setError(false); setStatus('正在保存标注…')
    try {
      // Keep saving the latest snapshot if edits arrive while a request is in flight.
      while (saved.current !== JSON.stringify(latest.current)) {
        const snapshot = structuredClone(latest.current), serialized = JSON.stringify(snapshot)
        const response = token ? await saveAnnotations(token, version.current, snapshot) : { ...snapshot, version: version.current + 1 }
        if (!token) localStorage.setItem(key, JSON.stringify(response))
        version.current = response.version; saved.current = serialized
      }
      if (mounted.current) setStatus(token ? '标注已保存' : '已保存到本机（公开数据未连接云端）')
    } catch (reason) { if (mounted.current) { setError(true); setStatus(`未保存：${(reason as Error).message}`) } }
    finally { busy.current = false }
  }, [key, ready, token])
  useEffect(() => {
    if (!ready || error || saved.current === JSON.stringify(content)) return
    timer.current = setTimeout(() => void flush(), 500)
    return () => clearTimeout(timer.current)
  }, [content, error, flush, ready])
  useEffect(() => {
    const prevent = (event: BeforeUnloadEvent) => {
      if (saved.current !== JSON.stringify(latest.current)) { event.preventDefault(); event.returnValue = '' }
    }
    window.addEventListener('beforeunload', prevent)
    return () => window.removeEventListener('beforeunload', prevent)
  }, [])
  const change = (next: AnnotationContent) => {
    if (!ready || JSON.stringify(next) === JSON.stringify(latest.current)) return
    latest.current = next; setContent(next); if (!error) setStatus('标注待保存…')
  }
  return { content, restored, status, ready, error, change, retry: flush, reload: load }
}
