// Runs the sentence model off the main thread, so the board keeps moving
// while it loads and thinks. Everything here happens on the visitor's device:
// the library and the model are downloaded once (then cached by the browser)
// and nothing typed is sent anywhere.

const LIB = 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2/dist/transformers.min.js'
const MODEL = 'Xenova/all-MiniLM-L6-v2' // about 23 MB at 8-bit, 384 numbers per sentence

let extract = null

self.onmessage = async ({ data }) => {
  if (data.type === 'load') {
    try {
      const { pipeline, env } = await import(LIB)
      env.allowLocalModels = false
      // The plain WebAssembly runtime: half the download of the default
      // build, which also carries WebGPU support we have no use for here.
      const onnx = env.backends && env.backends.onnx
      const version = onnx && onnx.versions && onnx.versions.web
      if (version && onnx.wasm) {
        const at = `https://cdn.jsdelivr.net/npm/onnxruntime-web@${version}/dist/`
        onnx.wasm.wasmPaths = { mjs: `${at}ort-wasm-simd-threaded.mjs`, wasm: `${at}ort-wasm-simd-threaded.wasm` }
      }
      extract = await pipeline('feature-extraction', MODEL, { dtype: 'q8', device: 'wasm' })
      self.postMessage({ type: 'ready' })
    } catch (error) {
      self.postMessage({ type: 'failed', message: String(error && error.message || error) })
    }
    return
  }
  if (data.type === 'embed') {
    try {
      const out = await extract(data.texts, { pooling: 'mean', normalize: true })
      const dims = out.dims[out.dims.length - 1]
      const flat = Float32Array.from(out.data)
      self.postMessage({ type: 'vectors', id: data.id, dims, flat }, [flat.buffer])
    } catch (error) {
      self.postMessage({ type: 'vectors', id: data.id, error: String(error && error.message || error) })
    }
  }
}
