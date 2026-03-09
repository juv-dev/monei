import { ref, onUnmounted } from 'vue'

export function useTypewriter(speed = 20) {
  const displayText = ref('')
  const isTyping = ref(false)
  let timeoutId: ReturnType<typeof setTimeout> | null = null

  function type(fullText: string): Promise<void> {
    return new Promise((resolve) => {
      displayText.value = ''
      isTyping.value = true
      let index = 0

      function next() {
        if (index < fullText.length) {
          displayText.value += fullText[index]
          index++
          timeoutId = setTimeout(next, speed)
        } else {
          isTyping.value = false
          resolve()
        }
      }

      next()
    })
  }

  function stop() {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
    isTyping.value = false
  }

  function skipToEnd(fullText: string) {
    stop()
    displayText.value = fullText
  }

  onUnmounted(stop)

  return { displayText, isTyping, type, stop, skipToEnd }
}
