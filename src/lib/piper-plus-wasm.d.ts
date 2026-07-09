declare module 'piper-plus/wasm/multilingual' {
  const init: () => Promise<void>
  export default init
  export const WasmPhonemizer: new (configJson: string) => unknown
}
