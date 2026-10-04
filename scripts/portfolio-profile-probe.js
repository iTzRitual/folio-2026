(() => {
  const contexts = new Set();
  const videos = new Set();
  const editorCanvases = new WeakSet();
  const programs = new WeakMap();
  const textureSources = new WeakMap();
  const bindings = new WeakMap();
  const resources = { textures: new Set(), framebuffers: new Set(), renderbuffers: new Set() };
  const listeners = new Map();
  const callbackIds = new WeakMap();
  const targetIds = new WeakMap();
  let nextCallback = 0;
  let nextTarget = 0;
  let draws = 0;
  let compute = 0;
  let editor = 0;
  let targetBinds = 0;
  let crtDraw = null;
  let modelDraw = null;
  let phase = null;
  let lastFrame = null;
  const longTasks = [];
  const errors = [];
  const observer = new PerformanceObserver(list => longTasks.push(...list.getEntries().map(({ startTime, duration }) => ({ startTime, duration }))));
  observer.observe({ type: "longtask", buffered: true });
  window.addEventListener("error", event => errors.push(event.message));
  window.addEventListener("unhandledrejection", event => errors.push(String(event.reason)));
  const originalCreate = document.createElement;
  document.createElement = function (...args) {
    const element = originalCreate.apply(this, args);
    if (element instanceof HTMLVideoElement) videos.add(element);
    return element;
  };
  const originalFillText = CanvasRenderingContext2D.prototype.fillText;
  CanvasRenderingContext2D.prototype.fillText = function (...args) {
    if (args[0] === "folio-2026 — Visual Studio Code") editorCanvases.add(this.canvas);
    return originalFillText.apply(this, args);
  };
  for (const method of ["addEventListener", "removeEventListener"]) {
    const original = EventTarget.prototype[method];
    EventTarget.prototype[method] = function (type, callback, options) {
      if (callback && (this === window || this === document || this instanceof HTMLCanvasElement)) {
        if (!callbackIds.has(callback)) callbackIds.set(callback, ++nextCallback);
        if (!targetIds.has(this)) targetIds.set(this, ++nextTarget);
        const capture = typeof options === "boolean" ? options : Boolean(options?.capture);
        const key = `${targetIds.get(this)}/${type}/${callbackIds.get(callback)}/${capture}`;
        if (method === "addEventListener") listeners.set(key, { once: Boolean(options?.once), signal: Boolean(options?.signal) });
        else listeners.delete(key);
      }
      return original.call(this, type, callback, options);
    };
  }
  const originalContext = HTMLCanvasElement.prototype.getContext;
  HTMLCanvasElement.prototype.getContext = function (...args) {
    const context = originalContext.apply(this, args);
    if (context instanceof WebGL2RenderingContext) contexts.add(context);
    return context;
  };
  const prototype = WebGL2RenderingContext.prototype;
  const wrap = (name, record) => {
    const original = prototype[name];
    prototype[name] = function (...args) {
      const result = original.apply(this, args);
      record.call(this, args, result);
      return result;
    };
  };
  const state = gl => {
    if (!bindings.has(gl)) bindings.set(gl, { unit: gl.TEXTURE0, textures: new Map(), program: null, vao: null });
    return bindings.get(gl);
  };
  for (const [kind, suffix] of [["textures", "Texture"], ["framebuffers", "Framebuffer"], ["renderbuffers", "Renderbuffer"]]) {
    wrap(`create${suffix}`, function (_, result) { if (result) resources[kind].add(result); });
    wrap(`delete${suffix}`, function ([resource]) { resources[kind].delete(resource); });
  }
  wrap("bindFramebuffer", function () { targetBinds++; });
  wrap("activeTexture", function ([unit]) { state(this).unit = unit; });
  wrap("bindTexture", function ([target, texture]) { if (target === this.TEXTURE_2D) state(this).textures.set(state(this).unit, texture); });
  wrap("bindVertexArray", function ([vao]) { state(this).vao = vao; });
  wrap("useProgram", function ([program]) { state(this).program = program; });
  wrap("linkProgram", function ([program]) {
    const names = new Set();
    for (let i = 0; i < this.getProgramParameter(program, this.ACTIVE_UNIFORMS); i++) names.add(this.getActiveUniform(program, i).name);
    programs.set(program, { compute: names.has("delta") && names.has("restPosition"), crt: names.has("desktop") && names.has("monitorPowerSize"), model: names.has("fragmentRest") && names.has("fragmentPositions"), textureUnit: null });
  });
  const locations = new WeakMap();
  wrap("getUniformLocation", function ([program, name], location) { if (location) locations.set(location, { program, name }); });
  wrap("uniform1i", function ([location, value]) {
    const uniform = locations.get(location);
    if (uniform?.name === "u_texture") programs.get(uniform.program).textureUnit = this.TEXTURE0 + value;
  });
  for (const name of ["texImage2D", "texSubImage2D"]) {
    wrap(name, function (args) {
      const source = args.find(value => value instanceof HTMLCanvasElement);
      const texture = state(this).textures.get(state(this).unit);
      if (source && texture) textureSources.set(texture, source);
    });
  }
  for (const name of ["drawArrays", "drawElements", "drawArraysInstanced", "drawElementsInstanced"]) {
    wrap(name, function (args) {
      draws++;
      const current = state(this);
      const program = programs.get(current.program);
      if (program?.compute) compute++;
      if (program?.textureUnit !== null && editorCanvases.has(textureSources.get(current.textures.get(program?.textureUnit)))) editor++;
      if (program?.crt && name === "drawElements") crtDraw = { gl: this, program: current.program, vao: current.vao, count: args[1], type: args[2], offset: args[3] };
      if (program?.model) modelDraw = { gl: this, program: current.program };
    });
  }
  const resourceCounts = () => Object.fromEntries(Object.entries(resources).map(([key, value]) => [key, value.size]));
  const media = () => [...videos].map(video => ({ paused: video.paused, src: video.getAttribute("src"), readyState: video.readyState, width: video.videoWidth, height: video.videoHeight }));
  const registrationBalance = () => [...listeners.values()].filter(listener => !listener.once && !listener.signal).length;
  const frame = now => {
    if (phase && lastFrame !== null) phase.frames.push({ interval: now - lastFrame, draws, compute, editor, targetBinds });
    lastFrame = phase ? now : null;
    draws = compute = editor = targetBinds = 0;
    requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
  const transform = (matrix, vector) => Array.from({ length: 4 }, (_, row) => vector.reduce((sum, value, column) => sum + matrix[column * 4 + row] * value, 0));
  const project = (draw, position) => {
    const { gl, program } = draw;
    const view = gl.getUniform(program, gl.getUniformLocation(program, "modelViewMatrix"));
    const projection = gl.getUniform(program, gl.getUniformLocation(program, "projectionMatrix"));
    const clip = transform(projection, transform(view, [...position, 1]));
    const rect = gl.canvas.getBoundingClientRect();
    return { x: rect.x + (clip[0] / clip[3] + 1) * rect.width / 2, y: rect.y + (1 - clip[1] / clip[3]) * rect.height / 2 };
  };
  window.__folioProfile = {
    begin(name) {
      phase = { name, start: performance.now(), frames: [], startResources: resourceCounts(), startRegistrations: registrationBalance() };
      lastFrame = null;
      draws = compute = editor = targetBinds = 0;
    },
    end() {
      const result = { ...phase, end: performance.now(), endResources: resourceCounts(), endRegistrations: registrationBalance(), drawingBuffers: [...contexts].map(gl => [gl.drawingBufferWidth, gl.drawingBufferHeight]), media: media(), errors: [...errors] };
      result.longTasks = longTasks.filter(task => task.startTime >= phase.start && task.startTime < result.end);
      phase = null;
      return result;
    },
    environment() {
      return { userAgent: navigator.userAgent, hardwareConcurrency: navigator.hardwareConcurrency, deviceMemory: navigator.deviceMemory, viewport: [innerWidth, innerHeight], contexts: [...contexts].map(gl => {
        const extension = gl.getExtension("WEBGL_debug_renderer_info");
        return { renderer: gl.getParameter(extension?.UNMASKED_RENDERER_WEBGL ?? gl.RENDERER), vendor: gl.getParameter(extension?.UNMASKED_VENDOR_WEBGL ?? gl.VENDOR), version: gl.getParameter(gl.VERSION), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight] };
      }) };
    },
    modelPoint() { return modelDraw ? project(modelDraw, [0, 0, 0]) : null; },
    rasterPoint(u, v) {
      if (!crtDraw) return null;
      const { gl, program, vao, type, count, offset } = crtDraw;
      const previousVao = gl.getParameter(gl.VERTEX_ARRAY_BINDING);
      const previousBuffer = gl.getParameter(gl.ARRAY_BUFFER_BINDING);
      try {
        gl.bindVertexArray(vao);
        const attribute = name => {
          const index = gl.getAttribLocation(program, name);
          gl.bindBuffer(gl.ARRAY_BUFFER, gl.getVertexAttrib(index, gl.VERTEX_ATTRIB_ARRAY_BUFFER_BINDING));
          const data = new Float32Array(gl.getBufferParameter(gl.ARRAY_BUFFER, gl.BUFFER_SIZE) / 4);
          gl.getBufferSubData(gl.ARRAY_BUFFER, 0, data);
          return data;
        };
        const positions = attribute("position");
        const uv = attribute("uv");
        const Index = type === gl.UNSIGNED_INT ? Uint32Array : Uint16Array;
        const indices = new Index(count);
        gl.getBufferSubData(gl.ELEMENT_ARRAY_BUFFER, offset, indices);
        const size = gl.getUniform(program, gl.getUniformLocation(program, "monitorPowerSize"));
        const underscan = gl.getUniform(program, gl.getUniformLocation(program, "monitorUnderScan"));
        u = (u - 0.5) * size[0] * underscan + 0.5;
        v = (v - 0.5) * size[1] * underscan + 0.5;
        for (let i = 0; i < indices.length; i += 3) {
          const [a, b, c] = indices.slice(i, i + 3);
          const denominator = (uv[b * 2 + 1] - uv[c * 2 + 1]) * (uv[a * 2] - uv[c * 2]) + (uv[c * 2] - uv[b * 2]) * (uv[a * 2 + 1] - uv[c * 2 + 1]);
          if (Math.abs(denominator) < 1e-10) continue;
          const x = ((uv[b * 2 + 1] - uv[c * 2 + 1]) * (u - uv[c * 2]) + (uv[c * 2] - uv[b * 2]) * (v - uv[c * 2 + 1])) / denominator;
          const y = ((uv[c * 2 + 1] - uv[a * 2 + 1]) * (u - uv[c * 2]) + (uv[a * 2] - uv[c * 2]) * (v - uv[c * 2 + 1])) / denominator;
          if (x >= -1e-6 && y >= -1e-6 && x + y <= 1 + 1e-6) return project(crtDraw, [0, 1, 2].map(axis => x * positions[a * 3 + axis] + y * positions[b * 3 + axis] + (1 - x - y) * positions[c * 3 + axis]));
        }
        return null;
      } finally {
        gl.bindVertexArray(previousVao);
        gl.bindBuffer(gl.ARRAY_BUFFER, previousBuffer);
      }
    },
    editorDrawCount() { return editor; },
  };
})();
