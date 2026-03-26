export default {
  'frontend/**/*.{ts,tsx}': (filenames) => {
    const files = filenames.map(f => f.split('frontend/')[1]).filter(Boolean).join(' ')
    if (!files) return []
    
    return [
      `bash -c 'cd frontend && eslint --fix ${files}'`,
      `bash -c 'cd frontend && tsc --noEmit'`,
    ]
  },
}
